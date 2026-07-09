import React from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { RemoveBgParams } from '../types';
import type { BiRefNetModel } from '../../../utils/geminiLayer';
import { useNodeStatusRing } from './useNodeStatusRing';
import { NodeResultPreview } from './NodeResultPreview';
import { NodeDeleteButton } from './NodeDeleteButton';

// 雲端 BiRefNet 模型清單，對標主畫布（InfiniteCanvas）的 6 種。
const CLOUD_MODELS: { key: BiRefNetModel; label: string; desc: string }[] = [
  { key: 'General Use (Light)', label: '輕量', desc: 'Logo / 標準字 / 純色背景' },
  { key: 'General Use (Heavy)', label: '重量級', desc: '產品 / 光滑物件 / 漸層背景' },
  { key: 'Portrait', label: '人像', desc: '人物 / 臉部 / 髮型優化' },
  { key: 'Matting', label: '髮絲', desc: '毛髮 / 婚紗 / 玻璃透明物' },
  { key: 'General Use (Light 2K)', label: '輕量 2K', desc: '高解析度大圖（輕量版）' },
  { key: 'General Use (Dynamic)', label: '動態', desc: '自動解析度 / 尺寸不固定' },
];
const DEFAULT_CLOUD_MODEL: BiRefNetModel = 'Matting';

/**
 * 去背節點：本機 / 雲端模式；雲端可再選 BiRefNet 6 種模型（對標主畫布）。
 * 實際去背由執行引擎呼叫 pipeline。
 */
export function RemoveBgNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const ring = useNodeStatusRing(id);
  const params = (data?.params ?? {}) as Partial<RemoveBgParams>;
  const mode = params.mode ?? 'local';
  const cloudModel = params.cloudModel ?? DEFAULT_CLOUD_MODEL;
  const onDeleteNode = data?.onDeleteNode;
  const handleDelete = typeof onDeleteNode === 'function'
    ? () => (onDeleteNode as (nodeId: string) => void)(id)
    : undefined;

  const setMode = (next: 'local' | 'cloud') => {
    updateNodeData(id, { params: { ...params, mode: next } });
  };
  const setCloudModel = (next: BiRefNetModel) => {
    updateNodeData(id, { params: { ...params, cloudModel: next } });
  };

  return (
    <div className={`group relative border border-black/12 bg-white shadow-sm w-[168px] overflow-visible ${ring}`}>
      <NodeDeleteButton onDelete={handleDelete} selected={selected} />
      <Handle type="target" position={Position.Left} />
      <div className="px-2 py-1 text-[10px] font-semibold text-neutral-500 tracking-wide uppercase border-b border-black/6">
        去背
      </div>
      <div className="p-1.5 space-y-1.5">
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
        {mode === 'cloud' && (
          <>
            <select
              value={cloudModel}
              onChange={(e) => setCloudModel(e.target.value as BiRefNetModel)}
              className="nodrag block w-full border border-neutral-200 px-1.5 py-1 text-[11px] focus:outline-none focus:border-neutral-400 bg-neutral-50"
            >
              {CLOUD_MODELS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            <div className="text-[9px] leading-snug text-neutral-400 px-0.5">
              {CLOUD_MODELS.find(m => m.key === cloudModel)?.desc}
            </div>
          </>
        )}
      </div>
      <NodeResultPreview id={id} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
