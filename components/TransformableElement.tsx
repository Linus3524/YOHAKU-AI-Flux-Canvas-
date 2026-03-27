
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import type { CanvasElement, Point, ArrowElement, NoteElement, TextElement, ShapeElement } from '../types';
import { wrapTextCanvas } from '../src/utils/helpers';

interface TransformableElementProps {
  element: CanvasElement;
  isSelected: boolean;
  isOutpainting: boolean;
  zoom: number;
  onSelect: (id: string, shiftKey: boolean) => void;
  onUpdate: (element: CanvasElement, dragDelta?: Point) => void;
  onInteractionEnd: () => void;
  onContextMenu: (e: React.MouseEvent, elementId: string) => void;
  onEditDrawing: (elementId: string) => void;
  interactionMode: 'select' | 'hand'; 
}

type Interaction = {
  type: 'drag' | 'resize' | 'rotate' | 'resize-arrow-start' | 'resize-arrow-end';
  startPoint: Point;
  startElement: CanvasElement;
  startAngle?: number;
  center?: Point;
} | null;

export const TransformableElement: React.FC<TransformableElementProps> = ({ element, isSelected, isOutpainting, zoom, onSelect, onUpdate, onInteractionEnd, onContextMenu, onEditDrawing, interactionMode }) => {
  const [interaction, setInteraction] = useState<Interaction>(null);
  const [isEditing, setIsEditing] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isSelected) {
      setIsEditing(false);
    }
  }, [isSelected]);

  // -- Text Wrapping Logic for Preview --
  // We use useMemo to calculate lines only when text content or width changes
  // Crucially, we do NOT depend on 'position', avoiding re-calc during drag
  const wrappedTextData = useMemo(() => {
      if (element.type !== 'text') return null;
      
      const padding = 20 + (element.strokeWidth || 0); // Approx padding + stroke
      // Simple canvas for measuring
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.font = `${element.isItalic ? 'italic' : ''} ${element.isBold ? 'bold' : ''} ${element.fontSize}px ${element.fontFamily}`;
      const lineHeightPx = element.fontSize * element.lineHeight;
      const availableWidth = Math.max(10, element.width - padding * 2);
      
      return wrapTextCanvas(ctx, element.text, availableWidth, lineHeightPx);
  }, [
      element.type === 'text' ? element.text : null, 
      element.type === 'text' ? element.width : null, 
      element.type === 'text' ? element.fontSize : null, 
      element.type === 'text' ? element.fontFamily : null, 
      element.type === 'text' ? element.isBold : null,
      element.type === 'text' ? element.lineHeight : null,
      element.type === 'text' ? element.strokeWidth : null
  ]);

  // Sync Height Effect: If the wrapped text height differs significantly from element height, update it
  // This ensures the selection box matches the content height automatically (Area Text behavior)
  useEffect(() => {
      if (element.type === 'text' && wrappedTextData && !interaction) {
          // Add some padding to the calculated text height
          const padding = 20 + (element.strokeWidth || 0) + (element.shadowBlur || 0);
          const requiredHeight = wrappedTextData.height + padding * 2;
          
          // Only update if difference is noticeable to prevent loops
          if (Math.abs(requiredHeight - element.height) > 2) {
              // We defer this update to avoid render cycle issues, or handle it carefully
              // Actually, updating state during render is bad. 
              // We should probably rely on the resize handler to set height, OR do this sync
              // Let's rely on resize handler for explicit resizing. 
              // But for initial load or text change, we might need this.
              // For now, let's just let the render function use 'requiredHeight' visually if needed?
              // No, 'element.height' controls the selection border.
              // We will update it only if we are NOT interacting.
              onUpdate({ ...element, height: requiredHeight });
          }
      }
  }, [wrappedTextData, interaction, element.type, element.height, onUpdate]);


  const handleInteractionStart = useCallback((e: React.MouseEvent, type: Interaction['type']) => {
      if (e.button !== 0) return;
      if (isOutpainting && type !== 'drag') return;
      if (element.isLocked) {
          e.stopPropagation();
          return;
      }
      
      // Stop propagation to prevent canvas panning
      e.stopPropagation();
      e.preventDefault(); // Prevent browser drag behavior (e.g. text selection)

      onSelect(element.id, e.shiftKey);

      const startPoint = { x: e.clientX, y: e.clientY };
      let interactionDetails: Interaction = { type, startPoint, startElement: element };

      if (type === 'rotate' && elementRef.current) {
          const rect = elementRef.current.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          interactionDetails.center = { x: centerX, y: centerY };
          interactionDetails.startAngle = Math.atan2(startPoint.y - centerY, startPoint.x - centerX);
      }
      setInteraction(interactionDetails);
    }, [element, onSelect, isOutpainting]);
    
    const handleInteractionMove = useCallback((e: MouseEvent) => {
        if (!interaction) return;

        const { type, startPoint, startElement } = interaction;
        const dx = (e.clientX - startPoint.x) / zoom;
        const dy = (e.clientY - startPoint.y) / zoom;

        if (type === 'drag') {
            const newPosition = { x: startElement.position.x + dx, y: startElement.position.y + dy };
            const delta = { x: newPosition.x - element.position.x, y: newPosition.y - element.position.y };
            
            let updatedElement: CanvasElement;
            if (startElement.type === 'arrow') {
                updatedElement = {
                    ...startElement,
                    position: newPosition,
                    start: { x: startElement.start.x + dx, y: startElement.start.y + dy },
                    end: { x: startElement.end.x + dx, y: startElement.end.y + dy },
                };
            } else {
                updatedElement = { ...startElement, position: newPosition };
            }
            onUpdate(updatedElement, delta);
        } else if (type === 'resize') {
            const rad = startElement.rotation * (Math.PI / 180);
            const cos = Math.cos(-rad);
            const sin = Math.sin(-rad);
            const rotDx = dx * cos - dy * sin;
            const rotDy = dx * sin + dy * cos;

            let newWidth = Math.max(10, startElement.width + rotDx);
            let newHeight = Math.max(10, startElement.height + rotDy);

            const isImage = startElement.type === 'image';
            const isText = startElement.type === 'text';
            const shouldKeepRatio = isImage ? !e.shiftKey : e.shiftKey;

            if (isText) {
                // Area Text Logic: Height is auto-calculated based on Width
                // We only allow width resizing via handle, height is derived
                // Calculate derived height
                // Note: We can't access `wrappedTextData` here easily as it's a hook result.
                // We must re-calculate or approximate.
                // Re-calculating is safer for correctness.
                const padding = 20 + (startElement.strokeWidth || 0) + (startElement.shadowBlur || 0);
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.font = `${startElement.isItalic ? 'italic' : ''} ${startElement.isBold ? 'bold' : ''} ${startElement.fontSize}px ${startElement.fontFamily}`;
                    const lineHeightPx = startElement.fontSize * startElement.lineHeight;
                    const availableWidth = Math.max(10, newWidth - padding * 2);
                    const { height: textHeight } = wrapTextCanvas(ctx, startElement.text, availableWidth, lineHeightPx);
                    newHeight = textHeight + padding * 2;
                }
            } else if (shouldKeepRatio) {
                const ratio = startElement.width / startElement.height;
                if (Math.abs(rotDx) > Math.abs(rotDy)) {
                    newHeight = newWidth / ratio;
                } else {
                    newWidth = newHeight * ratio;
                }
            }
            
            const dw = newWidth - startElement.width;
            const dh = newHeight - startElement.height;
            const posDx = (dw / 2 * Math.cos(rad)) - (dh / 2 * Math.sin(rad));
            const posDy = (dw / 2 * Math.sin(rad)) + (dh / 2 * Math.cos(rad));

            onUpdate({ 
                ...startElement, 
                width: newWidth, 
                height: newHeight,
                position: {
                    x: startElement.position.x + posDx,
                    y: startElement.position.y + posDy
                }
            });
        } else if (type === 'rotate' && interaction.center && interaction.startAngle !== undefined) {
             const { center, startAngle } = interaction;
             const currentAngle = Math.atan2(e.clientY - center.y, e.clientX - center.x);
             const angleDiff = currentAngle - startAngle;
             onUpdate({ ...startElement, rotation: startElement.rotation + angleDiff * (180 / Math.PI) });
        } else if (type === 'resize-arrow-start' || type === 'resize-arrow-end') {
            const arrowElement = startElement as ArrowElement;
            let { start, end } = arrowElement;

            if (type === 'resize-arrow-start') {
                start = { x: arrowElement.start.x + dx, y: arrowElement.start.y + dy };
            } else {
                end = { x: arrowElement.end.x + dx, y: arrowElement.end.y + dy };
            }
            
            const newDx = end.x - start.x;
            const newDy = end.y - start.y;
            
            const newWidth = Math.max(10, Math.sqrt(newDx * newDx + newDy * newDy));
            const newRotation = Math.atan2(newDy, newDx) * (180 / Math.PI);
            const newPosition = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };

            onUpdate({
                ...arrowElement,
                start,
                end,
                position: newPosition,
                width: newWidth,
                rotation: newRotation,
            });
        }
    }, [interaction, onUpdate, zoom, element.position.x, element.position.y, element]); // Added element dependency for text resize calc

    const handleInteractionEnd = useCallback(() => {
        if (interaction) {
          onInteractionEnd();
        }
        setInteraction(null);
    }, [interaction, onInteractionEnd]);

    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        if (isOutpainting || element.isLocked || interactionMode === 'hand') return;
        if (element.type === 'note' || element.type === 'text') {
            e.stopPropagation();
            setIsEditing(true);
            setTimeout(() => {
                textareaRef.current?.focus();
                if (textareaRef.current) {
                    textareaRef.current.setSelectionRange(0, textareaRef.current.value.length);
                }
            }, 0);
        } else if (element.type === 'drawing') {
            e.stopPropagation();
            onEditDrawing(element.id);
        }
    }, [element, onEditDrawing, isOutpainting, interactionMode]);
    
    const handleContextMenu = (e: React.MouseEvent) => {
        if (element.isLocked || interactionMode === 'hand') return;
        e.stopPropagation();
        onContextMenu(e, element.id);
    };

    useEffect(() => {
        if (interaction) {
            window.addEventListener('mousemove', handleInteractionMove);
            window.addEventListener('mouseup', handleInteractionEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleInteractionMove);
            window.removeEventListener('mouseup', handleInteractionEnd);
        };
    }, [interaction, handleInteractionMove, handleInteractionEnd]);
    
    if (!element.isVisible) return null;

    const borderRadiusClass = element.type === 'text' ? 'rounded-none' : (element.type === 'shape' ? 'rounded-none' : 'rounded-2xl');
    const pointerEventsClass = interactionMode === 'hand' ? '!pointer-events-none' : (element.isLocked ? 'pointer-events-auto' : '');

    const getShapePath = (shapeEl: ShapeElement, w: number, h: number) => {
        switch (shapeEl.shapeType) {
            case 'triangle':
                return `M${w/2},0 L${w},${h} L0,${h} Z`;
            case 'pentagon': {
                const points = [];
                for (let i = 0; i < 5; i++) {
                    points.push(`${w/2 + w/2 * Math.sin(i * 2 * Math.PI / 5)},${h/2 - h/2 * Math.cos(i * 2 * Math.PI / 5)}`);
                }
                return `M${points.join(' L')} Z`;
            }
            case 'hexagon': {
                const points = [];
                for (let i = 0; i < 6; i++) {
                    points.push(`${w/2 + w/2 * Math.sin(i * 2 * Math.PI / 6)},${h/2 - h/2 * Math.cos(i * 2 * Math.PI / 6)}`);
                }
                return `M${points.join(' L')} Z`;
            }
            case 'star': {
                const points = [];
                const outerRadius = w/2;
                const innerRadius = w/4;
                const cx = w/2;
                const cy = h/2;
                for (let i = 0; i < 10; i++) {
                    const r = i % 2 === 0 ? outerRadius : innerRadius;
                    const angle = i * Math.PI / 5 - Math.PI / 2;
                    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
                }
                return `M${points.join(' L')} Z`;
            }
            case 'heart':
                return `M${w/2},${h*0.3} C${w/2},${h*0.1} ${w*0.1},${h*0.1} ${w*0.1},${h*0.4} C${w*0.1},${h*0.6} ${w/2},${h} C${w/2},${h*0.9} ${w*0.9},${h*0.6} ${w*0.9},${h*0.4} C${w*0.9},${h*0.1} ${w/2},${h*0.1} ${w/2},${h*0.3} Z`;
            default:
                return '';
        }
    };

    return (
        <div
            ref={elementRef}
            className={`absolute group ${pointerEventsClass} select-none`}
            style={{
                left: element.position.x,
                top: element.position.y,
                width: element.width,
                height: element.height,
                transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
                cursor: element.isLocked ? 'not-allowed' : 'move',
                zIndex: element.zIndex,
                pointerEvents: 'auto', // Ensure container catches events
            }}
            onMouseDown={(e) => handleInteractionStart(e, 'drag')}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
        >
            <div className={`element-body w-full h-full relative ${element.isLocked ? 'opacity-90' : ''}`}>
              {element.isLocked && (
                  <div className="absolute -top-3 -right-3 z-50 bg-white/80 backdrop-blur-sm p-1 rounded-full shadow-sm border border-black/10 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  </div>
              )}

              {(() => {
                const el = element;
                const style: React.CSSProperties = { width: '100%', height: '100%' };

                switch (el.type) {
                    case 'note':
                        return (
                           <div style={style} className={`rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] text-[#1D1D1F] font-medium flex items-center justify-center ${el.color} transition-shadow hover:shadow-[0_12px_40px_rgba(0,0,0,0.18)]`}>
                                <textarea
                                    ref={textareaRef}
                                    value={el.content}
                                    readOnly={!isEditing || el.isLocked || interactionMode === 'hand'}
                                    onChange={(e) => onUpdate({ ...el, content: e.target.value })}
                                    onBlur={() => setIsEditing(false)}
                                    onMouseDown={(e) => {
                                      if (e.button !== 0 || el.isLocked || interactionMode === 'hand') return;
                                      onSelect(element.id, e.shiftKey);
                                      if (isEditing) e.stopPropagation();
                                    }}
                                    className={`w-full h-full bg-transparent text-[#1D1D1F] p-6 resize-none border-none focus:outline-none placeholder-[#1D1D1F]/40 ${isEditing ? 'cursor-text' : (el.isLocked ? 'cursor-not-allowed' : 'cursor-move')} ${el.textAlign === 'center' ? 'text-center' : 'text-left'}`}
                                    style={{ fontFamily: 'inherit', fontSize: 'inherit', lineHeight: '1.6' }}
                                    placeholder={el.isLocked ? "" : "請輸入內容..."}
                                />
                            </div>
                        );
                    case 'text':
                        if (isEditing) {
                             // Fallback edit mode styling (basic)
                             const textStyle: React.CSSProperties = {
                                fontFamily: el.fontFamily,
                                fontSize: `${el.fontSize}px`,
                                color: el.color,
                                textAlign: el.align,
                                letterSpacing: `${el.letterSpacing}em`,
                                lineHeight: el.lineHeight,
                                fontWeight: el.isBold ? 'bold' : 'normal',
                                fontStyle: el.isItalic ? 'italic' : 'normal',
                                textDecoration: el.isUnderline ? 'underline' : 'none',
                                whiteSpace: 'pre-wrap',
                                width: '100%',
                                height: '100%',
                                outline: 'none',
                                resize: 'none',
                                overflow: 'hidden',
                                background: el.backgroundColor || 'transparent',
                                border: 'none',
                                padding: '20px', // Match rasterizer padding approx
                                margin: 0,
                            };
                            return (
                                <textarea
                                    ref={textareaRef}
                                    value={el.text}
                                    onChange={(e) => onUpdate({ ...el, text: e.target.value })}
                                    onBlur={() => setIsEditing(false)}
                                    style={textStyle}
                                    className="cursor-text"
                                    onMouseDown={(e) => e.stopPropagation()}
                                />
                            );
                        } else {
                            // SVG RENDERER FOR TEXT (Area Text)
                            const lineHeight = el.lineHeight || 1.5;
                            
                            // Calculate filters for shadows
                            const shadowFilters = [];
                            if (el.shadowColor && el.shadowBlur !== undefined && el.shadowBlur > 0) {
                                shadowFilters.push(`drop-shadow(4px 4px ${el.shadowBlur}px ${el.shadowColor})`);
                            }
                            if (el.glowColor && el.glowBlur !== undefined && el.glowBlur > 0) {
                                shadowFilters.push(`drop-shadow(0 0 ${el.glowBlur}px ${el.glowColor})`);
                            }
                            const filterString = shadowFilters.join(' ');

                            let textAnchor: "start" | "middle" | "end" = 'start';
                            let xPos: string | number = 0;
                            const padding = 20 + (el.strokeWidth || 0);

                            if (el.align === 'center') { textAnchor = 'middle'; xPos = '50%'; }
                            else if (el.align === 'right') { textAnchor = 'end'; xPos = el.width - padding; }
                            else { xPos = padding; }

                            const linesToRender = wrappedTextData ? wrappedTextData.lines : [];

                            return (
                                <div style={{...style, overflow: 'visible', pointerEvents: 'none'}}> 
                                    {/* CRITICAL: pointerEvents: 'none' on inner content allows click to pass to container for drag */}
                                    {el.backgroundColor && el.backgroundColor !== 'transparent' && (
                                        <div className="absolute inset-0" style={{ backgroundColor: el.backgroundColor }} />
                                    )}
                                    <svg 
                                        width="100%" 
                                        height="100%" 
                                        viewBox={`0 0 ${el.width} ${el.height}`} 
                                        style={{ overflow: 'visible' }}
                                    >
                                        <text
                                            x={xPos}
                                            y="0"
                                            textAnchor={textAnchor}
                                            fontFamily={el.fontFamily}
                                            fontSize={el.fontSize}
                                            fontWeight={el.isBold ? 'bold' : 'normal'}
                                            fontStyle={el.isItalic ? 'italic' : 'normal'}
                                            textDecoration={el.isUnderline ? 'underline' : 'none'}
                                            fill={el.color}
                                            stroke={el.strokeColor}
                                            strokeWidth={el.strokeWidth || 0}
                                            strokeLinejoin="round" 
                                            strokeLinecap="round"
                                            paintOrder="stroke"
                                            letterSpacing={`${el.letterSpacing}em`}
                                            style={{ filter: filterString }}
                                        >
                                            {linesToRender.map((line, i) => (
                                                <tspan 
                                                    key={i} 
                                                    x={xPos} 
                                                    dy={i === 0 ? (padding + el.fontSize*0.8) : `${lineHeight}em`} // Start with padding
                                                >
                                                    {line}
                                                </tspan>
                                            ))}
                                        </text>
                                    </svg>
                                </div>
                            );
                        }
                    case 'image':
                        return <img src={el.src} alt="User upload" style={style} className="shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-xl object-cover" draggable="false" />;
                    case 'drawing':
                        return (
                            <div style={style} className="rounded-xl flex items-center justify-center">
                                {el.src ? (
                                    <img src={el.src} alt="User drawing" style={style} className="rounded-xl object-contain drop-shadow-xl" draggable="false" />
                                ) : (
                                    <span className="text-[#86868B] p-2 text-center text-sm bg-white/50 rounded-lg backdrop-blur-sm border border-black/5">點擊兩下以繪圖</span>
                                )}
                            </div>
                        );
                    case 'frame':
                        return (
                            <div style={style} className="border-[3px] border-dashed border-[#D1D1D6] bg-[#F2F2F7]/50 rounded-2xl flex items-center justify-center relative overflow-hidden group hover:border-[#AF52DE] hover:bg-[#AF52DE]/5 transition-colors">
                                 <div className="absolute inset-0 flex flex-col items-center justify-center text-[#86868B] group-hover:text-[#AF52DE] transition-colors pointer-events-none select-none">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-50">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                        <polyline points="21 15 16 10 5 21"></polyline>
                                    </svg>
                                    <span className="text-lg font-bold font-mono tracking-tight">{el.aspectRatioLabel}</span>
                                    <span className="text-[10px] font-medium uppercase tracking-wider opacity-70 mt-1">Frame</span>
                                 </div>
                            </div>
                        );
                    case 'arrow':
                        return (
                            <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className={el.color}>
                                <svg width="100%" height={30} viewBox={`0 0 150 30`} preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d={`M0 ${30 / 2} H${150 - 10}`} stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                                    <path d={`M${150 - 20} ${30 / 2 - 10} L${150 - 5} ${30 / 2} L${150 - 20} ${30 / 2 + 10}`} stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        );
                    case 'shape':
                        const strokeDasharray = el.strokeStyle === 'dashed' ? '10,10' : (el.strokeStyle === 'dotted' ? '2,5' : 'none');
                        return (
                            <div style={style}>
                                <svg width="100%" height="100%" viewBox={`0 0 ${el.width} ${el.height}`} style={{ overflow: 'visible' }}>
                                    {el.shapeType === 'rectangle' && <rect x="0" y="0" width={el.width} height={el.height} fill={el.fillColor} stroke={el.strokeColor} strokeWidth={el.strokeWidth} strokeDasharray={strokeDasharray} strokeLinejoin="round" />}
                                    {el.shapeType === 'rounded_rect' && <rect x="0" y="0" width={el.width} height={el.height} rx="20" ry="20" fill={el.fillColor} stroke={el.strokeColor} strokeWidth={el.strokeWidth} strokeDasharray={strokeDasharray} strokeLinejoin="round" />}
                                    {el.shapeType === 'circle' && <ellipse cx={el.width/2} cy={el.height/2} rx={el.width/2} ry={el.height/2} fill={el.fillColor} stroke={el.strokeColor} strokeWidth={el.strokeWidth} strokeDasharray={strokeDasharray} strokeLinejoin="round" />}
                                    {['triangle', 'pentagon', 'hexagon', 'star', 'heart'].includes(el.shapeType) && (
                                        <path d={getShapePath(el, el.width, el.height)} fill={el.fillColor} stroke={el.strokeColor} strokeWidth={el.strokeWidth} strokeDasharray={strokeDasharray} strokeLinejoin="round" />
                                    )}
                                </svg>
                            </div>
                        );
                    default:
                        return null;
                }
              })()}
            </div>

            {isSelected && !isOutpainting && !element.isLocked && interactionMode === 'select' && (
                <>
                    <div className={`absolute -inset-1 border-2 pointer-events-none opacity-50 ${borderRadiusClass} ${element.type === 'frame' ? 'border-[#AF52DE]' : 'border-[#007AFF]'}`} />
                    
                    {element.type === 'arrow' ? (
                        <>
                            <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 bg-white border border-[#007AFF] rounded-full cursor-grab transform-handle shadow-sm"
                                onMouseDown={(e) => handleInteractionStart(e, 'resize-arrow-start')} />
                            <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 bg-white border border-[#007AFF] rounded-full cursor-grab transform-handle shadow-sm"
                                onMouseDown={(e) => handleInteractionStart(e, 'resize-arrow-end')} />
                        </>
                    ) : (
                        <>
                            <div className={`absolute -top-8 left-1/2 -translate-x-1/2 w-5 h-5 bg-white border rounded-full cursor-alias transform-handle shadow-sm flex items-center justify-center hover:scale-110 transition-transform ${element.type === 'frame' ? 'border-[#AF52DE]' : 'border-[#007AFF]'}`}
                                onMouseDown={(e) => handleInteractionStart(e, 'rotate')}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${element.type === 'frame' ? 'bg-[#AF52DE]' : 'bg-[#007AFF]'}`} />
                                </div>
                            <div className={`absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3 pointer-events-none opacity-50 ${element.type === 'frame' ? 'bg-[#AF52DE]' : 'bg-[#007AFF]'}`} />

                            <div className={`absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border rounded-full cursor-se-resize transform-handle shadow-sm hover:scale-110 transition-transform ${element.type === 'frame' ? 'border-[#AF52DE]' : 'border-[#007AFF]'}`}
                                onMouseDown={(e) => handleInteractionStart(e, 'resize')} />
                        </>
                    )}
                </>
            )}
        </div>
    );
};
