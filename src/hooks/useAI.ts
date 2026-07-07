
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
import { repairStickerTransparency } from '../utils/imageProcessing';
import { runUpscaleInWorker } from '../utils/upscaleWorkerClient';
import { runLocalRmbgInWorker } from '../utils/briaRmbgWorkerClient';
import { MODEL_CONFIGS, getModelStatus, type OnnxModelKey } from '../utils/onnxModelCache';
import { cacheImage } from '../utils/imageCache';
import { crossPlatformSpec, buildCrossPlatformPrompt, type CrossPlatformSpec } from '../skills/crossPlatform';
import { LogoSkillConfig, LOGO_BRAND_OUTPUTS, LogoBrandOutputSpec, buildLogoPrompt, buildLogoBrandPrompt } from '../skills/logo';
import { PRODUCT_MARKETING_PLATFORMS, buildProductMarketingPrompt, type ProductMarketingBrief, type ProductMarketingOutputSpec } from '../skills/marketing';
import { applyPoissonBlend } from '../utils/poissonBlend';

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

export const useAI = ({ elements, setElements, selectedElementIds, showToast, setHasApiKey, apiKey, imageModel = 'gemini-3.1-flash-image-preview', atlasApiKey, generationModel: generationModelGlobal = 'gemini', falApiKey }: UseAIProps) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatingElementIds, setGeneratingElementIds] = useState<string[]>([]);
    // 設計大師「透明背景」：本批生成的圖在放入畫布時自動去背
    const [pendingAutoDebg, setPendingAutoDebg] = useState(false);
    // LINE 貼圖去背用：null = 非貼圖；true/false = 貼圖有/無白描邊（決定泛洪扣黑或白）
    const [pendingStickerBorder, setPendingStickerBorder] = useState<boolean | null>(null);
    // 本機放大用的確定進度（0–100）；null = 不顯示進度條（一般生成走不確定 shimmer）
    const [genProgress, setGenProgress] = useState<number | null>(null);
    const [genOpType, setGenOpType] = useState<'upscale' | 'rmbg' | null>(null);
    const [generatedImages, setGeneratedImages] = useState<string[] | null>(null);
    const [generatedImagesMetadata, setGeneratedImagesMetadata] = useState<{ seed: number; model: string; prompt: string }[]>([]);
    const [outpaintingState, setOutpaintingState] = useState<OutpaintingState | null>(null);
    const [copiedStyle, setCopiedStyle] = useState<{ analysis: import('../components/StylePasteModal').StyleAnalysisResult } | null>(null);
    const [imageStyle, setImageStyle] = useState<string>('Default');
    const [imageAspectRatio, setImageAspectRatio] = useState<string>('Original');
    const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
    const [preserveTransparency, setPreserveTransparency] = useState(true);
    // 透明背景一律改用「生成後去背」流程處理。
    // Atlas 的 gpt-image-2 端點不接受 background:transparent 參數（會直接打回失敗），
    // 故所有模型都不再透過 API 參數要求透明背景。
    const getTransparentBg = (_prompt: string) => false;
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
            '⏳ 仍在生成中，Atlas 後台已收到任務...',
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
        // 貼圖是硬邊+實心+白模切框，用 General Use (Heavy)：最高精度的一般分割，
        // 邊緣乾淨有把握；Matting 偏軟 alpha 是給毛髮/半透明用的，反而會羽化白框、挖淺色洞。
        if (falApiKey) {
            try {
                return await birefnetRemoveBg(resultSrc, falApiKey, 'General Use (Heavy)');
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
        // 3. Chroma Key / Flood-fill 去背（本機最後備用，品質比一般 chroma key 更好）
        try {
            return await repairStickerTransparency(resultSrc, { backgroundColor: bgColor });
        } catch (e) {
            console.warn('[restoreTransparency] Flood-fill repair failed, fallback basic chroma key', e);
            return processChromaKey(resultSrc, bgColor);
        }
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
                model: 'gemini-3.1-flash',
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
                        config: { imageConfig: { imageSize: imageSize } },
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
        const useAtlas = generationModelGlobal !== 'gemini' && !!atlasApiKey && atlasModelSupportsImg2Img(generationModelGlobal as AtlasGenerationModel);

        try {
            if (useAtlas) {
                // ── Atlas img2img 風格套用 ──────────────────────────────
                const atlasModel = generationModelGlobal as AtlasGenerationModel;
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
                            config: { imageConfig: { imageSize: imageSize } },
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
    }, [copiedStyle, elements, setElements, preserveTransparency, showToast, setHasApiKey, apiKey, generationModelGlobal, atlasApiKey, imageSize, prepareForGeneration, restoreTransparencyFn]);

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
        const useAtlas = generationModelGlobal !== 'gemini' && !!atlasApiKey && atlasModelSupportsImg2Img(generationModelGlobal as AtlasGenerationModel);

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
                    const atlasModel = generationModelGlobal as AtlasGenerationModel;
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
    }, [selectedElementIds, elements, setElements, showToast, setHasApiKey, apiKey, imageModel, generationModelGlobal, atlasApiKey, imageAspectRatio, imageSize, prepareForGeneration, restoreTransparencyFn]);

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
                        model: 'gemini-3.1-flash',
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

            // 是否走 Atlas（非 Gemini 模型 + 有 key + 支援 img2img，如 GPT Image 2 / Seedream / Qwen）
            const useAtlas = generationModelGlobal !== 'gemini' && !!atlasApiKey && atlasModelSupportsImg2Img(generationModelGlobal as AtlasGenerationModel);

            let aiResultSrc = '';
            if (useAtlas) {
                // ── Atlas img2img 調和路徑 ──────────────────────────
                const atlasModel = generationModelGlobal as AtlasGenerationModel;
                const quality = imageSize === '4K' ? '4K' : '2K';
                const images = await withAtlasWaitToast(() => callAtlasImg2Img(promptText, atlasModel, atlasApiKey!, base64, 1, { ratio: 'Original', quality }));
                if (images.length > 0) aiResultSrc = images[0];
            } else {
                // ── Gemini 調和路徑 ─────────────────────────────────
                const genAI = createAiClient();
                const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                    model: imageModel,
                    contents: { parts: [imagePart, { text: promptText }] },
                    config: {
                        imageConfig: { aspectRatio: targetAspectRatio, imageSize }
                    },
                }));
                const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (part?.inlineData) aiResultSrc = `data:image/png;base64,${part.inlineData.data}`;
            }

            if (aiResultSrc) {
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
    }, [elements, selectedElementIds, setElements, showToast, setHasApiKey, apiKey, imageModel, generationModelGlobal, atlasApiKey, withAtlasWaitToast]);

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
                
                try {
                    const blendedSrc = await applyPoissonBlend(element.src, resultSrc, {
                        originalPosition: { x: imgX, y: imgY },
                        originalWidth: dw,
                        originalHeight: dh,
                        canvasWidth: outW,
                        canvasHeight: outH,
                    });
                    addResult(blendedSrc, outRatio);
                } catch (blendError) {
                    console.error('Poisson blend failed for GPT, falling back to raw output:', blendError);
                    addResult(resultSrc, outRatio);
                }
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
                    const rawAiSrc = `data:image/png;base64,${part.inlineData.data}`;
                    try {
                        const blendedSrc = await applyPoissonBlend(element.src, rawAiSrc, {
                            originalPosition: { x: imgX, y: imgY },
                            originalWidth: dw,
                            originalHeight: dh,
                            canvasWidth: fW,
                            canvasHeight: fH,
                        });
                        addResult(blendedSrc);
                    } catch (blendError) {
                        console.error('Poisson blend failed for Gemini, falling back to raw output:', blendError);
                        addResult(rawAiSrc);
                    }
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

        // 是否走 Atlas（非 Gemini 模型 + 有 key + 支援 img2img，如 GPT Image 2）
        const useAtlas = generationModelGlobal !== 'gemini' && !!atlasApiKey && atlasModelSupportsImg2Img(generationModelGlobal as AtlasGenerationModel);

        showToast(`AI 正在運算中... 正在提升 ${factor} 倍解析度 (目標: ${requestedResolution})`);

        try {
            const genAI = useAtlas ? null : createAiClient();
            const { src: flatSrc, hadTransparency, bgColor } = await prepareForGeneration(element.src);

            // UPDATED PROMPT: Strict instructions to prevent distortion
            const prompt = `Task: High-fidelity image upscaling.
            Action: Upscale the image by ${factor}x.
            CRITICAL INSTRUCTION: Maintain the EXACT aspect ratio and geometry of the original subject content.
            Do NOT stretch, squeeze, or distort the image content to fit the aspect ratio container.
            If the container ratio differs slightly, extend the background naturally instead of distorting the subject.
            Enhance details and sharpness significantly while keeping the structure identical.`;

            let resultSrc = '';

            if (useAtlas) {
                // ── Atlas img2img 放大路徑（GPT Image 2 等）──────────────
                const atlasModel = generationModelGlobal as AtlasGenerationModel;
                let refImage = flatSrc;
                if (!refImage.startsWith('data:')) refImage = await downloadImageAsBase64(refImage);
                const quality = factor >= 4 ? '4K' : '2K';
                const images = await withAtlasWaitToast(() => callAtlasImg2Img(prompt, atlasModel, atlasApiKey!, refImage, 1, { ratio: 'Original', quality }));
                if (images.length > 0) resultSrc = images[0];
            } else {
                // ── Gemini 放大路徑 ─────────────────────────────────────
                const [header, data] = flatSrc.split(',');
                const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
                const imagePart = { inlineData: { data, mimeType } };

                // Calculate aspect ratio to enforce input shape
                const targetAspectRatio = getClosestAspectRatio(element.width, element.height);

                const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI!.models.generateContent({
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
                if (part?.inlineData) resultSrc = `data:image/png;base64,${part.inlineData.data}`;
            }

            if (resultSrc) {
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
    }, [elements, selectedElementIds, setElements, showToast, setHasApiKey, apiKey, imageModel, generationModelGlobal, atlasApiKey, preserveTransparency, prepareForGeneration, restoreTransparencyFn]);

    // ── 本機 ONNX 高清放大（純像素超解析，結構 100% 保留，不走雲端、免額度） ──
    const handleLocalUpscale = useCallback(async (modelKey: OnnxModelKey, factor: number = 4) => {
        const element = elements.find(el => el.id === selectedElementIds[0]);
        if (!element || element.type !== 'image') return;

        const cfg = MODEL_CONFIGS[modelKey];
        const status = await getModelStatus(modelKey);
        if (status !== 'ready') {
            showToast(`請先在「功能助手 → 本機 AI 模型」下載「${cfg.name}」(${cfg.sizeMB}MB)`);
            return;
        }

        setGeneratingElementIds([element.id]);
        setGenProgress(0);   // 在元素 badge 上顯示確定進度條（取代每幾趴跳 toast）
        setGenOpType('upscale');
        setIsGenerating(true);
        try {
            // 模型原生 4x；factor=2 時於 worker 內把 4x 結果降回 2x（仍享 4x 細節重構）
            // 進度節流：每跨越一個 5% 級距才更新 state，避免每塊都觸發整張畫布重繪
            let lastBucket = -1;
            const resultSrc = await runUpscaleInWorker(
                element.src,
                cfg.cacheKey,
                factor,
                (pct) => {
                    const bucket = Math.floor(pct / 5);
                    if (bucket !== lastBucket || pct >= 100) {
                        lastBucket = bucket;
                        setGenProgress(pct);
                    }
                },
            );

            // 顯示尺寸放大 factor 倍（與「智能放大」一致），底層解析度同步 → 清晰不糊
            const newElement: ImageElement = {
                ...element,
                id: `${Date.now()}-hires`,
                src: resultSrc,
                width: element.width * factor,
                height: element.height * factor,
                position: { x: element.position.x + 30, y: element.position.y + 30 },
                zIndex: zIndexCounter.current++,
                name: `${element.name}（高清 ${factor}x）`,
                groupId: null,
            };
            setElements(prev => [...prev, newElement]);
            showToast('高清放大完成！✨');
        } catch (e: any) {
            handleAIError(e, '高清放大');
        } finally {
            setGeneratingElementIds([]);
            setGenProgress(null);
            setGenOpType(null);
            setIsGenerating(false);
        }
    }, [elements, selectedElementIds, setElements, showToast]);

    // ── 本機 ONNX 去背（ISNet 模型，不走雲端、免額度） ──
    const handleLocalRemoveBackground = useCallback(async () => {
        const element = elements.find(el => el.id === selectedElementIds[0]);
        if (!element || element.type !== 'image') return;

        const cfg = MODEL_CONFIGS['bria_rmbg'];
        const status = await getModelStatus('bria_rmbg');
        if (status !== 'ready') {
            showToast(`請先在「功能助手 → 本機 AI 模型」下載「${cfg.name}」(${cfg.sizeMB}MB)`);
            return;
        }

        setGeneratingElementIds([element.id]);
        setIsGenerating(true);
        setGenProgress(0);
        setGenOpType('rmbg');
        showToast('🔍 本機 AI 去背中 (ISNet)...');

        try {
            const resultSrc = await runLocalRmbgInWorker(
                element.src,
                cfg.cacheKey,
                (pct) => {
                    setGenProgress(pct);
                }
            );

            // 更新原圖 src
            setElements(prev => prev.map(e => e.id === element.id ? { ...e, src: resultSrc } : e));
            // 寫入本地快取
            if (resultSrc.startsWith('data:')) {
                cacheImage(element.id, resultSrc);
            }
            showToast('本機去背完成！✨');
        } catch (e: any) {
            handleAIError(e, '本機去背');
        } finally {
            setGeneratingElementIds([]);
            setGenProgress(null);
            setGenOpType(null);
            setIsGenerating(false);
        }
    }, [elements, selectedElementIds, setElements, showToast]);

    const handleGenerate = useCallback(async (selectedElements: CanvasElement[], count: 1 | 2 | 3 | 4 = 2, intentOverride?: string, modelOverride?: string, autoRemoveBg: boolean = false, aspectRatioOverride?: string, imageSizeOverride?: '1K' | '2K' | '4K', refStyleIndex?: number, refStyleScope?: 'all' | 'style-only', stickerDebgBorder?: boolean, customSeed?: number) => {
        const generationModel = modelOverride || generationModelGlobal;
        const baseSeed = customSeed !== undefined ? customSeed : Math.floor(Math.random() * 2147483647);
        // 解析度：呼叫端可覆寫（例：LINE 貼圖強制 4K 高解析），否則用全域設定
        const effImageSize = imageSizeOverride || imageSize;
        setPendingAutoDebg(autoRemoveBg);
        // LINE 貼圖去背走泛洪 chroma 主路：null = 非貼圖（用語意去背）；true/false = 貼圖有無白邊
        setPendingStickerBorder(stickerDebgBorder === undefined ? null : stickerDebgBorder);
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
            const resolvedAtlasRatio = aspectRatioOverride || imageAspectRatio || 'Original';
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
            let chosenRefSrc: string | null = null;
            for (const note of noteElements) {
                if (note.type === 'note' && (note as NoteElement).referenceImages) {
                    const refs = (note as NoteElement).referenceImages || [];
                    if (refStyleIndex !== undefined && refs[refStyleIndex]) {
                        chosenRefSrc = refs[refStyleIndex];
                    }
                }
            }
            for (const note of noteElements) {
                if (note.type === 'note' && (note as NoteElement).referenceImages) {
                    (note as NoteElement).referenceImages!.forEach(src => {
                        if (src && src !== chosenRefSrc) {
                            noteRefImgs.push(src);
                        }
                    });
                }
            }
            if (chosenRefSrc) {
                noteRefImgs.unshift(chosenRefSrc);
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
                const atlasQualityFrame = effImageSize === '4K' ? '4K' : '2K';
                try {
                    const generatePromises = frameElements.map(async (frame, idx) => {
                        let frameRatio = frame.aspectRatioLabel;
                        if (!['1:1', '3:4', '4:3', '9:16', '16:9'].includes(frameRatio)) frameRatio = '1:1';
                        let imgs: string[];
                        const frameSeed = baseSeed + idx;
                        if (hasNoteRefs && canDoImg2Img) {
                            // 有便利貼參考圖 → 用 img2img，以第一張參考圖為主
                            imgs = await withAtlasWaitToast(() => callAtlasImg2Img(atlasPrompt, atlasModel, atlasApiKey, noteRefImgs[0], 1, { ratio: frameRatio, quality: atlasQualityFrame, transparentBg: getTransparentBg(atlasPrompt || ''), seed: frameSeed }, noteRefImgs.slice(1)));
                        } else {
                            imgs = await withAtlasWaitToast(() => callAtlasGenerate(atlasPrompt, atlasModel, atlasApiKey, 1, { ratio: frameRatio, quality: atlasQualityFrame, transparentBg: getTransparentBg(atlasPrompt || ''), seed: frameSeed }));
                        }
                        if (imgs.length === 0) throw new Error('未收到圖片');
                        const newImageElement: ImageElement = { 
                            ...frame, 
                            type: 'image', 
                            src: imgs[0],
                            metadata: {
                                seed: frameSeed,
                                model: generationModel,
                                prompt: atlasPrompt
                            }
                        };
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
                const atlasQuality = effImageSize === '4K' ? '4K' : '2K';
                const atlasRatio = resolvedAtlasRatio;
                try {
                    // 便利貼參考圖追加在畫布圖片之後
                    const rawImages = await withAtlasWaitToast(() => callAtlasImg2Img(img2imgPrompt, atlasModel, atlasApiKey, refImage, count, { ratio: atlasRatio, quality: atlasQuality, transparentBg: getTransparentBg(atlasPrompt || ''), seed: baseSeed }, hasNoteRefs ? noteRefImgs : undefined));
                    if (rawImages.length === 0) throw new Error('未收到任何圖片');
                    // 若來源有透明背景，生成後自動還原透明
                    const images = refHadTransparency
                        ? await Promise.all(rawImages.map(img => restoreTransparencyFn(img, refBgColor).catch(() => img)))
                        : rawImages;
                    setGeneratedImages(images);
                    setGeneratedImagesMetadata(images.map((_, idx) => ({
                        seed: baseSeed + idx,
                        model: generationModel,
                        prompt: img2imgPrompt
                    })));
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
                const atlasQualityR = effImageSize === '4K' ? '4K' : '2K';
                const atlasRatioR = resolvedAtlasRatio;
                try {
                    const images = await withAtlasWaitToast(() => callAtlasImg2Img(atlasPrompt, atlasModel, atlasApiKey, noteRefImgs[0], count, { ratio: atlasRatioR, quality: atlasQualityR, transparentBg: getTransparentBg(atlasPrompt || ''), seed: baseSeed }, noteRefImgs.slice(1)));
                    if (images.length === 0) throw new Error('未收到任何圖片');
                    setGeneratedImages(images);
                    setGeneratedImagesMetadata(images.map((_, idx) => ({
                        seed: baseSeed + idx,
                        model: generationModel,
                        prompt: atlasPrompt
                    })));
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
            const atlasQuality2 = effImageSize === '4K' ? '4K' : '2K';
            const atlasRatio2 = (resolvedAtlasRatio === 'Original' || !resolvedAtlasRatio) ? '1:1' : resolvedAtlasRatio;
            try {
                const images = await withAtlasWaitToast(() => callAtlasGenerate(atlasPrompt, atlasModel, atlasApiKey, count, { ratio: atlasRatio2, quality: atlasQuality2, transparentBg: getTransparentBg(atlasPrompt || ''), seed: baseSeed }));
                if (images.length === 0) throw new Error('未收到任何圖片');
                setGeneratedImages(images);
                setGeneratedImagesMetadata(images.map((_, idx) => ({
                    seed: baseSeed + idx,
                    model: generationModel,
                    prompt: atlasPrompt
                })));
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
          if (refStyleIndex !== undefined) {
              const targetPos = noteRefImages.findIndex(r => r.idx === refStyleIndex);
              if (targetPos > -1) {
                  const [chosen] = noteRefImages.splice(targetPos, 1);
                  noteRefImages.unshift(chosen);
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
              const generatePromises = frameElements.map(async (frame, idx) => {
                  const promptText = `Generate an image based on this description: "${promptWithRefHint}".`;
                  const refParts = noteRefImages.map(r => ({ inlineData: { data: r.data, mimeType: r.mimeType } }));
                  const textPart = { text: promptText };
                  let targetRatio = frame.aspectRatioLabel;
                  if (!['1:1', '3:4', '4:3', '9:16', '16:9'].includes(targetRatio)) targetRatio = '1:1'; 
                  
                  const frameSeed = baseSeed + idx;
                  const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                    model: imageModel,
                    contents: { parts: [...refParts, textPart] },
                    config: { seed: frameSeed, imageConfig: { aspectRatio: targetRatio, imageSize: effImageSize } },
                  }));
                  const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                  if (part?.inlineData) {
                      const generatedSrc = `data:image/png;base64,${part.inlineData.data}`;
                      const newImageElement: ImageElement = { 
                          ...frame, 
                          type: 'image', 
                          src: generatedSrc,
                          metadata: {
                              seed: frameSeed,
                              model: 'gemini',
                              prompt: promptWithRefHint
                          }
                      };
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
          let targetAspectRatio = aspectRatioOverride || imageAspectRatio;
          if (targetAspectRatio === 'Original' && imageElements.length > 0) {
              const firstImage = imageElements[0];
              targetAspectRatio = getClosestAspectRatio(firstImage.width, firstImage.height);
          } else if (targetAspectRatio === 'Original') {
              targetAspectRatio = '1:1';
          }
          // Coerce to supported Gemini aspect ratios
          if (!['1:1', '3:4', '4:3', '9:16', '16:9'].includes(targetAspectRatio)) {
              if (targetAspectRatio === '4:5' || targetAspectRatio === '2:3') targetAspectRatio = '3:4';
              else if (targetAspectRatio === '3:2') targetAspectRatio = '4:3';
              else if (targetAspectRatio === '21:9') targetAspectRatio = '16:9';
              else targetAspectRatio = '1:1';
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

          const generateSingleImage = async (seedValue?: number) => {
            const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                model: imageModel,
                contents: { parts },
                config: { 
                    imageConfig: { 
                        aspectRatio: targetAspectRatio, 
                        imageSize: effImageSize,
                        ...(seedValue !== undefined ? { seed: seedValue } : {})
                    } 
                },
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
    
          const tasks = Array.from({ length: count }, (_, idx) => generateSingleImage(baseSeed + idx));
          const results = await Promise.all(tasks);
          let validImages = results.filter((img): img is string => img !== null);
          setGeneratedImages(validImages);
          setGeneratedImagesMetadata(validImages.map((_, idx) => ({
              seed: baseSeed + idx,
              model: 'gemini',
              prompt: imageElements.length > 0 ? (promptWithRefHint || "Creatively reimagine and enhance the image(s).") : (noteRefImages.length > 0 ? promptWithRefHint : finalInstructions)
          })));

        } catch (error: any) {
          handleAIError(error, "圖片生成");
        } finally {
          setGeneratingElementIds([]);
          setIsGenerating(false);
        }
      }, [imageStyle, imageAspectRatio, imageSize, preserveTransparency, setElements, showToast, setHasApiKey, apiKey, atlasApiKey, generationModelGlobal, prepareForGeneration, restoreTransparencyFn]);

    /**
     * 一鍵跨平台適配：1 張來源圖 → 依所選平台逐張重構（比例/安全區/智能擴圖）。
     * 對標 AI-Canvas：每平台 = 一個「參考圖 + prompt」的 img2img 重構,模型整張重生。
     * 優先用 Atlas（有明確比例控制）,沒有才退回 Gemini 參考圖路徑。結果排成一列放在原圖右側。
     */
    const handleCrossPlatformAdapt = useCallback(async (
        elementId: string,
        platformIds: string[],
        opts: { preserveSubject?: boolean; keepText?: boolean; model?: string; imageSize?: '2K' | '4K' } = {},
    ) => {
        const el = elements.find(e => e.id === elementId);
        if (!el || el.type !== 'image') { showToast('⚠️ 請先選擇一張圖片'); return; }
        const specs = platformIds.map(id => crossPlatformSpec(id)).filter(Boolean) as CrossPlatformSpec[];
        if (specs.length === 0) { showToast('⚠️ 請至少選一個平台'); return; }

        // 模型：以面板選的為主,沒帶則沿用全域生成模型
        const chosenModel = opts.model || generationModelGlobal;
        const useAtlas = chosenModel !== 'gemini' && !!atlasApiKey
            && atlasModelSupportsImg2Img(chosenModel as AtlasGenerationModel);
        if (chosenModel !== 'gemini' && !useAtlas) {
            showToast('⚠️ 選用的 Atlas 模型需要 Atlas Cloud Key 或不支援圖生圖,改用 Gemini');
        }
        if (!useAtlas && !apiKey) { setHasApiKey(false); showToast('⚠️ 跨平台適配需要 Gemini 或 Atlas API Key'); return; }

        const imgEl = el as ImageElement;
        let src = imgEl.src;
        if (!src.startsWith('data:')) src = await downloadImageAsBase64(src);
        if (!src.startsWith('data:')) { showToast('⚠️ 無法讀取來源圖片'); return; }

        setIsGenerating(true);
        setGeneratingElementIds([elementId]);

        // 結果排成一列放原圖右側,固定顯示高度、寬度依比例換算
        const ROW_H = 220;
        const gap = 24;
        let cursorX = imgEl.position.x + imgEl.width / 2 + 60;
        const baseTop = imgEl.position.y - imgEl.height / 2;

        try {
            for (let i = 0; i < specs.length; i++) {
                const spec = specs[i];
                showToast(`🎯 跨平台適配：${spec.name}（${i + 1}/${specs.length}）...`);
                const prompt = buildCrossPlatformPrompt(spec, opts);
                let resultSrc = '';
                try {
                    if (useAtlas) {
                        const atlasModel = chosenModel as AtlasGenerationModel;
                        // 跨平台適配用面板自己的解析度設定,不跟全域 imageSize。
                        // Atlas quality 只接受 2K/4K,1K（快）就近用 2K（沒有更低檔位）。
                        const quality = opts.imageSize === '4K' ? '4K' : '2K';
                        const images = await withAtlasWaitToast(() =>
                            callAtlasImg2Img(prompt, atlasModel, atlasApiKey!, src, 1, { ratio: spec.atlasRatio, quality }));
                        if (images.length > 0) resultSrc = images[0];
                    } else {
                        const genAI = new GoogleGenAI({ apiKey: apiKey! });
                        const [header, data] = src.split(',');
                        const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
                        const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                            model: imageModel,
                            contents: { parts: [{ inlineData: { data, mimeType } }, { text: `${prompt}\nOutput aspect ratio: ${spec.atlasRatio}.` }] },
                            config: { imageConfig: { aspectRatio: spec.atlasRatio, imageSize: opts.imageSize || imageSize } },
                        }));
                        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                        if (part?.inlineData) resultSrc = `data:image/png;base64,${part.inlineData.data}`;
                    }
                } catch (e) {
                    console.warn('[crossPlatform] 生成失敗', spec.id, e);
                    showToast(`⚠️ ${spec.name} 生成失敗,略過`);
                    continue;
                }
                if (!resultSrc) { showToast(`⚠️ ${spec.name} 未回傳圖片,略過`); continue; }

                // 用「結果圖的實際像素比例」定畫布寬高,而非規格假設比例——
                // 模型/Atlas 回傳的真實比例可能跟 spec.ratioValue 不同,用假設值會把圖拉伸壓扁。
                let realRatio = spec.ratioValue;
                try {
                    const im = await loadImage(resultSrc);
                    if (im.naturalWidth > 0 && im.naturalHeight > 0) realRatio = im.naturalWidth / im.naturalHeight;
                } catch { /* 載入失敗則沿用規格比例 */ }
                const h = ROW_H;
                const w = Math.round(ROW_H * realRatio);
                const newId = `xplatform_${Date.now()}_${i}`;
                const newEl: ImageElement = {
                    ...imgEl,
                    id: newId,
                    src: resultSrc,
                    name: `${imgEl.name} (${spec.name})`,
                    position: { x: cursorX + w / 2, y: baseTop + h / 2 },
                    width: w,
                    height: h,
                    rotation: 0,
                    zIndex: zIndexCounter.current++,
                    groupId: null,
                    isVisible: true,
                    isLocked: false,
                };
                setElements(prev => [...prev, newEl]);
                if (resultSrc.startsWith('data:')) cacheImage(newId, resultSrc);
                cursorX += w + gap;
            }
            showToast('✅ 跨平台適配完成！');
        } catch (error) {
            handleAIError(error, '跨平台適配');
        } finally {
            setGeneratingElementIds([]);
            setIsGenerating(false);
        }
    }, [elements, setElements, showToast, setHasApiKey, apiKey, atlasApiKey, generationModelGlobal, imageModel, imageSize, withAtlasWaitToast]);

    /**
     * 品牌視覺套件生成：依品牌簡報循序生成 5 張成品圖（主Logo、備用Logo、品牌視覺板、App圖示、應用預覽），並排放至右側。
     */
    const handleLogoBrandKit = useCallback(async (
        elementId: string,
        brief: LogoSkillConfig,
        modelOverride?: string,
        imageSizeOverride?: '1K' | '2K' | '4K',
    ) => {
        const el = elements.find(e => e.id === elementId);
        if (!el || (el.type !== 'note' && el.type !== 'text')) { showToast('⚠️ 無法定位來源內容'); return; }
        const content = el.type === 'note' ? (el as NoteElement).content : (el as TextElement).text;

        const chosenModel = modelOverride || generationModelGlobal;
        const useAtlas = chosenModel !== 'gemini' && !!atlasApiKey;
        if (!useAtlas && !apiKey) { setHasApiKey(false); showToast('⚠️ 品牌套件生成需要 Gemini 或 Atlas API Key'); return; }

        setIsGenerating(true);
        setGeneratingElementIds([elementId]);

        // 排成一列放原便利貼右側, 固定顯示高度
        const ROW_H = 220;
        const gap = 24;
        const noteEl = el as NoteElement | TextElement;
        let cursorX = noteEl.position.x + noteEl.width / 2 + 60;
        const baseTop = noteEl.position.y - noteEl.height / 2;
        const atlasModel = chosenModel as AtlasGenerationModel;
        const quality: '2K' | '4K' = imageSizeOverride === '4K' ? '4K' : '2K';

        // 把一張結果圖放上畫布（依實際像素比例定寬高），回傳是否成功
        const placeAsset = async (resultSrc: string, title: string, fallbackRatio: number, key: string): Promise<boolean> => {
            if (!resultSrc) return false;
            let realRatio = fallbackRatio;
            try {
                const im = await loadImage(resultSrc);
                if (im.naturalWidth > 0 && im.naturalHeight > 0) realRatio = im.naturalWidth / im.naturalHeight;
            } catch { /* 載入失敗則沿用規格比例 */ }
            const h = ROW_H;
            const w = Math.round(ROW_H * realRatio);
            const newId = `brandkit_${Date.now()}_${key}`;
            const newEl: ImageElement = {
                type: 'image', id: newId, src: resultSrc,
                name: `${brief.brandName || 'Brand'}（${title}）`,
                position: { x: cursorX + w / 2, y: baseTop + h / 2 },
                width: w, height: h, rotation: 0,
                zIndex: zIndexCounter.current++,
                groupId: null, isVisible: true, isLocked: false,
            };
            setElements(prev => [...prev, newEl]);
            if (resultSrc.startsWith('data:')) cacheImage(newId, resultSrc);
            cursorX += w + gap;
            return true;
        };

        try {
            const specs = LOGO_BRAND_OUTPUTS;
            const total = specs.length + 1; // 含主 Logo
            let successCount = 0;

            // ── Step 1：先獨立生成主 Logo（純文字創作，使用者最終要的標誌長相由這步決定）──
            showToast(`🎯 品牌視覺套件：主 Logo（1/${total}）...`);
            const logoAspect = brief.size || '1:1';
            const logoPrompt = buildLogoPrompt(content, brief);
            let logoSrc = '';
            try {
                if (useAtlas) {
                    const images = await withAtlasWaitToast(() =>
                        callAtlasGenerate(logoPrompt, atlasModel, atlasApiKey!, 1, { ratio: logoAspect, quality }));
                    if (images.length > 0) logoSrc = images[0];
                } else {
                    const genAI = new GoogleGenAI({ apiKey: apiKey! });
                    const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                        model: imageModel,
                        contents: { parts: [{ text: `${logoPrompt}\nOutput aspect ratio: ${logoAspect}.` }] },
                        config: { imageConfig: { aspectRatio: logoAspect, imageSize: imageSizeOverride || imageSize } },
                    }));
                    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                    if (part?.inlineData) logoSrc = `data:image/png;base64,${part.inlineData.data}`;
                }
            } catch (e) {
                console.warn('[logoBrandKit] 主 Logo 生成失敗', e);
            }
            if (!logoSrc) {
                showToast('❌ 主 Logo 生成失敗，品牌套件中止');
                return;
            }
            // Atlas 可能回傳 CDN URL，後續 img2img 需要 base64 才能當參考圖
            if (!logoSrc.startsWith('data:')) {
                try { logoSrc = await downloadImageAsBase64(logoSrc); } catch { /* 失敗則維持原樣 */ }
            }
            if (await placeAsset(logoSrc, '主 Logo', 1, 'logo')) successCount += 1;

            // ── Step 2：用選定的主 Logo 圖片當錨點，延伸生成其餘 4 個品牌資產 ──
            // 明確要求模型重用這個 EXACT 標誌，不要重新設計，確保整套套件用的是同一個 logo。
            for (let i = 0; i < specs.length; i++) {
                const spec = specs[i];
                showToast(`🎯 品牌視覺套件：${spec.title}（${i + 2}/${total}）...`);
                const prompt = buildLogoBrandPrompt(content, brief, spec, i, specs.length);
                let resultSrc = '';

                try {
                    if (useAtlas) {
                        if (atlasModelSupportsImg2Img(atlasModel)) {
                            const images = await withAtlasWaitToast(() =>
                                callAtlasImg2Img(prompt, atlasModel, atlasApiKey!, logoSrc, 1, { ratio: spec.aspectRatio, quality }));
                            if (images.length > 0) resultSrc = images[0];
                        } else {
                            // 模型不支援圖生圖 → 退回純文字（無法錨定同一標誌，至少能出圖）
                            const images = await withAtlasWaitToast(() =>
                                callAtlasGenerate(prompt, atlasModel, atlasApiKey!, 1, { ratio: spec.aspectRatio, quality }));
                            if (images.length > 0) resultSrc = images[0];
                        }
                    } else {
                        const genAI = new GoogleGenAI({ apiKey: apiKey! });
                        const parts: any[] = [];
                        if (logoSrc.startsWith('data:')) {
                            const [header, data] = logoSrc.split(',');
                            const mime = header.match(/data:(.*);base64/)?.[1] || 'image/png';
                            parts.push({ inlineData: { data, mimeType: mime } });
                        }
                        parts.push({ text: `${prompt}\nOutput aspect ratio: ${spec.aspectRatio}.` });
                        const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                            model: imageModel,
                            contents: { parts },
                            config: { imageConfig: { aspectRatio: spec.aspectRatio, imageSize: imageSizeOverride || imageSize } },
                        }));
                        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                        if (part?.inlineData) resultSrc = `data:image/png;base64,${part.inlineData.data}`;
                    }
                } catch (e) {
                    console.warn('[logoBrandKit] 生成失敗', spec.id, e);
                    showToast(`⚠️ ${spec.title} 生成失敗,略過`);
                    continue;
                }

                if (!resultSrc) { showToast(`⚠️ ${spec.title} 未回傳圖片,略過`); continue; }
                if (await placeAsset(resultSrc, spec.title, spec.ratioValue, String(i))) successCount += 1;
            }

            showToast(successCount > 1
                ? `✅ 品牌視覺套件生成完成！（${successCount}/${total} 張）`
                : successCount === 1
                    ? '⚠️ 只有主 Logo 生成成功，延伸資產皆失敗'
                    : '❌ 品牌視覺套件全部生成失敗，請稍後再試');
        } catch (error) {
            handleAIError(error, '品牌視覺套件');
        } finally {
            setGeneratingElementIds([]);
            setIsGenerating(false);
        }
    }, [elements, setElements, showToast, setHasApiKey, apiKey, atlasApiKey, generationModelGlobal, imageModel, imageSize, withAtlasWaitToast]);

    /**
     * 品牌視覺套件延伸：以用戶選定的主 Logo 圖片作為錨點，延伸生成其餘 4 個品牌資產。
     */
    const handleExtendBrandKit = useCallback(async (
        elementId: string,
        brief: LogoSkillConfig,
        modelOverride?: string,
        imageSizeOverride?: '1K' | '2K' | '4K',
        selectedAssetIds?: string[],
    ) => {
        const el = elements.find(e => e.id === elementId);
        if (!el || el.type !== 'image') { showToast('⚠️ 無法定位主 Logo 圖片'); return; }
        
        let logoSrc = (el as ImageElement).src;

        const chosenModel = modelOverride || generationModelGlobal;
        const useAtlas = chosenModel !== 'gemini' && !!atlasApiKey;
        if (!useAtlas && !apiKey) { setHasApiKey(false); showToast('⚠️ 品牌套件生成需要 Gemini 或 Atlas API Key'); return; }

        setIsGenerating(true);
        setGeneratingElementIds([elementId]);

        // 排成一列放原 Logo 圖片右側, 固定顯示高度
        const ROW_H = 220;
        const gap = 24;
        const logoImgEl = el as ImageElement;
        let cursorX = logoImgEl.position.x + logoImgEl.width / 2 + 60;
        const baseTop = logoImgEl.position.y - logoImgEl.height / 2;
        const atlasModel = chosenModel as AtlasGenerationModel;
        const quality: '2K' | '4K' = imageSizeOverride === '4K' ? '4K' : '2K';

        // 把一張結果圖放上畫布（依實際像素比例定寬高），回傳是否成功
        const placeAsset = async (resultSrc: string, title: string, fallbackRatio: number, key: string): Promise<boolean> => {
            if (!resultSrc) return false;
            let realRatio = fallbackRatio;
            try {
                const im = await loadImage(resultSrc);
                if (im.naturalWidth > 0 && im.naturalHeight > 0) realRatio = im.naturalWidth / im.naturalHeight;
            } catch { /* 載入失敗則沿用規格比例 */ }
            const h = ROW_H;
            const w = Math.round(ROW_H * realRatio);
            const newId = `brandkit_${Date.now()}_${key}`;
            const newEl: ImageElement = {
                type: 'image', id: newId, src: resultSrc,
                name: `${brief.brandName || 'Brand'}（${title}）`,
                position: { x: cursorX + w / 2, y: baseTop + h / 2 },
                width: w, height: h, rotation: 0,
                zIndex: zIndexCounter.current++,
                groupId: null, isVisible: true, isLocked: false,
            };
            setElements(prev => [...prev, newEl]);
            if (resultSrc.startsWith('data:')) cacheImage(newId, resultSrc);
            cursorX += w + gap;
            return true;
        };

        try {
            const allSpecs = LOGO_BRAND_OUTPUTS;
            const baseSpecs = selectedAssetIds
                ? allSpecs.filter(s => selectedAssetIds.includes(s.id))
                : allSpecs;

            // 支援自訂品牌資產動態生成
            const customSpecs: LogoBrandOutputSpec[] = (brief.customAssets || []).map((title, idx) => {
                return {
                    id: `custom_asset_${idx}_${Date.now()}`,
                    title: `自訂：${title}`,
                    aspectRatio: '4:3', // 預設使用 4:3 萬能樣機比例
                    ratioValue: 4 / 3,
                    note: `使用者自訂品牌應用 Mockup：${title}`,
                    guidance: [
                        `Generate a professional photo-studio quality mockup featuring a ${title} as the main subject.`,
                        `The approved logo from the reference image and the brand name "${brief.brandName}" must be clearly printed, embossed, or styled on the surface of the ${title} in a realistic way.`,
                        `Ensure clean studio background, realistic material texture (e.g., paper, fabric, ceramic, glass, or plastic), professional lighting, and perfect placement.`
                    ]
                };
            });

            const specs = [...baseSpecs, ...customSpecs];
            const total = specs.length;
            if (total === 0) { showToast('⚠️ 未選取或輸入任何品牌資產'); return; }
            let successCount = 0;

            // Atlas 可能回傳 CDN URL，後續 img2img 需要 base64 才能當參考圖
            if (!logoSrc.startsWith('data:')) {
                try { logoSrc = await downloadImageAsBase64(logoSrc); } catch { /* 失敗則維持原樣 */ }
            }

            // ── 用選定的主 Logo 圖片當錨點，延伸生成其餘選定的品牌資產 ──
            for (let i = 0; i < specs.length; i++) {
                const spec = specs[i];
                showToast(`🎯 品牌視覺套件：${spec.title}（${i + 1}/${total}）...`);
                const prompt = buildLogoBrandPrompt('', brief, spec, i, specs.length);
                let resultSrc = '';

                try {
                    if (useAtlas) {
                        if (atlasModelSupportsImg2Img(atlasModel)) {
                            const images = await withAtlasWaitToast(() =>
                                callAtlasImg2Img(prompt, atlasModel, atlasApiKey!, logoSrc, 1, { ratio: spec.aspectRatio, quality }));
                            if (images.length > 0) resultSrc = images[0];
                        } else {
                            // 模型不支援圖生圖 → 退回純文字
                            const images = await withAtlasWaitToast(() =>
                                callAtlasGenerate(prompt, atlasModel, atlasApiKey!, 1, { ratio: spec.aspectRatio, quality }));
                            if (images.length > 0) resultSrc = images[0];
                        }
                    } else {
                        const genAI = new GoogleGenAI({ apiKey: apiKey! });
                        const parts: any[] = [];
                        if (logoSrc.startsWith('data:')) {
                            const [header, data] = logoSrc.split(',');
                            const mime = header.match(/data:(.*);base64/)?.[1] || 'image/png';
                            parts.push({ inlineData: { data, mimeType: mime } });
                        }
                        parts.push({ text: `${prompt}\nOutput aspect ratio: ${spec.aspectRatio}.` });
                        const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                            model: imageModel,
                            contents: { parts },
                            config: { imageConfig: { aspectRatio: spec.aspectRatio, imageSize: imageSizeOverride || imageSize } },
                        }));
                        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                        if (part?.inlineData) resultSrc = `data:image/png;base64,${part.inlineData.data}`;
                    }
                } catch (e) {
                    console.warn('[logoBrandKit] 延伸生成失敗', spec.id, e);
                    showToast(`⚠️ ${spec.title} 生成失敗,略過`);
                    continue;
                }

                if (!resultSrc) { showToast(`⚠️ ${spec.title} 未回傳圖片,略過`); continue; }
                if (await placeAsset(resultSrc, spec.title, spec.ratioValue, String(i))) successCount += 1;
            }

            showToast(successCount > 0
                ? `✅ 品牌視覺套件延伸完成！（共生成 ${successCount}/${total} 張資產）`
                : '❌ 品牌視覺延伸資產全部生成失敗，請稍後再試');
        } catch (error) {
            handleAIError(error, '品牌視覺套件延伸');
        } finally {
            setGeneratingElementIds([]);
            setIsGenerating(false);
        }
    }, [elements, setElements, showToast, setHasApiKey, apiKey, atlasApiKey, generationModelGlobal, imageModel, imageSize, withAtlasWaitToast]);

    /**
     * 產品行銷組圖：以用戶選定的商品圖片作為錨點，延伸生成成套的行銷物料。
     */
    const handleProductMarketingSet = useCallback(async (
        elementId: string,
        brief: ProductMarketingBrief,
        modelOverride?: string,
        imageSizeOverride?: '1K' | '2K' | '4K',
        selectedRecipeIds?: string[],
        platformId: string = 'general_ecommerce',
    ) => {
        const el = elements.find(e => e.id === elementId);
        if (!el || el.type !== 'image') { showToast('⚠️ 無法定位產品圖片'); return; }
        
        let productSrc = (el as ImageElement).src;

        const chosenModel = modelOverride || generationModelGlobal;
        const useAtlas = chosenModel !== 'gemini' && !!atlasApiKey;
        if (!useAtlas && !apiKey) { setHasApiKey(false); showToast('⚠️ 產品行銷組圖生成需要 Gemini 或 Atlas API Key'); return; }

        setIsGenerating(true);
        setGeneratingElementIds([elementId]);

        // 1. base64 轉換移至最前面，以供後續分析及生圖共用
        if (!productSrc.startsWith('data:')) {
            try { productSrc = await downloadImageAsBase64(productSrc); } catch { /* 失敗則維持原樣 */ }
        }

        // 2. 進行風格預分析以抽取配色與氛圍錨點
        let sharedStyleAnchor = '';
        if (brief.lockStyleConsistency && apiKey && productSrc.startsWith('data:')) {
            showToast('🔍 正在分析商品風格，為成套行銷圖鎖定風格與色調...');
            try {
                const genAI = createAiClient();
                const [header, data] = productSrc.split(',');
                const mime = header.match(/data:(.*);base64/)?.[1] || 'image/png';
                const styleAnalysisPrompt = `Analyze this product image. In 2-3 concise bullet points, describe a suitable commercial visual design language for it. Specify: 1. A harmonious color palette (give 2-3 colors with hex codes if applicable). 2. Studio lighting style (e.g. soft diffuse, high contrast). 3. Background materials or visual textures (e.g. marble, matte wood, plain studio). Keep it short and in English. Output ONLY the bullet points.`;
                const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                    model: 'gemini-3.1-flash-lite',
                    contents: { parts: [{ inlineData: { data, mimeType: mime } }, { text: styleAnalysisPrompt }] }
                }));
                sharedStyleAnchor = response.text ? response.text.trim() : '';
            } catch (e) {
                console.warn('[productStyleAnalysis] 風格分析失敗，將使用默認風格設定進行生成', e);
            }
        }

        // 3. 風格一致性隨機種子碼
        const consistencySeed = brief.lockStyleConsistency
            ? Math.floor(Math.random() * 2147483647)
            : undefined;

        // 排成一列放原產品圖片右側, 固定顯示高度
        const ROW_H = 220;
        const gap = 24;
        const prodImgEl = el as ImageElement;
        let cursorX = prodImgEl.position.x + prodImgEl.width / 2 + 60;
        const baseTop = prodImgEl.position.y - prodImgEl.height / 2;
        const atlasModel = chosenModel as AtlasGenerationModel;
        const quality: '2K' | '4K' = imageSizeOverride === '4K' ? '4K' : '2K';

        // 把一張結果圖放上畫布（依實際像素比例定寬高），回傳是否成功
        const placeAsset = async (resultSrc: string, title: string, fallbackRatio: number, key: string): Promise<boolean> => {
            if (!resultSrc) return false;
            let realRatio = fallbackRatio;
            try {
                const im = await loadImage(resultSrc);
                if (im.naturalWidth > 0 && im.naturalHeight > 0) realRatio = im.naturalWidth / im.naturalHeight;
            } catch { /* 載入失敗則沿用規格比例 */ }
            const h = ROW_H;
            const w = Math.round(ROW_H * realRatio);
            const newId = `mktg_${Date.now()}_${key}`;
            const newEl: ImageElement = {
                type: 'image', id: newId, src: resultSrc,
                name: `${brief.productName || 'Product'}（${title}）`,
                position: { x: cursorX + w / 2, y: baseTop + h / 2 },
                width: w, height: h, rotation: 0,
                zIndex: zIndexCounter.current++,
                groupId: null, isVisible: true, isLocked: false,
            };
            setElements(prev => [...prev, newEl]);
            if (resultSrc.startsWith('data:')) cacheImage(newId, resultSrc);
            cursorX += w + gap;
            return true;
        };

        try {
            const platformSpec = PRODUCT_MARKETING_PLATFORMS[platformId];
            if (!platformSpec) { showToast('⚠️ 找不到指定的行銷平台設定'); return; }

            const allSpecs = platformSpec.recipes;
            const baseSpecs = selectedRecipeIds
                ? allSpecs.filter(s => selectedRecipeIds.includes(s.id))
                : allSpecs;

            // 支援自訂規格動態生成
            const customSpecs: ProductMarketingOutputSpec[] = (brief.customAssets || []).map((title, idx) => {
                return {
                    id: `custom_mktg_${idx}_${Date.now()}`,
                    title: `自訂：${title}`,
                    aspectRatio: '4:3', // 預設使用 4:3 萬能電商比例
                    ratioValue: 4 / 3,
                    note: `使用者自訂產品行銷 Mockup：${title}`,
                    guidance: [
                        `Generate a professional e-commerce product advertisement visual featuring a ${title} showcasing the product.`,
                        `The product from the reference image must be realistically placed and integrated in the scene.`,
                        `Maintain aesthetic studio lighting, clean background, and clear design layout.`
                    ]
                };
            });

            const specs = [...baseSpecs, ...customSpecs];
            const total = specs.length;
            if (total === 0) { showToast('⚠️ 未選取或輸入任何行銷規格'); return; }
            let successCount = 0;

            // ── 逐一調用 AI 模型生成 ──
            for (let i = 0; i < specs.length; i++) {
                const spec = specs[i];
                showToast(`🎯 產品行銷組圖：${spec.title}（${i + 1}/${total}）...`);
                const prompt = buildProductMarketingPrompt(brief, spec, i, specs.length, sharedStyleAnchor || undefined);
                let resultSrc = '';

                try {
                    if (useAtlas) {
                        if (atlasModelSupportsImg2Img(atlasModel)) {
                            const images = await withAtlasWaitToast(() =>
                                callAtlasImg2Img(prompt, atlasModel, atlasApiKey!, productSrc, 1, { ratio: spec.aspectRatio, quality, seed: consistencySeed }));
                            if (images.length > 0) resultSrc = images[0];
                        } else {
                            // 降級退回純文字生成
                            const images = await withAtlasWaitToast(() =>
                                callAtlasGenerate(prompt, atlasModel, atlasApiKey!, 1, { ratio: spec.aspectRatio, quality, seed: consistencySeed }));
                            if (images.length > 0) resultSrc = images[0];
                        }
                    } else {
                        const genAI = new GoogleGenAI({ apiKey: apiKey! });
                        const parts: any[] = [];
                        if (productSrc.startsWith('data:')) {
                            const [header, data] = productSrc.split(',');
                            const mime = header.match(/data:(.*);base64/)?.[1] || 'image/png';
                            parts.push({ inlineData: { data, mimeType: mime } });
                        }
                        parts.push({ text: `${prompt}\nOutput aspect ratio: ${spec.aspectRatio}.` });
                        const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                            model: imageModel,
                            contents: { parts },
                            config: {
                                imageConfig: {
                                    aspectRatio: spec.aspectRatio,
                                    imageSize: imageSizeOverride || imageSize,
                                    ...(consistencySeed !== undefined ? { seed: consistencySeed } : {})
                                }
                            },
                        }));
                        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                        if (part?.inlineData) resultSrc = `data:image/png;base64,${part.inlineData.data}`;
                    }
                } catch (e) {
                    console.warn('[productMarketingSet] 延伸生成失敗', spec.id, e);
                    showToast(`⚠️ ${spec.title} 生成失敗,略過`);
                    continue;
                }

                if (!resultSrc) { showToast(`⚠️ ${spec.title} 未回傳圖片,略過`); continue; }
                if (await placeAsset(resultSrc, spec.title, spec.ratioValue, String(i))) successCount += 1;
            }

            showToast(successCount > 0
                ? `✅ 產品行銷組圖生成完成！（共生成 ${successCount}/${total} 張資產）`
                : '❌ 行銷組圖資產全部生成失敗，請稍後再試');
        } catch (error) {
            handleAIError(error, '產品行銷組圖生成');
        } finally {
            setGeneratingElementIds([]);
            setIsGenerating(false);
        }
    }, [elements, setElements, showToast, setHasApiKey, apiKey, atlasApiKey, generationModelGlobal, imageModel, imageSize, withAtlasWaitToast]);

    return {
        createAiClient,
        isGenerating,
        setIsGenerating,
        generatingElementIds,
        setGeneratingElementIds,
        generatedImages,
        setGeneratedImages,
        generatedImagesMetadata,
        setGeneratedImagesMetadata,
        pendingAutoDebg,
        setPendingAutoDebg,
        pendingStickerBorder,
        restoreTransparencyFn,
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
        handleLocalUpscale,
        handleLocalRemoveBackground,
        genProgress,
        genOpType,
        handleGenerate,
        handleCrossPlatformAdapt,
        handleLogoBrandKit,
        handleExtendBrandKit,
        handleProductMarketingSet,
        handleAskAI
    };
};
