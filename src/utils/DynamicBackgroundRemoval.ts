
import { GoogleGenAI } from "@google/genai";

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

// --- 1. Step 0: Analyze Dominant Hue (HSL) ---
export const analyzeDominantHue = (imageSrc: string): Promise<{ hex: string, name: string }> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const size = 100; canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve({ hex: '#00FF00', name: 'GREEN' }); return; }
            
            ctx.drawImage(img, 0, 0, size, size);
            const data = ctx.getImageData(0, 0, size, size).data;
            
            let hueSum = 0, hueCount = 0;
            for (let i = 0; i < data.length; i += 16) {
                const r = data[i] / 255, g = data[i+1] / 255, b = data[i+2] / 255;
                const a = data[i+3];
                if (a < 50) continue;
                const max = Math.max(r,g,b), min = Math.min(r,g,b);
                const s = max - min;
                if (s < 0.15) continue; // 跳過灰色/白色/黑色像素
                let h = 0;
                if (max === r) h = ((g - b) / s) % 6;
                else if (max === g) h = (b - r) / s + 2;
                else h = (r - g) / s + 4;
                hueSum += ((h * 60) + 360) % 360;
                hueCount++;
            }
            
            if (hueCount === 0) return resolve({ hex: '#00FF00', name: 'GREEN' });
            
            const avgHue = hueSum / hueCount;
            const complementHue = (avgHue + 180) % 360;
            
            // 分類成最接近的純色（方便 chroma key 計算）
            let name = 'GREEN'; let hex = '#00FF00';
            if (complementHue >= 300 || complementHue < 60) { name = 'RED'; hex = '#FF0000'; }
            else if (complementHue >= 60 && complementHue < 180) { name = 'GREEN'; hex = '#00FF00'; }
            else { name = 'BLUE'; hex = '#0000FF'; }
            
            resolve({ hex, name });
        };
        img.onerror = () => resolve({ hex: '#00FF00', name: 'GREEN' });
        img.src = imageSrc;
    });
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
            
            const isGreenTarget = targetG > 200 && targetR < 50 && targetB < 50;
            const isBlueTarget = targetB > 200 && targetR < 50 && targetG < 50;
            const keyThreshold = calculateDynamicThreshold(data, targetR, targetG, targetB); 

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const distance = Math.sqrt((r-targetR)**2 + (g-targetG)**2 + (b-targetB)**2);

                if (distance < keyThreshold) {
                    data[i + 3] = 0; // Alpha 0
                } else {
                    // Despill Logic
                    if (isGreenTarget) {
                        if (g > r && g > b) data[i + 1] = (r + b) / 2; 
                    } else if (isBlueTarget) {
                        if (b > r && b > g) data[i + 2] = (r + g) / 2; 
                    } else { // Magenta
                        if (r > g && b > g) { data[i] = g; data[i + 2] = g; }
                    }
                }
            }
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(imageSrc);
        img.src = imageSrc;
    });
};

// Helper: Restore Alpha Channel
const restoreOriginalAlpha = async (alphaSrc: string, colorSrc: string): Promise<string> => {
    try {
        const [alphaImg, colorImg] = await Promise.all([loadImage(alphaSrc), loadImage(colorSrc)]);
        const canvas = document.createElement('canvas');
        canvas.width = alphaImg.width;
        canvas.height = alphaImg.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return alphaSrc;

        // Draw color image (which might have lost alpha or be on white background)
        ctx.drawImage(colorImg, 0, 0, canvas.width, canvas.height);
        
        // Use destination-in to keep only the pixels where alphaSrc has opacity
        // This effectively copies the alpha channel from alphaSrc to colorSrc
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(alphaImg, 0, 0, canvas.width, canvas.height);
        
        return canvas.toDataURL('image/png');
    } catch (e) {
        console.error("Restore alpha failed", e);
        return alphaSrc;
    }
};

