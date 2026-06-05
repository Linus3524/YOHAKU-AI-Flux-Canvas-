/**
 * LaMa ONNX 推論：物件移除填洞
 * 輸入：原圖 base64 + 黑白 mask（白=要填補）
 * 輸出：填補後的圖片 base64
 *
 * 注意：LaMa 輸入尺寸固定 512×512
 * 流程：縮圖 → 推論 → 放大回原尺寸 → base64
 */
import * as ort from 'onnxruntime-web';

const LAMA_SIZE = 512;

function getImageDims(base64: string): Promise<{ w: number; h: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = reject;
        img.src = base64;
    });
}

function prepareInputs(
    imageBase64: string,
    maskBase64: string,
): Promise<{ imageTensor: Float32Array; maskTensor: Float32Array }> {
    return new Promise(resolve => {
        const imgEl = new Image(), maskEl = new Image();
        let done = 0;
        const check = () => {
            if (++done < 2) return;

            const imgC = document.createElement('canvas');
            imgC.width = imgC.height = LAMA_SIZE;
            imgC.getContext('2d')!.drawImage(imgEl, 0, 0, LAMA_SIZE, LAMA_SIZE);
            const imgD = imgC.getContext('2d')!.getImageData(0, 0, LAMA_SIZE, LAMA_SIZE).data;

            const mskC = document.createElement('canvas');
            mskC.width = mskC.height = LAMA_SIZE;
            mskC.getContext('2d')!.drawImage(maskEl, 0, 0, LAMA_SIZE, LAMA_SIZE);
            const mskD = mskC.getContext('2d')!.getImageData(0, 0, LAMA_SIZE, LAMA_SIZE).data;

            const imageTensor = new Float32Array(3 * LAMA_SIZE * LAMA_SIZE);
            const maskTensor  = new Float32Array(1 * LAMA_SIZE * LAMA_SIZE);

            for (let i = 0; i < LAMA_SIZE * LAMA_SIZE; i++) {
                imageTensor[i]                          = imgD[i * 4]     / 255;  // R
                imageTensor[LAMA_SIZE ** 2 + i]         = imgD[i * 4 + 1] / 255;  // G
                imageTensor[LAMA_SIZE ** 2 * 2 + i]     = imgD[i * 4 + 2] / 255;  // B
                maskTensor[i] = mskD[i * 4] > 127 ? 1 : 0;   // 白=填補
            }

            resolve({ imageTensor, maskTensor });
        };
        imgEl.onload = check;  maskEl.onload = check;
        imgEl.src = imageBase64;  maskEl.src = maskBase64;
    });
}

function outputToBase64(outputData: Float32Array, targetW: number, targetH: number): string {
    // 512×512 輸出 → canvas → 縮放回原始尺寸
    const tmpC = document.createElement('canvas');
    tmpC.width = tmpC.height = LAMA_SIZE;
    const tmpCtx = tmpC.getContext('2d')!;
    const id = tmpCtx.createImageData(LAMA_SIZE, LAMA_SIZE);
    for (let i = 0; i < LAMA_SIZE * LAMA_SIZE; i++) {
        id.data[i * 4]     = Math.round(Math.max(0, Math.min(1, outputData[i])) * 255);
        id.data[i * 4 + 1] = Math.round(Math.max(0, Math.min(1, outputData[LAMA_SIZE ** 2 + i])) * 255);
        id.data[i * 4 + 2] = Math.round(Math.max(0, Math.min(1, outputData[LAMA_SIZE ** 2 * 2 + i])) * 255);
        id.data[i * 4 + 3] = 255;
    }
    tmpCtx.putImageData(id, 0, 0);

    const finalC = document.createElement('canvas');
    finalC.width = targetW; finalC.height = targetH;
    const fCtx = finalC.getContext('2d')!;
    fCtx.imageSmoothingEnabled = true;
    fCtx.imageSmoothingQuality = 'high';
    fCtx.drawImage(tmpC, 0, 0, targetW, targetH);
    return finalC.toDataURL('image/png');
}

/**
 * 用 LaMa ONNX 填補圖片中被遮罩的區域
 * @param session    已載入的 LaMa InferenceSession
 * @param imageBase64 原圖（任意尺寸）
 * @param maskBase64  黑白 mask（白色=要填補的區域）
 */
export async function runLama(
    session: ort.InferenceSession,
    imageBase64: string,
    maskBase64: string,
): Promise<string> {
    const { w: origW, h: origH } = await getImageDims(imageBase64);
    const { imageTensor, maskTensor } = await prepareInputs(imageBase64, maskBase64);

    const imageInput = new ort.Tensor('float32', imageTensor, [1, 3, LAMA_SIZE, LAMA_SIZE]);
    const maskInput  = new ort.Tensor('float32', maskTensor,  [1, 1, LAMA_SIZE, LAMA_SIZE]);

    // LaMa 的輸入名稱：先查 session.inputNames 確認
    const inputNames = session.inputNames;
    const inputs: Record<string, ort.Tensor> = {};
    inputs[inputNames[0]] = imageInput;
    inputs[inputNames[1]] = maskInput;

    const outputs = await session.run(inputs);
    const outputName = session.outputNames[0];
    const outputData = outputs[outputName].data as Float32Array;

    return outputToBase64(outputData, origW, origH);
}

/**
 * 把透明 PNG 轉成黑白 mask（有像素=白色=要填補）
 * 用於語意編輯器：刪除圖層後自動補洞
 */
export function transparentToFillMask(
    transparentBase64: string,
    dilateRadius = 4,
): Promise<string> {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const W = img.naturalWidth, H = img.naturalHeight;
            const c = document.createElement('canvas');
            c.width = W; c.height = H;
            const ctx = c.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            const src = ctx.getImageData(0, 0, W, H);

            // 有不透明像素的地方 = 物件所在 = 白色（要填補）
            const alpha = new Uint8Array(W * H);
            for (let i = 0; i < W * H; i++) alpha[i] = src.data[i * 4 + 3] > 10 ? 1 : 0;

            // 膨脹（讓 mask 向外擴幾個像素，覆蓋邊緣殘影）
            const dilated = new Uint8Array(alpha);
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    if (!alpha[y * W + x]) continue;
                    for (let dy = -dilateRadius; dy <= dilateRadius; dy++) {
                        for (let dx = -dilateRadius; dx <= dilateRadius; dx++) {
                            const nx = x + dx, ny = y + dy;
                            if (nx >= 0 && nx < W && ny >= 0 && ny < H)
                                dilated[ny * W + nx] = 1;
                        }
                    }
                }
            }

            // 輸出黑白 mask
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, W, H);
            const out = ctx.createImageData(W, H);
            for (let i = 0; i < W * H; i++) {
                const v = dilated[i] ? 255 : 0;
                out.data[i * 4] = out.data[i * 4 + 1] = out.data[i * 4 + 2] = v;
                out.data[i * 4 + 3] = 255;
            }
            ctx.putImageData(out, 0, 0);
            resolve(c.toDataURL('image/png'));
        };
        img.onerror = () => resolve('');
        img.src = transparentBase64;
    });
}
