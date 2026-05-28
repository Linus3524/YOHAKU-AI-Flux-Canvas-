/**
 * GPT Image 2 魔法分層
 *
 * 流程：
 *   工作圖縮放至顯示尺寸（el.width × el.height）→ 確保座標系一致，不變形
 *   Gemini 偵測物件 + bounding box + 每個物件最適合的去背底色（GREEN/BLUE/RED/GRAY）
 *   → 直接從工作圖裁切物件區域（不重新生成，保證位置正確）
 *   → BiRefNet v2 去背（有 fal key）/ 動態 Chroma Key（無 fal key）
 *   → 放回全圖座標 → 裁切透明邊緣 → LayerResult[]
 *   + GPT Image 2 Edit 補全背景（放最底層）
 */

import { GoogleGenAI } from '@google/genai';
import { fal } from '@fal-ai/client';
import { callAtlasImg2Img, downloadImageAsBase64 } from './atlasImage';
import { trimTransparentPixels, LayerResult } from './falImage';

// ── 底色方案表 ─────────────────────────────────────────────
type BgColorKey = 'GREEN' | 'BLUE' | 'RED' | 'GRAY';

const BG_COLOR_MAP: Record<BgColorKey, { hex: string; rgb: [number, number, number]; desc: string }> = {
    GREEN: { hex: '#00FF00', rgb: [0, 255, 0],       desc: 'pure lime-green (hex #00FF00, RGB 0,255,0)'       },
    BLUE:  { hex: '#0000FF', rgb: [0, 0, 255],        desc: 'pure blue (hex #0000FF, RGB 0,0,255)'              },
    RED:   { hex: '#FF0000', rgb: [255, 0, 0],        desc: 'pure red (hex #FF0000, RGB 255,0,0)'               },
    GRAY:  { hex: '#CCCCCC', rgb: [204, 204, 204],    desc: 'flat light gray (hex #CCCCCC, RGB 204,204,204)'    },
};

type LayerCategory = 'SUBJECT' | 'PRODUCT' | 'OBJECTS' | 'DECOR' | 'TEXT';

interface DetectedObject {
    label: string;
    category: LayerCategory;                  // 圖層分類
    box_2d: [number, number, number, number]; // [y1, x1, y2, x2] normalized 0–1000
    bg_color: BgColorKey;                     // Gemini 判斷最適合的去背底色
}

// ── 圖片工具 ──────────────────────────────────────────────

/** 縮放圖片至顯示尺寸（確保 cropRatio 與 el.width/height 一致） */
async function scaleToDisplay(base64: string, targetW: number, targetH: number): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            if (img.naturalWidth === targetW && img.naturalHeight === targetH) { resolve(base64); return; }
            const canvas = document.createElement('canvas');
            canvas.width  = targetW;
            canvas.height = targetH;
            canvas.getContext('2d')!.drawImage(img, 0, 0, targetW, targetH);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(base64);
        img.src = base64;
    });
}

/** 取得圖片自然尺寸 */
function getImageDims(base64: string): Promise<[number, number]> {
    return new Promise((res) => {
        const i = new Image();
        i.onload = () => res([i.naturalWidth, i.naturalHeight]);
        i.onerror = () => res([256, 256]);
        i.src = base64;
    });
}

/** 從工作圖按 bounding box 裁切（[y1,x1,y2,x2] 0-1000） */
function cropToBBox(imageBase64: string, box: [number, number, number, number], W: number, H: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const [y1n, x1n, y2n, x2n] = box;
            const x1 = Math.round(x1n / 1000 * W), y1 = Math.round(y1n / 1000 * H);
            const x2 = Math.round(x2n / 1000 * W), y2 = Math.round(y2n / 1000 * H);
            const cw = Math.max(1, x2 - x1), ch = Math.max(1, y2 - y1);
            const canvas = document.createElement('canvas');
            canvas.width = cw; canvas.height = ch;
            canvas.getContext('2d')!.drawImage(img, x1, y1, cw, ch, 0, 0, cw, ch);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = imageBase64;
    });
}

/** 將裁切後的透明 PNG 放回 W×H canvas，定位在 bounding box 位置 */
function placeInFullCanvas(cropBase64: string, W: number, H: number, box: [number, number, number, number]): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const x1 = Math.round(box[1] / 1000 * W);
            const y1 = Math.round(box[0] / 1000 * H);
            const canvas = document.createElement('canvas');
            canvas.width = W; canvas.height = H;
            canvas.getContext('2d')!.drawImage(img, x1, y1);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = cropBase64;
    });
}

