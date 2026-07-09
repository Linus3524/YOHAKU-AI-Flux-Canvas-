import { createContext, useContext } from 'react';

/** 節點內部（如 Batch 節點的個別項目）需要呼叫畫布層能力時透過此 context 取得。 */
export interface NodeWorkflowContextValue {
  /** 把一張圖移出到大畫布（個別項目拖出／整批匯出共用）。 */
  detachImage?: (src: string, name?: string) => void;
}

export const NodeWorkflowContext = createContext<NodeWorkflowContextValue>({});

export const useNodeWorkflowContext = () => useContext(NodeWorkflowContext);
