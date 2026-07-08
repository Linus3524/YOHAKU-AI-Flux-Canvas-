/**
 * Worker 閒置回收器（idle reaper）
 *
 * 背景：各 ONNX Worker（SAM2 148MB / MI-GAN 112MB / LaMa 60MB / RealESRGAN 63MB…）
 * 的 WASM heap + InferenceSession 一經建立就常駐，UI 層沒有任何卸載時機，
 * 連續使用多顆模型後分頁常駐記憶體輕鬆破 GB，低階機器甚至 OOM 崩潰。
 *
 * 策略：在「最後一次任務完成後」起算閒置計時，逾時呼叫 terminate 釋放
 * worker（連同其 WASM heap / session / 顯存）。下次使用時 client 的
 * getWorker() 會自動重建 —— 代價只是一次模型冷啟載入。
 *
 * 使用約定（由各 workerClient 遵守）：
 *   - 任務開始：cancel()  —— 任務進行中絕不回收
 *   - 任務全部完成（pending 清空）：arm() —— 起算閒置
 */
export interface IdleReaper {
    /** 起算（或重新起算）閒置計時 */
    arm(): void;
    /** 取消計時（有任務進行中） */
    cancel(): void;
}

/** 一般模型：閒置 2 分鐘回收（冷啟重載約 1~3 秒，可接受） */
export const IDLE_MS_DEFAULT = 120_000;
/** SAM2：encoder 重算 embedding 要 10~30 秒，回收要保守 → 閒置 5 分鐘 */
export const IDLE_MS_SAM2 = 300_000;

export function createIdleReaper(terminate: () => void, idleMs: number = IDLE_MS_DEFAULT): IdleReaper {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return {
        arm() {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => { timer = null; terminate(); }, idleMs);
        },
        cancel() {
            if (timer) { clearTimeout(timer); timer = null; }
        },
    };
}
