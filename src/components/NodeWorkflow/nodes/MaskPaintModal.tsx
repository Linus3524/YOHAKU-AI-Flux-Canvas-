import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface MaskPaintModalProps {
  imageSrc: string;
  /** 先前畫過的遮罩（白＝重繪、黑＝保留），用來接續編輯。 */
  initialMask?: string;
  onSave: (maskSrc: string) => void;
  onClose: () => void;
}

/** 繪製用內部解析度上限：4K 圖逐筆重繪會卡，存檔時再放大回原圖尺寸。 */
const MAX_PAINT_SIDE = 2048;
const PAINT_COLOR = '#AF52DE';

const loadImg = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('圖片載入失敗'));
  img.src = src;
});

/**
 * 局部重繪的遮罩畫板：在原圖上塗出要重繪的區域，輸出與原圖同尺寸的黑白遮罩。
 */
export function MaskPaintModal({ imageSrc, initialMask, onSave, onClose }: MaskPaintModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [brush, setBrush] = useState(40);
  const [erasing, setErasing] = useState(false);
  const [hasPaint, setHasPaint] = useState(false);
  const drawingRef = useRef<{ x: number; y: number } | null>(null);

  // 顯示尺寸：等比縮進視窗
  const display = natural ? (() => {
    const fit = Math.min((window.innerWidth - 96) / natural.w, (window.innerHeight - 230) / natural.h, 1);
    return { w: Math.max(1, Math.round(natural.w * fit)), h: Math.max(1, Math.round(natural.h * fit)) };
  })() : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const img = await loadImg(imageSrc);
      if (cancelled) return;
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ratio = Math.min(1, MAX_PAINT_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
      if (!initialMask) return;
      // 既有遮罩 → 轉回塗色：亮度當 alpha
      const mask = await loadImg(initialMask).catch(() => null);
      if (cancelled || !mask) return;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(mask, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = data.data;
      let painted = false;
      for (let i = 0; i < d.length; i += 4) {
        const alpha = d[i];
        d[i] = 0xAF; d[i + 1] = 0x52; d[i + 2] = 0xDE; d[i + 3] = alpha;
        if (alpha > 8) painted = true;
      }
      ctx.putImageData(data, 0, 0);
      setHasPaint(painted);
    })().catch(() => { if (!cancelled) onClose(); });
    return () => { cancelled = true; };
    // 只在開啟時初始化一次
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const toCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height,
      scale: canvas.width / rect.width,
    };
  };

  const stroke = (from: { x: number; y: number }, to: { x: number; y: number }, scale: number) => {
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.globalCompositeOperation = erasing ? 'destination-out' : 'source-over';
    ctx.strokeStyle = PAINT_COLOR;
    ctx.lineWidth = brush * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = toCanvasPoint(event);
    drawingRef.current = point;
    stroke(point, point, point.scale);
    if (!erasing) setHasPaint(true);
  };
  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const point = toCanvasPoint(event);
    stroke(drawingRef.current, point, point.scale);
    drawingRef.current = point;
  };
  const handlePointerUp = () => { drawingRef.current = null; };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setHasPaint(false);
  };

  const save = useCallback(() => {
    const paint = canvasRef.current;
    if (!paint || !natural) return;
    // 塗過的地方 → 純白；其餘 → 純黑；輸出原圖尺寸
    const white = document.createElement('canvas');
    white.width = paint.width; white.height = paint.height;
    const wctx = white.getContext('2d')!;
    wctx.drawImage(paint, 0, 0);
    wctx.globalCompositeOperation = 'source-in';
    wctx.fillStyle = '#FFFFFF';
    wctx.fillRect(0, 0, white.width, white.height);
    const out = document.createElement('canvas');
    out.width = natural.w; out.height = natural.h;
    const octx = out.getContext('2d')!;
    octx.fillStyle = '#000000';
    octx.fillRect(0, 0, out.width, out.height);
    octx.drawImage(white, 0, 0, out.width, out.height);
    onSave(out.toDataURL('image/png'));
  }, [natural, onSave]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/60 p-6"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section className="flex max-h-full flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-6 border-b border-neutral-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">繪製遮罩</h2>
            <p className="mt-0.5 text-[11px] text-neutral-500">塗上紫色的區域會被重繪，其餘保持不變。</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-7 w-7 place-items-center text-neutral-500 hover:bg-neutral-100" title="關閉">&times;</button>
        </header>

        <div className="flex items-center justify-center overflow-auto bg-neutral-100 p-4">
          <div className="relative" style={display ? { width: display.w, height: display.h } : { width: 320, height: 200 }}>
            <img src={imageSrc} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none" />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full touch-none opacity-60"
              style={{ cursor: 'crosshair' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
          </div>
        </div>

        <footer className="flex flex-wrap items-center gap-3 border-t border-neutral-200 px-4 py-3">
          <div className="flex rounded-lg bg-neutral-100 p-0.5 text-xs font-medium">
            <button type="button" onClick={() => setErasing(false)} className={`rounded-md px-3 py-1 ${!erasing ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500'}`}>筆刷</button>
            <button type="button" onClick={() => setErasing(true)} className={`rounded-md px-3 py-1 ${erasing ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500'}`}>橡皮擦</button>
          </div>
          <label className="flex items-center gap-2 text-xs text-neutral-600">
            粗細
            <input type="range" min={5} max={150} value={brush} onChange={(event) => setBrush(Number(event.target.value))} />
            <span className="w-7 tabular-nums">{brush}</span>
          </label>
          <button type="button" onClick={clear} className="text-xs text-neutral-500 hover:text-neutral-900">清除全部</button>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="border border-neutral-200 px-4 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50">取消</button>
            <button type="button" onClick={save} disabled={!hasPaint} className="bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40">儲存遮罩</button>
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