// ── Gemini 物件偵測（含底色建議）────────────────────────────

async function detectObjects(imageBase64: string, apiKey: string): Promise<DetectedObject[]> {
    const ai = new GoogleGenAI({ apiKey });
    const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
    const mimeType = imageBase64.match(/data:(.*);base64/)?.[1] ?? 'image/png';

    const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: {
            parts: [
                { inlineData: { mimeType, data: cleanBase64 } },
                {
                    text: `Analyze this image and detect ALL distinct foreground elements worth separating into individual layers (3 to 8 elements).

Classify each element into one of these categories:
- "SUBJECT"  — main people, characters, animals, human figures
- "PRODUCT"  — featured products, items for sale, merchandise, packaged goods
- "OBJECTS"  — props, tools, furniture, everyday items, supporting objects
- "DECOR"    — decorative shapes, patterns, graphic elements, flowers, plants, ribbons
- "TEXT"     — visible text, titles, labels, logos, signs in the image

Do NOT include: plain sky, featureless ground, drop shadows, or lens flare unless they are the primary subject.
Do NOT include: lighting effects or shadow overlays — these do not need separate layers.

For each element, choose the best solid background color for chroma-key removal.
Pick whichever color has the LEAST overlap with the element's own colors:
- "GREEN"  — for red, orange, yellow, brown, purple, white objects (no green present)
- "BLUE"   — for red, orange, yellow, green objects (no blue present)
- "RED"    — for cyan, teal, green, blue objects (no red present)
- "GRAY"   — for multi-colored / rainbow objects that contain all three primary colors

Return ONLY a valid JSON array, no markdown:
[{"label":"woman in red dress","category":"SUBJECT","box_2d":[y1,x1,y2,x2],"bg_color":"GREEN"},{"label":"handbag","category":"PRODUCT","box_2d":[y1,x1,y2,x2],"bg_color":"BLUE"}]

box_2d: integers 0-1000 (normalized). Each box must tightly surround its object.`
                }
            ]
        },
    });

    const text = response.text ?? '';
    const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    const match = stripped.match(/\[[\s\S]*\]/);
    if (!match) {
        console.error('[gptLayerSplit] Gemini raw:', text);
        throw new Error('Gemini 未回傳物件偵測結果');
    }

    let objects: DetectedObject[];
    try {
        objects = JSON.parse(match[0]);
    } catch {
        throw new Error('Gemini 回傳 JSON 解析失敗');
    }

    const validCategories: LayerCategory[] = ['SUBJECT', 'PRODUCT', 'OBJECTS', 'DECOR', 'TEXT'];
    // 補全缺漏欄位（以防 Gemini 漏填）
    objects = objects.map(o => ({
        ...o,
        category: (validCategories.includes(o.category) ? o.category : 'OBJECTS') as LayerCategory,
        bg_color: (['GREEN', 'BLUE', 'RED', 'GRAY'].includes(o.bg_color) ? o.bg_color : 'GREEN') as BgColorKey,
    }));

    if (!objects || objects.length === 0) throw new Error('Gemini 未偵測到任何物件');
    return objects;
}

// ── 去背方法 ──────────────────────────────────────────────

/** BiRefNet v2 去背 */
async function removeBgBiRefNet(cropBase64: string, falKey: string): Promise<string> {
    fal.config({ credentials: falKey });

    const [header, data] = cropBase64.includes(',') ? cropBase64.split(',') : ['data:image/png;base64', cropBase64];
    const mime    = header.match(/:(.*?);/)?.[1] ?? 'image/png';
    const binary  = atob(data);
    const arr     = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    const file = new File([arr], `birefnet-input.${mime.split('/')[1] ?? 'png'}`, { type: mime });

    const imageUrl = await fal.storage.upload(file);
    const result   = await fal.subscribe('fal-ai/birefnet/v2', {
        input: { image_url: imageUrl, model: 'General Use (Heavy)', operating_resolution: '2048x2048', output_format: 'png', refine_foreground: true },
    });

    const resultUrl: string | undefined =
        (result.data as any)?.image?.url ?? (result.data as any)?.images?.[0]?.url ?? (result.data as any)?.url;
    if (!resultUrl) throw new Error('BiRefNet 未回傳結果 URL');

    const b64 = await downloadImageAsBase64(resultUrl);
    if (!b64) throw new Error('BiRefNet 圖片下載失敗');

    // 縮回裁切圖尺寸，確保座標對齊
    const [cw, ch] = await getImageDims(cropBase64);
    return scaleToDisplay(b64, cw, ch);
}

