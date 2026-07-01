/**
 * semanticLayerUtils.ts
 *
 * 分層邏輯（SAM2 版，非破壞性）：
 *   Gemini 偵測 bbox + category + description
 *   → fal.ai SAM2（box_prompts）→ apply_mask=true → 直接透明 PNG
 *   → trimTransparentPixels → SmartLayer[]（cropRatio 精確定位）
 *
 * 手動點選：
 *   使用者點圖片 → 像素座標 → SAM2（point prompts）→ 新 SmartLayer
 *
 * Apply：
 *   使用者改 prompt → GPT Image 2 img2img → SAM2 去背 → 放回原位
 *
 * 合成：
 *   原圖為底 → 依 zIndex 疊透明 PNG（用 cropRatio 定位）
 */

import { fal } from '@fal-ai/client';
import { GoogleGenAI } from '@google/genai';
import type { SmartLayer, SmartLayerCategory } from '../../types';
import { trimTransparentPixels } from '../../utils/falImage';
import { compressForAtlas, detectClosestRatio, downloadImageAsBase64 } from '../../utils/atlasImage';
import { sam2EncodeInWorker, sam2DecodeInWorker } from '../../utils/sam2WorkerClient';
import { getModelStatus } from '../../utils/onnxModelCache';

// ─── 型別 ────────────────────────────────────────────────────────────────────

interface DetectedObject {
    label: string;
    labelEn: string;
    category: SmartLayerCategory;
    edgeComplexity: 'simple' | 'complex';
    description: string;
    /** TEXT 類專用：框內辨識出的原始文字（OCR），其他類別留空 */
    text?: string;
    bbox: { x: number; y: number; w: number; h: number }; // 0–1
}

// ─── 工具函式 ────────────────────────────────────────────────────────────────

export function getImageDims(base64: string): Promise<{ w: number; h: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = reject;
        img.src = base64;
    });
}

/** base64 → File（fal.ai storage 上傳用） */
function base64ToFile(base64: string, filename = 'image.png'): File {
    const [header, data] = base64.includes(',') ? base64.split(',') : ['data:image/png;base64', base64];
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
    const ext  = mime.split('/')[1] ?? 'png';
    const bin  = atob(data);
    const arr  = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new File([arr], `${filename}.${ext}`, { type: mime });
}

/** 上傳 base64 到 fal.ai storage，回傳 URL */
async function uploadToFal(base64: string, falKey: string): Promise<string> {
    fal.config({ credentials: falKey });
    const file = base64ToFile(base64, 'sam2-input');
    return fal.storage.upload(file);
}

// ─── SAM2 API 呼叫 ────────────────────────────────────────────────────────────

interface SAM2BoxPrompt {
    x_min: number; y_min: number;
    x_max: number; y_max: number;
}

interface SAM2PointPrompt {
    x: number; y: number;
    label: 0 | 1;  // 1 = foreground, 0 = background
}

interface SAM2Options {
    imageUrl: string;
    falKey: string;
    boxPrompts?: SAM2BoxPrompt[];
    pointPrompts?: SAM2PointPrompt[];
}

/**
 * 呼叫 fal.ai SAM2，回傳透明 PNG base64
 * apply_mask=true → SAM2 直接輸出透明 PNG（不需要 BiRefNet）
 */
async function callSAM2({ imageUrl, falKey, boxPrompts, pointPrompts }: SAM2Options): Promise<string> {
    fal.config({ credentials: falKey });

    const input: Record<string, unknown> = {
        image_url:    imageUrl,
        apply_mask:   true,
        output_format: 'png',
        sync_mode:    false,
    };
    if (boxPrompts?.length)   input.box_prompts   = boxPrompts;
    if (pointPrompts?.length) input.prompts        = pointPrompts;

    const result = await fal.subscribe('fal-ai/sam2/image', { input: input as any });
    const data   = result.data as any;

    // 取結果 URL
    const url: string | undefined =
        data?.image?.url ??
        data?.images?.[0]?.url ??
        data?.url;
    if (!url) throw new Error('SAM2 未回傳結果圖片');

    const b64 = await downloadImageAsBase64(url);
    if (!b64) throw new Error('SAM2 結果下載失敗');
    return b64;
}

/**
 * 用 SAM2 從整張原圖中分割一個物件，回傳透明 PNG（全圖大小）
 * @param imageBase64  原圖 base64
 * @param falKey       fal.ai API key
 * @param bbox         Gemini bbox（0–1）→ 轉成像素 box_prompts
 * @param clickPt      使用者點擊座標（像素）→ point prompts（bbox 與 clickPt 擇一）
 */
export async function sam2Segment(
    imageBase64: string,
    falKey: string,
    dims: { w: number; h: number },
    options: {
        bbox?: DetectedObject['bbox'];           // A：矩形框（0–1 比例）
        clickPt?: { x: number; y: number };      // 單點（像素）
        points?: { x: number; y: number; label: 0 | 1 }[];  // B：多點（像素，1=前景 0=背景）
    },
): Promise<string> {
    const imageUrl = await uploadToFal(imageBase64, falKey);

    // box 與 point 可同時提供（box 圈範圍、point 強化主體），SAM2 會一起考量
    const boxPrompts: SAM2BoxPrompt[] = [];
    const pointPrompts: SAM2PointPrompt[] = [];

    if (options.bbox) {
        const { bbox } = options;
        boxPrompts.push({
            x_min: Math.round(bbox.x * dims.w),
            y_min: Math.round(bbox.y * dims.h),
            x_max: Math.round((bbox.x + bbox.w) * dims.w),
            y_max: Math.round((bbox.y + bbox.h) * dims.h),
        });
    }
    if (options.points && options.points.length > 0) {
        pointPrompts.push(...options.points.map(p => ({
            x: Math.round(p.x), y: Math.round(p.y), label: p.label,
        })));
    }
    if (options.clickPt) {
        pointPrompts.push({
            x: Math.round(options.clickPt.x),
            y: Math.round(options.clickPt.y),
            label: 1,
        });
    }

    if (!boxPrompts.length && !pointPrompts.length) {
        throw new Error('sam2Segment: 需要提供 bbox、points 或 clickPt');
    }

    return callSAM2({
        imageUrl, falKey,
        boxPrompts:   boxPrompts.length   ? boxPrompts   : undefined,
        pointPrompts: pointPrompts.length ? pointPrompts : undefined,
    });
}

// ─── Gemini 偵測 ──────────────────────────────────────────────────────────────

