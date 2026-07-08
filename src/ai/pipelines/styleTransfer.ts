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
import { callAtlasImg2Img, downloadImageAsBase64, type AtlasGenerationModel } from '../../utils/atlasImage';
import { createGeminiClient } from '../geminiClient';
import { prepareImageForGeneration, restoreTransparency, type RestoreTransparencyKeys } from '../transparency';
import { isAtlasEngine, type ImageEngineConfig } from '../generateImage';

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
