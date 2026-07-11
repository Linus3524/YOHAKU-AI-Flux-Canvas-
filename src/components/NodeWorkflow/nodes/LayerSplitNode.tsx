import React from 'react';
import { useReactFlow, type NodeProps } from '@xyflow/react';
import { BatchNodeShell } from './BatchNodeShell';
import type { LayerSplitParams } from '../types';

/**
 * 圖層分離節點 = 可折疊 Batch 容器節點。
 * 執行前：一個簡潔方塊（單一輸入）。
 * 執行後：產出「一組」圖層，預設折疊成一疊縮圖 + 數量；可展開。
 * 展開後每個項目：
 *   - 右側有獨立輸出接口 (source handle `item-N`)，可各自接下游節點。
 *   - 有「拖出」鈕，把該圖層單獨移出到大畫布。
 * 底部「整批匯出」：把所有圖層一次移出到畫布。
 */
export function LayerSplitNode({ id, data }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const params = (data?.params ?? {}) as Partial<LayerSplitParams>;
  const engine = params.engine ?? 'gemini';

  return (
    <>
      <BatchNodeShell id={id} title="圖層" emptyTitle="圖層分離" emptyHint="執行後展開圖層" itemName="圖層" />
      <div className="nodrag px-3 pb-3 -mt-2">
        <select
          className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs"
          value={engine}
          onChange={event => updateNodeData(id, {
            params: { ...params, engine: event.target.value as LayerSplitParams['engine'] },
          })}
        >
          <option value="gemini">Gemini + 去背</option>
          <option value="seedream-v5-pro">即夢 Pro + 軟體去背</option>
        </select>
        {engine === 'seedream-v5-pro' && (
          <input
            className="mt-2 w-full rounded border border-gray-200 px-2 py-1 text-xs"
            placeholder="分離指令（可選）"
            value={params.prompt ?? ''}
            onChange={event => updateNodeData(id, {
              params: { ...params, prompt: event.target.value },
            })}
          />
        )}
      </div>
    </>
  );
}