async function detectObjectsForSegmentation(
    imageBase64: string,
    geminiApiKey: string,
): Promise<DetectedObject[]> {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
    const mimeType    = imageBase64.match(/data:(.*);base64/)?.[1] ?? 'image/png';

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { mimeType, data: cleanBase64 } },
                {
                    text: `You are a professional image segmentation AI for a design editor.
Analyze this image and identify distinct foreground objects that should become independent editable layers.

━━━ INCLUSION CRITERIA ━━━
Include ONLY if ALL are true:
1. Self-contained recognizable object/person/product/text/illustration
2. Could stand alone on transparent background meaningfully
3. Has clear identifiable edges (even if complex)

━━━ STRICT EXCLUSION ━━━
Do NOT include:
- Shadows (belong to parent object)
- Background fills covering >35% of image
- Color gradients, vignettes, glow effects
- Reflections, haze, blur areas

━━━ GROUPING ━━━
Related touching objects = ONE layer:
- Person + clothing/accessories/held items → ONE layer
- Product + its packaging/base → ONE layer
- Logo lockup (icon + wordmark + tagline) → ONE layer. NEVER output both a "logo"/"decoration" AND a separate "text" element for the same visual unit.

━━━ NO DUPLICATES ━━━
Every pixel region belongs to AT MOST ONE element.
No bbox may contain or duplicate another output bbox. Self-check before returning.

━━━ LAYER COUNT ━━━
- 1-2 objects: return 2-3 layers
- 3-5 objects: return 3-5 layers
- 6+ objects: return 5-8 layers (max 8)

━━━ CATEGORIES ━━━
SUBJECT: main person, character, model, portrait
PRODUCT: featured product, hero item, merchandise, food
OBJECTS: props, tools, accessories, secondary items
DECOR: decorative shapes, patterns, icons, illustrations
TEXT: text overlays, logos, typography, labels

━━━ EDGE COMPLEXITY ━━━
"simple": clean hard edges (products, text, solid shapes)
"complex": fine/irregular (hair, fur, transparent glass)

━━━ BBOX ━━━
Tightest rectangle. x,y = top-left corner (0.0–1.0 fraction of image). w,h = size fraction.

━━━ DESCRIPTION ━━━
15-35 word English visual description for image generation prompt.

━━━ TEXT TRANSCRIPTION (OCR) ━━━
For category "TEXT" ONLY: also fill a "text" field with the EXACT readable text inside the bbox, transcribed verbatim (keep original language, punctuation, casing, and line breaks as "\n"). For all other categories, omit "text" or set it to "".

━━━ LANGUAGE RULES (CRITICAL) ━━━
The "label" field MUST use Traditional Chinese (繁體中文), English, or Japanese ONLY.
NEVER use Simplified Chinese characters (简体字).
Examples of correct Traditional Chinese: 人物, 罐頭, 魚, 背景, 產品
Examples of FORBIDDEN Simplified Chinese: 人物→OK, 罐头→WRONG(use 罐頭), 鱼→WRONG(use 魚)

Return ONLY valid JSON array:
[{"label":"人物","labelEn":"person","category":"SUBJECT","edgeComplexity":"complex","bbox":{"x":0.10,"y":0.05,"w":0.35,"h":0.85},"description":"A young East Asian woman in white shirt, smiling at camera, with long dark hair"},
{"label":"標題","labelEn":"headline","category":"TEXT","edgeComplexity":"simple","bbox":{"x":0.05,"y":0.02,"w":0.6,"h":0.1},"description":"Large bold headline in dark green serif font","text":"大型傳統中文標題區域"}]`,
                },
            ],
        },
    });

    const raw      = response.text ?? '';
    const stripped = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    const match    = stripped.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('Gemini 未回傳偵測結果');

    let objects: DetectedObject[];
    try { objects = JSON.parse(match[0]); }
    catch { throw new Error('Gemini JSON 解析失敗'); }
    if (!objects?.length) throw new Error('Gemini 未偵測到任何物件');

    // 優先級排序
    const PRIORITY: Record<string, number> = {
        SUBJECT: 0, PRODUCT: 1, TEXT: 2, OBJECTS: 3, DECOR: 4,
    };
    objects.sort((a, b) => (PRIORITY[a.category] ?? 5) - (PRIORITY[b.category] ?? 5));

    // 去重：TEXT/DECOR 的 logo 重複辨識是「一大一小包含關係」，IoU 天生失效，
    // 改用 overlap coefficient（交集 ÷ 較小框面積）並合併成聯集框；其他類別維持 IoU
    type BBox = DetectedObject['bbox'];
    const intersectArea = (a: BBox, b: BBox) => {
        const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
        const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
        return ix * iy;
    };
    const iou = (a: BBox, b: BBox) => {
        const inter = intersectArea(a, b);
        const union = a.w * a.h + b.w * b.h - inter;
        return union > 0 ? inter / union : 0;
    };
    const overlapCoeff = (a: BBox, b: BBox) => {
        const inter = intersectArea(a, b);
        const minArea = Math.min(a.w * a.h, b.w * b.h);
        return minArea > 0 ? inter / minArea : 0;
    };
    const isLogoLike = (cat: string) => cat === 'TEXT' || cat === 'DECOR';
    const deduped: DetectedObject[] = [];
    for (const obj of objects) {
        const logoDup = isLogoLike(obj.category)
            ? deduped.find(k => isLogoLike(k.category) && overlapCoeff(k.bbox, obj.bbox) > 0.55)
            : undefined;
        if (logoDup) {
            const x = Math.min(logoDup.bbox.x, obj.bbox.x), y = Math.min(logoDup.bbox.y, obj.bbox.y);
            logoDup.bbox = {
                x, y,
                w: Math.max(logoDup.bbox.x + logoDup.bbox.w, obj.bbox.x + obj.bbox.w) - x,
                h: Math.max(logoDup.bbox.y + logoDup.bbox.h, obj.bbox.y + obj.bbox.h) - y,
            };
            if (obj.edgeComplexity === 'complex') logoDup.edgeComplexity = 'complex';
            continue;
        }
        if (!deduped.some(k => iou(k.bbox, obj.bbox) > 0.5)) deduped.push(obj);
    }

    return deduped.slice(0, 8).map(o => ({
        ...o,
        edgeComplexity: (o.edgeComplexity === 'complex' || o.edgeComplexity === 'simple')
            ? o.edgeComplexity : ('simple' as const),
        bbox: {
            x: Math.max(0, Math.min(0.98, o.bbox?.x ?? 0)),
            y: Math.max(0, Math.min(0.98, o.bbox?.y ?? 0)),
            w: Math.max(0.02, Math.min(1, o.bbox?.w ?? 0.3)),
            h: Math.max(0.02, Math.min(1, o.bbox?.h ?? 0.3)),
        },
    }));
}

// ─── Gemini 圖層描述（手動新增時使用）─────────────────────────────────────────
/**
 * 對已去背的圖層呼叫 Gemini，生成 15-35 字的英文描述作為 prompt
 * 失敗時靜默回傳空字串（不影響圖層建立）
 */
export async function describeLayerWithGemini(
    base64: string,
    geminiApiKey: string,
): Promise<{ name: string; prompt: string }> {
    try {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const clean = base64.split(',')[1] || base64;
        const mime  = base64.match(/data:(.*);base64/)?.[1] ?? 'image/png';

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: mime, data: clean } },
                    { text: `Analyze this image object and respond ONLY with a JSON object (no markdown):
{"name":"<2-4 char Traditional Chinese noun, e.g. 人物/金魚/蝴蝶結>","prompt":"<15-35 word English image generation description with subject, colors, pose, details>"}` },
                ],
            },
        });

        const raw = (response.text ?? '').trim().replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(raw);
        return {
            name:   (parsed.name   ?? '').trim(),
            prompt: (parsed.prompt ?? '').trim(),
        };
    } catch {
        return { name: '', prompt: '' };
    }
}

// ─── SmartLayer 工廠 ──────────────────────────────────────────────────────────

