import React from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { CameraAngleParams } from '../types';
import { useNodeStatusRing } from './useNodeStatusRing';
import { NodeResultPreview } from './NodeResultPreview';
import { NodeDeleteButton } from './NodeDeleteButton';

const ANGLES: Array<{ value: string; label: string }> = [
  { value: 'high angle shot from top-left corner, looking down', label: '俯視左上' },
  { value: "bird's-eye view, directly overhead, extreme high angle", label: '正俯視' },
  { value: 'high angle shot from top-right corner, looking down', label: '俯視右上' },
  { value: "camera is on the LEFT side of the subject, subject faces RIGHT, we see the subject's right profile", label: '左側視' },
  { value: 'straight-on front view, eye-level, facing camera directly', label: '正視' },
  { value: "camera is on the RIGHT side of the subject, subject faces LEFT, we see the subject's left profile", label: '右側視' },
  { value: "worm's-eye view from bottom-left, looking up", label: '仰視左下' },
  { value: "worm's-eye view, directly below, looking straight up", label: '正仰視' },
  { value: "worm's-eye view from bottom-right, looking up", label: '仰視右下' },
];

// 空值 = 跟隨全域生成模型；其餘對標主畫布可選的生成模型。
const MODEL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: '跟隨全域' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'seedream-v5', label: 'Seedream v5' },
  { value: 'seedream-v4.5', label: 'Seedream v4.5' },
  { value: 'gpt-image-2', label: 'GPT Image 2' },
  { value: 'flux-2-pro', label: 'FLUX.2 Pro' },
  { value: 'qwen-image-2', label: 'Qwen Image 2' },
];

export function CameraAngleNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const ring = useNodeStatusRing(id);
  const params = (data?.params ?? {}) as Partial<CameraAngleParams>;
  const onDeleteNode = data?.onDeleteNode;
  const handleDelete = typeof onDeleteNode === 'function'
    ? () => (onDeleteNode as (nodeId: string) => void)(id)
    : undefined;
  const anglePrompt = params.anglePrompt ?? ANGLES[4].value;

  return (
    <div className={`group relative border border-black/12 bg-white shadow-sm w-[186px] overflow-visible ${ring}`}>
      <NodeDeleteButton onDelete={handleDelete} selected={selected} />
      <Handle type="target" position={Position.Left} />
      <div className="px-2 py-1 text-[10px] font-semibold text-neutral-500 tracking-wide uppercase border-b border-black/6">
        視角轉換
      </div>
      <div className="p-1.5 space-y-1">
        <select
          value={anglePrompt}
          onChange={(e) => updateNodeData(id, { params: { ...params, anglePrompt: e.target.value } })}
          className="nodrag block w-full border border-neutral-200 px-1.5 py-1 text-[11px] focus:outline-none focus:border-neutral-400 bg-neutral-50"
        >
          {ANGLES.map(angle => <option key={angle.value} value={angle.value}>{angle.label}</option>)}
        </select>
        <select
          value={params.model ?? ''}
          onChange={(e) => updateNodeData(id, { params: { ...params, model: e.target.value } })}
          className="nodrag block w-full border border-neutral-200 px-1.5 py-1 text-[11px] focus:outline-none focus:border-neutral-400 bg-neutral-50"
          title="生成模型（預設跟隨全域）"
        >
          {MODEL_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>
      <NodeResultPreview id={id} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
