/**
 * ONNX 模型下載 & IndexedDB 快取管理
 * 首次下載後存入 IndexedDB，之後直接從快取載入（無需重新下載）
 */
import { get, set, del, keys as idbKeys } from 'idb-keyval';
import * as ort from 'onnxruntime-web/all';  // 需要 all bundle 含 WebGPU + WASM

// 從 CDN 載入 WASM + JS glue（解決 Vite 無法 bundle 動態 import 的問題）
// 模型本體仍從 IndexedDB 載入，只有 ONNX Runtime 本身從 CDN 拿
ort.env.wasm.numThreads = 1;
(ort.env.wasm as any).wasmPaths =
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0/dist/';

export type OnnxModelKey =
    | 'lama'
    | 'sam2_encoder'
    | 'sam2_decoder'
    | 'upscale_photo'
    | 'upscale_anime'
    | 'upscale_art'
    | 'ocr_det'
    | 'ocr_rec'
    | 'ocr_dict'
    | 'bria_rmbg'
    | 'mi_gan';

/** 放大模型共用屬性：放大倍率 + 輸入張量名稱（推論時用） */
export const UPSCALE_KEYS: OnnxModelKey[] = ['upscale_photo', 'upscale_anime', 'upscale_art'];
export const UPSCALE_SCALE = 4; // 三個模型皆為 4x

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
        description: 'Segment Anything Model 2 — 圖片特徵提取（ORT 格式，已針對瀏覽器優化）',
        url: 'https://huggingface.co/g-ronimo/sam2-tiny/resolve/main/sam2_hiera_tiny_encoder.with_runtime_opt.ort',
        cacheKey: 'onnx_sam2_encoder_tiny_ort_v1',  // 新 key，觸發重新下載
        sizeMB: 148,
    },
    sam2_decoder: {
        key: 'sam2_decoder',
        name: 'SAM 2 Decoder',
        description: 'Segment Anything Model 2 — 點選分割輸出',
        url: 'https://huggingface.co/g-ronimo/sam2-tiny/resolve/main/sam2_hiera_tiny_decoder.onnx',
        cacheKey: 'onnx_sam2_decoder_tiny_ort_v1',  // 新 key，觸發重新下載
        sizeMB: 15,
    },
    // ── 本機高清放大（4x，純像素超解析，結構 100% 保留） ──
    // 相片與插畫共用同一顆 UltraSharpV2 Lite（RealPLKSR，純 CNN → WASM SIMD 加速、快且通用）
    // 兩者 url + cacheKey 相同 → 只下載一次即兩個按鈕通用
    // 相片與插畫共用同一顆 PurePhoto SPAN（純 CNN・極輕 1.6MB・WASM 單核 ~370ms/128 tile，超快）
    upscale_photo: {
        key: 'upscale_photo',
        name: '相片 / 插畫高清（PurePhoto SPAN）',
        description: 'SPAN 架構，真實照片 / 插畫 4x 放大，極輕極快、WASM 友善',
        url: 'https://huggingface.co/huggingworld/onnx-image-models/resolve/main/4xPurePhoto-Span.onnx',
        cacheKey: 'onnx_upscale_purephoto_span_v1',
        sizeMB: 2,
    },
    upscale_anime: {
        key: 'upscale_anime',
        name: '動漫高清（RealESR AnimeVideo v3）',
        description: '動漫 / 賽璐璐 / 線稿 4x 放大，Compact 動漫特化・自我託管・WASM 友善',
        url: '/models/realesr-animevideov3.onnx',
        cacheKey: 'onnx_upscale_realesr_animevideov3_v1',
        sizeMB: 2,
    },
    upscale_art: {
        key: 'upscale_art',
        name: '相片 / 插畫高清（PurePhoto SPAN）',
        description: '數位繪圖 / 插畫 / 平面風 4x 放大，與「相片」共用同一顆模型',
        url: 'https://huggingface.co/huggingworld/onnx-image-models/resolve/main/4xPurePhoto-Span.onnx',
        cacheKey: 'onnx_upscale_purephoto_span_v1',
        sizeMB: 2,
    },
    ocr_det: {
        key: 'ocr_det',
        name: '本機 OCR 文字偵測 (DBNet)',
        description: '輕量級文字檢測模型，精確定位圖中所有文字區塊',
        url: 'https://huggingface.co/SWHL/RapidOCR/resolve/main/PP-OCRv4/ch_PP-OCRv4_det_infer.onnx',
        cacheKey: 'onnx_ocr_det_v4_1',
        sizeMB: 4.6,
    },
    ocr_rec: {
        key: 'ocr_rec',
        name: '本機 OCR 文字辨識 (SVTR)',
        description: '輕量級文字辨識與解碼模型，支援中、英、日等多語言',
        url: 'https://huggingface.co/SWHL/RapidOCR/resolve/main/PP-OCRv4/ch_PP-OCRv4_rec_infer.onnx',
        cacheKey: 'onnx_ocr_rec_v4_1',
        sizeMB: 10.5,
    },
    ocr_dict: {
        key: 'ocr_dict',
        name: '本機 OCR 字形字典',
        description: '繁中/簡中/英文/數字共用字元字典檔',
        url: 'https://huggingface.co/karmueo/PaddleOcr/resolve/main/ppocr_keys_v1.txt',
        cacheKey: 'onnx_ocr_dict_v4_1',
        sizeMB: 0.3,
    },
    bria_rmbg: {
        key: 'bria_rmbg',
        name: '本機 AI 去背 (ISNet)',
        description: '智慧二分圖像分割模型，免 API 額度本機高速去背',
        url: 'https://huggingface.co/xrds/isnet-general-onnx-int8/resolve/main/onnx/model.onnx',
        cacheKey: 'onnx_isnet_general_int8_v1',
        sizeMB: 43.2,
    },
    mi_gan: {
        key: 'mi_gan',
        name: 'MI-GAN（語意與人物修復）',
        description: '適合修復人物、五官、服飾與商品等具備語意結構的遮罩區域',
        url: 'https://huggingface.co/andraniksargsyan/migan/resolve/main/migan_pipeline_v2.onnx',
        cacheKey: 'onnx_mi_gan_fp32_v1',
        sizeMB: 112,
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
    if (key === 'ocr_dict') {
        throw new Error('ocr_dict 屬於字元字典文字檔，非 ONNX 模型，請使用 get 讀取 ArrayBuffer');
    }
    const config = MODEL_CONFIGS[key];
    const cached = await get<ArrayBuffer>(config.cacheKey);
    if (!cached) throw new Error(`模型 ${config.name} 尚未下載，請先在「本機 AI 模型」下載`);

    // LaMa 在 Worker 內部自行偵測 WebGPU → WASM；此處 loadModel 也嘗試 WebGPU 優先
    // SAM2 正常走 WebGPU → WASM fallback
    // OCR 模型為求穩定與極小尺寸，強制跑 WASM
    const providers: string[] = (key === 'ocr_det' || key === 'ocr_rec') ? ['wasm'] : ['webgpu', 'wasm'];

    try {
        return await ort.InferenceSession.create(cached, {
            executionProviders: providers,
        });
    } catch (e) {
        console.error(`[ONNX] 載入 ${config.name} 失敗:`, e);
        throw new Error(`ONNX 模型初始化失敗：${(e as Error).message?.slice(0, 80) || '未知錯誤'}`);
    }
}

