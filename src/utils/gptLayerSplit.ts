/**
 * GPT Image 2 魔法分層
 * 流程：Gemini 識別語意元素 → GPT Image 2 Edit 逐層提取（透明背景）
 *       → GPT Image 2 Edit 補全背景 → LayerResult[]
 */

import { GoogleGenAI } from '@google/genai';
import { callAtlasImg2Img } from './atlasImage';
import { trimTransparentPixels, LayerResult } from './falImage';

interface DetectedObject {
    label: string;
    labelEn: string; // 英文，給 GPT prompt 用
}

/** Gemini 識別圖片中的語意元素 */
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
                    text: `Detect 2 to 4 major semantic foreground objects in this image. Exclude pure sky or ground unless they are the primary subject.

Return ONLY valid JSON array, no markdown:
[{"label":"火車","labelEn":"train"},{"label":"橋樑","labelEn":"bridge"}]`
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
    return objects;
}

/** 檢查 base64 圖片是否含有透明像素（alpha < 255）*/
function hasTransparentPixels(base64: string): Promise<boolean> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = Math.min(img.naturalWidth, 256);
            canvas.height = Math.min(img.naturalHeight, 256);
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            for (let i = 3; i < data.length; i += 4) {
                if (data[i] < 250) { resolve(true); return; }
            }
            resolve(false);
        };
        img.onerror = () => resolve(false);
        img.src = base64;
    });
}

/**
 * 主要入口：GPT Image 2 分層提取
 * @param imageBase64  原圖 base64
 * @param geminiApiKey Gemini API Key（語意識別用）
 * @param atlasKey     Atlas Cloud API Key（GPT Image 2 用）
 * @param onProgress   進度回呼
 */
export async function gptLayerSegment(
    imageBase64: string,
    geminiApiKey: string,
    atlasKey: string,
    onProgress?: (msg: string) => void,
): Promise<{ layers: LayerResult[]; transparentSupported: boolean }> {

    // ── Step 1：Gemini 識別元素 ────────────────────────────
    onProgress?.('🔍 Gemini 分析圖片語意中...');
    const objects = await detectObjects(imageBase64, geminiApiKey);
    onProgress?.(`✨ 偵測到 ${objects.length} 個元素，開始分層提取...`);

    const layers: LayerResult[] = [];
    let transparentSupported = false;

    // ── Step 2：逐層提取 ───────────────────────────────────
    for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        onProgress?.(`🎨 提取第 ${i + 1}/${objects.length} 層：${obj.label}`);
        try {
            const results = await callAtlasImg2Img(
                `Extract only the "${obj.labelEn}" (${obj.label}) from this image as an isolated element. ` +
                `Output with a completely transparent background. ` +
                `Preserve the exact original position, size, proportions, colors, lighting and details of the "${obj.labelEn}". ` +
                `Do not move, resize, or modify the element in any way. ` +
                `Everything except the "${obj.labelEn}" must be fully transparent.`,
                'gpt-image-2',
                atlasKey,
                imageBase64,
                1,
                { ratio: 'Original', transparentBg: true },
            );

            if (!results[0]) continue;

            // 測試是否真的有透明通道（驗證 Atlas 是否支援）
            const hasAlpha = await hasTransparentPixels(results[0]);
            if (hasAlpha) transparentSupported = true;

            const trimmed = await trimTransparentPixels(results[0]);
            layers.push(trimmed);
        } catch (e) {
            console.warn(`[gptLayerSplit] Skip "${obj.label}":`, e);
        }
    }

    // ── Step 3：背景補圖 ───────────────────────────────────
    onProgress?.('🌄 生成補全背景中...');
    try {
        const labelsList = objects.map(o => `"${o.labelEn}" (${o.label})`).join(', ');
        const bgResults = await callAtlasImg2Img(
            `Remove the following foreground elements from this image: ${labelsList}. ` +
            `Reconstruct the complete background naturally and realistically. ` +
            `Fill all areas where elements were removed with appropriate background content. ` +
            `Preserve the original background colors, lighting, perspective and atmosphere.`,
            'gpt-image-2',
            atlasKey,
            imageBase64,
            1,
            { ratio: 'Original' },
        );
        if (bgResults[0]) {
            // 背景層放最前面（最底層）
            layers.unshift({
                base64: bgResults[0],
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
    return { layers, transparentSupported };
}
