/**
 * GPT Image 2 魔法分層（重構版）
 *
 * 定位策略：Gemini 回傳 bbox 座標 → 用於回貼位置（接近原圖）
 * 視覺策略：GPT Image 2 Edit 隔離 → BiRefNet/Chroma Key 去背（保持品質）
 * 效能策略：所有物件 Promise.all 平行處理，背景補全同步開跑互不等待
 *
 * 流程：
 *   Gemini（bbox + category + bgColor + edgeComplexity）
 *   → [Promise.all] GPT Image 2 隔離 → BiRefNet/Chroma Key 去背（含 timeout）
 *     - complex edge：timeout 3min；simple edge：timeout 2min
 *   → [同步] GPT Image 2 背景補全
 *   → LayerResult[]（cropRatio 來自 Gemini bbox，位置接近原圖）
 */

import { GoogleGenAI } from '@google/genai';
import { callAtlasImg2Img, callAtlasInpaint, compressForAtlas, detectClosestRatio } from './atlasImage';
import { birefnetRemoveBg } from './geminiLayer';
import { trimTransparentPixels, LayerResult } from './falImage';

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
async function detectObjects(imageBase64: string, apiKey: string): Promise<DetectedObject[]> {
    const ai = new GoogleGenAI({ apiKey });
    const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
    const mimeType = imageBase64.match(/data:(.*);base64/)?.[1] ?? 'image/png';

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

━━━ GROUPING RULES (important) ━━━
Physically touching or functionally related objects MUST be grouped into ONE layer:
- Person + any furniture/prop they are directly sitting on, holding, or wearing → ONE layer
- Character + vehicle/mount they are on → ONE layer
- Product + its stand/base/packaging it rests on → ONE layer
- Group of identical/similar small objects (e.g. multiple tickets, icons of the same type) → ONE layer
Do NOT split a person from their chair, a rider from their bike, etc.

━━━ LAYER COUNT RULES ━━━
Determine count based on actual image complexity — never force layers:
- Very simple (1-2 objects): return 2-3 layers
- Moderate (3-5 objects): return 3-5 layers
- Complex (6+ distinct objects): return 5-10 layers
Maximum 10 layers. Fewer precise layers beats more noisy layers.

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

Return ONLY a valid JSON array — no markdown, no explanation, no extra text:
[{"label":"人物","labelEn":"person","category":"SUBJECT","bgColor":"GREEN","edgeComplexity":"complex","bbox":{"x":0.10,"y":0.05,"w":0.35,"h":0.85}}]`
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

    // 按重要性排序，確保截取時重要層（主體、產品、文字）優先保留
    const CATEGORY_PRIORITY: Record<string, number> = {
        SUBJECT: 0, PRODUCT: 1, TEXT: 2, OBJECTS: 3, DECOR: 4,
    };
    objects.sort((a, b) =>
        (CATEGORY_PRIORITY[a.category] ?? 5) - (CATEGORY_PRIORITY[b.category] ?? 5)
    );

    // IoU 去重：bbox 重疊超過 50% 視為同一物件，保留優先順序較高的（已排序在前）
    const iou = (a: DetectedObject['bbox'], b: DetectedObject['bbox']): number => {
        const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
        const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
        const intersection = ix * iy;
        const union = a.w * a.h + b.w * b.h - intersection;
        return union > 0 ? intersection / union : 0;
    };
    const deduplicated: DetectedObject[] = [];
    for (const obj of objects) {
        const isDuplicate = deduplicated.some(kept => iou(kept.bbox, obj.bbox) > 0.5);
        if (!isDuplicate) deduplicated.push(obj);
    }
    objects = deduplicated;

    // 硬限：最多 10 個物件（避免 API 費用爆炸）
    if (objects.length > 10) objects = objects.slice(0, 10);

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

// ── Gemini 快速分析背景類型，回傳英文描述供 GPT Inpaint prompt 使用 ────────────
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

// ── 單一物件提取（供 Promise.all 並發）──────────────────────────────────────
async function extractOneLayer(
    obj: DetectedObject,
    compressedImage: string,   // 預壓縮好的圖（只壓一次）
    detectedRatio: string,     // 預偵測好的比例（只偵測一次）
    atlasKey: string,
    falKey: string | undefined,
    onProgress?: (msg: string) => void,
): Promise<LayerResult | null> {
    // TEXT / DECOR 類別：硬邊幾何形狀，BiRefNet 反而會誤判字母負空間
    // → 強制走 Chroma Key（純色背景下效果更準確）
    const isTextLayer = obj.category === 'TEXT' || obj.category === 'DECOR';
    const useBiRefNet = !!falKey && !isTextLayer;
    const bgColor = BG_COLOR_MAP[obj.bgColor] ?? BG_COLOR_MAP.GRAY;

    try {
        // 2a：GPT Image 2 Edit — 保留目標物件，填純色背景
        const isolated = await callAtlasImg2Img(
            `In this image, keep ONLY the "${obj.labelEn}" (${obj.label}) visible at its exact original position and scale. ` +
            `Replace ALL other areas with a perfectly solid flat background color (RGB ${bgColor.rgb} / hex ${bgColor.hex}). ` +
            `Preserve every detail of the "${obj.labelEn}": exact colors, lighting, proportions, edges and position. ` +
            `The background must be a perfectly uniform solid color with NO gradients, shadows, or variations. ` +
            `CRITICAL: Do NOT blend or feather the object edges into the background. ` +
            `The boundary between the "${obj.labelEn}" and the background must be hard and clean — ` +
            `no color from the background (${bgColor.hex}) should tint or contaminate the object's edge pixels.`,
            'gpt-image-2',
            atlasKey,
            compressedImage,   // 直接傳預壓縮圖，跳過內部壓縮
            1,
            { ratio: detectedRatio },  // 直接傳比例字串，跳過內部偵測
        );
        if (!isolated[0]) return null;

        // 2b：去背（BiRefNet 優先，timeout 後降級 Chroma Key）
        // complex edge → timeout 3min；simple edge → timeout 2min
        const method = useBiRefNet ? `BiRefNet${obj.edgeComplexity === 'complex' ? '/複雜邊緣' : ''}` : 'Chroma Key';
        onProgress?.(`✂️ 去背：${obj.label}（${method}）`);
        const birefnetTimeout = obj.edgeComplexity === 'complex' ? 180_000 : 120_000;
        let transparent: string;
        if (useBiRefNet) {
            transparent = await withTimeout(
                birefnetRemoveBg(isolated[0], falKey!),
                birefnetTimeout,
                () => {
                    console.warn(`[magicLayer] BiRefNet timeout for "${obj.label}", fallback chroma key`);
                    return removeColorBackground(isolated[0], bgColor.hex, obj.edgeComplexity);
                },
            );
        } else {
            transparent = await removeColorBackground(isolated[0], bgColor.hex, obj.edgeComplexity);
        }

        // 2c：裁切透明邊緣
        const trimmed = await trimTransparentPixels(transparent);

        // ⭐ 定位（x,y）用 Gemini bbox（位置接近原圖）
        //    尺寸（w,h）用 trimTransparentPixels 實際像素比例（防止回貼時比例拉伸）
        //    兩者各取所長：Gemini 定位準但尺寸是估算，trimmed 尺寸是真實像素
        return {
            base64:      trimmed.base64,
            cropRatioX:  obj.bbox.x,
            cropRatioY:  obj.bbox.y,
            cropRatioW:  trimmed.cropRatioW,   // 實際像素寬度比例，不拉伸
            cropRatioH:  trimmed.cropRatioH,   // 實際像素高度比例，不拉伸
            name:        obj.label,
            category:    obj.category,
        };
    } catch (e) {
        console.warn(`[magicLayer] Skip "${obj.label}":`, e);
        return null;
    }
}

