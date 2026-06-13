
import React, { useState, useCallback, useRef } from 'react';
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import type { CanvasElement, ImageElement, NoteElement, TextElement, FrameElement, ShapeElement, DrawingElement, OutpaintingState } from '../types';
import {
    callGeminiWithRetry,
    loadImage,
    restoreOriginalAlpha,
    createShapeDataUrl,
    hasTransparency,
    getClosestAspectRatio,
    STYLE_PRESETS,
    calculateImageDifference,
    detectIfIllustration,
    checkCompositionSimilarity,
    processChromaKey
} from '../utils/helpers';
import { executeDynamicRemoval } from '../utils/DynamicBackgroundRemoval';
import { callAtlasGenerate, callAtlasImg2Img, callAtlasInpaint, atlasModelSupportsImg2Img, downloadImageAsBase64, type AtlasGenerationModel } from '../utils/atlasImage';
import { birefnetRemoveBg } from '../utils/geminiLayer';

interface UseAIProps {
    elements: CanvasElement[];
    setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>;
    selectedElementIds: string[];
    showToast: (msg: string) => void;
    setHasApiKey: (isValid: boolean) => void;
    apiKey?: string | null;
    imageModel?: string;
    atlasApiKey?: string | null;
    generationModel?: string;

    falApiKey?: string | null;
}

