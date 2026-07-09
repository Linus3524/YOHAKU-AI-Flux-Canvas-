import React from 'react';
import { useNodeGraphStore } from '../../../store/nodeGraphStore';
import { isImageSrc } from '../mediaSrc';

/**
 * 動作節點的結果預覽：執行後從 store 讀該節點的結果並顯示。
 * 圖片完全貼合節點寬度，響應式高度。沒有結果時不佔空間。
 */
export function NodeResultPreview({ id }: { id: string }) {
  const result = useNodeGraphStore(s => s.nodeResults[id]);
  if (!result) return null;

  return (
    <div className="border-t border-black/6">
      {isImageSrc(result) ? (
        <img
          src={result}
          alt="結果"
          className="block w-full object-contain bg-neutral-50"
          style={{ maxHeight: 200 }}
          draggable={false}
        />
      ) : (
        <div className="w-full max-h-[100px] overflow-hidden bg-[#FEFCE8] px-2 py-1.5 text-[11px] leading-relaxed text-neutral-800 whitespace-pre-wrap">
          {result}
        </div>
      )}
    </div>
  );
}
