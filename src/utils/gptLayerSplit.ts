/**
 * GPT Image 2 魔法分層（重構版）
 *
 * 定位策略：Gemini 回傳 bbox 座標 → 用於回貼位置（接近原圖）
 * 視覺策略：GPT Image 2 Edit 隔離 → BiRefNet/Chroma Key 去背（保持品質）
 * 效能策略：前景任務以 concurrency 3 佇列處理，背景補全同步開跑
 *
 * 流程：
 *   Gemini（bbox + category + bgColor + edgeComplexity）
 *   → [佇列] GPT Image 2 隔離 → BiRefNet/Chroma Key 去背（含獨立 timeout/retry）
 *     - complex edge：timeout 3min；simple edge：timeout 2min
 *   → [同步] GPT Image 2 背景補全
 *   → LayerResult[]（cropRatio 來自 Gemini bbox，位置接近原圖）
 */

import { GoogleGenAI } from '@google/genai';
import { callAtlasImg2Img, compressForAtlas, detectClosestRatio, type AtlasGenerationModel } from './atlasImage';
import { birefnetRemoveBg, selectBiRefNetModel } from './geminiLayer';
import { trimTransparentPixels, LayerResult } from './falImage';
import { detectBackgroundColor } from './imageProcessing';

export type MagicLayerModel = 'gemini' | 'gpt-image-2' | 'seedream-v5-pro';
export type MagicLayerGroupingStrategy = 'smart' | 'separate' | 'custom';

export interface MagicLayerPlanItem {
    id: string;
    label: string;
    labelEn: string;
    category: 'SUBJECT' | 'PRODUCT' | 'OBJECTS' | 'DECOR' | 'TEXT';
    memberLabels: string[];
    bbox: { x: number; y: number; w: number; h: number };
    description: string;
    groupReason: string;
    bgColor: BgColorKey;
    edgeComplexity: 'simple' | 'complex';
}

export interface MagicLayerPlan {
    detectedObjectCount: number;
    targetForegroundCount: number;
    layers: MagicLayerPlanItem[];
}

export interface MagicLayerOptions {
    model: MagicLayerModel;
    layerCount: 'auto' | number;
    categories: string[];
    customInstruction: string;
    includeBackground: boolean;
    preservePosition: boolean;
    autoArrange: boolean;
    groupingStrategy: MagicLayerGroupingStrategy;
    /** 執行前確認過的 runtime plan，不進畫布存檔。 */
    plan?: MagicLayerPlan;
}

export interface MagicLayerExecutionCallbacks {
    onLayerComplete?: (taskId: string, result: LayerResult) => void;
    onLayerFailed?: (taskId: string, message: string) => void;
}

export const DEFAULT_MAGIC_LAYER_OPTIONS: MagicLayerOptions = {
    model: 'gemini',
    layerCount: 'auto',
    categories: [],
    customInstruction: '',
    includeBackground: true,
    preservePosition: true,
    autoArrange: true,
    groupingStrategy: 'smart',
};

// ── 背景色方案 ──────────────────────────────────────────────────────────────
// 中飽和度版本（非純色）：降低 GPT Image 2 重繪時的 color spill，
// 同時保持足夠對比讓 BiRefNet 邊緣偵測更乾淨
const BG_COLOR_MAP = {
    GREEN: { hex: '#00BB44', rgb: '0,187,68' },      // 中綠（取代純綠 #00FF00）
    BLUE:  { hex: '#2255CC', rgb: '34,85,204' },     // 中藍（取代純藍 #0000FF）
    RED:   { hex: '#CC2200', rgb: '204,34,0' },      // 中紅（取代純紅 #FF0000）
    GRAY:  { hex: '#787878', rgb: '120,120,120' },   // 中灰（取代淺灰 #DADADA，對比更強）
} as const;

type BgColorKey = keyof typeof BG_COLOR_MAP;

// ── 偵測結果 ─────────────────────────────────────────────────────────────────
interface DetectedObject {
    id: string;
    label: string;
    labelEn: string;
    category: 'SUBJECT' | 'PRODUCT' | 'OBJECTS' | 'DECOR' | 'TEXT';
    bgColor: BgColorKey;
    /**
     * simple = 邊緣乾淨（幾何形、硬邊）→ Chroma Key 可處理
     * complex = 邊緣複雜（頭髮、毛邊、羽毛、透明玻璃）→ 需要 BiRefNet，timeout 延長至 3min
     */
    edgeComplexity: 'simple' | 'complex';
    /** 在原圖中的相對位置（0~1 比例），用於回貼定位 */
    bbox: { x: number; y: number; w: number; h: number };
    /** Gemini 自動描述（語意編輯器 Prompt 用） */
    description?: string;
}

// ── withTimeout 包裹 ─────────────────────────────────────────────────────────
function withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    onTimeout: () => Promise<T>,
): Promise<T> {
    let didTimeout = false;
    const timer = new Promise<never>((_, reject) =>
        setTimeout(() => { didTimeout = true; reject(new Error('timeout')); }, ms)
    );
    return Promise.race([promise, timer]).catch(err => {
        if (didTimeout || err.message === 'timeout') {
            console.warn(`[withTimeout] timed out after ${ms}ms, falling back`);
            return onTimeout();
        }
        throw err;
    });
}

