import React from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { StyleParams } from '../types';
import { useNodeStatusRing } from './useNodeStatusRing';
import { NodeResultPreview } from './NodeResultPreview';

const STYLE_OPTIONS = [
  { key: 'none', label: '未選擇' },
  { key: 'pixel', label: '像素風' },
  { key: 'watercolor', label: '水彩' },
  { key: 'anime', label: '動漫' },
  { key: 'cyberpunk', label: '賽博龐克' },
  { key: 'clay', label: '黏土' },
];

/**
 * 風格轉換節點：風格選擇，實際套用由執行引擎呼叫 pipeline。
 */
export function StyleNode({ id, data }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const ring = useNodeStatusRing(id);
  const params = (data?.params ?? {}) as Partial<StyleParams>;

  return (
    <div className={`border border-black/12 bg-white shadow-sm w-[160px] overflow-hidden ${ring}`}>
      <Handle type="target" position={Position.Left} />
      <div className="px-2 py-1 text-[10px] font-semibold text-neutral-500 tracking-wide uppercase border-b border-black/6">
        風格轉換
      </div>
      <div className="p-1.5">
        <select
          value={params.styleKey ?? 'none'}
          onChange={(e) => updateNodeData(id, { params: { ...params, styleKey: e.target.value } })}
          className="nodrag block w-full border border-neutral-200 px-1.5 py-1 text-[11px] focus:outline-none focus:border-neutral-400 bg-neutral-50"
        >
          {STYLE_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>
      <NodeResultPreview id={id} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
