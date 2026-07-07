// ============================================================
// Sticker Background Removal and Grid Splitting Utilities
// Ported and adapted from StickerCraft AI
// ============================================================

export interface ImageCropBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface CropAdjustments {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface StickerSplitSource {
  box: ImageCropBox;
  sourceWidth: number;
  sourceHeight: number;
  cropAdjustments?: CropAdjustments;
}

export interface TransparencyRepairOptions {
  backgroundColor?: string;
  hasStickerBorder?: boolean;
  tolerance?: number;
  /** 去光暈 pass 數（每輪削掉一圈「接近背景色」的殘邊）。預設 2。 */
  haloPasses?: number;
  /** 幾何收縮 px：無條件往內削 N px（不分顏色，含抗鋸齒殘邊），會略吃白邊。預設 0。 */
  erodePx?: number;
  /** 羽化半徑（像素），大於 0 時會對 alpha 邊緣做平滑羽化以消除鋸齒。預設 0（不羽化）。 */
  featherRadius?: number;
}

export interface SplitStickerCollectionOptions extends TransparencyRepairOptions {
  expectedCount?: number;
}

export interface GridSplitStickerCollectionOptions extends TransparencyRepairOptions {
  rows: number;
  columns: number;
}

export interface SplitStickerPiece {
  dataUrl: string;
  box: ImageCropBox;
  sourceWidth: number;
  sourceHeight: number;
}

export interface SplitStickerCollectionResult {
  sourceDataUrl: string;
  pieces: SplitStickerPiece[];
  transparentRatio?: number;
}

type RGB = { r: number; g: number; b: number };

interface BackgroundCandidate {
  color: RGB;
  tolerance: number;
}

interface CanvasSnapshot {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  imageData: ImageData;
  width: number;
  height: number;
}

interface ComponentBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  area: number;
}

interface ComponentCluster extends ComponentBox {
  pixels: number[];
}

const NAMED_COLORS: Record<string, RGB> = {
  white: { r: 255, g: 255, b: 255 },
  black: { r: 0, g: 0, b: 0 },
  red: { r: 239, g: 68, b: 68 },
  orange: { r: 249, g: 115, b: 22 },
  yellow: { r: 234, g: 179, b: 8 },
  green: { r: 34, g: 197, b: 94 },
  blue: { r: 59, g: 130, b: 246 },
  purple: { r: 168, g: 85, b: 247 },
  pink: { r: 236, g: 72, b: 153 },
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const sameColor = (a: RGB, b: RGB) => (
  Math.abs(a.r - b.r) <= 2 &&
  Math.abs(a.g - b.g) <= 2 &&
  Math.abs(a.b - b.b) <= 2
);

const addCandidate = (candidates: BackgroundCandidate[], color: RGB | undefined, tolerance: number) => {
  if (!color) return;
  if (candidates.some(candidate => sameColor(candidate.color, color))) return;
  candidates.push({ color, tolerance });
};

const parseCssColor = (value?: string): RGB | undefined => {
  if (!value) return undefined;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (NAMED_COLORS[normalized]) return NAMED_COLORS[normalized];

  const hex = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const raw = hex[1].length === 3
      ? hex[1].split('').map(char => `${char}${char}`).join('')
      : hex[1];
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16),
    };
  }

  const rgb = normalized.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgb) {
    return {
      r: clamp(Number(rgb[1]), 0, 255),
      g: clamp(Number(rgb[2]), 0, 255),
      b: clamp(Number(rgb[3]), 0, 255),
    };
  }

  return undefined;
};

const loadImageSnapshot = (dataUrl: string): Promise<CanvasSnapshot> => (
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        reject(new Error("Could not create a canvas context."));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve({ canvas, ctx, imageData, width: canvas.width, height: canvas.height });
    };
    img.onerror = () => reject(new Error("Could not load image for processing."));
    img.src = dataUrl;
  })
);

const colorMatches = (data: Uint8ClampedArray, pixelIndex: number, candidate: BackgroundCandidate) => {
  const r = data[pixelIndex];
  const g = data[pixelIndex + 1];
  const b = data[pixelIndex + 2];
  const { color, tolerance } = candidate;

  return (
    Math.abs(r - color.r) <= tolerance &&
    Math.abs(g - color.g) <= tolerance &&
    Math.abs(b - color.b) <= tolerance
  );
};

const getEdgePixelPositions = (width: number, height: number) => {
  const positions: number[] = [];

  for (let x = 0; x < width; x += 1) {
    positions.push(x);
    positions.push((height - 1) * width + x);
  }

  for (let y = 1; y < height - 1; y += 1) {
    positions.push(y * width);
    positions.push(y * width + width - 1);
  }

  return positions;
};

