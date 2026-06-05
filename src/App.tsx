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
import { DrawingModal } from './components/DrawingModal';
import { ImageEditModal } from './components/ImageEditModal';
import { DraggableToolbar } from './components/DraggableToolbar';
import { LayerPanel } from './components/LayerPanel';
import { TextPropertyPanel } from './components/TextPropertyPanel';
import { ShapePropertyPanel } from './components/ShapePropertyPanel'; 
import { ArrowPropertyPanel } from './components/ArrowPropertyPanel';
import { FloatingAssistant } from './components/FloatingAssistant'; 
import { ArtboardPanel, downloadArtboard, downloadMultipleArtboards, exportArtboardsAsPDF } from './features/artboard';
import { useCanvas } from './hooks/useCanvas';
import { useAI } from './hooks/useAI';
import { STYLE_PRESETS, COLORS, isCJK, wrapTextCanvas, loadImage, createShapeDataUrl, restoreOriginalAlpha, getClosestAspectRatio, measureTextVisualBounds, renderImageElementToDataUrl } from './utils/helpers';
import { drawTextOnCanvas } from './utils/textCanvas'; // ✅ 新增
import { captureTextElementAsImage } from './utils/svgCapture'; // ✅ 彎曲文字轉圖片用
import { analyzeImagePrompt } from './utils/ImageAnalysisService';
import { downloadImageAsBase64, callAtlasImg2Img } from './utils/atlasImage';
import { cacheImage, getCachedImage, deleteCachedImage } from './utils/imageCache';
import { birefnetRemoveBg } from './utils/geminiLayer';
import { gptLayerSegment } from './utils/gptLayerSplit';
import { detectTextBlocks } from './utils/ocrService';
import { SVGExportModal } from './components/SVGExportModal';
import { SemanticEditorView } from './components/SemanticEditor';
import type {
    DrawingElement, ImageElement, TextElement, ShapeElement, Point, ShapeType, ArrowElement, FrameElement, NoteElement, CanvasElement, ArtboardElement
} from './types';
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

