import React, { useCallback, useEffect } from 'react';
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type OnConnect,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useNodeGraphStore } from '../../store/nodeGraphStore';
import { InputNode } from './nodes/InputNode';
import { OutputNode } from './nodes/OutputNode';
import type { GraphEdge, GraphNode, NodeKind } from './types';

const nodeTypes = {
  input: InputNode,
  output: OutputNode,
};

type FlowNodeData = Record<string, unknown> & {
  label: string;
  kind: NodeKind;
};

type FlowNode = Node<FlowNodeData>;
type FlowEdge = Edge;

const toFlowNode = (node: GraphNode): FlowNode => ({
  id: node.id,
  type: node.kind,
  position: node.position,
  data: {
    ...node.data,
    label: node.data.label ?? (node.kind === 'input' ? 'Input' : 'Output'),
    kind: node.kind,
  },
});

const toGraphNode = (node: FlowNode): GraphNode => {
  const { kind, label, ...restData } = node.data;
  return {
    id: node.id,
    kind,
    position: node.position,
    data: {
      ...restData,
      label,
    },
  };
};

const toFlowEdge = (edge: GraphEdge): FlowEdge => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
});

const toGraphEdge = (edge: FlowEdge): GraphEdge => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
});

export function NodeWorkflowCanvas() {
  // 進子空間前 Overlay 已 loadGraph，這裡讀一次當初始值。
  // 之後由 React Flow 自己管理 nodes/edges（保留量測到的 measured 尺寸，
  // 否則每次從 store 重建會洗掉 measured → 節點永遠 visibility:hidden 不顯示）。
  const replaceGraph = useNodeGraphStore(state => state.loadGraph);
  const [nodes, , onNodesChange] = useNodesState(
    useNodeGraphStore.getState().nodes.map(toFlowNode),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    useNodeGraphStore.getState().edges.map(toFlowEdge),
  );

  // 把本地編輯結果鏡像回 store，讓關閉時 exportGraph() 拿到最新拓撲（存回 NodeGroupElement）。
  useEffect(() => {
    replaceGraph({
      nodes: nodes.map(toGraphNode),
      edges: edges.map(toGraphEdge),
    });
  }, [nodes, edges, replaceGraph]);

  const handleConnect: OnConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    const edgeId = `edge-${connection.source}-${connection.target}-${Date.now()}`;
    setEdges(eds => addEdge({ ...connection, id: edgeId }, eds));
  }, [setEdges]);

  return (
    <div className="absolute inset-0">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        fitView
      >
        <Background />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
    </div>
  );
}