async function buildSmartLayer(
    transparentPng: string,   // 全圖大小的透明 PNG
    meta: {
        name: string;
        category: SmartLayerCategory;
        description: string;
        text?: string;
        bbox: DetectedObject['bbox'];
        zIndex: number;
    },
): Promise<SmartLayer> {
    const trimmed = await trimTransparentPixels(transparentPng);
    return {
        id:             `sl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name:           meta.name,
        category:       meta.category,
        base64:         trimmed.base64,
        originalBase64: trimmed.base64,
        prompt:         meta.description,
        appliedPrompt:  meta.description,   // 初始時 prompt = appliedPrompt
        text:           meta.text,
        bbox:           meta.bbox,
        cropRatio: {
            x: trimmed.cropRatioX,
            y: trimmed.cropRatioY,
            w: trimmed.cropRatioW,
            h: trimmed.cropRatioH,
        },
        pixelWidth:  trimmed.pixelWidth,
        pixelHeight: trimmed.pixelHeight,
        history:     [],
        isVisible:   true,
        isLocked:    false,
        zIndex:      meta.zIndex,
    };
}

// ─── 影像裁切工具 ──────────────────────────────────────────────────────────────

/** 依 bbox（0-1 比例）裁切圖片，回傳裁切後的 base64 */
async function cropToBBox(
    imageBase64: string,
    bbox: { x: number; y: number; w: number; h: number },
): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const W = img.naturalWidth, H = img.naturalHeight;
            const x = Math.round(bbox.x * W);
            const y = Math.round(bbox.y * H);
            const w = Math.max(1, Math.round(bbox.w * W));
            const h = Math.max(1, Math.round(bbox.h * H));
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d')!.drawImage(img, x, y, w, h, 0, 0, w, h);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = imageBase64;
    });
}

/** 把裁切圖貼回全尺寸透明畫布的 bbox 位置 */
async function placeInFullCanvas(
    croppedBase64: string,
    fullW: number,
    fullH: number,
    bbox: { x: number; y: number; w: number; h: number },
): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = fullW; canvas.height = fullH;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(
                img, 0, 0, img.naturalWidth, img.naturalHeight,
                Math.round(bbox.x * fullW), Math.round(bbox.y * fullH),
                Math.round(bbox.w * fullW), Math.round(bbox.h * fullH),
            );
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = croppedBase64;
    });
}

/** 載入 base64 為 HTMLImageElement */
function loadImg(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

/**
 * 區域 LaMa 填補（A 方案）：只在「舊物件 bbox + 邊距」的小範圍跑 LaMa，
 * 再用遮罩把填補結果貼回原圖（只覆蓋破洞像素，其餘維持原圖銳利）。
 *
 * 為何這樣做：
 *  - Worker 內部一律壓到 512×512 推論。整張圖會讓全圖降質模糊；只跑 crop
 *    可把 512 解析度用在小區域 → 填補更銳利，記憶體/canvas 也更小。
 *  - Worker 回傳的是「整塊 crop 重繪」，故貼回時只取遮罩白色處，避免接縫。
 *
 * @param compositeBase64 目前合成圖（含舊物件）
 * @param fullMaskBase64  全尺寸黑白遮罩（白=要填補的舊物件區）
 * @param bbox            舊物件 bbox（0–1）
 * @param padFrac         邊距比例（相對 bbox 尺寸，預設 0.5＝各邊外擴半個物件寬高）
 */
export async function lamaInpaintRegion(
    compositeBase64: string,
    fullMaskBase64: string,
    bbox: { x: number; y: number; w: number; h: number },
    padFrac = 0.5,
): Promise<string> {
    const { runLamaInWorker } = await import('../../utils/lamaWorkerClient');
    const { w: W, h: H } = await getImageDims(compositeBase64);

    // 1) bbox 外擴邊距，clamp 到 [0,1]
    const padW = bbox.w * padFrac;
    const padH = bbox.h * padFrac;
    const ex = {
        x: Math.max(0, bbox.x - padW),
        y: Math.max(0, bbox.y - padH),
        w: 0, h: 0,
    };
    ex.w = Math.min(1 - ex.x, bbox.w + padW * 2);
    ex.h = Math.min(1 - ex.y, bbox.h + padH * 2);

    // 2) 同步裁切「合成圖」與「遮罩」到 ex 區域
    const [cropImg, cropMask] = await Promise.all([
        cropToBBox(compositeBase64, ex),
        cropToBBox(fullMaskBase64, ex),
    ]);

    // 3) 只對小 crop 跑 LaMa（整塊會被重繪）
    const lamaCrop = await runLamaInWorker(cropImg, cropMask);

    // 4) 遮罩貼回：用 cropMask 白色處的 alpha，只把 LaMa 填補像素蓋回原圖
    const [origImg, lamaImg, maskImg] = await Promise.all([
        loadImg(compositeBase64), loadImg(lamaCrop), loadImg(cropMask),
    ]);
    const cw = lamaImg.naturalWidth, ch = lamaImg.naturalHeight;

    // 4a) 在 crop 尺寸上，把 LaMa 結果依遮罩轉成「只有破洞不透明」
    const patch = document.createElement('canvas');
    patch.width = cw; patch.height = ch;
    const pctx = patch.getContext('2d')!;
    pctx.drawImage(lamaImg, 0, 0, cw, ch);
    const patchData = pctx.getImageData(0, 0, cw, ch);

    const mc = document.createElement('canvas');
    mc.width = cw; mc.height = ch;
    const mctx = mc.getContext('2d')!;
    mctx.drawImage(maskImg, 0, 0, cw, ch);
    const maskData = mctx.getImageData(0, 0, cw, ch).data;
    for (let i = 0; i < cw * ch; i++) {
        // 遮罩白(>127)=填補區→保留；黑=透明
        patchData.data[i * 4 + 3] = maskData[i * 4] > 127 ? 255 : 0;
    }
    pctx.putImageData(patchData, 0, 0);

    // 4b) 原圖上，於 ex 位置疊上 patch（只覆蓋破洞）
    const out = document.createElement('canvas');
    out.width = W; out.height = H;
    const octx = out.getContext('2d')!;
    octx.drawImage(origImg, 0, 0, W, H);
    octx.drawImage(
        patch, 0, 0, cw, ch,
        Math.round(ex.x * W), Math.round(ex.y * H),
        Math.round(ex.w * W), Math.round(ex.h * H),
    );
    return out.toDataURL('image/png');
}

// ─── 自動分層（Gemini bbox → SAM2）──────────────────────────────────────────

export interface SegmentOptions {
    imageBase64: string;
    geminiApiKey: string;
    falApiKey: string;       // SAM2 必須有 fal key
    onProgress?: (msg: string) => void;
}

export async function segmentSemanticLayers({
    imageBase64,
    geminiApiKey,
    falApiKey,
    onProgress,
}: SegmentOptions): Promise<SmartLayer[]> {

    onProgress?.('Gemini 分析圖片結構...');
    const objects = await detectObjectsForSegmentation(imageBase64, geminiApiKey);
    onProgress?.(`偵測到 ${objects.length} 個物件，SAM2 分割中...`);

    const dims = await getImageDims(imageBase64);

    // 平行處理：先裁切 bbox，再讓 SAM2 在小圖上分割（比全圖 bbox 準確）
    const results = await Promise.all(
        objects.map(async (obj, i) => {
            try {
                onProgress?.(`SAM2 分割 ${i + 1}/${objects.length}：${obj.label}`);

                // 全圖 + Gemini bbox_prompt：SAM2 設計用途就是這樣
                // 給一個框 → SAM2 在框內找最顯著前景 → 穩定有效
                const transparentPng = await sam2Segment(
                    imageBase64,
                    falApiKey,
                    dims,
                    { bbox: obj.bbox },
                );

                return buildSmartLayer(transparentPng, {
                    name:        obj.label,
                    category:    obj.category,
                    description: obj.description ?? obj.label,
                    text:        obj.text,
                    bbox:        obj.bbox,
                    zIndex:      objects.length - i,
                });
            } catch (e) {
                console.warn(`[SAM2] failed for "${obj.label}", using bbox crop as fallback:`, e);
                // fallback：SAM2 失敗時，直接用 bbox 裁切的原始像素作為圖層
                // 不去背，但至少圖層面板有東西顯示，使用者知道分層完成了
                try {
                    const fallbackCrop = await cropToBBox(imageBase64, obj.bbox);
                    const fallbackFull = await placeInFullCanvas(fallbackCrop, dims.w, dims.h, obj.bbox);
                    return buildSmartLayer(fallbackFull, {
                        name:        `${obj.label}（未去背）`,
                        category:    obj.category,
                        description: obj.description ?? obj.label,
                        text:        obj.text,
                        bbox:        obj.bbox,
                        zIndex:      objects.length - i,
                    });
                } catch {
                    return null;
                }
            }
        })
    );

    const layers = results.filter((l): l is SmartLayer => l !== null);
    if (layers.length === 0) throw new Error('所有物件分割均失敗，請重試或檢查 API Key');
    return layers;
}

// ─── 純文字掃描：專用「逐塊文字偵測」prompt（不重用物件偵測）─────────────────────

interface TextBlock {
    label: string;
    text: string;
    bbox: { x: number; y: number; w: number; h: number }; // 0–1
    description?: string;
}

/**
 * 文字編輯模式專用的偵測器——和物件偵測完全脫鉤。
 * 物件偵測會合併鄰近文字、上限 8 層、bbox 偏大；這裡相反：
 * 一行/一塊文字各一個框、不合併、不設上限、框貼緊字、含逐字 OCR。
 */
async function detectTextBlocks(
    imageBase64: string,
    geminiApiKey: string,
): Promise<TextBlock[]> {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
    const mimeType    = imageBase64.match(/data:(.*);base64/)?.[1] ?? 'image/png';

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { mimeType, data: cleanBase64 } },
                {
                    text: `You are a precise OCR + text-block localizer for a design editor.
Find EVERY distinct block of text in the image. Return a TIGHT bounding box and the exact transcription for each.

━━━ WHAT IS ONE TEXT BLOCK ━━━
- A visually contiguous run of text sharing ONE font, size, and color.
- One headline LINE = one block. If a title spans two lines with different size/weight/color, output TWO separate blocks.
- A paragraph of body text = one block.
- Each label, page number, caption, footer, corner tag, small footnote = its OWN block.
- Readable words inside a logo: only if clearly legible; otherwise skip the logo.

━━━ STRICT RULES ━━━
- ONE box per block. NEVER merge separate blocks into a single box, even if they are close together or stacked.
- NEVER group a logo, icon, or graphic together with nearby text.
- Do NOT skip small or edge text (page numbers, footers, corner labels). Include them ALL.
- Transcribe verbatim: keep the original language, punctuation, casing. Use "\\n" for line breaks inside one block.
- Return up to 30 blocks. Order them top-to-bottom, left-to-right.

━━━ BOUNDING BOX (CRITICAL — READ CAREFULLY) ━━━
- Provide "box_2d" as [ymin, xmin, ymax, xmax], each an INTEGER normalized to 0–1000
  (ymin/ymax = vertical, xmin/xmax = horizontal; 0 = top/left edge, 1000 = bottom/right edge).
- The box must hug the visible GLYPHS as tightly as possible: the top edge touches the
  tallest glyph's top, the bottom edge touches the lowest descender, left edge touches the
  first glyph, right edge touches the last glyph. NO surrounding margin, NO background padding,
  NO empty space. If unsure, err on the side of TIGHTER, not looser.

━━━ LANGUAGE OF "label" ━━━
Traditional Chinese (繁體中文), English, or Japanese ONLY. NEVER Simplified Chinese.

Return ONLY a valid JSON array (no markdown):
[{"label":"主標題","text":"2026年の日本","box_2d":[180,300,235,700],"description":"large white serif headline line"}]`,
                },
            ],
        },
    });

    const raw      = response.text ?? '';
    const stripped = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    const match    = stripped.match(/\[[\s\S]*\]/);
    if (!match) return [];

    let blocks: any[];
    try { blocks = JSON.parse(match[0]); }
    catch { return []; }
    if (!Array.isArray(blocks)) return [];

    // 把 Gemini 原生 box_2d [ymin,xmin,ymax,xmax]（0–1000 整數）轉成內部 {x,y,w,h}（0–1 小數）。
    // 若模型仍回舊的 {x,y,w,h} 格式則沿用，確保不會整批失敗。
    const toBbox = (b: any): { x: number; y: number; w: number; h: number } | null => {
        if (Array.isArray(b.box_2d) && b.box_2d.length === 4) {
            let [ymin, xmin, ymax, xmax] = b.box_2d.map((n: number) => Number(n) / 1000);
            if (xmax < xmin) [xmin, xmax] = [xmax, xmin];
            if (ymax < ymin) [ymin, ymax] = [ymin, ymax];
            return { x: xmin, y: ymin, w: xmax - xmin, h: ymax - ymin };
        }
        if (b.bbox && typeof b.bbox.x === 'number') {
            return { x: b.bbox.x, y: b.bbox.y, w: b.bbox.w, h: b.bbox.h };
        }
        return null;
    };

    // 僅清理 bbox 範圍，不做任何合併/去重（保留逐塊粒度）
    return blocks
        .map(b => {
            const raw = toBbox(b);
            if (!raw || !(b.text ?? '').toString().trim()) return null;
            return {
                label: (b.label ?? '文字').toString().trim() || '文字',
                text:  b.text.toString(),
                description: (b.description ?? b.label ?? '').toString(),
                bbox: {
                    x: Math.max(0, Math.min(0.99, raw.x)),
                    y: Math.max(0, Math.min(0.99, raw.y)),
                    w: Math.max(0.005, Math.min(1, raw.w)),
                    h: Math.max(0.005, Math.min(1, raw.h)),
                },
            } as TextBlock;
        })
        .filter((b): b is TextBlock => b !== null)
        .slice(0, 30);
}

/**
 * 使用 binarization-based text contour finder 演算法精確優化 Gemini 的文字 BBox 坐標
 */
async function refineTextBBox(
    img: HTMLImageElement,
    bbox: { x: number; y: number; w: number; h: number }
): Promise<{ x: number; y: number; w: number; h: number }> {
    const W = img.naturalWidth;
    const H = img.naturalHeight;
    if (!W || !H) return bbox;

    // 1) 垂直與水平方向適度外擴，建立足夠的背景取樣緩衝區
    // 垂直方向外擴 60% 高度以包容 y 軸漂移，水平外擴 15% 寬度
    const padY = Math.max(0.02, bbox.h * 0.6);
    const padX = Math.max(0.015, bbox.w * 0.15);

    const ex = {
        x: Math.max(0, bbox.x - padX),
        y: Math.max(0, bbox.y - padY),
        w: 0,
        h: 0,
    };
    ex.w = Math.min(1 - ex.x, bbox.w + padX * 2);
    ex.h = Math.min(1 - ex.y, bbox.h + padY * 2);

    const cropW = Math.round(ex.w * W);
    const cropH = Math.round(ex.h * H);
    if (cropW <= 2 || cropH <= 2) return bbox;

    // 2) 繪製至記憶體 canvas 以讀取像素
    const canvas = document.createElement('canvas');
    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, Math.round(ex.x * W), Math.round(ex.y * H), cropW, cropH, 0, 0, cropW, cropH);

    let pixels: Uint8ClampedArray;
    try {
        pixels = ctx.getImageData(0, 0, cropW, cropH).data;
    } catch (err) {
        console.warn('[refineTextBBox] getImageData failed:', err);
        return bbox;
    }

    // 3) 計算水平與垂直梯度投影（X/Y 邊緣投影）
    const rowGrads = new Float32Array(cropH);
    const colGrads = new Float32Array(cropW);

    for (let y = 0; y < cropH; y++) {
        for (let x = 0; x < cropW; x++) {
            const idx = (y * cropW + x) * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];

            // 與右側像素的差值
            if (x < cropW - 1) {
                const idxR = idx + 4;
                const rR = pixels[idxR];
                const gR = pixels[idxR + 1];
                const bR = pixels[idxR + 2];
                const diff = Math.abs(r - rR) + Math.abs(g - gR) + Math.abs(b - bR);
                rowGrads[y] += diff;
                colGrads[x] += diff;
            }

            // 與下方像素的差值
            if (y < cropH - 1) {
                const idxB = idx + cropW * 4;
                const rB = pixels[idxB];
                const gB = pixels[idxB + 1];
                const bB = pixels[idxB + 2];
                const diff = Math.abs(r - rB) + Math.abs(g - gB) + Math.abs(b - bB);
                rowGrads[y] += diff;
                colGrads[x] += diff;
            }
        }
    }

    // 4) 尋找有效的邊緣邊界（過濾掉空白/背景雜訊）
    let maxRowGrad = 0;
    for (let y = 0; y < cropH; y++) {
        if (rowGrads[y] > maxRowGrad) maxRowGrad = rowGrads[y];
    }
    let maxColGrad = 0;
    for (let x = 0; x < cropW; x++) {
        if (colGrads[x] > maxColGrad) maxColGrad = colGrads[x];
    }

    // 門檻值設定為最大邊緣強度的 8%，防止小噪點干擾，同時能抓到邊緣
    const rowThresh = maxRowGrad * 0.08;
    const colThresh = maxColGrad * 0.08;

    let ymin = 0, ymax = cropH - 1;
    while (ymin < cropH && rowGrads[ymin] < rowThresh) ymin++;
    while (ymax > ymin && rowGrads[ymax] < rowThresh) ymax--;

    let xmin = 0, xmax = cropW - 1;
    while (xmin < cropW && colGrads[xmin] < colThresh) xmin++;
    while (xmax > xmin && colGrads[xmax] < colThresh) xmax--;

    // 確保範圍有效，否則 fallback
    if (ymin >= ymax || xmin >= xmax) return bbox;

    // 向外微調 3px 作為安全內襯 padding
    const padding = 3;
    ymin = Math.max(0, ymin - padding);
    ymax = Math.min(cropH - 1, ymax + padding);
    xmin = Math.max(0, xmin - padding);
    xmax = Math.min(cropW - 1, xmax + padding);

    // 5) 對應回原始圖片比例 0~1
    return {
        x: ex.x + (xmin / cropW) * ex.w,
        y: ex.y + (ymin / cropH) * ex.h,
        w: ((xmax - xmin + 1) / cropW) * ex.w,
        h: ((ymax - ymin + 1) / cropH) * ex.h,
    };
}

/**
 * 文字編輯模式入口：掃出每塊文字 → bbox 直接建層（矩形含背景，inpaint 重繪時需要底色）。
 * 不跑 SAM2，只需 Gemini Key。每層標 fromTextScan，與物件分析的 TEXT 層區分。
 */
/**
 * 文字編輯模式：本機 ONNX OCR（PaddleOCR-v4）偵測器。
 * 把 ocrService 的 OcrBlock（x/y/w/h + 樣式）轉成本檔下游吃的 TextBlock。
 * 模型未安裝 / Worker 失敗時丟錯，由 detectTextRegions 負責降級 Gemini。
 */
async function detectTextBlocksLocal(imageBase64: string): Promise<TextBlock[]> {
    const { runOcrInWorker } = await import('../../utils/ocrWorkerClient');
    const blocks = await runOcrInWorker(imageBase64);
    return (blocks || [])
        .filter(b => (b.text ?? '').toString().trim())
        .map(b => ({
            label: ((b.text.split('\n')[0] || '文字').trim().slice(0, 14)) || '文字',
            text:  b.text.toString(),
            description: '',
            bbox: {
                x: Math.max(0, Math.min(0.99, b.bbox?.x ?? 0)),
                y: Math.max(0, Math.min(0.99, b.bbox?.y ?? 0)),
                w: Math.max(0.005, Math.min(1, b.bbox?.w ?? 0.05)),
                h: Math.max(0.005, Math.min(1, b.bbox?.h ?? 0.03)),
            },
        } as TextBlock))
        .slice(0, 60); // 本機逐行偵測通常較多框，放寬上限
}

/**
 * 用本機 DBNet 偵測框「吸附收緊」一塊 LLM 粗框：
 * 取所有「中心落在該粗框（稍放寬）內」的偵測框之聯集 = 該塊文字的像素級緊框。
 * 同一塊多行/多字會被一起框住；沒有命中回 null（交給呼叫端 fallback）。
 */
function snapToDetections(
    box: { x: number; y: number; w: number; h: number },
    detBoxes: { x: number; y: number; w: number; h: number }[],
): { x: number; y: number; w: number; h: number } | null {
    if (!detBoxes.length) return null;
    const mx = box.x - box.w * 0.1, my = box.y - box.h * 0.1;
    const Mx = box.x + box.w * 1.1, My = box.y + box.h * 1.1;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, hit = 0;
    for (const d of detBoxes) {
        const cx = d.x + d.w / 2, cy = d.y + d.h / 2;
        if (cx >= mx && cx <= Mx && cy >= my && cy <= My) {
            x0 = Math.min(x0, d.x); y0 = Math.min(y0, d.y);
            x1 = Math.max(x1, d.x + d.w); y1 = Math.max(y1, d.y + d.h);
            hit++;
        }
    }
    if (!hit) return null;
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export async function detectTextRegions({
    imageBase64,
    geminiApiKey,
    engine = 'gemini',
    onProgress,
}: {
    imageBase64: string;
    geminiApiKey: string;
    /** 文字辨識引擎：'gemini'（雲端，設計字較準）或 'local'（本機 ONNX，免費離線） */
    engine?: 'gemini' | 'local';
    onProgress?: (msg: string) => void;
}): Promise<SmartLayer[]> {
    let blocks: TextBlock[] = [];
    if (engine === 'local') {
        onProgress?.('本機 OCR 掃描文字中...');
        try {
            blocks = await detectTextBlocksLocal(imageBase64);
        } catch (e) {
            console.warn('[detectTextRegions] 本機 OCR 失敗，將嘗試降級 Gemini:', e);
        }
        // 本機沒裝好 / 沒抓到 → 有 Gemini key 就降級
        if (blocks.length === 0 && geminiApiKey) {
            onProgress?.('本機未偵測到文字，改用 Gemini 掃描...');
            blocks = await detectTextBlocks(imageBase64, geminiApiKey);
        }
    } else {
        onProgress?.('Gemini 逐塊掃描文字中...');
        blocks = await detectTextBlocks(imageBase64, geminiApiKey);
    }
    if (blocks.length === 0) return [];

    const dims = await getImageDims(imageBase64);
    const layers: SmartLayer[] = [];
    const img = await loadImg(imageBase64);

    // ── DBNet 當主：Gemini 模式下，若本機 OCR 模型已安裝，改用 DBNet 偵測框收緊幾何 ──
    // （偵測器給的框像素級貼合，遠比 LLM 猜框 + 梯度投影準；沒裝模型才退回梯度 refine，不退步）
    let detBoxes: { x: number; y: number; w: number; h: number }[] | null = null;
    if (engine === 'gemini') {
        try {
            const [detReady, recReady, dictReady] = await Promise.all([
                getModelStatus('ocr_det'), getModelStatus('ocr_rec'), getModelStatus('ocr_dict'),
            ]);
            if (detReady === 'ready' && recReady === 'ready' && dictReady === 'ready') {
                onProgress?.('本機 DBNet 收緊文字框...');
                const { runOcrInWorker } = await import('../../utils/ocrWorkerClient');
                const ocr = await runOcrInWorker(imageBase64);
                detBoxes = (ocr || []).map(o => o.bbox).filter(Boolean);
            }
        } catch (e) {
            console.warn('[detectTextRegions] DBNet 收緊不可用，改用梯度 refine:', e);
        }
    }

    for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        try {
            // 框幾何來源優先序：
            //  本機引擎 → DBNet 框已緊，直接用（不再過梯度 refine，避免把好框弄鬆）
            //  Gemini 引擎 → 有 DBNet 就吸附收緊；否則退回梯度 refine
            let refinedBBox: { x: number; y: number; w: number; h: number };
            if (engine === 'local') {
                refinedBBox = b.bbox;
            } else {
                refinedBBox = (detBoxes && snapToDetections(b.bbox, detBoxes)) || await refineTextBBox(img, b.bbox);
            }
            const crop = await cropToBBox(imageBase64, refinedBBox);
            const full = await placeInFullCanvas(crop, dims.w, dims.h, refinedBBox);
            const layer = await buildSmartLayer(full, {
                name:        b.label,
                category:    'TEXT',
                description: b.description || b.label,
                text:        b.text,
                bbox:        refinedBBox,
                zIndex:      100 + i,   // 文字疊在物件之上
            });
            layers.push({ ...layer, fromTextScan: true });
        } catch (e) {
            console.warn(`[detectTextRegions] skip "${b.label}":`, e);
        }
    }
    return layers;
}

// ─── ONNX 自動分析：Gemini 偵測 + SAM2 Worker 分割（取代 fal.ai）──────────────────

export async function segmentSemanticLayersOnnx({
    imageBase64,
    geminiApiKey,
    onProgress,
}: {
    imageBase64: string;
    geminiApiKey: string;
    onProgress?: (msg: string) => void;
}): Promise<SmartLayer[]> {
    onProgress?.('Gemini 分析圖片結構...');
    const objects = await detectObjectsForSegmentation(imageBase64, geminiApiKey);
    onProgress?.(`偵測到 ${objects.length} 個物件，本機 SAM2 分割中...`);

    const dims = await getImageDims(imageBase64);

    // 先算 embedding（Worker 內只算一次，所有物件共用）
    onProgress?.('SAM2 Encoder 計算中（背景執行，UI 不凍結）...');
    await sam2EncodeInWorker(imageBase64);

    // 逐一用 bbox 驅動 decoder（串行，避免並發搶 Worker）
    const results: (SmartLayer | null)[] = [];
    for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        try {
            onProgress?.(`SAM2 分割 ${i + 1}/${objects.length}：${obj.label}`);
            const px = obj.bbox.x * dims.w;
            const py = obj.bbox.y * dims.h;
            const pw = obj.bbox.w * dims.w;
            const ph = obj.bbox.h * dims.h;
            const transparentPng = await sam2DecodeInWorker(
                { bbox: { x: px, y: py, w: pw, h: ph } },
                imageBase64,
            );
            const trimmed = await trimTransparentPixels(transparentPng);
            const cropRatio = { x: trimmed.cropRatioX, y: trimmed.cropRatioY, w: trimmed.cropRatioW, h: trimmed.cropRatioH };
            results.push({
                id:             `sl_onnx_${Date.now()}_${i}`,
                name:           obj.label,
                category:       obj.category,
                base64:         trimmed.base64,
                originalBase64: trimmed.base64,
                prompt:         obj.description ?? obj.label,
                appliedPrompt:  obj.description ?? obj.label,
                text:           obj.text,
                bbox:           cropRatio,
                cropRatio,
                pixelWidth:     trimmed.pixelWidth,
                pixelHeight:    trimmed.pixelHeight,
                history:        [],
                isVisible:      true,
                isLocked:       false,
                zIndex:         objects.length - i,
            } as SmartLayer);
        } catch (e) {
            console.warn(`[SAM2 Worker] Skip "${obj.label}":`, e);
            results.push(null);
        }
    }

    const layers = results.filter((l): l is SmartLayer => l !== null);
    if (layers.length === 0) throw new Error('所有物件本機 SAM2 分割均失敗');
    return layers;
}

// ─── 共用：透明 PNG → SmartLayer（ONNX 和 fal.ai 共用後半段）──────────────────

export async function buildSmartLayerFromMask(
    transparentPng: string,
    layerName?: string,
    category: SmartLayerCategory = 'OBJECTS',
): Promise<SmartLayer> {
    const trimmed = await trimTransparentPixels(transparentPng);
    const cropRatio = {
        x: trimmed.cropRatioX,
        y: trimmed.cropRatioY,
        w: trimmed.cropRatioW,
        h: trimmed.cropRatioH,
    };
    return {
        id:             `sl_mask_${Date.now()}`,
        name:           layerName ?? `物件 ${new Date().toLocaleTimeString()}`,
        category,
        base64:         trimmed.base64,
        originalBase64: trimmed.base64,
        prompt:         layerName ?? '點選物件',
        appliedPrompt:  layerName ?? '點選物件',
        bbox:           cropRatio,
        cropRatio,
        pixelWidth:     trimmed.pixelWidth,
        pixelHeight:    trimmed.pixelHeight,
        history:        [],
        isVisible:      true,
        isLocked:       false,
        zIndex:         99,
    };
}

// ─── 手動點選新增圖層（使用者點圖片）────────────────────────────────────────

export interface AddLayerByClickOptions {
    imageBase64: string;
    falApiKey: string;
    /** 點擊在原圖的像素座標 */
    clickPixel: { x: number; y: number };
    layerName?: string;
    onProgress?: (msg: string) => void;
}

export async function addLayerByClick({
    imageBase64,
    falApiKey,
    clickPixel,
    layerName,
    onProgress,
}: AddLayerByClickOptions): Promise<SmartLayer> {
    onProgress?.('SAM2 點選分割...');
    const dims = await getImageDims(imageBase64);

    const transparentPng = await sam2Segment(
        imageBase64,
        falApiKey,
        dims,
        { clickPt: clickPixel },
    );

    return buildSmartLayerFromMask(transparentPng, layerName);
}

// ─── A：矩形框選新增圖層 ────────────────────────────────────────────────────

export interface AddLayerByBoxOptions {
    imageBase64: string;
    falApiKey: string;
    /** 在原圖的相對座標（0–1） */
    boxRatio: { x: number; y: number; w: number; h: number };
    onProgress?: (msg: string) => void;
}

export async function addLayerByBox({
    imageBase64,
    falApiKey,
    boxRatio,
    onProgress,
}: AddLayerByBoxOptions): Promise<SmartLayer> {
    onProgress?.('SAM2 框選物件...');
    const dims = await getImageDims(imageBase64);

    const transparentPng = await sam2Segment(
        imageBase64,
        falApiKey,
        dims,
        { bbox: boxRatio },
    );

    const trimmed = await trimTransparentPixels(transparentPng);
    return {
        id:             `sl_box_${Date.now()}`,
        name:           `框選物件 ${new Date().toLocaleTimeString()}`,
        category:       'OBJECTS',
        base64:         trimmed.base64,
        originalBase64: trimmed.base64,
        prompt:         '框選物件',
        appliedPrompt:  '框選物件',
        bbox:           boxRatio,
        cropRatio: {
            x: trimmed.cropRatioX, y: trimmed.cropRatioY,
            w: trimmed.cropRatioW, h: trimmed.cropRatioH,
        },
        pixelWidth:  trimmed.pixelWidth,
        pixelHeight: trimmed.pixelHeight,
        history:     [],
        isVisible:   true,
        isLocked:    false,
        zIndex:      99,
    };
}

// ─── B：多點模式新增圖層（前景點 + 背景點）────────────────────────────────

export interface SAM2Point {
    x: number; y: number;
    label: 1 | 0;  // 1 = 前景（綠）, 0 = 背景（紅）
}

export interface AddLayerByPointsOptions {
    imageBase64: string;
    falApiKey: string;
    /** 在原圖的像素座標 */
    points: SAM2Point[];
    layerName?: string;
    onProgress?: (msg: string) => void;
}

export async function addLayerByPoints({
    imageBase64,
    falApiKey,
    points,
    layerName,
    onProgress,
}: AddLayerByPointsOptions): Promise<SmartLayer> {
    // 初始 progress 訊息由呼叫端控制，這裡不覆蓋
    const dims = await getImageDims(imageBase64);

    const transparentPng = await sam2Segment(
        imageBase64,
        falApiKey,
        dims,
        { points },
    );

    const trimmed = await trimTransparentPixels(transparentPng);
    const approxBbox = {
        x: trimmed.cropRatioX, y: trimmed.cropRatioY,
        w: trimmed.cropRatioW, h: trimmed.cropRatioH,
    };

    return {
        id:             `sl_pts_${Date.now()}`,
        name:           layerName ? `${layerName} ${new Date().toLocaleTimeString()}` : `多點物件 ${new Date().toLocaleTimeString()}`,
        category:       'OBJECTS',
        base64:         trimmed.base64,
        originalBase64: trimmed.base64,
        prompt:         layerName ?? '多點選取物件',
        appliedPrompt:  layerName ?? '多點選取物件',
        bbox:           approxBbox,
        cropRatio:      approxBbox,
        pixelWidth:  trimmed.pixelWidth,
        pixelHeight: trimmed.pixelHeight,
        history:     [],
        isVisible:   true,
        isLocked:    false,
        zIndex:      99,
    };
}

// ─── Canvas 合成（用 cropRatio 定位）─────────────────────────────────────────

export function compositeSmartLayers(
    originalBase64: string,
    layers: SmartLayer[],
): Promise<string> {
    return new Promise(resolve => {
        const origImg = new Image();
        origImg.onload = async () => {
            const W = origImg.naturalWidth;
            const H = origImg.naturalHeight;
            const canvas = document.createElement('canvas');
            canvas.width  = W;
            canvas.height = H;
            const ctx = canvas.getContext('2d')!;

            // 先畫原圖為底
            ctx.drawImage(origImg, 0, 0);

            // 依 zIndex 低→高疊層
            const visible = [...layers]
                .filter(l => l.isVisible)
                .sort((a, b) => a.zIndex - b.zIndex);

            for (const layer of visible) {
                await new Promise<void>(res => {
                    const li = new Image();
                    li.onload = () => {
                        // cropRatio = trimmed PNG 在原圖的精確位置
                        const x      = layer.cropRatio.x * W;
                        const y      = layer.cropRatio.y * H;
                        const drawW  = layer.cropRatio.w * W;
                        // 維持原始像素比例，避免拉伸變形
                        const drawH  = (layer.pixelWidth && layer.pixelHeight && drawW > 0)
                            ? drawW * (layer.pixelHeight / layer.pixelWidth)
                            : layer.cropRatio.h * H;
                        ctx.drawImage(li, x, y, drawW, drawH);
                        res();
                    };
                    li.onerror = () => res();
                    li.src = layer.base64;
                });
            }
            resolve(canvas.toDataURL('image/png'));
        };
        origImg.onerror = () => resolve(originalBase64);
        origImg.src = originalBase64;
    });
}

// ─── Inpaint mask：把 SmartLayer 的透明 PNG 轉成黑白 mask ────────────────────

/**
 * 把透明 PNG（全圖大小）轉成 inpainting 用的黑白 mask：
 *   白色（255）= 要重繪的區域（物件所在）
 *   黑色（0）  = 保留的區域
 * mask 略微膨脹（dilate），讓邊緣銜接更自然
 */
export function transparentPngToInpaintMask(
    transparentFullPng: string,
): Promise<string> {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const W = img.naturalWidth, H = img.naturalHeight;
            const canvas = document.createElement('canvas');
            canvas.width = W; canvas.height = H;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            const id = ctx.getImageData(0, 0, W, H);
            const d  = id.data;

            // 先建立 alpha 遮罩陣列
            const alpha = new Uint8Array(W * H);
            for (let i = 0; i < W * H; i++) alpha[i] = d[i * 4 + 3] > 10 ? 255 : 0;

            // dilate 3px（讓邊緣向外膨脹，覆蓋去背後的殘影）
            const dilated = new Uint8Array(alpha);
            const r = 3;
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    if (alpha[y * W + x] === 0) continue;
                    for (let dy = -r; dy <= r; dy++) {
                        for (let dx = -r; dx <= r; dx++) {
                            const nx = x + dx, ny = y + dy;
                            if (nx >= 0 && nx < W && ny >= 0 && ny < H)
                                dilated[ny * W + nx] = 255;
                        }
                    }
                }
            }

            // 寫回 canvas：白底，有物件的地方設白色
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, W, H);
            for (let i = 0; i < W * H; i++) {
                if (dilated[i] > 0) {
                    const x = i % W, y = Math.floor(i / W);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(x, y, 1, 1);
                }
            }
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve('');
        img.src = transparentFullPng;
    });
}

/**
 * 把 SmartLayer 放回全圖的透明 PNG
 * cropRatio 的位置 + 原圖尺寸 → 全圖大小的透明 PNG
 */
export async function layerToFullCanvas(layer: SmartLayer, origW: number, origH: number): Promise<string> {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = origW; canvas.height = origH;
            const ctx = canvas.getContext('2d')!;
            const x     = layer.cropRatio.x * origW;
            const y     = layer.cropRatio.y * origH;
            const drawW = layer.cropRatio.w * origW;
            const drawH = (layer.pixelWidth && layer.pixelHeight && drawW > 0)
                ? drawW * (layer.pixelHeight / layer.pixelWidth)
                : layer.cropRatio.h * origH;
            ctx.drawImage(img, x, y, drawW, drawH);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(layer.base64);
        img.src = layer.base64;
    });
}

// ─── Apply：單層重繪（crop → img2img → SAM2 → feather blend）────────────────
//
// 為什麼不用透明 PNG 傳給 GPT：
//   GPT img2img 把透明區域當白色背景 → 結果不可預期
//   GPT Inpaint 端點對透明 PNG 支援不穩定
//
// 新流程：GPT 只接收和輸出平面 JPEG，透明完全由 SAM2 負責
//
//   1. 裁切 bbox → 平面 JPEG（乾淨矩形，GPT 最擅長處理）
//   2. GPT img2img + 新 prompt → 新物件的平面圖
//   3. SAM2 在新物件圖上分割 → 精準透明 PNG
//   4. 邊緣羽化（feather）→ 自然融合邊緣
//   5. 貼回原圖 bbox 位置 → 更新 compositeBase64
// ────────────────────────────────────────────────────────────────────────────

/** 對透明 PNG 的 alpha 通道做邊緣羽化，讓物件邊緣自然融入背景 */
function featherAlphaEdges(base64: string, radius = 4): Promise<string> {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const W = img.naturalWidth, H = img.naturalHeight;
            const src = document.createElement('canvas');
            src.width = W; src.height = H;
            src.getContext('2d')!.drawImage(img, 0, 0);

            const srcData = src.getContext('2d')!.getImageData(0, 0, W, H);
            const d = srcData.data;

            // 取出 alpha 通道
            const alpha = new Float32Array(W * H);
            for (let i = 0; i < W * H; i++) alpha[i] = d[i * 4 + 3] / 255;

            // 水平方向 box blur
            const tempH = new Float32Array(W * H);
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    let sum = 0, cnt = 0;
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = x + dx;
                        if (nx >= 0 && nx < W) { sum += alpha[y * W + nx]; cnt++; }
                    }
                    tempH[y * W + x] = sum / cnt;
                }
            }

            // 垂直方向 box blur
            const blurred = new Float32Array(W * H);
            for (let x = 0; x < W; x++) {
                for (let y = 0; y < H; y++) {
                    let sum = 0, cnt = 0;
                    for (let dy = -radius; dy <= radius; dy++) {
                        const ny = y + dy;
                        if (ny >= 0 && ny < H) { sum += tempH[ny * W + x]; cnt++; }
                    }
                    blurred[y * W + x] = sum / cnt;
                }
            }

            // 取原始 alpha 和模糊 alpha 的最小值（只縮小，不擴大）
            for (let i = 0; i < W * H; i++) {
                d[i * 4 + 3] = Math.round(Math.min(alpha[i], blurred[i]) * 255);
            }

            const out = document.createElement('canvas');
            out.width = W; out.height = H;
            out.getContext('2d')!.putImageData(srcData, 0, 0);
            resolve(out.toDataURL('image/png'));
        };
        img.onerror = () => resolve(base64);
        img.src = base64;
    });
}

/**
 * 把新物件（透明 PNG，全圖大小）合成回原圖
 * 使用 alpha compositing：result = new * a + original * (1-a)
 */
function compositeLayerOverOriginal(
    originalBase64: string,
    newLayerFullPng: string,   // 全圖大小，已 feather
): Promise<string> {
    return new Promise(resolve => {
        const origImg = new Image(), newImg = new Image();
        let loaded = 0;
        const onLoad = () => {
            if (++loaded < 2) return;
            const W = origImg.naturalWidth, H = origImg.naturalHeight;
            const canvas = document.createElement('canvas');
            canvas.width = W; canvas.height = H;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(origImg, 0, 0);
            ctx.drawImage(newImg, 0, 0, W, H);
            resolve(canvas.toDataURL('image/png'));
        };
        origImg.onload = onLoad; newImg.onload = onLoad;
        origImg.onerror = () => resolve(originalBase64);
        newImg.onerror = () => resolve(originalBase64);
        origImg.src = originalBase64;
        newImg.src = newLayerFullPng;
    });
}

/**
 * 把低解析度 inpaint 輸出貼回全解析度原圖：
 * 只取遮罩白色區域的重繪像素（放大至原尺寸），其餘像素維持原圖。
 * 避免每次 Apply 全圖被壓到 1024 → 多次編輯後畫質單向劣化。
 */
export async function pasteInpaintRegion(
    fullResBase64: string,
    inpaintedBase64: string,
    maskBase64: string,
): Promise<string> {
    const [orig, inp, mask] = await Promise.all([
        loadImg(fullResBase64), loadImg(inpaintedBase64), loadImg(maskBase64),
    ]);
    const W = orig.naturalWidth, H = orig.naturalHeight;

    // patch：inpaint 結果放大到全尺寸，alpha 取自遮罩（白=重繪區保留）
    const patch = document.createElement('canvas');
    patch.width = W; patch.height = H;
    const pctx = patch.getContext('2d')!;
    pctx.drawImage(inp, 0, 0, W, H);
    const patchData = pctx.getImageData(0, 0, W, H);

    const mc = document.createElement('canvas');
    mc.width = W; mc.height = H;
    const mctx = mc.getContext('2d')!;
    mctx.drawImage(mask, 0, 0, W, H);
    const maskData = mctx.getImageData(0, 0, W, H).data;
    for (let i = 0; i < W * H; i++) {
        patchData.data[i * 4 + 3] = maskData[i * 4] > 127 ? 255 : 0;
    }
    pctx.putImageData(patchData, 0, 0);

    // 邊緣羽化，緩和重繪區（1024 放大）與原圖解析度差的接縫
    const feathered = await featherAlphaEdges(patch.toDataURL('image/png'), 3);
    return compositeLayerOverOriginal(fullResBase64, feathered);
}

export interface RegenerateLayerOptions {
    layer: SmartLayer;
    /** 當前完整畫面（作為 inpaint 的 base image） */
    originalBase64: string;
    newPrompt: string;
    /** 'gpt'（預設）= Atlas inpaint；'gemini' = crop → Gemini img2img → SAM2 */
    engine?: 'gpt' | 'gemini';
    atlasApiKey?: string;   // engine === 'gpt' 時必要
    geminiApiKey?: string;  // engine === 'gemini' 時必要
    imageModel?: string;    // Gemini 使用的模型
    /**
     * Gemini 路線專用：不含當前圖層的乾淨底圖。
     * 裁切給 Gemini 看的是 originalBase64（含舊物件），
     * 但最終 composite 要疊在這張乾淨底圖上，讓舊物件消失。
     */
    cleanBase?: string;
    falApiKey?: string;
    signal?: AbortSignal;         // ← 傳入後可中止 Atlas 輪詢
    onProgress?: (msg: string) => void;
    /** 使用者上傳的參考圖（已壓縮 base64） */
    referenceImage?: string;
    /**
     * 文字編輯模式：整張圖重繪、輸出直接當結果（不遮罩貼回）。
     * 因為改文字會改字數/長度，遮罩貼回會把長字壓進舊框 → 變形/切字/露舊字；
     * 整張交給模型重新排版才能自然處理字數變化（對標競品作法）。
     */
    textEdit?: boolean;
}

/**
 * 文字編輯：整張圖重繪，模型輸出直接當結果（不遮罩、不貼回）。
 * Gemini 用 gemini-3.x-flash-image（最擅長只改文字、其餘不動、且會自然 reflow）。
 */
async function regenerateTextFullImageGemini({
    originalBase64,
    newPrompt,
    geminiApiKey,
    imageModel,
    referenceImage,
    layerName,
    onProgress,
}: {
    originalBase64: string;
    newPrompt: string;
    geminiApiKey: string;
    imageModel?: string;
    referenceImage?: string;
    layerName: string;
    onProgress?: (msg: string) => void;
}): Promise<string> {
    onProgress?.(`Gemini 重繪文字「${layerName}」...`);
    const { callGeminiWithRetry } = await import('../../utils/helpers');
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    const [header, data] = originalBase64.split(',');
    const mime = header.match(/data:(.*);base64/)?.[1] || 'image/png';
    const parts: any[] = [{ inlineData: { data, mimeType: mime } }];
    if (referenceImage) {
        const [rh, rd] = referenceImage.split(',');
        const rmime = rh.match(/data:(.*);base64/)?.[1] || 'image/png';
        parts.push({ inlineData: { data: rd, mimeType: rmime } });
    }
    parts.push({ text: newPrompt });

    const response = await callGeminiWithRetry(() => ai.models.generateContent({
        model: imageModel || 'gemini-3.1-flash-image-preview',
        contents: { parts },
    }));
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error('Gemini 未回傳圖片');
}

/** bbox 外擴（橫向給較多、縱向較少；文字主要往水平方向長），clamp 到 [0,1] */
function expandBboxForText(
    b: { x: number; y: number; w: number; h: number },
    padX = 0.35,
    padY = 0.15,
): { x: number; y: number; w: number; h: number } {
    const x = Math.max(0, b.x - b.w * padX);
    const y = Math.max(0, b.y - b.h * padY);
    return {
        x, y,
        w: Math.min(1 - x, b.w * (1 + padX * 2)),
        h: Math.min(1 - y, b.h * (1 + padY * 2)),
    };
}

/** 產生整圖黑底、bbox 處填白的矩形遮罩（白=inpaint 重繪區） */
function solidRectMask(fullW: number, fullH: number, bbox: { x: number; y: number; w: number; h: number }): string {
    const c = document.createElement('canvas');
    c.width = fullW; c.height = fullH;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, fullW, fullH);
    ctx.fillStyle = '#fff';
    ctx.fillRect(
        Math.round(bbox.x * fullW), Math.round(bbox.y * fullH),
        Math.round(bbox.w * fullW), Math.round(bbox.h * fullH),
    );
    return c.toDataURL('image/png');
}

/**
 * 文字編輯（GPT 路徑）— 高保真局部重繪：
 *  1. 遮罩 = 放大的「矩形」文字框（給較長新字 reflow 空間，非貼緊字的 glyph mask）
 *  2. 舊字裁切 → 當「樣式參考圖」送入（GPT 看不到遮罩底下的舊字，靠這張對齊字體/顏色/風格）
 *  3. 只把放大框那塊貼回原圖 → 框外像素 pixel 級不動，漂移侷限在文字框內
 *  （不需 LaMa：遮罩區本來就被模型重新生成，舊字會被自然蓋掉）
 */
async function regenerateTextFullImageGpt({
    layer,
    originalBase64,
    newPrompt,
    atlasApiKey,
    referenceImage,
    signal,
    onProgress,
}: {
    layer: SmartLayer;
    originalBase64: string;
    newPrompt: string;
    atlasApiKey: string;
    referenceImage?: string;
    signal?: AbortSignal;
    onProgress?: (msg: string) => void;
}): Promise<string> {
    const { callAtlasInpaint, compressForAtlas, gptSizeForImage } = await import('../../utils/atlasImage');
    const dims = await getImageDims(originalBase64);

    // 1) 放大的矩形遮罩（reflow 空間）
    const exBbox     = expandBboxForText(layer.bbox);
    const maskFull   = solidRectMask(dims.w, dims.h, exBbox);
    const gptSize    = await gptSizeForImage(originalBase64);

    // 2) 舊字裁切（緊框）→ 當樣式參考圖
    const oldTextCrop = await cropToBBox(originalBase64, layer.bbox);

    // 3) 明確告知參考圖只是「樣式樣本」，不要照抄原字
    const refPrompt = `${newPrompt} IMPORTANT: The attached reference image is ONLY a visual sample of the ORIGINAL text's font, weight, color and styling — do NOT reproduce its words. Render the NEW text described above in that exact same visual style, sized and spaced to fit the area cleanly.`;

    onProgress?.(`GPT Image 2 重繪文字「${layer.name}」...`);
    const [compOrig, compMask, compRef] = await Promise.all([
        compressForAtlas(originalBase64, 1536, 0.95, false),
        compressForAtlas(maskFull,       1536, 1.0,  true),
        compressForAtlas(oldTextCrop,    1024, 0.95, false),
    ]);
    const refs = referenceImage ? [compRef, referenceImage] : [compRef];

    const inpainted = await callAtlasInpaint(
        refPrompt, compOrig, compMask, atlasApiKey, refs, undefined, signal, gptSize,
    );

    // 4) 只貼回放大框那塊 → 框外維持原圖像素，漂移侷限框內
    const maskFullRes = solidRectMask(dims.w, dims.h, exBbox);
    return pasteInpaintRegion(originalBase64, inpainted, maskFullRes);
}

/**
 * 單層重繪（Apply）— SAM2 mask → Atlas Inpaint
 *
 * 流程（類 Reve）：
 * 1. SmartLayer 的透明 PNG → 全圖遮罩（白=重繪，黑=保留）
 *    + 邊緣稍微膨脹（dilate 8px）讓 GPT 有足夠重疊區平滑過渡
 * 2. Atlas Inpaint（GPT Image 2 Edit）：
 *    原圖 + 遮罩 → 只重繪白色區域
 *    GPT 自動處理邊緣融合（不需要手動 feather）
 * 3. 輸出 = 新的完整合成圖（無接縫）
 * 4. SAM2 從 inpainted 結果重新切出這個物件（更新 SmartLayer，可選）
 */
export async function regenerateLayer({
    layer,
    originalBase64,
    newPrompt,
    engine = 'gpt',
    atlasApiKey,
    geminiApiKey,
    imageModel,
    cleanBase,
    falApiKey,
    signal,
    onProgress,
    referenceImage,
    textEdit,
}: RegenerateLayerOptions): Promise<{
    newLayerBase64: string;
    newCropRatio: SmartLayer['cropRatio'];
    /** 直接用 inpainted 結果作為新 composite，邊緣已自然融合 */
    newCompositeBase64: string;
    pixelWidth?: number;
    pixelHeight?: number;
}> {

    // ══ 文字編輯路線（對標競品）：整張圖重繪 → 輸出直接當結果，不遮罩貼回 ══════════
    if (textEdit) {
        let newCompositeBase64: string;
        if (engine === 'gemini') {
            if (!geminiApiKey) throw new Error('Gemini 重繪需要 Gemini API Key');
            newCompositeBase64 = await regenerateTextFullImageGemini({
                originalBase64, newPrompt, geminiApiKey, imageModel,
                referenceImage, layerName: layer.name, onProgress,
            });
        } else {
            if (!atlasApiKey) throw new Error('GPT 重繪需要 Atlas（GPT Image 2）API Key');
            newCompositeBase64 = await regenerateTextFullImageGpt({
                layer, originalBase64, newPrompt, atlasApiKey, referenceImage, signal, onProgress,
            });
        }
        // 文字不重新分割：沿用原圖層形狀/位置，只更新合成圖
        return {
            newLayerBase64: layer.base64,
            newCropRatio:   layer.cropRatio,
            newCompositeBase64,
            pixelWidth:     layer.pixelWidth,
            pixelHeight:    layer.pixelHeight,
        };
    }

    // ══ Gemini crop 路線：crop → img2img → SAM2 切邊 → composite ══════════════
    if (engine === 'gemini') {
        if (!geminiApiKey) throw new Error('Gemini 重繪需要 Gemini API Key');
        const dims = await getImageDims(originalBase64);

        onProgress?.(`✂️ 裁切「${layer.name}」區域...`);
        const croppedRaw = await cropToBBox(originalBase64, layer.bbox);
        // ③：壓縮 crop 後再傳 Gemini，降低 payload 與主執行緒記憶體壓力（crop 通常小，畫質損失極小）
        const { compressForAtlas } = await import('../../utils/atlasImage');
        const croppedBase64 = await compressForAtlas(croppedRaw, 1024, 0.92, false);

        onProgress?.(`🎨 Gemini 重新生成「${layer.name}」...`);
        const { callGeminiWithRetry } = await import('../../utils/helpers');
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const [cropHeader, cropData] = croppedBase64.split(',');
        const cropMime = cropHeader.match(/data:(.*);base64/)?.[1] || 'image/png';

        const response = await callGeminiWithRetry(() => ai.models.generateContent({
            model: imageModel || 'gemini-2.0-flash-preview-image-generation',
            contents: {
                parts: [
                    { inlineData: { data: cropData, mimeType: cropMime } },
                    { text: `Edit the main subject in this image: ${newPrompt}. Keep the same scale, perspective, lighting, and background context. Output only the edited image.` },
                ],
            },
        }));

        let geminiCropBase64: string | null = null;
        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
            if (part.inlineData) {
                geminiCropBase64 = `data:image/png;base64,${part.inlineData.data}`;
                break;
            }
        }
        if (!geminiCropBase64) throw new Error('Gemini 未回傳圖片');

        let newLayerBase64 = layer.base64;
        let newCropRatio   = layer.cropRatio;
        let newPixelW: number | undefined;
        let newPixelH: number | undefined;

        if (falApiKey) {
            onProgress?.(`✂️ SAM2 切割物件邊緣...`);
            try {
                const geminiDims = await getImageDims(geminiCropBase64);
                const { w: gw, h: gh } = geminiDims;
                // 甲：整個 crop 當 bbox（內縮 6% 避免抓到邊緣背景）
                // 乙：中心 + 四象限前景點，覆蓋細長/分散造型，避免只切到一部分
                const inset = 0.06;
                const fgPoints: { x: number; y: number; label: 0 | 1 }[] = [
                    { x: gw * 0.5,  y: gh * 0.5,  label: 1 },
                    { x: gw * 0.32, y: gh * 0.32, label: 1 },
                    { x: gw * 0.68, y: gh * 0.32, label: 1 },
                    { x: gw * 0.32, y: gh * 0.68, label: 1 },
                    { x: gw * 0.68, y: gh * 0.68, label: 1 },
                ];
                const cropTransparent = await sam2Segment(geminiCropBase64, falApiKey, geminiDims, {
                    bbox:   { x: inset, y: inset, w: 1 - inset * 2, h: 1 - inset * 2 },
                    points: fgPoints,
                });
                const fullT   = await placeInFullCanvas(cropTransparent, dims.w, dims.h, layer.bbox);
                const trimmed = await trimTransparentPixels(fullT);
                newLayerBase64 = trimmed.base64;
                newCropRatio   = {
                    x: trimmed.cropRatioX, y: trimmed.cropRatioY,
                    w: trimmed.cropRatioW, h: trimmed.cropRatioH,
                };
                newPixelW = trimmed.pixelWidth;
                newPixelH = trimmed.pixelHeight;
            } catch (e) {
                console.warn('[regenerateLayer Gemini] SAM2 failed, keeping old shape:', e);
            }
        }

        const fakeLayer = { base64: newLayerBase64, cropRatio: newCropRatio, pixelWidth: newPixelW, pixelHeight: newPixelH } as SmartLayer;
        const fullLayerPng       = await layerToFullCanvas(fakeLayer, dims.w, dims.h);
        // 疊在乾淨底圖（不含舊物件）上，讓舊物件消失
        const newCompositeBase64 = await compositeLayerOverOriginal(cleanBase ?? originalBase64, fullLayerPng);
        return { newLayerBase64, newCropRatio, newCompositeBase64, pixelWidth: newPixelW, pixelHeight: newPixelH };
    }

    // ══ GPT / Atlas 路線（原有，完全不動）══════════════════════════════════════
    if (!atlasApiKey) throw new Error('GPT 重繪需要 Atlas（GPT Image 2）API Key');
    const { callAtlasInpaint, compressForAtlas, gptSizeForImage } = await import('../../utils/atlasImage');
    const dims = await getImageDims(originalBase64);
    // 指定輸出尺寸 = 原圖最接近的 GPT 比例，避免 gpt-image-2 預設方形導致比例不符、貼回錯位
    const gptSize = await gptSizeForImage(originalBase64);

    // ── Step 1：SmartLayer → 全圖遮罩（白=重繪，稍微 dilate 讓 GPT 有重疊區）
    onProgress?.(`🎭 建立遮罩「${layer.name}」...`);
    const fullLayerPng = await layerToFullCanvas(layer, dims.w, dims.h);
    const maskBase64   = await transparentPngToInpaintMask(fullLayerPng);
    // dilate 已在 transparentPngToInpaintMask 裡做了 3px，這裡不再額外處理

    // ── Step 2：Atlas Inpaint（全圖，GPT 自己處理邊緣）────────────────────
    onProgress?.(`GPT Image 2 重新生成「${layer.name}」...`);

    const inpaintPrompt = [
        newPrompt,
        'Keep ALL other areas of the image completely unchanged.',
        'Blend the regenerated area seamlessly with its surroundings.',
        'Match lighting, color temperature, and perspective of the original scene.',
    ].join(' ');

    // 原圖壓縮成 JPEG（較小）；遮罩必須用 PNG（保持純黑/白邊緣，避免 JPEG 模糊）
    const [compOrig, compMask] = await Promise.all([
        compressForAtlas(originalBase64, 1024, 0.92, false),  // JPEG
        compressForAtlas(maskBase64,     1024, 1.0,  true),   // PNG，keepAlpha=true
    ]);

    let newCompositeBase64 = await callAtlasInpaint(
        inpaintPrompt,
        compOrig,
        compMask,
        atlasApiKey,
        referenceImage ? [referenceImage] : undefined,
        undefined,   // surroundingContext
        signal,      // AbortSignal → 取消後立即停止輪詢
        gptSize,     // 輸出尺寸 = 原圖比例，避免方形錯位
    );

    // 只取遮罩區的重繪像素貼回全解析度原圖，其餘維持原始畫質（避免多次 Apply 畫質遞減）
    try {
        newCompositeBase64 = await pasteInpaintRegion(originalBase64, newCompositeBase64, maskBase64);
    } catch (e) {
        console.warn('[regenerateLayer] 全解析度貼回失敗，沿用 inpaint 輸出:', e);
    }

    // ── Step 3：SAM2 從 inpainted 結果重新切出物件（更新 SmartLayer）────────
    let newLayerBase64 = layer.base64;
    let newCropRatio   = layer.cropRatio;
    let newPixelW: number | undefined;
    let newPixelH: number | undefined;

    if (falApiKey) {
        onProgress?.(`✂️ SAM2 重新切割更新後的物件...`);
        try {
            const inpDims  = await getImageDims(newCompositeBase64);
            // 在 inpainted 全圖上，用原始 bbox 定位物件
            const crop     = await cropToBBox(newCompositeBase64, layer.bbox);
            const cropDims = await getImageDims(crop);
            const cx = Math.round(cropDims.w / 2);
            const cy = Math.round(cropDims.h / 2);
            const cropTransparent = await sam2Segment(crop, falApiKey, cropDims, {
                clickPt: { x: cx, y: cy },
            });
            const fullT   = await placeInFullCanvas(cropTransparent, inpDims.w, inpDims.h, layer.bbox);
            const trimmed = await trimTransparentPixels(fullT);
            newLayerBase64 = trimmed.base64;
            newCropRatio   = {
                x: trimmed.cropRatioX, y: trimmed.cropRatioY,
                w: trimmed.cropRatioW, h: trimmed.cropRatioH,
            };
            newPixelW = trimmed.pixelWidth;
            newPixelH = trimmed.pixelHeight;
        } catch (e) {
            console.warn('[regenerateLayer] SAM2 re-segment failed, keeping old shape:', e);
        }
    }

    return {
        newLayerBase64,
        newCropRatio,
        newCompositeBase64,
        pixelWidth:  newPixelW,
        pixelHeight: newPixelH,
    };
}
