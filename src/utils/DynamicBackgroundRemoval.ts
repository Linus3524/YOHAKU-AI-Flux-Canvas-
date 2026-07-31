
import { generateOneImage, type ImageEngineConfig } from '../ai/generateImage';
import { birefnetRemoveBg } from './geminiLayer';
import { getClosestAspectRatio } from './helpers';
import { createGeminiClient } from '../ai/geminiClient';
import { triangulationMatte, isMatteTrustworthy } from './triangulationMatting';

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
    GREEN:     { hex: '#00BB44', name: 'MEDIUM GREEN',  rgb: [0, 187, 68] as const },
    BLUE:      { hex: '#2255CC', name: 'MEDIUM BLUE',   rgb: [34, 85, 204] as const },
    RED:       { hex: '#CC2200', name: 'MEDIUM RED',    rgb: [204, 34, 0] as const },
    DARKGRAY:  { hex: '#3A3A3A', name: 'DARK GRAY',     rgb: [58, 58, 58] as const },
    LIGHTGRAY: { hex: '#DADADA', name: 'LIGHT GRAY',    rgb: [218, 218, 218] as const },
} as const;

type BgKey = keyof typeof CONTRAST_BACKGROUNDS;
type ContrastBackground = (typeof CONTRAST_BACKGROUNDS)[BgKey] | { hex: string; name: string; rgb: readonly [number, number, number] };

/**
 * 為有色半透明物件產生「帶色調的淡灰」底色。
 * 原理：用物件主色的淡化版當底色，透過玻璃/薄紗時自然增強原色而非灰化。
 * @param hue 物件主色色相 (0-359)
 * @param isDark 是否為深色半透明（墨鏡等）→ 用較淺的基底
 */
const buildTintedGray = (hue: number, isDark: boolean = false): ContrastBackground => {
    const baseLightness = isDark ? 0.82 : 0.50;
    const saturation = 0.15; // 15% 飽和度，只帶一點色調
    // HSL → RGB 轉換
    const h = ((hue % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * baseLightness - 1)) * saturation;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = baseLightness - c / 2;
    let r1 = 0, g1 = 0, b1 = 0;
    if (h < 60)       { r1 = c; g1 = x; b1 = 0; }
    else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
    else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
    else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
    else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
    else              { r1 = c; g1 = 0; b1 = x; }
    const r = Math.round((r1 + m) * 255);
    const g = Math.round((g1 + m) * 255);
    const b = Math.round((b1 + m) * 255);
    const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    return { hex, name: `TINTED GRAY (hue ${Math.round(hue)}°)`, rgb: [r, g, b] as const };
};

/**
 * Gemini 語意判斷隔離底色（辨識半透明/玻璃/薄紗等本地像素看不出的特例）。
 * 有色半透明物件：用「帶色調的淡灰」（物件主色 15% 飽和度混入淺灰），
 *   讓底色透進物件時增強原色而非灰化，去背後保留原物件透明色調。
 *   - 無色透明（透明玻璃杯、保鮮膜）→ 深灰（無色調可混入）
 *   - 深色半透明（墨鏡、深酒瓶）→ 淺灰
 * 不透明物件：取主色補色（暖色/白→綠、綠→藍、藍/冷→紅、多彩→深灰）。
 */
