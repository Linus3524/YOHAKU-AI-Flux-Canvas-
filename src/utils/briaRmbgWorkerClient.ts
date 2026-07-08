/**
 * 本機去背 Worker 主執行緒呼叫介面
 * Worker 單例（跨呼叫共用，session 依 cacheKey 在 Worker 內快取）
 */
import { createIdleReaper } from './workerIdleReaper';

let worker: Worker | null = null;
let pending: ((result: string) => void) | null = null;
let pendingReject: ((err: Error) => void) | null = null;
let onProgress: ((pct: number) => void) | null = null;
let watchdog: ReturnType<typeof setTimeout> | null = null;

// 去背推理超時設定為 180 秒
const RMBG_TIMEOUT_MS = 180_000;

export function terminateRmbgWorker(): void {
    if (watchdog) { clearTimeout(watchdog); watchdog = null; }
    worker?.terminate();
    worker = null;
    pending = null;
    pendingReject = null;
    onProgress = null;
}

// 閒置回收：任務結束後閒置逾時自動 terminate 釋放 WASM heap / session（下次用再冷啟重建）
const reaper = createIdleReaper(terminateRmbgWorker);

function settleReject(err: Error) {
    const rej = pendingReject;
    pending = null;
    pendingReject = null;
    onProgress = null;
    if (watchdog) { clearTimeout(watchdog); watchdog = null; }
    terminateRmbgWorker();
    rej?.(err);
}

function settleResolve(result: string) {
    const res = pending;
    pending = null;
    pendingReject = null;
    onProgress = null;
    if (watchdog) { clearTimeout(watchdog); watchdog = null; }
    reaper.arm();
    res?.(result);
}

function getWorker(): Worker {
    if (worker) return worker;
    worker = new Worker(
        new URL('../workers/briaRmbgWorker.ts', import.meta.url),
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
    worker.onerror = (e) => settleReject(new Error(e.message ?? '去背 Worker 錯誤'));
    worker.onmessageerror = () => settleReject(new Error('去背 Worker 訊息傳輸錯誤'));
    return worker;
}

/**
 * 在 Web Worker 內執行本機去背（不阻塞 UI）
 * @param imageBase64 原圖 base64
 * @param cacheKey    模型在 IndexedDB 的快取 key（見 MODEL_CONFIGS）
 * @param progress    進度回呼（0–100）
 */
export function runLocalRmbgInWorker(
    imageBase64: string,
    cacheKey: string,
    progress?: (pct: number) => void,
): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        if (pending) {
            reject(new Error('去背任務正在處理中，請稍候'));
            return;
        }
        pending = resolve;
        pendingReject = reject;
        onProgress = progress ?? null;
        reaper.cancel(); // 任務進行中不回收
        watchdog = setTimeout(() => {
            settleReject(new Error('去背推論逾時，已重設執行緒'));
        }, RMBG_TIMEOUT_MS);
        try {
            getWorker().postMessage({ type: 'run-rmbg', imageBase64, cacheKey });
        } catch (e) {
            settleReject(e instanceof Error ? e : new Error('去背 Worker 啟動失敗'));
        }
    });
}
