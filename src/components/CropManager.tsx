// 裁切管理器：從 InfiniteCanvas.tsx 原樣搬出（零邏輯改動）
import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Point, ImageElement } from '../types';
import { Icon } from './Icon';

interface CropManagerProps {
    element: ImageElement;
    zoom: number;
    onCancel: () => void;
    onConfirm: (cropRect: { x: number, y: number, width: number, height: number }) => void;
}

export const CropManager: React.FC<CropManagerProps> = ({ element, zoom, onCancel, onConfirm }) => {
    const [cropRect, setCropRect] = useState({ x: 0, y: 0, width: element.width, height: element.height });
    const dragRef = useRef<{ type: string, startPoint: Point, startRect: typeof cropRect } | null>(null);

    const [localInputs, setLocalInputs] = useState({
        left: String(Math.round(cropRect.x)),
        top: String(Math.round(cropRect.y)),
        right: String(Math.round(element.width - cropRect.x - cropRect.width)),
        bottom: String(Math.round(element.height - cropRect.y - cropRect.height))
    });

    useEffect(() => {
        setLocalInputs({
            left: String(Math.round(cropRect.x)),
            top: String(Math.round(cropRect.y)),
            right: String(Math.round(element.width - cropRect.x - cropRect.width)),
            bottom: String(Math.round(element.height - cropRect.y - cropRect.height))
        });
    }, [cropRect.x, cropRect.y, cropRect.width, cropRect.height, element.width, element.height]);

    const handleInputChange = (key: 'left' | 'top' | 'right' | 'bottom', valueStr: string) => {
        setLocalInputs(prev => ({ ...prev, [key]: valueStr }));

        if (valueStr === '') return;

        const val = parseInt(valueStr, 10);
        if (isNaN(val)) return;

        setCropRect(prev => {
            const next = { ...prev };
            const currentLeft = key === 'left' ? val : prev.x;
            const currentTop = key === 'top' ? val : prev.y;
            const currentRight = key === 'right' ? val : (element.width - prev.x - prev.width);
            const currentBottom = key === 'bottom' ? val : (element.height - prev.y - prev.height);

            // 限制邊界，且保留至少 20px 的剩餘裁剪寬高
            const finalL = Math.max(0, Math.min(element.width - 20 - currentRight, currentLeft));
            const finalR = Math.max(0, Math.min(element.width - 20 - finalL, currentRight));
            const finalT = Math.max(0, Math.min(element.height - 20 - currentBottom, currentTop));
            const finalB = Math.max(0, Math.min(element.height - 20 - finalT, currentBottom));

            next.x = finalL;
            next.y = finalT;
            next.width = Math.max(20, element.width - finalL - finalR);
            next.height = Math.max(20, element.height - finalT - finalB);

            return next;
        });
    };

    const handleInputBlur = (key: 'left' | 'top' | 'right' | 'bottom') => {
        setCropRect(prev => {
            const next = { ...prev };
            if (next.width < 20) next.width = 20;
            if (next.height < 20) next.height = 20;
            
            if (next.x + next.width > element.width) {
                next.x = Math.max(0, element.width - next.width);
            }
            if (next.y + next.height > element.height) {
                next.y = Math.max(0, element.height - next.height);
            }

            setLocalInputs({
                left: String(Math.round(next.x)),
                top: String(Math.round(next.y)),
                right: String(Math.round(element.width - next.x - next.width)),
                bottom: String(Math.round(element.height - next.y - next.height))
            });

            return next;
        });
    };

    const handleMouseDown = (e: React.MouseEvent, type: string) => {
        e.stopPropagation();
        dragRef.current = {
            type,
            startPoint: { x: e.clientX, y: e.clientY },
            startRect: { ...cropRect }
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!dragRef.current) return;
        const { type, startPoint, startRect } = dragRef.current;
        const dx = (e.clientX - startPoint.x) / zoom;
        const dy = (e.clientY - startPoint.y) / zoom;
        
        let { x, y, width, height } = startRect;
        const minSize = 20;
        const maxWidth = element.width;
        const maxHeight = element.height;

        if (type.includes('e')) {
            width = Math.min(Math.max(minSize, startRect.width + dx), maxWidth - startRect.x);
        }
        if (type.includes('w')) {
            const maxDeltaLeft = startRect.width - minSize;
            const deltaX = Math.min(Math.max(dx, -startRect.x), maxDeltaLeft);
            x = startRect.x + deltaX;
            width = startRect.width - deltaX;
        }
        if (type.includes('s')) {
            height = Math.min(Math.max(minSize, startRect.height + dy), maxHeight - startRect.y);
        }
        if (type.includes('n')) {
            const maxDeltaTop = startRect.height - minSize;
            const deltaY = Math.min(Math.max(dy, -startRect.y), maxDeltaTop);
            y = startRect.y + deltaY;
            height = startRect.height - deltaY;
        }

        setCropRect({ x, y, width, height });
    };

    const handleMouseUp = () => {
        dragRef.current = null;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };

    // zoom 補償：與一般物件方點一致 — 縮小畫布時放大 handle、放大畫布時縮小，
    // 讓圓點在不同 zoom 下的「螢幕大小」固定（base 6px，極小 zoom 上限 5.5×）
    const hScale = Math.min(1 / zoom, 5.5);
    const HS = 6 * hScale;          // 圓點直徑
    const HO = -HS / 2;             // 置中於框邊的偏移
    const HBW = Math.min(3, 1 * hScale); // 邊框寬度補償
    const renderHandle = (cursor: string, posStyle: React.CSSProperties, type: string) => (
        <div
            className="absolute bg-white rounded-full shadow-sm z-50"
            style={{ width: HS, height: HS, border: `${HBW}px solid #2997FF`, cursor, ...posStyle }}
            onMouseDown={(e) => handleMouseDown(e, type)}
        />
    );

    return (
        <div 
            className="absolute"
            style={{
                left: element.position.x,
                top: element.position.y,
                width: element.width,
                height: element.height,
                transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
                zIndex: 2000 
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="absolute bg-black/50" style={{ left: 0, top: 0, width: '100%', height: cropRect.y }} />
            <div className="absolute bg-black/50" style={{ left: 0, top: cropRect.y + cropRect.height, width: '100%', height: element.height - (cropRect.y + cropRect.height) }} />
            <div className="absolute bg-black/50" style={{ left: 0, top: cropRect.y, width: cropRect.x, height: cropRect.height }} />
            <div className="absolute bg-black/50" style={{ left: cropRect.x + cropRect.width, top: cropRect.y, width: element.width - (cropRect.x + cropRect.width), height: cropRect.height }} />

            <div
                className="absolute"
                style={{ left: cropRect.x, top: cropRect.y, width: cropRect.width, height: cropRect.height, cursor: 'move' }}
            >
                {/* 框線改用 inset-0 子層繪製，讓圓點以真正框邊為基準（騎在線上，與一般物件框一致）*/}
                <div className="absolute inset-0 border border-white/80 shadow-[0_0_0_1px_rgba(41,151,255,1)] pointer-events-none" />
                <div className="w-full h-full relative opacity-50 pointer-events-none">
                    <div className="absolute left-1/3 top-0 w-px h-full bg-white/50 shadow-[0_0_2px_rgba(0,0,0,0.5)]" />
                    <div className="absolute left-2/3 top-0 w-px h-full bg-white/50 shadow-[0_0_2px_rgba(0,0,0,0.5)]" />
                    <div className="absolute top-1/3 left-0 w-full h-px bg-white/50 shadow-[0_0_2px_rgba(0,0,0,0.5)]" />
                    <div className="absolute top-2/3 left-0 w-full h-px bg-white/50 shadow-[0_0_2px_rgba(0,0,0,0.5)]" />
                </div>
                {renderHandle('nw-resize', { top: HO, left: HO }, 'nw')}
                {renderHandle('n-resize', { top: HO, left: '50%', transform: 'translateX(-50%)' }, 'n')}
                {renderHandle('ne-resize', { top: HO, right: HO }, 'ne')}
                {renderHandle('e-resize', { top: '50%', right: HO, transform: 'translateY(-50%)' }, 'e')}
                {renderHandle('se-resize', { bottom: HO, right: HO }, 'se')}
                {renderHandle('s-resize', { bottom: HO, left: '50%', transform: 'translateX(-50%)' }, 's')}
                {renderHandle('sw-resize', { bottom: HO, left: HO }, 'sw')}
                {renderHandle('w-resize', { top: '50%', left: HO, transform: 'translateY(-50%)' }, 'w')}
            </div>

            <div 
                className="absolute left-1/2 flex flex-col items-center gap-2 pointer-events-auto whitespace-nowrap z-[2001]"
                style={{ 
                    top: 'calc(100% + 12px)',
                    transform: `translateX(-50%) scale(${Math.min(1 / zoom, 5.5)})`,
                    transformOrigin: 'top center',
                }}
            >
                {/* 精準裁剪數值面板 */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/80 backdrop-blur-lg text-white text-[10px] font-mono border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
                    {[
                        { label: '上', key: 'top' as const },
                        { label: '下', key: 'bottom' as const },
                        { label: '左', key: 'left' as const },
                        { label: '右', key: 'right' as const },
                    ].map(({ label, key }) => (
                        <div key={key} className="flex items-center gap-0.5">
                            <span className="text-white/50 text-[9px] font-bold w-3 text-center">{label}</span>
                            <input
                                type="text"
                                value={localInputs[key]}
                                onChange={(e) => handleInputChange(key, e.target.value)}
                                onBlur={() => handleInputBlur(key)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        (e.target as HTMLInputElement).blur();
                                    }
                                }}
                                className="w-11 bg-white/10 rounded px-1 py-0.5 text-center text-[10px] text-white border border-white/10 focus:border-blue-400/60 focus:outline-none transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    ))}
                    <div className="w-px h-3.5 bg-white/20 mx-0.5" />
                    <span className="text-white/35 text-[9px] flex items-center gap-1.5 font-mono">
                        <span>原圖 {Math.round(element.width)}×{Math.round(element.height)}</span>
                        <span className="text-white/10">|</span>
                        <span className="text-blue-400 font-bold">裁剪後 {Math.round(cropRect.width)}×{Math.round(cropRect.height)}</span>
                    </span>
                </div>
                {/* 按鈕列 */}
                <div className="flex gap-2">
                     <button 
                        onClick={onCancel}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md text-[#1D1D1F] text-xs font-bold border border-black/10 shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:bg-white hover:scale-105 transition-all active:scale-95"
                     >
                         <Icon name="close" size={12} />
                         取消
                     </button>
                     <button 
                        onClick={() => onConfirm(cropRect)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/90 backdrop-blur-md text-white text-xs font-bold border border-transparent shadow-[0_4px_12px_rgba(0,0,0,0.2)] hover:bg-black hover:scale-105 transition-all active:scale-95"
                     >
                         <Icon name="check" size={12} />
                         確認裁剪
                     </button>
                </div>
            </div>
        </div>
    );
}
