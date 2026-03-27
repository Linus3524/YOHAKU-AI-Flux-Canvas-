import React, { useState, useEffect, useRef } from 'react';
import type { TextElement } from '../types';

interface TextPropertyPanelProps {
  element: TextElement;
  onUpdate: (updates: Partial<TextElement>) => void;
  onClose: () => void;
}

// ... (Imports and Icons remain unchanged) ...
const FONTS = [
  { name: 'Noto Sans TC', label: '思源黑體', family: '"Noto Sans TC", sans-serif' },
  { name: 'Noto Serif TC', label: '思源宋體', family: '"Noto Serif TC", serif' },
  { name: 'Roboto', label: 'Roboto', family: '"Roboto", sans-serif' },
  { name: 'Open Sans', label: 'Open Sans', family: '"Open Sans", sans-serif' },
  { name: 'Lato', label: 'Lato', family: '"Lato", sans-serif' },
  { name: 'Montserrat', label: 'Montserrat', family: '"Montserrat", sans-serif' },
  { name: 'Noto Sans JP', label: 'Noto Sans JP', family: '"Noto Sans JP", sans-serif' },
  { name: 'Sawarabi Mincho', label: 'Sawarabi Mincho', family: '"Sawarabi Mincho", serif' },
];
const FONT_SIZES = [12, 14, 18, 24, 30, 36, 48, 60, 72, 96, 128];
const PRESET_COLORS = ['#1D1D1F', '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#AF52DE', '#8E8E93', '#FFFFFF', 'transparent'];

const Icons = {
    Bold: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>,
    Italic: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>,
    Underline: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path><line x1="4" y1="21" x2="20" y2="21"></line></svg>,
    AlignLeft: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>,
    AlignCenter: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line></svg>,
    AlignRight: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>,
    More: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>,
    Check: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
    Close: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
    Grip: () => <svg width="8" height="16" viewBox="0 0 8 16" fill="currentColor" className="text-black/10"><circle cx="2" cy="2" r="1.5"/><circle cx="2" cy="8" r="1.5"/><circle cx="2" cy="14" r="1.5"/><circle cx="6" cy="2" r="1.5"/><circle cx="6" cy="8" r="1.5"/><circle cx="6" cy="14" r="1.5"/></svg>,
    ChevronDown: () => <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>,
    TextHorizontal: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16M4 12l4-4m-4 4l4 4"/></svg>,
    TextVertical: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16M12 4l-4 4m4-4l4 4"/></svg>
}

// Slider Control
const SliderControl = ({ label, value, onChange, min, max, step = 1, unit = "" }: { label: string, value: number, onChange: (val: number) => void, min: number, max: number, step?: number, unit?: string }) => (
    <div className="flex flex-col gap-1 w-full">
        <div className="flex justify-between items-center">
             <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider">{label}</span>
             <span className="text-[10px] font-mono text-[#1D1D1F]">{value.toFixed(step < 1 ? 2 : 0)}{unit}</span>
        </div>
        <input 
            type="range" 
            min={min} 
            max={max} 
            step={step}
            value={value} 
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
        />
    </div>
);

// Color Picker
const ColorPickerButton = ({ color, onChange, label }: { color: string | undefined, onChange: (c: string) => void, label?: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="relative flex flex-col gap-1">
             {label && <span className="text-[9px] font-bold text-[#86868B] uppercase tracking-wider">{label}</span>}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-8 h-8 rounded-lg border border-black/10 shadow-sm flex items-center justify-center hover:scale-105 transition-transform bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==')]"
            >
                 <div className="w-full h-full rounded-lg" style={{ backgroundColor: color || 'transparent' }} />
            </button>
            {isOpen && (
                <div 
                    className="absolute bottom-full left-0 mb-3 bg-white p-3 rounded-xl shadow-xl border border-gray-100 grid grid-cols-5 gap-2 w-48 cursor-default z-50"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                     <div className="col-span-5 flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Select Color</span>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-black">&times;</button>
                     </div>
                    {PRESET_COLORS.map(c => (
                        <button
                            key={c}
                            onClick={() => { onChange(c); setIsOpen(false); }}
                            className={`w-6 h-6 rounded-full border border-black/5 hover:scale-110 transition-transform bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==')]`}
                        >
                            <div className="w-full h-full rounded-full" style={{ backgroundColor: c }} />
                        </button>
                    ))}
                    <label className="w-6 h-6 rounded-full border border-gray-200 bg-white flex items-center justify-center cursor-pointer hover:bg-gray-50 text-[10px] text-black">
                        +
                        <input 
                            type="color" 
                            value={color === 'transparent' ? '#ffffff' : (color || '#000000')} 
                            onChange={(e) => onChange(e.target.value)}
                            className="hidden"
                        />
                    </label>
                </div>
            )}
        </div>
    )
}

