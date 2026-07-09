import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useNodeStatusRing } from './useNodeStatusRing';
import { NodeResultPreview } from './NodeResultPreview';
import { NodeDeleteButton } from './NodeDeleteButton';

export function AnalyzeNode({ id, data, selected }: NodeProps) {
  const ring = useNodeStatusRing(id);
  const onDeleteNode = data?.onDeleteNode;
  const handleDelete = typeof onDeleteNode === 'function'
    ? () => (onDeleteNode as (nodeId: string) => void)(id)
    : undefined;

  return (
    <div className={`group relative border border-black/12 bg-white shadow-sm w-[170px] overflow-visible ${ring}`}>
      <NodeDeleteButton onDelete={handleDelete} selected={selected} />
      <Handle type="target" position={Position.Left} />
      <div className="px-2 py-1 text-[10px] font-semibold text-neutral-500 tracking-wide uppercase border-b border-black/6">
        圖片分析
      </div>
      <div className="px-2 py-2 text-[10px] leading-relaxed text-neutral-400">
        風格 / 光影 / 構圖
      </div>
      <NodeResultPreview id={id} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
