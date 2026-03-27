
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { CanvasElement, ArtboardElement } from '../types';

interface LayerPanelProps {
  elements: CanvasElement[];
  selectedElementIds: string[];
  onSelect: (id: string, shiftKey: boolean) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onReorder: (sourceId: string, targetId: string) => void;
  onRename: (id: string, newName: string) => void;
  onGroup: () => void;
  onUngroup: () => void;
  onDelete: (id: string) => void;
  onMerge: () => void; // New prop
  isDraggingOnCanvas?: boolean;
}

const Icons = {
    EyeOpen: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
    EyeClosed: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>,
    LockOpen: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>,
    LockClosed: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
    Group: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>,
    Ungroup: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
    Merge: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path><path d="M8 8h8v8H8z"></path></svg>,
    Image: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
    Note: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>,
    Text: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>,
    Arrow: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
    Draw: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/></svg>,
    Frame: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeDasharray="4 4"></rect></svg>,
    Shape: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>,
    Layer: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>,
    Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
    Folder: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
    ChevronDown: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>,
    ChevronRight: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>,
};

export const getLayerColor = (type: string) => {
    switch (type) {
        case 'artboard': return '#007AFF'; // 專業藍
        case 'text': return '#34C759'; // 蘋果綠
        case 'image':
        case 'drawing': return '#AF52DE'; // 精緻紫
        case 'shape':
        case 'note': return '#FF9500'; // 活力橘
        default: return '#86868B'; // 預設灰
    }
};

const ElementIcon = ({ type }: { type: string }) => {
    switch (type) {
        case 'image': return <Icons.Image />;
        case 'note': return <Icons.Note />;
        case 'text': return <Icons.Text />;
        case 'arrow': return <Icons.Arrow />;
        case 'drawing': return <Icons.Draw />;
        case 'frame': return <Icons.Frame />;
        case 'shape': return <Icons.Shape />;
        default: return <Icons.Layer />;
    }
}

