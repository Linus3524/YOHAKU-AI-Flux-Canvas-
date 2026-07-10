import type { BiRefNetModel } from '../../utils/geminiLayer';

export type NodeKind = 'input' | 'output' | 'removeBg' | 'imageGen' | 'style' | 'cameraAngle' | 'upscale' | 'promptOptimize' | 'analyze' | 'outpaint' | 'copyStyle' | 'layerSplit' | 'brandKit' | 'crossPlatform' | 'productMarketing' | 'group' | 'note';

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
  preserveTransparency: boolean;
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
  engine: 'gemini' | 'seedream-v5-pro';
  prompt?: string;
  imageSize?: '1K' | '2K';
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
