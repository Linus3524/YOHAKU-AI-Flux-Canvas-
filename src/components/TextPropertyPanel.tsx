
import React, { useState, useEffect, useRef } from 'react';
import type { TextElement } from '../types';

interface TextPropertyPanelProps {
  element: TextElement;
  onUpdate: (updates: Partial<TextElement>) => void;
  onClose: () => void;
}

// Organized Font Groups with new additions
const FONT_GROUPS = [
  {
    label: '繁體中文 - 黑體/無襯線',
    options: [
      { name: 'Noto Sans TC', label: '思源黑體 Noto Sans TC', family: '"Noto Sans TC", sans-serif' },
    ]
  },
  {
    label: '繁體中文 - 明體/楷體',
    options: [
      { name: 'Noto Serif TC', label: '思源宋體 Noto Serif TC', family: '"Noto Serif TC", serif' },
      { name: 'LXGW WenKai TC', label: '霞鶩文楷 TC（楷書）', family: '"LXGW WenKai TC", serif' },
      { name: 'Iansui', label: '芫荽 Iansui（手寫楷）', family: '"Iansui", serif' },
      { name: 'Shippori Mincho', label: 'しっぽり明朝（仿宋）', family: '"Shippori Mincho", serif' },
    ]
  },
  {
    label: '繁體中文 - 特殊風格',
    options: [
      { name: 'Cubic 11', label: '俐方體 Cubic 11（像素）', family: '"Cubic 11", monospace' },
      { name: 'DotGothic16', label: 'Dot 點陣體 DotGothic16', family: '"DotGothic16", sans-serif' },
    ]
  },
  {
    label: '日文/漢字 (兼容繁中)',
    options: [
      { name: 'Chiron GoRound TC', label: '昭源圓體 Chiron GoRound（日系圓體）', family: '"Chiron GoRound TC", sans-serif' },
      { name: 'LINE Seed JP', label: 'LINE Seed JP（LINE 官方）', family: '"LINE Seed JP", sans-serif' },
      { name: 'Kaisei Opti', label: 'Kaisei Opti（古典明體）', family: '"Kaisei Opti", serif' },
      { name: 'Zen Maru Gothic', label: 'Zen 圓體', family: '"Zen Maru Gothic", sans-serif' },
      { name: 'M PLUS Rounded 1c', label: 'M+ 圓體', family: '"M PLUS Rounded 1c", sans-serif' },
      { name: 'Klee One', label: 'Klee 楷體', family: '"Klee One", cursive' },
      { name: 'Hachi Maru Pop', label: 'Hachi 麥克筆', family: '"Hachi Maru Pop", cursive' },
    ]
  },
  {
    label: '英歐文 - 無襯線 (Sans-Serif)',
    options: [
      { name: 'Roboto', label: 'Roboto', family: '"Roboto", sans-serif' },
      { name: 'Open Sans', label: 'Open Sans', family: '"Open Sans", sans-serif' },
      { name: 'Lato', label: 'Lato', family: '"Lato", sans-serif' },
      { name: 'Montserrat', label: 'Montserrat', family: '"Montserrat", sans-serif' },
    ]
  },
  {
    label: '英歐文 - 圓體 (Rounded)',
    options: [
      { name: 'Varela Round', label: 'Varela Round', family: '"Varela Round", sans-serif' },
      { name: 'Nunito', label: 'Nunito', family: '"Nunito", sans-serif' },
    ]
  },
  {
    label: '英歐文 - 襯線/古典 (Serif)',
    options: [
      { name: 'Playfair Display', label: 'Playfair Display (時尚)', family: '"Playfair Display", serif' },
      { name: 'Merriweather', label: 'Merriweather (經典)', family: '"Merriweather", serif' },
      { name: 'Cinzel', label: 'Cinzel (羅馬石刻)', family: '"Cinzel", serif' },
    ]
  },
  {
    label: '英歐文 - 手寫/花體 (Script)',
    options: [
      { name: 'Great Vibes', label: 'Great Vibes (優雅花體)', family: '"Great Vibes", cursive' },
      { name: 'Dancing Script', label: 'Dancing Script (活潑手寫)', family: '"Dancing Script", cursive' },
    ]
  }
];

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

