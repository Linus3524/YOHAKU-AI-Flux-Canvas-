import type React from 'react';

export const AdjustmentSlider: React.FC<{
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