/**
 * 動態 Chroma Key 去背（備援）
 * 根據 Gemini 判斷的底色（GREEN/BLUE/RED/GRAY）去除對應顏色的背景
 */
async function removeColorBackground(base64: string, bgKey: BgColorKey): Promise<string> {
    const { rgb: [tr, tg, tb] } = BG_COLOR_MAP[bgKey];
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = imageData.data;
            for (let i = 0; i < d.length; i += 4) {
                const dr = d[i] - tr, dg = d[i + 1] - tg, db = d[i + 2] - tb;
                const dist = Math.sqrt(dr * dr + dg * dg + db * db);
                if (dist < 60)       d[i + 3] = 0;
                else if (dist < 110) d[i + 3] = Math.round(((dist - 60) / 50) * 255);
            }
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(base64);
        img.src = base64;
    });
}

// ── 主要入口 ──────────────────────────────────────────────

/**
 * 魔法分層主函式
 * @param imageBase64   原圖 base64（el.src）
 * @param displayWidth  畫布顯示寬度（el.width）
 * @param displayHeight 畫布顯示高度（el.height）
 * @param geminiApiKey  Gemini API Key
 * @param atlasKey      Atlas Cloud API Key（GPT Image 2 背景補圖用）
 * @param falKey        fal.ai API Key（BiRefNet 去背，選填；無則 Chroma Key 備援）
 * @param onProgress    進度回呼
 */
export async function gptLayerSegment(
    imageBase64: string,
    displayWidth: number,
    displayHeight: number,
    geminiApiKey: string,
    atlasKey: string,
    falKey?: string,
    onProgress?: (msg: string) => void,
): Promise<LayerResult[]> {

    const useBiRefNet = !!falKey;
    const W = displayWidth, H = displayHeight;

    // ── Step 1：縮放至顯示尺寸 ────────────────────────────
    onProgress?.('🔍 Gemini 分析圖片語意中...');
    const workingImage = await scaleToDisplay(imageBase64, W, H);

    // ── Step 2：Gemini 偵測物件 + bounding box + 底色 ─────
    const objects = await detectObjects(workingImage, geminiApiKey);
    const bgMethod = useBiRefNet ? 'BiRefNet' : 'Chroma Key';
    onProgress?.(`✨ 偵測到 ${objects.length} 個物件，使用 ${bgMethod} 去背...`);

    const layers: LayerResult[] = [];

    // ── Step 3：逐一裁切 + 去背 ───────────────────────────
    for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        const colorName = obj.bg_color;
        onProgress?.(`✂️ 第 ${i + 1}/${objects.length} [${obj.category}]：${obj.label}（底色 ${colorName}）`);
        try {
            const crop = await cropToBBox(workingImage, obj.box_2d, W, H);

            let transparent: string;
            if (useBiRefNet) {
                try {
                    transparent = await removeBgBiRefNet(crop, falKey!);
                } catch (e) {
                    console.warn(`[gptLayerSplit] BiRefNet failed for "${obj.label}", fallback chroma key (${colorName}):`, e);
                    transparent = await removeColorBackground(crop, colorName);
                }
            } else {
                transparent = await removeColorBackground(crop, colorName);
            }

            const fullLayer = await placeInFullCanvas(transparent, W, H, obj.box_2d);
            const trimmed   = await trimTransparentPixels(fullLayer);
            layers.push({ ...trimmed, name: `[${obj.category}] ${obj.label}` });
        } catch (e) {
            console.warn(`[gptLayerSplit] Skip "${obj.label}":`, e);
        }
    }

    // ── Step 4：GPT Image 2 Edit 背景補圖 ─────────────────
    onProgress?.('🌄 生成補全背景中...');
    try {
        const labelsList = objects.map(o => `"${o.label}"`).join(', ');
        const bgResults = await callAtlasImg2Img(
            `Remove the following foreground elements from this image: ${labelsList}. ` +
            `Reconstruct the complete background naturally and realistically. ` +
            `Fill all areas where elements were removed with appropriate background content. ` +
            `Preserve the original background colors, lighting, perspective and atmosphere.`,
            'gpt-image-2', atlasKey, imageBase64, 1, { ratio: 'Original' },
        );
        if (bgResults[0]) {
            const bgScaled = await scaleToDisplay(bgResults[0], W, H);
            layers.unshift({ base64: bgScaled, cropRatioX: 0, cropRatioY: 0, cropRatioW: 1, cropRatioH: 1 });
        }
    } catch (e) {
        console.warn('[gptLayerSplit] Background inpainting failed:', e);
    }

    if (layers.length === 0) throw new Error('所有圖層提取均失敗');
    return layers;
}
