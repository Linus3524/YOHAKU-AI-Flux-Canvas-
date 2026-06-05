/**
 * SAM 2 ONNX 本機推論
 * Encoder：圖片載入後算一次 embedding（重複使用）
 * Decoder：每次點選/框選即時回傳 mask
 *
 * 模型來源：huggingface.co/vietanhdev/segment-anything-2-onnx-models
 * 輸入尺寸：1024 × 1024
 */
import * as ort from 'onnxruntime-web';

const SAM_SIZE = 1024;
// ImageNet 正規化參數
const MEAN = [0.485, 0.456, 0.406];
const STD  = [0.229, 0.224, 0.225];

/** 把 HTMLImageElement 前處理成 SAM2 Encoder 所需的 Float32 tensor */
function preprocessImage(img: HTMLImageElement): Float32Array {
    const c = document.createElement('canvas');
    c.width = c.height = SAM_SIZE;
    c.getContext('2d')!.drawImage(img, 0, 0, SAM_SIZE, SAM_SIZE);
    const { data } = c.getContext('2d')!.getImageData(0, 0, SAM_SIZE, SAM_SIZE);

    const t = new Float32Array(3 * SAM_SIZE * SAM_SIZE);
    for (let i = 0; i < SAM_SIZE * SAM_SIZE; i++) {
        t[i]                        = (data[i * 4]     / 255 - MEAN[0]) / STD[0];
        t[SAM_SIZE ** 2 + i]        = (data[i * 4 + 1] / 255 - MEAN[1]) / STD[1];
        t[SAM_SIZE ** 2 * 2 + i]    = (data[i * 4 + 2] / 255 - MEAN[2]) / STD[2];
    }
    return t;
}

export interface SAM2Embedding {
    /** Encoder 的所有輸出（傳給 Decoder 用） */
    features: Record<string, ort.Tensor>;
    origW: number;
    origH: number;
}

/** Step 1：計算圖片 Embedding（圖片載入後跑一次即可） */
export async function computeSAM2Embedding(
    encoderSession: ort.InferenceSession,
    imageBase64: string,
): Promise<SAM2Embedding> {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = imageBase64;
    });

    const imageData = preprocessImage(img);
    const imageTensor = new ort.Tensor('float32', imageData, [1, 3, SAM_SIZE, SAM_SIZE]);

    const outputs = await encoderSession.run({
        [encoderSession.inputNames[0]]: imageTensor,
    });

    return { features: outputs, origW: img.naturalWidth, origH: img.naturalHeight };
}

/**
 * Step 2：根據點擊或框選生成 mask（傳入 SAM2Embedding 省去重複算）
 * @returns 透明 PNG base64（原圖尺寸，物件區域有不透明像素）
 */