const getDominantEdgeColors = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
): RGB[] => {
  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
  const edgePositions = getEdgePixelPositions(width, height);

  edgePositions.forEach((position) => {
    const idx = position * 4;
    if (data[idx + 3] <= 20) return;

    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const key = `${r >> 4},${g >> 4},${b >> 4}`;
    const bucket = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };

    bucket.count += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  });

  const minCount = Math.max(2, Math.floor(edgePositions.length * 0.025));

  return [...buckets.values()]
    .filter(bucket => bucket.count >= minCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(bucket => ({
      r: Math.round(bucket.r / bucket.count),
      g: Math.round(bucket.g / bucket.count),
      b: Math.round(bucket.b / bucket.count),
    }));
};

const hasUsableAlphaBackground = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
) => {
  const totalPixels = width * height;
  const edgePositions = getEdgePixelPositions(width, height);
  let transparentPixels = 0;
  let softAlphaPixels = 0;
  let transparentEdgePixels = 0;
  let transparentCorners = 0;

  for (let position = 0; position < totalPixels; position += 1) {
    const alpha = data[position * 4 + 3];
    if (alpha <= 12) transparentPixels += 1;
    if (alpha < 250) softAlphaPixels += 1;
  }

  edgePositions.forEach((position) => {
    if (data[position * 4 + 3] <= 12) transparentEdgePixels += 1;
  });

  [
    0,
    width - 1,
    (height - 1) * width,
    height * width - 1,
  ].forEach((position) => {
    if (data[position * 4 + 3] <= 12) transparentCorners += 1;
  });

  const transparentRatio = transparentPixels / totalPixels;
  const softAlphaRatio = softAlphaPixels / totalPixels;
  const edgeTransparentRatio = transparentEdgePixels / edgePositions.length;

  return (
    edgeTransparentRatio >= 0.12 ||
    (transparentCorners >= 2 && transparentRatio >= 0.01) ||
    (edgeTransparentRatio >= 0.04 && softAlphaRatio >= 0.08)
  );
};

const getBackgroundCandidates = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: TransparencyRepairOptions = {},
) => {
  const candidates: BackgroundCandidate[] = [];
  const baseTolerance = options.tolerance ?? 44;

  addCandidate(candidates, parseCssColor(options.backgroundColor), baseTolerance + 8);
  addCandidate(
    candidates,
    options.hasStickerBorder ? NAMED_COLORS.black : NAMED_COLORS.white,
    baseTolerance,
  );

  getDominantEdgeColors(data, width, height).forEach((color) => {
    addCandidate(candidates, color, baseTolerance);
  });

  return candidates;
};

/**
 * 偵測一張圖「實際的背景色」——取邊緣最主要的顏色回傳 hex。
 * 用於去背前確定 chroma key 該扣哪個色（生成圖的底色由 AI 自選，不能假設是白）。
 * 偵測失敗（全透明邊緣 / 載入錯誤）時回傳 '#FFFFFF'。
 */
export const detectBackgroundColor = async (dataUrl: string): Promise<string> => {
  try {
    const { imageData, width, height } = await loadImageSnapshot(dataUrl);
    const colors = getDominantEdgeColors(imageData.data, width, height);
    if (colors.length === 0) return '#FFFFFF';
    const { r, g, b } = colors[0];
    return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('').toUpperCase();
  } catch {
    return '#FFFFFF';
  }
};

