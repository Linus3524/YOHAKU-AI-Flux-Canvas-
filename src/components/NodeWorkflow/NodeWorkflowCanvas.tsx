import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  addEdge,
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
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
  type NodeChange,
  type OnConnect,
  type OnNodeDrag,
  type EdgeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useNodeGraphStore } from '../../store/nodeGraphStore';
import { Icon } from '../Icon';
import { isImageSrc } from './mediaSrc';
import { NodeWorkflowContext } from './NodeWorkflowContext';
import { ADDABLE_NODES, DEFAULT_NODE_LABELS, NODE_REGISTRY, nodeTypes, type NodeCategory, type NodeIoType } from './nodeRegistry';
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

function sortParentBeforeChildren<T extends { id: string; parentId?: string }>(nodes: T[]): T[] {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const ordered: T[] = [];

  const visit = (node: T) => {
    if (visited.has(node.id)) return;
    if (visiting.has(node.id)) return;
    visiting.add(node.id);
    if (node.parentId) {
      const parent = byId.get(node.parentId);
      if (parent) visit(parent);
    }
    visiting.delete(node.id);
    visited.add(node.id);
    ordered.push(node);
  };

  nodes.forEach(visit);
  return ordered;
}

function getAbsolutePosition(node: FlowNode, nodes: FlowNode[]): { x: number; y: number } {
  let x = node.position.x;
  let y = node.position.y;
  let parentId = node.parentId;
  const visited = new Set<string>();
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = nodes.find(candidate => candidate.id === parentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    parentId = parent.parentId;
  }
  return { x, y };
}

function getNodeSize(node: FlowNode): { width: number; height: number } {
  const styleWidth = typeof node.style?.width === 'number' ? node.style.width : undefined;
  const styleHeight = typeof node.style?.height === 'number' ? node.style.height : undefined;
  return {
    width: node.measured?.width ?? styleWidth ?? 1,
    height: node.measured?.height ?? styleHeight ?? 1,
  };
}

const toFlowNode = (node: GraphNode): FlowNode => {
  const params = node.data.params ?? {};
  const isGroup = node.kind === 'group';
  return {
    id: node.id,
    type: node.kind,
    position: node.position,
    parentId: node.parentId,
    ...(isGroup ? {
      zIndex: 0,
      style: {
        width: typeof params.width === 'number' ? params.width : 360,
        height: typeof params.height === 'number' ? params.height : 240,
      },
    } : {}),
    data: {
      ...node.data,
      label: node.data.label ?? DEFAULT_NODE_LABELS[node.kind],
      kind: node.kind,
    },
  };
};

const toGraphNode = (node: FlowNode): GraphNode => {
  const { kind, label, onDeleteNode, ...restData } = node.data;
  return {
    id: node.id,
    kind,
    position: node.position,
    parentId: node.parentId,
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
  targetHandle: edge.targetHandle ?? undefined,
  type: 'deletable',
  data: { onDelete },
});

const toGraphEdge = (edge: FlowEdge): GraphEdge => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
  sourceHandle: edge.sourceHandle ?? undefined,
  targetHandle: edge.targetHandle ?? undefined,
});

/**
 * 連線型別相容判定：來源節點的 output 型別能否接到目標節點的 input 型別。
 * imageOrText 為萬用（可收 image/text/imageBatch）；image 端不收純 text，text 端不收純 image。
 */
function ioCompatible(sourceOut: NodeIoType, targetIn: NodeIoType): boolean {
  if (targetIn === 'none') return false;                 // 例如 Input 節點沒有輸入端
  if (targetIn === 'imageOrText') return sourceOut !== 'none';
  if (targetIn === 'image') return sourceOut === 'image' || sourceOut === 'imageOrText' || sourceOut === 'imageBatch';
  if (targetIn === 'text') return sourceOut === 'text' || sourceOut === 'imageOrText';
  return false;
}

interface NodeWorkflowCanvasProps {
  /** 把帶圖節點拖到底部拖出區時觸發：新增為大畫布獨立圖片。 */
  onDetachImage?: (src: string, name?: string) => void;
  /** 執行引擎所需的 API key / model 設定（階段 A 本機去背用不到，階段 B 生圖/風格會用）。 */
  engine?: ExecutorEngine;
  /** 執行完成，最終輸出圖 → 回貼大畫布 NodeGroupElement.outputSrc。 */
  onOutputChange?: (src: string) => void;
  /** 工作流拓撲或參數變動後，原先的畫布預覽不再可信，必須失效。 */
  onInvalidateOutput?: () => void;
  /** 執行失敗提示。 */
  onRunError?: (message: string) => void;
}

