/**
 * GPT Image 2 魔法分層
 * 流程：Gemini 識別語意元素
 *       → GPT Image 2 Edit 逐層隔離（灰色背景）
 *       → BiRefNet v2 去背（有 fal key）/ 品紅 Chroma Key 備援（無 fal key）
 *       → GPT Image 2 Edit 補全背景
 *       → LayerResult[]
 */

import { GoogleGenAI } from '@google/genai';
import { callAtlasImg2Img } from './atlasImage';
import { birefnetRemoveBg } from './geminiLayer';
import { trimTransparentPixels, LayerResult } from './falImage';

/** GPT 隔離用的中性灰背景色（BiRefNet 對背景色不敏感，灰色對主體顏色干擾最小） */
const ISOLATION_BACKGROUNDS = ['#DADADA', '#CFCFCF', '#E5E5E5'] as const;

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
 * Chroma Key 備援（僅在無 fal key 時使用）
 * 移除品紅色（#FF00FF）背景，邊緣做平滑漸變
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
                const dr = r - 255, dg = g - 0, db = b - 255;
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

/** hex #RRGGBB → 'R,G,B' */
function hexToRgb(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
}

/**
 * 主要入口：GPT Image 2 分層提取
 * @param imageBase64  原圖 base64
 * @param geminiApiKey Gemini API Key（語意識別用）
 * @param atlasKey     Atlas Cloud API Key（GPT Image 2 用）
 * @param falKey       fal.ai API Key（BiRefNet 去背用，選填；無則 Chroma Key 備援）
 * @param onProgress   進度回呼
 */
export async function gptLayerSegment(
    imageBase64: string,
    geminiApiKey: string,
    atlasKey: string,
    falKey?: string,
    onProgress?: (msg: string) => void,
): Promise<LayerResult[]> {

    const useBiRefNet = !!falKey;

    // ── Step 1：Gemini 識別元素 ────────────────────────────
    onProgress?.('🔍 Gemini 分析圖片語意中...');
    const objects = await detectObjects(imageBase64, geminiApiKey);
    const bgMethod = useBiRefNet ? 'BiRefNet' : 'Chroma Key';
    onProgress?.(`✨ 偵測到 ${objects.length} 個元素，使用 ${bgMethod} 去背...`);

    const layers: LayerResult[] = [];

    // ── Step 2：逐層提取 ───────────────────────────────────
    for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        onProgress?.(`🎨 提取第 ${i + 1}/${objects.length} 層：${obj.label}`);

        try {
            // 每層輪流使用不同灰色背景，避免背景色與主體色衝突
            const bgHex = useBiRefNet
                ? ISOLATION_BACKGROUNDS[i % ISOLATION_BACKGROUNDS.length]
                : '#FF00FF'; // Chroma Key 備援需要品紅色

            const bgRgb = hexToRgb(bgHex);

            // 2a：GPT Image 2 Edit → 元素留在原位，其餘填指定背景色
            const isolated = await callAtlasImg2Img(
                `In this image, keep ONLY the "${obj.labelEn}" (${obj.label}) visible at its exact original position and scale. ` +
                `Replace ALL other areas with a perfectly solid flat background color (RGB ${bgRgb} / hex ${bgHex}). ` +
                `Preserve every detail of the "${obj.labelEn}": exact colors, lighting, proportions, edges and position. ` +
                `The background must be a perfectly uniform solid color with NO gradients, shadows, or variations.`,
                'gpt-image-2',
                atlasKey,
                imageBase64,
                1,
                { ratio: 'Original' },
            );
            if (!isolated[0]) continue;

            // 2b：去背
            onProgress?.(`✂️ 去背第 ${i + 1}/${objects.length} 層：${obj.label}`);
            let transparent: string;
            if (useBiRefNet) {
                try {
                    transparent = await birefnetRemoveBg(isolated[0], falKey!);
                } catch (e) {
                    console.warn(`[gptLayerSplit] BiRefNet failed for "${obj.label}", fallback chroma key:`, e);
                    transparent = await removeMagentaBackground(isolated[0]);
                }
            } else {
                transparent = await removeMagentaBackground(isolated[0]);
            }

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
