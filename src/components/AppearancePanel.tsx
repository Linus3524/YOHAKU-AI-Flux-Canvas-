import React from 'react';
import { CanvasElement, FadeDirection, SimpleFadeOptions, BlendMode } from '../types'; // ✅ 新增 BlendMode

interface AppearancePanelProps {
  element: CanvasElement;
  onUpdate: (updates: Partial<CanvasElement>) => void;
}

export const AppearancePanel: React.FC<AppearancePanelProps> = ({ element, onUpdate }) => {
  const opacity = element.opacity ?? 1;
  const fade = element.type === 'image' ? element.fade : undefined;

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ opacity: parseInt(e.target.value, 10) / 100 });
  };

  const handleFadeDirectionChange = (direction: FadeDirection) => {
    if (element.type !== 'image') return;
    
    if (direction === 'none') {
      onUpdate({ fade: undefined });
    } else {
      onUpdate({
        fade: {
          direction,
          intensity: fade?.intensity ?? 50,
        },
      });
    }
  };

  const handleFadeIntensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (element.type !== 'image' || !fade) return;
    onUpdate({
      fade: {
        ...fade,
        intensity: parseInt(e.target.value, 10),
      },
    });
  };

  const directions: { value: FadeDirection; label: string; icon: string }[] = [
    { value: 'none', label: 'None', icon: '🚫' },
    { value: 'top', label: 'Top', icon: '⬆️' },
    { value: 'bottom', label: 'Bottom', icon: '⬇️' },
    { value: 'left', label: 'Left', icon: '⬅️' },
    { value: 'right', label: 'Right', icon: '➡️' },
    { value: 'radial', label: 'Radial', icon: '🔘' },
  ];

  return (
    <div className="bg-white border-b border-gray-100 p-4">
      {/* ✅ 移除 <h3 className="text-xs font-semibold text-[#1D1D1F] mb-3">外觀</h3> */}
      
      {/* Opacity Control */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs text-[#374151] font-medium">不透明度 (Opacity)</label>
          <span className="text-xs text-[#374151]">{Math.round(opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(opacity * 100)}
          onChange={handleOpacityChange}
          onPointerDown={(e) => e.stopPropagation()} // ✅ 確保有 onPointerDown 阻止冒泡
          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#007AFF]"
        />
      </div>

      {/* ✅ 新增：混合模式選單 */}
      <div className="flex flex-col gap-1 mb-4">
        <div className="flex justify-between items-center">
          <label className="text-xs text-[#86868B]">混合模式</label>
        </div>
        <select
          value={element.blendMode || 'normal'}
          onChange={(e) => onUpdate({ blendMode: e.target.value as BlendMode })}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-full bg-[#F5F5F7] border-none rounded-lg px-3 py-1.5 text-xs text-[#1D1D1F] cursor-pointer outline-none"
        >
          <optgroup label="預設">
            <option value="normal">正常</option>
          </optgroup>
          <optgroup label="加深">
            <option value="multiply">色彩增值</option>
            <option value="color-burn">顏色加深</option>
          </optgroup>
          <optgroup label="加亮">
            <option value="screen">濾色</option>
            <option value="color-dodge">顏色加亮</option>
          </optgroup>
          <optgroup label="對比">
            <option value="overlay">覆蓋</option>
            <option value="soft-light">柔光</option>
            <option value="hard-light">實光</option>
          </optgroup>
          <optgroup label="差異">
            <option value="difference">差異化</option>
          </optgroup>
          <optgroup label="色彩">
            <option value="hue">色相</option>
            <option value="luminosity">明度</option>
          </optgroup>
        </select>
      </div>

      {/* Fade Controls (Only for images) */}
      {element.type === 'image' && (
        <div>
          <label className="text-xs text-[#86868B] mb-2 block">淡出工具</label> {/* ✅ 修改：淡出工具標籤與樣式 */}
          <div className="grid grid-cols-6 gap-1 mb-3"> {/* ✅ 修改：使用 grid 排列 */}
            {directions.map((dir) => {
              const isActive = (fade?.direction || 'none') === dir.value;
              const strokeColor = isActive ? 'white' : '#374151'; // ✅ 動態 stroke 顏色
              return (
                <button
                  key={dir.value}
                  onClick={() => handleFadeDirectionChange(dir.value)}
                  className={`py-1.5 rounded-md border flex items-center justify-center transition-colors ${
                    isActive ? 'bg-[#007AFF] border-[#007AFF]' : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`} // ✅ 修改：按鈕尺寸與樣式
                  title={dir.label}
                >
                  {dir.value === 'none' && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={strokeColor}> {/* ✅ 修改：SVG icon */}
                      <circle cx="7" cy="7" r="5" strokeWidth="1.3"/>
                      <line x1="3.5" y1="3.5" x2="10.5" y2="10.5" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  )}
                  {dir.value === 'top' && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={strokeColor}> {/* ✅ 修改：SVG icon */}
                      <line x1="7" y1="2" x2="7" y2="10" strokeWidth="1.3" strokeLinecap="round"/>
                      <path d="M4.5 4.5L7 2l2.5 2.5" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="3" y1="12" x2="11" y2="12" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="1.5 1.5"/>
                    </svg>
                  )}
                  {dir.value === 'bottom' && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={strokeColor}> {/* ✅ 修改：SVG icon */}
                      <line x1="7" y1="12" x2="7" y2="4" strokeWidth="1.3" strokeLinecap="round"/>
                      <path d="M4.5 9.5L7 12l2.5-2.5" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="3" y1="2" x2="11" y2="2" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="1.5 1.5"/>
                    </svg>
                  )}
                  {dir.value === 'left' && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={strokeColor}> {/* ✅ 修改：SVG icon */}
                      <line x1="2" y1="7" x2="10" y2="7" strokeWidth="1.3" strokeLinecap="round"/>
                      <path d="M4.5 4.5L2 7l2.5 2.5" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="12" y1="3" x2="12" y2="11" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="1.5 1.5"/>
                    </svg>
                  )}
                  {dir.value === 'right' && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={strokeColor}> {/* ✅ 修改：SVG icon */}
                      <line x1="12" y1="7" x2="4" y2="7" strokeWidth="1.3" strokeLinecap="round"/>
                      <path d="M9.5 4.5L12 7l-2.5 2.5" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="2" y1="3" x2="2" y2="11" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="1.5 1.5"/>
                    </svg>
                  )}
                  {dir.value === 'radial' && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={strokeColor}> {/* ✅ 修改：SVG icon */}
                      <circle cx="7" cy="7" r="2" strokeWidth="1.3"/>
                      <circle cx="7" cy="7" r="5" strokeWidth="1.3" strokeDasharray="2 1.5"/>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {fade && fade.direction !== 'none' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-[#374151] font-medium">邊緣柔和度</label>
                <span className="text-xs text-[#374151]">{fade.intensity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={fade.intensity}
                onChange={handleFadeIntensityChange}
                onPointerDown={(e) => e.stopPropagation()} // ✅ 確保有 onPointerDown 阻止冒泡
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#007AFF]"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
