import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import type { CanvasElement } from '../types';

interface ImageResizeModalProps {
  element: CanvasElement;
  onResize: (elementId: string, width: number, height: number) => void;
  onClose: () => void;
}

export const ImageResizeModal: React.FC<ImageResizeModalProps> = ({ element, onResize, onClose }) => {
  const originalWidth = Math.round(element.width);
  const originalHeight = Math.round(element.height);
  const ratio = element.width / element.height;

  const [width, setWidth] = useState<string>(String(originalWidth));
  const [height, setHeight] = useState<string>(String(originalHeight));
  const [locked, setLocked] = useState<boolean>(true);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  // 載入圖片真實原始解析度
  useEffect(() => {
    if ((element.type === 'image' || element.type === 'drawing') && (element as any).src) {
      const img = new Image();
      img.onload = () => {
        setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      };
      img.src = (element as any).src;
    }
  }, [element]);

  // 當比例鎖定開啟，且寬度變更時自動推算高度
  const handleWidthChange = (valStr: string) => {
    setWidth(valStr);
    if (valStr === '') return;
    const val = parseFloat(valStr);
    if (!isNaN(val) && locked) {
      setHeight(String(Math.round(val / ratio)));
    }
  };

  // 當比例鎖定開啟，且高度變更時自動推算寬度
  const handleHeightChange = (valStr: string) => {
    setHeight(valStr);
    if (valStr === '') return;
    const val = parseFloat(valStr);
    if (!isNaN(val) && locked) {
      setWidth(String(Math.round(val * ratio)));
    }
  };

  // 比例鎖定開關切換時，強制以目前寬度對齊高度
  const toggleLock = () => {
    setLocked(prev => {
      const next = !prev;
      if (next) {
        const currentW = parseFloat(width);
        if (!isNaN(currentW)) {
          setHeight(String(Math.round(currentW / ratio)));
        }
      }
      return next;
    });
  };

  // 快捷縮放比率（例如 50%, 150%, 200%, 或是原圖大小）
  const applyPresetScale = (scale: number, isNatural = false) => {
    if (isNatural && naturalSize) {
      setWidth(String(naturalSize.w));
      setHeight(String(naturalSize.h));
    } else {
      const newW = Math.round(originalWidth * scale);
      const newH = Math.round(originalHeight * scale);
      setWidth(String(newW));
      setHeight(String(newH));
    }
  };

  const handleSubmit = () => {
    const finalW = parseFloat(width);
    const finalH = parseFloat(height);
    if (isNaN(finalW) || isNaN(finalH) || finalW <= 0 || finalH <= 0) {
      alert('請輸入有效的寬度與高度數值！');
      return;
    }
    onResize(element.id, finalW, finalH);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[7000] flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/50 w-[380px] p-6"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-[#1D1D1F] text-[15px] mb-1">調整圖片尺寸</h3>
            <p className="text-[11px] text-[#86868B] leading-relaxed">
              精準設定圖片在畫布上的像素大小。
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full hover:bg-black/5 flex items-center justify-center transition-colors"
          >
            <Icon name="close" size={16} className="text-[#86868B]" />
          </button>
        </div>

        {/* Inputs row */}
        <div className="flex items-center gap-3 bg-[#F1F5F9] p-3 rounded-xl mb-4 relative">
          <div className="flex-1 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-[#86868B] tracking-wide">寬度 (Width)</span>
            <div className="flex items-center bg-white border border-[#E2E8F0] rounded-lg px-2 py-1.5 focus-within:border-[#AF52DE] transition-colors">
              <input
                type="text"
                value={width}
                onChange={e => handleWidthChange(e.target.value)}
                className="w-full text-xs font-mono text-[#1E293B] focus:outline-none"
              />
              <span className="text-[10px] text-[#86868B] font-mono ml-1">px</span>
            </div>
          </div>

          {/* Ratio lock chain button */}
          <div className="flex items-center justify-center mt-4">
            <button
              onClick={toggleLock}
              className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                locked
                  ? 'bg-[#AF52DE]/10 border-[#AF52DE]/30 text-[#AF52DE] shadow-[0_2px_6px_rgba(175,82,222,0.1)]'
                  : 'bg-white border-[#E2E8F0] text-[#86868B] hover:border-gray-300'
              }`}
              title={locked ? '解除比例鎖定' : '固定長寬比例'}
            >
              <Icon name={locked ? 'link' : 'link_off'} size={16} />
            </button>
          </div>

          <div className="flex-1 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-[#86868B] tracking-wide">高度 (Height)</span>
            <div className="flex items-center bg-white border border-[#E2E8F0] rounded-lg px-2 py-1.5 focus-within:border-[#AF52DE] transition-colors">
              <input
                type="text"
                value={height}
                onChange={e => handleHeightChange(e.target.value)}
                className="w-full text-xs font-mono text-[#1E293B] focus:outline-none"
              />
              <span className="text-[10px] text-[#86868B] font-mono ml-1">px</span>
            </div>
          </div>
        </div>

        {/* Preset scaling buttons */}
        <div className="mb-5">
          <div className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-2">快速縮放倍率</div>
          <div className="flex gap-2">
            {[
              { label: '50%', scale: 0.5 },
              { label: '原圖大小 (1:1)', scale: 1.0, isNatural: true },
              { label: '150%', scale: 1.5 },
              { label: '200%', scale: 2.0 },
            ].map(p => (
              <button
                key={p.label}
                onClick={() => applyPresetScale(p.scale, p.isNatural)}
                disabled={p.isNatural && !naturalSize}
                className="flex-1 py-1 rounded-lg border border-[#E2E8F0] bg-white text-[10px] font-semibold text-gray-600 hover:border-[#AF52DE]/30 hover:bg-[#AF52DE]/5 hover:text-[#AF52DE] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Size comparison info */}
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 mb-5 text-[11px] text-[#64748B] flex flex-col gap-1">
          <div className="flex justify-between">
            <span>畫布當前尺寸：</span>
            <span className="font-mono text-gray-800 font-semibold">{originalWidth} × {originalHeight} px</span>
          </div>
          {naturalSize && (
            <div className="flex justify-between">
              <span>圖片原始尺寸：</span>
              <span className="font-mono text-gray-800 font-semibold">{naturalSize.w} × {naturalSize.h} px</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>調整後尺寸：</span>
            <span className="font-mono text-[#AF52DE] font-semibold">
              {width || '?' } × {height || '?'} px
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2 rounded-xl bg-[#AF52DE] text-white text-[12px] font-bold hover:bg-[#9a3fc7] transition-colors shadow-[0_4px_12px_rgba(175,82,222,0.15)]"
          >
            套用尺寸
          </button>
        </div>
      </div>
    </div>
  );
};
