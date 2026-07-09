export type NodeKind = 'input' | 'output' | 'removeBg' | 'imageGen' | 'style';

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
}

/** 節點執行期狀態（runtime-only，不寫進 graph 存檔） */
export type NodeRunStatus = 'idle' | 'running' | 'done' | 'error';

export interface NodeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
