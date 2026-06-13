/**
 * 本機高清放大 Web Worker（純像素超解析，4x）
 * 在獨立執行緒跑 ONNX（WebGPU → WASM fallback），避免凍結主執行緒 UI。
 *
 * 採「動態切塊 + 帶 pad crop&stitch」拼接：每塊輸入向外多取 pad 像素做上下文，
 * 推論後只取中央有效區寫回，接縫處因每個輸出像素都有足夠上下文 → 無需混色即無縫。
 *
 * 訊息：
 *   主 → Worker : { type:'run-upscale', imageBase64, cacheKey, scale }
 *   Worker → 主 : { type:'progress', pct } | { type:'result', result } | { type:'error', message }
 */
import * as ort from 'onnxruntime-web/all';
import { get } from 'idb-keyval';

ort.env.wasm.numThreads = 1;
(ort.env.wasm as any).wasmPaths =
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0/dist/';

const TILE = 256;          // 每塊輸入邊長
const PAD = 16;            // 每塊向外多取的上下文像素
const MODEL_SCALE = 4;     // 模型原生放大倍率（三顆皆 4x），用於 tiling 拼接座標
const MAX_SRC_EDGE = 1536; // 原圖長邊上限（×4 → 輸出 ≤ 6144），避免畫布/顯存爆掉

// 依 cacheKey 快取 session（同模型重複呼叫不重載）
const sessionCache = new Map<string, ort.InferenceSession>();

async function getSession(cacheKey: string): Promise<ort.InferenceSession> {
    const cached = sessionCache.get(cacheKey);
    if (cached) return cached;
    const buf = await get<ArrayBuffer>(cacheKey);
    if (!buf) throw new Error('放大模型尚未下載，請先在「本機 AI 模型」下載');
    // 這些超解析模型（SPAN/ESRGAN）在 WebGPU EP 有 buffer-reuse shape 錯誤 → 固定走 WASM（已驗證正確）
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

async function runUpscale(imageBase64: string, cacheKey: string, factor: number): Promise<string> {
    const sess = await getSession(cacheKey);
    const imgName = sess.inputNames[0];
    const outName = sess.outputNames[0];
    const scale = MODEL_SCALE; // 模型恆為 4x；factor=2 時最後再降回

    // 載入並（必要時）縮到安全上限
    const bmp = await base64ToBitmap(imageBase64);
    let srcW = bmp.width, srcH = bmp.height;
    const longest = Math.max(srcW, srcH);
    const pre = longest > MAX_SRC_EDGE ? MAX_SRC_EDGE / longest : 1;
    srcW = Math.max(1, Math.round(srcW * pre));
    srcH = Math.max(1, Math.round(srcH * pre));

    const srcC = new OffscreenCanvas(srcW, srcH);
    const srcCtx = srcC.getContext('2d')!;
    srcCtx.drawImage(bmp, 0, 0, srcW, srcH);
    bmp.close();

    const outW = srcW * scale, outH = srcH * scale;
    const outC = new OffscreenCanvas(outW, outH);
    const outCtx = outC.getContext('2d')!;

    const cols = Math.ceil(srcW / TILE);
    const rows = Math.ceil(srcH / TILE);
    const total = cols * rows;
    let doneTiles = 0;

    for (let ty = 0; ty < srcH; ty += TILE) {
        for (let tx = 0; tx < srcW; tx += TILE) {
            const tw = Math.min(TILE, srcW - tx);
            const th = Math.min(TILE, srcH - ty);

            // 帶 pad 的輸入區（夾在圖內）
            const ix0 = Math.max(0, tx - PAD);
            const iy0 = Math.max(0, ty - PAD);
            const ix1 = Math.min(srcW, tx + tw + PAD);
            const iy1 = Math.min(srcH, ty + th + PAD);
            const iw = ix1 - ix0, ih = iy1 - iy0;

            const tileData = srcCtx.getImageData(ix0, iy0, iw, ih).data;
            const N = iw * ih;
            const input = new Float32Array(3 * N);
            for (let i = 0; i < N; i++) {
                input[i]         = tileData[i * 4]     / 255; // R
                input[N + i]     = tileData[i * 4 + 1] / 255; // G
                input[N * 2 + i] = tileData[i * 4 + 2] / 255; // B
            }

            const outputs = await sess.run({
                [imgName]: new ort.Tensor('float32', input, [1, 3, ih, iw]),
            });
            const od = outputs[outName].data as Float32Array;
            const dims = outputs[outName].dims; // [1,3,ih*scale,iw*scale]
            const oH = dims[2] as number, oW = dims[3] as number;
            const M = oW * oH;

            // 值域自動偵測（[0,1] 或 [0,255]）
            let maxRaw = 0;
            for (let k = 0; k < M; k++) if (od[k] > maxRaw) maxRaw = od[k];
            const vScale = maxRaw > 1.5 ? 1 : 255;

            // 有效輸出區（對應無 pad 的 [tx,ty,tw,th]）
            const ox = (tx - ix0) * scale;
            const oy = (ty - iy0) * scale;
            const vw = tw * scale, vh = th * scale;

            const id = outCtx.createImageData(vw, vh);
            for (let y = 0; y < vh; y++) {
                for (let x = 0; x < vw; x++) {
                    const sx = ox + x, sy = oy + y;
                    const si = sy * oW + sx;
                    const di = (y * vw + x) * 4;
                    id.data[di]     = Math.round(Math.max(0, Math.min(255, od[si]         * vScale)));
                    id.data[di + 1] = Math.round(Math.max(0, Math.min(255, od[M + si]     * vScale)));
                    id.data[di + 2] = Math.round(Math.max(0, Math.min(255, od[M * 2 + si] * vScale)));
                    id.data[di + 3] = 255;
                }
            }
            outCtx.putImageData(id, tx * scale, ty * scale);

            doneTiles++;
            self.postMessage({ type: 'progress', pct: Math.round((doneTiles / total) * 100) });
        }
    }

    // factor < 4 → 把 4x 結果高品質降回目標倍率（仍享 4x 細節重構，再縮更銳利）
    let finalCanvas: OffscreenCanvas = outC;
    if (factor !== MODEL_SCALE) {
        const fW = srcW * factor, fH = srcH * factor;
        const fC = new OffscreenCanvas(fW, fH);
        const fCtx = fC.getContext('2d')!;
        fCtx.imageSmoothingEnabled = true;
        fCtx.imageSmoothingQuality = 'high';
        fCtx.drawImage(outC, 0, 0, fW, fH);
        finalCanvas = fC;
    }

    const blob = await finalCanvas.convertToBlob({ type: 'image/png' });
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    });
}

self.onmessage = async (e: MessageEvent) => {
    if (e.data?.type !== 'run-upscale') return;
    try {
        const result = await runUpscale(e.data.imageBase64, e.data.cacheKey, e.data.scale ?? 4);
        self.postMessage({ type: 'result', result });
    } catch (err: any) {
        self.postMessage({ type: 'error', message: err?.message ?? '未知錯誤' });
    }
};
