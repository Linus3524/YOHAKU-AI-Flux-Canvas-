import { TextElement } from '../types';
import { wrapTextCanvas, isCJK } from './helpers';

export const drawTextOnCanvas = (ctx: CanvasRenderingContext2D, el: TextElement, x: number, y: number): void => {
    const strokeW = el.strokeWidth || 0;
    const textPadding = 12 + Math.ceil(strokeW / 2);

    ctx.font = `${el.isItalic ? 'italic' : ''} ${el.isBold ? 'bold' : ''} ${el.fontSize}px ${el.fontFamily}`;
    const lineHeightPx = el.fontSize * el.lineHeight;
    const isVertical = el.writingMode === 'vertical';
    const curveStrength = el.curveStrength || 0;
    const isCurved = Math.abs(curveStrength) > 0.1;

    const spacingEm = el.letterSpacing || 0;
    const spacingPx = spacingEm * el.fontSize;

    if (isVertical || isCurved) {
        // @ts-ignore
        ctx.letterSpacing = '0px';
    } else {
        // @ts-ignore
        ctx.letterSpacing = spacingEm ? `${spacingEm}em` : '0px';
    }

    // Draw background directly on main canvas (no shadow needed for bg)
    if (el.backgroundColor && el.backgroundColor !== 'transparent') {
        ctx.fillStyle = el.backgroundColor;
        ctx.fillRect(x, y, el.width, el.height);
    }

    const padding = 12 + Math.ceil(strokeW / 2);

    const maxConstraint = (() => {
        if (el.isWidthLocked && !isVertical) {
            return Math.max(10, el.width - padding * 2);
        }
        if (el.isHeightLocked && isVertical) {
            return Math.max(10, el.height - padding * 2);
        }
        return 100000;
    })();

    const { lines } = wrapTextCanvas(ctx, el.text, maxConstraint, lineHeightPx, isVertical);

    // --- Offscreen Canvas approach for proper drop-shadow emulation ---
    // CSS drop-shadow applies to the entire composite element once.
    // Canvas ctx.shadow applies per-draw-call (stroke + fill = double shadow).
    // Fix: draw all text on offscreen canvas first, then composite with shadow.

    const hasShadow = !!(el.shadowColor && el.shadowBlur !== undefined && el.shadowBlur > 0);
    const hasGlow = !!(el.glowColor && el.glowBlur && el.glowBlur > 0);
    const hasEffects = hasShadow || hasGlow;

    if (hasEffects) {
        // Create offscreen canvas for text content (no shadow)
        const offCanvas = document.createElement('canvas');
        offCanvas.width = ctx.canvas.width;
        offCanvas.height = ctx.canvas.height;
        const offCtx = offCanvas.getContext('2d')!;

        // Copy current transform scale from main canvas
        const currentTransform = ctx.getTransform();
        offCtx.setTransform(currentTransform);

        // Copy text rendering settings
        offCtx.font = ctx.font;
        // @ts-ignore
        offCtx.letterSpacing = ctx.letterSpacing;
        offCtx.lineWidth = el.strokeWidth || 0;
        offCtx.strokeStyle = el.strokeColor || 'transparent';
        offCtx.lineJoin = 'round';
        offCtx.lineCap = 'round';
        offCtx.fillStyle = el.color;
        offCtx.textBaseline = 'middle';

        // Draw text content on offscreen canvas (NO shadow)
        drawTextContent(offCtx, el, x, y, lines, lineHeightPx, isVertical, isCurved, curveStrength, spacingPx, textPadding, padding);

        // Now composite the offscreen canvas onto main canvas with shadow effects
        // Reset transform for drawImage (pixel-level operation)
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Pass 1: Shadow (if present)
        if (hasShadow) {
            ctx.shadowColor = el.shadowColor!;
            ctx.shadowBlur = el.shadowBlur! * currentTransform.a; // Scale blur with canvas scale
            ctx.shadowOffsetX = 4 * currentTransform.a;
            ctx.shadowOffsetY = 4 * currentTransform.d;
            ctx.drawImage(offCanvas, 0, 0);
        }

        // Pass 2: Glow (if present)
        if (hasGlow) {
            ctx.shadowColor = el.glowColor!;
            ctx.shadowBlur = el.glowBlur! * currentTransform.a;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.drawImage(offCanvas, 0, 0);
        }

        // Final pass: draw text without shadow (clean on top)
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.drawImage(offCanvas, 0, 0);

        ctx.restore();
    } else {
        // No effects — draw directly (fast path)
        ctx.lineWidth = el.strokeWidth || 0;
        ctx.strokeStyle = el.strokeColor || 'transparent';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.fillStyle = el.color;
        ctx.textBaseline = 'middle';
        drawTextContent(ctx, el, x, y, lines, lineHeightPx, isVertical, isCurved, curveStrength, spacingPx, textPadding, padding);
    }
};

