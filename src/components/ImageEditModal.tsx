
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import type { ImageElement, Point } from '../types';
import { callGeminiWithRetry, analyzeDominantColor } from '../utils/helpers';
import { Icon } from './Icon';
import { rgbToHsl, hslToRgb, compositeImagesPixelPerfect, createPrefilledImage } from '../utils/imageProcessing';
import { callAtlasInpaint } from '../utils/atlasImage';
import { getModelStatus } from '../utils/onnxModelCache';
import { runLamaInWorker } from '../utils/lamaWorkerClient';

// Helper: Simple debounce hook
const useDebounce = (callback: (...args: any[]) => void, delay: number) => {
  const timeoutRef = useRef<number | null>(null);
  
  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      callback(...args);
    }, delay);
  };
};



interface ImageEditModalProps {
  element: ImageElement;
  onSave: (elementId: string, dataUrl: string, originalElement?: ImageElement) => void;
  onClose: () => void;
  apiKey: string | null;
  imageModel?: string;
  atlasKey?: string | null;
  canvasImages?: { id: string; src: string; name?: string }[];
}

const MAX_REFERENCE_IMAGES = 3;

interface GenerationContext {
  baseImageSrc: string;
  maskDataUrl: string;
  prompt: string;
  type: 'remove' | 'edit';
}

interface ImageAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  highlight: number;
  shadow: number;
  sharpness: number;
}

const defaultAdjustments: ImageAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  temperature: 0,
  tint: 0,
  highlight: 0,
  shadow: 0,
  sharpness: 0,
};


const BRUSH_SIZES = [10, 20, 40, 60];
const MASK_COLOR = 'rgba(255, 59, 48, 0.5)'; // Increased opacity slightly for clearer AI visibility
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 5;

const EditIcons = {
    Undo:   () => <Icon name="undo" size={16} />,
    Redo:   () => <Icon name="redo" size={16} />,
    Eye:    () => <Icon name="visibility" size={16} />,
    EyeOff: () => <Icon name="visibility_off" size={16} />,
    Trash:  () => <Icon name="delete" size={16} />,
};

const AdjustmentSlider: React.FC<{
  label: string;
  value: number;
  defaultValue: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  onReset: () => void;
}> = ({ label, value, defaultValue, min, max, onChange, onReset }) => {
  const isModified = value !== defaultValue;
  // Parse "亮度 (Brightness)" → ["亮度", "Brightness"]
  const match = label.match(/^(.+?)\s*\((.+)\)$/);
  const labelMain = match ? match[1].trim() : label;
  const labelEn = match ? match[2] : '';
  return (
    <div className="w-full">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-bold text-gray-600 uppercase">
          {labelMain}
          {labelEn && <span className="text-gray-400 font-normal ml-1">({labelEn})</span>}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-gray-900 w-6 text-right">{value.toFixed(0)}</span>
          {isModified && (
            <button onClick={onReset} className="text-[10px] text-blue-500 hover:underline" title="重置">重置</button>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="img-editor-slider"
      />
    </div>
  );
};

const CollapsibleSection: React.FC<{
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="py-4 border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between mb-4 cursor-pointer group"
      >
        <h3 className="text-[11px] font-bold text-gray-400 tracking-widest uppercase">{title}</h3>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`text-gray-400 group-hover:text-gray-600 transition-transform duration-200 ${open ? '' : 'rotate-180'}`}
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
      {open && <div className="space-y-4">{children}</div>}
    </div>
  );
};


