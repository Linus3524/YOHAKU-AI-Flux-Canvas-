import React from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { InpaintParams } from '../types';
import { useNodeStatusRing } from './useNodeStatusRing';
import { NodeResultPreview } from './NodeResultPreview';
import { NodeDeleteButton } from './NodeDeleteButton';

export function InpaintNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const ring = useNodeStatusRing(id);
  const params = (data?.params ?? {}) as Partial<InpaintParams>;
  const onDeleteNode = data?.onDeleteNode;
  const handleDelete = typeof onDeleteNode === 'function' ? () => (onDeleteNode as (nodeId: string) => void)(id) : undefined;
  return (
    <div className={`group relative border border-black/12 bg-white shadow-sm w-[210px] overflow-visible ${ring}`}>
      <NodeDeleteButton onDelete={handleDelete} selected={selected} />
      <Handle id="image" type="target" position={Position.Left} style={{ top: 42 }} />
      <span className="absolute right-full mr-1.5 top-[35px] text-[9px] text-neutral-500 bg-white px-1">原圖</span>
      <Handle id="mask" type="target" position={Position.Left} style={{ top: 78 }} />
      <span className="absolute right-full mr-1.5 top-[71px] text-[9px] text-neutral-500 bg-white px-1">遮罩</span>
      <Handle id="reference" type="target" position={Position.Left} style={{ top: 112 }} />
      <span className="absolute right-full mr-1.5 top-[105px] text-[9px] text-neutral-500 bg-white px-1">參考</span>
      <div className="px-2 py-1 text-[10px] font-semibold text-neutral-500 uppercase border-b border-black/6">AI 局部重繪</div>
      <div className="p-2 space-y-1.5">
        <textarea className="nodrag w-full h-16 resize-none border border-neutral-200 p-1.5 text-[11px]" placeholder="描述白色遮罩區域要改成什麼…" value={params.prompt ?? ''} onChange={e => updateNodeData(id, { params: { ...params, prompt: e.target.value } })} />
        <p className="text-[9px] text-neutral-400 leading-snug">遮罩：白色＝重繪，黑色＝保留。可接最多 6 張額外參考圖。</p>
      </div>
      <NodeResultPreview id={id} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
