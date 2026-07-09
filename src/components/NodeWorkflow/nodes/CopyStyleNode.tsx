import React from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { CopyStyleParams } from '../types';
import { useNodeStatusRing } from './useNodeStatusRing';
import { NodeResultPreview } from './NodeResultPreview';
import { NodeDeleteButton } from './NodeDeleteButton';

const STYLE_KEYS = [
  { key: 'color', label: '色彩' },
  { key: 'lighting', label: '光影' },
  { key: 'artStyle', label: '畫風' },
  { key: 'composition', label: '構圖' },
  { key: 'texture', label: '紋理' },
  { key: 'background', label: '背景' },
];

const DEFAULT_KEYS = STYLE_KEYS.map(item => item.key);

export function CopyStyleNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const ring = useNodeStatusRing(id);
  const params = (data?.params ?? {}) as Partial<CopyStyleParams>;
  const selectedKeys = Array.isArray(params.selectedKeys) && params.selectedKeys.length > 0
    ? params.selectedKeys
    : DEFAULT_KEYS;
  const preserveTransparency = params.preserveTransparency !== false;
  const onDeleteNode = data?.onDeleteNode;
  const handleDelete = typeof onDeleteNode === 'function'
    ? () => (onDeleteNode as (nodeId: string) => void)(id)
    : undefined;

  const setParams = (patch: Partial<CopyStyleParams>) => {
    updateNodeData(id, { params: { ...params, ...patch } });
  };

  const toggleKey = (key: string) => {
    const next = selectedKeys.includes(key)
      ? selectedKeys.filter(item => item !== key)
      : [...selectedKeys, key];
    setParams({ selectedKeys: next.length > 0 ? next : selectedKeys });
  };

  return (
    <div className={`group relative border border-black/12 bg-white shadow-sm w-[198px] overflow-visible ${ring}`}>
      <NodeDeleteButton onDelete={handleDelete} selected={selected} />
      <Handle id="style" type="target" position={Position.Left} style={{ top: 44 }} />
      <Handle id="content" type="target" position={Position.Left} style={{ top: 86 }} />
      <div className="px-2 py-1 text-[10px] font-semibold text-neutral-500 tracking-wide uppercase border-b border-black/6">
        拷貝風格
      </div>
      <div className="px-2 py-1.5 space-y-1.5">
        <div className="grid grid-cols-[36px_1fr] gap-y-1 text-[10px] text-neutral-500">
          <span>風格圖</span>
          <span className="text-neutral-400">分析來源</span>
          <span>內容圖</span>
          <span className="text-neutral-400">套用目標</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {STYLE_KEYS.map(item => (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleKey(item.key)}
              className={`nodrag h-6 border text-[10px] ${selectedKeys.includes(item.key) ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-600'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="nodrag flex items-center gap-1.5 text-[10px] text-neutral-500">
          <input
            type="checkbox"
            checked={preserveTransparency}
            onChange={(e) => setParams({ preserveTransparency: e.target.checked })}
          />
          保留透明
        </label>
      </div>
      <NodeResultPreview id={id} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
