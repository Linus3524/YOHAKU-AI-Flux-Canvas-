// ─────────────────────────────────────────────────────────────────────────────
// Image Processing Utilities
// Pure functions extracted from ImageEditModal.tsx for Separation of Concerns.
// None of these functions depend on React state.
// ─────────────────────────────────────────────────────────────────────────────

/** Convert RGB (0-255) to HSL (0-1 each). */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

/** Convert HSL (0-1 each) to RGB (0-255 each). */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [r * 255, g * 255, b * 255];
}

/** Load an HTMLImageElement from a src URL (crossOrigin = anonymous). */
const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/**
 * Composite three images pixel-by-pixel using a B&W mask.
 * White mask pixels → show generated image; black → keep original.
 * Mask edges are softened with an 8 px blur before blending.
 */
export const compositeImagesPixelPerfect = async (
  originalSrc: string,
  generatedSrc: string,
  bwMaskSrc: string,
): Promise<string> => {
  const [origImg, genImg, maskImg] = await Promise.all([
    loadImage(originalSrc),
    loadImage(generatedSrc),
    loadImage(bwMaskSrc),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = origImg.naturalWidth;
  canvas.height = origImg.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('No context');

  // Draw original
  ctx.drawImage(origImg, 0, 0);
  const origData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Draw generated (scale to fit original just in case AI resized it)
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(genImg, 0, 0, canvas.width, canvas.height);
  const genData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Draw mask with a blur filter to soften edges
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.filter = 'blur(8px)';
  ctx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
  ctx.filter = 'none';
  const maskData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Composite
  const finalData = new ImageData(canvas.width, canvas.height);
  for (let i = 0; i < maskData.data.length; i += 4) {
    // Use the red channel of the blurred mask as an alpha blend factor (0.0–1.0).
    // Boost slightly to ensure the core of the mask remains fully opaque.
    const maskAlpha = Math.min(1, (maskData.data[i] / 255) * 2);

    finalData.data[i]     = Math.round(genData.data[i]     * maskAlpha + origData.data[i]     * (1 - maskAlpha));
    finalData.data[i + 1] = Math.round(genData.data[i + 1] * maskAlpha + origData.data[i + 1] * (1 - maskAlpha));
    finalData.data[i + 2] = Math.round(genData.data[i + 2] * maskAlpha + origData.data[i + 2] * (1 - maskAlpha));
    finalData.data[i + 3] = 255; // Keep fully opaque
  }

  ctx.putImageData(finalData, 0, 0);
  return canvas.toDataURL('image/png');
};

/**
 * Blend the painted mask region of `baseSrc` with neutral gray (128,128,128).
 * Used to pre-fill the inpaint region before sending to the AI, so that
 * existing text/objects are fully hidden from the model.
 */
export const createPrefilledImage = async (
  baseSrc: string,
  maskDataUrl: string,
): Promise<string> => {
  const [origImg, maskImg] = await Promise.all([
    loadImage(baseSrc),
    loadImage(maskDataUrl),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = origImg.naturalWidth;
  canvas.height = origImg.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('No context');

  ctx.drawImage(origImg, 0, 0);
  const origData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.filter = 'blur(8px)';
  ctx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
  ctx.filter = 'none';
  const maskData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < maskData.data.length; i += 4) {
    // maskData.data[i + 3] is the alpha channel of the drawn mask
    const maskAlpha = Math.min(1, (maskData.data[i + 3] / 255) * 2);
    if (maskAlpha > 0) {
      // Fill with neutral gray to completely hide text/objects from AI
      origData.data[i]     = Math.round(128 * maskAlpha + origData.data[i]     * (1 - maskAlpha));
      origData.data[i + 1] = Math.round(128 * maskAlpha + origData.data[i + 1] * (1 - maskAlpha));
      origData.data[i + 2] = Math.round(128 * maskAlpha + origData.data[i + 2] * (1 - maskAlpha));
    }
  }

  ctx.putImageData(origData, 0, 0);
  return canvas.toDataURL('image/png');
};