export const TextPropertyPanel: React.FC<TextPropertyPanelProps> = ({ element, onUpdate, onClose }) => {
    const initialElementState = useRef<TextElement>(element);
    const [showMore, setShowMore] = useState(false);
    
    // Draggable State
    const [position, setPosition] = useState({ x: window.innerWidth / 2 - 190, y: window.innerHeight - 320 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        initialElementState.current = element;
        setShowMore(false);
    }, [element.id]);

    // --- NEW HANDLER: Toggle Writing Mode with Auto-Resize ---
    const handleWritingModeChange = (mode: 'horizontal' | 'vertical') => {
        if (mode === element.writingMode) return;
        
        // Swap width and height for better UX when switching orientation
        const newWidth = element.height;
        const newHeight = element.width;
        
        onUpdate({ 
            writingMode: mode,
            width: newWidth,
            height: newHeight
        });
    };

    const handleDone = () => {
        onClose();
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT' || (e.target as HTMLElement).tagName === 'OPTION' || (e.target as HTMLElement).closest('button')) return;
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

    return (
        <div 
            className="fixed z-[1000] bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-gray-100 p-2 flex flex-col gap-2 min-w-[340px] animate-fade-in-up transition-shadow duration-200"
            style={{ 
                left: position.x, 
                top: position.y,
                cursor: isDragging ? 'grabbing' : 'default',
                boxShadow: isDragging ? '0 20px 60px rgba(0,0,0,0.2)' : '0 10px 40px rgba(0,0,0,0.15)'
            }}
            onMouseDown={handleMouseDown}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Primary Row: Font, Size, Color, Toggle */}
            <div className="flex items-center gap-2">
                <div className="px-1 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors">
                    <Icons.Grip />
                </div>

                <div className="relative group">
                    <select 
                        value={element.fontFamily}
                        onChange={(e) => onUpdate({ fontFamily: e.target.value })}
                        onMouseDown={(e) => e.stopPropagation()} 
                        className="appearance-none bg-[#F5F5F7] hover:bg-gray-100 text-[#1D1D1F] text-sm font-medium rounded-lg pl-3 pr-8 py-2 outline-none cursor-pointer w-32 truncate transition-colors"
                        style={{ fontFamily: element.fontFamily }}
                    >
                        {FONTS.map(f => (
                            <option key={f.name} value={f.family} style={{ fontFamily: f.family }}>
                                {f.label}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <Icons.ChevronDown />
                    </div>
                </div>

                <div className="relative group">
                    <select 
                        value={element.fontSize}
                        onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
                        onMouseDown={(e) => e.stopPropagation()} 
                        className="appearance-none bg-[#F5F5F7] hover:bg-gray-100 text-[#1D1D1F] text-sm font-medium rounded-lg pl-3 pr-7 py-2 outline-none cursor-pointer w-18 transition-colors"
                    >
                        {FONT_SIZES.map(size => (
                            <option key={size} value={size}>{size}</option>
                        ))}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <Icons.ChevronDown />
                    </div>
                </div>

                <div className="w-px h-6 bg-gray-200" />

                <ColorPickerButton color={element.color} onChange={(c) => onUpdate({ color: c })} />

                <div className="flex-1" />
                
                <button 
                    onClick={() => setShowMore(!showMore)} 
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-[#1D1D1F] transition-colors ${showMore ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                >
                    <Icons.More />
                </button>

                <button onClick={handleDone} onMouseDown={(e) => e.stopPropagation()} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#AF52DE] bg-purple-50 hover:bg-[#AF52DE] hover:text-white transition-colors">
                    <Icons.Check />
                </button>
            </div>

            {/* Expanded Options - Cleaner Layout */}
            {showMore && (
                <div className="flex flex-col gap-3 p-1 pt-2" onMouseDown={(e) => e.stopPropagation()}>
                    <div className="h-px bg-gray-100 w-full" />
                    
                    {/* Section 1: Alignment & Style */}
                    <div className="flex items-center justify-between">
                         <div className="flex bg-[#F5F5F7] rounded-lg p-0.5">
                             <button onClick={() => handleWritingModeChange('horizontal')} className={`p-1.5 rounded-md transition-all ${(!element.writingMode || element.writingMode === 'horizontal') ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}><Icons.TextHorizontal /></button>
                             <button onClick={() => handleWritingModeChange('vertical')} className={`p-1.5 rounded-md transition-all ${element.writingMode === 'vertical' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}><Icons.TextVertical /></button>
                         </div>
                         <div className="flex bg-[#F5F5F7] rounded-lg p-0.5">
                            <button onClick={() => onUpdate({ align: 'left' })} className={`p-1.5 rounded-md transition-all ${element.align === 'left' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}><Icons.AlignLeft /></button>
                            <button onClick={() => onUpdate({ align: 'center' })} className={`p-1.5 rounded-md transition-all ${element.align === 'center' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}><Icons.AlignCenter /></button>
                            <button onClick={() => onUpdate({ align: 'right' })} className={`p-1.5 rounded-md transition-all ${element.align === 'right' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}><Icons.AlignRight /></button>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => onUpdate({ isBold: !element.isBold })} className={`p-1.5 rounded-lg transition-all ${element.isBold ? 'bg-black text-white' : 'hover:bg-gray-100 text-[#1D1D1F]'}`}><Icons.Bold /></button>
                            <button onClick={() => onUpdate({ isItalic: !element.isItalic })} className={`p-1.5 rounded-lg transition-all ${element.isItalic ? 'bg-black text-white' : 'hover:bg-gray-100 text-[#1D1D1F]'}`}><Icons.Italic /></button>
                            <button onClick={() => onUpdate({ isUnderline: !element.isUnderline })} className={`p-1.5 rounded-lg transition-all ${element.isUnderline ? 'bg-black text-white' : 'hover:bg-gray-100 text-[#1D1D1F]'}`}><Icons.Underline /></button>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 w-full" />

                    {/* Section 2: Spacing & Layout Sliders */}
                    <div className="grid grid-cols-2 gap-4">
                        <SliderControl label="行距" value={element.lineHeight} onChange={(val) => onUpdate({ lineHeight: val })} min={0.8} max={3.0} step={0.1} />
                        <SliderControl label="字距" value={element.letterSpacing} onChange={(val) => onUpdate({ letterSpacing: val })} min={-0.1} max={0.5} step={0.01} />
                    </div>

                    <div className="h-px bg-gray-100 w-full" />

                    {/* Section 3: Colors & Effects */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <div className="flex items-center gap-3">
                            <ColorPickerButton label="邊框" color={element.strokeColor} onChange={(c) => onUpdate({ strokeColor: c })} />
                            <SliderControl label="粗細" value={element.strokeWidth || 0} onChange={(val) => onUpdate({ strokeWidth: val })} min={0} max={20} />
                        </div>
                        <div className="flex items-center gap-3">
                            <ColorPickerButton label="背景" color={element.backgroundColor} onChange={(c) => onUpdate({ backgroundColor: c })} />
                            <div className="flex-1"></div> {/* Spacer */}
                        </div>
                        <div className="flex items-center gap-3">
                            <ColorPickerButton label="陰影" color={element.shadowColor} onChange={(c) => onUpdate({ shadowColor: c })} />
                            <SliderControl label="模糊" value={element.shadowBlur || 0} onChange={(val) => onUpdate({ shadowBlur: val })} min={0} max={50} />
                        </div>
                        <div className="flex items-center gap-3">
                            <ColorPickerButton label="光暈" color={element.glowColor} onChange={(c) => onUpdate({ glowColor: c })} />
                            <SliderControl label="強度" value={element.glowBlur || 0} onChange={(val) => onUpdate({ glowBlur: val })} min={0} max={50} />
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 w-full" />

                    {/* Section 4: Curve */}
                    <div className="w-full">
                        <SliderControl 
                            label="曲線" 
                            value={element.curveStrength || 0} 
                            onChange={(val) => onUpdate({ curveStrength: val })} 
                            min={-100} 
                            max={100} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};