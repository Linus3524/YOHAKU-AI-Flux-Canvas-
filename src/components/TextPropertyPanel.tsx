import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { TextElement } from '../types';
import { Icon } from './Icon';

interface TextPropertyPanelProps {
  element: TextElement;
  onUpdate: (updates: Partial<TextElement>, options?: { addToHistory?: boolean }) => void;
  onSnapshot: () => void;
  onClose: () => void;
}

// Organized Font Groups
const FONT_GROUPS = [
  {
    label: '繁體中文 - 黑體/無襯線',
    options: [
      { name: 'Noto Sans TC', label: '思源黑體 Noto Sans TC', family: '"Noto Sans TC", sans-serif' },
      { name: 'Chiron GoRound TC', label: '昭源圓體 Chiron GoRound', family: '"Chiron GoRound TC", sans-serif' },
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

// ── SVG Icons ──────────────────────────────────────────────────────────────
const Icons = {
    Bold: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>,
    Italic: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>,
    Underline: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path><line x1="4" y1="21" x2="20" y2="21"></line></svg>,
    AlignLeft: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>,
    AlignCenter: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line></svg>,
    AlignRight: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>,
    More: () => <Icon name="more_horiz" size={14} />,
    Check: () => <Icon name="check" size={14} />,
    Grip: () => <Icon name="drag_indicator" size={16} className="text-black/20" />,
    ChevronDown: () => <Icon name="expand_more" size={8} />,
    TextHorizontal: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16M4 12l4-4m-4 4l4 4"/></svg>,
    TextVertical: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16M12 4l-4 4m4-4l4 4"/></svg>,
    CurveText: () => (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 17 C 8 12, 16 12, 20 17" strokeWidth="2.2" />
            <path d="M9 11 L12 4 L15 11" />
            <path d="M10 9 H14" />
        </svg>
    )
}

// ── Tooltip ─────────────────────────────────────────────────────────────────
const Tooltip = ({ text, children, position = 'top', className = '' }: { text: string; children: React.ReactNode; position?: 'top' | 'bottom'; className?: string }) => {
    const [show, setShow] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleEnter = () => {
        timerRef.current = setTimeout(() => setShow(true), 300);
    };
    const handleLeave = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setShow(false);
    };

    return (
        <div className={`relative inline-flex ${className}`} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
            {children}
            {show && (
                <div className={`absolute left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-800 text-white text-[10px] font-medium rounded whitespace-nowrap z-[9999] pointer-events-none shadow-md ${position === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`}>
                    {text}
                </div>
            )}
        </div>
    );
};

const NumericInput = ({ label, value, min, max, step, decimals, unit, disabled = false, onFocus, onChange, className = '' }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    decimals: number;
    unit?: string;
    disabled?: boolean;
    onFocus?: () => void;
    onChange: (value: number) => void;
    className?: string;
}) => {
    const format = useCallback((next: number) => next.toFixed(decimals), [decimals]);
    const [draft, setDraft] = useState(() => format(value));
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isFocused) setDraft(format(value));
    }, [value, isFocused, format]);

    const commit = (raw: string) => {
        const parsed = Number(raw);
        const next = Number.isFinite(parsed)
            ? Math.min(max, Math.max(min, parsed))
            : value;
        setDraft(format(next));
        if (next !== value) onChange(next);
    };

    return (
        <div className={`h-7 flex items-center rounded-md bg-[#F5F5F7] ring-1 ring-transparent focus-within:ring-[#AF52DE]/25 flex-shrink-0 ${className}`}>
            <input
                type="number"
                min={min}
                max={max}
                step={step}
                value={draft}
                onFocus={() => {
                    setIsFocused(true);
                    onFocus?.();
                }}
                onBlur={(e) => {
                    setIsFocused(false);
                    commit(e.currentTarget.value);
                }}
                onChange={(e) => {
                    const raw = e.target.value;
                    setDraft(raw);
                    if (raw === '' || raw === '-' || raw === '.' || raw === '-.') return;
                    const parsed = Number(raw);
                    if (Number.isFinite(parsed) && parsed >= min && parsed <= max) onChange(parsed);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') {
                        setDraft(format(value));
                        e.currentTarget.blur();
                    }
                }}
                disabled={disabled}
                aria-label={label}
                className="w-full min-w-0 bg-transparent text-[10px] font-mono text-[#3A3A3C] text-right outline-none pl-1 disabled:cursor-not-allowed"
            />
            {unit && <span className="text-[9px] text-[#8E8E93] pr-1.5 select-none">{unit}</span>}
        </div>
    );
};

