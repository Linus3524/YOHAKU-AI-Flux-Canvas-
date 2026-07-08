/**
 * SAM2 Worker 主執行緒呼叫介面
 * Worker 單例（跨呼叫共用，session 只載入一次）
 * Embedding 快取在 Worker 內，主執行緒不持有大型 tensor。
 */

import { createIdleReaper, IDLE_MS_SAM2 } from './workerIdleReaper';

type PendingRequest = {
    resolve: (value: any) => void;
    reject:  (err: Error) => void;
};

let worker: Worker | null = null;
const pending = new Map<string, PendingRequest>();
let reqCounter = 0;

// Worker 內目前持有的 embedding 是哪張圖（terminate 後清空）。
// decode 前若不符 → 自動先 encode，兩個目的：
//  1) 閒置回收後 worker 重建也能無縫接續（不需要呼叫端記得重新 encode）
//  2) 修掉「encode A 圖後拿 B 圖 decode → 沉默用錯 embedding 出垃圾遮罩」的潛在 bug
let encodedImage: string | null = null;
let encodePromise: Promise<{ origW: number; origH: number }> | null = null;

// 閒置回收：SAM2 encoder 重算要 10~30 秒，閒置門檻放寬（IDLE_MS_SAM2 = 5 分鐘）
const reaper = createIdleReaper(() => terminateSam2Worker(), IDLE_MS_SAM2);

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
        if (pending.size === 0) reaper.arm(); // 全部完成 → 起算閒置
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
        encodedImage = null;
        encodePromise = null;
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
    // 同圖已有 embedding（且 worker 活著）→ 免重算
    if (worker && encodedImage === imageBase64) {
        return encodePromise ?? Promise.resolve({ origW: 0, origH: 0 });
    }
    const id = nextId();
    reaper.cancel(); // 任務進行中不回收
    encodePromise = new Promise((resolve, reject) => {
        pending.set(id, {
            resolve: (data: { origW: number; origH: number }) => {
                encodedImage = imageBase64;
                resolve(data);
            },
            reject: (err: Error) => {
                if (encodedImage !== imageBase64) encodePromise = null;
                reject(err);
            },
        });
        getWorker().postMessage({ type: 'encode', id, imageBase64 });
    });
    return encodePromise;
}

/**
 * 用 Worker 執行 Decoder 推論，回傳透明 PNG base64。
 * Embedding 從 Worker 快取取，不需要傳輸大型 tensor。
 */
export async function sam2DecodeInWorker(
    options: {
        clickPoint?: { x: number; y: number };
        points?:     { x: number; y: number; label: 0 | 1 }[];
        bbox?:       { x: number; y: number; w: number; h: number };
        roughMask?:  string;
    },
    originalImageBase64: string,
): Promise<string> {
    // Worker 內沒有這張圖的 embedding（閒置被回收 / 從未 encode / encode 的是別張圖）
    // → 自動先 encode 再 decode，呼叫端無感
    if (!worker || encodedImage !== originalImageBase64) {
        await sam2EncodeInWorker(originalImageBase64);
    }
    const id = nextId();
    reaper.cancel(); // 任務進行中不回收
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
    encodedImage = null;
    encodePromise = null;
    reaper.cancel();
}
