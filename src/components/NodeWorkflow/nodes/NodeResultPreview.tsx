import React from 'react';
import { useNodeGraphStore } from '../../../store/nodeGraphStore';
import { isImageSrc } from '../mediaSrc';

/**
 * 動作節點的結果縮圖：執行後從 store 讀該節點的結果並顯示（圖片或文字）。
 * 沒有結果時不佔空間（回傳 null）。
 */
export function NodeResultPreview({ id }: { id: string }) {
  const result = useNodeGraphStore(s => s.nodeResults[id]);
  if (!result) return null;

  return (
    <div className="px-2 pb-2">
      {isImageSrc(result) ? (
        <img
          src={result}
          alt="結果"
          className="block w-full h-[110px] object-contain rounded-md bg-[#F5F5F7] border border-black/5"
          draggable={false}
        />
      ) : (
        <div className="w-full max-h-[120px] overflow-hidden rounded-md bg-[#FEFCE8] px-2 py-1.5 text-[11px] leading-relaxed text-[#1D1D1F] whitespace-pre-wrap border border-black/5">
          {result}
        </div>
      )}
    </div>
  );
}
