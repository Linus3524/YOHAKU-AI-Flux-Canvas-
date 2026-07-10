// 節點圖執行引擎（純 TS，不碰 React）。
// #3 階段 A：線性鏈 + 本機去背。重用 src/ai/pipelines/* 現成函式，不重寫 AI 邏輯。
// 中間結果只在本函式回傳的 Map（記憶體），呼叫端不得寫進 graph 存檔。
import type { GraphNode, GraphEdge, NodeGraphData, NodeRunStatus, BrandKitParams, CameraAngleParams, CopyStyleParams, CrossPlatformParams, ImageGenParams, NodeKind, OutpaintParams, ProductMarketingParams, PromptOptimizeParams, RemoveBgParams, UpscaleParams } from '../types';
import type { Part } from '@google/genai';
import type { ImageElement, OutpaintingState } from '../../../types';
import { runLocalRmbgPipeline, runLocalUpscalePipeline, checkLocalModelReady } from '../../../ai/pipelines/localModels';
import { geminiGenerateImage, atlasBatch } from '../../../ai/pipelines/generate';
import { callAtlasInpaint } from '../../../utils/atlasImage';
import { runExtendBrandKitPipeline } from '../../../ai/pipelines/brandKit';
import { runCrossPlatformPipeline } from '../../../ai/pipelines/crossPlatform';
import { runProductMarketingPipeline } from '../../../ai/pipelines/productMarketing';
import { analyzeImageStyleFull, optimizePromptWithAI } from '../../../ai/pipelines/analysis';
import { generateOutpaintingPrompt } from '../../../ai/pipelines/outpainting';
import { analyzeCopiedStyle, buildCameraAnglePrompt, buildCopiedStylePrompt, buildPresetStylePrompt, generateCopiedStyleAssets, generateStyledImage } from '../../../ai/pipelines/styleTransfer';
import type { AtlasGenerationModel } from '../../../utils/atlasImage';
import { atlasModelSupportsImg2Img } from '../../../utils/atlasImage';
import { birefnetRemoveBg, geminiLayerSegment } from '../../../utils/geminiLayer';
import { executeDynamicRemoval } from '../../../utils/DynamicBackgroundRemoval';
import { createGeminiClient } from '../../../ai/geminiClient';
import { getVisualStyleById } from '../../../skills/styles';
import { loadImage, STYLE_PRESETS } from '../../../utils/helpers';
import { applyPoissonBlend } from '../../../utils/poissonBlend';
import { LOGO_BRAND_OUTPUTS, LOGO_DEFAULT_CONFIG } from '../../../skills/logo';
import { CROSS_PLATFORM_SPECS } from '../../../skills/crossPlatform';
import { PRODUCT_MARKETING_DEFAULT_CONFIG, PRODUCT_MARKETING_PLATFORMS } from '../../../skills/marketing';
import { isImageSrc } from '../mediaSrc';
import { nodeRequiresUpstream } from '../nodeRegistry';

const ATLAS_MODELS = ['seedream-v5-pro', 'seedream-v5', 'seedream-v4.5', 'gpt-image-2', 'flux-2-pro', 'qwen-image-2'];
const STYLE_PRESET_BY_KEY: Record<string, string> = {
  pixel: 'Pixel Art 8-bit / 16-bit',
  watercolor: 'Watercolor Bleed',
  anime: 'Japanese Anime Style',
  cyberpunk: 'Cyberpunk',
  clay: 'Claymation',
};
const UPSCALE_MODEL_KEYS: UpscaleParams['modelKey'][] = ['upscale_photo', 'upscale_anime', 'upscale_art'];
const COPY_STYLE_KEYS = ['color', 'lighting', 'artStyle', 'composition', 'texture', 'background'];
const OUTPAINT_DIRECTIONS: Record<OutpaintParams['direction'], string> = {
  all: 'extend the image outward on all sides',
  left: 'extend the image to the left side',
  right: 'extend the image to the right side',
  top: 'extend the image upward',
  bottom: 'extend the image downward',
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '執行失敗';
}

const isImageValue = (src: string): boolean => isImageSrc(src);

function resolveImageEngine(
  params: { model?: string; imageSize?: '1K' | '2K' | '4K' },
  engine: ExecutorEngine,
) {
  const model = params.model || 'gemini';
  if (ATLAS_MODELS.includes(model)) {
    if (!engine.atlasApiKey) throw new Error('此資產節點需要 Atlas API Key');
    return {
      model,
      atlasApiKey: engine.atlasApiKey,
      geminiApiKey: engine.geminiApiKey,
      geminiImageModel: engine.geminiImageModel,
      imageSize: params.imageSize ?? '1K',
    };
  }
  if (!engine.geminiApiKey) throw new Error('此資產節點需要 Gemini API Key');
  return {
    model: 'gemini',
    geminiApiKey: engine.geminiApiKey,
    geminiImageModel: engine.geminiImageModel || 'gemini-3.1-flash-image-preview',
    imageSize: params.imageSize ?? '1K',
  };
}

