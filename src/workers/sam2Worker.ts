/**
 * SAM2 Web Worker
 * 在獨立執行緒跑 ONNX 推論，避免 Encoder（148MB）凍結主執行緒 UI
 *
 * 支援訊息：
 *   encode  : { type:'encode',  id, imageBase64 }
 *             → { type:'encoded', id, origW, origH }
 *   decode  : { type:'decode',  id, options, originalImageBase64 }
 *             → { type:'decoded', id, result }   (透明 PNG base64)
 *   error   : { type:'error',  id, message }
 *
 * Embedding 快取在 Worker 內，主執行緒無需傳輸大型 tensor。
 */
import * as ort from 'onnxruntime-web/all';
import { get } from 'idb-keyval';

// WASM 從 CDN 載入
ort.env.wasm.numThreads = 1;
(ort.env.wasm as any).wasmPaths =
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0/dist/';

const SAM_SIZE = 1024;
const MEAN = [0.485, 0.456, 0.406];
const STD  = [0.229, 0.224, 0.225];

const ENC_KEY = 'onnx_sam2_encoder_tiny_ort_v1';
const DEC_KEY = 'onnx_sam2_decoder_tiny_ort_v1';

let encSession: ort.InferenceSession | null = null;
let decSession: ort.InferenceSession | null = null;

// Embedding 快取：encode 完存在這，decode 直接取用
let embedding: { features: Record<string, ort.Tensor>; origW: number; origH: number } | null = null;

// ── Sessions ──────────────────────────────────────────────────────────────────

async function loadSessions() {
    if (encSession && decSession) return;
    const [encBuf, decBuf] = await Promise.all([
        get<ArrayBuffer>(ENC_KEY),
        get<ArrayBuffer>(DEC_KEY),
    ]);
    if (!encBuf) throw new Error('SAM2 Encoder 尚未下載，請先在「本機 AI 模型」下載');
    if (!decBuf) throw new Error('SAM2 Decoder 尚未下載，請先在「本機 AI 模型」下載');

    [encSession, decSession] = await Promise.all([
        ort.InferenceSession.create(encBuf, { executionProviders: ['webgpu', 'wasm'] }),
        ort.InferenceSession.create(decBuf, { executionProviders: ['webgpu', 'wasm'] }),
    ]);
}

// ── 工具 ─────────────────────────────────────────────────────────────────────

async function base64ToBitmap(base64: string): Promise<ImageBitmap> {
    const [header, data] = base64.split(',');
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
    const bin  = atob(data);
    const arr  = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return createImageBitmap(new Blob([arr], { type: mime }));
}

async function bitmapToBase64(canvas: OffscreenCanvas): Promise<string> {
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    });
}

// ── Encode ────────────────────────────────────────────────────────────────────

async function handleEncode(imageBase64: string) {
    await loadSessions();

    const bmp = await base64ToBitmap(imageBase64);
    const origW = bmp.width, origH = bmp.height;

    const c = new OffscreenCanvas(SAM_SIZE, SAM_SIZE);
    c.getContext('2d')!.drawImage(bmp, 0, 0, SAM_SIZE, SAM_SIZE);
    const { data } = c.getContext('2d')!.getImageData(0, 0, SAM_SIZE, SAM_SIZE);
    bmp.close();

    const t = new Float32Array(3 * SAM_SIZE * SAM_SIZE);
    for (let i = 0; i < SAM_SIZE * SAM_SIZE; i++) {
        t[i]                       = (data[i * 4]     / 255 - MEAN[0]) / STD[0];
        t[SAM_SIZE ** 2 + i]       = (data[i * 4 + 1] / 255 - MEAN[1]) / STD[1];
        t[SAM_SIZE ** 2 * 2 + i]   = (data[i * 4 + 2] / 255 - MEAN[2]) / STD[2];
    }

    const features = await encSession!.run({
        [encSession!.inputNames[0]]: new ort.Tensor('float32', t, [1, 3, SAM_SIZE, SAM_SIZE]),
    });

    embedding = { features, origW, origH };
    return { origW, origH };
}

// ── Decode ────────────────────────────────────────────────────────────────────

