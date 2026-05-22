/**
 * Vercel Serverless Function — Temporary Image Upload Proxy
 * POST /api/upload-temp
 * Body: { base64: "<raw-base64-string>", mimeType: "image/png" }
 * Returns: { url: "https://tmpfiles.org/dl/..." }
 *
 * 用途：把 canvas 的 base64 圖片暫存為可公開存取的 URL，
 * 供 Atlas Cloud 等只接受 HTTP URL 的 API 使用。
 * tmpfiles.org 免費，檔案保存 1 小時，無需帳號。
 */
export default async function handler(req, res) {
    // CORS headers — 允許 localhost 本機測試呼叫
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { base64, mimeType = 'image/png' } = req.body || {};
    if (!base64) {
        return res.status(400).json({ error: 'Missing base64 field' });
    }

    try {
        // base64 → binary buffer
        const buffer = Buffer.from(base64, 'base64');

        // 上傳到 tmpfiles.org（免費暫存，1小時有效）
        const formData = new FormData();
        const blob = new Blob([buffer], { type: mimeType });
        formData.append('file', blob, 'image.png');

        const uploadRes = await fetch('https://tmpfiles.org/api/v1/upload', {
            method: 'POST',
            body: formData,
        });

        if (!uploadRes.ok) {
            const text = await uploadRes.text();
            return res.status(502).json({ error: `tmpfiles.org 上傳失敗 (${uploadRes.status}): ${text}` });
        }

        const json = await uploadRes.json();
        // 回應格式: { "status": "success", "data": { "url": "https://tmpfiles.org/12345/image.png" } }
        const rawUrl = json?.data?.url;
        if (!rawUrl) {
            return res.status(502).json({ error: `tmpfiles.org 未回傳 URL：${JSON.stringify(json)}` });
        }

        // tmpfiles.org 的檢視頁 URL 需轉為直連下載 URL（加 /dl/）
        const dlUrl = rawUrl.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');

        return res.status(200).json({ url: dlUrl });
    } catch (e) {
        return res.status(500).json({ error: String(e) });
    }
}
