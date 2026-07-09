import { create } from 'zustand';
import type { GraphEdge, GraphNode, NodeGraphData } from '../components/NodeWorkflow/types';

interface NodeGraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  loadGraph: (data: NodeGraphData) => void;
  addNode: (node: GraphNode) => void;
  updateNodePosition: (id: string, position: GraphNode['position']) => void;
  connectEdge: (edge: GraphEdge) => void;
  removeNode: (id: string) => void;
  exportGraph: () => NodeGraphData;
}

export const useNodeGraphStore = create<NodeGraphState>((set, get) => ({
  nodes: [],
  edges: [],
  loadGraph: (data) => set({
    nodes: data.nodes.map(node => ({ ...node, data: { ...node.data }, position: { ...node.position } })),
    edges: data.edges.map(edge => ({ ...edge })),
  }),
  addNode: (node) => set(state => ({
    nodes: [...state.nodes, { ...node, data: { ...node.data }, position: { ...node.position } }],
  })),
  updateNodePosition: (id, position) => set(state => ({
    nodes: state.nodes.map(node => node.id === id ? { ...node, position: { ...position } } : node),
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
  exportGraph: () => {
    const { nodes, edges } = get();
    return {
      nodes: nodes.map(node => ({ ...node, data: { ...node.data }, position: { ...node.position } })),
      edges: edges.map(edge => ({ ...edge })),
    };
  },
}));
