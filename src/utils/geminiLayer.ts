/**
 * Gemini + BiRefNet Magic Layer
 * 流程：Gemini 語意物件偵測（bounding box）→ 逐一裁切 → BiRefNet 去背
 *       → 放回全圖座標 → 裁透明邊 → LayerResult[]
 */

import { fal } from '@fal-ai/client';
import { GoogleGenAI } from '@google/genai';
import { downloadImageAsBase64 } from './atlasImage';
import { trimTransparentPixels, LayerResult } from './falImage';

interface DetectedObject {
    label: string;
    box_2d: [number, number, number, number]; // [y1, x1, y2, x2] normalized 0-1000
}

/** base64 → File（fal.ai storage 需要 File 物件） */
function base64ToFile(base64: string, filename = 'image.png'): File {
    const [header, data] = base64.includes(',') ? base64.split(',') : ['data:image/png;base64', base64];
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
    const ext = mime.split('/')[1] ?? 'png';
    const binary = atob(data);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return new File([arr], `${filename}.${ext}`, { type: mime });
}

/** 取得圖片像素尺寸 */
function getImageDims(base64: string): Promise<{ w: number; h: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = reject;
        img.src = base64;
    });
}

/** 裁切原圖至邊框區域（box_2d 格式：[y1,x1,y2,x2] 0-1000） */
function cropToBBox(imageBase64: string, box: [number, number, number, number]): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const W = img.naturalWidth, H = img.naturalHeight;
            const [y1n, x1n, y2n, x2n] = box;
            const x1 = Math.round(x1n / 1000 * W);
            const y1 = Math.round(y1n / 1000 * H);
            const x2 = Math.round(x2n / 1000 * W);
            const y2 = Math.round(y2n / 1000 * H);
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

/** 將裁切後的透明 PNG 放回全圖尺寸的 canvas，定位在 box_2d 位置 */
function placeInFullCanvas(
    cropBase64: string,
    W: number,
    H: number,
    box: [number, number, number, number]
): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const [y1n, x1n] = box;
            const x1 = Math.round(x1n / 1000 * W);
            const y1 = Math.round(y1n / 1000 * H);
            const canvas = document.createElement('canvas');
            canvas.width = W; canvas.height = H;
            canvas.getContext('2d')!.drawImage(img, x1, y1);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = cropBase64;
    });
}

/** 將圖片 resize 回指定尺寸（用於修正 BiRefNet 輸出尺寸與輸入不一致的問題） */
function resizeToMatch(base64: string, targetW: number, targetH: number): Promise<string> {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            // 尺寸已正確則直接回傳，不做多餘處理
            if (img.naturalWidth === targetW && img.naturalHeight === targetH) {
                resolve(base64);
                return;
            }
            const canvas = document.createElement('canvas');
            canvas.width  = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d')!;
            ctx.imageSmoothingEnabled  = true;
            ctx.imageSmoothingQuality  = 'high';
            ctx.drawImage(img, 0, 0, targetW, targetH);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(base64);
        img.src = base64;
    });
}

/** 使用 fal-ai/birefnet 去除裁切圖的背景，回傳透明 PNG base64 */
async function removeBgBiRefNet(cropBase64: string, falKey: string): Promise<string> {
    // ⚠️ operating_resolution: '2048x2048' 可能讓輸出尺寸與輸入不一致，
    //    事先記錄輸入尺寸，回傳後強制 resize 回原始比例，防止回貼時變形。
    const inputDims = await getImageDims(cropBase64).catch(() => null);

    fal.config({ credentials: falKey });
    const file = base64ToFile(cropBase64, 'birefnet-input');
    const imageUrl = await fal.storage.upload(file);

    const result = await fal.subscribe('fal-ai/birefnet/v2', {
        input: {
            image_url: imageUrl,
            model: 'General Use (Heavy)',
            operating_resolution: '2048x2048',
            output_format: 'png',
            refine_foreground: true,
        },
    });

    // 相容多種回傳格式
    const resultUrl: string | undefined =
        (result.data as any)?.image?.url ??
        (result.data as any)?.images?.[0]?.url ??
        (result.data as any)?.url;
    if (!resultUrl) throw new Error('BiRefNet 未回傳結果 URL');

    const b64 = await downloadImageAsBase64(resultUrl);
    if (!b64) throw new Error('BiRefNet 圖片下載失敗');

    // 輸出尺寸不符輸入時，resize 回輸入尺寸（保持比例一致，防止 cropRatio 計算出錯）
    if (inputDims) {
        return resizeToMatch(b64, inputDims.w, inputDims.h);
    }
    return b64;
}

