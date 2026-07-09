import { useCallback, useState } from 'react';
import type { DesignMasterPersistState } from '../components/DesignMasterPanel';
import type { CanvasElement, EditorVersion, ImageElement, SmartLayer } from '../types';

type SemanticEditorState = {
  compositeBase64: string;
  backgroundBase64?: string;
  layers: SmartLayer[];
  originalLayers?: SmartLayer[];
  versions: EditorVersion[];
};

type ElementSetter = (
  updater: CanvasElement[] | ((prev: CanvasElement[]) => CanvasElement[]),
  options?: { addToHistory?: boolean }
) => void;

export const useEditorTargets = ({
  elements,
  setElements,
}: {
  elements: CanvasElement[];
  setElements: ElementSetter;
}) => {
  // --- Semantic Editor state (handler defined later, after elements) ---
  const [semanticEditorTarget, setSemanticEditorTarget] = useState<{ src: string; name: string; elementId?: string } | null>(null);
  const [resizeImageTargetId, setResizeImageTargetId] = useState<string | null>(null);

  /**
   * 保留每張圖片的語意編輯器狀態，key = element.src（base64 前 100 字元作為識別）
   * 退出時 save=true 就保留，下次開同一張圖可以繼續
   */
  const [savedSemanticStates, setSavedSemanticStates] = useState<Record<string, SemanticEditorState>>({});

  const [designMasterTargetId, setDesignMasterTargetId] = useState<string | null>(null);
  // 每張便利貼上次的設計大師設定（key = elementId）：重複進入同一張便利貼時還原設定
  const [designMasterStates, setDesignMasterStates] = useState<Record<string, DesignMasterPersistState>>({});

  // --- Semantic Editor handler (needs elements) ---
  const handleOpenSemanticEditor = useCallback((elementId: string) => {
    const el = elements.find(e => e.id === elementId && e.type === 'image') as ImageElement | undefined;
    if (!el) return;
    // 優先從 ImageElement.semanticState 讀取（跨電腦/檔案）
    const seedKey = semanticStateKey({ elementId: el.id, src: el.src });
    if (el.semanticState && !savedSemanticStates[seedKey]) {
      setSavedSemanticStates(prev => ({ ...prev, [seedKey]: el.semanticState! }));
    }
    setSemanticEditorTarget({ src: el.src, name: el.name || '圖片', elementId });
  }, [elements, savedSemanticStates]);

  /** 狀態鍵：優先用畫布元素的唯一 id。
   *  （不可用 src 前 80 字元：不同圖片的 base64 前綴常相同 → key 碰撞 → 不同圖片互相污染狀態）
   *  無 elementId 時退回「完整 src」的 cyrb53 雜湊，仍能區分不同內容。 */
  const hashStr = (s: string) => {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  };
  const semanticStateKey = (t: { elementId?: string; src: string }) =>
    t.elementId ? `el:${t.elementId}` : `src:${hashStr(t.src)}`;

  /** 把語意狀態同步寫回 ImageElement（方向 C：跟著圖片走，JSON/檔案都能帶走） */
  const syncSemanticStateToElement = useCallback((
    elementId: string | undefined,
    state: SemanticEditorState
  ) => {
    if (!elementId) return;
    setElements(prev => prev.map(el =>
      el.id === elementId && el.type === 'image'
        ? { ...el, semanticState: {
            compositeBase64: state.compositeBase64,
            backgroundBase64: state.backgroundBase64 ?? state.compositeBase64,
            layers: state.layers,
            originalLayers: state.originalLayers ?? state.layers,
            versions: state.versions,
          } } as ImageElement
        : el
    ));
  }, [setElements]);

  /** 退出語意編輯器：save=true 保留紀錄，save=false 清除 */
  const handleCloseSemanticEditor = useCallback((
    save: boolean,
    savedState?: SemanticEditorState
  ) => {
    if (save && savedState && semanticEditorTarget) {
      const key = semanticStateKey(semanticEditorTarget);
      setSavedSemanticStates(prev => ({ ...prev, [key]: savedState }));
      // 同時寫回 ImageElement（持久化）
      syncSemanticStateToElement(semanticEditorTarget.elementId, savedState);
    } else if (!save && semanticEditorTarget) {
      const key = semanticStateKey(semanticEditorTarget);
      setSavedSemanticStates(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      // 清除 ImageElement 上的語意狀態
      syncSemanticStateToElement(semanticEditorTarget.elementId, { compositeBase64: semanticEditorTarget.src, layers: [], versions: [] });
    }
    setSemanticEditorTarget(null);
  }, [semanticEditorTarget, syncSemanticStateToElement]);

  // --- 一鍵跨平台適配 ---
  const [crossPlatformTarget, setCrossPlatformTarget] = useState<{ elementId: string; name: string } | null>(null);
  const handleOpenCrossPlatform = useCallback((elementId: string) => {
      const el = elements.find(e => e.id === elementId && e.type === 'image') as ImageElement | undefined;
      if (!el) return;
      setCrossPlatformTarget({ elementId, name: el.name });
  }, [elements]);

  // --- 延伸品牌套件 ---
  const [brandKitTarget, setBrandKitTarget] = useState<{ elementId: string; name: string } | null>(null);
  const handleOpenBrandKit = useCallback((elementId: string) => {
      const el = elements.find(e => e.id === elementId && e.type === 'image') as ImageElement | undefined;
      if (!el) return;
      setBrandKitTarget({ elementId, name: el.name });
  }, [elements]);

  // --- 產品行銷組圖 ---
  const [productMarketingTarget, setProductMarketingTarget] = useState<{ elementId: string; name: string } | null>(null);
  const handleOpenProductMarketing = useCallback((elementId: string) => {
      const el = elements.find(e => e.id === elementId && e.type === 'image') as ImageElement | undefined;
      if (!el) return;
      setProductMarketingTarget({ elementId, name: el.name });
  }, [elements]);

  // --- 便利貼右鍵：開啟設計大師面板（API Key 在生成時才檢查） ---
  const handleOpenDesignMaster = useCallback((elementId: string) => {
      const element = elements.find(el => el.id === elementId);
      if (!element || (element.type !== 'note' && element.type !== 'text')) return;
      setDesignMasterTargetId(elementId);
  }, [elements]);

  return {
    semanticEditorTarget,
    setSemanticEditorTarget,
    resizeImageTargetId,
    setResizeImageTargetId,
    savedSemanticStates,
    setSavedSemanticStates,
    semanticStateKey,
    syncSemanticStateToElement,
    handleOpenSemanticEditor,
    handleCloseSemanticEditor,
    designMasterTargetId,
    setDesignMasterTargetId,
    designMasterStates,
    setDesignMasterStates,
    handleOpenDesignMaster,
    crossPlatformTarget,
    setCrossPlatformTarget,
    handleOpenCrossPlatform,
    brandKitTarget,
    setBrandKitTarget,
    handleOpenBrandKit,
    productMarketingTarget,
    setProductMarketingTarget,
    handleOpenProductMarketing,
  };
};
