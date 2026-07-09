export type NodeKind = 'input' | 'output' | 'removeBg' | 'imageGen' | 'style' | 'upscale' | 'promptOptimize' | 'layerSplit';

/** 產出「一組」結果的多輸出節點種類（用可折疊 Batch 容器呈現）。 */
export const MULTI_OUTPUT_KINDS: readonly NodeKind[] = ['layerSplit'];
export const isMultiOutputKind = (kind: NodeKind): boolean => MULTI_OUTPUT_KINDS.includes(kind);

/** 各處理節點的參數形狀（存進 GraphNode.data.params；#2 只做設定，執行是 #3） */
export interface RemoveBgParams {
  mode: 'local' | 'cloud';
}
export interface ImageGenParams {
  prompt: string;
  model: string;
  aspectRatio?: string;
}
export interface StyleParams {
  styleKey: string;
}
export interface UpscaleParams {
  modelKey: 'upscale_photo' | 'upscale_anime' | 'upscale_art';
  factor: 2 | 4;
}
export interface PromptOptimizeParams {
  prompt: string;
}
export interface LayerSplitParams {
  engine: 'gemini' | 'gpt';
}

export interface GraphNode {
  id: string;
  kind: NodeKind;
  position: { x: number; y: number };
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
}

/** 節點執行期狀態（runtime-only，不寫進 graph 存檔） */
export type NodeRunStatus = 'idle' | 'running' | 'done' | 'error';

export interface NodeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
