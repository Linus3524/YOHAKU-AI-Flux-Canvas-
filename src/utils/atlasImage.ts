
/**
 * Atlas Cloud Image Generation Utility
 * Async polling pattern: POST → prediction_id → poll until completed
 */

const ATLAS_BASE_URL = 'https://api.atlascloud.ai/api/v1';
const POLL_INTERVAL_MS = 2500;
const MAX_WAIT_MS = 120000; // 2 minutes

export type AtlasGenerationModel = 'gpt-image-2' | 'seedream-v4.5' | 'seedream-v5' | 'flux-dev';

/** Seedream v4.5 / v5 / Flux Dev — 8 種比例 × 2K/4K（使用 * 分隔符） */
export const ATLAS_SIZES: { ratio: string; label: string; w2k: string; w4k: string }[] = [
    { ratio: '1:1',  label: '1:1',  w2k: '2048*2048', w4k: '4096*4096' },
    { ratio: '4:3',  label: '4:3',  w2k: '2304*1728', w4k: '4704*3520' },
    { ratio: '3:4',  label: '3:4',  w2k: '1728*2304', w4k: '3520*4704' },
    { ratio: '16:9', label: '16:9', w2k: '2848*1600', w4k: '5504*3040' },
    { ratio: '9:16', label: '9:16', w2k: '1600*2848', w4k: '3040*5504' },
    { ratio: '3:2',  label: '3:2',  w2k: '2496*1664', w4k: '4992*3328' },
    { ratio: '2:3',  label: '2:3',  w2k: '1664*2496', w4k: '3328*4992' },
    { ratio: '21:9', label: '21:9', w2k: '3136*1344', w4k: '6240*2656' },
];

/** GPT Image 2 — 使用 x 分隔符，quality 控制解析度 */
export const GPT_SIZES: { ratio: string; label: string; w2k: string; w4k: string }[] = [
    { ratio: '1:1',  label: '1:1',  w2k: '1024x1024', w4k: '1024x1024' },
    { ratio: '4:3',  label: '4:3',  w2k: '1536x1024', w4k: '1536x1024' },
    { ratio: '3:4',  label: '3:4',  w2k: '1024x1536', w4k: '1024x1536' },
    { ratio: '16:9', label: '16:9', w2k: '2560x1440', w4k: '3840x2160' },
    { ratio: '9:16', label: '9:16', w2k: '1440x2560', w4k: '2160x3840' },
    { ratio: '3:2',  label: '3:2',  w2k: '1536x1024', w4k: '1536x1024' },
    { ratio: '2:3',  label: '2:3',  w2k: '1024x1536', w4k: '1024x1536' },
];

/** 依模型取對應的尺寸表（供 UI 使用） */
export function getModelSizes(model: AtlasGenerationModel) {
    return model === 'gpt-image-2' ? GPT_SIZES : ATLAS_SIZES;
}

interface ModelConfig {
    // 文生圖
    id: string;
    useInputWrapper: boolean;
    sizeParam?: string;           // API 尺寸欄位名稱（e.g. 'size', 'image_size'）
    useGptSizes?: boolean;        // true = 使用 GPT_SIZES（x 分隔）；false/undefined = ATLAS_SIZES（* 分隔）
    supportsBase64Output?: boolean; // 支援 enable_base64_output
    supportsQualityParam?: boolean; // 支援 quality: low/medium/high（GPT Image 2）
    extraParams?: Record<string, unknown>; // 固定附加參數
    // 圖生圖
    img2imgId?: string;
    img2imgUseInputWrapper?: boolean;
    img2imgImageParam?: string;
    img2imgImageIsArray?: boolean;
}

const MODEL_CONFIGS: Record<AtlasGenerationModel, ModelConfig> = {
    'gpt-image-2': {
        id: 'openai/gpt-image-2/text-to-image',
        useInputWrapper: false,
        sizeParam: 'size',
        useGptSizes: true,
        supportsBase64Output: true,
        supportsQualityParam: true,
        extraParams: { output_format: 'png' },
        img2imgId: 'openai/gpt-image-2/edit',
        img2imgUseInputWrapper: false,
        img2imgImageParam: 'images',
        img2imgImageIsArray: true,
    },
    'seedream-v4.5': {
        id: 'bytedance/seedream-v4.5/sequential',
        useInputWrapper: false,
        sizeParam: 'size',
        supportsBase64Output: true,
        img2imgId: 'bytedance/seedream-v4.5/edit',
        img2imgUseInputWrapper: false,
        img2imgImageParam: 'images',
        img2imgImageIsArray: true,
    },
    'seedream-v5': {
        id: 'bytedance/seedream-v5.0-lite',
        useInputWrapper: false,
        sizeParam: 'size',
        supportsBase64Output: true,
        img2imgId: 'bytedance/seedream-v5.0-lite/edit',
        img2imgUseInputWrapper: false,
        img2imgImageParam: 'images',
        img2imgImageIsArray: true,
    },
    'flux-dev': {
        id: 'black-forest-labs/flux-dev',
        useInputWrapper: true,
        sizeParam: 'size',
        supportsBase64Output: true,
        img2imgId: 'black-forest-labs/flux-kontext-dev',
        img2imgUseInputWrapper: false,
        img2imgImageParam: 'image',
        img2imgImageIsArray: false,
    },
};

