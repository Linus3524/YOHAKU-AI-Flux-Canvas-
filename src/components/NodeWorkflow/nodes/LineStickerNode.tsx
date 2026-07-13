import React from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { LineStickerParams } from '../types';
import { STICKER_STYLES, STICKER_THEMES } from '../../../skills/sticker';
import { useNodeStatusRing } from './useNodeStatusRing';
import { NodeResultPreview } from './NodeResultPreview';
import { NodeDeleteButton } from './NodeDeleteButton';
import { useNodeWorkflowContext } from '../NodeWorkflowContext';

const ATLAS_MODELS = ['seedream-v5-pro', 'seedream-v5', 'seedream-v4.5', 'gpt-image-2', 'flux-2-pro', 'qwen-image-2'];
const COUNTS = [8, 12, 16, 20];
const IMAGE_SIZES: LineStickerParams['imageSize'][] = ['1K', '2K', '4K'];

export function LineStickerNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const ring = useNodeStatusRing(id);
  const params = (data?.params ?? {}) as Partial<LineStickerParams>;
  const { hasAtlas, generationModel } = useNodeWorkflowContext();
  const modelOptions = hasAtlas ? ['gemini', ...ATLAS_MODELS] : ['gemini'];
  const preferredModel = params.model ?? generationModel ?? 'gemini';
  const selectedModel = modelOptions.includes(preferredModel) ? preferredModel : 'gemini';
  const onDeleteNode = data?.onDeleteNode;
  const handleDelete = typeof onDeleteNode === 'function'
    ? () => (onDeleteNode as (nodeId: string) => void)(id)
    : undefined;

  const setParams = (patch: Partial<LineStickerParams>) => {
    updateNodeData(id, { params: { ...params, ...patch } });
  };

  return (
    <div className={`group relative w-[220px] overflow-visible border border-black/12 bg-white shadow-sm ${ring}`}>
      <NodeDeleteButton onDelete={handleDelete} selected={selected} />
      <Handle type="target" position={Position.Left} />
      <span className="absolute right-[calc(100%+9px)] top-1/2 -translate-y-1/2 whitespace-nowrap text-[9px] font-medium text-neutral-400">文字／參考圖</span>
      <div className="border-b border-black/6 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">生成 LINE 貼圖</div>
      <div className="space-y-1.5 p-2">
        <textarea
          value={params.subject ?? ''}
          onChange={(event) => setParams({ subject: event.target.value })}
          placeholder="角色或貼圖主題，例如：戴黃色帽子的橘貓"
          className="nodrag block h-[45px] w-full resize-none border border-neutral-200 bg-neutral-50 px-1.5 py-1 text-[10px] leading-relaxed focus:border-neutral-400 focus:outline-none"
        />
        <div className="grid grid-cols-2 gap-1">
          <select value={params.style ?? 'flat'} onChange={(event) => setParams({ style: event.target.value })} className="nodrag min-w-0 border border-neutral-200 bg-neutral-50 px-1 py-1 text-[10px] focus:outline-none">
            {STICKER_STYLES.map(option => <option key={option.id} value={option.id}>{option.name_zh}</option>)}
          </select>
          <select value={params.theme ?? 'character'} onChange={(event) => setParams({ theme: event.target.value })} className="nodrag min-w-0 border border-neutral-200 bg-neutral-50 px-1 py-1 text-[10px] focus:outline-none">
            {STICKER_THEMES.map(option => <option key={option.id} value={option.id}>{option.name_zh}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-[1fr_48px_44px] gap-1">
          <select value={selectedModel} onChange={(event) => setParams({ model: event.target.value })} className="nodrag min-w-0 border border-neutral-200 bg-neutral-50 px-1 py-1 text-[10px] focus:outline-none">
            {modelOptions.map(model => <option key={model} value={model}>{model}</option>)}
          </select>
          <select value={params.count ?? 8} onChange={(event) => setParams({ count: Number(event.target.value) })} title="貼圖張數" className="nodrag border border-neutral-200 bg-neutral-50 px-1 py-1 text-[10px] focus:outline-none">
            {COUNTS.map(count => <option key={count} value={count}>{count}張</option>)}
          </select>
          <select value={params.imageSize ?? '2K'} onChange={(event) => setParams({ imageSize: event.target.value as LineStickerParams['imageSize'] })} className="nodrag border border-neutral-200 bg-neutral-50 px-1 py-1 text-[10px] focus:outline-none">
            {IMAGE_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-x-1 text-[9px] text-neutral-500">
          <label className="nodrag flex items-center gap-1"><input type="checkbox" checked={params.useStickerBorder !== false} onChange={(event) => setParams({ useStickerBorder: event.target.checked })} />白色貼圖邊框</label>
          <label className="nodrag flex items-center gap-1"><input type="checkbox" checked={params.useFacialFeatures !== false} onChange={(event) => setParams({ useFacialFeatures: event.target.checked })} />允許表情五官</label>
          <label className="nodrag col-span-2 mt-1 flex items-center gap-1"><input type="checkbox" checked={params.textEnabled === true} onChange={(event) => setParams({ textEnabled: event.target.checked })} />加入貼圖文字</label>
        </div>
        {params.textEnabled === true && (
          <input value={params.textContent ?? ''} onChange={(event) => setParams({ textContent: event.target.value })} placeholder="共用文字；留空由 AI 配合各張產生" className="nodrag block w-full border border-neutral-200 bg-neutral-50 px-1.5 py-1 text-[10px] focus:outline-none" />
        )}
        <textarea
          value={params.itemPrompts ?? ''}
          onChange={(event) => setParams({ itemPrompts: event.target.value })}
          placeholder={'每行指定一張動作／表情（選填）\n例如：開心揮手\n生氣跺腳'}
          className="nodrag block h-[48px] w-full resize-none border border-neutral-200 bg-neutral-50 px-1.5 py-1 text-[9px] leading-relaxed focus:border-neutral-400 focus:outline-none"
        />
        <p className="text-[9px] leading-snug text-neutral-400">輸出整張集合圖，可直接接「一鍵拆分貼圖／圖示」。最多可接 8 張角色參考圖。</p>
      </div>
      <NodeResultPreview id={id} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
