import type { CanvasElement, ArtboardElement, ImageElement, TextElement, ShapeElement } from '../../types';
import { loadImage, createShapeDataUrl } from '../../utils/helpers';
import { drawTextOnCanvas } from '../../utils/textCanvas'; // ✅ 修改

// 判斷元素是否與工作區域有交集 (Bounding Box Intersection)
export const isElementInArtboard = (el: CanvasElement, ab: ArtboardElement): boolean => {
    if (el.type === 'artboard') return false;
    
    const abLeft = ab.position.x - ab.width / 2;
    const abRight = ab.position.x + ab.width / 2;
    const abTop = ab.position.y - ab.height / 2;
    const abBottom = ab.position.y + ab.height / 2;

    const elLeft = el.position.x - el.width / 2;
    const elRight = el.position.x + el.width / 2;
    const elTop = el.position.y - el.height / 2;
    const elBottom = el.position.y + el.height / 2;

    return (
        elLeft < abRight &&
        elRight > abLeft &&
        elTop < abBottom &&
        elBottom > abTop
    );
};

// 匯出單個工作區域為 PNG 圖片（回傳 base64 data URL）
export const exportArtboardAsImage = async (
    artboard: ArtboardElement,
    allElements: CanvasElement[],
    scale: number = 2
): Promise<string> => {
    const canvas = document.createElement('canvas');
    canvas.width  = artboard.width  * scale;
    canvas.height = artboard.height * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);

    // 1. 白色背景
    ctx.fillStyle = artboard.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, artboard.width, artboard.height);

    // 2. 裁切遮罩 (移除，因為我們需要繪製超出範圍的物件)
    // ctx.save();
    // ctx.beginPath();
    // ctx.rect(0, 0, artboard.width, artboard.height);
    // ctx.clip();

    // 3. 找出範圍內的物件，按 zIndex 排序
    const targets = allElements
        .filter(el => isElementInArtboard(el, artboard) && el.type !== 'note')
        .sort((a, b) => a.zIndex - b.zIndex);

    // 4. 依序繪製
    const ox = artboard.position.x - artboard.width  / 2;
    const oy = artboard.position.y - artboard.height / 2;

    for (const el of targets) {
        ctx.save();
        // 修正座標：相對於 Artboard 左上角
        const lx = el.position.x - ox;
        const ly = el.position.y - oy;
        ctx.translate(lx, ly);
        ctx.rotate((el.rotation * Math.PI) / 180);

        // 建立離屏畫布以隔離效果 (解決淡出遮罩與混合模式衝突)
        const offCanvas = document.createElement('canvas');
        const padding = 100; // 預留緩衝，避免陰影或粗線條被裁切
        offCanvas.width = el.width + padding * 2;
        offCanvas.height = el.height + padding * 2;
        const offCtx = offCanvas.getContext('2d');
        if (!offCtx) { ctx.restore(); continue; }
        offCtx.translate(offCanvas.width / 2, offCanvas.height / 2);

        try {
            if (el.type === 'image' || el.type === 'drawing') {
                const img = await loadImage((el as any).src);
                offCtx.drawImage(img, -el.width / 2, -el.height / 2, el.width, el.height);

                // 處理 fade 效果（作為遮罩應用）
                const fade = (el as ImageElement).fade;
                if (fade && fade.direction !== 'none') {
                    offCtx.save();
                    let gradient;
                    const { direction, intensity } = fade;
                    const w = el.width;
                    const h = el.height;
                    const x = -w / 2;
                    const y = -h / 2;

                    // 修正方向座標：0 為不透明，1 為透明
                    if (direction === 'radial') {
                        // ✅ 修改 radial
                        const cx = x + w / 2;
                        const cy = y + h / 2;
                        
                        // ✅ 修復邏輯相反：intensity 越大，淡出範圍越大，起點越靠近中心
                        const fadeStart = 1 - (intensity / 100);
                        
                        offCtx.save();
                        
                        // ✅ 修復形狀：用 scale 把正圓拉伸成橢圓，模擬 CSS closest-side
                        // 移動原點到圖片中心，依長寬比縮放
                        offCtx.translate(cx, cy);
                        offCtx.scale(w / 2, h / 2);  // 將座標系縮放，讓半徑 1 的圓 = 圖片邊緣
                        
                        // 在縮放後的座標系中，圓心(0,0)，半徑 1
                        gradient = offCtx.createRadialGradient(0, 0, 0, 0, 0, 1);
                        
                        // ✅ 對齊 CSS 邏輯：中心實心，往外漸變到透明
                        // CSS: black (100-intensity)%, ... transparent 100%
                        gradient.addColorStop(0, 'black');
                        if (fadeStart > 0) gradient.addColorStop(fadeStart, 'black');
                        gradient.addColorStop(
                            Math.min(fadeStart + (1 - fadeStart) * 0.25, 1), 'rgba(0,0,0,0.5)'
                        );
                        gradient.addColorStop(
                            Math.min(fadeStart + (1 - fadeStart) * 0.5, 1), 'rgba(0,0,0,0.2)'
                        );
                        gradient.addColorStop(
                            Math.min(fadeStart + (1 - fadeStart) * 0.75, 1), 'rgba(0,0,0,0.05)'
                        );
                        gradient.addColorStop(1, 'transparent');
                        
                        // 在縮放後的座標系中填滿單位圓覆蓋範圍
                        // 需要用逆縮放後的矩形座標填色
                        offCtx.fillStyle = gradient;
                        offCtx.globalCompositeOperation = 'destination-in';
                        offCtx.fillRect(-1, -1, 2, 2);  // 縮放後 -1~1 = 圖片完整範圍
                        
                        offCtx.restore();
                        gradient = undefined; // 避免觸發下方的 linear fillRect
                    } else {
                        // ✅ 修改 linear
                        const fadeEnd = intensity / 100;
                        if (direction === 'top') gradient = offCtx.createLinearGradient(0, y, 0, y + h);
                        else if (direction === 'bottom') gradient = offCtx.createLinearGradient(0, y + h, 0, y);
                        else if (direction === 'left') gradient = offCtx.createLinearGradient(x, 0, x + w, 0);
                        else if (direction === 'right') gradient = offCtx.createLinearGradient(x + w, 0, x, 0);
                        
                        if (gradient) {
                            gradient.addColorStop(0, 'transparent');
                            gradient.addColorStop(fadeEnd * 0.25, 'rgba(0,0,0,0.05)');
                            gradient.addColorStop(fadeEnd * 0.5,  'rgba(0,0,0,0.2)');
                            gradient.addColorStop(fadeEnd * 0.75, 'rgba(0,0,0,0.5)');
                            gradient.addColorStop(fadeEnd, 'black');
                            if (fadeEnd < 1) gradient.addColorStop(1, 'black');
                        }
                    }

                    if (gradient) {
                        offCtx.fillStyle = gradient;
                        offCtx.globalCompositeOperation = 'destination-in';
                        offCtx.fillRect(x, y, w, h);
                    }
                    offCtx.restore();
                }

            } else if (el.type === 'shape') {
                const shapeEl = el as ShapeElement;
                const shapePadding = Math.max(20, shapeEl.strokeWidth * 2);
                const dataUrl = await createShapeDataUrl(shapeEl);
                const img = await loadImage(dataUrl);
                const drawW = shapeEl.width + shapePadding * 2;
                const drawH = shapeEl.height + shapePadding * 2;
                offCtx.drawImage(img, -(drawW / 2), -(drawH / 2), drawW, drawH);

            } else if (el.type === 'arrow') {
                const arrowEl = el as any;
                // 箭頭座標需要相對於元素中心點
                const sx = arrowEl.start.x - el.position.x;
                const sy = arrowEl.start.y - el.position.y;
                const ex = arrowEl.end.x - el.position.x;
                const ey = arrowEl.end.y - el.position.y;

                let color = arrowEl.color || '#1D1D1F';
                if (color.startsWith('text-[')) color = color.match(/text-\[(.*?)\]/)?.[1] || '#1D1D1F';
                else if (color.startsWith('text-')) color = '#1D1D1F';

                const strokeWidth = arrowEl.strokeWidth || 2;
                offCtx.strokeStyle = color;
                offCtx.fillStyle = color;
                offCtx.lineWidth = strokeWidth;
                offCtx.lineCap = 'round';
                offCtx.lineJoin = 'round';

                if (arrowEl.strokeStyle === 'dashed') offCtx.setLineDash([strokeWidth * 3, strokeWidth * 2]);
                else if (arrowEl.strokeStyle === 'dotted') offCtx.setLineDash([0, strokeWidth * 2]);
                else offCtx.setLineDash([]);

                const angleEnd   = Math.atan2(ey - sy, ex - sx) * 180 / Math.PI;
                const angleStart = Math.atan2(sy - ey, sx - ex) * 180 / Math.PI;
                const headSize   = strokeWidth * 3;

                offCtx.beginPath();
                offCtx.moveTo(sx, sy);
                offCtx.lineTo(ex, ey);
                offCtx.stroke();
                offCtx.setLineDash([]);

                const drawArrowHead = (x: number, y: number, angleDeg: number, type: string) => {
                    if (type === 'none' || !type) return;
                    const rad = angleDeg * (Math.PI / 180);
                    const rotate = (px: number, py: number) => ({
                        x: x + px * Math.cos(rad) - py * Math.sin(rad),
                        y: y + px * Math.sin(rad) + py * Math.cos(rad),
                    });

                    offCtx.beginPath();
                    if (type === 'triangle') {
                        const p1 = rotate(0, 0);
                        const p2 = rotate(-headSize * 2, -headSize);
                        const p3 = rotate(-headSize * 2, headSize);
                        offCtx.moveTo(p1.x, p1.y);
                        offCtx.lineTo(p2.x, p2.y);
                        offCtx.lineTo(p3.x, p3.y);
                        offCtx.closePath();
                        offCtx.fill();
                    } else if (type === 'arrow') {
                        const p1 = rotate(0, 0);
                        const p2 = rotate(-headSize * 2, -headSize * 1.2);
                        const p3 = rotate(-headSize * 2, headSize * 1.2);
                        offCtx.moveTo(p2.x, p2.y);
                        offCtx.lineTo(p1.x, p1.y);
                        offCtx.lineTo(p3.x, p3.y);
                        offCtx.stroke();
                    } else if (type === 'circle') {
                        const center = rotate(-headSize, 0);
                        offCtx.arc(center.x, center.y, headSize, 0, Math.PI * 2);
                        offCtx.fill();
                    }
                };

                if (arrowEl.endArrowhead && arrowEl.endArrowhead !== 'none') drawArrowHead(ex, ey, angleEnd, arrowEl.endArrowhead);
                if (arrowEl.startArrowhead && arrowEl.startArrowhead !== 'none') drawArrowHead(sx, sy, angleStart, arrowEl.startArrowhead);

            } else if (el.type === 'text') {
                const textEl = el as TextElement;
                offCtx.save();
                // ✅ 修改：座標系配合現有其他元素的 translate 方式
                if (textEl.rotation) offCtx.rotate((textEl.rotation * Math.PI) / 180);
                drawTextOnCanvas(offCtx, textEl, -textEl.width / 2, -textEl.height / 2);
                offCtx.restore();

            } else if (el.type === 'note') {
                const noteEl = el as any;
                const bgColor = noteEl.color?.match(/bg-\[(.*?)\]/)?.[1] || '#FFFDE7';
                offCtx.fillStyle = bgColor;
                offCtx.beginPath();
                offCtx.roundRect(-el.width / 2, -el.height / 2, el.width, el.height, 8);
                offCtx.fill();
                offCtx.fillStyle = '#1D1D1F';
                offCtx.font = '14px -apple-system, sans-serif';
                offCtx.textBaseline = 'top';
                offCtx.textAlign = 'left';
                const noteLines = noteEl.content?.split('\n') || [];
                noteLines.forEach((line: string, i: number) => {
                    offCtx.fillText(line, -el.width / 2 + 12, -el.height / 2 + 12 + i * 20);
                });
            }

            // 將離屏畫布繪製回主畫布，並應用透明度與混合模式
            ctx.globalAlpha = el.opacity ?? 1;
            const blendMode = el.blendMode === 'normal' ? 'source-over' : (el.blendMode ?? 'source-over');
            ctx.globalCompositeOperation = blendMode as GlobalCompositeOperation;
            
            ctx.drawImage(offCanvas, -offCanvas.width / 2, -offCanvas.height / 2);

        } catch(e) {
            console.error('Failed to draw element:', el.id, el.type, e);
        }

        ctx.restore();
    }

    // 5. 繪製工作區域邊框
    if (artboard.showBorder) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, artboard.width, artboard.height);
    }

    ctx.restore();
    return canvas.toDataURL('image/png');
};

// 下載工作區域為 PNG 檔案
export const downloadArtboard = async (
    artboard: ArtboardElement,
    allElements: CanvasElement[]
): Promise<void> => {
    const dataUrl = await exportArtboardAsImage(artboard, allElements);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${artboard.artboardName || 'artboard'}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