const analyzeIsolationBackgroundSemantic = async (
    imageSrc: string,
    geminiApiKey: string,
): Promise<ContrastBackground> => {
    const ai = createGeminiClient(geminiApiKey);
    const cleanBase64 = imageSrc.split(',')[1] || imageSrc;
    const mimeType = imageSrc.match(/data:(.*);base64/)?.[1] ?? 'image/png';
    const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: { parts: [
            { inlineData: { mimeType, data: cleanBase64 } },
            { text: `You choose the best solid isolation background color for cutting out the MAIN SUBJECT of this image. The background will be removed by software matting afterwards, so it must maximize contrast against the subject AND must never tint the subject.

Return ONLY JSON:
- Opaque subject: {"background":"GREEN|BLUE|RED|DARKGRAY","translucent":false}
- Translucent subject: {"background":"TINTED_GRAY","translucent":true,"subjectHue":<0-359>,"dark":true|false}
  subjectHue = the dominant color hue of the translucent object itself (blue glass≈220, amber bottle≈30, red glass≈0, green bottle≈120).
  dark = true ONLY for very dark translucent objects (sunglasses, dark wine bottles).
  For COLORLESS transparent (clear glass, plastic wrap, ice) use: {"background":"DARKGRAY","translucent":true}

RULES (in priority order):
1. If the subject is TRANSLUCENT or TRANSPARENT (glass, crystal, ice, plastic bag, sheer/veil fabric, wedding dress, tinted glass, colored translucent plastic): the background shows THROUGH it and mixes into its color.
   - COLORED translucent (blue bottle, amber glass, tinted plastic, colored sheer fabric): return "TINTED_GRAY" with the object's own hue in "subjectHue". We will generate a gray tinted with that hue so the object's color is preserved, not washed out.
   - COLORLESS transparent (clear glass cup, plastic wrap, ice): return "DARKGRAY" — dark gray lets white highlights and refraction show.
   - DARK translucent (sunglasses, deep dark bottle): return "TINTED_GRAY" with "dark":true — we will use a lighter tinted base.
2. Otherwise (opaque subject), pick the complement of its dominant color:
   - "GREEN": warm subjects (skin/red/orange/yellow/pink/brown) OR subjects with white/pale parts (white clothes/hair)
   - "BLUE": green/plant/teal subjects
   - "RED": blue/cyan/cool subjects
   - "DARKGRAY": multicolored subjects containing green+blue+red, or when unsure` },
        ] },
    });
    const text = response.text ?? '';
    const match = text.replace(/```(?:json)?/gi, '').match(/\{[\s\S]*\}/);
    if (!match) return CONTRAST_BACKGROUNDS.GREEN;
    try {
        const parsed = JSON.parse(match[0]);
        const key = (parsed.background as string || '').toUpperCase();
        // 有色半透明 → 用帶色調的淡灰
        if (key === 'TINTED_GRAY' && typeof parsed.subjectHue === 'number') {
            return buildTintedGray(parsed.subjectHue, !!parsed.dark);
        }
        return CONTRAST_BACKGROUNDS[key as BgKey] ?? CONTRAST_BACKGROUNDS.GREEN;
    } catch {
        return CONTRAST_BACKGROUNDS.GREEN;
    }
};

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

// --- 3. Triangulation Matting（三角測量摳像）---

// 框成「抽出主體」：生圖模型對 "main subject" 的訓練訊號很強，
// 語意上比「背景」明確（有景深的照片裡「背景」到哪為止其實很模糊）。
// 曾試過改框成「只換背景」，實測後保留此版本。
const WHITE_PLATE_PROMPT = `
Place the main subject from the supplied image on a PURE WHITE background (#FFFFFF, RGB 255,255,255).
Absolute requirements:
1. Keep the subject EXACTLY as it is — do NOT restyle, re-light, re-pose, resize, or redraw it. Same identity, proportions, color, texture.
2. The background must be 100% pure white, perfectly flat: no gradient, no vignette, no texture, no scenery.
3. NO shadow, reflection, or glow cast onto the background.
4. Preserve every fine edge: individual hair strands, fur, fabric fibres, translucent glass, smoke, motion blur.
5. Keep the original framing, scale, position and aspect ratio.
This is a matting plate for software compositing, not a creative edit.
`;

const BLACK_PLATE_PROMPT = `
Change ONLY the background color from white to PURE BLACK (#000000, RGB 0,0,0).
Absolute requirements:
1. Do NOT move, resize, re-pose, re-light, or redraw the subject in ANY way.
2. Every foreground pixel must stay identical to the input — same position, same colors, same brightness, same detail.
3. The background must be 100% pure black, perfectly flat: no gradient, no vignette, no glow.
4. Do NOT add any shadow or reflection cast onto the background.
5. Keep the exact same image dimensions, framing and scale.
This is a background-plate swap for a matting pipeline, not a creative edit.
`;

/**
 * Triangulation Matting 去背。
 *
 * 白底版 + 黑底版兩張圖，用合成方程式反解出「連續」alpha：
 *   W = α·F + 255(1-α)，K = α·F  ⇒  α = 1 - (W-K)/255，F = K/α
 *
 * 相對 chroma key 的優勢：髮絲/玻璃/煙霧有真正的中間調而非 0/255 硬切，
 * 且白黑皆為無彩色 → 完全不需要 despill，不會誤殺綠色/藍色主體。
 *
 * 代價：生圖要打兩次（2× 成本）。失敗時丟出例外，由呼叫端退回既有管線。
 */
export const executeTriangulationRemoval = async (
    imageSrc: string,
    engine: DynamicRemovalEngine,
    onProgress?: (msg: string) => void,
    /**
     * 來源本身已是合格白底版時傳 true，直接跳過第一次生成（2 次變 1 次）。
     * 呼叫端必須先用 isCleanWhitePlate() 驗證過才可以開。
     */
    srcIsWhitePlate = false,
): Promise<string> => {
    const aspectRatio = await detectAspectRatio(imageSrc);

    let whitePlate: string;
    if (srcIsWhitePlate) {
        whitePlate = imageSrc;
        if (onProgress) onProgress('智慧去背: 沿用現有白底版...');
    } else {
        if (onProgress) onProgress('智慧去背: 生成白底版...');
        whitePlate = await generateOneImage(
            { prompt: WHITE_PLATE_PROMPT, aspectRatio, refImage: imageSrc },
            engine,
        );
        if (!whitePlate) throw new Error('白底版沒有回傳圖片');
    }

    // 關鍵：黑底版是「編輯白底版」而非重新生成原圖，
    // 前景才會 pixel-aligned，三角測量的數學才成立。
    if (onProgress) onProgress('智慧去背: 生成黑底版...');
    const blackPlate = await generateOneImage(
        { prompt: BLACK_PLATE_PROMPT, aspectRatio, refImage: whitePlate },
        engine,
    );
    if (!blackPlate) throw new Error('黑底版沒有回傳圖片');

    if (onProgress) onProgress('智慧去背: 解算透明度...');
    const { src, stats } = await triangulationMatte(whitePlate, blackPlate);

    const trust = isMatteTrustworthy(stats);
    console.log('[Triangulation] stats:', stats, 'trust:', trust);
    if (!trust.ok) throw new Error(`Triangulation matte 不可信：${trust.reason}`);

    if (onProgress) onProgress(`智慧去背: 完成（軟邊 ${(stats.softRatio * 100).toFixed(1)}%）`);
    return src;
};

// --- 4. Main Handler Logic ---
export type RemovalMode = 'triangulation' | 'isolation';

/**
 * 智慧去背入口。
 * 預設走 triangulation matting；失敗時自動退回既有的「對比底色 + BiRefNet」管線。
 */
export const executeDynamicRemoval = async (
    imageSrc: string,
    engine: DynamicRemovalEngine,
    onProgress?: (msg: string) => void,
    mode: RemovalMode = 'triangulation',
    /** 來源已是驗證過的白底版時傳 true，三角測量可省掉第一次生成 */
    srcIsWhitePlate = false,
): Promise<string> => {
    if (mode === 'triangulation') {
        try {
            return await executeTriangulationRemoval(imageSrc, engine, onProgress, srcIsWhitePlate);
        } catch (e) {
            console.warn('[智慧去背] Triangulation 失敗，退回對比底色管線', e);
            if (onProgress) onProgress('智慧去背: 改用備用方案...');
        }
    }
    return executeIsolationRemoval(imageSrc, engine, onProgress);
};

/** 既有管線：語意選對比底色 → 生圖隔離 → BiRefNet Matting（無 fal key 則 chroma key）。 */
export const executeIsolationRemoval = async (imageSrc: string, engine: DynamicRemovalEngine, onProgress?: (msg: string) => void): Promise<string> => {
    if (engine.model !== 'gemini' && !engine.atlasApiKey) {
        throw new Error('請先設定 Atlas Cloud Key 才能使用目前選擇的模型進行智慧去背');
    }
    if (engine.model === 'gemini' && !engine.geminiApiKey) {
        throw new Error('請先設定 Gemini API Key 才能使用智慧去背');
    }

    if (onProgress) onProgress(`智慧去背: 使用目前選擇的 ${engine.model === 'gemini' ? 'Gemini' : engine.model === 'gpt-image-2' ? 'GPT Image 2' : '即夢 Pro'} 模型隔離主體`);

    // 1. 判斷隔離底色。有 Gemini key 時用語意分析（能辨識玻璃/薄紗等半透明特例，
    //    避免有色半透明被補色永久污染）；否則退回本地像素分析。
    let background: ContrastBackground;
    if (engine.geminiApiKey) {
        try {
            background = await analyzeIsolationBackgroundSemantic(imageSrc, engine.geminiApiKey);
        } catch {
            background = await analyzeContrastBackground(imageSrc);
        }
    } else {
        background = await analyzeContrastBackground(imageSrc);
    }
    if (onProgress) onProgress(`智慧去背: 分析完成，選用 ${background.name} 隔離底色`);

    const isTranslucent = background.name.startsWith('TINTED GRAY');
    const prompt1 = `
    Isolate the main subject from the supplied image without changing its identity, pose, proportions, color, texture, lighting, or composition.
    Place it on exactly one perfectly flat solid background color: ${background.name} (hex ${background.hex}, RGB ${background.rgb.join(',')}).
    The background must be perfectly uniform — no gradients, checkerboards, scenery, shadows, or patterns.
    Do NOT let the background color tint, reflect on, or bleed into the subject's edges.
    Preserve every fine edge, including white hair, white fabric, translucent glass, and pale details. Keep the subject at the original scale and position.
    This is an isolation source for software matting, not a transparent PNG request.
    ${isTranslucent ? `CRITICAL for this translucent/glass/sheer subject: keep the subject's own coloration and internal transparency VIVID and INTACT. The colored transparency (e.g. the blue tint of blue glass, the amber hue of an amber bottle) must remain as saturated and vibrant as in the original image. Do NOT desaturate, gray-out, or neutralize the colored transparent areas. The background color (${background.hex}) is intentionally tinted to match the subject — let it show through the transparent parts naturally.` : ''}
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