/** imageGen 節點：便利貼文字→提示詞、上游圖→參考圖，呼叫既有生圖 pipeline（Gemini / Atlas）。 */
async function runImageGen(
  params: Partial<ImageGenParams>,
  upstreams: string[],
  engine: ExecutorEngine,
): Promise<string> {
  const refImages = upstreams.filter(src => isImageSrc(src));
  const textInputs: string[] = upstreams.filter(src => !isImageSrc(src));
  const upstreamPrompt = textInputs.map(src => src.trim()).filter(Boolean).join('\n');
  const prompt = [upstreamPrompt, params.prompt].map(part => part?.trim()).filter(Boolean).join('\n\n');
  if (!prompt) throw new Error('生圖節點需要提示詞（便利貼文字或節點輸入框）');
  const aspectRatio = params.aspectRatio || '1:1';
  const model = params.model || 'gemini';

  if (ATLAS_MODELS.includes(model)) {
    if (!engine.atlasApiKey) throw new Error('此模型需要 Atlas API Key');
    // Atlas img2img 目前只接單張參考圖；多輸入時取第一張，Gemini 路徑可吃多張。
    const out = await atlasBatch(
      { prompt, ratio: aspectRatio, count: 1, refImage: refImages[0] },
      { model: model as AtlasGenerationModel, apiKey: engine.atlasApiKey },
    );
    if (!out[0]) throw new Error('生圖沒有回傳圖片');
    return out[0];
  }

  // Gemini 路徑
  if (!engine.geminiApiKey) throw new Error('生圖需要 Gemini API Key');
  const parts: Part[] = [];
  for (const refImage of refImages) {
    const [header, data] = refImage.split(',');
    const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
    parts.push({ inlineData: { data, mimeType } });
  }
  parts.push({ text: prompt });
  const src = await geminiGenerateImage(
    { parts, aspectRatio, imageSize: engine.imageSize || '1K' },
    { apiKey: engine.geminiApiKey, model: engine.geminiImageModel || 'gemini-3.1-flash-image-preview' },
  );
  if (!src) throw new Error('生圖沒有回傳圖片');
  return src;
}

async function runStyleTransfer(
  styleKey: string | undefined,
  upstream: string,
  engine: ExecutorEngine,
): Promise<string> {
  if (!styleKey || styleKey === 'none') return upstream;
  if (!isImageSrc(upstream)) throw new Error('風格轉換節點需要上游圖片');
  const useAtlas = !!engine.atlasApiKey
    && !!engine.generationModel
    && engine.generationModel !== 'gemini'
    && atlasModelSupportsImg2Img(engine.generationModel as AtlasGenerationModel);
  if (!useAtlas && !engine.geminiApiKey) throw new Error('風格轉換需要 Gemini 或 Atlas API Key');

  // 優先用大畫布風格藝術庫（STYLE_PRESETS）中對標的風格 prompt；
  // 找不到才 fallback 舊的內建 5 種 key。
  const preset = STYLE_PRESETS.find(s => s.id === styleKey || s.label === styleKey);
  const stylePrompt = preset
    ? preset.prompt
    : buildPresetStylePrompt(STYLE_PRESET_BY_KEY[styleKey] ?? styleKey);
  const src = await generateStyledImage(
    {
      srcImage: upstream,
      stylePrompt,
      preserveTransparency: engine.preserveTransparency ?? false,
      transparencyKeys: {
        geminiApiKey: engine.geminiApiKey,
        imageModel: engine.geminiImageModel,
      },
    },
    {
      model: useAtlas ? engine.generationModel! : 'gemini',
      geminiApiKey: engine.geminiApiKey,
      atlasApiKey: useAtlas ? engine.atlasApiKey : undefined,
      geminiImageModel: engine.geminiImageModel || 'gemini-3.1-flash-image-preview',
      imageSize: engine.imageSize || '1K',
    },
  );
  if (!src) throw new Error('風格轉換沒有回傳圖片');
  return src;
}

async function runCameraAngle(
  params: Partial<CameraAngleParams>,
  input: string,
  engine: ExecutorEngine,
): Promise<string> {
  if (!isImageSrc(input)) throw new Error('視角轉換節點需要上游圖片');
  if (!engine.geminiApiKey && !engine.atlasApiKey) throw new Error('視角轉換需要 Gemini 或 Atlas API Key');

  const target = params.anglePrompt?.trim() || 'straight-on front view, eye-level, facing camera directly';
  // 節點若指定模型就用它，否則跟隨全域生成模型設定。
  const atlasModel = params.model || engine.generationModel;
  const useAtlas = !!engine.atlasApiKey
    && !!atlasModel
    && atlasModel !== 'gemini'
    && atlasModelSupportsImg2Img(atlasModel as AtlasGenerationModel);
  const result = await generateStyledImage(
    {
      srcImage: input,
      stylePrompt: (flatSrc) => buildCameraAnglePrompt(target, flatSrc),
      preserveTransparency: engine.preserveTransparency ?? false,
      transparencyKeys: {
        falApiKey: engine.falApiKey,
        geminiApiKey: engine.geminiApiKey,
        imageModel: engine.geminiImageModel,
      },
      atlasRatio: engine.imageAspectRatio || 'Original',
      omitImageConfig: true,
    },
    {
      model: useAtlas ? atlasModel as AtlasGenerationModel : 'gemini',
      geminiApiKey: engine.geminiApiKey ?? undefined,
      atlasApiKey: useAtlas ? engine.atlasApiKey : undefined,
      geminiImageModel: engine.geminiImageModel || 'gemini-3.1-flash-image-preview',
      imageSize: engine.imageSize || '1K',
    },
  );
  if (!result) throw new Error('視角轉換沒有回傳圖片');
  return result;
}