/** 根據主體主色調選最佳 Chroma Key 底色 */
function findBestChromaColor(base64: string): Promise<string> {
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
function flattenTransparentImage(base64: string, bgColor: string): Promise<string> {
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

/** 根據便利貼 prompt 關鍵字判斷是否需要透明背景（僅 GPT Image 2 支援） */
// 剝掉風格提示詞的「主動改造」前綴，讓它變成純描述語氣
// 例："Transform into Cyberpunk aesthetic: neon..." → "Cyberpunk aesthetic: neon..."
//     "將圖片轉換為1980年代台灣..."           → "1980年代台灣..."
function stripStyleVerb(prompt: string): string {
    return prompt
        .replace(/^Transform\s+(this\s+image\s+)?into\s+/i, '')
        .replace(/^將圖片轉換為/, '');
}

// 組合使用者需求 + 參考風格，主次分明
function buildStyledPrompt(userContent: string, stylePrompt: string, fallbackLabel: string): string {
    const styleDesc = stripStyleVerb(stylePrompt);
    if (userContent) {
        return `Primary request: ${userContent}\nVisual style (secondary, do not override primary subject): ${styleDesc}`;
    }
    return styleDesc || `${fallbackLabel} style`;
}

function detectTransparentBgIntent(prompt: string): boolean {
    const lower = prompt.toLowerCase();
    const keywords = [
        '透明背景', 'transparent background', 'transparent bg',
        'no background', 'no-background', 'without background',
        'remove background', '去背', '無背景', '背景透明',
        'sticker', '貼圖', '貼紙', 'isolated', 'cutout', 'png transparent',
    ];
    return keywords.some(kw => lower.includes(kw));
}

export const useAI = ({ elements, setElements, selectedElementIds, showToast, setHasApiKey, apiKey, imageModel = 'gemini-3.1-flash-image-preview', atlasApiKey, generationModel = 'gemini', falApiKey }: UseAIProps) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatingElementIds, setGeneratingElementIds] = useState<string[]>([]);
    const [generatedImages, setGeneratedImages] = useState<string[] | null>(null);
    const [outpaintingState, setOutpaintingState] = useState<OutpaintingState | null>(null);
    const [copiedStyle, setCopiedStyle] = useState<{ analysis: import('../components/StylePasteModal').StyleAnalysisResult } | null>(null);
    const [imageStyle, setImageStyle] = useState<string>('Default');
    const [imageAspectRatio, setImageAspectRatio] = useState<string>('Original');
    const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
    const [preserveTransparency, setPreserveTransparency] = useState(true);
    // 只有 gpt-image-2 支援 background: transparent
    // preserveTransparency 改用 post-process 處理，不再透過 API 參數觸發
    // 根據 prompt 關鍵字自動偵測透明背景需求（僅 GPT Image 2）
    const isGpt2 = generationModel === 'gpt-image-2';
    const getTransparentBg = (prompt: string) => isGpt2 && detectTransparentBgIntent(prompt);
    const [showStyleLibrary, setShowStyleLibrary] = useState(false);
    const zIndexCounter = useRef(Math.max(0, ...elements.map(e => e.zIndex)) + 1);

    /**
     * 包住 Atlas 長時間請求：每 30 秒跳一次提示 toast，避免用戶誤以為卡死
     * 有參考圖的算圖可能需要 3-8 分鐘，前端最多等 10 分鐘
     */
    const withAtlasWaitToast = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
        let elapsed = 0;
        const INTERVAL = 90000; // 每 1.5 分鐘提示一次
        const msgs = [
            '⏳ Atlas 生成中，請稍候...',
            '🖼️ 參考圖較多，Atlas 仍在處理中，請耐心等候...',
            '⏳ 還在算圖中，沒有斷線，請繼續等待...',
            '🎨 Atlas 快完成了，請再等一下...',
            '⏳ 仍在生成中，Atlas 後台已收到任務...',
            '🌐 遠端生成中，網路正常，請繼續等候...',
        ];
        const timer = setInterval(() => {
            elapsed += INTERVAL;
            const idx = Math.floor(elapsed / INTERVAL) - 1;
            showToast(msgs[Math.min(idx, msgs.length - 1)]);
        }, INTERVAL);
        try {
            return await fn();
        } finally {
            clearInterval(timer);
        }
    }, [showToast]);

    /** 生成前準備：若來源有透明且開啟 preserveTransparency → 壓平並記錄底色 */
    const prepareForGeneration = useCallback(async (src: string): Promise<{
        src: string; hadTransparency: boolean; bgColor: string;
    }> => {
        if (!preserveTransparency) return { src, hadTransparency: false, bgColor: '#FFFFFF' };
        const transparent = await hasTransparency(src);
        if (!transparent) return { src, hadTransparency: false, bgColor: '#FFFFFF' };
        const bgColor = await findBestChromaColor(src);
        const flatSrc = await flattenTransparentImage(src, bgColor);
        return { src: flatSrc, hadTransparency: true, bgColor };
    }, [preserveTransparency]);

    /** 生成後還原透明背景
     *  優先順序：1) BiRefNet（fal key）→ 2) Gemini AI 去背（executeDynamicRemoval）→ 3) Chroma Key（基本備用）
     */
    const restoreTransparencyFn = useCallback(async (resultSrc: string, bgColor: string): Promise<string> => {
        // 1. BiRefNet（品質最佳）
        if (falApiKey) {
            try {
                return await birefnetRemoveBg(resultSrc, falApiKey);
            } catch (e) {
                console.warn('[restoreTransparency] BiRefNet failed, trying Gemini...', e);
            }
        }
        // 2. Gemini AI 去背（無 fal key 時）
        if (apiKey) {
            try {
                const genAI = new GoogleGenAI({ apiKey });
                return await executeDynamicRemoval(resultSrc, genAI, undefined, imageModel);
            } catch (e) {
                console.warn('[restoreTransparency] Gemini removal failed, fallback chroma key', e);
            }
        }
        // 3. Chroma Key（最後備用）
        return processChromaKey(resultSrc, bgColor);
    }, [falApiKey, apiKey, imageModel]);

    // Helper to create client or throw error immediately
    const createAiClient = () => {
        if (!apiKey) {
            // Note: We do NOT setHasApiKey(false) here to avoid render-phase side effects.
            // The error will be caught by handlers below.
            throw new Error("MISSING_API_KEY");
        }
        return new GoogleGenAI({ apiKey: apiKey });
    };

    // Centralized error handler for AI calls
    const handleAIError = (error: any, contextMsg: string) => {
        console.error(`${contextMsg}:`, error);
        
        const errorMsg = (error.message || "").toLowerCase();
        const status = error.status || error.code || 0;

        // 1. API Key 完全無效（格式錯誤或不存在）
        const isInvalidKey = 
            errorMsg === "missing_api_key" || 
            errorMsg.includes("api key not valid") ||
            errorMsg.includes("api_key_invalid") ||
            errorMsg.includes("invalid api key");

        // 2. 有 Key 但沒有權限（未在 GCP 啟用該 API）
        const isNoPermission =
            (status === 403 || errorMsg.includes("403")) &&
            (errorMsg.includes("permission_denied") || errorMsg.includes("forbidden"));

        // 3. 帳單未啟用
        const isBillingIssue =
            errorMsg.includes("billing") ||
            errorMsg.includes("payment");

        // 4. 配額用完（每分鐘 or 每日上限）
        const isQuotaExceeded =
            status === 429 ||
            errorMsg.includes("429") ||
            errorMsg.includes("quota") ||
            errorMsg.includes("resource_exhausted") ||
            errorMsg.includes("rate limit") ||
            errorMsg.includes("too many requests");

        // 5. 伺服器過載（非你的問題，稍後重試即可）
        const isOverloaded =
            status === 503 ||
            errorMsg.includes("503") ||
            errorMsg.includes("overloaded") ||
            errorMsg.includes("service unavailable");

        // 6. 模型名稱錯誤
        const isModelNotFound =
            status === 404 ||
            errorMsg.includes("404") ||
            errorMsg.includes("not found") ||
            errorMsg.includes("model");

        if (isInvalidKey) {
            setHasApiKey(false);
            showToast("🔑 API Key 無效或格式錯誤，請重新輸入。");
        } else if (isNoPermission) {
            showToast("🚫 權限不足：請到 Google Cloud Console 啟用 Gemini API。");
        } else if (isBillingIssue) {
            showToast("💳 帳單未啟用：請確認您的 GCP 專案已開啟計費功能。");
        } else if (isQuotaExceeded) {
            showToast("⏰ 配額已用完：今日 API 使用量已達上限，請明天再試或升級方案。");
        } else if (isOverloaded) {
            showToast("⏳ Gemini 伺服器暫時過載，已自動重試 3 次仍失敗，請稍後 1-2 分鐘再試。");
        } else if (isModelNotFound) {
            showToast("❌ 模型不存在或名稱錯誤，請確認模型版本。");
        } else {
            showToast(`${contextMsg}失敗：${error.message?.slice(0, 60) || "未知錯誤"}`);
        }
    };

    const handleAskAI = useCallback(async (userPrompt: string): Promise<string> => {
        try {
            const genAI = createAiClient();
            const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                model: 'gemini-3.1-flash-lite',
                contents: { parts: [{ text: userPrompt }] },
                config: {
                    systemInstruction: `You are a professional Creative Director and Prompt Engineer.
User input is a vague idea. You must output **ONLY** the concrete, high-quality prompt for AI image generation.
**Rules:**
1. Do NOT chat. Do NOT say 'Here is a suggestion'.
2. Output format: A single paragraph of descriptive visual keywords.
3. If user speaks Chinese keep it in rich, descriptive Chinese based on user language.
4. Keep it concise but detailed.`,
                }
            }));

            return response.text ? response.text.trim() : "抱歉，我現在無法思考。";
        } catch (error: any) {
            handleAIError(error, "AI 助手");
            return "請先設定 API Key 才能使用此功能。";
        }
    }, [apiKey, setHasApiKey, showToast]);

    const handleCopyStyle = useCallback(async (elementId: string) => {
        const element = elements.find(el => el.id === elementId);
        if (!element || element.type !== 'image') return;

        setIsGenerating(true);
        setGeneratingElementIds([elementId]); // Show badge on source image during analysis
        showToast("正在全面分析圖片風格...");

        try {
            const genAI = createAiClient();
            const [header, data] = element.src.split(',');
            const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
            const imagePart = { inlineData: { data, mimeType } };

            const prompt = `Analyze this image comprehensively across all visual dimensions. Return ONLY a raw JSON object (no markdown, no code block) with exactly these keys:
{
  "color": "2-3 sentences about color tone and palette (dominant colors, temperature, saturation)",
  "lighting": "2-3 sentences about lighting quality (light source, direction, shadows, contrast)",
  "artStyle": "2-3 sentences about art style and medium (illustration style, brushwork, rendering technique)",
  "composition": "2-3 sentences about composition and camera angle (framing, perspective, focal point)",
  "texture": "2-3 sentences about surface texture and detail quality (material feel, finish, detail level)",
  "pose": "2-3 sentences about character pose and action. Write 'Not applicable' if no character present.",
  "expression": "2-3 sentences about facial expression and emotion. Write 'Not applicable' if no face present.",
  "clothing": "2-3 sentences about clothing and outfit style. Write 'Not applicable' if no character present.",
  "background": "2-3 sentences about background environment (setting, depth, atmosphere)",
  "hair": "2-3 sentences about hairstyle design. Write 'Not applicable' if no character present.",
  "typography": "2-3 sentences about text or font style visible in the image. Write 'Not applicable' if no text present."
}`;

            const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                model: 'gemini-3.1-flash-lite',
                contents: { parts: [imagePart, { text: prompt }] },
                config: { responseMimeType: 'application/json' },
            }));

            const rawText = response.text?.trim() || '{}';
            const analysis = JSON.parse(rawText);
            setCopiedStyle({ analysis });
            showToast("✅ 風格已複製！右鍵選「貼上風格」套用。");

        } catch (error: any) {
            handleAIError(error, "風格分析");
        } finally {
            setIsGenerating(false);
            setGeneratingElementIds([]);
        }
    }, [elements, showToast, apiKey, setHasApiKey]);

    const handleApplyStyle = useCallback(async (targetElementIds: string[], selectedKeys: string[]) => {
        if (!copiedStyle?.analysis) {
            showToast("沒有複製的風格！請先右鍵「複製風格」。");
            return;
        }
        const targetElements = elements.filter(el => targetElementIds.includes(el.id) && el.type === 'image') as ImageElement[];
        if (targetElements.length === 0) return;

        setGeneratingElementIds(targetElements.map(el => el.id));
        setIsGenerating(true);
        showToast(`正在應用風格...`);

        const keyLabels: Record<string, string> = {
            color: '色調/配色 (Color Palette)',
            lighting: '光影/打光 (Lighting)',
            artStyle: '畫風/藝術風格 (Art Style)',
            composition: '視角/構圖 (Composition & Camera Angle)',
            texture: '色彩細節/紋理 (Texture & Detail)',
            pose: '人物姿勢/動作 (Pose & Action)',
            expression: '面部表情/情緒 (Facial Expression)',
            clothing: '服裝/穿著 (Clothing)',
            background: '背景環境 (Background)',
            hair: '髮型設計 (Hairstyle)',
            typography: '字體風格 (Typography)',
        };

        const analysis = copiedStyle.analysis as Record<string, string>;
        const selectedParts = selectedKeys
            .filter(k => analysis[k] && analysis[k].trim() !== '' && !analysis[k].toLowerCase().includes('not applicable'))
            .map(k => `${keyLabels[k]}: ${analysis[k]}`);

        if (selectedParts.length === 0) {
            // 所有欄位均不適用時，改用全部有值的欄位作 fallback，不直接失敗
            const fallbackParts = selectedKeys
                .filter(k => analysis[k] && analysis[k].trim() !== '')
                .map(k => `${keyLabels[k]}: ${analysis[k]}`);
            if (fallbackParts.length === 0) {
                showToast("所選元素在原圖中均不適用，請重新選擇。");
                setGeneratingElementIds([]);
                setIsGenerating(false);
                return;
            }
            selectedParts.push(...fallbackParts);
        }

        const styleDescription = selectedParts.join('\n');

        const basePrompt = `Apply a style transfer to this image based on the following specific elements. Only transform what is listed — anything not mentioned should remain as close to the original as possible.

STYLE ELEMENTS TO APPLY:
${styleDescription}

ALWAYS PRESERVE:
- Subject identity (the main subject must remain recognizable)
- Overall composition and spatial relationships between elements`;

        try {
            const genAI = createAiClient();
            for (const element of targetElements) {
                try {
                    const { src: flatSrc, hadTransparency, bgColor } = await prepareForGeneration(element.src);
                    const [header, data] = flatSrc.split(',');
                    const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
                    const imagePart = { inlineData: { data, mimeType } };

                    const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                        model: imageModel,
                        contents: { parts: [imagePart, { text: basePrompt }] },
                    }));

                    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                    if (part?.inlineData) {
                        const generatedSrc = `data:image/png;base64,${part.inlineData.data}`;
                        let finalSrc = generatedSrc;

                        if (hadTransparency) {
                            try {
                                finalSrc = await restoreTransparencyFn(finalSrc, bgColor);
                            } catch (e) {
                                console.warn("Failed to restore transparency:", e);
                            }
                        }

                        // 結果放在原圖右側 30px
                        setElements(prev => [...prev, {
                            ...element,
                            id: `${element.id}_style_${Date.now()}`,
                            src: finalSrc,
                            position: { x: element.position.x + element.width / 2 + 30 + element.width / 2, y: element.position.y },
                            name: `${element.name || '圖片'} 風格`,
                            zIndex: Math.max(...prev.map(e => e.zIndex)) + 1,
                        } as ImageElement]);
                    }
                } catch (err: any) {
                    throw err;
                }
            }
            showToast("風格應用完成！✨");
        } catch (error) {
            handleAIError(error, "風格應用");
        } finally {
            setGeneratingElementIds([]);
            setIsGenerating(false);
        }
    }, [copiedStyle, elements, setElements, preserveTransparency, showToast, setHasApiKey, apiKey, prepareForGeneration, restoreTransparencyFn]);

    // handlePasteStyle: 僅供 Style Library 預設風格使用（styleOverride 一定存在）
    // 優先順序：非 Gemini 模型且有 Atlas key → Atlas img2img；否則 → Gemini
    const handlePasteStyle = useCallback(async (targetElementIds: string[], styleOverride?: string) => {
        const styleToApply = styleOverride;

        if (!styleToApply) {
            showToast("沒有指定風格！");
            return;
        }

        const targetElements = elements.filter(el => targetElementIds.includes(el.id) && el.type === 'image') as ImageElement[];
        if (targetElements.length === 0) return;

        setGeneratingElementIds(targetElements.map(el => el.id));
        setIsGenerating(true);
        showToast(`正在應用預設風格...`);
        setShowStyleLibrary(false);

        // 判斷走 Atlas 還是 Gemini
        const useAtlas = generationModel !== 'gemini' && !!atlasApiKey && atlasModelSupportsImg2Img(generationModel as AtlasGenerationModel);

        try {
            if (useAtlas) {
                // ── Atlas img2img 風格套用 ──────────────────────────────
                const atlasModel = generationModel as AtlasGenerationModel;
                const presetMatch = STYLE_PRESETS.find(s => s.label === styleToApply || s.name === styleToApply);
                const stylePrompt = presetMatch?.prompt
                    ? `${presetMatch.prompt} Maintain the original composition and subject placement.`
                    : `Transform this image into the following style: "${styleToApply}". Maintain the original composition.`;

                for (const element of targetElements) {
                    try {
                        const { src: flatSrc, hadTransparency, bgColor } = await prepareForGeneration(element.src);
                        let refImage = flatSrc;
                        if (!refImage.startsWith('data:')) {
                            refImage = await downloadImageAsBase64(refImage);
                        }
                        const images = await withAtlasWaitToast(() => callAtlasImg2Img(stylePrompt, atlasModel, atlasApiKey, refImage, 1, { ratio: '1:1', quality: imageSize === '4K' ? '4K' : '2K' }));
                        if (images.length > 0) {
                            let finalSrc = images[0];
                            if (hadTransparency) {
                                try {
                                    finalSrc = await restoreTransparencyFn(finalSrc, bgColor);
                                } catch (e) {
                                    console.warn("Failed to restore transparency (Atlas style):", e);
                                }
                            }
                            // Atlas 風格結果放在原圖右側 30px
                            setElements(prev => [...prev, {
                                ...element,
                                id: `${element.id}_style_${Date.now()}`,
                                src: finalSrc,
                                position: { x: element.position.x + element.width / 2 + 30 + element.width / 2, y: element.position.y },
                                name: `${element.name || '圖片'} 風格`,
                                zIndex: Math.max(...prev.map(e => e.zIndex)) + 1,
                            } as ImageElement]);
                        }
                    } catch (err: any) {
                        throw err;
                    }
                }
            } else {
                // ── Gemini img2img 風格套用（原有邏輯）─────────────────
                const genAI = createAiClient();

                for (const element of targetElements) {
                    try {
                        const { src: flatSrc, hadTransparency, bgColor } = await prepareForGeneration(element.src);
                        const [header, data] = flatSrc.split(',');
                        const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
                        const imagePart = { inlineData: { data, mimeType } };

                        const presetMatch = STYLE_PRESETS.find(s => s.label === styleToApply || s.name === styleToApply);
                        const prompt = presetMatch?.prompt
                            ? `${presetMatch.prompt} Maintain the original composition and subject placement.`
                            : `Transform this image into the following style: "${styleToApply}". Maintain the original composition.`;

                        const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                            model: imageModel,
                            contents: { parts: [imagePart, { text: prompt }] },
                        }));

                        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                        if (part?.inlineData) {
                            const generatedSrc = `data:image/png;base64,${part.inlineData.data}`;
                            let finalSrc = generatedSrc;

                            if (hadTransparency) {
                                try {
                                    finalSrc = await restoreTransparencyFn(finalSrc, bgColor);
                                } catch (e) {
                                    console.warn("Failed to restore transparency for style transfer:", e);
                                }
                            }

                            // Gemini 風格結果放在原圖右側 30px
                            setElements(prev => [...prev, {
                                ...element,
                                id: `${element.id}_style_${Date.now()}`,
                                src: finalSrc,
                                position: { x: element.position.x + element.width / 2 + 30 + element.width / 2, y: element.position.y },
                                name: `${element.name || '圖片'} 風格`,
                                zIndex: Math.max(...prev.map(e => e.zIndex)) + 1,
                            } as ImageElement]);
                        }
                    } catch (err: any) {
                        throw err;
                    }
                }
            }
            showToast("風格應用完成！✨");

        } catch (error) {
            handleAIError(error, "風格應用");
        } finally {
            setGeneratingElementIds([]);
            setIsGenerating(false);
        }
    }, [copiedStyle, elements, setElements, preserveTransparency, showToast, setHasApiKey, apiKey, generationModel, atlasApiKey, imageSize, prepareForGeneration, restoreTransparencyFn]);

    const handleCameraAngle = useCallback(async (anglePrompt: string) => {
        const targetElements = elements.filter(el => selectedElementIds.includes(el.id) && el.type === 'image') as ImageElement[];
        if (targetElements.length === 0) return;

        setGeneratingElementIds([targetElements[0].id]);
        setIsGenerating(true);
        showToast(`正在轉換視角...`);

        // 視角 prompt（單次生成，不再做 diff 重試）
        const buildAnglePrompt = (targetPrompt: string, isIllustration: boolean): string => {
            const base = `
You are a 3D rendering expert. Re-render this subject from a completely new camera angle.

CURRENT VIEW: Assume the original image is a standard front/eye-level shot.
TARGET VIEW: ${targetPrompt}

STRICT RULES:
1. DRAMATICALLY change the perspective and camera position — do NOT produce a result that looks similar to the input.
2. Maintain the EXACT same subject identity, colors, and art style.
3. Apply correct perspective distortion for the target angle (foreshortening, depth cues).
4. The background should remain simple and consistent with the original.
5. If the subject is a character: show the correct body parts visible from this angle.
`.trim();
            return isIllustration
                ? base + `\nIMPORTANT: Even though this is a 2D illustration, you MUST apply 3D perspective transformation. Force the angle change even if it feels unnatural for 2D art. This is intentional.`
                : base;
        };

        // 取得生成圖的原生像素尺寸
        const getDims = (src: string) => new Promise<{ w: number; h: number }>((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
            img.onerror = () => resolve({ w: 0, h: 0 });
            img.src = src;
        });

        // 結果放在原圖右側 30px，依生成圖原生比例顯示（避免被原圖比例壓變形）
        const placeResult = async (element: ImageElement, finalSrc: string) => {
            const GAP = 30;
            // 寬度維持原圖寬，高度依生成圖的原生比例換算
            const dims = await getDims(finalSrc);
            const newW = element.width;
            const newH = (dims.w > 0 && dims.h > 0)
                ? Math.round(newW * dims.h / dims.w)
                : element.height;
            const newX = element.position.x + element.width / 2 + GAP + newW / 2;
            setElements(prev => [
                ...prev,
                {
                    ...element,
                    id: `${element.id}_angle_${Date.now()}`,
                    src: finalSrc,
                    position: { x: newX, y: element.position.y },
                    width: newW,
                    height: newH,
                    name: `${element.name || '圖片'} 視角`,
                    zIndex: Math.max(...prev.map(e => e.zIndex)) + 1,
                } as ImageElement,
            ]);
        };

        // 是否走 Atlas（非 Gemini 模型 + 有 key + 支援 img2img）
        const useAtlas = generationModel !== 'gemini' && !!atlasApiKey && atlasModelSupportsImg2Img(generationModel as AtlasGenerationModel);

        try {
            const genAI = useAtlas ? null : createAiClient();

            for (const element of targetElements) {
                // 透明背景：先壓平成純色底（AI 無法處理 alpha），生成後再還原透明
                const { src: flatSrc, hadTransparency, bgColor } = await prepareForGeneration(element.src);
                const isIllustration = await detectIfIllustration(flatSrc);
                const prompt = buildAnglePrompt(anglePrompt, isIllustration);

                let generatedSrc = '';

                if (useAtlas) {
                    // ── Atlas img2img 路徑 ──────────────────────────────
                    const atlasModel = generationModel as AtlasGenerationModel;
                    let refImage = flatSrc;
                    if (!refImage.startsWith('data:')) refImage = await downloadImageAsBase64(refImage);
                    const ratio = imageAspectRatio || 'Original';
                    const quality = imageSize === '4K' ? '4K' : '2K';
                    const images = await withAtlasWaitToast(() => callAtlasImg2Img(prompt, atlasModel, atlasApiKey!, refImage, 1, { ratio, quality }));
                    if (images.length > 0) generatedSrc = images[0];
                } else {
                    // ── Gemini 路徑（單次生成）──────────────────────────
                    const [header, data] = flatSrc.split(',');
                    const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
                    const imagePart = { inlineData: { data, mimeType } };
                    const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI!.models.generateContent({
                        model: imageModel,
                        contents: { parts: [imagePart, { text: prompt }] },
                    }));
                    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                    if (part?.inlineData) generatedSrc = `data:image/png;base64,${part.inlineData.data}`;
                }

                if (generatedSrc) {
                    let finalSrc = generatedSrc;
                    // 還原透明背景（BiRefNet → Gemini 去背 → Chroma Key）
                    if (hadTransparency) {
                        try {
                            finalSrc = await restoreTransparencyFn(finalSrc, bgColor);
                        } catch (e) {
                            console.warn("Transparency processing failed", e);
                        }
                    }
                    await placeResult(element, finalSrc);
                }
            }
            showToast("視角轉換完成！✨");
        } catch (error) {
            handleAIError(error, "視角轉換");
        } finally {
            setGeneratingElementIds([]);
            setIsGenerating(false);
        }
    }, [selectedElementIds, elements, setElements, showToast, setHasApiKey, apiKey, imageModel, generationModel, atlasApiKey, imageAspectRatio, imageSize, prepareForGeneration, restoreTransparencyFn]);

    const handleRemoveBackground = useCallback(async (mode: string) => {
        const targetElements = elements.filter(el => selectedElementIds.includes(el.id) && el.type === 'image') as ImageElement[];
        if (targetElements.length === 0) return;

        setGeneratingElementIds(targetElements.map(el => el.id));
        setIsGenerating(true);

        try {
            const genAI = createAiClient();

            for (const element of targetElements) {
                 if (!element.src || element.src.length < 100) continue;

                try {
                    const processedSrc = await executeDynamicRemoval(element.src, genAI, showToast, imageModel);
                    setElements(prev => prev.map(el => el.id === element.id ? { ...el, src: processedSrc } : el));
                } catch (err: any) {
                    throw err;
                }
            }
            showToast("智慧去背處理完成！✨");

        } catch (error) {
            handleAIError(error, "去背處理");
        } finally {
            setGeneratingElementIds([]);
            setIsGenerating(false);
        }
    }, [selectedElementIds, elements, setElements, showToast, setHasApiKey, apiKey]);

    const handleHarmonize = useCallback(async () => {
        const selectedEls = elements.filter(el => selectedElementIds.includes(el.id));
        const visualElements = selectedEls
            .filter((el): el is ImageElement => el.type === 'image')
            .sort((a, b) => a.zIndex - b.zIndex);

        const instructionElements = selectedEls
            .filter(el => el.type === 'note' || el.type === 'text');

        if (visualElements.length < 2) {
            showToast("請至少選取兩張圖片進行調和");
            return;
        }

        const baseElement = visualElements[0];

        setGeneratingElementIds(visualElements.map(el => el.id));
        setIsGenerating(true);
        showToast("正在進行智慧影像調和 (以底圖為基準)...");
    
        try {
            const width = baseElement.width;
            const height = baseElement.height;
            const canvas = document.createElement('canvas');
            canvas.width = width * 2; 
            canvas.height = height * 2;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Context failed");
            
            ctx.scale(2, 2);
            ctx.translate(width / 2, height / 2);

            const baseRad = (baseElement.rotation * Math.PI) / 180;

            const baseImg = await loadImage(baseElement.src);
            ctx.drawImage(baseImg, -baseElement.width/2, -baseElement.height/2, baseElement.width, baseElement.height);

            ctx.globalCompositeOperation = 'source-atop';

            for (let i = 1; i < visualElements.length; i++) {
                const el = visualElements[i];
                ctx.save();
                
                const dxWorld = el.position.x - baseElement.position.x;
                const dyWorld = el.position.y - baseElement.position.y;

                const localX = dxWorld * Math.cos(-baseRad) - dyWorld * Math.sin(-baseRad);
                const localY = dxWorld * Math.sin(-baseRad) + dyWorld * Math.cos(-baseRad);

                ctx.translate(localX, localY);
                ctx.rotate(((el.rotation - baseElement.rotation) * Math.PI) / 180);

                const img = await loadImage((el as ImageElement).src);
                ctx.drawImage(img, -el.width/2, -el.height/2, el.width, el.height);
                
                ctx.restore();
            }
    
            const base64 = canvas.toDataURL('image/png');
            const [header, data] = base64.split(',');
            const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
            const imagePart = { inlineData: { data, mimeType } };
    
            // ── Pass 1：用 Flash Lite 分析底圖視覺特徵（快速免費）────────
            const [baseHeader, baseData] = baseElement.src.split(',');
            const baseMime = baseHeader.match(/data:(.*);base64/)?.[1] || 'image/png';
            const baseImagePart = { inlineData: { data: baseData, mimeType: baseMime } };

            let baseAnalysis = '';
            try {
                const liteClient = createAiClient();
                const analysisRes = await callGeminiWithRetry<GenerateContentResponse>(() =>
                    liteClient.models.generateContent({
                        model: 'gemini-3.1-flash-lite',
                        contents: {
                            parts: [
                                baseImagePart,
                                { text: `Analyze this image's visual characteristics for VFX compositing. Be brief and technical. Report:
- Light source: direction, angle, soft/hard quality
- Color temperature: warm/cool, dominant color cast
- Exposure & contrast level
- Shadow: direction, intensity, color
- Overall color grade and mood
- Any atmospheric effects (haze, glow, vignette)` }
                            ]
                        },
                    })
                );
                baseAnalysis = analysisRes.candidates?.[0]?.content?.parts?.find(p => p.text)?.text || '';
            } catch {
                // 分析失敗不影響調和流程，跳過
            }

            // ── Pass 2：用 imageModel 調和合成圖 ──────────────────────
            let promptText = `You are a professional photo retoucher and VFX compositor.

This composite image contains multiple elements layered together. Make them look like they were photographed together in the same scene.`;

            if (baseAnalysis) {
                promptText += `\n\nBASE IMAGE ANALYSIS (match all elements to these characteristics):\n${baseAnalysis}`;
            }

            promptText += `\n\nApply these adjustments:
1. COLOR TEMPERATURE — match white balance across all elements to the base image's light source
2. EXPOSURE & CONTRAST — even out brightness so no element looks out of place
3. SHADOWS — ensure shadows fall in a consistent direction with consistent intensity
4. COLOR GRADING — unify saturation, hue, and overall tone across all elements
5. EDGE BLENDING — soften hard edges where elements meet their surroundings
6. ATMOSPHERE — add subtle ambient color cast consistent with the scene mood

CONSTRAINTS:
- Do NOT move, resize, or reposition any element
- Do NOT add or remove any subject or object
- Preserve all fine detail and textures
- Keep the exact same composition and framing`;

            const userInstructions = instructionElements.map(el => {
                 if (el.type === 'note') return (el as NoteElement).content;
                 if (el.type === 'text') return (el as TextElement).text;
                 return '';
            }).join(' ').trim();

            if (userInstructions) {
                promptText += `\n\nIMPORTANT User Instructions: ${userInstructions}`;
            }

            const targetAspectRatio = getClosestAspectRatio(width, height);
            // 依底圖實際像素大小自動選擇輸出解析度
            const imageSize = (baseImg.naturalWidth >= 2000 || baseImg.naturalHeight >= 2000) ? '4K' : '2K';

            const genAI = createAiClient();
            const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                model: imageModel,
                contents: { parts: [imagePart, { text: promptText }] },
                config: {
                    imageConfig: { aspectRatio: targetAspectRatio, imageSize }
                },
            }));
    
            const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (part?.inlineData) {
                const aiResultSrc = `data:image/png;base64,${part.inlineData.data}`;
                
                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = canvas.width;
                finalCanvas.height = canvas.height;
                const fCtx = finalCanvas.getContext('2d');
                if (fCtx) {
                    const aiImg = await loadImage(aiResultSrc);
                    fCtx.drawImage(aiImg, 0, 0, finalCanvas.width, finalCanvas.height);
                    fCtx.globalCompositeOperation = 'destination-in';
                    fCtx.drawImage(canvas, 0, 0); 
                }
                const finalSrc = finalCanvas.toDataURL('image/png');
                
                const newId = `${Date.now()}-harmonized`;
                const maxZ = Math.max(0, ...elements.map(e => e.zIndex));

                // 結果放在 bounding box 右側 30px，原圖保留不動
                const allX = visualElements.map(el => el.position.x + el.width / 2);
                const rightEdge = Math.max(...allX);
                const GAP = 30;
                const newElement: ImageElement = {
                    id: newId,
                    type: 'image',
                    src: finalSrc,
                    position: { x: rightEdge + GAP + width / 2, y: baseElement.position.y },
                    width: width,
                    height: height,
                    rotation: baseElement.rotation,
                    zIndex: maxZ + 1,
                    isVisible: true,
                    isLocked: false,
                    name: 'Harmonized Image',
                    groupId: null
                };
                setElements(prev => [...prev, newElement]);
                showToast("影像調和完成！✨");
            }
        } catch (error: any) {
            handleAIError(error, "影像調和");
        } finally {
            setGeneratingElementIds([]);
            setIsGenerating(false);
        }
    }, [elements, selectedElementIds, setElements, showToast, setHasApiKey, apiKey]);

    const handleStartOutpainting = useCallback((elementId: string) => {
        const el = elements.find(e => e.id === elementId);
        if (el && el.type === 'image') {
          setOutpaintingState({
            element: el as ImageElement,
            frame: {
              position: { ...el.position },
              width: el.width * 1.5,
              height: el.height * 1.5
            }
          });
        }
    }, [elements]);

    const handleOutpaintingGenerate = useCallback(async (prompt: string, model: 'gemini' | 'gpt' = 'gemini') => {
        if (!outpaintingState) return;
        const { element, frame } = outpaintingState;

        if (model === 'gpt' && !atlasApiKey) {
            showToast('GPT 擴圖需要 Atlas Cloud Key，請先於設定中輸入');
            return;
        }

        setGeneratingElementIds([element.id]); // Show badge on source image
        setIsGenerating(true);
        try {
            const img = await loadImage(element.src);

            // scale: 1 顯示單位 = 多少原圖原生像素（用原生像素建圖，避免舊版用顯示尺寸壓縮 → 變糊/拉伸）
            const scale = element.width > 0 ? img.naturalWidth / element.width : 1;
            const diffX = element.position.x - frame.position.x;
            const diffY = element.position.y - frame.position.y;

            // 生成結果 → 新圖層。outputRatio = 結果圖實際寬高比（GPT 會吸附比例，需據此擺放避免拉伸）
            const addResult = (generatedSrc: string, outputRatio?: number) => {
                const ratio = outputRatio ?? (frame.width / frame.height);
                const newW = frame.width;
                const newH = newW / ratio;
                const newId = `${Date.now()}-outpainted`;
                const currentMaxZ = elements.length > 0 ? Math.max(...elements.map(e => e.zIndex)) : 0;
                const newElement: ImageElement = {
                    ...element,
                    id: newId,
                    src: generatedSrc,
                    width: newW,
                    height: newH,
                    position: frame.position,
                    name: `${element.name} (Expanded)`,
                    zIndex: currentMaxZ + 1,
                    groupId: null,
                };
                setElements(prev => [...prev, newElement]);
                setOutpaintingState(null);
                showToast('擴圖完成！已新增為新圖層 ✨');
            };

            if (model === 'gpt') {
                // ── GPT Image 2 Edit 遮罩外擴 ──
                // GPT edit 只支援三種輸出尺寸 → 把外框比例「吸附」到最接近的一種，
                // 並把 size 帶進 API（不帶 size 它會輸出近似原圖比例 → 完全不擴）。
                const GPT_EDIT_SIZES = [
                    { w: 1024, h: 1024 }, // 1:1
                    { w: 1536, h: 1024 }, // 3:2 橫
                    { w: 1024, h: 1536 }, // 2:3 直
                ];
                const frameRatio = frame.width / frame.height;
                const target = GPT_EDIT_SIZES.reduce((best, s) =>
                    Math.abs((s.w / s.h) - frameRatio) < Math.abs((best.w / best.h) - frameRatio) ? s : best
                );
                const outW = target.w, outH = target.h;
                const outRatio = outW / outH;

                // 原圖等比置中（uniform scale，不變形）：整個外框 letterbox 進輸出畫布
                const s = Math.min(outW / frame.width, outH / frame.height);
                const dw = Math.round(element.width * s);
                const dh = Math.round(element.height * s);
                const imgX = Math.round(outW / 2 + diffX * s - dw / 2);
                const imgY = Math.round(outH / 2 + diffY * s - dh / 2);

                const canvas = document.createElement('canvas');
                canvas.width = outW; canvas.height = outH;
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('Canvas context failed');
                ctx.drawImage(img, imgX, imgY, dw, dh);
                const compositeB64 = canvas.toDataURL('image/png');

                // 黑白遮罩：白=要生成的外圈、黑=保留的原圖
                const mcanvas = document.createElement('canvas');
                mcanvas.width = outW; mcanvas.height = outH;
                const mctx = mcanvas.getContext('2d');
                if (!mctx) throw new Error('Mask context failed');
                mctx.fillStyle = '#ffffff';
                mctx.fillRect(0, 0, outW, outH);
                mctx.fillStyle = '#000000';
                mctx.fillRect(imgX, imgY, dw, dh);
                const maskB64 = mcanvas.toDataURL('image/png');

                const outPrompt = prompt.trim()
                    ? prompt.trim()
                    : 'Naturally extend and continue the existing scene outward into the surrounding area — keep the same lighting, color palette, perspective, depth and artistic style so it looks like one continuous photograph.';
                const resultSrc = await withAtlasWaitToast(() =>
                    callAtlasInpaint(outPrompt, compositeB64, maskB64, atlasApiKey!, undefined, undefined, undefined, `${outW}x${outH}`));
                addResult(resultSrc, outRatio);
            } else {
                // ── Gemini 路徑（整張重生，用原生解析度合成 + 強化「勿動原圖」指令） ──
                const MAX_EDGE = 2048;
                let fW = Math.round(frame.width * scale);
                let fH = Math.round(frame.height * scale);
                const longest = Math.max(fW, fH);
                const capScale = longest > MAX_EDGE ? MAX_EDGE / longest : 1;
                fW = Math.max(1, Math.round(fW * capScale));
                fH = Math.max(1, Math.round(fH * capScale));
                const drawScale = scale * capScale;
                const dw = Math.round(element.width * drawScale);
                const dh = Math.round(element.height * drawScale);
                const imgX = Math.round(fW / 2 + diffX * drawScale - dw / 2);
                const imgY = Math.round(fH / 2 + diffY * drawScale - dh / 2);

                const canvas = document.createElement('canvas');
                canvas.width = fW; canvas.height = fH;
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('Canvas context failed');
                ctx.drawImage(img, imgX, imgY, dw, dh);

                ctx.fillStyle = 'rgba(255, 59, 48, 0.4)';
                ctx.beginPath();
                ctx.rect(0, 0, fW, fH);
                ctx.rect(imgX, imgY, dw, dh);
                ctx.fill('evenodd');

                const base64Data = canvas.toDataURL('image/png');
                const [header, data] = base64Data.split(',');
                const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
                const imagePart = { inlineData: { data, mimeType } };

                const textPrompt = `The semi-transparent red area marks empty space to fill. Keep the existing (non-red) area pixel-for-pixel UNCHANGED — do not redraw, stretch, recolor, zoom, or shift it. Only paint into the red area, seamlessly extending the scene with matching lighting, perspective and style. ${prompt}`;

                const genAI = createAiClient();
                const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                    model: imageModel,
                    contents: { parts: [imagePart, { text: textPrompt }] },
                    config: {
                        imageConfig: {
                            imageSize: "4K"
                        }
                    }
                }));

                const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (part?.inlineData) {
                    addResult(`data:image/png;base64,${part.inlineData.data}`);
                }
            }
        } catch (e: any) {
            handleAIError(e, "擴圖");
        } finally {
            setIsGenerating(false);
            setGeneratingElementIds([]);
        }
    }, [outpaintingState, elements, setElements, showToast, setHasApiKey, apiKey, atlasApiKey, imageModel, withAtlasWaitToast]);
  
    const handleAutoPromptGenerate = useCallback(async (state: OutpaintingState): Promise<string> => {
        try {
            const genAI = createAiClient();
            const [header, data] = state.element.src.split(',');
            const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
            const imagePart = { inlineData: { data, mimeType } };
            
            const prompt = `Analyze this image and write a detailed prompt for Outpainting in Traditional Chinese (繁體中文). Describe the scene, lighting, and style to extend the image naturally. Output ONLY the prompt text.`;

            const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                model: 'gemini-3.1-flash-lite',
                contents: { parts: [imagePart, { text: prompt }] },
            }));
            
            return response.text ? response.text.trim() : "";
        } catch (e: any) {
            handleAIError(e, "自動發想");
            throw e;
        }
    }, [setHasApiKey, apiKey, showToast]);

    const handleAIUpscale = useCallback(async (factor: number) => {
        const element = elements.find(el => el.id === selectedElementIds[0]);
        if (!element || element.type !== 'image') return;

        setGeneratingElementIds([element.id]);
        setIsGenerating(true);
        // Request higher resolution depending on factor
        const requestedResolution = factor >= 4 ? '4K' : '2K';
        showToast(`AI 正在運算中... 正在提升 ${factor} 倍解析度 (目標: ${requestedResolution})`);
        
        try {
            const genAI = createAiClient();
            const { src: flatSrc, hadTransparency, bgColor } = await prepareForGeneration(element.src);
            const [header, data] = flatSrc.split(',');
            const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
            const imagePart = { inlineData: { data, mimeType } };

            // 1. Calculate aspect ratio to enforce input shape
            const targetAspectRatio = getClosestAspectRatio(element.width, element.height);

            // UPDATED PROMPT: Strict instructions to prevent distortion
            let prompt = `Task: High-fidelity image upscaling.
            Action: Upscale the image by ${factor}x.
            CRITICAL INSTRUCTION: Maintain the EXACT aspect ratio and geometry of the original subject content.
            Do NOT stretch, squeeze, or distort the image content to fit the aspect ratio container.
            If the container ratio differs slightly, extend the background naturally instead of distorting the subject.
            Enhance details and sharpness significantly while keeping the structure identical.`;

            const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                model: imageModel,
                contents: { parts: [imagePart, { text: prompt }] },
                config: {
                    imageConfig: {
                        imageSize: requestedResolution,
                        aspectRatio: targetAspectRatio
                    }
                }
            }));

            const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (part?.inlineData) {
                let resultSrc = `data:image/png;base64,${part.inlineData.data}`;

                if (hadTransparency) {
                    try {
                        showToast("正在為放大後的圖片還原透明背景...");
                        resultSrc = await restoreTransparencyFn(resultSrc, bgColor);
                    } catch(e) {
                        console.warn("Transparency processing for upscale failed", e);
                    }
                }

                // 2. Strict dimension control: 
                // We ignore the AI's naturalWidth/Height for display purposes.
                // We strictly scale the visual bounding box by the factor (e.g., 500px -> 1000px).
                // The underlying image data (src) will be 2K/4K, providing "Retina" density.
                const finalWidth = element.width * factor;
                const finalHeight = element.height * factor;

                const newElement: ImageElement = {
                    id: `${Date.now()}-upscaled`,
                    type: 'image',
                    position: { x: element.position.x + 50, y: element.position.y + 50 },
                    width: finalWidth,
                    height: finalHeight,
                    src: resultSrc,
                    rotation: 0,
                    zIndex: zIndexCounter.current++,
                    isVisible: true,
                    isLocked: false,
                    name: `Upscaled Image (${requestedResolution})`,
                    groupId: null
                };
                setElements(prev => [...prev, newElement]);
                showToast("放大完成！✨");
            }
        } catch (e: any) {
            handleAIError(e, "放大");
        } finally {
            setGeneratingElementIds([]);
            setIsGenerating(false);
        }
    }, [elements, selectedElementIds, setElements, showToast, setHasApiKey, apiKey, preserveTransparency, prepareForGeneration, restoreTransparencyFn]);

    const handleGenerate = useCallback(async (selectedElements: CanvasElement[], count: 1 | 2 | 3 | 4 = 2, intentOverride?: string) => {
        const imageElements = selectedElements.filter(el => el.type === 'image' || el.type === 'drawing' || el.type === 'shape');
        const noteElements = selectedElements.filter(el => el.type === 'note' || el.type === 'text') as (NoteElement | TextElement)[];
        const frameElements = selectedElements.filter(el => el.type === 'frame') as FrameElement[];

        if (frameElements.length > 0 && noteElements.length === 0) {
            showToast("畫框需要搭配便利貼輸入提示詞後才可生成 ⚠️");
            return;
        } else if (imageElements.length === 0 && noteElements.length === 0) {
            alert("請至少選擇一張圖片、手繪或便利貼以提供生成內容的參考。");
            return;
        }

        // --- Atlas Cloud routing ---
        if (generationModel !== 'gemini') {
            if (!atlasApiKey) {
                showToast("請先在設定中輸入 Atlas Cloud Key 🔑");
                return;
            }

            const atlasModel = generationModel as AtlasGenerationModel;
            const hasImages = imageElements.length > 0;

            // 組合 prompt：便利貼內容 + 參考風格（兩者皆選填）
            const noteText = intentOverride || noteElements.map(n => n.type === 'note' ? n.content : (n as TextElement).text).join(' ').trim();
            let atlasPrompt = noteText;
            if (imageStyle && imageStyle !== 'Default') {
                const styleObj = STYLE_PRESETS.find(s => s.label === imageStyle || s.name === imageStyle);
                atlasPrompt = buildStyledPrompt(atlasPrompt, styleObj?.prompt ?? '', imageStyle);
            }

            // 收集便利貼中的參考圖（base64）
            const noteRefImgs: string[] = [];
            for (const note of noteElements) {
                if (note.type === 'note' && (note as NoteElement).referenceImages) {
                    (note as NoteElement).referenceImages!.forEach(src => { if (src) noteRefImgs.push(src); });
                }
            }
            const hasNoteRefs = noteRefImgs.length > 0;
            const canDoImg2Img = atlasModelSupportsImg2Img(atlasModel);

            // 畫框模式：每個畫框獨立生成並填入
            if (frameElements.length > 0) {
                if (!atlasPrompt) {
                    showToast("畫框需要便利貼提示詞才可生成 ⚠️");
                    return;
                }
                setGeneratingElementIds(frameElements.map(f => f.id));
                setIsGenerating(true);
                setGeneratedImages(null);
                const atlasQualityFrame = imageSize === '4K' ? '4K' : '2K';
                try {
                    const generatePromises = frameElements.map(async (frame) => {
                        let frameRatio = frame.aspectRatioLabel;
                        if (!['1:1', '3:4', '4:3', '9:16', '16:9'].includes(frameRatio)) frameRatio = '1:1';
                        let imgs: string[];
                        if (hasNoteRefs && canDoImg2Img) {
                            // 有便利貼參考圖 → 用 img2img，以第一張參考圖為主
                            imgs = await withAtlasWaitToast(() => callAtlasImg2Img(atlasPrompt, atlasModel, atlasApiKey, noteRefImgs[0], 1, { ratio: frameRatio, quality: atlasQualityFrame, transparentBg: getTransparentBg(atlasPrompt || '') }, noteRefImgs.slice(1)));
                        } else {
                            imgs = await withAtlasWaitToast(() => callAtlasGenerate(atlasPrompt, atlasModel, atlasApiKey, 1, { ratio: frameRatio, quality: atlasQualityFrame, transparentBg: getTransparentBg(atlasPrompt || '') }));
                        }
                        if (imgs.length === 0) throw new Error('未收到圖片');
                        const newImageElement: ImageElement = { ...frame, type: 'image', src: imgs[0] };
                        return newImageElement;
                    });
                    const results = await Promise.allSettled(generatePromises);
                    const validNewImages = results
                        .filter((r): r is PromiseFulfilledResult<ImageElement> => r.status === 'fulfilled')
                        .map(r => r.value);
                    if (validNewImages.length > 0) {
                        setElements(prev => prev.map(el => {
                            const replacement = validNewImages.find(newImg => newImg.id === el.id);
                            return replacement || el;
                        }));
                        showToast(`成功生成 ${validNewImages.length} 張圖片並填入畫框！✨`);
                    } else {
                        showToast('畫框生成失敗，請稍後再試 ⚠️');
                    }
                } catch (e: any) {
                    showToast(`畫框生成失敗：${e.message}`);
                } finally {
                    setGeneratingElementIds([]);
                    setIsGenerating(false);
                }
                return;
            }

            // 圖生圖：有選取畫布圖片
            if (hasImages) {
                if (!canDoImg2Img) {
                    showToast(`${atlasModel} 不支援圖生圖，請改用 Gemini 模式 ⚠️`);
                    return;
                }
                const firstImg = imageElements.find(el => el.type === 'image' || el.type === 'drawing') as (ImageElement | DrawingElement) | undefined;
                let rawRefImage = firstImg?.src ?? '';
                if (!rawRefImage) { showToast("請選取一張圖片作為參考 ⚠️"); return; }
                if (!rawRefImage.startsWith('data:')) {
                    rawRefImage = await downloadImageAsBase64(rawRefImage);
                    if (!rawRefImage.startsWith('data:')) { showToast("無法讀取參考圖片，請確認圖片已正確載入 ⚠️"); return; }
                }
                const { src: refImage, hadTransparency: refHadTransparency, bgColor: refBgColor } = await prepareForGeneration(rawRefImage);
                const img2imgPrompt = atlasPrompt || 'Keep the overall composition, enhance details and quality';
                setGeneratingElementIds(firstImg ? [firstImg.id] : []);
                setIsGenerating(true);
                setGeneratedImages(null);
                const atlasQuality = imageSize === '4K' ? '4K' : '2K';
                const atlasRatio = imageAspectRatio || 'Original';
                try {
                    // 便利貼參考圖追加在畫布圖片之後
                    const rawImages = await withAtlasWaitToast(() => callAtlasImg2Img(img2imgPrompt, atlasModel, atlasApiKey, refImage, count, { ratio: atlasRatio, quality: atlasQuality, transparentBg: getTransparentBg(atlasPrompt || '') }, hasNoteRefs ? noteRefImgs : undefined));
                    if (rawImages.length === 0) throw new Error('未收到任何圖片');
                    // 若來源有透明背景，生成後自動還原透明
                    const images = refHadTransparency
                        ? await Promise.all(rawImages.map(img => restoreTransparencyFn(img, refBgColor).catch(() => img)))
                        : rawImages;
                    setGeneratedImages(images);
                } catch (e: any) {
                    showToast(`圖生圖失敗：${e.message}`);
                } finally {
                    setGeneratingElementIds([]);
                    setIsGenerating(false);
                }
                return;
            }

            // 便利貼有參考圖且模型支援 img2img → 以參考圖驅動生成
            if (hasNoteRefs && canDoImg2Img) {
                if (!atlasPrompt) {
                    showToast("請在便利貼加入提示詞描述想要的內容 ⚠️");
                    return;
                }
                setGeneratingElementIds([]);
                setIsGenerating(true);
                setGeneratedImages(null);
                const atlasQualityR = imageSize === '4K' ? '4K' : '2K';
                const atlasRatioR = imageAspectRatio || 'Original';
                try {
                    const images = await withAtlasWaitToast(() => callAtlasImg2Img(atlasPrompt, atlasModel, atlasApiKey, noteRefImgs[0], count, { ratio: atlasRatioR, quality: atlasQualityR, transparentBg: getTransparentBg(atlasPrompt || '') }, noteRefImgs.slice(1)));
                    if (images.length === 0) throw new Error('未收到任何圖片');
                    setGeneratedImages(images);
                } catch (e: any) {
                    showToast(`生成失敗：${e.message}`);
                } finally {
                    setGeneratingElementIds([]);
                    setIsGenerating(false);
                }
                return;
            }

            // 純文生圖
            if (!atlasPrompt) {
                showToast("文生圖需要便利貼提示詞，或選取圖片使用圖生圖模式 ⚠️");
                return;
            }
            setGeneratingElementIds([]);
            setIsGenerating(true);
            setGeneratedImages(null);
            const atlasQuality2 = imageSize === '4K' ? '4K' : '2K';
            const atlasRatio2 = (imageAspectRatio === 'Original' || !imageAspectRatio) ? '1:1' : imageAspectRatio;
            try {
                const images = await withAtlasWaitToast(() => callAtlasGenerate(atlasPrompt, atlasModel, atlasApiKey, count, { ratio: atlasRatio2, quality: atlasQuality2, transparentBg: getTransparentBg(atlasPrompt || '') }));
                if (images.length === 0) throw new Error('未收到任何圖片');
                setGeneratedImages(images);
            } catch (e: any) {
                showToast(`生成失敗：${e.message}`);
            } finally {
                setGeneratingElementIds([]);
                setIsGenerating(false);
            }
            return;
        }

        // --- Gemini path (default) ---
        // generatingElementIds will be set per-branch below
        setIsGenerating(true);
        setGeneratedImages(null);
        
        try {
          const genAI = createAiClient();
          const instructions = intentOverride || noteElements.map(note => note.type === 'note' ? note.content : note.text).join(' \n');
          let finalInstructions = instructions;
          if (imageStyle && imageStyle !== 'Default') {
              const styleObj = STYLE_PRESETS.find(s => s.label === imageStyle || s.name === imageStyle);
              finalInstructions = buildStyledPrompt(instructions, styleObj?.prompt ?? '', imageStyle);
          }

          // 收集便利貼的參考圖（最多4張，按編號①②③④）
          const circledNums = ['①','②','③','④'];
          const noteRefImages: { idx: number; data: string; mimeType: string }[] = [];
          for (const note of noteElements) {
              if (note.type === 'note' && note.referenceImages) {
                  note.referenceImages.forEach((src, i) => {
                      if (src) {
                          const [header, data] = src.split(',');
                          const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
                          noteRefImages.push({ idx: i, data, mimeType });
                      }
                  });
              }
          }

          // 如果有參考圖，在 prompt 末尾加說明
          let promptWithRefHint = finalInstructions;
          if (noteRefImages.length > 0) {
              const refNote = noteRefImages.map(r => `參考圖${circledNums[r.idx]}`).join('、');
              promptWithRefHint = finalInstructions
                  ? `${finalInstructions}\n\n（已附上 ${refNote} 作為視覺參考，請依照提示詞的指示使用這些參考圖）`
                  : `請參考附上的 ${refNote} 生成圖片`;
          }

          if (frameElements.length > 0) {
              setGeneratingElementIds(frameElements.map(f => f.id));
              const generatePromises = frameElements.map(async (frame) => {
                  const promptText = `Generate an image based on this description: "${promptWithRefHint}".`;
                  const refParts = noteRefImages.map(r => ({ inlineData: { data: r.data, mimeType: r.mimeType } }));
                  const textPart = { text: promptText };
                  let targetRatio = frame.aspectRatioLabel;
                  if (!['1:1', '3:4', '4:3', '9:16', '16:9'].includes(targetRatio)) targetRatio = '1:1'; 
                  
                  const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                    model: imageModel,
                    contents: { parts: [...refParts, textPart] },
                    config: { imageConfig: { aspectRatio: targetRatio, imageSize } },
                  }));
                  const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                  if (part?.inlineData) {
                      const generatedSrc = `data:image/png;base64,${part.inlineData.data}`;
                      const newImageElement: ImageElement = { ...frame, type: 'image', src: generatedSrc };
                      return newImageElement;
                  }
                  return null;
              });
              const results = await Promise.all(generatePromises);
              const validNewImages = results.filter((el): el is ImageElement => el !== null);
              if (validNewImages.length > 0) {
                  setElements(prev => prev.map(el => {
                      const replacement = validNewImages.find(newImg => newImg.id === el.id);
                      return replacement || el;
                  }));
                  showToast(`成功生成 ${validNewImages.length} 張圖片並填入畫框！✨`);
              }
              setGeneratingElementIds([]);
              setIsGenerating(false);
              return;
          }
    
          // Set shimmer targets: img2img → highlight source elements; text-to-image → top progress bar
          setGeneratingElementIds(imageElements.length > 0 ? imageElements.map(el => el.id) : []);

          let parts: ({ inlineData: { data: string; mimeType: string; }; } | { text: string; })[];
          let targetAspectRatio = imageAspectRatio;
          if (imageAspectRatio === 'Original' && imageElements.length > 0) {
              const firstImage = imageElements[0];
              targetAspectRatio = getClosestAspectRatio(firstImage.width, firstImage.height);
          } else if (imageAspectRatio === 'Original') {
              targetAspectRatio = '1:1';
          }
          
          // 生成前：對所有 image element 做透明壓平（記錄第一張的透明狀態用於還原）
          let firstElHadTransparency = false;
          let firstElBgColor = '#FFFFFF';

          if (imageElements.length > 0) {
              const imagePartsPromises = imageElements.map(async (el, idx) => {
                  let src = '';
                  if (el.type === 'shape') src = await createShapeDataUrl(el as ShapeElement);
                  else if ('src' in el) src = (el as any).src;

                  if (!src) return null;
                  // 如果是 URL（非 base64），嘗試透過 proxy 轉換後再送給 Gemini
                  if (!src.startsWith('data:')) {
                      src = await downloadImageAsBase64(src);
                      if (!src.startsWith('data:')) return null; // 轉換失敗則跳過
                  }
                  // 透明壓平
                  const { src: flatSrc, hadTransparency, bgColor } = await prepareForGeneration(src);
                  if (idx === 0) { firstElHadTransparency = hadTransparency; firstElBgColor = bgColor; }
                  const [header, data] = flatSrc.split(',');
                  const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
                  return { inlineData: { data, mimeType } };
              });
              const resolvedImageParts = (await Promise.all(imagePartsPromises)).filter(p => p !== null);

              const promptForEditing = promptWithRefHint || "Creatively reimagine and enhance the image(s).";

              const textPart = { text: promptForEditing };
              const noteRefParts = noteRefImages.map(r => ({ inlineData: { data: r.data, mimeType: r.mimeType } }));
              parts = [...resolvedImageParts as any, ...noteRefParts, textPart];
          } else {
              const promptText = noteRefImages.length > 0
                  ? `Generate a new image based on this description: "${promptWithRefHint}"`
                  : `Generate a completely new image based on this description: "${finalInstructions}"`;
              const textPart = { text: promptText };
              const noteRefParts = noteRefImages.map(r => ({ inlineData: { data: r.data, mimeType: r.mimeType } }));
              parts = [...noteRefParts, textPart];
          }

          const generateSingleImage = async () => {
            const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                model: imageModel,
                contents: { parts },
                config: { imageConfig: { aspectRatio: targetAspectRatio, imageSize } },
            }));
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    let resultSrc = `data:image/png;base64,${part.inlineData.data}`;

                    if (firstElHadTransparency && imageElements.length === 1) {
                        try {
                            resultSrc = await restoreTransparencyFn(resultSrc, firstElBgColor);
                        } catch (e) {
                            console.warn("Failed to restore alpha for generated image", e);
                        }
                    }

                    return resultSrc;
                }
            }
            return null;
          };
    
          const tasks = Array.from({ length: count }, () => generateSingleImage());
          const results = await Promise.all(tasks);
          let validImages = results.filter((img): img is string => img !== null);
          setGeneratedImages(validImages);

        } catch (error: any) {
          handleAIError(error, "圖片生成");
        } finally {
          setGeneratingElementIds([]);
          setIsGenerating(false);
        }
      }, [imageStyle, imageAspectRatio, preserveTransparency, setElements, showToast, setHasApiKey, apiKey, atlasApiKey, generationModel, prepareForGeneration, restoreTransparencyFn]);

    return {
        createAiClient,
        isGenerating,
        setIsGenerating,
        generatingElementIds,
        setGeneratingElementIds,
        generatedImages,
        setGeneratedImages,
        outpaintingState,
        setOutpaintingState,
        copiedStyle,
        imageStyle,
        setImageStyle,
        imageAspectRatio,
        setImageAspectRatio,
        imageSize,
        setImageSize,
        preserveTransparency,
        setPreserveTransparency,
        showStyleLibrary,
        setShowStyleLibrary,
        handleCopyStyle,
        handleApplyStyle,
        handlePasteStyle,
        handleCameraAngle,
        handleRemoveBackground,
        handleHarmonize,
        handleStartOutpainting,
        handleOutpaintingGenerate,
        handleAutoPromptGenerate,
        handleAIUpscale,
        handleGenerate,
        handleAskAI 
    };
};
