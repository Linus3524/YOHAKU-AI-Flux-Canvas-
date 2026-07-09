import React, { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useNodeStatusRing } from './useNodeStatusRing';
import { useNodeGraphStore } from '../../../store/nodeGraphStore';
import { useNodeWorkflowContext } from '../NodeWorkflowContext';

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
  const ring = useNodeStatusRing(id);
  const layers = useNodeGraphStore(s => s.nodeBatchResults[id]);
  const { detachImage } = useNodeWorkflowContext();
  const [expanded, setExpanded] = useState(false);

  const count = layers?.length ?? 0;

  // 尚未執行：簡潔輸入方塊
  if (count === 0) {
    return (
      <div className={`w-[150px] bg-white border border-neutral-200 shadow-sm px-3 py-3 text-center ${ring}`}>
        <Handle type="target" position={Position.Left} />
        <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">圖層分離</div>
        <div className="mt-0.5 text-[9px] text-neutral-300">執行後展開圖層</div>
      </div>
    );
  }

  // 折疊視圖：疊圖 + 數量
  if (!expanded) {
    return (
      <div className={`relative w-[172px] bg-white border border-black/12 shadow-sm overflow-hidden ${ring}`}>
        <Handle type="target" position={Position.Left} />
        <div className="px-2 py-1 flex items-center justify-between border-b border-black/6">
          <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">圖層 · {count}</span>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="nodrag text-[10px] font-medium text-indigo-600 hover:text-indigo-700"
          >
            展開 ▾
          </button>
        </div>
        {/* 疊圖預覽：後面幾張露出邊角 */}
        <div className="relative p-3 flex items-center justify-center min-h-[96px]">
          {layers!.slice(0, 3).map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`layer-${i}`}
              className="absolute w-[70%] object-contain border border-black/8 bg-neutral-50 shadow-sm"
              style={{ transform: `translate(${(i - 1) * 10}px, ${(i - 1) * 6}px) rotate(${(i - 1) * 3}deg)`, zIndex: 3 - i }}
              draggable={false}
            />
          ))}
        </div>
        {/* 折疊時對外仍暴露「代表輸出」(item-0)，未指定亦 fallback 第 0 個 */}
        <Handle type="source" position={Position.Right} id="item-0" />
      </div>
    );
  }

  // 展開視圖：逐項列出，各自有輸出接口與拖出鈕
  return (
    <div className={`w-[196px] bg-white border border-black/12 shadow-sm overflow-hidden ${ring}`}>
      <Handle type="target" position={Position.Left} />
      <div className="px-2 py-1 flex items-center justify-between border-b border-black/6">
        <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">圖層 · {count}</span>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="nodrag text-[10px] font-medium text-indigo-600 hover:text-indigo-700"
        >
          折疊 ▴
        </button>
      </div>
      <div className="divide-y divide-black/6">
        {layers!.map((src, i) => (
          <div key={i} className="relative flex items-center gap-2 px-2 py-1.5">
            <img
              src={src}
              alt={`layer-${i}`}
              className="w-9 h-9 object-contain bg-neutral-50 border border-black/8 shrink-0"
              draggable={false}
            />
            <span className="text-[10px] text-neutral-400 flex-1">#{i + 1}</span>
            <button
              type="button"
              onClick={() => detachImage?.(src, `圖層 ${i + 1}`)}
              className="nodrag text-[10px] font-medium text-neutral-500 hover:text-indigo-600 px-1.5 py-0.5 border border-black/10 hover:border-indigo-300"
              title="移出到畫布"
            >
              拖出
            </button>
            {/* 該項目專屬輸出接口，可各自接下游 */}
            <Handle
              type="source"
              position={Position.Right}
              id={`item-${i}`}
              style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => layers!.forEach((src, i) => detachImage?.(src, `圖層 ${i + 1}`))}
        className="nodrag block w-full px-2 py-1.5 text-[10px] font-semibold text-white bg-neutral-900 hover:bg-neutral-800 transition-colors"
      >
        整批匯出到畫布
      </button>
    </div>
  );
}