// ── Gemini 偵測：bbox + category + bgColor ───────────────────────────────────
async function detectObjects(imageBase64: string, apiKey: string, options?: Partial<MagicLayerOptions>): Promise<DetectedObject[]> {
    const ai = new GoogleGenAI({ apiKey });
    const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
    const mimeType = imageBase64.match(/data:(.*);base64/)?.[1] ?? 'image/png';

    const requestedCategories = options?.categories?.length ? options.categories.join(', ') : '自動判斷最適合的類別';
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { mimeType, data: cleanBase64 } },
                {
                    text: `You are a professional design layer segmentation AI. Analyze this image and identify distinct visual elements that should become independent design layers.

━━━ INCLUSION CRITERIA ━━━
Only include an element if ALL conditions are true:
1. It is a self-contained recognizable object, person, product, text, or illustration
2. It could stand alone on a transparent background and still be meaningful
3. It occupies a coherent bounded region in the image
4. It has clear, identifiable edges (even if complex)

━━━ STRICT EXCLUSION LIST ━━━
Do NOT include any of these as separate layers:
- Cast shadows, drop shadows, inner shadows (shadows belong to their parent object)
- Color gradients, vignettes, background wash effects
- Glow, bloom, light rays, lens flare, bokeh
- Large plain background fills covering >35% of the image
- Reflections on surfaces (water, glass, floor)
- Atmospheric haze, fog, depth-of-field blur areas
- Texture overlays spanning the entire image

━━━ ATOMIC DETECTION RULES (important) ━━━
This pass is an inventory, not the final layer plan. Detect every meaningful atomic object separately.
- Person, held prop, chair, vehicle, product, stand, package, logo icon and text must be separate objects when each has visible boundaries.
- Similar repeated objects should be separate when their positions can be identified independently.
- Do not merge objects merely because they touch or are functionally related.
- A later planning pass will decide which atomic objects belong in the same output layer.

━━━ NO DUPLICATES (critical) ━━━
Do not return the same semantic object twice under different names.
Atomic objects may overlap or contain one another when they are genuinely distinct, such as a hand holding a cup or text inside a logo badge.
Before returning, self-check that each entry represents a distinct editable object.

━━━ OBJECT COUNT RULES ━━━
Return every meaningful atomic object visible in the image, up to 20 objects.
Do not reduce the inventory to match a requested final layer count.

━━━ CATEGORIES ━━━
- SUBJECT: main person, character, model, portrait
- PRODUCT: featured product, hero item, merchandise, food dish
- OBJECTS: props, tools, secondary items, accessories
- DECOR: decorative shapes, patterns, icons, illustrations, badges
- TEXT: text overlays, logos, typography, labels, titles

━━━ BBOX RULES (critical) ━━━
bbox = tightest possible rectangle enclosing ALL visible pixels of this element only.
- x, y = top-left corner (fraction of image width/height)
- w, h = width and height (fraction of image width/height)
- The box must TOUCH the outermost visible pixel — no padding, no rounding outward
- Bad: whole-image box for a small object. Good: tight box that just wraps the object
- If an element is near an edge, x or y can be 0.0; w or h can reach 1.0 only if truly full-width/height

━━━ BGCOLOR (chroma-key color) ━━━
Pick the color that contrasts MOST with the element's dominant visible color:
- GREEN (#00FF00): skin tones, red/orange/yellow/pink/warm objects
- BLUE (#0000FF): green/teal/cyan/nature/plant objects
- RED (#FF0000): blue/purple/indigo/cool-toned objects
- GRAY (#DADADA): ONLY when the object is multi-colored with no clear dominant color AND edges are simple

━━━ EDGE COMPLEXITY ━━━
- "simple": clean geometric or hard edges (products, text, simple shapes, solid objects)
- "complex": fine/irregular edges needing AI matting (hair, fur, feathers, transparent glass, smoke, intricate cutouts)
Note: objects with complex edges should prefer GRAY bgColor to signal AI-based removal.

━━━ DESCRIPTION FIELD ━━━
Also add a "description" field: a concise English visual description of the element (15-40 words).
Describe: what it is, appearance, color, pose/state, any notable visual details.
This will be used as an image generation prompt — be specific and visual.
Example: "A young East Asian woman in her 20s wearing a white collared shirt, smiling, looking at camera, with long straight dark hair."

━━━ USER REQUEST ━━━
Preferred categories to notice: ${requestedCategories}.
Additional instruction: ${options?.customInstruction?.trim() || 'None'}.

Return ONLY a valid JSON array — no markdown, no explanation, no extra text:
[{"label":"人物","labelEn":"person","category":"SUBJECT","bgColor":"GREEN","edgeComplexity":"complex","bbox":{"x":0.10,"y":0.05,"w":0.35,"h":0.85},"description":"A young East Asian woman wearing a white shirt, smiling at camera."}]`
                }
            ]
        },
    });

    const text = response.text ?? '';
    const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    const match = stripped.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('Gemini 未回傳物件偵測結果');

    let objects: DetectedObject[];
    try {
        objects = JSON.parse(match[0]);
    } catch {
        throw new Error('Gemini 回傳 JSON 解析失敗');
    }
    if (!objects || objects.length === 0) throw new Error('Gemini 未偵測到任何物件');
    objects = objects.slice(0, 20).map((object, index) => ({ ...object, id: `object_${index + 1}` }));

    // 按重要性排序，確保截取時重要層（主體、產品、文字）優先保留
    const CATEGORY_PRIORITY: Record<string, number> = {
        SUBJECT: 0, PRODUCT: 1, TEXT: 2, OBJECTS: 3, DECOR: 4,
    };
    objects.sort((a, b) =>
        (CATEGORY_PRIORITY[a.category] ?? 5) - (CATEGORY_PRIORITY[b.category] ?? 5)
    );

    // 原子盤點只移除幾乎完全相同的重複框；接觸、包含或 logo/text 關係留給第二階段規劃。
    type BBox = DetectedObject['bbox'];
    const intersectArea = (a: BBox, b: BBox): number => {
        const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
        const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
        return ix * iy;
    };
    const iou = (a: BBox, b: BBox): number => {
        const inter = intersectArea(a, b);
        const union = a.w * a.h + b.w * b.h - inter;
        return union > 0 ? inter / union : 0;
    };
    const deduplicated: DetectedObject[] = [];
    for (const obj of objects) {
        const duplicate = deduplicated.some(kept =>
            kept.category === obj.category &&
            kept.labelEn?.toLowerCase() === obj.labelEn?.toLowerCase() &&
            iou(kept.bbox, obj.bbox) > 0.88
        );
        if (duplicate) continue;
        deduplicated.push(obj);
    }
    objects = deduplicated;

    // 安全夾值：bbox + edgeComplexity 預設值
    return objects.map(o => ({
        ...o,
        edgeComplexity: (o.edgeComplexity === 'complex' || o.edgeComplexity === 'simple')
            ? o.edgeComplexity
            : 'simple' as const,
        bbox: {
            x: Math.max(0, Math.min(1, o.bbox?.x ?? 0)),
            y: Math.max(0, Math.min(1, o.bbox?.y ?? 0)),
            w: Math.max(0.01, Math.min(1, o.bbox?.w ?? 1)),
            h: Math.max(0.01, Math.min(1, o.bbox?.h ?? 1)),
        },
    }));
}

function unionObjectBboxes(objects: DetectedObject[]): DetectedObject['bbox'] {
    const left = Math.min(...objects.map(object => object.bbox.x));
    const top = Math.min(...objects.map(object => object.bbox.y));
    const right = Math.max(...objects.map(object => object.bbox.x + object.bbox.w));
    const bottom = Math.max(...objects.map(object => object.bbox.y + object.bbox.h));
    return { x: left, y: top, w: right - left, h: bottom - top };
}

