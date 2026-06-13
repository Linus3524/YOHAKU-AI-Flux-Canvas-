/**
 * 高清放大 Worker 主執行緒呼叫介面
 * Worker 單例（跨呼叫共用，session 依 cacheKey 在 Worker 內快取）
 */

let worker: Worker | null = null;
let pending: ((result: string) => void) | null = null;
let pendingReject: ((err: Error) => void) | null = null;
let onProgress: ((pct: number) => void) | null = null;
let watchdog: ReturnType<typeof setTimeout> | null = null;

// 大圖多塊推論可能較久；設寬鬆 timeout 避免誤殺慢機器
const UPSCALE_TIMEOUT_MS = 300_000;

export function terminateUpscaleWorker(): void {
    if (watchdog) { clearTimeout(watchdog); watchdog = null; }
    worker?.terminate();
    worker = null;
    pending = null;
    pendingReject = null;
    onProgress = null;
}

function settleReject(err: Error) {
    const rej = pendingReject;
    pending = null;
    pendingReject = null;
    onProgress = null;
    if (watchdog) { clearTimeout(watchdog); watchdog = null; }
    terminateUpscaleWorker();
    rej?.(err);
}

function settleResolve(result: string) {
    const res = pending;
    pending = null;
    pendingReject = null;
    onProgress = null;
    if (watchdog) { clearTimeout(watchdog); watchdog = null; }
    res?.(result);
}

function getWorker(): Worker {
    if (worker) return worker;
    worker = new Worker(
        new URL('../workers/upscaleWorker.ts', import.meta.url),
        { type: 'module' }
    );
    worker.onmessage = (e: MessageEvent) => {
        if (e.data?.type === 'result') {
            settleResolve(e.data.result);
        } else if (e.data?.type === 'progress') {
            onProgress?.(e.data.pct);
        } else if (e.data?.type === 'error') {
            settleReject(new Error(e.data.message));
        }
    };
    worker.onerror = (e) => settleReject(new Error(e.message ?? '放大 Worker 錯誤'));
    worker.onmessageerror = () => settleReject(new Error('放大 Worker 訊息錯誤'));
    return worker;
}

/**
 * 在 Web Worker 內執行高清放大（不阻塞 UI）
 * @param imageBase64 原圖 base64
 * @param cacheKey    模型在 IndexedDB 的快取 key（見 MODEL_CONFIGS）
 * @param scale       放大倍率（預設 4）
 * @param progress    進度回呼（0–100）
 */
export function runUpscaleInWorker(
    imageBase64: string,
    cacheKey: string,
    scale = 4,
    progress?: (pct: number) => void,
): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        if (pending) {
            reject(new Error('放大正在處理中，請稍候'));
            return;
        }
        pending = resolve;
        pendingReject = reject;
        onProgress = progress ?? null;
        watchdog = setTimeout(() => {
            settleReject(new Error('放大推論逾時（可能記憶體不足），已重設'));
        }, UPSCALE_TIMEOUT_MS);
        try {
            getWorker().postMessage({ type: 'run-upscale', imageBase64, cacheKey, scale });
        } catch (e) {
            settleReject(e instanceof Error ? e : new Error('放大 Worker 啟動失敗'));
        }
    });
}
