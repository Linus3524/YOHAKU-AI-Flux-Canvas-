
import { useState, useCallback } from 'react';

type SetStateOptions = {
  addToHistory?: boolean;
};

type Internal<T> = {
  history: T[];
  index: number;
};

export const useHistoryState = <T>(initialState: T) => {
  const [internal, setInternal] = useState<Internal<T>>({
    history: [initialState],
    index: 0,
  });

  const state = internal.history[internal.index];
  const canUndo = internal.index > 0;
  const canRedo = internal.index < internal.history.length - 1;

  const setState = useCallback((
    action: T | ((prevState: T) => T),
    options: SetStateOptions = { addToHistory: true }
  ) => {
    // functional update：避免 stale closure 造成連續 setState 互相覆蓋（幽靈歷史）
    setInternal(prev => {
      const cur = prev.history[prev.index];
      const resolvedState = typeof action === 'function'
        ? (action as (prevState: T) => T)(cur)
        : action;

      if (options.addToHistory) {
        // 去重：與當前 head 完全相同（同一個 reference）就不新增
        // 攔掉 `setState(prev => prev, { addToHistory: true })` 這類重複 commit
        if (resolvedState === cur) return prev;

        const newHistory = prev.history.slice(0, prev.index + 1);
        newHistory.push(resolvedState);
        return { history: newHistory, index: newHistory.length - 1 };
      }

      // 原地覆寫當前 checkpoint（不新增歷史）
      const newHistory = [...prev.history];
      newHistory[prev.index] = resolvedState;
      return { history: newHistory, index: prev.index };
    });
  }, []);

  const undo = useCallback(() => {
    setInternal(prev => (prev.index > 0 ? { ...prev, index: prev.index - 1 } : prev));
  }, []);

  const redo = useCallback(() => {
    setInternal(prev => (prev.index < prev.history.length - 1 ? { ...prev, index: prev.index + 1 } : prev));
  }, []);

  return { state, setState, undo, redo, canUndo, canRedo };
};
