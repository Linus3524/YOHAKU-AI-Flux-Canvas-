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
  // 雙擊畫布空白處的快速搜尋選單
  const [quickSearch, setQuickSearch] = useState<{ sx: number; sy: number; flow: { x: number; y: number } } | null>(null);
  const [quickQuery, setQuickQuery] = useState('');

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
        : { x: 260 + nodes.length * 24, y: 260 };
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
    <div className="absolute inset-0">
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
        <Panel position="top-left">
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
            {/* 模式切換按鈕 */}
            <div className="flex items-center border-l border-r border-black/6 bg-neutral-50 px-1 py-0.5 gap-0.5 select-none">
              <button
                type="button"
                onClick={() => setInteractionMode('pan')}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  interactionMode === 'pan'
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'text-neutral-600 hover:bg-neutral-200'
                }`}
                title="抓手模式 (滑鼠左鍵平移畫布)"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>
                抓手
              </button>
              <button
                type="button"
                onClick={() => setInteractionMode('select')}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  interactionMode === 'select'
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'text-neutral-600 hover:bg-neutral-200'
                }`}
                title="選取模式 (滑鼠左鍵拖曳框選)"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M12.586 12.586 19 19"/><path d="M3.688 3.037a.497.497 0 0 0-.651.651l6.5 15.999a.501.501 0 0 0 .947-.062l1.569-6.083a2 2 0 0 1 1.448-1.479l6.124-1.579a.5 0 0 0 .063-.947z"/></svg>
                選取
              </button>
            </div>
            <button
              type="button"
              onClick={handleRun}
              className="bg-neutral-900 px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-neutral-800 transition-colors tabular-nums"
            >
              {isRunning ? `■ 停止 (${runElapsed.toFixed(1)}s)` : '▶ 執行'}
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
    </div>
    </NodeWorkflowContext.Provider>
  );
}