async function runRemoveBg(
  params: Partial<RemoveBgParams>,
  input: string,
  engine: ExecutorEngine,
  onFallback?: (message: string) => void,
): Promise<string> {
  const mode = params.mode ?? 'local';

  // 智慧去背：Gemini 動態去背（對標主畫布 executeDynamicRemoval）。
  if (mode === 'smart') {
    if (engine.geminiApiKey) {
      const genAI = createGeminiClient(engine.geminiApiKey);
      return await executeDynamicRemoval(input, genAI, onFallback, engine.geminiImageModel);
    }
    onFallback?.('缺少 Gemini API Key，暫時改用本機去背');
  }

  // 雲端去背：fal.ai BiRefNet v2（重用既有 pipeline，不重寫）。可選 6 種模型。
  if (mode === 'cloud') {
    if (engine.falApiKey) {
      return await birefnetRemoveBg(input, engine.falApiKey, params.cloudModel ?? 'Matting');
    }
    onFallback?.('缺少 fal.ai API Key，暫時改用本機去背');
  }

  const notReady = await checkLocalModelReady('bria_rmbg');
  if (notReady) throw new Error(notReady);
  return await runLocalRmbgPipeline(input);
}

async function runUpscale(
  params: Partial<UpscaleParams>,
  input: string,
  engine: ExecutorEngine,
  onProgress?: (message: string) => void,
): Promise<string> {
  const factor = params.factor === 4 ? 4 : 2;

  // 智能放大：Gemini/Atlas 生成式放大（對標主畫布 handleAIUpscale，用 generateStyledImage）。
  if (params.mode === 'smart') {
    if (!isImageSrc(input)) throw new Error('智能放大需要上游圖片');
    const useAtlas = !!engine.atlasApiKey
      && !!engine.generationModel
      && engine.generationModel !== 'gemini'
      && atlasModelSupportsImg2Img(engine.generationModel as AtlasGenerationModel);
    if (!useAtlas && !engine.geminiApiKey) throw new Error('智能放大需要 Gemini 或 Atlas API Key');
    const requestedResolution = factor >= 4 ? '4K' : '2K';
    const prompt = `Task: High-fidelity image upscaling.
Action: Upscale the image by ${factor}x.
CRITICAL INSTRUCTION: Maintain the EXACT aspect ratio and geometry of the original subject content.
Do NOT stretch, squeeze, or distort the image content to fit the aspect ratio container.
If the container ratio differs slightly, extend the background naturally instead of distorting the subject.
Enhance details and sharpness significantly while keeping the structure identical.`;
    onProgress?.(`智能放大中（目標 ${requestedResolution}）`);
    const src = await generateStyledImage(
      {
        srcImage: input,
        stylePrompt: prompt,
        preserveTransparency: engine.preserveTransparency ?? false,
        transparencyKeys: { falApiKey: engine.falApiKey, geminiApiKey: engine.geminiApiKey, imageModel: engine.geminiImageModel },
      },
      {
        model: useAtlas ? engine.generationModel! : 'gemini',
        geminiApiKey: engine.geminiApiKey,
        atlasApiKey: useAtlas ? engine.atlasApiKey : undefined,
        geminiImageModel: engine.geminiImageModel || 'gemini-3.1-flash-image-preview',
        imageSize: requestedResolution,
      },
    );
    if (!src) throw new Error('智能放大沒有回傳圖片');
    return src;
  }

  // 本機 ONNX 高清放大。
  const modelKey = UPSCALE_MODEL_KEYS.includes(params.modelKey as UpscaleParams['modelKey'])
    ? params.modelKey as UpscaleParams['modelKey']
    : 'upscale_photo';
  const notReady = await checkLocalModelReady(modelKey);
  if (notReady) throw new Error(notReady);
  return await runLocalUpscalePipeline(input, modelKey, factor, pct => onProgress?.(`放大中 ${pct}%`));
}

async function runPromptOptimize(
  params: Partial<PromptOptimizeParams>,
  inputs: string[],
  engine: ExecutorEngine,
): Promise<string> {
  const upstreamPrompt = inputs
    .filter(src => !isImageValue(src))
    .map(src => src.trim())
    .filter(Boolean)
    .join('\n');
  const prompt = [upstreamPrompt, params.prompt].map(part => part?.trim()).filter(Boolean).join('\n\n');
  if (!prompt) throw new Error('提示詞優化節點需要文字輸入');
  if (!engine.geminiApiKey) throw new Error('提示詞優化需要 Gemini API Key');
  const optimized = await optimizePromptWithAI(prompt, engine.geminiApiKey);
  if (!optimized) throw new Error('提示詞優化沒有回傳文字');
  return optimized;
}

const ANALYSIS_LABELS: Record<string, string> = {
  color: '色彩',
  lighting: '光影',
  artStyle: '畫風',
  composition: '構圖',
  texture: '材質',
  pose: '姿勢',
  expression: '表情',
  clothing: '服裝',
  background: '背景',
  hair: '髮型',
  typography: '字體',
};

function formatStyleAnalysis(analysis: Record<string, string>): string {
  return Object.entries(ANALYSIS_LABELS)
    .map(([key, label]) => {
      const value = analysis[key]?.trim();
      return value ? `${label}: ${value}` : '';
    })
    .filter(Boolean)
    .join('\n');
}

function createOutpaintingStateForPrompt(input: string): OutpaintingState {
  const element: ImageElement = {
    id: 'node-outpaint-source',
    type: 'image',
    src: input,
    position: { x: 0, y: 0 },
    width: 1,
    height: 1,
    rotation: 0,
    zIndex: 0,
    isVisible: true,
    isLocked: false,
    name: 'Node outpaint source',
    groupId: null,
  };
  return {
    element,
    frame: { position: { x: 0, y: 0 }, width: 1, height: 1 },
  };
}

function createImageElementForPipeline(src: string, name: string): ImageElement {
  return {
    id: `node-${name}`,
    type: 'image',
    src,
    position: { x: 0, y: 0 },
    width: 1,
    height: 1,
    rotation: 0,
    zIndex: 0,
    isVisible: true,
    isLocked: false,
    name,
    groupId: null,
  };
}

