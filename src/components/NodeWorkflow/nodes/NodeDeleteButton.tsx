import React from 'react';

interface NodeDeleteButtonProps {
  onDelete?: () => void;
  selected?: boolean;
}

export function NodeDeleteButton({ onDelete, selected }: NodeDeleteButtonProps) {
  if (!onDelete) return null;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onDelete();
      }}
      className={`nodrag absolute -right-2 -top-2 z-10 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md border border-white transition-all hover:scale-110 active:scale-90 text-[10px] font-bold ${
        selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}
      title="刪除此節點"
      aria-label="刪除此節點"
    >
      x
    </button>
  );
}
