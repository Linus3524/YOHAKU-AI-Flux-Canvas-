import { loadImage } from './helpers';

export interface BlendOptions {
  originalX: number;
  originalY: number;
  originalWidth: number;
  originalHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  iterations?: number;
  growPx?: number;
}

/**
 * Pre-corrects global color shift: samples colors along the boundary of the original image
 * and the corresponding AI image pixels to find the average color drift, then applies a
 * uniform shift to all outpainted pixels in dstU8.
 */
function preCorrectColor(
  dstU8: Uint8ClampedArray,
  srcU8: Uint8ClampedArray,
  options: BlendOptions
): void {
  const { originalX, originalY, originalWidth, originalHeight, canvasWidth, canvasHeight } = options;
  const w = canvasWidth;
  const h = canvasHeight;

  // We sample pixels inside the original image border (width = 10)
  // and corresponding pixels in the AI image to compute average offset
  const sampleDepth = 10;
  let oR = 0, oG = 0, oB = 0, oN = 0;
  let aR = 0, aG = 0, aB = 0, aN = 0;

  // Helper to accumulate samples
  const addSample = (x: number, y: number, isOriginalSide: boolean) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const idx = (y * w + x) * 4;
    if (isOriginalSide) {
      oR += dstU8[idx]; oG += dstU8[idx + 1]; oB += dstU8[idx + 2]; oN++;
    } else {
      aR += srcU8[idx]; aG += srcU8[idx + 1]; aB += srcU8[idx + 2]; aN++;
    }
  };

  // Sample top and bottom borders
  for (let x = originalX; x < originalX + originalWidth; x++) {
    for (let d = 0; d < sampleDepth; d++) {
      // Top border
      addSample(x, originalY + d, true);      // original side
      addSample(x, originalY - d - 1, false);  // AI side

      // Bottom border
      addSample(x, originalY + originalHeight - d - 1, true); // original side
      addSample(x, originalY + originalHeight + d, false);    // AI side
    }
  }

  // Sample left and right borders
  for (let y = originalY; y < originalY + originalHeight; y++) {
    for (let d = 0; d < sampleDepth; d++) {
      // Left border
      addSample(originalX + d, y, true);      // original side
      addSample(originalX - d - 1, y, false);  // AI side

      // Right border
      addSample(originalX + originalWidth - d - 1, y, true); // original side
      addSample(originalX + originalWidth + d, y, false);    // AI side
    }
  }

  if (oN === 0 || aN === 0) return;

  const dR = oR / oN - aR / aN;
  const dG = oG / oN - aG / aN;
  const dB = oB / oN - aB / aN;

  // Apply uniform color shift to all AI generated pixels (pixels outside original region)
  for (let y = 0; y < h; y++) {
    const isYInsideOriginal = y >= originalY && y < originalY + originalHeight;
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const isXInsideOriginal = x >= originalX && x < originalX + originalWidth;
      // Skip if inside the original image area
      if (isYInsideOriginal && isXInsideOriginal) continue;

      const idx = (row + x) * 4;
      const r = dstU8[idx] + dR;
      const g = dstU8[idx + 1] + dG;
      const b = dstU8[idx + 2] + dB;
      dstU8[idx]     = Math.max(0, Math.min(255, r));
      dstU8[idx + 1] = Math.max(0, Math.min(255, g));
      dstU8[idx + 2] = Math.max(0, Math.min(255, b));
    }
  }
}

/**
 * Poisson image editing (Perez et al. 2003) via Gauss-Seidel iterations.
 */
