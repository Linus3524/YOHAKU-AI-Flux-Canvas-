import React, { useMemo } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { StyleParams } from '../types';
import { useNodeStatusRing } from './useNodeStatusRing';
import { NodeResultPreview } from './NodeResultPreview';
import { NodeDeleteButton } from './NodeDeleteButton';
import { getVisualStyleList, type VisualStyleTemplate } from '../../../skills/styles';

// 風格藝術庫分類的中文標籤與顯示順序。
const CATEGORY_LABELS: Record<VisualStyleTemplate['category'], string> = {
  Tech: '科技', Dark: '暗黑', Artistic: '藝術', Playful: '趣味',
  Minimal: '極簡', Warm: '暖色', Cool: '冷色', Comic: '漫畫', Specialized: '專門',
};
const CATEGORY_ORDER: VisualStyleTemplate['category'][] = [
  'Artistic', 'Playful', 'Comic', 'Warm', 'Cool', 'Minimal', 'Tech', 'Dark', 'Specialized',
];

/**
 * 風格轉換節點：從系統風格藝術庫（60+ 種）選擇，實際套用由執行引擎呼叫 pipeline。
 */
export function StyleNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const ring = useNodeStatusRing(id);
  const params = (data?.params ?? {}) as Partial<StyleParams>;
  const onDeleteNode = data?.onDeleteNode;
  const handleDelete = typeof onDeleteNode === 'function'
    ? () => (onDeleteNode as (nodeId: string) => void)(id)
    : undefined;

  // 依分類把整個風格庫分組（一次算好）。
  const grouped = useMemo(() => {
    const list = getVisualStyleList();
    return CATEGORY_ORDER
      .map(category => ({
        category,
        label: CATEGORY_LABELS[category],
        styles: list.filter(s => s.category === category),
      }))
      .filter(g => g.styles.length > 0);
  }, []);

  return (
    <div className={`group relative border border-black/12 bg-white shadow-sm w-[170px] overflow-visible ${ring}`}>
      <NodeDeleteButton onDelete={handleDelete} selected={selected} />
      <Handle type="target" position={Position.Left} />
      <div className="px-2 py-1 text-[10px] font-semibold text-neutral-500 tracking-wide uppercase border-b border-black/6">
        風格轉換
      </div>
      <div className="p-1.5">
        <select
          value={params.styleKey ?? 'none'}
          onChange={(e) => updateNodeData(id, { params: { ...params, styleKey: e.target.value } })}
          className="nodrag block w-full border border-neutral-200 px-1.5 py-1 text-[11px] focus:outline-none focus:border-neutral-400 bg-neutral-50"
        >
          <option value="none">未選擇</option>
          {grouped.map(group => (
            <optgroup key={group.category} label={group.label}>
              {group.styles.map(s => (
                <option key={s.id} value={s.id}>{s.name_zh}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <NodeResultPreview id={id} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
