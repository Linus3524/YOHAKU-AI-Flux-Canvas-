import { useNodeGraphStore } from '../../../store/nodeGraphStore';

/**
 * 依執行狀態回傳節點外框的 ring className（最小版視覺；精緻進度條/發光留給 UI 打磨輪）。
 * running=藍(呼吸)、done=綠、error=紅。
 */
export function useNodeStatusRing(id: string): string {
  const status = useNodeGraphStore(s => s.nodeStatus[id]);
  if (status === 'running') return 'ring-2 ring-[#007AFF] animate-pulse';
  if (status === 'done') return 'ring-2 ring-[#34C759]';
  if (status === 'error') return 'ring-2 ring-red-500';
  return '';
}
