import React from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { RemoveBgParams } from '../types';
import { useNodeStatusRing } from './useNodeStatusRing';

/**
 * 去背節點：local/cloud 模式選擇；實際去背由執行引擎呼叫 pipeline。
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
    <div className={`border border-black/12 bg-white shadow-sm w-[160px] overflow-hidden ${ring}`}>
      <Handle type="target" position={Position.Left} />
      <div className="px-2 py-1 text-[10px] font-semibold text-neutral-500 tracking-wide uppercase border-b border-black/6">
        去背
      </div>
      <div className="p-1.5">
        <div className="flex gap-px bg-neutral-100 p-px">
          {(['local', 'cloud'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`nodrag flex-1 px-2 py-1 text-[11px] transition-colors ${
                mode === m ? 'bg-white text-neutral-900 font-medium shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {m === 'local' ? '本機' : '雲端'}
            </button>
          ))}
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