// --- API Key Modal Component ---
const ApiKeyModal = ({
    onSubmit,
    onClose,
    atlasKey: initialAtlasKey,
    onSubmitAtlas,
    falKey: initialFalKey,
    onSubmitFal,
}: {
    onSubmit: (key: string) => void;
    onClose: () => void;
    atlasKey?: string;
    onSubmitAtlas?: (key: string) => void;
    falKey?: string;
    onSubmitFal?: (key: string) => void;
}) => {
    const [key, setKey] = useState('');
    const [atlasKey, setAtlasKey] = useState(initialAtlasKey || '');
    const [falKey, setFalKey] = useState(initialFalKey || '');

    return (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full border border-white/20 relative overflow-hidden">
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-[#1D1D1F] hover:bg-gray-100 rounded-full transition-all z-20"
                    title="暫時略過 (稍後可點擊上方紅燈設定)"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                {/* Decorative blobs */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-200 rounded-full blur-3xl opacity-30 pointer-events-none"></div>
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-200 rounded-full blur-3xl opacity-30 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-gradient-to-tr from-[#AF52DE] to-[#5856D6] rounded-2xl flex items-center justify-center mb-6 shadow-lg transform -rotate-3">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-[#1D1D1F] mb-2">Welcome to YOHAKU</h2>
                    <p className="text-[#86868B] text-sm mb-6 leading-relaxed">
                        這是一個使用 Gemini 3 Pro 的 AI 無限畫布。
                        <br/>
                        為了啟用 AI 功能，請輸入您的 Gemini API Key。
                    </p>

                    <div className="w-full space-y-3">
                        {/* Gemini Key */}
                        <div>
                            <p className="text-[11px] font-medium text-gray-500 mb-1 text-left">Gemini API Key（必填）</p>
                            <input
                                type="password"
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                                placeholder="AIza..."
                                className="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all text-sm"
                                autoFocus
                            />
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
                                className="text-[10px] text-[#007AFF] hover:underline mt-1 inline-block">
                                沒有 Gemini Key？點此免費獲取 →
                            </a>
                        </div>

                        {/* Atlas Key */}
                        <div>
                            <p className="text-[11px] font-medium text-gray-500 mb-1 text-left">Atlas Cloud Key（選填・GPT Image 2 / 即夢生圖用）</p>
                            <input
                                type="password"
                                value={atlasKey}
                                onChange={(e) => setAtlasKey(e.target.value)}
                                placeholder="apikey-..."
                                className="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                            />
                            <a href="https://www.atlascloud.ai?ref=3G2WHU" target="_blank" rel="noopener noreferrer"
                                className="text-[10px] text-[#007AFF] hover:underline mt-1 inline-block">
                                沒有 Atlas Key？點此取得 →
                            </a>
                        </div>

                        {/* fal.ai Key */}
                        <div>
                            <p className="text-[11px] font-medium text-gray-500 mb-1 text-left">fal.ai Key（選填・BiRefNet 去背用）</p>
                            <input
                                type="password"
                                value={falKey}
                                onChange={(e) => setFalKey(e.target.value)}
                                placeholder="fal_..."
                                className="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all text-sm"
                            />
                            <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noopener noreferrer"
                                className="text-[10px] text-[#007AFF] hover:underline mt-1 inline-block">
                                沒有 fal.ai Key？點此取得 →
                            </a>
                        </div>

                        <button
                            onClick={() => {
                                if (key) onSubmit(key);
                                if (atlasKey && onSubmitAtlas) onSubmitAtlas(atlasKey);
                                if (falKey && onSubmitFal) onSubmitFal(falKey);
                                if (key || atlasKey || falKey) onClose();
                            }}
                            disabled={!key && !atlasKey && !falKey}
                            className="w-full py-3 bg-black text-white font-bold rounded-xl shadow-lg shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            儲存設定
                        </button>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 w-full">
                        <p className="text-[10px] text-gray-400">
                            您的 Key 僅儲存於本地瀏覽器，不會上傳至伺服器。
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // --- Image Model Selection ---
  const [imageModel, setImageModel] = useState<string>(
    () => localStorage.getItem('yohaku_image_model') || 'gemini-3.1-flash-image-preview'
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



  // --- Semantic Editor state (handler defined later, after elements) ---
  const [semanticEditorTarget, setSemanticEditorTarget] = useState<{ src: string; name: string } | null>(null);

  /**
   * 保留每張圖片的語意編輯器狀態，key = element.src（base64 前 100 字元作為識別）
   * 退出時 save=true 就保留，下次開同一張圖可以繼續
   */
  const [savedSemanticStates, setSavedSemanticStates] = useState<Record<string, {
    compositeBase64: string;
    layers: import('./types').SmartLayer[];
    versions: import('./types').EditorVersion[];
  }>>({});

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
      clearStorage,
  } = useCanvas(showToast);

  // --- Semantic Editor handler (needs elements) ---
  const handleOpenSemanticEditor = useCallback((elementId: string) => {
    const el = elements.find(e => e.id === elementId && e.type === 'image') as ImageElement | undefined;
    if (!el) return;
    setSemanticEditorTarget({ src: el.src, name: el.name || '圖片' });
  }, [elements]);

  /** key 用 src 前 80 字元（避免太長） */
  const semanticStateKey = (src: string) => src.slice(0, 80);

  /** 退出語意編輯器：save=true 保留紀錄，save=false 清除 */
  const handleCloseSemanticEditor = useCallback((
    save: boolean,
    savedState?: { compositeBase64: string; layers: import('./types').SmartLayer[]; versions: import('./types').EditorVersion[] }
  ) => {
    if (save && savedState && semanticEditorTarget) {
      const key = semanticStateKey(semanticEditorTarget.src);
      setSavedSemanticStates(prev => ({ ...prev, [key]: savedState }));
    } else if (!save && semanticEditorTarget) {
      // 清除這張圖的紀錄
      const key = semanticStateKey(semanticEditorTarget.src);
      setSavedSemanticStates(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    setSemanticEditorTarget(null);
  }, [semanticEditorTarget]);

  // ── 存檔確認 Modal ──────────────────────────────────────────
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);

  // 有既有 handle 時先跳確認，否則直接開 Save As
  const handleSaveFileWithConfirm = useCallback(() => {
    if (currentFileName) {
      setSaveConfirmOpen(true);
    } else {
      handleSaveFile();
    }
  }, [currentFileName, handleSaveFile]);

  const handleSaveConfirmProceed = useCallback(async () => {
    setSaveConfirmOpen(false);
    await handleSaveFile();
  }, [handleSaveFile]);

  const handleSaveConfirmDiscard = useCallback(async () => {
    setSaveConfirmOpen(false);
    await handleNewCanvas(); // 清除 handle，下次存檔會開 Save As
    showToast('已中斷連結，下次存檔將另存新檔');
  }, [handleNewCanvas, showToast]);

  // Wrap handleDeleteLayer to also clean up IndexedDB cache
  const handleDeleteLayerWithCache = useCallback((id: string) => {
    const el = elements.find(e => e.id === id);
    if (el && el.type === 'image') deleteCachedImage(id);
    handleDeleteLayer(id);
  }, [elements, handleDeleteLayer]);

  const [isDraggingOnCanvas, setIsDraggingOnCanvas] = useState(false);
  // --- AI State Hooks ---
  const {
      isGenerating,
      setIsGenerating,
      generatingElementIds,
      setGeneratingElementIds,
      generatedImages,
      setGeneratedImages,
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
      handleGenerate,
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
  });

  // --- BiRefNet v2 去背 ---
  const handleBiRefNetRemoveBackground = useCallback(async (model: string = 'Matting') => {
      if (!falApiKey) { showToast('需要 fal.ai API Key，請在設定中輸入'); setShowKeyModal(true); return; }
      const targets = elements.filter(el => selectedElementIds.includes(el.id) && el.type === 'image') as ImageElement[];
      if (targets.length === 0) return;
      setIsGenerating(true);
      setGeneratingElementIds(targets.map(el => el.id));
      showToast(`🔍 BiRefNet v2 去背中（${model}）...`);
      try {
          for (const el of targets) {
              const result = await birefnetRemoveBg(el.src, falApiKey, model as any);
              setElements(prev => prev.map(e => e.id === el.id ? { ...e, src: result } : e));
              if (result.startsWith('data:')) cacheImage(el.id, result);
          }
          showToast('✅ BiRefNet 去背完成！');
      } catch (e: any) {
          showToast(`❌ BiRefNet 去背失敗：${e.message?.slice(0, 60) || '未知錯誤'}`);
      } finally {
          setIsGenerating(false);
          setGeneratingElementIds([]);
      }
  }, [falApiKey, elements, selectedElementIds, setElements, showToast, setIsGenerating, setGeneratingElementIds]);


  // --- 魔法分層：語意提取 + 背景補圖（GPT Image 2 優先；無 Atlas Key 降級 Gemini）---
  const handleMagicLayer = useCallback(async (elementId: string) => {
      const el = elements.find(e => e.id === elementId && e.type === 'image') as ImageElement | undefined;
      if (!el) return;

      setIsGenerating(true);
      setGeneratingElementIds([elementId]);
      const modeLabel = atlasApiKey ? 'GPT Image 2' : 'Gemini';
      showToast(`✨ 魔法分層啟動中（${modeLabel}）...`);

      try {
          const layers = await gptLayerSegment(
              el.src,
              effectiveApiKey || '',
              atlasApiKey || undefined,   // undefined → Gemini fallback
              falApiKey || undefined,
              (msg) => showToast(msg),
              imageModel,
          );
          if (layers.length === 0) throw new Error('未收到任何圖層');

          const baseZ = el.zIndex;
          const GAP = 30; // 原圖與圖層群組之間的間距（world units）
          // 圖層區塊的左上角 X（原圖右邊緣 + gap）
          const layerAreaLeft = el.position.x - el.width / 2 + el.width + GAP;
          const layerAreaTop  = el.position.y - el.height / 2;

          const newLayerElements: ImageElement[] = layers.map((layer, i) => {
              const isBackground = i === 0;
              // 位置夾在 [0, 1] 安全範圍
              const clampedX = Math.max(0, Math.min(1, layer.cropRatioX));
              const clampedY = Math.max(0, Math.min(1, layer.cropRatioY));
              // 寬：cropRatioW × el.width（在原圖空間的比例縮放）
              // 高：維持 GPT 輸出的原生像素比例（pixelH/pixelW），避免強套原圖 AR 造成變形
              const layerW = isBackground ? el.width : Math.round(layer.cropRatioW * el.width);
              const layerH = isBackground ? el.height
                  : (layer.pixelWidth && layer.pixelHeight && layerW > 0)
                      ? Math.round(layerW * layer.pixelHeight / layer.pixelWidth)
                      : Math.round(layer.cropRatioH * el.height);
              // 中心點 = 圖層區塊左上角 + bbox 偏移 + 半寬/高
              const cx = isBackground
                  ? layerAreaLeft + el.width / 2
                  : layerAreaLeft + clampedX * el.width + layerW / 2;
              const cy = isBackground
                  ? el.position.y
                  : layerAreaTop + clampedY * el.height + layerH / 2;
              const layerName = layer.name
                  ? (layer.category ? `[${layer.category}] ${layer.name}` : layer.name)
                  : (isBackground ? `${el.name || '圖片'} 背景` : `${el.name || '圖片'} 圖層 ${i}`);
              return {
                  ...el,
                  id: `${el.id}_layer_${i}_${Date.now() + i}`,
                  src: layer.base64,
                  position: { x: cx, y: cy },
                  width: layerW,
                  height: layerH,
                  zIndex: baseZ + i,
                  name: layerName,
                  isLocked: false,
              };
          });

          // 原圖保持可見，圖層貼在右側
          setElements(prev => [...prev, ...newLayerElements]);
          newLayerElements.forEach(le => { if (le.src.startsWith('data:')) cacheImage(le.id, le.src); });
          showToast(`✅ 魔法分層完成！${layers.length - 1} 個物件圖層 + 補全背景`);
      } catch (e: any) {
          showToast(`❌ 魔法分層失敗：${e.message?.slice(0, 60) || '未知錯誤'}`);
      } finally {
          setIsGenerating(false);
          setGeneratingElementIds([]);
      }
  }, [atlasApiKey, effectiveApiKey, elements, setElements, showToast, setIsGenerating, setGeneratingElementIds]);

  // --- OCR 文字辨識轉換 ---
  const handleOCRConvert = useCallback(async (elementId: string) => {
      const el = elements.find(e => e.id === elementId && e.type === 'image') as ImageElement | undefined;
      if (!el) return;

      setIsGenerating(true);
      setGeneratingElementIds([elementId]);
      showToast('🔍 正在辨識文字...');

      try {
          const blocks = await detectTextBlocks(el.src, effectiveApiKey || '');
          if (blocks.length === 0) { showToast('未偵測到文字'); return; }

          const newTextElements: TextElement[] = blocks.map((block, i) => {
              // 以圖片在畫布的實際像素換算 TextElement 的 position / width / height / fontSize
              const imgLeft   = el.position.x - el.width  / 2;
              const imgTop    = el.position.y - el.height / 2;

              const blockW    = block.bbox.w * el.width;
              const blockH    = block.bbox.h * el.height;
              const blockX    = imgLeft + block.bbox.x * el.width  + blockW / 2;
              const blockY    = imgTop  + block.bbox.y * el.height + blockH / 2;

              // fontSize：區塊高度 / 行數 × 0.78（預留行距）
              const fontSize  = Math.round((blockH / block.lines) * 0.78);

              return {
                  id: `ocr_${Date.now()}_${i}`,
                  type: 'text' as const,
                  text: block.text,
                  position: { x: blockX, y: blockY },
                  width:  blockW,
                  height: blockH,
                  rotation: 0,
                  zIndex: el.zIndex + i + 1,
                  isVisible: true,
                  isLocked: false,
                  name: `文字 ${i + 1}`,
                  groupId: null,
                  fontFamily: '"Noto Sans TC", sans-serif',
                  fontSize: Math.max(8, Math.min(fontSize, 200)),
                  color: block.colorHex,
                  align: block.align,
                  letterSpacing: 0,
                  lineHeight: 1.3,
                  isBold: block.isBold,
                  isItalic: block.isItalic,
                  isUnderline: false,
                  isWidthLocked: true,
              };
          });

          setElements(prev => [...prev, ...newTextElements]);
          showToast(`✅ 辨識完成！新增 ${blocks.length} 個文字物件`);
      } catch (e: any) {
          showToast(`❌ 文字辨識失敗：${e.message?.slice(0, 60) || '未知錯誤'}`);
      } finally {
          setIsGenerating(false);
          setGeneratingElementIds([]);
      }
  }, [effectiveApiKey, elements, setElements, showToast, setIsGenerating, setGeneratingElementIds]);

  // --- WRAPPED updateElements to Sync Outpainting Frame ---
  const updateElements = useCallback((updatedElement: CanvasElement, dragDelta?: Point) => {
      originalUpdateElements(updatedElement, dragDelta);

      // Sync outpainting frame position if the element being moved is the one being outpainted
      if (outpaintingState && outpaintingState.element.id === updatedElement.id && dragDelta) {
          setOutpaintingState(prev => {
              if (!prev) return null;
              return {
                  ...prev,
                  element: updatedElement as ImageElement,
                  frame: {
                      ...prev.frame,
                      position: {
                          x: prev.frame.position.x + dragDelta.x,
                          y: prev.frame.position.y + dragDelta.y
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

  // --- NEW: Independent Handler for Image Analysis ---
  const handleExtractPrompt = useCallback(async (elementId: string) => {
      const element = elements.find(el => el.id === elementId) as ImageElement;
      if (!element || element.type !== 'image') return;

      if (!effectiveApiKey) {
          setShowKeyModal(true);
          showToast("請先設定 API Key");
          return;
      }

      setIsGenerating(true);
      setGeneratingElementIds([elementId]); // Show badge on the target image
      showToast("🔍 正在進行圖片逆向分析...");

      try {
          const result = await analyzeImagePrompt(element.src, effectiveApiKey);
          
          // Calculate positions
          // Right of the image for English note
          const enPos = { 
              x: element.position.x + element.width / 2 + 20 + 140, // 140 is half note width
              y: element.position.y - 60 
          };
          
          // Below English note for Chinese note
          const zhPos = {
              x: enPos.x,
              y: enPos.y + 370 // 350 height + 20 gap
          };

          const newNotes: CanvasElement[] = [];

          // Add Yellow Note (EN)
          zIndexCounter.current += 1;
          const enNote: NoteElement = {
              id: `${Date.now()}-note-en`,
              type: 'note',
              position: enPos,
              width: 300,
              height: 350,
              rotation: 0,
              content: result.en,
              color: 'bg-[#FFFDE7]', // Yellow-ish
              textAlign: 'left',
              zIndex: zIndexCounter.current,
              isVisible: true,
              isLocked: false,
              name: 'Prompt (EN)',
              groupId: null
          };
          newNotes.push(enNote);

          // Add Green Note (ZH)
          zIndexCounter.current += 1;
          const zhNote: NoteElement = {
              id: `${Date.now()}-note-zh`,
              type: 'note',
              position: zhPos,
              width: 300,
              height: 350,
              rotation: 0,
              content: result.zh,
              color: 'bg-[#E8F5E9]', // Green-ish
              textAlign: 'left',
              zIndex: zIndexCounter.current,
              isVisible: true,
              isLocked: false,
              name: 'Prompt (ZH)',
              groupId: null
          };
          newNotes.push(zhNote);

          // Batch update to ensure both are added
          setElements(prev => [...prev, ...newNotes]);

          showToast("提示詞提取完成！已建立中英對照便利貼 ✨");

      } catch (error) {
          console.error("Deep Extract Failed:", error);
          showToast("分析失敗，請檢查 API Key 權限或網絡連線");
      } finally {
          setIsGenerating(false);
          setGeneratingElementIds([]);
      }
  }, [elements, effectiveApiKey, setElements, showToast, zIndexCounter, setGeneratingElementIds]);


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


  // ✅ 刪除第 404~658 行 (drawTextOnCanvas 區域函數定義)

  // --- RASTERIZE TEXT OVERRIDE (Fix: Uses Correct Dimensions with High DPI Scaling) ---
  const handleRasterizeTextOverride = useCallback(async (id: string) => {
      const element = elements.find(el => el.id === id) as TextElement;
      if (!element || element.type !== 'text') return;

      try {
          const scale = 3;
          const isCurved = Math.abs((element as any).curveStrength || 0) > 0.1;

          const shadowOverflow = element.shadowBlur
              ? Math.ceil(element.shadowBlur + 4)
              : 0;
          const glowOverflow = element.glowBlur
              ? Math.ceil(element.glowBlur)
              : 0;
          const strokeOverflow = Math.ceil((element.strokeWidth || 0) / 2);
          const effectPadding = Math.max(shadowOverflow, glowOverflow, strokeOverflow, 0);

          const canvasWidth  = element.width  + effectPadding * 2;
          const canvasHeight = element.height + effectPadding * 2;

          let newSrc: string;

          if (isCurved) {
              // 彎曲文字：直接捕捉 DOM 中的 SVG，確保像素完全吻合螢幕顯示
              // （canvas 重繪可能因字符寬度測量誤差導致弧心偏移）
              newSrc = await captureTextElementAsImage(
                  element.id,
                  element.width,
                  element.height,
                  effectPadding,
                  scale,
                  (element.backgroundColor && element.backgroundColor !== 'transparent')
                      ? element.backgroundColor
                      : undefined,
                  element.fontFamily,
                  element.text
              );
          } else {
              const offCanvas = document.createElement('canvas');
              offCanvas.width  = canvasWidth  * scale;
              offCanvas.height = canvasHeight * scale;
              const offCtx = offCanvas.getContext('2d')!;
              offCtx.scale(scale, scale);
              await document.fonts.ready;
              drawTextOnCanvas(offCtx, element, effectPadding, effectPadding);
              newSrc = offCanvas.toDataURL('image/png');
          }

          const newImage: ImageElement = {
              id: element.id,
              type: 'image',
              src: newSrc,
              position: {
                  x: element.position.x,
                  y: element.position.y,
              },
              width:    canvasWidth,
              height:   canvasHeight,
              rotation: element.rotation,
              zIndex:   element.zIndex,
              isVisible: element.isVisible,
              isLocked:  element.isLocked,
              name:     `${element.name} (Image)`,
              groupId:  element.groupId
          };

          setElements(prev => prev.map(el => el.id === id ? newImage : el));
          showToast("文字已轉換為圖片，效果完整保留 ✨");

      } catch (e) {
          console.error("Rasterize failed", e);
          showToast("文字轉換圖片失敗");
      }
  }, [elements, setElements, showToast]);

  const handleMergeLayersOverride = useCallback(async () => {
      await originalMergeLayers();
  }, [originalMergeLayers]);

  const [resetView, setResetView] = useState<() => void>(() => () => {});
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, worldPoint: Point, elementId: string | null } | null>(null);
  const [stylePasteModal, setStylePasteModal] = useState<{ targetIds: string[] } | null>(null);
  const [editingDrawing, setEditingDrawing] = useState<DrawingElement | null>(null);
  const [editingImage, setEditingImage] = useState<ImageElement | null>(null);
  const [interactionMode, setInteractionMode] = useState<'select' | 'hand'>('select');
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

  const handleGenerateWithIntent = useCallback((selectedElements: CanvasElement[], count: 1|2|3|4 = 2) => {
    const hasNotes = selectedElements.some(el => el.type === 'note' || el.type === 'text');
    const hasImages = selectedElements.some(el => el.type === 'image' || el.type === 'drawing' || el.type === 'shape');
    const hasStyle = imageStyle && imageStyle !== 'Default';
    // 只有圖片、沒有便利貼、沒有風格 → 詢問意圖
    if (hasImages && !hasNotes && !hasStyle) {
      setIntentText('');
      setIntentModal({ elements: selectedElements, count });
      return;
    }
    handleGenerate(selectedElements, count);
  }, [handleGenerate, imageStyle]);

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

  // Restore Atlas images from IndexedDB cache when they are broken URLs
  useEffect(() => {
    const restoreFromCache = async () => {
      const imageElements = elements.filter(
        el => el.type === 'image' && (el as any).src && !(el as any).src.startsWith('data:')
      );
      if (imageElements.length === 0) return;

      for (const el of imageElements) {
        const cached = await getCachedImage(el.id);
        if (cached) {
          setElements(prev => prev.map(e => e.id === el.id ? { ...e, src: cached } : e));
        }
      }
    };
    restoreFromCache();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  const isFocusMode = !!editingImage || !!editingDrawing;

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

  const addGeneratedImageToCanvas = useCallback(async (imageUrl: string) => {
    if (!imageUrl) return;
    // 確保存入畫布的一定是 base64（避免 Atlas CDN URL 過期後無法給 Gemini 使用）
    const src = imageUrl.startsWith('data:') ? imageUrl : await downloadImageAsBase64(imageUrl);
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      const MAX_DIMENSION = 400;
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) { height = (height / width) * MAX_DIMENSION; width = MAX_DIMENSION; }
        else { width = (width / height) * MAX_DIMENSION; height = MAX_DIMENSION; }
      }
      const elementId = addElement({ type: 'image', position: getCenterOfViewport(), src, width, height, rotation: 0, });
      // Cache the base64 image in IndexedDB so it survives page reload even if Atlas CDN URL expires
      if (src.startsWith('data:') && elementId) {
        cacheImage(elementId, src);
      }
    };
    img.src = src;
  }, [addElement, getCenterOfViewport]);

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

  const handleSaveImageEdit = useCallback((elementId: string, dataUrl: string, originalElement?: ImageElement) => {
    if (elementId === '') {
      // Create a new element
      const img = new Image();
      img.onload = () => {
        // Calculate position: slightly offset from original if provided, else center
        let position = getCenterOfViewport();
        if (originalElement) {
          position = {
            x: originalElement.position.x + 20,
            y: originalElement.position.y + 20
          };
        }
        
        addElement({
          type: 'image',
          position,
          src: dataUrl,
          width: img.width,
          height: img.height,
          rotation: 0,
        });
      };
      img.src = dataUrl;
    } else {
      // Update existing element
      setElements(prev => prev.map(el => el.id === elementId ? { ...el, src: dataUrl } : el));
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
  }, [activeShapeTool, addElement, setCreatingShapeId, setSelectedElementIds, shapeStartPointRef]);

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
      if (editingDrawing || editingImage) return;
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
        else if (e.key.toLowerCase() === 'v') { e.preventDefault(); pasteSelection(); }
        else if (e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelection(); }
        else if (e.key.toLowerCase() === 'g') { e.preventDefault(); if (e.shiftKey) handleUngroup(); else handleGroup(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteElement, undo, redo, editingDrawing, editingImage, outpaintingState, copySelection, pasteSelection, duplicateSelection, handleGroup, handleUngroup, activeShapeTool, creatingShapeId, setElements, handleCancelOutpainting, handleSaveFileWithConfirm, handleSaveAsFile]);
  
  useEffect(() => {
    const preventDefaults = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const handleDragEnter = (e: DragEvent) => { preventDefaults(e); dragCounter.current++; if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) { if (Array.from(e.dataTransfer.items).some(item => item.kind === 'file' && item.type.startsWith('image/'))) setIsDraggingOver(true); } };
    const handleDragLeave = (e: DragEvent) => { preventDefaults(e); dragCounter.current--; if (dragCounter.current === 0) setIsDraggingOver(false); };
    const handleDrop = (e: DragEvent) => {
        preventDefaults(e); dragCounter.current = 0; setIsDraggingOver(false);
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
    return () => {
        window.removeEventListener('dragenter', handleDragEnter);
        window.removeEventListener('dragover', preventDefaults);
        window.removeEventListener('dragleave', handleDragLeave);
        window.removeEventListener('drop', handleDrop);
    };
  }, [addImagesToCanvas]);

  return (
    <>
    <main
        className={`relative w-screen h-screen bg-[#F5F5F7] font-sans text-[#1D1D1F] ${activeShapeTool ? 'cursor-crosshair' : ''}`}
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
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[2002]">
          <div className="px-6 py-3 bg-black/80 backdrop-blur-md text-white text-sm font-medium rounded-full shadow-lg animate-fade-in-down">
            {toastMessage}
          </div>
        </div>
      )}

      {/* 語意編輯器開啟時隱藏功能助手 */}
      {!semanticEditorTarget && (
        <FloatingAssistant onCreateSticky={handleAiCreateSticky} onAskAI={handleAskAI} isHidden={isFocusMode} />
      )}

      {showKeyModal && (
          <ApiKeyModal
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
          <div className="fixed inset-0 z-[7000] flex items-center justify-center bg-black/30 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-gray-100 p-6 w-80 flex flex-col gap-4">
                  <div>
                      <p className="text-[15px] font-bold text-[#1D1D1F] mb-1">確定清除存檔？</p>
                      <p className="text-xs text-[#6e6e73] leading-relaxed">清除後畫布將重置為空白，此操作無法復原。建議先匯出 JSON 備份，再執行清除。</p>
                  </div>
                  <div className="flex gap-2">
                      <button
                          onClick={() => { originalExportCanvas(); }}
                          className="flex-1 py-2 text-xs font-bold bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                      >先匯出備份</button>
                      <button
                          onClick={() => { clearStorage(); setShowClearConfirm(false); }}
                          className="flex-1 py-2 text-xs font-bold bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                      >確定清除</button>
                  </div>
                  <button
                      onClick={() => setShowClearConfirm(false)}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors text-center"
                  >取消</button>
              </div>
          </div>
      )}

      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[6000]">
      <div className="animate-fade-in-down flex items-center gap-2">
          <button
              onClick={() => setShowKeyModal(true)}
              className="group flex items-center gap-2 px-4 py-1.5 bg-black/5 hover:bg-white backdrop-blur-sm rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-lg border border-white/20 transition-all duration-300"
          >
              <div className={`w-2 h-2 rounded-full shadow-sm ${isKeyValid ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50 animate-pulse'}`}></div>
              <span className={`text-[10px] font-bold tracking-wide transition-colors ${isKeyValid ? 'text-gray-500 group-hover:text-[#1D1D1F]' : 'text-red-500'}`}>
                  {isKeyValid ? 'API Ready' : 'Setup API'}
              </span>
              {isKeyValid && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-[#1D1D1F] opacity-0 group-hover:opacity-100 transition-all -ml-1"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              )}
          </button>

          {/* Model Toggle */}
          {isKeyValid && (
            <div className="flex items-center bg-black/5 backdrop-blur-sm rounded-full border border-white/20 p-0.5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
              <button
                onClick={() => handleSetImageModel('gemini-3.1-flash-image-preview')}
                className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all duration-200 ${
                  imageModel === 'gemini-3.1-flash-image-preview'
                    ? 'bg-white text-[#1D1D1F] shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Flash
              </button>
              <button
                onClick={() => handleSetImageModel('gemini-3-pro-image-preview')}
                className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all duration-200 ${
                  imageModel === 'gemini-3-pro-image-preview'
                    ? 'bg-white text-[#1D1D1F] shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Pro
              </button>
            </div>
          )}

          {/* Storage Status */}
          {storageStatus === 'full' || storageStatus === 'critical' ? (
              <div className="relative">
                  <button
                      onClick={() => setShowStoragePopover(v => !v)}
                      className={`flex items-center gap-2 px-4 py-1.5 backdrop-blur-sm rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.05)] border transition-all duration-300
                          ${storageStatus === 'full'
                              ? 'bg-red-50 border-red-200 hover:bg-red-100'
                              : 'bg-orange-50 border-orange-200 hover:bg-orange-100'}`}
                  >
                      <div className={`w-2 h-2 rounded-full ${storageStatus === 'full' ? 'bg-red-500 animate-pulse' : 'bg-orange-400'}`}></div>
                      <span className={`text-[10px] font-bold tracking-wide ${storageStatus === 'full' ? 'text-red-500' : 'text-orange-500'}`}>
                          {storageStatus === 'full' ? '存檔已滿' : '容量警告'}
                      </span>
                  </button>
                  {/* Popover */}
                  {showStoragePopover && (
                      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-68 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100 p-4 z-[6001]" style={{width: '272px'}}>
                          <div className="flex justify-between items-start mb-2">
                              <p className="text-xs font-bold text-[#1D1D1F]">
                                  {storageStatus === 'full' ? '存檔已滿' : '儲存空間不足'}
                              </p>
                              <button onClick={() => setShowStoragePopover(false)} className="text-gray-300 hover:text-gray-500 text-sm leading-none ml-2">✕</button>
                          </div>
                          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                              {storageStatus === 'full'
                                  ? '瀏覽器儲存空間已滿（上限 5MB），最新變更未能自動存檔。'
                                  : '儲存空間即將用盡（上限 5MB，目前使用超過 90%），建議立即備份。'}
                          </p>
                          <div className="flex gap-2">
                              <button
                                  onClick={originalExportCanvas}
                                  className="flex-1 py-1.5 text-[11px] font-bold bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                              >匯出 JSON 備份</button>
                              <button
                                  onClick={() => { setShowStoragePopover(false); setShowClearConfirm(true); }}
                                  className="flex-1 py-1.5 text-[11px] font-bold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                              >清除存檔</button>
                          </div>
                      </div>
                  )}
              </div>
          ) : storageStatus === 'warning' ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-full" title="儲存空間使用超過 70%，建議匯出 JSON 備份">
                  <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                  <span className="text-[10px] font-bold text-yellow-600">容量偏高</span>
              </div>
          ) : null}
      </div>
      </div>

      {/* ── 生成意圖 Modal ── */}
      {intentModal && (
        <div className="fixed inset-0 z-[7000] flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setIntentModal(null)}>
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/50 w-[400px] p-6" onClick={e => e.stopPropagation()}>
            <div className="mb-4">
              <h3 className="font-bold text-[#1D1D1F] text-[15px] mb-1">想讓 AI 做什麼？</h3>
              <p className="text-[11px] text-[#86868B] leading-relaxed">圖片已選取，但尚未設定提示詞或風格。<br/>告訴 AI 你的意圖，結果會更精準。</p>
            </div>
            <textarea
              autoFocus
              value={intentText}
              onChange={e => setIntentText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  const { elements: els, count } = intentModal;
                  setIntentModal(null);
                  handleGenerate(els, count, intentText.trim() || undefined);
                }
              }}
              placeholder="例如：轉成油畫風格、把背景換成日落、加強細節品質..."
              className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-gray-700 focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100 resize-none transition-colors"
              rows={3}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  const { elements: els, count } = intentModal;
                  setIntentModal(null);
                  handleGenerate(els, count, undefined);
                }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors"
              >
                跳過直接生成
              </button>
              <button
                onClick={() => {
                  const { elements: els, count } = intentModal;
                  setIntentModal(null);
                  handleGenerate(els, count, intentText.trim() || undefined);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-700 transition-colors"
              >
                確認生成
              </button>
            </div>
            <p className="text-center text-[10px] text-[#86868B] mt-2">按 Enter 快速確認 · Esc 或點空白處取消</p>
          </div>
        </div>
      )}

      {/* ── 存檔確認 Modal ── */}
      {saveConfirmOpen && (
        <div className="fixed inset-0 z-[7500] flex items-center justify-center bg-black/25 backdrop-blur-sm" onClick={() => setSaveConfirmOpen(false)}>
          <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-black/8 w-[360px] p-6" onClick={e => e.stopPropagation()}>
            <div className="mb-5">
              <h3 className="font-semibold text-[#1D1D1F] text-[15px] mb-1">覆蓋存檔</h3>
              <p className="text-[12px] text-[#86868B] leading-relaxed">
                確定要覆蓋桌面的 <span className="font-medium text-[#1D1D1F]">「{currentFileName}」</span>？
                <br />此操作無法復原。
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSaveConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-black/10 text-[#1D1D1F] text-[13px] font-medium hover:bg-gray-50 transition-colors"
              >取消</button>
              <button
                onClick={handleSaveConfirmDiscard}
                className="flex-1 py-2.5 rounded-xl border border-black/10 text-[#86868B] text-[13px] font-medium hover:bg-gray-50 transition-colors"
              >中斷連結</button>
              <button
                onClick={handleSaveConfirmProceed}
                className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-700 transition-colors"
              >存檔</button>
            </div>
          </div>
        </div>
      )}

      {showStyleLibrary && (() => {
        const STYLE_CATEGORIES = [
          { label: '🖌 繪畫與插畫',       ids: ['Minimalist','Watercolor','Oil Painting','Sketch','Impressionism','Chinese Ink Wash','Concept Watercolor','Transparent Wash','Fine Pencil Tech','Storybook Pencil','Industrial Marker'] },
          { label: '✏️ 動漫與漫畫',       ids: ['Comic Book','Japanese Anime','Manga Ink','Chibi','Webtoon','Mecha','Retro Cel Anime','Radiant Shinkai','Soft KyoAni','City Pop Graphic','Copic Manga'] },
          { label: '📷 攝影與底片',       ids: ['Noir','Sepia Old','Lomo','Cinematic HDR'] },
          { label: '💻 數位與現代藝術',   ids: ['Cyberpunk','Pop Art','Neon','Pixel Art','Glassmorphism','Glitch Effect','Vaporwave','Flat Design'] },
          { label: '🎨 特殊材質與色彩',   ids: ['Matte Pastel','Gothic','Grunge','Japanese Ukiyo-e','Duotone','Paper Cutout','Vivid High','Muted Earth','Blueprint','Risograph'] },
          { label: '🌸 次文化少女暗黑',   ids: ['Coquette','Jelly Candy','Y2K McBling','Decora Pop','Vamp Romantic','Weirdcore','Analog Horror','Pastel Goth','Whimsigothic','Alien Core','Fairy Grunge','Glacier Blue','Naïve Art','Fractured Glass'] },
          { label: '🔥 新世代潮流',       ids: ['Neubrutalism','Claymorphism','Acid Graphics','Xerox Lo-Fi','Frutiger Aero','Groovy Retro','Spatial UI','Fish-eye Lens','Woodcut Print','Thermal Heat','Neo-Bauhaus','Sticker Collage','Biophilic','Maximalism'] },
          { label: '🎉 節慶限定',         ids: ['Lunar New Year','Japanese Matsuri','Sakura Ohanami','Mid-Autumn Moon','Cozy Christmas','Spooky Halloween','Valentine Romance','Japanese Shogatsu','Easter Pastel','Retro Ghost Fest'] },
          { label: '🏛 歷史與宗教',       ids: ['Showa Retro','Byzantine Mosaic','Soviet Constructivism','Taisho Roman','Sacred Stained Glass','Imperial Propaganda'] },
          { label: '🔬 稀有與新趨勢',     ids: ['Glass Block','Brute Force','Bronze Age','Obsidian Black','Prompt Playground','Cyber Hacker','Reality Warp','Trinket Curation','Aerochrome','Modern Kintsugi','Solarpunk','Lunarpunk','Cassette Futurism','Gorpcore Topo','Dark Academia','Rococo Opulence','Explorecore','Subspace Wireframe','Botanical Plate','Acid Fade'] },
          { label: '📸 經典數位相機與CCD', ids: ['Canon IXUS CCD','Canon A620 CCD','Nikon S200 CCD','Leica CCD','CCD Negative Film','DV Camcorder','Polaroid Instant Film','Fujifilm Superia','Kodak Portra 400','135mm Analog Film'] },
          { label: '🔭 光學硬體與AI氛圍', ids: ['Fuji Direct Flash','Telephoto Compression','DSLR 50mm','Commercial Portrait','DJI Pocket Vlog','Golden Hour Backlight','Blue Hour Twilight','Japanese Airy High Key','Ocean Cool Tone','German Lens Muted Green','Ricoh GR Street','Ricoh Positive Film','Fujifilm X-T','Hasselblad Medium Format','Olympus Zuiko Blue','Fujifilm FinePix Retro','Canon High End Compact','Apple iPhone XS HDR','Polaroid Digital Print','Olympus XZ1 CCD','Fujifilm Panorama','Olympus Film SLR'] },
        ];
        const styleById = Object.fromEntries(STYLE_PRESETS.map(s => [s.id, s]));
        return (
          <div
            className="fixed z-50 bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-white/50 w-[440px] h-[560px] flex flex-col overflow-hidden"
            style={{ left: styleLibPos.x, top: styleLibPos.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`px-4 py-3 border-b border-black/5 flex justify-between items-center bg-white/50 flex-shrink-0 select-none ${styleLibDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              onMouseDown={(e) => {
                e.preventDefault();
                styleLibDragOffRef.current = { x: e.clientX - styleLibPos.x, y: e.clientY - styleLibPos.y };
                setStyleLibDragging(true);
              }}
            >
              <h3 className="font-bold text-[#1D1D1F]">Magic Style 藝術風格庫 <span className="text-xs font-normal text-[#86868B] ml-1">{STYLE_PRESETS.length} 種</span></h3>
              <button onMouseDown={(e) => e.stopPropagation()} onClick={() => setShowStyleLibrary(false)} className="text-[#86868B] hover:text-[#1D1D1F] text-lg leading-none">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {STYLE_CATEGORIES.map(cat => (
                <div key={cat.label}>
                  {/* 分類標題 */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-bold text-[#86868B] tracking-wide uppercase whitespace-nowrap">{cat.label}</span>
                    <div className="flex-1 h-px bg-black/6" />
                  </div>
                  {/* 風格格子 */}
                  <div className="grid grid-cols-2 gap-2">
                    {cat.ids.map(id => {
                      const style = styleById[id];
                      if (!style) return null;
                      return (
                        <button
                          key={style.id}
                          onClick={() => handlePasteStyle(selectedElementIds, style.label)}
                          disabled={selectedElementIds.length === 0}
                          className="group flex flex-col gap-0.5 px-3 py-2.5 rounded-xl border border-black/5 hover:bg-black hover:border-black transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <span className="text-[10px] font-semibold text-[#86868B] group-hover:text-white/60 leading-tight">{style.label}</span>
                          <span className="text-[13px] font-bold text-[#1D1D1F] group-hover:text-white leading-tight">{style.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-black/5 bg-gray-50 text-xs text-[#86868B] flex-shrink-0">
              {selectedElementIds.length > 0 ? `已選取 ${selectedElementIds.length} 個物件` : '請先選取圖片以應用風格'}
            </div>
          </div>
        );
      })()}

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
        onHarmonize={handleHarmonize}
        isGenerating={isGenerating}
        generatingElementIds={generatingElementIds}
        croppingElementId={croppingElementId}
        onCancelCrop={handleCancelCrop}
        onApplyCrop={handleApplyCrop}
        interactionMode={interactionMode}
        activeShapeTool={activeShapeTool}
        onUpscale={handleAIUpscale}
        onDragStart={() => setIsDraggingOnCanvas(true)}
        onDragEnd={() => setIsDraggingOnCanvas(false)}
      />

      {!isFocusMode && !semanticEditorTarget && (
        <DraggableToolbar
            selectedElement={elements.find(e => e.id === selectedElementIds[0])}
            onAddNote={() => addNote()}
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
            onSelect={(id, shiftKey) => {
                if (!shiftKey && selectedElementIds.includes(id)) {
                    // ✅ 修改：已選取 + 無 Shift = 從清單移除（圖層面板單獨取消選取）
                    const newIds = selectedElementIds.filter(sid => sid !== id);
                    setSelectedElementIds(newIds);
                } else {
                    handleSelectElement(id, shiftKey);
                }
            }}
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
            onExportMultiple={(ids) => {
                const artboardsToExport = ids
                    .map(id => elements.find(el => el.id === id))
                    .filter((el): el is ArtboardElement => el?.type === 'artboard')
                    .sort((a, b) => b.zIndex - a.zIndex);
                downloadMultipleArtboards(artboardsToExport, elements);
            }}
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
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center p-6"
          style={{ background: 'rgba(240,240,245,0.82)', backdropFilter: 'blur(12px)' }}
          onClick={() => setGeneratedImages(null)}
        >
          <div
            className="relative flex flex-col"
            style={{
              background: '#ffffff',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 32px 64px -16px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.08)',
              borderRadius: '24px',
              padding: '2rem',
              width: '100%',
              maxWidth: generatedImages.length === 1 ? 'min(80vw, 640px)' : '820px',
              maxHeight: '90vh',
              animation: 'resultModalPop 0.35s cubic-bezier(0.16,1,0.3,1) forwards',
            }}
            onClick={e => e.stopPropagation()}
          >
            <style>{`
              @keyframes resultModalPop {
                from { opacity: 0; transform: scale(0.95) translateY(12px); }
                to   { opacity: 1; transform: scale(1)    translateY(0);    }
              }
              .result-img-card .card-action-overlay { opacity: 0; }
              .result-img-card:hover .card-action-overlay { opacity: 1; }
              .result-img-card .card-action-btns { opacity: 0; transform: translateY(12px); transition: opacity 0.25s ease, transform 0.25s ease; }
              .result-img-card:hover .card-action-btns { opacity: 1; transform: translateY(0); }
              .result-close-btn { transition: background 0.2s ease, transform 0.25s ease; }
              .result-close-btn:hover { transform: rotate(90deg); background: #e5e5ea !important; }
            `}</style>

            {/* 標題列 */}
            <div className="flex items-start justify-between mb-5 pr-10">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-[#1D1D1F] tracking-tight">生成結果</h2>
                  <span className="text-[10px] font-normal text-[#86868B] border border-black/10 px-1.5 py-px rounded">{generatedImages.length} 張</span>
                </div>
                <p className="text-[11px] text-[#86868B] mt-0.5">選擇要加入畫布或下載的圖片</p>
              </div>
            </div>

            {/* 關閉按鈕 */}
            <button
              onClick={() => setGeneratedImages(null)}
              className="result-close-btn absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] border border-black/8"
              style={{ background: '#F5F5F7' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            {/* 圖片區域 */}
            <div className={`overflow-y-auto ${generatedImages.length > 1 ? 'grid grid-cols-2 gap-4 items-start' : ''}`}>
              {generatedImages.map((imgSrc, index) => (
                <div
                  key={index}
                  className="result-img-card relative overflow-hidden bg-[#F0F0F0]"
                  style={{
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                    borderRadius: '12px',
                  }}
                >
                  <img
                    src={imgSrc}
                    alt={`Generated ${index + 1}`}
                    className="w-full block"
                    style={{ height: 'auto', maxHeight: generatedImages.length === 1 ? '62vh' : '45vh', objectFit: 'contain', display: 'block' }}
                    referrerPolicy="no-referrer"
                  />
                  {/* 懸停漸層遮罩 */}
                  <div
                    className="card-action-overlay absolute inset-0 flex flex-col justify-end p-4"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)', transition: 'opacity 0.3s ease' }}
                  >
                    <div className="card-action-btns flex flex-col gap-2">
                      <button
                        onClick={() => addGeneratedImageToCanvas(imgSrc)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-white text-black hover:bg-gray-100 active:scale-[0.98] transition-all"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        新增至畫布
                      </button>
                      <button
                        onClick={() => downloadGeneratedImage(imgSrc)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white active:scale-[0.98] transition-all"
                        style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(4px)' }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        下載
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 底部提示 */}
            <p className="text-center text-[11px] text-[#AEAEB2] mt-5">點擊視窗外部區域可關閉</p>
          </div>
        </div>
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
            magicLayer: handleMagicLayer,
            semanticEditor: handleOpenSemanticEditor,
            ocrConvert: handleOCRConvert,
            clearStorage: () => setShowClearConfirm(true),
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
        />
      )}

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

      {isDraggingOver && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(175,82,222,0.08) 0%, rgba(88,86,214,0.06) 40%, rgba(255,255,255,0.55) 100%)', backdropFilter: 'blur(12px)' }}>
          {/* 邊框光暈 */}
          <div className="absolute inset-4 rounded-[2rem] pointer-events-none"
            style={{ border: '1.5px dashed rgba(175,82,222,0.35)', boxShadow: 'inset 0 0 60px rgba(175,82,222,0.06)' }} />
          {/* 中央卡片 */}
          <div className="flex flex-col items-center gap-3 px-11 py-8 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.82)',
              boxShadow: '0 24px 64px rgba(88,86,214,0.12), 0 4px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
              border: '1px solid rgba(175,82,222,0.18)',
              backdropFilter: 'blur(20px)',
            }}>
            {/* 圖示 */}
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #AF52DE 0%, #5856D6 100%)', boxShadow: '0 6px 18px rgba(88,86,214,0.28)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3" ry="3"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
            <p className="text-[#1D1D1F] font-semibold text-lg tracking-tight leading-tight">釋放以新增圖片</p>
            <p className="text-[#86868B] text-xs tracking-wide">支援 PNG・JPG・WEBP・GIF</p>
          </div>
        </div>
      )}
    </main>

    {/* ── Semantic Editor（全螢幕 overlay）── */}
    {semanticEditorTarget && (
      <SemanticEditorView
        originalBase64={semanticEditorTarget.src}
        imageName={semanticEditorTarget.name}
        onClose={handleCloseSemanticEditor}
        initialState={savedSemanticStates[semanticStateKey(semanticEditorTarget.src)]}
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
            zIndex:   elements.length + 1,
            isVisible: true,
            isLocked:  false,
            groupId:   null,
            opacity:   1,
          };
          setElements(prev => [...prev, newEl]);
          cacheImage(newId, compositeBase64);

          // 儲存當前編輯狀態（不關閉，讓使用者繼續作業）
          if (currentState && semanticEditorTarget) {
            const key = semanticStateKey(semanticEditorTarget.src);
            setSavedSemanticStates(prev => ({ ...prev, [key]: currentState }));
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
              zIndex:   origEl.zIndex + i + 1,
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
      />
    )}
    </>
  );
};

export default App;
