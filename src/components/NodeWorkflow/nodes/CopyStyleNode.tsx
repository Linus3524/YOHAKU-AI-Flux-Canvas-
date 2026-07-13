import React from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { CopyStyleParams } from '../types';
import { useNodeStatusRing } from './useNodeStatusRing';
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
      <Handle id="style" type="target" position={Position.Left} />
      <div
        className="absolute pointer-events-none text-[9px] font-medium text-neutral-500 bg-white/95 border border-black/8 px-1 leading-tight"
        style={{ top: 40, right: '100%', marginRight: 6 }}
      >
        風格圖
      </div>
      <div className="px-2 py-1 text-[10px] font-semibold text-neutral-500 tracking-wide uppercase border-b border-black/6">
        ① 複製風格
      </div>
      <div className="px-2 py-1.5 space-y-1.5">
        <p className="text-[10px] text-neutral-400">分析這張圖片，輸出可重複連接的風格資料。</p>
        <div className="flex items-center justify-between text-[9px] text-neutral-400">
          <span>選擇要複製的項目</span>
          <span className="tabular-nums">已選 {selectedKeys.length}/6</span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {STYLE_KEYS.map(item => {
            const checked = selectedKeys.includes(item.key);
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={checked}
                onClick={() => toggleKey(item.key)}
                className={`nodrag h-7 border px-1.5 flex items-center gap-1.5 text-[10px] text-left transition-colors ${checked ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300'}`}
              >
                <span className={`w-3.5 h-3.5 shrink-0 border flex items-center justify-center text-[10px] font-bold leading-none ${checked ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-neutral-300 bg-white text-transparent'}`}>
                  ✓
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
