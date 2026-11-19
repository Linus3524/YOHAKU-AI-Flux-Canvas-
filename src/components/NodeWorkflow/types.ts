import type { BiRefNetModel } from '../../utils/geminiLayer';

export type NodeKind = 'input' | 'output' | 'removeBg' | 'imageGen' | 'lineSticker' | 'style' | 'cameraAngle' | 'upscale' | 'promptOptimize' | 'analyze' | 'outpaint' | 'inpaint' | 'adjustments' | 'copyStyle' | 'applyStyle' | 'layerSplit' | 'brandKit' | 'crossPlatform' | 'productMarketing' | 'composite' | 'group' | 'note';

export interface NoteParams {
  text: string;
  color?: string;
}

/** 產出「一組」結果的多輸出節點種類（用可折疊 Batch 容器呈現）。 */
export const MULTI_OUTPUT_KINDS: readonly NodeKind[] = ['layerSplit', 'brandKit', 'crossPlatform', 'productMarketing'];
export const isMultiOutputKind = (kind: NodeKind): boolean => MULTI_OUTPUT_KINDS.includes(kind);

/** 各處理節點的參數形狀（存進 GraphNode.data.params；#2 只做設定，執行是 #3） */
export interface RemoveBgParams {
  /** 本機 ISNet／智慧 Gemini／雲端 BiRefNet（對標主畫布三種去背）。 */
  mode: 'local' | 'smart' | 'cloud';
  /** 雲端模式下的 BiRefNet 模型（對標主畫布 6 種）；未選用預設 Matting。 */
  cloudModel?: BiRefNetModel;
}
export interface ImageGenParams {
  prompt: string;
  model: string;
  aspectRatio?: string;
  /** 解析度；未設定時 Gemini 跟隨全域設定、Atlas 用 2K。 */
  imageSize?: '1K' | '2K' | '4K';
  /** 原生透明背景（僅支援的模型有效，其餘請串接「去背」節點）。 */
  transparentBackground?: boolean;
  /** 固定種子碼；留空則每次隨機。 */
  seed?: number;
}
export interface LineStickerParams {
  subject: string;
  style: string;
  theme: string;
  count: number;
  itemPrompts: string;
  useStickerBorder: boolean;
  useFacialFeatures: boolean;
  textEnabled: boolean;
  textContent: string;
  model: string;
  imageSize: '1K' | '2K' | '4K';
}
export interface StyleParams {
  styleKey: string;
}
export interface CameraAngleParams {
  anglePrompt: string;
  /** 生成模型；空值 = 跟隨全域生成模型設定。可指定 'gemini' 或任一 Atlas 模型。 */
  model?: string;
}
export interface UpscaleParams {
  /** 本機 ONNX 高清放大／智能 AI 放大（對標主畫布兩種）。 */
  mode: 'local' | 'smart';
  modelKey: 'upscale_photo' | 'upscale_anime' | 'upscale_art';
  factor: 2 | 4;
}
export interface PromptOptimizeParams {
  prompt: string;
}
export interface AnalyzeParams {
  format: 'summary';
  /** 自訂問題；留空則輸出風格／光影／構圖摘要。 */
  question?: string;
}
export interface OutpaintParams {
  direction: 'all' | 'left' | 'right' | 'top' | 'bottom';
  directions?: string[];
  aspectRatio: '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | 'custom';
  pixelOffset?: number;
  prompt: string;
  model?: 'gemini' | 'gpt' | 'seedream-v5-pro';
}
export interface CopyStyleParams {
  selectedKeys: string[];
}
export interface ApplyStyleParams { preserveTransparency: boolean; model?: string; }
export interface InpaintParams {
  prompt: string;
  /** 在節點上手繪的遮罩（白＝重繪、黑＝保留）；有接「遮罩」輸入時以輸入為準。 */
  maskSrc?: string;
}
export interface CompositeParams {
  /** 前景寬度佔背景寬度的百分比（1–200）。 */
  scale: number;
  /** 前景中心點在背景上的位置（0–100%）。 */
  x: number;
  y: number;
}
export interface AdjustmentsParams {
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
}
export interface BrandKitParams {
  brandName: string;
  slogan: string;
  model: string;
  imageSize: '1K' | '2K' | '4K';
  selectedAssetIds: string[];
}
export interface CrossPlatformParams {
  platformIds: string[];
  model: string;
  imageSize: '1K' | '2K' | '4K';
  preserveSubject: boolean;
  keepText: boolean;
}
export interface ProductMarketingParams {
  productName: string;
  sellingPoints: string;
  targetAudience: string;
  visualTone: string;
  platformId: string;
  selectedRecipeIds: string[];
  model: string;
  imageSize: '1K' | '2K' | '4K';
  lockStyleConsistency: boolean;
}
export interface LayerSplitParams {
  /** 'gemini' = Gemini + BiRefNet 舊路徑；其餘為魔法分層（gptLayerSegment）的模型。 */
  engine: 'gemini' | 'seedream-v5-pro' | 'gpt-image-2' | 'gpt-image-2.5-sunburst' | 'gpt-image-2.5-flare' | 'gpt-image-2.6-sunburst' | 'gpt-image-2.6-flare';
  /** 補充指令（指定要拆出哪些物件）。 */
  prompt?: string;
  imageSize?: '1K' | '2K';
  layerCount?: 'auto' | number;
  groupingStrategy?: 'smart' | 'separate' | 'category';
  includeBackground?: boolean;
}
export interface GroupParams {
  label?: string;
  color?: string;
  width?: number;
  height?: number;
}

export interface GraphNode {
  id: string;
  kind: NodeKind;
  position: { x: number; y: number };
  parentId?: string;
  data: {
    label?: string;
    src?: string;
    params?: Record<string, unknown>;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  /** 來源節點的輸出接口 id。多輸出節點用 `item-<index>` 指定接第幾個結果；單輸出留空。 */
  sourceHandle?: string | null;
  /** 目標節點的輸入接口 id。雙輸入節點用它區分角色；單輸入留空。 */
  targetHandle?: string | null;
}

/** 節點執行期狀態（runtime-only，不寫進 graph 存檔） */
export type NodeRunStatus = 'idle' | 'running' | 'done' | 'error';

export interface NodeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
