/**
 * 風格轉移 pipeline（純 TypeScript，無 React 依賴）
 *
 * 從 useAI.ts 剝離的單張後台流程：
 *   生成前透明壓平 → 引擎 img2img（Atlas / Gemini）→ 生成後透明還原。
 * hook 端只負責：組 stylePrompt、逐元素迴圈、結果錨定插入畫布。
 *
 * 與 generateOneImage 的差異：風格轉移是 img2img 保持原圖比例 —— Gemini 不帶
 * aspectRatio 也不附「Output aspect ratio」提示；Atlas 沿用原本的 1:1 ratio 參數。
 */
import { GenerateContentResponse } from '@google/genai';
import { callGeminiWithRetry } from '../../utils/helpers';
import { STYLE_PRESETS } from '../../utils/helpers';
import { callAtlasImg2Img, downloadImageAsBase64, type AtlasGenerationModel } from '../../utils/atlasImage';
import { createGeminiClient } from '../geminiClient';
import { prepareImageForGeneration, restoreTransparency, type RestoreTransparencyKeys } from '../transparency';
import { isAtlasEngine, type ImageEngineConfig } from '../generateImage';
import type { ImageElement } from '../../types';
import { analyzeImageStyleFull } from './analysis';

export interface StyleTransferOpts {
    /** 原圖（data URL 或 http URL；Atlas 分支非 data: 時自動轉 base64） */
    srcImage: string;
    /**
     * 風格/轉換提示詞。可傳函式：以「壓平後」的圖為輸入延後組 prompt
     * （視角轉換需要對壓平圖做插畫偵測再決定 prompt 內容）。
     */
    stylePrompt: string | ((flatSrc: string) => Promise<string> | string);
    /** 開啟時：生成前壓平透明底、生成後三級去背還原 */
    preserveTransparency: boolean;
    /** 透明還原鏈用的 keys（BiRefNet / Gemini） */
    transparencyKeys: RestoreTransparencyKeys;
    /** Atlas 的 ratio 參數（預設 '1:1'；視角轉換傳面板比例如 'Original'） */
    atlasRatio?: string;
    /** true = Gemini 不帶 imageConfig（視角轉換的原始行為：完全交給模型） */
    omitImageConfig?: boolean;
    /** Gemini imageConfig 額外帶 aspectRatio（智能放大用：鎖定輸出比例防變形） */
    geminiAspectRatio?: string;
}

/**
 * 對單張圖做風格轉移。回傳成品 data URL / Atlas URL；引擎未回圖時回傳 null。
 * 引擎錯誤原樣拋出（維持「單張失敗 → 整批中止」的既有行為，由呼叫端 catch）。
 */
export async function generateStyledImage(
    opts: StyleTransferOpts,
    engine: ImageEngineConfig,
): Promise<string | null> {
    const { src: flatSrc, hadTransparency, bgColor } =
        await prepareImageForGeneration(opts.srcImage, opts.preserveTransparency);

    const prompt = typeof opts.stylePrompt === 'function'
        ? await opts.stylePrompt(flatSrc)
        : opts.stylePrompt;

    let result = '';
    if (isAtlasEngine(engine)) {
        let refImage = flatSrc;
        if (!refImage.startsWith('data:')) refImage = await downloadImageAsBase64(refImage);
        const quality: '2K' | '4K' = engine.imageSize === '4K' ? '4K' : '2K';
        const wait = engine.atlasWait ?? (<T,>(fn: () => Promise<T>) => fn());
        const images = await wait(() => callAtlasImg2Img(
            prompt, engine.model as AtlasGenerationModel, engine.atlasApiKey!,
            refImage, 1, { ratio: opts.atlasRatio ?? '1:1', quality },
        ));
        result = images[0] ?? '';
    } else {
        const genAI = createGeminiClient(engine.geminiApiKey); // 無 key 丟 MISSING_API_KEY（沿用既有錯誤分類）
        const [header, data] = flatSrc.split(',');
        const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
            model: engine.geminiImageModel,
            contents: { parts: [{ inlineData: { data, mimeType } }, { text: prompt }] },
            ...(opts.omitImageConfig ? {} : {
                config: {
                    imageConfig: {
                        imageSize: engine.imageSize,
                        ...(opts.geminiAspectRatio ? { aspectRatio: opts.geminiAspectRatio } : {}),
                    },
                },
            }),
        }));
        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (part?.inlineData) result = `data:image/png;base64,${part.inlineData.data}`;
    }

    if (!result) return null;

    if (hadTransparency) {
        try {
            result = await restoreTransparency(result, bgColor, opts.transparencyKeys);
        } catch (e) {
            console.warn('[styleTransfer] Failed to restore transparency:', e);
        }
    }
    return result;
}

