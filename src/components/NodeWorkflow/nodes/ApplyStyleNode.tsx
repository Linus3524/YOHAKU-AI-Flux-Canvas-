import React from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { ApplyStyleParams } from '../types';
import { useNodeStatusRing } from './useNodeStatusRing';
import { NodeResultPreview } from './NodeResultPreview';
import { NodeDeleteButton } from './NodeDeleteButton';
import { useNodeWorkflowContext } from '../NodeWorkflowContext';

const ATLAS_STYLE_MODELS = ['seedream-v5-pro', 'seedream-v5', 'seedream-v4.5', 'gpt-image-2', 'flux-2-pro', 'qwen-image-2'];

export function ApplyStyleNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const ring = useNodeStatusRing(id);
  const params = (data?.params ?? {}) as Partial<ApplyStyleParams>;
  const { hasAtlas, generationModel } = useNodeWorkflowContext();
  const modelOptions = hasAtlas ? ['gemini', ...ATLAS_STYLE_MODELS] : ['gemini'];
  const preferredModel = params.model ?? generationModel ?? 'gemini';
  const selectedModel = modelOptions.includes(preferredModel) ? preferredModel : 'gemini';
  const onDeleteNode = data?.onDeleteNode;
  const handleDelete = typeof onDeleteNode === 'function' ? () => (onDeleteNode as (nodeId: string) => void)(id) : undefined;
  return <div className={`group relative border border-black/12 bg-white shadow-sm w-[190px] overflow-visible ${ring}`}>
    <NodeDeleteButton onDelete={handleDelete} selected={selected} />
    <Handle id="style" type="target" position={Position.Left} style={{ top: 48 }} />
    <span className="absolute z-10 right-[calc(100%+10px)] top-[39px] whitespace-nowrap border border-black/8 bg-white px-1.5 py-0.5 text-[9px] font-medium text-neutral-600 shadow-sm">風格資料</span>
    <Handle id="content" type="target" position={Position.Left} style={{ top: 108 }} />
    <span className="absolute z-10 right-[calc(100%+10px)] top-[99px] whitespace-nowrap border border-black/8 bg-white px-1.5 py-0.5 text-[9px] font-medium text-neutral-600 shadow-sm">內容圖</span>
    <div className="px-2 py-1 text-[10px] font-semibold text-neutral-500 uppercase border-b border-black/6">② 貼上風格</div>
    <div className="p-2 space-y-1.5">
      <p className="text-[10px] text-neutral-400 leading-snug">把「複製風格」的輸出套用到另一張內容圖片。直接按本節點「執行」，會自動先完成上游風格複製再貼上。</p>
      <label className="block text-[9px] text-neutral-400">生成模型
        <select className="nodrag mt-0.5 block w-full border border-neutral-200 bg-neutral-50 px-1.5 py-1 text-[10px] text-neutral-700" value={selectedModel} onChange={e => updateNodeData(id, { params: { ...params, model: e.target.value } })}>
          {modelOptions.map(model => <option key={model} value={model}>{model}</option>)}
        </select>
      </label>
      <label className="nodrag flex items-center gap-1.5 text-[10px] text-neutral-500"><input type="checkbox" checked={params.preserveTransparency !== false} onChange={e => updateNodeData(id, { params: { ...params, preserveTransparency: e.target.checked } })} />保留透明背景</label>
    </div>
    <NodeResultPreview id={id} />
    <Handle type="source" position={Position.Right} />
  </div>;
}
