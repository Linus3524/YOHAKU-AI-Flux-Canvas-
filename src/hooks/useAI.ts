
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

interface UseAIProps {
    elements: CanvasElement[];
    setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>;
    selectedElementIds: string[];
    showToast: (msg: string) => void;
    setHasApiKey: (isValid: boolean) => void;
    apiKey?: string | null; 
}

export const useAI = ({ elements, setElements, selectedElementIds, showToast, setHasApiKey, apiKey }: UseAIProps) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<string[] | null>(null);
    const [outpaintingState, setOutpaintingState] = useState<OutpaintingState | null>(null);
    const [copiedStyle, setCopiedStyle] = useState<{ text: string, mode: 'texture' | 'artistic' } | null>(null);
    const [imageStyle, setImageStyle] = useState<string>('Default');
    const [imageAspectRatio, setImageAspectRatio] = useState<string>('Original');
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
                model: 'gemini-2.5-flash',
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

    const handleCopyStyle = useCallback(async (elementId: string, mode: 'texture' | 'artistic') => {
        const element = elements.find(el => el.id === elementId);
        if (!element || element.type !== 'image') return;

        setIsGenerating(true);
        showToast(mode === 'texture' ? "正在分析紋理風格..." : "正在深度分析藝術樣式...");
        
        try {
            const genAI = createAiClient();
            const [header, data] = element.src.split(',');
            const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
            const imagePart = { inlineData: { data, mimeType } };
            
            let prompt = "";
            if (mode === 'texture') {
                prompt = `Analyze ONLY the artistic rendering technique of this image — ignore colors, lighting, and subject matter completely.
Focus exclusively on: brushwork style, paint application method, texture quality, line characteristics, surface finish.
Output format: a comma-separated list of at least 8 specific technical descriptors.
Example format: "thick impasto strokes, visible bristle marks, layered glazing, rough canvas texture, gestural marks, dry brush edges, palette knife application, unblended pigment"
Do NOT include any color names, mood descriptions, or subject descriptions.`;
            } else {
                prompt = `Perform a comprehensive artistic style analysis of this image. Structure your response with these exact categories:
COLOR PALETTE: [describe dominant colors, temperature, saturation level]
LIGHTING: [describe light source, direction, quality, contrast]
ARTISTIC MEDIUM: [identify the medium — oil, watercolor, digital, etc.]
RENDERING STYLE: [describe brushwork, texture, level of detail]
MOOD & ATMOSPHERE: [describe emotional tone and visual atmosphere]
Provide 2-3 sentences per category. Be specific and technical.`;
            }

            const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [imagePart, { text: prompt }] },
            }));

            const styleDescription = response.text ? response.text.trim() : "";
            setCopiedStyle({ text: styleDescription, mode });
            
            showToast(mode === 'texture' ? "風格紋理已複製！" : "藝術樣式已複製！");

        } catch (error: any) {
            handleAIError(error, "風格分析");
        } finally {
            setIsGenerating(false);
        }
    }, [elements, showToast, apiKey, setHasApiKey]);

    const handlePasteStyle = useCallback(async (targetElementIds: string[], styleOverride?: string) => {
        const styleToApply = styleOverride || copiedStyle?.text;
        const mode = copiedStyle?.mode || 'texture'; 
        
        if (!styleToApply) {
            showToast("沒有複製的風格！請先複製或選擇預設風格。");
            return;
        }
        
        const targetElements = elements.filter(el => targetElementIds.includes(el.id) && el.type === 'image') as ImageElement[];
        if (targetElements.length === 0) return;

        setIsGenerating(true);
        showToast(`正在應用${mode === 'artistic' ? '藝術樣式' : '風格'}...`);
        setShowStyleLibrary(false);

        try {
            const genAI = createAiClient();
            
            for (const element of targetElements) {
                try {
                    const [header, data] = element.src.split(',');
                    const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
                    const imagePart = { inlineData: { data, mimeType } };

                    let prompt = "";
                    if (styleOverride) {
                        const presetMatch = STYLE_PRESETS.find(s => s.label === styleToApply || s.name === styleToApply);
                        if (presetMatch?.prompt) {
                            prompt = `${presetMatch.prompt} Maintain the original composition and subject placement.`;
                        } else {
                            prompt = `Transform this image into the following style: "${styleToApply}". Maintain the original composition.`;
                        }
                    } else if (mode === 'texture') {
                        prompt = `You are applying a texture/technique transfer. Follow these rules in strict priority order:

RULE 1 (HIGHEST PRIORITY — DO NOT VIOLATE):
The color palette, lighting direction, brightness, and subject structure of the input image must remain 100% identical. Do not shift any colors. Do not change any shadows or highlights.

RULE 2 (APPLY THIS):
Transform the surface rendering technique using this style: "${styleToApply}"
Change ONLY: brushwork, stroke texture, paint application method, surface finish.

RULE 3: The subject's position, proportions, and identity must not change.`;
                    } else {
                        prompt = `Reimagine this image in a new artistic style. Follow these rules:

TRANSFORM (change these freely):
- Color palette and tones → adopt from the style description below
- Lighting quality and mood → adopt from the style description below
- Artistic medium and rendering technique → adopt from the style description below

PRESERVE (do not change these):
- Subject position: the main subject must stay in the same location and occupy the same relative area
- Subject identity: the subject must remain recognizable as the same object/person
- Overall composition structure: foreground/background relationship must be maintained

STYLE TO APPLY:
${styleToApply}`;
                    }

                    const transparencyOverride = preserveTransparency 
                        ? `\n\n---FINAL OVERRIDE (supersedes all instructions above)---\nThe input image has a transparent background.\nOUTPUT REQUIREMENT: Place the subject on a PURE WHITE (#FFFFFF) background.\nPROHIBITED: gradients, shadows behind subject, environmental backgrounds, textures, any non-white background.\nThis background requirement overrides all style instructions above.`
                        : '';
                    
                    prompt = prompt + transparencyOverride;

                    const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                        model: 'gemini-3.1-flash-image-preview',
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
                                     finalSrc = await executeDynamicRemoval(generatedSrc, genAI);
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
                        model: 'gemini-3.1-flash-image-preview',
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
                                    finalSrc = await executeDynamicRemoval(generatedSrc, genAI);
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
                    const processedSrc = await executeDynamicRemoval(element.src, genAI, showToast);
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
                model: 'gemini-3.1-flash-image-preview',
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
                model: 'gemini-3.1-flash-image-preview',
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
                model: 'gemini-2.5-flash',
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
                model: 'gemini-3.1-flash-image-preview',
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
                             resultSrc = await executeDynamicRemoval(resultSrc, genAI);
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
    
          if (frameElements.length > 0) {
              const generatePromises = frameElements.map(async (frame) => {
                  const promptText = `Generate an image based on this description: "${finalInstructions}".`;
                  const textPart = { text: promptText };
                  let targetRatio = frame.aspectRatioLabel;
                  if (!['1:1', '3:4', '4:3', '9:16', '16:9'].includes(targetRatio)) targetRatio = '1:1'; 
                  
                  const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                    model: 'gemini-3.1-flash-image-preview',
                    contents: { parts: [textPart] },
                    config: { imageConfig: { aspectRatio: targetRatio } },
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
              
              let promptForEditing = transparencyPrompt + (finalInstructions || "Creatively reimagine and enhance the image(s).");
              
              const textPart = { text: promptForEditing };
              parts = [...resolvedImageParts as any, textPart];
          } else { 
              const promptText = `Generate a completely new image based on this description: "${finalInstructions}"`;
              const textPart = { text: promptText };
              parts = [textPart];
          }
          
          const generateSingleImage = async () => {
            const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                model: 'gemini-3.1-flash-image-preview',
                contents: { parts },
                config: { imageConfig: { aspectRatio: targetAspectRatio } },
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
                                     resultSrc = await executeDynamicRemoval(resultSrc, genAI);
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
      }, [imageStyle, imageAspectRatio, preserveTransparency, setElements, showToast, setHasApiKey, apiKey]);

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
        preserveTransparency,
        setPreserveTransparency,
        showStyleLibrary,
        setShowStyleLibrary,
        handleCopyStyle,
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
