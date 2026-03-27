import React, { useState, useEffect, useRef } from 'react';
import type { ArrowElement, ArrowHeadType } from '../types';
import { COLORS } from '../utils/helpers';

interface ArrowPropertyPanelProps {
  element: ArrowElement;
  onUpdate: (updates: Partial<ArrowElement>) => void;
  onClose: () => void;
}

// Preset Colors from Shape/Text Panel for consistency
const PRESET_COLORS = ['#1D1D1F', '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#AF52DE', '#8E8E93', '#FFFFFF', 'transparent'];

const Icons = {
    Close: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
    Grip: () => <svg width="8" height="16" viewBox="0 0 8 16" fill="currentColor" className="text-black/10"><circle cx="2" cy="2" r="1.5"/><circle cx="2" cy="8" r="1.5"/><circle cx="2" cy="14" r="1.5"/><circle cx="6" cy="2" r="1.5"/><circle cx="6" cy="8" r="1.5"/><circle cx="6" cy="14" r="1.5"/></svg>,
    Solid: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="12" x2="22" y2="12" /></svg>,
    Dashed: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h4M10 12h4M18 12h4" /></svg>,
    Dotted: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="2" y1="12" x2="2" y2="12" /><line x1="8" y1="12" x2="8" y2="12" /><line x1="14" y1="12" x2="14" y2="12" /><line x1="20" y1="12" x2="20" y2="12" /></svg>,
    HeadNone: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="12" x2="22" y2="12" /></svg>,
    HeadTriangle: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M22 12L2 2v20l20-10z" /></svg>,
    HeadArrow: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="10 18 22 12 10 6" /><line x1="22" y1="12" x2="2" y2="12" /></svg>,
    HeadCircle: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="8" /></svg>,
};