// ── 主要入口 ─────────────────────────────────────────────────────────────────
export async function gptLayerSegment(
    imageBase64: string,
    geminiApiKey: string,
    atlasKey: string,
    falKey?: string,
    onProgress?: (msg: string) => void,
): Promise<LayerResult[]> {

    // Step 1：Gemini 識別元素 + bbox + category + bgColor
    onProgress?.('🔍 Gemini 分析圖片語意與位置中...');
    const objects = await detectObjects(imageBase64, geminiApiKey);
    const bgMethod = falKey ? 'BiRefNet' : 'Chroma Key';
    onProgress?.(`✨ 偵測到 ${objects.length} 個元素，使用 ${bgMethod} 去背，平行處理中...`);

    // Step 2 & 3：物件提取（Promise.all 平行）+ 背景補全（同步開跑，互不等待）
    const labelsList = objects.map(o => `"${o.labelEn}" (${o.label})`).join(', ');

    // ⚡ 預處理：壓縮圖片 + 偵測比例 + 背景環境分析（三項並行，只做一次）
    onProgress?.('⚡ 預壓縮圖片、偵測比例、分析背景環境...');
    const [compressedImage, detectedRatio, bgDescription] = await Promise.all([
        compressForAtlas(imageBase64),
        detectClosestRatio(imageBase64),
        analyzeBackground(imageBase64, geminiApiKey),
    ]);

    // 背景補全：用 bbox 遮罩 + Gemini 背景描述做精準 inpainting（同步開始，不等物件提取）
    onProgress?.('🗺️ 生成背景遮罩，準備補全背景...');
    const maskBase64 = await generateBboxMask(compressedImage, objects);
    const bgInpaintPrompt = bgDescription
        ? `Fill ONLY the masked (transparent) areas. Do NOT alter any existing background pixels outside the masked region.
Extend and continue the existing surrounding background content naturally into the holes.
Background reference: ${bgDescription}
Rules: match exact edge colors pixel-by-pixel, continue gradients/textures seamlessly, minimal reconstruction — only fill what is missing.`
        : `Fill ONLY the masked (transparent) areas by extending the surrounding background naturally. Do NOT alter any existing pixels outside the masked region. Minimal reconstruction only.`;
    const bgPromise = (maskBase64
        ? callAtlasInpaint(
            bgInpaintPrompt,
            compressedImage,
            maskBase64,
            atlasKey,
          )
        : callAtlasImg2Img(
            `Remove the following foreground elements from this image: ${labelsList}. ` +
            `Reconstruct the complete background naturally and realistically. ` +
            (bgDescription ? `Background environment: ${bgDescription} ` : '') +
            `Fill all areas where elements were removed with appropriate background content. ` +
            `Preserve the original background colors, lighting, perspective and atmosphere.`,
            'gpt-image-2',
            atlasKey,
            compressedImage,
            1,
            { ratio: detectedRatio },
          ).then(r => r[0] ?? null)
    ).catch(e => { console.warn('[magicLayer] Background inpainting failed:', e); return null; });

    // 所有物件平行去背
    const objectResults = await Promise.all(
        objects.map((obj, i) => {
            onProgress?.(`🎨 提取第 ${i + 1}/${objects.length} 層：${obj.label}`);
            return extractOneLayer(obj, compressedImage, detectedRatio, atlasKey, falKey, onProgress);
        })
    );

    // 等背景補全結果
    onProgress?.('🌄 等待背景補全完成...');
    const bgResult = await bgPromise;

    // 組合結果（背景放首位）
    const layers: LayerResult[] = [];

    if (bgResult) {
        const bgSrc = typeof bgResult === 'string' ? bgResult : (bgResult as string[])[0];
        if (bgSrc) {
            layers.push({
                base64:     bgSrc,
                cropRatioX: 0,
                cropRatioY: 0,
                cropRatioW: 1,
                cropRatioH: 1,
                name:       '補全背景',
                category:   'SUBJECT',
            });
        }
    }

    for (const r of objectResults) {
        if (r) layers.push(r);
    }

    if (layers.length === 0) throw new Error('所有圖層提取均失敗');
    return layers;
}
