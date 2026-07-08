/**
 * 生成前後的透明背景處理鏈（純 TypeScript，無 React 依賴）
 *
 * 從 useAI.ts 剝離的「後台流程」：
 *  - 生成前：來源有透明 → 挑最遠色壓平成純色底（避免 GPT Edit 把透明當遮罩）
 *  - 生成後：三級去背還原透明（BiRefNet → Gemini 語意去背 → 本機 flood-fill/chroma）
 * 所有 API key 以參數傳入，函式不持有任何 UI 狀態。
 */
import { GoogleGenAI } from '@google/genai';
import { hasTransparency, processChromaKey } from '../utils/helpers';
import { executeDynamicRemoval } from '../utils/DynamicBackgroundRemoval';
import { birefnetRemoveBg } from '../utils/geminiLayer';
import { repairStickerTransparency } from '../utils/imageProcessing';

/** 根據主體主色調選最佳 Chroma Key 底色（取與主體平均色距離最遠的候選色） */
export function findBestChromaColor(base64: string): Promise<string> {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const size = 80;
            canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, size, size);
            const data = ctx.getImageData(0, 0, size, size).data;
            let r = 0, g = 0, b = 0, count = 0;
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] > 50) { r += data[i]; g += data[i + 1]; b += data[i + 2]; count++; }
            }
            if (count === 0) { resolve('#00BB44'); return; }
            r /= count; g /= count; b /= count;
            const candidates = [
                { hex: '#00FF00', r: 0, g: 255, b: 0 },   // 純綠（螢光綠）
                { hex: '#0000FF', r: 0, g: 0, b: 255 },   // 純藍
                { hex: '#FF0000', r: 255, g: 0, b: 0 },   // 純紅
                { hex: '#FF00FF', r: 255, g: 0, b: 255 }, // 洋紅
            ];
            let best = '#00BB44', maxDist = 0;
            for (const c of candidates) {
                const dist = Math.sqrt((r - c.r) ** 2 + (g - c.g) ** 2 + (b - c.b) ** 2);
                if (dist > maxDist) { maxDist = dist; best = c.hex; }
            }
            resolve(best);
        };
        img.onerror = () => resolve('#FFFFFF');
        img.src = base64;
    });
}

/** 把透明背景壓平成純色底（避免 GPT Edit 把透明當遮罩） */
export function flattenTransparentImage(base64: string, bgColor: string): Promise<string> {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d')!;
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(base64);
        img.src = base64;
    });
}

export interface PreparedImage {
    src: string;
    hadTransparency: boolean;
    bgColor: string;
}

/**
 * 生成前準備：若來源有透明且開啟 preserveTransparency → 壓平並記錄底色。
 * 未開啟或無透明 → 原樣返回（bgColor 為白，僅佔位）。
 */
export async function prepareImageForGeneration(
    src: string,
    preserveTransparency: boolean,
): Promise<PreparedImage> {
    if (!preserveTransparency) return { src, hadTransparency: false, bgColor: '#FFFFFF' };
    const transparent = await hasTransparency(src);
    if (!transparent) return { src, hadTransparency: false, bgColor: '#FFFFFF' };
    const bgColor = await findBestChromaColor(src);
    const flatSrc = await flattenTransparentImage(src, bgColor);
    return { src: flatSrc, hadTransparency: true, bgColor };
}

export interface RestoreTransparencyKeys {
    falApiKey?: string | null;
    geminiApiKey?: string | null;
    imageModel?: string;
}

/**
 * 生成後還原透明背景。
 * 優先順序：1) BiRefNet（fal key）→ 2) Gemini AI 去背（executeDynamicRemoval）→ 3) Chroma Key（基本備用）
 *
 * 貼圖是硬邊+實心+白模切框，用 General Use (Heavy)：最高精度的一般分割，
 * 邊緣乾淨有把握；Matting 偏軟 alpha 是給毛髮/半透明用的，反而會羽化白框、挖淺色洞。
 */
export async function restoreTransparency(
    resultSrc: string,
    bgColor: string,
    keys: RestoreTransparencyKeys,
): Promise<string> {
    // 1. BiRefNet（品質最佳）
    if (keys.falApiKey) {
        try {
            return await birefnetRemoveBg(resultSrc, keys.falApiKey, 'General Use (Heavy)');
        } catch (e) {
            console.warn('[restoreTransparency] BiRefNet failed, trying Gemini...', e);
        }
    }
    // 2. Gemini AI 去背（無 fal key 時）
    if (keys.geminiApiKey) {
        try {
            const genAI = new GoogleGenAI({ apiKey: keys.geminiApiKey });
            return await executeDynamicRemoval(resultSrc, genAI, undefined, keys.imageModel);
        } catch (e) {
            console.warn('[restoreTransparency] Gemini removal failed, fallback chroma key', e);
        }
    }
    // 3. Chroma Key / Flood-fill 去背（本機最後備用，品質比一般 chroma key 更好）
    try {
        return await repairStickerTransparency(resultSrc, { backgroundColor: bgColor });
    } catch (e) {
        console.warn('[restoreTransparency] Flood-fill repair failed, fallback basic chroma key', e);
        return processChromaKey(resultSrc, bgColor);
    }
}