export const LayerPanel: React.FC<LayerPanelProps> = ({ 
    elements, 
    selectedElementIds, 
    onSelect, 
    onToggleVisibility, 
    onToggleLock, 
    onReorder,
    onRename,
    onGroup,
    onUngroup,
    onDelete,
    onMerge,
    isDraggingOnCanvas = false
}) => {
    const [isOpen, setIsOpen] = useState(true);
    const [isArtboardOpen, setIsArtboardOpen] = useState(true);
    const [isObjectOpen, setIsObjectOpen] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const lastParentArtboards = useRef<Record<string, ArtboardElement | null>>({});

    // Resizable Panel State
    const [panelWidth, setPanelWidth] = useState(280);
    const isResizingRef = useRef(false);

    // Draggable Window State
    const [position, setPosition] = useState(() => ({ x: window.innerWidth - 280, y: 24 }));
    const [isDragging, setIsDragging] = useState(false);
    
    // Refs
    const dragStartRef = useRef({ x: 0, y: 0 });
    const initialPosRef = useRef({ x: 0, y: 0 });
    const hasMovedRef = useRef(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Ensure panel stays within bounds on toggle or window resize
    useEffect(() => {
        const clampPosition = () => {
            if (panelRef.current) {
                const { offsetWidth, offsetHeight } = panelRef.current;
                const padding = 10;
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                setPosition(prev => {
                    let newX = prev.x;
                    let newY = prev.y;

                    // Check Right Edge
                    if (newX + offsetWidth > viewportWidth - padding) {
                        newX = viewportWidth - offsetWidth - padding;
                    }
                    // Check Left Edge
                    if (newX < padding) newX = padding;

                    // Check Bottom Edge
                    if (newY + offsetHeight > viewportHeight - padding) {
                        newY = viewportHeight - offsetHeight - padding;
                    }
                    // Check Top Edge
                    if (newY < padding) newY = padding;

                    if (newX !== prev.x || newY !== prev.y) {
                        return { x: newX, y: newY };
                    }
                    return prev;
                });
            }
        };

        clampPosition();
        window.addEventListener('resize', clampPosition);
        return () => window.removeEventListener('resize', clampPosition);
    }, [isOpen]);

    // Global Mouse Move Handler with Viewport Clamping
    const handleWindowMouseMove = useCallback((e: MouseEvent) => {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;

        // Threshold check to distinguish click from drag
        if (!hasMovedRef.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
            hasMovedRef.current = true;
            setIsDragging(true);
        }

        if (hasMovedRef.current) {
            let newX = initialPosRef.current.x + dx;
            let newY = initialPosRef.current.y + dy;

            // Viewport Clamping logic
            if (panelRef.current) {
                const { offsetWidth, offsetHeight } = panelRef.current;
                const padding = 10;
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                // Clamp X
                newX = Math.max(padding, Math.min(newX, viewportWidth - offsetWidth - padding));
                
                // Clamp Y
                newY = Math.max(padding, Math.min(newY, viewportHeight - offsetHeight - padding));
            }

            setPosition({ x: newX, y: newY });
        }
    }, []);

    // Global Mouse Up Handler
    const handleWindowMouseUp = useCallback((e: MouseEvent) => {
        window.removeEventListener('mousemove', handleWindowMouseMove);
        window.removeEventListener('mouseup', handleWindowMouseUp);
        
        if (isResizingRef.current) {
            isResizingRef.current = false;
        } else {
            setIsDragging(false);

            // If movement was minimal, treat as click
            if (!hasMovedRef.current) {
                // Only toggle if we are in collapsed mode (icon)
                // For expanded mode, clicking the header does nothing (close via X button)
                setIsOpen(prev => {
                    if (!prev) return true; // If closed, open it
                    return prev; // If open, keep open (header click doesn't close)
                });
            }
        }
        
        // Reset cursor style on body
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
    }, [handleWindowMouseMove]);

    // Resize Handlers
    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        isResizingRef.current = true;
        
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'nwse-resize';
        
        window.addEventListener('mousemove', handleResizeMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);
    };

    const handleResizeMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizingRef.current || !panelRef.current) return;
        
        const panelRect = panelRef.current.getBoundingClientRect();
        // Calculate new width based on mouse position relative to the panel's left edge
        const newWidth = e.clientX - panelRect.left;
        
        // Clamp width between 280px and 600px
        const clampedWidth = Math.max(280, Math.min(newWidth, 600));
        setPanelWidth(clampedWidth);
    }, []);

    // Mouse Down Handler (Attached to Header/Icon)
    const handleMouseDown = (e: React.MouseEvent) => {
        // If panel is open, allow interaction with buttons inside header (like close button)
        if (isOpen && (e.target as HTMLElement).closest('button')) return;
        
        e.preventDefault();
        
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        initialPosRef.current = { ...position };
        hasMovedRef.current = false;
        
        // Temporarily disable text selection during drag
        document.body.style.userSelect = 'none';
        
        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);
    };

    const artboardElements = elements.filter(el => el.type === 'artboard').reverse();
    const otherElements = elements.filter(el => el.type !== 'artboard').reverse();
    const artboards = elements.filter(el => el.type === 'artboard') as ArtboardElement[];

    const getParentArtboard = (el: CanvasElement, artboards: ArtboardElement[]) => {
        if (el.type === 'artboard') return null;
        return artboards.find(ab => {
            const ax = ab.position.x - ab.width  / 2;
            const ay = ab.position.y - ab.height / 2;
            return (
                el.position.x >= ax && el.position.x <= ax + ab.width &&
                el.position.y >= ay && el.position.y <= ay + ab.height
            );
        }) ?? null;
    };

    const parentArtboardMapping = useMemo(() => {
        if (isDraggingOnCanvas) return lastParentArtboards.current;
        
        const mapping: Record<string, ArtboardElement | null> = {};
        elements.forEach(el => {
            if (el.type !== 'artboard') {
                mapping[el.id] = getParentArtboard(el, artboards);
            }
        });
        lastParentArtboards.current = mapping;
        return mapping;
    }, [elements, artboards, isDraggingOnCanvas]);

    const canUngroup = useMemo(() => {
        if (selectedElementIds.length === 0) return false;
        return selectedElementIds.some(id => {
            const el = elements.find(e => e.id === id);
            return el && el.groupId !== null;
        });
    }, [selectedElementIds, elements]);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('text/plain', id);
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        setDragOverId(id);
    };

    const handleDragLeave = () => {
        setDragOverId(null);
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        const sourceId = e.dataTransfer.getData('text/plain');
        setDragOverId(null);
        if (sourceId && sourceId !== targetId) {
            onReorder(sourceId, targetId);
        }
    };

    const handleStartRename = (id: string, currentName: string) => {
        setEditingId(id);
        setEditName(currentName);
    };

    const handleFinishRename = () => {
        if (editingId) {
            onRename(editingId, editName);
            setEditingId(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleFinishRename();
        } else if (e.key === 'Escape') {
            setEditingId(null);
        }
    };

    const renderLayerItem = (el: CanvasElement) => {
        const isSelected = selectedElementIds.includes(el.id);
        const isDragOver = dragOverId === el.id;
        const isArtboard = el.type === 'artboard';
        const parentArtboard = !isArtboard ? parentArtboardMapping[el.id] : null;
        
        const layerColor = getLayerColor(el.type);
        
        return (
            <div 
                key={el.id}
                draggable={!el.isLocked}
                onDragStart={(e) => handleDragStart(e, el.id)}
                onDragOver={(e) => handleDragOver(e, el.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, el.id)}
                className={`
                    group flex items-center gap-2 py-1.5 px-2 rounded-lg text-sm border-2 transition-all select-none
                    ${isSelected ? 'bg-[#007AFF]/10 border-[#007AFF]/20' : 'border-transparent hover:bg-white hover:border-black/5 hover:shadow-sm'}
                    ${isDragOver ? 'border-t-2 border-t-[#AF52DE] bg-purple-50' : ''}
                    ${!el.isVisible ? 'opacity-50' : ''}
                    ${parentArtboard ? 'pl-6' : ''}
                `}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(el.id, e.shiftKey || e.metaKey);
                }}
            >
                {/* Color Bar */}
                <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: layerColor }} />

                {/* Drag Grip */}
                <div className="text-[#86868B]/30 cursor-grab active:cursor-grabbing">
                    <svg width="6" height="10" viewBox="0 0 6 10" fill="currentColor"><circle cx="1" cy="1" r="1"/><circle cx="1" cy="5" r="1"/><circle cx="1" cy="9" r="1"/><circle cx="5" cy="1" r="1"/><circle cx="5" cy="5" r="1"/><circle cx="5" cy="9" r="1"/></svg>
                </div>

                {/* Visibility */}
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggleVisibility(el.id); }}
                    className={`text-[#86868B] hover:text-[#1D1D1F] p-1 rounded-md ${!el.isVisible && 'text-red-500'}`}
                >
                    {el.isVisible ? <Icons.EyeOpen /> : <Icons.EyeClosed />}
                </button>

                {/* Lock */}
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggleLock(el.id); }}
                    className={`text-[#86868B] hover:text-[#1D1D1F] p-1 rounded-md ${el.isLocked && 'text-[#007AFF]'}`}
                >
                    {el.isLocked ? <Icons.LockClosed /> : <Icons.LockOpen />}
                </button>

                {/* Type Icon */}
                <div className="text-[#86868B]">
                    {isArtboard ? <Icons.Folder /> : <ElementIcon type={el.type} />}
                </div>

                {/* Name */}
                <div className="flex-1 truncate font-medium text-[#1D1D1F]" onDoubleClick={(e) => { e.stopPropagation(); handleStartRename(el.id, isArtboard ? (el as ArtboardElement).artboardName : el.name); }}>
                    {editingId === el.id ? (
                        <input 
                            autoFocus
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onBlur={handleFinishRename}
                            onKeyDown={handleKeyDown}
                            onClick={e => e.stopPropagation()}
                            className="w-full bg-white border border-[#007AFF] rounded px-1 py-0.5 text-xs outline-none"
                        />
                    ) : (
                        <span className="truncate block">
                            {isArtboard ? (el as ArtboardElement).artboardName : (el.type === 'text' && (el as any).text ? `T: ${(el as any).text.substring(0, 10)}...` : el.name)}
                        </span>
                    )}
                </div>
                
                {/* Labels (Protected from truncation) */}
                <div className="flex-shrink-0 flex items-center gap-1">
                    {el.groupId && <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-100 text-purple-600 font-bold">GRP</span>}
                    {isArtboard && <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-100 text-blue-600 font-bold">AB</span>}
                </div>

                {/* Delete Button */}
                    <button
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        if (!el.isLocked) onDelete(el.id); 
                    }}
                    className={`text-[#86868B] hover:text-red-500 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${el.isLocked ? 'cursor-not-allowed text-gray-300 hover:text-gray-300' : ''}`}
                    title="刪除圖層"
                >
                    <Icons.Trash />
                </button>
            </div>
        );
    };

    if (!isOpen) {
        return (
            <div
                ref={panelRef}
                onMouseDown={handleMouseDown}
                style={{ left: position.x, top: position.y }}
                className={`fixed z-[998] bg-white/80 backdrop-blur-xl p-3 rounded-xl shadow-lg border border-white/50 text-[#1D1D1F] hover:bg-white transition-colors ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                title="打開圖層管理 (按住可拖曳)"
            >
                <Icons.Layer />
            </div>
        );
    }

    return (
        <div 
            ref={panelRef}
            style={{ left: position.x, top: position.y, width: panelWidth }}
            className={`fixed z-[998] bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.12)] border border-white/50 flex flex-col overflow-hidden transition-shadow animate-fade-in-right font-sans ${isDragging ? 'shadow-2xl' : 'shadow-[0_20px_40px_rgba(0,0,0,0.12)]'}`}
        >
            {/* Header (Drag Handle) */}
            <div 
                className={`p-4 border-b border-black/5 bg-white/50 flex justify-between items-center select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                onMouseDown={handleMouseDown}
            >
                <div className="flex items-center gap-2 pointer-events-none">
                    <Icons.Layer />
                    <span className="text-sm font-bold text-[#1D1D1F]">圖層管理</span>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} 
                    className="text-[#86868B] hover:text-[#1D1D1F] p-1 rounded-md hover:bg-black/5 transition-colors cursor-pointer"
                >
                    &times;
                </button>
            </div>

            {/* Toolbar */}
            <div className="p-2 border-b border-black/5 bg-[#F5F5F7]/50 flex gap-2">
                <button 
                    onClick={onGroup}
                    disabled={selectedElementIds.length < 2}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="群組 (Group)"
                >
                    <Icons.Group /> 群組
                </button>
                <button 
                    onClick={onUngroup}
                    disabled={!canUngroup}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="解散群組 (Ungroup)"
                >
                    <Icons.Ungroup /> 解散
                </button>
                <button 
                    onClick={onMerge}
                    disabled={selectedElementIds.length < 2}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all text-[#007AFF]"
                    title="合併圖層 (Merge Layers)"
                >
                    <Icons.Merge /> 合併
                </button>
            </div>

            {/* Layer List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[60vh]">
                {artboardElements.length > 0 && (
                    <>
                        <div 
                            className="flex items-center gap-1 text-[10px] font-bold text-[#86868B] uppercase tracking-wider px-2 py-1 cursor-pointer hover:bg-black/5 rounded transition-colors"
                            onClick={() => setIsArtboardOpen(!isArtboardOpen)}
                        >
                            {isArtboardOpen ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
                            工作區域 (ARTBOARDS)
                        </div>
                        {isArtboardOpen && artboardElements.map(renderLayerItem)}
                    </>
                )}
                {otherElements.length > 0 && (
                    <>
                        <div 
                            className="flex items-center gap-1 text-[10px] font-bold text-[#86868B] uppercase tracking-wider px-2 py-1 mt-4 cursor-pointer hover:bg-black/5 rounded transition-colors"
                            onClick={() => setIsObjectOpen(!isObjectOpen)}
                        >
                            {isObjectOpen ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
                            物件圖層 (OBJECT LAYERS)
                        </div>
                        {isObjectOpen && otherElements.map(renderLayerItem)}
                    </>
                )}
            </div>
            
            {/* Footer Status */}
            <div className="px-4 py-2 border-t border-black/5 bg-[#F5F5F7] text-[10px] text-[#86868B] text-center cursor-default relative">
                {elements.length} 個圖層
                
                {/* Resizer Handle */}
                <div 
                    className="absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize flex items-end justify-end p-1 opacity-50 hover:opacity-100 transition-opacity"
                    onMouseDown={handleResizeMouseDown}
                >
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 1L1 9M9 5L5 9M9 9H9.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                </div>
            </div>
        </div>
    );
};