export async function analyzeCopiedStyle(
    src: string,
    apiKey?: string | null,
): Promise<Record<string, string>> {
    return await analyzeImageStyleFull(src, apiKey);
}

export function buildCopiedStylePrompt(
    analysis: Record<string, string>,
    selectedKeys: string[],
): string | null {
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

    const selectedParts = selectedKeys
        .filter(k => analysis[k] && analysis[k].trim() !== '' && !analysis[k].toLowerCase().includes('not applicable'))
        .map(k => `${keyLabels[k]}: ${analysis[k]}`);

    if (selectedParts.length === 0) {
        // 所有欄位均不適用時，改用全部有值的欄位作 fallback，不直接失敗
        const fallbackParts = selectedKeys
            .filter(k => analysis[k] && analysis[k].trim() !== '')
            .map(k => `${keyLabels[k]}: ${analysis[k]}`);
        if (fallbackParts.length === 0) {
            return null;
        }
        selectedParts.push(...fallbackParts);
    }

    const styleDescription = selectedParts.join('\n');

    return `Apply a style transfer to this image based on the following specific elements. Only transform what is listed — anything not mentioned should remain as close to the original as possible.

STYLE ELEMENTS TO APPLY:
${styleDescription}

ALWAYS PRESERVE:
- Subject identity (the main subject must remain recognizable)
- Overall composition and spatial relationships between elements`;
}

export async function generateCopiedStyleAssets({
    targetElements,
    stylePrompt,
    preserveTransparency,
    transparencyKeys,
    engine,
    onAsset,
}: {
    targetElements: ImageElement[];
    stylePrompt: string;
    preserveTransparency: boolean;
    transparencyKeys: RestoreTransparencyKeys;
    engine: ImageEngineConfig;
    onAsset: (source: ImageElement, finalSrc: string) => void;
}): Promise<void> {
    for (const element of targetElements) {
        const finalSrc = await generateStyledImage(
            { srcImage: element.src, stylePrompt, preserveTransparency, transparencyKeys },
            engine,
        );
        if (finalSrc) onAsset(element, finalSrc);
    }
}

export function buildPresetStylePrompt(styleToApply: string): string {
    const presetMatch = STYLE_PRESETS.find(s => s.label === styleToApply || s.name === styleToApply);
    return presetMatch?.prompt
        ? `${presetMatch.prompt} Maintain the original composition and subject placement.`
        : `Transform this image into the following style: "${styleToApply}". Maintain the original composition.`;
}

export async function generatePresetStyleAssets({
    targetElements,
    stylePrompt,
    preserveTransparency,
    transparencyKeys,
    engine,
    onAsset,
}: {
    targetElements: ImageElement[];
    stylePrompt: string;
    preserveTransparency: boolean;
    transparencyKeys: RestoreTransparencyKeys;
    engine: ImageEngineConfig;
    onAsset: (source: ImageElement, finalSrc: string) => void;
}): Promise<void> {
    for (const element of targetElements) {
        const finalSrc = await generateStyledImage(
            { srcImage: element.src, stylePrompt, preserveTransparency, transparencyKeys },
            engine,
        );
        if (finalSrc) onAsset(element, finalSrc);
    }
}