export async function runSAM2Decoder(
    decoderSession: ort.InferenceSession,
    embedding: SAM2Embedding,
    options: {
        clickPoint?: { x: number; y: number };
        points?: { x: number; y: number; label: 0 | 1 }[];
        bbox?: { x: number; y: number; w: number; h: number };
    },
    /** 原圖 base64，用於把 mask 貼回真實像素（若不傳則輸出黑色 mask）*/
    originalImageBase64?: string,
): Promise<string> {
    const { origW, origH, features } = embedding;

    // 把座標換算到 SAM 的 1024 空間
    const scaleX = SAM_SIZE / origW;
    const scaleY = SAM_SIZE / origH;

    let coords: number[];
    let labels: number[];

    if (options.bbox) {
        const { x, y, w, h } = options.bbox;
        // 框選用兩個點（左上 + 右下），label 都是 2（box token）
        coords = [x * scaleX, y * scaleY, (x + w) * scaleX, (y + h) * scaleY];
        labels = [2, 3];
    } else if (options.points && options.points.length > 0) {
        coords = options.points.flatMap(p => [p.x * scaleX, p.y * scaleY]);
        labels = options.points.map(p => p.label);
        // SAM2 需要補一個 padding 點
        coords.push(0, 0);
        labels.push(-1);
    } else if (options.clickPoint) {
        coords = [options.clickPoint.x * scaleX, options.clickPoint.y * scaleY, 0, 0];
        labels = [1, -1];
    } else {
        throw new Error('SAM2 Decoder: 需要提供 clickPoint、points 或 bbox');
    }

    const numPoints = coords.length / 2;
    const pointCoords  = new ort.Tensor('float32', new Float32Array(coords),  [1, numPoints, 2]);
    const pointLabels  = new ort.Tensor('float32', new Float32Array(labels),  [1, numPoints]);
    const maskInput    = new ort.Tensor('float32', new Float32Array(256 * 256), [1, 1, 256, 256]);
    const hasMaskInput = new ort.Tensor('float32', new Float32Array([0]),      [1]);
    const origImSize   = new ort.Tensor('int32', new Int32Array([origH, origW]), [2]);

    // 組合 Decoder 輸入（feature keys 來自 Encoder 輸出）
    const inputs: Record<string, ort.Tensor> = {
        ...features,
        point_coords:   pointCoords,
        point_labels:   pointLabels,
        mask_input:     maskInput,
        has_mask_input: hasMaskInput,
        orig_im_size:   origImSize,
    };

    const outputs = await decoderSession.run(inputs);

    // 取 IoU 最高的 mask
    const masks     = outputs[decoderSession.outputNames[0]];
    const iouScores = outputs[decoderSession.outputNames[1]];
    const iouData   = iouScores.data as Float32Array;
    const bestIdx   = Array.from(iouData).indexOf(Math.max(...Array.from(iouData)));

    const maskData  = masks.data as Float32Array;
    const pixelCount = origW * origH;
    const offset     = bestIdx * pixelCount;

    // 轉成透明 PNG：用原圖像素 + mask alpha
    const canvas = document.createElement('canvas');
    canvas.width = origW; canvas.height = origH;
    const ctx = canvas.getContext('2d')!;

    if (originalImageBase64) {
        // 把原圖畫上去，再用 destination-in 套 mask
        await new Promise<void>((res, rej) => {
            const img = new Image();
            img.onload = () => { ctx.drawImage(img, 0, 0, origW, origH); res(); };
            img.onerror = rej;
            img.src = originalImageBase64;
        });
        // 建立 mask canvas
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = origW; maskCanvas.height = origH;
        const mCtx = maskCanvas.getContext('2d')!;
        const mData = mCtx.createImageData(origW, origH);
        for (let i = 0; i < pixelCount; i++) {
            const v = maskData[offset + i] > 0 ? 255 : 0;
            mData.data[i * 4] = mData.data[i * 4 + 1] = mData.data[i * 4 + 2] = v;
            mData.data[i * 4 + 3] = v;
        }
        mCtx.putImageData(mData, 0, 0);
        // destination-in：原圖只保留 mask 白色的部分
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(maskCanvas, 0, 0);
    } else {
        // fallback：黑色 mask
        const imgData = ctx.createImageData(origW, origH);
        for (let i = 0; i < pixelCount; i++) {
            imgData.data[i * 4 + 3] = maskData[offset + i] > 0 ? 255 : 0;
        }
        ctx.putImageData(imgData, 0, 0);
    }
    return canvas.toDataURL('image/png');
}

/**
 * 完整的單次 ONNX SAM2 推論：
 * 需要已有 embedding（用 computeSAM2Embedding 預算）
 * 支援 clickPoint / bbox / points 三種輸入
 */
export async function runOnnxSAM2(
    decoderSession: ort.InferenceSession,
    embedding: SAM2Embedding,
    options: {
        clickPoint?: { x: number; y: number };
        bbox?: { x: number; y: number; w: number; h: number };  // 0~1 比例
        points?: { x: number; y: number; label: 0 | 1 }[];      // 像素座標
    },
    originalImageBase64: string,
): Promise<string> {
    const { origW, origH } = embedding;

    if (options.bbox) {
        // 比例座標 → 像素座標
        const px = options.bbox.x * origW;
        const py = options.bbox.y * origH;
        const pw = options.bbox.w * origW;
        const ph = options.bbox.h * origH;
        return runSAM2Decoder(decoderSession, embedding,
            { bbox: { x: px, y: py, w: pw, h: ph } },
            originalImageBase64);
    }
    if (options.points) {
        return runSAM2Decoder(decoderSession, embedding,
            { points: options.points },
            originalImageBase64);
    }
    if (options.clickPoint) {
        return runSAM2Decoder(decoderSession, embedding,
            { clickPoint: options.clickPoint },
            originalImageBase64);
    }
    throw new Error('runOnnxSAM2: 需要提供 clickPoint、bbox 或 points');
}
