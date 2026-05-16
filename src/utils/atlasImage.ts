
/**
 * Atlas Cloud Image Generation Utility
 * Async polling pattern: POST → prediction_id → poll until completed
 */

const ATLAS_BASE_URL = 'https://api.atlascloud.ai/api/v1';
const POLL_INTERVAL_MS = 2500;
const MAX_WAIT_MS = 120000; // 2 minutes

export type AtlasGenerationModel = 'gpt-image-2' | 'seedream-v4.5' | 'seedream-v5' | 'flux-dev';

interface ModelConfig {
    // 文生圖
    id: string;
    useInputWrapper: boolean;
    // 圖生圖
    img2imgId?: string;
    img2imgUseInputWrapper?: boolean;
    img2imgImageParam?: string;   // 圖片欄位名稱
    img2imgImageIsArray?: boolean; // true = ['url'], false = 'url'
}

const MODEL_CONFIGS: Record<AtlasGenerationModel, ModelConfig> = {
    'gpt-image-2': {
        id: 'openai/gpt-image-2/text-to-image',
        useInputWrapper: false,
        img2imgId: 'openai/gpt-image-2/edit',
        img2imgUseInputWrapper: false,
        img2imgImageParam: 'images',
        img2imgImageIsArray: true,
    },
    'seedream-v4.5': {
        id: 'bytedance/seedream-v4.5/sequential',
        useInputWrapper: false,
        img2imgId: 'bytedance/seedream-v4.5/edit',
        img2imgUseInputWrapper: false,
        img2imgImageParam: 'images',
        img2imgImageIsArray: true,
    },
    'seedream-v5': {
        id: 'bytedance/seedream-v5.0-lite',
        useInputWrapper: false,
        img2imgId: 'bytedance/seedream-v5.0-lite/edit',
        img2imgUseInputWrapper: false,
        img2imgImageParam: 'images',
        img2imgImageIsArray: true,
    },
    'flux-dev': {
        id: 'black-forest-labs/flux-dev',
        useInputWrapper: true,
        img2imgId: 'black-forest-labs/flux-kontext-dev',
        img2imgUseInputWrapper: false, // 頂層格式，不需 input wrapper
        img2imgImageParam: 'image',    // 單數字串，非陣列
        img2imgImageIsArray: false,
    },
};

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

        const res = await fetch(`${ATLAS_BASE_URL}/model/prediction/${predictionId}`, {
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

function buildT2IBody(config: ModelConfig, prompt: string, extra?: Record<string, unknown>) {
    return config.useInputWrapper
        ? { model: config.id, input: { prompt, ...extra } }
        : { model: config.id, prompt, ...extra };
}

/** 文生圖：回傳 base64 陣列（count 張） */
export async function callAtlasGenerate(
    prompt: string,
    model: AtlasGenerationModel,
    atlasKey: string,
    count: number = 2
): Promise<string[]> {
    const config = MODEL_CONFIGS[model];
    const predIds = await Promise.all(
        Array.from({ length: count }, () =>
            postGeneration(buildT2IBody(config, prompt), atlasKey)
        )
    );
    const results = await Promise.all(predIds.map(id => pollPrediction(id, atlasKey)));
    return results.map(r => r[0]).filter(Boolean) as string[];
}

// ── 圖生圖 ─────────────────────────────────────────────

function buildI2IBody(config: ModelConfig, prompt: string, imageBase64: string, extra?: Record<string, unknown>) {
    const imgParam  = config.img2imgImageParam  ?? 'images';
    const isArray   = config.img2imgImageIsArray ?? true;
    const imgValue  = isArray ? [imageBase64] : imageBase64;

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
    count: number = 2
): Promise<string[]> {
    const config = MODEL_CONFIGS[model];
    if (!config.img2imgId) throw new Error(`${model} 不支援圖生圖`);

    const predIds = await Promise.all(
        Array.from({ length: count }, () =>
            postGeneration(buildI2IBody(config, prompt, referenceImageBase64), atlasKey)
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
    const res = await fetch(`${ATLAS_BASE_URL}/model/prediction/${predictionId}`, {
        headers: { Authorization: `Bearer ${atlasKey}` },
    });
    const json = await res.json();
    return JSON.stringify(json, null, 2);
}
