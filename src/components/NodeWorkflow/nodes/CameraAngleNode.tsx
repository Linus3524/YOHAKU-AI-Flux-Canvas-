import React from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { CameraAngleParams } from '../types';
import { useNodeStatusRing } from './useNodeStatusRing';
import { NodeResultPreview } from './NodeResultPreview';
import { NodeDeleteButton } from './NodeDeleteButton';
import { Icon } from '../../Icon';

const CAMERA_ANGLES = [
  { id: 'top-left', icon: 'north_west', label: '俯視左上', prompt: 'high angle shot from top-left corner, looking down' },
  { id: 'top', icon: 'north', label: '正俯視', prompt: "bird's-eye view, directly overhead, extreme high angle" },
  { id: 'top-right', icon: 'north_east', label: '俯視右上', prompt: 'high angle shot from top-right corner, looking down' },
  { id: 'left', icon: 'west', label: '左側視', prompt: "camera is on the LEFT side of the subject, subject faces RIGHT, we see the subject's right profile" },
  { id: 'center', icon: 'circle', filled: true, label: '正視', prompt: 'straight-on front view, eye-level, facing camera directly' },
  { id: 'right', icon: 'east', label: '右側視', prompt: "camera is on the RIGHT side of the subject, subject faces LEFT, we see the subject's left profile" },
  { id: 'bottom-left', icon: 'south_west', label: '仰視左下', prompt: "worm's-eye view from bottom-left, looking up" },
  { id: 'bottom', icon: 'south', label: '正仰視', prompt: "worm's-eye view, directly below, looking straight up" },
  { id: 'bottom-right', icon: 'south_east', label: '仰視右下', prompt: "worm's-eye view from bottom-right, looking up" },
];

export function CameraAngleNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const ring = useNodeStatusRing(id);
  const params = (data?.params ?? {}) as Partial<CameraAngleParams>;
  const onDeleteNode = data?.onDeleteNode;
  const handleDelete = typeof onDeleteNode === 'function'
    ? () => (onDeleteNode as (nodeId: string) => void)(id)
    : undefined;
  
  // 預設為正視
  const anglePrompt = params.anglePrompt ?? CAMERA_ANGLES[4].prompt;

  return (
    <div className={`group relative border border-black/12 bg-white shadow-sm w-[186px] overflow-visible ${ring}`}>
      <NodeDeleteButton onDelete={handleDelete} selected={selected} />
      <Handle type="target" position={Position.Left} />
      <div className="px-2 py-1 text-[10px] font-semibold text-neutral-500 tracking-wide uppercase border-b border-black/6">
        視角轉換
      </div>
      <div className="p-2 space-y-2">
        <div className="grid grid-cols-3 gap-1.5">
          {CAMERA_ANGLES.map((angle) => {
            const isActive = anglePrompt === angle.prompt;
            return (
              <button
                key={angle.id}
                type="button"
                onClick={() => updateNodeData(id, { params: { ...params, anglePrompt: angle.prompt } })}
                title={angle.label}
                className={`nodrag h-8 flex items-center justify-center rounded border transition-all ${
                  isActive
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100 border-neutral-200 active:bg-neutral-200'
                }`}
              >
                <Icon name={angle.icon} size={16} filled={angle.filled} />
              </button>
            );
          })}
        </div>
        <div className="text-center text-[9px] text-neutral-400">
          點擊按鈕切換 AI 生成視角
        </div>
      </div>
      <NodeResultPreview id={id} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
