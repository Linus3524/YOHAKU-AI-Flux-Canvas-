/**
 * OCR Web Worker
 * 在背景執行緒中運行 PP-OCRv4 模型的 ONNX 推論，以避免卡頓主介面。
 * 
 * 包含：
 * 1. DBNet 文字偵測：輸出機率圖 -> 二值化 -> BFS 連通域尋找 BBox -> Unclip 擴展。
 * 2. SVTR 文字辨識：針對各 BBox 裁切圖片 -> 縮放至 48px 高度 -> 辨識推論 -> CTC 貪婪解碼 -> 輸出字串。
 */
import * as ort from 'onnxruntime-web/all';
import { get } from 'idb-keyval';

// WASM 檔案從與 SAM2 / LaMa 相同之 CDN 載入，保持一致
ort.env.wasm.numThreads = 1;
(ort.env.wasm as any).wasmPaths =
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0/dist/';

const DET_KEY = 'onnx_ocr_det_v4_1';
const REC_KEY = 'onnx_ocr_rec_v4_1';
const DICT_KEY = 'onnx_ocr_dict_v4_1';

let detSession: ort.InferenceSession | null = null;
let recSession: ort.InferenceSession | null = null;
let charList: string[] = [];

// ── 載入模型與字典 ────────────────────────────────────────────────────────────
async function initOCR() {
    if (detSession && recSession && charList.length > 0) return;

    const [detBuf, recBuf, dictBuf] = await Promise.all([
        get<ArrayBuffer>(DET_KEY),
        get<ArrayBuffer>(REC_KEY),
        get<ArrayBuffer>(DICT_KEY),
    ]);

    if (!detBuf) throw new Error('OCR 偵測模型尚未下載，請先在「本機 AI 模型」下載');
    if (!recBuf) throw new Error('OCR 辨識模型尚未下載，請先在「本機 AI 模型」下載');
    if (!dictBuf) throw new Error('OCR 字典檔尚未下載，請先在「本機 AI 模型」下載');

    // 載入 ONNX Sessions (強制 WASM 以求最穩定的 CPU 推論相容性與記憶體管理)
    [detSession, recSession] = await Promise.all([
        ort.InferenceSession.create(detBuf, { executionProviders: ['wasm'] }),
        ort.InferenceSession.create(recBuf, { executionProviders: ['wasm'] }),
    ]);

    // 解析字元字典檔
    const decoder = new TextDecoder('utf-8');
    const dictText = decoder.decode(dictBuf);
    charList = dictText.split(/\r?\n/);
}

// ── 影像轉換工具 ──────────────────────────────────────────────────────────────
async function base64ToBitmap(base64: string): Promise<ImageBitmap> {
    const [header, data] = base64.split(',');
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
    const bin = atob(data);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return createImageBitmap(new Blob([arr], { type: mime }));
}

// ── 文字偵測 (DBNet) ──────────────────────────────────────────────────────────
interface Box {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
}