function buildPlanItem(members: DetectedObject[], index: number, label?: string, reason?: string): MagicLayerPlanItem {
    const categoryPriority: Record<string, number> = { SUBJECT: 0, PRODUCT: 1, TEXT: 2, OBJECTS: 3, DECOR: 4 };
    const primary = [...members].sort((a, b) => (categoryPriority[a.category] ?? 5) - (categoryPriority[b.category] ?? 5))[0];
    return {
        id: `layer_${index + 1}`,
        label: label?.trim() || members.map(member => member.label).join('＋'),
        labelEn: members.map(member => member.labelEn).join(' and '),
        category: primary.category,
        memberLabels: members.map(member => member.label),
        bbox: unionObjectBboxes(members),
        description: members.map(member => member.description).filter(Boolean).join('; '),
        groupReason: reason?.trim() || (members.length === 1 ? '獨立物件' : '依目標層數合併'),
        bgColor: primary.bgColor,
        edgeComplexity: members.some(member => member.edgeComplexity === 'complex') ? 'complex' : 'simple',
    };
}

function fallbackLayerPlan(objects: DetectedObject[], targetCount: number): MagicLayerPlanItem[] {
    const buckets = Array.from({ length: targetCount }, () => [] as DetectedObject[]);
    objects.forEach((object, index) => buckets[index % targetCount].push(object));
    return buckets.filter(bucket => bucket.length > 0).map((bucket, index) => buildPlanItem(bucket, index));
}

async function planObjectLayers(
    objects: DetectedObject[],
    apiKey: string,
    options: Partial<MagicLayerOptions>,
): Promise<MagicLayerPlan> {
    if (options.groupingStrategy === 'custom') {
        const instruction = options.customInstruction?.trim();
        if (!instruction) throw new Error('使用「依照指令」時，請先填寫要拆出的物件');

        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: `You are selecting editable layers from an atomic object inventory.
The user's instruction is an EXCLUSIVE WHITELIST. Select only objects explicitly requested by the user. Do not add other detected objects, do not fill a target count, and do not require every object ID to appear.
Create one group per item requested by the user, unless the user explicitly asks to group items together. If a requested item has multiple atomic parts, include those parts in the same group.
User instruction: ${instruction}
Return ONLY JSON: [{"memberIds":["object_1"],"label":"人物","reason":"explicitly requested"}]
Objects: ${JSON.stringify(objects.map(object => ({ id: object.id, label: object.label, labelEn: object.labelEn, category: object.category, bbox: object.bbox, description: object.description })))}` }] },
        });
        const match = (response.text ?? '').replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').match(/\[[\s\S]*\]/);
        if (!match) throw new Error('無法依照指令建立圖層，請把物件名稱寫得更明確');
        const rawGroups = JSON.parse(match[0]) as Array<{ memberIds?: string[]; label?: string; reason?: string }>;
        const byId = new Map(objects.map(object => [object.id, object]));
        const used = new Set<string>();
        const groups = rawGroups.slice(0, 20).map(group => {
            const members = (group.memberIds ?? []).filter(id => byId.has(id) && !used.has(id)).map(id => {
                used.add(id);
                return byId.get(id)!;
            });
            return { members, label: group.label, reason: group.reason };
        }).filter(group => group.members.length > 0);
        if (groups.length === 0) throw new Error('指令中的物件未能對應到圖片內容，請換成更明確的名稱');
        return {
            detectedObjectCount: objects.length,
            targetForegroundCount: groups.length,
            layers: groups.map((group, index) => buildPlanItem(group.members, index, group.label, group.reason)),
        };
    }

    const requested = typeof options.layerCount === 'number'
        ? options.layerCount - (options.includeBackground === false ? 0 : 1)
        : Math.min(8, Math.max(1, Math.ceil(objects.length * 0.7)));
    const targetForegroundCount = Math.max(1, Math.min(objects.length, requested));
    if (objects.length <= targetForegroundCount) {
        return {
            detectedObjectCount: objects.length,
            targetForegroundCount,
            layers: objects.map((object, index) => buildPlanItem([object], index)),
        };
    }

    const strategyInstruction = options.groupingStrategy === 'separate'
        ? 'Keep objects separate whenever possible. Only group the least important related objects when required to meet the exact target count.'
        : 'Group objects that form one meaningful design unit, while keeping major subjects, products and text independently editable.';
    const ai = new GoogleGenAI({ apiKey });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: `You are planning editable design layers from an atomic object inventory.
Create exactly ${targetForegroundCount} foreground layer groups. Every object ID must appear exactly once.
${strategyInstruction}
Preferred categories: ${options.categories?.join(', ') || 'automatic'}.
Return ONLY JSON: [{"memberIds":["object_1"],"label":"人物","reason":"main subject"}]
Objects: ${JSON.stringify(objects.map(object => ({ id: object.id, label: object.label, labelEn: object.labelEn, category: object.category, bbox: object.bbox, description: object.description })))}` }] },
        });
        const match = (response.text ?? '').replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').match(/\[[\s\S]*\]/);
        if (!match) throw new Error('規劃器未回傳 JSON');
        const rawGroups = JSON.parse(match[0]) as Array<{ memberIds?: string[]; label?: string; reason?: string }>;
        const byId = new Map(objects.map(object => [object.id, object]));
        const used = new Set<string>();
        const groups = rawGroups.slice(0, targetForegroundCount).map(group => {
            const members = (group.memberIds ?? []).filter(id => byId.has(id) && !used.has(id)).map(id => {
                used.add(id);
                return byId.get(id)!;
            });
            return { members, label: group.label, reason: group.reason };
        }).filter(group => group.members.length > 0);
        const remaining = objects.filter(object => !used.has(object.id));
        remaining.forEach((object, index) => groups[index % Math.max(1, groups.length)]?.members.push(object));
        if (groups.length !== targetForegroundCount) throw new Error('規劃層數不符');
        return {
            detectedObjectCount: objects.length,
            targetForegroundCount,
            layers: groups.map((group, index) => buildPlanItem(group.members, index, group.label, group.reason)),
        };
    } catch (error) {
        console.warn('[magicLayer] Layer planner fallback:', error);
        return {
            detectedObjectCount: objects.length,
            targetForegroundCount,
            layers: fallbackLayerPlan(objects, targetForegroundCount),
        };
    }
}

export async function analyzeMagicLayerPlan(
    imageBase64: string,
    geminiApiKey: string,
    options: Partial<MagicLayerOptions>,
): Promise<MagicLayerPlan> {
    const objects = await detectObjects(imageBase64, geminiApiKey, options);
    return planObjectLayers(objects, geminiApiKey, options);
}

