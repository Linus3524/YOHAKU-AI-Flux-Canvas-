const ALLOWED_FAMILIES = new Set([
    'Noto Sans TC',
    'Chiron GoRound TC',
    'Noto Serif TC',
    'Shippori Mincho',
    'DotGothic16',
    'LINE Seed JP',
    'Kaisei Opti',
    'Zen Maru Gothic',
    'M PLUS Rounded 1c',
    'Klee One',
    'Hachi Maru Pop',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Varela Round',
    'Nunito',
    'Playfair Display',
    'Merriweather',
    'Cinzel',
    'Great Vibes',
    'Dancing Script',
]);

function extractFontUrl(css) {
    return css.match(/url\((https:\/\/[^)]+)\)/i)?.[1];
}

export default async function handler(req, res) {
    const family = String(req.query.family || '');
    const weight = Number(req.query.weight || 400);
    const italic = req.query.italic === '1';
    const text = String(req.query.text || '').slice(0, 2000);

    if (!ALLOWED_FAMILIES.has(family) || ![400, 700].includes(weight) || !text) {
        return res.status(400).json({ error: 'Invalid PDF font request' });
    }

    try {
        const axis = italic ? `ital,wght@1,${weight}` : `wght@${weight}`;
        const familyQuery = `${family.replace(/\s+/g, '+')}:${axis}`;
        const cssUrl = `https://fonts.googleapis.com/css2?family=${familyQuery}&text=${encodeURIComponent(text)}&display=swap`;
        const cssResponse = await fetch(cssUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; YOHAKU-PDF/1.0)' },
        });
        if (!cssResponse.ok) {
            return res.status(cssResponse.status).json({ error: 'Unable to resolve font CSS' });
        }

        const fontUrl = extractFontUrl(await cssResponse.text());
        if (!fontUrl) return res.status(502).json({ error: 'Font source missing' });

        const fontResponse = await fetch(fontUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; YOHAKU-PDF/1.0)' },
        });
        if (!fontResponse.ok) {
            return res.status(fontResponse.status).json({ error: 'Unable to fetch font subset' });
        }

        const buffer = Buffer.from(await fontResponse.arrayBuffer());
        const magic = buffer.subarray(0, 4).toString('latin1');
        if (magic === 'wOF2' || magic === 'wOFF') {
            return res.status(502).json({ error: 'Google returned a compressed webfont' });
        }

        res.setHeader('Content-Type', 'font/ttf');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.status(200).send(buffer);
    } catch (error) {
        return res.status(500).json({ error: String(error) });
    }
}
