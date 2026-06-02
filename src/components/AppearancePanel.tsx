import React from 'react';
import { CanvasElement, FadeDirection, SimpleFadeOptions, BlendMode } from '../types';

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
      onUpdate({ fade: { direction, intensity: fade?.intensity ?? 50 } });
    }
  };

  const handleFadeIntensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (element.type !== 'image' || !fade) return;
    onUpdate({ fade: { ...fade, intensity: parseInt(e.target.value, 10) } });
  };

  const directions: { value: FadeDirection; icon: React.ReactNode }[] = [
    {
      value: 'none',
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <circle cx="7" cy="7" r="5"/>
          <line x1="3.5" y1="3.5" x2="10.5" y2="10.5"/>
        </svg>
      ),
    },
    {
      value: 'top',
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <line x1="7" y1="10" x2="7" y2="3"/>
          <polyline points="4.5 5.5 7 3 9.5 5.5"/>
          <line x1="3" y1="12" x2="11" y2="12" strokeDasharray="1.5 1.5"/>
        </svg>
      ),
    },
    {
      value: 'bottom',
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <line x1="7" y1="4" x2="7" y2="11"/>
          <polyline points="4.5 8.5 7 11 9.5 8.5"/>
          <line x1="3" y1="2" x2="11" y2="2" strokeDasharray="1.5 1.5"/>
        </svg>
      ),
    },
    {
      value: 'left',
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <line x1="10" y1="7" x2="3" y2="7"/>
          <polyline points="5.5 4.5 3 7 5.5 9.5"/>
          <line x1="12" y1="3" x2="12" y2="11" strokeDasharray="1.5 1.5"/>
        </svg>
      ),
    },
    {
      value: 'right',
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="7" x2="11" y2="7"/>
          <polyline points="8.5 4.5 11 7 8.5 9.5"/>
          <line x1="2" y1="3" x2="2" y2="11" strokeDasharray="1.5 1.5"/>
        </svg>
      ),
    },
    {
      value: 'radial',
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="7" cy="7" r="2"/>
          <circle cx="7" cy="7" r="5" strokeDasharray="2 1.5"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">

      {/* 不透明度 */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-[11px] font-medium text-gray-500">不透明度</label>
          <span className="text-[11px] text-gray-500">{Math.round(opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(opacity * 100)}
          onChange={handleOpacityChange}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#3b82f6]"
        />
      </div>

      {/* 混合模式 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-gray-500">混合模式</label>
        <div className="relative">
          <select
            value={element.blendMode || 'normal'}
            onChange={(e) => onUpdate({ blendMode: e.target.value as BlendMode })}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-700 cursor-pointer appearance-none hover:bg-[#f1f5f9] focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100 transition-colors shadow-sm"
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
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </div>
        </div>
      </div>

      {/* 陰影（圖片限定） */}
      {element.type === 'image' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-medium text-gray-500">陰影</label>
            <button
              onClick={() => onUpdate({ shadowEnabled: !(element as any).shadowEnabled } as any)}
              onPointerDown={(e) => e.stopPropagation()}
              className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                (element as any).shadowEnabled ? 'bg-[#22c55e]' : 'bg-gray-200'
              }`}
            >
              <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] shadow-sm transition-transform ${
                (element as any).shadowEnabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
              }`} />
            </button>
          </div>

          {(element as any).shadowEnabled && (
            <div className="flex flex-col gap-2 pl-0">
              <div className="flex items-center justify-between">
                <label className="text-[11px] text-gray-500">顏色</label>
                <input
                  type="color"
                  value={(element as any).shadowColor || '#000000'}
                  onChange={(e) => onUpdate({ shadowColor: e.target.value } as any)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="w-7 h-7 rounded-lg border border-gray-200 cursor-pointer"
                />
              </div>
              {[
                { key: 'shadowBlur', label: '模糊', min: 0, max: 50, default: 10, unit: 'px' },
                { key: 'shadowOffsetX', label: 'X 偏移', min: -30, max: 30, default: 4, unit: 'px' },
                { key: 'shadowOffsetY', label: 'Y 偏移', min: -30, max: 30, default: 4, unit: 'px' },
              ].map(({ key, label, min, max, default: def, unit }) => (
                <div key={key}>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] text-gray-500">{label}</label>
                    <span className="text-[11px] text-gray-400">{(element as any)[key] ?? def}{unit}</span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    value={(element as any)[key] ?? def}
                    onChange={(e) => onUpdate({ [key]: parseInt(e.target.value, 10) } as any)}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#3b82f6]"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 淡出工具（圖片限定） */}
      {element.type === 'image' && (
        <div>
          <label className="text-[11px] font-medium text-gray-500 block mb-2">淡出工具</label>
          {/* fade-tool-group 樣式：灰框容器 + 等寬按鈕 */}
          <div className="flex gap-1 bg-[#f8fafc] p-1 rounded-[10px] border border-[#e2e8f0]">
            {directions.map((dir) => {
              const isActive = (fade?.direction || 'none') === dir.value;
              return (
                <button
                  key={dir.value}
                  onClick={() => handleFadeDirectionChange(dir.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                  title={dir.value}
                  className={`flex-1 h-8 rounded-[6px] flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-white shadow-sm text-[#3b82f6]'
                      : 'text-gray-500 hover:bg-[#e2e8f0]'
                  }`}
                >
                  {dir.icon}
                </button>
              );
            })}
          </div>

          {fade && fade.direction !== 'none' && (
            <div className="mt-3">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] text-gray-500">邊緣柔和度</label>
                <span className="text-[11px] text-gray-400">{fade.intensity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={fade.intensity}
                onChange={handleFadeIntensityChange}
                onPointerDown={(e) => e.stopPropagation()}
                className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#3b82f6]"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
