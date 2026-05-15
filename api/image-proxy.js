/**
 * Vercel Serverless Function — Image CORS Proxy
 * GET /api/image-proxy?url=<encoded-image-url>
 * Fetches the image server-side (no CORS restriction) and streams it back.
 */
export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    let targetUrl;
    try {
        targetUrl = decodeURIComponent(url);
        new URL(targetUrl); // validate
    } catch {
        return res.status(400).json({ error: 'Invalid url' });
    }

    // 只允許 Atlas CDN 網域，避免被當作開放 proxy 濫用
    const allowedHosts = [
        'atlas-img.oss-us-west-1.aliyuncs.com',
        'tos-ap-southeast-1.volces.com',
        'tos-cn-beijing.volces.com',
        'cdn.atlascloud.ai',
        'replicate.delivery',
        'pbxt.replicate.delivery',
    ];
    const hostname = new URL(targetUrl).hostname;
    const isAllowed = allowedHosts.some(h => hostname.endsWith(h));
    if (!isAllowed) {
        return res.status(403).json({ error: 'Domain not allowed' });
    }

    try {
        const upstream = await fetch(targetUrl);
        if (!upstream.ok) {
            return res.status(upstream.status).json({ error: `Upstream error: ${upstream.status}` });
        }

        const contentType = upstream.headers.get('content-type') || 'image/png';
        const buffer = await upstream.arrayBuffer();

        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 快取 1 天
        return res.status(200).send(Buffer.from(buffer));
    } catch (e) {
        return res.status(500).json({ error: String(e) });
    }
}
