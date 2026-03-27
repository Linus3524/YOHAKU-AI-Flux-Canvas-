
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import type { ImageElement, Point } from '../types';

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


// Helper functions for image adjustments - place outside component
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [r * 255, g * 255, b * 255];
}


interface ImageEditModalProps {
  element: ImageElement;
  onSave: (elementId: string, dataUrl: string) => void;
  onClose: () => void;
  ai: GoogleGenAI | null;
}

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
const MASK_COLOR = 'rgba(255, 59, 48, 0.4)'; // Clean Red
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 5;

const AdjustmentSlider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  onReset: () => void;
}> = ({ label, value, min, max, onChange, onReset }) => (
  <div className="w-full">
    <div className="flex justify-between items-center mb-1.5">
      <label className="text-xs font-bold text-[#86868B] uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-2">
         <span className="text-xs font-mono text-[#1D1D1F] w-8 text-right">{value.toFixed(0)}</span>
         <button onClick={onReset} className="text-[10px] text-[#007AFF] hover:underline opacity-80 hover:opacity-100 transition-opacity">重置</button>
      </div>
    </div>
    <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black hover:accent-gray-800 transition-all"
    />
  </div>
);


export const ImageEditModal: React.FC<ImageEditModalProps> = ({ element, onSave, onClose, ai }) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const strokePointsRef = useRef<Point[]>([]);

  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  
  const [currentImageSrc, setCurrentImageSrc] = useState(element.src);
  const [previewImageSrc, setPreviewImageSrc] = useState<string | null>(null);
  const [adjustedPreviewSrc, setAdjustedPreviewSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBaking, setIsBaking] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isMaskVisible, setIsMaskVisible] = useState(true);
  
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
    if (e.button !== 0 || previewImageSrc) return;
    if (isSpacebarPressed) {
        setIsPanning(true);
        panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        return;
    }
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
  
  const compositeImageWithMask = useCallback(async (baseSrc: string, maskDataUrl: string): Promise<string> => {
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

    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = image.naturalWidth;
    compositeCanvas.height = image.naturalHeight;
    const ctx = compositeCanvas.getContext('2d');
    if (!ctx) throw new Error("Could not create canvas context");

    ctx.drawImage(image, 0, 0);
    // Draw mask on top
    ctx.drawImage(maskImage, 0, 0);
    
    return compositeCanvas.toDataURL('image/png');
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


  const runGeneration = async (context: GenerationContext) => {
    if (!ai) {
      alert("AI 未初始化。");
      return;
    }
    setIsLoading(true);
    try {
      const compositeImageBase64 = await compositeImageWithMask(context.baseImageSrc, context.maskDataUrl);
      const [header, data] = compositeImageBase64.split(',');
      const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
      const imagePart = { inlineData: { data, mimeType } };

      let textPrompt = '';
      const instructionPrefix = "The semi-transparent red overlay in the image indicates the target selection area. You MUST remove the red overlay completely and seamlessly in the final output. ";
      
      if (context.type === 'remove') {
        textPrompt = `${instructionPrefix} Carefully remove the object or area marked by the red overlay, and realistically fill in the background (inpainting).`;
      } else {
        textPrompt = `${instructionPrefix} In the area marked by the red overlay, ${context.prompt}. Make it look natural and seamless.`;
      }
      const textPart = { text: textPrompt };

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [imagePart, textPart] },
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          setPreviewImageSrc(`data:image/png;base64,${part.inlineData.data}`);
          return;
        }
      }
      throw new Error("AI did not return an image.");

    } catch (error) {
      console.error("Error editing image:", error);
      alert("編輯圖片失敗。請檢查控制台以取得詳細資訊。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (type: 'remove' | 'edit') => {
    if (type === 'edit' && !prompt.trim()) {
      alert("請輸入編輯描述。");
      return;
    }
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    // Check if mask is empty
    const ctx = maskCanvas.getContext('2d');
    const pixelData = ctx?.getImageData(0, 0, 1, 1).data; // Very rough check, ideally scan
    // A better check would be tracking if any drawing happened, but let's assume user drew something if they are clicking edit

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
    }
  };
  
  const handleDiscardPreview = () => {
    setPreviewImageSrc(null);
    setGenerationContext(null);
    setEditorSetupKey(prev => prev + 1);
  };
  
  const handleSave = async () => {
    setIsBaking(true);
    try {
        const baseImageForSave = previewImageSrc || currentImageSrc;
        const adjustedImage = await applyAdjustmentsToImage(baseImageForSave, adjustments);
        onSave(element.id, adjustedImage);
    } catch (error) {
        console.error("Error applying adjustments:", error);
        alert("Failed to save image with adjustments. Saving original.");
        onSave(element.id, previewImageSrc || currentImageSrc);
    } finally {
        setIsBaking(false);
    }
  };
  
  let cursorClass = 'cursor-crosshair';
  if (isSpacebarPressed) {
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


  return (
    <div className="absolute inset-0 z-40 bg-[#F5F5F7]/90 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col overflow-hidden border border-black/5" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white flex-shrink-0">
          <h2 className="text-xl font-bold text-[#1D1D1F]">編輯圖片 (Nano Banana Pro)</h2>
          <button onClick={onClose} className="text-[#86868B] hover:text-[#1D1D1F] text-2xl leading-none transition-colors">&times;</button>
        </div>
        
        <div className="flex flex-row flex-grow min-h-0">
            <div
                ref={containerRef}
                className={`flex-grow p-6 bg-[#FAFAFA] overflow-hidden relative select-none ${cursorClass}`}
                onMouseDown={startDrawing}
                onMouseUp={finishDrawing}
                onMouseLeave={finishDrawing}
                onMouseMove={draw}
                onWheel={handleWheel}
            >
            {(isLoading || isBaking || isAdjusting) && (
                    <div className="absolute inset-0 z-30 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center text-[#1D1D1F]">
                        <svg className="animate-spin h-10 w-10 text-black mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-lg font-semibold">{isAdjusting ? "套用調整中..." : (isBaking && !isLoading ? "套用調整中..." : "正在編輯...")}</p>
                    </div>
                )}
                
                {previewImageSrc ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <img src={previewImageSrc} alt="Preview" className="object-contain max-w-full max-h-full shadow-lg rounded-lg" />
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
                        <div className="relative w-full h-full shadow-2xl shadow-black/5" style={imageFilterStyle}>
                            <img ref={imageRef} src={imageSrcForDisplay} alt="Editable" className="block pointer-events-none max-w-none" />
                             {!areAdjustmentsBaked && adjustments.temperature > 0 && (
                                <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(255, 165, 0)', opacity: adjustments.temperature / 100, mixBlendMode: 'overlay' }} />
                            )}
                            {!areAdjustmentsBaked && adjustments.temperature < 0 && (
                                <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(0, 100, 255)', opacity: -adjustments.temperature / 100, mixBlendMode: 'overlay' }} />
                            )}
                             {!areAdjustmentsBaked && adjustments.tint > 0 && (
                                <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(255, 0, 255)', opacity: adjustments.tint / 100, mixBlendMode: 'overlay' }} />
                            )}
                            {!areAdjustmentsBaked && adjustments.tint < 0 && (
                                <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(0, 255, 0)', opacity: -adjustments.tint / 100, mixBlendMode: 'overlay' }} />
                            )}
                        </div>
                        <canvas
                            ref={maskCanvasRef}
                            className={`absolute top-0 left-0 pointer-events-none transition-opacity duration-200 ${isMaskVisible ? 'opacity-100' : 'opacity-0'}`}
                        />
                    </div>
                )}
            </div>

            <div className="w-80 flex-shrink-0 border-l border-gray-100 bg-white flex flex-col">
                 <div className="flex-grow p-6 space-y-6 overflow-y-auto">
                    <div className="flex items-center justify-between">
                         <h3 className="text-sm font-bold text-[#1D1D1F] uppercase tracking-wider">調整參數</h3>
                         <button onClick={() => setAdjustments(defaultAdjustments)} className="text-xs text-[#007AFF] hover:underline">重置所有</button>
                    </div>
                    
                    <div className="space-y-4">
                     <AdjustmentSlider label="亮度 (Brightness)" value={adjustments.brightness} min={0} max={200} onChange={val => setAdjustments(a => ({...a, brightness: val}))} onReset={() => setAdjustments(a => ({...a, brightness: 100}))} />
                     <AdjustmentSlider label="對比 (Contrast)" value={adjustments.contrast} min={0} max={200} onChange={val => setAdjustments(a => ({...a, contrast: val}))} onReset={() => setAdjustments(a => ({...a, contrast: 100}))} />
                     <AdjustmentSlider label="飽和度 (Saturation)" value={adjustments.saturation} min={0} max={200} onChange={val => setAdjustments(a => ({...a, saturation: val}))} onReset={() => setAdjustments(a => ({...a, saturation: 100}))} />
                    </div>

                    <div className="h-px bg-gray-100 w-full" />

                    <div className="space-y-4">
                     <AdjustmentSlider label="色溫 (Temperature)" value={adjustments.temperature} min={-100} max={100} onChange={val => setAdjustments(a => ({...a, temperature: val}))} onReset={() => setAdjustments(a => ({...a, temperature: 0}))} />
                     <AdjustmentSlider label="色調 (Tint)" value={adjustments.tint} min={-100} max={100} onChange={val => setAdjustments(a => ({...a, tint: val}))} onReset={() => setAdjustments(a => ({...a, tint: 0}))} />
                    </div>

                    <div className="h-px bg-gray-100 w-full" />

                    <div className="space-y-4">
                     <AdjustmentSlider label="亮部 (Highlight)" value={adjustments.highlight} min={-100} max={100} onChange={val => setAdjustments(a => ({...a, highlight: val}))} onReset={() => setAdjustments(a => ({...a, highlight: 0}))} />
                     <AdjustmentSlider label="陰影 (Shadow)" value={adjustments.shadow} min={-100} max={100} onChange={val => setAdjustments(a => ({...a, shadow: val}))} onReset={() => setAdjustments(a => ({...a, shadow: 0}))} />
                     <AdjustmentSlider label="銳化 (Sharpness)" value={adjustments.sharpness} min={0} max={100} onChange={val => setAdjustments(a => ({...a, sharpness: val}))} onReset={() => setAdjustments(a => ({...a, sharpness: 0}))} />
                    </div>
                 </div>
            </div>
        </div>


        <div className="p-5 border-t border-gray-100 flex flex-wrap items-center gap-4 bg-white flex-shrink-0">
         {previewImageSrc ? (
            <div className="w-full flex items-center justify-between">
                <p className="text-sm font-semibold text-[#1D1D1F]">預覽結果</p>
                <div className="flex items-center gap-3">
                    <button onClick={handleDiscardPreview} disabled={isLoading} className="px-4 py-2 text-sm font-medium text-[#1D1D1F] bg-[#F5F5F7] hover:bg-[#E5E5E5] rounded-full transition-all">捨棄</button>
                    <button onClick={handleRegenerate} disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-full transition-all shadow-md">重新生成</button>
                    <button onClick={handleApplyPreview} disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-full transition-all shadow-md">套用並繼續</button>
                    <button onClick={handleSave} disabled={isLoading || isBaking} className="px-4 py-2 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-full transition-all shadow-md">儲存至畫布</button>
                </div>
            </div>
         ) : (
            <>
              <div className="w-full flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <div className="flex items-center bg-[#F5F5F7] rounded-full p-1 border border-gray-100">
                        <button onClick={() => setTool('brush')} className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${tool === 'brush' ? 'bg-black text-white shadow-md' : 'text-[#86868B] hover:text-[#1D1D1F]'}`}>筆刷</button>
                        <button onClick={() => setTool('eraser')} className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${tool === 'eraser' ? 'bg-black text-white shadow-md' : 'text-[#86868B] hover:text-[#1D1D1F]'}`}>橡皮擦</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#86868B] uppercase tracking-wider">筆刷大小</span>
                      <div className="flex items-center gap-1 bg-[#F5F5F7] p-1 rounded-full border border-gray-100">
                          {BRUSH_SIZES.map(size => (
                              <button key={size} onClick={() => setBrushSize(size)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${brushSize === size ? 'bg-white shadow-sm ring-1 ring-black/5' : 'hover:bg-white/50'}`}>
                                  <span className="block rounded-full bg-[#1D1D1F]" style={{ width: size/2, height: size/2 }}></span>
                              </button>
                          ))}
                      </div>
                    </div>
                     <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                       <div className="flex items-center gap-2 text-sm">
                           <span className="text-[#86868B]">縮放</span>
                           <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step="0.01" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-20 accent-black" />
                           <span className="w-10 text-right font-mono text-[#1D1D1F]">{(zoom * 100).toFixed(0)}%</span>
                       </div>
                    </div>
                    <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
                      <button onClick={undo} disabled={!canUndo} className="p-2 rounded-full text-[#1D1D1F] hover:bg-[#F5F5F7] disabled:text-gray-300 disabled:bg-transparent transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg></button>
                      <button onClick={redo} disabled={!canRedo} className="p-2 rounded-full text-[#1D1D1F] hover:bg-[#F5F5F7] disabled:text-gray-300 disabled:bg-transparent transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg></button>
                      <button onClick={clearMask} className="px-3 py-1.5 text-xs font-medium text-[#1D1D1F] bg-[#F5F5F7] hover:bg-[#E5E5E5] rounded-lg ml-2">清除筆跡</button>
                       <button 
                            onClick={() => setIsMaskVisible(!isMaskVisible)} 
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ml-2 ${isMaskVisible ? 'bg-red-50 text-red-600 border-red-100' : 'bg-white text-[#86868B] border-gray-200 hover:border-gray-300'}`}
                        >
                            {isMaskVisible ? '隱藏遮罩' : '顯示遮罩'}
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#1D1D1F] bg-[#F5F5F7] hover:bg-[#E5E5E5] rounded-full transition-all">取消</button>
                    <button onClick={handleSave} disabled={isBaking} className="px-4 py-2 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-full transition-all shadow-lg shadow-black/5">儲存至畫布</button>
                </div>
              </div>

              <div className="w-full flex items-center gap-3 mt-2">
                <input type="text" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="✨ 描述您的編輯內容 (例如: 戴著一頂紅色的帽子)..." className="flex-grow p-3 bg-[#F5F5F7] border border-transparent focus:bg-white focus:border-black/10 focus:ring-4 focus:ring-black/5 rounded-xl transition-all outline-none text-sm" />
                <button onClick={() => handleSubmit('edit')} disabled={isLoading || isBaking} className="px-5 py-2.5 text-sm font-medium text-white bg-[#AF52DE] hover:bg-[#9F42CE] rounded-full transition-all shadow-md disabled:opacity-50 disabled:cursor-wait">編輯物件</button>
                <button onClick={() => handleSubmit('remove')} disabled={isLoading || isBaking} className="px-5 py-2.5 text-sm font-medium text-white bg-[#FF3B30] hover:bg-[#E6352B] rounded-full transition-all shadow-md disabled:opacity-50 disabled:cursor-wait">移除物件</button>
              </div>
            </>
         )}
        </div>
      </div>
    </div>
  );
};
