
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import type { CanvasElement, ImageElement, NoteElement, TextElement, FrameElement, ShapeElement, DrawingElement, OutpaintingState } from '../types';
import {
    callGeminiWithRetry,
    loadImage,
    restoreOriginalAlpha,
    createShapeDataUrl,
    getClosestAspectRatio,
    STYLE_PRESETS,
    calculateImageDifference,
    checkCompositionSimilarity
} from '../utils/helpers';
import { executeDynamicRemoval } from '../utils/DynamicBackgroundRemoval';
import { callAtlasImg2Img, callAtlasInpaint, atlasModelSupportsImg2Img, downloadImageAsBase64, type AtlasGenerationModel } from '../utils/atlasImage';
import { createGeminiClient, classifyAIError } from '../ai/geminiClient';
import { prepareImageForGeneration, restoreTransparency } from '../ai/transparency';
import { generateOneImage, type ImageEngineConfig } from '../ai/generateImage';
import {
    analyzeCopiedStyle,
    buildCopiedStylePrompt,
    buildCameraAnglePrompt,
    buildPresetStylePrompt,
    generateCopiedStyleAssets,
    generatePresetStyleAssets,
    generateStyledImage,
} from '../ai/pipelines/styleTransfer';
import { analyzeBaseImageForCompositing } from '../ai/pipelines/analysis';
import { atlasBatch, geminiGenerateImage } from '../ai/pipelines/generate';
import { checkLocalModelReady, runLocalUpscalePipeline, runLocalRmbgPipeline } from '../ai/pipelines/localModels';
import { askAI } from '../ai/pipelines/chat';
import { generateOutpaintingPrompt } from '../ai/pipelines/outpainting';
import { type OnnxModelKey } from '../utils/onnxModelCache';
import { cacheImage } from '../utils/imageCache';
import { LogoSkillConfig } from '../skills/logo';
import { type ProductMarketingBrief } from '../skills/marketing';
import { applyPoissonBlend } from '../utils/poissonBlend';
import { runExtendBrandKitPipeline, runLogoBrandKitPipeline } from '../ai/pipelines/brandKit';
import { runProductMarketingPipeline } from '../ai/pipelines/productMarketing';
import { runCrossPlatformPipeline } from '../ai/pipelines/crossPlatform';
import { crossPlatformSpec, type CrossPlatformSpec } from '../skills/crossPlatform';

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
    setGeneratingLabels: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    pauseAutoSave: () => void;
    resumeAutoSave: () => void;
}

/** 透明背景一律由生成後去背產生；目前生成模型端不視為原生 Alpha 來源。 */
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

