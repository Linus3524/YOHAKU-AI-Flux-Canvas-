import React from 'react';
import { useNodeId, useReactFlow } from '@xyflow/react';
import { Icon } from '../../Icon';

interface NodeDeleteButtonProps {
  onDelete?: () => void;
  selected?: boolean;
}

export function NodeDeleteButton({ onDelete, selected }: NodeDeleteButtonProps) {
  const id = useNodeId();
  const { getNode } = useReactFlow();
  const node = id ? getNode(id) : undefined;
  const onRunNode = node?.data?.onRunNode;
  const isTerminalNode = node?.data?.isTerminalNode === true;
  if (typeof onRunNode !== 'function') return null;
  return (
    <button
      type="button"
      className="nodrag absolute -top-7 right-0 h-6 px-2 flex items-center gap-1 border border-black/15 bg-white text-[10px] font-medium text-neutral-700 hover:bg-neutral-900 hover:text-white z-20"
      onClick={(event) => { event.stopPropagation(); (onRunNode as (nodeId: string) => void)(id!); }}
      title={isTerminalNode ? '執行從輸入到此最尾端節點的完整流程' : '只執行此節點與必要的上游節點'}
    >
      <Icon name="play_arrow" size={12} /> {isTerminalNode ? '執行整段' : '執行'}
    </button>
  );
}
