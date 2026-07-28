import type { TextElement } from '../types';
import { captureTextElementAsImage } from './svgCapture';
import { drawTextOnCanvas } from './textCanvas';
import { getTextEffectPadding } from './textEffects';

export interface RasterizedText {
    dataUrl: string;
    width: number;
    height: number;
    padding: number;
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
            const dataUrl = await captureTextElementAsImage(
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
