/**
 * ONNX 模型下載 & IndexedDB 快取管理
 * 首次下載後存入 IndexedDB，之後直接從快取載入（無需重新下載）
 */
import { get, set, del } from 'idb-keyval';
import * as ort from 'onnxruntime-web';

// 使用 single-thread WASM，不需要 COEP/COOP header
ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = '/';

export type OnnxModelKey = 'lama' | 'sam2_encoder' | 'sam2_decoder';

export interface ModelConfig {
    key: OnnxModelKey;
    name: string;
    description: string;
    url: string;
    cacheKey: string;
    sizeMB: number;
}

export const MODEL_CONFIGS: Record<OnnxModelKey, ModelConfig> = {
    lama: {
        key: 'lama',
        name: 'LaMa（物件移除填洞）',
        description: '移除物件後智能補全背景，效果接近 Photoshop 內容感知填充',
        url: 'https://huggingface.co/Carve/LaMa-ONNX/resolve/main/lama_fp32.onnx',
        cacheKey: 'onnx_lama_fp32_v1',
        sizeMB: 60,
    },
    sam2_encoder: {
        key: 'sam2_encoder',
        name: 'SAM 2 Encoder',
        description: 'Segment Anything Model 2 — 圖片特徵提取',
        url: 'https://huggingface.co/vietanhdev/segment-anything-2-onnx-models/resolve/main/sam2_hiera_tiny.encoder.onnx',
        cacheKey: 'onnx_sam2_encoder_tiny_v1',
        sizeMB: 30,
    },
    sam2_decoder: {
        key: 'sam2_decoder',
        name: 'SAM 2 Decoder',
        description: 'Segment Anything Model 2 — 點選分割輸出',
        url: 'https://huggingface.co/vietanhdev/segment-anything-2-onnx-models/resolve/main/sam2_hiera_tiny.decoder.onnx',
        cacheKey: 'onnx_sam2_decoder_tiny_v1',
        sizeMB: 10,
    },
};

// 模型狀態
export type ModelStatus = 'not_downloaded' | 'downloading' | 'ready' | 'error';

export interface ModelState {
    status: ModelStatus;
    progress: number;   // 0–100
    error?: string;
}

/** 取得目前快取狀態（有快取 = ready，否則 not_downloaded） */
export async function getModelStatus(key: OnnxModelKey): Promise<ModelStatus> {
    try {
        const cached = await get<ArrayBuffer>(MODEL_CONFIGS[key].cacheKey);
        return cached ? 'ready' : 'not_downloaded';
    } catch {
        return 'not_downloaded';
    }
}

/** 下載模型並快取到 IndexedDB，呼叫 onProgress 回報進度（0–100） */
export async function downloadModel(
    key: OnnxModelKey,
    onProgress?: (progress: number) => void,
): Promise<void> {
    const config = MODEL_CONFIGS[key];
    onProgress?.(0);

    const response = await fetch(config.url);
    if (!response.ok) throw new Error(`下載失敗：${response.status}`);

    const contentLength = Number(response.headers.get('Content-Length') || config.sizeMB * 1024 * 1024);
    const reader = response.body!.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        onProgress?.(Math.round((received / contentLength) * 100));
    }

    // 合併 chunks → ArrayBuffer → 存入 IndexedDB
    const buffer = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
    await set(config.cacheKey, buffer.buffer);
    onProgress?.(100);
}

/** 從 IndexedDB 載入 ONNX Session（需先下載） */
export async function loadModel(key: OnnxModelKey): Promise<ort.InferenceSession> {
    const config = MODEL_CONFIGS[key];
    const cached = await get<ArrayBuffer>(config.cacheKey);
    if (!cached) throw new Error(`模型 ${config.name} 尚未下載，請先下載`);

    return ort.InferenceSession.create(cached, {
        executionProviders: ['wasm'],
        // single-thread，不需要 COEP/COOP header
        graphOptimizationLevel: 'basic',
    });
}

/** 刪除快取（釋放 IndexedDB 空間） */
export async function deleteModel(key: OnnxModelKey): Promise<void> {
    await del(MODEL_CONFIGS[key].cacheKey);
}

/** 檢查所有模型的快取狀態 */
export async function getAllModelStatuses(): Promise<Record<OnnxModelKey, ModelStatus>> {
    const keys: OnnxModelKey[] = ['lama', 'sam2_encoder', 'sam2_decoder'];
    const results = await Promise.all(keys.map(k => getModelStatus(k)));
    return Object.fromEntries(keys.map((k, i) => [k, results[i]])) as Record<OnnxModelKey, ModelStatus>;
}
