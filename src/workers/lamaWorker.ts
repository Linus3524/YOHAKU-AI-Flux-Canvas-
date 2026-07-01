/**
 * LaMa Web Worker
 * 在獨立執行緒跑 ONNX 推論，避免凍結主執行緒 UI
 *
 * 後端選擇優先序：WebGPU → WASM
 * WebGPU 需要 `onnxruntime-web/all` bundle 且瀏覽器支援 navigator.gpu
 *
 * 支援訊息：
 *   主 → Worker : { type:'run-lama', imageBase64, maskBase64 }
 *   主 → Worker : { type:'warm-up' }           ← 預載 session（不推論）
 *   Worker → 主 : { type:'result', result }
 *   Worker → 主 : { type:'warmed-up', backend }  ← 回報使用的後端
 *   Worker → 主 : { type:'error', message }
 */
import * as ort from 'onnxruntime-web/all';  // /all 包含 WebGPU + WASM
import { get } from 'idb-keyval';

// WASM 從 CDN 載入
ort.env.wasm.numThreads = 1;
(ort.env.wasm as any).wasmPaths =
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0/dist/';

const LAMA_SIZE     = 512;
const LAMA_CACHE_KEY = 'onnx_lama_fp32_v1';

let cachedSession: ort.InferenceSession | null = null;
let resolvedBackend: 'webgpu' | 'wasm' = 'wasm';
// LaMa 的 FFC（傅立葉卷積）kernel 在 onnxruntime-web 的 WebGPU 後端「必然」於推論時失敗
// （error: [Add] .../ffc/convg2g/Add）。這是 LaMa 架構限制、換 EP 解不了，故預設就直接走
// WASM，連注定失敗的 WebGPU 嘗試都跳過。WebGPU 加速交給無 FFC 的 MI-GAN。
// （下方推論仍保留執行期 fallback 當保險，理論上不會被觸發。）
let forceWasm = true;

/** 偵測當前環境是否支援 WebGPU */
async function hasWebGPU(): Promise<boolean> {
    try {
        if (typeof navigator === 'undefined' || !('gpu' in navigator)) return false;
        const adapter = await (navigator as any).gpu.requestAdapter();
        return !!adapter;
    } catch {
        return false;
    }
}

async function getSession(): Promise<ort.InferenceSession> {
    if (cachedSession) return cachedSession;
    const buf = await get<ArrayBuffer>(LAMA_CACHE_KEY);
    if (!buf) throw new Error('LaMa 模型尚未下載，請先在「本機 AI 模型」下載');

    // 嘗試 WebGPU → 失敗降級 WASM（forceWasm 時直接跳過 WebGPU）
    const gpuOk = !forceWasm && await hasWebGPU();
    if (gpuOk) {
        try {
            cachedSession = await ort.InferenceSession.create(buf, {
                executionProviders: ['webgpu'],
            });
            resolvedBackend = 'webgpu';
            console.log('[LaMa Worker] ✓ WebGPU 後端已啟用');
            return cachedSession;
        } catch (e) {
            console.warn('[LaMa Worker] WebGPU 建立失敗，降級至 WASM', e);
        }
    }

    // WASM fallback
    cachedSession = await ort.InferenceSession.create(buf, {
        executionProviders: ['wasm'],
    });
    resolvedBackend = 'wasm';
    console.log('[LaMa Worker] ✓ WASM 後端已啟用');
    return cachedSession;
}

/** base64 data URL → ImageBitmap（Worker 無 Image 元素，改用 createImageBitmap）*/
async function base64ToBitmap(base64: string): Promise<ImageBitmap> {
    const [header, data] = base64.split(',');
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
    const bin  = atob(data);
    const arr  = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return createImageBitmap(new Blob([arr], { type: mime }));
}

