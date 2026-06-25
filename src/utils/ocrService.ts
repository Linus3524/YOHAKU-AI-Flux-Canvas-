/**
 * OCR 文字辨識服務
 * Gemini Vision → 語意文字區塊（text + bbox + style）→ TextElement 建立資料
 */

import { GoogleGenAI } from '@google/genai';

export interface OcrBlock {
    text: string;
    bbox: { x: number; y: number; w: number; h: number }; // 0~1 相對比例
    lines: number;        // 估算行數（用於計算 fontSize）
    isBold: boolean;
    isItalic: boolean;
    align: 'left' | 'center' | 'right';
    colorHex: string;     // 最接近的文字顏色（hex）
}

export async function detectTextBlocks(
    imageBase64: string,
    apiKey: string,
): Promise<OcrBlock[]> {
    // 優先檢查並使用本機 WASM/ONNX OCR 推論
    try {
        const { getModelStatus } = await import('./onnxModelCache');
        const [det, rec, dict] = await Promise.all([
            getModelStatus('ocr_det'),
            getModelStatus('ocr_rec'),
            getModelStatus('ocr_dict'),
        ]);

        if (det === 'ready' && rec === 'ready' && dict === 'ready') {
            console.log('[OCR] 本機 OCR 模型已就緒，使用本機 WebAssembly/ONNX 推論...');
            const { runOcrInWorker } = await import('./ocrWorkerClient');
            const localBlocks = await runOcrInWorker(imageBase64);
            if (localBlocks && localBlocks.length > 0) {
                console.log(`[OCR] 本機推論成功，偵測到 ${localBlocks.length} 個文字區塊`);
                return localBlocks;
            }
            console.log('[OCR] 本機推論未偵測到任何文字，將嘗試使用 Gemini 進行二次比對...');
        }
    } catch (e) {
        console.warn('[OCR] 本機 OCR 推論失敗，將自動降級使用 Gemini API:', e);
    }

    if (!apiKey) {
        throw new Error('本地 OCR 尚未安裝且未提供 Gemini API Key，無法進行文字辨識。');
    }

    const ai = new GoogleGenAI({ apiKey });
    const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
    const mimeType = imageBase64.match(/data:(.*);base64/)?.[1] ?? 'image/png';

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { mimeType, data: cleanBase64 } },
                {
                    text: `You are a precise OCR and layout analysis AI. Detect all readable text in this image.

━━━ GROUPING RULES ━━━
Group text into semantic blocks — NOT by individual line or word:
- A headline/title = 1 block
- A paragraph of body text = 1 block
- A label or caption = 1 block
- A logo wordmark = 1 block
- A small annotation or watermark = 1 block

━━━ WHAT TO INCLUDE ━━━
Include ALL visible readable text, no matter how small.
This includes: headlines, body copy, captions, labels, logos, watermarks, prices, dates, URLs, slogans.

━━━ WHAT TO EXCLUDE ━━━
Do NOT invent text. Only report what you can actually read.
Skip illegible or purely decorative symbols that carry no readable meaning.

━━━ OUTPUT FORMAT ━━━
Return ONLY a valid JSON array — no markdown, no explanation:
[
  {
    "text": "exact text content (use \\n for line breaks within a block)",
    "bbox": {"x": 0.10, "y": 0.05, "w": 0.35, "h": 0.12},
    "lines": 1,
    "isBold": true,
    "isItalic": false,
    "align": "left",
    "colorHex": "#FFFFFF"
  }
]

bbox: x,y = top-left corner (fraction of image width/height), w,h = size fraction.
lines: number of text lines within this block.
colorHex: dominant text color as hex (e.g. "#FFFFFF", "#333333", "#2196F3").
align: text alignment within its block — "left", "center", or "right".`
                }
            ]
        }
    });

    const raw = response.text ?? '';
    const stripped = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    const match = stripped.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('Gemini OCR 未回傳有效結果，請重試');

    let blocks: OcrBlock[];
    try {
        blocks = JSON.parse(match[0]);
    } catch {
        throw new Error('Gemini OCR 回傳格式解析失敗，請重試');
    }

    // 安全夾值
    return blocks.map(b => ({
        text: String(b.text ?? ''),
        bbox: {
            x: Math.max(0, Math.min(1, b.bbox?.x ?? 0)),
            y: Math.max(0, Math.min(1, b.bbox?.y ?? 0)),
            w: Math.max(0.01, Math.min(1, b.bbox?.w ?? 0.2)),
            h: Math.max(0.01, Math.min(1, b.bbox?.h ?? 0.05)),
        },
        lines: Math.max(1, Math.round(b.lines ?? 1)),
        isBold: !!b.isBold,
        isItalic: !!b.isItalic,
        align: (['left', 'center', 'right'].includes(b.align) ? b.align : 'left') as OcrBlock['align'],
        colorHex: typeof b.colorHex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(b.colorHex)
            ? b.colorHex
            : '#1D1D1F',
    }));
}
