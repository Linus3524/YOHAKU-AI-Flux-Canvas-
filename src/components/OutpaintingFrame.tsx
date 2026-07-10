// 外擴（Outpainting）外框 + 生成面板：從 InfiniteCanvas.tsx 原樣搬出（零邏輯改動）
import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Point, OutpaintingState } from '../types';
import { Icon } from './Icon';

interface OutpaintingFrameProps {
  outpaintingState: OutpaintingState;
  zoom: number;
  onUpdateFrame: (newFrame: { position: Point; width: number; height: number; }) => void;
}

export const OutpaintingFrame: React.FC<OutpaintingFrameProps> = ({ outpaintingState, zoom, onUpdateFrame }) => {
    const interactionRef = useRef<{
        type: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
        startFrame: OutpaintingState['frame'];
        startPoint: Point;
        startAspectRatio: number;
    } | null>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent, type: NonNullable<typeof interactionRef.current>['type']) => {
        e.stopPropagation();
        interactionRef.current = {
            type,
            startFrame: outpaintingState.frame,
            startPoint: { x: e.clientX, y: e.clientY },
            startAspectRatio: outpaintingState.frame.width / outpaintingState.frame.height,
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [outpaintingState.frame]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!interactionRef.current) return;
        const { type, startFrame, startPoint, startAspectRatio } = interactionRef.current;
        const dx = (e.clientX - startPoint.x) / zoom;
        const dy = (e.clientY - startPoint.y) / zoom;
        
        // 1. Identify Original Image Bounds (The Hard Limit)
        const img = outpaintingState.element;
        const imgHalfW = img.width / 2;
        const imgHalfH = img.height / 2;
        const imgLeft = img.position.x - imgHalfW;
        const imgRight = img.position.x + imgHalfW;
        const imgTop = img.position.y - imgHalfH;
        const imgBottom = img.position.y + imgHalfH;

        // 2. Identify Start Frame Bounds
        const startHalfW = startFrame.width / 2;
        const startHalfH = startFrame.height / 2;
        const startLeft = startFrame.position.x - startHalfW;
        const startRight = startFrame.position.x + startHalfW;
        const startTop = startFrame.position.y - startHalfH;
        const startBottom = startFrame.position.y + startHalfH;

        // 3. Calculate Proposed Bounds based on Drag
        let newLeft = startLeft;
        let newRight = startRight;
        let newTop = startTop;
        let newBottom = startBottom;

        if (type.includes('w')) newLeft += dx;
        if (type.includes('e')) newRight += dx;
        if (type.includes('n')) newTop += dy;
        if (type.includes('s')) newBottom += dy;

        // 4. Apply Hard Constraints (Prevent shrinking into image)
        if (type.includes('w')) newLeft = Math.min(newLeft, imgLeft);
        if (type.includes('e')) newRight = Math.max(newRight, imgRight);
        if (type.includes('n')) newTop = Math.min(newTop, imgTop);
        if (type.includes('s')) newBottom = Math.max(newBottom, imgBottom);

        // 5. Apply Aspect Ratio Constraint (Shift Key) - Corners Only
        if (e.shiftKey && type.length === 2) {
            let currentW = newRight - newLeft;
            let currentH = newBottom - newTop;

            if (type.includes('e') || type.includes('w')) {
                const targetH = currentW / startAspectRatio;
                if (type.includes('s')) {
                    newBottom = newTop + targetH;
                    if (newBottom < imgBottom) {
                        newBottom = imgBottom;
                        const targetW = (newBottom - newTop) * startAspectRatio;
                        if (type.includes('e')) newRight = newLeft + targetW;
                        if (type.includes('w')) newLeft = newRight - targetW;
                    }
                } else if (type.includes('n')) {
                    newTop = newBottom - targetH;
                    if (newTop > imgTop) {
                        newTop = imgTop;
                        const targetW = (newBottom - newTop) * startAspectRatio;
                        if (type.includes('e')) newRight = newLeft + targetW;
                        if (type.includes('w')) newLeft = newRight - targetW;
                    }
                }
            }
        }

        // 6. Final Clamp Check (Safety)
        newLeft = Math.min(newLeft, imgLeft);
        newRight = Math.max(newRight, imgRight);
        newTop = Math.min(newTop, imgTop);
        newBottom = Math.max(newBottom, imgBottom);

        // 7. Construct Result
        const finalWidth = newRight - newLeft;
        const finalHeight = newBottom - newTop;
        const finalX = newLeft + finalWidth / 2;
        const finalY = newTop + finalHeight / 2;

        onUpdateFrame({ 
            position: { x: finalX, y: finalY }, 
            width: finalWidth, 
            height: finalHeight 
        });

    }, [zoom, onUpdateFrame, outpaintingState.element]);

    const handleMouseUp = useCallback(() => {
        interactionRef.current = null;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    }, []);

    const frameStyle: React.CSSProperties = {
      position: 'absolute',
      left: outpaintingState.frame.position.x,
      top: outpaintingState.frame.position.y,
      width: outpaintingState.frame.width,
      height: outpaintingState.frame.height,
      transform: `translate(-50%, -50%)`,
    };

    return (
        <>
            <div style={frameStyle} className="pointer-events-none border-2 border-dashed border-[#8B3DFF] bg-[#8B3DFF]/10 rounded-lg"></div>
            <div style={frameStyle} className="pointer-events-auto">
                {['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map(dir => (
                    <div
                        key={dir}
                        onMouseDown={e => handleMouseDown(e, dir as any)}
                        className={`absolute w-3 h-3 bg-white border border-[#8B3DFF] shadow-sm rounded-full transform-handle
                            ${dir.includes('n') ? 'top-0 -translate-y-1/2' : ''}
                            ${dir.includes('s') ? 'bottom-0 translate-y-1/2' : ''}
                            ${dir.includes('e') ? 'right-0 translate-x-1/2' : ''}
                            ${dir.includes('w') ? 'left-0 -translate-x-1/2' : ''}
                            ${!dir.includes('n') && !dir.includes('s') ? 'top-1/2 -translate-y-1/2' : ''}
                            ${!dir.includes('e') && !dir.includes('w') ? 'left-1/2 -translate-x-1/2' : ''}
                            cursor-${dir}-resize hover:scale-125 transition-transform`}
                    />
                ))}
            </div>
        </>
    );
};

