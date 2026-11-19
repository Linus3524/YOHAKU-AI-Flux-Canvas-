import React from 'react';
import { useReactFlow, type NodeProps } from '@xyflow/react';
import { BatchNodeShell } from './BatchNodeShell';
import type { LayerSplitParams } from '../types';
import { NODE_LAYER_SPLIT_MODELS } from '../modelOptions';

/**
 * 圖層分離節點 = 可折疊 Batch 容器節點。
 * 執行前：一個簡潔方塊（單一輸入）。
 * 執行後：產出「一組」圖層，預設折疊成一疊縮圖 + 數量；可展開。
 * 展開後每個項目：
 *   - 右側有獨立輸出接口 (source handle `item-N`)，可各自接下游節點。
 *   - 有「拖出」鈕，把該圖層單獨移出到大畫布。
 * 底部「整批匯入主畫布」：把所有圖層一次加入主畫布。
 */
const COUNT_OPTIONS: Array<'auto' | number> = ['auto', 2, 4, 6, 8, 12];
const STRATEGY_OPTIONS: { id: NonNullable<LayerSplitParams['groupingStrategy']>; label: string }[] = [
  { id: 'smart', label: '智慧分組' },
  { id: 'separate', label: '盡量分開' },
  { id: 'category', label: '依類別' },
];
const fieldClass = 'w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs';

export function LayerSplitNode({ id, data }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const params = (data?.params ?? {}) as Partial<LayerSplitParams>;
  const engine = params.engine ?? 'gemini';
  const isMagicLayer = engine !== 'gemini';
  const setParams = (patch: Partial<LayerSplitParams>) => updateNodeData(id, { params: { ...params, ...patch } });
  // 有補充指令時由指令決定層數；依類別時由偵測到的類別決定
  const countLocked = !!params.prompt?.trim() || params.groupingStrategy === 'category';

  return (
    <>
      <BatchNodeShell id={id} title="圖層" emptyTitle="圖層分離" emptyHint="執行後展開圖層" itemName="圖層" />
      <div className="nodrag px-3 pb-3 -mt-2 space-y-2">
        <select
          className={fieldClass}
          value={engine}
          title="分層模型"
          onChange={event => setParams({ engine: event.target.value as LayerSplitParams['engine'] })}
        >
          {NODE_LAYER_SPLIT_MODELS.map(model => <option key={model.id} value={model.id}>{model.label}</option>)}
        </select>
        {isMagicLayer && (
          <>
            <div className="flex gap-2">
              <select
                className={fieldClass}
                value={String(params.layerCount ?? 'auto')}
                disabled={countLocked}
                title={countLocked ? '層數由補充指令或類別決定' : '希望拆出幾層（含背景層）'}
                onChange={event => setParams({ layerCount: event.target.value === 'auto' ? 'auto' : Number(event.target.value) })}
              >
                {COUNT_OPTIONS.map(count => <option key={String(count)} value={String(count)}>{count === 'auto' ? '自動層數' : `${count} 層`}</option>)}
              </select>
              <select
                className={fieldClass}
                value={params.groupingStrategy ?? 'smart'}
                title="拆分策略"
                onChange={event => setParams({ groupingStrategy: event.target.value as LayerSplitParams['groupingStrategy'] })}
              >
                {STRATEGY_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </div>
            <input
              className={fieldClass}
              placeholder="補充指令（選填）：人物、杯子各自一層"
              value={params.prompt ?? ''}
              onChange={event => setParams({ prompt: event.target.value })}
            />
            <label className="flex items-center gap-1.5 text-[11px] text-neutral-600 cursor-pointer">
              <input
                type="checkbox"
                checked={params.includeBackground ?? true}
                onChange={event => setParams({ includeBackground: event.target.checked })}
              />
              包含補全後的背景層
            </label>
          </>
        )}
      </div>
    </>
  );
}
