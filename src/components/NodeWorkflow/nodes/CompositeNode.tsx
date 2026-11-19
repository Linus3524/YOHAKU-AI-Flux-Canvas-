import React from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { CompositeParams } from '../types';
import { useNodeStatusRing } from './useNodeStatusRing';
import { NodeResultPreview } from './NodeResultPreview';
import { NodeDeleteButton } from './NodeDeleteButton';

const controls: { key: keyof CompositeParams; label: string; min: number; max: number; initial: number }[] = [
  { key: 'scale', label: '大小', min: 1, max: 200, initial: 60 },
  { key: 'x', label: '水平', min: 0, max: 100, initial: 50 },
  { key: 'y', label: '垂直', min: 0, max: 100, initial: 50 },
];

/**
 * 疊合節點：把「前景」疊到「背景」上，輸出尺寸等於背景。
 * 典型用法：去背 → 生成背景 → 疊合。瀏覽器本機處理，不使用 API。
 */
export function CompositeNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const ring = useNodeStatusRing(id);
  const params = (data?.params ?? {}) as Partial<CompositeParams>;
  const onDeleteNode = data?.onDeleteNode;
  const handleDelete = typeof onDeleteNode === 'function' ? () => (onDeleteNode as (nodeId: string) => void)(id) : undefined;
  const value = (control: typeof controls[number]) => typeof params[control.key] === 'number' ? params[control.key]! : control.initial;

  return (
    <div className={`group relative border border-black/12 bg-white shadow-sm w-[196px] overflow-visible ${ring}`}>
      <NodeDeleteButton onDelete={handleDelete} selected={selected} />
      <Handle id="background" type="target" position={Position.Left} style={{ top: 42 }} />
      <span className="absolute right-full mr-1.5 top-[35px] text-[9px] text-neutral-500 bg-white px-1">背景</span>
      <Handle id="foreground" type="target" position={Position.Left} style={{ top: 78 }} />
      <span className="absolute right-full mr-1.5 top-[71px] text-[9px] text-neutral-500 bg-white px-1">前景</span>
      <div className="px-2 py-1 text-[10px] font-semibold text-neutral-500 uppercase border-b border-black/6">疊合 · 本機</div>
      <div className="p-2 space-y-1.5">
        {controls.map(control => (
          <label key={control.key} className="nodrag grid grid-cols-[30px_1fr_28px] gap-1 items-center text-[9px] text-neutral-500">
            <span>{control.label}</span>
            <input
              type="range"
              min={control.min}
              max={control.max}
              value={value(control)}
              onChange={e => updateNodeData(id, { params: { ...params, [control.key]: Number(e.target.value) } })}
            />
            <span className="text-right tabular-nums">{value(control)}</span>
          </label>
        ))}
        <p className="text-[9px] text-neutral-400 leading-snug">大小＝前景寬度佔背景寬度的 %。輸出尺寸等於背景。</p>
      </div>
      <NodeResultPreview id={id} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
