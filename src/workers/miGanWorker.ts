/**
 * MI-GAN Web Worker
 * 在獨立執行緒跑 MI-GAN ONNX 推論，避開主執行緒阻塞
 * 優先選 WebGPU 加速，否則降級 WASM
 */
import * as ort from 'onnxruntime-web/all';
import { get } from 'idb-keyval';

ort.env.wasm.numThreads = 1;
(ort.env.wasm as any).wasmPaths =
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0/dist/';

const MIGAN_SIZE = 512;
const MIGAN_CACHE_KEY = 'onnx_mi_gan_fp32_v1';

let cachedSession: ort.InferenceSession | null = null;
let resolvedBackend: 'webgpu' | 'wasm' = 'wasm';

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
    const buf = await get<ArrayBuffer>(MIGAN_CACHE_KEY);
    if (!buf) throw new Error('MI-GAN 模型尚未下載，請先在「本機 AI 模型」下載');

    const gpuOk = await hasWebGPU();
    if (gpuOk) {
        try {
            cachedSession = await ort.InferenceSession.create(buf, {
                executionProviders: ['webgpu'],
            });
            resolvedBackend = 'webgpu';
            console.log('[MI-GAN Worker] ✓ WebGPU 後端已啟用');
            return cachedSession;
        } catch (e) {
            console.warn('[MI-GAN Worker] WebGPU 建立失敗，降級至 WASM', e);
        }
    }

    cachedSession = await ort.InferenceSession.create(buf, {
        executionProviders: ['wasm'],
    });
    resolvedBackend = 'wasm';
    console.log('[MI-GAN Worker] ✓ WASM 後端已啟用');
    return cachedSession;
}

async function base64ToBitmap(base64: string): Promise<ImageBitmap> {
    const [header, data] = base64.split(',');
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
    const bin  = atob(data);
    const arr  = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return createImageBitmap(new Blob([arr], { type: mime }));
}

async function runMiGan(imageBase64: string, maskBase64: string): Promise<string> {
    const sess = await getSession();

    // 原始尺寸
    const origBmp = await base64ToBitmap(imageBase64);
    const origW = origBmp.width, origH = origBmp.height;

    // 縮至 512×512 取像素
    const imgC = new OffscreenCanvas(MIGAN_SIZE, MIGAN_SIZE);
    imgC.getContext('2d')!.drawImage(origBmp, 0, 0, MIGAN_SIZE, MIGAN_SIZE);
    const imgD = imgC.getContext('2d')!.getImageData(0, 0, MIGAN_SIZE, MIGAN_SIZE).data;
    origBmp.close();

    const mskBmp = await base64ToBitmap(maskBase64);
    const mskC = new OffscreenCanvas(MIGAN_SIZE, MIGAN_SIZE);
    mskC.getContext('2d')!.drawImage(mskBmp, 0, 0, MIGAN_SIZE, MIGAN_SIZE);
    const mskD = mskC.getContext('2d')!.getImageData(0, 0, MIGAN_SIZE, MIGAN_SIZE).data;
    mskBmp.close();

    // 動態判斷輸入 Tensor 類型與鍵名
    const inputNames = sess.inputNames;
    const imgName = inputNames.find(n => !n.toLowerCase().includes('mask')) ?? inputNames[0];
    const mskName = inputNames.find(n =>  n.toLowerCase().includes('mask')) ?? inputNames[1];

    // 註：onnxruntime-web 的 InferenceSession 不提供 .inputs 的型別中繼資料
    //（只有 inputNames），無法動態偵測型別。migan_pipeline_v2.onnx 是我們固定內建的
    // 模型，其輸入固定為 uint8（影像 0–255、遮罩 0/255）——直接鎖 uint8。
    // 若餵 float32 會觸發：Unexpected input data type. Actual: tensor(float)。
    const imgType = 'uint8';
    const mskType = 'uint8';

    const N = MIGAN_SIZE * MIGAN_SIZE;

    // 建立影像張量（CHW, uint8, RGB 0–255）
    // ⚠ 關鍵：餵「原始像素」，不可自行把遮罩區塗黑。migan_pipeline_v2 內部會依 mask
    //   自行處理破洞；若我們先挖空，生成器會收到錯誤輸入而吐出白色/垃圾。
    //   （對齊 lxfater/inpaint-web 的 imgProcess：只做 RGB + CHW，不動像素。）
    const imageArr = new Uint8Array(3 * N);
    for (let i = 0; i < N; i++) {
        imageArr[i]         = imgD[i * 4];
        imageArr[N + i]     = imgD[i * 4 + 1];
        imageArr[N * 2 + i] = imgD[i * 4 + 2];
    }
    const imageTensor: TypedArray = imageArr;

    // 建立遮罩張量（CHW, uint8）：破洞=0、保留=255
    //   我們的黑白遮罩「白=修補區」→ 白(>127) 轉 0（洞）、黑轉 255（保留）。
    //   等同 inpaint-web 的 markProcess：(pixel !== 255) * 255。
    const maskArr = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
        maskArr[i] = mskD[i * 4] > 127 ? 0 : 255;
    }
    const maskTensor: TypedArray = maskArr;

    const imgTensorObj = new ort.Tensor(imgType as any, imageTensor as any, [1, 3, MIGAN_SIZE, MIGAN_SIZE]);
    const mskTensorObj = new ort.Tensor(mskType as any, maskTensor as any,  [1, 1, MIGAN_SIZE, MIGAN_SIZE]);

    const outputs = await sess.run({
        [imgName]: imgTensorObj,
        [mskName]: mskTensorObj,
    });
    const outputData = outputs[sess.outputNames[0]].data as Float32Array | Uint8Array;

    // 值域判斷。migan_pipeline_v2 輸出即 uint8（0–255，已內部合成整張圖），直接 scale=1。
    // ⚠ 舊版只採樣「前 1000 個像素」判斷值域 → 若左上角是純黑(值=0)會誤判成 0~1 小數、
    //   把 uint8 再乘 255 全部爆白（貼圖黑底就中這雷）。改為：uint8 直接 1；float 才掃「整個」陣列。
    let scale = 1;
    if (!(outputData instanceof Uint8Array)) {
        let maxRaw = 0;
        for (let k = 0; k < outputData.length; k++) {
            if (outputData[k] > maxRaw) maxRaw = outputData[k];
        }
        scale = maxRaw > 1.5 ? 1 : 255;
    }

    // 轉回圖片
    const tmpC = new OffscreenCanvas(MIGAN_SIZE, MIGAN_SIZE);
    const tmpCtx = tmpC.getContext('2d')!;
    const id = tmpCtx.createImageData(MIGAN_SIZE, MIGAN_SIZE);
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

    const blob = await finalC.convertToBlob({ type: 'image/png' });
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    });
}

type TypedArray = Uint8Array | Float32Array;

self.onmessage = async (e: MessageEvent) => {
    const { type } = e.data ?? {};

    if (type === 'warm-up') {
        try {
            await getSession();
            self.postMessage({ type: 'warmed-up', backend: resolvedBackend });
        } catch (err: any) {
            self.postMessage({ type: 'error', message: err?.message ?? '預載失敗' });
        }
        return;
    }

    if (type === 'run-migan') {
        try {
            const result = await runMiGan(e.data.imageBase64, e.data.maskBase64);
            self.postMessage({ type: 'result', result });
        } catch (err: any) {
            self.postMessage({ type: 'error', message: err?.message ?? '未知錯誤' });
        }
        return;
    }
};