const PANEL_W = 384;

export const DraggableOutpaintingPanel: React.FC<{
    outpaintingPrompt: string;
    setOutpaintingPrompt: (val: string) => void;
    isAutoPrompting: boolean;
    handleAutoPrompt: () => void;
    onGenerate: () => void;
    onCancel: () => void;
    model: 'gemini' | 'gpt' | 'seedream-v5-pro';
    setModel: (m: 'gemini' | 'gpt' | 'seedream-v5-pro') => void;
    hasAtlasKey: boolean;
    // Screen coordinates of the image's RIGHT edge and TOP edge, for initial placement
    frameScreenRight?: number;
    frameScreenTop?: number;
}> = ({ outpaintingPrompt, setOutpaintingPrompt, isAutoPrompting, handleAutoPrompt, onGenerate, onCancel, model, setModel, hasAtlasKey, frameScreenRight, frameScreenTop }) => {
    const PANEL_H_EST = 220;
    const GAP = 20;
    // Place panel to the right of the frame; fall back to right side of viewport
    const initX = frameScreenRight != null
        ? Math.min(frameScreenRight + GAP, window.innerWidth - PANEL_W - 8)
        : window.innerWidth - PANEL_W - 24;
    const initY = frameScreenTop != null
        ? Math.max(8, Math.min(frameScreenTop, window.innerHeight - PANEL_H_EST - 8))
        : Math.max(8, window.innerHeight / 2 - PANEL_H_EST / 2);

    const [position, setPosition] = useState({ x: initX, y: initY });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        // Only start drag from the panel background / header — not buttons, inputs, svg children
        const tag = (e.target as HTMLElement).tagName.toUpperCase();
        if (tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'SELECT') return;
        e.stopPropagation(); // prevent InfiniteCanvas from handling this event
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
            style={{
                left: position.x,
                top: position.y,
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 10px 25px -5px rgba(0,0,0,0.1)',
                borderRadius: 16,
                width: PANEL_W,
            }}
            className={`fixed z-[1001] overflow-hidden flex flex-col animate-fade-in-up ${isDragging ? 'cursor-grabbing' : ''}`}
            onMouseDown={handleMouseDown}
        >
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <Icon name="drag_indicator" size={14} className={`flex-shrink-0 transition-colors ${isDragging ? 'text-[#94a3b8] cursor-grabbing' : 'text-[#cbd5e1] hover:text-[#94a3b8] cursor-grab'}`} />
                    <h2 className="text-[13px] font-bold text-gray-900 tracking-tight">
                        AI 擴圖
                        <span className="text-gray-400 font-medium text-[11px] ml-1">(Outpainting)</span>
                    </h2>
                </div>
                <button
                    onClick={onCancel}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="text-gray-400 hover:text-gray-600 transition-colors hover:bg-gray-100 w-6 h-6 flex items-center justify-center rounded-full"
                >
                    <Icon name="close" size={14} />
                </button>
            </div>

            {/* Content */}
            <div className="px-4 pb-4 pt-2.5">
                {/* Command area */}
                <div
                    className="flex flex-col rounded-xl border transition-all duration-200 overflow-hidden"
                    style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}
                    onFocus={(e) => {
                        const el = e.currentTarget as HTMLDivElement;
                        el.style.background = '#ffffff';
                        el.style.borderColor = '#c084fc';
                        el.style.boxShadow = '0 0 0 3px rgba(192,132,252,0.1)';
                    }}
                    onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                            const el = e.currentTarget as HTMLDivElement;
                            el.style.background = '#f8fafc';
                            el.style.borderColor = '#e2e8f0';
                            el.style.boxShadow = 'none';
                        }
                    }}
                >
                    <textarea
                        value={outpaintingPrompt}
                        onChange={(e) => setOutpaintingPrompt(e.target.value)}
                        placeholder="描述擴展區域的內容，或點擊下方由 AI 為您發想..."
                        rows={3}
                        className="w-full bg-transparent border-none text-[13px] text-gray-800 placeholder-gray-400 px-3 py-2.5 outline-none leading-relaxed resize-y"
                        style={{ minHeight: 72, maxHeight: 200 }}
                        onMouseDown={(e) => e.stopPropagation()}
                    />

                    {/* Model toggle row */}
                    <div className="flex items-center gap-2 px-2.5 py-2 border-t border-gray-100">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">模型</span>
                        <div className="flex bg-gray-100 rounded-lg p-0.5" onMouseDown={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => setModel('gpt')}
                                disabled={!hasAtlasKey}
                                title={hasAtlasKey ? 'GPT Image 2 遮罩外擴：原圖保真、邊緣無縫融合（推薦）' : '需 Atlas Cloud Key'}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${model === 'gpt' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                GPT
                            </button>
                            <button
                                onClick={() => setModel('gemini')}
                                title="Gemini 智慧外擴：無縫拼接、免 Atlas Key"
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${model === 'gemini' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Gemini
                            </button>
                            <button
                                onClick={() => setModel('seedream-v5-pro')}
                                disabled={!hasAtlasKey}
                                title={hasAtlasKey ? '即夢 Seedream 5.0 Pro Edit 擴圖' : '需 Atlas Cloud Key'}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${model === 'seedream-v5-pro' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                即夢 Pro
                            </button>
                        </div>
                        <span className="text-[10px] text-gray-400 leading-tight">
                            {model === 'gpt' ? '原圖保真・無縫融合' : model === 'seedream-v5-pro' ? '即夢 Edit・場景延伸' : '無縫拼接・免 Key'}
                        </span>
                    </div>

                    {/* Action row */}
                    <div className="flex items-center justify-between px-2.5 py-2 border-t border-gray-100">
                        <button
                            onClick={handleAutoPrompt}
                            disabled={isAutoPrompting}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50"
                            style={{ background: 'rgba(168,85,247,0.08)', color: '#9333ea' }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(168,85,247,0.15)'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(168,85,247,0.08)'; }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/></svg>
                            {isAutoPrompting ? '分析中...' : '自動發想'}
                        </button>

                        <button
                            onClick={onGenerate}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="text-white px-4 py-1.5 rounded-lg text-[12px] font-bold flex items-center gap-1 transition-all"
                            style={{ background: 'linear-gradient(135deg,#a855f7 0%,#8b5cf6 100%)', boxShadow: '0 4px 12px rgba(139,92,246,0.25)' }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 16px rgba(139,92,246,0.35)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(139,92,246,0.25)'; (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"/></svg>
                            生成
                        </button>
                    </div>
                </div>

                {/* Microcopy hint */}
                <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-gray-500 leading-relaxed">
                    <Icon name="info" size={14} className="text-purple-600 flex-shrink-0" style={{ fontVariationSettings: "'opsz' 24, 'wght' 500, 'FILL' 0, 'GRAD' 0" }} />
                    <p>拖曳畫布上的 <span className="font-medium text-purple-600">紫色虛線框</span> 調整生成範圍。提示詞越精確，生成效果越好。</p>
                </div>
            </div>
        </div>
    );
}
