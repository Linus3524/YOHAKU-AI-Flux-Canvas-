import React from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { ImageGenParams } from '../types';
import { useNodeStatusRing } from './useNodeStatusRing';
import { NodeResultPreview } from './NodeResultPreview';

const MODEL_OPTIONS = ['gemini', 'seedream-v5', 'seedream-v4.5', 'gpt-image-2', 'flux-2-pro'];
const RATIO_OPTIONS = ['1:1', '4:3', '3:4', '16:9', '9:16'];

/**
 * 生成圖片節點：參數設定 UI，實際生成由執行引擎呼叫 pipeline。
 */
export function ImageGenNode({ id, data }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const ring = useNodeStatusRing(id);
  const params = (data?.params ?? {}) as Partial<ImageGenParams>;

  const setParam = (patch: Partial<ImageGenParams>) => {
    updateNodeData(id, { params: { ...params, ...patch } });
  };

  return (
    <div className={`border border-black/12 bg-white shadow-sm w-[190px] overflow-hidden ${ring}`}>
      <Handle type="target" position={Position.Left} />
      <div className="px-2 py-1 text-[10px] font-semibold text-neutral-500 tracking-wide uppercase border-b border-black/6">
        生成圖片
      </div>
      <div className="p-1.5 space-y-1.5">
        <textarea
          value={params.prompt ?? ''}
          onChange={(e) => setParam({ prompt: e.target.value })}
          placeholder="輸入提示詞…"
          className="nodrag block w-full h-[52px] resize-none border border-neutral-200 px-1.5 py-1 text-[11px] leading-relaxed focus:outline-none focus:border-neutral-400 bg-neutral-50"
        />
        <div className="flex gap-1">
          <select
            value={params.model ?? 'gemini'}
            onChange={(e) => setParam({ model: e.target.value })}
            className="nodrag flex-1 min-w-0 border border-neutral-200 px-1 py-1 text-[11px] focus:outline-none focus:border-neutral-400 bg-neutral-50"
          >
            {MODEL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={params.aspectRatio ?? '1:1'}
            onChange={(e) => setParam({ aspectRatio: e.target.value })}
            className="nodrag w-[56px] border border-neutral-200 px-1 py-1 text-[11px] focus:outline-none focus:border-neutral-400 bg-neutral-50"
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
