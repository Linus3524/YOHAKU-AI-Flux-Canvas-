
import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { DrawingElement, Point } from '../types';

interface DrawingModalProps {
  element: DrawingElement;
  onSave: (elementId: string, dataUrl: string) => void;
  onClose: () => void;
}

const BRUSH_SIZES = [2, 5, 10, 20, 30];
const COLORS = ['#1D1D1F', '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#AF52DE', '#FF2D55'];

// Use a large, fixed-size canvas for a better drawing experience
const CANVAS_INTERNAL_WIDTH = 1200;
const CANVAS_INTERNAL_HEIGHT = 900;


export const DrawingModal: React.FC<DrawingModalProps> = ({ element, onSave, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
  const [color, setColor] = useState('#1D1D1F');
  const [brushSize, setBrushSize] = useState(5);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Undo/Redo state
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const saveHistoryState = useCallback(() => {
    const context = contextRef.current;
    if (!context) return;
    const imageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
    
    setHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1);
        return [...newHistory, imageData];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const undo = useCallback(() => {
    if (canUndo) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        if (contextRef.current && history[newIndex]) {
            contextRef.current.putImageData(history[newIndex], 0, 0);
        }
    }
  }, [canUndo, history, historyIndex]);

  const redo = useCallback(() => {
    if (canRedo) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        if (contextRef.current && history[newIndex]) {
            contextRef.current.putImageData(history[newIndex], 0, 0);
        }
    }
  }, [canRedo, history, historyIndex]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set a fixed internal resolution for the canvas
    canvas.width = CANVAS_INTERNAL_WIDTH;
    canvas.height = CANVAS_INTERNAL_HEIGHT;

    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.lineCap = 'round';
    context.lineJoin = 'round';
    contextRef.current = context;

    const loadAndInitialize = () => {
        // We do NOT fill with white anymore to support transparency
        context.clearRect(0, 0, canvas.width, canvas.height);

        if (element.src) {
            const img = new Image();
            img.onload = () => {
                context.drawImage(img, 0, 0, canvas.width, canvas.height);
                saveHistoryState();
            };
            img.src = element.src;
        } else {
            saveHistoryState();
        }
    };
    
    loadAndInitialize();
  }, [element.src]);

    // Keyboard shortcuts for undo/redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
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

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [undo, redo]);


  const getCanvasPoint = useCallback((e: React.MouseEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent) => {
    const point = getCanvasPoint(e);
    const context = contextRef.current;
    if (!point || !context) return;

    context.strokeStyle = color;
    context.lineWidth = brushSize;
    context.globalCompositeOperation = tool === 'pencil' ? 'source-over' : 'destination-out';
    context.beginPath();
    context.moveTo(point.x, point.y);
    setIsDrawing(true);
  }, [tool, color, brushSize, getCanvasPoint]);

  const finishDrawing = useCallback(() => {
    if (isDrawing) {
      contextRef.current?.closePath();
      setIsDrawing(false);
      saveHistoryState();
    }
  }, [isDrawing, saveHistoryState]);

  const draw = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return;
    const point = getCanvasPoint(e);
    const context = contextRef.current;
    if (!point || !context) return;
    
    context.lineTo(point.x, point.y);
    context.stroke();
  }, [isDrawing, getCanvasPoint]);
  
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (canvas && context) {
      // Clear to transparent
      context.clearRect(0, 0, canvas.width, canvas.height);
      saveHistoryState();
    }
  };

  const handleSave = () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onSave(element.id, dataUrl);
    }
  };
  
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setColor(e.target.value);
  }

  return (
    <div className="absolute inset-0 z-40 bg-[#F5F5F7]/90 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border border-black/5" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white flex-shrink-0">
          <h2 className="text-xl font-bold text-[#1D1D1F]">繪圖板 (透明背景)</h2>
          <button onClick={onClose} className="text-[#86868B] hover:text-[#1D1D1F] text-2xl leading-none transition-colors">&times;</button>
        </div>

        <div className="p-3 border-b border-gray-100 flex flex-wrap items-center gap-6 bg-[#FAFAFA] flex-shrink-0">
            {/* Tools */}
            <div className="flex items-center bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                <button onClick={() => setTool('pencil')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${tool === 'pencil' ? 'bg-black text-white shadow-md' : 'text-[#86868B] hover:bg-gray-50'}`}>鉛筆</button>
                <button onClick={() => setTool('eraser')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${tool === 'eraser' ? 'bg-black text-white shadow-md' : 'text-[#86868B] hover:bg-gray-50'}`}>橡皮擦</button>
            </div>
            
            {/* Undo/Redo */}
            <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
                <button onClick={undo} disabled={!canUndo} className="p-2 rounded-full text-[#1D1D1F] hover:bg-white hover:shadow-sm disabled:text-gray-300 disabled:bg-transparent transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                </button>
                <button onClick={redo} disabled={!canRedo} className="p-2 rounded-full text-[#1D1D1F] hover:bg-white hover:shadow-sm disabled:text-gray-300 disabled:bg-transparent transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
                </button>
            </div>

            {/* Brush Size */}
            <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#86868B] uppercase tracking-wider">筆刷</span>
                <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-gray-200">
                    {BRUSH_SIZES.map(size => (
                        <button key={size} onClick={() => setBrushSize(size)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${brushSize === size ? 'bg-[#F5F5F7] ring-1 ring-black' : 'hover:bg-[#F5F5F7]'}`}>
                            <span className="block rounded-full bg-[#1D1D1F]" style={{ width: Math.max(4, size/2), height: Math.max(4, size/2) }}></span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Color */}
            <div className="flex items-center gap-3 ml-auto">
                <span className="text-xs font-bold text-[#86868B] uppercase tracking-wider">顏色</span>
                <div className="flex items-center -space-x-1">
                    {COLORS.map(c => (
                         <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 border-white ring-1 ring-black/5 shadow-sm hover:z-10 hover:scale-110 transition-all ${color === c ? 'z-20 scale-110 ring-2 ring-black' : ''}`} style={{ backgroundColor: c }} />
                    ))}
                </div>
                <div className="relative ml-2">
                    <button onClick={() => setShowColorPicker(!showColorPicker)} className="w-8 h-8 rounded-full border border-gray-300 bg-white flex items-center justify-center text-xs text-gray-500 hover:border-black transition-colors">
                        +
                    </button>
                     {showColorPicker && (
                        <div className="absolute top-full mt-2 right-0 z-10 p-2 bg-white rounded-xl shadow-xl border border-gray-100">
                            <input type="color" value={color} onChange={handleColorChange} className="w-8 h-8 p-0 border-none cursor-pointer bg-transparent" />
                        </div>
                    )}
                </div>
            </div>
             <button onClick={clearCanvas} className="ml-2 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">清除畫布</button>
        </div>
        
        {/* Added checkered background to visualize transparency */}
        <div className="flex-grow p-8 bg-[#F5F5F7] flex items-center justify-center overflow-auto bg-[radial-gradient(#C1C1C5_1px,transparent_1px)] [background-size:16px_16px]">
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseUp={finishDrawing}
                onMouseLeave={finishDrawing}
                onMouseMove={draw}
                className="bg-transparent shadow-[0_8px_30px_rgba(0,0,0,0.05)] rounded-lg cursor-crosshair max-w-full max-h-full border border-black/5"
            />
        </div>

        <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-white flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-[#1D1D1F] bg-[#F5F5F7] hover:bg-[#E5E5E5] rounded-full transition-all">取消</button>
          <button onClick={handleSave} className="px-5 py-2.5 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-full shadow-lg shadow-black/5 transition-all">儲存繪圖</button>
        </div>
      </div>
    </div>
  );
};
