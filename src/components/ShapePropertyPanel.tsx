
import React, { useState, useEffect, useRef } from 'react';
import type { ShapeElement } from '../types';
import { AdvancedColorPicker } from './AdvancedColorPicker'; // ✅ 新增
import { Icon } from './Icon';

interface ShapePropertyPanelProps {
  element: ShapeElement;
  onUpdate: (updates: Partial<ShapeElement>) => void;
  onClose: () => void;
}

const PRESET_COLORS = ['#1D1D1F', '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#AF52DE', '#8E8E93', '#E5E5EA', '#FFFFFF', 'transparent'];

const Icons = {
    Grip: () => <Icon name="drag_indicator" size={16} className="text-black/20" />,
    Check: () => <Icon name="check" size={14} />,
    Close: () => <Icon name="close" size={14} />,
    Solid: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="12" x2="22" y2="12" /></svg>,
    Dashed: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h4M10 12h4M18 12h4" /></svg>,
    Dotted: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="2" y1="12" x2="2" y2="12" /><line x1="8" y1="12" x2="8" y2="12" /><line x1="14" y1="12" x2="14" y2="12" /><line x1="20" y1="12" x2="20" y2="12" /></svg>,
    Link: () => <Icon name="link" size={12} />,
    Unlink: () => <Icon name="link_off" size={12} />,
};