async function handleDecode(
    options: {
        clickPoint?: { x: number; y: number };
        points?: { x: number; y: number; label: 0 | 1 }[];
        bbox?: { x: number; y: number; w: number; h: number };
        roughMask?: string;
    },
    originalImageBase64: string,
): Promise<string> {
    if (!embedding) throw new Error('請先執行 encode（圖片尚未建立 Embedding）');

    const { features, origW, origH } = embedding;
    const scaleX = SAM_SIZE / origW;
    const scaleY = SAM_SIZE / origH;

    let coords: number[], labels: number[];
    let maskData = new Float32Array(256 * 256);
    let hasMask  = 0;

    if (options.bbox) {
        const { x, y, w, h } = options.bbox;
        coords = [x * scaleX, y * scaleY, (x + w) * scaleX, (y + h) * scaleY];
        labels = [2, 3];
    } else if (options.points?.length) {
        coords = options.points.flatMap(p => [p.x * scaleX, p.y * scaleY]);
        labels = options.points.map(p => p.label);
        coords.push(0, 0); labels.push(-1);
    } else if (options.roughMask) {
        // roughMask → 3×3 網格正點 + 四角負點
        const bmp = await base64ToBitmap(options.roughMask);
        const mW = bmp.width, mH = bmp.height;
        const c = new OffscreenCanvas(mW, mH);
        c.getContext('2d')!.drawImage(bmp, 0, 0, mW, mH);
        const px = c.getContext('2d')!.getImageData(0, 0, mW, mH).data;
        bmp.close();
        let minX = mW, minY = mH, maxX = 0, maxY = 0;
        const painted: [number, number][] = [];
        for (let i = 0; i < mW * mH; i++) {
            if (px[i * 4] > 127) {
                const x = i % mW, y = Math.floor(i / mW);
                painted.push([x, y]);
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
            }
        }
        if (painted.length === 0) { coords = [0, 0, 0, 0]; labels = [1, -1]; }
        else {
            // 3×3 網格取樣正點
            const GRID = 3;
            const cellW = (maxX - minX + 1) / GRID;
            const cellH = (maxY - minY + 1) / GRID;
            const posPoints: [number, number][] = [];
            for (let row = 0; row < GRID; row++) {
                for (let col = 0; col < GRID; col++) {
                    const cx = minX + cellW * (col + 0.5), cy = minY + cellH * (row + 0.5);
                    let best: [number, number] | null = null, bestDist = Infinity;
                    for (const [bx, by] of painted) {
                        if (bx >= minX + cellW * col && bx < minX + cellW * (col + 1) &&
                            by >= minY + cellH * row && by < minY + cellH * (row + 1)) {
                            const d = (bx - cx) ** 2 + (by - cy) ** 2;
                            if (d < bestDist) { bestDist = d; best = [bx, by]; }
                        }
                    }
                    if (best) posPoints.push(best);
                }
            }
            if (posPoints.length === 0) posPoints.push(painted[Math.floor(painted.length / 2)]);
            // 四角負點（未塗到的角落）
            const corners: [number, number][] = [[minX, minY], [maxX, minY], [minX, maxY], [maxX, maxY]];
            const negPoints = corners.filter(([nx, ny]) => px[(ny * mW + nx) * 4] <= 127);
            coords = [
                ...posPoints.flatMap(([x, y]) => [(x / mW) * origW * scaleX, (y / mH) * origH * scaleY]),
                ...negPoints.flatMap(([x, y]) => [(x / mW) * origW * scaleX, (y / mH) * origH * scaleY]),
            ];
            labels = [...posPoints.map(() => 1), ...negPoints.map(() => 0)];
            coords.push(0, 0); labels.push(-1);
        }
    } else if (options.clickPoint) {
        coords = [options.clickPoint.x * scaleX, options.clickPoint.y * scaleY, 0, 0];
        labels = [1, -1];
    } else {
        throw new Error('需要提供 clickPoint、bbox、points 或 roughMask');
    }

    const numPoints = coords.length / 2;
    const outputs = await decSession!.run({
        ...features,
        point_coords:   new ort.Tensor('float32', new Float32Array(coords),   [1, numPoints, 2]),
        point_labels:   new ort.Tensor('float32', new Float32Array(labels),   [1, numPoints]),
        mask_input:     new ort.Tensor('float32', maskData,                   [1, 1, 256, 256]),
        has_mask_input: new ort.Tensor('float32', new Float32Array([hasMask]), [1]),
        orig_im_size:   new ort.Tensor('int32',   new Int32Array([origH, origW]), [2]),
    });

    const masks    = outputs[decSession!.outputNames[0]];
    const iouData  = outputs[decSession!.outputNames[1]].data as Float32Array;
    const bestIdx  = Array.from(iouData).indexOf(Math.max(...Array.from(iouData)));
    const maskOut  = masks.data as Float32Array;
    const pxCount  = origW * origH;
    const offset   = bestIdx * pxCount;

    // 原圖 + mask → 透明 PNG
    const origBmp = await base64ToBitmap(originalImageBase64);
    const canvas  = new OffscreenCanvas(origW, origH);
    const ctx     = canvas.getContext('2d')!;
    ctx.drawImage(origBmp, 0, 0, origW, origH);
    origBmp.close();

    const mCanvas = new OffscreenCanvas(origW, origH);
    const mCtx    = mCanvas.getContext('2d')!;
    const mData   = mCtx.createImageData(origW, origH);
    for (let i = 0; i < pxCount; i++) {
        const v = maskOut[offset + i] > 0 ? 255 : 0;
        mData.data[i * 4] = mData.data[i * 4 + 1] = mData.data[i * 4 + 2] = v;
        mData.data[i * 4 + 3] = v;
    }
    mCtx.putImageData(mData, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(mCanvas, 0, 0);

    return bitmapToBase64(canvas);
}

// ── Message router ────────────────────────────────────────────────────────────

self.onmessage = async (e: MessageEvent) => {
    const { type, id } = e.data;
    try {
        if (type === 'encode') {
            const r = await handleEncode(e.data.imageBase64);
            self.postMessage({ type: 'encoded', id, ...r });
        } else if (type === 'decode') {
            const result = await handleDecode(e.data.options, e.data.originalImageBase64);
            self.postMessage({ type: 'decoded', id, result });
        }
    } catch (err: any) {
        self.postMessage({ type: 'error', id, message: err?.message ?? '未知錯誤' });
    }
};
