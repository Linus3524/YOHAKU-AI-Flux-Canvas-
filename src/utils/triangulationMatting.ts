/**
 * Triangulation Matting（三角測量摳像）
 *
 * 數學原理 —— 合成方程式：observed = α·F + (1-α)·B
 *   白底版 (B=255)：W = α·F + 255·(1-α)
 *   黑底版 (B=0)  ：K = α·F
 *
 *   相減 ⇒ W - K = 255·(1-α)  ⇒  α = 1 - (W-K)/255
 *   代回 ⇒ F = K / α
 *
 * 三個通道理論上會解出同一個 α，實務上因模型雜訊會有差異 → 取平均降噪。
 *
 * 相對 chroma key 的兩個決定性優勢：
 *   1. α 是連續值（0–255），髮絲、玻璃、煙霧、動態模糊都有中間調，不是鋸齒。
 *   2. 白/黑都是無彩色 → 完全不需要 despill，也不會誤殺真正的綠色/藍色物體。
 */

/** 載入圖片為 HTMLImageElement */
const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });

/** 把圖片畫到指定尺寸的 canvas 並取出像素 */
const rasterize = (img: HTMLImageElement, w: number, h: number): ImageData => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
};

/**
 * 檢查一張圖能不能直接當「白底版」使用。
 *
 * 用途：生成前若已把來源壓平成純白，創作生成的輸出本身就可能是合格的白底版，
 * 那就能省掉三角測量的第一次生成。但模型不保證會保住白底（prompt 裡沒有這條
 * 指示），所以必須先驗證 —— 過不了就退回完整流程，下限等於不做這個優化。
 *
 * 只量邊框一圈：主體通常不會貼滿整個邊界，而背景被換掉（畫出場景/漸層）時
 * 邊框最先反映出來。
 */
export const isCleanWhitePlate = async (
    src: string,
    opts: { minWhiteRatio?: number; channelMin?: number } = {},
): Promise<{ ok: boolean; whiteRatio: number; reason?: string }> => {
    const minWhiteRatio = opts.minWhiteRatio ?? 0.97;
    const channelMin = opts.channelMin ?? 246;

    const img = await loadImage(src);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (w < 8 || h < 8) return { ok: false, whiteRatio: 0, reason: '圖片過小' };

    const D = rasterize(img, w, h).data;
    const inset = 2;                 // 避開最外圈的壓縮雜訊
    const band = Math.max(1, Math.round(Math.min(w, h) * 0.02)); // 邊框帶厚度

    let white = 0;
    let total = 0;
    const test = (x: number, y: number) => {
        const i = (y * w + x) * 4;
        total++;
        if (D[i] >= channelMin && D[i + 1] >= channelMin && D[i + 2] >= channelMin) white++;
    };

    for (let d = 0; d < band; d++) {
        const top = inset + d, bottom = h - 1 - inset - d;
        const left = inset + d, right = w - 1 - inset - d;
        if (top >= bottom || left >= right) break;
        for (let x = left; x <= right; x++) { test(x, top); test(x, bottom); }
        for (let y = top + 1; y < bottom; y++) { test(left, y); test(right, y); }
    }

    if (total === 0) return { ok: false, whiteRatio: 0, reason: '無可取樣邊框' };
    const whiteRatio = white / total;
    return whiteRatio >= minWhiteRatio
        ? { ok: true, whiteRatio }
        : { ok: false, whiteRatio, reason: `邊框僅 ${(whiteRatio * 100).toFixed(1)}% 為純白` };
};

export interface MatteOptions {
    /** α 低於此值視為全透明（濾掉背景殘留的淡霧）。預設 0.02 */
    noiseFloor?: number;
    /** α 高於此值視為全不透明（避免實心區域變半透明）。預設 0.97 */
    noiseCeiling?: number;
}

export interface MatteResult {
    /** RGBA PNG data URL */
    src: string;
    /** 品質診斷，用來決定要不要退回備用方案 */
    stats: {
        width: number;
        height: number;
        /** 完全透明像素比例 */
        transparentRatio: number;
        /** 完全不透明像素比例 */
        opaqueRatio: number;
        /** 半透明（軟邊）像素比例 —— 髮絲/玻璃多的圖這個值會偏高 */
        softRatio: number;
        /** 黑底版四角的平均亮度，用來確認底色真的換成黑了 */
        blackPlateCornerLuma: number;
    };
}

/**
 * 用白底版 + 黑底版解出真正的 alpha channel。
 * 兩張圖必須是同一個前景（pixel-aligned）；尺寸不同時會把黑底版縮放對齊白底版。
 */