/** ratio ('1:1' etc.) + quality ('2K'|'4K') + sizes table → size string */
function resolveSize(
    ratio: string,
    quality: '2K' | '4K',
    useGptSizes?: boolean,
): string | undefined {
    const table = useGptSizes ? GPT_SIZES : ATLAS_SIZES;
    const entry = table.find(s => s.ratio === ratio);
    if (!entry) return undefined;
    return quality === '4K' ? entry.w4k : entry.w2k;
}

interface AtlasPredictionData {
    id: string;
    status: string;
    output?: string | string[];
    outputs?: string | string[] | null;
    urls?: { get?: string };
    error?: string;
}

interface AtlasApiResponse {
    code?: number;
    message?: string;
    data?: AtlasPredictionData;
    id?: string;
    status?: string;
    output?: string | string[];
    error?: string;
}

async function blobToBase64(blob: Blob, fallback: string): Promise<string> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) || fallback);
        reader.onerror  = () => resolve(fallback);
        reader.readAsDataURL(blob);
    });
}

export async function downloadImageAsBase64(url: string): Promise<string> {
    if (url.startsWith('data:')) return url;

    // 1️⃣ 直接 CORS fetch
    try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await blobToBase64(await res.blob(), url);
    } catch { /* 繼續 */ }

    // 2️⃣ 自架 Vercel proxy（生產）or corsproxy.io（本機）
    const isLocal = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV === true;
    const proxyUrls = isLocal
        ? [`https://corsproxy.io/?url=${encodeURIComponent(url)}`]
        : [
            `/api/image-proxy?url=${encodeURIComponent(url)}`,
            `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
          ];

    for (const proxyUrl of proxyUrls) {
        try {
            const res = await fetch(proxyUrl);
            if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
            return await blobToBase64(await res.blob(), url);
        } catch { /* 繼續 */ }
    }

    // 3️⃣ 最後手段：直接用 URL（重新整理後可能失效）
    return url;
}

async function pollPrediction(predictionId: string, atlasKey: string): Promise<string[]> {
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_WAIT_MS) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

        const res = await fetch(`${ATLAS_BASE_URL}/model/result/${predictionId}`, {
            headers: { Authorization: `Bearer ${atlasKey}` },
        });

        if (!res.ok) throw new Error(`Atlas poll error: ${res.status}`);

        const json: AtlasApiResponse = await res.json();
        const pred = json.data ?? (json as unknown as AtlasPredictionData);
        const status = pred.status;

        if (status === 'completed' || status === 'succeeded' || status === 'success') {
            const rawOutput =
                pred.outputs ??
                pred.output ??
                (json as any).outputs ??
                (json as any).output ??
                (json as any).images ??
                null;

            let urls: string[] = [];
            const isValidOutput = (u: any): u is string =>
                typeof u === 'string' && (u.startsWith('http') || u.startsWith('data:'));

            if (Array.isArray(rawOutput)) {
                urls = rawOutput.filter(isValidOutput);
            } else if (typeof rawOutput === 'string' && isValidOutput(rawOutput)) {
                urls = [rawOutput];
            } else if (rawOutput && typeof rawOutput === 'object') {
                const inner = (rawOutput as any).images ?? (rawOutput as any).url ?? (rawOutput as any).urls;
                if (Array.isArray(inner)) urls = inner.filter((u: any) => typeof u === 'string');
                else if (typeof inner === 'string') urls = [inner];
            }

            if (urls.length === 0) {
                throw new Error(`completed 但找不到圖片 URL：${JSON.stringify(json).slice(0, 300)}`);
            }
            return Promise.all(urls.map(downloadImageAsBase64));
        }

        if (status === 'failed' || status === 'error') {
            throw new Error(`Atlas 生成失敗: ${pred.error || '未知錯誤'}`);
        }
    }

    throw new Error('Atlas 生成逾時（超過 2 分鐘），請稍後再試');
}

async function postGeneration(body: Record<string, unknown>, atlasKey: string): Promise<string> {
    const res = await fetch(`${ATLAS_BASE_URL}/model/generateImage`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${atlasKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Atlas 請求失敗 (${res.status}): ${errText}`);
    }

    const json: AtlasApiResponse = await res.json();
    const predId = json.data?.id ?? json.id;
    if (!predId) throw new Error(`Atlas 未回傳 prediction ID，回應：${JSON.stringify(json)}`);
    return predId;
}

