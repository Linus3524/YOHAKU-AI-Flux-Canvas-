
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
    checkCompositionSimilarity
} from '../utils/helpers';
import { executeDynamicRemoval } from '../utils/DynamicBackgroundRemoval';
import { callAtlasGenerate, type AtlasGenerationModel } from '../utils/atlasImage';

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
}

export const useAI = ({ elements, setElements, selectedElementIds, showToast, setHasApiKey, apiKey, imageModel = 'gemini-3.1-flash-image-preview', atlasApiKey, generationModel = 'gemini' }: UseAIProps) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<string[] | null>(null);
    const [outpaintingState, setOutpaintingState] = useState<OutpaintingState | null>(null);
    const [copiedStyle, setCopiedStyle] = useState<{ analysis: import('../components/StylePasteModal').StyleAnalysisResult } | null>(null);
    const [imageStyle, setImageStyle] = useState<string>('Default');
    const [imageAspectRatio, setImageAspectRatio] = useState<string>('Original');
    const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
    const [preserveTransparency, setPreserveTransparency] = useState(true);
    const [showStyleLibrary, setShowStyleLibrary] = useState(false);
    const zIndexCounter = useRef(Math.max(0, ...elements.map(e => e.zIndex)) + 1);

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
                model: 'gemini-3.1-flash-lite-preview',
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
                model: 'gemini-3.1-flash-lite-preview',
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
        }
    }, [elements, showToast, apiKey, setHasApiKey]);

    const handleApplyStyle = useCallback(async (targetElementIds: string[], selectedKeys: string[]) => {
        if (!copiedStyle?.analysis) {
            showToast("沒有複製的風格！請先右鍵「複製風格」。");
            return;
        }
        const targetElements = elements.filter(el => targetElementIds.includes(el.id) && el.type === 'image') as ImageElement[];
        if (targetElements.length === 0) return;

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
                    const [header, data] = element.src.split(',');
                    const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
                    const imagePart = { inlineData: { data, mimeType } };

                    const transparencyOverride = preserveTransparency
                        ? `\n\n---FINAL OVERRIDE---\nThe input image has a transparent background. OUTPUT REQUIREMENT: Place the subject on a PURE WHITE (#FFFFFF) background. No gradients, no shadows behind subject, no environmental backgrounds.`
                        : '';

                    const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                        model: imageModel,
                        contents: { parts: [imagePart, { text: basePrompt + transparencyOverride }] },
                    }));

                    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                    if (part?.inlineData) {
                        const generatedSrc = `data:image/png;base64,${part.inlineData.data}`;
                        let finalSrc = generatedSrc;

                        if (preserveTransparency) {
                            try {
                                const similarity = await checkCompositionSimilarity(element.src, generatedSrc);
                                if (similarity > 0.75) {
                                    finalSrc = await restoreOriginalAlpha(element.src, generatedSrc);
                                } else {
                                    showToast("構圖已變化，正在重新去背...");
                                    finalSrc = await executeDynamicRemoval(generatedSrc, genAI, undefined, imageModel);
                                }
                            } catch (e) {
                                console.warn("Failed to restore transparency:", e);
                            }
                        }

                        setElements(prev => prev.map(el => el.id === element.id ? { ...el, src: finalSrc } : el));
                    }
                } catch (err: any) {
                    throw err;
                }
            }
            showToast("風格應用完成！✨");
        } catch (error) {
            handleAIError(error, "風格應用");
        } finally {
            setIsGenerating(false);
        }
    }, [copiedStyle, elements, setElements, preserveTransparency, showToast, setHasApiKey, apiKey]);

    // handlePasteStyle: 僅供 Style Library 預設風格使用（styleOverride 一定存在）
    const handlePasteStyle = useCallback(async (targetElementIds: string[], styleOverride?: string) => {
        const styleToApply = styleOverride;

        if (!styleToApply) {
            showToast("沒有指定風格！");
            return;
        }
        
        const targetElements = elements.filter(el => targetElementIds.includes(el.id) && el.type === 'image') as ImageElement[];
        if (targetElements.length === 0) return;

        setIsGenerating(true);
        showToast(`正在應用預設風格...`);
        setShowStyleLibrary(false);

        try {
            const genAI = createAiClient();
            
            for (const element of targetElements) {
                try {
                    const [header, data] = element.src.split(',');
                    const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
                    const imagePart = { inlineData: { data, mimeType } };

                    // Style library presets: styleOverride is always provided
                    const presetMatch = STYLE_PRESETS.find(s => s.label === styleToApply || s.name === styleToApply);
                    let prompt = presetMatch?.prompt
                        ? `${presetMatch.prompt} Maintain the original composition and subject placement.`
                        : `Transform this image into the following style: "${styleToApply}". Maintain the original composition.`;

                    const transparencyOverride = preserveTransparency
                        ? `\n\n---FINAL OVERRIDE (supersedes all instructions above)---\nThe input image has a transparent background.\nOUTPUT REQUIREMENT: Place the subject on a PURE WHITE (#FFFFFF) background.\nPROHIBITED: gradients, shadows behind subject, environmental backgrounds, textures, any non-white background.\nThis background requirement overrides all style instructions above.`
                        : '';

                    prompt = prompt + transparencyOverride;

                    const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                        model: imageModel,
                        contents: { parts: [imagePart, { text: prompt }] },
                    }));

                    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                    if (part?.inlineData) {
                        const generatedSrc = `data:image/png;base64,${part.inlineData.data}`;
                        let finalSrc = generatedSrc;
                        
                        if (preserveTransparency) {
                             try {
                                 const similarity = await checkCompositionSimilarity(element.src, generatedSrc);
                                 if (similarity > 0.75) {
                                     finalSrc = await restoreOriginalAlpha(element.src, generatedSrc);
                                 } else {
                                     showToast("構圖已變化，正在重新去背...");
                                     finalSrc = await executeDynamicRemoval(generatedSrc, genAI, undefined, imageModel);
                                 }
                             } catch (e) {
                                 console.warn("Failed to restore transparency for style transfer:", e);
                             }
                        }

                        setElements(prev => prev.map(el => el.id === element.id ? { ...el, src: finalSrc } : el));
                    }
                } catch (err: any) {
                    throw err; 
                }
            }
            showToast("風格應用完成！✨");

        } catch (error) {
            handleAIError(error, "風格應用");
        } finally {
            setIsGenerating(false);
        }
    }, [copiedStyle, elements, setElements, preserveTransparency, showToast, setHasApiKey, apiKey]);

    const handleCameraAngle = useCallback(async (anglePrompt: string) => {
        const targetElements = elements.filter(el => selectedElementIds.includes(el.id) && el.type === 'image') as ImageElement[];
        if (targetElements.length === 0) return;
    
        setIsGenerating(true);
        showToast(`正在轉換視角...`);
    
        try {
            const genAI = createAiClient();
            for (const element of targetElements) {
                const [header, data] = element.src.split(',');
                const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
                const imagePart = { inlineData: { data, mimeType } };
                
                const buildAnglePrompt = (targetPrompt: string): string => {
                    return `
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
                };

                const isIllustration = await detectIfIllustration(element.src);
                const forcePrompt = isIllustration 
                    ? `\nIMPORTANT: Even though this is a 2D illustration, you MUST apply 3D perspective transformation. Force the angle change even if it feels unnatural for 2D art. This is intentional.`
                    : '';

                const transparencyPrompt = preserveTransparency 
                    ? `\nCRITICAL: The input image has a transparent background. You MUST output the subject on a PURE WHITE background only. Do NOT add any gradients, shadows, textures, or environmental backgrounds. The subject must be perfectly isolated.`
                    : '';

                const basePrompt = buildAnglePrompt(anglePrompt) + forcePrompt + transparencyPrompt;
                
                let attempt = 0;
                let currentPrompt = basePrompt;
                let generatedSrc = '';
                
                while (attempt < 3) {
                    const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                        model: imageModel,
                        contents: { parts: [imagePart, { text: currentPrompt }] },
                    }));
                    
                    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                    if (!part?.inlineData) break;
                    
                    const resultSrc = `data:image/png;base64,${part.inlineData.data}`;
                    
                    const diff = await calculateImageDifference(element.src, resultSrc);
                    
                    if (diff > 0.15) {
                        generatedSrc = resultSrc;
                        break;
                    }
                    
                    attempt++;
                    if (attempt < 3) {
                        currentPrompt = `[ATTEMPT ${attempt+1}] PREVIOUS ATTEMPT FAILED — the result looked too similar to the input. You MUST make the perspective change MORE DRAMATIC and OBVIOUS. ` + basePrompt;
                        showToast(`視角變化不明顯，正在加強重試... (${attempt}/3)`);
                    } else {
                        generatedSrc = resultSrc; // Fallback to last attempt
                    }
                }
                
                if (generatedSrc) {
                    let finalSrc = generatedSrc;
                    
                    if (preserveTransparency) {
                        try {
                            const isTransparent = await hasTransparency(element.src);
                            if (isTransparent) {
                                const similarity = await checkCompositionSimilarity(element.src, generatedSrc);
                                if (similarity > 0.75) {
                                    finalSrc = await restoreOriginalAlpha(element.src, generatedSrc);
                                } else {
                                    showToast("構圖已變化，正在重新去背...");
                                    finalSrc = await executeDynamicRemoval(generatedSrc, genAI, undefined, imageModel);
                                }
                            } else {
                                finalSrc = await restoreOriginalAlpha(element.src, generatedSrc);
                            }
                        } catch (e) { 
                            console.warn("Transparency processing failed", e); 
                        }
                    }
                    
                    setElements(prev => prev.map(el => el.id === element.id ? { ...el, src: finalSrc } : el));
                }
            }
            showToast("視角轉換完成！✨");
        } catch (error) { 
            handleAIError(error, "視角轉換"); 
        } finally { 
            setIsGenerating(false); 
        }
    }, [selectedElementIds, elements, setElements, preserveTransparency, showToast, setHasApiKey, apiKey]);

    const handleRemoveBackground = useCallback(async (mode: string) => {
        const targetElements = elements.filter(el => selectedElementIds.includes(el.id) && el.type === 'image') as ImageElement[];
        if (targetElements.length === 0) return;
    
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
    
            let promptText = `Act as a professional VFX compositor. Harmonize this composite image. Adjust lighting and shadows to make it cohesive. Do NOT change composition.`;
            
            const userInstructions = instructionElements.map(el => {
                 if (el.type === 'note') return (el as NoteElement).content;
                 if (el.type === 'text') return (el as TextElement).text;
                 return '';
            }).join(' ').trim();

            if (userInstructions) {
                promptText += `\nIMPORTANT User Instructions: ${userInstructions}`;
            }

            const targetAspectRatio = getClosestAspectRatio(width, height);
    
            const genAI = createAiClient();
            const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                model: imageModel,
                contents: { parts: [imagePart, { text: promptText }] },
                config: { 
                    imageConfig: { aspectRatio: targetAspectRatio, imageSize: '2K' }
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

                const newElement: ImageElement = {
                    id: newId,
                    type: 'image',
                    src: finalSrc,
                    position: { x: baseElement.position.x, y: baseElement.position.y },
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

    const handleOutpaintingGenerate = useCallback(async (prompt: string) => {
        if (!outpaintingState) return;
        setIsGenerating(true);
        try {
            const { element, frame } = outpaintingState;
            
            const canvas = document.createElement('canvas');
            canvas.width = frame.width;
            canvas.height = frame.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Canvas context failed");
            
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const diffX = element.position.x - frame.position.x;
            const diffY = element.position.y - frame.position.y;
            const imgX = Math.round(centerX + diffX - element.width / 2);
            const imgY = Math.round(centerY + diffY - element.height / 2);
            
            const img = await loadImage(element.src);
            ctx.drawImage(img, imgX, imgY, element.width, element.height);
            
            ctx.fillStyle = 'rgba(255, 59, 48, 0.4)'; 
            ctx.beginPath();
            ctx.rect(0, 0, canvas.width, canvas.height); 
            ctx.rect(imgX, imgY, element.width, element.height); 
            ctx.fill('evenodd'); 
            
            const base64Data = canvas.toDataURL('image/png');
            const [header, data] = base64Data.split(',');
            const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
            const imagePart = { inlineData: { data, mimeType } };
  
            const textPrompt = `The semi-transparent red area indicates the empty space that needs to be filled. Seamlessly outpaint. ${prompt}`;
  
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
                const generatedSrc = `data:image/png;base64,${part.inlineData.data}`;
                
                // Create new ID for the outpainted image
                const newId = `${Date.now()}-outpainted`;
                // Calculate max Z-index safely
                const currentMaxZ = elements.length > 0 ? Math.max(...elements.map(e => e.zIndex)) : 0;

                const newElement: ImageElement = {
                    ...element,
                    id: newId,
                    src: generatedSrc,
                    width: frame.width,
                    height: frame.height,
                    position: frame.position, // Position matches the frame center
                    name: `${element.name} (Expanded)`,
                    zIndex: currentMaxZ + 1, // Place on top
                    groupId: null
                };

                // Add as NEW element instead of replacing
                setElements(prev => [...prev, newElement]);
                setOutpaintingState(null);
                showToast("擴圖完成！已新增為新圖層 ✨");
            }
        } catch (e: any) {
            handleAIError(e, "擴圖");
        } finally {
            setIsGenerating(false);
        }
    }, [outpaintingState, elements, setElements, showToast, setHasApiKey, apiKey]);
  
    const handleAutoPromptGenerate = useCallback(async (state: OutpaintingState): Promise<string> => {
        try {
            const genAI = createAiClient();
            const [header, data] = state.element.src.split(',');
            const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
            const imagePart = { inlineData: { data, mimeType } };
            
            const prompt = `Analyze this image and write a detailed prompt for Outpainting in Traditional Chinese (繁體中文). Describe the scene, lighting, and style to extend the image naturally. Output ONLY the prompt text.`;

            const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                model: 'gemini-3.1-flash-lite-preview',
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
        
        setIsGenerating(true);
        // Request higher resolution depending on factor
        const requestedResolution = factor >= 4 ? '4K' : '2K';
        showToast(`AI 正在運算中... 正在提升 ${factor} 倍解析度 (目標: ${requestedResolution})`);
        
        try {
            const genAI = createAiClient();
            const [header, data] = element.src.split(',');
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
                
                if (preserveTransparency) {
                     try {
                         const isTransparent = await hasTransparency(element.src);
                         
                         if (isTransparent) {
                             showToast("正在為放大後的圖片進行智慧去背...");
                             resultSrc = await executeDynamicRemoval(resultSrc, genAI, undefined, imageModel);
                         }
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
            setIsGenerating(false); 
        }
    }, [elements, selectedElementIds, setElements, showToast, setHasApiKey, apiKey, preserveTransparency]);

    const handleGenerate = useCallback(async (selectedElements: CanvasElement[]) => {
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

        // --- Atlas Cloud routing (GPT Image 2 / 即夢 Seedream) ---
        if (generationModel !== 'gemini') {
            if (imageElements.length > 0) {
                showToast("GPT Image 2 / 即夢模型僅支援文字生圖，請改用便利貼提示詞 ⚠️");
                return;
            }
            if (!atlasApiKey) {
                showToast("請先在設定中輸入 Atlas Cloud Key 🔑");
                return;
            }
            const prompt = noteElements.map(n => n.type === 'note' ? n.content : (n as TextElement).text).join(' ');
            setIsGenerating(true);
            setGeneratedImages(null);
            try {
                const images = await callAtlasGenerate(prompt, generationModel as AtlasGenerationModel, atlasApiKey, 2);
                if (images.length === 0) throw new Error('未收到任何圖片');
                setGeneratedImages(images);
            } catch (e: any) {
                showToast(`生成失敗：${e.message}`);
            } finally {
                setIsGenerating(false);
            }
            return;
        }

        // --- Gemini path (default) ---
        setIsGenerating(true);
        setGeneratedImages(null);
        
        try {
          const genAI = createAiClient();
          const instructions = noteElements.map(note => note.type === 'note' ? note.content : note.text).join(' \n');
          let finalInstructions = instructions;
          if (imageStyle && imageStyle !== 'Default') {
              const styleObj = STYLE_PRESETS.find(s => s.label === imageStyle || s.name === imageStyle);
              const styleLabel = styleObj ? styleObj.label : imageStyle;
              finalInstructions = instructions ? `${instructions}, ${styleLabel} Style` : `${styleLabel} Style`;
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
              setIsGenerating(false);
              return; 
          }
    
          let parts: ({ inlineData: { data: string; mimeType: string; }; } | { text: string; })[];
          let targetAspectRatio = imageAspectRatio;
          if (imageAspectRatio === 'Original' && imageElements.length > 0) {
              const firstImage = imageElements[0];
              targetAspectRatio = getClosestAspectRatio(firstImage.width, firstImage.height);
          } else if (imageAspectRatio === 'Original') {
              targetAspectRatio = '1:1';
          }
          
          if (imageElements.length > 0) {
              const imagePartsPromises = imageElements.map(async el => {
                  let src = '';
                  if (el.type === 'shape') src = await createShapeDataUrl(el as ShapeElement);
                  else if ('src' in el) src = (el as any).src;
                  
                  if (!src) return null;
                  const [header, data] = src.split(',');
                  const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
                  return { inlineData: { data, mimeType } };
              });
              const resolvedImageParts = (await Promise.all(imagePartsPromises)).filter(p => p !== null);
              
              const transparencyPrompt = preserveTransparency 
                  ? `CRITICAL: The input image has a transparent background. You MUST output the subject on a PURE WHITE background only. Do NOT add any gradients, shadows, textures, or environmental backgrounds. The subject must be perfectly isolated.\n\n`
                  : '';
              
              let promptForEditing = transparencyPrompt + (promptWithRefHint || "Creatively reimagine and enhance the image(s).");

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
                    
                    if (preserveTransparency && imageElements.length === 1) {
                         try {
                             const originalSrc = (imageElements[0] as ImageElement).src;
                             if (originalSrc) {
                                 const similarity = await checkCompositionSimilarity(originalSrc, resultSrc);
                                 if (similarity > 0.75) {
                                     resultSrc = await restoreOriginalAlpha(originalSrc, resultSrc);
                                 } else {
                                     showToast("構圖已變化，正在重新去背...");
                                     resultSrc = await executeDynamicRemoval(resultSrc, genAI, undefined, imageModel);
                                 }
                             }
                         } catch (e) {
                             console.warn("Failed to restore alpha for generated image", e);
                         }
                    }

                    return resultSrc;
                }
            }
            return null;
          };
    
          const [image1, image2] = await Promise.all([generateSingleImage(), generateSingleImage()]);
          let validImages = [image1, image2].filter((img): img is string => img !== null);
          setGeneratedImages(validImages);

        } catch (error: any) {
          handleAIError(error, "圖片生成");
        } finally {
          setIsGenerating(false);
        }
      }, [imageStyle, imageAspectRatio, preserveTransparency, setElements, showToast, setHasApiKey, apiKey, atlasApiKey, generationModel]);

    return {
        createAiClient,
        isGenerating,
        setIsGenerating,
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
