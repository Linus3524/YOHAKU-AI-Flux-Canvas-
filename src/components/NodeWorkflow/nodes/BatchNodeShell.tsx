import React, { type ReactNode, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useNodeGraphStore } from '../../../store/nodeGraphStore';
import { useNodeWorkflowContext } from '../NodeWorkflowContext';
import { useNodeStatusRing } from './useNodeStatusRing';
import { NodeDeleteButton } from './NodeDeleteButton';
import { ImagePreviewActions } from './ImagePreviewActions';

interface BatchNodeShellProps {
  id: string;
  title: string;
  emptyTitle: string;
  emptyHint: string;
  itemName: string;
  children?: ReactNode;
}

/**
 * 可折疊 Batch 容器節點。
 * 多輸出節點共用：折疊堆疊預覽、展開後 item-N handles、單張拖出、整批匯出。
 */
export function BatchNodeShell({
  id,
  title,
  emptyTitle,
  emptyHint,
  itemName,
  children,
}: BatchNodeShellProps) {
  const ring = useNodeStatusRing(id);
  const items = useNodeGraphStore(s => s.nodeBatchResults[id]);
  const clearNodeResult = useNodeGraphStore(s => s.clearNodeResult);
  const removeNodeBatchResultItem = useNodeGraphStore(s => s.removeNodeBatchResultItem);
  const { detachImage, invalidateOutput } = useNodeWorkflowContext();
  const [expanded, setExpanded] = useState(false);
  const count = items?.length ?? 0;

  if (count === 0) {
    return (
      <div className={`relative w-[168px] bg-white border border-neutral-200 shadow-sm px-3 py-3 text-center ${ring}`}>
        <NodeDeleteButton />
        <Handle type="target" position={Position.Left} />
        <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{emptyTitle}</div>
        <div className="mt-0.5 text-[9px] text-neutral-300">{emptyHint}</div>
        {children ? <div className="nodrag mt-2 text-left">{children}</div> : null}
      </div>
    );
  }

  if (!expanded) {
    return (
      <div className={`group/batch relative w-[172px] bg-white border border-black/12 shadow-sm overflow-hidden ${ring}`}>
        <NodeDeleteButton />
        <Handle type="target" position={Position.Left} />
        <div className="px-2 py-1 flex items-center justify-between border-b border-black/6">
          <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">{title} · {count}</span>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="nodrag text-[10px] font-medium text-indigo-600 hover:text-indigo-700"
          >
            展開 ▾
          </button>
        </div>
        <div className="group/image relative p-3 flex items-center justify-center min-h-[96px]">
          {items!.slice(0, 3).map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`${itemName}-${i}`}
              className="absolute w-[70%] object-contain border border-black/8 bg-neutral-50 shadow-sm"
              style={{ transform: `translate(${(i - 1) * 10}px, ${(i - 1) * 6}px) rotate(${(i - 1) * 3}deg)`, zIndex: 3 - i }}
              draggable={false}
            />
          ))}
          <ImagePreviewActions
            onDelete={(event) => { event.stopPropagation(); clearNodeResult(id); invalidateOutput?.(); }}
            onImport={detachImage ? (event) => { event.stopPropagation(); items!.forEach(src => detachImage(src)); } : undefined}
            deleteTitle="刪除全部圖片結果（保留節點）"
          />
        </div>
        <Handle type="source" position={Position.Right} id="item-0" />
      </div>
    );
  }

  return (
    <div className={`group/batch relative w-[196px] bg-white border border-black/12 shadow-sm overflow-hidden ${ring}`}>
      <NodeDeleteButton />
      <Handle type="target" position={Position.Left} />
      <div className="px-2 py-1 flex items-center justify-between border-b border-black/6">
        <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">{title} · {count}</span>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="nodrag text-[10px] font-medium text-indigo-600 hover:text-indigo-700"
        >
          折疊 ▴
        </button>
      </div>
      <div className="divide-y divide-black/6">
        {items!.map((src, i) => (
          <div key={`${src.slice(0, 32)}-${i}`} className="group/image relative p-2">
            <img
              src={src}
              alt={`${itemName}-${i}`}
              className="block w-full max-h-[150px] object-contain bg-neutral-50 border border-black/8"
              draggable={false}
            />
            <ImagePreviewActions
              onDelete={(event) => {
                event.stopPropagation();
                removeNodeBatchResultItem(id, i);
                invalidateOutput?.();
              }}
              onImport={detachImage ? (event) => { event.stopPropagation(); detachImage(src); } : undefined}
            />
            <span className="pointer-events-none absolute bottom-3 left-3 bg-black/55 px-1.5 py-0.5 text-[9px] text-white backdrop-blur-sm">#{i + 1}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={`item-${i}`}
              style={{ right: -4, top: '50%' }}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => items!.forEach((src, i) => detachImage?.(src, `${itemName} ${i + 1}`))}
        className="nodrag block w-full px-2 py-1.5 text-[10px] font-semibold text-white bg-neutral-900 hover:bg-neutral-800 transition-colors"
      >
        整批匯入主畫布
      </button>
    </div>
  );
}