export const repairStickerTransparency = async (
  dataUrl: string,
  options: TransparencyRepairOptions = {},
): Promise<string> => {
  const { canvas, ctx, imageData, width, height } = await loadImageSnapshot(dataUrl);
  const { data } = imageData;

  if (hasUsableAlphaBackground(data, width, height)) {
    return dataUrl;
  }

  const candidates = getBackgroundCandidates(data, width, height, options);
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const edgePositions = getEdgePixelPositions(width, height);
  let head = 0;
  let tail = 0;

  const matchesBackground = (position: number) => {
    const idx = position * 4;
    if (data[idx + 3] <= 10) return true;
    return candidates.some(candidate => colorMatches(data, idx, candidate));
  };

  const enqueue = (position: number) => {
    if (visited[position] || !matchesBackground(position)) return;
    visited[position] = 1;
    queue[tail] = position;
    tail += 1;
  };

  edgePositions.forEach(enqueue);

  while (head < tail) {
    const position = queue[head];
    head += 1;
    const idx = position * 4;

    data[idx + 3] = 0;

    const x = position % width;
    const y = Math.floor(position / width);

    if (x > 0) enqueue(position - 1);
    if (x < width - 1) enqueue(position + 1);
    if (y > 0) enqueue(position - width);
    if (y < height - 1) enqueue(position + width);
  }

  // 去光暈：每輪削掉一圈「接近背景色 + 碰到透明」的殘邊（只削背景色，不啃白邊/主體）。
  const haloPasses = options.haloPasses ?? 2;
  for (let pass = 0; pass < haloPasses; pass += 1) {
    const toClear: number[] = [];
    for (let position = 0; position < width * height; position += 1) {
      const idx = position * 4;
      if (data[idx + 3] <= 10) continue;
      if (!candidates.some(candidate => colorMatches(data, idx, { ...candidate, tolerance: Math.max(12, candidate.tolerance - 18) }))) continue;

      const x = position % width;
      const y = Math.floor(position / width);
      const touchesTransparent =
        (x > 0 && data[(position - 1) * 4 + 3] <= 10) ||
        (x < width - 1 && data[(position + 1) * 4 + 3] <= 10) ||
        (y > 0 && data[(position - width) * 4 + 3] <= 10) ||
        (y < height - 1 && data[(position + width) * 4 + 3] <= 10);

      if (touchesTransparent) toClear.push(idx);
    }

    toClear.forEach((idx) => {
      data[idx + 3] = 0;
    });
  }

  // 幾何收縮：無條件往內削 erodePx 圈（不分顏色），清掉抗鋸齒/非背景色的殘邊。
  // 每輪先收集「碰到透明的不透明邊緣像素」再一次清掉（確保是 1px/輪，不串聯）。
  const erodePx = Math.max(0, Math.round(options.erodePx ?? 0));
  for (let pass = 0; pass < erodePx; pass += 1) {
    const toErode: number[] = [];
    for (let position = 0; position < width * height; position += 1) {
      const idx = position * 4;
      if (data[idx + 3] <= 10) continue;
      const x = position % width;
      const y = Math.floor(position / width);
      const touchesTransparent =
        (x > 0 && data[(position - 1) * 4 + 3] <= 10) ||
        (x < width - 1 && data[(position + 1) * 4 + 3] <= 10) ||
        (y > 0 && data[(position - width) * 4 + 3] <= 10) ||
        (y < height - 1 && data[(position + width) * 4 + 3] <= 10);
      if (touchesTransparent) toErode.push(idx);
    }
    toErode.forEach((idx) => { data[idx + 3] = 0; });
  }

  // 邊緣羽化（平滑化鋸齒）：僅當 featherRadius > 0 時執行
  const featherRadius = Math.max(0, Math.round(options.featherRadius ?? 0));
  if (featherRadius > 0) {
    const alpha = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      alpha[i] = data[i * 4 + 3] / 255.0;
    }

    // 水平方向 box blur
    const tempH = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0, cnt = 0;
        for (let dx = -featherRadius; dx <= featherRadius; dx++) {
          const nx = x + dx;
          if (nx >= 0 && nx < width) {
            sum += alpha[y * width + nx];
            cnt++;
          }
        }
        tempH[y * width + x] = sum / cnt;
      }
    }

    // 垂直方向 box blur
    const blurred = new Float32Array(width * height);
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let sum = 0, cnt = 0;
        for (let dy = -featherRadius; dy <= featherRadius; dy++) {
          const ny = y + dy;
          if (ny >= 0 && ny < height) {
            sum += tempH[ny * width + x];
            cnt++;
          }
        }
        blurred[y * width + x] = sum / cnt;
      }
    }

    // 透過高對比度處理（Feather + Contrast）使邊緣既平滑又銳利，消除階梯鋸齒
    // 對比度係數 3.5，對比中心 0.55 (微調以防邊緣外擴)
    const kContrast = 3.5;
    const kCenter = 0.55;
    for (let i = 0; i < width * height; i++) {
      if (alpha[i] === 0) {
        data[i * 4 + 3] = 0;
        continue;
      }
      const blurredVal = blurred[i];
      let v = (blurredVal - kCenter) * kContrast + 0.5;
      v = Math.max(0.0, Math.min(1.0, v));
      
      const finalAlpha = Math.min(alpha[i], v);
      data[i * 4 + 3] = Math.round(finalAlpha * 255.0);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
};

/**
 * 不透明背景「原地正規化」：把邊緣連通的背景區（含 AI 亂加的紙紋 / 影印髒污 / 漸層）
 * 直接重新塗成指定純色，主體不動。
 *
 * 為什麼不用「去背→補色」：分割式去背(BiRefNet/Gemini)分不清「模型加的淺色紋理」與
 * 「真正的主體」，會把髒污當主體留下 → 補白後髒污還在。這裡改用「邊緣 flood-fill +
 * 色距容差」的確定性演算法：從四邊往內灌，凡與目標色夠接近的連通像素一律塗成目標色。
 * 主體（深色字/彩色標誌）色距遠 → 不被波及；被主體包住的內部區塊也因非邊緣連通而受保護。
 *
 * @param targetHex 目標純色（如 '#ffffff' / '#000000'）
 * @param tolerance 每通道容差；越大越能吃掉髒污，但也越可能啃到與底色相近的主體邊緣
 */
