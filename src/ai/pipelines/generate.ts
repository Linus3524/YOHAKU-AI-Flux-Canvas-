/**
 * 主生成流的引擎葉子（純 TypeScript，無 React 依賴）
 *
 * handleGenerate 的分支編排（畫框/圖生圖/文生圖、畫廊、metadata）留在 hook；
 * 這裡只收斂「實際打引擎」的兩個葉子呼叫：
 *  - atlasBatch：Atlas 批次生成（有主參考圖走 img2img，否則純文字）
 *  - geminiGenerateImage：Gemini 單張生成（呼叫端自組 parts）
 *
 * 注意：seed 一律放 GenerateContentConfig 頂層（SDK 正確位置）。
 * 原 handleGenerate 通用路徑把 seed 塞在 imageConfig 內層（spread 繞過
 * excess property check、SDK 靜默忽略 → 主生成流自訂 seed / 每張 seed
 * 實際無效），收斂至此順帶修正；畫框路徑原本就正確、行為不變。
 */
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { callGeminiWithRetry } from '../../utils/helpers';
import { callAtlasGenerate, callAtlasImg2Img, type AtlasGenerationModel } from '../../utils/atlasImage';

export interface AtlasBatchOpts {
    prompt: string;
    count: number;
    /** Atlas ratio 參數（'1:1' / 'Original' 等，呼叫端已解析好） */
    ratio: string;
    /** 解析度（1K 就近取 2K） */
    imageSize?: '1K' | '2K' | '4K';
    seed?: number;
    /** 主參考圖（有值走 img2img；呼叫端負責 img2img 支援度判斷） */
    refImage?: string;
    /** 追加參考圖（img2img 的第 2 張起） */
    extraRefImages?: string[];
    transparentBg?: boolean;
}

export interface AtlasEngine {
    model: AtlasGenerationModel;
    apiKey: string;
    /** 長任務等待包裝（hook 注入 withAtlasWaitToast）；未提供則直接執行 */
    wait?: <T>(fn: () => Promise<T>) => Promise<T>;
}

/** Atlas 批次生成。回傳 images[]（可能為空，由呼叫端決定錯誤語意）。 */
export function atlasBatch(opts: AtlasBatchOpts, engine: AtlasEngine): Promise<string[]> {
    const quality: '2K' | '4K' = opts.imageSize === '4K' ? '4K' : '2K';
    const wait = engine.wait ?? (<T,>(fn: () => Promise<T>) => fn());
    const atlasOpts = { ratio: opts.ratio, quality, transparentBg: opts.transparentBg, seed: opts.seed };

    return opts.refImage
        ? wait(() => callAtlasImg2Img(opts.prompt, engine.model, engine.apiKey, opts.refImage!, opts.count, atlasOpts, opts.extraRefImages))
        : wait(() => callAtlasGenerate(opts.prompt, engine.model, engine.apiKey, opts.count, atlasOpts));
}

export interface GeminiGenerateOpts {
    /** 已組好的 parts（參考圖 inlineData + text；順序由呼叫端決定） */
    parts: any[];
    aspectRatio: string;
    imageSize?: '1K' | '2K' | '4K';
    seed?: number;
}

/** Gemini 單張生成。回傳第一個 inlineData 的 data URL；未回圖時回傳 null。 */
export async function geminiGenerateImage(
    opts: GeminiGenerateOpts,
    engine: { apiKey?: string | null; model?: string },
): Promise<string | null> {
    const genAI = new GoogleGenAI({ apiKey: engine.apiKey! });
    const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
        model: engine.model,
        contents: { parts: opts.parts },
        config: {
            ...(opts.seed !== undefined ? { seed: opts.seed } : {}),
            imageConfig: { aspectRatio: opts.aspectRatio, imageSize: opts.imageSize },
        },
    }));
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return part?.inlineData ? `data:image/png;base64,${part.inlineData.data}` : null;
}
