import { create } from 'zustand';
import type { GraphEdge, GraphNode, NodeGraphData, NodeRunStatus } from '../components/NodeWorkflow/types';

interface NodeGraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** 執行期狀態（runtime-only，不進 exportGraph／存檔） */
  nodeStatus: Record<string, NodeRunStatus>;
  /** 各節點執行後的結果（runtime-only；每個動作節點自己顯示結果縮圖用） */
  nodeResults: Record<string, string>;
  /** 多輸出節點執行後的「一組」結果（runtime-only；可折疊 Batch 節點展開用） */
  nodeBatchResults: Record<string, string[]>;
  loadGraph: (
    data: NodeGraphData, 
    nodeResults?: Record<string, string>, 
    nodeBatchResults?: Record<string, string[]>, 
    nodeStatus?: Record<string, NodeRunStatus>
  ) => void;
  /** 同步拓撲（不清 runtime 狀態），給 React Flow → store 鏡像用 */
  syncGraph: (data: NodeGraphData) => void;
  addNode: (node: GraphNode) => void;
  updateNodePosition: (id: string, position: GraphNode['position']) => void;
  updateNodeData: (id: string, params: Record<string, unknown>) => void;
  connectEdge: (edge: GraphEdge) => void;
  removeNode: (id: string) => void;
  setNodeStatus: (id: string, status: NodeRunStatus) => void;
  setNodeResult: (id: string, src: string) => void;
  setNodeBatchResult: (id: string, srcs: string[]) => void;
  /** 刪除多輸出節點的單張結果，保留其他圖片與節點本身。 */
  removeNodeBatchResultItem: (id: string, index: number) => void;
  /** 清除單一節點的執行結果，但保留節點、參數與連線。 */
  clearNodeResult: (id: string) => void;
  resetRunningStatuses: () => void;
  resetRuntime: () => void;
  exportGraph: () => NodeGraphData;
}

export const useNodeGraphStore = create<NodeGraphState>((set, get) => ({
  nodes: [],
  edges: [],
  nodeStatus: {},
  nodeResults: {},
  nodeBatchResults: {},
  loadGraph: (data, nodeResults = {}, nodeBatchResults = {}, nodeStatus = {}) => set({
    nodes: data.nodes.map(node => ({ ...node, data: { ...node.data }, position: { ...node.position } })),
    edges: data.edges.map(edge => ({ ...edge })),
    nodeStatus,
    nodeResults,
    nodeBatchResults,
  }),
  syncGraph: (data) => set({
    nodes: data.nodes.map(node => ({ ...node, data: { ...node.data }, position: { ...node.position } })),
    edges: data.edges.map(edge => ({ ...edge })),
  }),
  addNode: (node) => set(state => ({
    nodes: [...state.nodes, { ...node, data: { ...node.data }, position: { ...node.position } }],
  })),
  updateNodePosition: (id, position) => set(state => ({
    nodes: state.nodes.map(node => node.id === id ? { ...node, position: { ...position } } : node),
  })),
  updateNodeData: (id, params) => set(state => ({
    nodes: state.nodes.map(node => node.id === id
      ? { ...node, data: { ...node.data, params: { ...node.data.params, ...params } } }
      : node),
  })),
  connectEdge: (edge) => set(state => {
    const exists = state.edges.some(existing => existing.id === edge.id);
    return {
      edges: exists
        ? state.edges.map(existing => existing.id === edge.id ? { ...edge } : existing)
        : [...state.edges, { ...edge }],
    };
  }),
  removeNode: (id) => set(state => ({
    nodes: state.nodes.filter(node => node.id !== id),
    edges: state.edges.filter(edge => edge.source !== id && edge.target !== id),
  })),
  setNodeStatus: (id, status) => set(state => ({
    nodeStatus: { ...state.nodeStatus, [id]: status },
  })),
  setNodeResult: (id, src) => set(state => ({
    nodeResults: { ...state.nodeResults, [id]: src },
  })),
  setNodeBatchResult: (id, srcs) => set(state => ({
    nodeBatchResults: { ...state.nodeBatchResults, [id]: srcs },
  })),
  removeNodeBatchResultItem: (id, index) => set(state => {
    const nextItems = (state.nodeBatchResults[id] ?? []).filter((_, itemIndex) => itemIndex !== index);
    const { [id]: _batch, ...remainingBatchResults } = state.nodeBatchResults;
    const { [id]: _single, ...remainingNodeResults } = state.nodeResults;
    return {
      nodeBatchResults: nextItems.length > 0
        ? { ...remainingBatchResults, [id]: nextItems }
        : remainingBatchResults,
      // batch 的第 0 張同時是單值代表結果，刪除後要同步改成新的第 0 張。
      nodeResults: nextItems[0]
        ? { ...remainingNodeResults, [id]: nextItems[0] }
        : remainingNodeResults,
      nodeStatus: nextItems.length > 0
        ? state.nodeStatus
        : { ...state.nodeStatus, [id]: 'idle' },
    };
  }),
  clearNodeResult: (id) => set(state => {
    const { [id]: _single, ...nodeResults } = state.nodeResults;
    const { [id]: _batch, ...nodeBatchResults } = state.nodeBatchResults;
    return {
      nodeResults,
      nodeBatchResults,
      nodeStatus: { ...state.nodeStatus, [id]: 'idle' },
    };
  }),
  resetRunningStatuses: () => set(state => ({
    nodeStatus: Object.fromEntries(
      Object.entries(state.nodeStatus).map(([id, status]) => [id, status === 'running' ? 'idle' : status]),
    ),
  })),
  resetRuntime: () => set({ nodeStatus: {}, nodeResults: {}, nodeBatchResults: {} }),
  exportGraph: () => {
    const { nodes, edges } = get();
    return {
      nodes: nodes.map(node => ({ ...node, data: { ...node.data }, position: { ...node.position } })),
      edges: edges.map(edge => ({ ...edge })),
    };
  },
}));
