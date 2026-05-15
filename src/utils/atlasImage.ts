
/**
 * Atlas Cloud Image Generation Utility
 * Async polling pattern: POST → prediction_id → poll until completed
 */

const ATLAS_BASE_URL = 'https://api.atlascloud.ai/api/v1';
const POLL_INTERVAL_MS = 2500;
const MAX_WAIT_MS = 120000; // 2 minutes

export type AtlasGenerationModel = 'gpt-image-2' | 'seedream-v4.5';

const MODEL_IDS: Record<AtlasGenerationModel, string> = {
    'gpt-image-2': 'openai/gpt-image-2/text-to-image',
    'seedream-v4.5': 'bytedance/seedream-v4.5/sequential',
};

interface AtlasPrediction {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    output?: string | string[];
    error?: string;
}

async function downloadImageAsBase64(url: string): Promise<string> {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function pollPrediction(predictionId: string, atlasKey: string): Promise<string[]> {
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_WAIT_MS) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

        const res = await fetch(`${ATLAS_BASE_URL}/model/prediction/${predictionId}`, {
            headers: { Authorization: `Bearer ${atlasKey}` },
        });

        if (!res.ok) throw new Error(`Atlas poll error: ${res.status}`);

        const data: AtlasPrediction = await res.json();

        if (data.status === 'completed') {
            const outputs = Array.isArray(data.output) ? data.output : [data.output!];
            return Promise.all(outputs.filter(Boolean).map(downloadImageAsBase64));
        }

        if (data.status === 'failed') {
            throw new Error(`Atlas 生成失敗: ${data.error || '未知錯誤'}`);
        }
    }

    throw new Error('Atlas 生成逾時（超過 2 分鐘），請稍後再試');
}

async function submitGeneration(
    modelId: string,
    prompt: string,
    atlasKey: string,
    extraInput?: Record<string, unknown>
): Promise<string> {
    const res = await fetch(`${ATLAS_BASE_URL}/model/generateImage`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${atlasKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: modelId,
            input: { prompt, ...extraInput },
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Atlas 請求失敗 (${res.status}): ${errText}`);
    }

    const data = await res.json();
    if (!data.id) throw new Error('Atlas 未回傳 prediction ID');
    return data.id as string;
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
    const modelId = MODEL_IDS[model];

    if (model === 'seedream-v4.5') {
        // Sequential: one request returns multiple images
        const predId = await submitGeneration(modelId, prompt, atlasKey, { n: count });
        const images = await pollPrediction(predId, atlasKey);
        return images.slice(0, count);
    } else {
        // GPT Image 2: parallel individual requests
        const predIds = await Promise.all(
            Array.from({ length: count }, () => submitGeneration(modelId, prompt, atlasKey))
        );
        const results = await Promise.all(predIds.map(id => pollPrediction(id, atlasKey)));
        return results.map(r => r[0]).filter(Boolean);
    }
}

export function isValidAtlasKey(key: string): boolean {
    return key.startsWith('apikey-') && key.length > 10;
}