/**
 * 單張圖片 BiRefNet v2 去背（整張圖直接去背，不裁切）
 * @param imageBase64  原圖 base64
 * @param falKey       fal.ai API Key
 * @returns 去背後透明 PNG base64
 */
export async function birefnetRemoveBg(imageBase64: string, falKey: string): Promise<string> {
    return removeBgBiRefNet(imageBase64, falKey);
}

/**
 * 主要入口：Gemini 語意偵測 + BiRefNet 去背 → LayerResult[]
 * @param imageBase64  原圖 base64
 * @param geminiApiKey Gemini API Key
 * @param falKey       fal.ai API Key
 * @param onProgress   進度回呼（顯示 toast）
 */
export async function geminiLayerSegment(
    imageBase64: string,
    geminiApiKey: string,
    falKey: string,
    onProgress?: (msg: string) => void,
): Promise<LayerResult[]> {

    // ── Step 1：Gemini 語意物件偵測 ──────────────────────────────
    onProgress?.('🔍 Gemini 分析圖片語意中...');

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
    const mimeType = imageBase64.match(/data:(.*);base64/)?.[1] ?? 'image/png';

    const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: {
            parts: [
                { inlineData: { mimeType, data: cleanBase64 } },
                {
                    text: `Detect 2 to 5 major semantic objects in this image (e.g. person, vehicle, building, animal, product, sign). Each must be a visually distinct, meaningful foreground element. Do NOT include pure shadow areas, uniform sky, or empty ground unless it is the primary subject.

Return ONLY a valid JSON array, no markdown, no explanation:
[{"label":"train","box_2d":[y1,x1,y2,x2]},{"label":"bridge","box_2d":[y1,x1,y2,x2]}]

Coordinates are integers 0-1000 (normalized from image dimensions). Each box must tightly surround its object.`
                }
            ]
        },
    });

    const text = response.text ?? '';

    // 移除 markdown code block（```json ... ``` 或 ``` ... ```）
    const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    // 貪婪抓取最外層的 JSON 陣列
    const match = stripped.match(/\[[\s\S]*\]/);
    if (!match) {
        console.error('[geminiLayer] raw response:', text);
        throw new Error('Gemini 未回傳物件偵測結果，請重試');
    }

    let objects: DetectedObject[];
    try {
        objects = JSON.parse(match[0]);
    } catch (e) {
        console.error('[geminiLayer] JSON parse failed:', match[0]);
        throw new Error('Gemini 回傳 JSON 解析失敗，請重試');
    }
    if (!objects || objects.length === 0) throw new Error('Gemini 未偵測到任何物件');

    onProgress?.(`✨ 偵測到 ${objects.length} 個物件，開始去背...`);

    // ── Step 2：取得原圖尺寸 ────────────────────────────────────
    const { w: W, h: H } = await getImageDims(imageBase64);

    // ── Step 3：逐一處理每個物件 ────────────────────────────────
    fal.config({ credentials: falKey });
    const results: LayerResult[] = [];

    for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        onProgress?.(`🎨 去背中 ${i + 1}/${objects.length}：${obj.label}`);
        try {
            // 裁切物件區域
            const crop = await cropToBBox(imageBase64, obj.box_2d);
            // BiRefNet 去背
            const transparent = await removeBgBiRefNet(crop, falKey);
            // 放回全圖座標
            const fullLayer = await placeInFullCanvas(transparent, W, H, obj.box_2d);
            // 裁切透明邊緣
            const trimmed = await trimTransparentPixels(fullLayer);
            results.push(trimmed);
        } catch (e) {
            console.warn(`[geminiLayer] Skip "${obj.label}":`, e);
        }
    }

    if (results.length === 0) throw new Error('所有物件去背均失敗，請重試');
    return results;
}
