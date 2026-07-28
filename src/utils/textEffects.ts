import type { TextElement } from '../types';

const clampPercent = (value: number | undefined): number =>
    Math.min(100, Math.max(0, value ?? 100));

export const getTextShadowOffset = (
    element: Pick<TextElement, 'shadowAngle' | 'shadowDistance'>,
): { x: number; y: number } => {
    const angle = element.shadowAngle ?? 45;
    const distance = element.shadowDistance ?? Math.hypot(4, 4);
    const radians = angle * Math.PI / 180;
    return {
        x: Math.cos(radians) * distance,
        y: Math.sin(radians) * distance,
    };
};

export const colorWithOpacity = (color: string, opacity: number | undefined): string => {
    const alpha = clampPercent(opacity) / 100;
    if (alpha >= 1) return color;

    const hex = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hex) {
        const raw = hex[1].length === 3
            ? hex[1].split('').map(char => char + char).join('')
            : hex[1];
        const r = parseInt(raw.slice(0, 2), 16);
        const g = parseInt(raw.slice(2, 4), 16);
        const b = parseInt(raw.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    const rgb = color.trim().match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
    if (rgb) {
        const sourceAlpha = rgb[4] === undefined ? 1 : Number(rgb[4]);
        return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${Math.min(1, Math.max(0, sourceAlpha * alpha))})`;
    }

    return `color-mix(in srgb, ${color} ${clampPercent(opacity)}%, transparent)`;
};

export const getTextEffectPadding = (
    element: Pick<TextElement, 'strokeWidth' | 'shadowBlur' | 'shadowAngle' | 'shadowDistance' | 'glowBlur'>,
): number => {
    const stroke = Math.ceil((element.strokeWidth || 0) / 2);
    const shadowBlur = Math.max(0, element.shadowBlur || 0);
    const glowBlur = Math.max(0, element.glowBlur || 0);
    const shadowOffset = getTextShadowOffset(element);

    // CSS drop-shadow and Canvas shadowBlur both have a soft Gaussian tail.
    // 2.5× keeps the visible tail while avoiding excessively large transparent bounds.
    const shadow = shadowBlur > 0
        ? Math.ceil(shadowBlur * 2.5 + Math.max(Math.abs(shadowOffset.x), Math.abs(shadowOffset.y)))
        : 0;
    const glow = glowBlur > 0 ? Math.ceil(glowBlur * 2.5) : 0;

    return Math.max(stroke, shadow, glow, 0);
};
