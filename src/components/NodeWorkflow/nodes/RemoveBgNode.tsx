import React from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { RemoveBgParams } from '../types';
import { useNodeStatusRing } from './useNodeStatusRing';
import { NodeResultPreview } from './NodeResultPreview';

/**
 * 去背節點：#2 只做 local/cloud 模式選擇；實際去背由 #3 執行引擎呼叫 pipeline（localModels.ts）。
 */
export function RemoveBgNode({ id, data }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const ring = useNodeStatusRing(id);
  const params = (data?.params ?? {}) as Partial<RemoveBgParams>;
  const mode = params.mode ?? 'local';

  const setMode = (next: 'local' | 'cloud') => {
    updateNodeData(id, { params: { ...params, mode: next } });
  };

  return (
    <div className={`rounded-xl border border-black/10 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] w-[160px] ${ring}`}>
      <Handle type="target" position={Position.Left} />
      <div className="px-2.5 py-1.5 text-[11px] font-semibold text-gray-500 border-b border-black/5">
        去背
      </div>
      <div className="p-2">
        <div className="flex gap-1 rounded-md bg-black/5 p-0.5">
          {(['local', 'cloud'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`nodrag flex-1 rounded px-2 py-1 text-[11px] transition-colors ${
                mode === m ? 'bg-white text-[#1D1D1F] shadow-sm font-medium' : 'text-gray-500'
              }`}
            >
              {m === 'local' ? '本機' : '雲端'}
            </button>
          ))}
        </div>
      </div>
      <NodeResultPreview id={id} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