export const ImageEditModal: React.FC<ImageEditModalProps> = ({ element, onSave, onClose, apiKey, imageModel = 'gemini-3.1-flash-image-preview', atlasKey, canvasImages = [] }) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const strokePointsRef = useRef<Point[]>([]);

  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [tool, setTool] = useState<'brush' | 'eraser' | 'hand'>('brush');
  
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
  const [inpaintEngine, setInpaintEngine] = useState<'gpt' | 'gemini' | 'lama'>(atlasKey ? 'gpt' : 'gemini');
  const [lamaReady, setLamaReady] = useState(false);

  useEffect(() => {
    getModelStatus('lama').then(s => setLamaReady(s === 'ready'));
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
                redo();
            } else {
                undo();
            }
        } else if (isCtrlOrCmd && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            redo();
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
  }, [undo, redo]);

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
    if (isDrawing) {
      setIsDrawing(false);
      strokePointsRef.current = [];
      saveMaskState();
    }
  };

  const draw = (e: React.MouseEvent) => {
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

  const runGeneration = async (context: GenerationContext) => {
    // ── 準備黑白遮罩（兩條路都需要） ──────────────────────────
    setIsLoading(true);
    try {
      const bwMaskBase64Url = await createBlackAndWhiteMask(context.baseImageSrc, context.maskDataUrl);

      // ══ 路線 0：本機 LaMa ONNX（Web Worker，不阻塞 UI）══════
      if (inpaintEngine === 'lama') {
        // Worker 內自行載入 session，主執行緒不凍結
        const result = await runLamaInWorker(context.baseImageSrc, bwMaskBase64Url);
        setPreviewImageSrc(result);
        return;
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
        );

        // GPT Image 2 Edit 原生支援透明遮罩 inpainting，
        // 回傳的整張圖遮罩外區域已由模型自行保留，不需要再做 pixel composite。
        // 強制 composite 反而會因兩張圖透視/色調細微差異造成拼縫變形。
        setPreviewImageSrc(generatedBase64);
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

      const instructionPrefix = `You are provided with TWO images:
- IMAGE 1: The original photo to edit.
- IMAGE 2: A black-and-white mask. WHITE = region to change. BLACK = must remain pixel-perfect identical to IMAGE 1.`;

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

ABSOLUTE CONSTRAINT: Every pixel in BLACK areas of IMAGE 2 must be 100% identical to IMAGE 1. Do not alter anything outside the white mask.`.trim();
      } else {
        textPrompt = `${instructionPrefix}

TASK: GENERATIVE EDITING

Step 1 – Identify: Use IMAGE 2 to locate the WHITE masked region in IMAGE 1.
Step 2 – Edit: Within that region, apply this change: ${context.prompt}.
Step 3 – Integrate: Match the surrounding image's lighting direction, color temperature, perspective, and texture so the edit feels native to the photo.

ABSOLUTE CONSTRAINT: Every pixel in BLACK areas of IMAGE 2 must be 100% identical to IMAGE 1. Do not alter anything outside the white mask.`.trim();
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
      }));

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const generatedBase64 = `data:image/png;base64,${part.inlineData.data}`;
          const finalImageSrc = await compositeImagesPixelPerfect(
            context.baseImageSrc,
            generatedBase64,
            bwMaskBase64Url
          );
          setPreviewImageSrc(finalImageSrc);
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
    // For 'edit', prompt is required unless reference images are provided
    if (type === 'edit' && !prompt.trim() && referenceImages.length === 0) {
      alert("請輸入編輯描述，或上傳參考圖。");
      return;
    }
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    // Check if mask is empty
    const ctx = maskCanvas.getContext('2d');
    // Basic check could go here, but relying on user to draw is okay for now.

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
        onSave('', adjustedImage, element);
    } catch (error) {
        console.error("Error applying adjustments:", error);
        alert("Failed to save image with adjustments. Saving original.");
        onSave('', previewImageSrc || currentImageSrc, element);
    } finally {
        setIsBaking(false);
    }
  };
  
  let cursorClass = 'cursor-crosshair';
  if (isSpacebarPressed || tool === 'hand') {
      cursorClass = isPanning ? 'cursor-grabbing' : 'cursor-grab';
  } else if (previewImageSrc) {
      cursorClass = 'cursor-default';
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
                      const val = e.target.value as 'gpt' | 'gemini' | 'lama';
                      if (val === 'gemini' && !apiKey) return;
                      if (val === 'lama' && !lamaReady) return;
                      setInpaintEngine(val);
                    }}
                    className="appearance-none bg-transparent py-1 pl-2 pr-6 text-[11px] font-bold text-purple-600 focus:outline-none cursor-pointer"
                  >
                    {atlasKey && <option value="gpt">GPT Image 2</option>}
                    <option value="gemini" disabled={!apiKey}>Gemini{!apiKey ? ' (需 Key)' : ''}</option>
                    <option value="lama" disabled={!lamaReady}>本機 LaMa{!lamaReady ? ' (未下載)' : ''}</option>
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
              onMouseDown={startDrawing}
              onMouseUp={finishDrawing}
              onMouseLeave={finishDrawing}
              onMouseMove={draw}
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
                    width: imageRef.current?.naturalWidth,
                    height: imageRef.current?.naturalHeight,
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'top left',
                  }}
                >
                  <div className="relative w-full h-full" style={imageFilterStyle}>
                    <img ref={imageRef} src={imageSrcForDisplay} alt="Editable" className="block pointer-events-none max-w-none" />
                    {!areAdjustmentsBaked && adjustments.temperature > 0 && <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(255,165,0)', opacity: adjustments.temperature / 100, mixBlendMode: 'overlay' }} />}
                    {!areAdjustmentsBaked && adjustments.temperature < 0 && <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(0,100,255)', opacity: -adjustments.temperature / 100, mixBlendMode: 'overlay' }} />}
                    {!areAdjustmentsBaked && adjustments.tint > 0 && <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(255,0,255)', opacity: adjustments.tint / 100, mixBlendMode: 'overlay' }} />}
                    {!areAdjustmentsBaked && adjustments.tint < 0 && <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(0,255,0)', opacity: -adjustments.tint / 100, mixBlendMode: 'overlay' }} />}
                  </div>
                  <canvas ref={maskCanvasRef} className={`absolute top-0 left-0 pointer-events-none transition-opacity duration-200 ${isMaskVisible ? 'opacity-100' : 'opacity-0'}`} />
                </div>
              )}

              {/* ── Floating pill toolbar ── */}
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
                      {/* Tool buttons */}
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => setTool('brush')}
                          className={`img-editor-tool-btn w-8 h-8 flex items-center justify-center${tool === 'brush' ? ' active' : ''}`}
                          title="筆刷"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></svg>
                        </button>
                        <button
                          onClick={() => setTool('eraser')}
                          className={`img-editor-tool-btn w-8 h-8 flex items-center justify-center${tool === 'eraser' ? ' active' : ''}`}
                          title="橡皮擦"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" /><line x1="22" y1="21" x2="7" y2="21" /><line x1="5" y1="11" x2="14" y2="20" /></svg>
                        </button>
                        <button
                          onClick={() => setTool('hand')}
                          className={`img-editor-tool-btn w-8 h-8 flex items-center justify-center${tool === 'hand' ? ' active' : ''}`}
                          title="抓手"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" /><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" /><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" /></svg>
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
                              onClick={() => setBrushSize(size)}
                              className={`rounded-full cursor-pointer transition-all ${dotSizeMap[size] || 'w-3 h-3'} ${brushSize === size ? 'bg-[#1e293b]' : 'bg-[#cbd5e1] hover:bg-[#94a3b8]'}`}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="w-px h-5 bg-gray-200" />

                      {/* Actions */}
                      <div className="flex items-center gap-0.5">
                        <button onClick={undo} disabled={!canUndo} className="img-editor-tool-btn w-8 h-8 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed" title="復原"><EditIcons.Undo /></button>
                        <button onClick={redo} disabled={!canRedo} className="img-editor-tool-btn w-8 h-8 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed" title="重做"><EditIcons.Redo /></button>
                        <button onClick={clearMask} className="img-editor-tool-btn w-8 h-8 flex items-center justify-center hover:text-red-500" title="清除遮罩"><EditIcons.Trash /></button>
                        <button
                          onClick={() => setIsMaskVisible(!isMaskVisible)}
                          className={`img-editor-tool-btn w-8 h-8 flex items-center justify-center${isMaskVisible ? ' text-purple-600 bg-purple-50' : ''}`}
                          title={isMaskVisible ? '隱藏遮罩' : '顯示遮罩'}
                        >
                          {isMaskVisible ? <EditIcons.Eye /> : <EditIcons.EyeOff />}
                        </button>
                      </div>

                      <div className="w-px h-5 bg-gray-200" />

                      {/* Zoom % */}
                      <span className="text-[12px] text-gray-500 font-medium w-9 text-right tabular-nums">{(zoom * 100).toFixed(0)}%</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── AI Command card (hidden in preview mode) ── */}
            {!previewImageSrc && (
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
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                          上傳
                        </button>
                        {canvasImages.filter(img => img.id !== element.id).length > 0 && (
                          <button
                            onClick={() => setShowCanvasPicker(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-[12px] font-medium text-gray-600 transition-colors"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
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
                </div>

                <div className="w-px bg-gray-100 flex-shrink-0" />

                {/* Right: action buttons */}
                <div className="flex flex-col gap-2 w-[124px] justify-center flex-shrink-0">
                  <button
                    onClick={() => { setPendingAction('edit'); handleSubmit('edit'); }}
                    disabled={isLoading || isBaking}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white text-[13px] font-bold rounded-xl shadow-md transition-all hover:shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-wait"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                    編輯物件
                  </button>
                  <button
                    onClick={() => { setPendingAction('remove'); handleSubmit('remove'); }}
                    disabled={isLoading || isBaking}
                    className="w-full py-2.5 bg-white border-2 border-red-100 hover:bg-red-50 text-red-500 text-[13px] font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-wait"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                    移除物件
                  </button>
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                儲存圖片
              </button>
            </div>
          </div>
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
