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

    const spacingPx = el.letterSpacing || 0; // stored in px

    // Always use '0px' — letter spacing is applied manually char-by-char for consistent results
    // @ts-ignore
    ctx.letterSpacing = '0px';

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

    const { lines } = wrapTextCanvas(ctx, el.text, maxConstraint, lineHeightPx, isVertical, el.fontSize, spacingPx);

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
        // Two-pass: stroke first (all chars), then fill (all chars) — prevents right chars covering left chars' stroke
        if (el.strokeWidth && el.strokeWidth > 0) {
            drawTextContent(offCtx, el, x, y, lines, lineHeightPx, isVertical, isCurved, curveStrength, spacingPx, textPadding, padding, 'strokeOnly');
        }
        drawTextContent(offCtx, el, x, y, lines, lineHeightPx, isVertical, isCurved, curveStrength, spacingPx, textPadding, padding, 'fillOnly');

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
        // No effects — draw directly (fast path), still two-pass for stroke
        ctx.lineWidth = el.strokeWidth || 0;
        ctx.strokeStyle = el.strokeColor || 'transparent';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.fillStyle = el.color;
        ctx.textBaseline = 'middle';
        if (el.strokeWidth && el.strokeWidth > 0) {
            drawTextContent(ctx, el, x, y, lines, lineHeightPx, isVertical, isCurved, curveStrength, spacingPx, textPadding, padding, 'strokeOnly');
        }
        drawTextContent(ctx, el, x, y, lines, lineHeightPx, isVertical, isCurved, curveStrength, spacingPx, textPadding, padding, 'fillOnly');
    }
};