export function poissonBlend(
  originalImg: HTMLImageElement,
  aiImg: HTMLImageElement,
  options: BlendOptions
): HTMLCanvasElement {
  const {
    originalX,
    originalY,
    originalWidth,
    originalHeight,
    canvasWidth,
    canvasHeight,
    iterations = 200,
  } = options;

  const w = canvasWidth;
  const h = canvasHeight;
  const N = w * h;

  // 1. Create target canvas: base is AI image, draw original image on top
  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = w;
  dstCanvas.height = h;
  const dstCtx = dstCanvas.getContext('2d')!;
  dstCtx.drawImage(aiImg, 0, 0, w, h);
  dstCtx.drawImage(originalImg, originalX, originalY, originalWidth, originalHeight);
  const dstData = dstCtx.getImageData(0, 0, w, h);
  const dstU8 = dstData.data;

  // 2. Create source canvas: purely AI image (defines the gradients)
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = w;
  srcCanvas.height = h;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.drawImage(aiImg, 0, 0, w, h);
  const srcU8 = srcCtx.getImageData(0, 0, w, h).data;

  // 3. Pre-correct color drift (Low-frequency color correction)
  preCorrectColor(dstU8, srcU8, options);

  // 4. Build color vectors
  const dstR = new Float32Array(N);
  const dstG = new Float32Array(N);
  const dstB = new Float32Array(N);
  const srcR = new Float32Array(N);
  const srcG = new Float32Array(N);
  const srcB = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const j = i * 4;
    dstR[i] = dstU8[j];
    dstG[i] = dstU8[j + 1];
    dstB[i] = dstU8[j + 2];
    srcR[i] = srcU8[j];
    srcG[i] = srcU8[j + 1];
    srcB[i] = srcU8[j + 2];
  }

  // 5. Build mask.
  // The mask is 1 everywhere outside the shrunken original image region.
  // We grow the mask into the original image by growPx.
  const growPx = options.growPx ?? Math.max(6, Math.min(14, Math.floor(Math.min(originalWidth, originalHeight) * 0.02)));
  const mask = new Uint8Array(N);
  mask.fill(1); // 1 = solve (mask area)

  // Mark the shrunken original region as 0 (frozen)
  const innerX0 = Math.max(0, originalX + growPx);
  const innerY0 = Math.max(0, originalY + growPx);
  const innerX1 = Math.min(w, originalX + originalWidth - growPx);
  const innerY1 = Math.min(h, originalY + originalHeight - growPx);

  for (let y = innerY0; y < innerY1; y++) {
    const row = y * w;
    for (let x = innerX0; x < innerX1; x++) {
      mask[row + x] = 0; // 0 = frozen boundary (original pixels)
    }
  }

  // Precompute Laplacian of S (the AI image gradients) with replicate padding
  const lapR = new Float32Array(N);
  const lapG = new Float32Array(N);
  const lapB = new Float32Array(N);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    const rowUp = (y > 0 ? y - 1 : 0) * w;
    const rowDn = (y < h - 1 ? y + 1 : h - 1) * w;
    for (let x = 0; x < w; x++) {
      const i = row + x;
      const xL = x > 0 ? x - 1 : 0;
      const xR = x < w - 1 ? x + 1 : w - 1;
      lapR[i] = 4 * srcR[i] - srcR[rowUp + x] - srcR[rowDn + x] - srcR[row + xL] - srcR[row + xR];
      lapG[i] = 4 * srcG[i] - srcG[rowUp + x] - srcG[rowDn + x] - srcG[row + xL] - srcG[row + xR];
      lapB[i] = 4 * srcB[i] - srcB[rowUp + x] - srcB[rowDn + x] - srcB[row + xL] - srcB[row + xR];
    }
  }

  // Initial guess V = D
  const vR = new Float32Array(N);
  const vG = new Float32Array(N);
  const vB = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    vR[i] = dstR[i];
    vG[i] = dstG[i];
    vB[i] = dstB[i];
  }

  // Bounding box of the solve region (mask) for optimization
  const x0 = 0;
  const x1 = w;
  const y0 = 0;
  const y1 = h;

  // Solve Poisson using Gauss-Seidel Red-Black ordering
  for (let iter = 0; iter < iterations; iter++) {
    for (let parity = 0; parity < 2; parity++) {
      for (let y = y0; y < y1; y++) {
        const row = y * w;
        const rowUp = (y > 0 ? y - 1 : 0) * w;
        const rowDn = (y < h - 1 ? y + 1 : h - 1) * w;
        const startX = x0 + ((x0 + y + parity) & 1);
        for (let x = startX; x < x1; x += 2) {
          const i = row + x;
          if (!mask[i]) continue; // Skip frozen boundary pixels
          const xL = x > 0 ? x - 1 : 0;
          const xR = x < w - 1 ? x + 1 : w - 1;
          const iU = rowUp + x, iD = rowDn + x, iL = row + xL, iR = row + xR;

          // If a neighbor is inside the mask, use its current variable value.
          // Otherwise, clamp to the frozen boundary pixel color.
          const upR = mask[iU] ? vR[iU] : dstR[iU];
          const dnR = mask[iD] ? vR[iD] : dstR[iD];
          const lfR = mask[iL] ? vR[iL] : dstR[iL];
          const rtR = mask[iR] ? vR[iR] : dstR[iR];

          const upG = mask[iU] ? vG[iU] : dstG[iU];
          const dnG = mask[iD] ? vG[iD] : dstG[iD];
          const lfG = mask[iL] ? vG[iL] : dstG[iL];
          const rtG = mask[iR] ? vG[iR] : dstG[iR];

          const upB = mask[iU] ? vB[iU] : dstB[iU];
          const dnB = mask[iD] ? vB[iD] : dstB[iD];
          const lfB = mask[iL] ? vB[iL] : dstB[iL];
          const rtB = mask[iR] ? vB[iR] : dstB[iR];

          vR[i] = (upR + dnR + lfR + rtR + lapR[i]) * 0.25;
          vG[i] = (upG + dnG + lfG + rtG + lapG[i]) * 0.25;
          vB[i] = (upB + dnB + lfB + rtB + lapB[i]) * 0.25;
        }
      }
    }
  }

  // Construct output ImageData
  const out = new ImageData(w, h);
  const od = out.data;
  for (let i = 0; i < N; i++) {
    const j = i * 4;
    if (mask[i]) {
      od[j]     = vR[i] < 0 ? 0 : vR[i] > 255 ? 255 : vR[i];
      od[j + 1] = vG[i] < 0 ? 0 : vG[i] > 255 ? 255 : vG[i];
      od[j + 2] = vB[i] < 0 ? 0 : vB[i] > 255 ? 255 : vB[i];
    } else {
      od[j]     = dstR[i];
      od[j + 1] = dstG[i];
      od[j + 2] = dstB[i];
    }
    od[j + 3] = 255;
  }

  const result = document.createElement('canvas');
  result.width = w;
  result.height = h;
  result.getContext('2d')!.putImageData(out, 0, 0);
  return result;
}

export async function applyPoissonBlend(
  originalSrc: string,
  aiSrc: string,
  options: Omit<BlendOptions, 'originalX' | 'originalY'> & { originalPosition: { x: number; y: number } }
): Promise<string> {
  const [originalImg, aiImg] = await Promise.all([
    loadImage(originalSrc),
    loadImage(aiSrc),
  ]);

  const canvas = poissonBlend(originalImg, aiImg, {
    originalX: options.originalPosition.x,
    originalY: options.originalPosition.y,
    originalWidth: options.originalWidth,
    originalHeight: options.originalHeight,
    canvasWidth: options.canvasWidth,
    canvasHeight: options.canvasHeight,
    iterations: options.iterations,
    growPx: options.growPx,
  });

  return canvas.toDataURL('image/png');
}