async function runLama(imageBase64: string, maskBase64: string): Promise<string> {
    const sess = await getSession();

    // 原始尺寸
    const origBmp = await base64ToBitmap(imageBase64);
    const origW = origBmp.width, origH = origBmp.height;

    // 縮至 512×512 取像素
    const imgC = new OffscreenCanvas(LAMA_SIZE, LAMA_SIZE);
    imgC.getContext('2d')!.drawImage(origBmp, 0, 0, LAMA_SIZE, LAMA_SIZE);
    const imgD = imgC.getContext('2d')!.getImageData(0, 0, LAMA_SIZE, LAMA_SIZE).data;
    origBmp.close();

    const mskBmp = await base64ToBitmap(maskBase64);
    const mskC = new OffscreenCanvas(LAMA_SIZE, LAMA_SIZE);
    mskC.getContext('2d')!.drawImage(mskBmp, 0, 0, LAMA_SIZE, LAMA_SIZE);
    const mskD = mskC.getContext('2d')!.getImageData(0, 0, LAMA_SIZE, LAMA_SIZE).data;
    mskBmp.close();

    const N = LAMA_SIZE * LAMA_SIZE;
    const imageTensor = new Float32Array(3 * N);
    const maskTensor  = new Float32Array(N);

    for (let i = 0; i < N; i++) {
        maskTensor[i] = mskD[i * 4] > 127 ? 1 : 0;
        const masked  = maskTensor[i] > 0;
        imageTensor[i]         = masked ? 0 : imgD[i * 4]     / 255;
        imageTensor[N + i]     = masked ? 0 : imgD[i * 4 + 1] / 255;
        imageTensor[N * 2 + i] = masked ? 0 : imgD[i * 4 + 2] / 255;
    }

    // 執行推論（用給定 session）；輸入名稱依 session 動態解析。
    const infer = async (s: ort.InferenceSession): Promise<Float32Array> => {
        const inputNames = s.inputNames;
        const imgName = inputNames.find(n => !n.toLowerCase().includes('mask')) ?? inputNames[0];
        const mskName = inputNames.find(n =>  n.toLowerCase().includes('mask')) ?? inputNames[1];
        const outputs = await s.run({
            [imgName]: new ort.Tensor('float32', imageTensor, [1, 3, LAMA_SIZE, LAMA_SIZE]),
            [mskName]: new ort.Tensor('float32', maskTensor,  [1, 1, LAMA_SIZE, LAMA_SIZE]),
        });
        return outputs[s.outputNames[0]].data as Float32Array;
    };

    let outputData: Float32Array;
    try {
        outputData = await infer(sess);
    } catch (e) {
        // WebGPU 推論時 kernel 失敗（LaMa FFC 常見）→ 黏住 forceWasm、重建 WASM session 重跑一次
        if (resolvedBackend === 'webgpu') {
            console.warn('[LaMa Worker] WebGPU 推論失敗，改用 WASM 重試', e);
            forceWasm = true;
            try { (cachedSession as any)?.release?.(); } catch { /* 忽略釋放錯誤 */ }
            cachedSession = null;
            const wasmSess = await getSession(); // forceWasm=true → 建 WASM session
            outputData = await infer(wasmSess);
        } else {
            throw e;
        }
    }

    // 自動偵測值域
    let maxRaw = 0;
    for (let k = 0; k < outputData.length; k++) if (outputData[k] > maxRaw) maxRaw = outputData[k];
    const scale = maxRaw > 1.5 ? 1 : 255;

    // 轉回圖片
    const tmpC = new OffscreenCanvas(LAMA_SIZE, LAMA_SIZE);
    const tmpCtx = tmpC.getContext('2d')!;
    const id = tmpCtx.createImageData(LAMA_SIZE, LAMA_SIZE);
    for (let i = 0; i < N; i++) {
        id.data[i * 4]     = Math.round(Math.max(0, Math.min(255, outputData[i]         * scale)));
        id.data[i * 4 + 1] = Math.round(Math.max(0, Math.min(255, outputData[N + i]     * scale)));
        id.data[i * 4 + 2] = Math.round(Math.max(0, Math.min(255, outputData[N * 2 + i] * scale)));
        id.data[i * 4 + 3] = 255;
    }
    tmpCtx.putImageData(id, 0, 0);

    // 放大回原始尺寸
    const finalC = new OffscreenCanvas(origW, origH);
    const fCtx   = finalC.getContext('2d')!;
    fCtx.imageSmoothingEnabled = true;
    fCtx.imageSmoothingQuality = 'high';
    fCtx.drawImage(tmpC, 0, 0, origW, origH);

    // OffscreenCanvas → base64
    const blob = await finalC.convertToBlob({ type: 'image/png' });
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    });
}

self.onmessage = async (e: MessageEvent) => {
    const { type } = e.data ?? {};

    // ── 預載（打開面板時觸發，讓 session 事先初始化，推論時直接用） ──
    if (type === 'warm-up') {
        try {
            await getSession();
            self.postMessage({ type: 'warmed-up', backend: resolvedBackend });
        } catch (err: any) {
            self.postMessage({ type: 'error', message: err?.message ?? '預載失敗' });
        }
        return;
    }

    // ── 推論 ──
    if (type === 'run-lama') {
        try {
            const result = await runLama(e.data.imageBase64, e.data.maskBase64);
            self.postMessage({ type: 'result', result });
        } catch (err: any) {
            self.postMessage({ type: 'error', message: err?.message ?? '未知錯誤' });
        }
        return;
    }
};
