import React from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { AdjustmentsParams } from '../types';
import { useNodeStatusRing } from './useNodeStatusRing';
import { NodeResultPreview } from './NodeResultPreview';
import { NodeDeleteButton } from './NodeDeleteButton';

const controls: { key: keyof AdjustmentsParams; label: string; min: number; max: number; initial: number }[] = [
  { key: 'brightness', label: '亮度', min: 0, max: 200, initial: 100 },
  { key: 'contrast', label: '對比', min: 0, max: 200, initial: 100 },
  { key: 'saturation', label: '飽和', min: 0, max: 200, initial: 100 },
  { key: 'temperature', label: '色溫', min: -100, max: 100, initial: 0 },
];

export function AdjustmentsNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const ring = useNodeStatusRing(id);
  const params = (data?.params ?? {}) as Partial<AdjustmentsParams>;
  const onDeleteNode = data?.onDeleteNode;
  const handleDelete = typeof onDeleteNode === 'function' ? () => (onDeleteNode as (nodeId: string) => void)(id) : undefined;
  const value = (control: typeof controls[number]) => typeof params[control.key] === 'number' ? params[control.key]! : control.initial;
  return (
    <div className={`group relative border border-black/12 bg-white shadow-sm w-[196px] overflow-visible ${ring}`}>
      <NodeDeleteButton onDelete={handleDelete} selected={selected} />
      <Handle type="target" position={Position.Left} />
      <div className="px-2 py-1 text-[10px] font-semibold text-neutral-500 uppercase border-b border-black/6">基礎調色 · 本機</div>
      <div className="p-2 space-y-1.5">
        {controls.map(control => <label key={control.key} className="nodrag grid grid-cols-[30px_1fr_28px] gap-1 items-center text-[9px] text-neutral-500"><span>{control.label}</span><input type="range" min={control.min} max={control.max} value={value(control)} onChange={e => updateNodeData(id, { params: { ...params, [control.key]: Number(e.target.value) } })} /><span className="text-right tabular-nums">{value(control)}</span></label>)}
        <p className="text-[9px] text-neutral-400">瀏覽器處理，不使用 API／AI 點數。</p>
      </div>
      <NodeResultPreview id={id} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
