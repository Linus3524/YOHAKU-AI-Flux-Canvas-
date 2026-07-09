import { useEffect, useRef } from 'react';

// Helper: Simple debounce hook
export const useDebounce = (callback: (...args: any[]) => void, delay: number) => {
  const timeoutRef = useRef<number | null>(null);
  
  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      callback(...args);
    }, delay);
  };
};

/**
 * 圓形色塊工具：從拖曳起訖點畫「自由橢圓」（寬高各自的拖曳距離決定長短軸），
 * 按住 Shift 鎖定正圓（取寬高中較大者為半徑）——對齊設計軟體慣例（PS/AI/Figma 皆用 Shift）。
 */
export function drawEllipseFromDrag(
  ctx: CanvasRenderingContext2D,
  startX: number, startY: number,
  curX: number, curY: number,
  constrainCircle: boolean,
) {
  const cx = (startX + curX) / 2;
  const cy = (startY + curY) / 2;
  let rx = Math.abs(curX - startX) / 2;
  let ry = Math.abs(curY - startY) / 2;
  if (constrainCircle) {
    const r = Math.max(rx, ry);
    rx = r; ry = r;
  }
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
}
