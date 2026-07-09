export type NodeKind = 'input' | 'output';

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

export interface NodeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
