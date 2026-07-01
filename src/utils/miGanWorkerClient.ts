/**
 * MI-GAN Worker 主執行緒呼叫介面
 * Worker 單例
 */

let worker: Worker | null = null;
let pending: ((result: string) => void) | null = null;
let pendingReject: ((err: Error) => void) | null = null;
let watchdog: ReturnType<typeof setTimeout> | null = null;
let warmUpResolve: ((backend: 'webgpu' | 'wasm') => void) | null = null;
let warmUpReject:  ((err: Error) => void) | null = null;

// MI-GAN 推論設寬鬆 timeout
const MIGAN_TIMEOUT_MS = 120_000;

let _resolvedBackend: 'webgpu' | 'wasm' | null = null;
export function getMiGanBackend(): 'webgpu' | 'wasm' | null { return _resolvedBackend; }

export function terminateMiGanWorker(): void {
    if (watchdog) { clearTimeout(watchdog); watchdog = null; }
    worker?.terminate();
    worker = null;
    pending = null;
    pendingReject = null;
    warmUpResolve = null;
    warmUpReject = null;
}

function settleReject(err: Error) {
    const rej = pendingReject;
    pending = null;
    pendingReject = null;
    if (watchdog) { clearTimeout(watchdog); watchdog = null; }
    terminateMiGanWorker();
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
        new URL('../workers/miGanWorker.ts', import.meta.url),
        { type: 'module' }
    );
    worker.onmessage = (e: MessageEvent) => {
        if (e.data?.type === 'result') {
            settleResolve(e.data.result);
        } else if (e.data?.type === 'warmed-up') {
            _resolvedBackend = e.data.backend ?? 'wasm';
            console.log(`[MI-GAN] Worker 後端: ${_resolvedBackend}`);
            warmUpResolve?.(_resolvedBackend);
            warmUpResolve = null;
            warmUpReject = null;
        } else if (e.data?.type === 'error') {
            if (warmUpReject) {
                warmUpReject(new Error(e.data.message));
                warmUpResolve = null;
                warmUpReject = null;
            } else {
                settleReject(new Error(e.data.message));
            }
        }
    };
    worker.onerror = (e) => {
        if (warmUpReject) {
            warmUpReject(new Error(e.message ?? 'MI-GAN Worker 錯誤'));
            warmUpResolve = null;
            warmUpReject = null;
        } else {
            settleReject(new Error(e.message ?? 'MI-GAN Worker 錯誤'));
        }
    };
    worker.onmessageerror = () => {
        settleReject(new Error('MI-GAN Worker 訊息錯誤'));
    };
    return worker;
}

/**
 * 預載 MI-GAN session
 */
export function warmUpMiGanWorker(): Promise<'webgpu' | 'wasm'> {
    if (_resolvedBackend) return Promise.resolve(_resolvedBackend);
    return new Promise<'webgpu' | 'wasm'>((resolve, reject) => {
        warmUpResolve = resolve;
        warmUpReject = reject;
        try {
            getWorker().postMessage({ type: 'warm-up' });
        } catch (e) {
            warmUpResolve = null;
            warmUpReject = null;
            reject(e instanceof Error ? e : new Error('MI-GAN Worker 預載失敗'));
        }
    });
}

/**
 * 在 Web Worker 內執行 MI-GAN 推論
 */
export function runMiGanInWorker(
    imageBase64: string,
    maskBase64: string,
): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        if (pending) {
            reject(new Error('MI-GAN 正在處理中，請稍候'));
            return;
        }
        pending = resolve;
        pendingReject = reject;
        watchdog = setTimeout(() => {
            settleReject(new Error('MI-GAN 推論逾時（可能記憶體不足），已重設'));
        }, MIGAN_TIMEOUT_MS);
        try {
            getWorker().postMessage({ type: 'run-migan', imageBase64, maskBase64 });
        } catch (e) {
            settleReject(e instanceof Error ? e : new Error('MI-GAN Worker 啟動失敗'));
        }
    });
}
