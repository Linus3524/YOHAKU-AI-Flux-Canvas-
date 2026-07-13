import React, { useContext, useState, useEffect } from 'react';
import { useNodeGraphStore } from '../../../store/nodeGraphStore';
import { isImageSrc } from '../mediaSrc';
import { NodeWorkflowContext } from '../NodeWorkflowContext';
import { Icon } from '../../Icon';
import { ImagePreviewActions } from './ImagePreviewActions';

/**
 * 動作節點的結果預覽：執行後從 store 讀該節點的結果並顯示。
 * 圖片完全貼合節點寬度，響應式高度。沒有結果時不佔空間。
 */
export function NodeResultPreview({ id }: { id: string }) {
  const result = useNodeGraphStore(s => s.nodeResults[id]);
  const clearNodeResult = useNodeGraphStore(s => s.clearNodeResult);
  const { detachImage, invalidateOutput } = useContext(NodeWorkflowContext);
  
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // 點擊空白處關閉右鍵選單
  useEffect(() => {
    if (!contextMenu) return;
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [contextMenu]);

  if (!result) return null;

  const handleExport = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (detachImage && isImageSrc(result)) {
      detachImage(result);
    }
  };

  const handleClearResult = (e: React.MouseEvent) => {
    e.stopPropagation();
    setContextMenu(null);
    clearNodeResult(id);
    invalidateOutput?.();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!isImageSrc(result)) return; // 非圖片結果不彈出選單
    e.preventDefault();
    e.stopPropagation();
    
    // 獲取相對於螢幕的座標
    setContextMenu({
      x: e.clientX,
      y: e.clientY
    });
  };

  return (
    <div className="relative border-t border-black/6">
      {isImageSrc(result) ? (
        <div className="group/image relative w-full h-auto overflow-hidden">
          <img
            src={result}
            alt="結果"
            className="block w-full h-auto"
            style={{ display: 'block' }}
            draggable={false}
            onContextMenu={handleContextMenu}
          />
          
          <ImagePreviewActions
            onDelete={handleClearResult}
            onImport={detachImage ? handleExport : undefined}
            deleteTitle="刪除圖片結果（保留節點）"
          />

          {/* 右鍵選單 */}
          {contextMenu && detachImage && (
            <>
              <div 
                className="fixed inset-0 z-[8000]" 
                onClick={() => setContextMenu(null)}
                onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
              />
              <div
                className="fixed z-[8010] min-w-[124px] border border-black/12 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.16)] py-1 select-none pointer-events-auto"
                style={{ left: contextMenu.x, top: contextMenu.y }}
              >
                <button
                  type="button"
                  onClick={handleExport}
                  className="nodrag flex items-center gap-1.5 w-full px-3 py-1.5 text-left text-[11px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  <Icon name="add_photo_alternate" size={13} />
                  匯入此圖片到主畫布
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="w-full max-h-[100px] overflow-hidden bg-[#FEFCE8] px-2 py-1.5 text-[11px] leading-relaxed text-neutral-800 whitespace-pre-wrap">
          {result}
        </div>
      )}
    </div>
  );
}
