/**
 * GIF 動圖與 SVG 向量在畫布上的適配。
 *
 * 畫布元素本來就是 <img>，GIF 會自己播、SVG 會保持向量，問題在「周邊」：
 *  - 使用者分不出哪張是 GIF／SVG（看起來跟一般圖片一樣）→ 畫布角標
 *  - SVG 常常只有 viewBox、沒有寬高，瀏覽器會當成 300×150；所有走 Canvas 的工具
 *    （去背、重繪、分層、匯出）都會拿到一張很小的點陣圖 → 進畫布時補上寬高
 *  - 這兩種格式丟進點陣工具前，使用者需要一個明確的「轉成靜態圖片」動作
 */

export type SpecialImageFormat = 'gif' | 'svg';

export function specialImageFormat(src: string | undefined): SpecialImageFormat | null {
    if (!src) return null;
    if (/^data:image\/gif/i.test(src)) return 'gif';
    if (/^data:image\/svg\+xml/i.test(src)) return 'svg';
    return null;
}

/** SVG 光柵化時的最長邊；也是補寬高時採用的尺寸。 */
const SVG_RASTER_MAX = 2048;

const decodeSvgDataUrl = (src: string): string | null => {
    const comma = src.indexOf(',');
    if (comma < 0) return null;
    const header = src.slice(0, comma);
    const body = src.slice(comma + 1);
    try {
        if (/;base64/i.test(header)) {
            const bytes = Uint8Array.from(atob(body), c => c.charCodeAt(0));
            return new TextDecoder().decode(bytes);
        }
        return decodeURIComponent(body);
    } catch {
        return null;
    }
};

const encodeSvgDataUrl = (svgText: string): string => {
    const bytes = new TextEncoder().encode(svgText);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return `data:image/svg+xml;base64,${btoa(binary)}`;
};

/**
 * 讓 SVG 帶有明確的 width／height（最長邊 2048）與 viewBox。
 * 向量內容不變，只是告訴瀏覽器「這張圖的原生尺寸」，之後不論顯示或送進 Canvas 都清晰。
 * 解析失敗或不是 SVG 時原樣回傳。
 */
export function normalizeSvgDataUrl(src: string): string {
    if (specialImageFormat(src) !== 'svg') return src;
    const text = decodeSvgDataUrl(src);
    if (!text) return src;
    try {
        const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
        const svg = doc.documentElement;
        if (!svg || svg.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) return src;
        const num = (value: string | null) => {
            const parsed = value && !/%$/.test(value.trim()) ? parseFloat(value) : NaN;
            return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
        };
        const viewBox = svg.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
        let vbW = viewBox && viewBox.length === 4 && viewBox[2] > 0 ? viewBox[2] : null;
        let vbH = viewBox && viewBox.length === 4 && viewBox[3] > 0 ? viewBox[3] : null;
        const attrW = num(svg.getAttribute('width'));
        const attrH = num(svg.getAttribute('height'));
        if (!vbW || !vbH) {
            if (!attrW || !attrH) return src; // 沒有任何尺寸資訊，無從判斷比例
            vbW = attrW; vbH = attrH;
            svg.setAttribute('viewBox', `0 0 ${attrW} ${attrH}`);
        }
        const scale = SVG_RASTER_MAX / Math.max(vbW, vbH);
        svg.setAttribute('width', String(Math.round(vbW * scale)));
        svg.setAttribute('height', String(Math.round(vbH * scale)));
        if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        return encodeSvgDataUrl(new XMLSerializer().serializeToString(doc));
    } catch {
        return src;
    }
}

/** 把 GIF（目前顯示的那一格）或 SVG 轉成靜態 PNG，供點陣工具使用。 */
export function rasterizeToPng(src: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const w = img.naturalWidth, h = img.naturalHeight;
            if (!w || !h) { reject(new Error('無法取得圖片尺寸')); return; }
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('無法建立畫布')); return; }
            ctx.drawImage(img, 0, 0, w, h);
            try { resolve(canvas.toDataURL('image/png')); } catch (error) { reject(error); }
        };
        img.onerror = () => reject(new Error('圖片讀取失敗'));
        img.src = normalizeSvgDataUrl(src);
    });
}
