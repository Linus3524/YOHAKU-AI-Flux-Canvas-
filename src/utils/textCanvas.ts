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

    // Handle Spacing Manually for Complex layouts to ensure precision
    const spacingEm = el.letterSpacing || 0;
    const spacingPx = spacingEm * el.fontSize;

    // FIX: Disable context letterSpacing when doing manual positioning (Curved or Vertical) 
    // to avoid double spacing issues where characters render with browser spacing AND manual offset.
    if (isVertical || isCurved) {
        // @ts-ignore
        ctx.letterSpacing = '0px'; 
    } else {
        // Standard Horizontal: Use browser native spacing for consistency
        // @ts-ignore
        ctx.letterSpacing = spacingEm ? `${spacingEm}em` : '0px';
    }

    if (el.backgroundColor && el.backgroundColor !== 'transparent') {
        ctx.fillStyle = el.backgroundColor;
        ctx.fillRect(x, y, el.width, el.height);
    }

    // Configure Shadows/Glow
    ctx.shadowColor = 'transparent';
    if (el.glowColor && el.glowBlur && el.glowBlur > 0) {
        ctx.shadowColor = el.glowColor;
        ctx.shadowBlur = el.glowBlur;
    } else if (el.shadowColor && el.shadowBlur !== undefined && el.shadowBlur > 0) {
        ctx.shadowColor = el.shadowColor;
        ctx.shadowBlur = el.shadowBlur;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;
    }

    ctx.lineWidth = el.strokeWidth || 0;
    ctx.strokeStyle = el.strokeColor || 'transparent';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.fillStyle = el.color;
    ctx.textBaseline = 'middle'; 

    const padding = 12 + Math.ceil(strokeW / 2);

    const maxConstraint = (() => {
        if (el.isWidthLocked && !isVertical) {
            // 橫書固定寬度模式：用框框寬度換行
            return Math.max(10, el.width - padding * 2);
        }
        if (el.isHeightLocked && isVertical) {
            // 直書固定高度模式：用框框高度決定每欄字數
            return Math.max(10, el.height - padding * 2);
        }
        // 自動模式：不換行（原本行為）
        return 100000;
    })();

    const { lines } = wrapTextCanvas(ctx, el.text, maxConstraint, lineHeightPx, isVertical);

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
                // Calculate exact arc length for this specific column to ensure perfect centering
                const chars = line.split('');
                let totalH = 0;
                const charHeights = chars.map(char => {
                    const h = isCJK(char) ? el.fontSize : el.fontSize * 0.6; // approx height
                    totalH += h;
                    return h;
                });
                // Add total spacing
                totalH += (chars.length - 1) * spacingPx;

                const totalAngle = totalH / radius;
                
                // Start at center relative to arc direction
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
                // Recalculate pure height including spacing for accurate alignment
                const chars = line.split('');
                const totalH = chars.reduce((sum, char) => sum + (isCJK(char) ? el.fontSize : el.fontSize * 0.6), 0) + (chars.length - 1) * spacingPx;

                if (el.align === 'center') currentY = y + el.height/2 - totalH/2;
                else if (el.align === 'right') currentY = y + el.height - textPadding - totalH;
                
                // If right aligned, we start from top but offset logic handles it? 
                // Actually typical vertical flow top-down means 'right' align usually aligns bottom.
                // For consistency with typical vertical editors:
                
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
                        const charW = ctx.measureText(char).width; // width acts as height when rotated
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
        
        // Improved Sagitta/Shift calculation
        // We estimate the longest line width to center the curve vertically in the box
        // For accurate vertical centering, we need the sagitta of the *actual* text arc.
        const maxLineWidth = lines.reduce((max, line) => {
            const chars = line.split('');
            // Sum widths of chars + total spacing
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

            // 1. Precise Measurement Phase
            const chars = line.split('');
            const charWidths = chars.map(c => ctx.measureText(c).width);
            const totalLineWidth = charWidths.reduce((sum, w) => sum + w, 0) + (chars.length - 1) * spacingPx;
            
            const totalAngle = totalLineWidth / currentRadius;
            
            // 2. Start Angle Calculation (Perfectly Centered)
            let currentAngle = isArch 
                ? -Math.PI / 2 - totalAngle / 2 
                : Math.PI / 2 - totalAngle / 2;
            
            chars.forEach((char, idx) => {
                const charW = charWidths[idx];
                const charAngle = charW / currentRadius;
                const spacingAngle = spacingPx / currentRadius;
                
                // Center the character within its allocated angle slot
                const theta = currentAngle + charAngle / 2; 
                
                ctx.save();
                // Translate to Pivot
                ctx.translate(centerX, pivotY);
                // Rotate to position
                ctx.rotate(theta);
                // Push out to radius
                ctx.translate(currentRadius, 0); 
                
                // Rotate text to be upright relative to tangent
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
        
        // Center block vertically
        const totalTextHeight = lines.length * lineHeightPx;
        const startY = y + (el.height - totalTextHeight)/2 + lineHeightPx/2;

        lines.forEach((line, i) => {
            const ly = startY + (i * lineHeightPx);
            if (el.strokeWidth && el.strokeWidth > 0) ctx.strokeText(line, startX, ly);
            ctx.fillText(line, startX, ly);
        });
    }
};
