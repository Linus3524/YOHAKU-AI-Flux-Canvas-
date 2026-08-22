
import React, { useState, useRef } from 'react';
import type { ShapeElement } from '../types';
import { AdvancedColorPicker } from './AdvancedColorPicker'; // ✅ 新增
import { Icon } from './Icon';

interface ShapePropertyPanelProps {
  element: ShapeElement;
  onUpdate: (updates: Partial<ShapeElement>) => void;
  onClose: () => void;
}

const Icons = {
    Grip: () => <Icon name="drag_indicator" size={16} className="text-black/20 block leading-none" />,
    Check: () => <Icon name="check" size={14} />,
    Close: () => <Icon name="close" size={14} />,
    Solid: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="12" x2="22" y2="12" /></svg>,
    Dashed: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h4M10 12h4M18 12h4" /></svg>,
    Dotted: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="2" y1="12" x2="2" y2="12" /><line x1="8" y1="12" x2="8" y2="12" /><line x1="14" y1="12" x2="14" y2="12" /><line x1="20" y1="12" x2="20" y2="12" /></svg>,
    Link: () => <Icon name="link" size={12} />,
    Unlink: () => <Icon name="link_off" size={12} />,
};

// ── 數值上下微調鈕（取代瀏覽器原生 spinner，常駐顯示）──────────────────────
const Stepper: React.FC<{ onStep: (delta: number) => void }> = ({ onStep }) => (
    <div className="flex flex-col shrink-0 -my-px">
        {([1, -1] as const).map((dir) => (
            <button
                key={dir}
                onClick={() => onStep(dir)}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-3 h-[11px] flex items-center justify-center text-[#C7C7CC] hover:text-[#1D1D1F] transition-colors"
                aria-label={dir > 0 ? '增加' : '減少'}
                tabIndex={-1}
            >
                <svg width="7" height="4" viewBox="0 0 8 5" fill="none" style={dir < 0 ? { transform: 'rotate(180deg)' } : undefined}>
                    <path d="M1 4L4 1L7 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
        ))}
    </div>
);

// ── Tooltip（與 TextPropertyPanel 一致：hover 300ms 後顯示中文標籤）─────────
const Tooltip: React.FC<{ text: string; children: React.ReactNode; position?: 'top' | 'bottom'; className?: string }> = ({ text, children, position = 'top', className = '' }) => {
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

// 面板最後位置記憶（模組層 → 跨關閉 / 切換形狀都保留，不會每次跳回原位）
let lastPanelPosition: { x: number; y: number } | null = null;

export const ShapePropertyPanel: React.FC<ShapePropertyPanelProps> = ({ element, onUpdate, onClose }) => {
    // Draggable State
    const panelRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState(() => lastPanelPosition ?? {
        x: window.innerWidth / 2 - 200,
        y: window.innerHeight - 280,
    });
    const [isDragging, setIsDragging] = useState(false);

    // --- NEW STATE: Constrain Proportions ---
    const [constrainProportions, setConstrainProportions] = useState(true);

    const handleMouseDown = (e: React.MouseEvent) => {
        // 點到內部 input / button 不觸發拖曳
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
        e.preventDefault();
        const offsetX = e.clientX - position.x;
        const offsetY = e.clientY - position.y;
        setIsDragging(true);

        // 拖曳期間直接改 DOM style，不經 setState → 不重繪整個面板（消除卡頓）
        const handleMove = (ev: MouseEvent) => {
            if (!panelRef.current) return;
            panelRef.current.style.left = `${ev.clientX - offsetX}px`;
            panelRef.current.style.top = `${ev.clientY - offsetY}px`;
        };
        const handleUp = (ev: MouseEvent) => {
            const next = { x: ev.clientX - offsetX, y: ev.clientY - offsetY };
            setPosition(next);
            lastPanelPosition = next;   // 記住最後位置
            setIsDragging(false);
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
        // 立即掛載監聽（不經 useEffect 的一次 render 延遲 → 首次拖曳不再卡）
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
    };

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

    return (
        <div
            ref={panelRef}
            className="fixed z-[1000] bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.13)] border border-gray-100 px-2.5 py-2.5 flex items-center gap-2 animate-fade-in-up"
            style={{
                left: position.x,
                top: position.y,
                cursor: isDragging ? 'grabbing' : 'default',
            }}
            onMouseDown={handleMouseDown}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Drag Handle */}
            <div className="h-7 px-0.5 flex items-center justify-center cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors">
                <Icons.Grip />
            </div>

            {/* 尺寸：W ⇄ H 單一膠囊，比例鎖內嵌 */}
            <Tooltip text="尺寸">
                {/* 輸入框寬度貼合內容 → 標籤 / 數字 / 上下鈕三者間距一律 4px，不隨位數變動 */}
                <div className="flex items-center h-7 bg-[#F5F5F7] rounded-lg px-2">
                    <div className="flex items-center gap-1">
                        <span className="text-[9px] font-bold text-[#86868B] select-none">W</span>
                        <input
                            type="number"
                            value={Math.round(element.width)}
                            onChange={(e) => handleWidthChange(Number(e.target.value))}
                            className="num-no-spin num-fit w-auto min-w-[14px] max-w-[34px] bg-transparent text-[11px] font-mono text-[#1D1D1F] outline-none text-right"
                        />
                        <Stepper onStep={(d) => handleWidthChange(Math.round(element.width) + d)} />
                    </div>
                    <button
                        onClick={() => setConstrainProportions(!constrainProportions)}
                        className={`w-4 h-4 mx-1.5 shrink-0 flex items-center justify-center rounded transition-colors ${constrainProportions ? 'text-[#AF52DE]' : 'text-gray-300 hover:text-gray-500'}`}
                        title={constrainProportions ? "解鎖比例" : "鎖定比例"}
                    >
                        {constrainProportions ? <Icons.Link /> : <Icons.Unlink />}
                    </button>
                    <div className="flex items-center gap-1">
                        <span className="text-[9px] font-bold text-[#86868B] select-none">H</span>
                        <input
                            type="number"
                            value={Math.round(element.height)}
                            onChange={(e) => handleHeightChange(Number(e.target.value))}
                            className="num-no-spin num-fit w-auto min-w-[14px] max-w-[34px] bg-transparent text-[11px] font-mono text-[#1D1D1F] outline-none text-right"
                        />
                        <Stepper onStep={(d) => handleHeightChange(Math.round(element.height) + d)} />
                    </div>
                </div>
            </Tooltip>

            <div className="w-px h-4 bg-gray-200" />

            {/* 填充：實心色塊 */}
            <Tooltip text="填充">
                <AdvancedColorPicker
                    value={element.fillColor}
                    onChange={(c) => onUpdate({ fillColor: c })}
                    title="填充"
                />
            </Tooltip>

            {/* 邊框：挖空方框（與填充共用同一組 picker，故同樣支援漸層）*/}
            <Tooltip text="邊框">
                <AdvancedColorPicker
                    value={element.strokeColor}
                    onChange={(c) => onUpdate({ strokeColor: c })}
                    variant="ring"
                    title="邊框"
                />
            </Tooltip>

            <div className="w-px h-4 bg-gray-200" />

            {/* Stroke Width */}
            <div className="flex h-7 bg-[#F5F5F7] rounded-lg p-0.5">
                {([[2, '細邊框'], [6, '中邊框'], [12, '粗邊框']] as const).map(([width, label]) => (
                    <Tooltip key={width} text={label}>
                        <button
                            onClick={() => onUpdate({ strokeWidth: width })}
                            className={`w-6 h-6 flex items-center justify-center rounded-md transition-all ${element.strokeWidth === width ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <div className="bg-current rounded-full" style={{ width: width + 2, height: width + 2, maxHeight: 14, maxWidth: 14 }} />
                        </button>
                    </Tooltip>
                ))}
            </div>

            {/* Stroke Style */}
            <div className="flex h-7 bg-[#F5F5F7] rounded-lg p-0.5">
                <Tooltip text="實線">
                    <button onClick={() => onUpdate({ strokeStyle: 'solid' })} className={`w-6 h-6 flex items-center justify-center rounded-md transition-all ${element.strokeStyle === 'solid' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}><Icons.Solid /></button>
                </Tooltip>
                <Tooltip text="虛線">
                    <button onClick={() => onUpdate({ strokeStyle: 'dashed' })} className={`w-6 h-6 flex items-center justify-center rounded-md transition-all ${element.strokeStyle === 'dashed' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}><Icons.Dashed /></button>
                </Tooltip>
                <Tooltip text="點線">
                    <button onClick={() => onUpdate({ strokeStyle: 'dotted' })} className={`w-6 h-6 flex items-center justify-center rounded-md transition-all ${element.strokeStyle === 'dotted' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}><Icons.Dotted /></button>
                </Tooltip>
            </div>

            <div className="w-px h-4 bg-gray-200" />

            <Tooltip text="關閉">
                <button onClick={onClose} onMouseDown={(e) => e.stopPropagation()} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors">
                    <Icons.Close />
                </button>
            </Tooltip>
        </div>
    );
};
