import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  addEdge,
  Background,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
  reconnectEdge,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Connection,
  type Edge,
  type Node,
  type OnConnect,
  type OnNodeDrag,
  type EdgeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useNodeGraphStore } from '../../store/nodeGraphStore';
import { isImageSrc } from './mediaSrc';
import { NodeWorkflowContext } from './NodeWorkflowContext';
import { ADDABLE_NODES, DEFAULT_NODE_LABELS, nodeTypes } from './nodeRegistry';
import { executeGraph, type ExecutorEngine } from './executor/nodeGraphExecutor';
import type { GraphEdge, GraphNode, NodeKind } from './types';

function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps<FlowEdge>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetPosition,
    targetX,
    targetY,
  });

  const [isHovered, setIsHovered] = useState(false);
  const onDelete = data?.onDelete;

  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 隱形的寬線以利游標感應 Hover */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={15}
        style={{ cursor: 'pointer' }}
      />
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onDelete) onDelete(id);
            }}
            className={`w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md border border-white transition-opacity hover:scale-110 active:scale-90 text-[9px] font-bold ${
              isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            title="斷開此連線"
          >
            ✕
          </button>
        </div>
      </EdgeLabelRenderer>
    </g>
  );
}

const edgeTypes = {
  deletable: DeletableEdge,
};

type FlowNodeData = Record<string, unknown> & {
  label: string;
  kind: NodeKind;
  onDeleteNode?: (id: string) => void;
};

interface FlowEdgeData extends Record<string, unknown> {
  onDelete?: (id: string) => void;
}

type FlowNode = Node<FlowNodeData>;
type FlowEdge = Edge<FlowEdgeData>;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '執行失敗';
}

const toFlowNode = (node: GraphNode): FlowNode => ({
  id: node.id,
  type: node.kind,
  position: node.position,
  data: {
    ...node.data,
    label: node.data.label ?? DEFAULT_NODE_LABELS[node.kind],
    kind: node.kind,
  },
});

const toGraphNode = (node: FlowNode): GraphNode => {
  const { kind, label, onDeleteNode, ...restData } = node.data;
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

const toFlowEdge = (edge: GraphEdge, onDelete?: (id: string) => void): FlowEdge => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
  sourceHandle: edge.sourceHandle ?? undefined,
  type: 'deletable',
  data: { onDelete },
});

const toGraphEdge = (edge: FlowEdge): GraphEdge => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
  sourceHandle: edge.sourceHandle ?? undefined,
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

export function NodeWorkflowCanvas({ onDetachImage, engine, onOutputChange, onRunError }: NodeWorkflowCanvasProps) {
  // 進子空間前 Overlay 已 loadGraph，這裡讀一次當初始值。
  // 之後由 React Flow 自己管理 nodes/edges（保留量測到的 measured 尺寸，
  // 否則每次從 store 重建會洗掉 measured → 節點永遠 visibility:hidden 不顯示）。
  // syncGraph 只更新拓撲，不清 nodeResults/nodeStatus（loadGraph 會清空執行結果）
  const replaceGraph = useNodeGraphStore(state => state.syncGraph);
  const setNodeStatus = useNodeGraphStore(state => state.setNodeStatus);
  const setNodeResult = useNodeGraphStore(state => state.setNodeResult);
  const setNodeBatchResult = useNodeGraphStore(state => state.setNodeBatchResult);
  const resetRuntime = useNodeGraphStore(state => state.resetRuntime);
  const resetRunningStatuses = useNodeGraphStore(state => state.resetRunningStatuses);
  const [nodes, setNodes, onNodesChange] = useNodesState(
    useNodeGraphStore.getState().nodes.map(toFlowNode),
  );

  const [edges, setEdges, onEdgesChange] = useEdgesState(
    useNodeGraphStore.getState().edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'deletable',
    }))
  );

  const handleEdgeDelete = useCallback((edgeId: string) => {
    setEdges(eds => eds.filter(e => e.id !== edgeId));
  }, [setEdges]);

  const handleNodeDelete = useCallback((nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
  }, [setNodes, setEdges]);

  useEffect(() => {
    setNodes(nds => nds.map(n => {
      if (n.data?.onDeleteNode === handleNodeDelete) return n;
      return { ...n, data: { ...n.data, onDeleteNode: handleNodeDelete } };
    }));
  }, [handleNodeDelete, setNodes]);

  // 掛載後注入 onDelete 刪除連線之回呼函式
  useEffect(() => {
    setEdges(eds => eds.map(e => {
      if (e.type === 'deletable' && !e.data?.onDelete) {
        return { ...e, data: { ...e.data, onDelete: handleEdgeDelete } };
      }
      return e;
    }));
  }, [handleEdgeDelete, setEdges]);

  // 拖曳斷開連線 (Reconnect / Drag to disconnect)
  const edgeReconnectSuccessful = useRef(true);

  const handleReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const handleReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
    edgeReconnectSuccessful.current = true;
    setEdges(els => reconnectEdge(oldEdge, newConnection, els));
  }, [setEdges]);

  const handleReconnectEnd = useCallback((_: MouseEvent | TouchEvent, edge: FlowEdge) => {
    if (!edgeReconnectSuccessful.current) {
      setEdges(eds => eds.filter(e => e.id !== edge.id));
    }
    edgeReconnectSuccessful.current = true;
  }, [setEdges]);

  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleRun = useCallback(async () => {
    if (isRunning) {
      abortControllerRef.current?.abort();
      resetRunningStatuses();
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsRunning(true);
    resetRuntime();

    const graph = { 
      nodes: nodes.map(toGraphNode), 
      edges: edges.map(toGraphEdge) 
    };

    try {
      const { outputSrc } = await executeGraph(graph, engine ?? {}, {
        onNodeStatus: (id, s) => {
          setNodeStatus(id, s);
        },
        onNodeResult: (id, src) => {
          setNodeResult(id, src);
        },
        onNodeBatchResult: (id, srcs) => {
          setNodeBatchResult(id, srcs);
        },
        onRunError,
      }, { signal: abortController.signal });
      if (outputSrc) onOutputChange?.(outputSrc);
    } catch (e: unknown) {
      console.error('[handleRun] executeGraph error:', e);
      onRunError?.(getErrorMessage(e));
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      resetRunningStatuses();
      setIsRunning(false);
    }
  }, [isRunning, resetRuntime, resetRunningStatuses, nodes, edges, engine, setNodes, setEdges, setNodeStatus, setNodeResult, setNodeBatchResult, onOutputChange, onRunError]);

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
    setEdges(eds => addEdge({ 
      ...connection, 
      id: edgeId,
      type: 'deletable',
      data: { onDelete: handleEdgeDelete }
    }, eds));
  }, [setEdges, handleEdgeDelete]);

  // 加節點：若有選中的節點，新節點自動接在它後面並選中（連點成鏈，免拉線）。
  const addNode = useCallback((kind: NodeKind) => {
    const selected = nodes.find(n => n.selected) ?? nodes[nodes.length - 1];
    const id = `${kind}-${Date.now()}`;
    const position = selected
      ? { x: selected.position.x + 240, y: selected.position.y }
      : { x: 260 + nodes.length * 24, y: 260 };
    const graphNode: GraphNode = { id, kind, position, data: { label: DEFAULT_NODE_LABELS[kind], params: {} } };
    const flowNode = toFlowNode(graphNode);
    setNodes(nds => [
      ...nds.map(n => ({ ...n, selected: false })),
      { ...flowNode, data: { ...flowNode.data, onDeleteNode: handleNodeDelete }, selected: true },
    ]);
    if (selected) {
      setEdges(eds => addEdge({ 
        id: `edge-${selected.id}-${id}`, 
        source: selected.id, 
        target: id,
        type: 'deletable',
        data: { onDelete: handleEdgeDelete }
      }, eds));
    }
  }, [nodes, setNodes, setEdges, handleEdgeDelete]);

  const handleNodeDragStart: OnNodeDrag<FlowNode> = useCallback(() => {
    setIsDraggingNode(true);
  }, []);

  const handleNodeDragStop: OnNodeDrag<FlowNode> = useCallback((event, node) => {
    setIsDraggingNode(false);
    // 落點在底部拖出區內 → 移出到大畫布。
    const clientY = 'clientY' in event ? event.clientY : (event as MouseEvent).clientY;
    const inDetachZone = typeof clientY === 'number' && clientY > window.innerHeight - DETACH_ZONE_HEIGHT;
    if (!inDetachZone || !onDetachImage) return;
    // 可拖出的圖片：Input 節點原圖 (data.src) 或動作節點執行後的結果 (nodeResults)。
    // 只允許圖片（排除便利貼文字等非圖片 payload）。
    const inlineSrc = typeof node.data?.src === 'string' ? node.data.src : '';
    const resultSrc = useNodeGraphStore.getState().nodeResults[node.id] ?? '';
    const src = isImageSrc(inlineSrc) ? inlineSrc : (isImageSrc(resultSrc) ? resultSrc : '');
    if (src) {
      const label = typeof node.data?.label === 'string' ? node.data.label : undefined;
      onDetachImage(src, label);
    }
  }, [onDetachImage]);

  return (
    <NodeWorkflowContext.Provider value={{ detachImage: onDetachImage }}>
    <div className="absolute inset-0">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onReconnect={handleReconnect}
        onReconnectStart={handleReconnectStart}
        onReconnectEnd={handleReconnectEnd}
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
            {ADDABLE_NODES.map(({ kind, label }) => (
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
              className="bg-neutral-900 px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-neutral-800 transition-colors border-l border-black/12"
            >
              {isRunning ? '■ 停止' : '▶ 執行'}
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
    </NodeWorkflowContext.Provider>
  );
}
