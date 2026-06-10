/**
 * LaMa Worker 主執行緒呼叫介面
 * Worker 單例（跨呼叫共用，session 只載入一次）
 */

let worker: Worker | null = null;
let pending: ((result: string) => void) | null = null;
let pendingReject: ((err: Error) => void) | null = null;
let watchdog: ReturnType<typeof setTimeout> | null = null;

// LaMa 只跑小 crop（512 內部推論）通常數秒內完成；設寬鬆 timeout 避免誤殺慢機器
const LAMA_TIMEOUT_MS = 120_000;

/** 終止並清掉單例，下次呼叫會重建全新 Worker（用於 crash / timeout 後復原） */
export function terminateLamaWorker(): void {
    if (watchdog) { clearTimeout(watchdog); watchdog = null; }
    worker?.terminate();
    worker = null;
    pending = null;
    pendingReject = null;
}

function settleReject(err: Error) {
    const rej = pendingReject;
    pending = null;
    pendingReject = null;
    if (watchdog) { clearTimeout(watchdog); watchdog = null; }
    // Worker 可能已處於不可用狀態（OOM 被瀏覽器回收）→ 砍掉重建
    terminateLamaWorker();
    rej?.(err);
}

function settleResolve(result: string) {
    const res = pending;
    pending = null;
    pendingReject = null;
    if (watchdog) { clearTimeout(watchdog); watchdog = null; }
    res?.(result);
}

function getWorker(): Worker {
    if (worker) return worker;
    worker = new Worker(
        new URL('../workers/lamaWorker.ts', import.meta.url),
        { type: 'module' }
    );
    worker.onmessage = (e: MessageEvent) => {
        if (e.data?.type === 'result') {
            settleResolve(e.data.result);
        } else if (e.data?.type === 'error') {
            settleReject(new Error(e.data.message));
        }
    };
    // 腳本層級錯誤
    worker.onerror = (e) => {
        settleReject(new Error(e.message ?? 'LaMa Worker 錯誤'));
    };
    // 訊息序列化失敗
    worker.onmessageerror = () => {
        settleReject(new Error('LaMa Worker 訊息錯誤'));
    };
    return worker;
}

/**
 * 在 Web Worker 內執行 LaMa 推論（不阻塞主執行緒 / UI）
 * 含 watchdog timeout：若 Worker 因 OOM 被瀏覽器靜默回收（不觸發 onerror），
 * 逾時後 reject 並重建 Worker，避免 Promise 永遠 pending 卡死整個流程。
 * @param imageBase64 原圖 base64
 * @param maskBase64  黑白 mask（白=填補區域）
 */
export function runLamaInWorker(
    imageBase64: string,
    maskBase64: string,
): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        // 同時間只允許一個任務（單例 Worker）
        if (pending) {
            reject(new Error('LaMa 正在處理中，請稍候'));
            return;
        }
        pending = resolve;
        pendingReject = reject;
        watchdog = setTimeout(() => {
            settleReject(new Error('LaMa 推論逾時（可能記憶體不足），已重設'));
        }, LAMA_TIMEOUT_MS);
        try {
            getWorker().postMessage({ type: 'run-lama', imageBase64, maskBase64 });
        } catch (e) {
            settleReject(e instanceof Error ? e : new Error('LaMa Worker 啟動失敗'));
        }
    });
}
