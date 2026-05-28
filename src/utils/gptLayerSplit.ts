/**
 * GPT Image 2 魔法分層
 * 流程：Gemini 識別語意元素
 *       → GPT Image 2 Edit 逐層隔離（品紅 #FF00FF 背景）
 *       → 瀏覽器 Chroma Key 去掉品紅 → 透明 PNG
 *       → GPT Image 2 Edit 補全背景
 *       → LayerResult[]
 */

import { GoogleGenAI } from '@google/genai';
import { callAtlasImg2Img } from './atlasImage';
import { trimTransparentPixels, LayerResult } from './falImage';

interface DetectedObject {
    label: string;
    labelEn: string;
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

/**
 * Chroma Key：移除品紅色（#FF00FF）背景，邊緣做平滑漸變
 * GPT output 是 PNG，品紅區域很乾淨，tolerance 60 就夠；
 * 邊緣抗鋸齒區域用 60-110 漸層過渡。
 */
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
                const r = d[i], g = d[i + 1], b = d[i + 2];
                // 與純品紅 (255, 0, 255) 的歐氏距離
                const dr = r - 255, dg = g - 0, db = b - 255;
                const dist = Math.sqrt(dr * dr + dg * dg + db * db);
                if (dist < 60) {
                    d[i + 3] = 0;                                          // 完全透明
                } else if (dist < 110) {
                    d[i + 3] = Math.round(((dist - 60) / 50) * 255);      // 漸層邊緣
                }
            }
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(base64);
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
): Promise<LayerResult[]> {

    // ── Step 1：Gemini 識別元素 ────────────────────────────
    onProgress?.('🔍 Gemini 分析圖片語意中...');
    const objects = await detectObjects(imageBase64, geminiApiKey);
    onProgress?.(`✨ 偵測到 ${objects.length} 個元素，開始分層提取...`);

    const layers: LayerResult[] = [];

    // ── Step 2：逐層提取（品紅背景隔離 → Chroma Key 去背）──
    for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        onProgress?.(`🎨 提取第 ${i + 1}/${objects.length} 層：${obj.label}`);
        try {
            // 2a：GPT Image 2 Edit → 元素留在原位，其餘填純品紅背景
            const isolated = await callAtlasImg2Img(
                `In this image, keep ONLY the "${obj.labelEn}" (${obj.label}) visible at its exact original position and scale. ` +
                `Replace ALL other areas with a perfectly solid bright magenta background (RGB 255,0,255 / hex #FF00FF). ` +
                `Preserve every detail of the "${obj.labelEn}": exact colors, lighting, proportions, edges and position. ` +
                `The background must be a perfectly uniform solid #FF00FF magenta with NO gradients, shadows, or variations.`,
                'gpt-image-2',
                atlasKey,
                imageBase64,
                1,
                { ratio: 'Original' },
            );
            if (!isolated[0]) continue;

            // 2b：Chroma Key → 移除品紅 → 透明 PNG
            onProgress?.(`✂️ 去背第 ${i + 1}/${objects.length} 層：${obj.label}`);
            const transparent = await removeMagentaBackground(isolated[0]);

            const trimmed = await trimTransparentPixels(transparent);
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
    return layers;
}