async function detectTextBoxes(bmp: ImageBitmap): Promise<{ boxes: Box[]; detW: number; detH: number }> {
    // DBNet 輸入必須為 32 的倍數，設最長邊為 736 進行縮放以保持良好精度與效率
    const MAX_SIDE = 736;
    let detW = bmp.width;
    let detH = bmp.height;

    if (detW > detH) {
        if (detW > MAX_SIDE) {
            detH = Math.round((detH / detW) * MAX_SIDE);
            detW = MAX_SIDE;
        }
    } else {
        if (detH > MAX_SIDE) {
            detW = Math.round((detW / detH) * MAX_SIDE);
            detH = MAX_SIDE;
        }
    }

    // 調整至 32 的倍數
    detW = Math.round(detW / 32) * 32;
    detH = Math.round(detH / 32) * 32;
    if (detW === 0) detW = 32;
    if (detH === 0) detH = 32;

    const canvas = new OffscreenCanvas(detW, detH);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0, detW, detH);

    const imgData = ctx.getImageData(0, 0, detW, detH);
    const pixels = imgData.data;

    // 前處理：標準 ImageNet 正規化
    // mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225]
    const tensorSize = detW * detH;
    const inputData = new Float32Array(3 * tensorSize);

    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];

    for (let i = 0; i < tensorSize; i++) {
        const r = pixels[i * 4] / 255;
        const g = pixels[i * 4 + 1] / 255;
        const b = pixels[i * 4 + 2] / 255;

        inputData[i] = (r - mean[0]) / std[0];
        inputData[tensorSize + i] = (g - mean[1]) / std[1];
        inputData[2 * tensorSize + i] = (b - mean[2]) / std[2];
    }

    const inputTensor = new ort.Tensor('float32', inputData, [1, 3, detH, detW]);
    const outputMap = await detSession!.run({
        [detSession!.inputNames[0]]: inputTensor
    });

    const probData = outputMap[detSession!.outputNames[0]].data as Float32Array;

    // 二值化與 BFS 連通域分析找出 BBox
    const visited = new Uint8Array(tensorSize);
    const rawBoxes: Box[] = [];

    for (let y = 0; y < detH; y++) {
        for (let x = 0; x < detW; x++) {
            const idx = y * detW + x;
            if (probData[idx] >= 0.3 && !visited[idx]) {
                // BFS
                let xmin = x, xmax = x;
                let ymin = y, ymax = y;

                const queue: number[] = [idx];
                visited[idx] = 1;
                let head = 0;

                while (head < queue.length) {
                    const curr = queue[head++];
                    const cx = curr % detW;
                    const cy = Math.floor(curr / detW);

                    if (cx < xmin) xmin = cx;
                    if (cx > xmax) xmax = cx;
                    if (cy < ymin) ymin = cy;
                    if (cy > ymax) ymax = cy;

                    const neighbors = [
                        cy > 0 ? (cy - 1) * detW + cx : -1,
                        cy < detH - 1 ? (cy + 1) * detW + cx : -1,
                        cx > 0 ? cy * detW + (cx - 1) : -1,
                        cx < detW - 1 ? cy * detW + (cx + 1) : -1
                    ];

                    for (const n of neighbors) {
                        if (n !== -1 && !visited[n] && probData[n] >= 0.3) {
                            visited[n] = 1;
                            queue.push(n);
                        }
                    }
                }

                // 排除太小噪點 (寬度或高度小於 4 像素)
                if ((xmax - xmin + 1) >= 4 && (ymax - ymin + 1) >= 4) {
                    rawBoxes.push({ xmin, ymin, xmax, ymax });
                }
            }
        }
    }

    // Unclip 擴展公式 (DBNet 輸出會略偏窄，進行 1.6 倍擴張)
    const refinedBoxes = rawBoxes.map(b => {
        const w = b.xmax - b.xmin + 1;
        const h = b.ymax - b.ymin + 1;
        const area = w * h;
        const perimeter = 2 * (w + h);
        const distance = Math.round((area * 1.6) / perimeter);

        return {
            xmin: Math.max(0, b.xmin - distance),
            ymin: Math.max(0, b.ymin - distance),
            xmax: Math.min(detW - 1, b.xmax + distance),
            ymax: Math.min(detH - 1, b.ymax + distance),
        };
    });

    return { boxes: refinedBoxes, detW, detH };
}

