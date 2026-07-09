import React from 'react';
import { type NodeProps } from '@xyflow/react';
import { BatchNodeShell } from './BatchNodeShell';

/**
 * 圖層分離節點 = 可折疊 Batch 容器節點。
 * 執行前：一個簡潔方塊（單一輸入）。
 * 執行後：產出「一組」圖層，預設折疊成一疊縮圖 + 數量；可展開。
 * 展開後每個項目：
 *   - 右側有獨立輸出接口 (source handle `item-N`)，可各自接下游節點。
 *   - 有「拖出」鈕，把該圖層單獨移出到大畫布。
 * 底部「整批匯出」：把所有圖層一次移出到畫布。
 */
export function LayerSplitNode({ id }: NodeProps) {
  return (
    <BatchNodeShell
      id={id}
      title="圖層"
      emptyTitle="圖層分離"
      emptyHint="執行後展開圖層"
      itemName="圖層"
    />
  );
}