// Helper: Fringe Detection
const hasFringe = async (src: string, targetHex: string): Promise<boolean> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(true); return; }
            
            ctx.drawImage(img, 0, 0);
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            
            const targetR = parseInt(targetHex.slice(1, 3), 16);
            const targetG = parseInt(targetHex.slice(3, 5), 16);
            const targetB = parseInt(targetHex.slice(5, 7), 16);
            
            let fringePixels = 0;
            let edgePixels = 0;

            for (let i = 0; i < data.length; i += 16) { // Sample pixels
                const a = data[i + 3];
                // Check semi-transparent edge pixels
                if (a > 10 && a < 240) {
                    edgePixels++;
                    const r = data[i], g = data[i + 1], b = data[i + 2];
                    const dist = Math.sqrt((r-targetR)**2 + (g-targetG)**2 + (b-targetB)**2);
                    // If edge pixel color is too close to background color, it's a fringe
                    if (dist < 100) {
                        fringePixels++;
                    }
                }
            }
            
            // If more than 10% of edge pixels have fringe, trigger repair
            resolve(edgePixels > 0 && (fringePixels / edgePixels) > 0.1);
        };
        img.onerror = () => resolve(true); // Default to true on error to be safe
        img.src = src;
    });
};

// --- 3. Main Handler Logic ---
export const executeDynamicRemoval = async (imageSrc: string, genAI: GoogleGenAI, onProgress?: (msg: string) => void): Promise<string> => {
    // 1. Analyze Color
    const { hex, name } = await analyzeDominantHue(imageSrc);
    if(onProgress) onProgress(`智慧去背: 分析完成，選用 ${name} 背景`);

    // 2. AI Generate on Solid Background
    const prompt1 = `
    Isolate the main subject and place it on a PURE ${name} background (hex: ${hex}).
    Critical requirements:
    1. The background must be 100% pure ${name} with NO variation.
    2. Subject edges must be PIXEL-PERFECT — especially hair, fur, and transparent objects.
    3. NO color fringing or edge glow on the subject boundary.
    4. NO shadows cast onto the background.
    5. Lighting on subject should be neutral and even.
    The goal is to create a perfect chroma key source image.
    `;

    const [header, data] = imageSrc.split(',');
    const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
    
    let generatedSrc = imageSrc;
    
    try {
        if(onProgress) onProgress(`智慧去背: ${name} 隔離生成...`);
        const response = await genAI.models.generateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: {
                parts: [
                    { inlineData: { data, mimeType } },
                    { text: prompt1 }
                ]
            }
        });
        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (part?.inlineData) {
            generatedSrc = `data:image/png;base64,${part.inlineData.data}`;
        } else {
            throw new Error("AI did not generate image");
        }
    } catch (e) {
        console.error("AI Generation Step 1 Failed", e);
        throw e;
    }

    // 3. Process Chroma Key
    const processedSrc = await processChromaKey(generatedSrc, hex);

    // 4. Edge Repair (Optional / Recommended)
    const needsRepair = await hasFringe(processedSrc, hex);
    
    if (needsRepair) {
        if(onProgress) onProgress(`智慧去背: 偵測到邊緣溢色，進行光影修復...`);
        
        try {
            const [h2, d2] = processedSrc.split(',');
            const m2 = h2.match(/data:(.*);base64/)?.[1] || 'image/png';
            const prompt2 = `Redraw the subject's edges to restore their natural colors. Remove any ${name} color cast or halos. Keep the subject on a white background. Keep lighting strictly NEUTRAL.`;
            
            const response2 = await genAI.models.generateContent({
                model: 'gemini-3.1-flash-image-preview',
                contents: {
                    parts: [
                        { inlineData: { data: d2, mimeType: m2 } },
                        { text: prompt2 }
                    ]
                }
            });
            const part2 = response2.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (part2?.inlineData) {
                const repairedSrc = `data:image/png;base64,${part2.inlineData.data}`;
                // Synthesis: Step 3 Alpha + Step 4 RGB
                return await restoreOriginalAlpha(processedSrc, repairedSrc);
            }
        } catch (e) {
            console.warn("Edge repair failed or skipped, returning keyed image", e);
        }
    } else {
        if(onProgress) onProgress(`智慧去背: 邊緣完美，跳過修復步驟`);
    }
    
    return processedSrc;
};