// ── 文生圖 ─────────────────────────────────────────────

interface AtlasCallOptions {
    ratio?: string;       // '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '3:2' | '2:3' | '21:9'
    quality?: '2K' | '4K';
}

function qualityToGpt(q?: '2K' | '4K'): 'low' | 'medium' | 'high' {
    return q === '4K' ? 'high' : 'medium';
}

function buildT2IBody(config: ModelConfig, prompt: string, options?: AtlasCallOptions) {
    const extra: Record<string, unknown> = { ...(config.extraParams ?? {}) };
    if (config.sizeParam && options?.ratio) {
        const size = resolveSize(options.ratio, options.quality ?? '2K', config.useGptSizes);
        if (size) extra[config.sizeParam] = size;
    }
    if (config.supportsQualityParam) {
        extra['quality'] = qualityToGpt(options?.quality);
    }
    if (config.supportsBase64Output) {
        extra['enable_base64_output'] = true;
    }
    return config.useInputWrapper
        ? { model: config.id, input: { prompt, ...extra } }
        : { model: config.id, prompt, ...extra };
}

/** 文生圖：回傳 base64 陣列（count 張） */
export async function callAtlasGenerate(
    prompt: string,
    model: AtlasGenerationModel,
    atlasKey: string,
    count: number = 2,
    options?: AtlasCallOptions
): Promise<string[]> {
    const config = MODEL_CONFIGS[model];
    const predIds = await Promise.all(
        Array.from({ length: count }, () =>
            postGeneration(buildT2IBody(config, prompt, options), atlasKey)
        )
    );
    const results = await Promise.all(predIds.map(id => pollPrediction(id, atlasKey)));
    return results.map(r => r[0]).filter(Boolean) as string[];
}

// ── 圖生圖 ─────────────────────────────────────────────

function buildI2IBody(config: ModelConfig, prompt: string, imageBase64: string, options?: AtlasCallOptions) {
    const imgParam = config.img2imgImageParam  ?? 'images';
    const isArray  = config.img2imgImageIsArray ?? true;
    const imgValue = isArray ? [imageBase64] : imageBase64;
    const extra: Record<string, unknown> = { ...(config.extraParams ?? {}) };
    if (config.sizeParam && options?.ratio) {
        const size = resolveSize(options.ratio, options.quality ?? '2K', config.useGptSizes);
        if (size) extra[config.sizeParam] = size;
    }
    if (config.supportsQualityParam) {
        extra['quality'] = qualityToGpt(options?.quality);
    }
    if (config.supportsBase64Output) {
        extra['enable_base64_output'] = true;
    }
    return config.img2imgUseInputWrapper
        ? { model: config.img2imgId, input: { prompt, [imgParam]: imgValue, ...extra } }
        : { model: config.img2imgId, prompt, [imgParam]: imgValue, ...extra };
}

/** 某模型是否支援圖生圖 */
export function atlasModelSupportsImg2Img(model: AtlasGenerationModel): boolean {
    return !!MODEL_CONFIGS[model].img2imgId;
}

/** 圖生圖：傳入參考圖 base64，回傳生成結果 base64 陣列 */
export async function callAtlasImg2Img(
    prompt: string,
    model: AtlasGenerationModel,
    atlasKey: string,
    referenceImageBase64: string,
    count: number = 2,
    options?: AtlasCallOptions
): Promise<string[]> {
    const config = MODEL_CONFIGS[model];
    if (!config.img2imgId) throw new Error(`${model} 不支援圖生圖`);

    const predIds = await Promise.all(
        Array.from({ length: count }, () =>
            postGeneration(buildI2IBody(config, prompt, referenceImageBase64, options), atlasKey)
        )
    );
    const results = await Promise.all(predIds.map(id => pollPrediction(id, atlasKey)));
    return results.map(r => r[0]).filter(Boolean) as string[];
}

export function isValidAtlasKey(key: string): boolean {
    return key.startsWith('apikey-') && key.length > 10;
}

/** 除錯用：查詢已知 prediction ID */
export async function debugFetchPrediction(predictionId: string, atlasKey: string): Promise<string> {
    const res = await fetch(`${ATLAS_BASE_URL}/model/result/${predictionId}`, {
        headers: { Authorization: `Bearer ${atlasKey}` },
    });
    const json = await res.json();
    return JSON.stringify(json, null, 2);
}
