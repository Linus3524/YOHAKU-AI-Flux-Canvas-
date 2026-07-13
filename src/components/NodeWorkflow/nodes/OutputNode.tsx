import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useNodeStatusRing } from './useNodeStatusRing';
import { useNodeGraphStore } from '../../../store/nodeGraphStore';
import { isImageSrc } from '../mediaSrc';
import { NodeDeleteButton } from './NodeDeleteButton';
import { useNodeWorkflowContext } from '../NodeWorkflowContext';
import { ImagePreviewActions } from './ImagePreviewActions';

/**
 * Output 節點：只顯示最終輸出結果。
 * 沒有結果時顯示一個乾淨簡潔的方塊。
 * 有結果時，若是圖片則直接滿版無框顯示，hover 時浮現標籤。
 */
export function OutputNode({ id, data, selected }: NodeProps) {
  const ring = useNodeStatusRing(id);
  const result = useNodeGraphStore(s => s.nodeResults[id]);
  const clearNodeResult = useNodeGraphStore(s => s.clearNodeResult);
  const { detachImage, invalidateOutput } = useNodeWorkflowContext();
  const isImage = isImageSrc(result);
  const onDeleteNode = data?.onDeleteNode;
  const handleDelete = typeof onDeleteNode === 'function'
    ? () => (onDeleteNode as (nodeId: string) => void)(id)
    : undefined;

  if (result && isImage) {
    return (
      <div className={`group/image relative w-[180px] ${ring}`} style={{ background: 'transparent' }}>
        <NodeDeleteButton onDelete={handleDelete} selected={selected} />
        <Handle type="target" position={Position.Left} />
        <img
          src={result}
          alt="Output"
          className="block w-full object-contain"
          draggable={false}
        />
        <ImagePreviewActions
          onDelete={(event) => {
            event.stopPropagation();
            clearNodeResult(id);
            invalidateOutput?.();
          }}
          onImport={detachImage ? (event) => { event.stopPropagation(); detachImage(result); } : undefined}
          deleteTitle="刪除圖片結果（保留節點）"
        />
        {/* hover 漸層標籤 */}
        <div
          className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-1.5 opacity-0 group-hover/image:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)', height: '40%' }}
        >
          <span className="text-[10px] font-medium text-white/90 tracking-wide uppercase">Output Result</span>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className={`group relative w-[180px] bg-[#FEFCE8] border border-black/8 overflow-visible ${ring}`}>
        <NodeDeleteButton onDelete={handleDelete} selected={selected} />
        <Handle type="target" position={Position.Left} />
        <div className="px-2.5 py-2 text-[11px] leading-relaxed text-neutral-800 whitespace-pre-wrap">
          {result}
        </div>
      </div>
    );
  }

  // 預設無結果狀態：簡潔無多餘圓角方框
  return (
    <div className={`group relative w-[140px] bg-white border border-neutral-200 shadow-sm px-3 py-3 text-center ${ring}`}>
      <NodeDeleteButton onDelete={handleDelete} selected={selected} />
      <Handle type="target" position={Position.Left} />
      <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
        結果輸出
      </div>
    </div>
  );
}
