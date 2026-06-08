/**
 * SAM2 Worker 主執行緒呼叫介面
 * Worker 單例（跨呼叫共用，session 只載入一次）
 * Embedding 快取在 Worker 內，主執行緒不持有大型 tensor。
 */

type PendingRequest = {
    resolve: (value: any) => void;
    reject:  (err: Error) => void;
};

let worker: Worker | null = null;
const pending = new Map<string, PendingRequest>();
let reqCounter = 0;

function getWorker(): Worker {
    if (worker) return worker;
    worker = new Worker(
        new URL('../workers/sam2Worker.ts', import.meta.url),
        { type: 'module' }
    );
    worker.onmessage = (e: MessageEvent) => {
        const { type, id, message, ...rest } = e.data;
        const p = pending.get(id);
        if (!p) return;
        pending.delete(id);
        if (type === 'error') {
            p.reject(new Error(message));
        } else {
            p.resolve(rest);
        }
    };
    worker.onerror = (ev) => {
        const err = new Error(ev.message ?? 'SAM2 Worker 錯誤');
        for (const p of pending.values()) p.reject(err);
        pending.clear();
        worker = null;
    };
    return worker;
}

function nextId(): string {
    return `s2_${++reqCounter}_${Date.now()}`;
}

/**
 * 讓 Worker 計算圖片 Embedding（Encoder 推論），快取在 Worker 內。
 * 這步是重活（10-30 秒），在 Worker 跑不卡 UI。
 */
export function sam2EncodeInWorker(
    imageBase64: string,
): Promise<{ origW: number; origH: number }> {
    const id = nextId();
    return new Promise((resolve, reject) => {
        pending.set(id, {
            resolve: (data: { origW: number; origH: number }) => resolve(data),
            reject,
        });
        getWorker().postMessage({ type: 'encode', id, imageBase64 });
    });
}

/**
 * 用 Worker 執行 Decoder 推論，回傳透明 PNG base64。
 * Embedding 從 Worker 快取取，不需要傳輸大型 tensor。
 */
export function sam2DecodeInWorker(
    options: {
        clickPoint?: { x: number; y: number };
        points?:     { x: number; y: number; label: 0 | 1 }[];
        bbox?:       { x: number; y: number; w: number; h: number };
        roughMask?:  string;
    },
    originalImageBase64: string,
): Promise<string> {
    const id = nextId();
    return new Promise((resolve, reject) => {
        pending.set(id, {
            resolve: (data: { result: string }) => resolve(data.result),
            reject,
        });
        getWorker().postMessage({ type: 'decode', id, options, originalImageBase64 });
    });
}

export function terminateSam2Worker(): void {
    worker?.terminate();
    worker = null;
    pending.clear();
}
