import type { TextElement } from '../types';
import { captureTextElementAsImage, captureTextElementEffectsAsImage } from './svgCapture';
import { drawTextOnCanvas } from './textCanvas';
import { getTextEffectPadding } from './textEffects';

export interface RasterizedText {
    dataUrl: string;
    width: number;
    height: number;
    padding: number;
}

async function withTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number,
    message: string,
): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            operation,
            new Promise<T>((_, reject) => {
                timer = setTimeout(() => reject(new Error(message)), timeoutMs);
            }),
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

export async function rasterizeTextElement(
    element: TextElement,
    scale: number,
    preferLiveSvg: boolean = true,
): Promise<RasterizedText> {
    await document.fonts.ready;

    const padding = getTextEffectPadding(element);
    const width = element.width + padding * 2;
    const height = element.height + padding * 2;

    if (preferLiveSvg && document.querySelector(`[data-element-id="${element.id}"] svg`)) {
        try {
            const dataUrl = await withTimeout(
                captureTextElementAsImage(
                    element.id,
                    element.width,
                    element.height,
                    padding,
                    scale,
                    element.backgroundColor && element.backgroundColor !== 'transparent'
                        ? element.backgroundColor
                        : undefined,
                    element.fontFamily,
                    element.text,
                ),
                10_000,
                'Live SVG text capture timed out',
            );
            return { dataUrl, width, height, padding };
        } catch (error) {
            console.warn('Live SVG text capture failed; falling back to Canvas rendering.', error);
        }
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to create text rasterization context');
    context.scale(scale, scale);
    drawTextOnCanvas(context, element, padding, padding);

    return {
        dataUrl: canvas.toDataURL('image/png'),
        width,
        height,
        padding,
    };
}

export async function rasterizeTextEffects(
    element: TextElement,
    scale: number,
): Promise<RasterizedText | null> {
    const hasEffects =
        (!!element.shadowColor && (element.shadowBlur || 0) > 0) ||
        (!!element.glowColor && (element.glowBlur || 0) > 0);
    if (!hasEffects) return null;

    await document.fonts.ready;
    const padding = getTextEffectPadding(element);
    const width = element.width + padding * 2;
    const height = element.height + padding * 2;

    if (document.querySelector(`[data-element-id="${element.id}"] svg`)) {
        try {
            const dataUrl = await withTimeout(
                captureTextElementEffectsAsImage(
                    element.id,
                    element.width,
                    element.height,
                    padding,
                    scale,
                    element.fontFamily,
                    element.text,
                ),
                8_000,
                'Live SVG text effect capture timed out',
            );
            return { dataUrl, width, height, padding };
        } catch (error) {
            console.warn('Live SVG effect capture failed; falling back to Canvas rendering.', error);
        }
    }

    const fullCanvas = document.createElement('canvas');
    const baseCanvas = document.createElement('canvas');
    fullCanvas.width = baseCanvas.width = Math.ceil(width * scale);
    fullCanvas.height = baseCanvas.height = Math.ceil(height * scale);
    const fullContext = fullCanvas.getContext('2d');
    const baseContext = baseCanvas.getContext('2d');
    if (!fullContext || !baseContext) throw new Error('Unable to create text effect contexts');
    fullContext.scale(scale, scale);
    baseContext.scale(scale, scale);

    drawTextOnCanvas(fullContext, element, padding, padding);
    drawTextOnCanvas(baseContext, {
        ...element,
        backgroundColor: 'transparent',
        shadowBlur: 0,
        glowBlur: 0,
    }, padding, padding);

    fullContext.globalCompositeOperation = 'destination-out';
    fullContext.drawImage(baseCanvas, 0, 0, width, height);
    fullContext.globalCompositeOperation = 'source-over';

    return {
        dataUrl: fullCanvas.toDataURL('image/png'),
        width,
        height,
        padding,
    };
}
