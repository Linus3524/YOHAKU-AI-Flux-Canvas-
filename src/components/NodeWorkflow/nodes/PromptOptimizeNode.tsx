import React from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { PromptOptimizeParams } from '../types';
import { useNodeStatusRing } from './useNodeStatusRing';
import { NodeResultPreview } from './NodeResultPreview';
import { NodeDeleteButton } from './NodeDeleteButton';

export function PromptOptimizeNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const ring = useNodeStatusRing(id);
  const params = (data?.params ?? {}) as Partial<PromptOptimizeParams>;
  const onDeleteNode = data?.onDeleteNode;
  const handleDelete = typeof onDeleteNode === 'function'
    ? () => (onDeleteNode as (nodeId: string) => void)(id)
    : undefined;

  const setPrompt = (prompt: string) => {
    updateNodeData(id, { params: { ...params, prompt } });
  };

  return (
    <div className={`group relative border border-black/12 bg-white shadow-sm w-[190px] overflow-visible ${ring}`}>
      <NodeDeleteButton onDelete={handleDelete} selected={selected} />
      <Handle type="target" position={Position.Left} />
      <div className="px-2 py-1 text-[10px] font-semibold text-neutral-500 tracking-wide uppercase border-b border-black/6">
        提示詞優化
      </div>
      <div className="p-1.5">
        <textarea
          value={params.prompt ?? ''}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="輸入想法，或接便利貼…"
          className="nodrag block w-full h-[58px] resize-none border border-neutral-200 px-1.5 py-1 text-[11px] leading-relaxed focus:outline-none focus:border-neutral-400 bg-neutral-50"
        />
      </div>
      <NodeResultPreview id={id} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
