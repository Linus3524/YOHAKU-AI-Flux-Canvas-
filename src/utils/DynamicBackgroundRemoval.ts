
import { generateOneImage, type ImageEngineConfig } from '../ai/generateImage';
import { birefnetRemoveBg } from './geminiLayer';
import { getClosestAspectRatio } from './helpers';

// Helper to load image
const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
};

// 隔離底色：依主體顏色自動挑對比色（中飽和三色 + 深灰）。
// 白/灰底對白衣白髮主體會被 matting 吃掉，故不再作為預設；
// 中飽和色（非純色）可將 despill 邊緣染色風險降到最低。
const CONTRAST_BACKGROUNDS = {
    GREEN:    { hex: '#00BB44', name: 'MEDIUM GREEN',  rgb: [0, 187, 68] as const },
    BLUE:     { hex: '#2255CC', name: 'MEDIUM BLUE',   rgb: [34, 85, 204] as const },
    RED:      { hex: '#CC2200', name: 'MEDIUM RED',    rgb: [204, 34, 0] as const },
    DARKGRAY: { hex: '#3A3A3A', name: 'DARK GRAY',     rgb: [58, 58, 58] as const },
} as const;

type ContrastBackground = typeof CONTRAST_BACKGROUNDS[keyof typeof CONTRAST_BACKGROUNDS];

/**
 * 自動判斷隔離底色（回到三色＋深灰的補色邏輯）：
 * - 主體有明確色相 → 取平均色相的補色區間（紅/綠/藍）
 * - 色相分散的多彩主體 → 深灰
 * - 近灰階主體（白衣、白髮、灰白 Logo）→ 綠（白色部位不會與底色同色）
 */
export const analyzeContrastBackground = (imageSrc: string): Promise<ContrastBackground> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const size = 100; canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(CONTRAST_BACKGROUNDS.GREEN); return; }
            ctx.drawImage(img, 0, 0, size, size);
            const data = ctx.getImageData(0, 0, size, size).data;

            // 只採樣中央 60% 區域（主體通常在中間），避免原背景干擾判斷
            const lo = Math.floor(size * 0.2), hi = Math.ceil(size * 0.8);
            const hues: number[] = [];
            for (let y = lo; y < hi; y++) {
                for (let x = lo; x < hi; x++) {
                    const i = (y * size + x) * 4;
                    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
                    const max = Math.max(r, g, b), min = Math.min(r, g, b);
                    const sat = max === 0 ? 0 : (max - min) / max;
                    if (sat < 0.25 || max < 0.15) continue; // 略過灰階/過暗像素
                    let h = 0;
                    if (max === r) h = ((g - b) / (max - min)) % 6;
                    else if (max === g) h = (b - r) / (max - min) + 2;
                    else h = (r - g) / (max - min) + 4;
                    hues.push(((h * 60) + 360) % 360);
                }
            }

            const sampled = (hi - lo) * (hi - lo);
            // 近灰階主體（白衣白髮/銀灰產品）：飽和像素 <8% → 綠底
            if (hues.length < sampled * 0.08) { resolve(CONTRAST_BACKGROUNDS.GREEN); return; }

            // 色相環平均（向量法，避免 350°+10° 平均成 180° 的錯誤）
            let sx = 0, sy = 0;
            for (const h of hues) { sx += Math.cos(h * Math.PI / 180); sy += Math.sin(h * Math.PI / 180); }
            const resultant = Math.sqrt(sx * sx + sy * sy) / hues.length; // 0~1，越小=色相越分散
            if (resultant < 0.35) { resolve(CONTRAST_BACKGROUNDS.DARKGRAY); return; } // 多彩主體 → 深灰

            const avgHue = ((Math.atan2(sy, sx) * 180 / Math.PI) + 360) % 360;
            const complement = (avgHue + 180) % 360;
            if (complement >= 300 || complement < 60) resolve(CONTRAST_BACKGROUNDS.RED);
            else if (complement < 180) resolve(CONTRAST_BACKGROUNDS.GREEN);
            else resolve(CONTRAST_BACKGROUNDS.BLUE);
        };
        img.onerror = () => resolve(CONTRAST_BACKGROUNDS.GREEN);
        img.src = imageSrc;
    });
};

export interface DynamicRemovalEngine extends ImageEngineConfig {
    falApiKey?: string | null;
}

const detectAspectRatio = async (imageSrc: string): Promise<string> => {
    try {
        const image = await loadImage(imageSrc);
        return getClosestAspectRatio(image.naturalWidth || image.width, image.naturalHeight || image.height);
    } catch {
        return '1:1';
    }
};

