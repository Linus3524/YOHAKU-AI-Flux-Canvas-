
import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { DrawingElement, Point } from '../types';
import { Pencil, Eraser, Undo, Redo } from 'lucide-react';

interface DrawingModalProps {
  element: DrawingElement;
  onSave: (elementId: string, dataUrl: string) => void;
  onClose: () => void;
}

const COLORS = ['#1D1D1F', '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#AF52DE', '#5AC8FA'];

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
    <div className="fixed inset-0 z-[7000] bg-[#F5F5F7]/95 backdrop-blur-xl flex items-center justify-center overflow-hidden pt-24 pb-6 px-8">

      {/* 頂部置中浮動工具列 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white/85 backdrop-blur-xl border border-black/[0.06] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.05)] rounded-full px-2.5 py-1.5 select-none">

        {/* 工具切換 */}
        <div className="flex items-center gap-1 bg-[#F5F5F7] rounded-full p-1">
          <button onClick={() => setTool('pencil')} title="鉛筆"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${tool === 'pencil' ? 'bg-[#1D1D1F] text-white shadow-md' : 'text-[#86868B] hover:text-[#1D1D1F]'}`}>
            <Pencil size={15} />
          </button>
          <button onClick={() => setTool('eraser')} title="橡皮擦"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${tool === 'eraser' ? 'bg-[#1D1D1F] text-white shadow-md' : 'text-[#86868B] hover:text-[#1D1D1F]'}`}>
            <Eraser size={15} />
          </button>
        </div>

        <div className="w-px h-5 bg-black/[0.08]" />

        {/* 復原 / 重做 */}
        <div className="flex items-center gap-1">
          <button onClick={undo} disabled={!canUndo} title="復原"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#1D1D1F] hover:bg-[#F5F5F7] disabled:opacity-30 disabled:hover:bg-transparent transition-all">
            <Undo size={15} />
          </button>
          <button onClick={redo} disabled={!canRedo} title="重做"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#1D1D1F] hover:bg-[#F5F5F7] disabled:opacity-30 disabled:hover:bg-transparent transition-all">
            <Redo size={15} />
          </button>
        </div>

        <div className="w-px h-5 bg-black/[0.08]" />

        {/* 筆刷粗細 */}
        <div className="flex items-center gap-2.5 px-1">
          <span className="block rounded-full bg-[#1D1D1F] shrink-0" style={{ width: Math.max(4, brushSize / 2), height: Math.max(4, brushSize / 2) }} />
          <input type="range" min={2} max={40} value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} title="筆刷粗細"
            className="drawing-brush-slider w-24 h-1.5 rounded-full appearance-none cursor-pointer bg-[#E2E2E7] accent-[#1D1D1F]" />
        </div>

        <div className="w-px h-5 bg-black/[0.08]" />

        {/* 調色盤 */}
        <div className="flex items-center pl-1">
          {COLORS.map((c, i) => (
            <button key={c} onClick={() => setColor(c)} title={c}
              className={`w-5 h-5 rounded-full border-2 border-white shadow-[0_1px_4px_rgba(0,0,0,0.12)] transition-transform hover:scale-[1.25] hover:-translate-y-0.5 hover:z-10 ${color === c ? 'scale-[1.2] -translate-y-0.5 z-10 ring-2 ring-[#1D1D1F] ring-offset-1' : ''}`}
              style={{ backgroundColor: c, marginLeft: i === 0 ? 0 : -6 }} />
          ))}
          <div className="relative ml-1.5">
            <button onClick={() => setShowColorPicker(!showColorPicker)} title="自訂顏色"
              className="w-5 h-5 rounded-full border border-dashed border-gray-300 bg-white flex items-center justify-center text-xs text-gray-400 hover:border-[#1D1D1F] hover:text-[#1D1D1F] transition-colors">+</button>
            {showColorPicker && (
              <div className="absolute top-full mt-2 right-0 z-10 p-2 bg-white rounded-xl shadow-xl border border-gray-100">
                <input type="color" value={color} onChange={handleColorChange} className="w-9 h-9 p-0 border-none cursor-pointer bg-transparent" />
              </div>
            )}
          </div>
        </div>

        <div className="w-px h-5 bg-black/[0.08]" />

        {/* 清除 */}
        <button onClick={clearCanvas} title="清除畫布"
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#86868B] hover:bg-red-50 hover:text-red-500 transition-all">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>

      {/* 右上角動作：取消 / 儲存 */}
      <div className="absolute top-5 right-5 z-50 flex items-center gap-2">
        <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-[#1D1D1F] bg-white/85 backdrop-blur-xl border border-black/[0.06] shadow-sm hover:bg-white rounded-full transition-all">取消</button>
        <button onClick={handleSave} className="px-5 py-2.5 text-sm font-bold text-white bg-[#1D1D1F] hover:bg-black rounded-full shadow-[0_8px_20px_-6px_rgba(0,0,0,0.4)] transition-all active:scale-95">儲存繪圖</button>
      </div>

      {/* 畫布本體：唯一的「透明紙」，格紋 + 陰影 + 圓角，邊界清楚 */}
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseUp={finishDrawing}
        onMouseLeave={finishDrawing}
        onMouseMove={draw}
        className="rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] ring-1 ring-black/5 cursor-crosshair max-w-full max-h-full bg-[radial-gradient(#D8D8DD_1px,transparent_1px)] [background-size:16px_16px] bg-white/40"
      />
    </div>
  );
};