const drawTextContent = (
    ctx: CanvasRenderingContext2D, el: TextElement,
    x: number, y: number, lines: string[],
    lineHeightPx: number, isVertical: boolean, isCurved: boolean,
    curveStrength: number, spacingPx: number, textPadding: number, padding: number,
    mode: 'strokeOnly' | 'fillOnly' | 'both' = 'both'
): void => {
    const doStroke = (mode === 'strokeOnly' || mode === 'both') && !!(el.strokeWidth && el.strokeWidth > 0);
    const doFill = mode === 'fillOnly' || mode === 'both';
    if (isVertical) {
        // --- Vertical Text Drawing ---
        const totalTextWidth = lines.length * lineHeightPx;
        let startX = x + (el.width - totalTextWidth)/2 + (lines.length - 1) * lineHeightPx + lineHeightPx/2;

        if (isCurved) {
            // --- VERTICAL CURVED ---
            // Same formula as horizontal but axes swapped:
            // Main axis = Y (top→bottom), arc deflects in X (positive = bows right)
            // R = totalColHeight / (|curvatureNorm| × 2π)
            const curvatureNorm = curveStrength / 100;
            const isNeg = curvatureNorm < 0;
            const centerY = y + el.height / 2;

            lines.forEach((lineIdx2, i) => {
                const line = lineIdx2;
                const colX = startX - (i * lineHeightPx);
                const chars = line.split('');
                const charHeights = chars.map(c => isCJK(c) ? el.fontSize : el.fontSize * 0.6);
                const totalColH = charHeights.reduce((s, h) => s + h, 0) + Math.max(0, chars.length - 1) * spacingPx;

                const arcAngle = Math.abs(curvatureNorm) * 2 * Math.PI;
                const baseR = totalColH / arcAngle;
                const lineOff = (i - (lines.length - 1) / 2) * lineHeightPx;
                const R = isNeg ? baseR + lineOff : baseR - lineOff;
                if (R <= 0) return;

                const sagitta = R * (1 - Math.cos(arcAngle / 2));
                const shiftX = isNeg ? -sagitta / 2 : sagitta / 2;

                let accumulated = 0;
                chars.forEach((char, idx) => {
                    const charH = charHeights[idx];
                    const s = accumulated + charH / 2 - totalColH / 2;
                    accumulated += charH + (idx < chars.length - 1 ? spacingPx : 0);

                    const theta = s / R;
                    const cy = centerY + R * Math.sin(theta);
                    const baseX = R * (1 - Math.cos(theta));
                    // Positive: center bows RIGHT (ends go left); Negative: center bows LEFT (baseline out)
                    const cx = isNeg ? colX + baseX + shiftX : colX - baseX + shiftX;
                    let rotDeg = isNeg ? (theta + Math.PI) * 180 / Math.PI : theta * 180 / Math.PI;
                    if (!isCJK(char)) rotDeg += 90;

                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(rotDeg * Math.PI / 180);
                    ctx.textAlign = 'center';
                    if (doStroke) ctx.strokeText(char, 0, 0);
                    if (doFill) ctx.fillText(char, 0, 0);
                    ctx.restore();
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
                        if (doStroke) ctx.strokeText(char, startX, currentY);
                        if (doFill) ctx.fillText(char, startX, currentY);
                        advanceY = el.fontSize;
                    } else {
                        ctx.save();
                        ctx.translate(startX, currentY);
                        ctx.rotate(90 * Math.PI / 180);
                        ctx.textAlign = 'center';
                        if (doStroke) ctx.strokeText(char, 0, 0);
                        if (doFill) ctx.fillText(char, 0, 0);
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
        // --- HORIZONTAL CURVE RENDERER ---
        // curvatureNorm ∈ [-1,1]: +1 = full circle arch up (∩), -1 = full circle arch down baseline-out (∪ flipped)
        // R = totalLineWidth / (|curvatureNorm| * 2π)  →  at ±1, text wraps exactly once around circle
        const curvatureNorm = curveStrength / 100;
        const isNeg = curvatureNorm < 0;
        const centerX = x + el.width / 2;
        const boxCenterY = y + el.height / 2;

        lines.forEach((line, lineIdx) => {
            const chars = line.split('');
            const charWidths = chars.map(c => ctx.measureText(c).width);
            const totalLineWidth = charWidths.reduce((sum, w) => sum + w, 0) + Math.max(0, chars.length - 1) * spacingPx;

            const arcAngle = Math.abs(curvatureNorm) * 2 * Math.PI;
            const baseR = totalLineWidth / arcAngle;
            // Multi-line: inner lines have smaller radius
            const lineOffset = (lineIdx - (lines.length - 1) / 2) * lineHeightPx;
            const R = isNeg ? baseR + lineOffset : baseR - lineOffset;
            if (R <= 0) return;

            const sagitta = R * (1 - Math.cos(arcAngle / 2));
            // Vertical shift to keep arc visually centred in the box
            const shiftY = isNeg ? sagitta / 2 : -sagitta / 2;

            // Arc offset s for each char (left → right, relative to text centre)
            let accumulated = 0;
            chars.forEach((char, i) => {
                const charW = charWidths[i];
                const s = accumulated + charW / 2 - totalLineWidth / 2;
                accumulated += charW + (i < chars.length - 1 ? spacingPx : 0);

                const theta = s / R;
                const charX = centerX + R * Math.sin(theta);
                const baseY = isNeg ? -R * (1 - Math.cos(theta)) : R * (1 - Math.cos(theta));
                const charY = boxCenterY + baseY + shiftY;
                const rotRad = isNeg ? theta + Math.PI : theta;

                ctx.save();
                ctx.translate(charX, charY);
                ctx.rotate(rotRad);
                ctx.textAlign = 'center';
                if (doStroke) ctx.strokeText(char, 0, 0);
                if (doFill) ctx.fillText(char, 0, 0);
                ctx.restore();
            });
        });
    } else {
        // --- Horizontal Straight --- (char-by-char for consistent letter spacing with SVG display)
        ctx.textAlign = 'left';

        const totalTextHeight = lines.length * lineHeightPx;
        const startY = y + (el.height - totalTextHeight) / 2 + lineHeightPx / 2;

        lines.forEach((line, i) => {
            const ly = startY + (i * lineHeightPx);
            const chars = line.split('');

            // Calculate total line width for alignment
            const lineWidth = chars.reduce((sum, c) => sum + ctx.measureText(c).width, 0)
                + Math.max(0, chars.length - 1) * spacingPx;

            let cx: number;
            if (el.align === 'center') cx = x + el.width / 2 - lineWidth / 2;
            else if (el.align === 'right') cx = x + el.width - textPadding - lineWidth;
            else cx = x + textPadding;

            chars.forEach(char => {
                const charW = ctx.measureText(char).width;
                if (doStroke) ctx.strokeText(char, cx, ly);
                if (doFill) ctx.fillText(char, cx, ly);
                cx += charW + spacingPx;
            });
        });
    }
};