// ── Gemini 背景重繪（移除前景物件，補全背景）────────────────────────────────
async function geminiInpaintBackground(
    imageBase64: string,
    objects: DetectedObject[],
    bgDescription: string,
    apiKey: string,
    model: string,
): Promise<string | null> {
    try {
        const ai = new GoogleGenAI({ apiKey });
        const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
        const mimeType = imageBase64.match(/data:(.*);base64/)?.[1] ?? 'image/jpeg';
        const labelsList = objects.map(o => `"${o.labelEn}" (${o.label})`).join(', ');

        const prompt = bgDescription
            ? `Remove these foreground elements from the image: ${labelsList}.
Fill each removed area by naturally extending the surrounding background.
Background reference: ${bgDescription}
Rules:
- Match exact edge colors and textures pixel-by-pixel where elements were removed
- Continue gradients, textures, and patterns seamlessly into the gaps
- Do NOT change, recolor, or alter any area of the image that was not occupied by the removed elements
- Minimal reconstruction: only fill what is missing, preserve everything else exactly as-is`
            : `Remove these foreground elements from the image: ${labelsList}.
Fill each removed area by naturally extending the surrounding background.
Rules:
- Match exact edge colors and textures where elements were removed
- Continue existing patterns seamlessly
- Do NOT change any part of the image that was not occupied by the removed elements`;

        const response = await ai.models.generateContent({
            model,
            contents: { parts: [{ inlineData: { data: cleanBase64, mimeType } }, { text: prompt }] },
        });

        const part = response.candidates?.[0]?.content?.parts?.find((p: { inlineData?: { data: string } }) => p.inlineData);
        if (!part?.inlineData?.data) return null;
        return `data:image/png;base64,${part.inlineData.data}`;
    } catch (e) {
        console.warn('[geminiBackground] Failed:', e);
        return null;
    }
}

// ── Gemini 快速分析背景類型，回傳英文描述供背景重繪 prompt 使用 ───────────────
async function analyzeBackground(imageBase64: string, apiKey: string): Promise<string> {
    try {
        const ai = new GoogleGenAI({ apiKey });
        const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
        const mimeType = imageBase64.match(/data:(.*);base64/)?.[1] ?? 'image/png';
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: cleanBase64 } },
                    {
                        text: `Analyze ONLY the background of this image (ignore all foreground subjects, people, products, text).
Return a single JSON object with these fields — no markdown, no extra text:
{
  "scene": "one sentence describing the background location and atmosphere",
  "colors": "dominant background colors with approximate hex or descriptive values (e.g. soft sky blue #87CEEB, warm sand #F5DEB3)",
  "lighting": "lighting direction, quality and color temperature (e.g. soft diffused light from upper-left, warm 5500K)",
  "texture": "surface textures or patterns visible in background (e.g. smooth concrete, bokeh blur, gradient sky)",
  "gradient": "if applicable, describe gradient direction and colors (e.g. top-to-bottom light blue to white)"
}`,
                    },
                ],
            },
        });
        const raw = response.text?.trim() ?? '';
        // 解析 JSON，組合成精準描述字串
        try {
            const stripped = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(stripped);
            const parts = [
                parsed.scene,
                parsed.colors   ? `Colors: ${parsed.colors}`   : '',
                parsed.lighting ? `Lighting: ${parsed.lighting}` : '',
                parsed.texture  ? `Texture: ${parsed.texture}`  : '',
                parsed.gradient ? `Gradient: ${parsed.gradient}` : '',
            ].filter(Boolean);
            return parts.join('. ');
        } catch {
            return raw; // 解析失敗就直接用原始文字
        }
    } catch {
        return '';
    }
}

// ── 背景補全圖裁切至原圖比例（cover-crop）────────────────────────────────────
// GPT/Gemini 輸出比例受 detectClosestRatio 影響，可能與原圖不一致；
// 回貼畫布時會硬套原圖寬高，比例不合就被拉伸 → 先置中裁切到原圖 AR
function coverCropToAspect(base64: string, targetAR: number): Promise<string> {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const w = img.naturalWidth, h = img.naturalHeight;
            const srcAR = w / h;
            if (Math.abs(srcAR - targetAR) < 0.01) { resolve(base64); return; }
            let cw = w, ch = h;
            if (srcAR > targetAR) cw = Math.max(1, Math.round(h * targetAR));
            else ch = Math.max(1, Math.round(w / targetAR));
            const sx = Math.round((w - cw) / 2), sy = Math.round((h - ch) / 2);
            const canvas = document.createElement('canvas');
            canvas.width = cw; canvas.height = ch;
            canvas.getContext('2d')!.drawImage(img, sx, sy, cw, ch, 0, 0, cw, ch);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(base64);
        img.src = base64;
    });
}

function getDims(base64: string): Promise<{ w: number; h: number } | null> {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve(null);
        img.src = base64;
    });
}

// ── 用 Gemini bbox 陣列生成黑白遮罩（白=要填補、黑=保留）────────────────────
function generateBboxMask(imageBase64: string, objects: DetectedObject[]): Promise<string> {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width  = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d')!;
            // 黑底（全部保留）
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // 每個物件 bbox 畫白色（指示 GPT 需填補的區域）
            ctx.fillStyle = '#FFFFFF';
            for (const obj of objects) {
                // 微幅擴大邊緣，確保殘影被覆蓋（過大會讓背景大範圍重繪）
                const pad = 0.02;
                const x = Math.max(0, (obj.bbox.x - pad)) * canvas.width;
                const y = Math.max(0, (obj.bbox.y - pad)) * canvas.height;
                const w = Math.min(canvas.width  - x, (obj.bbox.w + pad * 2) * canvas.width);
                const h = Math.min(canvas.height - y, (obj.bbox.h + pad * 2) * canvas.height);
                ctx.fillRect(x, y, w, h);
            }
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve('');
        img.src = imageBase64;
    });
}

