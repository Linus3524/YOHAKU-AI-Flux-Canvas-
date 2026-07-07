// 物件對齊吸附（純函式）：從 useCanvas.updateElements 抽出，
// 供「state 路徑」(useCanvas) 與「拖曳 live 路徑」(InfiniteCanvas) 共用，避免兩份邏輯發散。
import type { CanvasElement } from '../types';

export interface SnapGuideline { type: 'h' | 'v'; x?: number; y?: number }

export interface DragSnapResult {
  x: number;
  y: number;
  guidelines: SnapGuideline[];
}

export function computeDragSnap(
  leader: CanvasElement,
  otherEls: CanvasElement[],
  snapThreshold = 5, // world pixels
): DragSnapResult {
  const w = leader.width;
  const h = leader.height;
  let cx = leader.position.x;
  let cy = leader.position.y;
  const guidelines: SnapGuideline[] = [];

  // Dragged element axes
  const myL = cx - w / 2;
  const myR = cx + w / 2;
  const myC = cx;
  const myT = cy - h / 2;
  const myB = cy + h / 2;
  const myM = cy;

  let bestDiffX = snapThreshold;
  let bestDiffY = snapThreshold;
  let snapX: number | undefined;
  let snapY: number | undefined;

  for (const el of otherEls) {
    const ow = el.width;
    const oh = el.height;
    const ocx = el.position.x;
    const ocy = el.position.y;

    const itsL = ocx - ow / 2;
    const itsR = ocx + ow / 2;
    const itsC = ocx;
    const itsT = ocy - oh / 2;
    const itsB = ocy + oh / 2;
    const itsM = ocy;

    // Check horizontal alignment (X snapping, draws a vertical line)
    const myXAxes = [
      { val: myL, offset: w / 2 },
      { val: myC, offset: 0 },
      { val: myR, offset: -w / 2 },
    ];
    const itsXAxes = [itsL, itsC, itsR];

    for (const myX of myXAxes) {
      for (const itsX of itsXAxes) {
        const diff = Math.abs(myX.val - itsX);
        if (diff < bestDiffX) {
          bestDiffX = diff;
          snapX = itsX + myX.offset;
        }
      }
    }

    // Check vertical alignment (Y snapping, draws a horizontal line)
    const myYAxes = [
      { val: myT, offset: h / 2 },
      { val: myM, offset: 0 },
      { val: myB, offset: -h / 2 },
    ];
    const itsYAxes = [itsT, itsM, itsB];

    for (const myY of myYAxes) {
      for (const itsY of itsYAxes) {
        const diff = Math.abs(myY.val - itsY);
        if (diff < bestDiffY) {
          bestDiffY = diff;
          snapY = itsY + myY.offset;
        }
      }
    }
  }

  // Apply snap corrections and record guidelines
  if (snapX !== undefined) {
    cx = snapX;
    const finalL = snapX - w / 2;
    const finalR = snapX + w / 2;
    const finalC = snapX;

    let matchedX = finalC;
    let minD = snapThreshold;
    for (const el of otherEls) {
      const itsXAxes = [el.position.x - el.width / 2, el.position.x, el.position.x + el.width / 2];
      for (const itsX of itsXAxes) {
        if (Math.abs(finalL - itsX) < minD) { minD = Math.abs(finalL - itsX); matchedX = itsX; }
        if (Math.abs(finalR - itsX) < minD) { minD = Math.abs(finalR - itsX); matchedX = itsX; }
        if (Math.abs(finalC - itsX) < minD) { minD = Math.abs(finalC - itsX); matchedX = itsX; }
      }
    }
    guidelines.push({ type: 'v', x: matchedX });
  }

  if (snapY !== undefined) {
    cy = snapY;
    const finalT = snapY - h / 2;
    const finalB = snapY + h / 2;
    const finalM = snapY;

    let matchedY = finalM;
    let minD = snapThreshold;
    for (const el of otherEls) {
      const itsYAxes = [el.position.y - el.height / 2, el.position.y, el.position.y + el.height / 2];
      for (const itsY of itsYAxes) {
        if (Math.abs(finalT - itsY) < minD) { minD = Math.abs(finalT - itsY); matchedY = itsY; }
        if (Math.abs(finalB - itsY) < minD) { minD = Math.abs(finalB - itsY); matchedY = itsY; }
        if (Math.abs(finalM - itsY) < minD) { minD = Math.abs(finalM - itsY); matchedY = itsY; }
      }
    }
    guidelines.push({ type: 'h', y: matchedY });
  }

  return { x: cx, y: cy, guidelines };
}
