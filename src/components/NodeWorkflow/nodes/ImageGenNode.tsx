import React from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { ImageGenParams } from '../types';
import { useNodeStatusRing } from './useNodeStatusRing';
import { NodeResultPreview } from './NodeResultPreview';

const MODEL_OPTIONS = ['gemini', 'seedream-v5', 'seedream-v4.5', 'gpt-image-2', 'flux-2-pro'];
const RATIO_OPTIONS = ['1:1', '4:3', '3:4', '16:9', '9:16'];

/**
 * 生成圖片節點：#2 只做參數設定 UI，實際生成由 #3 執行引擎呼叫 pipeline（generate.ts）。
 */
export function ImageGenNode({ id, data }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const ring = useNodeStatusRing(id);
  const params = (data?.params ?? {}) as Partial<ImageGenParams>;

  const setParam = (patch: Partial<ImageGenParams>) => {
    updateNodeData(id, { params: { ...params, ...patch } });
  };

  return (
    <div className={`rounded-xl border border-black/10 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] w-[200px] ${ring}`}>
      <Handle type="target" position={Position.Left} />
      <div className="px-2.5 py-1.5 text-[11px] font-semibold text-gray-500 border-b border-black/5">
        生成圖片
      </div>
      <div className="p-2 space-y-2">
        <textarea
          value={params.prompt ?? ''}
          onChange={(e) => setParam({ prompt: e.target.value })}
          placeholder="輸入提示詞…"
          className="nodrag block w-full h-[64px] resize-none rounded-md border border-black/10 px-2 py-1.5 text-[11px] leading-relaxed focus:outline-none focus:border-[#007AFF]"
        />
        <div className="flex gap-1.5">
          <select
            value={params.model ?? 'gemini'}
            onChange={(e) => setParam({ model: e.target.value })}
            className="nodrag flex-1 min-w-0 rounded-md border border-black/10 px-1.5 py-1 text-[11px] focus:outline-none focus:border-[#007AFF]"
          >
            {MODEL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={params.aspectRatio ?? '1:1'}
            onChange={(e) => setParam({ aspectRatio: e.target.value })}
            className="nodrag w-[64px] rounded-md border border-black/10 px-1.5 py-1 text-[11px] focus:outline-none focus:border-[#007AFF]"
          >
            {RATIO_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <NodeResultPreview id={id} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
