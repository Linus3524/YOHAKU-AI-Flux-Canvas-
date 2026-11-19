import React, { useState } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { InpaintParams } from '../types';
import { useNodeStatusRing } from './useNodeStatusRing';
import { NodeResultPreview } from './NodeResultPreview';
import { NodeDeleteButton } from './NodeDeleteButton';
import { MaskPaintModal } from './MaskPaintModal';
import { useNodeGraphStore } from '../../../store/nodeGraphStore';
import { isImageSrc } from '../mediaSrc';

export function InpaintNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const ring = useNodeStatusRing(id);
  const params = (data?.params ?? {}) as Partial<InpaintParams>;
  const onDeleteNode = data?.onDeleteNode;
  const handleDelete = typeof onDeleteNode === 'function' ? () => (onDeleteNode as (nodeId: string) => void)(id) : undefined;
  const [painting, setPainting] = useState(false);

  // 「原圖」接口上游目前的圖片：Input 節點直接有 src，處理節點要先執行過才有結果
  const sourceSrc = useNodeGraphStore(state => {
    const incoming = state.edges.filter(edge => edge.target === id);
    const edge = incoming.find(e => e.targetHandle === 'image') ?? incoming.find(e => !e.targetHandle);
    if (!edge) return undefined;
    const batch = state.nodeBatchResults[edge.source];
    if (batch) {
      const match = /^item-(\d+)$/.exec(edge.sourceHandle ?? '');
      return batch[match ? Number(match[1]) : 0];
    }
    const value = state.nodeResults[edge.source] ?? state.nodes.find(node => node.id === edge.source)?.data.src;
    return typeof value === 'string' && isImageSrc(value) ? value : undefined;
  });
  const hasMaskInput = useNodeGraphStore(state => state.edges.some(edge => edge.target === id && edge.targetHandle === 'mask'));
  const hasPaintedMask = !!params.maskSrc;

  return (
    <div className={`group relative border border-black/12 bg-white shadow-sm w-[210px] overflow-visible ${ring}`}>
      <NodeDeleteButton onDelete={handleDelete} selected={selected} />
      <Handle id="image" type="target" position={Position.Left} style={{ top: 42 }} />
      <span className="absolute right-full mr-1.5 top-[35px] text-[9px] text-neutral-500 bg-white px-1">原圖</span>
      <Handle id="mask" type="target" position={Position.Left} style={{ top: 78 }} />
      <span className="absolute right-full mr-1.5 top-[71px] text-[9px] text-neutral-500 bg-white px-1">遮罩</span>
      <Handle id="reference" type="target" position={Position.Left} style={{ top: 112 }} />
      <span className="absolute right-full mr-1.5 top-[105px] text-[9px] text-neutral-500 bg-white px-1">參考</span>
      <div className="px-2 py-1 text-[10px] font-semibold text-neutral-500 uppercase border-b border-black/6">AI 局部重繪</div>
      <div className="p-2 space-y-1.5">
        <textarea className="nodrag w-full h-16 resize-none border border-neutral-200 p-1.5 text-[11px]" placeholder="描述塗抹區域要改成什麼…" value={params.prompt ?? ''} onChange={e => updateNodeData(id, { params: { ...params, prompt: e.target.value } })} />
        <div className="nodrag flex items-center gap-1.5">
          <button
            type="button"
            disabled={!sourceSrc}
            onClick={() => setPainting(true)}
            title={sourceSrc ? '在原圖上塗出要重繪的區域' : '請先接上「原圖」；上游若是處理節點，要先執行它才有圖可畫'}
            className="flex-1 border border-neutral-300 bg-neutral-50 px-2 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {hasPaintedMask ? '重新繪製遮罩' : '繪製遮罩'}
          </button>
          {hasPaintedMask && (
            <button
              type="button"
              onClick={() => updateNodeData(id, { params: { ...params, maskSrc: undefined } })}
              title="清除已繪製的遮罩"
              className="border border-neutral-200 px-1.5 py-1 text-[11px] text-neutral-500 hover:bg-neutral-100"
            >
              清除
            </button>
          )}
        </div>
        <p className="text-[9px] text-neutral-400 leading-snug">
          {hasMaskInput
            ? '已接「遮罩」輸入，執行時以它為準（白＝重繪、黑＝保留）。'
            : hasPaintedMask
              ? '已繪製遮罩。可接最多 6 張額外參考圖。'
              : '按「繪製遮罩」塗出重繪區域，或接一張黑白遮罩圖。'}
        </p>
      </div>
      <NodeResultPreview id={id} />
      <Handle type="source" position={Position.Right} />
      {painting && sourceSrc && (
        <MaskPaintModal
          imageSrc={sourceSrc}
          initialMask={params.maskSrc}
          onClose={() => setPainting(false)}
          onSave={(maskSrc) => {
            updateNodeData(id, { params: { ...params, maskSrc } });
            setPainting(false);
          }}
        />
      )}
    </div>
  );
}