// ── 通用 Chroma Key 去背（任意目標色）───────────────────────────────────────
// edgeComplexity = 'complex' → 收緊容差，減少誤刪邊緣細節
async function removeColorBackground(
    base64: string,
    targetHex: string,
    edgeComplexity: 'simple' | 'complex' = 'simple',
): Promise<string> {
    const tR = parseInt(targetHex.slice(1, 3), 16);
    const tG = parseInt(targetHex.slice(3, 5), 16);
    const tB = parseInt(targetHex.slice(5, 7), 16);

    // simple：容差寬鬆（去色乾淨）；complex：容差收緊（保留細節邊緣）
    const hardThreshold = edgeComplexity === 'complex' ? 45  : 60;
    const softThreshold = edgeComplexity === 'complex' ? 85  : 110;

    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width  = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = imageData.data;
            for (let i = 0; i < d.length; i += 4) {
                const dr = d[i] - tR, dg = d[i + 1] - tG, db = d[i + 2] - tB;
                const dist = Math.sqrt(dr * dr + dg * dg + db * db);
                if (dist < hardThreshold)
                    d[i + 3] = 0;
                else if (dist < softThreshold)
                    d[i + 3] = Math.round(((dist - hardThreshold) / (softThreshold - hardThreshold)) * 255);
            }
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(base64);
        img.src = base64;
    });
}

// ── Step 1.5：背景均一化（Gemini 輸出背景可能有雜訊，強制清乾淨讓 BiRefNet 看到好對比）──
async function uniformizeBackground(base64: string, bgHex: string): Promise<string> {
    const tR = parseInt(bgHex.slice(1, 3), 16);
    const tG = parseInt(bgHex.slice(3, 5), 16);
    const tB = parseInt(bgHex.slice(5, 7), 16);
    const threshold = 55;
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = id.data;
            for (let i = 0; i < d.length; i += 4) {
                const dr = d[i] - tR, dg = d[i + 1] - tG, db = d[i + 2] - tB;
                if (Math.sqrt(dr * dr + dg * dg + db * db) < threshold) {
                    d[i] = tR; d[i + 1] = tG; d[i + 2] = tB;
                }
            }
            ctx.putImageData(id, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(base64);
        img.src = base64;
    });
}

// ── Step 2b.5：Despill — 清除 Chroma Key 邊緣的背景色污染 ────────────────────
// BiRefNet 路徑不需要（BiRefNet alpha 本身已乾淨）；只在 Chroma Key 路徑使用
async function despillEdges(transparentBase64: string, bgHex: string): Promise<string> {
    const tR = parseInt(bgHex.slice(1, 3), 16);
    const tG = parseInt(bgHex.slice(3, 5), 16);
    const tB = parseInt(bgHex.slice(5, 7), 16);
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = id.data;
            for (let i = 0; i < d.length; i += 4) {
                const alpha = d[i + 3];
                if (alpha > 10 && alpha < 245) {
                    // 逆向去除背景色污染：original = (blended - bg*(1-t)) / t
                    const t = alpha / 255;
                    d[i]     = Math.round(Math.min(255, Math.max(0, (d[i]     - tR * (1 - t)) / t)));
                    d[i + 1] = Math.round(Math.min(255, Math.max(0, (d[i + 1] - tG * (1 - t)) / t)));
                    d[i + 2] = Math.round(Math.min(255, Math.max(0, (d[i + 2] - tB * (1 - t)) / t)));
                }
            }
            ctx.putImageData(id, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(transparentBase64);
        img.src = transparentBase64;
    });
}

// ── Step 2c：原圖 RGB + Alpha Mask 合成（像素 100% 來自原圖）──────────────────
// alphaMask 會自動縮放至原圖尺寸（處理壓縮圖與原圖解析度不一致的問題）
async function compositeOriginalWithAlpha(
    originalBase64: string,
    alphaMaskBase64: string,
): Promise<string> {
    return new Promise(resolve => {
        const origImg = new Image(), alphaImg = new Image();
        let loaded = 0;
        const onLoad = () => {
            if (++loaded < 2) return;
            const canvas = document.createElement('canvas');
            canvas.width  = origImg.naturalWidth;
            canvas.height = origImg.naturalHeight;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(origImg, 0, 0);
            ctx.globalCompositeOperation = 'destination-in';
            ctx.drawImage(alphaImg, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/png'));
        };
        origImg.onload = onLoad; alphaImg.onload = onLoad;
        origImg.onerror = () => resolve(originalBase64);
        alphaImg.onerror = () => resolve(originalBase64);
        origImg.src = originalBase64; alphaImg.src = alphaMaskBase64;
    });
}

// ── Gemini Fallback：無 Atlas Key 時用 Gemini Flash Image 生成隔離圖 ──────────
async function geminiIsolateOnSolidBg(
    obj: DetectedObject,
    imageBase64: string,
    apiKey: string,
    model: string,
    bgColor: { hex: string; rgb: string },
    perspectiveHint = '',
): Promise<string> {
    const ai = new GoogleGenAI({ apiKey });
    const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
    const mimeType    = imageBase64.match(/data:(.*);base64/)?.[1] ?? 'image/png';
    const prompt =
        `In this image, keep ONLY the "${obj.labelEn}" (${obj.label}) visible at its exact original position and scale. ` +
        `Replace ALL other areas with a perfectly solid flat background color (RGB ${bgColor.rgb} / hex ${bgColor.hex}). ` +
        `Preserve every detail of the "${obj.labelEn}": exact colors, lighting, proportions, edges and position. ` +
        `The background must be a perfectly uniform solid color with NO gradients, NO shadows, NO variations. ` +
        `Do NOT blend or feather the object edges into the background. Hard, clean boundary required.` +
        perspectiveHint;
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [{ inlineData: { data: cleanBase64, mimeType } }, { text: prompt }] },
    });
    const part = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    if (!part?.inlineData?.data) throw new Error('Gemini isolation 未回傳圖片');
    return `data:image/png;base64,${part.inlineData.data}`;
}

// ── 參考圖裁切：從原解析度原圖按 bbox + padding 裁出物件特寫 ─────────────────
// PRODUCT/TEXT 類隔離時附上，作為視角與字形的像素級錨點（防止模型把斜的轉正、字寫錯）
function cropBBoxWithPad(
    imageBase64: string,
    bbox: { x: number; y: number; w: number; h: number },
    padFrac = 0.04,
): Promise<string> {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const W = img.naturalWidth, H = img.naturalHeight;
            const x = Math.max(0, (bbox.x - padFrac)) * W;
            const y = Math.max(0, (bbox.y - padFrac)) * H;
            const w = Math.max(1, Math.min(W - x, (bbox.w + padFrac * 2) * W));
            const h = Math.max(1, Math.min(H - y, (bbox.h + padFrac * 2) * H));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(w); canvas.height = Math.round(h);
            canvas.getContext('2d')!.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve('');
        img.src = imageBase64;
    });
}

