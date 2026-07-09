
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import type { ImageElement, Point } from '../types';
import { callGeminiWithRetry, analyzeDominantColor, loadImage } from '../utils/helpers';
import { Icon } from './Icon';
import { rgbToHsl, hslToRgb, compositeImagesPixelPerfect, createPrefilledImage } from '../utils/imageProcessing';
import { callAtlasInpaint } from '../utils/atlasImage';
import { getModelStatus } from '../utils/onnxModelCache';
import { runLamaInWorker, warmUpLamaWorker, getLamaBackend } from '../utils/lamaWorkerClient';
import { runUpscaleInWorker } from '../utils/upscaleWorkerClient';
import { runMiGanInWorker, warmUpMiGanWorker, getMiGanBackend } from '../utils/miGanWorkerClient';
import { BRUSH_SIZES, defaultAdjustments, EditIcons, MASK_COLOR, MAX_REFERENCE_IMAGES, MAX_ZOOM, MIN_ZOOM, removeModelOptions, type ImageAdjustments } from './ImageEditModal/constants';
import { drawEllipseFromDrag, useDebounce } from './ImageEditModal/helpers';
import { AdjustmentSlider } from './ImageEditModal/AdjustmentSlider';
import { CollapsibleSection } from './ImageEditModal/CollapsibleSection';

interface ImageEditModalProps {
  element: ImageElement;
  onSave: (elementId: string, dataUrl: string, originalElement?: ImageElement, metadata?: any) => void;
  onClose: () => void;
  apiKey: string | null;
  imageModel?: string;
  atlasKey?: string | null;
  canvasImages?: { id: string; src: string; name?: string }[];
}

interface GenerationContext {
  baseImageSrc: string;
  maskDataUrl: string;
  prompt: string;
  type: 'remove' | 'edit';
}

