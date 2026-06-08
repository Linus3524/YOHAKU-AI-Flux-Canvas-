/**
 * LaMa Web Worker
 * 在獨立執行緒跑 ONNX WASM 推論，避免凍結主執行緒 UI
 * 支援訊息：
 *   主 → Worker : { type:'run-lama', imageBase64, maskBase64 }
 *   Worker → 主 : { type:'result', result } | { type:'error', message }
 */
import * as ort from 'onnxruntime-web';
import { get } from 'idb-keyval';

// WASM 從 CDN 載入
ort.env.wasm.numThreads = 1;
(ort.env.wasm as any).wasmPaths =
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0/dist/';

const LAMA_SIZE     = 512;
const LAMA_CACHE_KEY = 'onnx_lama_fp32_v1';

let cachedSession: ort.InferenceSession | null = null;

async function getSession(): Promise<ort.InferenceSession> {
    if (cachedSession) return cachedSession;
    const buf = await get<ArrayBuffer>(LAMA_CACHE_KEY);
    if (!buf) throw new Error('LaMa 模型尚未下載，請先在「本機 AI 模型」下載');
    cachedSession = await ort.InferenceSession.create(buf, {
        executionProviders: ['wasm'],
    });
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

    const inputNames = sess.inputNames;
    const imgName = inputNames.find(n => !n.toLowerCase().includes('mask')) ?? inputNames[0];
    const mskName = inputNames.find(n =>  n.toLowerCase().includes('mask')) ?? inputNames[1];

    const outputs = await sess.run({
        [imgName]: new ort.Tensor('float32', imageTensor, [1, 3, LAMA_SIZE, LAMA_SIZE]),
        [mskName]: new ort.Tensor('float32', maskTensor,  [1, 1, LAMA_SIZE, LAMA_SIZE]),
    });
    const outputData = outputs[sess.outputNames[0]].data as Float32Array;

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
    if (e.data?.type !== 'run-lama') return;
    try {
        const result = await runLama(e.data.imageBase64, e.data.maskBase64);
        self.postMessage({ type: 'result', result });
    } catch (err: any) {
        self.postMessage({ type: 'error', message: err?.message ?? '未知錯誤' });
    }
};