// 拖到畫面底部這個高度內放開 = 移出到大畫布
const DETACH_ZONE_HEIGHT = 90;
const NODE_CATEGORY_ORDER: NodeCategory[] = ['layout', 'process', 'generate', 'analysis', 'output'];
const NODE_CATEGORY_LABELS: Record<NodeCategory, string> = {
  input: '輸入',
  layout: '版面',
  process: '影像處理',
  generate: '生成資產',
  analysis: '分析文字',
  output: '輸出',
};

export function NodeWorkflowCanvas({ onDetachImage, engine, onOutputChange, onInvalidateOutput, onRunError }: NodeWorkflowCanvasProps) {
  const [interactionMode, setInteractionMode] = useState<'pan' | 'select'>('pan');
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
  const [nodes, setNodes] = useNodesState(
    sortParentBeforeChildren(useNodeGraphStore.getState().nodes.map(toFlowNode)),
  );

  const [edges, setEdges, onEdgesChange] = useEdgesState(
    useNodeGraphStore.getState().edges.map(e => toFlowEdge(e))
  );
  // 只追蹤會改變執行結果的 graph 資料；React Flow 量測尺寸與拖曳位置不會使預覽失效。
  const graphFingerprint = useMemo(() => JSON.stringify({
    nodes: nodes.map(toGraphNode).map(({ id, kind, data }) => ({ id, kind, data })),
    edges: edges.map(toGraphEdge),
  }), [nodes, edges]);
  const graphFingerprintRef = useRef<string | null>(null);
  const groupedAddableNodes = useMemo(() => NODE_CATEGORY_ORDER
    .map(category => ({
      category,
      label: NODE_CATEGORY_LABELS[category],
      nodes: ADDABLE_NODES.filter(node => node.category === category),
    }))
    .filter(group => group.nodes.length > 0), []);

  const handleEdgeDelete = useCallback((edgeId: string) => {
    setEdges(eds => eds.filter(e => e.id !== edgeId));
  }, [setEdges]);

  const handleNodeDelete = useCallback((nodeId: string) => {
    setNodes(nds => {
      const deleting = nds.find(node => node.id === nodeId);
      if (!deleting) return nds;
      const next = nds
        .filter(node => node.id !== nodeId)
        .map(node => {
          if (node.parentId !== nodeId) return node;
          return {
            ...node,
            parentId: undefined,
            position: getAbsolutePosition(node, nds),
          };
        });
      return sortParentBeforeChildren(next);
    });
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
  }, [setNodes, setEdges]);

  const handleNodesChange = useCallback((changes: NodeChange<FlowNode>[]) => {
    const removingIds = new Set(
      changes.filter(change => change.type === 'remove').map(change => change.id),
    );
    setNodes(currentNodes => {
      const prepared = removingIds.size === 0
        ? currentNodes
        : currentNodes.map(node => {
            if (!node.parentId || !removingIds.has(node.parentId)) return node;
            return {
              ...node,
              parentId: undefined,
              position: getAbsolutePosition(node, currentNodes),
            };
          });
      return sortParentBeforeChildren(applyNodeChanges(changes, prepared));
    });
  }, [setNodes]);

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
  // 執行計時（顯示在執行按鈕）
  const [runElapsed, setRunElapsed] = useState(0);
  const runTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // React Flow 實例（雙擊快速搜尋要用 screenToFlowPosition 換算座標）
  const rfInstanceRef = useRef<{ screenToFlowPosition: (p: { x: number; y: number }) => { x: number; y: number } } | null>(null);
  // 記錄最後滑鼠在畫布上的 flow 座標，用於滑鼠在哪點擊就新增在哪裡
  const lastMouseFlowPosRef = useRef<{ x: number; y: number } | null>(null);
  // 「插入圖片」用的隱藏檔案選擇器
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    const inst = rfInstanceRef.current;
    if (inst) {
      lastMouseFlowPosRef.current = inst.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
    }
  }, []);

  const getCanvasCenter = useCallback(() => {
    const inst = rfInstanceRef.current;
    if (!inst) return { x: 260, y: 260 };
    return inst.screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
  }, []);

  // 雙擊畫布空白處的快速搜尋選單
  const [quickSearch, setQuickSearch] = useState<{ sx: number; sy: number; flow: { x: number; y: number } } | null>(null);
  const [quickQuery, setQuickQuery] = useState('');

  // 右鍵選單狀態
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: 'pane' | 'node';
    nodeId?: string;
  } | null>(null);

  // 關閉右鍵選單
  useEffect(() => {
    if (!contextMenu) return;
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [contextMenu]);

  const handlePaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    const inst = rfInstanceRef.current;
    if (!inst) {
      setContextMenu({ x: event.clientX, y: event.clientY, type: 'pane' });
      return;
    }
    const flowPos = inst.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    
    // 尋找包含此座標的 group 節點
    const containingGroup = nodes.find(n => {
      if (n.type !== 'group') return false;
      const width = n.style?.width ?? n.measured?.width ?? 360;
      const height = n.style?.height ?? n.measured?.height ?? 240;
      const x1 = n.position.x;
      const y1 = n.position.y;
      const x2 = x1 + (typeof width === 'number' ? width : 360);
      const y2 = y1 + (typeof height === 'number' ? height : 240);
      return flowPos.x >= x1 && flowPos.x <= x2 && flowPos.y >= y1 && flowPos.y <= y2;
    });

    if (containingGroup) {
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        type: 'node',
        nodeId: containingGroup.id,
      });
    } else {
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        type: 'pane',
      });
    }
  }, [nodes]);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: any) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'node',
      nodeId: node.id,
    });
  }, []);

  const handleCopyNode = useCallback((nodeId: string) => {
    const nodeToCopy = nodes.find(n => n.id === nodeId);
    if (!nodeToCopy) return;
    const newId = `${nodeToCopy.data.kind}-${Date.now()}`;
    const newPosition = { x: nodeToCopy.position.x + 40, y: nodeToCopy.position.y + 40 };
    const graphNode: GraphNode = {
      id: newId,
      kind: nodeToCopy.data.kind as NodeKind,
      position: newPosition,
      parentId: nodeToCopy.parentId,
      data: {
        label: nodeToCopy.data.label,
        params: JSON.parse(JSON.stringify(nodeToCopy.data.params || {})),
      }
    };
    const flowNode = toFlowNode(graphNode);
    setNodes(nds => sortParentBeforeChildren([
      ...nds.map(n => ({ ...n, selected: false })),
      { ...flowNode, data: { ...flowNode.data, onDeleteNode: handleNodeDelete }, selected: true }
    ]));
  }, [nodes, setNodes, handleNodeDelete]);

  const handleDownloadResult = useCallback((resultSrc: string, label?: string) => {
    if (!resultSrc) return;
    const link = document.createElement('a');
    link.href = resultSrc;
    link.download = `${label || '結果圖片'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

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
    // 執行流動動畫：把所有連線設為 animated（animated 不進 graphFingerprint，不會使預覽失效）
    setEdges(eds => eds.map(e => (e.animated ? e : { ...e, animated: true })));
    // 執行計時
    const startedAt = Date.now();
    setRunElapsed(0);
    if (runTimerRef.current) clearInterval(runTimerRef.current);
    runTimerRef.current = setInterval(() => setRunElapsed((Date.now() - startedAt) / 1000), 100);

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
      // 收掉流動動畫與計時器
      setEdges(eds => eds.map(e => (e.animated ? { ...e, animated: false } : e)));
      if (runTimerRef.current) { clearInterval(runTimerRef.current); runTimerRef.current = null; }
    }
  }, [isRunning, resetRuntime, resetRunningStatuses, nodes, edges, engine, setNodes, setEdges, setNodeStatus, setNodeResult, setNodeBatchResult, onOutputChange, onRunError]);

  // 卸載時清掉計時器
  useEffect(() => () => { if (runTimerRef.current) clearInterval(runTimerRef.current); }, []);

  // ── 歷史記錄（Undo / Redo）─────────────────────────────────────────
  // 以「拓撲 + 位置 + 參數」為觸發依據（排除選取/量測/拖曳中間態），debounce 後快照。
  // 快照存的是完整 FlowNode/FlowEdge（含 measured 尺寸），還原時不會破壞 measured 同步。
  type HistorySnapshot = { nodes: FlowNode[]; edges: FlowEdge[] };
  const historyPast = useRef<HistorySnapshot[]>([]);
  const historyFuture = useRef<HistorySnapshot[]>([]);
  const committedSnapshot = useRef<HistorySnapshot | null>(null);
  const isRestoring = useRef(false);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const historyFingerprint = useMemo(() => JSON.stringify({
    n: nodes.map(n => ({ id: n.id, k: n.data.kind, p: n.position, parentId: n.parentId, d: n.data.params })),
    e: edges.map(e => ({ id: e.id, s: e.source, t: e.target, sh: e.sourceHandle, th: e.targetHandle })),
  }), [nodes, edges]);

  useEffect(() => {
    if (committedSnapshot.current === null) {
      committedSnapshot.current = { nodes, edges };
      return;
    }
    if (isRestoring.current) {
      isRestoring.current = false;
      committedSnapshot.current = { nodes, edges };
      return;
    }
    if (commitTimer.current) clearTimeout(commitTimer.current);
    const snapshotNodes = nodes;
    const snapshotEdges = edges;
    commitTimer.current = setTimeout(() => {
      if (committedSnapshot.current) {
        historyPast.current.push(committedSnapshot.current);
        if (historyPast.current.length > 60) historyPast.current.shift();
        historyFuture.current = [];
      }
      committedSnapshot.current = { nodes: snapshotNodes, edges: snapshotEdges };
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyFingerprint]);

  const undo = useCallback(() => {
    if (!historyPast.current.length) return;
    if (commitTimer.current) clearTimeout(commitTimer.current);
    const prev = historyPast.current.pop()!;
    historyFuture.current.push(committedSnapshot.current ?? { nodes, edges });
    isRestoring.current = true;
    committedSnapshot.current = prev;
    setNodes(sortParentBeforeChildren(prev.nodes));
    setEdges(prev.edges);
  }, [nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (!historyFuture.current.length) return;
    if (commitTimer.current) clearTimeout(commitTimer.current);
    const next = historyFuture.current.pop()!;
    historyPast.current.push(committedSnapshot.current ?? { nodes, edges });
    isRestoring.current = true;
    committedSnapshot.current = next;
    setNodes(sortParentBeforeChildren(next.nodes));
    setEdges(next.edges);
  }, [nodes, edges, setNodes, setEdges]);

  // ── 複製 / 貼上 ───────────────────────────────────────────────────
  const clipboardRef = useRef<HistorySnapshot>({ nodes: [], edges: [] });

  const copySelection = useCallback(() => {
    // Input 節點是唯一來源，不複製；其餘選中的節點連同其內部連線一起複製。
    const sel = nodes.filter(n => n.selected && n.data.kind !== 'input');
    if (!sel.length) return;
    const selIds = new Set(sel.map(n => n.id));
    const internalEdges = edges.filter(e => selIds.has(e.source) && selIds.has(e.target));
    clipboardRef.current = { nodes: sel, edges: internalEdges };
  }, [nodes, edges]);

  const paste = useCallback(() => {
    const { nodes: cn, edges: ce } = clipboardRef.current;
    if (!cn.length) return;
    const now = Date.now();
    const idMap = new Map<string, string>();
    const newNodes = cn.map((n, i) => {
      const nid = `${n.data.kind}-${now}-${i}`;
      idMap.set(n.id, nid);
      return {
        ...n,
        id: nid,
        parentId: n.parentId ? idMap.get(n.parentId) ?? n.parentId : undefined,
        position: { x: n.position.x + 48, y: n.position.y + 48 },
        selected: true,
        data: { ...n.data, onDeleteNode: handleNodeDelete },
      } as FlowNode;
    });
    const newEdges = ce.map((e, i) => ({
      ...e,
      id: `edge-paste-${now}-${i}`,
      source: idMap.get(e.source)!,
      target: idMap.get(e.target)!,
      type: 'deletable',
      data: { onDelete: handleEdgeDelete },
    })) as FlowEdge[];
    setNodes(nds => sortParentBeforeChildren([...nds.map(n => ({ ...n, selected: false })), ...newNodes]));
    if (newEdges.length) setEdges(eds => [...eds, ...newEdges]);
  }, [setNodes, setEdges, handleNodeDelete, handleEdgeDelete]);

  // ── 鍵盤快捷鍵 ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (key === 'y') { e.preventDefault(); redo(); }
      else if (key === 'c') { copySelection(); }
      else if (key === 'v') { e.preventDefault(); paste(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, copySelection, paste]);

  useEffect(() => {
    if (graphFingerprintRef.current === null) {
      graphFingerprintRef.current = graphFingerprint;
      return;
    }
    if (graphFingerprintRef.current !== graphFingerprint) {
      graphFingerprintRef.current = graphFingerprint;
      onInvalidateOutput?.();
    }
  }, [graphFingerprint, onInvalidateOutput]);

  // 把本地編輯結果鏡像回 store，讓關閉時 exportGraph() 拿到最新拓撲（存回 NodeGroupElement）。
  useEffect(() => {
    replaceGraph({
      nodes: nodes.map(toGraphNode),
      edges: edges.map(toGraphEdge),
    });
  }, [nodes, edges, replaceGraph]);

  // 智慧連線驗證：依 nodeRegistry 的 I/O 型別擋掉非法連線（如 text → image），
  // React Flow 會在拖線時即時把不相容的連線標紅並禁止釋放。
  const isValidConnection = useCallback((connection: Connection | Edge): boolean => {
    if (connection.source === connection.target) return false; // 禁止自連
    const source = nodes.find(n => n.id === connection.source);
    const target = nodes.find(n => n.id === connection.target);
    if (!source || !target) return false;
    const sourceEntry = NODE_REGISTRY[source.data.kind as NodeKind];
    const targetEntry = NODE_REGISTRY[target.data.kind as NodeKind];
    if (!sourceEntry || !targetEntry) return true; // 未知節點 → 放行（fail-open，不擋既有功能）
    return ioCompatible(sourceEntry.output, targetEntry.input);
  }, [nodes]);

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

  // 加節點：
  // - 不給 dropPosition：接在選中節點後面並自動連線（連點成鏈，免拉線）。
  // - 給 dropPosition（雙擊快速搜尋）：放在游標處，不自動連線。
  const addNode = useCallback((kind: NodeKind, dropPosition?: { x: number; y: number }) => {
    // 只接「明確選中」的節點；沒選中就只放節點、不自動連線（避免使用者以為沒接卻被連上）。
    // 新節點加入後會被設為 selected，所以「連點成鏈」仍然順暢。
    const selected = dropPosition ? undefined : nodes.find(n => n.selected);
    const id = `${kind}-${Date.now()}`;
    const position = dropPosition
      ? dropPosition
      : selected
        ? { x: selected.position.x + 240, y: selected.position.y }
        : (lastMouseFlowPosRef.current ?? getCanvasCenter());
    const parentId = kind !== 'group' ? selected?.parentId : undefined;
    const params = kind === 'group'
      ? { label: '節點框組', color: '#6366f1', width: 360, height: 240 }
      : {};
    const graphNode: GraphNode = { id, kind, position, parentId, data: { label: DEFAULT_NODE_LABELS[kind], params } };
    const flowNode = toFlowNode(graphNode);
    setNodes(nds => sortParentBeforeChildren([
      ...nds.map(n => ({ ...n, selected: false })),
      { ...flowNode, data: { ...flowNode.data, onDeleteNode: handleNodeDelete }, selected: true },
    ]));
    const canAutoConnect = !!selected
      && NODE_REGISTRY[selected.data.kind].output !== 'none'
      && NODE_REGISTRY[kind].input !== 'none';
    if (selected && canAutoConnect) {
      setEdges(eds => addEdge({
        id: `edge-${selected.id}-${id}`,
        source: selected.id,
        target: id,
        type: 'deletable',
        data: { onDelete: handleEdgeDelete }
      }, eds));
    }
  }, [nodes, setNodes, setEdges, handleEdgeDelete, handleNodeDelete]);

  // 插入圖片：把上傳的圖建成一個 input 圖片節點，供合成/多參考圖使用。
  const insertImageNode = useCallback((src: string, name?: string) => {
    const id = `input-${Date.now()}`;
    const position = lastMouseFlowPosRef.current ?? getCanvasCenter();
    const graphNode: GraphNode = {
      id,
      kind: 'input',
      position,
      data: { label: name || '插入圖片', src, params: { sourceType: 'image' } },
    };
    const flowNode = toFlowNode(graphNode);
    setNodes(nds => sortParentBeforeChildren([
      ...nds.map(n => ({ ...n, selected: false })),
      { ...flowNode, data: { ...flowNode.data, onDeleteNode: handleNodeDelete }, selected: true },
    ]));
  }, [setNodes, handleNodeDelete]);

  const handleImageFilePick = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // 允許連續選同一張
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') insertImageNode(reader.result, file.name);
    };
    reader.readAsDataURL(file);
  }, [insertImageNode]);

  // 雙擊畫布空白處 → 在游標位置彈出快速搜尋（點在節點/控制項/工具列上不觸發）
  const handlePaneDoubleClick = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (
      target.closest('.react-flow__node') ||
      target.closest('.react-flow__controls') ||
      target.closest('.react-flow__minimap') ||
      target.closest('.react-flow__panel')
    ) return;
    const flow = rfInstanceRef.current?.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      ?? { x: 0, y: 0 };
    setQuickQuery('');
    setQuickSearch({ sx: event.clientX, sy: event.clientY, flow });
  }, []);

  const quickSearchResults = useMemo(() => {
    const q = quickQuery.trim().toLowerCase();
    return ADDABLE_NODES.filter(n => !q || n.label.toLowerCase().includes(q) || n.kind.toLowerCase().includes(q));
  }, [quickQuery]);

  const pickQuickNode = useCallback((kind: NodeKind) => {
    if (quickSearch) addNode(kind, quickSearch.flow);
    setQuickSearch(null);
  }, [quickSearch, addNode]);

  const handleNodeDragStart: OnNodeDrag<FlowNode> = useCallback(() => {
    setIsDraggingNode(true);
  }, []);

  const handleNodeDragStop: OnNodeDrag<FlowNode> = useCallback((event, node) => {
    setIsDraggingNode(false);
    // 落點在底部拖出區內 → 移出到大畫布。
    const clientY = 'clientY' in event ? event.clientY : (event as MouseEvent).clientY;
    const inDetachZone = typeof clientY === 'number' && clientY > window.innerHeight - DETACH_ZONE_HEIGHT;
    if (inDetachZone) {
      if (onDetachImage) {
        // 判定只依螢幕座標；子節點的相對 position 不影響底部拖出。
        const inlineSrc = typeof node.data?.src === 'string' ? node.data.src : '';
        const resultSrc = useNodeGraphStore.getState().nodeResults[node.id] ?? '';
        const src = isImageSrc(inlineSrc) ? inlineSrc : (isImageSrc(resultSrc) ? resultSrc : '');
        if (src) {
          const label = typeof node.data?.label === 'string' ? node.data.label : undefined;
          onDetachImage(src, label);
        }
      }
      return;
    }

    if (node.data.kind === 'group') return;
    setNodes(currentNodes => {
      const current = currentNodes.find(candidate => candidate.id === node.id);
      if (!current) return currentNodes;
      const dragged = { ...current, position: node.position, parentId: node.parentId };
      const absolute = getAbsolutePosition(dragged, currentNodes);
      const size = getNodeSize(dragged);
      const center = { x: absolute.x + size.width / 2, y: absolute.y + size.height / 2 };
      const targetGroup = [...currentNodes].reverse().find(candidate => {
        if (candidate.data.kind !== 'group' || candidate.id === node.id) return false;
        const groupPosition = getAbsolutePosition(candidate, currentNodes);
        const groupSize = getNodeSize(candidate);
        return center.x >= groupPosition.x
          && center.x <= groupPosition.x + groupSize.width
          && center.y >= groupPosition.y
          && center.y <= groupPosition.y + groupSize.height;
      });

      if (targetGroup?.id === dragged.parentId) return currentNodes;
      const targetPosition = targetGroup
        ? (() => {
            const parentAbsolute = getAbsolutePosition(targetGroup, currentNodes);
            return { x: absolute.x - parentAbsolute.x, y: absolute.y - parentAbsolute.y };
          })()
        : absolute;
      return sortParentBeforeChildren(currentNodes.map(candidate => (
        candidate.id === node.id
          ? { ...candidate, position: targetPosition, parentId: targetGroup?.id }
          : candidate
      )));
    });
  }, [onDetachImage, setNodes]);

  return (
    <NodeWorkflowContext.Provider value={{ detachImage: onDetachImage }}>
    <div className="absolute inset-0" onMouseMove={handleMouseMove}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onReconnect={handleReconnect}
        onReconnectStart={handleReconnectStart}
        onReconnectEnd={handleReconnectEnd}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onInit={(inst) => { rfInstanceRef.current = inst; }}
        onDoubleClick={handlePaneDoubleClick}
        onPaneContextMenu={handlePaneContextMenu}
        onNodeContextMenu={handleNodeContextMenu}
        zoomOnDoubleClick={false}
        isValidConnection={isValidConnection}
        snapToGrid
        snapGrid={[15, 15]}
        fitView
        fitViewOptions={{ padding: 0.28, maxZoom: 1 }}
        minZoom={0.1}
        maxZoom={4}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        nodesSelectable={true}
        panOnDrag={interactionMode === 'pan' ? true : [1, 2]}
        selectionOnDrag={interactionMode === 'select'}
        selectionMode="partial"
        className={`node-workflow-flow bg-[#f8fafc] ${interactionMode === 'pan' ? 'mode-pan' : 'mode-select'}`}
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
          /* Group 框組節點：去除 React Flow 預設的背景/邊框/陰影，維持自訂尺寸縮放 */
          .node-workflow-flow .react-flow__node-group {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .node-workflow-flow .react-flow__node.selected:not(.react-flow__node-group),
          .node-workflow-flow .react-flow__node:focus:not(.react-flow__node-group),
          .node-workflow-flow .react-flow__node:focus-visible:not(.react-flow__node-group) {
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
          
          /* 抓手模式游標 */
          .node-workflow-flow.mode-pan,
          .node-workflow-flow.mode-pan .react-flow__pane {
            cursor: grab !important;
          }
          .node-workflow-flow.mode-pan:active,
          .node-workflow-flow.mode-pan .react-flow__pane:active {
            cursor: grabbing !important;
          }
          
          /* 選取模式游標 */
          .node-workflow-flow.mode-select,
          .node-workflow-flow.mode-select .react-flow__pane {
            cursor: crosshair !important;
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
          .node-toolbar-summary::-webkit-details-marker {
            display: none;
          }
          /* 執行時連線流動動畫 */
          .node-workflow-flow .react-flow__edge.animated .react-flow__edge-path {
            stroke: #007AFF;
            stroke-dasharray: 5;
            animation: nw-edge-flow 0.55s linear infinite;
          }
          @keyframes nw-edge-flow {
            to { stroke-dashoffset: -10; }
          }
        `}</style>
        <Background color="#cbd5e1" gap={28} size={1.2} />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap position="bottom-right" pannable zoomable nodeStrokeWidth={2} />
        <Panel position="top-left" className="flex items-center gap-2">
          {/* 模式切換按鈕：獨立控制框 */}
          <div className="flex items-center border border-black/12 bg-white shadow-sm p-0.5 gap-0.5 select-none">
            <button
              type="button"
              onClick={() => setInteractionMode('pan')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                interactionMode === 'pan'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
              title="抓手模式 (滑鼠左鍵平移畫布)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', overflow: 'visible' }}><path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>
              抓手
            </button>
            <button
              type="button"
              onClick={() => setInteractionMode('select')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                interactionMode === 'select'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
              title="選取模式 (滑鼠左鍵拖曳框選)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', overflow: 'visible' }}><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>
              選取
            </button>
          </div>

          {/* 插入圖片：把外部圖片加入工作流（供合成／多參考圖） */}
          <div className="flex items-center border border-black/12 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => imageFileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
              title="插入圖片到工作流（可接生圖節點做合成）"
            >
              <Icon name="add_photo_alternate" size={15} />
              插入圖片
            </button>
          </div>

          {/* 節點分類選單與執行按鈕 */}
          <div className="flex items-center gap-px border border-black/12 bg-white shadow-sm">
            {groupedAddableNodes.map(group => (
              <details key={group.category} className="relative">
                <summary className="node-toolbar-summary list-none px-3 py-1.5 text-[12px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors border-r border-black/6 cursor-pointer select-none">
                  {group.label} ▾
                </summary>
                <div className="absolute left-0 top-full z-20 mt-1 min-w-[132px] border border-black/12 bg-white shadow-lg py-1">
                  {group.nodes.map(({ kind, label }) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={(event) => {
                        addNode(kind);
                        event.currentTarget.closest('details')?.removeAttribute('open');
                      }}
                      className="block w-full px-3 py-1.5 text-left text-[12px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors whitespace-nowrap"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </details>
            ))}
            <button
              type="button"
              onClick={handleRun}
              className="bg-neutral-900 px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-neutral-800 transition-colors border-l border-black/12 tabular-nums"
            >
              {isRunning ? `■ 停止 (${runElapsed.toFixed(1)}s)` : '▶ 執行'}
            </button>
          </div>
        </Panel>
      </ReactFlow>
      {/* 插入圖片用的隱藏檔案選擇器 */}
      <input
        ref={imageFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFilePick}
      />
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
      {/* 雙擊畫布空白處的快速搜尋選單 */}
      {quickSearch && (
        <>
          <div className="fixed inset-0 z-[7050]" onClick={() => setQuickSearch(null)} />
          <div
            className="fixed z-[7060] w-[184px] border border-black/15 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.16)]"
            style={{ left: quickSearch.sx, top: quickSearch.sy }}
          >
            <input
              autoFocus
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && quickSearchResults[0]) pickQuickNode(quickSearchResults[0].kind);
                if (e.key === 'Escape') setQuickSearch(null);
              }}
              placeholder="搜尋節點…"
              className="block w-full border-b border-black/8 px-2 py-1.5 text-[12px] focus:outline-none"
            />
            <div className="max-h-[220px] overflow-y-auto py-1">
              {quickSearchResults.length === 0 ? (
                <div className="px-2 py-1.5 text-[11px] text-neutral-400">無符合節點</div>
              ) : (
                quickSearchResults.map((n) => (
                  <button
                    key={n.kind}
                    type="button"
                    onClick={() => pickQuickNode(n.kind)}
                    className="block w-full px-2 py-1.5 text-left text-[12px] text-neutral-700 hover:bg-neutral-100 transition-colors"
                  >
                    {n.label}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* 右鍵選單 */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-[8000]"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          />
          <div
            className="fixed z-[8010] min-w-[152px] border border-black bg-white py-1.5 pointer-events-auto select-none rounded-none shadow-none"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* A. 畫布空白處右鍵選單 */}
            {contextMenu.type === 'pane' && (
              <div className="flex flex-col">
                {/* 新增節點項目 (帶 Hover 子選單) */}
                <div className="group/submenu relative">
                  <button
                    type="button"
                    className="w-full flex justify-between items-center text-left px-3 py-1.5 text-[11px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon name="add" size={13} />
                      <span>新增節點</span>
                    </div>
                    <Icon name="chevron_right" size={10} className="text-neutral-400" />
                  </button>
                  {/* 子選單 */}
                  <div className="absolute left-full top-0 ml-0.5 hidden group-hover/submenu:block min-w-[164px] border border-black bg-white py-1.5 max-h-[360px] overflow-y-auto rounded-none shadow-none">
                    {[
                      { key: 'generate', label: 'AI 生成' },
                      { key: 'process', label: '影像處理' },
                      { key: 'analysis', label: '分析優化' },
                      { key: 'layout-output', label: '版面與輸出' },
                    ].map((cat) => {
                      const matched = ADDABLE_NODES.filter((n) => {
                        if (cat.key === 'layout-output') return n.category === 'layout' || n.category === 'output';
                        return n.category === cat.key;
                      });
                      if (matched.length === 0) return null;
                      return (
                        <div key={cat.key}>
                          <div className="px-3 py-0.5 text-[9px] font-bold text-neutral-400 uppercase tracking-wider mt-1 first:mt-0">
                            {cat.label}
                          </div>
                          {matched.map((n) => (
                            <button
                              key={n.kind}
                              type="button"
                              onClick={() => {
                                const flowPos = rfInstanceRef.current?.screenToFlowPosition({
                                  x: contextMenu.x,
                                  y: contextMenu.y,
                                });
                                addNode(n.kind as any, flowPos);
                                setContextMenu(null);
                              }}
                              className="w-full flex items-center gap-1.5 px-4 py-1 text-left text-[11px] text-neutral-700 hover:bg-neutral-100 transition-colors"
                            >
                              <span>{n.label}</span>
                            </button>
                          ))}
                          <div className="border-t border-neutral-200 my-1 last:hidden" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-neutral-200 my-1" />

                {/* 執行/停止項目 */}
                <button
                  type="button"
                  onClick={() => {
                    handleRun();
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left text-[11px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  <Icon name={isRunning ? 'stop' : 'play_arrow'} size={13} className={isRunning ? 'text-red-500' : 'text-green-600'} />
                  <span>{isRunning ? '停止執行' : '執行工作流'}</span>
                </button>
              </div>
            )}

            {/* B. 節點右鍵選單 */}
            {contextMenu.type === 'node' && (() => {
              const targetNode = nodes.find(n => n.id === contextMenu.nodeId);
              if (!targetNode) return null;
              const showColorPicker = targetNode.data.kind === 'group' || targetNode.data.kind === 'note';
              const resultSrc = useNodeGraphStore.getState().nodeResults[targetNode.id];
              const hasImgResult = resultSrc && isImageSrc(resultSrc);

              return (
                <div className="flex flex-col">
                  {/* 如果是框組 (group) 或便利貼 (note) 節點，最上方顯示色票 */}
                  {showColorPicker && (
                    <>
                      <div className="px-3 py-0.5 text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                        變更色票顏色
                      </div>
                      <div className="px-3 pb-1.5 flex gap-2">
                        {['#FFFDE7', '#E3F2FD', '#E8F5E9', '#FFEBEE', '#F3E5F5', '#FFF3E0', '#F5F5F7', '#FFFFFF'].map(nextColor => (
                          <div
                            key={nextColor}
                            onClick={() => {
                              setNodes(nds => nds.map(n => n.id === targetNode.id ? {
                                ...n,
                                data: {
                                  ...n.data,
                                  params: { ...(n.data?.params || {}), color: nextColor }
                                }
                              } : n));
                              setContextMenu(null);
                            }}
                            className={`h-6 w-6 rounded-none border cursor-pointer transition-transform hover:scale-110 active:scale-95 ${
                              (targetNode.data?.params as any)?.color === nextColor ? 'border-black ring-1 ring-black' : 'border-neutral-200'
                            }`}
                            style={{ backgroundColor: nextColor }}
                            title={`變更為此顏色`}
                          />
                        ))}
                      </div>
                      <div className="border-t border-neutral-200 my-1" />
                    </>
                  )}

                  {/* 複製 */}
                  {targetNode.data.kind !== 'group' && (
                    <button
                      type="button"
                      onClick={() => {
                        handleCopyNode(targetNode.id);
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left text-[11px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                    >
                      <Icon name="content_copy" size={13} />
                      <span>複製{targetNode.data.kind === 'note' ? '便利貼' : '節點'}</span>
                    </button>
                  )}

                  {/* 匯入大畫布 (如果有結果) */}
                  {hasImgResult && onDetachImage && (
                    <button
                      type="button"
                      onClick={() => {
                        onDetachImage(resultSrc, targetNode.data.label);
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left text-[11px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                    >
                      <Icon name="add_photo_alternate" size={13} />
                      <span>匯入圖片到大畫布</span>
                    </button>
                  )}

                  {/* 下載圖片 (如果有結果) */}
                  {hasImgResult && (
                    <button
                      type="button"
                      onClick={() => {
                        handleDownloadResult(resultSrc, targetNode.data.label);
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left text-[11px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                    >
                      <Icon name="download" size={13} />
                      <span>下載結果圖片</span>
                    </button>
                  )}

                  {/* 刪除 */}
                  <button
                    type="button"
                    onClick={() => {
                      handleNodeDelete(targetNode.id);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left text-[11px] font-medium text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Icon name="delete" size={13} />
                    <span>刪除{targetNode.data.kind === 'group' ? '框組' : targetNode.data.kind === 'note' ? '便利貼' : '節點'}</span>
                  </button>
                </div>
              );
            })()}
          </div>
        </>
      )}
    </div>
    </NodeWorkflowContext.Provider>
  );
}
