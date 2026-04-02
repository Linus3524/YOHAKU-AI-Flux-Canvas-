import React, { useState, useEffect, useRef } from 'react';
import { isGradient, parseLinearGradient, buildLinearGradientCSS } from '../utils/gradientUtils';

interface AdvancedColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

const COMMON_COLORS = [
  '#000000', '#8E8E93', '#E5E5EA', '#FFFFFF',
  '#FF3B30', '#FF9500', '#34C759', '#007AFF'
];

export const AdvancedColorPicker: React.FC<AdvancedColorPickerProps> = ({ value, onChange, label }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  
  // 初始化邏輯
  const initialIsGrad = isGradient(value);
  const [mode, setMode] = useState<'solid' | 'gradient'>(initialIsGrad ? 'gradient' : 'solid');
  
  const [solidColor, setSolidColor] = useState(initialIsGrad ? '#000000' : value);
  
  const parsedGrad = initialIsGrad ? parseLinearGradient(value) : null;
  const [gradColor1, setGradColor1] = useState(parsedGrad?.color1 || '#000000');
  const [gradColor2, setGradColor2] = useState(parsedGrad?.color2 || '#ffffff');
  const [gradAngle, setGradAngle] = useState(parsedGrad?.angle ?? 90);

  // 點擊外部關閉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSolidChange = (c: string) => {
    setSolidColor(c);
    onChange(c);
  };

  const handleGradChange = (a: number, c1: string, c2: string) => {
    setGradAngle(a);
    setGradColor1(c1);
    setGradColor2(c2);
    onChange(buildLinearGradientCSS(a, c1, c2));
  };

  return (
    <div className="relative flex flex-col gap-1" ref={containerRef}>
      {label && <span className="text-[9px] font-bold text-[#86868B] uppercase tracking-wider">{label}</span>}
      
      {/* 觸發按鈕 */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-8 h-8 rounded-lg border border-black/10 shadow-sm flex items-center justify-center hover:scale-105 transition-transform bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==')]"
      >
        <div 
          className="w-full h-full rounded-lg" 
          style={isGradient(value) ? { backgroundImage: value } : { backgroundColor: value || 'transparent' }} 
        />
      </button>

      {/* 展開後的 picker 面板 */}
      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-2 bg-white p-3 rounded-xl shadow-xl border border-gray-100 w-56 z-50 cursor-default"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* 頂部切換列 */}
          <div className="flex bg-[#F5F5F7] p-1 rounded-lg mb-3">
            <button 
              className={`flex-1 text-xs py-1.5 text-center transition-colors ${mode === 'solid' ? 'bg-[#007AFF] text-white rounded-md shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => {
                setMode('solid');
                onChange(solidColor);
              }}
            >
              純色
            </button>
            <button 
              className={`flex-1 text-xs py-1.5 text-center transition-colors ${mode === 'gradient' ? 'bg-[#007AFF] text-white rounded-md shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => {
                setMode('gradient');
                onChange(buildLinearGradientCSS(gradAngle, gradColor1, gradColor2));
              }}
            >
              漸層
            </button>
          </div>

          {/* 純色模式 */}
          {mode === 'solid' && (
            <div className="grid grid-cols-4 gap-2">
              {/* 自訂顏色 */}
              <label className="w-8 h-8 rounded-full border border-black/10 bg-white flex items-center justify-center cursor-pointer hover:scale-110 transition-transform mx-auto relative overflow-hidden">
                <span className="text-sm text-[#86868B] font-light leading-none">+</span>
                <input
                  type="color"
                  value={solidColor === 'transparent' ? '#ffffff' : solidColor}
                  onChange={(e) => handleSolidChange(e.target.value)}
                  style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                />
              </label>
              {/* 透明選項 */}
              <button
                className={`w-8 h-8 rounded-full border border-black/10 hover:scale-110 transition-transform mx-auto overflow-hidden ${solidColor === 'transparent' ? 'ring-2 ring-black ring-offset-1' : ''}`}
                style={{ background: 'repeating-conic-gradient(#D1D1D6 0% 25%, #FFFFFF 0% 50%) 0 0 / 8px 8px' }}
                onClick={() => handleSolidChange('transparent')}
                title="透明（無色）"
              />
              {COMMON_COLORS.map(c => (
                <button
                  key={c}
                  className={`w-8 h-8 rounded-full border border-black/10 hover:scale-110 transition-transform mx-auto ${solidColor === c ? 'ring-2 ring-black ring-offset-1' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => handleSolidChange(c)}
                />
              ))}
            </div>
          )}

          {/* 漸層模式 */}
          {mode === 'gradient' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#86868B]">起點</span>
                <input 
                  type="color" 
                  value={gradColor1} 
                  onChange={(e) => handleGradChange(gradAngle, e.target.value, gradColor2)} 
                  className="w-8 h-8 cursor-pointer rounded border-0 p-0" 
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#86868B]">終點</span>
                <input 
                  type="color" 
                  value={gradColor2} 
                  onChange={(e) => handleGradChange(gradAngle, gradColor1, e.target.value)} 
                  className="w-8 h-8 cursor-pointer rounded border-0 p-0" 
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="text-xs text-[#86868B]">角度</span>
                  <span className="text-xs text-[#1D1D1F] font-medium">{gradAngle}°</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="360" 
                  value={gradAngle} 
                  onChange={(e) => handleGradChange(Number(e.target.value), gradColor1, gradColor2)}
                  className="w-full accent-[#007AFF]"
                />
              </div>
              {/* 即時預覽條 */}
              <div 
                className="w-full h-4 rounded border border-black/10 mt-1"
                style={{ backgroundImage: buildLinearGradientCSS(gradAngle, gradColor1, gradColor2) }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
