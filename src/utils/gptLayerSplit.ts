/**
 * GPT Image 2 魔法分層（重構版）
 *
 * 定位策略：Gemini 回傳 bbox 座標 → 用於回貼位置（接近原圖）
 * 視覺策略：GPT Image 2 Edit 隔離 → BiRefNet/Chroma Key 去背（保持品質）
 * 效能策略：所有物件 Promise.all 平行處理，背景補全同步開跑互不等待
 *
 * 流程：
 *   Gemini（bbox + category + bgColor）
 *   → [Promise.all] GPT Image 2 隔離 → BiRefNet/Chroma Key 去背（含 2min timeout）
 *   → [同步] GPT Image 2 背景補全
 *   → LayerResult[]（cropRatio 來自 Gemini bbox，位置接近原圖）
 */

import { GoogleGenAI } from '@google/genai';
import { callAtlasImg2Img } from './atlasImage';
import { birefnetRemoveBg } from './geminiLayer';
import { trimTransparentPixels, LayerResult } from './falImage';

// ── 背景色方案 ──────────────────────────────────────────────────────────────
const BG_COLOR_MAP = {
    GREEN: { hex: '#00FF00', rgb: '0,255,0' },
    BLUE:  { hex: '#0000FF', rgb: '0,0,255' },
    RED:   { hex: '#FF0000', rgb: '255,0,0' },
    GRAY:  { hex: '#DADADA', rgb: '218,218,218' },
} as const;

type BgColorKey = keyof typeof BG_COLOR_MAP;