// Simple Slider Control
const SliderControl = ({ label, value, onChange, min, max, step = 1, unit = "", decimals }: { label: string, value: number, onChange: (val: number) => void, min: number, max: number, step?: number, unit?: string, decimals?: number }) => (
    <div className="flex flex-col gap-1 w-full">
        <div className="flex justify-between items-center">
             <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider">{label}</span>
             <span className="text-[10px] font-mono text-[#1D1D1F]">{value.toFixed(decimals ?? (step < 1 ? 2 : 0))}{unit}</span>
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

// Reusable Color Picker
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
        
        // When switching modes, we intelligently swap the dimensions to provide a better starting point
        // for the new orientation. 
        // e.g. Horizontal (300w, 100h) -> Vertical (100w, 300h)
        // This gives the "long narrow box" effect for vertical text immediately.
        const newWidth = element.height;
        const newHeight = element.width;
        
        onUpdate({
            writingMode: mode,
            width: newWidth,
            height: newHeight,
            isWidthLocked: false,
            isHeightLocked: false
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
                        className="appearance-none bg-[#F5F5F7] hover:bg-gray-100 text-[#1D1D1F] text-sm font-medium rounded-lg pl-3 pr-8 py-2 outline-none cursor-pointer w-44 truncate transition-colors"
                        style={{ fontFamily: element.fontFamily }}
                    >
                        {FONT_GROUPS.map(group => (
                            <optgroup key={group.label} label={group.label} className="font-sans font-bold text-gray-400 text-[10px] uppercase tracking-wider">
                                {group.options.map(f => (
                                    <option key={f.name} value={f.family} style={{ fontFamily: f.family }} className="text-[#1D1D1F] text-sm font-normal">
                                        {f.label}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <Icons.ChevronDown />
                    </div>
                </div>

                <input
                    type="number"
                    value={element.fontSize}
                    min={1}
                    max={999}
                    onChange={(e) => {
                        const val = Math.min(999, Math.max(1, Number(e.target.value)));
                        if (!isNaN(val)) onUpdate({ fontSize: val });
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="bg-[#F5F5F7] hover:bg-gray-100 text-[#1D1D1F] text-sm font-medium rounded-lg px-2 py-2 outline-none w-16 text-center transition-colors"
                />

                <div className="w-px h-6 bg-gray-200" />

                <ColorPickerButton label="文字色" color={element.color} onChange={(c) => onUpdate({ color: c })} />

                <div className="flex-1" />
                
                <button 
                    onClick={() => setShowMore(!showMore)} 
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-[#1D1D1F] transition-colors ${showMore ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
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
                        <SliderControl label="行距" value={element.lineHeight} onChange={(val) => onUpdate({ lineHeight: val })} min={0.8} max={3.0} step={0.1} unit="×" decimals={1} />
                        <SliderControl label="字距" value={element.letterSpacing || 0} onChange={(val) => onUpdate({ letterSpacing: val })} min={-20} max={100} step={1} unit="px" decimals={0} />
                    </div>

                    <div className="h-px bg-gray-100 w-full" />

                    {/* Section 3: Colors & Effects */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <div className="flex items-center gap-3">
                            <ColorPickerButton label="邊框" color={element.strokeColor} onChange={(c) => onUpdate({ strokeColor: c })} />
                            <SliderControl label="粗細" value={element.strokeWidth || 0} onChange={(val) => onUpdate({ strokeWidth: val })} min={0} max={20} />
                        </div>
                        <div className="flex items-center gap-3">
                            <ColorPickerButton label="背景色" color={element.backgroundColor ?? '#ffffff'} onChange={(c) => onUpdate({ backgroundColor: c })} />
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
