import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ArtboardElement } from '../../types';
import { ARTBOARD_PRESETS } from './presets';

interface ArtboardPanelProps {
    element: ArtboardElement;
    onUpdate: (updates: Partial<ArtboardElement>) => void;
    onExport: () => void;
    onClose: () => void;
}

const ArtboardIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    </svg>
);

export const ArtboardPanel: React.FC<ArtboardPanelProps> = ({ element, onUpdate, onExport, onClose }) => {
    const [widthInput, setWidthInput]   = useState(String(Math.round(element.width)));
    const [heightInput, setHeightInput] = useState(String(Math.round(element.height)));
    
    const [isOpen, setIsOpen] = useState(true);
    const [position, setPosition] = useState({ x: window.innerWidth - 360, y: 80 });
    const [isDragging, setIsDragging] = useState(false);
    
    const dragStartRef = useRef({ x: 0, y: 0 });
    const initialPosRef = useRef({ x: 0, y: 0 });
    const hasMovedRef = useRef(false);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setWidthInput(String(Math.round(element.width)));
        setHeightInput(String(Math.round(element.height)));
    }, [element.width, element.height]);

    const handleWindowMouseMove = useCallback((e: MouseEvent) => {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;

        if (!hasMovedRef.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
            hasMovedRef.current = true;
            setIsDragging(true);
        }

        if (hasMovedRef.current) {
            let newX = initialPosRef.current.x + dx;
            let newY = initialPosRef.current.y + dy;

            if (panelRef.current) {
                const { offsetWidth, offsetHeight } = panelRef.current;
                const padding = 10;
                newX = Math.max(padding, Math.min(newX, window.innerWidth - offsetWidth - padding));
                newY = Math.max(padding, Math.min(newY, window.innerHeight - offsetHeight - padding));
            }
            setPosition({ x: newX, y: newY });
        }
    }, []);

    const handleWindowMouseUp = useCallback((e: MouseEvent) => {
        window.removeEventListener('mousemove', handleWindowMouseMove);
        window.removeEventListener('mouseup', handleWindowMouseUp);
        setIsDragging(false);

        if (!hasMovedRef.current) {
            setIsOpen(prev => {
                if (!prev) return true;
                return prev;
            });
        }
        
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
    }, [handleWindowMouseMove]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isOpen && (e.target as HTMLElement).closest('button')) return;
        
        e.preventDefault();
        
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        initialPosRef.current = { ...position };
        hasMovedRef.current = false;
        
        document.body.style.userSelect = 'none';
        
        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);
    };

    if (!isOpen) {
        return (
            <div
                ref={panelRef}
                onMouseDown={handleMouseDown}
                style={{ left: position.x, top: position.y }}
                className={`fixed z-[5000] bg-white/80 backdrop-blur-xl p-3 rounded-xl shadow-lg border border-white/50 text-[#1D1D1F] hover:bg-white transition-colors ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                title="打開工作區域設定 (按住可拖曳)"
            >
                <ArtboardIcon />
            </div>
        );
    }

    return (
        <div 
            ref={panelRef}
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                width: 320,
                zIndex: 5000,
            }}
            className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.12)] border border-white/50 flex flex-col overflow-hidden animate-fade-in-right"
        >
            {/* Header */}
            <div 
                className={`p-4 border-b border-black/5 bg-white/50 flex justify-between items-center select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                onMouseDown={handleMouseDown}
            >
                <div className="flex items-center gap-2 pointer-events-none">
                    <ArtboardIcon />
                    <span className="text-sm font-bold text-[#1D1D1F]">工作區域設定</span>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                    className="text-[#86868B] hover:text-[#1D1D1F] p-1 rounded-md hover:bg-black/5 transition-colors cursor-pointer"
                >
                    &times;
                </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
                {/* Name */}
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#86868B] uppercase tracking-wider">名稱</label>
                    <input 
                        type="text"
                        value={element.artboardName}
                        onChange={(e) => onUpdate({ artboardName: e.target.value })}
                        className="w-full bg-[#F5F5F7] border border-transparent focus:border-[#007AFF] rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                    />
                </div>

                {/* Preset Size */}
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#86868B] uppercase tracking-wider">尺寸預設</label>
                    <select
                        value={element.presetName || ''}
                        onChange={(e) => {
                            const preset = ARTBOARD_PRESETS.find(p => p.name === e.target.value);
                            if (preset) {
                                onUpdate({ 
                                    width: Math.round(preset.w), 
                                    height: Math.round(preset.h), 
                                    presetName: preset.name 
                                });
                            }
                        }}
                        className="w-full bg-[#F5F5F7] border border-transparent focus:border-[#007AFF] rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                    >
                        <option value="" disabled>選擇尺寸...</option>
                        {ARTBOARD_PRESETS.map(preset => (
                            <option key={preset.name} value={preset.name}>
                                {preset.name} ({Math.round(preset.w)} x {Math.round(preset.h)})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Custom Size */}
                <div className="flex gap-2">
                    <div className="flex-1 space-y-1.5">
                        <label className="text-xs font-bold text-[#86868B] uppercase tracking-wider">寬度</label>
                        <input 
                            type="number"
                            value={widthInput}
                            onChange={e => setWidthInput(e.target.value)}
                            onBlur={() => {
                                const val = Math.max(10, Math.round(Number(widthInput) || element.width));
                                setWidthInput(String(val));
                                onUpdate({ width: val, presetName: '自訂尺寸' });
                            }}
                            className="w-full bg-[#F5F5F7] border border-transparent focus:border-[#007AFF] rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                        />
                    </div>
                    <div className="flex-1 space-y-1.5">
                        <label className="text-xs font-bold text-[#86868B] uppercase tracking-wider">高度</label>
                        <input 
                            type="number"
                            value={heightInput}
                            onChange={e => setHeightInput(e.target.value)}
                            onBlur={() => {
                                const val = Math.max(10, Math.round(Number(heightInput) || element.height));
                                setHeightInput(String(val));
                                onUpdate({ height: val, presetName: '自訂尺寸' });
                            }}
                            className="w-full bg-[#F5F5F7] border border-transparent focus:border-[#007AFF] rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                        />
                    </div>
                </div>

                {/* Background Color */}
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#86868B] uppercase tracking-wider">背景顏色</label>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => onUpdate({ backgroundColor: '#ffffff' })}
                            className={`w-8 h-8 rounded-full border-2 ${element.backgroundColor === '#ffffff' ? 'border-[#007AFF]' : 'border-gray-200'} bg-white`}
                            title="白色"
                        />
                        <button 
                            onClick={() => onUpdate({ backgroundColor: 'transparent' })}
                            className={`w-8 h-8 rounded-full border-2 ${element.backgroundColor === 'transparent' ? 'border-[#007AFF]' : 'border-gray-200'} bg-gray-100 flex items-center justify-center`}
                            title="透明"
                        >
                            <div className="w-full h-full rounded-full" style={{ backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px' }} />
                        </button>
                    </div>
                </div>

                {/* Export Button */}
                <div className="pt-4 border-t border-gray-100">
                    <button 
                        onClick={onExport}
                        className="w-full py-2.5 bg-[#007AFF] text-white rounded-xl text-sm font-bold hover:bg-[#0066CC] transition-colors shadow-sm active:scale-95"
                    >
                        匯出此工作區域
                    </button>
                </div>
            </div>
        </div>
    );
};
