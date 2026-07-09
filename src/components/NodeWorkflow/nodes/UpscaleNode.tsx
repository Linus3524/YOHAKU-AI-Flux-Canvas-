import React from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { UpscaleParams } from '../types';
import { useNodeStatusRing } from './useNodeStatusRing';
import { NodeResultPreview } from './NodeResultPreview';
import { NodeDeleteButton } from './NodeDeleteButton';

const MODEL_OPTIONS: { key: UpscaleParams['modelKey']; label: string }[] = [
  { key: 'upscale_photo', label: '相片/插畫' },
  { key: 'upscale_anime', label: '動漫' },
  { key: 'upscale_art', label: '繪圖' },
];

export function UpscaleNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const ring = useNodeStatusRing(id);
  const params = (data?.params ?? {}) as Partial<UpscaleParams>;
  const mode = params.mode ?? 'local';
  const modelKey = params.modelKey ?? 'upscale_photo';
  const factor = params.factor ?? 2;
  const onDeleteNode = data?.onDeleteNode;
  const handleDelete = typeof onDeleteNode === 'function'
    ? () => (onDeleteNode as (nodeId: string) => void)(id)
    : undefined;

  const setParam = (patch: Partial<UpscaleParams>) => {
    updateNodeData(id, { params: { ...params, ...patch } });
  };

  return (
    <div className={`group relative border border-black/12 bg-white shadow-sm w-[170px] overflow-visible ${ring}`}>
      <NodeDeleteButton onDelete={handleDelete} selected={selected} />
      <Handle type="target" position={Position.Left} />
      <div className="px-2 py-1 text-[10px] font-semibold text-neutral-500 tracking-wide uppercase border-b border-black/6">
        放大
      </div>
      <div className="p-1.5 space-y-1.5">
        <div className="flex gap-px bg-neutral-100 p-px">
          {([['local', '本機'], ['smart', '智能']] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setParam({ mode: key })}
              className={`nodrag flex-1 px-2 py-1 text-[11px] transition-colors ${
                mode === key ? 'bg-white text-neutral-900 font-medium shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {mode === 'local' && (
          <select
            value={modelKey}
            onChange={(e) => setParam({ modelKey: e.target.value as UpscaleParams['modelKey'] })}
            className="nodrag block w-full border border-neutral-200 px-1.5 py-1 text-[11px] focus:outline-none focus:border-neutral-400 bg-neutral-50"
          >
            {MODEL_OPTIONS.map(option => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>
        )}
        {mode === 'smart' && (
          <div className="text-[9px] leading-snug text-neutral-400 px-0.5">
            AI 生成式放大：細節增強、需 Gemini Key
          </div>
        )}
        <div className="flex gap-px bg-neutral-100 p-px">
          {([2, 4] as const).map(nextFactor => (
            <button
              key={nextFactor}
              type="button"
              onClick={() => setParam({ factor: nextFactor })}
              className={`nodrag flex-1 px-2 py-1 text-[11px] transition-colors ${
                factor === nextFactor ? 'bg-white text-neutral-900 font-medium shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {nextFactor}x
            </button>
          ))}
        </div>
      </div>
      <NodeResultPreview id={id} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