export const ShapePropertyPanel: React.FC<ShapePropertyPanelProps> = ({ element, onUpdate, onClose }) => {
    // Draggable State
    const [position, setPosition] = useState({ x: window.innerWidth / 2 - 200, y: window.innerHeight - 280 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const [showFillPicker, setShowFillPicker] = useState(false);
    const [showStrokePicker, setShowStrokePicker] = useState(false);

    // --- NEW STATE: Constrain Proportions ---
    const [constrainProportions, setConstrainProportions] = useState(true);

    const handleMouseDown = (e: React.MouseEvent) => {
        // Allow interacting with inputs/selects inside without dragging
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            e.preventDefault();
            setPosition({
                x: e.clientX - dragStartRef.current.x,
                y: e.clientY - dragStartRef.current.y
            });
        };
        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    // --- NEW HANDLERS: Size Adjustment ---
    const handleWidthChange = (w: number) => {
        if (w <= 0) return;
        if (constrainProportions) {
            const ratio = element.height / element.width;
            onUpdate({ width: w, height: w * ratio });
        } else {
            onUpdate({ width: w });
        }
    };

    const handleHeightChange = (h: number) => {
        if (h <= 0) return;
        if (constrainProportions) {
            const ratio = element.width / element.height;
            onUpdate({ height: h, width: h * ratio });
        } else {
            onUpdate({ height: h });
        }
    };

    const renderColorPicker = (
        currentColor: string, 
        onChange: (c: string) => void, 
        isVisible: boolean, 
        toggle: () => void,
        label: string
    ) => (
        <div className="relative">
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider">{label}</span>
                <button 
                    onClick={toggle}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-8 h-8 rounded-lg border border-black/10 shadow-sm flex items-center justify-center hover:scale-105 transition-transform bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==')]"
                >
                    <div className="w-full h-full rounded-lg" style={{ backgroundColor: currentColor }} />
                </button>
            </div>
            {isVisible && (
                <div 
                    className="absolute bottom-full left-0 mb-3 bg-white p-3 rounded-xl shadow-xl border border-gray-100 grid grid-cols-5 gap-2 w-48 cursor-default z-50"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {PRESET_COLORS.map(c => (
                        c === 'transparent' ? (
                            <button
                                key={c}
                                onClick={() => { onChange(c); toggle(); }}
                                className={`w-6 h-6 rounded-full border border-black/5 hover:scale-110 transition-transform overflow-hidden ${currentColor === c ? 'ring-2 ring-black ring-offset-1' : ''}`}
                                style={{ background: 'repeating-conic-gradient(#D1D1D6 0% 25%, #FFFFFF 0% 50%) 0 0 / 6px 6px' }}
                                title="透明（無色）"
                            />
                        ) : (
                            <button
                                key={c}
                                onClick={() => { onChange(c); toggle(); }}
                                className={`w-6 h-6 rounded-full border border-black/5 hover:scale-110 transition-transform ${currentColor === c ? 'ring-2 ring-black ring-offset-1' : ''}`}
                                style={{ backgroundColor: c }}
                                title={c}
                            />
                        )
                    ))}
                    <label className="w-6 h-6 rounded-full border border-gray-200 bg-white flex items-center justify-center cursor-pointer hover:bg-gray-50 text-[10px] text-black relative overflow-hidden">
                        +
                        <input
                            type="color"
                            value={currentColor === 'transparent' ? '#ffffff' : currentColor}
                            onChange={(e) => onChange(e.target.value)}
                            style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                        />
                    </label>
                </div>
            )}
        </div>
    );

    return (
        <div
            className="fixed z-[1000] bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-gray-100 p-2.5 flex items-end gap-2.5 animate-fade-in-up"
            style={{
                left: position.x,
                top: position.y,
                cursor: isDragging ? 'grabbing' : 'default',
            }}
            onMouseDown={handleMouseDown}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Drag Handle */}
            <div className="pb-2 px-0.5 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors">
                <Icons.Grip />
            </div>

            {/* 尺寸：W ⇄ H 單一膠囊，比例鎖內嵌 */}
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider">尺寸</span>
                <div className="flex items-center h-8 bg-[#F5F5F7] rounded-lg px-1.5">
                    <span className="text-[9px] font-bold text-[#86868B] select-none">W</span>
                    <input
                        type="number"
                        value={Math.round(element.width)}
                        onChange={(e) => handleWidthChange(Number(e.target.value))}
                        className="w-10 bg-transparent text-xs font-mono text-[#1D1D1F] outline-none text-right pr-1"
                    />
                    <button
                        onClick={() => setConstrainProportions(!constrainProportions)}
                        className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${constrainProportions ? 'text-[#AF52DE]' : 'text-gray-300 hover:text-gray-500'}`}
                        title={constrainProportions ? "解鎖比例" : "鎖定比例"}
                    >
                        {constrainProportions ? <Icons.Link /> : <Icons.Unlink />}
                    </button>
                    <span className="text-[9px] font-bold text-[#86868B] select-none ml-1">H</span>
                    <input
                        type="number"
                        value={Math.round(element.height)}
                        onChange={(e) => handleHeightChange(Number(e.target.value))}
                        className="w-10 bg-transparent text-xs font-mono text-[#1D1D1F] outline-none text-right pr-1"
                    />
                </div>
            </div>

            <div className="w-px h-6 bg-gray-200 self-end mb-1" />

            {/* Colors */}
            <AdvancedColorPicker
                value={element.fillColor}
                onChange={(c) => onUpdate({ fillColor: c })}
                label="填充"
            />

            {renderColorPicker(
                element.strokeColor,
                (c) => onUpdate({ strokeColor: c }),
                showStrokePicker,
                () => { setShowStrokePicker(!showStrokePicker); setShowFillPicker(false); },
                "邊框"
            )}

            <div className="w-px h-6 bg-gray-200 self-end mb-1" />

            {/* Stroke Width */}
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider">粗細</span>
                <div className="flex h-8 bg-[#F5F5F7] rounded-lg p-0.5">
                    {[2, 6, 12].map((width) => (
                        <button
                            key={width}
                            onClick={() => onUpdate({ strokeWidth: width })}
                            className={`w-7 flex items-center justify-center rounded-md transition-all ${element.strokeWidth === width ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <div className="bg-current rounded-full" style={{ width: width + 2, height: width + 2, maxHeight: 14, maxWidth: 14 }} />
                        </button>
                    ))}
                </div>
            </div>

            {/* Stroke Style */}
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider">樣式</span>
                <div className="flex h-8 bg-[#F5F5F7] rounded-lg p-0.5">
                    <button onClick={() => onUpdate({ strokeStyle: 'solid' })} className={`w-7 flex items-center justify-center rounded-md transition-all ${element.strokeStyle === 'solid' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}><Icons.Solid /></button>
                    <button onClick={() => onUpdate({ strokeStyle: 'dashed' })} className={`w-7 flex items-center justify-center rounded-md transition-all ${element.strokeStyle === 'dashed' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}><Icons.Dashed /></button>
                    <button onClick={() => onUpdate({ strokeStyle: 'dotted' })} className={`w-7 flex items-center justify-center rounded-md transition-all ${element.strokeStyle === 'dotted' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}><Icons.Dotted /></button>
                </div>
            </div>

            <div className="w-px h-6 bg-gray-200 self-end mb-1" />

            <button onClick={onClose} onMouseDown={(e) => e.stopPropagation()} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors">
                <Icons.Close />
            </button>
        </div>
    );
};
