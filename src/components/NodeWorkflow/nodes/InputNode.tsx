import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useNodeStatusRing } from './useNodeStatusRing';

/**
 * Input 節點：承載「進入節點工作流時的來源物件」。
 * 圖片 → 顯示縮圖；便利貼 → 顯示文字內容。
 * 這是節點流的起點,讓使用者看得到自己是從哪個物件開始加工。
 */
export function InputNode({ id, data }: NodeProps) {
  const ring = useNodeStatusRing(id);
  const sourceType = (data?.params as { sourceType?: string } | undefined)?.sourceType;
  const src = typeof data?.src === 'string' ? data.src : '';
  const label = typeof data?.label === 'string' ? data.label : 'Input';
  const isImage = sourceType === 'image';

  return (
    <div className={`rounded-xl border border-black/10 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] overflow-hidden w-[160px] ${ring}`}>
      <div className="px-2.5 py-1.5 text-[11px] font-semibold text-gray-500 border-b border-black/5">
        {label}
      </div>
      <div className="p-2">
        {isImage && src ? (
          <img
            src={src}
            alt={label}
            className="block w-full h-[110px] object-contain rounded-md bg-[#F5F5F7]"
            draggable={false}
          />
        ) : (
          <div className="w-full min-h-[80px] max-h-[140px] overflow-hidden rounded-md bg-[#FEFCE8] px-2.5 py-2 text-[11px] leading-relaxed text-[#1D1D1F] whitespace-pre-wrap">
            {src || '（空白內容）'}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