// ── Labeled Slider Control ──────────────────────────────────────────────────
const SliderControl = ({ icon, customIcon, label, value, onChange, onDragStart, min, max, step = 1, unit = "", decimals, disabled = false }: {
    icon?: string;
    customIcon?: React.ReactNode;
    label: string;
    value: number;
    onChange: (val: number) => void;
    onDragStart?: () => void;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    decimals?: number;
    disabled?: boolean;
}) => {
    const precision = decimals ?? (step < 1 ? 1 : 0);
    return (
    <div className={`flex items-center gap-2 min-h-7 px-1 rounded-lg w-full ${disabled ? 'opacity-40' : ''}`}>
        <Tooltip text={label}>
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-yohaku-text-muted flex-shrink-0">
                {customIcon ? customIcon : <Icon name={icon || ''} size={13} />}
            </div>
        </Tooltip>

        <div className="flex-1 flex items-center h-4 min-w-0">
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onMouseDown={() => onDragStart?.()}
                onTouchStart={() => onDragStart?.()}
                onChange={(e) => onChange(Number(e.target.value))}
                disabled={disabled}
                aria-label={label}
                className="slider-thumb-sm w-full cursor-pointer disabled:cursor-not-allowed"
            />
        </div>

        <NumericInput
            label={`${label}數值`}
            value={value}
            min={min}
            max={max}
            step={step}
            decimals={precision}
            unit={unit}
            disabled={disabled}
            onFocus={onDragStart}
            onChange={onChange}
            className="w-[60px] h-6 bg-transparent hover:bg-[#F5F5F7]"
        />
    </div>
    );
};