// Helper: Calculate Dynamic Threshold
const calculateDynamicThreshold = (data: Uint8ClampedArray, targetR: number, targetG: number, targetB: number): number => {
    // 採樣背景角落像素，計算顏色標準差
    const cornerSamples: number[] = [];
    const w = Math.sqrt(data.length / 4);
    const samplePoints = [0, 10, 20, w*10, w*10+10]; // 左上角區域
    
    samplePoints.forEach(idx => {
        const i = Math.floor(idx) * 4;
        if (i + 2 >= data.length) return;
        const dist = Math.sqrt(
            Math.pow(data[i] - targetR, 2) +
            Math.pow(data[i+1] - targetG, 2) +
            Math.pow(data[i+2] - targetB, 2)
        );
        cornerSamples.push(dist);
    });
    
    if (cornerSamples.length === 0) return 95;
    const avg = cornerSamples.reduce((a,b) => a+b) / cornerSamples.length;
    const std = Math.sqrt(cornerSamples.map(x => Math.pow(x - avg, 2)).reduce((a,b) => a+b) / cornerSamples.length);
    
    // 閾值 = 平均距離 + 2 倍標準差（容納雜訊）
    return Math.min(Math.max(avg + std * 2, 60), 130);
};

// --- 2. Step 2 & 3: Dynamic Chroma Key & Despill ---
const processChromaKey = (imageSrc: string, targetHex: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if(!ctx) { resolve(imageSrc); return; }
            
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            const targetR = parseInt(targetHex.slice(1, 3), 16);
            const targetG = parseInt(targetHex.slice(3, 5), 16);
            const targetB = parseInt(targetHex.slice(5, 7), 16);
            
            const keyThreshold = calculateDynamicThreshold(data, targetR, targetG, targetB); 

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const distance = Math.sqrt((r-targetR)**2 + (g-targetG)**2 + (b-targetB)**2);

                if (distance < keyThreshold) {
                    data[i + 3] = 0; // Alpha 0
                }
            }
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(imageSrc);
        img.src = imageSrc;
    });
};

// --- 3. Main Handler Logic ---
export const executeDynamicRemoval = async (imageSrc: string, engine: DynamicRemovalEngine, onProgress?: (msg: string) => void): Promise<string> => {
    if (engine.model !== 'gemini' && !engine.atlasApiKey) {
        throw new Error('請先設定 Atlas Cloud Key 才能使用目前選擇的模型進行智慧去背');
    }
    if (engine.model === 'gemini' && !engine.geminiApiKey) {
        throw new Error('請先設定 Gemini API Key 才能使用智慧去背');
    }

    if (onProgress) onProgress(`智慧去背: 使用目前選擇的 ${engine.model === 'gemini' ? 'Gemini' : engine.model === 'gpt-image-2' ? 'GPT Image 2' : '即夢 Pro'} 模型隔離主體`);

    // 1. 本地自動判斷對比底色（三色＋深灰），確保白衣白髮等淺色部位不與底色同色。
    const background = await analyzeContrastBackground(imageSrc);
    if (onProgress) onProgress(`智慧去背: 分析完成，選用 ${background.name} 隔離底色`);

    const prompt1 = `
    Isolate the main subject from the supplied image without changing its identity, pose, proportions, color, texture, lighting, or composition.
    Place it on exactly one perfectly flat solid background color: ${background.name} (hex ${background.hex}, RGB ${background.rgb.join(',')}).
    The background must be perfectly uniform — no gradients, checkerboards, scenery, shadows, or patterns.
    Do NOT let the background color tint, reflect on, or bleed into the subject's edges.
    Preserve every fine edge, including white hair, white fabric, translucent glass, and pale details. Keep the subject at the original scale and position.
    This is an isolation source for software matting, not a transparent PNG request.
    `;
    const aspectRatio = await detectAspectRatio(imageSrc);
    const generatedSrc = await generateOneImage({ prompt: prompt1, aspectRatio, refImage: imageSrc }, engine);
    if (!generatedSrc) throw new Error('隔離生成沒有回傳圖片');

    // 2. BiRefNet 以 alpha matting 去背（對比底色下 alpha 更乾淨）。
    if (engine.falApiKey) {
        if (onProgress) onProgress('智慧去背: 正在保留細節與透明邊緣...');
        return await birefnetRemoveBg(generatedSrc, engine.falApiKey, 'Matting');
    }

    // 無 fal key 時的本機備援：直接對選定底色做 chroma key。
    if (onProgress) onProgress(`智慧去背: 使用 ${background.name} 底色備援去背`);
    return processChromaKey(generatedSrc, background.hex);
};
