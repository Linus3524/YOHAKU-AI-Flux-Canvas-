import React from 'react';
import { Icon } from '../../Icon';

interface ImagePreviewActionsProps {
  onDelete?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onImport?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  deleteTitle?: string;
}

/** 所有節點圖片預覽共用：hover 左上刪除、右上匯入主畫布。 */
export function ImagePreviewActions({
  onDelete,
  onImport,
  deleteTitle = '刪除圖片結果',
}: ImagePreviewActionsProps) {
  return (
    <>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="nodrag absolute left-1.5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-black/10 bg-white/90 text-neutral-500 opacity-0 shadow-sm backdrop-blur transition-all pointer-events-auto cursor-pointer group-hover/image:opacity-100 hover:scale-105 hover:bg-white hover:text-red-600 active:scale-95"
          title={deleteTitle}
        >
          <Icon name="delete" size={13} />
        </button>
      )}
      {onImport && (
        <button
          type="button"
          onClick={onImport}
          className="nodrag absolute right-1.5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-black/10 bg-white/90 text-neutral-600 opacity-0 shadow-sm backdrop-blur transition-all pointer-events-auto cursor-pointer group-hover/image:opacity-100 hover:scale-105 hover:bg-white hover:text-neutral-900 active:scale-95"
          title="匯入此圖片到主畫布"
        >
          <Icon name="add_photo_alternate" size={13} />
        </button>
      )}
    </>
  );
}
