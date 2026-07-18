/**
 * @project     YOHAKU (Infinite Canvas Design Tool)
 * @author      LINUS Nice Day Japan (CHANG CHIN WEI)
 * @copyright   Copyright © 2026 LINUS Nice Day Japan (CHANG CHIN WEI). All Rights Reserved.
 *
 * @credits     Based on the open-source foundational framework "Nano Banana"
 * by @prompt_case, used under MIT License.
 *
 * This file contains proprietary enhancements and logic specific to YOHAKU.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { InfiniteCanvas, CanvasApi } from './components/InfiniteCanvas';
import { ContextMenu } from './components/ContextMenu';
import { StylePasteModal } from './components/StylePasteModal';
import { DesignMasterPanel } from './components/DesignMasterPanel';
import { DrawingModal } from './components/DrawingModal';
import { ImageEditModal } from './components/ImageEditModal';
import { CrossPlatformModal } from './components/CrossPlatformModal';
import { BrandKitModal } from './components/BrandKitModal';
import { ProductMarketingModal } from './components/ProductMarketingModal';
import { MagicLayerModal } from './components/MagicLayerModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { StyleLibraryPanel } from './components/StyleLibraryPanel';
import { GeneratedResultsModal } from './components/GeneratedResultsModal';
import { ClearStorageConfirmModal, GenerationIntentModal, ImageDropOverlay, SaveConfirmModal } from './components/AppModals';
import { AppTopStatusBar } from './components/AppTopStatusBar';
import { ImageResizeModal } from './components/ImageResizeModal';
import { DraggableToolbar } from './components/DraggableToolbar';
import { LayerPanel } from './components/LayerPanel';
import { TextPropertyPanel } from './components/TextPropertyPanel';
import { ShapePropertyPanel } from './components/ShapePropertyPanel'; 
import { ArrowPropertyPanel } from './components/ArrowPropertyPanel';
import { FloatingAssistant } from './components/FloatingAssistant'; 
import { ArtboardPanel, downloadArtboard, downloadMultipleArtboards, exportArtboardsAsPDF } from './features/artboard';
import { useCanvas } from './hooks/useCanvas';
import { useAI } from './hooks/useAI';
import { useEditorTargets } from './hooks/useEditorTargets';
import { useFilePersistence } from './hooks/useFilePersistence';
import { useAppAiActions } from './hooks/useAppAiActions';
import { STYLE_PRESETS, COLORS, isCJK, wrapTextCanvas, loadImage, createShapeDataUrl, restoreOriginalAlpha, getClosestAspectRatio, measureTextVisualBounds, renderImageElementToDataUrl } from './utils/helpers';
import { downloadImageAsBase64, callAtlasImg2Img } from './utils/atlasImage';
import { cacheImage, getCachedImage, deleteCachedImage } from './utils/imageCache';
import { SVGExportModal } from './components/SVGExportModal';
import { SemanticEditorView } from './components/SemanticEditor';
import { NodeWorkflowOverlay } from './components/NodeWorkflow/NodeWorkflowOverlay';
import { useNodeGraphStore } from './store/nodeGraphStore';
import { detectBackgroundColor, repairStickerTransparency, flattenBackgroundToColor } from './utils/imageProcessing';
import type {
    DrawingElement, ImageElement, TextElement, ShapeElement, Point, ShapeType, ArrowElement, FrameElement, NoteElement, CanvasElement, ArtboardElement, NodeGroupElement
} from './types';
import type { NodeGraphData } from './components/NodeWorkflow/types';
import { analyzeMagicLayerPlan, type MagicLayerModel, type MagicLayerOptions } from './utils/gptLayerSplit';
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

const App: React.FC = () => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // --- Image Model Selection ---
  const [imageModel, setImageModel] = useState<string>(
    () => localStorage.getItem('yohaku_image_model') || 'gemini-3.1-flash-image'
  );
  const handleSetImageModel = (model: string) => {
    localStorage.setItem('yohaku_image_model', model);
    setImageModel(model);
  };

  // --- Artboard Panel persistent tracking ---
  const [lastSelectedArtboardId, setLastSelectedArtboardId] = useState<string | null>(null);

  // --- Atlas Cloud Key ---
  const [atlasApiKey, setAtlasApiKey] = useState<string | null>(
    () => localStorage.getItem('yohaku_atlas_key')
  );
  const handleSaveAtlasKey = (key: string) => {
    localStorage.setItem('yohaku_atlas_key', key);
    setAtlasApiKey(key);
  };

  // --- fal.ai Key ---
  const [falApiKey, setFalApiKey] = useState<string | null>(
    () => localStorage.getItem('yohaku_fal_key')
  );
  const handleSaveFalKey = (key: string) => {
    localStorage.setItem('yohaku_fal_key', key);
    setFalApiKey(key);
  };

  // --- Generation Model (Gemini / GPT Image 2 / Seedream) ---
  const [generationModel, setGenerationModel] = useState<string>(
    () => localStorage.getItem('yohaku_gen_model') || 'gemini'
  );
  const handleSetGenerationModel = (model: string) => {
    localStorage.setItem('yohaku_gen_model', model);
    setGenerationModel(model);
  };

  // --- API Key Management ---
  const [userApiKey, setUserApiKey] = useState<string | null>(() => localStorage.getItem('yohaku_api_key'));
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSVGExportModal, setShowSVGExportModal] = useState(false);
  const [showStoragePopover, setShowStoragePopover] = useState(false);

  // The 'effectiveApiKey' holds the string value (strictly local storage for BYOK).
  const effectiveApiKey = userApiKey;
  
  // 'isKeyValid' tracks the logic state. 
  const [isKeyValid, setIsKeyValid] = useState(!!effectiveApiKey);

  const handleSaveManualKey = (key: string) => {
      localStorage.setItem('yohaku_api_key', key);
      setUserApiKey(key);
      setIsKeyValid(true); 
      setShowKeyModal(false);
      showToast("API Key 已儲存！開始創作吧 🎨");
  };

  const handleAuthError = useCallback((isValid: boolean) => {
      if (!isValid) {
          // Explicitly mark key as invalid to turn the light RED
          setIsKeyValid(false);
          setShowKeyModal(true);
      }
  }, []);

  // Effect: If user manually changes key, re-evaluate validity to true tentatively
  useEffect(() => {
      if (effectiveApiKey) {
          setIsKeyValid(true);
      } else {
          setIsKeyValid(false);
      }
  }, [userApiKey]);

  // 啟動時自動清除換模型後遺留的孤兒 ONNX 快取（舊版相片/動漫模型）
  useEffect(() => {
      import('./utils/onnxModelCache').then(m => m.cleanOrphanModelCaches());
  }, []);

  const {
      elements,
      setElements,
      selectedElementIds,
      setSelectedElementIds,
      undo,
      redo,
      canUndo,
      canRedo,
      canvasApiRef,
      zIndexCounter,
      croppingElementId,
      setCroppingElementId,
      activeShapeTool,
      setActiveShapeTool,
      creatingShapeId,
      setCreatingShapeId,
      shapeStartPointRef,
      getCenterOfViewport,
      addNote,
      addText,
      // addArrow is overridden below
      addDrawing,
      addImagesToCanvas,
      addFrame,
      addElement,
      addArtboard,
      handleSelectElement,
      handleMarqueeSelect,
      updateElements: originalUpdateElements, // Rename to use wrapper
      updateMultipleElements,
      beginTransform,
      endTransform,
      handleMergeLayers: originalMergeLayers,
      handleStartCrop,
      handleCancelCrop,
      handleApplyCrop,
      handleToggleVisibility,
      handleToggleLock,
      handleToggleGroupVisibility,
      handleToggleGroupLock,
      handleRename,
      handleResizeElement,
      handleLayerDragDrop,
      handleGroupLayerDragDrop,
      handleDeleteLayer,
      handleGroup,
      handleUngroup,
      copySelection,
      pasteSelection,
      duplicateSelection,
      duplicateInPlace,
      bringToFront,
      bringForward,
      sendBackward,
      sendToBack,
      alignElements,
      handleRasterizeText: originalRasterizeText,
      handleRasterizeShape,
      handleRasterizeArrow,
      handleExportCanvas: originalExportCanvas,
      handleImportCanvas: originalImportCanvas,
      handleSaveFile,
      handleSaveAsFile,
      handleOpenFile,
      handleNewCanvas,
      currentFileName,
      isFileSystemSupported,
      storageStatus,
      pauseAutoSave,
      resumeAutoSave,
      clearStorage,
      showImageSizes,
      toggleShowImageSizes,
      snapToObjects,
      toggleSnapToObjects,
      activeGuidelines,
  } = useCanvas(showToast);

  const {
    semanticEditorTarget,
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
  } = useEditorTargets({
      elements,
      setElements,
  });

  const {
    saveConfirmOpen,
    setSaveConfirmOpen,
    handleSaveFileWithConfirm,
    handleSaveConfirmProceed,
    handleSaveConfirmDiscard,
  } = useFilePersistence({
      currentFileName,
      handleSaveFile,
      handleNewCanvas,
      showToast,
  });

  // Wrap handleDeleteLayer to also clean up IndexedDB cache
  const handleDeleteLayerWithCache = useCallback((id: string) => {
    const el = elements.find(e => e.id === id);
    if (el && el.type === 'image') deleteCachedImage(id);
    handleDeleteLayer(id);
  }, [elements, handleDeleteLayer]);

  const [generatingLabels, setGeneratingLabels] = useState<Record<string, string>>({});
  const [isDraggingOnCanvas, setIsDraggingOnCanvas] = useState(false);
  // --- AI State Hooks ---
  const {
      isGenerating,
      setIsGenerating,
      generatingElementIds,
      setGeneratingElementIds,
      genProgress,
      genOpType,
      generatedImages,
      setGeneratedImages,
      generatedImagesMetadata,
      pendingAutoDebg,
      setPendingAutoDebg,
      pendingStickerBorder,
      restoreTransparencyFn,
      outpaintingState,
      setOutpaintingState,
      copiedStyle,
      imageStyle,
      setImageStyle,
      imageAspectRatio,
      setImageAspectRatio,
      imageSize,
      setImageSize,
      preserveTransparency,
      setPreserveTransparency,
      useCustomSeed,
      setUseCustomSeed,
      customSeedValue,
      setCustomSeedValue,
      showStyleLibrary,
      setShowStyleLibrary,
      handleCopyStyle,
      handleApplyStyle,
      handlePasteStyle,
      handleCameraAngle,
      handleRemoveBackground,
      handleHarmonize,
      handleStartOutpainting,
      handleOutpaintingGenerate,
      handleAutoPromptGenerate,
      handleAIUpscale,
      handleLocalUpscale,
      handleLocalRemoveBackground,
      handleGenerate,
      handleCrossPlatformAdapt,
      handleLogoBrandKit,
      handleExtendBrandKit,
      handleProductMarketingSet,
      handleAskAI
  } = useAI({
      elements,
      setElements,
      selectedElementIds,
      showToast,
      setHasApiKey: handleAuthError,
      apiKey: effectiveApiKey,
      imageModel,
      atlasApiKey,
      generationModel,
      falApiKey,
      setGeneratingLabels,
      pauseAutoSave,
      resumeAutoSave,
  });

  const {
    handleBiRefNetRemoveBackground,
    handleMagicLayer,
    handleOCRConvert,
    handleSplitSticker,
    handleExtractPrompt,
    handleRasterizeTextOverride,
    handleMergeLayersOverride,
  } = useAppAiActions({
      elements,
      selectedElementIds,
      setElements,
      showToast,
      setShowKeyModal,
      setIsGenerating,
      setGeneratingElementIds,
      setGeneratingLabels,
      pauseAutoSave,
      resumeAutoSave,
      effectiveApiKey,
      atlasApiKey,
      falApiKey,
      imageModel,
      generationModel,
      zIndexCounter,
      originalMergeLayers,
  });

  // --- WRAPPED updateElements to Sync Outpainting Frame ---
  const updateElements = useCallback((updatedElement: CanvasElement, dragDelta?: Point) => {
      originalUpdateElements(updatedElement, dragDelta);

      // Sync outpainting frame position if the element being moved is the one being outpainted.
      // 用「新位置 − 上次同步位置」自算真正增量，避免依賴可能累計/失準的 dragDelta，
      // 否則拖曳時框會越跑越遠（圖片用絕對座標、框用 delta → 不同步）。
      if (outpaintingState && outpaintingState.element.id === updatedElement.id && dragDelta) {
          setOutpaintingState(prev => {
              if (!prev) return null;
              const realDelta = {
                  x: updatedElement.position.x - prev.element.position.x,
                  y: updatedElement.position.y - prev.element.position.y,
              };
              return {
                  ...prev,
                  element: updatedElement as ImageElement,
                  frame: {
                      ...prev.frame,
                      position: {
                          x: prev.frame.position.x + realDelta.x,
                          y: prev.frame.position.y + realDelta.y
                      }
                  }
              };
          });
      }
  }, [originalUpdateElements, outpaintingState, setOutpaintingState]);


  // --- OVERRIDE addArrow TO SUPPORT BOTH POINT AND CONFIG ---
  const addArrow = useCallback((arg?: Point | Partial<ArrowElement>) => {
      let position: Point | undefined;
      let config: Partial<ArrowElement> = {};

      if (arg && typeof (arg as any).x === 'number' && typeof (arg as any).y === 'number') {
          position = arg as Point;
      } else if (arg) {
          config = arg as Partial<ArrowElement>;
      }

      const start = position || getCenterOfViewport();
      const width = 150;
      const end = { x: start.x + width, y: start.y };
      const rotation = 0;
      const centerPosition = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };

      addElement({
          type: 'arrow',
          start,
          end,
          position: centerPosition,
          width,
          height: 30,
          rotation,
          color: '#1D1D1F',
          strokeWidth: 4,
          strokeStyle: 'solid',
          startArrowhead: 'none',
          endArrowhead: 'triangle',
          ...config 
      });
  }, [addElement, getCenterOfViewport]);

  // --- Callback for Floating Assistant Sticky Note Creation ---
  const handleAiCreateSticky = useCallback((text: string) => {
      const center = getCenterOfViewport();
      // Offset slightly so it doesn't appear exactly in center if there are other things
      const pos = { x: center.x + 60, y: center.y - 60 };
      
      addElement({
          type: 'note',
          position: pos,
          width: 300,
          height: 350,
          rotation: 0,
          content: text,
          color: 'bg-[#FFF3E0]', // Light orange/cream for AI suggestions
          textAlign: 'left'
      });
      showToast("已將 AI 建議建立為便利貼！📝");
  }, [addElement, getCenterOfViewport, showToast]);


  // --- 便利貼右鍵：AI 提示詞優化（取文字 → AI 擴寫 → 寫回） ---
  const handleOptimizeNotePrompt = useCallback(async (elementId: string) => {
      const element = elements.find(el => el.id === elementId);
      if (!element || (element.type !== 'note' && element.type !== 'text')) return;
      const current = element.type === 'note' ? (element as NoteElement).content : (element as TextElement).text;
      if (!current || !current.trim()) { showToast("便利貼是空的，請先輸入內容 ✏️"); return; }
      if (!effectiveApiKey) { setShowKeyModal(true); showToast("請先設定 API Key"); return; }

      setIsGenerating(true);
      setGeneratingElementIds([elementId]);
      showToast("✨ AI 提示詞優化中...");
      try {
          const optimized = await handleAskAI(current);
          if (optimized && optimized.trim()) {
              setElements(prev => prev.map(e => {
                  if (e.id !== elementId) return e;
                  if (e.type === 'note') return { ...e, content: optimized } as NoteElement;
                  if (e.type === 'text') return { ...e, text: optimized } as TextElement;
                  return e;
              }));
              showToast("✅ 提示詞已優化！");
          }
      } finally {
          setIsGenerating(false);
          setGeneratingElementIds([]);
      }
  }, [elements, effectiveApiKey, handleAskAI, setElements, showToast, setIsGenerating, setGeneratingElementIds]);


  const [resetView, setResetView] = useState<() => void>(() => () => {});
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, worldPoint: Point, elementId: string | null } | null>(null);
  const [magicLayerTargetId, setMagicLayerTargetId] = useState<string | null>(null);
  const attemptedImageCacheRestores = useRef(new Set<string>());
  const [stylePasteModal, setStylePasteModal] = useState<{ targetIds: string[] } | null>(null);
  const [editingDrawing, setEditingDrawing] = useState<DrawingElement | null>(null);
  const [editingImage, setEditingImage] = useState<ImageElement | null>(null);
  const [activeNodeGroupId, setActiveNodeGroupId] = useState<string | null>(null);
  const [interactionMode, setInteractionMode] = useState<'select' | 'hand'>('select');
  // 便利貼「點擊放置」模式：true = 等待使用者在畫布點一下決定位置
  const [placingNote, setPlacingNote] = useState(false);
  // 最近一次滑鼠螢幕座標 —— 供「在游標位置貼上」使用
  const lastPointerScreenRef = useRef<Point | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const lastImagePosition = useRef<Point | null>(null);
  const dragCounter = useRef(0);

  // ── 風格庫面板拖曳 ──────────────────────────────────────────────
  const [styleLibPos, setStyleLibPos] = useState({ x: 0, y: 0 });
  const [styleLibDragging, setStyleLibDragging] = useState(false);
  const styleLibDragOffRef = useRef({ x: 0, y: 0 });
  const styleLibInitRef = useRef(false);

  useEffect(() => {
    if (showStyleLibrary && !styleLibInitRef.current) {
      setStyleLibPos({ x: Math.max(0, window.innerWidth / 2 - 220), y: Math.max(0, window.innerHeight / 2 - 280) });
      styleLibInitRef.current = true;
    }
    if (!showStyleLibrary) styleLibInitRef.current = false;
  }, [showStyleLibrary]);

  useEffect(() => {
    if (!styleLibDragging) return;
    const onMove = (e: MouseEvent) => {
      setStyleLibPos({
        x: Math.min(Math.max(0, e.clientX - styleLibDragOffRef.current.x), window.innerWidth - 440),
        y: Math.min(Math.max(0, e.clientY - styleLibDragOffRef.current.y), window.innerHeight - 60),
      });
    };
    const onUp = () => setStyleLibDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [styleLibDragging]);

  // ── 生成意圖 Modal ────────────────────────────────────────────
  const [intentModal, setIntentModal] = useState<{ elements: CanvasElement[]; count: 1|2|3|4 } | null>(null);
  const [intentText, setIntentText] = useState('');

  const handleGenerateWithIntent = useCallback((selectedElements: CanvasElement[], count: 1|2|3|4 = 2, preserveTransparencyOverride = false) => {
    const hasNotes = selectedElements.some(el => el.type === 'note' || el.type === 'text');
    const hasImages = selectedElements.some(el => el.type === 'image' || el.type === 'drawing' || el.type === 'shape');
    const hasStyle = imageStyle && imageStyle !== 'Default';
    const seedParam = useCustomSeed && customSeedValue !== '' ? Number(customSeedValue) : undefined;
    // 只有圖片、沒有便利貼、沒有風格 → 詢問意圖
    if (hasImages && !hasNotes && !hasStyle) {
      setIntentText('');
      setIntentModal({ elements: selectedElements, count });
      return;
    }
    handleGenerate(selectedElements, count, undefined, undefined, false, undefined, undefined, undefined, undefined, undefined, seedParam, preserveTransparencyOverride);
  }, [handleGenerate, imageStyle, useCustomSeed, customSeedValue]);

  // 新畫布時（只有歡迎便利貼）自動 fit to screen 對齊畫面
  useEffect(() => {
    if (elements.length === 1 && elements[0].id === 'welcome-note') {
      const timer = setTimeout(() => {
        canvasApiRef.current?.fitToScreen();
      }, 50);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在 mount 時執行一次

  // 還原 IndexedDB 中的圖片：畫布資料可能在 mount 後才載入，不能只跑一次。
  useEffect(() => {
    const restoreFromCache = async () => {
      const imageElements = elements.filter(
        // 拆分持久化的 payload 遺失時 src 會是空字串；仍須用元素 ID 查 IndexedDB 快取救回。
        el => el.type === 'image' && !String((el as any).src ?? '').startsWith('data:')
      ).filter(el => {
        const src = String((el as any).src ?? '');
        const key = `${el.id}:${src}`;
        if (attemptedImageCacheRestores.current.has(key)) return false;
        attemptedImageCacheRestores.current.add(key);
        return true;
      });
      if (imageElements.length === 0) return;

      // 全部快取先平行讀完，再只更新一次，避免大量圖片逐張 setState 觸發連鎖自動存檔。
      const cachedById = new Map(
        (await Promise.all(imageElements.map(async el => [el.id, await getCachedImage(el.id)] as const)))
          .filter((entry): entry is readonly [string, string] => typeof entry[1] === 'string')
      );
      if (cachedById.size > 0) {
        setElements(prev => prev.map(el => {
          const cached = cachedById.get(el.id);
          return cached && el.type === 'image' ? { ...el, src: cached } : el;
        }));
      }
    };
    restoreFromCache();
  }, [elements, setElements]);

  const isFocusMode = !!editingImage || !!editingDrawing || !!activeNodeGroupId;
  const activeNodeGroup = activeNodeGroupId
    ? elements.find((el): el is NodeGroupElement => el.id === activeNodeGroupId && el.type === 'node_group') ?? null
    : null;

  const handleCloseNodeWorkflow = useCallback((graph: NodeGraphData) => {
    if (activeNodeGroupId) {
      const store = useNodeGraphStore.getState();
      setElements(prev => prev.map(el => {
        if (el.id === activeNodeGroupId && el.type === 'node_group') {
          const nodeGroup = el as any;
          const isNote = nodeGroup.sourceType === 'note';
          const inputNode = graph.nodes.find(n => n.kind === 'input');
          const updatedContent = isNote && inputNode && typeof inputNode.data.src === 'string' ? inputNode.data.src : nodeGroup.content;
          return {
            ...el,
            graph,
            content: updatedContent,
            nodeResults: store.nodeResults,
            nodeBatchResults: store.nodeBatchResults,
            nodeStatus: store.nodeStatus,
          };
        }
        return el;
      }));
    }
    setActiveNodeGroupId(null);
  }, [activeNodeGroupId, setElements]);

  // 執行引擎輸出：把節點鏈最終圖寫回大畫布方框，並動態自適應重設元素高度（防止上下透明留白）
  const handleNodeWorkflowOutput = useCallback((src: string) => {
    if (!activeNodeGroupId) return;
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || 300;
      const h = img.naturalHeight || 300;
      const ratio = w / h;
      setElements(prev => prev.map(el => {
        if (el.id === activeNodeGroupId && el.type === 'node_group') {
          const nextHeight = Math.round(el.width / ratio);
          return {
            ...el,
            outputSrc: src,
            height: nextHeight,
          };
        }
        return el;
      }));
    };
    img.src = src;
  }, [activeNodeGroupId, setElements]);

  const handleInvalidateNodeWorkflowOutput = useCallback(() => {
    if (!activeNodeGroupId) return;
    setElements(prev => prev.map(el => (
      el.id === activeNodeGroupId && el.type === 'node_group'
        ? { ...el, outputSrc: undefined }
        : el
    )));
  }, [activeNodeGroupId, setElements]);

  const handleImportNodeWorkflowOutput = useCallback(() => {
    const group = activeNodeGroup;
    const outputSrc = group?.outputSrc;
    if (!group || !outputSrc) {
      showToast('這個節點工作流目前還沒有輸出圖片');
      return;
    }

    const position = { x: group.position.x + group.width + 56, y: group.position.y };
    const img = new Image();
    img.onload = () => {
      const maxSide = 420;
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || maxSide, img.naturalHeight || maxSide));
      const width = Math.round((img.naturalWidth || maxSide) * scale) || maxSide;
      const height = Math.round((img.naturalHeight || maxSide) * scale) || maxSide;
      const id = addElement({ type: 'image', position, width, height, rotation: 0, src: outputSrc });
      setSelectedElementIds([id]);
    };
    img.onerror = () => {
      const id = addElement({ type: 'image', position, width: 320, height: 320, rotation: 0, src: outputSrc });
      setSelectedElementIds([id]);
    };
    img.src = outputSrc;
    setActiveNodeGroupId(null);
    showToast('已將節點輸出匯入畫布');
  }, [activeNodeGroup, addElement, setSelectedElementIds, showToast]);

  // 將子空間裡帶圖的節點結果匯入為主畫布獨立圖片（落點簡化為畫布中央）
  const handleDetachNodeImage = useCallback((src: string, _name?: string) => {
    if (!src) return;
    const center = getCenterOfViewport();
    // 先同步建立元素，不讓匯入成功與否依賴第二次 Image.onload。
    // Atlas 遠端 URL／已快取圖片偶爾不再觸發 load，舊流程會只顯示 toast 卻沒有加入元素。
    const id = addElement({ type: 'image', position: center, width: 320, height: 320, rotation: 0, src });
    setSelectedElementIds([id]);

    const img = new Image();
    img.onload = () => {
      const maxSide = 360;
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || maxSide, img.naturalHeight || maxSide));
      const w = Math.round((img.naturalWidth || maxSide) * scale) || maxSide;
      const h = Math.round((img.naturalHeight || maxSide) * scale) || maxSide;
      setElements(prev => prev.map(element => (
        element.id === id && element.type === 'image'
          ? { ...element, width: w, height: h }
          : element
      )));
    };
    img.src = src;
    showToast('已將圖片匯入主畫布');
  }, [addElement, getCenterOfViewport, setElements, setSelectedElementIds, showToast]);

  const handleInteractionEnd = useCallback(() => {
    // 歷史已在手勢首幀新增（保住手勢前狀態），這裡只需清除首幀標記，不再 commit 重複
    endTransform();
  }, [endTransform]);

  const getResetViewCallback = useCallback((callback: () => void) => {
    setResetView(() => callback);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, worldPoint: Point, elementId: string | null) => {
      e.preventDefault();
      if (elementId && !selectedElementIds.includes(elementId)) handleSelectElement(elementId, false);
      setContextMenu({ x: e.clientX, y: e.clientY, worldPoint, elementId });
  }, [selectedElementIds, handleSelectElement]);

  const handleCreateNodeWorkflow = useCallback((elementId: string) => {
    const source = elements.find(el => el.id === elementId);
    if (!source || (source.type !== 'image' && source.type !== 'note')) {
      showToast('目前只支援從圖片或便利貼建立節點工作流');
      return;
    }

    const sourceValue = source.type === 'image' ? source.src : source.content;
    const now = Date.now();
    const graph: NodeGraphData = {
      nodes: [
        {
          id: `input-${now}`,
          kind: 'input',
          position: { x: 120, y: 160 },
          data: {
            label: source.type === 'image' ? 'Input Image' : 'Input Note',
            src: sourceValue,
            params: { seedElementId: source.id, sourceType: source.type },
          },
        },
      ],
      edges: [],
    };

    setElements(prev => prev.map(el => {
      if (el.id === elementId) {
        return {
          ...el,
          type: 'node_group',
          graph,
          seedElementId: el.id,
          sourceType: source.type,
          src: source.type === 'image' ? (source as any).src : undefined,
          content: source.type === 'note' ? (source as any).content : undefined,
          color: source.type === 'note' ? (source as any).color : undefined,
        } as any;
      }
      return el;
    }));

    showToast('已將元素轉換為節點工作流，點擊兩下進入子空間');
  }, [elements, setElements, showToast]);

  const handleEditDrawing = useCallback((elementId: string) => {
    const el = elements.find(e => e.id === elementId);
    if (el && el.type === 'drawing') {
      setEditingDrawing(el as DrawingElement);
    }
  }, [elements]);

  const handleUpdateOutpaintingFrame = useCallback((newFrame: { position: Point; width: number; height: number; }) => {
    setOutpaintingState(prev => prev ? { ...prev, frame: newFrame } : null);
  }, [setOutpaintingState]);

  const handleCancelOutpainting = useCallback(() => {
    setOutpaintingState(null);
  }, [setOutpaintingState]);

  const triggerImageUpload = (position?: Point) => {
    lastImagePosition.current = position || null;
    imageInputRef.current?.click();
  };

  const handleSelectShapeTool = useCallback((shapeType: ShapeType) => {
      setActiveShapeTool(shapeType);
      setInteractionMode('select');
      setSelectedElementIds([]);
      setPlacingNote(false);
  }, [setActiveShapeTool, setSelectedElementIds]);

  // 進入/退出便利貼點擊放置模式（再按一次按鈕取消）
  const handleStartPlaceNote = useCallback(() => {
      setPlacingNote(prev => !prev);
      setActiveShapeTool(null);
      setInteractionMode('select');
      setSelectedElementIds([]);
  }, [setActiveShapeTool, setSelectedElementIds]);

  const selectedElements = elements.filter(el => selectedElementIds.includes(el.id));
  const selectedTextElement = selectedElements.length === 1 && selectedElements[0].type === 'text' ? (selectedElements[0] as TextElement) : null;
  const selectedShapeElement = selectedElements.length === 1 && selectedElements[0].type === 'shape' ? (selectedElements[0] as ShapeElement) : null;
  const selectedArrowElement = selectedElements.length === 1 && selectedElements[0].type === 'arrow' ? (selectedElements[0] as ArrowElement) : null;
  const selectedArtboard = selectedElements.length === 1 && selectedElements[0].type === 'artboard' ? (selectedElements[0] as ArtboardElement) : null;

  // 記住最後選取的工作區域，讓面板在取消選取後仍保持可見
  useEffect(() => {
    if (selectedArtboard) setLastSelectedArtboardId(selectedArtboard.id);
  }, [selectedArtboard]);

  const artboardForPanel = selectedArtboard
    ?? (elements.find(el => el.type === 'artboard' && el.id === lastSelectedArtboardId) as ArtboardElement | undefined)
    ?? (elements.find(el => el.type === 'artboard') as ArtboardElement | undefined)
    ?? null;

  const handleUpdateTextElement = (updates: Partial<TextElement>, options?: { addToHistory?: boolean }) => {
      if (!selectedTextElement) return;
      setElements(
          prev => prev.map(el => (el.id === selectedTextElement.id && el.type === 'text') ? { ...el, ...updates } : el),
          { addToHistory: options?.addToHistory ?? true }
      );
  };

  const handleSnapshotTextElement = useCallback(() => {
      setElements(prev => prev, { addToHistory: true });
  }, [setElements]);

  const handleUpdateShapeElement = (updates: Partial<ShapeElement>) => {
      if (!selectedShapeElement) return;
      setElements(prev => prev.map(el => (el.id === selectedShapeElement.id && el.type === 'shape') ? { ...el, ...updates } : el));
  };

  const handleUpdateArrowElement = (updates: Partial<ArrowElement>) => {
      if (!selectedArrowElement) return;
      setElements(prev => prev.map(el => (el.id === selectedArrowElement.id && el.type === 'arrow') ? { ...el, ...updates } : el));
  };

  // 設計大師 Logo：結果在顯示前先處理背景
  // （白→平整純白、黑→平整純黑、透明→自動去背），
  // 加入畫布時不再二次處理。
  const logoBgProcessedRef = useRef<string[] | null>(null);
  useEffect(() => {
    if (!generatedImages || generatedImages.length === 0) return;
    if (logoBgProcessedRef.current === generatedImages) return; // 已是處理後的結果
    const prompt = generatedImagesMetadata?.[0]?.prompt || '';
    if (!prompt.includes('Design a professional logo for the brand')) return;
    const wantWhite = prompt.includes('BACKGROUND: white');
    const wantBlack = prompt.includes('BACKGROUND: black');
    const wantTransparent = prompt.includes('BACKGROUND: transparent');
    if (!wantWhite && !wantBlack && !wantTransparent) return;

    const sourceImages = generatedImages;
    (async () => {
      showToast(wantTransparent ? '🪄 Logo 自動去背中…' : '🪄 Logo 背景純化中…');
      const processed = await Promise.all(sourceImages.map(async (url) => {
        try {
          const src = url.startsWith('data:') ? url : await downloadImageAsBase64(url);
          if (wantWhite || wantBlack) {
            // 白/黑背景：原地把「邊緣連通的背景區(含髒污/紙紋)」重塗成純色，主體不動
            return await flattenBackgroundToColor(src, wantWhite ? '#ffffff' : '#000000');
          }
          // 透明背景：量測邊緣底色後走語意去背流程
          const detectedBg = await detectBackgroundColor(src);
          return await restoreTransparencyFn(src, detectedBg);
        } catch {
          return url; // 單張失敗保留原圖
        }
      }));
      logoBgProcessedRef.current = processed;
      setGeneratedImages(prev => (prev === sourceImages ? processed : prev));
      // 已在結果階段處理完，加入畫布時不要再跑一次去背
      setPendingAutoDebg(false);
      showToast('✅ Logo 背景處理完成！');
    })();
  }, [generatedImages, generatedImagesMetadata, restoreTransparencyFn, setGeneratedImages, setPendingAutoDebg, showToast]);

  // LayerPanel 效能：props 全走穩定參考，讓 React.memo 生效（拖曳/縮放時面板不重渲染）
  const elementsRef = useRef(elements);
  useEffect(() => { elementsRef.current = elements; });
  const handleLayerPanelSelect = useCallback((id: string, shiftKey: boolean) => {
    // 圖層面板直接選取單一物件，不走群組展開邏輯
    // 這樣才能在圖層面板點選群組成員來單獨選取並解散群組
    setSelectedElementIds(prev => {
      if (shiftKey) {
        return prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id];
      }
      if (prev.length === 1 && prev[0] === id) return prev;
      return [id];
    });
  }, [setSelectedElementIds]);
  const handleLayerPanelExport = useCallback((ids: string[]) => {
    const els = elementsRef.current;
    const artboardsToExport = ids
      .map(id => els.find(el => el.id === id))
      .filter((el): el is ArtboardElement => el?.type === 'artboard')
      .sort((a, b) => b.zIndex - a.zIndex);
    downloadMultipleArtboards(artboardsToExport, els);
  }, []);

  const addGeneratedImageToCanvas = useCallback(async (imageUrl: string) => {
    if (!imageUrl) return;
    const imgIndex = generatedImages?.indexOf(imageUrl) ?? -1;
    const meta = imgIndex > -1 ? generatedImagesMetadata?.[imgIndex] : undefined;

    // 確保存入畫布的一定是 base64（避免 Atlas CDN URL 過期後無法給 Gemini 使用）
    const originalSrc = imageUrl.startsWith('data:') ? imageUrl : await downloadImageAsBase64(imageUrl);
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      const MAX_DIMENSION = 400;
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) { height = (height / width) * MAX_DIMENSION; width = MAX_DIMENSION; }
        else { width = (width / height) * MAX_DIMENSION; height = MAX_DIMENSION; }
      }
      const elementId = addElement({ 
        type: 'image', 
        position: getCenterOfViewport(), 
        src: originalSrc, 
        width, 
        height, 
        rotation: 0,
        metadata: meta ? { seed: meta.seed, model: meta.model, prompt: meta.prompt } : undefined
      });
      if (!elementId) return;

      // Cache the base64 image in IndexedDB so it survives page reload even if Atlas CDN URL expires
      if (originalSrc.startsWith('data:')) {
        cacheImage(elementId, originalSrc);
      }

      // 設計大師「透明背景」：放入畫布後自動非同步去背
      if (pendingAutoDebg) {
        setGeneratingElementIds(prev => [...prev, elementId]);
        setGeneratingLabels(prev => ({ ...prev, [elementId]: '🪄 去背中' }));

        (async () => {
          try {
            const wantWhiteBg = !!meta?.prompt && (meta.prompt.includes('BACKGROUND: white') || meta.prompt.includes('Background: Strictly isolated on a solid, uniform, 100% pure white background'));
            const wantBlackBg = !!meta?.prompt && (meta.prompt.includes('BACKGROUND: black') || meta.prompt.includes('Background: Strictly isolated on a solid, uniform, 100% pure black background'));

            let finalSrc: string;
            if (wantWhiteBg || wantBlackBg) {
              // 不透明白/黑背景：原地把「邊緣連通的背景區(含髒污/紙紋)」重塗成純色，主體不動。
              // 不走「去背→補色」，避免分割式去背把模型亂加的淺色紋理誤當主體留下。
              finalSrc = await flattenBackgroundToColor(originalSrc, wantWhiteBg ? '#ffffff' : '#000000');
            } else {
            let debgSrc: string;
            if (pendingStickerBorder !== null) {
              // LINE 貼圖：背景已控制成純黑(有白邊)/純白(無白邊) → 泛洪 chroma 為主路。
              // 邊角泛洪只扣與邊緣相連的背景，不會挖洞、且有白邊時只扣黑→保住白色 die-cut 邊；
              // 內建 2-pass 去光暈。萬一泛洪失敗才退回語意去背。
              const hasBorder = pendingStickerBorder;
              try {
                debgSrc = await repairStickerTransparency(originalSrc, {
                  backgroundColor: hasBorder ? '#000000' : '#FFFFFF',
                  hasStickerBorder: hasBorder,
                  tolerance: hasBorder ? 50 : 44,
                  haloPasses: 3,   // 加強去背景色殘邊
                  erodePx: 1,      // 再幾何收縮 1px 保底（清抗鋸齒殘邊）
                  featherRadius: 2, // 羽化 2px 搭配對比度拉伸，消除階梯鋸齒以產生平滑邊緣
                });
              } catch {
                const detectedBg = await detectBackgroundColor(originalSrc);
                debgSrc = await restoreTransparencyFn(originalSrc, detectedBg);
              }
            } else {
              // 其他模式（icon chroma 底 / 一般）：底色由 AI 自選，先量邊緣色再交給語意去背流程。
              const detectedBg = await detectBackgroundColor(originalSrc);
              debgSrc = await restoreTransparencyFn(originalSrc, detectedBg);
            }
            finalSrc = debgSrc;
            }

            setElements(prev => prev.map(el => el.id === elementId && el.type === 'image' ? { ...el, src: finalSrc } : el));
            if (finalSrc.startsWith('data:')) {
              cacheImage(elementId, finalSrc);
            }
            showToast('✅ 自動去背與背景優化完成！');
          } catch (e) {
            showToast('去背失敗，已保留原圖');
          } finally {
            setGeneratingElementIds(prev => prev.filter(id => id !== elementId));
            setGeneratingLabels(prev => {
              const next = { ...prev };
              delete next[elementId];
              return next;
            });
          }
        })();
      }
    };
    img.src = originalSrc;
  }, [addElement, getCenterOfViewport, pendingAutoDebg, pendingStickerBorder, restoreTransparencyFn, showToast, setGeneratingElementIds, setGeneratingLabels, setElements, generatedImages, generatedImagesMetadata]);

  const downloadGeneratedImage = (imageUrl: string) => {
      if (!imageUrl) return;
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `generated-canvas-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleSaveDrawing = useCallback((elementId: string, dataUrl: string) => {
    setElements(prev => prev.map(el => el.id === elementId ? { ...el, src: dataUrl } : el));
    setEditingDrawing(null);
  }, [setElements]);

  const handleSaveImageEdit = useCallback((elementId: string, dataUrl: string, originalElement?: ImageElement, metadata?: any) => {
    if (elementId === '') {
      // Create a new element
      const img = new Image();
      img.onload = () => {
        // Calculate position: slightly offset from original if provided, else center
        let position = getCenterOfViewport();
        // 預設用結果自身像素尺寸；但生成結果常是 1024/1536px，直接當畫布寬高會「特別大」。
        let width = img.width;
        let height = img.height;
        if (originalElement) {
          position = {
            x: originalElement.position.x + 20,
            y: originalElement.position.y + 20
          };
          // 跟來源在畫布上的顯示比例一致：寬度對齊原圖，高度依「結果自身長寬比」換算，
          // 既不會放大成原始像素尺寸，也保留重繪結果真正的長寬比。
          if (originalElement.width > 0 && img.width > 0) {
            width = originalElement.width;
            height = Math.round(originalElement.width * (img.height / img.width));
          }
        }

        addElement({
          type: 'image',
          position,
          src: dataUrl,
          width,
          height,
          rotation: 0,
          metadata: metadata || originalElement?.metadata,
        });
      };
      img.src = dataUrl;
    } else {
      // Update existing element
      setElements(prev => prev.map(el => el.id === elementId ? { ...el, src: dataUrl, metadata: metadata || el.metadata } : el));
    }
    setEditingImage(null);
  }, [setElements, addElement, getCenterOfViewport]);

  const handleStartImageEdit = useCallback((elementId: string) => {
    const el = elements.find(e => e.id === elementId);
    if (el && el.type === 'image') {
      setEditingImage(el as ImageElement);
    }
  }, [elements]);

  const deleteElement = useCallback(() => {
    if (selectedElementIds.length === 0) return;
    const selectedSet = new Set(selectedElementIds);
    // Clean up IndexedDB cache for deleted image elements
    elements.forEach(el => {
      if (selectedSet.has(el.id) && !el.isLocked && el.type === 'image') {
        deleteCachedImage(el.id);
      }
    });
    setElements(prev => prev.filter(el => !selectedSet.has(el.id) || el.isLocked));
    setSelectedElementIds([]);
  }, [selectedElementIds, elements, setElements, setSelectedElementIds]);

  const canChangeColor = selectedElements.some(el => el.type === 'note' || el.type === 'arrow');
  const handleColorChange = (colorBg: string) => {
      if (!canChangeColor) return;
      const colorObj = COLORS.find(c => c.bg === colorBg);
      const arrowColor = colorObj ? colorObj.text : colorBg.replace('bg-', 'text-');
      
      const selectedSet = new Set(selectedElementIds);
      setElements(prev => prev.map(el => {
          if (selectedSet.has(el.id)) {
              if (el.type === 'note') return { ...el, color: colorBg };
              if (el.type === 'arrow') {
                  let newColor = arrowColor;
                  if (colorBg.startsWith('#')) newColor = colorBg;
                  else if (colorBg.startsWith('bg-[')) newColor = colorBg.replace('bg-', 'text-');
                  return { ...el, color: newColor };
              }
          }
          return el;
      }));
  };

  const downloadImages = useCallback(async (elementIds: string[]) => {
      const imageEls = elements.filter(
          el => elementIds.includes(el.id) && (el.type === 'image' || el.type === 'drawing') && (el as any).src
      );
      for (let i = 0; i < imageEls.length; i++) {
          const element = imageEls[i] as any;
          const hasEffects = element.shadowEnabled || (element.fade && element.fade.direction !== 'none');
          const dataUrl = hasEffects
              ? await renderImageElementToDataUrl({
                    src: element.src,
                    width: element.width,
                    height: element.height,
                    shadowEnabled: element.shadowEnabled,
                    shadowColor: element.shadowColor,
                    shadowBlur: element.shadowBlur,
                    shadowOffsetX: element.shadowOffsetX,
                    shadowOffsetY: element.shadowOffsetY,
                    fade: element.fade,
                })
              : element.src;
          const link = document.createElement('a');
          link.href = dataUrl;
          let filename = element.name ? element.name.trim() : `canvas-image-${i + 1}`;
          if (!filename.toLowerCase().endsWith('.png')) filename = `${filename}.png`;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          if (i < imageEls.length - 1) await new Promise(r => setTimeout(r, 300));
      }
  }, [elements]);

  const downloadImage = useCallback(async (elementId: string) => {
    if (!elementId) return;
    const element = elements.find(el => el.id === elementId);
    if (!element || (element.type !== 'image' && element.type !== 'drawing') || !element.src) return;

    const el = element as any;
    const hasEffects = el.shadowEnabled || (el.fade && el.fade.direction !== 'none');

    // 有效果時透過 Canvas 合成（所見即所得），否則直接下載原圖
    const dataUrl = hasEffects
        ? await renderImageElementToDataUrl({
            src: element.src,
            width: element.width,
            height: element.height,
            shadowEnabled: el.shadowEnabled,
            shadowColor: el.shadowColor,
            shadowBlur: el.shadowBlur,
            shadowOffsetX: el.shadowOffsetX,
            shadowOffsetY: el.shadowOffsetY,
            fade: (element as ImageElement).fade,
          })
        : element.src;

    const link = document.createElement('a');
    link.href = dataUrl;
    let filename = element.name ? element.name.trim() : `canvas-image-${Date.now()}`;
    if (!filename.toLowerCase().endsWith('.png')) filename = `${filename}.png`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [elements]);

  const handleExportCanvas = originalExportCanvas;

  const triggerImportCanvas = async () => {
      // Use File System Access API if available, otherwise fallback to legacy input
      if (isFileSystemSupported) {
          await handleOpenFile();
      } else if (importInputRef.current) {
          importInputRef.current.value = '';
          importInputRef.current.click();
      }
  };

  const handleImportCanvasFile = (event: React.ChangeEvent<HTMLInputElement>) => {
      originalImportCanvas(event);
  };

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const position = lastImagePosition.current || getCenterOfViewport();
    addImagesToCanvas(Array.from(files), position);
    if (imageInputRef.current) {
        imageInputRef.current.value = "";
    }
  }, [addImagesToCanvas, getCenterOfViewport]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
      if (placingNote && canvasApiRef.current) {
          if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.floating-menu') || (e.target as HTMLElement).closest('.fixed')) return;
          e.stopPropagation();
          const worldPoint = canvasApiRef.current.screenToWorld({ x: e.clientX, y: e.clientY });
          const id = addNote(worldPoint);
          if (id) setSelectedElementIds([id]);
          setPlacingNote(false);
          return;
      }
      if (activeShapeTool && canvasApiRef.current) {
          if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.floating-menu') || (e.target as HTMLElement).closest('.fixed')) return;
          e.stopPropagation(); 
          const worldPoint = canvasApiRef.current.screenToWorld({ x: e.clientX, y: e.clientY });
          shapeStartPointRef.current = worldPoint;
          const id = addElement({
              type: 'shape',
              shapeType: activeShapeTool,
              position: worldPoint,
              width: 1, 
              height: 1,
              rotation: 0,
              fillColor: '#D1D1D6', 
              strokeColor: '#1D1D1F',
              strokeWidth: 2,
              strokeStyle: 'solid',
          });
          if (id) { setCreatingShapeId(id); setSelectedElementIds([id]); }
      }
  }, [placingNote, addNote, activeShapeTool, addElement, setCreatingShapeId, setSelectedElementIds, shapeStartPointRef]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
      if (creatingShapeId && canvasApiRef.current && shapeStartPointRef.current) {
          e.preventDefault();
          const currentWorldPoint = canvasApiRef.current.screenToWorld({ x: e.clientX, y: e.clientY });
          const startPoint = shapeStartPointRef.current;
          let width = Math.abs(currentWorldPoint.x - startPoint.x);
          let height = Math.abs(currentWorldPoint.y - startPoint.y);
          if (e.shiftKey) { const maxDim = Math.max(width, height); width = maxDim; height = maxDim; }
          let endX = currentWorldPoint.x;
          let endY = currentWorldPoint.y;
          if (e.shiftKey) {
              const dirX = currentWorldPoint.x >= startPoint.x ? 1 : -1;
              const dirY = currentWorldPoint.y >= startPoint.y ? 1 : -1;
              endX = startPoint.x + width * dirX;
              endY = startPoint.y + height * dirY;
          }
          const centerX = (startPoint.x + endX) / 2;
          const centerY = (startPoint.y + endY) / 2;
          
          setElements(prev => prev.map(el => el.id === creatingShapeId ? {
              ...el,
              width: Math.max(1, width), 
              height: Math.max(1, height),
              position: { x: centerX, y: centerY }
          } : el), { addToHistory: false }); 
      }
  }, [creatingShapeId, setElements, shapeStartPointRef]);

  const handleCanvasMouseUp = useCallback(() => {
      if (creatingShapeId) {
          const element = elements.find(el => el.id === creatingShapeId);
          if (element && (element.width < 5 || element.height < 5)) {
              setElements(prev => prev.map(el => el.id === creatingShapeId ? { ...el, width: 100, height: 100, } : el));
          }
          setElements(prev => prev, { addToHistory: true });
          setCreatingShapeId(null);
          shapeStartPointRef.current = null;
          setActiveShapeTool(null);
          setInteractionMode('select');
      }
  }, [creatingShapeId, elements, setElements, setCreatingShapeId, setActiveShapeTool, shapeStartPointRef]);

  const contextMenuElement = contextMenu?.elementId ? elements.find(el => el.id === contextMenu.elementId) : null;
  const isGrouped = selectedElements.length > 0 && selectedElements.every(el => el.groupId && el.groupId === selectedElements[0].groupId);
  const isLocked = contextMenuElement?.isLocked || false;
  const isVisible = contextMenuElement?.isVisible ?? true;

  const handleFlipHorizontal = useCallback((elementId: string) => {
    setElements(prev => prev.map(el =>
      el.id === elementId && el.type === 'image'
        ? { ...el, flipX: !el.flipX }
        : el
    ));
  }, [setElements]);

  const handleFlipVertical = useCallback((elementId: string) => {
    setElements(prev => prev.map(el =>
      el.id === elementId && el.type === 'image'
        ? { ...el, flipY: !el.flipY }
        : el
    ));
  }, [setElements]);

  const handleUnlockAll = useCallback(() => {
    setElements(prev => prev.map(el => ({ ...el, isLocked: false })));
  }, [setElements]);

  const handleShowAll = useCallback(() => {
    setElements(prev => prev.map(el => ({ ...el, isVisible: true })));
  }, [setElements]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.type === 'keyup') return; // Only trigger on keydown
      if (editingDrawing || editingImage || activeNodeGroupId) return;
      if (intentModal) {
        if (e.key === 'Escape') setIntentModal(null);
        return;
      }
      if (outpaintingState) {
          if (e.key === 'Escape') handleCancelOutpainting();
          return;
      }
      if (activeShapeTool && e.key === 'Escape') {
          setActiveShapeTool(null);
          setCreatingShapeId(null);
          if (creatingShapeId) setElements(prev => prev.filter(el => el.id !== creatingShapeId));
      }
      if (placingNote && e.key === 'Escape') setPlacingNote(false);
      const target = e.target as HTMLElement;
      const isEditingText = ((target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && !(target as HTMLInputElement | HTMLTextAreaElement).readOnly) || target.isContentEditable;
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditingText) { e.preventDefault(); deleteElement(); return; }
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      if (isCtrlOrCmd) {
        if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          if (e.shiftKey) handleSaveAsFile(); else handleSaveFileWithConfirm();
          return;
        }
      }
      if (isCtrlOrCmd && !isEditingText) {
        if (e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
        else if (e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
        else if (e.key.toLowerCase() === 'c') { e.preventDefault(); copySelection(); }
        // 'v' 由 paste 事件統一處理（避免 preventDefault 阻止 paste 事件觸發）
        else if (e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelection(); }
        else if (e.key.toLowerCase() === 'g') { e.preventDefault(); if (e.shiftKey) handleUngroup(); else handleGroup(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteElement, undo, redo, editingDrawing, editingImage, activeNodeGroupId, outpaintingState, copySelection, duplicateSelection, handleGroup, handleUngroup, activeShapeTool, creatingShapeId, placingNote, setElements, handleCancelOutpainting, handleSaveFileWithConfirm, handleSaveAsFile]);
  
  useEffect(() => {
    const clearDragState = () => {
      dragCounter.current = 0;
      setIsDraggingOver(false);
    };

    // 節點工作流有自己的圖片拖放區。開啟時停用主畫布的 window 級監聽，
    // 並清除可能已累加的 dragenter 計數，避免主畫布遮罩卡住。
    clearDragState();
    if (activeNodeGroupId) return;

    const preventDefaults = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const handleDragEnter = (e: DragEvent) => { preventDefaults(e); dragCounter.current++; if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) { if (Array.from(e.dataTransfer.items).some(item => item.kind === 'file' && item.type.startsWith('image/'))) setIsDraggingOver(true); } };
    const handleDragLeave = (e: DragEvent) => {
      preventDefaults(e);
      dragCounter.current = Math.max(0, dragCounter.current - 1);
      // relatedTarget 為 null 代表已離開瀏覽器視窗，不再等待其他子元素的 leave。
      if (!e.relatedTarget || dragCounter.current === 0) clearDragState();
    };
    const handleDrop = (e: DragEvent) => {
        preventDefaults(e); clearDragState();
        const files = e.dataTransfer?.files;
        if (files && files.length > 0 && canvasApiRef.current) {
            const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
            if (imageFiles.length > 0) {
                const dropPoint = { x: e.clientX, y: e.clientY };
                const worldPoint = canvasApiRef.current.screenToWorld(dropPoint);
                addImagesToCanvas(imageFiles, worldPoint);
            }
        }
    };
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', preventDefaults);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragend', clearDragState);
    window.addEventListener('blur', clearDragState);
    return () => {
        window.removeEventListener('dragenter', handleDragEnter);
        window.removeEventListener('dragover', preventDefaults);
        window.removeEventListener('dragleave', handleDragLeave);
        window.removeEventListener('drop', handleDrop);
        window.removeEventListener('dragend', clearDragState);
        window.removeEventListener('blur', clearDragState);
        clearDragState();
    };
  }, [activeNodeGroupId, addImagesToCanvas]);

  // 追蹤滑鼠螢幕座標（供貼上定位）
  useEffect(() => {
    const onMove = (e: MouseEvent) => { lastPointerScreenRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // 剪貼簿貼上：外部圖片 / 外部文字 → 貼在游標位置
  useEffect(() => {
    // 游標所在的世界座標（無紀錄時退回畫面中心）
    const getPasteWorldPoint = (): Point =>
      (lastPointerScreenRef.current && canvasApiRef.current)
        ? canvasApiRef.current.screenToWorld(lastPointerScreenRef.current)
        : getCenterOfViewport();
    const handlePaste = (e: ClipboardEvent) => {
        // 節點工作流開啟時由其自己處理剪貼簿，主畫布不參與。
        if (activeNodeGroupId) return;
        const target = e.target as HTMLElement;
        // 正在編輯文字輸入框 → 讓瀏覽器正常處理
        const isEditingText =
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable;
        if (isEditingText) return;

        const items = e.clipboardData?.items;

        // 優先：圖片（從瀏覽器、截圖工具、設計軟體複製）
        if (items) {
            for (const item of Array.from(items)) {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) {
                        e.preventDefault();
                        addImagesToCanvas([file], getPasteWorldPoint());
                        return;
                    }
                }
            }
        }

        // 其次：純文字 → 建立文字元素
        const text = e.clipboardData?.getData('text/plain')?.trim();
        if (text) {
            e.preventDefault();
            addText(getPasteWorldPoint(), text);
            return;
        }

        // Fallback：貼上畫布內複製的元素（Ctrl+C 複製的圖層）
        e.preventDefault();
        pasteSelection();
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeNodeGroupId, addImagesToCanvas, addText, getCenterOfViewport, pasteSelection]);

  return (
    <>
    <main
        className={`relative w-screen h-screen bg-[#F5F5F7] font-sans text-[#1D1D1F] ${activeShapeTool || placingNote ? 'cursor-crosshair' : ''}`}
        onClick={() => { setContextMenu(null); setShowStyleLibrary(false); }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
    >
      <input type="file" accept="image/*" ref={imageInputRef} className="hidden" onChange={handleImageUpload} multiple />
      <input 
          type="file" 
          accept=".json" 
          ref={importInputRef} 
          className="hidden" 
          onChange={handleImportCanvasFile} 
      />

      {toastMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[9999]">
          <div className="px-6 py-3 bg-black/80 backdrop-blur-md text-white text-sm font-medium rounded-full shadow-lg animate-fade-in-down">
            {toastMessage}
          </div>
        </div>
      )}

      {/* 語意編輯器或設計大師開啟時隱藏功能助手 */}
      {!semanticEditorTarget && (
        <FloatingAssistant onCreateSticky={handleAiCreateSticky} onAskAI={handleAskAI} isHidden={isFocusMode || !!designMasterTargetId} />
      )}

      {showKeyModal && (
          <ApiKeyModal
              geminiKey={effectiveApiKey || ''}
              onSubmit={handleSaveManualKey}
              onClose={() => setShowKeyModal(false)}
              atlasKey={atlasApiKey || ''}
              onSubmitAtlas={handleSaveAtlasKey}
              falKey={falApiKey || ''}
              onSubmitFal={handleSaveFalKey}
          />
      )}

      {showSVGExportModal && (
          <SVGExportModal
              artboards={elements.filter(el => el.type === 'artboard') as any[]}
              allElements={elements}
              onClose={() => setShowSVGExportModal(false)}
          />
      )}

      {showClearConfirm && (
          <ClearStorageConfirmModal
              onExportBackup={() => { originalExportCanvas(); }}
              onClear={() => { clearStorage(); setShowClearConfirm(false); }}
              onClose={() => setShowClearConfirm(false)}
          />
      )}

      {!semanticEditorTarget && (
        <AppTopStatusBar
          isKeyValid={isKeyValid}
          imageModel={imageModel}
          storageStatus={storageStatus}
          onOpenKeyModal={() => setShowKeyModal(true)}
          onSetImageModel={handleSetImageModel}
        />
      )}

      {/* ── 生成意圖 Modal ── */}
      {intentModal && (
        <GenerationIntentModal
          intentModal={intentModal}
          intentText={intentText}
          onChangeIntentText={setIntentText}
          onClose={() => setIntentModal(null)}
          onSkip={() => {
            const { elements: els, count } = intentModal;
            setIntentModal(null);
            const seedParam = useCustomSeed && customSeedValue !== '' ? Number(customSeedValue) : undefined;
            handleGenerate(els, count, undefined, undefined, false, undefined, undefined, undefined, undefined, undefined, seedParam);
          }}
          onConfirm={() => {
            const { elements: els, count } = intentModal;
            setIntentModal(null);
            const seedParam = useCustomSeed && customSeedValue !== '' ? Number(customSeedValue) : undefined;
            handleGenerate(els, count, intentText.trim() || undefined, undefined, false, undefined, undefined, undefined, undefined, undefined, seedParam);
          }}
        />
      )}

      {/* ── 存檔確認 Modal ── */}
      {saveConfirmOpen && (
        <SaveConfirmModal
          currentFileName={currentFileName}
          onClose={() => setSaveConfirmOpen(false)}
          onDiscard={handleSaveConfirmDiscard}
          onProceed={handleSaveConfirmProceed}
        />
      )}

      {showStyleLibrary && (
        <StyleLibraryPanel
          stylePresets={STYLE_PRESETS}
          position={styleLibPos}
          isDragging={styleLibDragging}
          selectedElementIds={selectedElementIds}
          onStartDrag={(e) => {
            e.preventDefault();
            styleLibDragOffRef.current = { x: e.clientX - styleLibPos.x, y: e.clientY - styleLibPos.y };
            setStyleLibDragging(true);
          }}
          onClose={() => setShowStyleLibrary(false)}
          onApplyStyle={handlePasteStyle}
        />
      )}

      <InfiniteCanvas 
        ref={canvasApiRef}
        elements={elements} 
        selectedElementIds={isFocusMode ? [] : selectedElementIds}
        onSelectElement={handleSelectElement}
        onMarqueeSelect={handleMarqueeSelect}
        onUpdateElement={updateElements}
        onInteractionStart={beginTransform}
        onInteractionEnd={handleInteractionEnd}
        setResetViewCallback={getResetViewCallback} 
        onGenerate={handleGenerateWithIntent}
        onContextMenu={handleContextMenu}
        onEditDrawing={handleEditDrawing}
        onOpenNodeWorkflow={setActiveNodeGroupId}
        onCopySelection={copySelection}
        onPasteSelection={pasteSelection}
        onDuplicateSelection={duplicateSelection}
        onDuplicateInPlace={duplicateInPlace}
        imageStyle={imageStyle}
        onSetImageStyle={setImageStyle}
        imageAspectRatio={imageAspectRatio}
        onSetImageAspectRatio={setImageAspectRatio}
        imageSize={imageSize}
        onSetImageSize={setImageSize}
        preserveTransparency={preserveTransparency}
        onSetPreserveTransparency={setPreserveTransparency}
        useCustomSeed={useCustomSeed}
        onSetUseCustomSeed={setUseCustomSeed}
        customSeedValue={customSeedValue}
        onSetCustomSeedValue={setCustomSeedValue}
        generationModel={generationModel}
        onSetGenerationModel={handleSetGenerationModel}
        hasAtlasKey={!!atlasApiKey}
        hasFalKey={!!falApiKey}
        onBiRefNetRemoveBackground={handleBiRefNetRemoveBackground}
        onAtlasRemoveBackground={undefined}
        outpaintingState={outpaintingState}
        onUpdateOutpaintingFrame={handleUpdateOutpaintingFrame}
        onCancelOutpainting={handleCancelOutpainting}
        onOutpaintingGenerate={handleOutpaintingGenerate}
        onAutoPromptGenerate={handleAutoPromptGenerate}
        stylePresets={STYLE_PRESETS}
        onCameraAngle={handleCameraAngle}
        onRemoveBackground={handleRemoveBackground}

        onUpdateMultipleElements={updateMultipleElements}
        onAlign={alignElements}
        onHarmonize={handleHarmonize}
        isGenerating={isGenerating}
        generatingElementIds={generatingElementIds}
        generatingLabels={generatingLabels}
        generatingProgress={genProgress}
        generatingOpType={genOpType}
        croppingElementId={croppingElementId}
        onCancelCrop={handleCancelCrop}
        onApplyCrop={handleApplyCrop}
        interactionMode={interactionMode}
        activeShapeTool={activeShapeTool}
        notePlacing={placingNote}
        onUpscale={handleAIUpscale}
        onLocalUpscale={handleLocalUpscale}
        onLocalRemoveBackground={handleLocalRemoveBackground}
        onDragStart={() => setIsDraggingOnCanvas(true)}
        onDragEnd={() => setIsDraggingOnCanvas(false)}
        activeGuidelines={activeGuidelines}
        showImageSizes={showImageSizes}
        snapToObjects={snapToObjects}
      />

      {!isFocusMode && !semanticEditorTarget && (
        <DraggableToolbar
            selectedElement={elements.find(e => e.id === selectedElementIds[0])}
            onAddNote={handleStartPlaceNote}
            notePlacing={placingNote}
            onAddText={() => addText()}
            onAddArrow={(config) => addArrow(config)}
            onAddDrawing={() => addDrawing()}
            onAddImage={() => triggerImageUpload()}
            onAddFrame={(ratioLabel, ratioValue) => addFrame(ratioLabel, ratioValue)}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            onDuplicate={duplicateSelection}
            onOpenStyleLibrary={() => setShowStyleLibrary(!showStyleLibrary)}
            hasSelection={selectedElementIds.length > 0}
            isProcessing={selectedElementIds.some(id => generatingElementIds.includes(id))}
            onCrop={handleStartCrop}
            canCrop={selectedElementIds.length === 1 && elements.find(e => e.id === selectedElementIds[0])?.type === 'image'}
            interactionMode={interactionMode}
            onSetInteractionMode={setInteractionMode}
            onSelectShapeTool={handleSelectShapeTool}
            onExportCanvas={handleExportCanvas}
            onImportCanvas={triggerImportCanvas}
            onSaveFile={handleSaveFileWithConfirm}
            onSaveAsFile={handleSaveAsFile}
            onOpenFile={triggerImportCanvas}
            currentFileName={currentFileName}
            isFileSystemSupported={isFileSystemSupported}
            onAddArtboard={(preset) => addArtboard(preset, getCenterOfViewport())}
            generationModel={generationModel}
            onSetGenerationModel={handleSetGenerationModel}
            hasAtlasKey={!!atlasApiKey}
        />
      )}
      
      {!isFocusMode && !semanticEditorTarget && (
        <LayerPanel
            elements={elements}
            selectedElementIds={selectedElementIds}
            onSelect={handleLayerPanelSelect}
            onToggleVisibility={handleToggleVisibility}
            onToggleLock={handleToggleLock}
            onToggleGroupVisibility={handleToggleGroupVisibility}
            onToggleGroupLock={handleToggleGroupLock}
            onReorder={handleLayerDragDrop}
            onReorderGroup={handleGroupLayerDragDrop}
            onRename={handleRename}
            onGroup={handleGroup}
            onUngroup={handleUngroup}
            onDelete={handleDeleteLayerWithCache}
            onMerge={handleMergeLayersOverride}
            onExportMultiple={handleLayerPanelExport}
            isDraggingOnCanvas={isDraggingOnCanvas}
        />
      )}

      {!isFocusMode && selectedTextElement && (
          <TextPropertyPanel
             element={selectedTextElement}
             onUpdate={handleUpdateTextElement}
             onSnapshot={handleSnapshotTextElement}
             onClose={() => setSelectedElementIds([])}
          />
      )}

      {!isFocusMode && selectedShapeElement && (
          <ShapePropertyPanel
             element={selectedShapeElement}
             onUpdate={handleUpdateShapeElement}
             onClose={() => setSelectedElementIds([])}
          />
      )}

      {!isFocusMode && selectedArrowElement && (
          <ArrowPropertyPanel
             element={selectedArrowElement}
             onUpdate={handleUpdateArrowElement}
             onClose={() => setSelectedElementIds([])}
          />
      )}

      {!isFocusMode && !semanticEditorTarget && artboardForPanel && (
          <ArtboardPanel
              element={artboardForPanel}
              onUpdate={(updates) => setElements(prev => prev.map(el =>
                  el.id === artboardForPanel.id ? { ...el, ...updates } : el
              ))}
              onExport={() => downloadArtboard(artboardForPanel, elements)}
              onExportSVG={() => setShowSVGExportModal(true)}
              onClose={() => setSelectedElementIds([])}
              selectedArtboardCount={selectedElements.filter(el => el.type === 'artboard').length}
              onBatchExport={() => {
                  const artboardsToExport = selectedElements
                      .filter((el): el is ArtboardElement => el.type === 'artboard')
                      .sort((a, b) => b.zIndex - a.zIndex);
                  downloadMultipleArtboards(artboardsToExport, elements);
              }}
          />
      )}

      {isGenerating && generatingElementIds.length === 0 && (
        <div className="fixed top-0 left-0 right-0 z-[6000] pointer-events-none">
          <div className="h-[3px] w-full animate-progress-bar" />
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/75 text-white text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm whitespace-nowrap shadow-lg">
            AI 正在生圖...
          </div>
        </div>
      )}

      {generatedImages && generatedImages.length > 0 && (
        <GeneratedResultsModal
          generatedImages={generatedImages}
          generatedImagesMetadata={generatedImagesMetadata}
          logoBgProcessedRef={logoBgProcessedRef}
          onClose={() => setGeneratedImages(null)}
          onAddToCanvas={addGeneratedImageToCanvas}
          onDownload={downloadGeneratedImage}
        />
      )}
      
      {editingDrawing && (
        <DrawingModal 
          element={editingDrawing}
          onSave={handleSaveDrawing}
          onClose={() => setEditingDrawing(null)}
        />
      )}

      {editingImage && (
        <ImageEditModal
          element={editingImage}
          onSave={handleSaveImageEdit}
          onClose={() => setEditingImage(null)}
          apiKey={effectiveApiKey}
          imageModel={imageModel}
          atlasKey={atlasApiKey}
          canvasImages={elements
            .filter(el => el.type === 'image' && el.id !== editingImage.id && (el as any).src?.startsWith('data:'))
            .map(el => ({ id: el.id, src: (el as any).src, name: el.name }))}
        />
      )}

      {activeNodeGroup && (
        <NodeWorkflowOverlay
          element={activeNodeGroup}
          onClose={handleCloseNodeWorkflow}
          onImportOutput={handleImportNodeWorkflowOutput}
          onDetachImage={handleDetachNodeImage}
          engine={{ geminiApiKey: effectiveApiKey, atlasApiKey, falApiKey, geminiImageModel: imageModel, generationModel, imageSize, imageAspectRatio, preserveTransparency }}
          onOutputChange={handleNodeWorkflowOutput}
          onInvalidateOutput={handleInvalidateNodeWorkflowOutput}
          onRunError={(msg) => showToast(`❌ ${msg}`)}
        />
      )}

      {crossPlatformTarget && (
        <CrossPlatformModal
          imageName={crossPlatformTarget.name}
          defaultModel={generationModel}
          hasAtlas={!!atlasApiKey}
          onGenerate={(platformIds, opts) => {
            const id = crossPlatformTarget.elementId;
            handleCrossPlatformAdapt(id, platformIds, opts).catch((e: any) =>
              showToast(`❌ 跨平台適配失敗：${e?.message?.slice(0, 60) || '未知錯誤'}`)
            );
          }}
          onClose={() => setCrossPlatformTarget(null)}
        />
      )}

      {brandKitTarget && (
        <BrandKitModal
          imageName={brandKitTarget.name}
          hasAtlas={!!atlasApiKey}
          onGenerate={(brief, model, resolution, selectedAssetIds, customSeed) => {
            const id = brandKitTarget.elementId;
            handleExtendBrandKit(id, brief, model, resolution, selectedAssetIds, customSeed).catch((e: any) =>
              showToast(`❌ 品牌視覺延伸失敗：${e?.message?.slice(0, 60) || '未知錯誤'}`)
            );
          }}
          onClose={() => setBrandKitTarget(null)}
        />
      )}

      {productMarketingTarget && (
        <ProductMarketingModal
          imageName={productMarketingTarget.name}
          hasAtlas={!!atlasApiKey}
          onGenerate={(brief, model, resolution, selectedRecipeIds, platformId, customSeed) => {
            const id = productMarketingTarget.elementId;
            handleProductMarketingSet(id, brief, model, resolution, selectedRecipeIds, platformId, customSeed).catch((e: any) =>
              showToast(`❌ 產品行銷組圖生成失敗：${e?.message?.slice(0, 60) || '未知錯誤'}`)
            );
          }}
          onClose={() => setProductMarketingTarget(null)}
        />
      )}

      {magicLayerTargetId && (
        <MagicLayerModal
          defaultModel={(generationModel === 'seedream-v5-pro' || generationModel === 'gpt-image-2')
            ? generationModel as MagicLayerModel
            : atlasApiKey ? 'gpt-image-2' : 'gemini'}
          hasAtlasKey={!!atlasApiKey}
          onClose={() => setMagicLayerTargetId(null)}
          onAnalyze={async (options: MagicLayerOptions) => {
            const target = elements.find(element => element.id === magicLayerTargetId && element.type === 'image') as ImageElement | undefined;
            if (!target) throw new Error('找不到要分層的圖片');
            if (!effectiveApiKey) {
              setShowKeyModal(true);
              throw new Error('需要 Gemini API Key 才能分析圖層');
            }
            return analyzeMagicLayerPlan(target.src, effectiveApiKey, options);
          }}
          onStart={(options: MagicLayerOptions) => {
            const targetId = magicLayerTargetId;
            setMagicLayerTargetId(null);
            handleMagicLayer(targetId, options);
          }}
        />
      )}

      {contextMenu && (
        <ContextMenu
          menuData={contextMenu}
          onClose={() => setContextMenu(null)}
          actions={{
            addNote,
            addText,
            addArrow: (pos) => {
                addArrow({ x: pos.x, y: pos.y });
            },
            addDrawing,
            editDrawing: handleEditDrawing,
            startImageEdit: handleStartImageEdit,
            startOutpainting: handleStartOutpainting,
            createNodeWorkflow: handleCreateNodeWorkflow,
            addImage: triggerImageUpload,
            addFrame,
            deleteElement,
            bringToFront,
            bringForward,
            sendBackward,
            sendToBack,
            flipHorizontal: handleFlipHorizontal,
            flipVertical: handleFlipVertical,
            changeColor: handleColorChange,
            downloadImage,
            downloadImages,
            copyStyle: handleCopyStyle,
            pasteStyle: (elementIds: string[]) => setStylePasteModal({ targetIds: elementIds }),
            exportCanvas: handleExportCanvas,
            exportArtboard: (elementId: string) => {
                const artboard = elements.find(e => e.id === elementId) as ArtboardElement;
                if (artboard) downloadArtboard(artboard, elements);
            },
            importCanvas: triggerImportCanvas,
            saveFile: handleSaveFileWithConfirm,
            saveAsFile: handleSaveAsFile,
            openFile: triggerImportCanvas,
            isFileSystemSupported,
            currentFileName,
            group: handleGroup,
            ungroup: handleUngroup,
            toggleLock: handleToggleLock,
            toggleVisibility: handleToggleVisibility,
            unlockAll: handleUnlockAll,
            showAll: handleShowAll,
            rasterizeText: handleRasterizeTextOverride,
            rasterizeShape: handleRasterizeShape,
            rasterizeArrow: handleRasterizeArrow,
            mergeLayers: handleMergeLayersOverride,
            extractPrompt: handleExtractPrompt,
            optimizeNotePrompt: handleOptimizeNotePrompt,
            designMaster: handleOpenDesignMaster,
            magicLayer: (elementId: string) => setMagicLayerTargetId(elementId),
            semanticEditor: handleOpenSemanticEditor,
            ocrConvert: handleOCRConvert,
            splitSticker: handleSplitSticker,
            crossPlatformAdapt: handleOpenCrossPlatform,
            extendBrandKit: handleOpenBrandKit,
            productMarketingSet: handleOpenProductMarketing,
            clearStorage: () => setShowClearConfirm(true),
            toggleSnapToObjects,
            toggleShowImageSizes,
            resizeImage: (elementId: string) => setResizeImageTargetId(elementId),
          }}
          canChangeColor={canChangeColor}
          elementType={contextMenuElement?.type || null}
          hasCopiedStyle={!!copiedStyle}
          selectionCount={selectedElementIds.length}
          selectedElementIds={selectedElementIds}
          isGrouped={!!isGrouped}
          isLocked={isLocked}
          isVisible={isVisible}
          hasLockedElements={elements.some(el => el.isLocked)}
          hasHiddenElements={elements.some(el => !el.isVisible)}
          snapToObjects={snapToObjects}
          showImageSizes={showImageSizes}
          selectedElement={contextMenuElement || undefined}
        />
      )}

      {resizeImageTargetId && (() => {
        const el = elements.find(e => e.id === resizeImageTargetId);
        if (!el) return null;
        return (
          <ImageResizeModal
            element={el}
            onResize={handleResizeElement}
            onClose={() => setResizeImageTargetId(null)}
          />
        );
      })()}

      {stylePasteModal && copiedStyle && (
        <StylePasteModal
          analysis={copiedStyle.analysis}
          onApply={(selectedKeys) => {
            handleApplyStyle(stylePasteModal.targetIds, selectedKeys);
            setStylePasteModal(null);
          }}
          onClose={() => setStylePasteModal(null)}
        />
      )}

      {designMasterTargetId && (() => {
        const el = elements.find(e => e.id === designMasterTargetId);
        if (!el || (el.type !== 'note' && el.type !== 'text')) return null;
        const content = el.type === 'note' ? (el as NoteElement).content : (el as TextElement).text;
        return (
          <DesignMasterPanel
            noteContent={content || ''}
            isGenerating={isGenerating}
            generationModel={generationModel}
            hasAtlasKey={!!atlasApiKey}
            apiKey={effectiveApiKey}
            showToast={showToast}
            onClose={() => setDesignMasterTargetId(null)}
            onGenerate={(prompt, count, model, autoRemoveBg, aspect, imageSizeOverride, refStyleIndex, refStyleScope, stickerDebgBorder, customSeed) => {
              setDesignMasterTargetId(null);
              handleGenerate([el], count, prompt, model, autoRemoveBg, aspect, imageSizeOverride, refStyleIndex, refStyleScope, stickerDebgBorder, customSeed);
            }}
            onGenerateBrandKit={(brief, model, resolution) => {
              setDesignMasterTargetId(null);
              handleLogoBrandKit(el.id, brief, model, resolution).catch(e =>
                showToast(`❌ 品牌套件生成失敗：${e?.message?.slice(0, 60) || '未知錯誤'}`)
              );
            }}
            referenceImages={el.type === 'note' ? (el as NoteElement).referenceImages : undefined}
            onUpdateReferenceImages={el.type === 'note' ? (refs) => updateElements({ ...(el as NoteElement), referenceImages: refs }) : undefined}
            initialState={designMasterStates[el.id]}
            onPersistState={(s) => {
              // 記住這張便利貼的設定（下次重複進入還原）
              setDesignMasterStates(prev => ({ ...prev, [el.id]: s }));
              // 同步：把便利貼提示詞改成設計大師內編輯後的內容（避免回畫布後提示詞消失）
              if (el.type === 'note') updateElements({ ...(el as NoteElement), content: s.content });
              else updateElements({ ...(el as TextElement), text: s.content });
            }}
          />
        );
      })()}

      {isDraggingOver && (
        <ImageDropOverlay />
      )}
    </main>

    {/* ── Semantic Editor（全螢幕 overlay）── */}
    {semanticEditorTarget && (
      <SemanticEditorView
        originalBase64={semanticEditorTarget.src}
        imageName={semanticEditorTarget.name}
        onClose={handleCloseSemanticEditor}
        initialState={savedSemanticStates[semanticStateKey(semanticEditorTarget)]}
        onImportToCanvas={(compositeBase64, currentState) => {
          // 新增到畫布（原圖右側）
          const origEl = elements.find(
            e => e.type === 'image' && (e as ImageElement).src === semanticEditorTarget!.src
          ) as ImageElement | undefined;

          const newId = `semantic_result_${Date.now()}`;
          const newEl: ImageElement = {
            id:       newId,
            type:     'image',
            src:      compositeBase64,
            name:     `${semanticEditorTarget!.name} (編輯版)`,
            position: origEl
              ? { x: origEl.position.x + (origEl.width ?? 400) + 40, y: origEl.position.y }
              : { x: 200, y: 200 },
            width:    origEl?.width  ?? 400,
            height:   origEl?.height ?? 400,
            rotation: 0,
            // 用實際最大 zIndex+1（length+1 在 zIndex 有跳號時會偏低 → 新元素沉底）
            zIndex:   (elements.length ? Math.max(...elements.map(e => e.zIndex || 0)) : 0) + 1,
            isVisible: true,
            isLocked:  false,
            groupId:   null,
            opacity:   1,
          };
          setElements(prev => [...prev, newEl]);
          cacheImage(newId, compositeBase64);

          // 儲存當前編輯狀態（記憶體 + ImageElement 持久化）
          if (currentState && semanticEditorTarget) {
            const key = semanticStateKey(semanticEditorTarget);
            setSavedSemanticStates(prev => ({ ...prev, [key]: currentState }));
            syncSemanticStateToElement(semanticEditorTarget.elementId, currentState);
          }

          // 只顯示 toast，不關閉編輯器
          showToast('✅ 已匯入畫布！可繼續在此編輯');
        }}
        onImportLayersToCanvas={(smartLayers) => {
          // 找到原圖在畫布上的 ImageElement（用來計算原位座標）
          const origEl = elements.find(
            e => e.type === 'image' && (e as ImageElement).src === semanticEditorTarget!.src
          ) as ImageElement | undefined;
          if (!origEl) return;

          const origLeft = origEl.position.x - origEl.width  / 2;
          const origTop  = origEl.position.y - origEl.height / 2;

          const baseZ = Math.max(
            0,
            ...elements.filter(element => element.type !== 'artboard').map(element => element.zIndex),
          ) + 1;
          const newEls: ImageElement[] = smartLayers.map((layer, i) => {
            // cropRatio 是 0–1，相對原圖尺寸
            const layerW = Math.round(layer.cropRatio.w * origEl.width);
            const layerH = (layer.pixelWidth && layer.pixelHeight && layerW > 0)
              ? Math.round(layerW * layer.pixelHeight / layer.pixelWidth)
              : Math.round(layer.cropRatio.h * origEl.height);
            // 在畫布上的中心點
            const cx = origLeft + layer.cropRatio.x * origEl.width + layerW / 2;
            const cy = origTop  + layer.cropRatio.y * origEl.height + layerH / 2;
            const id  = `sem_layer_${Date.now()}_${i}`;
            return {
              id,
              type: 'image',
              src:  layer.base64,
              name: layer.name,
              position: { x: cx, y: cy },
              width:    layerW,
              height:   layerH,
              rotation: 0,
              zIndex:   baseZ + i,
              isVisible: true,
              isLocked:  false,
              groupId:   null,
              opacity:   1,
            } as ImageElement;
          });

          setElements(prev => [...prev, ...newEls]);
          newEls.forEach(el => { if (el.src.startsWith('data:')) cacheImage(el.id, el.src); });
        }}
        geminiApiKey={effectiveApiKey || undefined}
        atlasApiKey={atlasApiKey || undefined}
        falApiKey={falApiKey || undefined}
        imageModel={imageModel}
      />
    )}
    </>
  );
};

export default App;