async function runAnalyze(
  input: string,
  engine: ExecutorEngine,
): Promise<string> {
  if (!isImageSrc(input)) throw new Error('圖片分析節點需要上游圖片');
  if (!engine.geminiApiKey) throw new Error('圖片分析需要 Gemini API Key');
  const analysis = await analyzeImageStyleFull(input, engine.geminiApiKey);
  const text = formatStyleAnalysis(analysis);
  if (!text) throw new Error('圖片分析沒有回傳文字');
  return text;
}

async function runOutpaint(
  params: Partial<OutpaintParams>,
  input: string,
  engine: ExecutorEngine,
  onProgress?: (message: string) => void,
): Promise<string> {
  if (!isImageSrc(input)) throw new Error('外擴節點需要上游圖片');
  const model = params.model ?? 'gemini';
  if (model === 'gpt' && !engine.atlasApiKey) throw new Error('GPT 擴圖需要 Atlas Cloud API Key');
  if (model === 'gemini' && !engine.geminiApiKey) throw new Error('外擴需要 Gemini API Key');

  // 解析多選方向（向下相容單選 params.direction）
  const activeDirs = Array.isArray(params.directions) ? params.directions : [params.direction || 'all'];
  const hasLeft = activeDirs.includes('left') || activeDirs.includes('all');
  const hasRight = activeDirs.includes('right') || activeDirs.includes('all');
  const hasTop = activeDirs.includes('top') || activeDirs.includes('all');
  const hasBottom = activeDirs.includes('bottom') || activeDirs.includes('all');
  const hasAll = activeDirs.includes('all');

  const dirWords: string[] = [];
  if (hasAll || (hasLeft && hasRight && hasTop && hasBottom)) {
    dirWords.push('all sides');
  } else {
    if (hasLeft) dirWords.push('left side');
    if (hasRight) dirWords.push('right side');
    if (hasTop) dirWords.push('top side');
    if (hasBottom) dirWords.push('bottom side');
  }
  const dirDesc = dirWords.length > 0 ? `outpaint ${dirWords.join(', ')}` : 'outpaint all sides';

  const aspectRatio = params.aspectRatio ?? '1:1';
  onProgress?.('分析外擴提示詞中');
  const autoPrompt = await generateOutpaintingPrompt(createOutpaintingStateForPrompt(input), engine.geminiApiKey);
  const prompt = [
    `Use the attached image as the visual source and ${dirDesc}. Preserve the original subject, lighting, perspective, palette, texture, and style while creating a seamless expanded composition.`,
    autoPrompt,
    params.prompt?.trim(),
  ].filter(Boolean).join('\n\n');

  const img = await loadImage(input);
  const sourceW = img.naturalWidth;
  const sourceH = img.naturalHeight;

  let canvasW = sourceW;
  let canvasH = sourceH;
  let drawW = sourceW;
  let drawH = sourceH;
  let imageX = 0;
  let imageY = 0;

  if (aspectRatio === 'custom') {
    // 自訂像素外擴 (微調)
    const offset = typeof params.pixelOffset === 'number' ? params.pixelOffset : 256;
    const padLeft = hasLeft ? offset : 0;
    const padRight = hasRight ? offset : 0;
    const padTop = hasTop ? offset : 0;
    const padBottom = hasBottom ? offset : 0;

    canvasW = sourceW + padLeft + padRight;
    canvasH = sourceH + padTop + padBottom;
    imageX = padLeft;
    imageY = padTop;
  } else {
    // 預設比例外擴
    const ratio = Number(aspectRatio.split(':')[0]) / Number(aspectRatio.split(':')[1]);
    canvasW = Math.max(sourceW, Math.round(sourceH * ratio));
    canvasH = Math.max(sourceH, Math.round(sourceW / ratio));
    const cap = Math.min(1, 2048 / Math.max(canvasW, canvasH));
    canvasW = Math.max(1, Math.round(canvasW * cap));
    canvasH = Math.max(1, Math.round(canvasH * cap));
    const scale = Math.min(canvasW / sourceW, canvasH / sourceH);
    drawW = Math.round(sourceW * scale);
    drawH = Math.round(sourceH * scale);
    const gapX = canvasW - drawW;
    const gapY = canvasH - drawH;

    // 根據多選方向分配空白與對齊
    imageX = Math.round(gapX / 2); // 預設居中
    if (hasLeft && !hasRight) {
      imageX = gapX;
    } else if (hasRight && !hasLeft) {
      imageX = 0;
    }

    imageY = Math.round(gapY / 2); // 預設居中
    if (hasTop && !hasBottom) {
      imageY = gapY;
    } else if (hasBottom && !hasTop) {
      imageY = 0;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = canvasW; canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context failed');
  ctx.drawImage(img, imageX, imageY, drawW, drawH);
  const composite = canvas.toDataURL('image/png');

  const mask = document.createElement('canvas');
  mask.width = canvasW; mask.height = canvasH;
  const maskCtx = mask.getContext('2d');
  if (!maskCtx) throw new Error('Mask context failed');
  maskCtx.fillStyle = '#ffffff';
  maskCtx.fillRect(0, 0, canvasW, canvasH);
  maskCtx.fillStyle = '#000000';
  maskCtx.fillRect(imageX, imageY, drawW, drawH);
  const maskSrc = mask.toDataURL('image/png');

  let generated = '';
  if (model === 'gpt') {
    generated = await callAtlasInpaint(prompt, composite, maskSrc, engine.atlasApiKey!, undefined, undefined, undefined, `${canvasW}x${canvasH}`);
  } else {
    const [header, data] = composite.split(',');
    const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
    generated = await geminiGenerateImage(
      {
        parts: [
          { inlineData: { data, mimeType } },
          { text: `The semi-transparent red area marks empty space to fill. Keep the existing (non-red) area pixel-for-pixel UNCHANGED — do not redraw, stretch, recolor, zoom, or shift it. Only paint into the red area, seamlessly extending the scene with matching lighting, perspective and style. ${prompt}` },
        ],
        aspectRatio,
        imageSize: '4K',
      },
      { apiKey: engine.geminiApiKey, model: engine.geminiImageModel || 'gemini-3.1-flash-image-preview' },
    ) || '';
  }
  if (!generated) throw new Error('外擴沒有回傳圖片');
  try {
    return await applyPoissonBlend(input, generated, {
      originalPosition: { x: imageX, y: imageY },
      originalWidth: drawW,
      originalHeight: drawH,
      canvasWidth: canvasW,
      canvasHeight: canvasH,
    });
  } catch {
    return generated;
  }
}

async function runCopyStyle(
  params: Partial<CopyStyleParams>,
  inputs: string[],
  inputsByHandle: Record<string, string[]>,
  engine: ExecutorEngine,
): Promise<string> {
  if (!engine.geminiApiKey) throw new Error('拷貝風格需要 Gemini API Key');
  const images = inputs.filter(isImageValue);
  const styleSrc = inputsByHandle.style?.find(isImageValue) ?? images[0];
  const contentSrc = inputsByHandle.content?.find(isImageValue) ?? images.find(src => src !== styleSrc);
  if (!styleSrc) throw new Error('拷貝風格需要連接「風格圖」');
  if (!contentSrc) throw new Error('拷貝風格需要連接「內容圖」');
  const selectedKeys = Array.isArray(params.selectedKeys) && params.selectedKeys.length > 0
    ? params.selectedKeys.filter(key => COPY_STYLE_KEYS.includes(key))
    : COPY_STYLE_KEYS;
  const analysis = await analyzeCopiedStyle(styleSrc, engine.geminiApiKey);
  const stylePrompt = buildCopiedStylePrompt(analysis, selectedKeys);
  if (!stylePrompt) throw new Error('拷貝風格沒有可套用的分析項目');
  let result = '';
  await generateCopiedStyleAssets({
    targetElements: [createImageElementForPipeline(contentSrc, 'copy-style-content')],
    stylePrompt,
    preserveTransparency: params.preserveTransparency ?? engine.preserveTransparency ?? false,
    transparencyKeys: {
      falApiKey: engine.falApiKey,
      geminiApiKey: engine.geminiApiKey,
      imageModel: engine.geminiImageModel,
    },
    engine: {
      model: 'gemini',
      geminiApiKey: engine.geminiApiKey,
      geminiImageModel: engine.geminiImageModel || 'gemini-3.1-flash-image-preview',
      imageSize: engine.imageSize || '1K',
    },
    onAsset: (_source, finalSrc) => {
      result = finalSrc;
    },
  });
  if (!result) throw new Error('拷貝風格沒有回傳圖片');
  return result;
}

async function runBrandKit(
  params: Partial<BrandKitParams>,
  input: string,
  engine: ExecutorEngine,
  onProgress?: (message: string) => void,
): Promise<string[]> {
  if (!isImageSrc(input)) throw new Error('品牌識別節點需要上游 Logo 圖片');
  const selectedAssetIds = Array.isArray(params.selectedAssetIds) && params.selectedAssetIds.length > 0
    ? params.selectedAssetIds
    : LOGO_BRAND_OUTPUTS.slice(0, 4).map(spec => spec.id);
  const assets: string[] = [];
  let zIndex = 0;
  const brief = {
    ...LOGO_DEFAULT_CONFIG,
    brandName: params.brandName?.trim() || 'My Brand',
    slogan: params.slogan?.trim() || '',
    isBrandKit: true,
    brandKitResolution: params.imageSize ?? '1K',
  };
  const { successCount } = await runExtendBrandKitPipeline({
    sourceElement: createImageElementForPipeline(input, 'brand-kit-logo'),
    logoSrc: input,
    brief,
    engine: resolveImageEngine({ model: params.model, imageSize: params.imageSize }, engine),
    selectedAssetIds,
    nextZIndex: () => zIndex++,
    onToast: message => onProgress?.(message),
    onAsset: asset => {
      if (asset.src) assets.push(asset.src);
    },
  });
  if (successCount === 0 || assets.length === 0) throw new Error('品牌識別沒有產生任何資產');
  return assets;
}

async function runCrossPlatform(
  params: Partial<CrossPlatformParams>,
  input: string,
  engine: ExecutorEngine,
  onProgress?: (message: string) => void,
): Promise<string[]> {
  if (!isImageSrc(input)) throw new Error('跨平台適配節點需要上游圖片');
  const platformIds = Array.isArray(params.platformIds) && params.platformIds.length > 0
    ? params.platformIds
    : CROSS_PLATFORM_SPECS.slice(0, 4).map(spec => spec.id);
  const assets: string[] = [];
  let zIndex = 0;
  await runCrossPlatformPipeline({
    sourceElement: createImageElementForPipeline(input, 'cross-platform-source'),
    platformIds,
    opts: {
      preserveSubject: params.preserveSubject !== false,
      keepText: params.keepText === true,
    },
    engine: resolveImageEngine({ model: params.model, imageSize: params.imageSize }, engine),
    nextZIndex: () => zIndex++,
    onToast: message => onProgress?.(message),
    onAsset: asset => {
      if (asset.src) assets.push(asset.src);
    },
  });
  if (assets.length === 0) throw new Error('跨平台適配沒有產生任何圖片');
  return assets;
}

async function runProductMarketing(
  params: Partial<ProductMarketingParams>,
  input: string,
  engine: ExecutorEngine,
  onProgress?: (message: string) => void,
): Promise<string[]> {
  if (!isImageSrc(input)) throw new Error('商品行銷圖節點需要上游商品圖片');
  const platformId = params.platformId && PRODUCT_MARKETING_PLATFORMS[params.platformId]
    ? params.platformId
    : 'shopee';
  const recipes = PRODUCT_MARKETING_PLATFORMS[platformId].recipes;
  const selectedRecipeIds = Array.isArray(params.selectedRecipeIds) && params.selectedRecipeIds.length > 0
    ? params.selectedRecipeIds
    : recipes.slice(0, 3).map(recipe => recipe.id);
  const assets: string[] = [];
  let zIndex = 0;
  const brief = {
    ...PRODUCT_MARKETING_DEFAULT_CONFIG,
    productName: params.productName?.trim() || 'Product',
    sellingPoints: params.sellingPoints?.trim() || '',
    targetAudience: params.targetAudience?.trim() || PRODUCT_MARKETING_DEFAULT_CONFIG.targetAudience,
    visualTone: params.visualTone?.trim() || PRODUCT_MARKETING_DEFAULT_CONFIG.visualTone,
    lockStyleConsistency: params.lockStyleConsistency === true,
  };
  await runProductMarketingPipeline({
    sourceElement: createImageElementForPipeline(input, 'product-marketing-source'),
    productSrc: input,
    brief,
    engine: resolveImageEngine({ model: params.model, imageSize: params.imageSize }, engine),
    selectedRecipeIds,
    platformId,
    apiKey: engine.geminiApiKey,
    nextZIndex: () => zIndex++,
    onToast: message => onProgress?.(message),
    onAsset: asset => {
      if (asset.src) assets.push(asset.src);
    },
  });
  if (assets.length === 0) throw new Error('商品行銷圖沒有產生任何圖片');
  return assets;
}

/** layerSplit 節點：Gemini 語意偵測 + BiRefNet 去背 → 多張圖層（多輸出）。 */
async function runLayerSplit(
  input: string,
  engine: ExecutorEngine,
  onProgress?: (message: string) => void,
): Promise<string[]> {
  if (!engine.geminiApiKey) throw new Error('圖層分離需要 Gemini API Key');
  if (!engine.falApiKey) throw new Error('圖層分離需要 fal.ai API Key');
  const layers = await geminiLayerSegment(input, engine.geminiApiKey, engine.falApiKey, onProgress);
  const srcs = layers.map(l => l.base64).filter(isImageSrc);
  if (srcs.length === 0) throw new Error('圖層分離沒有產生任何圖層');
  return srcs;
}

type NodeRunnerResult =
  | { type: 'single'; value: string }
  | { type: 'batch'; values: string[] };

interface NodeRunnerContext {
  node: GraphNode;
  input: string | undefined;
  inputs: string[];
  inputsByHandle: Record<string, string[]>;
  engine: ExecutorEngine;
  onProgress: (message: string) => void;
}

type NodeRunner = (ctx: NodeRunnerContext) => Promise<NodeRunnerResult> | NodeRunnerResult;
type ExecutableNodeKind = Exclude<NodeKind, 'group'>;

const singleResult = (value: string): NodeRunnerResult => ({ type: 'single', value });
const batchResult = (values: string[]): NodeRunnerResult => ({ type: 'batch', values });

const requireInput = (input: string | undefined, nodeName: string): string => {
  if (!input) throw new Error(`${nodeName}節點需要上游輸入`);
  return input;
};

const nodeRunners: Record<ExecutableNodeKind, NodeRunner> = {
  input: ({ node }) => singleResult(typeof node.data.src === 'string' ? node.data.src : ''),
  output: ({ input }) => singleResult(requireInput(input, '輸出')),
  removeBg: async ({ node, input, engine, onProgress }) => singleResult(await runRemoveBg(
    (node.data.params ?? {}) as Partial<RemoveBgParams>,
    requireInput(input, '去背'),
    engine,
    onProgress,
  )),
  imageGen: async ({ node, inputs, engine }) => singleResult(await runImageGen(
    (node.data.params ?? {}) as Partial<ImageGenParams>,
    inputs,
    engine,
  )),
  style: async ({ node, input, engine }) => singleResult(await runStyleTransfer(
    typeof node.data.params?.styleKey === 'string' ? node.data.params.styleKey : undefined,
    requireInput(input, '風格轉換'),
    engine,
  )),
  cameraAngle: async ({ node, input, engine }) => singleResult(await runCameraAngle(
    (node.data.params ?? {}) as Partial<CameraAngleParams>,
    requireInput(input, '視角轉換'),
    engine,
  )),
  upscale: async ({ node, input, engine, onProgress }) => singleResult(await runUpscale(
    (node.data.params ?? {}) as Partial<UpscaleParams>,
    requireInput(input, '放大'),
    engine,
    onProgress,
  )),
  promptOptimize: async ({ node, inputs, engine }) => singleResult(await runPromptOptimize(
    (node.data.params ?? {}) as Partial<PromptOptimizeParams>,
    inputs,
    engine,
  )),
  analyze: async ({ input, engine }) => singleResult(await runAnalyze(
    requireInput(input, '圖片分析'),
    engine,
  )),
  outpaint: async ({ node, input, engine, onProgress }) => singleResult(await runOutpaint(
    (node.data.params ?? {}) as Partial<OutpaintParams>,
    requireInput(input, '外擴'),
    engine,
    onProgress,
  )),
  copyStyle: async ({ node, inputs, inputsByHandle, engine }) => singleResult(await runCopyStyle(
    (node.data.params ?? {}) as Partial<CopyStyleParams>,
    inputs,
    inputsByHandle,
    engine,
  )),
  layerSplit: async ({ input, engine, onProgress }) => batchResult(await runLayerSplit(
    requireInput(input, '圖層分離'),
    engine,
    onProgress,
  )),
  brandKit: async ({ node, input, engine, onProgress }) => batchResult(await runBrandKit(
    (node.data.params ?? {}) as Partial<BrandKitParams>,
    requireInput(input, '品牌識別'),
    engine,
    onProgress,
  )),
  crossPlatform: async ({ node, input, engine, onProgress }) => batchResult(await runCrossPlatform(
    (node.data.params ?? {}) as Partial<CrossPlatformParams>,
    requireInput(input, '跨平台適配'),
    engine,
    onProgress,
  )),
  productMarketing: async ({ node, input, engine, onProgress }) => batchResult(await runProductMarketing(
    (node.data.params ?? {}) as Partial<ProductMarketingParams>,
    requireInput(input, '商品行銷圖'),
    engine,
    onProgress,
  )),
  note: ({ node }) => singleResult(typeof node.data.params?.text === 'string' ? node.data.params.text : ''),
};

export interface ExecutorEngine {
  geminiApiKey?: string | null;
  atlasApiKey?: string | null;
  falApiKey?: string | null;
  geminiImageModel?: string;
  generationModel?: string;
  imageSize?: '1K' | '2K' | '4K';
  imageAspectRatio?: string;
  preserveTransparency?: boolean;
}

export interface ExecutorCallbacks {
  onNodeStatus?: (id: string, status: NodeRunStatus, message?: string) => void;
  /** 節點跑出結果時回報（每個動作節點自己顯示結果縮圖用）。 */
  onNodeResult?: (id: string, src: string) => void;
  /** 多輸出節點跑出「一組」結果時回報（可折疊 Batch 節點展開用）。 */
  onNodeBatchResult?: (id: string, srcs: string[]) => void;
  /** 整張圖跑完後的錯誤彙總；不影響已成功節點的結果展示。 */
  onRunError?: (message: string) => void;
}

export interface ExecuteResult {
  outputSrc: string | null;
  results: Map<string, string>;
}

export interface ExecuteOptions {
  signal?: AbortSignal;
}

class GraphExecutionAbortError extends Error {
  constructor() {
    super('節點工作流已停止');
    this.name = 'GraphExecutionAbortError';
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new GraphExecutionAbortError();
}

/** Kahn 拓撲排序；有環路回傳 null。 */
function topoSort(graph: NodeGraphData): GraphNode[] | null {
  const indeg = new Map<string, number>();
  const byId = new Map<string, GraphNode>();
  for (const n of graph.nodes) { indeg.set(n.id, 0); byId.set(n.id, n); }
  for (const e of graph.edges) {
    if (indeg.has(e.target)) indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  }
  const queue = graph.nodes.filter(n => (indeg.get(n.id) ?? 0) === 0).map(n => n.id);
  const order: GraphNode[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    const node = byId.get(id);
    if (node) order.push(node);
    for (const e of graph.edges) {
      if (e.source !== id) continue;
      const d = (indeg.get(e.target) ?? 0) - 1;
      indeg.set(e.target, d);
      if (d === 0) queue.push(e.target);
    }
  }
  return order.length === graph.nodes.length ? order : null;
}

/**
 * 解析單條 edge 帶來的值：
 * - 來源是多輸出節點（batchResults 有它）：sourceHandle `item-N` 取第 N 個；未指定則取第 0 個（代表）。
 * - 一般單輸出節點：取 results 的值。
 */
function resolveEdgeValue(
  edge: GraphEdge,
  results: Map<string, string>,
  batchResults: Map<string, string[]>,
): string | undefined {
  const batch = batchResults.get(edge.source);
  if (batch) {
    const match = /^item-(\d+)$/.exec(edge.sourceHandle ?? '');
    const index = match ? Number(match[1]) : 0;
    return batch[index];
  }
  return results.get(edge.source);
}

/** 找某節點的第一條上游輸入值（單輸入節點用）。 */
function upstreamSrc(
  nodeId: string,
  graph: NodeGraphData,
  results: Map<string, string>,
  batchResults: Map<string, string[]>,
): string | undefined {
  const edge = graph.edges.find(e => e.target === nodeId);
  return edge ? resolveEdgeValue(edge, results, batchResults) : undefined;
}

/** 找某節點的全部上游輸入值（多輸入節點用，如 imageGen 多參考圖）。 */
function upstreamSrcs(
  nodeId: string,
  graph: NodeGraphData,
  results: Map<string, string>,
  batchResults: Map<string, string[]>,
): string[] {
  return graph.edges
    .filter(e => e.target === nodeId)
    .map(e => resolveEdgeValue(e, results, batchResults))
    .filter((src): src is string => !!src);
}

/** 依 targetHandle 分組上游輸入值（雙輸入節點用，如 copyStyle）。 */
function upstreamSrcsByHandle(
  nodeId: string,
  graph: NodeGraphData,
  results: Map<string, string>,
  batchResults: Map<string, string[]>,
): Record<string, string[]> {
  return graph.edges
    .filter(e => e.target === nodeId)
    .reduce<Record<string, string[]>>((acc, edge) => {
      const src = resolveEdgeValue(edge, results, batchResults);
      if (!src) return acc;
      const key = edge.targetHandle ?? 'default';
      acc[key] = [...(acc[key] ?? []), src];
      return acc;
    }, {});
}

function blockedByFailedUpstream(
  nodeId: string,
  graph: NodeGraphData,
  unavailableNodeIds: Set<string>,
): string | null {
  const edge = graph.edges.find(e => e.target === nodeId && unavailableNodeIds.has(e.source));
  return edge ? `上游節點 ${edge.source} 失敗或未產生結果` : null;
}

/** 終端節點 = 沒有任何 edge 以它為 source（鏈的末端）。 */
function terminalNodeIds(graph: NodeGraphData): Set<string> {
  const hasOutgoing = new Set(graph.edges.map(e => e.source));
  return new Set(graph.nodes.filter(n => n.kind !== 'group' && !hasOutgoing.has(n.id)).map(n => n.id));
}

/**
 * 執行整張圖。沒有預放的 output 節點：最終輸出 = 鏈末端（終端節點）的結果。
 * 每個節點跑出結果都透過 onNodeResult 回報，讓該節點自己顯示結果縮圖。
 * 階段 A 只接 removeBg（本機）；imageGen / style 先原樣傳遞，等階段 B。
 */
export async function executeGraph(
  graph: NodeGraphData,
  engine: ExecutorEngine,
  callbacks: ExecutorCallbacks = {},
  options: ExecuteOptions = {},
): Promise<ExecuteResult> {
  const order = topoSort(graph);
  if (!order) throw new Error('節點圖有環路，無法執行');

  const results = new Map<string, string>();
  const batchResults = new Map<string, string[]>();
  const status = (id: string, s: NodeRunStatus, msg?: string) => callbacks.onNodeStatus?.(id, s, msg);
  const emitResult = (id: string, src: string) => { results.set(id, src); callbacks.onNodeResult?.(id, src); };
  // 多輸出節點：存整組結果供下游依 item-N 取用；同時把第 0 個當「代表值」寫進 results，
  // 讓單值消費端（outputSrc fallback／整節點拖出／未指定 handle 的下游）也能運作。
  const emitBatch = (id: string, srcs: string[]) => {
    batchResults.set(id, srcs);
    callbacks.onNodeBatchResult?.(id, srcs);
    if (srcs[0]) emitResult(id, srcs[0]);
  };
  const terminals = terminalNodeIds(graph);
  const unavailableNodeIds = new Set<string>();
  const errors: { id: string; message: string }[] = [];

  // 收集所有已連線的節點 ID。孤立節點（無連線）在執行時會直接被跳過並維持 idle，不進行算圖也不會誤報錯誤
  const connectedNodeIds = new Set<string>();
  for (const edge of graph.edges) {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  }

  let outputSrc: string | null = null;

  for (const node of order) {
    if (node.kind === 'group') continue;
    try {
      throwIfAborted(options.signal);

      // 孤立節點不予執行，狀態設為 idle，防止亮紅框
      if (!connectedNodeIds.has(node.id)) {
        status(node.id, 'idle');
        continue;
      }

      const blockedReason = blockedByFailedUpstream(node.id, graph, unavailableNodeIds);
      if (blockedReason) {
        unavailableNodeIds.add(node.id);
        status(node.id, 'idle', blockedReason);
        continue;
      }

      const input = upstreamSrc(node.id, graph, results, batchResults);
      if (nodeRequiresUpstream(node.kind) && !input) {
        unavailableNodeIds.add(node.id);
        status(node.id, 'idle', '無上游輸入');
        continue;
      }

      if (node.kind !== 'input') status(node.id, 'running');
      throwIfAborted(options.signal);

      const runnerResult = await nodeRunners[node.kind]({
        node,
        input,
        inputs: upstreamSrcs(node.id, graph, results, batchResults),
        inputsByHandle: upstreamSrcsByHandle(node.id, graph, results, batchResults),
        engine,
        onProgress: message => status(node.id, 'running', message),
      });

      if (runnerResult.type === 'batch') {
        throwIfAborted(options.signal);
        emitBatch(node.id, runnerResult.values);
        status(node.id, 'done');
      } else {
        throwIfAborted(options.signal);
        emitResult(node.id, runnerResult.value);
        status(node.id, 'done');
      }
    } catch (err: unknown) {
      if (err instanceof GraphExecutionAbortError) {
        status(node.id, 'idle');
        break;
      }
      const message = getErrorMessage(err);
      unavailableNodeIds.add(node.id);
      errors.push({ id: node.id, message });
      status(node.id, 'error', message);
    }
  }

  // 決定最終輸出結果：
  // 1. 優先尋找圖中類型為 'output' 且有值的節點結果
  const outputNodes = order.filter(n => n.kind === 'output');
  if (outputNodes.length > 0) {
    for (const n of outputNodes) {
      const r = results.get(n.id);
      if (r) {
        outputSrc = r;
        break;
      }
    }
  }

  // 2. 如果沒有 output 節點，才 fallback 使用末端終端節點的結果
  if (!outputSrc) {
    for (const nodeId of terminals) {
      const r = results.get(nodeId);
      if (r) {
        outputSrc = r;
        break;
      }
    }
  }

  if (errors.length > 0) {
    const details = errors.map(error => `${error.id}: ${error.message}`).join('；');
    callbacks.onRunError?.(`${errors.length} 個節點失敗：${details}`);
  }

  return { outputSrc, results };
}