/** PNG 格式不必然含 alpha；檢查 Seedream 是否真的交付透明背景。 */
function hasTransparentPixels(src: string): Promise<boolean> {
    return new Promise(resolve => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(false); return; }
            ctx.drawImage(image, 0, 0);
            const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            for (let index = 3; index < pixels.length; index += 4) {
                if (pixels[index] < 250) { resolve(true); return; }
            }
            resolve(false);
        };
        image.onerror = () => resolve(false);
        image.src = src;
    });
}

// ── 單一物件提取（供 Promise.all 並發）──────────────────────────────────────
async function extractOneLayer(
    obj: DetectedObject,
    compressedImage: string,       // 預壓縮好的圖（只壓一次，給隔離模型用）
    detectedRatio: string,
    atlasKey: string | undefined,
    atlasModel: AtlasGenerationModel,
    falKey: string | undefined,
    geminiApiKey: string,          // Gemini fallback 用
    geminiImageModel: string,      // Gemini 隔離 model
    onProgress?: (msg: string) => void,
    referenceCrop?: string,        // PRODUCT/TEXT：原圖 bbox 特寫，視角與字形錨點
): Promise<LayerResult | null> {
    // TEXT / DECOR 類別：硬邊幾何形狀，BiRefNet 反而會誤判字母負空間
    // → 強制走 Chroma Key（純色背景下效果更準確）
    const isTextLayer = obj.category === 'TEXT' || obj.category === 'DECOR';
    const useBiRefNet = !!falKey && !isTextLayer;
    const bgColor = BG_COLOR_MAP[obj.bgColor] ?? BG_COLOR_MAP.GRAY;

    try {
        // ── 2a：隔離生成（GPT Image 2 優先；無 Atlas Key 降級 Gemini Flash Image）──
        // A'：條件式視角約束（只套 PRODUCT/TEXT——產品與文字最常被模型「轉正」成型錄視角；
        // 條件式寫法：斜的保持斜、正面的保持正面，不會誘發反向錯誤）
        const needsAngleLock = obj.category === 'PRODUCT' || obj.category === 'TEXT';
        const perspectiveHint = needsAngleLock
            ? ` Reproduce the "${obj.labelEn}" at the EXACT same viewing angle, perspective, rotation and foreshortening as it appears in the source image — if it is photographed at an angle or tilted, keep that exact angle; if frontal, keep it frontal. Do NOT normalize it into a straight catalog-style view. Text and letterforms must keep their original font, weight, spacing, and angle.`
            : '';
        // B：參考圖用途說明（特寫只當視角/字形錨點，不要複製它的背景）
        const refHint = referenceCrop
            ? ` The second image is a close-up crop of this exact object from the source image — use it ONLY as a reference for the precise viewing angle, proportions and letterforms. Do NOT copy its background.`
            : '';

        let isolatedSrc: string;
        let isNativeTransparent = false;
        if (atlasKey) {
            const isSeedreamPro = atlasModel === 'seedream-v5-pro';
            const isolated = await callAtlasImg2Img(
                isSeedreamPro
                    ? `Extract ONLY the "${obj.labelEn}" (${obj.label}) as a true RGBA PNG layer. ` +
                      `Every pixel outside this object must be fully transparent (alpha 0). Do not use a solid background, checkerboard, shadow plate, border, or matte. ` +
                      `Preserve the exact original position, scale, perspective, colors, materials, lighting and edges. ` +
                      `Preserve the source object's original opacity: solid objects such as paper, sticky notes, labels, products, logos and text panels must remain solid and must not become translucent, faded, ghosted or see-through. ` +
                      `Only preserve translucency when it is clearly present in the source, such as glass, smoke, liquid, sheer fabric or glow. Preserve shadows and highlights without reducing the opacity of the object's main body.` + perspectiveHint + refHint
                    : `In this image, keep ONLY the "${obj.labelEn}" (${obj.label}) visible at its exact original position and scale. ` +
                      `Replace ALL other areas with a perfectly solid flat background color (RGB ${bgColor.rgb} / hex ${bgColor.hex}). ` +
                      `Preserve every detail of the "${obj.labelEn}": exact colors, lighting, proportions, edges and position. ` +
                      `The background must be a perfectly uniform solid color with NO gradients, shadows, or variations. ` +
                      `CRITICAL: Do NOT blend or feather the object edges into the background. ` +
                      `The boundary between the "${obj.labelEn}" and the background must be hard and clean — ` +
                      `no color from the background (${bgColor.hex}) should tint or contaminate the object's edge pixels.` + perspectiveHint + refHint,
                atlasModel,
                atlasKey,
                compressedImage,
                1,
                isSeedreamPro
                    ? { ratio: detectedRatio, quality: '2K', outputFormat: 'png', keepAlpha: true }
                    : { ratio: detectedRatio },
                referenceCrop ? [referenceCrop] : undefined,
            );
            if (!isolated[0]) return null;
            isolatedSrc = isolated[0];
            isNativeTransparent = isSeedreamPro && await hasTransparentPixels(isolatedSrc);
        } else {
            isolatedSrc = await geminiIsolateOnSolidBg(obj, compressedImage, geminiApiKey, geminiImageModel, bgColor, perspectiveHint);
        }

        let transparent = isolatedSrc;
        if (!isNativeTransparent) {
            // API 未真的交付 alpha 時，才用舊的去背流程保底。
            const fallbackBgColor = atlasModel === 'seedream-v5-pro'
                ? await detectBackgroundColor(isolatedSrc)
                : bgColor.hex;
            isolatedSrc = await uniformizeBackground(isolatedSrc, fallbackBgColor);
            const birefnetModel = selectBiRefNetModel(obj.edgeComplexity, obj.category);
            const method = useBiRefNet ? `BiRefNet(${birefnetModel})` : 'Chroma Key';
            onProgress?.(`✂️ 去背：${obj.label}（${method}）`);
            const birefnetTimeout = obj.edgeComplexity === 'complex' ? 180_000 : 120_000;
            if (useBiRefNet) {
                transparent = await withTimeout(
                    birefnetRemoveBg(isolatedSrc, falKey!, birefnetModel),
                    birefnetTimeout,
                    () => removeColorBackground(isolatedSrc, fallbackBgColor, obj.edgeComplexity),
                );
            } else {
                transparent = await removeColorBackground(isolatedSrc, fallbackBgColor, obj.edgeComplexity);
            }
        }

        // ── 2c：裁切透明邊緣 ──────────────────────────────────────────────────
        const trimmed = await trimTransparentPixels(transparent);

        return {
            base64:      trimmed.base64,
            cropRatioX:  trimmed.cropRatioX,
            cropRatioY:  trimmed.cropRatioY,
            cropRatioW:  trimmed.cropRatioW,
            cropRatioH:  trimmed.cropRatioH,
            pixelWidth:  trimmed.pixelWidth,
            pixelHeight: trimmed.pixelHeight,
            bboxW:       obj.bbox.w,
            bboxH:       obj.bbox.h,
            name:        obj.label,
            category:    obj.category,
            prompt:      obj.description,
            bbox:        obj.bbox,
        };
    } catch (e) {
        console.warn(`[magicLayer] Skip "${obj.label}":`, e);
        return null;
    }
}

