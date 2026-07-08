/**
 * 本機 ONNX 模型 pipeline（純 TypeScript，無 React 依賴）
 *
 * 從 useAI.ts 剝離的後台流程：模型就緒檢查 → Worker 推論 → 進度節流。
 * hook 端只負責：選取元素、genProgress/badge 等 UI 狀態、結果寫回畫布。
 */
import { runUpscaleInWorker } from '../../utils/upscaleWorkerClient';
import { runLocalRmbgInWorker } from '../../utils/briaRmbgWorkerClient';
import { MODEL_CONFIGS, getModelStatus, type OnnxModelKey } from '../../utils/onnxModelCache';

/**
 * 模型就緒檢查。
 * @returns null = 已就緒；否則回傳「請先下載」的使用者訊息（由呼叫端 toast）
 */
export async function checkLocalModelReady(modelKey: OnnxModelKey): Promise<string | null> {
    const cfg = MODEL_CONFIGS[modelKey];
    const status = await getModelStatus(modelKey);
    if (status !== 'ready') {
        return `請先在「功能助手 → 本機 AI 模型」下載「${cfg.name}」(${cfg.sizeMB}MB)`;
    }
    return null;
}

/** 進度節流：每跨越一個 5% 級距才回報，避免每個 tile 都觸發整張畫布重繪 */
function throttleProgress(onProgress?: (pct: number) => void): (pct: number) => void {
    let lastBucket = -1;
    return (pct: number) => {
        const bucket = Math.floor(pct / 5);
        if (bucket !== lastBucket || pct >= 100) {
            lastBucket = bucket;
            onProgress?.(pct);
        }
    };
}

/**
 * 本機高清放大（純像素超解析，結構 100% 保留，不走雲端、免額度）。
 * 模型原生 4x；factor=2 時於 worker 內把 4x 結果降回 2x（仍享 4x 細節重構）。
 * @returns 放大後圖片的 base64 data URL
 */
export function runLocalUpscalePipeline(
    src: string,
    modelKey: OnnxModelKey,
    factor: number,
    onProgress?: (pct: number) => void,
): Promise<string> {
    return runUpscaleInWorker(src, MODEL_CONFIGS[modelKey].cacheKey, factor, throttleProgress(onProgress));
}

/**
 * 本機 AI 去背（ISNet 模型，不走雲端、免額度）。
 * @returns 去背後圖片的 base64 data URL（透明 PNG）
 */
export function runLocalRmbgPipeline(
    src: string,
    onProgress?: (pct: number) => void,
): Promise<string> {
    return runLocalRmbgInWorker(src, MODEL_CONFIGS['bria_rmbg'].cacheKey, onProgress);
}