export const ArrowPropertyPanel: React.FC<ArrowPropertyPanelProps> = ({ element, onUpdate, onClose }) => {
    // Draggable State
    const [position, setPosition] = useState({ x: window.innerWidth / 2 - 160, y: window.innerHeight - 280 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const [showColorPicker, setShowColorPicker] = useState(false);

    const handleMouseDown = (e: React.MouseEvent) => {
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

    // Parse color to hex for the color picker input if it's a tailwind class
    const getColorValue = (color: string) => {
        if (color.startsWith('#')) return color;
        if (color.startsWith('text-[')) return color.match(/text-\[(.*?)\]/)?.[1] || '#000000';
        const found = COLORS.find(c => c.text === color || c.bg === color);
        // Fallback to black if unknown
        return found ? (found.bg.match(/bg-\[(.*?)\]/)?.[1] || '#000000') : '#000000';
    };

    const handleColorChange = (newColor: string) => {
        onUpdate({ color: newColor });
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
                    <div className="w-full h-full rounded-lg" style={{ backgroundColor: getColorValue(currentColor) }} />
                </button>
            </div>
            {isVisible && (
                <div 
                    className="absolute bottom-full left-0 mb-3 bg-white p-3 rounded-xl shadow-xl border border-gray-100 grid grid-cols-5 gap-2 w-48 cursor-default z-50"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {PRESET_COLORS.filter(c => c !== 'transparent').map(c => (
                        <button
                            key={c}
                            onClick={() => { onChange(c); toggle(); }}
                            className={`w-6 h-6 rounded-full border border-black/5 hover:scale-110 transition-transform ${getColorValue(currentColor) === c ? 'ring-2 ring-black ring-offset-1' : ''}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                    <label className="w-6 h-6 rounded-full border border-gray-200 bg-white flex items-center justify-center cursor-pointer hover:bg-gray-50 text-[10px] text-black">
                        +
                        <input 
                            type="color" 
                            value={getColorValue(currentColor)} 
                            onChange={(e) => onChange(e.target.value)}
                            className="hidden"
                        />
                    </label>
                </div>
            )}
        </div>
    );

    return (
        <div 
            className="fixed z-[1000] bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-gray-100 p-3 flex flex-col gap-3 min-w-[320px] animate-fade-in-up"
            style={{ 
                left: position.x, 
                top: position.y,
                cursor: isDragging ? 'grabbing' : 'default',
            }}
            onMouseDown={handleMouseDown}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header Row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="px-1 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors">
                        <Icons.Grip />
                    </div>
                    <span className="text-xs font-bold text-[#86868B] uppercase tracking-wider">線條設定</span>
                </div>
                <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors">
                    <Icons.Close />
                </button>
            </div>

            <div className="h-px bg-gray-100 w-full" />

            {/* Row 1: Color & Width */}
            <div className="flex items-center gap-4">
                {/* Unified Color Picker */}
                {renderColorPicker(
                    element.color,
                    handleColorChange,
                    showColorPicker,
                    () => setShowColorPicker(!showColorPicker),
                    "顏色"
                )}

                <div className="flex flex-col gap-1 flex-1">
                    <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider">粗細</span>
                    <div className="flex bg-[#F5F5F7] rounded-lg p-0.5 justify-between">
                        {[2, 4, 6, 8, 12].map((width) => (
                            <button 
                                key={width}
                                onClick={() => onUpdate({ strokeWidth: width })}
                                className={`w-8 h-7 flex items-center justify-center rounded-md transition-all ${element.strokeWidth === width ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <div className="bg-current rounded-full" style={{ width: width + 2, height: width + 2, maxHeight: 14, maxWidth: 14 }} />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Row 2: Stroke Style */}
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider">樣式</span>
                <div className="flex bg-[#F5F5F7] rounded-lg p-0.5">
                    <button onClick={() => onUpdate({ strokeStyle: 'solid' })} className={`flex-1 py-1.5 rounded-md flex justify-center transition-all ${element.strokeStyle === 'solid' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}><Icons.Solid /></button>
                    <button onClick={() => onUpdate({ strokeStyle: 'dashed' })} className={`flex-1 py-1.5 rounded-md flex justify-center transition-all ${element.strokeStyle === 'dashed' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}><Icons.Dashed /></button>
                    <button onClick={() => onUpdate({ strokeStyle: 'dotted' })} className={`flex-1 py-1.5 rounded-md flex justify-center transition-all ${element.strokeStyle === 'dotted' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}><Icons.Dotted /></button>
                </div>
            </div>

            {/* Row 3: Arrow Heads */}
            <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1 flex-1">
                    <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider">起點</span>
                    <div className="flex bg-[#F5F5F7] rounded-lg p-0.5">
                        {(['none', 'triangle', 'arrow', 'circle'] as ArrowHeadType[]).map(type => (
                            <button 
                                key={type}
                                onClick={() => onUpdate({ startArrowhead: type })}
                                className={`flex-1 py-1 px-1 rounded-md flex justify-center transition-all ${element.startArrowhead === type ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {type === 'none' && <Icons.HeadNone />}
                                {type === 'triangle' && <Icons.HeadTriangle />}
                                {type === 'arrow' && <Icons.HeadArrow />}
                                {type === 'circle' && <Icons.HeadCircle />}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="flex flex-col gap-1 flex-1">
                    <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider">終點</span>
                    <div className="flex bg-[#F5F5F7] rounded-lg p-0.5">
                        {(['none', 'triangle', 'arrow', 'circle'] as ArrowHeadType[]).map(type => (
                            <button 
                                key={type}
                                onClick={() => onUpdate({ endArrowhead: type })}
                                className={`flex-1 py-1 px-1 rounded-md flex justify-center transition-all ${element.endArrowhead === type ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {type === 'none' && <Icons.HeadNone />}
                                {type === 'triangle' && <Icons.HeadTriangle />}
                                {type === 'arrow' && <Icons.HeadArrow />}
                                {type === 'circle' && <Icons.HeadCircle />}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
};