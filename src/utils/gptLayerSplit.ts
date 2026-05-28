/**
 * GPT Image 2 魔法分層
 *
 * 流程：
 *   工作圖縮放至顯示尺寸（el.width × el.height），所有座標在顯示座標系內計算 → 不變形
 *   Gemini 偵測物件 + bounding box
 *   → 直接從工作圖裁切物件區域（不重新生成，保證位置正確）
 *   → BiRefNet v2 去背（有 fal key）/ 品紅 Chroma Key（無 fal key）
 *   → 放回全圖座標 → 裁切透明邊緣 → LayerResult[]
 *   + GPT Image 2 Edit 補全背景（放最底層）
 */

import { GoogleGenAI } from '@google/genai';
import { fal } from '@fal-ai/client';
import { callAtlasImg2Img, downloadImageAsBase64 } from './atlasImage';
import { trimTransparentPixels, LayerResult } from './falImage';

interface DetectedObject {
    label: string;
    box_2d: [number, number, number, number]; // [y1, x1, y2, x2] normalized 0–1000
}

/**
 * 把圖片縮放到指定顯示尺寸（targetW × targetH）
 * 所有後續座標計算均在此尺寸內進行，確保最終 cropRatio * el.width/height 無變形
 */
async function scaleToDisplay(base64: string, targetW: number, targetH: number): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            // 已是目標尺寸則直接使用
            if (img.naturalWidth === targetW && img.naturalHeight === targetH) {
                resolve(base64);
                return;
            }
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

/** Gemini 識別圖片中的語意元素（帶 bounding box） */
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
                    text: `Detect 2 to 4 major semantic foreground objects in this image. Each must be a visually distinct, meaningful element. Do NOT include pure sky, empty ground, or shadows unless they are the primary subject.

Return ONLY a valid JSON array, no markdown, no explanation:
[{"label":"goldfish","box_2d":[y1,x1,y2,x2]},{"label":"bridge","box_2d":[y1,x1,y2,x2]}]

Coordinates are integers 0-1000 (normalized). Each box must tightly surround its object.`
                }
            ]
        },
    });

    const text = response.text ?? '';
    const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    const match = stripped.match(/\[[\s\S]*\]/);
    if (!match) {
        console.error('[gptLayerSplit] Gemini raw response:', text);
        throw new Error('Gemini 未回傳物件偵測結果');
    }

    let objects: DetectedObject[];
    try {
        objects = JSON.parse(match[0]);
    } catch {
        throw new Error('Gemini 回傳 JSON 解析失敗');
    }
    if (!objects || objects.length === 0) throw new Error('Gemini 未偵測到任何物件');
    return objects;
}