// ── 路線 0：SAM2 精確輪廓遮罩 + 本機 LaMa 補背景 ─────────────────────────────
// 零 API 費用、真 inpaint（洞外像素完全不動）、不會畫框線。
// 遮罩優先序：本機 SAM2 → fal.ai SAM2 → bbox 矩形（單一物件失敗時退級）
// 模型未下載或物件面積過大（LaMa 512 推論會糊）→ 回傳 null 交給 GPT 路線
async function lamaBackgroundFill(
    imageBase64: string,
    objects: DetectedObject[],
    falKey: string | undefined,
    onProgress?: (msg: string) => void,
): Promise<string | null> {
    const { getModelStatus } = await import('./onnxModelCache');
    if (await getModelStatus('lama') !== 'ready') return null;

    // 面積門檻：bbox 總面積 > 35% 時大面積紋理延伸超出 LaMa 能力，交給 GPT 語意補圖
    const totalArea = objects.reduce((s, o) => s + o.bbox.w * o.bbox.h, 0);
    if (totalArea > 0.35) {
        console.info(`[magicLayer] 物件總面積 ${(totalArea * 100).toFixed(0)}% 過大，LaMa 跳過改走 GPT`);
        return null;
    }

    const semUtils = await import('../components/SemanticEditor/semanticLayerUtils');
    const dims = await getDims(imageBase64);
    if (!dims) return null;

    // ── 每個物件的精確輪廓遮罩 ──
    const masks: string[] = [];
    const localSam2Ready =
        (await getModelStatus('sam2_encoder')) === 'ready' &&
        (await getModelStatus('sam2_decoder')) === 'ready';

    if (localSam2Ready) {
        const { sam2EncodeInWorker, sam2DecodeInWorker, terminateSam2Worker } =
            await import('./sam2WorkerClient');
        try {
            onProgress?.('🧠 本機 SAM2 計算輪廓遮罩...');
            await sam2EncodeInWorker(imageBase64);
            for (const o of objects) {
                try {
                    const png = await sam2DecodeInWorker(
                        { bbox: { x: o.bbox.x * dims.w, y: o.bbox.y * dims.h, w: o.bbox.w * dims.w, h: o.bbox.h * dims.h } },
                        imageBase64,
                    );
                    masks.push(await semUtils.transparentPngToInpaintMask(png));
                } catch {
                    masks.push(await generateBboxMask(imageBase64, [o]));
                }
            }
        } finally {
            terminateSam2Worker(); // 釋放 SAM2 記憶體再跑 LaMa，降低峰值
        }
    } else if (falKey) {
        onProgress?.('✂️ fal.ai SAM2 計算輪廓遮罩...');
        const results = await Promise.all(objects.map(async o => {
            try {
                const png = await semUtils.sam2Segment(imageBase64, falKey, dims, { bbox: o.bbox });
                return await semUtils.transparentPngToInpaintMask(png);
            } catch {
                return generateBboxMask(imageBase64, [o]);
            }
        }));
        masks.push(...results);
    } else {
        for (const o of objects) masks.push(await generateBboxMask(imageBase64, [o]));
    }

    // ── 逐物件區域填補：小區域讓 512 推論解析度集中 → 填補銳利 ──
    let current = imageBase64;
    for (let i = 0; i < objects.length; i++) {
        if (!masks[i]) continue;
        onProgress?.(`🧹 LaMa 補背景 ${i + 1}/${objects.length}：${objects[i].label}`);
        current = await semUtils.lamaInpaintRegion(current, masks[i], objects[i].bbox);
    }
    return current;
}