export const ImageEditModal: React.FC<ImageEditModalProps> = ({ element, onSave, onClose, apiKey, imageModel = 'gemini-3.1-flash-image-preview', atlasKey, canvasImages = [] }) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const strokePointsRef = useRef<Point[]>([]);

  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [tool, setTool] = useState<'brush' | 'eraser' | 'hand'>('hand');

  // ── 手動像素修復狀態 ──────────────────────────────────────────
  const [editMode, setEditMode] = useState<'ai' | 'pixel'>('ai');
  const [paintColor, setPaintColor] = useState<string>('#000000');
  const [paintTool, setPaintTool] = useState<'brush' | 'eraser' | 'rect' | 'circle' | 'picker' | 'hand'>('hand');
  const [paintSize, setPaintSize] = useState<number>(24);
  const [paintHardness, setPaintHardness] = useState<number>(80);
  // 矩形/圓形色塊專屬設定（色塊不吃筆刷大小；用實心/邊框/透明度/羽化）
  const [shapeFill, setShapeFill] = useState<boolean>(true);
  const [shapeStroke, setShapeStroke] = useState<boolean>(false);
  const [shapeOpacity, setShapeOpacity] = useState<number>(100);
  const [shapeFeather, setShapeFeather] = useState<number>(0);
  // 筆刷/橡皮擦的大小預覽游標圈（直接操作 DOM，避免 mousemove 每幀 re-render）
  const brushCursorRef = useRef<HTMLDivElement>(null);
  const [pixelHistory, setPixelHistory] = useState<ImageData[]>([]);
  const [pixelHistoryIndex, setPixelHistoryIndex] = useState<number>(-1);
  const [lockSeed, setLockSeed] = useState<boolean>(true);
  const [customSeed, setCustomSeed] = useState<number | ''>((element as any).metadata?.seed ?? '');
  const [generationMetadata, setGenerationMetadata] = useState<{ seed?: number; model?: string; prompt?: string } | null>(null);
  const pixelCanvasRef = useRef<HTMLCanvasElement>(null);
  // 手動模式下 <img ref={imageRef}> 已 unmount（imageRef.current = null），
  // 外層容器尺寸必須改用這份 state，否則會 fallback 到 800×600 → 圖被壓縮 + 筆刷座標錯位
  const [pixelCanvasDims, setPixelCanvasDims] = useState<{ w: number; h: number } | null>(null);
  const [pixelRectDrag, setPixelRectDrag] = useState<{
    startX: number; startY: number;
    curX: number; curY: number;
    active: boolean;
  } | null>(null);
  const pixelStrokePointsRef = useRef<Point[]>([]);
  const pixelDrawingRef = useRef<boolean>(false);
  const colorInputRef = useRef<HTMLInputElement>(null);
  
  const [currentImageSrc, setCurrentImageSrc] = useState(element.src);
  const [previewImageSrc, setPreviewImageSrc] = useState<string | null>(null);
  const [adjustedPreviewSrc, setAdjustedPreviewSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBaking, setIsBaking] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [pendingAction, setPendingAction] = useState<'edit' | 'remove' | null>(null);
  const [isMaskVisible, setIsMaskVisible] = useState(true);
  const [showOriginalComparison, setShowOriginalComparison] = useState(false);
  
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacebarPressed, setIsSpacebarPressed] = useState(false);
  const panStartRef = useRef<Point>({ x: 0, y: 0 });
  const [editorSetupKey, setEditorSetupKey] = useState(0);
  const [generationContext, setGenerationContext] = useState<GenerationContext | null>(null);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(defaultAdjustments);

  // Reference images (max 3)
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [showCanvasPicker, setShowCanvasPicker] = useState(false);
  const refFileInputRef = useRef<HTMLInputElement>(null);

  // Inpaint engine selector
  const canSwitchEngine = !!(atlasKey || apiKey);
  const [inpaintEngine, setInpaintEngine] = useState<'gpt' | 'gemini'>(atlasKey ? 'gpt' : 'gemini');
  const [lamaReady, setLamaReady] = useState(false);
  const [lamaBackend, setLamaBackend] = useState<'webgpu' | 'wasm' | null>(null);
  const [miGanReady, setMiGanReady] = useState(false);
  const [miGanBackend, setMiGanBackend] = useState<'webgpu' | 'wasm' | null>(null);
  const [removeModel, setRemoveModel] = useState<'cloud' | 'lama' | 'mi_gan'>('cloud');
  const [removeDropdownOpen, setRemoveDropdownOpen] = useState(false);

  useEffect(() => {
    // 檢查 LaMa
    getModelStatus('lama').then(s => {
      const ready = s === 'ready';
      setLamaReady(ready);
      if (ready) {
        // 預載 session（WebGPU 偵測 + 模型初始化）
        warmUpLamaWorker()
          .then(backend => setLamaBackend(backend))
          .catch(() => { /* 預載失敗不影響手動觸發 */ });
      }
    });

    // 檢查 MI-GAN
    getModelStatus('mi_gan').then(s => {
      const ready = s === 'ready';
      setMiGanReady(ready);
      if (ready) {
        warmUpMiGanWorker()
          .then(backend => setMiGanBackend(backend))
          .catch(() => { /* 預載失敗不影響手動觸發 */ });
      }
    });
  }, []);

  const saveMaskState = useCallback(() => {
    const maskCtx = maskCanvasRef.current?.getContext('2d');
    if (!maskCtx) return;
    const imageData = maskCtx.getImageData(0, 0, maskCtx.canvas.width, maskCtx.canvas.height);
    
    setHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1);
        return [...newHistory, imageData];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  
  const clearMask = useCallback(() => {
      const canvas = maskCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          saveMaskState();
      }
  }, [saveMaskState]);
  
  const resetView = useCallback(() => {
    const image = imageRef.current;
    const container = containerRef.current;
    if (!image || !image.naturalWidth) return;

    const style = window.getComputedStyle(container);
    const paddingLeft = parseFloat(style.paddingLeft);
    const paddingRight = parseFloat(style.paddingRight);
    const paddingTop = parseFloat(style.paddingTop);
    const paddingBottom = parseFloat(style.paddingBottom);

    const containerWidth = container.clientWidth - paddingLeft - paddingRight;
    const containerHeight = container.clientHeight - paddingTop - paddingBottom;
    
    const zoomX = containerWidth / image.naturalWidth;
    const zoomY = containerHeight / image.naturalHeight;
    const newZoom = Math.min(zoomX, zoomY, 1) * 0.95; 

    setZoom(newZoom);
    
    const newPanX = (containerWidth - image.naturalWidth * newZoom) / 2;
    const newPanY = (containerHeight - image.naturalHeight * newZoom) / 2;
    setPan({ x: newPanX, y: newPanY });
  }, []);

  useEffect(() => {
    const maskCanvas = maskCanvasRef.current;
    const image = imageRef.current;
    if (!maskCanvas || !image) return;

    const setupCanvas = () => {
        if (image.naturalWidth > 0 && image.naturalHeight > 0) {
            maskCanvas.width = image.naturalWidth;
            maskCanvas.height = image.naturalHeight;
            const ctx = maskCanvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
                const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
                setHistory([imageData]);
                setHistoryIndex(0);
            }
            resetView();
        }
    };
    
    if (image.complete) {
        setupCanvas();
    } else {
        image.onload = setupCanvas;
    }
    
    window.addEventListener('resize', resetView);
    return () => window.removeEventListener('resize', resetView);
  }, [currentImageSrc, resetView, editorSetupKey, imageRef.current]);

  const undo = useCallback(() => {
    if (canUndo) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        const maskCtx = maskCanvasRef.current?.getContext('2d');
        if (maskCtx && history[newIndex]) {
            maskCtx.putImageData(history[newIndex], 0, 0);
        }
    }
  }, [canUndo, history, historyIndex]);

  const redo = useCallback(() => {
    if (canRedo) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        const maskCtx = maskCanvasRef.current?.getContext('2d');
        if (maskCtx && history[newIndex]) {
            maskCtx.putImageData(history[newIndex], 0, 0);
        }
    }
  }, [canRedo, history, historyIndex]);

  // ── 手動像素修復核心函數 ──────────────────────────────────────
  const hexToRgba = useCallback((hex: string, alpha: number): string => {
    let r = 0, g = 0, b = 0;
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      r = parseInt(cleanHex[0] + cleanHex[0], 16);
      g = parseInt(cleanHex[1] + cleanHex[1], 16);
      b = parseInt(cleanHex[2] + cleanHex[2], 16);
    } else if (cleanHex.length >= 6) {
      r = parseInt(cleanHex.substring(0, 2), 16);
      g = parseInt(cleanHex.substring(2, 4), 16);
      b = parseInt(cleanHex.substring(4, 6), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }, []);

  const getTransparentColor = useCallback((color: string): string => {
    if (color.startsWith('#')) {
      return hexToRgba(color, 0);
    }
    if (color.startsWith('rgba')) {
      return color.replace(/[^,]+(?=\s*\)$)/, '0');
    }
    if (color.startsWith('rgb')) {
      return color.replace('rgb', 'rgba').replace(')', ', 0)');
    }
    return 'rgba(0,0,0,0)';
  }, [hexToRgba]);

  const triggerEyeDropper = useCallback(async () => {
    if ('EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result.sRGBHex) {
          setPaintColor(result.sRGBHex);
        }
      } catch (e) {
        console.warn('EyeDropper 失敗或取消:', e);
      }
    } else {
      setPaintTool('picker');
    }
  }, []);

  const savePixelState = useCallback(() => {
    const canvas = pixelCanvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!ctx || !canvas) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setPixelHistory(prev => {
      const newHistory = prev.slice(0, pixelHistoryIndex + 1);
      return [...newHistory, imageData];
    });
    setPixelHistoryIndex(prev => prev + 1);
  }, [pixelHistoryIndex]);

  const canPixelUndo = pixelHistoryIndex > 0;
  const canPixelRedo = pixelHistoryIndex < pixelHistory.length - 1;

  const pixelUndo = useCallback(() => {
    if (canPixelUndo) {
      const newIndex = pixelHistoryIndex - 1;
      setPixelHistoryIndex(newIndex);
      const ctx = pixelCanvasRef.current?.getContext('2d');
      if (ctx && pixelHistory[newIndex]) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.putImageData(pixelHistory[newIndex], 0, 0);
      }
    }
  }, [canPixelUndo, pixelHistory, pixelHistoryIndex]);

  const pixelRedo = useCallback(() => {
    if (canPixelRedo) {
      const newIndex = pixelHistoryIndex + 1;
      setPixelHistoryIndex(newIndex);
      const ctx = pixelCanvasRef.current?.getContext('2d');
      if (ctx && pixelHistory[newIndex]) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.putImageData(pixelHistory[newIndex], 0, 0);
      }
    }
  }, [canPixelRedo, pixelHistory, pixelHistoryIndex]);

  const initPixelCanvas = useCallback(async () => {
    const canvas = pixelCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    try {
      const img = await loadImage(currentImageSrc);
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      setPixelCanvasDims({ w: img.naturalWidth, h: img.naturalHeight });
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const firstState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setPixelHistory([firstState]);
      setPixelHistoryIndex(0);
    } catch (e) {
      console.error('初始化像素畫布失敗:', e);
    }
  }, [currentImageSrc]);

  useEffect(() => {
    if (editMode === 'pixel') {
      initPixelCanvas();
    }
  }, [editMode, initPixelCanvas]);

  const handleApplyPixelChanges = useCallback(() => {
    const canvas = pixelCanvasRef.current;
    if (!canvas) return;
    
    const base64 = canvas.toDataURL('image/png');
    setCurrentImageSrc(base64);
    
    setPixelHistory([canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)]);
    setPixelHistoryIndex(0);
    setEditMode('ai');
  }, []);

  const drawSoftCircle = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    hardness: number,
    color: string,
    isEraser: boolean
  ) => {
    ctx.save();
    
    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      const grad = ctx.createRadialGradient(x, y, radius * (hardness / 100), x, y, radius);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      const grad = ctx.createRadialGradient(x, y, radius * (hardness / 100), x, y, radius);
      grad.addColorStop(0, color);
      grad.addColorStop(1, getTransparentColor(color));
      ctx.fillStyle = grad;
    }

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, [getTransparentColor]);

  const drawSoftLine = useCallback((
    ctx: CanvasRenderingContext2D,
    p1: Point,
    p2: Point,
    radius: number,
    hardness: number,
    color: string,
    isEraser: boolean
  ) => {
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const step = Math.max(1, radius * 0.08);
    if (dist === 0) {
      drawSoftCircle(ctx, p1.x, p1.y, radius, hardness, color, isEraser);
      return;
    }
    for (let d = 0; d < dist; d += step) {
      const t = d / dist;
      const x = p1.x + (p2.x - p1.x) * t;
      const y = p1.y + (p2.y - p1.y) * t;
      drawSoftCircle(ctx, x, y, radius, hardness, color, isEraser);
    }
    drawSoftCircle(ctx, p2.x, p2.y, radius, hardness, color, isEraser);
  }, [drawSoftCircle]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        const isEditingText = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

        if (e.code === 'Space' && !isEditingText) {
            e.preventDefault();
            setIsSpacebarPressed(true);
        }
        
        if (isEditingText) {
            return;
        }

        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

        if (isCtrlOrCmd && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                if (editMode === 'pixel') pixelRedo(); else redo();
            } else {
                if (editMode === 'pixel') pixelUndo(); else undo();
            }
        } else if (isCtrlOrCmd && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            if (editMode === 'pixel') pixelRedo(); else redo();
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
            setIsSpacebarPressed(false);
            setIsPanning(false);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [undo, redo, editMode, pixelUndo, pixelRedo]);

  const handlePixelMouseDown = (e: React.MouseEvent) => {
    // previewImageSrc 顯示時 pixel canvas 沒有渲染，不能對隱藏的 canvas 作畫
    if (editMode !== 'pixel' || isLoading || isBaking || previewImageSrc) return;
    
    // 吸色管 fallback
    if (paintTool === 'picker') {
      const point = getCanvasPoint(e);
      if (point) {
        const canvas = pixelCanvasRef.current;
        const ctx = canvas?.getContext('2d', { willReadFrequently: true });
        if (ctx && canvas) {
          const x = Math.max(0, Math.min(canvas.width - 1, Math.round(point.x)));
          const y = Math.max(0, Math.min(canvas.height - 1, Math.round(point.y)));
          const px = ctx.getImageData(x, y, 1, 1).data;
          const hex = '#' + [px[0], px[1], px[2]].map(val => {
            const hexStr = val.toString(16);
            return hexStr.length === 1 ? '0' + hexStr : hexStr;
          }).join('');
          setPaintColor(hex);
          setPaintTool('brush');
        }
      }
      return;
    }

    const isPanStart = e.button === 1 || isSpacebarPressed || (paintTool === 'hand' && e.button === 0);
    if (isPanStart) {
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        return;
    }

    if (e.button !== 0) return;

    const point = getCanvasPoint(e);
    if (!point) return;

    if (paintTool === 'brush' || paintTool === 'eraser') {
      // 只有筆刷/橡皮擦走 stroke 流程；矩形/圓形不能設 pixelDrawingRef，
      // 否則 mouseup 會走進筆刷分支、pixelRectDrag 永遠不清 → 拖曳無法結束一直產生
      pixelDrawingRef.current = true;
      pixelStrokePointsRef.current = [point];
      const canvas = pixelCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        drawSoftCircle(ctx, point.x, point.y, paintSize / 2, paintHardness, paintColor, paintTool === 'eraser');
      }
    } else if (paintTool === 'rect' || paintTool === 'circle') {
      setPixelRectDrag({
        startX: point.x, startY: point.y,
        curX: point.x, curY: point.y,
        active: true
      });
    }
  };

  /**
   * 筆刷/橡皮擦大小游標圈：AI 模式（遮罩筆刷）與手動筆刷模式共用。
   * 直徑 = 該模式當前的筆刷大小 × zoom；直接改 DOM 不觸發 re-render。
   */
  const updateBrushCursor = useCallback((e: React.MouseEvent) => {
    const el = brushCursorRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const activeTool = editMode === 'pixel' ? paintTool : tool;
    const size = editMode === 'pixel' ? paintSize : brushSize;
    const show = !previewImageSrc && !isPanning && !isSpacebarPressed
      && (activeTool === 'brush' || activeTool === 'eraser');

    if (show) {
      const rect = container.getBoundingClientRect();
      const d = size * zoom;
      el.style.display = 'block';
      el.style.width = `${d}px`;
      el.style.height = `${d}px`;
      el.style.left = `${e.clientX - rect.left - d / 2}px`;
      el.style.top = `${e.clientY - rect.top - d / 2}px`;
    } else {
      el.style.display = 'none';
    }
  }, [editMode, paintTool, tool, paintSize, brushSize, zoom, previewImageSrc, isPanning, isSpacebarPressed]);

  const handlePixelMouseMove = (e: React.MouseEvent) => {
    updateBrushCursor(e);

    if (isPanning) {
        setPan({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
        return;
    }
    if (editMode !== 'pixel') return;

    const point = getCanvasPoint(e);
    if (!point) return;

    if ((paintTool === 'brush' || paintTool === 'eraser') && pixelDrawingRef.current) {
      const canvas = pixelCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && pixelStrokePointsRef.current.length > 0) {
        const lastPoint = pixelStrokePointsRef.current[pixelStrokePointsRef.current.length - 1];
        drawSoftLine(ctx, lastPoint, point, paintSize / 2, paintHardness, paintColor, paintTool === 'eraser');
        pixelStrokePointsRef.current.push(point);
      }
    } else if ((paintTool === 'rect' || paintTool === 'circle') && pixelRectDrag?.active) {
      setPixelRectDrag(prev => prev ? { ...prev, curX: point.x, curY: point.y } : null);
      
      const canvas = pixelCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx && pixelHistory[pixelHistoryIndex]) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(pixelHistory[pixelHistoryIndex], 0, 0);

        // 預覽依實心/邊框/透明度設定畫（羽化只在放開時套用，避免每幀 blur 卡頓）
        ctx.save();
        ctx.globalAlpha = shapeOpacity / 100;
        ctx.strokeStyle = paintColor;
        ctx.lineWidth = Math.max(1, 2 / zoom);
        ctx.setLineDash([6 / zoom, 4 / zoom]);
        ctx.fillStyle = hexToRgba(paintColor, 0.5);

        const drag = pixelRectDrag;
        const startX = drag.startX;
        const startY = drag.startY;
        const curX = point.x;
        const curY = point.y;

        ctx.beginPath();
        if (paintTool === 'rect') {
          const x = Math.min(startX, curX);
          const y = Math.min(startY, curY);
          const w = Math.abs(curX - startX);
          const h = Math.abs(curY - startY);
          ctx.rect(x, y, w, h);
        } else if (paintTool === 'circle') {
          // 自由橢圓：拖曳框的寬高各自決定橢圓半徑；按住 Shift 鎖定正圓（設計軟體慣例）
          drawEllipseFromDrag(ctx, startX, startY, curX, curY, e.shiftKey);
        }
        if (shapeFill) ctx.fill();
        ctx.stroke(); // 虛線外框永遠顯示，當拖曳範圍指示
        ctx.restore();
      }
    }
  };

  const handlePixelMouseUp = (e: React.MouseEvent) => {
    setIsPanning(false);
    // 滑鼠離開容器時（onMouseLeave 也走這裡）收掉游標圈，下次 mousemove 會再顯示
    if (e.type === 'mouseleave' && brushCursorRef.current) {
      brushCursorRef.current.style.display = 'none';
    }
    if (editMode !== 'pixel') return;

    if (pixelDrawingRef.current) {
      pixelDrawingRef.current = false;
      pixelStrokePointsRef.current = [];
      savePixelState();
    } else if (pixelRectDrag?.active) {
      const point = getCanvasPoint(e) || { x: pixelRectDrag.curX, y: pixelRectDrag.curY };
      setPixelRectDrag(null);

      const canvas = pixelCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx && pixelHistory[pixelHistoryIndex]) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(pixelHistory[pixelHistoryIndex], 0, 0);

        ctx.save();
        ctx.globalAlpha = shapeOpacity / 100;
        if (shapeFeather > 0) ctx.filter = `blur(${shapeFeather}px)`; // 邊緣羽化
        ctx.fillStyle = paintColor;
        ctx.strokeStyle = paintColor;
        ctx.lineWidth = 3;

        const drag = pixelRectDrag;
        const startX = drag.startX;
        const startY = drag.startY;
        const curX = point.x;
        const curY = point.y;

        ctx.beginPath();
        if (paintTool === 'rect') {
          const x = Math.min(startX, curX);
          const y = Math.min(startY, curY);
          const w = Math.abs(curX - startX);
          const h = Math.abs(curY - startY);
          ctx.rect(x, y, w, h);
        } else if (paintTool === 'circle') {
          drawEllipseFromDrag(ctx, startX, startY, curX, curY, e.shiftKey);
        }
        if (shapeFill) ctx.fill();
        if (shapeStroke) ctx.stroke();
        ctx.restore();
        savePixelState();
      }
    }
  };

  const getCanvasPoint = useCallback((e: React.MouseEvent): Point | null => {
    const container = containerRef.current;
    if (!container) return null;

    const rect = container.getBoundingClientRect();
    const style = window.getComputedStyle(container);
    const paddingLeft = parseFloat(style.paddingLeft);
    const paddingTop = parseFloat(style.paddingTop);
    
    const mouseX = e.clientX - rect.left - paddingLeft;
    const mouseY = e.clientY - rect.top - paddingTop;

    const canvasX = (mouseX - pan.x) / zoom;
    const canvasY = (mouseY - pan.y) / zoom;

    return { x: canvasX, y: canvasY };
  }, [pan, zoom]);

  const startDrawing = (e: React.MouseEvent) => {
    if (previewImageSrc) return;
    
    // Allow panning with middle mouse, spacebar, or hand tool
    const isPanStart = e.button === 1 || isSpacebarPressed || (tool === 'hand' && e.button === 0);

    if (isPanStart) {
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        return;
    }

    if (e.button !== 0) return; // Only left click for drawing

    const point = getCanvasPoint(e);
    if (!point) return;

    if (!isMaskVisible) setIsMaskVisible(true); // Auto show mask when drawing starts
    setIsDrawing(true);
    strokePointsRef.current = [point];
  };

  const finishDrawing = () => {
    setIsPanning(false);
    // 這裡也綁在 onMouseLeave，滑鼠離開容器時順手收掉游標圈
    if (brushCursorRef.current) brushCursorRef.current.style.display = 'none';
    if (isDrawing) {
      setIsDrawing(false);
      strokePointsRef.current = [];
      saveMaskState();
    }
  };

  const draw = (e: React.MouseEvent) => {
    updateBrushCursor(e);
    if (isPanning) {
        setPan({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
        return;
    }
    if (!isDrawing || previewImageSrc) return;
    
    const point = getCanvasPoint(e);
    if (!point) return;
    strokePointsRef.current.push(point);

    const ctx = maskCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (history[historyIndex]) {
        ctx.putImageData(history[historyIndex], 0, 0);
    }

    ctx.globalCompositeOperation = tool === 'brush' ? 'source-over' : 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const strokeColor = tool === 'brush' ? MASK_COLOR : 'rgba(0, 0, 0, 1)';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = brushSize / zoom;
    
    ctx.beginPath();
    ctx.moveTo(strokePointsRef.current[0].x, strokePointsRef.current[0].y);
    for (let i = 1; i < strokePointsRef.current.length; i++) {
        ctx.lineTo(strokePointsRef.current[i].x, strokePointsRef.current[i].y);
    }
    ctx.stroke();
  };
  
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - pan.x) / zoom;
    const worldY = (mouseY - pan.y) / zoom;

    const zoomFactor = 1 - e.deltaY * 0.001;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * zoomFactor));

    const newPanX = mouseX - worldX * newZoom;
    const newPanY = mouseY - worldY * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Zoom logic for slider (Zooms to center of viewport)
  const handleZoomSlider = (newZoom: number) => {
    const container = containerRef.current;
    if (container) {
        const style = window.getComputedStyle(container);
        const paddingLeft = parseFloat(style.paddingLeft) || 0;
        const paddingTop = parseFloat(style.paddingTop) || 0;
        const innerWidth = container.clientWidth - paddingLeft - (parseFloat(style.paddingRight) || 0);
        const innerHeight = container.clientHeight - paddingTop - (parseFloat(style.paddingBottom) || 0);
        
        const centerX = innerWidth / 2;
        const centerY = innerHeight / 2;
        
        const worldX = (centerX - pan.x) / zoom;
        const worldY = (centerY - pan.y) / zoom;
        
        const newPanX = centerX - worldX * newZoom;
        const newPanY = centerY - worldY * newZoom;
        
        setPan({ x: newPanX, y: newPanY });
    }
    setZoom(newZoom);
  };
  
  const createBlackAndWhiteMask = useCallback(async (baseSrc: string, maskDataUrl: string): Promise<string> => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = baseSrc;
    await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
    });

    const maskImage = new Image();
    maskImage.src = maskDataUrl;
    await new Promise((resolve, reject) => {
        maskImage.onload = resolve;
        maskImage.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error("Could not create canvas context");

    // Draw the mask (which is red with some opacity)
    ctx.drawImage(maskImage, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Convert to black and white based on alpha channel
    for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha > 0) {
            // Painted area -> White
            data[i] = 255;     // R
            data[i + 1] = 255; // G
            data[i + 2] = 255; // B
            data[i + 3] = 255; // A
        } else {
            // Unpainted area -> Black
            data[i] = 0;       // R
            data[i + 1] = 0;   // G
            data[i + 2] = 0;   // B
            data[i + 3] = 255; // A
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  }, []);

  const applyAdjustmentsToImage = useCallback(async (baseSrc: string, adjustmentsToApply: ImageAdjustments): Promise<string> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
            const canvas = document.createElement('canvas');
            const width = image.naturalWidth;
            const height = image.naturalHeight;
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return reject(new Error("Could not get canvas context"));

            // 1. Apply simple CSS filters
            ctx.filter = `brightness(${adjustmentsToApply.brightness}%) contrast(${adjustmentsToApply.contrast}%) saturate(${adjustmentsToApply.saturation}%)`;
            ctx.drawImage(image, 0, 0, width, height);
            ctx.filter = 'none';

            const { highlight, shadow, sharpness } = adjustmentsToApply;
            
            // Only do expensive pixel manipulation if needed
            if (highlight !== 0 || shadow !== 0 || sharpness !== 0) {
                let imageData = ctx.getImageData(0, 0, width, height);
                let data = imageData.data;

                // 2. Apply highlight and shadow adjustments using HSL lightness
                if (highlight !== 0 || shadow !== 0) {
                    const hFactor = highlight / 100;
                    const sFactor = shadow / 100;
                    
                    for (let i = 0; i < data.length; i += 4) {
                        let [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
                        
                        if (sFactor !== 0) {
                           // Curve for shadow adjustment (gamma-like)
                           l = l ** (1 / (1 + sFactor));
                        }
                        if (hFactor !== 0) {
                           // Curve for highlight adjustment (inverted gamma-like)
                           l = 1 - (1 - l) ** (1 / (1 - hFactor));
                        }

                        l = Math.max(0, Math.min(1, l)); // Clamp lightness
                        
                        const [r, g, b] = hslToRgb(h, s, l);
                        data[i] = r;
                        data[i + 1] = g;
                        data[i + 2] = b;
                    }
                }
                
                // 3. Apply sharpness using a convolution kernel
                if (sharpness > 0) {
                    const sharpnessFactor = sharpness / 100;
                    const kernel = [
                        [0, -sharpnessFactor, 0],
                        [-sharpnessFactor, 1 + 4 * sharpnessFactor, -sharpnessFactor],
                        [0, -sharpnessFactor, 0]
                    ];
                    
                    const srcData = new Uint8ClampedArray(data);
                    
                    for (let y = 0; y < height; y++) {
                        for (let x = 0; x < width; x++) {
                            let r = 0, g = 0, b = 0;
                            
                            for (let ky = -1; ky <= 1; ky++) {
                                for (let kx = -1; kx <= 1; kx++) {
                                    const srcX = x + kx;
                                    const srcY = y + ky;
                                    
                                    // Clamp to edge to avoid black borders
                                    const clampedX = Math.max(0, Math.min(width - 1, srcX));
                                    const clampedY = Math.max(0, Math.min(height - 1, srcY));

                                    const i = (clampedY * width + clampedX) * 4;
                                    const weight = kernel[ky + 1][kx + 1];
                                    
                                    r += srcData[i] * weight;
                                    g += srcData[i + 1] * weight;
                                    b += srcData[i + 2] * weight;
                                }
                            }
                            
                            const destI = (y * width + x) * 4;
                            data[destI] = r;
                            data[destI + 1] = g;
                            data[destI + 2] = b;
                        }
                    }
                }

                ctx.putImageData(imageData, 0, 0);
            }

            // 4. Apply temperature/tint overlays
            if (adjustmentsToApply.temperature !== 0) {
                const tempValue = Math.abs(adjustmentsToApply.temperature) / 100;
                const color = adjustmentsToApply.temperature > 0 ? `rgba(255, 165, 0, ${tempValue})` : `rgba(0, 100, 255, ${tempValue})`;
                ctx.globalCompositeOperation = 'overlay';
                ctx.fillStyle = color;
                ctx.fillRect(0, 0, width, height);
            }
            
            if (adjustmentsToApply.tint !== 0) {
                const tintValue = Math.abs(adjustmentsToApply.tint) / 100;
                const color = adjustmentsToApply.tint > 0 ? `rgba(255, 0, 255, ${tintValue})` : `rgba(0, 255, 0, ${tintValue})`;
                ctx.globalCompositeOperation = 'overlay';
                ctx.fillStyle = color;
                ctx.fillRect(0, 0, width, height);
            }
            
            ctx.globalCompositeOperation = 'source-over';
            resolve(canvas.toDataURL('image/png'));
        };
        image.onerror = (err) => reject(err);
        image.src = baseSrc;
    });
  }, []);

  const updatePreview = useCallback(async (newAdjustments: ImageAdjustments) => {
    const hasComplexAdjustments = 
        newAdjustments.highlight !== 0 || 
        newAdjustments.shadow !== 0 || 
        newAdjustments.sharpness !== 0 ||
        newAdjustments.temperature !== 0 ||
        newAdjustments.tint !== 0;

    const hasSimpleCssAdjustments = 
        newAdjustments.brightness !== 100 ||
        newAdjustments.contrast !== 100 ||
        newAdjustments.saturation !== 100;

    if (!hasComplexAdjustments && !hasSimpleCssAdjustments) {
        setAdjustedPreviewSrc(null);
        return;
    }

    setIsAdjusting(true);
    try {
        const result = await applyAdjustmentsToImage(currentImageSrc, newAdjustments);
        setAdjustedPreviewSrc(result);
    } catch (error) {
        console.error("Failed to apply adjustments for preview:", error);
        setAdjustedPreviewSrc(null); 
    } finally {
        setIsAdjusting(false);
    }
  }, [currentImageSrc, applyAdjustmentsToImage]);

  const debouncedUpdatePreview = useDebounce(updatePreview, 400);

  useEffect(() => {
    if (previewImageSrc) return; // Don't update adjustments preview if we're showing an AI preview

    const isDefault = JSON.stringify(adjustments) === JSON.stringify(defaultAdjustments);
    if (isDefault) {
        if (adjustedPreviewSrc) setAdjustedPreviewSrc(null);
        return;
    }
    debouncedUpdatePreview(adjustments);
  }, [adjustments, debouncedUpdatePreview, previewImageSrc, adjustedPreviewSrc]);


  // Gemini Flash Lite 分析遮罩周圍環境，提供 context 給 GPT Image 2 融合
  const analyzeSurroundingContext = useCallback(async (baseImageSrc: string, bwMaskUrl: string): Promise<string> => {
    if (!apiKey) return '';
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const [baseHeader, baseData] = baseImageSrc.split(',');
      const baseMime = baseHeader.match(/data:(.*);base64/)?.[1] || 'image/png';
      const [maskHeader, maskData] = bwMaskUrl.split(',');
      const maskMime = maskHeader.match(/data:(.*);base64/)?.[1] || 'image/png';
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: {
          parts: [
            { inlineData: { data: baseData, mimeType: baseMime } },
            { inlineData: { data: maskData, mimeType: maskMime } },
            { text: 'The second image is a B&W mask — white = region to replace, black = surrounding area to preserve. Analyze ONLY the black (surrounding) area visible in the first image. Describe in 1-2 concise sentences: lighting direction and quality, color temperature, dominant colors and palette, surface materials and textures, visual style and atmosphere. This guides seamless inpainting blending.' },
          ],
        },
      });
      return response.text?.trim() || '';
    } catch {
      return ''; // Silent fail — proceed without context
    }
  }, [apiKey]);

  /**
   * 局部超解析度細節還原 (Inpaint + Local Upscale)
   * 僅針對被塗抹遮罩的最小包圍矩形 (Bounding Box) 區塊進行本機 4x 超解析
   * 縮小回原尺寸貼回，能重新生成細緻的高頻紋理與背景細節
   */
  const restoreDetailWithUpscale = useCallback(async (
    originalSrc: string,
    inpaintedSrc: string,
    bwMaskSrc: string
  ): Promise<string> => {
    try {
      const upscaleStatus = await getModelStatus('upscale_photo');
      if (upscaleStatus !== 'ready') {
        console.log('[Upscale Detail] 相片高清模型未下載，跳過局部超分細節還原');
        return inpaintedSrc;
      }

      const [origImg, inpaintImg, maskImg] = await Promise.all([
        loadImage(originalSrc),
        loadImage(inpaintedSrc),
        loadImage(bwMaskSrc)
      ]);

      const W = origImg.naturalWidth;
      const H = origImg.naturalHeight;

      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = W;
      maskCanvas.height = H;
      const maskCtx = maskCanvas.getContext('2d');
      if (!maskCtx) return inpaintedSrc;
      maskCtx.drawImage(maskImg, 0, 0);
      const maskData = maskCtx.getImageData(0, 0, W, H).data;

      // 找出 Mask 塗抹區的最小包圍矩形 (Bounding Box)
      let minX = W, minY = H, maxX = 0, maxY = 0;
      let hasMask = false;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const idx = (y * W + x) * 4;
          if (maskData[idx] > 10) { // 有遮罩像素
            hasMask = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (!hasMask) return inpaintedSrc;

      // 擴大 Bounding Box 邊界 (Padding 16px) 以保留過渡區邊緣，有利細節還原
      const padding = 16;
      minX = Math.max(0, minX - padding);
      minY = Math.max(0, minY - padding);
      maxX = Math.min(W - 1, maxX + padding);
      maxY = Math.min(H - 1, maxY + padding);

      const boxW = maxX - minX + 1;
      const boxH = maxY - minY + 1;
      if (boxW < 8 || boxH < 8) return inpaintedSrc;

      console.log(`[Upscale Detail] 執行局部超分: (${minX}, ${minY}) -> (${maxX}, ${maxY}), 尺寸: ${boxW}x${boxH}`);

      // 裁切局部區塊
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = boxW;
      cropCanvas.height = boxH;
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) return inpaintedSrc;
      cropCtx.drawImage(inpaintImg, minX, minY, boxW, boxH, 0, 0, boxW, boxH);
      const cropBase64 = cropCanvas.toDataURL('image/png');

      // 執行 4x 超解析 (PurePhoto SPAN - 極輕極快)
      const upscaledBase64 = await runUpscaleInWorker(cropBase64, 'onnx_upscale_purephoto_span_v1', 4);
      const upscaledImg = await loadImage(upscaledBase64);

      // 放回大圖 Canvas (高品質縮小 4x 以貼回對應位置，能重建細微紋理)
      const detailCanvas = document.createElement('canvas');
      detailCanvas.width = W;
      detailCanvas.height = H;
      const detailCtx = detailCanvas.getContext('2d');
      if (!detailCtx) return inpaintedSrc;

      detailCtx.drawImage(inpaintImg, 0, 0);
      detailCtx.imageSmoothingEnabled = true;
      detailCtx.imageSmoothingQuality = 'high';
      detailCtx.drawImage(upscaledImg, 0, 0, upscaledImg.naturalWidth, upscaledImg.naturalHeight, minX, minY, boxW, boxH);

      const fineResult = detailCanvas.toDataURL('image/png');
      console.log('[Upscale Detail] 局部超解析度還原完成！');
      return fineResult;
    } catch (e) {
      console.warn('[Upscale Detail] 局部超分失敗，跳過並降級為普通 LaMa 結果', e);
      return inpaintedSrc;
    }
  }, []);

  const runGeneration = async (context: GenerationContext) => {
    const activeSeed = lockSeed
      ? (customSeed !== '' ? Number(customSeed) : Math.floor(Math.random() * 2147483647))
      : Math.floor(Math.random() * 2147483647);

    // ── 準備黑白遮罩（兩條路都需要） ──────────────────────────
    setIsLoading(true);
    try {
      const bwMaskBase64Url = await createBlackAndWhiteMask(context.baseImageSrc, context.maskDataUrl);

      // ══ 移除物件 (Remove Object) ══════
      if (context.type === 'remove') {
        if (removeModel === 'lama') {
          if (!lamaReady) {
            throw new Error("本機 LaMa 模型尚未安裝，請先於功能助手面板下載。");
          }
          const result = await runLamaInWorker(context.baseImageSrc, bwMaskBase64Url);
          const restoredResult = await restoreDetailWithUpscale(context.baseImageSrc, result, bwMaskBase64Url);
          const composited = await compositeImagesPixelPerfect(context.baseImageSrc, restoredResult, bwMaskBase64Url);
          setPreviewImageSrc(composited);
          setGenerationMetadata({
              seed: activeSeed,
              model: 'lama',
              prompt: 'Remove object'
          });
          return;
        }

        if (removeModel === 'mi_gan') {
          if (!miGanReady) {
            throw new Error("本機 MI-GAN 模型尚未安裝，請先於功能助手面板下載。");
          }
          const result = await runMiGanInWorker(context.baseImageSrc, bwMaskBase64Url);
          const restoredResult = await restoreDetailWithUpscale(context.baseImageSrc, result, bwMaskBase64Url);
          const composited = await compositeImagesPixelPerfect(context.baseImageSrc, restoredResult, bwMaskBase64Url);
          setPreviewImageSrc(composited);
          return;
        }

        // 否則走雲端移除 (removeModel === 'cloud')
      }

      // ══ 路線 A：Atlas GPT Image 2 ══════
      if (atlasKey && inpaintEngine === 'gpt') {
        // 先用 Gemini Flash Lite 分析周圍環境，幫助 GPT Image 2 更好融合
        const surroundingContext = await analyzeSurroundingContext(context.baseImageSrc, bwMaskBase64Url);

        const fluxPrompt = context.type === 'remove'
          ? (context.prompt?.trim()
              ? `Remove the selected object. Background hint: ${context.prompt}. Seamlessly fill with natural background.`
              : 'Remove the selected object. Seamlessly reconstruct the background with natural texture and lighting.')
          : context.prompt;

        const generatedBase64 = await callAtlasInpaint(
          fluxPrompt,
          context.baseImageSrc,
          bwMaskBase64Url,
          atlasKey,
          referenceImages.length > 0 ? referenceImages : undefined,
          surroundingContext || undefined,
          undefined,
          undefined,
          activeSeed
        );

        // GPT Image 2 Edit 原生支援透明遮罩 inpainting，
        // 回傳的整張圖遮罩外區域已由模型自行保留，不需要再做 pixel composite。
        // 強制 composite 反而會因兩張圖透視/色調細微差異造成拼縫變形。
        setPreviewImageSrc(generatedBase64);
        setGenerationMetadata({
            seed: activeSeed,
            model: 'gpt-image-2',
            prompt: fluxPrompt
        });
        return;
      }

      // ══ 路線 B：Gemini fallback ════════════════════════════
      if (!apiKey) {
        alert("請先設定 API Key 或 Atlas Key。");
        return;
      }

      const ai = new GoogleGenAI({ apiKey: apiKey });

      const [baseHeader, baseData] = context.baseImageSrc.split(',');
      const baseMimeType = baseHeader.match(/data:(.*);base64/)?.[1] || 'image/png';
      const originalImagePart = { inlineData: { data: baseData, mimeType: baseMimeType } };

      const [maskHeader, maskData] = bwMaskBase64Url.split(',');
      const maskMimeType = maskHeader.match(/data:(.*);base64/)?.[1] || 'image/png';
      const maskImagePart = { inlineData: { data: maskData, mimeType: maskMimeType } };

      // 與 GPT 模式同一套邏輯：整張重繪，遮罩區為主要編輯對象，遮罩外僅允許低幅度自然變動
      // （不再強制「遮罩外逐像素 100% 相同」+ 後製裁切貼回，避免色調/紋理不連續造成的拼縫）
      const instructionPrefix = `You are provided with TWO images:
- IMAGE 1: The original photo to edit.
- IMAGE 2: A black-and-white mask. WHITE = the primary region to change. BLACK = keep the scene essentially the same — only very subtle, low-magnitude adjustments are allowed there (e.g. minor lighting/color/grain consistency with the edited region), never a different subject or composition change.`;

      let textPrompt = '';
      if (context.type === 'remove') {
        const userHint = context.prompt?.trim()
          ? `\nAdditional context from user: "${context.prompt}".`
          : '';
        textPrompt = `${instructionPrefix}

TASK: SEAMLESS OBJECT REMOVAL & BACKGROUND RECONSTRUCTION

Step 1 – Identify: Use IMAGE 2 to locate the WHITE masked region in IMAGE 1. This is the object or area to erase.
Step 2 – Analyze surroundings: Study the texture, color, pattern, lighting, and structure of the pixels immediately surrounding the masked area.
Step 3 – Heal: Fill the masked region by naturally extending those surrounding textures and structures inward — as if you are using a content-aware healing brush. The result must look like the masked object was never there.
Step 4 – Blend: Ensure seamless transitions at the mask boundary. Match grain, perspective, and light direction of the surrounding area.${userHint}

Render the full image. Outside the white mask, keep everything as close to IMAGE 1 as possible — only allow minor, low-magnitude adjustments needed for a seamless, natural result.`.trim();
      } else {
        textPrompt = `${instructionPrefix}

TASK: GENERATIVE EDITING

Step 1 – Identify: Use IMAGE 2 to locate the WHITE masked region in IMAGE 1.
Step 2 – Edit: Within that region, apply this change: ${context.prompt}.
Step 3 – Integrate: Match the surrounding image's lighting direction, color temperature, perspective, and texture so the edit feels native to the photo.

Render the full image. Outside the white mask, keep everything as close to IMAGE 1 as possible — only allow minor, low-magnitude adjustments needed for a seamless, natural result.`.trim();
      }

      // Attach reference images if any (Gemini multi-image)
      const refParts = referenceImages.map(refSrc => {
        const [refHeader, refData] = refSrc.split(',');
        const refMime = refHeader.match(/data:(.*);base64/)?.[1] || 'image/png';
        return { inlineData: { data: refData, mimeType: refMime } };
      });
      const refHint = referenceImages.length > 0
        ? `\n\nReference images are provided after the mask image. Use them to fill the WHITE masked region: if they show a specific object or subject, place it naturally into the scene; if they show a style, texture, or aesthetic, apply that to the fill. In either case, adapt lighting, shadows, color temperature, and perspective to seamlessly match the surrounding image.`
        : '';

      const response = await callGeminiWithRetry(() => ai.models.generateContent({
        model: imageModel,
        contents: { parts: [originalImagePart, maskImagePart, ...refParts, { text: textPrompt + refHint }] },
        config: { seed: activeSeed }
      }));

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          // 與 GPT 模式一致：直接採用模型回傳的整張重繪結果，不再強制裁切貼回原圖，
          // 避免兩張圖色調/紋理細微差異造成的拼縫（理由同 GPT 路線）。
          const generatedBase64 = `data:image/png;base64,${part.inlineData.data}`;
          setPreviewImageSrc(generatedBase64);
          setGenerationMetadata({
              seed: activeSeed,
              model: 'gemini',
              prompt: context.prompt
          });
          return;
        }
      }
      throw new Error("AI did not return an image.");

    } catch (error: any) {
      console.error("Error editing image:", error);
      const msg = error?.message?.toLowerCase() || '';
      if (msg.includes('503') || msg.includes('overloaded')) {
        alert("⏳ 伺服器暫時過載，請稍後再試。");
      } else if (msg.includes('api key') || msg.includes('invalid')) {
        alert("🔑 API Key 無效，請重新設定。");
      } else {
        alert(`編輯失敗：${error?.message?.slice(0, 100) || '未知錯誤'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (type: 'remove' | 'edit') => {
    // 手動模式下沒有遮罩層：先把手動塗改套用進圖片、切回 AI 模式，再請使用者塗遮罩
    if (editMode === 'pixel') {
      handleApplyPixelChanges();
      alert('已套用手動修改並切回 AI 模式。請先用筆刷塗抹要編輯的區域，再執行 AI 指令。');
      return;
    }
    // For 'edit', prompt is required unless reference images are provided
    if (type === 'edit' && !prompt.trim() && referenceImages.length === 0) {
      alert("請輸入編輯描述，或上傳參考圖。");
      return;
    }
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    // 遮罩為空（使用者未塗抹任何區域）→ 不送出，提示先塗抹
    const ctx = maskCanvas.getContext('2d');
    if (ctx) {
      const { data } = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
      let hasMask = false;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) { hasMask = true; break; }
      }
      if (!hasMask) {
        alert('請先用筆刷塗抹要編輯或移除的區域。');
        return;
      }
    }

    setIsLoading(true);
    setIsBaking(true);
    try {
      const adjustedSrc = await applyAdjustmentsToImage(currentImageSrc, adjustments);
      const newContext: GenerationContext = {
        baseImageSrc: adjustedSrc,
        maskDataUrl: maskCanvas.toDataURL(),
        prompt: prompt,
        type,
      };
      setGenerationContext(newContext);
      await runGeneration(newContext);
    } catch (error) {
      console.error("Error preparing image for generation:", error);
      alert("Could not apply adjustments before sending to AI.");
      setIsLoading(false);
    } finally {
      setIsBaking(false);
    }
  };
  
  const handleRegenerate = () => {
    if (generationContext) {
      runGeneration(generationContext);
    }
  };

  const handleApplyPreview = () => {
    if (previewImageSrc) {
        setCurrentImageSrc(previewImageSrc);
        setPreviewImageSrc(null);
        setAdjustedPreviewSrc(null);
        clearMask();
        setPrompt('');
        setGenerationContext(null);
        setAdjustments(defaultAdjustments);
        setShowOriginalComparison(false);
    }
  };
  
  const handleDiscardPreview = () => {
    setPreviewImageSrc(null);
    setGenerationContext(null);
    setShowOriginalComparison(false);
    setEditorSetupKey(prev => prev + 1);
  };
  
  const handleSave = async () => {
    setIsBaking(true);
    try {
        const baseImageForSave = previewImageSrc || currentImageSrc;
        const adjustedImage = await applyAdjustmentsToImage(baseImageForSave, adjustments);
        // Pass empty string as ID to signal creation of a new element, and pass the original element for positioning
        onSave('', adjustedImage, element, generationMetadata || element.metadata);
    } catch (error) {
        console.error("Error applying adjustments:", error);
        alert("Failed to save image with adjustments. Saving original.");
        onSave('', previewImageSrc || currentImageSrc, element, generationMetadata || element.metadata);
    } finally {
        setIsBaking(false);
    }
  };
  
  const isPixelMode = editMode === 'pixel';
  const activeHand = isPixelMode ? paintTool === 'hand' : tool === 'hand';
  const activeToolForCursor = isPixelMode ? paintTool : tool;
  const showsBrushCursorCircle = !previewImageSrc && (activeToolForCursor === 'brush' || activeToolForCursor === 'eraser');
  let cursorClass = 'cursor-crosshair';
  if (isSpacebarPressed || activeHand) {
      cursorClass = isPanning ? 'cursor-grabbing' : 'cursor-grab';
  } else if (previewImageSrc) {
      cursorClass = 'cursor-default';
  } else if (showsBrushCursorCircle) {
      // 顯示自訂圓形游標圈時，隱藏瀏覽器原生十字游標——兩者同時顯示會疊在一起，
      // 中心點對不齊看起來很醜。只留我們自己畫的圈，圈心才會跟落筆位置完全一致。
      cursorClass = 'cursor-none';
  }

  const imageSrcForDisplay = adjustedPreviewSrc || currentImageSrc;
  const areAdjustmentsBaked = !!adjustedPreviewSrc;

  const imageFilterStyle = useMemo(() => {
    if (areAdjustmentsBaked) return {};
    return {
      filter: `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`,
    };
  }, [adjustments, areAdjustmentsBaked]);


  // ── dot sizes for brush size selector
  const dotSizeMap: Record<number, string> = { 10: 'w-1.5 h-1.5', 20: 'w-2.5 h-2.5', 40: 'w-3.5 h-3.5', 60: 'w-[18px] h-[18px]' };

  return (
    <div className="fixed inset-0 z-[7000] bg-[#F5F5F7]/90 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      {/* Custom slider CSS */}
      <style>{`
        .img-editor-slider { -webkit-appearance:none; appearance:none; width:100%; height:4px; background:#e2e8f0; border-radius:2px; outline:none; margin:12px 0; cursor:pointer; }
        .img-editor-slider::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:14px; height:14px; border-radius:50%; background:#3b82f6; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,.2); border:2px solid white; transition:transform .1s; }
        .img-editor-slider::-webkit-slider-thumb:hover { transform:scale(1.2); }
        .img-editor-scrollbar::-webkit-scrollbar { width:6px; }
        .img-editor-scrollbar::-webkit-scrollbar-track { background:transparent; }
        .img-editor-scrollbar::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:10px; }
        .img-editor-tool-btn { color:#64748b; border-radius:8px; transition:all .2s; }
        .img-editor-tool-btn:hover { background:#f1f5f9; color:#1e293b; }
        .img-editor-tool-btn.active { background:#1e293b; color:white; box-shadow:0 2px 4px rgba(0,0,0,.1); }
        .img-editor-prompt:focus-within { border-color:#a855f7; box-shadow:0 0 0 3px rgba(168,85,247,.1); }
      `}</style>

      <div
        className="bg-white border border-black/[0.08] rounded-[24px] w-full max-w-[1300px] h-[88vh] flex flex-col overflow-hidden"
        style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(255,255,255,0.8)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-[16px] font-bold text-gray-900">局部重繪與圖片編輯</h1>

            {/* Mode Tab Switcher */}
            <div className="flex bg-gray-100 p-0.5 rounded-lg ml-4 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] border border-gray-200">
              <button
                onClick={() => setEditMode('ai')}
                title="筆刷圈選要 AI 重繪的區域；右側可調整色調"
                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                  editMode === 'ai'
                    ? 'bg-white text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                🪄 AI 重繪
              </button>
              <button
                onClick={() => setEditMode('pixel')}
                title="筆刷直接塗改／擦除像素，本機處理不耗 API"
                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                  editMode === 'pixel'
                    ? 'bg-white text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                🎨 手繪編輯
              </button>
            </div>

            {/* Model / Engine switcher */}
            {canSwitchEngine ? (
              <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="pl-2.5 pr-2 py-1 border-r border-gray-200 flex items-center pointer-events-none">
                  <span className="text-[10px] font-medium text-gray-500">Model</span>
                </div>
                <div className="relative">
                  <select
                    value={inpaintEngine}
                    onChange={e => {
                      const val = e.target.value as 'gpt' | 'gemini';
                      if (val === 'gemini' && !apiKey) return;
                      setInpaintEngine(val);
                    }}
                    className="appearance-none bg-transparent py-1 pl-2 pr-6 text-[11px] font-bold text-purple-600 focus:outline-none cursor-pointer"
                  >
                    {atlasKey && <option value="gpt">GPT Image 2</option>}
                    <option value="gemini" disabled={!apiKey}>Gemini{!apiKey ? ' (需 Key)' : ''}</option>
                  </select>
                  <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </div>
              </div>
            ) : apiKey ? (
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1">
                <span className="text-[10px] font-medium text-gray-500 mr-2 border-r border-gray-200 pr-2">Model</span>
                <span className="text-[11px] font-bold text-purple-600">Gemini</span>
              </div>
            ) : null}

            {/* Local Inpaint backend badge */}
            {removeModel === 'mi_gan' ? (
              miGanReady && miGanBackend && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-50 text-purple-600 border border-purple-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  MI-GAN {miGanBackend === 'webgpu' ? 'GPU' : 'CPU'}
                </div>
              )
            ) : removeModel === 'lama' ? (
              lamaReady && lamaBackend && (
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${
                  lamaBackend === 'webgpu'
                    ? 'bg-green-50 text-green-600 border border-green-200'
                    : 'bg-gray-50 text-gray-500 border border-gray-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    lamaBackend === 'webgpu' ? 'bg-green-400' : 'bg-gray-400'
                  }`} />
                  LaMa {lamaBackend === 'webgpu' ? 'GPU' : 'CPU'}
                </div>
              )
            ) : null}
          </div>

          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 flex overflow-hidden">

          {/* ── Left: Canvas + AI command ── */}
          <div className="flex-1 flex flex-col p-6 bg-[#f8fafc] overflow-hidden gap-4">

            {/* Canvas */}
            <div
              ref={containerRef}
              className={`flex-1 rounded-2xl border border-gray-200 overflow-hidden relative select-none ${cursorClass}`}
              style={{
                backgroundColor: '#f8fafc',
                backgroundImage: 'linear-gradient(45deg,#e2e8f0 25%,transparent 25%),linear-gradient(-45deg,#e2e8f0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e2e8f0 75%),linear-gradient(-45deg,transparent 75%,#e2e8f0 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0,0 10px,10px -10px,-10px 0px',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)',
              }}
              onMouseDown={editMode === 'pixel' ? handlePixelMouseDown : startDrawing}
              onMouseUp={editMode === 'pixel' ? handlePixelMouseUp : finishDrawing}
              onMouseLeave={editMode === 'pixel' ? handlePixelMouseUp : finishDrawing}
              onMouseMove={editMode === 'pixel' ? handlePixelMouseMove : draw}
              onWheel={handleWheel}
            >
              {/* Loading overlay */}
              {(isLoading || isBaking || isAdjusting) && (
                <div className="absolute inset-0 z-30 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center text-gray-800">
                  <svg className="animate-spin h-9 w-9 text-gray-800 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-[14px] font-semibold text-gray-700">
                    {isAdjusting ? '套用調整中...' : isBaking && !isLoading ? '套用調整中...' : '正在編輯...'}
                  </p>
                </div>
              )}

              {/* Image / Preview display */}
              {previewImageSrc ? (
                <div className="w-full h-full flex items-center justify-center relative">
                  <img
                    src={showOriginalComparison ? currentImageSrc : previewImageSrc}
                    alt="Preview"
                    className="object-contain max-w-full max-h-full shadow-lg rounded-lg transition-opacity duration-200"
                  />
                  {showOriginalComparison && (
                    <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-md">原圖</div>
                  )}
                </div>
              ) : (
                <div
                  className="relative"
                  style={{
                    // 手動模式 imageRef 已 unmount，改用 pixelCanvasDims；容器必須等於原圖像素尺寸，
                    // 否則 canvas 被拉伸（圖壓縮）且 getCanvasPoint 座標對不上（筆刷錯位）
                    width: (editMode === 'pixel' ? pixelCanvasDims?.w : imageRef.current?.naturalWidth) || imageRef.current?.naturalWidth || 800,
                    height: (editMode === 'pixel' ? pixelCanvasDims?.h : imageRef.current?.naturalHeight) || imageRef.current?.naturalHeight || 600,
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'top left',
                  }}
                >
                  {editMode === 'pixel' ? (
                    <canvas
                      ref={pixelCanvasRef}
                      className="block select-none max-w-none"
                      style={{
                        width: '100%',
                        height: '100%',
                        cursor: paintTool === 'picker' ? 'cell'
                          : (paintTool === 'hand' || isSpacebarPressed) ? (isPanning ? 'grabbing' : 'grab')
                          : (paintTool === 'brush' || paintTool === 'eraser') ? 'none'
                          : 'crosshair'
                      }}
                    />
                  ) : (
                    <>
                      <div className="relative w-full h-full" style={imageFilterStyle}>
                        <img ref={imageRef} src={imageSrcForDisplay} alt="Editable" className="block pointer-events-none max-w-none" />
                        {!areAdjustmentsBaked && adjustments.temperature > 0 && <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(255,165,0)', opacity: adjustments.temperature / 100, mixBlendMode: 'overlay' }} />}
                        {!areAdjustmentsBaked && adjustments.temperature < 0 && <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(0,100,255)', opacity: -adjustments.temperature / 100, mixBlendMode: 'overlay' }} />}
                        {!areAdjustmentsBaked && adjustments.tint > 0 && <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(255,0,255)', opacity: adjustments.tint / 100, mixBlendMode: 'overlay' }} />}
                        {!areAdjustmentsBaked && adjustments.tint < 0 && <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(0,255,0)', opacity: -adjustments.tint / 100, mixBlendMode: 'overlay' }} />}
                      </div>
                      <canvas ref={maskCanvasRef} className={`absolute top-0 left-0 pointer-events-none transition-opacity duration-200 ${isMaskVisible ? 'opacity-100' : 'opacity-0'}`} />
                    </>
                  )}
                </div>
              )}

              {/* 筆刷/橡皮擦大小游標圈（AI 遮罩筆刷 + 手動筆刷共用；位置由 updateBrushCursor 直接更新 DOM） */}
              {!previewImageSrc && (
                <div
                  ref={brushCursorRef}
                  className="absolute pointer-events-none rounded-full z-10"
                  style={{
                    display: 'none',
                    border: '1.5px solid rgba(255,255,255,0.95)',
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(0,0,0,0.25)',
                  }}
                />
              )}

              {/* ── Floating pill toolbar（兩模式共用；按鈕依模式映射到遮罩系統或手動像素系統） ── */}
              {!isLoading && !isBaking && (
                <div
                  className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md border border-gray-100 rounded-full px-4 py-2 flex items-center gap-4 z-20"
                  style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
                  onMouseDown={e => e.stopPropagation()}
                  onPointerDown={e => e.stopPropagation()}
                >
                  {previewImageSrc ? (
                    /* ── Preview controls ── */
                    <>
                      <button
                        onMouseDown={() => setShowOriginalComparison(true)}
                        onMouseUp={() => setShowOriginalComparison(false)}
                        onMouseLeave={() => setShowOriginalComparison(false)}
                        className="img-editor-tool-btn w-8 h-8 flex items-center justify-center select-none"
                        title="按住查看原圖"
                      >
                        <EditIcons.Eye />
                      </button>
                      <div className="w-px h-5 bg-gray-200" />
                      <button onClick={handleDiscardPreview} className="img-editor-tool-btn px-3 py-1 text-[12px] font-medium rounded-lg">捨棄</button>
                      <button onClick={handleRegenerate} className="img-editor-tool-btn px-3 py-1 text-[12px] font-medium rounded-lg text-orange-500 hover:bg-orange-50">重新生成</button>
                      <button onClick={handleApplyPreview} className="img-editor-tool-btn px-3 py-1 text-[12px] font-medium rounded-lg text-green-600 hover:bg-green-50">套用並繼續</button>
                      <div className="w-px h-5 bg-gray-200" />
                      <span className="text-[11px] text-gray-400 font-medium">預覽結果</span>
                    </>
                  ) : (
                    /* ── Drawing controls ── */
                    <>
                      {/* Tool buttons：抓手排最前面，預設工具也是抓手 */}
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => isPixelMode ? setPaintTool('hand') : setTool('hand')}
                          className={`img-editor-tool-btn w-8 h-8 flex items-center justify-center${activeHand ? ' active' : ''}`}
                          title="抓手"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>
                        </button>
                        <button
                          onClick={() => isPixelMode ? setPaintTool('brush') : setTool('brush')}
                          className={`img-editor-tool-btn w-8 h-8 flex items-center justify-center${(isPixelMode ? paintTool === 'brush' : tool === 'brush') ? ' active' : ''}`}
                          title="筆刷"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42"/></svg>
                        </button>
                        <button
                          onClick={() => isPixelMode ? setPaintTool('eraser') : setTool('eraser')}
                          className={`img-editor-tool-btn w-8 h-8 flex items-center justify-center${(isPixelMode ? paintTool === 'eraser' : tool === 'eraser') ? ' active' : ''}`}
                          title="橡皮擦"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21"/><path d="m5.082 11.09 8.828 8.828"/></svg>
                        </button>
                      </div>

                      <div className="w-px h-5 bg-gray-200" />

                      {/* Brush size dots */}
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Size</span>
                        <div className="flex items-center gap-2.5">
                          {BRUSH_SIZES.map(size => (
                            <div
                              key={size}
                              onClick={() => isPixelMode ? setPaintSize(size) : setBrushSize(size)}
                              className={`rounded-full cursor-pointer transition-all ${dotSizeMap[size] || 'w-3 h-3'} ${(isPixelMode ? paintSize : brushSize) === size ? 'bg-[#1e293b]' : 'bg-[#cbd5e1] hover:bg-[#94a3b8]'}`}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="w-px h-5 bg-gray-200" />

                      {/* Actions */}
                      <div className="flex items-center gap-0.5">
                        <button onClick={isPixelMode ? pixelUndo : undo} disabled={isPixelMode ? !canPixelUndo : !canUndo} className="img-editor-tool-btn w-8 h-8 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed" title="復原"><EditIcons.Undo /></button>
                        <button onClick={isPixelMode ? pixelRedo : redo} disabled={isPixelMode ? !canPixelRedo : !canRedo} className="img-editor-tool-btn w-8 h-8 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed" title="重做"><EditIcons.Redo /></button>
                        {/* 遮罩專屬按鈕：手動模式沒有遮罩層，不顯示 */}
                        {!isPixelMode && (
                          <>
                            <button onClick={clearMask} className="img-editor-tool-btn w-8 h-8 flex items-center justify-center hover:text-red-500" title="清除遮罩"><EditIcons.Trash /></button>
                            <button
                              onClick={() => setIsMaskVisible(!isMaskVisible)}
                              className={`img-editor-tool-btn w-8 h-8 flex items-center justify-center${isMaskVisible ? ' text-purple-600 bg-purple-50' : ''}`}
                              title={isMaskVisible ? '隱藏遮罩' : '顯示遮罩'}
                            >
                              {isMaskVisible ? <EditIcons.Eye /> : <EditIcons.EyeOff />}
                            </button>
                          </>
                        )}
                      </div>

                      <div className="w-px h-5 bg-gray-200" />

                      {/* Zoom % */}
                      <span className="text-[12px] text-gray-500 font-medium w-9 text-right tabular-nums">{(zoom * 100).toFixed(0)}%</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── AI Command card（預覽模式與手動筆刷模式隱藏；手動模式不走 AI 指令，
                隱藏後畫布 flex-1 會自動撐滿多出的空間，不留空白） ── */}
            {!previewImageSrc && editMode !== 'pixel' && (
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex gap-4 flex-shrink-0 img-editor-prompt transition-all">
                {/* Left: textarea + reference */}
                <div className="flex-1 flex flex-col gap-3 min-w-0">
                  <textarea
                    rows={2}
                    value={prompt}
                    onChange={e => {
                      setPrompt(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                    placeholder={
                      referenceImages.length > 0
                        ? '✨ 已有參考圖，可額外補充描述（選填）...'
                        : pendingAction === 'remove'
                        ? '✨ 描述移除後希望填補的背景內容（選填）...'
                        : '✨ 輸入描述，或上傳參考圖指定替換物件，再點選右側按鈕...'
                    }
                    className="w-full bg-transparent border-none text-[14px] text-gray-800 focus:outline-none resize-none placeholder-gray-400 leading-relaxed"
                    style={{ minHeight: '52px' }}
                  />

                  {/* Reference images row */}
                  <div className="flex items-center gap-2 flex-wrap border-t border-gray-50 pt-3">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex-shrink-0">參考圖</span>

                    {/* Thumbnails */}
                    {referenceImages.map((src, idx) => (
                      <div key={idx} className="relative w-9 h-9 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 group">
                        <img src={src} alt={`參考圖 ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => setReferenceImages(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold"
                          title="移除"
                        >×</button>
                      </div>
                    ))}

                    {/* Add buttons */}
                    {referenceImages.length < MAX_REFERENCE_IMAGES && (
                      <>
                        <button
                          onClick={() => refFileInputRef.current?.click()}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-[12px] font-medium text-gray-600 transition-colors"
                        >
                          <Icon name="upload" size={13} />
                          上傳
                        </button>
                        {canvasImages.filter(img => img.id !== element.id).length > 0 && (
                          <button
                            onClick={() => setShowCanvasPicker(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-[12px] font-medium text-gray-600 transition-colors"
                          >
                            <Icon name="image" size={13} />
                            從畫布
                          </button>
                        )}
                      </>
                    )}

                    <span className="text-[11px] text-gray-400 ml-1 hidden lg:inline">
                      {referenceImages.length > 0
                        ? `${referenceImages.length}/${MAX_REFERENCE_IMAGES} 張・AI 將把遮罩區替換成參考圖的物件或風格`
                        : '可上傳參考圖，讓 AI 將遮罩區替換成指定物件或套用風格'}
                    </span>
                  </div>

                  {/* Seed control row */}
                  <div className="flex items-center gap-2 flex-wrap border-t border-gray-50 pt-2.5">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex-shrink-0">隨機種子</span>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={lockSeed}
                        onChange={(e) => setLockSeed(e.target.checked)}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                      />
                      <span className="text-[11.5px] font-medium text-gray-700">預設鎖定 Seed (減少畫風色差突變)</span>
                    </label>
                    
                    {lockSeed && (
                      <div className="flex items-center gap-1.5 bg-[#f8fafc] border border-gray-200 rounded-lg px-2 py-1 ml-2 animate-fade-in-down">
                        <span className="text-[10px] font-bold text-gray-500 font-mono">SEED:</span>
                        <input
                          type="number"
                          placeholder="自動隨機"
                          value={customSeed}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCustomSeed(v === '' ? '' : Math.max(0, parseInt(v, 10)));
                          }}
                          className="w-24 bg-transparent border-none text-[10px] font-bold text-gray-800 focus:outline-none font-mono p-0"
                        />
                        <button
                          onClick={() => setCustomSeed(Math.floor(Math.random() * 2147483647))}
                          className="text-[10px] text-purple-500 hover:text-purple-600 font-bold ml-1 transition-all active:scale-95"
                          title="重新生成隨機 seed"
                        >
                          🎲 隨機
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-px bg-gray-100 flex-shrink-0" />

                {/* Right: action buttons */}
                <div className="flex flex-col gap-2 w-[144px] justify-center flex-shrink-0">
                  <button
                    onClick={() => { setPendingAction('edit'); handleSubmit('edit'); }}
                    disabled={isLoading || isBaking}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white text-[13px] font-bold rounded-xl shadow-md transition-all hover:shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-wait"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"/></svg>
                    編輯物件
                  </button>

                  {/* 移除物件 Split Button Dropdown */}
                  <div className="relative w-full">
                    <div className="flex w-full rounded-xl overflow-hidden border-2 border-red-100 bg-[#f8fafc]">
                      <button
                        onClick={() => { setPendingAction('remove'); handleSubmit('remove'); }}
                        disabled={isLoading || isBaking}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-white text-red-500 py-2.5 text-[13px] font-bold hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-wait"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        移除物件
                      </button>
                      <div className="w-px bg-red-100 my-0"/>
                      <button
                        onClick={() => setRemoveDropdownOpen(v => !v)}
                        disabled={isLoading || isBaking}
                        className="flex items-center gap-0.5 px-2 bg-white text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="選擇移除模式"
                      >
                        <span className="text-[10px] font-bold whitespace-nowrap">
                          {removeModel === 'cloud' ? '雲端' : removeModel === 'lama' ? 'LaMa' : 'MI-GAN'}
                        </span>
                        <svg className="flex-shrink-0" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                      </button>
                    </div>

                    {removeDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-[7001]" onClick={() => setRemoveDropdownOpen(false)}/>
                        <div className="absolute bottom-full mb-1 right-0 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-[7002] min-w-[170px] py-1">
                          {removeModelOptions.map(opt => {
                            const isReady = opt.key === 'cloud' || (opt.key === 'lama' ? lamaReady : miGanReady);
                            return (
                              <button
                                key={opt.key}
                                onClick={() => {
                                  setRemoveModel(opt.key);
                                  setRemoveDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-red-50/50 transition-colors ${removeModel === opt.key ? 'bg-red-50/50' : ''}`}
                              >
                                <div>
                                  <div className="text-[11px] font-bold text-gray-800 flex items-center gap-1">
                                    {opt.label}
                                    {!isReady && <span className="text-[9px] font-normal text-gray-400">(未安裝)</span>}
                                  </div>
                                  <div className="text-[9px] text-gray-400 leading-normal">{opt.desc}</div>
                                </div>
                                {removeModel === opt.key && (
                                  <svg className="text-red-500" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Hidden file input */}
                <input
                  ref={refFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => {
                    const files = Array.from(e.target.files ?? []).slice(0, MAX_REFERENCE_IMAGES - referenceImages.length);
                    files.forEach((file: File) => {
                      const reader = new FileReader();
                      reader.onload = ev => {
                        const src = ev.target?.result as string;
                        if (src) setReferenceImages(prev => [...prev, src].slice(0, MAX_REFERENCE_IMAGES));
                      };
                      reader.readAsDataURL(file);
                    });
                    e.target.value = '';
                  }}
                />
              </div>
            )}
          </div>

          {/* ── Right: params panel ── */}
          {editMode === 'pixel' ? (
            <div className="w-[320px] bg-white border-l border-gray-100 flex flex-col flex-shrink-0">
              <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50 flex-shrink-0">
                <h2 className="text-[14px] font-bold text-gray-800">手繪編輯</h2>
                <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded font-bold">本地端</span>
              </div>

              {/* Scrollable paint options */}
              <div className="flex-1 overflow-y-auto px-5 py-4 img-editor-scrollbar space-y-6">
                
                {/* 1. 工具選擇 */}
                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold text-gray-400 tracking-widest uppercase">修補工具</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPaintTool('brush')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-[12px] font-bold transition-all ${
                        paintTool === 'brush'
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {/* 對標下方共用工具列的筆刷 icon（不用 Material Symbols，維持風格一致） */}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42"/></svg>
                      畫筆
                    </button>
                    <button
                      onClick={() => setPaintTool('eraser')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-[12px] font-bold transition-all ${
                        paintTool === 'eraser'
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                      title="橡皮擦擦除像素，可用於背景去背"
                    >
                      {/* 對標下方共用工具列的橡皮擦 icon */}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21"/><path d="m5.082 11.09 8.828 8.828"/></svg>
                      橡皮擦
                    </button>
                    <button
                      onClick={() => setPaintTool('rect')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-[12px] font-bold transition-all ${
                        paintTool === 'rect'
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <Icon name="crop_square" size={14} />
                      矩形色塊
                    </button>
                    <button
                      onClick={() => setPaintTool('circle')}
                      title="拖曳畫橢圓；按住 Shift 鎖定正圓"
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-[12px] font-bold transition-all ${
                        paintTool === 'circle'
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <Icon name="panorama_fish_eye" size={14} />
                      橢圓色塊
                    </button>
                  </div>
                </div>

                {/* 2. 工具屬性（筆刷/橡皮擦：大小+硬度；矩形/圓形：實心/邊框/透明度/羽化） */}
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <h3 className="text-[11px] font-bold text-gray-400 tracking-widest uppercase">
                    {(paintTool === 'rect' || paintTool === 'circle') ? '色塊屬性' : '筆刷屬性'}
                  </h3>

                  {/* 大小 + 硬度：只有筆刷/橡皮擦適用（色塊大小由拖曳決定） */}
                  {(paintTool === 'brush' || paintTool === 'eraser') && (
                    <>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold text-gray-600">
                          <span>大小 (Size)</span>
                          <span className="text-gray-900">{paintSize}px</span>
                        </div>
                        <input
                          type="range" min={4} max={120} value={paintSize}
                          onChange={e => setPaintSize(Number(e.target.value))}
                          className="w-full accent-black cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold text-gray-600">
                          <span>硬度 (Hardness)</span>
                          <span className="text-gray-900">{paintHardness}%</span>
                        </div>
                        <input
                          type="range" min={0} max={100} value={paintHardness}
                          onChange={e => setPaintHardness(Number(e.target.value))}
                          className="w-full accent-black cursor-pointer"
                        />
                      </div>
                    </>
                  )}

                  {/* 矩形/圓形色塊：實心/邊框 + 透明度 + 羽化 */}
                  {(paintTool === 'rect' || paintTool === 'circle') && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={shapeFill}
                            onChange={e => {
                              // 實心與邊框至少要留一個，否則畫不出東西
                              if (!e.target.checked && !shapeStroke) return;
                              setShapeFill(e.target.checked);
                            }}
                            className="rounded border-gray-300 text-black focus:ring-black"
                          />
                          <span className="text-[12px] font-semibold text-gray-700">實心填色</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={shapeStroke}
                            onChange={e => {
                              if (!e.target.checked && !shapeFill) return;
                              setShapeStroke(e.target.checked);
                            }}
                            className="rounded border-gray-300 text-black focus:ring-black"
                          />
                          <span className="text-[12px] font-semibold text-gray-700">邊框</span>
                        </label>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold text-gray-600">
                          <span>透明度 (Opacity)</span>
                          <span className="text-gray-900">{shapeOpacity}%</span>
                        </div>
                        <input
                          type="range" min={5} max={100} value={shapeOpacity}
                          onChange={e => setShapeOpacity(Number(e.target.value))}
                          className="w-full accent-black cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold text-gray-600">
                          <span>邊緣羽化 (Feather)</span>
                          <span className="text-gray-900">{shapeFeather}px</span>
                        </div>
                        <input
                          type="range" min={0} max={40} value={shapeFeather}
                          onChange={e => setShapeFeather(Number(e.target.value))}
                          className="w-full accent-black cursor-pointer"
                        />
                        <p className="text-[10px] text-gray-400">羽化在放開滑鼠時套用（預覽為硬邊+虛線框）</p>
                      </div>
                    </>
                  )}
                </div>

                {/* 3. 顏色選擇 */}
                {paintTool !== 'eraser' && (
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <h3 className="text-[11px] font-bold text-gray-400 tracking-widest uppercase">選取顏色</h3>
                      <button
                        onClick={triggerEyeDropper}
                        className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg border transition-colors ${
                          paintTool === 'picker'
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                        title="吸取畫面顏色"
                      >
                        <Icon name="colorize" size={12} />
                        吸管吸色
                      </button>
                    </div>

                    {/* Color inputs */}
                    <div className="flex items-center gap-3">
                      {/* 自訂點擊色塊，解決瀏覽器原生 input[type="color"] 在圓角內包矩形色塊的醜陋問題 */}
                      <div 
                        className="relative w-8 h-8 rounded-xl overflow-hidden cursor-pointer border border-gray-200 shadow-sm flex-shrink-0 select-none transition-all hover:scale-105 hover:shadow"
                        style={{
                          backgroundImage: `linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)`,
                          backgroundSize: '8px 8px',
                          backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0'
                        }}
                        title="開啟色彩選取器"
                        onClick={() => colorInputRef.current?.click()}
                      >
                        <div 
                          className="absolute inset-0 w-full h-full" 
                          style={{ backgroundColor: paintColor }}
                        />
                        {/* 隱藏的原生色彩選擇器 */}
                        <input
                          ref={colorInputRef}
                          type="color"
                          value={paintColor.startsWith('rgba') ? '#000000' : paintColor}
                          onChange={e => setPaintColor(e.target.value)}
                          className="absolute inset-0 opacity-0 w-full h-full pointer-events-none"
                        />
                      </div>
                      
                      <div className="flex-1 relative flex items-center">
                        <input
                          type="text"
                          value={paintColor}
                          onChange={e => setPaintColor(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-3 pr-8 py-1.5 text-[12px] font-bold text-gray-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono"
                          placeholder="#000000"
                        />
                        {/* 顯示顏色代碼的提示小圓點 */}
                        <span className="absolute right-3 w-2.5 h-2.5 rounded-full border border-gray-300 shadow-sm" style={{ backgroundColor: paintColor }} />
                      </div>
                    </div>

                    {/* Quick colors */}
                    <div className="grid grid-cols-8 gap-1.5 pt-1">
                      {['#000000', '#ffffff', '#ef4444', '#22c55e', '#3b82f6', '#eab308', 'rgba(0,0,0,0.5)', 'rgba(239,68,68,0.5)'].map((col, idx) => (
                        <div
                          key={idx}
                          onClick={() => setPaintColor(col)}
                          className={`w-6 h-6 rounded-full cursor-pointer border border-gray-200 relative transition-all hover:scale-110 ${
                            paintColor === col ? 'ring-2 ring-purple-500 ring-offset-1' : ''
                          }`}
                          style={{
                            backgroundColor: col.includes('rgba') ? 'transparent' : col,
                            backgroundImage: col.includes('rgba') ? `linear-gradient(45deg,#ccc 25%,transparent 25%),linear-gradient(-45deg,#ccc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ccc 75%),linear-gradient(-45deg,transparent 75%,#ccc 75%)` : col === '#ffffff' ? 'none' : 'none',
                            backgroundSize: '4px 4px',
                          }}
                        >
                          {col.includes('rgba') && (
                            <div className="absolute inset-0 rounded-full" style={{ backgroundColor: col }} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. 歷史與操作 */}
                <div className="pt-4 border-t border-gray-100 flex gap-2">
                  <button
                    onClick={pixelUndo}
                    disabled={!canPixelUndo}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 text-[12px] font-bold hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Icon name="undo" size={13} />
                    復原
                  </button>
                  <button
                    onClick={pixelRedo}
                    disabled={!canPixelRedo}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 text-[12px] font-bold hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Icon name="redo" size={13} />
                    重做
                  </button>
                </div>

              </div>

              {/* Footer: Discard & Apply */}
              <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex gap-3 flex-shrink-0">
                <button
                  onClick={() => setEditMode('ai')}
                  className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-[13px] font-bold rounded-xl transition-colors"
                >
                  捨棄
                </button>
                <button
                  onClick={handleApplyPixelChanges}
                  className="flex-1 py-3 bg-black hover:bg-gray-800 text-white text-[13px] font-bold rounded-xl shadow-md transition-all hover:shadow-lg flex items-center justify-center gap-1.5"
                >
                  <Icon name="check" size={14} />
                  套用修改
                </button>
              </div>
            </div>
          ) : (
            <div className="w-[320px] bg-white border-l border-gray-100 flex flex-col flex-shrink-0">
              <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50 flex-shrink-0">
                <h2 className="text-[14px] font-bold text-gray-800">調整參數</h2>
                <button onClick={() => setAdjustments(defaultAdjustments)} className="text-[12px] font-medium text-blue-500 hover:text-blue-700 transition-colors">重置所有</button>
              </div>

              {/* Scrollable sliders */}
              <div className="flex-1 overflow-y-auto px-5 py-1 img-editor-scrollbar">
                <CollapsibleSection title="基本" defaultOpen={true}>
                  <AdjustmentSlider label="亮度 (Brightness)" value={adjustments.brightness} defaultValue={100} min={0} max={200} onChange={val => setAdjustments(a => ({ ...a, brightness: val }))} onReset={() => setAdjustments(a => ({ ...a, brightness: 100 }))} />
                  <AdjustmentSlider label="對比 (Contrast)" value={adjustments.contrast} defaultValue={100} min={0} max={200} onChange={val => setAdjustments(a => ({ ...a, contrast: val }))} onReset={() => setAdjustments(a => ({ ...a, contrast: 100 }))} />
                  <AdjustmentSlider label="飽和度 (Saturation)" value={adjustments.saturation} defaultValue={100} min={0} max={200} onChange={val => setAdjustments(a => ({ ...a, saturation: val }))} onReset={() => setAdjustments(a => ({ ...a, saturation: 100 }))} />
                </CollapsibleSection>

                <CollapsibleSection title="色彩" defaultOpen={true}>
                  <AdjustmentSlider label="色溫 (Temperature)" value={adjustments.temperature} defaultValue={0} min={-100} max={100} onChange={val => setAdjustments(a => ({ ...a, temperature: val }))} onReset={() => setAdjustments(a => ({ ...a, temperature: 0 }))} />
                  <AdjustmentSlider label="色調 (Tint)" value={adjustments.tint} defaultValue={0} min={-100} max={100} onChange={val => setAdjustments(a => ({ ...a, tint: val }))} onReset={() => setAdjustments(a => ({ ...a, tint: 0 }))} />
                </CollapsibleSection>

                <CollapsibleSection title="細節" defaultOpen={false}>
                  <AdjustmentSlider label="亮部 (Highlight)" value={adjustments.highlight} defaultValue={0} min={-100} max={100} onChange={val => setAdjustments(a => ({ ...a, highlight: val }))} onReset={() => setAdjustments(a => ({ ...a, highlight: 0 }))} />
                  <AdjustmentSlider label="陰影 (Shadow)" value={adjustments.shadow} defaultValue={0} min={-100} max={100} onChange={val => setAdjustments(a => ({ ...a, shadow: val }))} onReset={() => setAdjustments(a => ({ ...a, shadow: 0 }))} />
                  <AdjustmentSlider label="銳化 (Sharpness)" value={adjustments.sharpness} defaultValue={0} min={0} max={100} onChange={val => setAdjustments(a => ({ ...a, sharpness: val }))} onReset={() => setAdjustments(a => ({ ...a, sharpness: 0 }))} />
                </CollapsibleSection>
              </div>

              {/* Footer: 取消 + 儲存 */}
              <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex gap-3 flex-shrink-0">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-[13px] font-bold rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={isBaking}
                  className="flex-1 py-3 bg-black hover:bg-gray-800 text-white text-[13px] font-bold rounded-xl shadow-md transition-all hover:shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Icon name="save" size={14} />
                  儲存圖片
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Canvas image picker */}
      {showCanvasPicker && (
        <div className="fixed inset-0 z-[7001] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowCanvasPicker(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 w-[480px] max-h-[60vh] flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between flex-shrink-0">
              <div>
                <p className="text-sm font-bold text-[#1D1D1F]">從畫布選取參考圖</p>
                <p className="text-xs text-[#86868B] mt-0.5">最多可再選 {MAX_REFERENCE_IMAGES - referenceImages.length} 張</p>
              </div>
              <button onClick={() => setShowCanvasPicker(false)} className="text-[#86868B] hover:text-[#1D1D1F] text-xl leading-none transition-colors">&times;</button>
            </div>
            <div className="overflow-y-auto grid grid-cols-4 gap-3">
              {canvasImages.filter(img => img.id !== element.id).map(img => {
                const alreadySelected = referenceImages.includes(img.src);
                const canSelect = !alreadySelected && referenceImages.length < MAX_REFERENCE_IMAGES;
                return (
                  <button
                    key={img.id}
                    disabled={!canSelect && !alreadySelected}
                    onClick={() => {
                      if (alreadySelected) setReferenceImages(prev => prev.filter(s => s !== img.src));
                      else if (canSelect) setReferenceImages(prev => [...prev, img.src]);
                    }}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      alreadySelected ? 'border-[#AF52DE] ring-2 ring-[#AF52DE]/30'
                        : canSelect ? 'border-transparent hover:border-gray-300'
                        : 'border-transparent opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <img src={img.src} alt={img.name || '圖片'} className="w-full h-full object-cover" />
                    {alreadySelected && (
                      <div className="absolute inset-0 bg-[#AF52DE]/20 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-[#AF52DE] text-white flex items-center justify-center text-xs font-bold">✓</div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowCanvasPicker(false)}
              className="flex-shrink-0 w-full py-2.5 text-sm font-semibold text-white bg-black hover:bg-gray-800 rounded-full transition-all"
            >
              確認 ({referenceImages.length} 張已選)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