// ── 偵測結果 ─────────────────────────────────────────────────────────────────
interface DetectedObject {
    label: string;
    labelEn: string;
    category: 'SUBJECT' | 'PRODUCT' | 'OBJECTS' | 'DECOR' | 'TEXT';
    bgColor: BgColorKey;
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
        model: 'gemini-2.0-flash',
        contents: {
            parts: [
                { inlineData: { mimeType, data: cleanBase64 } },
                {
                    text: `Analyze this image and detect 3-8 major design elements to separate into independent layers.

Categories (pick the most accurate):
- SUBJECT: main person, character, portrait
- PRODUCT: featured product or hero object
- OBJECTS: props, items, tools, secondary objects
- DECOR: decorative elements, patterns, icons
- TEXT: text overlays, logos, typography

bgColor (pick the color that contrasts MOST with this specific object for easy chroma-key removal):
- GREEN: use for skin tones, red/orange/warm objects
- BLUE: use for green/nature/plant objects
- RED: use for blue/cool-tone objects
- GRAY: use for multi-colored or complex objects (BiRefNet default)

Exclude: pure shadows, gradients, large plain backgrounds, light/glow effects.

bbox values must be precise tight bounding boxes (0.0 to 1.0 ratios of image width/height).

Return ONLY valid JSON array, no markdown, no explanation:
[{"label":"人物","labelEn":"person","category":"SUBJECT","bgColor":"GREEN","bbox":{"x":0.10,"y":0.05,"w":0.35,"h":0.85}}]`
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

    // bbox 安全夾值
    return objects.map(o => ({
        ...o,
        bbox: {
            x: Math.max(0, Math.min(1, o.bbox?.x ?? 0)),
            y: Math.max(0, Math.min(1, o.bbox?.y ?? 0)),
            w: Math.max(0.01, Math.min(1, o.bbox?.w ?? 1)),
            h: Math.max(0.01, Math.min(1, o.bbox?.h ?? 1)),
        },
    }));
}

// ── 通用 Chroma Key 去背（任意目標色）───────────────────────────────────────
async function removeColorBackground(base64: string, targetHex: string): Promise<string> {
    const tR = parseInt(targetHex.slice(1, 3), 16);
    const tG = parseInt(targetHex.slice(3, 5), 16);
    const tB = parseInt(targetHex.slice(5, 7), 16);

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
                if (dist < 60)        d[i + 3] = 0;
                else if (dist < 110)  d[i + 3] = Math.round(((dist - 60) / 50) * 255);
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
    imageBase64: string,
    atlasKey: string,
    falKey: string | undefined,
    onProgress?: (msg: string) => void,
): Promise<LayerResult | null> {
    const useBiRefNet = !!falKey;
    const bgColor = BG_COLOR_MAP[obj.bgColor] ?? BG_COLOR_MAP.GRAY;

    try {
        // 2a：GPT Image 2 Edit — 保留目標物件，填純色背景
        const isolated = await callAtlasImg2Img(
            `In this image, keep ONLY the "${obj.labelEn}" (${obj.label}) visible at its exact original position and scale. ` +
            `Replace ALL other areas with a perfectly solid flat background color (RGB ${bgColor.rgb} / hex ${bgColor.hex}). ` +
            `Preserve every detail of the "${obj.labelEn}": exact colors, lighting, proportions, edges and position. ` +
            `The background must be a perfectly uniform solid color with NO gradients, shadows, or variations.`,
            'gpt-image-2',
            atlasKey,
            imageBase64,
            1,
            { ratio: 'Original' },
        );
        if (!isolated[0]) return null;

        // 2b：去背（BiRefNet 優先，timeout 2min 後降級 Chroma Key）
        onProgress?.(`✂️ 去背：${obj.label}`);
        let transparent: string;
        if (useBiRefNet) {
            transparent = await withTimeout(
                birefnetRemoveBg(isolated[0], falKey!),
                120_000,
                () => {
                    console.warn(`[magicLayer] BiRefNet timeout for "${obj.label}", fallback chroma key`);
                    return removeColorBackground(isolated[0], bgColor.hex);
                },
            );
        } else {
            transparent = await removeColorBackground(isolated[0], bgColor.hex);
        }

        // 2c：裁切透明邊緣（取得實際像素內容，但定位用 Gemini bbox）
        const trimmed = await trimTransparentPixels(transparent);

        // ⭐ 定位座標用 Gemini bbox（比 trimTransparentPixels 更接近原圖位置）
        return {
            base64:      trimmed.base64,
            cropRatioX:  obj.bbox.x,
            cropRatioY:  obj.bbox.y,
            cropRatioW:  obj.bbox.w,
            cropRatioH:  obj.bbox.h,
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

    // 背景補全立即開始（不等物件提取完成）
    const bgPromise = callAtlasImg2Img(
        `Remove the following foreground elements from this image: ${labelsList}. ` +
        `Reconstruct the complete background naturally and realistically. ` +
        `Fill all areas where elements were removed with appropriate background content. ` +
        `Preserve the original background colors, lighting, perspective and atmosphere.`,
        'gpt-image-2',
        atlasKey,
        imageBase64,
        1,
        { ratio: 'Original' },
    ).catch(e => { console.warn('[magicLayer] Background inpainting failed:', e); return null; });

    // 所有物件平行去背
    const objectResults = await Promise.all(
        objects.map((obj, i) => {
            onProgress?.(`🎨 提取第 ${i + 1}/${objects.length} 層：${obj.label}`);
            return extractOneLayer(obj, imageBase64, atlasKey, falKey, onProgress);
        })
    );

    // 等背景補全結果
    onProgress?.('🌄 等待背景補全完成...');
    const bgResult = await bgPromise;

    // 組合結果（背景放首位）
    const layers: LayerResult[] = [];

    if (bgResult?.[0]) {
        layers.push({
            base64:     bgResult[0],
            cropRatioX: 0,
            cropRatioY: 0,
            cropRatioW: 1,
            cropRatioH: 1,
            name:       '補全背景',
            category:   'SUBJECT',
        });
    }

    for (const r of objectResults) {
        if (r) layers.push(r);
    }

    if (layers.length === 0) throw new Error('所有圖層提取均失敗');
    return layers;
}