// ── 文字辨識 (SVTR / CRNN) ──────────────────────────────────────────────────
async function recognizeText(
    bmp: ImageBitmap,
    boxes: Box[],
    detW: number,
    detH: number
): Promise<{ text: string; bbox: { x: number; y: number; w: number; h: number } }[]> {
    const results: { text: string; bbox: { x: number; y: number; w: number; h: number } }[] = [];

    // 計算放大/映射因子回到原圖座標
    const scaleX = bmp.width / detW;
    const scaleY = bmp.height / detH;

    for (const b of boxes) {
        // 映射回原圖座標
        const origX = Math.round(b.xmin * scaleX);
        const origY = Math.round(b.ymin * scaleY);
        const origW = Math.round((b.xmax - b.xmin + 1) * scaleX);
        const origH = Math.round((b.ymax - b.ymin + 1) * scaleY);

        if (origW <= 4 || origH <= 4) continue;

        // 裁切文字區塊影像
        const cropCanvas = new OffscreenCanvas(origW, origH);
        const cropCtx = cropCanvas.getContext('2d')!;
        cropCtx.drawImage(bmp, origX, origY, origW, origH, 0, 0, origW, origH);

        // 辨識前處理：將高度固定在 48 像素，寬度依比例自適應
        const recH = 48;
        const recW = Math.max(48, Math.round((origW / origH) * recH));

        const normCanvas = new OffscreenCanvas(recW, recH);
        const normCtx = normCanvas.getContext('2d')!;
        normCtx.drawImage(cropCanvas, 0, 0, recW, recH);

        const recData = normCtx.getImageData(0, 0, recW, recH).data;

        // PP-OCR 辨識正規化：(x - 127.5) / 127.5 即對應 [0, 255] 映射至 [-1, 1]
        const tensorSize = recW * recH;
        const inputData = new Float32Array(3 * tensorSize);

        for (let i = 0; i < tensorSize; i++) {
            const r = recData[i * 4];
            const g = recData[i * 4 + 1];
            const b = recData[i * 4 + 2];

            inputData[i] = (r - 127.5) / 127.5;
            inputData[tensorSize + i] = (g - 127.5) / 127.5;
            inputData[2 * tensorSize + i] = (b - 127.5) / 127.5;
        }

        const inputTensor = new ort.Tensor('float32', inputData, [1, 3, recH, recW]);
        
        // 執行辨識
        const outputs = await recSession!.run({
            [recSession!.inputNames[0]]: inputTensor
        });

        const logits = outputs[recSession!.outputNames[0]].data as Float32Array;
        const dims = outputs[recSession!.outputNames[0]].dims; // [1, seq_len, num_classes]
        const seqLen = dims[1];
        const numClasses = dims[2];

        // CTC 貪婪解碼 (Greedy Decoder)
        let text = '';
        let lastCharIdx = -1;

        for (let t = 0; t < seqLen; t++) {
            let maxVal = -Infinity;
            let maxIdx = -1;
            const stepOffset = t * numClasses;

            for (let c = 0; c < numClasses; c++) {
                const val = logits[stepOffset + c];
                if (val > maxVal) {
                    maxVal = val;
                    maxIdx = c;
                }
            }

            // 0 代表 CTC blank character，跳過；且排除重複相鄰字符
            if (maxIdx > 0 && maxIdx !== lastCharIdx) {
                // 字典對照，PPOCR 輸出索引為 1-based (index 0 是 blank，對應 charList[maxIdx - 1])
                const char = charList[maxIdx - 1];
                if (char) {
                    text += char;
                }
            }
            lastCharIdx = maxIdx;
        }

        // 去除首尾空格
        text = text.trim();

        if (text.length > 0) {
            results.push({
                text,
                bbox: {
                    x: origX / bmp.width,
                    y: origY / bmp.height,
                    w: origW / bmp.width,
                    h: origH / bmp.height
                }
            });
        }
    }

    return results;
}

// ── 閱讀順序重排 (Reading Order Sorter) ──────────────────────────────────────
function sortOcrResults(results: { text: string; bbox: { x: number; y: number; w: number; h: number } }[]) {
    // 以 y-中心點與高度閥值重組行，自上而下、從左至右排序
    return results.sort((a, b) => {
        const centerY_A = a.bbox.y + a.bbox.h / 2;
        const centerY_B = b.bbox.y + b.bbox.h / 2;
        const threshold = Math.min(a.bbox.h, b.bbox.h) * 0.5;

        if (Math.abs(centerY_A - centerY_B) > threshold) {
            return centerY_A - centerY_B;
        }
        return a.bbox.x - b.bbox.x;
    });
}

// ── 訊息路由器 (Worker Router) ────────────────────────────────────────────────
self.onmessage = async (e: MessageEvent) => {
    const { type, id, imageBase64 } = e.data;
    if (type !== 'run') return;

    try {
        await initOCR();

        const bmp = await base64ToBitmap(imageBase64);
        
        // 1. 偵測文字位置
        const { boxes, detW, detH } = await detectTextBoxes(bmp);

        // 2. 辨識文字內容
        let results = await recognizeText(bmp, boxes, detW, detH);

        // 3. 重排為自然閱讀順序
        results = sortOcrResults(results);

        bmp.close();

        // 回傳結果
        self.postMessage({
            type: 'results',
            id,
            results: results.map(r => ({
                text: r.text,
                bbox: r.bbox,
                lines: 1, // 單行估算
                isBold: false,
                isItalic: false,
                align: 'left',
                colorHex: '#1D1D1F' // 預設安全文字顏色
            }))
        });
    } catch (err: any) {
        console.error('[OCR Worker] 發生錯誤：', err);
        self.postMessage({
            type: 'error',
            id,
            message: err?.message ?? '本地 OCR 執行失敗'
        });
    }
};
