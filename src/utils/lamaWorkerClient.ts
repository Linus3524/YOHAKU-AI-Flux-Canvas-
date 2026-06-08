/**
 * LaMa Worker 主執行緒呼叫介面
 * Worker 單例（跨呼叫共用，session 只載入一次）
 */

let worker: Worker | null = null;
let pending: ((result: string) => void) | null = null;
let pendingReject: ((err: Error) => void) | null = null;

function getWorker(): Worker {
    if (worker) return worker;
    worker = new Worker(
        new URL('../workers/lamaWorker.ts', import.meta.url),
        { type: 'module' }
    );
    worker.onmessage = (e: MessageEvent) => {
        if (e.data?.type === 'result') {
            pending?.(e.data.result);
        } else if (e.data?.type === 'error') {
            pendingReject?.(new Error(e.data.message));
        }
        pending = null;
        pendingReject = null;
    };
    worker.onerror = (e) => {
        pendingReject?.(new Error(e.message ?? 'Worker 錯誤'));
        pending = null;
        pendingReject = null;
    };
    return worker;
}

/**
 * 在 Web Worker 內執行 LaMa 推論（不阻塞主執行緒 / UI）
 * @param imageBase64 原圖 base64
 * @param maskBase64  黑白 mask（白=填補區域）
 */
export function runLamaInWorker(
    imageBase64: string,
    maskBase64: string,
): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        pending = resolve;
        pendingReject = reject;
        getWorker().postMessage({ type: 'run-lama', imageBase64, maskBase64 });
    });
}
