/**
 * Vercel Serverless Function — Image CORS Proxy
 * GET /api/image-proxy?url=<encoded-image-url>
 * Fetches the image server-side (no CORS restriction) and streams it back.
 *
 * 安全性：只允許 https 圖片 URL，不允許 localhost / 內網 IP
 */
export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    let targetUrl;
    try {
        targetUrl = decodeURIComponent(url);
        const parsed = new URL(targetUrl);

        // 只允許 HTTPS，拒絕 localhost / 內網
        if (parsed.protocol !== 'https:') {
            return res.status(403).json({ error: 'Only HTTPS URLs allowed' });
        }
        const host = parsed.hostname;
        if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.') || host.endsWith('.local')) {
            return res.status(403).json({ error: 'Internal addresses not allowed' });
        }
    } catch {
        return res.status(400).json({ error: 'Invalid url' });
    }

    try {
        const upstream = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; YOHAKU-Proxy/1.0)' }
        });
        if (!upstream.ok) {
            return res.status(upstream.status).json({ error: `Upstream error: ${upstream.status}` });
        }

        // 只允許圖片類型的回應
        const contentType = upstream.headers.get('content-type') || '';
        if (!contentType.startsWith('image/') && !contentType.startsWith('application/octet')) {
            return res.status(415).json({ error: 'Not an image' });
        }

        const buffer = await upstream.arrayBuffer();

        res.setHeader('Content-Type', contentType || 'image/png');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.status(200).send(Buffer.from(buffer));
    } catch (e) {
        return res.status(500).json({ error: String(e) });
    }
}