// ── Color Picker Button (Icon 直接反映顏色，無額外橫條) ──────────────────────────
const ColorPickerButton = ({ color, onChange, iconName, tooltip, isBackground = false }: {
    color: string | undefined;
    onChange: (c: string) => void;
    iconName: string;
    tooltip: string;
    isBackground?: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const displayColor = color || 'transparent';
    const isTransparent = displayColor === 'transparent';

    return (
        <div className="relative">
            <Tooltip text={tooltip}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all"
                    style={{
                        backgroundColor: isBackground && !isTransparent ? displayColor : undefined,
                    }}
                >
                    {isBackground ? (
                        <Icon 
                            name={iconName} 
                            size={16} 
                            style={{ 
                                color: !isTransparent ? (displayColor === '#FFFFFF' || displayColor === '#FFCC00' ? '#1D1D1F' : '#FFFFFF') : '#1D1D1F' 
                            }} 
                        />
                    ) : (
                        <Icon 
                            name={iconName} 
                            size={16} 
                            style={{ 
                                color: isTransparent ? '#1D1D1F' : displayColor 
                            }} 
                        />
                    )}
                </button>
            </Tooltip>
            {isOpen && (
                <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white p-3 rounded-xl shadow-xl border border-gray-100 grid grid-cols-5 gap-2 w-48 cursor-default z-50 animate-fade-in-up"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="col-span-5 flex justify-between items-center pb-1 mb-1 border-b border-gray-100">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{tooltip}</span>
                        <button onClick={() => setIsOpen(false)} className="text-yohaku-text-muted hover:text-black text-xs font-bold">&times;</button>
                    </div>
                    {PRESET_COLORS.map(c => (
                        <button
                            key={c}
                            onClick={() => { onChange(c); setIsOpen(false); }}
                            className={`w-6 h-6 rounded-full border hover:scale-110 transition-transform ${c === displayColor ? 'border-yohaku-accent border-2 scale-110' : 'border-black/10'} bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==')]`}
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
    );
};

// ── Effect Row (Icon 結合色票按鈕 + Slider + Eye Toggle) ────────────────────
const EffectRow = ({ iconName, tooltip, color, onColorChange, value, onValueChange, onDragStart, min, max, step = 1 }: {
    iconName: string;
    tooltip: string;
    color: string | undefined;
    onColorChange: (c: string) => void;
    value: number;
    onValueChange: (val: number) => void;
    onDragStart?: () => void;
    min: number;
    max: number;
    step?: number;
}) => {
    const [colorPickerOpen, setColorPickerOpen] = useState(false);
    const isActive = value > 0;
    const lastValueRef = useRef(value || Math.round((max - min) / 4 + min));

    useEffect(() => {
        if (value > 0) lastValueRef.current = value;
    }, [value]);

    const toggleEffect = () => {
        onDragStart?.();
        if (isActive) {
            onValueChange(0);
        } else {
            onValueChange(lastValueRef.current || Math.round((max - min) / 4 + min));
        }
    };

    const displayColor = color || '#007AFF';

    return (
        <div className={`flex items-center gap-1.5 min-h-8 px-1 rounded-lg transition-colors ${isActive ? 'bg-yohaku-bg-main/70' : ''}`}>
            {/* 色票與 Icon 直接結合 */}
            <div className="relative flex-shrink-0">
                <Tooltip text={`${tooltip}顏色`}>
                    <button
                        onClick={() => setColorPickerOpen(!colorPickerOpen)}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-6 h-6 rounded-md flex items-center justify-center hover:scale-105 transition-transform"
                        style={{
                            backgroundColor: isActive ? displayColor : '#E5E5EA',
                        }}
                    >
                        <Icon 
                            name={iconName} 
                            size={14} 
                            style={{ 
                                color: isActive 
                                    ? (displayColor === '#FFFFFF' || displayColor === '#FFCC00' ? '#1D1D1F' : '#FFFFFF') 
                                    : '#8E8E93' 
                            }} 
                        />
                    </button>
                </Tooltip>

                {colorPickerOpen && (
                    <div
                        className="absolute bottom-full left-0 mb-2 bg-white p-2.5 rounded-xl shadow-xl border border-gray-100 grid grid-cols-5 gap-1.5 w-44 cursor-default z-50 animate-fade-in-up"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <div className="col-span-5 flex justify-between items-center pb-1 mb-1 border-b border-gray-100">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{tooltip}顏色</span>
                            <button onClick={() => setColorPickerOpen(false)} className="text-yohaku-text-muted hover:text-black text-xs font-bold">&times;</button>
                        </div>
                        {PRESET_COLORS.filter(c => c !== 'transparent').map(c => (
                            <button
                                key={c}
                                onClick={() => { onColorChange(c); setColorPickerOpen(false); }}
                                className={`w-5 h-5 rounded-full border hover:scale-110 transition-transform ${c === displayColor ? 'border-yohaku-accent border-2 scale-110' : 'border-black/10'}`}
                            >
                                <div className="w-full h-full rounded-full" style={{ backgroundColor: c }} />
                            </button>
                        ))}
                        <label className="w-5 h-5 rounded-full border border-gray-200 bg-white flex items-center justify-center cursor-pointer hover:bg-gray-50 text-[9px] text-black">
                            +
                            <input
                                type="color"
                                value={color || '#007AFF'}
                                onChange={(e) => onColorChange(e.target.value)}
                                className="hidden"
                            />
                        </label>
                    </div>
                )}
            </div>

            <span className="w-[30px] text-[11px] font-medium text-[#3A3A3C] flex-shrink-0">{tooltip}</span>

            {/* Slider 軌道與圓點 */}
            <div className="flex-1 flex items-center h-4 min-w-0">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onMouseDown={() => onDragStart?.()}
                    onTouchStart={() => onDragStart?.()}
                    onChange={(e) => onValueChange(Number(e.target.value))}
                    aria-label={`${tooltip}強度`}
                    className={`slider-thumb-sm w-full cursor-pointer ${!isActive ? 'opacity-40' : ''}`}
                />
            </div>

            <NumericInput
                label={`${tooltip}強度數值`}
                value={value}
                min={min}
                max={max}
                step={step}
                decimals={0}
                onFocus={onDragStart}
                onChange={onValueChange}
                className="w-10 bg-white/80 ring-black/[0.04]"
            />

            {/* Eye toggle */}
            <Tooltip text={isActive ? '關閉效果' : '開啟效果'}>
                <button
                    onClick={toggleEffect}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`w-6 h-6 flex items-center justify-center rounded-md transition-all ${isActive ? 'text-yohaku-accent hover:bg-blue-50' : 'text-yohaku-text-muted/40 hover:bg-gray-100'}`}
                >
                    <Icon name={isActive ? 'visibility' : 'visibility_off'} size={14} />
                </button>
            </Tooltip>
        </div>
    );
};


export const TextPropertyPanel: React.FC<TextPropertyPanelProps> = ({ element, onUpdate, onSnapshot, onClose }) => {
    const initialElementState = useRef<TextElement>(element);
    const [showMore, setShowMore] = useState(false);
    const [advancedTab, setAdvancedTab] = useState<'typography' | 'appearance'>('typography');
    const panelRef = useRef<HTMLDivElement>(null);
    
    // Draggable State
    const [position, setPosition] = useState({
        x: Math.max(12, window.innerWidth / 2 - 165),
        y: Math.max(12, window.innerHeight - 300),
    });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        initialElementState.current = element;
        setShowMore(false);
        setAdvancedTab('typography');
    }, [element.id]);

    const clampPanelPosition = useCallback((next: { x: number; y: number }) => {
        const margin = 12;
        const width = panelRef.current?.offsetWidth || 330;
        const height = panelRef.current?.offsetHeight || 180;
        return {
            x: Math.min(Math.max(margin, next.x), Math.max(margin, window.innerWidth - width - margin)),
            y: Math.min(Math.max(margin, next.y), Math.max(margin, window.innerHeight - height - margin)),
        };
    }, []);

    // 展開、切頁或視窗縮放後，確保整個浮動面板仍留在可視範圍內。
    useEffect(() => {
        const clamp = () => setPosition(prev => clampPanelPosition(prev));
        const frame = requestAnimationFrame(clamp);
        window.addEventListener('resize', clamp);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', clamp);
        };
    }, [showMore, advancedTab, element.id, clampPanelPosition]);

    // --- Toggle Writing Mode with Auto-Resize ---
    const handleWritingModeChange = (mode: 'horizontal' | 'vertical') => {
        if (mode === element.writingMode) return;
        
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
            setPosition(clampPanelPosition({
                x: e.clientX - dragStartRef.current.x,
                y: e.clientY - dragStartRef.current.y
            }));
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
    }, [isDragging, clampPanelPosition]);

    return (
        <div
            ref={panelRef}
            className="fixed z-[1000] bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-black/[0.06] p-2 flex flex-col gap-2 animate-fade-in-up transition-shadow duration-200"
            style={{
                left: position.x,
                top: position.y,
                width: 330,
                maxHeight: 'calc(100vh - 24px)',
                overflowY: 'auto',
                cursor: isDragging ? 'grabbing' : 'default',
                boxShadow: isDragging ? '0 20px 60px rgba(0,0,0,0.18)' : '0 10px 40px rgba(0,0,0,0.12)'
            }}
            onMouseDown={handleMouseDown}
            onClick={(e) => e.stopPropagation()}
        >
            {/* ── 常駐頂部區：精緻兩排前後對齊結構 ── */}
            <div className="flex flex-col gap-1.5 w-full">
                
                {/* 第一排：拖拽 · 字型選單 · 字號 · 更多 · 完成 */}
                <div className="flex items-center gap-1.5 w-full justify-between">
                    <div className="px-0.5 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0">
                        <Icons.Grip />
                    </div>

                    {/* Font dropdown */}
                    <div className="relative flex-1 min-w-0">
                        <select
                            value={element.fontFamily}
                            onChange={(e) => onUpdate({ fontFamily: e.target.value })}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="appearance-none bg-yohaku-bg-main hover:bg-gray-100 text-yohaku-text-main text-xs font-medium rounded-lg pl-2.5 pr-6 py-1.5 outline-none cursor-pointer w-full truncate transition-colors"
                            style={{ fontFamily: element.fontFamily }}
                        >
                            {FONT_GROUPS.map(group => (
                                <optgroup key={group.label} label={group.label}>
                                    {group.options.map(f => (
                                        <option key={f.name} value={f.family} style={{ fontFamily: f.family }}>
                                            {f.label}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-yohaku-text-muted">
                            <Icons.ChevronDown />
                        </div>
                    </div>

                    {/* Font size */}
                    <input
                        type="number"
                        value={Math.round(element.fontSize)}
                        min={1} max={999}
                        onChange={(e) => {
                            const val = Math.min(999, Math.max(1, Number(e.target.value)));
                            if (!isNaN(val)) onUpdate({ fontSize: val });
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="bg-yohaku-bg-main hover:bg-gray-100 text-yohaku-text-main text-xs font-medium rounded-lg px-1 py-1.5 outline-none w-11 text-center transition-colors flex-shrink-0"
                    />

                    <div className="w-px h-4 bg-gray-200 flex-shrink-0" />

                    {/* More toggle */}
                    <Tooltip text={showMore ? '收合設定' : '更多設定'}>
                        <button
                            onClick={() => setShowMore(!showMore)}
                            onMouseDown={(e) => e.stopPropagation()}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg text-yohaku-text-main transition-colors flex-shrink-0 ${showMore ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                        >
                            <Icons.More />
                        </button>
                    </Tooltip>

                    {/* Done */}
                    <button onClick={handleDone} onMouseDown={(e) => e.stopPropagation()} className="w-7 h-7 flex items-center justify-center rounded-lg text-[#AF52DE] bg-purple-50 hover:bg-[#AF52DE] hover:text-white transition-colors flex-shrink-0">
                        <Icons.Check />
                    </button>
                </div>

                {/* 第二排：直/橫書 · 對齊 · B/I/U · 顏色按鈕 (前後整齊對齊) */}
                <div className="flex items-center justify-between w-full pt-0.5 border-t border-gray-100/80">
                    {/* 直/橫書 */}
                    <div className="flex bg-yohaku-bg-main rounded-lg p-0.5">
                        <Tooltip text="橫向排版">
                            <button onClick={() => handleWritingModeChange('horizontal')} className={`p-1 rounded-md transition-all ${(!element.writingMode || element.writingMode === 'horizontal') ? 'bg-white shadow-sm text-black' : 'text-yohaku-text-muted hover:text-gray-600'}`}><Icons.TextHorizontal /></button>
                        </Tooltip>
                        <Tooltip text="直向排版">
                            <button onClick={() => handleWritingModeChange('vertical')} className={`p-1 rounded-md transition-all ${element.writingMode === 'vertical' ? 'bg-white shadow-sm text-black' : 'text-yohaku-text-muted hover:text-gray-600'}`}><Icons.TextVertical /></button>
                        </Tooltip>
                    </div>

                    <div className="w-px h-4 bg-gray-200 flex-shrink-0" />

                    {/* 對齊 */}
                    <div className="flex bg-yohaku-bg-main rounded-lg p-0.5">
                        <Tooltip text="靠左對齊">
                            <button onClick={() => onUpdate({ align: 'left' })} className={`p-1 rounded-md transition-all ${element.align === 'left' ? 'bg-white shadow-sm text-black' : 'text-yohaku-text-muted hover:text-gray-600'}`}><Icons.AlignLeft /></button>
                        </Tooltip>
                        <Tooltip text="置中對齊">
                            <button onClick={() => onUpdate({ align: 'center' })} className={`p-1 rounded-md transition-all ${element.align === 'center' ? 'bg-white shadow-sm text-black' : 'text-yohaku-text-muted hover:text-gray-600'}`}><Icons.AlignCenter /></button>
                        </Tooltip>
                        <Tooltip text="靠右對齊">
                            <button onClick={() => onUpdate({ align: 'right' })} className={`p-1 rounded-md transition-all ${element.align === 'right' ? 'bg-white shadow-sm text-black' : 'text-yohaku-text-muted hover:text-gray-600'}`}><Icons.AlignRight /></button>
                        </Tooltip>
                    </div>

                    <div className="w-px h-4 bg-gray-200 flex-shrink-0" />

                    {/* B / I / U */}
                    <div className="flex gap-0.5">
                        <Tooltip text="粗體">
                            <button onClick={() => onUpdate({ isBold: !element.isBold })} className={`p-1 rounded-md transition-all ${element.isBold ? 'bg-black text-white' : 'hover:bg-gray-100 text-yohaku-text-main'}`}><Icons.Bold /></button>
                        </Tooltip>
                        <Tooltip text="斜體">
                            <button onClick={() => onUpdate({ isItalic: !element.isItalic })} className={`p-1 rounded-md transition-all ${element.isItalic ? 'bg-black text-white' : 'hover:bg-gray-100 text-yohaku-text-main'}`}><Icons.Italic /></button>
                        </Tooltip>
                        <Tooltip text="底線">
                            <button onClick={() => onUpdate({ isUnderline: !element.isUnderline })} className={`p-1 rounded-md transition-all ${element.isUnderline ? 'bg-black text-white' : 'hover:bg-gray-100 text-yohaku-text-main'}`}><Icons.Underline /></button>
                        </Tooltip>
                    </div>

                    <div className="w-px h-4 bg-gray-200 flex-shrink-0" />

                    {/* Text Color + Background Color */}
                    <div className="flex items-center gap-1">
                        <ColorPickerButton
                            iconName="format_color_text"
                            tooltip="文字顏色"
                            color={element.color}
                            onChange={(c) => onUpdate({ color: c })}
                        />
                        <ColorPickerButton
                            iconName="format_color_fill"
                            tooltip="背景顏色"
                            color={element.backgroundColor ?? 'transparent'}
                            onChange={(c) => onUpdate({ backgroundColor: c })}
                            isBackground={true}
                        />
                    </div>

                </div>

            </div>

            {/* ── 展開折疊區：排版與外觀分頁 ── */}
            {showMore && (
                <div className="flex flex-col px-0.5 pb-1 pt-0.5" onMouseDown={(e) => e.stopPropagation()}>
                    <div className="h-px bg-gray-100 w-full mb-1.5" />

                    <div className="grid grid-cols-2 gap-0.5 p-0.5 bg-[#F5F5F7] rounded-lg mb-1.5">
                        {([
                            ['typography', '排版'],
                            ['appearance', '外觀'],
                        ] as const).map(([tab, label]) => (
                            <button
                                key={tab}
                                type="button"
                                aria-pressed={advancedTab === tab}
                                onClick={() => setAdvancedTab(tab)}
                                className={`h-5.5 rounded text-[10px] font-medium transition-all ${
                                    advancedTab === tab
                                        ? 'bg-white text-[#1D1D1F] shadow-2xs font-semibold'
                                        : 'text-[#8E8E93] hover:text-[#3A3A3C]'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {advancedTab === 'typography' ? (
                        <div className="flex flex-col gap-0.5">
                            <SliderControl
                                icon="format_letter_spacing"
                                label="字距"
                                value={element.letterSpacing || 0}
                                onDragStart={onSnapshot}
                                onChange={(val) => onUpdate({ letterSpacing: val }, { addToHistory: false })}
                                min={-20}
                                max={100}
                                step={1}
                                unit="px"
                                decimals={0}
                            />
                            <SliderControl
                                icon="format_line_spacing"
                                label="行距"
                                value={element.lineHeight}
                                onDragStart={onSnapshot}
                                onChange={(val) => onUpdate({ lineHeight: val }, { addToHistory: false })}
                                min={0.8}
                                max={3.0}
                                step={0.1}
                                unit="×"
                                decimals={1}
                            />
                            <SliderControl
                                customIcon={<Icons.CurveText />}
                                label="彎曲"
                                value={(element as any).curveStrength || 0}
                                onDragStart={onSnapshot}
                                onChange={(val) => onUpdate({ curveStrength: val } as any, { addToHistory: false })}
                                min={-100}
                                max={100}
                                step={1}
                                unit=""
                                decimals={0}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-0.5">
                            <EffectRow
                                iconName="border_color"
                                tooltip="邊框"
                                color={element.strokeColor ?? '#FF3B30'}
                                onColorChange={(c) => onUpdate({ strokeColor: c })}
                                value={element.strokeWidth || 0}
                                onValueChange={(val) => onUpdate({ strokeWidth: val }, { addToHistory: false })}
                                onDragStart={onSnapshot}
                                min={0}
                                max={20}
                            />
                            <EffectRow
                                iconName="shadow"
                                tooltip="陰影"
                                color={element.shadowColor}
                                onColorChange={(c) => onUpdate({ shadowColor: c })}
                                value={element.shadowBlur || 0}
                                onValueChange={(val) => onUpdate({ shadowBlur: val }, { addToHistory: false })}
                                onDragStart={onSnapshot}
                                min={0}
                                max={50}
                            />
                            <EffectRow
                                iconName="flare"
                                tooltip="光暈"
                                color={element.glowColor}
                                onColorChange={(c) => onUpdate({ glowColor: c })}
                                value={element.glowBlur || 0}
                                onValueChange={(val) => onUpdate({ glowBlur: val }, { addToHistory: false })}
                                onDragStart={onSnapshot}
                                min={0}
                                max={50}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
