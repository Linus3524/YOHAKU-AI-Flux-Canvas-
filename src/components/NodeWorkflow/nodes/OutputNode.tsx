import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

/**
 * Output 節點：節點鏈最終輸出的落點。
 * #1 只顯示占位（或已有的 outputSrc 縮圖）；真正的執行結果由 #3 執行引擎寫入。
 */
export function OutputNode({ data }: NodeProps) {
  const src = typeof data?.src === 'string' ? data.src : '';
  const label = typeof data?.label === 'string' ? data.label : 'Output';

  return (
    <div className="rounded-xl border border-black/10 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] overflow-hidden w-[160px]">
      <Handle type="target" position={Position.Left} />
      <div className="px-2.5 py-1.5 text-[11px] font-semibold text-gray-500 border-b border-black/5">
        {label}
      </div>
      <div className="p-2">
        {src ? (
          <img
            src={src}
            alt={label}
            className="block w-full h-[110px] object-contain rounded-md bg-[#F5F5F7]"
            draggable={false}
          />
        ) : (
          <div className="w-full h-[110px] rounded-md bg-[#F5F5F7] flex items-center justify-center text-[11px] text-gray-400">
            尚未輸出
          </div>
        )}
      </div>
    </div>
  );
}
