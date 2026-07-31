/**
 * 雙引擎「生成單張圖」原語（純 TypeScript，無 React 依賴）
 *
 * useAI.ts 裡跨平台適配 / 品牌套件 / 品牌延伸 / 行銷組圖四個大 handler
 * 各自複製了一份幾乎相同的 Atlas-或-Gemini 引擎區塊（每份 ~40 行）。
 * 這裡收斂成一個原語：呼叫端只描述「prompt + 比例 + 參考圖 + seed」，
 * 引擎選擇 / 參數組裝 / 回傳解析全部在此。
 *
 * 注意：seed 一律放 GenerateContentConfig 頂層（SDK 正確位置）。
 * 原行銷組圖把 seed 塞進 imageConfig 內層（spread 繞過 excess property check、
 * SDK 靜默忽略 → seed 實際無效），收斂至此順帶修正。
 */
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { callGeminiWithRetry } from '../utils/helpers';
import {
    callAtlasGenerate,
    callAtlasImg2Img,
    atlasModelSupportsImg2Img,
    type AtlasGenerationModel,
} from '../utils/atlasImage';

export interface ImageEngineConfig {
    /** 'gemini' 或 Atlas 模型 id */
    model: string;
    geminiApiKey?: string | null;
    atlasApiKey?: string | null;
    /** Gemini 圖像模型 id（走 Gemini 分支時使用） */
    geminiImageModel?: string;
    /** 解析度（Gemini 直接用；Atlas 只有 2K/4K，1K 就近取 2K） */
    imageSize?: '1K' | '2K' | '4K';
    /**
     * Atlas 長任務等待包裝（hook 注入 withAtlasWaitToast 以定期提示使用者）。
     * 未提供則直接執行。
     */
    atlasWait?: <T>(fn: () => Promise<T>) => Promise<T>;
}

/** 此引擎設定是否會走 Atlas 分支 */
export function isAtlasEngine(engine: ImageEngineConfig): boolean {
    return engine.model !== 'gemini' && !!engine.atlasApiKey;
}

export interface GenerateOneImageOpts {
    prompt: string;
    /** 輸出比例，如 '1:1'、'16:9' */
    aspectRatio: string;
    /**
     * 參考圖（base64 data URL 或 Atlas 可讀 URL）。
     * Atlas：支援 img2img 的模型走圖生圖，否則退回純文字生成。
     * Gemini：僅在為 base64 data URL 時附為 inline 參考圖。
     */
    refImage?: string;
    seed?: number;
}

/**
 * 生成單張圖。回傳圖片（base64 data URL 或 Atlas CDN URL）；未回圖時回傳 ''。
 * 引擎錯誤原樣拋出，由呼叫端決定「單張略過」或「整批中止」。
 */
export async function generateOneImage(
    opts: GenerateOneImageOpts,
    engine: ImageEngineConfig,
): Promise<string> {
    const { prompt, aspectRatio, refImage, seed } = opts;

    if (isAtlasEngine(engine)) {
        const atlasModel = engine.model as AtlasGenerationModel;
        const quality: '2K' | '4K' = engine.imageSize === '4K' ? '4K' : '2K';
        const wait = engine.atlasWait ?? (<T,>(fn: () => Promise<T>) => fn());
        const atlasOpts = { ratio: aspectRatio, quality, seed };

        const images = (refImage && atlasModelSupportsImg2Img(atlasModel))
            ? await wait(() => callAtlasImg2Img(prompt, atlasModel, engine.atlasApiKey!, refImage, 1, atlasOpts))
            : await wait(() => callAtlasGenerate(prompt, atlasModel, engine.atlasApiKey!, 1, atlasOpts));
        return images[0] ?? '';
    }

    // ── Gemini 分支 ──
    const genAI = new GoogleGenAI({ apiKey: engine.geminiApiKey! });
    const parts: any[] = [];
    if (refImage?.startsWith('data:')) {
        const [header, data] = refImage.split(',');
        const mime = header.match(/data:(.*);base64/)?.[1] || 'image/png';
        parts.push({ inlineData: { data, mimeType: mime } });
    }
    const geminiSupportedRatios = new Set(['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9']);
    const ratioSupported = geminiSupportedRatios.has(aspectRatio);
    const geminiAspectRatio = ratioSupported ? aspectRatio : '16:9';

    // 比例後綴只在「參數層表達不了」時才加。
    // imageConfig.aspectRatio 只吃上面九種，遇到 21:9 / 2.6:1 / 3:1 這類會被夾成
    // 16:9，這時唯一能傳達真實比例的管道就是文字 —— 那也是這段後綴當初被加進來的原因
    // （跨平台適配）。但支援的比例本來就由參數精準表達，再接一句英文只會污染
    // 使用者/設計大師寫的 prompt（被當成畫面文字、稀釋前文權重），故不再無條件附加。
    parts.push({ text: ratioSupported ? prompt : `${prompt}\nOutput aspect ratio: ${aspectRatio}.` });
    const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
        model: engine.geminiImageModel,
        contents: { parts },
        config: {
            ...(seed !== undefined ? { seed } : {}),
            imageConfig: { aspectRatio: geminiAspectRatio, imageSize: engine.imageSize },
        },
    }));
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return part?.inlineData ? `data:image/png;base64,${part.inlineData.data}` : '';
}
