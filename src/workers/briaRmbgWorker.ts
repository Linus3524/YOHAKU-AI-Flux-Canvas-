/**
 * 本機 AI 去背 Web Worker (ISNet / DIS)
 * 在獨立執行緒執行 ONNX 模型推理，避免阻塞主執行緒 UI。
 *
 * 訊息：
 *   主 → Worker : { type:'run-rmbg', imageBase64, cacheKey }
 *   Worker → 主 : { type:'progress', pct } | { type:'result', result } | { type:'error', message }
 */
import * as ort from 'onnxruntime-web/all';
import { get } from 'idb-keyval';

ort.env.wasm.numThreads = 1;
(ort.env.wasm as any).wasmPaths =
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0/dist/';

const MODEL_SIZE = 1024; // ISNet 模型輸入大小為 1024x1024
const sessionCache = new Map<string, ort.InferenceSession>();

async function getSession(cacheKey: string): Promise<ort.InferenceSession> {
    const cached = sessionCache.get(cacheKey);
    if (cached) return cached;
    const buf = await get<ArrayBuffer>(cacheKey);
    if (!buf) throw new Error('去背模型尚未下載，請先在「本機 AI 模型」下載');
    
    // 去背模型大小適中，WASM 對多數瀏覽器最穩定
    const sess = await ort.InferenceSession.create(buf, {
        executionProviders: ['wasm'],
    });
    sessionCache.set(cacheKey, sess);
    return sess;
}

async function base64ToBitmap(base64: string): Promise<ImageBitmap> {
    const [header, data] = base64.split(',');
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
    const bin = atob(data);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return createImageBitmap(new Blob([arr], { type: mime }));
}

async function runRmbg(imageBase64: string, cacheKey: string): Promise<string> {
    const sess = await getSession(cacheKey);
    const imgName = sess.inputNames[0];
    const outName = sess.outputNames[0];

    // 1. 載入原圖並取得原始尺寸
    const bmp = await base64ToBitmap(imageBase64);
    const srcW = bmp.width;
    const srcH = bmp.height;

    // 2. 建立原圖 Canvas 以讀取原始像素與最後套用遮罩
    const srcC = new OffscreenCanvas(srcW, srcH);
    const srcCtx = srcC.getContext('2d')!;
    srcCtx.drawImage(bmp, 0, 0, srcW, srcH);
    bmp.close();

    // 3. 建立 1024x1024 縮圖 Canvas 用於 ONNX 推理輸入
    const inputCanvas = new OffscreenCanvas(MODEL_SIZE, MODEL_SIZE);
    const inputCtx = inputCanvas.getContext('2d')!;
    inputCtx.drawImage(srcC, 0, 0, MODEL_SIZE, MODEL_SIZE);
    const imgData = inputCtx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE).data;

    self.postMessage({ type: 'progress', pct: 20 });

    // 4. 圖像預處理：RGB 歸一化 (ImageNet mean & std)
    const N = MODEL_SIZE * MODEL_SIZE;
    const inputTensor = new Float32Array(3 * N);
    
    // ISNet/DIS 量化模型標準化常數（對標 Hugging Face preprocessor_config 規格）
    const mean = [128.0, 128.0, 128.0];
    const std = [256.0, 256.0, 256.0];

    for (let i = 0; i < N; i++) {
        const r = imgData[i * 4];
        const g = imgData[i * 4 + 1];
        const b = imgData[i * 4 + 2];
        
        inputTensor[i]         = (r - mean[0]) / std[0]; // R
        inputTensor[N + i]     = (g - mean[1]) / std[1]; // G
        inputTensor[N * 2 + i] = (b - mean[2]) / std[2]; // B
    }

    self.postMessage({ type: 'progress', pct: 40 });

    // 5. 執行 ONNX 推理
    const outputs = await sess.run({
        [imgName]: new ort.Tensor('float32', inputTensor, [1, 3, MODEL_SIZE, MODEL_SIZE]),
    });
    
    self.postMessage({ type: 'progress', pct: 70 });

    const od = outputs[outName].data as Float32Array;
    const dims = outputs[outName].dims;
    const oH = dims[dims.length - 2] as number || MODEL_SIZE;
    const oW = dims[dims.length - 1] as number || MODEL_SIZE;

    // 6. 圖像後處理：提取遮罩並自適應判斷 Sigmoid 激活
    let needsSigmoid = false;
    let maxVal = -Infinity;
    let minVal = Infinity;
    for (let i = 0; i < oW * oH; i++) {
        if (od[i] > maxVal) maxVal = od[i];
        if (od[i] < minVal) minVal = od[i];
    }
    if (maxVal > 1.05 || minVal < -0.05) {
        needsSigmoid = true;
    }

    // 7. 將推理結果繪製成 1024x1024 灰階遮罩
    const maskCanvas = new OffscreenCanvas(oW, oH);
    const maskCtx = maskCanvas.getContext('2d')!;
    const maskImgData = maskCtx.createImageData(oW, oH);
    
    for (let i = 0; i < oW * oH; i++) {
        let val = od[i];
        if (needsSigmoid) {
            val = 1.0 / (1.0 + Math.exp(-val));
        }
        // 量化成 0-255 的不透明度，同時套用微調容差以確保白邊邊緣乾淨
        const alpha = Math.round(Math.max(0, Math.min(1, val)) * 255);
        const idx = i * 4;
        maskImgData.data[idx]     = alpha; // R channel 存入 alpha 供後續縮放後提取
        maskImgData.data[idx + 1] = alpha; // G
        maskImgData.data[idx + 2] = alpha; // B
        maskImgData.data[idx + 3] = 255;   // A
    }
    maskCtx.putImageData(maskImgData, 0, 0);

    self.postMessage({ type: 'progress', pct: 85 });

    // 8. 利用 OffscreenCanvas 將遮罩高品質平滑縮放回原圖大小 (srcW x srcH)
    const resizedMaskCanvas = new OffscreenCanvas(srcW, srcH);
    const resizedMaskCtx = resizedMaskCanvas.getContext('2d')!;
    resizedMaskCtx.imageSmoothingEnabled = true;
    resizedMaskCtx.imageSmoothingQuality = 'high';
    resizedMaskCtx.drawImage(maskCanvas, 0, 0, srcW, srcH);
    
    const resizedMaskData = resizedMaskCtx.getImageData(0, 0, srcW, srcH).data;

    // 9. 將縮放後的遮罩 Alpha 值寫回原圖 Canvas
    const originalImgData = srcCtx.getImageData(0, 0, srcW, srcH);
    const pixelCount = srcW * srcH;
    for (let i = 0; i < pixelCount; i++) {
        // 從紅色通道讀取剛剛縮放後平滑過濾的遮罩 Alpha 值
        const alpha = resizedMaskData[i * 4];
        originalImgData.data[i * 4 + 3] = alpha;
    }
    srcCtx.putImageData(originalImgData, 0, 0);

    self.postMessage({ type: 'progress', pct: 95 });

    // 10. 匯出為透明 PNG 格式 base64
    const blob = await srcC.convertToBlob({ type: 'image/png' });
    return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    });
}

self.onmessage = async (e: MessageEvent) => {
    if (e.data?.type !== 'run-rmbg') return;
    try {
        const result = await runRmbg(e.data.imageBase64, e.data.cacheKey);
        self.postMessage({ type: 'result', result });
    } catch (err: any) {
        self.postMessage({ type: 'error', message: err?.message ?? '本機去背執行錯誤' });
    }
};
