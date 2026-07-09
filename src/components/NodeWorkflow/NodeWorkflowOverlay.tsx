import React, { useCallback, useEffect } from 'react';
import type { NodeGroupElement } from '../../types';
import type { NodeGraphData } from './types';
import { useNodeGraphStore } from '../../store/nodeGraphStore';
import { NodeWorkflowCanvas } from './NodeWorkflowCanvas';
import { Icon } from '../Icon';

interface NodeWorkflowOverlayProps {
  element: NodeGroupElement;
  onClose: (graph: NodeGraphData) => void;
}

export function NodeWorkflowOverlay({ element, onClose }: NodeWorkflowOverlayProps) {
  const [isGraphReady, setIsGraphReady] = React.useState(false);
  const loadGraph = useNodeGraphStore(state => state.loadGraph);
  const exportGraph = useNodeGraphStore(state => state.exportGraph);

  useEffect(() => {
    setIsGraphReady(false);
    loadGraph(element.graph);
    setIsGraphReady(true);
  }, [element.graph, element.id, loadGraph]);

  const handleClose = useCallback(() => {
    onClose(exportGraph());
  }, [exportGraph, onClose]);

  return (
    <div className="fixed inset-0 z-[7000] bg-[#f8fafc] text-[#111827] animate-fade-in flex flex-col">
      <header className="h-14 px-5 border-b border-black/10 bg-white/85 backdrop-blur-xl flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold truncate">{element.name}</div>
          <div className="text-[11px] text-gray-500">Node workflow</div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="w-9 h-9 rounded-full border border-black/10 bg-white text-gray-600 hover:text-gray-950 hover:bg-gray-50 transition-colors flex items-center justify-center"
          aria-label="關閉節點工作流"
        >
          <Icon name="close" size={18} />
        </button>
      </header>
      <div className="flex-1 min-h-0 relative">
        {isGraphReady && <NodeWorkflowCanvas />}
      </div>
    </div>
  );
}