// ── 主要入口 ─────────────────────────────────────────────────────────────────
export async function gptLayerSegment(
    imageBase64: string,
    geminiApiKey: string,
    atlasKey: string | undefined,  // 可選：有則用 GPT Image 2，無則 Gemini fallback
    falKey?: string,
    onProgress?: (msg: string) => void,
    geminiImageModel = 'gemini-3.1-flash-image-preview',
    atlasModel: AtlasGenerationModel = 'gpt-image-2',
    options: Partial<MagicLayerOptions> = {},
    callbacks: MagicLayerExecutionCallbacks = {},
): Promise<LayerResult[]> {

    // Step 1：使用面板已確認的 plan；沒有 plan 時才在執行階段補分析。
    onProgress?.('🔍 載入已確認的分層規劃...');
    const plan = options.plan ?? await analyzeMagicLayerPlan(imageBase64, geminiApiKey, options);
    const objects: DetectedObject[] = plan.layers.map(layer => ({
        id: layer.id,
        label: layer.label,
        labelEn: layer.labelEn,
        category: layer.category,
        bgColor: layer.bgColor,
        edgeComplexity: layer.edgeComplexity,
        bbox: layer.bbox,
        description: layer.description,
    }));
    const bgMethod = falKey ? 'BiRefNet' : 'Chroma Key';
    onProgress?.(`✨ 偵測到 ${objects.length} 個元素，使用 ${bgMethod} 去背，平行處理中...`);

    // Step 2 & 3：物件提取（Promise.all 平行）+ 背景補全（同步開跑，互不等待）
    const labelsList = objects.map(o => `"${o.labelEn}" (${o.label})`).join(', ');
    const objectLocations = objects.map(o =>
        `${o.labelEn}: x=${Math.round(o.bbox.x * 100)}%, y=${Math.round(o.bbox.y * 100)}%, width=${Math.round(o.bbox.w * 100)}%, height=${Math.round(o.bbox.h * 100)}%`
    ).join('; ');

    // ⚡ 預處理：壓縮圖片 + 偵測比例 + 背景環境分析（三項並行，只做一次）
    onProgress?.('⚡ 預壓縮圖片、偵測比例、分析背景環境...');
    const [compressedImage, detectedRatio, bgDescription] = await Promise.all([
        compressForAtlas(imageBase64),
        detectClosestRatio(imageBase64),
        analyzeBackground(imageBase64, geminiApiKey),
    ]);

    // 背景補全：GPT Inpaint 優先（品質佳）；無 Atlas Key 或失敗才降級 Gemini
    onProgress?.('🗺️ 背景分析，準備補全...');
    const runBackground = async (): Promise<string | null> => {
        // 路線 0：SAM2 輪廓遮罩 + 本機 LaMa（免費、零框線、洞外像素不動、全解析度）
        try {
            const lamaResult = await lamaBackgroundFill(imageBase64, objects, falKey, onProgress);
            if (lamaResult) return lamaResult;
        } catch (e) {
            console.warn('[magicLayer] LaMa 補背景失敗，改走 GPT/Gemini', e);
        }
        if (atlasKey) {
            // 路線 1：全圖 + 指令移除（不挖洞）。
            // 挖洞 inpaint 會把場景切碎成瑞士起司，模型只能局部猜 → 補圖不連貫、沿洞緣畫框線；
            // 改給完整原圖讓模型理解整個場景，整張輸出「只剩背景」的版本，語意連貫性最好。
            // 底圖墊在所有物件圖層下方，全圖重繪的微漂移可接受。
            try {
                const removalPrompt = [
                    `Remove ALL of these foreground elements from this image: ${labelsList}.`,
                    `Their exact normalized bounding boxes are: ${objectLocations}. Remove only these regions and keep all other pixels unchanged.`,
                    'Output the SAME image with ONLY the background scene remaining.',
                    'Reconstruct the areas that were hidden behind the removed elements so the background continues naturally and seamlessly.',
                    'Keep the background composition, colors, lighting, textures and every detail EXACTLY as the original.',
                    'Do NOT add any new objects, people, text, watermarks, borders or frames.',
                    bgDescription ? `Background reference: ${bgDescription}` : '',
                ].filter(Boolean).join(' ');
                const result = await callAtlasImg2Img(
                    removalPrompt, atlasModel, atlasKey, compressedImage, 1, { ratio: detectedRatio },
                );
                if (result[0]) return result[0];
            } catch (e) {
                console.warn('[magicLayer] GPT 背景移除失敗，falling back to Gemini', e);
            }
        }
        return geminiInpaintBackground(compressedImage, objects, bgDescription, geminiApiKey, geminiImageModel)
            .catch(e => { console.warn('[magicLayer] Background failed:', e); return null; });
    };

    const TASK_TIMEOUT_MS = 15 * 60 * 1000;
    const withTimeout = async <T>(task: Promise<T>, label: string): Promise<T> => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
            return await Promise.race([
                task,
                new Promise<T>((_, reject) => {
                    timer = setTimeout(() => reject(new Error(`${label}超過 15 分鐘`)), TASK_TIMEOUT_MS);
                }),
            ]);
        } finally {
            if (timer) clearTimeout(timer);
        }
    };
    const runWithRetry = async <T>(factory: () => Promise<T>, label: string): Promise<T> => {
        let lastError: unknown;
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                return await withTimeout(factory(), label);
            } catch (error) {
                lastError = error;
                if (attempt < 2) onProgress?.(`↻「${label}」失敗，單層重試中...`);
            }
        }
        throw lastError;
    };
    const mapWithConcurrency = async <T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> => {
        const results = new Array<R>(items.length);
        let cursor = 0;
        const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
            while (cursor < items.length) {
                const index = cursor++;
                results[index] = await worker(items[index], index);
            }
        });
        await Promise.all(runners);
        return results;
    };
    const bgPromise = (options.includeBackground === false
        ? Promise.resolve<string | null>(null)
        : runWithRetry(runBackground, '背景補全'))
        .catch(error => {
            callbacks.onLayerFailed?.('background', error instanceof Error ? error.message : '背景補全失敗');
            return null;
        });
    const backgroundLayerPromise = bgPromise.then(async bgResult => {
        if (!bgResult || options.includeBackground === false) return null;
        let bgSrc = bgResult;
        const origDims = await getDims(imageBase64);
        if (origDims) bgSrc = await coverCropToAspect(bgSrc, origDims.w / origDims.h);
        const backgroundLayer: LayerResult = {
            base64: bgSrc,
            cropRatioX: 0,
            cropRatioY: 0,
            cropRatioW: 1,
            cropRatioH: 1,
            name: '補全背景',
            category: 'SUBJECT',
            isBackground: true,
        };
        callbacks.onLayerComplete?.('background', backgroundLayer);
        return backgroundLayer;
    });

    // 前景任務最多同時執行三張；每張獨立 timeout、retry、完成通知。
    const objectResults = await mapWithConcurrency(objects, 3, async (obj, i) => {
        try {
            onProgress?.(`🎨 提取第 ${i + 1}/${objects.length} 層：${obj.label}`);
            // B：PRODUCT/TEXT 附原圖 bbox 特寫當參考圖（視角與字形錨點，本機裁切零成本）
            let referenceCrop: string | undefined;
            if (atlasKey && (obj.category === 'PRODUCT' || obj.category === 'TEXT')) {
                try {
                    const rawCrop = await cropBBoxWithPad(imageBase64, obj.bbox);
                    if (rawCrop) referenceCrop = await compressForAtlas(rawCrop, 768, 0.9, false);
                } catch { /* 參考圖失敗不影響主流程 */ }
            }
            let result = await runWithRetry(() => extractOneLayer(
                obj, compressedImage, detectedRatio, atlasKey, atlasModel, falKey,
                geminiApiKey, geminiImageModel, onProgress, referenceCrop,
            ), obj.label);
            const usable = result &&
                result.base64.startsWith('data:image') &&
                result.cropRatioW * result.cropRatioH >= 0.0004 &&
                (result.pixelWidth ?? 16) >= 12 &&
                (result.pixelHeight ?? 16) >= 12;
            if (!usable) {
                onProgress?.(`↻「${obj.label}」品質檢查未通過，單層重試中...`);
                result = await withTimeout(extractOneLayer(
                    obj, compressedImage, detectedRatio, atlasKey, atlasModel,
                    falKey, geminiApiKey, geminiImageModel, onProgress, referenceCrop,
                ), obj.label);
            }
            if (result) callbacks.onLayerComplete?.(obj.id, result);
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : '圖層提取失敗';
            callbacks.onLayerFailed?.(obj.id, message);
            return null;
        }
    });

    // 等背景補全結果
    onProgress?.('🌄 等待背景補全完成...');
    const backgroundLayer = await backgroundLayerPromise;

    // 組合結果（背景放首位）
    const layers: LayerResult[] = [];

    if (backgroundLayer) layers.push(backgroundLayer);

    for (const r of objectResults) {
        if (r) layers.push(r);
    }

    if (layers.length === 0) throw new Error('所有圖層提取均失敗');
    return layers;
}
