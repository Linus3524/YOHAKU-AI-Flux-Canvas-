import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const PDF_FONT_FAMILIES = new Set([
  'Noto Sans TC', 'Chiron GoRound TC', 'Noto Serif TC', 'Shippori Mincho',
  'DotGothic16', 'LINE Seed JP', 'Kaisei Opti', 'Zen Maru Gothic',
  'M PLUS Rounded 1c', 'Klee One', 'Hachi Maru Pop', 'Roboto', 'Open Sans',
  'Lato', 'Montserrat', 'Varela Round', 'Nunito', 'Playfair Display',
  'Merriweather', 'Cinzel', 'Great Vibes', 'Dancing Script',
]);

const pdfFontDevPlugin = (): Plugin => ({
  name: 'yohaku-pdf-font-dev-endpoint',
  configureServer(server) {
    server.middlewares.use('/api/pdf-font', async (req, res) => {
      try {
        const url = new URL(req.url || '', 'http://localhost');
        const family = url.searchParams.get('family') || '';
        const weight = Number(url.searchParams.get('weight') || 400);
        const italic = url.searchParams.get('italic') === '1';
        const text = (url.searchParams.get('text') || '').slice(0, 2000);
        if (!PDF_FONT_FAMILIES.has(family) || ![400, 700].includes(weight) || !text) {
          res.statusCode = 400;
          res.end('Invalid PDF font request');
          return;
        }

        const axis = italic ? `ital,wght@1,${weight}` : `wght@${weight}`;
        const familyQuery = `${family.replace(/\s+/g, '+')}:${axis}`;
        const cssUrl = `https://fonts.googleapis.com/css2?family=${familyQuery}&text=${encodeURIComponent(text)}&display=swap`;
        const cssResponse = await fetch(cssUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; YOHAKU-PDF/1.0)' },
        });
        if (!cssResponse.ok) throw new Error(`Font CSS ${cssResponse.status}`);
        const css = await cssResponse.text();
        const fontUrl = css.match(/url\((https:\/\/[^)]+)\)/i)?.[1];
        if (!fontUrl) throw new Error('Font source missing');

        const fontResponse = await fetch(fontUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; YOHAKU-PDF/1.0)' },
        });
        if (!fontResponse.ok) throw new Error(`Font subset ${fontResponse.status}`);
        const buffer = Buffer.from(await fontResponse.arrayBuffer());
        const magic = buffer.subarray(0, 4).toString('latin1');
        if (magic === 'wOF2' || magic === 'wOFF') throw new Error('Compressed webfont returned');

        res.statusCode = 200;
        res.setHeader('Content-Type', 'font/ttf');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.end(buffer);
      } catch (error) {
        res.statusCode = 502;
        res.end(String(error));
      }
    });
  },
});

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5175,
        strictPort: true,
        host: '0.0.0.0',
      },
      // onnxruntime-web 讓 Vite 正常打包（不 exclude）
      // WASM 檔案放 public/，JS glue 由 Vite bundle
      plugins: [react(), pdfFontDevPlugin()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
