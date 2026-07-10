import React from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { NoteParams } from '../types';
import { NodeDeleteButton } from './NodeDeleteButton';
import { useNodeStatusRing } from './useNodeStatusRing';
import { Icon } from '../../Icon';

const DEFAULT_NOTE_COLOR = '#fef08a'; // 溫暖黃色

/**
 * 便利貼節點：純文字輸入源，可同時連往多個生圖或優化節點，並支援在右鍵選單改底色與卡片摺疊。
 */
export function NoteNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const ring = useNodeStatusRing(id);
  const params = (data?.params ?? {}) as Partial<NoteParams & { isCollapsed?: boolean }>;
  const onDeleteNode = data?.onDeleteNode;
  const handleDelete = typeof onDeleteNode === 'function'
    ? () => (onDeleteNode as (nodeId: string) => void)(id)
    : undefined;

  const color = params.color || DEFAULT_NOTE_COLOR;
  const isCollapsed = !!params.isCollapsed;
  const textValue = params.text ?? '';

  return (
    <div
      className={`group relative border border-black/12 shadow-sm w-[176px] overflow-visible transition-colors duration-200 ${ring}`}
      style={{ backgroundColor: color }}
    >
      <NodeDeleteButton onDelete={handleDelete} selected={selected} />
      
      {/* 標題欄 */}
      <div className="px-2 py-1 text-[10px] font-semibold text-neutral-600 tracking-wide uppercase border-b border-black/6 flex items-center justify-between select-none">
        <div className="flex items-center gap-1">
          <Icon name="description" size={11} className="text-neutral-500" />
          <span>便利貼</span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            updateNodeData(id, { params: { ...params, isCollapsed: !isCollapsed } });
          }}
          className="nodrag text-neutral-500 hover:text-neutral-800 transition-colors w-4 h-4 flex items-center justify-center cursor-pointer"
          title={isCollapsed ? '展開便利貼' : '摺疊便利貼'}
        >
          <Icon name={isCollapsed ? 'expand_more' : 'expand_less'} size={12} />
        </button>
      </div>

      {/* 編輯區或預覽區 */}
      {isCollapsed ? (
        <div className="p-1.5 text-[10px] text-neutral-500 italic truncate select-none">
          {textValue.trim() ? textValue : '(空白便利貼)'}
        </div>
      ) : (
        <div className="p-1.5">
          <textarea
            value={textValue}
            onChange={(e) => updateNodeData(id, { params: { ...params, text: e.target.value } })}
            placeholder="在此輸入提示詞或文字備忘..."
            className="nodrag block w-full h-24 border border-black/8 px-1.5 py-1 text-[11px] font-mono focus:outline-none focus:border-black/30 bg-white/40 resize-none placeholder-neutral-400"
          />
        </div>
      )}

      {/* 輸出接口 */}
      <Handle type="source" position={Position.Right} id="text" />
    </div>
  );
}
