
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

// 隔離圖只使用中性白／灰，避免高飽和 chroma key 反射到白髮、白衣與半透明邊緣。
const NEUTRAL_BACKGROUNDS = {
    WHITE: { hex: '#FFFFFF', name: 'WHITE' },
    GRAY: { hex: '#787878', name: 'NEUTRAL GRAY' },
} as const;

type NeutralBackground = typeof NEUTRAL_BACKGROUNDS[keyof typeof NEUTRAL_BACKGROUNDS];

export interface DynamicRemovalEngine extends ImageEngineConfig {
    falApiKey?: string | null;
}

// 保留輸出層級的中性背景判斷：無論模型最後選白或灰，後段都取實際角落色做備援扣圖。
const detectNeutralBackground = (imageSrc: string): Promise<NeutralBackground> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const size = 100; canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(NEUTRAL_BACKGROUNDS.WHITE); return; }
            
            ctx.drawImage(img, 0, 0, size, size);
            const data = ctx.getImageData(0, 0, size, size).data;
            
            const corners = [0, size - 1, (size - 1) * size, size * size - 1];
            const luminance = corners.reduce((sum, pixelIndex) => {
                const offset = pixelIndex * 4;
                return sum + (data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722);
            }, 0) / corners.length;
            resolve(luminance > 190 ? NEUTRAL_BACKGROUNDS.WHITE : NEUTRAL_BACKGROUNDS.GRAY);
        };
        img.onerror = () => resolve(NEUTRAL_BACKGROUNDS.WHITE);
        img.src = imageSrc;
    });
};

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

    // 1. 由目前全域模型生成中性隔離圖。白／淺色主體（包含白髮、白衣）明確指定灰底。
    const prompt1 = `
    Isolate the main subject from the supplied image without changing its identity, pose, proportions, color, texture, lighting, or composition.
    Place it on exactly one perfectly flat neutral background: use PURE WHITE (#FFFFFF) by default. If the subject has white or off-white hair, clothing, fur, feathers, product surfaces, logo/text, or transparent/pale edges, use a uniform NEUTRAL MEDIUM GRAY (#787878) instead.
    Never use red, green, blue, black, a saturated chroma-key color, a checkerboard, gradients, scenery, shadows, or patterns.
    Preserve every fine edge, including white hair, white fabric, translucent glass, and pale details. Keep the subject at the original scale and position.
    This is an isolation source for software matting, not a transparent PNG request.
    `;
    const aspectRatio = await detectAspectRatio(imageSrc);
    const generatedSrc = await generateOneImage({ prompt: prompt1, aspectRatio, refImage: imageSrc }, engine);
    if (!generatedSrc) throw new Error('隔離生成沒有回傳圖片');

    // 2. BiRefNet 以 alpha matting 去背，避免白／灰背景用硬閾值傷到細髮與半透明材質。
    if (engine.falApiKey) {
        if (onProgress) onProgress('智慧去背: 正在保留細節與透明邊緣...');
        return await birefnetRemoveBg(generatedSrc, engine.falApiKey, 'Matting');
    }

    // 無 fal key 時才使用中性背景的本機備援；不再執行有色 despill／二次重繪。
    const background = await detectNeutralBackground(generatedSrc);
    if (onProgress) onProgress(`智慧去背: 使用 ${background.name} 背景備援去背`);
    return processChromaKey(generatedSrc, background.hex);
};
