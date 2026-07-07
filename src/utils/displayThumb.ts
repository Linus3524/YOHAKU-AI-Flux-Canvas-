// 畫布顯示用縮圖代理：<img> 顯示 ~1600px 的縮圖，取代「4K 原圖縮到 400px 顯示」的浪費。
//
// 重要：只影響「螢幕上怎麼畫」。元素資料的 src 永遠是原始全解析度圖，
// AI 生成/去背/放大/匯出/合併全部照常讀原圖，品質零影響。
//
// 實作：webp（保留透明）objectURL + 模組級快取；縮圖生成中先顯示原圖（無閃爍），
// 完成後無縫換成縮圖。快取超量時依插入序淘汰並 revoke objectURL。
import { useEffect, useState } from 'react';

const MAX_DIM = 2048;          // 縮圖最長邊；對齊 Lightroom 標準預覽/常見螢幕寬，一般縮放下與原圖無可見差異
const CACHE_LIMIT = 300;       // 快取上限（entry 數）
const MIN_SRC_LENGTH = 200 * 1024; // 原圖 base64 小於 ~200KB 就不值得做縮圖

// src（原圖字串參照，元素本身就持有，不佔額外記憶體）→ 縮圖 objectURL
const thumbCache = new Map<string, string>();
const pendingThumbs = new Map<string, Promise<string>>();

const evictIfNeeded = () => {
    while (thumbCache.size > CACHE_LIMIT) {
        const oldestKey = thumbCache.keys().next().value as string | undefined;
        if (oldestKey === undefined) break;
        const url = thumbCache.get(oldestKey)!;
        thumbCache.delete(oldestKey);
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    }
};

async function makeThumb(src: string): Promise<string> {
    const existing = pendingThumbs.get(src);
    if (existing) return existing;
    const task = (async () => {
        try {
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error('decode failed'));
                img.src = src;
            });
            const maxSide = Math.max(img.naturalWidth, img.naturalHeight);
            if (!maxSide || maxSide <= MAX_DIM) {
                thumbCache.set(src, src); // 原圖已夠小，直接用
                return src;
            }
            const scale = MAX_DIM / maxSide;
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
            const ctx = canvas.getContext('2d');
            if (!ctx) { thumbCache.set(src, src); return src; }
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            // webp 支援 alpha；失敗（舊瀏覽器）退 png
            let blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/webp', 0.9));
            if (!blob) blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
            if (!blob) { thumbCache.set(src, src); return src; }
            const url = URL.createObjectURL(blob);
            thumbCache.set(src, url);
            evictIfNeeded();
            return url;
        } catch {
            thumbCache.set(src, src); // 生成失敗 → 一律回退原圖
            return src;
        }
    })();
    pendingThumbs.set(src, task);
    task.finally(() => pendingThumbs.delete(src));
    return task;
}

/**
 * 取得顯示用縮圖 URL。縮圖就緒前回傳原圖（無閃爍）。
 * 只處理大型 data: URL；http(s)/小圖原樣回傳。
 */
export function useDisplaySrc(src: string | undefined): string | undefined {
    const eligible = !!src && src.startsWith('data:') && src.length >= MIN_SRC_LENGTH;
    const [thumb, setThumb] = useState<string | null>(() => (eligible ? thumbCache.get(src!) ?? null : null));

    useEffect(() => {
        if (!eligible || !src) { setThumb(null); return; }
        const cached = thumbCache.get(src);
        if (cached) { setThumb(cached); return; }
        let alive = true;
        makeThumb(src).then(url => { if (alive) setThumb(url); });
        return () => { alive = false; };
    }, [src, eligible]);

    if (!eligible) return src;
    return thumb ?? src;
}