const drawTextContent = (
    ctx: CanvasRenderingContext2D, el: TextElement,
    x: number, y: number, lines: string[],
    lineHeightPx: number, isVertical: boolean, isCurved: boolean,
    curveStrength: number, spacingPx: number, textPadding: number, padding: number
): void => {
    if (isVertical) {
        // --- Vertical Text Drawing ---
        const totalTextWidth = lines.length * lineHeightPx;
        let startX = x + (el.width - totalTextWidth)/2 + (lines.length - 1) * lineHeightPx + lineHeightPx/2;

        if (isCurved) {
            // --- VERTICAL CURVED ---
            const radius = 10000 / Math.abs(curveStrength);
            const isArch = curveStrength > 0;
            const centerY = y + el.height / 2;

            lines.forEach((line, i) => {
                const colX = startX - (i * lineHeightPx);
                const chars = line.split('');
                let totalH = 0;
                const charHeights = chars.map(char => {
                    const h = isCJK(char) ? el.fontSize : el.fontSize * 0.6;
                    totalH += h;
                    return h;
                });
                totalH += (chars.length - 1) * spacingPx;

                const totalAngle = totalH / radius;
                let currentAngle = isArch ? -totalAngle / 2 : Math.PI + totalAngle / 2;

                const lineOffset = (i - (lines.length-1)/2) * lineHeightPx;
                const currentRadius = isArch ? radius + lineOffset : radius - lineOffset;
                const pivotX = isArch ? colX - currentRadius : colX + currentRadius;

                chars.forEach((char, idx) => {
                    const charH = charHeights[idx];
                    const stepAngle = charH / currentRadius;
                    const letterSpacingAngle = spacingPx / currentRadius;

                    const theta = isArch ? (currentAngle + stepAngle / 2) : (currentAngle - stepAngle / 2);
                    const cx = pivotX + currentRadius * Math.cos(theta);
                    const cy = centerY + currentRadius * Math.sin(theta);

                    const thetaDeg = theta * 180 / Math.PI;
                    let rot = isArch ? thetaDeg : (thetaDeg + 180);
                    if (!isCJK(char)) rot += 90;

                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(rot * Math.PI / 180);
                    ctx.textAlign = 'center';
                    if (el.strokeWidth && el.strokeWidth > 0) ctx.strokeText(char, 0, 0);
                    ctx.fillText(char, 0, 0);
                    ctx.restore();

                    if (isArch) currentAngle += stepAngle + letterSpacingAngle;
                    else currentAngle -= stepAngle + letterSpacingAngle;
                });
            });
        } else {
            // --- VERTICAL STRAIGHT ---
            const startY = y + textPadding + (el.fontSize / 2);

            lines.forEach(line => {
                let currentY = startY;
                const chars = line.split('');
                const totalH = chars.reduce((sum, char) => sum + (isCJK(char) ? el.fontSize : el.fontSize * 0.6), 0) + (chars.length - 1) * spacingPx;

                if (el.align === 'center') currentY = y + el.height/2 - totalH/2;
                else if (el.align === 'right') currentY = y + el.height - textPadding - totalH;

                chars.forEach(char => {
                    let renderY = currentY;
                    let advanceY = 0;

                    if (isCJK(char)) {
                        ctx.textAlign = 'center';
                        if (el.strokeWidth && el.strokeWidth > 0) ctx.strokeText(char, startX, currentY);
                        ctx.fillText(char, startX, currentY);
                        advanceY = el.fontSize;
                    } else {
                        ctx.save();
                        ctx.translate(startX, currentY);
                        ctx.rotate(90 * Math.PI / 180);
                        ctx.textAlign = 'center';
                        if (el.strokeWidth && el.strokeWidth > 0) ctx.strokeText(char, 0, 0);
                        ctx.fillText(char, 0, 0);
                        ctx.restore();
                        const charW = ctx.measureText(char).width;
                        advanceY = charW;
                    }
                    currentY += advanceY + spacingPx;
                });
                startX -= lineHeightPx;
            });
        }
    } else if (isCurved) {
        // --- HORIZONTAL CURVE RENDERER (Optimized) ---
        const radius = 10000 / Math.abs(curveStrength);
        const isArch = curveStrength > 0;
        const centerX = x + el.width / 2;

        const boxCenterY = y + el.height / 2;

        const maxLineWidth = lines.reduce((max, line) => {
            const chars = line.split('');
            const w = chars.reduce((sum, c) => sum + ctx.measureText(c).width, 0) + (chars.length - 1) * spacingPx;
            return Math.max(max, w);
        }, 0);

        const arcAngleTotal = maxLineWidth / radius;
        const sagitta = radius * (1 - Math.cos(arcAngleTotal / 2));
        const shiftY = isArch ? -sagitta/2 : sagitta/2;

        lines.forEach((line, i) => {
            const lineOffset = (i - (lines.length-1)/2) * lineHeightPx;
            const currentRadius = isArch ? radius - lineOffset : radius + lineOffset;

            if (currentRadius <= 0) return;

            const pivotY = isArch ? boxCenterY + radius + shiftY : boxCenterY - radius + shiftY;

            const chars = line.split('');
            const charWidths = chars.map(c => ctx.measureText(c).width);
            const totalLineWidth = charWidths.reduce((sum, w) => sum + w, 0) + (chars.length - 1) * spacingPx;

            const totalAngle = totalLineWidth / currentRadius;

            let currentAngle = isArch
                ? -Math.PI / 2 - totalAngle / 2
                : Math.PI / 2 - totalAngle / 2;

            chars.forEach((char, idx) => {
                const charW = charWidths[idx];
                const charAngle = charW / currentRadius;
                const spacingAngle = spacingPx / currentRadius;

                const theta = currentAngle + charAngle / 2;

                ctx.save();
                ctx.translate(centerX, pivotY);
                ctx.rotate(theta);
                ctx.translate(currentRadius, 0);

                if (isArch) ctx.rotate(Math.PI / 2);
                else ctx.rotate(-Math.PI / 2);

                ctx.textAlign = 'center';
                if (el.strokeWidth && el.strokeWidth > 0) ctx.strokeText(char, 0, 0);
                ctx.fillText(char, 0, 0);
                ctx.restore();

                currentAngle += charAngle + spacingAngle;
            });
        });
    } else {
        // --- Horizontal Straight ---
        let startX = x + textPadding;
        if (el.align === 'center') startX = x + el.width / 2;
        else if (el.align === 'right') startX = x + el.width - textPadding;

        ctx.textAlign = el.align;

        const totalTextHeight = lines.length * lineHeightPx;
        const startY = y + (el.height - totalTextHeight)/2 + lineHeightPx/2;

        lines.forEach((line, i) => {
            const ly = startY + (i * lineHeightPx);
            if (el.strokeWidth && el.strokeWidth > 0) ctx.strokeText(line, startX, ly);
            ctx.fillText(line, startX, ly);
        });
    }
};
