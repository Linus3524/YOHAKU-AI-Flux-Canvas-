import React from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { ImageGenParams } from '../types';
import { useNodeStatusRing } from './useNodeStatusRing';
import { NodeResultPreview } from './NodeResultPreview';
import { NodeDeleteButton } from './NodeDeleteButton';
import { useNodeGraphStore } from '../../../store/nodeGraphStore';
import { Icon } from '../../Icon';
import { NODE_IMAGE_MODELS } from '../modelOptions';
import { atlasModelSupportsTransparency } from '../../../utils/atlasImage';

const SIZE_OPTIONS: NonNullable<ImageGenParams['imageSize']>[] = ['1K', '2K', '4K'];
const RATIO_OPTIONS = ['1:1', '4:3', '3:4', '16:9', '9:16'];

/**
 * 生成圖片節點：參數設定 UI，實際生成由執行引擎呼叫 pipeline。
 */
export function ImageGenNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const ring = useNodeStatusRing(id);
  const params = (data?.params ?? {}) as Partial<ImageGenParams & { isCollapsed?: boolean }>;
  const onDeleteNode = data?.onDeleteNode;
  const handleDelete = typeof onDeleteNode === 'function'
    ? () => (onDeleteNode as (nodeId: string) => void)(id)
    : undefined;

  const setParam = (patch: Partial<ImageGenParams>) => {
    updateNodeData(id, { params: { ...params, ...patch } });
  };

  // 檢查是否有結果圖片以決定是否能摺疊
  const hasResult = useNodeGraphStore(s => !!s.nodeResults[id]);
  const isCollapsed = hasResult && !!params.isCollapsed;

  const supportsAlpha = atlasModelSupportsTransparency(params.model ?? 'gemini');

  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateNodeData(id, { params: { ...params, isCollapsed: !isCollapsed } });
  };

  return (
    <div className={`group relative border border-black/12 bg-white shadow-sm w-[190px] overflow-visible ${ring}`}>
      <NodeDeleteButton onDelete={handleDelete} selected={selected} />
      <Handle type="target" position={Position.Left} />
      <div className="px-2 py-1 text-[10px] font-semibold text-neutral-500 tracking-wide uppercase border-b border-black/6 flex items-center justify-between">
        <span>生成圖片</span>
        {hasResult && (
          <button
            type="button"
            onClick={toggleCollapse}
            className="nodrag text-neutral-400 hover:text-neutral-700 transition-colors w-4 h-4 flex items-center justify-center cursor-pointer"
            title={isCollapsed ? '展開控制參數' : '摺疊控制參數'}
          >
            <Icon name={isCollapsed ? 'expand_more' : 'expand_less'} size={12} />
          </button>
        )}
      </div>
      {!isCollapsed && (
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
              {NODE_IMAGE_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <select
              value={params.aspectRatio ?? '1:1'}
              onChange={(e) => setParam({ aspectRatio: e.target.value })}
              className="nodrag w-[56px] border border-neutral-200 px-1 py-1 text-[11px] focus:outline-none focus:border-neutral-400 bg-neutral-50"
            >
              {RATIO_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex gap-1">
            <select
              value={params.imageSize ?? ''}
              onChange={(e) => setParam({ imageSize: (e.target.value || undefined) as ImageGenParams['imageSize'] })}
              title="解析度"
              className="nodrag w-[64px] border border-neutral-200 px-1 py-1 text-[11px] focus:outline-none focus:border-neutral-400 bg-neutral-50"
            >
              <option value="">預設</option>
              {SIZE_OPTIONS.map(size => <option key={size} value={size}>{size}</option>)}
            </select>
            <input
              type="number"
              min={0}
              value={params.seed ?? ''}
              onChange={(e) => setParam({ seed: e.target.value === '' ? undefined : Math.max(0, Math.floor(Number(e.target.value))) })}
              placeholder="種子碼（隨機）"
              title="固定種子碼可重現相同結果；留空則每次隨機"
              className="nodrag num-no-spin flex-1 min-w-0 border border-neutral-200 px-1.5 py-1 text-[11px] focus:outline-none focus:border-neutral-400 bg-neutral-50"
            />
          </div>
          <label
            className={`nodrag flex items-center gap-1.5 text-[10px] ${supportsAlpha ? 'text-neutral-600 cursor-pointer' : 'text-neutral-300 cursor-not-allowed'}`}
            title={supportsAlpha ? '由模型直接輸出透明背景' : '此模型不支援原生透明，請在後面串接「去背」節點'}
          >
            <input
              type="checkbox"
              disabled={!supportsAlpha}
              checked={supportsAlpha && !!params.transparentBackground}
              onChange={(e) => setParam({ transparentBackground: e.target.checked })}
            />
            透明背景{supportsAlpha ? '' : '（僅 GPT 2.5 / 2.6）'}
          </label>
        </div>
      )}
      <NodeResultPreview id={id} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
