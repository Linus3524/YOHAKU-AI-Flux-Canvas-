import React from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { OutpaintParams } from '../types';
import { useNodeStatusRing } from './useNodeStatusRing';
import { NodeResultPreview } from './NodeResultPreview';
import { NodeDeleteButton } from './NodeDeleteButton';

const DIRECTIONS: Array<{ value: OutpaintParams['direction']; label: string }> = [
  { value: 'all', label: '四周' },
  { value: 'left', label: '左' },
  { value: 'right', label: '右' },
  { value: 'top', label: '上' },
  { value: 'bottom', label: '下' },
];

const RATIOS: Array<OutpaintParams['aspectRatio']> = ['1:1', '4:3', '3:4', '16:9', '9:16'];

export function OutpaintNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const ring = useNodeStatusRing(id);
  const params = (data?.params ?? {}) as Partial<OutpaintParams>;
  const direction = params.direction ?? 'all';
  const aspectRatio = params.aspectRatio ?? '1:1';
  const onDeleteNode = data?.onDeleteNode;
  const handleDelete = typeof onDeleteNode === 'function'
    ? () => (onDeleteNode as (nodeId: string) => void)(id)
    : undefined;

  const setParams = (patch: Partial<OutpaintParams>) => {
    updateNodeData(id, { params: { ...params, ...patch } });
  };

  return (
    <div className={`group relative border border-black/12 bg-white shadow-sm w-[194px] overflow-visible ${ring}`}>
      <NodeDeleteButton onDelete={handleDelete} selected={selected} />
      <Handle type="target" position={Position.Left} />
      <div className="px-2 py-1 text-[10px] font-semibold text-neutral-500 tracking-wide uppercase border-b border-black/6">
        外擴延伸
      </div>
      <div className="p-1.5 space-y-1.5">
        <div className="grid grid-cols-5 gap-1">
          {DIRECTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setParams({ direction: option.value })}
              className={`nodrag h-6 border text-[10px] ${direction === option.value ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-600'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <select
          value={aspectRatio}
          onChange={(e) => setParams({ aspectRatio: e.target.value as OutpaintParams['aspectRatio'] })}
          className="nodrag w-full border border-neutral-200 bg-neutral-50 px-1.5 py-1 text-[11px] focus:outline-none focus:border-neutral-400"
        >
          {RATIOS.map(ratio => (
            <option key={ratio} value={ratio}>
              {ratio}
            </option>
          ))}
        </select>
        <select
          value={params.model ?? 'gemini'}
          onChange={(e) => setParams({ model: e.target.value as OutpaintParams['model'] })}
          className="nodrag w-full border border-neutral-200 bg-neutral-50 px-1.5 py-1 text-[11px] focus:outline-none focus:border-neutral-400"
        >
          <option value="gemini">Gemini 外擴</option>
          <option value="gpt">GPT Image 2 遮罩外擴</option>
        </select>
        <textarea
          value={params.prompt ?? ''}
          onChange={(e) => setParams({ prompt: e.target.value })}
          placeholder="補充外擴方向或內容…"
          className="nodrag block w-full h-[44px] resize-none border border-neutral-200 px-1.5 py-1 text-[11px] leading-relaxed focus:outline-none focus:border-neutral-400 bg-neutral-50"
        />
      </div>
      <NodeResultPreview id={id} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
