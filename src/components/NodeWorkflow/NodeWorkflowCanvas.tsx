import React, { useCallback, useEffect, useState } from 'react';
import {
  addEdge,
  Background,
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
import { OutputNode } from './nodes/OutputNode';
import { executeGraph, type ExecutorEngine } from './executor/nodeGraphExecutor';
import type { GraphEdge, GraphNode, NodeKind } from './types';

const nodeTypes = {
  input: InputNode,
  output: OutputNode,
  removeBg: RemoveBgNode,
  imageGen: ImageGenNode,
  style: StyleNode,
};

const DEFAULT_LABEL: Record<NodeKind, string> = {
  input: 'Input',
  output: 'Output',
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
  { kind: 'output', label: '＋ 輸出' },
];

export function NodeWorkflowCanvas({ onDetachImage, engine, onOutputChange, onRunError }: NodeWorkflowCanvasProps) {
  // 進子空間前 Overlay 已 loadGraph，這裡讀一次當初始值。
  // 之後由 React Flow 自己管理 nodes/edges（保留量測到的 measured 尺寸，
  // 否則每次從 store 重建會洗掉 measured → 節點永遠 visibility:hidden 不顯示）。
  // syncGraph 只更新拓撲，不清 nodeResults/nodeStatus（loadGraph 會清空執行結果）
  const replaceGraph = useNodeGraphStore(state => state.syncGraph);
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

    const graph = { 
      nodes: nodes.map(toGraphNode), 
      edges: edges.map(toGraphEdge) 
    };

    console.log('[handleRun] starting executeGraph. Nodes:', graph.nodes.map(n => n.id));

    try {
      const { outputSrc } = await executeGraph(graph, engine ?? {}, {
        onNodeStatus: (id, s) => {
          console.log('[handleRun] onNodeStatus:', id, s);
          setNodeStatus(id, s);
        },
        onNodeResult: (id, src) => {
          console.log('[handleRun] onNodeResult writing result for:', id, 'src length:', src?.length);
          setNodeResult(id, src);
        },
      });
      console.log('[handleRun] executeGraph finished. outputSrc exists:', !!outputSrc);
      if (outputSrc) onOutputChange?.(outputSrc);
    } catch (e: any) {
      console.error('[handleRun] executeGraph error:', e);
      onRunError?.(e?.message || '執行失敗');
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, resetRuntime, nodes, edges, engine, setNodes, setEdges, setNodeStatus, setNodeResult, onOutputChange, onRunError]);

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
        fitViewOptions={{ padding: 0.28 }}
        maxZoom={1}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        nodesSelectable={true}
        panOnDrag={true}
        className="node-workflow-flow bg-[#f8fafc]"
      >
        <style>{`
          .node-workflow-flow .react-flow__node {
            border-radius: 0px;
          }
          /* Input / Output 節點：去除 React Flow 預設的背景/邊框/陰影/內距，讓圖片直接是節點 */
          .node-workflow-flow .react-flow__node-input,
          .node-workflow-flow .react-flow__node-output {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            width: auto !important;
          }
          .node-workflow-flow .react-flow__node.selected,
          .node-workflow-flow .react-flow__node:focus,
          .node-workflow-flow .react-flow__node:focus-visible {
            outline: 1.5px solid #111827 !important;
            outline-offset: 1px;
            box-shadow: none !important;
          }
          /* Input / Output 選取時維持同樣的外聚焦框 */
          .node-workflow-flow .react-flow__node-input.selected,
          .node-workflow-flow .react-flow__node-input:focus,
          .node-workflow-flow .react-flow__node-input:focus-visible,
          .node-workflow-flow .react-flow__node-output.selected,
          .node-workflow-flow .react-flow__node-output:focus,
          .node-workflow-flow .react-flow__node-output:focus-visible {
            outline: 1.5px solid #111827 !important;
            outline-offset: 1px;
            box-shadow: none !important;
          }
          
          /* 自動游標感應：畫布背景是抓手，物件上是普通選取箭頭 */
          .node-workflow-flow,
          .node-workflow-flow .react-flow__pane {
            cursor: grab !important;
          }
          .node-workflow-flow:active,
          .node-workflow-flow .react-flow__pane:active {
            cursor: grabbing !important;
          }
          
          /* 物件（節點）上是普通選取指針 */
          .node-workflow-flow .react-flow__node {
            cursor: default !important;
          }
          
          /* 連線點、按鈕、下拉選單是 pointer */
          .node-workflow-flow .react-flow__handle,
          .node-workflow-flow .react-flow__node button,
          .node-workflow-flow .react-flow__node select,
          .node-workflow-flow .react-flow__node [role="button"] {
            cursor: pointer !important;
          }
          
          /* 文字輸入框上是文字選取游標 (I-beam) */
          .node-workflow-flow .react-flow__node textarea {
            cursor: text !important;
          }
        `}</style>
        <Background color="#cbd5e1" gap={28} size={1.2} />
        <Panel position="top-left">
          <div className="flex items-center gap-px border border-black/12 bg-white shadow-sm">
            {ADDABLE.map(({ kind, label }) => (
              <button
                key={kind}
                type="button"
                onClick={() => addNode(kind)}
                className="px-3 py-1.5 text-[12px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors border-r border-black/6 last:border-r-0"
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleRun}
              disabled={isRunning}
              className="bg-neutral-900 px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors border-l border-black/12"
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
