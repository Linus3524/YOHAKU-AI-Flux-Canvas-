import React, { useState, useEffect, useRef } from 'react';
import { isGradient, parseLinearGradient, buildLinearGradientCSS } from '../utils/gradientUtils';

interface AdvancedColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  /** solid = 實心色塊（填充）；ring = 挖空方框，只有外框帶色（邊框）*/
  variant?: 'solid' | 'ring';
  /** 面板標題，也用於無障礙標籤 */
  title?: string;
}

const COMMON_COLORS = [
  '#1D1D1F', '#FF3B30', '#FF9500', '#FFCC00',
  '#34C759', '#007AFF', '#AF52DE', '#8E8E93',
  '#E5E5EA', '#FFFFFF'
];

export const AdvancedColorPicker: React.FC<AdvancedColorPickerProps> = ({ value, onChange, label, variant = 'solid', title = '填充' }) => {
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

  const isTransparent = !value || value === 'transparent';

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
    <div className="relative flex flex-col items-center" ref={containerRef}>
      {label && <span className="text-[9px] font-bold text-[#86868B] uppercase tracking-wider">{label}</span>}
      
      {/* 觸發按鈕 */}
      {variant === 'ring' ? (
        /* 邊框：挖空方框 — 外圈上色（支援漸層），中心以面板底色打洞 */
        <button
          onClick={() => setIsOpen(!isOpen)}
          onMouseDown={(e) => e.stopPropagation()}
          className="relative w-7 h-7 rounded-lg overflow-hidden hover:scale-105 transition-transform"
          style={isTransparent ? { border: '2px dashed #C7C7CC' } : undefined}
          aria-label={title}
        >
          {!isTransparent && (
            <>
              <div
                className="absolute inset-0"
                style={isGradient(value) ? { backgroundImage: value } : { backgroundColor: value }}
              />
              <div className="absolute inset-[4px] rounded-[4px] bg-white" />
            </>
          )}
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          onMouseDown={(e) => e.stopPropagation()}
          className="relative w-7 h-7 rounded-lg overflow-hidden ring-1 ring-inset ring-black/10 hover:scale-105 transition-transform bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==')]"
          aria-label={title}
        >
          <div
            className="absolute inset-0"
            style={isGradient(value) ? { backgroundImage: value } : { backgroundColor: value || 'transparent' }}
          />
        </button>
      )}

      {/* 展開後的 picker 面板 */}
      {isOpen && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-white p-3 rounded-xl shadow-xl border border-gray-100 w-48 z-50 cursor-default"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* 標題列（與「邊框」色票面板一致）*/}
          <div className="flex justify-between items-center pb-1 mb-2 border-b border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{title}</span>
            <button onClick={() => setIsOpen(false)} className="text-[#86868B] hover:text-black text-xs font-bold">&times;</button>
          </div>

          {/* 頂部切換列 */}
          <div className="flex bg-[#F5F5F7] p-0.5 rounded-lg mb-2.5">
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
            <div className="grid grid-cols-5 gap-2">
              {/* 順序與「邊框」色票一致：顏色 → 透明 → 自訂 */}
              {COMMON_COLORS.map(c => (
                <button
                  key={c}
                  className={`w-6 h-6 rounded-full border border-black/10 hover:scale-110 transition-transform mx-auto ${solidColor === c ? 'ring-2 ring-black ring-offset-1' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => handleSolidChange(c)}
                  title={c}
                />
              ))}
              {/* 透明選項 */}
              <button
                className={`w-6 h-6 rounded-full border border-black/10 hover:scale-110 transition-transform mx-auto overflow-hidden ${solidColor === 'transparent' ? 'ring-2 ring-black ring-offset-1' : ''}`}
                style={{ background: 'repeating-conic-gradient(#D1D1D6 0% 25%, #FFFFFF 0% 50%) 0 0 / 6px 6px' }}
                onClick={() => handleSolidChange('transparent')}
                title="透明（無色）"
              />
              {/* 自訂顏色 */}
              <label className="w-6 h-6 rounded-full border border-gray-200 bg-white flex items-center justify-center cursor-pointer hover:bg-gray-50 text-[10px] text-black mx-auto relative overflow-hidden">
                +
                <input
                  type="color"
                  value={solidColor === 'transparent' ? '#ffffff' : solidColor}
                  onChange={(e) => handleSolidChange(e.target.value)}
                  style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                />
              </label>
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
                  className="w-7 h-7 cursor-pointer rounded border-0 p-0" 
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#86868B]">終點</span>
                <input 
                  type="color" 
                  value={gradColor2} 
                  onChange={(e) => handleGradChange(gradAngle, gradColor1, e.target.value)} 
                  className="w-7 h-7 cursor-pointer rounded border-0 p-0" 
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
