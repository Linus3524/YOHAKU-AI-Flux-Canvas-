import React from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { AnalyzeParams } from '../types';
import { useNodeStatusRing } from './useNodeStatusRing';
import { NodeResultPreview } from './NodeResultPreview';
import { NodeDeleteButton } from './NodeDeleteButton';

export function AnalyzeNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const ring = useNodeStatusRing(id);
  const params = (data?.params ?? {}) as Partial<AnalyzeParams>;
  const onDeleteNode = data?.onDeleteNode;
  const handleDelete = typeof onDeleteNode === 'function'
    ? () => (onDeleteNode as (nodeId: string) => void)(id)
    : undefined;

  return (
    <div className={`group relative border border-black/12 bg-white shadow-sm w-[190px] overflow-visible ${ring}`}>
      <NodeDeleteButton onDelete={handleDelete} selected={selected} />
      <Handle type="target" position={Position.Left} />
      <div className="px-2 py-1 text-[10px] font-semibold text-neutral-500 tracking-wide uppercase border-b border-black/6">
        圖片分析
      </div>
      <div className="p-1.5">
        <textarea
          value={params.question ?? ''}
          onChange={(e) => updateNodeData(id, { params: { ...params, question: e.target.value } })}
          placeholder={'想問這張圖什麼？（選填）\n留空：輸出風格／光影／構圖摘要'}
          className="nodrag block w-full h-[52px] resize-none border border-neutral-200 px-1.5 py-1 text-[11px] leading-relaxed focus:outline-none focus:border-neutral-400 bg-neutral-50"
        />
      </div>
      <NodeResultPreview id={id} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
