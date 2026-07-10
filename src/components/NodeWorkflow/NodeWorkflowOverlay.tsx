import React, { useCallback, useEffect } from 'react';
import type { NodeGroupElement } from '../../types';
import type { NodeGraphData } from './types';
import type { ExecutorEngine } from './executor/nodeGraphExecutor';
import { useNodeGraphStore } from '../../store/nodeGraphStore';
import { NodeWorkflowCanvas } from './NodeWorkflowCanvas';
import { Icon } from '../Icon';

interface NodeWorkflowOverlayProps {
  element: NodeGroupElement;
  onClose: (graph: NodeGraphData) => void;
  /** 將目前 node group 的最終輸出匯入為大畫布圖片。 */
  onImportOutput?: () => void;
  /** 把帶圖節點拖到底部拖出區時觸發：新增為大畫布獨立圖片。 */
  onDetachImage?: (src: string, name?: string) => void;
  /** 執行引擎所需的 API key / model 設定。 */
  engine?: ExecutorEngine;
  /** 執行完成，最終輸出圖 → 寫回 NodeGroupElement.outputSrc。 */
  onOutputChange?: (src: string) => void;
  /** 節點圖被編輯後，清除已過期的大畫布預覽。 */
  onInvalidateOutput?: () => void;
  /** 執行失敗提示。 */
  onRunError?: (message: string) => void;
}

export function NodeWorkflowOverlay({ element, onClose, onImportOutput, onDetachImage, engine, onOutputChange, onInvalidateOutput, onRunError }: NodeWorkflowOverlayProps) {
  const [isGraphReady, setIsGraphReady] = React.useState(false);
  const loadGraph = useNodeGraphStore(state => state.loadGraph);
  const exportGraph = useNodeGraphStore(state => state.exportGraph);

  useEffect(() => {
    setIsGraphReady(false);
    loadGraph(element.graph);
    setIsGraphReady(true);
  }, [element.id, loadGraph]);

  const handleClose = useCallback(() => {
    onClose(exportGraph());
  }, [exportGraph, onClose]);

  return (
    <div className="fixed inset-0 z-[7000] bg-[#f8fafc] text-[#111827] animate-fade-in flex flex-col">
      <header className="h-14 px-5 border-b border-black/10 bg-white/88 backdrop-blur-xl flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold truncate">{element.name}</div>
          <div className="text-[11px] text-gray-500">
            {element.outputSrc ? '已有輸出，可匯入畫布' : '執行後可將輸出匯入畫布'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onImportOutput}
            disabled={!element.outputSrc || !onImportOutput}
            className={`h-9 px-3 rounded-full border text-[12px] font-semibold transition-colors flex items-center gap-1.5 ${
              element.outputSrc && onImportOutput
                ? 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
                : 'border-black/10 bg-white text-gray-300 cursor-not-allowed'
            }`}
          >
            <Icon name="add_photo_alternate" size={16} />
            匯入畫布
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 border border-black/12 bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors flex items-center justify-center"
            aria-label="關閉節點工作流"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      </header>
      <div className="flex-1 min-h-0 relative">
        {isGraphReady && (
          <NodeWorkflowCanvas
            onDetachImage={onDetachImage}
            engine={engine}
            onOutputChange={onOutputChange}
            onInvalidateOutput={onInvalidateOutput}
            onRunError={onRunError}
          />
        )}
      </div>
    </div>
  );
}
