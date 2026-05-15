
/**
 * Atlas Cloud Image Generation Utility
 * Async polling pattern: POST → prediction_id → poll until completed
 */

const ATLAS_BASE_URL = 'https://api.atlascloud.ai/api/v1';
const POLL_INTERVAL_MS = 2500;
const MAX_WAIT_MS = 120000; // 2 minutes

export type AtlasGenerationModel = 'gpt-image-2' | 'seedream-v4.5' | 'seedream-v5' | 'flux-dev';

interface ModelConfig {
    id: string;
    useInputWrapper: boolean; // true = { input: { prompt } }, false = { prompt } 頂層
}

const MODEL_CONFIGS: Record<AtlasGenerationModel, ModelConfig> = {
    'gpt-image-2':   { id: 'openai/gpt-image-2/text-to-image',    useInputWrapper: false },
    'seedream-v4.5': { id: 'bytedance/seedream-v4.5/sequential',   useInputWrapper: false },
    'seedream-v5':   { id: 'bytedance/seedream-v5.0-lite',         useInputWrapper: true  },
    'flux-dev':      { id: 'black-forest-labs/flux-dev',           useInputWrapper: true  },
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
    // 相容舊格式（直接頂層）
    id?: string;
    status?: string;
    output?: string | string[];
    error?: string;
}

async function downloadImageAsBase64(url: string): Promise<string> {
    if (url.startsWith('data:')) return url; // 已是 base64，直接回傳
    try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            // 不管成功或失敗，reader 無法讀取時就退回 URL
            reader.onloadend = () => resolve((reader.result as string) || url);
            reader.onerror = () => resolve(url);
            reader.readAsDataURL(blob);
        });
    } catch {
        // CORS / 網路問題：直接用 URL，<img src> 仍可顯示
        return url;
    }
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
        // 相容 { data: {...} } 或直接頂層
        const pred = json.data ?? (json as unknown as AtlasPredictionData);
        const status = pred.status;

        if (status === 'completed' || status === 'succeeded' || status === 'success') {
            // 從各種可能欄位提取圖片 URL
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
        // pending / processing → 繼續輪詢
    }

    throw new Error('Atlas 生成逾時（超過 2 分鐘），請稍後再試');
}

async function submitGeneration(
    modelId: string,
    prompt: string,
    atlasKey: string,
    useInputWrapper: boolean,
    extraInput?: Record<string, unknown>
): Promise<string> {
    const body = useInputWrapper
        ? { model: modelId, input: { prompt, ...extraInput } }
        : { model: modelId, prompt, ...extraInput };

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
    // 相容 { data: { id } } 或直接頂層 { id }
    const predId = json.data?.id ?? json.id;
    if (!predId) throw new Error(`Atlas 未回傳 prediction ID，回應：${JSON.stringify(json)}`);
    return predId;
}

/**
 * Generate images using Atlas Cloud.
 * Returns array of base64 data URLs.
 */
export async function callAtlasGenerate(
    prompt: string,
    model: AtlasGenerationModel,
    atlasKey: string,
    count: number = 2
): Promise<string[]> {
    const { id: modelId, useInputWrapper } = MODEL_CONFIGS[model];

    // 所有模型都送 count 個獨立請求，各取第 1 張結果
    const predIds = await Promise.all(
        Array.from({ length: count }, () => submitGeneration(modelId, prompt, atlasKey, useInputWrapper))
    );
    const results = await Promise.all(predIds.map(id => pollPrediction(id, atlasKey)));
    return results.map(r => r[0]).filter(Boolean) as string[];
}

export function isValidAtlasKey(key: string): boolean {
    return key.startsWith('apikey-') && key.length > 10;
}

/** 除錯用：直接查詢已知 prediction ID 的完整回傳 JSON（不消耗額度） */
export async function debugFetchPrediction(predictionId: string, atlasKey: string): Promise<string> {
    const res = await fetch(`${ATLAS_BASE_URL}/model/prediction/${predictionId}`, {
        headers: { Authorization: `Bearer ${atlasKey}` },
    });
    const json = await res.json();
    return JSON.stringify(json, null, 2);
}
