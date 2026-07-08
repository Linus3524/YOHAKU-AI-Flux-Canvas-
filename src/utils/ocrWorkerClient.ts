/**
 * OCR Web Worker 客戶端
 * 負責在背景執行緒中運行本地 ONNX OCR 推論，避免主執行緒畫面凍結。
 */
import { OcrBlock } from './ocrService';
import { createIdleReaper } from './workerIdleReaper';

type PendingRequest = {
    resolve: (value: OcrBlock[]) => void;
    reject:  (err: Error) => void;
};

let worker: Worker | null = null;
const pending = new Map<string, PendingRequest>();
let reqCounter = 0;

// 閒置回收：pending 清空後閒置逾時自動 terminate 釋放 WASM heap / session
const reaper = createIdleReaper(() => terminateOcrWorker());

function getWorker(): Worker {
    if (worker) return worker;
    worker = new Worker(
        new URL('../workers/ocrWorker.ts', import.meta.url),
        { type: 'module' }
    );
    worker.onmessage = (e: MessageEvent) => {
        const { type, id, message, results } = e.data;
        const p = pending.get(id);
        if (!p) return;
        pending.delete(id);
        if (pending.size === 0) reaper.arm(); // 全部完成 → 起算閒置
        if (type === 'error') {
            p.reject(new Error(message || 'OCR 推論未知錯誤'));
        } else {
            p.resolve(results || []);
        }
    };
    worker.onerror = (ev) => {
        const err = new Error(ev.message ?? 'OCR Worker 執行緒錯誤');
        for (const p of pending.values()) p.reject(err);
        pending.clear();
        worker = null;
    };
    return worker;
}

function nextId(): string {
    return `ocr_${++reqCounter}_${Date.now()}`;
}

/**
 * 於 Web Worker 中執行本地 OCR 文字偵測與辨識，回傳 OcrBlock 陣列。
 */
export function runOcrInWorker(imageBase64: string): Promise<OcrBlock[]> {
    const id = nextId();
    return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        reaper.cancel(); // 任務進行中不回收
        getWorker().postMessage({ type: 'run', id, imageBase64 });
    });
}

export function terminateOcrWorker(): void {
    worker?.terminate();
    worker = null;
    pending.clear();
}
