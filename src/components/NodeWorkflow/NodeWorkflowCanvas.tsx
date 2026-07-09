import React, { useCallback, useEffect, useState } from 'react';
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type OnConnect,
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useNodeGraphStore } from '../../store/nodeGraphStore';
import { InputNode } from './nodes/InputNode';
import { RemoveBgNode } from './nodes/RemoveBgNode';
import { ImageGenNode } from './nodes/ImageGenNode';
import { StyleNode } from './nodes/StyleNode';
import { executeGraph, type ExecutorEngine } from './executor/nodeGraphExecutor';
import type { GraphEdge, GraphNode, NodeKind } from './types';

const nodeTypes = {
  input: InputNode,
  removeBg: RemoveBgNode,
  imageGen: ImageGenNode,
  style: StyleNode,
};

const DEFAULT_LABEL: Record<NodeKind, string> = {
  input: 'Input',
  removeBg: '去背',
  imageGen: '生成圖片',
  style: '風格轉換',
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
    label: node.data.label ?? DEFAULT_LABEL[node.kind],
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

interface NodeWorkflowCanvasProps {
  /** 把帶圖節點拖到底部拖出區時觸發：新增為大畫布獨立圖片。 */
  onDetachImage?: (src: string, name?: string) => void;
  /** 執行引擎所需的 API key / model 設定（階段 A 本機去背用不到，階段 B 生圖/風格會用）。 */
  engine?: ExecutorEngine;
  /** 執行完成，最終輸出圖 → 回貼大畫布 NodeGroupElement.outputSrc。 */
  onOutputChange?: (src: string) => void;
  /** 執行失敗提示。 */
  onRunError?: (message: string) => void;
}

// 拖到畫面底部這個高度內放開 = 移出到大畫布
const DETACH_ZONE_HEIGHT = 90;
const ADDABLE: { kind: NodeKind; label: string }[] = [
  { kind: 'removeBg', label: '＋ 去背' },
  { kind: 'imageGen', label: '＋ 生圖' },
  { kind: 'style', label: '＋ 風格' },
];

export function NodeWorkflowCanvas({ onDetachImage, engine, onOutputChange, onRunError }: NodeWorkflowCanvasProps) {
  // 進子空間前 Overlay 已 loadGraph，這裡讀一次當初始值。
  // 之後由 React Flow 自己管理 nodes/edges（保留量測到的 measured 尺寸，
  // 否則每次從 store 重建會洗掉 measured → 節點永遠 visibility:hidden 不顯示）。
  const replaceGraph = useNodeGraphStore(state => state.loadGraph);
  const setNodeStatus = useNodeGraphStore(state => state.setNodeStatus);
  const setNodeResult = useNodeGraphStore(state => state.setNodeResult);
  const resetRuntime = useNodeGraphStore(state => state.resetRuntime);
  const [nodes, setNodes, onNodesChange] = useNodesState(
    useNodeGraphStore.getState().nodes.map(toFlowNode),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    useNodeGraphStore.getState().edges.map(toFlowEdge),
  );
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    resetRuntime();
    const graph = { nodes: nodes.map(toGraphNode), edges: edges.map(toGraphEdge) };
    try {
      const { outputSrc } = await executeGraph(graph, engine ?? {}, {
        onNodeStatus: (id, s) => setNodeStatus(id, s),
        onNodeResult: (id, src) => setNodeResult(id, src),
      });
      if (outputSrc) onOutputChange?.(outputSrc);
    } catch (e: any) {
      onRunError?.(e?.message || '執行失敗');
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, resetRuntime, nodes, edges, engine, setNodeStatus, setNodeResult, onOutputChange, onRunError]);

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

  // 加節點：若有選中的節點，新節點自動接在它後面並選中（連點成鏈，免拉線）。
  const addNode = useCallback((kind: NodeKind) => {
    const selected = nodes.find(n => n.selected) ?? nodes[nodes.length - 1];
    const id = `${kind}-${Date.now()}`;
    const position = selected
      ? { x: selected.position.x + 240, y: selected.position.y }
      : { x: 260 + nodes.length * 24, y: 260 };
    const graphNode: GraphNode = { id, kind, position, data: { label: DEFAULT_LABEL[kind], params: {} } };
    setNodes(nds => [
      ...nds.map(n => ({ ...n, selected: false })),
      { ...toFlowNode(graphNode), selected: true },
    ]);
    if (selected) {
      setEdges(eds => addEdge({ id: `edge-${selected.id}-${id}`, source: selected.id, target: id }, eds));
    }
  }, [nodes, setNodes, setEdges]);

  const handleNodeDragStart: OnNodeDrag<FlowNode> = useCallback(() => {
    setIsDraggingNode(true);
  }, []);

  const handleNodeDragStop: OnNodeDrag<FlowNode> = useCallback((event, node) => {
    setIsDraggingNode(false);
    // 落點在底部拖出區內 → 移出到大畫布（限帶圖節點）
    const clientY = 'clientY' in event ? event.clientY : (event as MouseEvent).clientY;
    const inDetachZone = typeof clientY === 'number' && clientY > window.innerHeight - DETACH_ZONE_HEIGHT;
    const src = typeof node.data?.src === 'string' ? node.data.src : '';
    if (inDetachZone && src && onDetachImage) {
      const label = typeof node.data?.label === 'string' ? node.data.label : undefined;
      onDetachImage(src, label);
    }
  }, [onDetachImage]);

  return (
    <div className="absolute inset-0">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        fitView
      >
        <Background />
        <MiniMap pannable zoomable />
        <Controls />
        <Panel position="top-left">
          <div className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-white/90 backdrop-blur-xl p-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.08)]">
            {ADDABLE.map(({ kind, label }) => (
              <button
                key={kind}
                type="button"
                onClick={() => addNode(kind)}
                className="rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[#1D1D1F] hover:bg-black/5 transition-colors"
              >
                {label}
              </button>
            ))}
            <div className="w-px self-stretch bg-black/10 mx-0.5" />
            <button
              type="button"
              onClick={handleRun}
              disabled={isRunning}
              className="rounded-lg bg-[#007AFF] px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isRunning ? '執行中…' : '▶ 執行'}
            </button>
          </div>
        </Panel>
      </ReactFlow>
      {/* 底部拖出區：拖曳節點時浮現，放開帶圖節點於此 → 移出到大畫布 */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-[90px] flex items-center justify-center text-[12px] font-medium transition-opacity ${
          isDraggingNode ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: 'linear-gradient(to top, rgba(0,122,255,0.14), rgba(0,122,255,0))',
          color: '#007AFF',
        }}
      >
        拖到這裡 → 移出到畫布
      </div>
    </div>
  );
}
