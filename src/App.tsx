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
import { ArtboardPanel, downloadArtboard, downloadMultipleArtboards } from './features/artboard';
import { useCanvas } from './hooks/useCanvas';
import { useAI } from './hooks/useAI';
import { STYLE_PRESETS, COLORS, isCJK, wrapTextCanvas, loadImage, createShapeDataUrl, restoreOriginalAlpha, getClosestAspectRatio, measureTextVisualBounds, renderImageElementToDataUrl } from './utils/helpers';
import { drawTextOnCanvas } from './utils/textCanvas'; // ✅ 新增
import { captureTextElementAsImage } from './utils/svgCapture'; // ✅ 彎曲文字轉圖片用
import { analyzeImagePrompt } from './utils/ImageAnalysisService';
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
}: {
    onSubmit: (key: string) => void;
    onClose: () => void;
    atlasKey?: string;
    onSubmitAtlas?: (key: string) => void;
}) => {
    const [key, setKey] = useState('');
    const [atlasKey, setAtlasKey] = useState(initialAtlasKey || '');

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

                        <button
                            onClick={() => {
                                if (key) onSubmit(key);
                                if (atlasKey && onSubmitAtlas) onSubmitAtlas(atlasKey);
                                if (key || atlasKey) onClose();
                            }}
                            disabled={!key && !atlasKey}
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
      handleMergeLayers: originalMergeLayers, 
      handleStartCrop,
      handleCancelCrop,
      handleApplyCrop,
      handleToggleVisibility,
      handleToggleLock,
      handleRename,
      handleLayerDragDrop,
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
      storageStatus,
      clearStorage,
  } = useCanvas(showToast);

  const [isDraggingOnCanvas, setIsDraggingOnCanvas] = useState(false);
  // --- AI State Hooks ---
  const {
      isGenerating,
      setIsGenerating,
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
  });

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
              y: enPos.y + 240 // 220 height + 20 gap
          };

          const newNotes: CanvasElement[] = [];

          // Add Yellow Note (EN)
          zIndexCounter.current += 1;
          const enNote: NoteElement = {
              id: `${Date.now()}-note-en`,
              type: 'note',
              position: enPos,
              width: 280,
              height: 220,
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
              width: 280,
              height: 220,
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
      }
  }, [elements, effectiveApiKey, setElements, showToast, zIndexCounter]);

  // --- Callback for Floating Assistant Sticky Note Creation ---
  const handleAiCreateSticky = useCallback((text: string) => {
      const center = getCenterOfViewport();
      // Offset slightly so it doesn't appear exactly in center if there are other things
      const pos = { x: center.x + 60, y: center.y - 60 };
      
      addElement({
          type: 'note',
          position: pos,
          width: 280,
          height: 220,
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

  const isFocusMode = !!editingImage || !!editingDrawing;

  const handleInteractionEnd = useCallback(() => {
    setElements(prev => prev, { addToHistory: true });
  }, [setElements]);

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

  const addGeneratedImageToCanvas = useCallback((imageUrl: string) => {
    if (!imageUrl) return;
    const src = imageUrl;
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      const MAX_DIMENSION = 400;
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) { height = (height / width) * MAX_DIMENSION; width = MAX_DIMENSION; }
        else { width = (width / height) * MAX_DIMENSION; height = MAX_DIMENSION; }
      }
      addElement({ type: 'image', position: getCenterOfViewport(), src, width, height, rotation: 0, });
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
    setElements(prev => prev.filter(el => !selectedSet.has(el.id) || el.isLocked));
    setSelectedElementIds([]);
  }, [selectedElementIds, setElements, setSelectedElementIds]);

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

  const triggerImportCanvas = () => {
      if (importInputRef.current) {
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
  }, [deleteElement, undo, redo, editingDrawing, editingImage, outpaintingState, copySelection, pasteSelection, duplicateSelection, handleGroup, handleUngroup, activeShapeTool, creatingShapeId, setElements, handleCancelOutpainting]);
  
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

      <FloatingAssistant onCreateSticky={handleAiCreateSticky} onAskAI={handleAskAI} />

      {showKeyModal && (
          <ApiKeyModal
              onSubmit={handleSaveManualKey}
              onClose={() => setShowKeyModal(false)}
              atlasKey={atlasApiKey || ''}
              onSubmitAtlas={handleSaveAtlasKey}
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

      {showStyleLibrary && (
        <div 
            className="fixed z-50 bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-white/50 w-[400px] h-[500px] flex flex-col overflow-hidden"
            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="p-4 border-b border-black/5 flex justify-between items-center bg-white/50">
                <h3 className="font-bold text-[#1D1D1F]">Magic Style 藝術風格庫</h3>
                <button onClick={() => setShowStyleLibrary(false)} className="text-[#86868B] hover:text-[#1D1D1F]">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3">
                {STYLE_PRESETS.map((style) => (
                    <button
                        key={style.id}
                        onClick={() => handlePasteStyle(selectedElementIds, style.label)}
                        disabled={selectedElementIds.length === 0}
                        className="group flex flex-col gap-1 p-3 rounded-xl border border-black/5 hover:bg-black hover:border-black transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <span className="text-xs font-semibold text-[#86868B] group-hover:text-white/60">{style.label}</span>
                        <span className="text-sm font-bold text-[#1D1D1F] group-hover:text-white">{style.name}</span>
                    </button>
                ))}
            </div>
             <div className="p-4 border-t border-black/5 bg-gray-50 text-xs text-[#86868B]">
                {selectedElementIds.length > 0 ? `已選取 ${selectedElementIds.length} 個物件` : "請先選取圖片以應用風格"}
            </div>
        </div>
      )}

      <InfiniteCanvas 
        ref={canvasApiRef}
        elements={elements} 
        selectedElementIds={isFocusMode ? [] : selectedElementIds}
        onSelectElement={handleSelectElement}
        onMarqueeSelect={handleMarqueeSelect}
        onUpdateElement={updateElements}
        onInteractionEnd={handleInteractionEnd}
        setResetViewCallback={getResetViewCallback} 
        onGenerate={handleGenerate}
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
        outpaintingState={outpaintingState}
        onUpdateOutpaintingFrame={handleUpdateOutpaintingFrame}
        onCancelOutpainting={handleCancelOutpainting}
        onOutpaintingGenerate={handleOutpaintingGenerate}
        onAutoPromptGenerate={handleAutoPromptGenerate}
        stylePresets={STYLE_PRESETS}
        onCameraAngle={handleCameraAngle}
        onRemoveBackground={handleRemoveBackground}
        onHarmonize={handleHarmonize}
        isGenerating={isGenerating}
        croppingElementId={croppingElementId}
        onCancelCrop={handleCancelCrop}
        onApplyCrop={handleApplyCrop}
        interactionMode={interactionMode}
        activeShapeTool={activeShapeTool}
        onUpscale={handleAIUpscale}
        onDragStart={() => setIsDraggingOnCanvas(true)}
        onDragEnd={() => setIsDraggingOnCanvas(false)}
      />

      {!isFocusMode && (
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
            isProcessing={isGenerating}
            onCrop={handleStartCrop}
            canCrop={selectedElementIds.length === 1 && elements.find(e => e.id === selectedElementIds[0])?.type === 'image'}
            interactionMode={interactionMode}
            onSetInteractionMode={setInteractionMode}
            onSelectShapeTool={handleSelectShapeTool}
            onExportCanvas={handleExportCanvas}
            onImportCanvas={triggerImportCanvas}
            onAddArtboard={(preset) => addArtboard(preset, getCenterOfViewport())}
            generationModel={generationModel}
            onSetGenerationModel={handleSetGenerationModel}
            hasAtlasKey={!!atlasApiKey}
        />
      )}
      
      {!isFocusMode && (
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
            onReorder={handleLayerDragDrop}
            onRename={handleRename}
            onGroup={handleGroup}
            onUngroup={handleUngroup}
            onDelete={handleDeleteLayer}
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

      {!isFocusMode && artboardForPanel && (
          <ArtboardPanel
              element={artboardForPanel}
              onUpdate={(updates) => setElements(prev => prev.map(el =>
                  el.id === artboardForPanel.id ? { ...el, ...updates } : el
              ))}
              onExport={() => downloadArtboard(artboardForPanel, elements)}
              onClose={() => setSelectedElementIds([])}
          />
      )}

      {isGenerating && (
        <div className="fixed inset-0 z-[2001] bg-white/40 backdrop-blur-md flex flex-col items-center justify-center text-[#1D1D1F]">
            <div className="p-8 bg-white rounded-3xl shadow-2xl flex flex-col items-center animate-pulse">
                <svg className="animate-spin h-10 w-10 text-black mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-lg font-semibold tracking-tight">AI 正在運算中...</p>
                <p className="text-sm text-[#86868B] mt-1">正在雲端進行處理，請稍候。</p>
            </div>
        </div>
      )}

      {generatedImages && generatedImages.length > 0 && (
        <div className="fixed inset-0 z-[2000] bg-[#F5F5F7]/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setGeneratedImages(null)}>
          <div className="bg-white rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] border border-black/5 p-8 max-w-5xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
              <h2 className="text-2xl font-bold text-[#1D1D1F]">生成結果</h2>
              <button onClick={() => setGeneratedImages(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-[#F5F5F7] text-[#86868B] hover:bg-[#E5E5E5] hover:text-black transition-colors" title="關閉">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto p-1">
              {generatedImages.map((imgSrc, index) => (
                <div key={index} className="group relative rounded-2xl overflow-hidden bg-[#F5F5F7] border border-black/5">
                  <div className="flex items-center justify-center aspect-square p-4">
                     <img
                       src={imgSrc}
                       alt={`Generated by AI ${index + 1}`}
                       className="w-full h-full object-contain shadow-sm"
                       referrerPolicy="no-referrer"
                     />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-black/5 flex justify-center gap-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <button onClick={() => addGeneratedImageToCanvas(imgSrc)} className="px-4 py-2 text-sm font-medium bg-black text-white rounded-full hover:bg-gray-800 shadow-lg transition-all">新增至畫布</button>
                    <button onClick={() => downloadGeneratedImage(imgSrc)} className="px-4 py-2 text-sm font-medium bg-white text-[#1D1D1F] border border-black/10 rounded-full hover:bg-[#F5F5F7] transition-all">下載</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3 flex-shrink-0">
              <button onClick={() => setGeneratedImages(null)} className="px-5 py-2.5 text-sm font-medium text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-full transition-all">關閉</button>
            </div>
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
            copyStyle: handleCopyStyle,
            pasteStyle: (elementIds: string[]) => setStylePasteModal({ targetIds: elementIds }),
            exportCanvas: handleExportCanvas,
            exportArtboard: (elementId: string) => {
                const artboard = elements.find(e => e.id === elementId) as ArtboardElement;
                if (artboard) downloadArtboard(artboard, elements);
            },
            importCanvas: triggerImportCanvas,
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
            extractPrompt: handleExtractPrompt
          }}
          canChangeColor={canChangeColor}
          elementType={contextMenuElement?.type || null}
          hasCopiedStyle={!!copiedStyle}
          selectionCount={selectedElementIds.length}
          isGrouped={!!isGrouped}
          isLocked={isLocked}
          isVisible={isVisible}
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
        <div className="absolute inset-0 z-[100] bg-white/60 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="text-[#1D1D1F] text-3xl font-bold p-12 border-4 border-dashed border-[#1D1D1F]/20 rounded-3xl bg-white/80 shadow-2xl">
            釋放以新增圖片
          </div>
        </div>
      )}
    </main>
  );
};

export default App;