export const flattenBackgroundToColor = async (
  dataUrl: string,
  targetHex: string,
  tolerance = 96,
): Promise<string> => {
  const { canvas, ctx, imageData, width, height } = await loadImageSnapshot(dataUrl);
  const { data } = imageData;

  const target = parseCssColor(targetHex) ?? { r: 255, g: 255, b: 255 };
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0, tail = 0;

  const isBg = (position: number) => {
    const idx = position * 4;
    return (
      Math.abs(data[idx]     - target.r) <= tolerance &&
      Math.abs(data[idx + 1] - target.g) <= tolerance &&
      Math.abs(data[idx + 2] - target.b) <= tolerance
    );
  };
  const enqueue = (position: number) => {
    if (visited[position] || !isBg(position)) return;
    visited[position] = 1;
    queue[tail++] = position;
  };

  getEdgePixelPositions(width, height).forEach(enqueue);

  while (head < tail) {
    const position = queue[head++];
    const idx = position * 4;
    data[idx] = target.r;
    data[idx + 1] = target.g;
    data[idx + 2] = target.b;
    data[idx + 3] = 255;

    const x = position % width;
    const y = (position - x) / width;
    if (x > 0) enqueue(position - 1);
    if (x < width - 1) enqueue(position + 1);
    if (y > 0) enqueue(position - width);
    if (y < height - 1) enqueue(position + width);
  }

  // 輸出為完全不透明（主體保留原色，背景已統一為目標純色）
  for (let position = 0; position < width * height; position += 1) {
    data[position * 4 + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
};

const findOpaqueComponents = (snapshot: CanvasSnapshot): ComponentBox[] => {
  const { imageData, width, height } = snapshot;
  const { data } = imageData;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const minArea = Math.max(48, Math.floor(width * height * 0.0002));
  const components: ComponentBox[] = [];

  const isOpaque = (position: number) => data[position * 4 + 3] > 50;

  for (let position = 0; position < width * height; position += 1) {
    if (visited[position] || !isOpaque(position)) continue;

    let head = 0;
    let tail = 0;
    let area = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    visited[position] = 1;
    queue[tail] = position;
    tail += 1;

    while (head < tail) {
      const current = queue[head];
      head += 1;

      const x = current % width;
      const y = Math.floor(current / width);
      area += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      const neighbors = [
        current - 1,
        current + 1,
        current - width,
        current + width,
        current - width - 1,
        current - width + 1,
        current + width - 1,
        current + width + 1,
      ];

      neighbors.forEach((neighbor) => {
        if (neighbor < 0 || neighbor >= width * height || visited[neighbor] || !isOpaque(neighbor)) return;

        const nx = neighbor % width;
        const ny = Math.floor(neighbor / width);
        if (Math.abs(nx - x) > 1 || Math.abs(ny - y) > 1) return;

        visited[neighbor] = 1;
        queue[tail] = neighbor;
        tail += 1;
      });
    }

    if (area >= minArea) {
      components.push({ minX, minY, maxX, maxY, area });
    }
  }

  return components;
};

const findOpaqueComponentsInRegion = (
  snapshot: CanvasSnapshot,
  region: Pick<ComponentBox, "minX" | "minY" | "maxX" | "maxY">,
): ComponentCluster[] => {
  const { imageData, width, height } = snapshot;
  const { data } = imageData;
  const minXBound = clamp(Math.round(region.minX), 0, width - 1);
  const maxXBound = clamp(Math.round(region.maxX), minXBound, width - 1);
  const minYBound = clamp(Math.round(region.minY), 0, height - 1);
  const maxYBound = clamp(Math.round(region.maxY), minYBound, height - 1);
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const minArea = Math.max(24, Math.floor((maxXBound - minXBound + 1) * (maxYBound - minYBound + 1) * 0.0003));
  const components: ComponentCluster[] = [];
  const isOpaque = (position: number) => data[position * 4 + 3] > 50;
  const isInsideRegion = (position: number) => {
    const x = position % width;
    const y = Math.floor(position / width);
    return x >= minXBound && x <= maxXBound && y >= minYBound && y <= maxYBound;
  };

  for (let y = minYBound; y <= maxYBound; y += 1) {
    for (let x = minXBound; x <= maxXBound; x += 1) {
      const position = y * width + x;
      if (visited[position] || !isOpaque(position)) continue;

      let head = 0;
      let tail = 0;
      let area = 0;
      let minX = width;
      let minY = height;
      let maxX = 0;
      let maxY = 0;
      const pixels: number[] = [];

      visited[position] = 1;
      queue[tail] = position;
      tail += 1;

      while (head < tail) {
        const current = queue[head];
        head += 1;

        const currentX = current % width;
        const currentY = Math.floor(current / width);
        area += 1;
        pixels.push(current);
        minX = Math.min(minX, currentX);
        minY = Math.min(minY, currentY);
        maxX = Math.max(maxX, currentX);
        maxY = Math.max(maxY, currentY);

        const neighbors = [
          current - 1,
          current + 1,
          current - width,
          current + width,
          current - width - 1,
          current - width + 1,
          current + width - 1,
          current + width + 1,
        ];

        neighbors.forEach((neighbor) => {
          if (
            neighbor < 0 ||
            neighbor >= width * height ||
            visited[neighbor] ||
            !isInsideRegion(neighbor) ||
            !isOpaque(neighbor)
          ) {
            return;
          }

          const nextX = neighbor % width;
          const nextY = Math.floor(neighbor / width);
          if (Math.abs(nextX - currentX) > 1 || Math.abs(nextY - currentY) > 1) return;

          visited[neighbor] = 1;
          queue[tail] = neighbor;
          tail += 1;
        });
      }

      if (area >= minArea) {
        components.push({ minX, minY, maxX, maxY, area, pixels });
      }
    }
  }

  return components;
};

const getDominantComponentInRegion = (
  snapshot: CanvasSnapshot,
  region: Pick<ComponentBox, "minX" | "minY" | "maxX" | "maxY">,
) => {
  const components = findOpaqueComponentsInRegion(snapshot, region);
  if (components.length === 0) return undefined;
  return components.sort((a, b) => b.area - a.area)[0];
};

const boxesOverlapWithGap = (a: ComponentBox, b: ComponentBox, gap: number) => (
  a.minX - gap <= b.maxX &&
  a.maxX + gap >= b.minX &&
  a.minY - gap <= b.maxY &&
  a.maxY + gap >= b.minY
);

const boxBBoxArea = (b: ComponentBox) => (b.maxX - b.minX + 1) * (b.maxY - b.minY + 1);

/**
 * 是否該合併兩個框。重點：boxesOverlapWithGap 只看「矩形邊界框」是否相近，
 * 但貼圖不是矩形——格狀排版裡兩張「沒相連、有乾淨透明縫」的貼圖，矩形框仍可能
 * 互相卡到而被誤併，導致元件數被壓低、退化成均勻網格硬切（4-4-1 之類版面會切歪缺漏）。
 * 因此這裡只允許：
 *   1) 小衛星（裝飾/碎件，面積 < 較大框 25%）就近併回主角；
 *   2) 兩個都夠大的框，必須矩形「大幅重疊」(>小框 60%) 才併（容錯：同一張被去背切開）。
 * 兩個都夠大、只是邊界框相鄰 → 視為兩張不同貼圖，不併。
 */
const shouldMergeBoxes = (a: ComponentBox, b: ComponentBox, gap: number): boolean => {
  if (!boxesOverlapWithGap(a, b, gap)) return false;
  const areaA = boxBBoxArea(a);
  const areaB = boxBBoxArea(b);
  const smaller = Math.min(areaA, areaB);
  const larger = Math.max(areaA, areaB);
  // 小衛星併進大主角
  if (larger > 0 && smaller / larger < 0.25) return true;
  // 兩框都夠大：只有矩形實際大幅重疊才算同一張（避免併掉相鄰的不同貼圖）
  const ox = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
  const oy = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
  if (ox > 0 && oy > 0 && smaller > 0 && (ox * oy) / smaller > 0.6) return true;
  return false;
};

const mergeBoxes = (boxes: ComponentBox[], gap: number) => {
  const merged = [...boxes];
  let changed = true;

  while (changed) {
    changed = false;

    for (let i = 0; i < merged.length; i += 1) {
      for (let j = i + 1; j < merged.length; j += 1) {
        if (!shouldMergeBoxes(merged[i], merged[j], gap)) continue;

        merged[i] = {
          minX: Math.min(merged[i].minX, merged[j].minX),
          minY: Math.min(merged[i].minY, merged[j].minY),
          maxX: Math.max(merged[i].maxX, merged[j].maxX),
          maxY: Math.max(merged[i].maxY, merged[j].maxY),
          area: merged[i].area + merged[j].area,
        };
        merged.splice(j, 1);
        changed = true;
        break;
      }

      if (changed) break;
    }
  }

  return merged;
};

const sortBoxesReadingOrder = (boxes: ComponentBox[]) => {
  const medianHeight = [...boxes]
    .map(box => box.maxY - box.minY + 1)
    .sort((a, b) => a - b)[Math.floor(boxes.length / 2)] || 1;
  const rowTolerance = Math.max(24, medianHeight * 0.45);

  return [...boxes].sort((a, b) => {
    const ay = (a.minY + a.maxY) / 2;
    const by = (b.minY + b.maxY) / 2;
    if (Math.abs(ay - by) <= rowTolerance) return a.minX - b.minX;
    return ay - by;
  });
};

const cropSnapshotToDataUrl = (snapshot: CanvasSnapshot, box: ImageCropBox) => {
  const x = clamp(Math.min(box.minX, box.maxX), 0, snapshot.width - 1);
  const y = clamp(Math.min(box.minY, box.maxY), 0, snapshot.height - 1);
  const right = clamp(Math.max(box.minX, box.maxX), x, snapshot.width - 1);
  const bottom = clamp(Math.max(box.minY, box.maxY), y, snapshot.height - 1);
  const width = Math.max(1, right - x + 1);
  const height = Math.max(1, bottom - y + 1);
  const output = document.createElement("canvas");
  const outputCtx = output.getContext("2d");

  output.width = width;
  output.height = height;

  if (!outputCtx) return snapshot.canvas.toDataURL("image/png");
  outputCtx.drawImage(snapshot.canvas, x, y, width, height, 0, 0, width, height);

  return output.toDataURL("image/png");
};

const normalizeCropBox = (
  snapshot: CanvasSnapshot,
  box: Pick<ComponentBox, "minX" | "minY" | "maxX" | "maxY">,
  padding = 0,
): ImageCropBox => ({
  minX: Math.round(clamp(box.minX - padding, 0, snapshot.width - 1)),
  minY: Math.round(clamp(box.minY - padding, 0, snapshot.height - 1)),
  maxX: Math.round(clamp(box.maxX + padding, 0, snapshot.width - 1)),
  maxY: Math.round(clamp(box.maxY + padding, 0, snapshot.height - 1)),
});

const cropSnapshotComponentToDataUrl = (
  snapshot: CanvasSnapshot,
  box: ImageCropBox,
  componentPixels: number[],
) => {
  const x = clamp(Math.min(box.minX, box.maxX), 0, snapshot.width - 1);
  const y = clamp(Math.min(box.minY, box.maxY), 0, snapshot.height - 1);
  const right = clamp(Math.max(box.minX, box.maxX), x, snapshot.width - 1);
  const bottom = clamp(Math.max(box.minY, box.maxY), y, snapshot.height - 1);
  const width = Math.max(1, right - x + 1);
  const height = Math.max(1, bottom - y + 1);
  const output = document.createElement("canvas");
  const outputCtx = output.getContext("2d", { willReadFrequently: true });

  output.width = width;
  output.height = height;

  if (!outputCtx) return cropSnapshotToDataUrl(snapshot, box);
  outputCtx.drawImage(snapshot.canvas, x, y, width, height, 0, 0, width, height);

  const outputImageData = outputCtx.getImageData(0, 0, width, height);
  const allowedPixels = new Uint8Array(width * height);

  componentPixels.forEach((position) => {
    const sourceX = position % snapshot.width;
    const sourceY = Math.floor(position / snapshot.width);
    if (sourceX < x || sourceX > right || sourceY < y || sourceY > bottom) return;
    allowedPixels[(sourceY - y) * width + (sourceX - x)] = 1;
  });

  for (let position = 0; position < width * height; position += 1) {
    if (allowedPixels[position]) continue;
    outputImageData.data[position * 4 + 3] = 0;
  }

  outputCtx.putImageData(outputImageData, 0, 0);
  return output.toDataURL("image/png");
};

const createSplitPiece = (snapshot: CanvasSnapshot, box: ComponentBox): SplitStickerPiece => {
  const dominantComponent = getDominantComponentInRegion(snapshot, box);
  const dominantBox = dominantComponent || box;
  const boxWidth = dominantBox.maxX - dominantBox.minX + 1;
  const boxHeight = dominantBox.maxY - dominantBox.minY + 1;
  const padding = Math.max(10, Math.round(Math.max(boxWidth, boxHeight) * 0.1));
  const cropBox = normalizeCropBox(snapshot, dominantBox, padding);

  return {
    dataUrl: dominantComponent
      ? cropSnapshotComponentToDataUrl(snapshot, cropBox, dominantComponent.pixels)
      : cropSnapshotToDataUrl(snapshot, cropBox),
    box: cropBox,
    sourceWidth: snapshot.width,
    sourceHeight: snapshot.height,
  };
};

const boxGap = (a: ComponentBox, b: ComponentBox) => {
  const horizontalGap = Math.max(0, Math.max(a.minX, b.minX) - Math.min(a.maxX, b.maxX));
  const verticalGap = Math.max(0, Math.max(a.minY, b.minY) - Math.min(a.maxY, b.maxY));
  return Math.hypot(horizontalGap, verticalGap);
};

const mergeClosestBoxesUntilCount = (boxes: ComponentBox[], targetCount: number) => {
  const merged = [...boxes];

  while (merged.length > targetCount) {
    let bestA = 0;
    let bestB = 1;
    let bestGap = Number.POSITIVE_INFINITY;

    for (let i = 0; i < merged.length; i += 1) {
      for (let j = i + 1; j < merged.length; j += 1) {
        const gap = boxGap(merged[i], merged[j]);
        if (gap < bestGap) {
          bestGap = gap;
          bestA = i;
          bestB = j;
        }
      }
    }

    merged[bestA] = {
      minX: Math.min(merged[bestA].minX, merged[bestB].minX),
      minY: Math.min(merged[bestA].minY, merged[bestB].minY),
      maxX: Math.max(merged[bestA].maxX, merged[bestB].maxX),
      maxY: Math.max(merged[bestA].maxY, merged[bestB].maxY),
      area: merged[bestA].area + merged[bestB].area,
    };
    merged.splice(bestB, 1);
  }

  return merged;
};

const getOpaqueBoundsInRegion = (
  snapshot: CanvasSnapshot,
  region: Pick<ComponentBox, "minX" | "minY" | "maxX" | "maxY">,
): ComponentBox | undefined => {
  const { data } = snapshot.imageData;
  let minX = snapshot.width;
  let minY = snapshot.height;
  let maxX = 0;
  let maxY = 0;
  let area = 0;

  for (let y = region.minY; y <= region.maxY; y += 1) {
    for (let x = region.minX; x <= region.maxX; x += 1) {
      const idx = (y * snapshot.width + x) * 4;
      if (data[idx + 3] <= 50) continue;

      area += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (area === 0) return undefined;
  return { minX, minY, maxX, maxY, area };
};

const getAlphaProjections = (snapshot: CanvasSnapshot) => {
  const { data } = snapshot.imageData;
  const columns = new Uint32Array(snapshot.width);
  const rows = new Uint32Array(snapshot.height);

  for (let y = 0; y < snapshot.height; y += 1) {
    for (let x = 0; x < snapshot.width; x += 1) {
      const alpha = data[(y * snapshot.width + x) * 4 + 3];
      if (alpha <= 50) continue;
      columns[x] += 1;
      rows[y] += 1;
    }
  }

  return { columns, rows };
};

const findTransparentValley = (
  projection: Uint32Array,
  approximateBoundary: number,
  searchRadius: number,
) => {
  const start = clamp(Math.round(approximateBoundary - searchRadius), 1, projection.length - 2);
  const end = clamp(Math.round(approximateBoundary + searchRadius), start, projection.length - 2);
  const windowRadius = Math.max(2, Math.round(projection.length * 0.004));
  let bestIndex = start;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let index = start; index <= end; index += 1) {
    let score = 0;
    for (
      let sample = Math.max(0, index - windowRadius);
      sample <= Math.min(projection.length - 1, index + windowRadius);
      sample += 1
    ) {
      score += projection[sample];
    }

    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestIndex;
};

const splitByTransparentGutters = (snapshot: CanvasSnapshot, expectedCount: number) => {
  const count = Math.max(2, Math.min(36, expectedCount));
  const imageAspectRatio = snapshot.width / snapshot.height;

  let columns = Math.ceil(Math.sqrt(count));
  let rows = Math.ceil(count / columns);

  // Dynamic grid layout estimation based on image aspect ratio
  if (imageAspectRatio >= 2.2) {
    // Single row layout (e.g. 1x3, 1x5)
    rows = 1;
    columns = count;
  } else if (imageAspectRatio <= 0.45) {
    // Single column layout
    columns = 1;
    rows = count;
  } else {
    // Search for the grid dimensions (R x C) that best match the image aspect ratio
    let bestDiff = Number.POSITIVE_INFINITY;
    for (let r = 1; r <= count; r++) {
      const c = Math.ceil(count / r);
      if (r * c > count * 2) continue; // Exclude grid sizes that are excessively empty
      
      const gridAspectRatio = c / r;
      const diff = Math.abs(gridAspectRatio - imageAspectRatio);
      if (diff < bestDiff) {
        bestDiff = diff;
        rows = r;
        columns = c;
      }
    }
  }

  const { columns: columnProjection, rows: rowProjection } = getAlphaProjections(snapshot);
  const xBoundaries = [0];
  const yBoundaries = [0];

  for (let column = 1; column < columns; column += 1) {
    const approximate = (snapshot.width * column) / columns;
    xBoundaries.push(findTransparentValley(columnProjection, approximate, snapshot.width / columns * 0.42));
  }
  xBoundaries.push(snapshot.width - 1);

  for (let row = 1; row < rows; row += 1) {
    const approximate = (snapshot.height * row) / rows;
    yBoundaries.push(findTransparentValley(rowProjection, approximate, snapshot.height / rows * 0.42));
  }
  yBoundaries.push(snapshot.height - 1);

  const minArea = Math.max(256, snapshot.width * snapshot.height * 0.001);
  const boxes: ComponentBox[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (boxes.length >= count) break;

      const region = {
        minX: xBoundaries[column],
        maxX: xBoundaries[column + 1],
        minY: yBoundaries[row],
        maxY: yBoundaries[row + 1],
      };
      const box = getOpaqueBoundsInRegion(snapshot, region);

      if (box && box.area >= minArea) {
        boxes.push(box);
      }
    }
  }

  return boxes;
};

export const splitStickerCollectionDetailed = async (
  dataUrl: string,
  options: SplitStickerCollectionOptions = {},
): Promise<SplitStickerCollectionResult> => {
  const repairedDataUrl = await repairStickerTransparency(dataUrl, options);
  const snapshot = await loadImageSnapshot(repairedDataUrl);
  const expectedCount = options.expectedCount ? Math.max(2, Math.min(36, options.expectedCount)) : undefined;
  const imageArea = snapshot.width * snapshot.height;
  const mergeGap = Math.max(8, Math.min(16, Math.round(Math.min(snapshot.width, snapshot.height) * 0.012)));
  const minBoxArea = Math.max(256, imageArea * 0.0012);
  const componentBoxes = mergeBoxes(findOpaqueComponents(snapshot), mergeGap)
    .filter(box => (box.maxX - box.minX + 1) * (box.maxY - box.minY + 1) >= minBoxArea);

  // 指定張數模式專用：用「幾乎不過濾」的元件清單（只濾掉極小噪點）。
  // minBoxArea 那層過濾會把貼圖周邊的小裝飾（櫻花、盾牌、徽章…）當噪點丟掉，
  // 導致剛好剩主角數量、拆完小物件不見；這裡保留它們，再靠 merge 併進最近的主角。
  const noiseFloor = Math.max(64, imageArea * 0.00006);
  const allComponentBoxes = mergeBoxes(findOpaqueComponents(snapshot), mergeGap)
    .filter(box => (box.maxX - box.minX + 1) * (box.maxY - box.minY + 1) >= noiseFloor);

  // 計算透明像素佔比 (alpha <= 50)
  const totalPixels = snapshot.width * snapshot.height;
  const data = snapshot.imageData.data;
  let transparentPixels = 0;
  for (let i = 0; i < totalPixels; i += 1) {
    if (data[i * 4 + 3] <= 50) {
      transparentPixels += 1;
    }
  }
  const transparentRatio = transparentPixels / totalPixels;

  let boxes: ComponentBox[];
  if (expectedCount) {
    // 用「含小裝飾」的元件清單：與排列方式無關 → 奇數（3、5…）或非均勻排版都能正確切；
    // 且周邊小物件不會被濾掉，會在 merge 階段併進最近的主角，不會消失。
    if (allComponentBoxes.length === expectedCount) {
      boxes = allComponentBoxes;
    } else if (allComponentBoxes.length > expectedCount) {
      // 元件數多於張數（主角 + 分離的小裝飾）→ 合併最接近的，把小裝飾併入最近的主角
      boxes = mergeClosestBoxesUntilCount(allComponentBoxes, expectedCount);
    } else {
      // 元件偵測過少（貼圖彼此相連而被視為一塊）→ 退回方格切割
      boxes = splitByTransparentGutters(snapshot, expectedCount);
      if (boxes.length === 0) boxes = allComponentBoxes;
      if (boxes.length > expectedCount) boxes = mergeClosestBoxesUntilCount(boxes, expectedCount);
    }
  } else {
    boxes = componentBoxes;
  }

  // 只有在具備基本透明度（透明像素大於 5%）時才進行自動偵測或降級切割，避免誤切一般相片
  if (!expectedCount) {
    if (transparentRatio < 0.05) {
      boxes = []; // 自動偵測下，如果是複雜背景的一般相片，直接拒絕拆分
    } else if (boxes.length <= 1) {
      const gutterBoxes = splitByTransparentGutters(snapshot, 6);
      if (gutterBoxes.length > boxes.length) boxes = gutterBoxes;
    }
  }

  return {
    sourceDataUrl: repairedDataUrl,
    pieces: sortBoxesReadingOrder(boxes).map((box) => createSplitPiece(snapshot, box)),
    transparentRatio,
  };
};

export const splitStickerCollectionByGridDetailed = async (
  dataUrl: string,
  options: GridSplitStickerCollectionOptions,
): Promise<SplitStickerCollectionResult> => {
  const repairedDataUrl = await repairStickerTransparency(dataUrl, options);
  const snapshot = await loadImageSnapshot(repairedDataUrl);
  const rows = Math.max(1, Math.min(6, Math.round(options.rows || 1)));
  const columns = Math.max(1, Math.min(6, Math.round(options.columns || 1)));
  const minArea = Math.max(96, (snapshot.width * snapshot.height) / (rows * columns) * 0.004);
  const boxes: ComponentBox[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const minX = Math.round((snapshot.width * column) / columns);
      const maxX = Math.round((snapshot.width * (column + 1)) / columns) - 1;
      const minY = Math.round((snapshot.height * row) / rows);
      const maxY = Math.round((snapshot.height * (row + 1)) / rows) - 1;
      const box = getOpaqueBoundsInRegion(snapshot, {
        minX: clamp(minX, 0, snapshot.width - 1),
        minY: clamp(minY, 0, snapshot.height - 1),
        maxX: clamp(maxX, 0, snapshot.width - 1),
        maxY: clamp(maxY, 0, snapshot.height - 1),
      });

      if (box && box.area >= minArea) {
        boxes.push(box);
      }
    }
  }

  return {
    sourceDataUrl: repairedDataUrl,
    pieces: boxes.map((box) => createSplitPiece(snapshot, box)),
  };
};

export const splitStickerCollection = async (
  dataUrl: string,
  options: SplitStickerCollectionOptions = {},
): Promise<string[]> => {
  const result = await splitStickerCollectionDetailed(dataUrl, options);
  return result.pieces.map((piece) => piece.dataUrl);
};

// ============================================================
// Original Image Processing Utilities (Restored for ImageEditModal)
// ============================================================

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
    // 保留原圖 alpha，不可寫死 255。
    // 原因：LaMa/MI-GAN 只吃 RGB、輸出一律不透明；若這裡再強制 alpha=255，
    // 透明 PNG（貼圖/icon）的整片透明背景會被灌成純黑實心。
    // 遮罩外維持原圖透明度；遮罩內原本不透明的物件區其 alpha 本就是 255，填補結果照常顯示。
    finalData.data[i + 3] = origData.data[i + 3];
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