export const useAI = ({ elements, setElements, selectedElementIds, showToast, setHasApiKey, apiKey, imageModel = 'gemini-3.1-flash-image', atlasApiKey, generationModel: generationModelGlobal = 'gemini', falApiKey, setGeneratingLabels, pauseAutoSave, resumeAutoSave }: UseAIProps) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatingElementIds, setGeneratingElementIds] = useState<string[]>([]);
    // 設計大師「透明背景」：非 Seedream Pro 的本批生成圖在放入畫布時自動去背
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
    const [preserveTransparency, setPreserveTransparency] = useState(false);
    const [useCustomSeed, setUseCustomSeed] = useState<boolean>(false);
    const [customSeedValue, setCustomSeedValue] = useState<number | ''>('');
    const [showStyleLibrary, setShowStyleLibrary] = useState(false);
    const zIndexCounter = useRef(Math.max(0, ...elements.map(e => e.zIndex)) + 1);
    // AI 任務可能跨越數分鐘；期間使用者可重排、貼上或建立物件。
    // 每次畫布變更都把 AI 計數器往上同步，避免完成時使用啟動任務前的舊層級。
    useEffect(() => {
        const nextTop = Math.max(0, ...elements.filter(e => e.type !== 'artboard').map(e => e.zIndex)) + 1;
        if (zIndexCounter.current < nextTop) zIndexCounter.current = nextTop;
    }, [elements]);

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

    /** 生成前準備（薄包裝 → src/ai/transparency.ts 純函式；只綁 preserveTransparency 開關） */
    const prepareForGeneration = useCallback(
        (src: string) => prepareImageForGeneration(src, preserveTransparency),
        [preserveTransparency],
    );

    /** 生成後還原透明背景（薄包裝 → src/ai/transparency.ts；keys 由 hook 狀態注入） */
    const restoreTransparencyFn = useCallback(
        (resultSrc: string, bgColor: string) =>
            restoreTransparency(resultSrc, bgColor, { falApiKey, geminiApiKey: apiKey, imageModel }),
        [falApiKey, apiKey, imageModel],
    );

    // Helper to create client or throw error immediately（實作在 src/ai/geminiClient.ts）
    // Note: 這裡不 setHasApiKey(false)，避免 render-phase 副作用；錯誤由 handleAIError 統一處理。
    const createAiClient = () => createGeminiClient(apiKey);

    // Centralized error handler：分類邏輯在 src/ai/geminiClient.ts（純函式），
    // 這裡只執行 UI 副作用（toast / 標記 key 無效）
    const handleAIError = (error: any, contextMsg: string) => {
        console.error(`${contextMsg}:`, error);
        const classified = classifyAIError(error, contextMsg);
        if (classified.invalidatesKey) setHasApiKey(false);
        showToast(classified.userMessage);
    };

    const handleAskAI = useCallback(async (userPrompt: string): Promise<string> => {
        try {
            // 後台呼叫在 src/ai/pipelines/chat.ts
            return await askAI(userPrompt, apiKey);
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
            // 11 維度風格分析在 src/ai/pipelines/styleTransfer.ts（回傳鍵集與 StyleAnalysisResult 對齊）
            const analysis = await analyzeCopiedStyle(element.src, apiKey) as unknown as import('../components/StylePasteModal').StyleAnalysisResult;
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

        const analysis = copiedStyle.analysis as Record<string, string>;
        const basePrompt = buildCopiedStylePrompt(analysis, selectedKeys);
        if (!basePrompt) {
            showToast("所選元素在原圖中均不適用，請重新選擇。");
            setGeneratingElementIds([]);
            setIsGenerating(false);
            return;
        }

        try {
            // 單張後台流程（壓平→img2img→透明還原）在 src/ai/pipelines/styleTransfer.ts
            const useAtlas = generationModelGlobal !== 'gemini' && !!atlasApiKey && atlasModelSupportsImg2Img(generationModelGlobal as AtlasGenerationModel);
            const engine: ImageEngineConfig = {
                model: useAtlas ? generationModelGlobal : 'gemini',
                geminiApiKey: apiKey,
                atlasApiKey: useAtlas ? atlasApiKey : null,
                geminiImageModel: imageModel,
                imageSize,
                atlasWait: withAtlasWaitToast,
            };
            const transparencyKeys = { falApiKey, geminiApiKey: apiKey, imageModel };
            await generateCopiedStyleAssets({
                targetElements,
                stylePrompt: basePrompt,
                preserveTransparency,
                transparencyKeys,
                engine,
                onAsset: (element, finalSrc) => {
                    // 結果放在原圖右側 30px
                    setElements(prev => {
                        // 生成期間原圖可能已被移動/刪除 → 以畫布「當下」位置錨定；已刪除則退回捕獲位置
                        const anchor = prev.find(e => e.id === element.id) ?? element;
                        return [...prev, {
                            ...element,
                            id: `${element.id}_style_${Date.now()}`,
                            src: finalSrc,
                            position: { x: anchor.position.x + anchor.width / 2 + 30 + element.width / 2, y: anchor.position.y },
                            name: `${element.name || '圖片'} 風格`,
                            zIndex: (prev.length ? Math.max(...prev.map(e => e.zIndex)) : 0) + 1,
                        } as ImageElement];
                    });
                },
            });
            showToast("風格應用完成！✨");
        } catch (error) {
            handleAIError(error, "風格應用");
        } finally {
            setGeneratingElementIds([]);
            setIsGenerating(false);
        }
    }, [copiedStyle, elements, setElements, preserveTransparency, showToast, setHasApiKey, apiKey, falApiKey, imageModel, imageSize, generationModelGlobal, atlasApiKey, withAtlasWaitToast]);

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
            // 單張後台流程（壓平→img2img→透明還原）在 src/ai/pipelines/styleTransfer.ts；
            // Atlas / Gemini 兩條分支收斂為同一迴圈，引擎由 useAtlas 決定
            const stylePrompt = buildPresetStylePrompt(styleToApply);

            const engine: ImageEngineConfig = {
                model: useAtlas ? generationModelGlobal : 'gemini',
                geminiApiKey: apiKey,
                atlasApiKey: useAtlas ? atlasApiKey : null,
                geminiImageModel: imageModel,
                imageSize,
                atlasWait: withAtlasWaitToast,
            };
            const transparencyKeys = { falApiKey, geminiApiKey: apiKey, imageModel };

            await generatePresetStyleAssets({
                targetElements,
                stylePrompt,
                preserveTransparency,
                transparencyKeys,
                engine,
                onAsset: (element, finalSrc) => {
                    // 風格結果放在原圖右側 30px
                    setElements(prev => {
                        // 生成期間原圖可能已被移動/刪除 → 以畫布「當下」位置錨定；已刪除則退回捕獲位置
                        const anchor = prev.find(e => e.id === element.id) ?? element;
                        return [...prev, {
                            ...element,
                            id: `${element.id}_style_${Date.now()}`,
                            src: finalSrc,
                            position: { x: anchor.position.x + anchor.width / 2 + 30 + element.width / 2, y: anchor.position.y },
                            name: `${element.name || '圖片'} 風格`,
                            zIndex: (prev.length ? Math.max(...prev.map(e => e.zIndex)) : 0) + 1,
                        } as ImageElement];
                    });
                },
            });
            showToast("風格應用完成！✨");

        } catch (error) {
            handleAIError(error, "風格應用");
        } finally {
            setGeneratingElementIds([]);
            setIsGenerating(false);
        }
    }, [copiedStyle, elements, setElements, preserveTransparency, showToast, setHasApiKey, apiKey, generationModelGlobal, atlasApiKey, imageSize, imageModel, falApiKey, withAtlasWaitToast]);

    const handleCameraAngle = useCallback(async (anglePrompt: string) => {
        const targetElements = elements.filter(el => selectedElementIds.includes(el.id) && el.type === 'image') as ImageElement[];
        if (targetElements.length === 0) return;

        setGeneratingElementIds([targetElements[0].id]);
        setIsGenerating(true);
        showToast(`正在轉換視角...`);

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
            setElements(prev => {
                // 生成期間原圖可能已被移動/刪除 → 以畫布「當下」位置錨定；已刪除則退回捕獲位置
                const anchor = prev.find(e => e.id === element.id) ?? element;
                return [...prev, {
                    ...element,
                    id: `${element.id}_angle_${Date.now()}`,
                    src: finalSrc,
                    position: { x: anchor.position.x + anchor.width / 2 + GAP + newW / 2, y: anchor.position.y },
                    width: newW,
                    height: newH,
                    name: `${element.name || '圖片'} 視角`,
                    zIndex: (prev.length ? Math.max(...prev.map(e => e.zIndex)) : 0) + 1,
                } as ImageElement];
            });
        };

        // 是否走 Atlas（非 Gemini 模型 + 有 key + 支援 img2img）
        const useAtlas = generationModelGlobal !== 'gemini' && !!atlasApiKey && atlasModelSupportsImg2Img(generationModelGlobal as AtlasGenerationModel);

        try {
            // 單張後台流程（壓平→img2img→透明還原）在 src/ai/pipelines/styleTransfer.ts；
            // prompt 以函式延後組裝：需對「壓平後」的圖做插畫偵測再決定內容
            const engine: ImageEngineConfig = {
                model: useAtlas ? generationModelGlobal : 'gemini',
                geminiApiKey: apiKey,
                atlasApiKey: useAtlas ? atlasApiKey : null,
                geminiImageModel: imageModel,
                imageSize,
                atlasWait: withAtlasWaitToast,
            };
            const transparencyKeys = { falApiKey, geminiApiKey: apiKey, imageModel };

            for (const element of targetElements) {
                const finalSrc = await generateStyledImage({
                    srcImage: element.src,
                    stylePrompt: (flatSrc) => buildCameraAnglePrompt(anglePrompt, flatSrc),
                    preserveTransparency,
                    transparencyKeys,
                    atlasRatio: imageAspectRatio || 'Original',
                    omitImageConfig: true, // 視角轉換原始行為：Gemini 不帶 imageConfig
                }, engine);
                if (finalSrc) await placeResult(element, finalSrc);
            }
            showToast("視角轉換完成！✨");
        } catch (error) {
            handleAIError(error, "視角轉換");
        } finally {
            setGeneratingElementIds([]);
            setIsGenerating(false);
        }
    }, [selectedElementIds, elements, setElements, showToast, setHasApiKey, apiKey, imageModel, generationModelGlobal, atlasApiKey, imageAspectRatio, imageSize, preserveTransparency, falApiKey, withAtlasWaitToast]);

    const handleRemoveBackground = useCallback(async (mode: string) => {
        const targetElements = elements.filter(el => selectedElementIds.includes(el.id) && el.type === 'image') as ImageElement[];
        if (targetElements.length === 0) return;

        setGeneratingElementIds(targetElements.map(el => el.id));
        setIsGenerating(true);

        try {
            for (const element of targetElements) {
                 if (!element.src || element.src.length < 100) continue;

                try {
                    const processedSrc = await executeDynamicRemoval(element.src, {
                        model: generationModelGlobal,
                        geminiApiKey: apiKey,
                        atlasApiKey,
                        geminiImageModel: imageModel,
                        falApiKey,
                    }, showToast);
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
    }, [selectedElementIds, elements, setElements, showToast, apiKey, imageModel, generationModelGlobal, atlasApiKey, falApiKey]);

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
    
            // ── Pass 1：分析底圖視覺特徵（後台呼叫在 src/ai/pipelines/analysis.ts）──
            let baseAnalysis = '';
            try {
                baseAnalysis = await analyzeBaseImageForCompositing(baseElement.src, apiKey);
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

            // ── Pass 2：引擎葉子統一走 src/ai/pipelines/generate.ts ──
            let aiResultSrc = '';
            if (useAtlas) {
                // Atlas img2img 調和路徑
                const images = await atlasBatch(
                    { prompt: promptText, count: 1, ratio: 'Original', imageSize, refImage: base64 },
                    { model: generationModelGlobal as AtlasGenerationModel, apiKey: atlasApiKey!, wait: withAtlasWaitToast },
                );
                if (images.length > 0) aiResultSrc = images[0];
            } else {
                // Gemini 調和路徑（無 key 早退行為由 createAiClient 驗證）
                createAiClient();
                aiResultSrc = (await geminiGenerateImage(
                    { parts: [imagePart, { text: promptText }], aspectRatio: targetAspectRatio, imageSize },
                    { apiKey, model: imageModel },
                )) ?? '';
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
                const GAP = 30;
                const newElement: ImageElement = {
                    id: newId,
                    type: 'image',
                    src: finalSrc,
                    position: { x: 0, y: 0 }, // 佔位：實際位置在插入時以畫布當下的來源位置計算
                    width: width,
                    height: height,
                    rotation: baseElement.rotation,
                    zIndex: maxZ + 1,
                    isVisible: true,
                    isLocked: false,
                    name: 'Harmonized Image',
                    groupId: null
                };
                setElements(prev => {
                    // 調和期間原圖可能已被移動/刪除 → 以畫布「當下」的來源位置重算擺放點；已刪除者退回捕獲值
                    const liveVisual = visualElements.map(v => prev.find(e => e.id === v.id) ?? v);
                    const rightEdge = Math.max(...liveVisual.map(el => el.position.x + el.width / 2));
                    const liveBase = prev.find(e => e.id === baseElement.id) ?? baseElement;
                    return [...prev, {
                        ...newElement,
                        position: { x: rightEdge + GAP + width / 2, y: liveBase.position.y },
                    }];
                });
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

    const handleOutpaintingGenerate = useCallback(async (prompt: string, model: 'gemini' | 'gpt' | 'seedream-v5-pro' = 'gemini') => {
        if (!outpaintingState) return;
        const { element, frame } = outpaintingState;

        if (model !== 'gemini' && !atlasApiKey) {
            showToast('Atlas 擴圖需要 Atlas Cloud Key，請先於設定中輸入');
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

            if (model === 'gpt' || model === 'seedream-v5-pro') {
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
                const resultSrc = model === 'gpt'
                    ? await withAtlasWaitToast(() => callAtlasInpaint(outPrompt, compositeB64, maskB64, atlasApiKey!, undefined, undefined, undefined, `${outW}x${outH}`))
                    : (await withAtlasWaitToast(() => callAtlasImg2Img(
                        `${outPrompt} Extend only the transparent outer area. Preserve the existing subject and all visible details exactly.`,
                        'seedream-v5-pro', atlasApiKey!, compositeB64, 1,
                        { ratio: outRatio === 1 ? '1:1' : outRatio > 1 ? '16:9' : '9:16', quality: '2K' },
                    )))[0];
                if (!resultSrc) throw new Error('即夢擴圖沒有回傳圖片');
                
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
            return await generateOutpaintingPrompt(state, apiKey);
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
            // UPDATED PROMPT: Strict instructions to prevent distortion
            const prompt = `Task: High-fidelity image upscaling.
            Action: Upscale the image by ${factor}x.
            CRITICAL INSTRUCTION: Maintain the EXACT aspect ratio and geometry of the original subject content.
            Do NOT stretch, squeeze, or distort the image content to fit the aspect ratio container.
            If the container ratio differs slightly, extend the background naturally instead of distorting the subject.
            Enhance details and sharpness significantly while keeping the structure identical.`;

            // 單張後台流程（壓平→img2img→透明還原）在 src/ai/pipelines/styleTransfer.ts
            const engine: ImageEngineConfig = {
                model: useAtlas ? generationModelGlobal : 'gemini',
                geminiApiKey: apiKey,
                atlasApiKey: useAtlas ? atlasApiKey : null,
                geminiImageModel: imageModel,
                imageSize: requestedResolution,
                atlasWait: withAtlasWaitToast,
            };
            const resultSrc = await generateStyledImage({
                srcImage: element.src,
                stylePrompt: prompt,
                preserveTransparency,
                transparencyKeys: { falApiKey, geminiApiKey: apiKey, imageModel },
                atlasRatio: 'Original',
                geminiAspectRatio: getClosestAspectRatio(element.width, element.height), // 鎖比例防變形
            }, engine);

            if (resultSrc) {
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
                setElements(prev => {
                    // 放大期間原圖可能已被移動/刪除 → 以畫布「當下」位置錨定；已刪除則退回捕獲位置
                    const anchor = prev.find(e => e.id === element.id) ?? element;
                    return [...prev, { ...newElement, position: { x: anchor.position.x + 50, y: anchor.position.y + 50 } }];
                });
                showToast("放大完成！✨");
            }
        } catch (e: any) {
            handleAIError(e, "放大");
        } finally {
            setGeneratingElementIds([]);
            setIsGenerating(false);
        }
    }, [elements, selectedElementIds, setElements, showToast, setHasApiKey, apiKey, imageModel, generationModelGlobal, atlasApiKey, preserveTransparency, falApiKey, withAtlasWaitToast]);

    // ── 本機 ONNX 高清放大（pipeline 實作在 src/ai/pipelines/localModels.ts）──
    const handleLocalUpscale = useCallback(async (modelKey: OnnxModelKey, factor: number = 4) => {
        const element = elements.find(el => el.id === selectedElementIds[0]);
        if (!element || element.type !== 'image') return;

        const notReadyMsg = await checkLocalModelReady(modelKey);
        if (notReadyMsg) { showToast(notReadyMsg); return; }

        setGeneratingElementIds([element.id]);
        setGenProgress(0);   // 在元素 badge 上顯示確定進度條（取代每幾趴跳 toast）
        setGenOpType('upscale');
        setIsGenerating(true);
        try {
            const resultSrc = await runLocalUpscalePipeline(element.src, modelKey, factor, setGenProgress);

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
            setElements(prev => {
                // 放大期間原圖可能已被移動/刪除 → 以畫布「當下」位置錨定；已刪除則退回捕獲位置
                const anchor = prev.find(e => e.id === element.id) ?? element;
                return [...prev, { ...newElement, position: { x: anchor.position.x + 30, y: anchor.position.y + 30 } }];
            });
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

    // ── 本機 ONNX 去背（pipeline 實作在 src/ai/pipelines/localModels.ts）──
    const handleLocalRemoveBackground = useCallback(async () => {
        const element = elements.find(el => el.id === selectedElementIds[0]);
        if (!element || element.type !== 'image') return;

        const notReadyMsg = await checkLocalModelReady('bria_rmbg');
        if (notReadyMsg) { showToast(notReadyMsg); return; }

        setGeneratingElementIds([element.id]);
        setIsGenerating(true);
        setGenProgress(0);
        setGenOpType('rmbg');
        showToast('🔍 本機 AI 去背中 (ISNet)...');

        try {
            const resultSrc = await runLocalRmbgPipeline(element.src, setGenProgress);

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

    const handleGenerate = useCallback(async (selectedElements: CanvasElement[], count: 1 | 2 | 3 | 4 = 2, intentOverride?: string, modelOverride?: string, autoRemoveBg: boolean = false, aspectRatioOverride?: string, imageSizeOverride?: '1K' | '2K' | '4K', refStyleIndex?: number, refStyleScope?: 'all' | 'style-only', stickerDebgBorder?: boolean, customSeed?: number, transparentBgOverride = false) => {
        const generationModel = modelOverride || generationModelGlobal;
        const wantsTransparent = autoRemoveBg || transparentBgOverride;
        const baseSeed = customSeed !== undefined ? customSeed : Math.floor(Math.random() * 2147483647);
        // 解析度：呼叫端可覆寫（例：LINE 貼圖強制 4K 高解析），否則用全域設定
        const effImageSize = imageSizeOverride || imageSize;
        setPendingAutoDebg(wantsTransparent);
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
            // 引擎葉子統一走 src/ai/pipelines/generate.ts 的 atlasBatch
            const atlasEngine = { model: atlasModel, apiKey: atlasApiKey, wait: withAtlasWaitToast };

            // 畫框模式：每個畫框獨立生成並填入
            if (frameElements.length > 0) {
                if (!atlasPrompt) {
                    showToast("畫框需要便利貼提示詞才可生成 ⚠️");
                    return;
                }
                setGeneratingElementIds(frameElements.map(f => f.id));
                setIsGenerating(true);
                setGeneratedImages(null);
                try {
                    const generatePromises = frameElements.map(async (frame, idx) => {
                        let frameRatio = frame.aspectRatioLabel;
                        if (!['1:1', '3:4', '4:3', '9:16', '16:9'].includes(frameRatio)) frameRatio = '1:1';
                        const frameSeed = baseSeed + idx;
                        // 有便利貼參考圖且支援 img2img → 以第一張參考圖為主
                        const imgs = await atlasBatch({
                            prompt: atlasPrompt, count: 1, ratio: frameRatio, imageSize: effImageSize,
                            seed: frameSeed,
                            refImage: (hasNoteRefs && canDoImg2Img) ? noteRefImgs[0] : undefined,
                            extraRefImages: (hasNoteRefs && canDoImg2Img) ? noteRefImgs.slice(1) : undefined,
                        }, atlasEngine);
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

                // 除了主參考圖，畫布上其餘一併選取的圖片/手繪/形狀也要當額外參考圖送出，
                // 否則多選只有第一張真正被使用（callAtlasImg2Img 底層最多支援 8 張，這裡才是實際收集端）。
                const otherCanvasEls = imageElements.filter(el => el.id !== firstImg?.id);
                const otherCanvasRefs = (await Promise.all(otherCanvasEls.map(async (el) => {
                    try {
                        if (el.type === 'shape') return await createShapeDataUrl(el as ShapeElement);
                        let src = (el as ImageElement | DrawingElement).src;
                        if (!src) return null;
                        if (!src.startsWith('data:')) src = await downloadImageAsBase64(src);
                        return src.startsWith('data:') ? src : null;
                    } catch { return null; }
                }))).filter((s): s is string => !!s);
                const allExtraRefs = [...otherCanvasRefs, ...(hasNoteRefs ? noteRefImgs : [])];

                setGeneratingElementIds(imageElements.map(el => el.id));
                setIsGenerating(true);
                setGeneratedImages(null);
                try {
                    // 主參考圖 + 其餘畫布圖片 + 便利貼參考圖，一起送出
                    const rawImages = await atlasBatch({
                        prompt: img2imgPrompt, count, ratio: resolvedAtlasRatio, imageSize: effImageSize,
                        seed: baseSeed,
                        refImage, extraRefImages: allExtraRefs.length > 0 ? allExtraRefs : undefined,
                    }, atlasEngine);
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
                try {
                    const images = await atlasBatch({
                        prompt: atlasPrompt, count, ratio: resolvedAtlasRatio, imageSize: effImageSize,
                        seed: baseSeed,
                        refImage: noteRefImgs[0], extraRefImages: noteRefImgs.slice(1),
                    }, atlasEngine);
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
            try {
                const images = await atlasBatch({
                    prompt: atlasPrompt, count,
                    ratio: (resolvedAtlasRatio === 'Original' || !resolvedAtlasRatio) ? '1:1' : resolvedAtlasRatio,
                    imageSize: effImageSize,
                    seed: baseSeed,
                }, atlasEngine);
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
          createAiClient(); // 驗證 API Key（無 key 丟 MISSING_API_KEY → handleAIError 統一提示）
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
                  const generatedSrc = await geminiGenerateImage(
                      { parts: [...refParts, textPart], aspectRatio: targetRatio, imageSize: effImageSize, seed: frameSeed },
                      { apiKey, model: imageModel },
                  );
                  if (generatedSrc) {
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
            // 引擎葉子在 src/ai/pipelines/generate.ts；seed 由內層 imageConfig 移到
            // config 頂層（舊位置被 SDK 靜默忽略 → 自訂 seed / 每張 seed 一直無效）
            let resultSrc = await geminiGenerateImage(
                { parts, aspectRatio: targetAspectRatio, imageSize: effImageSize, seed: seedValue },
                { apiKey, model: imageModel },
            );
            if (resultSrc && firstElHadTransparency && imageElements.length === 1) {
                try {
                    resultSrc = await restoreTransparencyFn(resultSrc, firstElBgColor);
                } catch (e) {
                    console.warn("Failed to restore alpha for generated image", e);
                }
            }
            return resultSrc;
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
        opts: { preserveSubject?: boolean; keepText?: boolean; model?: string; imageSize?: '2K' | '4K'; seed?: number } = {},
    ) => {
        const el = elements.find(e => e.id === elementId);
        if (!el || el.type !== 'image') { showToast('⚠️ 請先選擇一張圖片'); return; }

        // 模型：以面板選的為主,沒帶則沿用全域生成模型
        const chosenModel = opts.model || generationModelGlobal;
        const useAtlas = chosenModel !== 'gemini' && !!atlasApiKey
            && atlasModelSupportsImg2Img(chosenModel as AtlasGenerationModel);
        if (chosenModel !== 'gemini' && !useAtlas) {
            showToast('⚠️ 選用的 Atlas 模型需要 Atlas Cloud Key 或不支援圖生圖,改用 Gemini');
        }
        if (!useAtlas && !apiKey) { setHasApiKey(false); showToast('⚠️ 跨平台適配需要 Gemini 或 Atlas API Key'); return; }

        const imgEl = el as ImageElement;
        const specs = platformIds.map(id => crossPlatformSpec(id)).filter(Boolean) as CrossPlatformSpec[];
        if (specs.length === 0) { showToast('⚠️ 請至少選擇一個平台'); return; }

        // 和魔法分層相同：先在來源圖右側建立每張結果的等待位置，
        // 生成完成後以相同 id 原位替換，避免全部完成前畫布沒有回饋。
        const rowHeight = 220;
        const gap = 24;
        const batchId = Date.now();
        const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
        let cursorX = imgEl.position.x + imgEl.width / 2 + 60;
        const baseTop = imgEl.position.y - imgEl.height / 2;
        const placeholders: ImageElement[] = specs.map((spec, index) => {
            const width = Math.round(rowHeight * spec.ratioValue);
            const placeholder: ImageElement = {
                ...imgEl,
                id: `${imgEl.id}_xplatform_${batchId}_${index}`,
                src: transparentPixel,
                name: `${spec.name}生成中`,
                position: { x: cursorX + width / 2, y: baseTop + rowHeight / 2 },
                width,
                height: rowHeight,
                rotation: 0,
                zIndex: zIndexCounter.current++,
                groupId: null,
                isVisible: true,
                isLocked: true,
            };
            cursorX += width + gap;
            return placeholder;
        });
        const placeholderIds = placeholders.map(item => item.id);

        setIsGenerating(true);
        pauseAutoSave();
        setElements(prev => [...prev, ...placeholders]);
        setGeneratingElementIds(placeholderIds);
        setGeneratingLabels(Object.fromEntries(placeholders.map((placeholder, index) => [
            placeholder.id,
            `等待中 0/${specs.length} · ${specs[index].name}`,
        ])));

        let completed = 0;
        try {
            // 引擎設定組裝一次，單張生成統一走 src/ai/generateImage.ts 原語
            const engine: ImageEngineConfig = {
                model: chosenModel,
                geminiApiKey: apiKey,
                atlasApiKey: useAtlas ? atlasApiKey : null, // 本 handler 的 Atlas 閘門（需支援 img2img）
                geminiImageModel: imageModel,
                imageSize: opts.imageSize || imageSize,
                atlasWait: withAtlasWaitToast,
            };
            await runCrossPlatformPipeline({
                sourceElement: imgEl,
                platformIds,
                opts,
                engine,
                nextZIndex: () => zIndexCounter.current++,
                onToast: showToast,
                onItemStart: (index, spec) => {
                    const placeholderId = placeholderIds[index];
                    setGeneratingLabels(prev => ({
                        ...prev,
                        [placeholderId]: `生成中 ${index + 1}/${specs.length} · ${spec.name}`,
                    }));
                },
                onItemFailed: (index) => {
                    const placeholderId = placeholderIds[index];
                    setElements(prev => prev.filter(item => item.id !== placeholderId));
                    setGeneratingElementIds(prev => prev.filter(id => id !== placeholderId));
                    setGeneratingLabels(prev => {
                        const { [placeholderId]: _removed, ...remaining } = prev;
                        return remaining;
                    });
                },
                onAsset: (newEl, index) => {
                    completed += 1;
                    const slot = placeholders[index];
                    const completedElement: ImageElement = {
                        ...newEl,
                        id: slot.id,
                        position: slot.position,
                        // 不裁切也不拉伸：完成後改用模型實際回傳比例。
                        width: newEl.width,
                        height: newEl.height,
                        zIndex: slot.zIndex,
                        isLocked: false,
                    };
                    setElements(prev => prev.map(item => item.id === slot.id ? completedElement : item));
                    setGeneratingElementIds(prev => prev.filter(id => id !== slot.id));
                    setGeneratingLabels(prev => {
                        const { [slot.id]: _completed, ...remaining } = prev;
                        return remaining;
                    });
                    if (completedElement.src.startsWith('data:')) cacheImage(completedElement.id, completedElement.src);
                },
            });
            showToast(`✅ 跨平台適配完成！${completed}/${specs.length} 張`);
        } catch (error) {
            handleAIError(error, '跨平台適配');
        } finally {
            // 只清除仍是透明圖的等待框；已完成並原位替換的圖片保留。
            setElements(prev => prev.filter(item => !placeholderIds.includes(item.id) || item.type !== 'image' || item.src !== transparentPixel));
            setGeneratingElementIds([]);
            setGeneratingLabels(prev => Object.fromEntries(Object.entries(prev).filter(([id]) => !placeholderIds.includes(id))));
            setIsGenerating(false);
            resumeAutoSave();
        }
    }, [elements, setElements, showToast, setHasApiKey, apiKey, atlasApiKey, generationModelGlobal, imageModel, imageSize, withAtlasWaitToast, setGeneratingLabels, pauseAutoSave, resumeAutoSave]);

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
        // 引擎設定組裝一次，單張生成統一走 src/ai/generateImage.ts 原語
        const engine: ImageEngineConfig = {
            model: chosenModel,
            geminiApiKey: apiKey,
            atlasApiKey: useAtlas ? atlasApiKey : null,
            geminiImageModel: imageModel,
            imageSize: imageSizeOverride || imageSize,
            atlasWait: withAtlasWaitToast,
        };

        try {
            const { successCount, total } = await runLogoBrandKitPipeline({
                sourceElement: el as NoteElement | TextElement,
                content,
                brief,
                engine,
                nextZIndex: () => zIndexCounter.current++,
                onToast: showToast,
                onAsset: (newEl) => {
                    setElements(prev => [...prev, newEl]);
                    if (newEl.src.startsWith('data:')) cacheImage(newEl.id, newEl.src);
                },
            });

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
        customSeed?: number,
    ) => {
        const el = elements.find(e => e.id === elementId);
        if (!el || el.type !== 'image') { showToast('⚠️ 無法定位主 Logo 圖片'); return; }
        
        let logoSrc = (el as ImageElement).src;

        const chosenModel = modelOverride || generationModelGlobal;
        const useAtlas = chosenModel !== 'gemini' && !!atlasApiKey;
        if (!useAtlas && !apiKey) { setHasApiKey(false); showToast('⚠️ 品牌套件生成需要 Gemini 或 Atlas API Key'); return; }

        setIsGenerating(true);
        setGeneratingElementIds([elementId]);
        // 引擎設定組裝一次，單張生成統一走 src/ai/generateImage.ts 原語
        const engine: ImageEngineConfig = {
            model: chosenModel,
            geminiApiKey: apiKey,
            atlasApiKey: useAtlas ? atlasApiKey : null,
            geminiImageModel: imageModel,
            imageSize: imageSizeOverride || imageSize,
            atlasWait: withAtlasWaitToast,
        };

        try {
            const { successCount, total } = await runExtendBrandKitPipeline({
                sourceElement: el as ImageElement,
                logoSrc,
                brief,
                engine,
                selectedAssetIds,
                customSeed,
                nextZIndex: () => zIndexCounter.current++,
                onToast: showToast,
                onAsset: (newEl) => {
                    setElements(prev => [...prev, newEl]);
                    if (newEl.src.startsWith('data:')) cacheImage(newEl.id, newEl.src);
                },
            });

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
        customSeed?: number,
    ) => {
        const el = elements.find(e => e.id === elementId);
        if (!el || el.type !== 'image') { showToast('⚠️ 無法定位產品圖片'); return; }
        
        let productSrc = (el as ImageElement).src;

        const chosenModel = modelOverride || generationModelGlobal;
        const useAtlas = chosenModel !== 'gemini' && !!atlasApiKey;
        if (!useAtlas && !apiKey) { setHasApiKey(false); showToast('⚠️ 產品行銷組圖生成需要 Gemini 或 Atlas API Key'); return; }

        setIsGenerating(true);
        setGeneratingElementIds([elementId]);
        // 引擎設定組裝一次，單張生成統一走 src/ai/generateImage.ts 原語
        const engine: ImageEngineConfig = {
            model: chosenModel,
            geminiApiKey: apiKey,
            atlasApiKey: useAtlas ? atlasApiKey : null,
            geminiImageModel: imageModel,
            imageSize: imageSizeOverride || imageSize,
            atlasWait: withAtlasWaitToast,
        };

        try {
            const { successCount, total } = await runProductMarketingPipeline({
                sourceElement: el as ImageElement,
                productSrc,
                brief,
                engine,
                selectedRecipeIds,
                platformId,
                customSeed,
                apiKey,
                nextZIndex: () => zIndexCounter.current++,
                onToast: showToast,
                onAsset: (newEl) => {
                    setElements(prev => [...prev, newEl]);
                    if (newEl.src.startsWith('data:')) cacheImage(newEl.id, newEl.src);
                },
            });

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
        useCustomSeed,
        setUseCustomSeed,
        customSeedValue,
        setCustomSeedValue,
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