/** 刪除快取（釋放 IndexedDB 空間） */
export async function deleteModel(key: OnnxModelKey): Promise<void> {
    await del(MODEL_CONFIGS[key].cacheKey);
}

/**
 * 清除「孤兒」模型快取：IndexedDB 裡所有 onnx_ 開頭、但已不在現行 MODEL_CONFIGS 的快取。
 * 用於換模型後自動回收舊檔（如舊版相片/動漫模型），對所有使用者自動生效。
 * 回傳被清掉的 key 數量。
 *
 * (因字典為文字格式亦使用 onnx_ 前綴快取，會一同列入有效檢驗)
 */
export async function cleanOrphanModelCaches(): Promise<number> {
    try {
        const valid = new Set(Object.values(MODEL_CONFIGS).map(c => c.cacheKey));
        const all = await idbKeys();
        let removed = 0;
        for (const k of all) {
            if (typeof k === 'string' && k.startsWith('onnx_') && !valid.has(k)) {
                await del(k);
                removed++;
            }
        }
        if (removed > 0) console.log(`[ONNX] 已清除 ${removed} 個孤兒模型快取`);
        return removed;
    } catch (e) {
        console.warn('[ONNX] 清除孤兒快取失敗', e);
        return 0;
    }
}

/** 檢查所有模型的快取狀態 */
export async function getAllModelStatuses(): Promise<Record<OnnxModelKey, ModelStatus>> {
    const keys: OnnxModelKey[] = [
        'lama', 'sam2_encoder', 'sam2_decoder',
        'upscale_photo', 'upscale_anime', 'upscale_art',
        'ocr_det', 'ocr_rec', 'ocr_dict', 'bria_rmbg', 'mi_gan'
    ];
    const results = await Promise.all(keys.map(k => getModelStatus(k)));
    return Object.fromEntries(keys.map((k, i) => [k, results[i]])) as Record<OnnxModelKey, ModelStatus>;
}