/** 從工作圖按 bounding box 裁切（[y1,x1,y2,x2] 0-1000） */
function cropToBBox(imageBase64: string, box: [number, number, number, number], W: number, H: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
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

/** 將裁切後的透明 PNG 放回 W×H 的 canvas，定位在 bounding box 位置 */
function placeInFullCanvas(
    cropBase64: string,
    W: number,
    H: number,
    box: [number, number, number, number],
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

/** BiRefNet v2 去背 */
async function removeBgBiRefNet(cropBase64: string, falKey: string): Promise<string> {
    fal.config({ credentials: falKey });

    const [header, data] = cropBase64.includes(',')
        ? cropBase64.split(',')
        : ['data:image/png;base64', cropBase64];
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
    const ext  = mime.split('/')[1] ?? 'png';
    const binary = atob(data);
    const arr    = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    const file = new File([arr], `birefnet-input.${ext}`, { type: mime });

    const imageUrl = await fal.storage.upload(file);
    const result   = await fal.subscribe('fal-ai/birefnet/v2', {
        input: {
            image_url: imageUrl,
            model: 'General Use (Heavy)',
            operating_resolution: '2048x2048',
            output_format: 'png',
            refine_foreground: true,
        },
    });

    const resultUrl: string | undefined =
        (result.data as any)?.image?.url ??
        (result.data as any)?.images?.[0]?.url ??
        (result.data as any)?.url;
    if (!resultUrl) throw new Error('BiRefNet 未回傳結果 URL');

    const b64 = await downloadImageAsBase64(resultUrl);
    if (!b64) throw new Error('BiRefNet 圖片下載失敗');

    // BiRefNet 可能輸出不同解析度，縮回裁切圖尺寸確保座標對齊
    return scaleToDisplay(b64, ...(await (async () => {
        const dims = await new Promise<[number, number]>((res) => {
            const i = new Image();
            i.onload = () => res([i.naturalWidth, i.naturalHeight]);
            i.onerror = () => res([i.naturalWidth || 256, i.naturalHeight || 256]);
            i.src = cropBase64;
        });
        return dims;
    })()));
}

/** 品紅 Chroma Key 備援（無 fal key 時使用） */
async function removeMagentaBackground(base64: string): Promise<string> {
    return new Promise((resolve) => {
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
                const dr = d[i] - 255, dg = d[i + 1] - 0, db = d[i + 2] - 255;
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

/**
 * 主要入口：魔法分層
 * @param imageBase64   原圖 base64（el.src）
 * @param displayWidth  畫布上的顯示寬度（el.width）
 * @param displayHeight 畫布上的顯示高度（el.height）
 * @param geminiApiKey  Gemini API Key
 * @param atlasKey      Atlas Cloud API Key（GPT Image 2 背景補圖用）
 * @param falKey        fal.ai API Key（BiRefNet 去背用，選填）
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

    // ── Step 1：縮放至顯示尺寸（確保座標系一致，無變形）────
    onProgress?.('🔍 Gemini 分析圖片語意中...');
    const W = displayWidth;
    const H = displayHeight;
    const workingImage = await scaleToDisplay(imageBase64, W, H);

    // ── Step 2：Gemini 偵測物件 + bounding box ────────────
    const objects = await detectObjects(workingImage, geminiApiKey);
    const bgMethod = useBiRefNet ? 'BiRefNet' : 'Chroma Key';
    onProgress?.(`✨ 偵測到 ${objects.length} 個物件，使用 ${bgMethod} 去背...`);

    const layers: LayerResult[] = [];

    // ── Step 3：逐一裁切 + 去背 ───────────────────────────
    for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        onProgress?.(`✂️ 處理第 ${i + 1}/${objects.length} 層：${obj.label}`);
        try {
            // 直接從工作圖（顯示尺寸）裁切 → 座標與 el.width/el.height 完全對應
            const crop = await cropToBBox(workingImage, obj.box_2d, W, H);

            // 去背
            let transparent: string;
            if (useBiRefNet) {
                try {
                    transparent = await removeBgBiRefNet(crop, falKey!);
                } catch (e) {
                    console.warn(`[gptLayerSplit] BiRefNet failed for "${obj.label}", fallback chroma key:`, e);
                    transparent = await removeMagentaBackground(crop);
                }
            } else {
                transparent = await removeMagentaBackground(crop);
            }

            // 放回全尺寸 canvas（W × H），再裁切透明邊緣
            const fullLayer = await placeInFullCanvas(transparent, W, H, obj.box_2d);
            const trimmed   = await trimTransparentPixels(fullLayer);
            layers.push(trimmed);
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
            'gpt-image-2',
            atlasKey,
            imageBase64,   // 背景補圖送原圖（高畫質），比例由 Atlas 自動偵測
            1,
            { ratio: 'Original' },
        );
        if (bgResults[0]) {
            // 背景補圖縮放至顯示尺寸，確保填滿元素不變形
            const bgScaled = await scaleToDisplay(bgResults[0], W, H);
            layers.unshift({
                base64: bgScaled,
                cropRatioX: 0,
                cropRatioY: 0,
                cropRatioW: 1,
                cropRatioH: 1,
            });
        }
    } catch (e) {
        console.warn('[gptLayerSplit] Background inpainting failed:', e);
    }

    if (layers.length === 0) throw new Error('所有圖層提取均失敗');
    return layers;
}
