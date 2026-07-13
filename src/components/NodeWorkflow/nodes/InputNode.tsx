import React from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import { useNodeStatusRing } from './useNodeStatusRing';
import { NodeDeleteButton } from './NodeDeleteButton';
import { useNodeWorkflowContext } from '../NodeWorkflowContext';
import { ImagePreviewActions } from './ImagePreviewActions';

/**
 * Input 節點：只顯示圖片或文字本身。
 * 圖片：hover 時底部漸層浮現標籤。
 * 便利貼：上方為拖曳區（Drag Handle），下方為可編輯寫字區。
 * 寫字區支援 resize（右下角三角拉伸），且具備 `nowheel` 類名使內部滾動與畫布縮放獨立。
 */
export function InputNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const ring = useNodeStatusRing(id);
  const { detachImage } = useNodeWorkflowContext();
  const onDeleteNode = data?.onDeleteNode;
  const handleDelete = typeof onDeleteNode === 'function'
    ? () => (onDeleteNode as (nodeId: string) => void)(id)
    : undefined;
  const sourceType = (data?.params as { sourceType?: string } | undefined)?.sourceType;
  const src = typeof data?.src === 'string' ? data.src : '';
  const label = typeof data?.label === 'string' ? data.label : 'Input';
  const isImage = sourceType === 'image';

  if (isImage && src) {
    return (
      <div className={`group/image relative w-[180px] ${ring}`} style={{ background: 'transparent' }}>
        <NodeDeleteButton onDelete={handleDelete} selected={selected} />
        <Handle type="source" position={Position.Right} />
        <img
          src={src}
          alt={label}
          className="block w-full object-contain"
          draggable={false}
        />
        <ImagePreviewActions
          onDelete={handleDelete ? (event) => { event.stopPropagation(); handleDelete(); } : undefined}
          onImport={detachImage ? (event) => { event.stopPropagation(); detachImage(src); } : undefined}
          deleteTitle="刪除圖片節點"
        />
        {/* hover 漸層標籤 */}
        <div
          className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-1.5 opacity-0 group-hover/image:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)', height: '40%' }}
        >
          <span className="text-[10px] font-medium text-white/90 tracking-wide uppercase">{label}</span>
        </div>
      </div>
    );
  }

  // 非圖片（便利貼文字）：
  const noteBgColor = (data?.params as { color?: string } | undefined)?.color || '#FEFCE8';
  
  return (
    <div className={`group relative min-w-[180px] overflow-visible flex flex-col ${ring}`} style={{ backgroundColor: noteBgColor }}>
      <NodeDeleteButton onDelete={handleDelete} selected={selected} />
      <Handle type="source" position={Position.Right} />
      {/* 頂部拖曳手把 (Drag Handle) */}
      <div 
        className="h-[20px] w-full border-b border-black/5 flex items-center justify-between px-2 cursor-grab active:cursor-grabbing select-none shrink-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.03)' }}
      >
        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">便利貼</span>
        <div className="flex gap-0.5">
          <span className="w-1 h-1 rounded-full bg-neutral-300"></span>
          <span className="w-1 h-1 rounded-full bg-neutral-300"></span>
          <span className="w-1 h-1 rounded-full bg-neutral-300"></span>
        </div>
      </div>
      {/* 下方寫字區 — 
          resize: 啟用拉伸 (有右下角斜線三角)
          nodrag: 防止拖曳文字時位移節點
          nowheel: 阻斷滾輪事件傳播，避免在框內滾動時觸發畫布縮放
      */}
      <textarea
        value={src}
        onChange={(e) => updateNodeData(id, { src: e.target.value })}
        placeholder="輸入便利貼內容…"
        className="nodrag nowheel block w-full min-w-[180px] min-h-[120px] resize border-none p-2.5 text-[11px] leading-relaxed text-neutral-800 focus:outline-none focus:ring-0 bg-transparent"
      />
    </div>
  );
}
