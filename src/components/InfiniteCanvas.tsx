
import React, { useState, useRef, useCallback, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import type { Point, CanvasElement, ImageElement, ShapeType, ShapeElement } from '../types';
import type { OutpaintingState } from '../types';
import { TransformableElement } from './TransformableElement';
import { AppearancePanel } from './AppearancePanel';
import { getModelSizes } from '../utils/atlasImage';

interface OutpaintingFrameProps {
  outpaintingState: OutpaintingState;
  zoom: number;
  onUpdateFrame: (newFrame: { position: Point; width: number; height: number; }) => void;
}

const OutpaintingFrame: React.FC<OutpaintingFrameProps> = ({ outpaintingState, zoom, onUpdateFrame }) => {
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

const DraggableOutpaintingPanel: React.FC<{
    outpaintingPrompt: string;
    setOutpaintingPrompt: (val: string) => void;
    isAutoPrompting: boolean;
    handleAutoPrompt: () => void;
    onGenerate: () => void;
    onCancel: () => void;
}> = ({ outpaintingPrompt, setOutpaintingPrompt, isAutoPrompting, handleAutoPrompt, onGenerate, onCancel }) => {
    const [position, setPosition] = useState({ x: window.innerWidth / 2 - 200, y: window.innerHeight - 140 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'BUTTON') return;
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
            style={{ left: position.x, top: position.y }}
            className={`fixed z-[1001] bg-white/90 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-white/50 flex flex-col gap-3 min-w-[400px] max-w-[500px] animate-fade-in-up ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={handleMouseDown}
        >
             <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                 <div className="flex items-center gap-2">
                     <svg width="6" height="10" viewBox="0 0 6 10" fill="currentColor" className="text-black/10"><circle cx="1" cy="1" r="1"/><circle cx="1" cy="5" r="1"/><circle cx="1" cy="9" r="1"/><circle cx="5" cy="1" r="1"/><circle cx="5" cy="5" r="1"/><circle cx="5" cy="9" r="1"/></svg>
                     <h3 className="font-bold text-[#1D1D1F]">AI 擴圖 (Outpainting)</h3>
                 </div>
                 <button onClick={onCancel} className="text-[#86868B] hover:text-[#1D1D1F]">&times;</button>
             </div>
             
             <div className="flex gap-2 items-start">
                 <div className="relative flex-grow">
                    <textarea 
                        value={outpaintingPrompt}
                        onChange={(e) => setOutpaintingPrompt(e.target.value)}
                        placeholder="描述擴展區域的內容..." 
                        className="w-full bg-[#F5F5F7] border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-black/5 outline-none cursor-text resize-y min-h-[50px] max-h-[150px] leading-relaxed"
                        onMouseDown={(e) => e.stopPropagation()} 
                        rows={2}
                    />
                    <button 
                        onClick={handleAutoPrompt}
                        disabled={isAutoPrompting}
                        className="absolute right-1 bottom-1 px-2.5 py-1 text-[10px] font-bold text-[#AF52DE] bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100 hover:bg-gray-50 transition-all disabled:opacity-50 z-10"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {isAutoPrompting ? '分析中...' : '✨ 自動發想'}
                    </button>
                 </div>
                 <button 
                    onClick={onGenerate}
                    className="bg-black text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-800 transition-all shadow-lg shadow-black/10 h-fit whitespace-nowrap"
                    onMouseDown={(e) => e.stopPropagation()}
                 >
                     生成
                 </button>
             </div>
             <p className="text-[10px] text-[#86868B]">拖曳紫色虛線框調整生成範圍。提示詞越精確，效果越好。</p>
         </div>
    );
}

// ... CropManager ...
interface CropManagerProps {
    element: ImageElement;
    zoom: number;
    onCancel: () => void;
    onConfirm: (cropRect: { x: number, y: number, width: number, height: number }) => void;
}

const CropManager: React.FC<CropManagerProps> = ({ element, zoom, onCancel, onConfirm }) => {
    const [cropRect, setCropRect] = useState({ x: 0, y: 0, width: element.width, height: element.height });
    const dragRef = useRef<{ type: string, startPoint: Point, startRect: typeof cropRect } | null>(null);

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

    const renderHandle = (cursor: string, posClass: string, type: string) => (
        <div 
            className={`absolute w-3 h-3 bg-white border border-[#2997FF] rounded-full shadow-sm z-50 ${posClass}`}
            style={{ cursor }}
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
                className="absolute border border-white/80 shadow-[0_0_0_1px_rgba(41,151,255,1)]"
                style={{ left: cropRect.x, top: cropRect.y, width: cropRect.width, height: cropRect.height, cursor: 'move' }}
            >
                <div className="w-full h-full relative opacity-50 pointer-events-none">
                    <div className="absolute left-1/3 top-0 w-px h-full bg-white/50 shadow-[0_0_2px_rgba(0,0,0,0.5)]" />
                    <div className="absolute left-2/3 top-0 w-px h-full bg-white/50 shadow-[0_0_2px_rgba(0,0,0,0.5)]" />
                    <div className="absolute top-1/3 left-0 w-full h-px bg-white/50 shadow-[0_0_2px_rgba(0,0,0,0.5)]" />
                    <div className="absolute top-2/3 left-0 w-full h-px bg-white/50 shadow-[0_0_2px_rgba(0,0,0,0.5)]" />
                </div>
                {renderHandle('nw-resize', '-top-1.5 -left-1.5', 'nw')}
                {renderHandle('n-resize', '-top-1.5 left-1/2 -translate-x-1/2', 'n')}
                {renderHandle('ne-resize', '-top-1.5 -right-1.5', 'ne')}
                {renderHandle('e-resize', 'top-1/2 -translate-y-1/2 -right-1.5', 'e')}
                {renderHandle('se-resize', '-bottom-1.5 -right-1.5', 'se')}
                {renderHandle('s-resize', '-bottom-1.5 left-1/2 -translate-x-1/2', 's')}
                {renderHandle('sw-resize', '-bottom-1.5 -left-1.5', 'sw')}
                {renderHandle('w-resize', 'top-1/2 -translate-y-1/2 -left-1.5', 'w')}
            </div>

            <div 
                className="absolute left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto whitespace-nowrap z-[2001]"
                style={{ top: 'calc(100% + 16px)' }}
            >
                 <button 
                    onClick={onCancel}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md text-[#1D1D1F] text-xs font-bold border border-black/10 shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:bg-white hover:scale-105 transition-all active:scale-95"
                 >
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                     取消
                 </button>
                 <button 
                    onClick={() => onConfirm(cropRect)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/90 backdrop-blur-md text-white text-xs font-bold border border-transparent shadow-[0_4px_12px_rgba(0,0,0,0.2)] hover:bg-black hover:scale-105 transition-all active:scale-95"
                 >
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                     確認裁剪
                 </button>
            </div>
        </div>
    );
}

// ... Interfaces and Icons ...
interface InfiniteCanvasProps {
  elements: CanvasElement[];
  selectedElementIds: string[];
  onSelectElement: (id: string | null, shiftKey: boolean) => void;
  onMarqueeSelect: (ids: string[], shiftKey: boolean) => void;
  onUpdateElement: (element: CanvasElement, dragDelta?: Point) => void;
  onInteractionEnd: () => void;
  setResetViewCallback: (callback: () => void) => void;
  onGenerate: (selectedElements: CanvasElement[]) => void;
  onContextMenu: (e: React.MouseEvent, worldPoint: Point, elementId: string | null) => void;
  onEditDrawing: (elementId: string) => void;
  onCopySelection: () => void;
  onPasteSelection: () => void;
  onDuplicateSelection: () => void;
  onDuplicateInPlace: (activeId: string, isShift: boolean) => { [oldId: string]: CanvasElement };
  imageStyle: string;
  onSetImageStyle: (style: string) => void;
  imageAspectRatio: string;
  onSetImageAspectRatio: (ratio: string) => void;
  imageSize: '1K' | '2K' | '4K';
  onSetImageSize: (size: '1K' | '2K' | '4K') => void;
  preserveTransparency: boolean;
  onSetPreserveTransparency: (preserve: boolean) => void;
  outpaintingState: OutpaintingState | null;
  onUpdateOutpaintingFrame: (newFrame: { position: Point; width: number; height: number; }) => void;
  onCancelOutpainting: () => void;
  onOutpaintingGenerate: (prompt: string) => void;
  onAutoPromptGenerate: (state: OutpaintingState) => Promise<string>;
  stylePresets: { id: string, name: string, label: string }[];
  onCameraAngle: (prompt: string) => void;
  onRemoveBackground: (mode: string) => void;
  onHarmonize: () => void;
  isGenerating: boolean;
  generatingElementIds?: string[];
  croppingElementId: string | null;
  onCancelCrop: () => void;
  onApplyCrop: (cropRect: { x: number, y: number, width: number, height: number }) => void;
  interactionMode: 'select' | 'hand';
  activeShapeTool: ShapeType | null; 
  onUpscale: (factor: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  generationModel?: string;
  onSetGenerationModel?: (model: string) => void;
  hasAtlasKey?: boolean;
}

// ... (MarqueeRect, CanvasApi, Constants, CameraIcons, SelectionMenuIcons, CAMERA_ANGLES, ASPECT_RATIOS) ...
interface MarqueeRect {
  start: Point;
  end: Point;
}

export interface CanvasApi {
  screenToWorld: (screenPoint: Point) => Point;
  fitToScreen: () => void;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

const CameraIcons = {
    TopLeft: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10"/><path d="M7 7v10"/></svg>, 
    Top: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>, 
    TopRight: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7"/><path d="M17 7H7"/><path d="M17 7v10"/></svg>, 
    NW: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="19" x2="5" y2="5"></line><polyline points="19 5 5 5 5 19"></polyline></svg>,
    N:  () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>,
    NE: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="19" x2="19" y2="5"></line><polyline points="5 5 19 5 19 5 19 19"></polyline></svg>,
    W:  () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>,
    Center: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="6" /></svg>,
    E:  () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>,
    SW: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"></line><polyline points="19 19 5 19 5 5"></polyline></svg>,
    S:  () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>,
    SE: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="5" x2="19" y2="19"></line><polyline points="5 19 19 19 19 5"></polyline></svg>,
};

const SelectionMenuIcons = {
    MagicFilled: () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>),
    Settings: () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>),
    Collapse: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>),
    Upscale: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M14 10l6.1-6.1M9 21H3v-6M10 14l-6.1 6.1"/></svg>)
};

const CAMERA_ANGLES = [
  { id: 'top-left', icon: <CameraIcons.NW />, label: '俯視左上', prompt: 'high angle shot from top-left corner, looking down' },
  { id: 'top', icon: <CameraIcons.N />, label: '正俯視', prompt: "bird's-eye view, directly overhead, extreme high angle" },
  { id: 'top-right', icon: <CameraIcons.NE />, label: '俯視右上', prompt: 'high angle shot from top-right corner, looking down' },
  { id: 'left', icon: <CameraIcons.W />, label: '左側視', prompt: 'camera is on the LEFT side of the subject, subject faces RIGHT, we see the subject\'s right profile' },
  { id: 'center', icon: <CameraIcons.Center />, label: '正視', prompt: 'straight-on front view, eye-level, facing camera directly' },
  { id: 'right', icon: <CameraIcons.E />, label: '右側視', prompt: 'camera is on the RIGHT side of the subject, subject faces LEFT, we see the subject\'s left profile' },
  { id: 'bottom-left', icon: <CameraIcons.SW />, label: '仰視左下', prompt: "worm's-eye view from bottom-left, looking up" },
  { id: 'bottom', icon: <CameraIcons.S />, label: '正仰視', prompt: "worm's-eye view, directly below, looking straight up" },
  { id: 'bottom-right', icon: <CameraIcons.SE />, label: '仰視右下', prompt: "worm's-eye view from bottom-right, looking up" },
];

const ASPECT_RATIOS = [
  { value: 'Original', label: '原圖比例 (Original)' },
  { value: '1:1', label: '1:1 正方形 (Instagram/Social)' },
  { value: '3:4', label: '3:4 傳統比例 (Portrait)' },
  { value: '4:3', label: '4:3 傳統比例 (Landscape)' },
  { value: '9:16', label: '9:16 手機全螢幕 (Reels/Shorts)' },
  { value: '16:9', label: '16:9 寬螢幕 (YouTube)' },
  { value: '2:3', label: '2:3 經典相機 (DSLR)' },
  { value: '3:2', label: '3:2 經典相機 (DSLR)' },
  { value: '21:9', label: '21:9 電影感 (Cinematic)' },
];

export const InfiniteCanvas = forwardRef<CanvasApi, InfiniteCanvasProps>(({ 
  elements, 
  selectedElementIds, 
  onSelectElement,
  onMarqueeSelect, 
  onUpdateElement, 
  onInteractionEnd,
  setResetViewCallback,
  onGenerate,
  onContextMenu,
  onEditDrawing,
  onCopySelection,
  onPasteSelection,
  onDuplicateSelection,
  onDuplicateInPlace,
  imageStyle,
  onSetImageStyle,
  imageAspectRatio,
  onSetImageAspectRatio,
  imageSize,
  onSetImageSize,
  preserveTransparency,
  onSetPreserveTransparency,
  outpaintingState,
  onUpdateOutpaintingFrame,
  onCancelOutpainting,
  onOutpaintingGenerate,
  onAutoPromptGenerate,
  stylePresets,
  onCameraAngle,
  onRemoveBackground,
  onHarmonize,
  isGenerating,
  generatingElementIds = [],
  croppingElementId,
  onCancelCrop,
  onApplyCrop,
  interactionMode,
  activeShapeTool,
  onUpscale,
  onDragStart,
  onDragEnd,
  generationModel = 'gemini',
  onSetGenerationModel,
  hasAtlasKey = false,
}, ref) => {
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<Point>({ x: 0, y: 0 });
  const [isSpacebarPressed, setIsSpacebarPressed] = useState(false);
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);
  const [outpaintingPrompt, setOutpaintingPrompt] = useState('');
  const [isAutoPrompting, setIsAutoPrompting] = useState(false);
  
  const [menuOffset, setMenuOffset] = useState<Point>({ x: 20, y: 0 }); 
  const [isDraggingMenu, setIsDraggingMenu] = useState(false);
  const [isMenuExpanded, setIsMenuExpanded] = useState(false); 
  // ✅ New state declaration
  const [showGen, setShowGen] = useState(true);
  const [showTools, setShowTools] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [showAppearance, setShowAppearance] = useState(true); // ✅ 新增
  const menuDragStartRef = useRef<Point>({ x: 0, y: 0 });
  const [upscaleFactor, setUpscaleFactor] = useState<number>(2);
  const [ratioOpen, setRatioOpen] = useState(false);
  const ratioRef = useRef<HTMLDivElement>(null);
  const isArtboardSelected = useMemo(() => elements.some(el => selectedElementIds.includes(el.id) && el.type === 'artboard'), [elements, selectedElementIds]);
  const isOnlyArrowSelected = useMemo(() => {
      const selected = elements.filter(el => selectedElementIds.includes(el.id));
      return selected.length > 0 && selected.every(el => el.type === 'arrow');
  }, [elements, selectedElementIds]);

  const canvasRef = useRef<HTMLDivElement>(null);
  
  const screenToWorld = useCallback((screenPoint: Point): Point => {
    return {
      x: (screenPoint.x - pan.x) / zoom,
      y: (screenPoint.y - pan.y) / zoom,
    };
  }, [pan, zoom]);
  
  const worldToScreen = useCallback((worldPoint: Point): Point => {
      return {
          x: worldPoint.x * zoom + pan.x,
          y: worldPoint.y * zoom + pan.y
      };
  }, [pan, zoom]);

  useEffect(() => {
    if (outpaintingState?.element.id) {
        setOutpaintingPrompt('');
    }
  }, [outpaintingState?.element.id]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
        if (ratioRef.current && !ratioRef.current.contains(e.target as Node)) setRatioOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);


  useEffect(() => {
      if (selectedElementIds.length === 0) {
          setMenuOffset({ x: 20, y: 0 });
      }
      setIsMenuExpanded(false);
  }, [selectedElementIds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable) {
            return;
        }
        e.preventDefault();
        setIsSpacebarPressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacebarPressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.floating-menu')) return;
    if ((e.target as HTMLElement).closest('button')) return;
    
    if (croppingElementId) {
        if (!isSpacebarPressed && e.button !== 1) return;
    }

    if (activeShapeTool && e.button === 0) {
        return; 
    }

    if (isSpacebarPressed || e.button === 1 || interactionMode === 'hand') {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else if (e.button === 0) {
      if (!outpaintingState && !croppingElementId) { 
        if (!e.shiftKey) {
            onSelectElement(null, false);
        }
        const point = screenToWorld({ x: e.clientX, y: e.clientY });
        setMarqueeRect({ start: point, end: point });
      }
    }
  }, [isSpacebarPressed, pan, outpaintingState, onSelectElement, screenToWorld, croppingElementId, interactionMode, activeShapeTool]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingMenu) {
        e.preventDefault();
        const dx = e.clientX - menuDragStartRef.current.x;
        const dy = e.clientY - menuDragStartRef.current.y;
        setMenuOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        menuDragStartRef.current = { x: e.clientX, y: e.clientY };
        return;
    }

    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    } else if (marqueeRect) {
        const point = screenToWorld({ x: e.clientX, y: e.clientY });
        setMarqueeRect(prev => prev ? { ...prev, end: point } : null);
    }
  }, [isPanning, startPan, marqueeRect, screenToWorld, isDraggingMenu]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setIsDraggingMenu(false);
    if (marqueeRect) {
        const x1 = Math.min(marqueeRect.start.x, marqueeRect.end.x);
        const y1 = Math.min(marqueeRect.start.y, marqueeRect.end.y);
        const x2 = Math.max(marqueeRect.start.x, marqueeRect.end.x);
        const y2 = Math.max(marqueeRect.start.y, marqueeRect.end.y);
        
        const selectedIds = elements.filter(el => {
            const elRight = el.position.x + el.width / 2;
            const elLeft = el.position.x - el.width / 2;
            const elBottom = el.position.y + el.height / 2;
            const elTop = el.position.y - el.height / 2;
            
            return !el.isLocked && (elLeft < x2 && elRight > x1 && elTop < y2 && elBottom > y1); // ✅ 修改
        }).map(el => el.id);
        
        if (selectedIds.length > 0) {
            onMarqueeSelect(selectedIds, true);
        }
        setMarqueeRect(null);
    }
  }, [marqueeRect, elements, onMarqueeSelect]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomSensitivity = 0.001;
      const newZoom = Math.min(Math.max(MIN_ZOOM, zoom - e.deltaY * zoomSensitivity), MAX_ZOOM);
      
      const mouseX = e.clientX - pan.x;
      const mouseY = e.clientY - pan.y;
      
      const newPanX = e.clientX - (mouseX / zoom) * newZoom;
      const newPanY = e.clientY - (mouseY / zoom) * newZoom;

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    } else {
      setPan(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  }, [zoom, pan]);

  const handleMenuMouseDown = (e: React.MouseEvent) => {
      e.stopPropagation();
      if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'SELECT' || (e.target as HTMLElement).tagName === 'OPTION' || (e.target as HTMLElement).tagName === 'INPUT') return;
      
      setIsDraggingMenu(true);
      menuDragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    setResetViewCallback(() => {
      setPan({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      setZoom(1);
    });
  }, [setResetViewCallback]);
  
  useEffect(() => {
      setPan({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      setZoom(1);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, elementId: string | null) => {
      e.preventDefault();
      const worldPoint = screenToWorld({ x: e.clientX, y: e.clientY });
      onContextMenu(e, worldPoint, elementId);
  };
  
  const handleAutoPrompt = async () => {
      if (!outpaintingState) return;
      setIsAutoPrompting(true);
      try {
          const prompt = await onAutoPromptGenerate(outpaintingState);
          setOutpaintingPrompt(prompt);
      } catch (e) {
          console.error(e);
          alert("自動生成提示詞失敗");
      } finally {
          setIsAutoPrompting(false);
      }
  };

  const handleZoomStep = (delta: number) => {
      setZoom(prev => {
          let newZoom = prev + delta;
          newZoom = Math.round(newZoom * 10) / 10;
          return Math.min(Math.max(MIN_ZOOM, newZoom), MAX_ZOOM);
      });
  };

  const handleFitToScreen = useCallback(() => {
      if (elements.length === 0) {
          setPan({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
          setZoom(1);
          return;
      }
      
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      elements.forEach(el => {
          minX = Math.min(minX, el.position.x - el.width / 2);
          maxX = Math.max(maxX, el.position.x + el.width / 2);
          minY = Math.min(minY, el.position.y - el.height / 2);
          maxY = Math.max(maxY, el.position.y + el.height / 2);
      });

      const padding = 100;
      const width = maxX - minX + padding * 2;
      const height = maxY - minY + padding * 2;
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      const containerW = canvasRef.current?.clientWidth || window.innerWidth;
      const containerH = canvasRef.current?.clientHeight || window.innerHeight;

      const zoomFit = Math.min(
          (containerW) / width,
          (containerH) / height,
          1
      );
      
      const newZoom = Math.max(MIN_ZOOM, zoomFit);

      const newPanX = (containerW / 2) - (centerX * newZoom);
      const newPanY = (containerH / 2) - (centerY * newZoom);

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });

  }, [elements]);

  useImperativeHandle(ref, () => ({
    screenToWorld,
    fitToScreen: handleFitToScreen,
  }), [screenToWorld, handleFitToScreen]);

  const selectionBounds = useMemo(() => {
      if (selectedElementIds.length === 0) return null;
      const selectedEls = elements.filter(el => selectedElementIds.includes(el.id));
      if (selectedEls.length === 0) return null;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      selectedEls.forEach(el => {
          minX = Math.min(minX, el.position.x - el.width / 2);
          maxX = Math.max(maxX, el.position.x + el.width / 2);
          minY = Math.min(minY, el.position.y - el.height / 2);
          maxY = Math.max(maxY, el.position.y + el.height / 2);
      });
      return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }, [elements, selectedElementIds]);

  const menuPosition = useMemo(() => {
      if (!selectionBounds) return null;
      const anchorWorld = { x: selectionBounds.maxX, y: selectionBounds.minY };
      const anchorScreen = worldToScreen(anchorWorld);
      return {
          left: anchorScreen.x + menuOffset.x,
          top: anchorScreen.y + menuOffset.y
      };
  }, [selectionBounds, worldToScreen, menuOffset]);

  const hasTextSelected = useMemo(() => {
      return elements.some(el => selectedElementIds.includes(el.id) && el.type === 'text');
  }, [elements, selectedElementIds]);

  const selectedEls = useMemo(() => elements.filter(el => selectedElementIds.includes(el.id)), [elements, selectedElementIds]);
  const hasImageOrDrawingOrShape = useMemo(() => selectedEls.some(el => el.type === 'image' || el.type === 'drawing' || el.type === 'shape'), [selectedEls]);
  const hasNote = useMemo(() => selectedEls.some(el => el.type === 'note'), [selectedEls]);
  
  const showGenerativeSettings = hasImageOrDrawingOrShape || hasNote;
  
  // Update logic: Only show Harmonize if 2 or more images are selected
  const selectedImagesCount = useMemo(() => 
      elements.filter(el => selectedElementIds.includes(el.id) && el.type === 'image').length
  , [elements, selectedElementIds]);

  const croppingElement = useMemo(() => {
      if (!croppingElementId) return null;
      return elements.find(el => el.id === croppingElementId) as ImageElement | undefined;
  }, [croppingElementId, elements]);

  const shouldHideMenu = (hasTextSelected && !hasImageOrDrawingOrShape); 

  return (
    <div 
      ref={canvasRef}
      className={`w-full h-full overflow-hidden relative 
        ${isSpacebarPressed || interactionMode === 'hand' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : (activeShapeTool ? 'cursor-crosshair' : 'cursor-default')}
      `}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={(e) => handleContextMenu(e, null)}
    >
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      />

      <div 
        className="absolute inset-0 origin-top-left"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
      >
        {
          [...elements].sort((a, b) => {
            if (a.type === 'artboard' && b.type !== 'artboard') return -1;
            if (a.type !== 'artboard' && b.type === 'artboard') return 1;
            return a.zIndex - b.zIndex;
          }).map(el => (
          <TransformableElement
            key={el.id}
            element={el}
            isSelected={selectedElementIds.includes(el.id) && croppingElementId !== el.id}
            isOutpainting={!!outpaintingState && outpaintingState.element.id === el.id}
            zoom={zoom}
            onSelect={onSelectElement}
            onUpdate={onUpdateElement}
            onInteractionEnd={onInteractionEnd}
            onContextMenu={(e, screenPoint, id) => onContextMenu(e, screenToWorld(screenPoint), id)}
            onEditDrawing={onEditDrawing}
            onDuplicateInPlace={onDuplicateInPlace}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            interactionMode={interactionMode}
            screenToWorld={screenToWorld}
          />
        ))}
        
        {/* In-place loading shimmer overlays */}
        {generatingElementIds.map(id => {
          const el = elements.find(e => e.id === id);
          if (!el || el.type === 'artboard') return null;
          return (
            <div
              key={`shimmer-${id}`}
              className="absolute pointer-events-none overflow-hidden"
              style={{
                left: el.position.x,
                top: el.position.y,
                width: el.width,
                height: el.height,
                transform: `translate(-50%, -50%) rotate(${el.rotation}deg)`,
                zIndex: el.zIndex + 9999,
                borderRadius: el.type === 'note' ? '12px' : '6px',
              }}
            >
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-black/25" />
              {/* Shimmer sweep */}
              <div className="absolute inset-0 animate-shimmer" />
              {/* Center badge */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/90 backdrop-blur-md rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow-lg">
                  <svg className="animate-spin h-3 w-3 text-gray-800 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  <span className="text-[11px] font-semibold text-gray-800 whitespace-nowrap">AI 運算中</span>
                </div>
              </div>
            </div>
          );
        })}

        {croppingElement && (
            <CropManager
                element={croppingElement}
                zoom={zoom}
                onCancel={onCancelCrop}
                onConfirm={onApplyCrop}
            />
        )}
        
        {marqueeRect && (
            <div 
                className="absolute border border-[#007AFF] bg-[#007AFF]/10 pointer-events-none"
                style={{
                    left: Math.min(marqueeRect.start.x, marqueeRect.end.x),
                    top: Math.min(marqueeRect.start.y, marqueeRect.end.y),
                    width: Math.abs(marqueeRect.end.x - marqueeRect.start.x),
                    height: Math.abs(marqueeRect.end.y - marqueeRect.start.y),
                }}
            />
        )}

        {outpaintingState && (
            <OutpaintingFrame 
                outpaintingState={outpaintingState} 
                zoom={zoom} 
                onUpdateFrame={onUpdateOutpaintingFrame} 
            />
        )}
      </div>

      {outpaintingState && (
         <DraggableOutpaintingPanel 
            outpaintingPrompt={outpaintingPrompt}
            setOutpaintingPrompt={setOutpaintingPrompt}
            isAutoPrompting={isAutoPrompting}
            handleAutoPrompt={handleAutoPrompt}
            onGenerate={() => onOutpaintingGenerate(outpaintingPrompt)}
            onCancel={onCancelOutpainting}
         />
      )}
      
      <div className="absolute bottom-6 right-6 z-20 flex items-center gap-3">
          <div className="flex items-center bg-white/90 backdrop-blur-xl rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.08)] border border-black/5 p-1 h-10">
              <button 
                  onClick={() => handleZoomStep(-0.1)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 text-[#1D1D1F] transition-colors"
                  aria-label="Zoom Out"
              >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
              
              <span className="w-12 text-center text-xs font-mono font-medium text-[#1D1D1F] select-none">
                  {Math.round(zoom * 100)}%
              </span>

              <button 
                  onClick={() => handleZoomStep(0.1)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 text-[#1D1D1F] transition-colors"
                  aria-label="Zoom In"
              >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
          </div>

          <button 
              onClick={handleFitToScreen}
              className="w-10 h-10 bg-white/90 backdrop-blur-xl rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.08)] border border-black/5 flex items-center justify-center text-[#1D1D1F] hover:bg-white hover:scale-105 transition-all active:scale-95"
              title="適合畫面 (Fit to Screen)"
          >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
          </button>
      </div>

      {!outpaintingState && !isGenerating && !croppingElementId && selectedElementIds.length > 0 && !isArtboardSelected && !isOnlyArrowSelected && !shouldHideMenu && menuPosition && (
          <div style={{
              position: 'absolute',
              left: menuPosition.left,
              top: menuPosition.top,
              transform: `scale(${Math.max(0.65, Math.min(1, zoom))})`,
              transformOrigin: 'top left',
              zIndex: 50,
          }}>
              {isMenuExpanded ? (
                <div 
                    className="floating-menu bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-white/50 p-4 flex flex-col gap-4 min-w-[320px] animate-fade-in-up"
                    style={{
                        cursor: isDraggingMenu ? 'grabbing' : 'grab'
                    }}
                    onMouseDown={handleMenuMouseDown}
                >
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-200 rounded-full opacity-50" />
                    
                    <div className="flex items-center justify-between mt-1 mb-2 pl-1 pr-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#86868B] uppercase tracking-wider select-none">
                                {selectedElementIds.length} 個物件已選取
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                             <button onClick={() => setIsMenuExpanded(false)} className="text-[#86868B] hover:text-[#1D1D1F] transition-colors p-1 rounded-full hover:bg-black/5" title="收折選單">
                                 <SelectionMenuIcons.Collapse />
                             </button>
                        </div>
                    </div>

                    {selectedImagesCount >= 2 && (
                        <button 
                            onClick={onHarmonize}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white py-2 rounded-xl text-sm font-semibold shadow-md shadow-orange-500/20 hover:opacity-90 transition-all active:scale-95"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                            一鍵調和
                        </button>
                    )}

                    {elements.filter(el => selectedElementIds.includes(el.id)).some(el => ['image', 'drawing', 'shape', 'text', 'note'].includes(el.type)) && (
                        <div className="flex w-full">
                            <button 
                                onClick={() => onGenerate(elements.filter(el => selectedElementIds.includes(el.id)))}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#AF52DE] to-[#5856D6] text-white py-3 rounded-xl text-sm font-semibold shadow-lg shadow-purple-500/20 hover:opacity-90 transition-all active:scale-95"
                            >
                                <SelectionMenuIcons.MagicFilled />
                                一鍵生成圖片
                            </button>
                        </div>
                    )}
                    
                    {showGenerativeSettings && (
                        <div className="-mx-4 flex flex-col">
                            <div className="h-px bg-gray-100 w-full" />
                            
                            {/* 生成設定 */}
                            <div 
                                className="flex justify-between items-center px-4 py-2.5 cursor-pointer hover:bg-gray-50"
                                onClick={() => setShowGen(!showGen)}
                            >
                                <span className="text-xs font-semibold text-[#1D1D1F]">生成設定</span>
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                                    style={{ transform: showGen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                    <path d="M2 3.5l3 3 3-3" stroke="#86868B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            {showGen && (
                                <div className="px-4 pb-3 flex flex-col gap-3">
                                    {/* 生圖模型 */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-[#1D1D1F]">生圖模型</label>
                                        <div className="relative">
                                            <select
                                                value={generationModel}
                                                onChange={(e) => onSetGenerationModel?.(e.target.value)}
                                                className="w-full bg-[#F5F5F7] border-none rounded-lg px-3 py-2 text-sm text-[#1D1D1F] focus:ring-2 focus:ring-black/5 cursor-pointer appearance-none"
                                            >
                                                <option value="gemini">Gemini 3 Pro（預設）</option>
                                                <option value="gpt-image-2" disabled={!hasAtlasKey}>GPT Image 2{!hasAtlasKey ? '（需 Atlas Key）' : ''}</option>
                                                <option value="seedream-v4.5" disabled={!hasAtlasKey}>即夢 Seedream v4.5{!hasAtlasKey ? '（需 Atlas Key）' : ''}</option>
                                                <option value="seedream-v5" disabled={!hasAtlasKey}>即夢 Seedream v5 Lite{!hasAtlasKey ? '（需 Atlas Key）' : ''}</option>
                                                <option value="flux-dev" disabled={!hasAtlasKey}>Flux Dev{!hasAtlasKey ? '（需 Atlas Key）' : ''}</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-[#86868B]">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                        {!hasAtlasKey && (
                                            <p className="text-[10px] text-[#86868B]">輸入 Atlas Cloud Key 後可使用 GPT Image 2 / 即夢模型</p>
                                        )}
                                    </div>

                                    {hasImageOrDrawingOrShape && (
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-semibold text-[#1D1D1F]">保留透明背景</label>
                                            <div 
                                                className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-colors ${preserveTransparency ? 'bg-[#34C759]' : 'bg-[#E5E5EA]'}`}
                                                onClick={() => onSetPreserveTransparency(!preserveTransparency)}
                                            >
                                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${preserveTransparency ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-[#1D1D1F]">參考風格</label>
                                        <div className="relative">
                                            <select 
                                                value={imageStyle} 
                                                onChange={(e) => onSetImageStyle(e.target.value)}
                                                className="w-full bg-[#F5F5F7] border-none rounded-lg px-3 py-2 text-sm text-[#1D1D1F] focus:ring-2 focus:ring-black/5 cursor-pointer appearance-none"
                                            >
                                                <option value="Default">無</option>
                                                {stylePresets.map(s => <option key={s.id} value={s.label}>{s.name}</option>)}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-[#86868B]">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── 輸出比例（統一自訂下拉，SVG icon，往下展開） ── */}
                                    {(() => {
                                        const isAtlas = generationModel && generationModel !== 'gemini';

                                        // SVG 矩形 icon：固定 20×14 viewport，比例縮放到框內
                                        const RatioSVG = ({ ratio, selected }: { ratio: string; selected: boolean }) => {
                                            const color = selected ? '#5B5BF6' : '#86868B';
                                            if (!ratio.includes(':')) {
                                                return (
                                                    <svg width="20" height="14" viewBox="0 0 20 14" className="flex-shrink-0">
                                                        <rect x="2.5" y="0.5" width="15" height="13" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" rx="1"/>
                                                    </svg>
                                                );
                                            }
                                            const [rw, rh] = ratio.split(':').map(Number);
                                            const maxW = 18, maxH = 12;
                                            let iw: number, ih: number;
                                            if (rw / rh > maxW / maxH) { iw = maxW; ih = Math.max(3, Math.round(maxW * rh / rw)); }
                                            else { ih = maxH; iw = Math.max(3, Math.round(maxH * rw / rh)); }
                                            const x = (20 - iw) / 2, y = (14 - ih) / 2;
                                            return (
                                                <svg width="20" height="14" viewBox="0 0 20 14" className="flex-shrink-0">
                                                    <rect x={x + 0.5} y={y + 0.5} width={iw - 1} height={ih - 1} fill="none" stroke={color} strokeWidth="1.5" rx="0.5"/>
                                                </svg>
                                            );
                                        };

                                        // 估算 Gemini 像素（較長邊 = base）
                                        const geminiDims = (ratio: string) => {
                                            if (ratio === 'Original') return '依原圖';
                                            const base = imageSize === '4K' ? 4096 : imageSize === '2K' ? 2048 : 1024;
                                            const [rw, rh] = ratio.split(':').map(Number);
                                            const w = rw >= rh ? base : Math.round(base * rw / rh);
                                            const h = rh > rw ? base : Math.round(base * rh / rw);
                                            return `${w}×${h}`;
                                        };

                                        // 目前選項的顯示文字
                                        let triggerRatio = imageAspectRatio;
                                        let triggerDims = '';
                                        if (isAtlas) {
                                            const sizes = getModelSizes(generationModel as any);
                                            const cur = sizes.find(s => s.ratio === imageAspectRatio) ?? sizes[0];
                                            const px = imageSize === '4K' ? cur.w4k : cur.w2k;
                                            const [pw, ph] = px.includes('x') ? px.split('x') : px.split('*');
                                            triggerRatio = cur.ratio;
                                            triggerDims = `${pw}×${ph}`;
                                        } else {
                                            triggerDims = geminiDims(imageAspectRatio);
                                        }

                                        return (
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-semibold text-[#1D1D1F]">輸出比例</label>
                                                <div className="relative" ref={ratioRef}>
                                                    {/* 觸發按鈕 — 跟其他 select 同樣灰底樣式 */}
                                                    <button
                                                        onClick={() => setRatioOpen(v => !v)}
                                                        className="w-full flex items-center gap-2 px-3 py-2 bg-[#F5F5F7] rounded-lg text-sm cursor-pointer"
                                                    >
                                                        <RatioSVG ratio={triggerRatio} selected={true} />
                                                        <span className="font-medium text-[#1D1D1F]">{triggerRatio}</span>
                                                        <span className="text-[#86868B] text-xs">{triggerDims}</span>
                                                        <svg className={`ml-auto w-4 h-4 text-[#86868B] flex-shrink-0 transition-transform duration-150 ${ratioOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                                                    </button>

                                                    {/* 下拉列表 — 往下展開 */}
                                                    {ratioOpen && (
                                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-black/10 rounded-xl shadow-lg py-1 z-[300] max-h-64 overflow-y-auto">
                                                            {isAtlas ? (
                                                                (['2K', '4K'] as const).map(tier => {
                                                                    const sizes = getModelSizes(generationModel as any);
                                                                    return (
                                                                        <div key={tier}>
                                                                            <div className="px-3 pt-2 pb-0.5 text-[10px] font-bold text-[#86868B] tracking-widest uppercase">{tier}</div>
                                                                            {sizes.map(s => {
                                                                                const px = tier === '4K' ? s.w4k : s.w2k;
                                                                                const [pw, ph] = px.includes('x') ? px.split('x') : px.split('*');
                                                                                const isSel = imageAspectRatio === s.ratio && imageSize === tier;
                                                                                return (
                                                                                    <button key={s.ratio + tier}
                                                                                        onClick={() => { onSetImageAspectRatio(s.ratio); onSetImageSize(tier); setRatioOpen(false); }}
                                                                                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors ${isSel ? 'bg-[#F5F5F7]' : 'hover:bg-[#F5F5F7]'}`}>
                                                                                        <RatioSVG ratio={s.ratio} selected={isSel} />
                                                                                        <span className={`font-medium w-9 ${isSel ? 'text-[#5B5BF6]' : 'text-[#1D1D1F]'}`}>{s.ratio}</span>
                                                                                        <span className="ml-auto text-[#86868B] text-xs tabular-nums">{pw}×{ph}</span>
                                                                                        {isSel && <svg className="w-3.5 h-3.5 text-[#5B5BF6] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    );
                                                                })
                                                            ) : (
                                                                ASPECT_RATIOS.map(r => {
                                                                    const isSel = imageAspectRatio === r.value;
                                                                    return (
                                                                        <button key={r.value}
                                                                            onClick={() => { onSetImageAspectRatio(r.value); setRatioOpen(false); }}
                                                                            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors ${isSel ? 'bg-[#F5F5F7]' : 'hover:bg-[#F5F5F7]'}`}>
                                                                            <RatioSVG ratio={r.value} selected={isSel} />
                                                                            <span className={`${isSel ? 'text-[#5B5BF6] font-medium' : 'text-[#1D1D1F]'}`}>{r.label}</span>
                                                                            <span className="ml-auto text-[#86868B] text-xs tabular-nums">{geminiDims(r.value)}</span>
                                                                            {isSel && <svg className="w-3.5 h-3.5 text-[#5B5BF6] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                                                                        </button>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* 輸出解析度（Gemini 才顯示，Atlas 已整合進比例下拉） */}
                                    {(generationModel === 'gemini' || !generationModel) && <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-[#1D1D1F]">輸出解析度</label>
                                        <div className="flex gap-2">
                                            {(['1K', '2K', '4K'] as const).map(size => (
                                                <button
                                                    key={size}
                                                    onClick={() => onSetImageSize(size)}
                                                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                                                        imageSize === size
                                                            ? 'bg-[#1D1D1F] text-white border-[#1D1D1F]'
                                                            : 'bg-[#F5F5F7] text-[#1D1D1F] border-transparent hover:border-black/20'
                                                    }`}
                                                >
                                                    {size}
                                                </button>
                                            ))}
                                        </div>
                                        {imageSize !== '1K' && (
                                            <p className="text-[10px] text-[#86868B]">
                                                {imageSize === '2K' ? '較高畫質，費用約 1.7x' : '最高畫質，費用約 2.5x'}
                                            </p>
                                        )}
                                    </div>}
                                </div>
                            )}

                            {selectedElementIds.length === 1 && elements.find(el => el.id === selectedElementIds[0])?.type === 'image' && (
                                <>
                                    <div className="h-px bg-gray-100 w-full" />
                                    
                                    {/* 圖片工具 */}
                                    <div 
                                        className="flex justify-between items-center px-4 py-2.5 cursor-pointer hover:bg-gray-50"
                                        onClick={() => setShowTools(!showTools)}
                                    >
                                        <span className="text-xs font-semibold text-[#1D1D1F]">圖片工具</span>
                                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                                            style={{ transform: showTools ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                            <path d="M2 3.5l3 3 3-3" stroke="#86868B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </div>
                                    {showTools && (
                                        <div className="px-4 pb-3 flex flex-col gap-3">
                                            <button
                                                onClick={() => onRemoveBackground('enhanced')}
                                                className="w-full h-9 bg-black text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors shadow-sm flex items-center justify-center gap-2"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>
                                                智慧去背
                                            </button>

                                            <div className="flex gap-2 h-9">
                                                <div className="flex bg-[#F5F5F7] rounded-lg p-0.5 h-full items-center">
                                                    <button 
                                                        onClick={() => setUpscaleFactor(2)}
                                                        className={`px-3 h-full flex items-center text-[10px] font-medium rounded-md transition-all ${upscaleFactor === 2 ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
                                                    >2x</button>
                                                    <button 
                                                        onClick={() => setUpscaleFactor(4)}
                                                        className={`px-3 h-full flex items-center text-[10px] font-medium rounded-md transition-all ${upscaleFactor === 4 ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
                                                    >4x</button>
                                                </div>
                                                <button 
                                                    onClick={() => onUpscale(upscaleFactor)}
                                                    className="flex-1 h-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shadow-sm transition-colors active:scale-95 flex items-center justify-center gap-1.5"
                                                >
                                                    <SelectionMenuIcons.Upscale />
                                                    智能放大
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="h-px bg-gray-100 w-full" />

                                    <div className="border-t border-gray-100">
                                      <div
                                        className="flex justify-between items-center px-4 py-2.5 cursor-pointer hover:bg-gray-50"
                                        onClick={() => setShowAppearance(!showAppearance)}
                                      >
                                        <span className="text-xs font-semibold text-[#1D1D1F]">外觀</span>
                                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                                          style={{ transform: showAppearance ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                          <path d="M2 3.5l3 3 3-3" stroke="#86868B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                      </div>
                                      {showAppearance && (
                                        <div className="px-4 pb-3">
                                          <AppearancePanel 
                                              element={elements.find(el => el.id === selectedElementIds[0])!}
                                              onUpdate={(updates) => {
                                                  const el = elements.find(e => e.id === selectedElementIds[0]);
                                                  if (el) onUpdateElement({ ...el, ...updates });
                                              }}
                                          />
                                        </div>
                                      )}
                                    </div>

                                    <div className="h-px bg-gray-100 w-full" />
                                    
                                    {/* 視角控制器 */}
                                    <div 
                                        className="flex justify-between items-center px-4 py-2.5 cursor-pointer hover:bg-gray-50"
                                        onClick={() => setShowCamera(!showCamera)}
                                    >
                                        <span className="text-xs font-semibold text-[#1D1D1F]">視角控制器</span>
                                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                                            style={{ transform: showCamera ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                            <path d="M2 3.5l3 3 3-3" stroke="#86868B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </div>
                                    {showCamera && (
                                        <div className="px-4 pb-3 flex flex-col gap-2">
                                            <div className="bg-[#D1D1D6] p-1.5 rounded-xl shadow-inner">
                                                <div className="grid grid-cols-3 gap-1.5">
                                                    {CAMERA_ANGLES.map(angle => (
                                                    <button
                                                        key={angle.id}
                                                        onClick={() => onCameraAngle(angle.prompt)}
                                                        title={angle.label}
                                                        className="group relative bg-white shadow-[0_1px_0_rgba(0,0,0,0.3)] rounded-[6px] h-10 flex items-center justify-center text-[#1D1D1F] hover:bg-white active:bg-[#E5E5EA] active:translate-y-[1px] active:shadow-none transition-all duration-75"
                                                    >
                                                        <span className="opacity-80 group-hover:opacity-100 scale-90">{angle.icon}</span>
                                                    </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="text-center mt-1">
                                                <span className="text-[10px] text-[#86868B]">點擊調整 AI 生成視角</span>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
              ) : (
                <div 
                    className="floating-menu bg-white/90 backdrop-blur-xl rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-white/50 p-1.5 flex items-center gap-1 min-w-0 animate-fade-in-up"
                    style={{
                        cursor: isDraggingMenu ? 'grabbing' : 'grab'
                    }}
                    onMouseDown={handleMenuMouseDown}
                >
                     {elements.filter(el => selectedElementIds.includes(el.id)).some(el => ['image', 'drawing', 'shape', 'text', 'note'].includes(el.type)) && (
                         <button 
                            onClick={() => onGenerate(elements.filter(el => selectedElementIds.includes(el.id)))}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-tr from-[#AF52DE] to-[#5856D6] text-white shadow-md hover:scale-105 active:scale-95 transition-all"
                            title="一鍵生成圖片"
                         >
                             <SelectionMenuIcons.MagicFilled />
                         </button>
                     )}
                     
                     <div className="w-px h-5 bg-black/10 mx-1" />

                     <button 
                        onClick={() => setIsMenuExpanded(true)}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 text-[#1D1D1F] transition-all active:scale-95"
                        title="更多設定"
                     >
                         <SelectionMenuIcons.Settings />
                     </button>
                </div>
              )}
          </div>
      )}
    </div>
  );
});
