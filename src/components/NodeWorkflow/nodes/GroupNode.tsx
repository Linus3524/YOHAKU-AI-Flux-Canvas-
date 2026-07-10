import React, { useState } from 'react';
import { NodeResizer, useReactFlow, type NodeProps } from '@xyflow/react';
import type { GroupParams } from '../types';
import { NodeDeleteButton } from './NodeDeleteButton';

const GROUP_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

export function GroupNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const params = (data?.params ?? {}) as Partial<GroupParams>;
  const [isEditing, setIsEditing] = useState(false);
  const label = params.label?.trim() || '節點框組';
  const color = params.color || GROUP_COLORS[0];
  const onDeleteNode = data?.onDeleteNode;
  const handleDelete = typeof onDeleteNode === 'function'
    ? () => (onDeleteNode as (nodeId: string) => void)(id)
    : undefined;

  const setParams = (patch: Partial<GroupParams>) => {
    updateNodeData(id, { params: { ...params, ...patch } });
  };

  return (
    <div
      className="relative h-full w-full pointer-events-none"
      style={{
        border: `1.5px solid ${color}`,
        backgroundColor: `${color}14`,
      }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={240}
        minHeight={160}
        lineStyle={{ borderColor: color, pointerEvents: 'auto' }}
        handleStyle={{ width: 8, height: 8, borderColor: color, backgroundColor: '#fff', pointerEvents: 'auto' }}
        onResizeEnd={(_event, next) => setParams({ width: next.width, height: next.height })}
      />
      <div className="pointer-events-auto absolute left-2 top-2 z-10 flex h-7 cursor-move items-center gap-1.5 bg-white/90 px-2 shadow-sm">
        {isEditing ? (
          <input
            autoFocus
            defaultValue={label}
            className="nodrag w-[112px] bg-transparent text-[11px] font-semibold text-neutral-800 outline-none"
            onBlur={(event) => {
              setParams({ label: event.currentTarget.value.trim() || '節點框組' });
              setIsEditing(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') setIsEditing(false);
            }}
          />
        ) : (
          <button
            type="button"
            className="nodrag max-w-[132px] truncate text-[11px] font-semibold text-neutral-800"
            onDoubleClick={(event) => {
              event.stopPropagation();
              setIsEditing(true);
            }}
            title="雙擊重新命名"
          >
            {label}
          </button>
        )}
        <div className="nodrag flex items-center gap-0.5">
          {GROUP_COLORS.map(nextColor => (
            <button
              key={nextColor}
              type="button"
              aria-label={`框組顏色 ${nextColor}`}
              className="h-3.5 w-3.5 border border-white shadow-sm"
              style={{ backgroundColor: nextColor }}
              onClick={(event) => {
                event.stopPropagation();
                setParams({ color: nextColor });
              }}
            />
          ))}
        </div>
      </div>
      <div className="pointer-events-auto">
        <NodeDeleteButton onDelete={handleDelete} selected={selected} />
      </div>
    </div>
  );
}
