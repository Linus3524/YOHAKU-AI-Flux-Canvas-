import React from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { StyleParams } from '../types';
import { useNodeStatusRing } from './useNodeStatusRing';
import { NodeResultPreview } from './NodeResultPreview';

// #2 先給幾個佔位風格；#3 執行時對應到 styleTransfer.ts 的預設。
const STYLE_OPTIONS = [
  { key: 'none', label: '未選擇' },
  { key: 'pixel', label: '像素風' },
  { key: 'watercolor', label: '水彩' },
  { key: 'anime', label: '動漫' },
  { key: 'cyberpunk', label: '賽博龐克' },
  { key: 'clay', label: '黏土' },
];

/**
 * 風格轉換節點：#2 只做風格選擇；實際套用由 #3 執行引擎呼叫 pipeline（styleTransfer.ts）。
 */
export function StyleNode({ id, data }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const ring = useNodeStatusRing(id);
  const params = (data?.params ?? {}) as Partial<StyleParams>;

  return (
    <div className={`rounded-xl border border-black/10 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] w-[170px] ${ring}`}>
      <Handle type="target" position={Position.Left} />
      <div className="px-2.5 py-1.5 text-[11px] font-semibold text-gray-500 border-b border-black/5">
        風格轉換
      </div>
      <div className="p-2">
        <select
          value={params.styleKey ?? 'none'}
          onChange={(e) => updateNodeData(id, { params: { ...params, styleKey: e.target.value } })}
          className="nodrag block w-full rounded-md border border-black/10 px-1.5 py-1 text-[11px] focus:outline-none focus:border-[#007AFF]"
        >
          {STYLE_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>
      <NodeResultPreview id={id} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