export const triangulationMatte = async (
    whiteSrc: string,
    blackSrc: string,
    opts: MatteOptions = {},
): Promise<MatteResult> => {
    const noiseFloor = opts.noiseFloor ?? 0.02;
    const noiseCeiling = opts.noiseCeiling ?? 0.97;

    const [whiteImg, blackImg] = await Promise.all([loadImage(whiteSrc), loadImage(blackSrc)]);

    // 以白底版的尺寸為準（它是第一手輸出，通常較忠實）
    const w = whiteImg.naturalWidth;
    const h = whiteImg.naturalHeight;

    const W = rasterize(whiteImg, w, h).data;
    const K = rasterize(blackImg, w, h).data;

    const out = new ImageData(w, h);
    const O = out.data;

    let transparent = 0;
    let opaque = 0;
    let soft = 0;

    for (let i = 0; i < W.length; i += 4) {
        // α = 1 - (W-K)/255，三通道取平均降噪
        const d = (W[i] - K[i] + (W[i + 1] - K[i + 1]) + (W[i + 2] - K[i + 2])) / 3;
        let a = 1 - d / 255;

        // 前景被模型改亮/改暗時 d 可能為負 → a > 1，夾回範圍
        if (a < 0) a = 0;
        else if (a > 1) a = 1;

        // noise floor / ceiling：抑制 matte 雜訊
        if (a <= noiseFloor) a = 0;
        else if (a >= noiseCeiling) a = 1;

        if (a === 0) {
            transparent++;
            O[i] = O[i + 1] = O[i + 2] = O[i + 3] = 0;
            continue;
        }

        if (a === 1) opaque++;
        else soft++;

        // F = K / α（黑底版直接就是 α·F，除回去就是純前景色）
        const inv = 1 / a;
        let r = K[i] * inv;
        let g = K[i + 1] * inv;
        let b = K[i + 2] * inv;

        O[i] = r > 255 ? 255 : r;
        O[i + 1] = g > 255 ? 255 : g;
        O[i + 2] = b > 255 ? 255 : b;
        O[i + 3] = Math.round(a * 255);
    }

    // 檢查黑底版四角亮度 —— 若編輯失敗（底色沒變黑）這裡會偏高
    const cornerLuma = (() => {
        const pick = (x: number, y: number) => {
            const i = (y * w + x) * 4;
            return 0.299 * K[i] + 0.587 * K[i + 1] + 0.114 * K[i + 2];
        };
        const pad = 4;
        const samples = [
            pick(pad, pad),
            pick(w - 1 - pad, pad),
            pick(pad, h - 1 - pad),
            pick(w - 1 - pad, h - 1 - pad),
        ];
        return samples.reduce((s, v) => s + v, 0) / samples.length;
    })();

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.putImageData(out, 0, 0);

    const total = w * h;
    return {
        src: canvas.toDataURL('image/png'),
        stats: {
            width: w,
            height: h,
            transparentRatio: transparent / total,
            opaqueRatio: opaque / total,
            softRatio: soft / total,
            blackPlateCornerLuma: cornerLuma,
        },
    };
};

/**
 * 判斷 matte 結果是否可信。不可信時呼叫端應退回備用方案。
 */
export const isMatteTrustworthy = (stats: MatteResult['stats']): { ok: boolean; reason?: string } => {
    // 註：不用「四角是否夠黑」判斷 —— 主體只要碰到畫面角落就會誤判。
    // 黑底版沒換底的情況（W≈K）會讓 α 全為 1，由下面的 transparentRatio 攔下。

    // 幾乎沒有透明像素 → 兩版背景相同，第二步編輯根本沒生效
    if (stats.transparentRatio < 0.02) {
        return { ok: false, reason: `透明像素僅 ${(stats.transparentRatio * 100).toFixed(1)}%，疑似兩版背景相同` };
    }
    // 幾乎全透明 → 主體被誤刪
    const subject = stats.opaqueRatio + stats.softRatio;
    if (subject < 0.02) {
        return { ok: false, reason: '主體幾乎全被判為透明' };
    }
    // 前景過半是半透明 → 這是「模型在第二步偷改前景」的典型症狀：
    // 主體內部本該 α=1，飄移會讓整片變成中間調而不是只有邊緣一圈軟邊。
    const softShare = stats.softRatio / subject;
    if (softShare > 0.6) {
        return { ok: false, reason: `主體 ${(softShare * 100).toFixed(0)}% 為半透明，疑似黑底版前景飄移` };
    }
    return { ok: true };
};
