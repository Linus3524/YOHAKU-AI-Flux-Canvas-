// src/components/TransformableElement.tsx

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import type { CanvasElement, Point, ArrowElement, NoteElement, TextElement, ShapeElement } from '../types';
import { wrapTextCanvas, getArrowHeadPath, isCJK, measureTextVisualBounds } from '../utils/helpers';
import { getLayerColor } from './LayerPanel';
import { generateSimpleMaskCSS } from '../utils/maskHelpers';
import { isGradient, parseLinearGradient, gradientAngleToSVG } from '../utils/gradientUtils'; // ✅ 修改 A (import)

interface TransformableElementProps {
  element: CanvasElement;
  isSelected: boolean;
  isOutpainting: boolean;
  zoom: number;
  onSelect: (id: string, shiftKey: boolean) => void;
  onUpdate: (element: CanvasElement, dragDelta?: Point) => void;
  onInteractionEnd: () => void;
  onContextMenu: (e: React.MouseEvent, worldPoint: Point, elementId: string) => void;
  onEditDrawing: (elementId: string) => void;
  onDuplicateInPlace?: (activeId: string, isShift: boolean) => { [oldId: string]: CanvasElement };
  onDragStart?: () => void;
  onDragEnd?: () => void;
  interactionMode: 'select' | 'hand';
  screenToWorld: (screenPoint: Point) => Point;
}

type ResizeHandle = 'se' | 'sw' | 'ne' | 'nw' | 'e' | 'w' | 's' | 'n';

// widthSign/heightSign: how rotDx/rotDy affect size. posSignX/posSignY: which corner is fixed.
const HANDLE_CFG: Record<ResizeHandle, { ws: number; hs: number; px: number; py: number }> = {
    se: { ws: +1, hs: +1, px: +1, py: +1 },
    sw: { ws: -1, hs: +1, px: -1, py: +1 },
    ne: { ws: +1, hs: -1, px: +1, py: -1 },
    nw: { ws: -1, hs: -1, px: -1, py: -1 },
    e:  { ws: +1, hs:  0, px: +1, py:  0 },
    w:  { ws: -1, hs:  0, px: -1, py:  0 },
    s:  { ws:  0, hs: +1, px:  0, py: +1 },
    n:  { ws:  0, hs: -1, px:  0, py: -1 },
};

type Interaction = {
  type: 'drag' | 'resize' | 'rotate' | 'resize-arrow-start' | 'resize-arrow-end';
  startPoint: Point;
  startElement: CanvasElement;
  startAngle?: number;
  center?: Point;
  resizeHandle?: ResizeHandle;
} | null;

export const TransformableElement: React.FC<TransformableElementProps> = ({ element, isSelected, isOutpainting, zoom, onSelect, onUpdate, onInteractionEnd, onContextMenu, onEditDrawing, onDuplicateInPlace, onDragStart, onDragEnd, interactionMode, screenToWorld }) => {
  const [interaction, setInteraction] = useState<Interaction>(null);
  const [isEditing, setIsEditing] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isSelected) {
      setIsEditing(false);
    }
  }, [isSelected]);

  // -- UseEffect to Sync Visual Bounds for Text (Auto-Resize Logic) --
  useEffect(() => {
      if (element.type === 'text' && !interaction) {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
              const isVertical = element.writingMode === 'vertical';

              if (element.isWidthLocked && element.isHeightLocked) {
                  // ── 固定模式：寬高都鎖，什麼都不做 ──

              } else if (element.isWidthLocked || element.isHeightLocked) {
                  // ── 固定寬 / 固定高模式：一軸固定，另一軸自動 ──
                  const strokeW = element.strokeWidth || 0;
                  const padding = 12 + Math.ceil(strokeW / 2);
                  ctx.font = `${element.isItalic ? 'italic' : ''} ${element.isBold ? 'bold' : ''} ${element.fontSize}px ${element.fontFamily}`;
                  const lineHeightPx = element.fontSize * element.lineHeight;

                  if (isVertical) {
                      // 直書：高度固定，重新計算需要多少寬度（幾欄）
                      const availableHeight = Math.max(10, element.height - padding * 2);
                      const { height: totalColumnsWidth } = wrapTextCanvas(
                          ctx, element.text, availableHeight, lineHeightPx, isVertical, element.fontSize, element.letterSpacing || 0
                      );
                      const newWidth = totalColumnsWidth + padding * 2;
                      if (Math.abs(newWidth - element.width) > 2) {
                          onUpdate({ ...element, width: newWidth });
                      }
                  } else {
                      // 橫書：寬度固定，重新計算需要多少高度
                      const availableWidth = Math.max(10, element.width - padding * 2);
                      const { height: textHeight } = wrapTextCanvas(
                          ctx, element.text, availableWidth, lineHeightPx, isVertical, element.fontSize, element.letterSpacing || 0
                      );
                      const newHeight = textHeight + padding * 2;
                      if (Math.abs(newHeight - element.height) > 2) {
                          onUpdate({ ...element, height: newHeight });
                      }
                  }
              } else {
                  // ── 自動模式：寬高都跟著文字縮放 ──
                  const bounds = measureTextVisualBounds(element, ctx);
                  if (Math.abs(bounds.width - element.width) > 2 || Math.abs(bounds.height - element.height) > 2) {
                      onUpdate({
                          ...element,
                          width: bounds.width,
                          height: bounds.height
                      });
                  }
              }
          }
      }
  }, [
      element.type === 'text' ? element.text : null,
      element.type === 'text' ? element.fontSize : null,
      element.type === 'text' ? element.lineHeight : null,
      element.type === 'text' ? element.letterSpacing : null,
      element.type === 'text' ? element.curveStrength : null,
      element.type === 'text' ? element.strokeWidth : null,
      element.type === 'text' ? element.writingMode : null,
      element.type === 'text' ? element.isWidthLocked : null,
      element.type === 'text' ? element.isHeightLocked : null,
      element.type === 'text' ? element.width : null,
      element.type === 'text' ? element.height : null,
      interaction,
      onUpdate
  ]);

  // -- Wrapped Text for Preview (Recalculate for render) --
  const wrappedTextData = useMemo(() => {
      if (element.type !== 'text') return null;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.font = `${element.isItalic ? 'italic' : ''} ${element.isBold ? 'bold' : ''} ${element.fontSize}px ${element.fontFamily}`;
      
      const lineHeightPx = element.fontSize * element.lineHeight;
      const isVertical = element.writingMode === 'vertical';
      
      const strokeW = element.strokeWidth || 0;
      const textPadding = 12 + Math.ceil(strokeW / 2);
      const isLocked = element.isWidthLocked || element.isHeightLocked;
      const maxWidth = isLocked
          ? isVertical
              ? Math.max(10, element.height - textPadding * 2)
              : Math.max(10, element.width - textPadding * 2)
          : 100000;
      
      return wrapTextCanvas(ctx, element.text, maxWidth, lineHeightPx, isVertical, element.fontSize, element.letterSpacing || 0);
  }, [
      element.type === 'text' ? element.text : null, 
      element.type === 'text' ? element.fontSize : null, 
      element.type === 'text' ? element.fontFamily : null, 
      element.type === 'text' ? element.isBold : null,
      element.type === 'text' ? element.lineHeight : null,
      element.type === 'text' ? element.strokeWidth : null,
      element.type === 'text' ? element.writingMode : null,
      element.type === 'text' ? element.letterSpacing : null,
      element.type === 'text' ? element.isWidthLocked : null,
      element.type === 'text' ? element.isHeightLocked : null,
      element.type === 'text' ? element.width : null,
      element.type === 'text' ? element.height : null
  ]);


  const handleInteractionStart = useCallback((e: React.MouseEvent, type: Interaction['type'], resizeHandle?: ResizeHandle) => {
      if (e.button !== 0) return;
      
      // Strict event interception: ensure underlying Artboard or Canvas doesn't trigger
      e.stopPropagation();
      e.preventDefault();

      if (isOutpainting) {
          if (type !== 'drag') {
              return;
          }
      }

      if (element.isLocked) {
          return;
      }

      // Single trigger guarantee: ensure selection is updated before duplication
      onSelect(element.id, e.shiftKey);

      let startElement = element;
      if (type === 'drag' && e.altKey && onDuplicateInPlace) {
          // Batch copy: get mapping of all selected objects (including Artboard)
          // Pass current element and shift state to lock the selection synchronously
          const mapping = onDuplicateInPlace(element.id, e.shiftKey);
          if (mapping[element.id]) {
              startElement = mapping[element.id];
          }
      }

      if (type === 'drag') {
          onDragStart?.();
      }

      const startPoint = { x: e.clientX, y: e.clientY };
      let interactionDetails: Interaction = { type, startPoint, startElement, resizeHandle };

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
            const handle = interaction.resizeHandle ?? 'se';
            const { ws, hs, px, py } = HANDLE_CFG[handle];

            const rad = startElement.rotation * (Math.PI / 180);
            const cos = Math.cos(-rad);
            const sin = Math.sin(-rad);
            const rotDx = dx * cos - dy * sin;
            const rotDy = dx * sin + dy * cos;

            let newWidth  = ws !== 0 ? Math.max(10, startElement.width  + ws * rotDx) : startElement.width;
            let newHeight = hs !== 0 ? Math.max(10, startElement.height + hs * rotDy) : startElement.height;

            const isImage = startElement.type === 'image';
            const isText = startElement.type === 'text';
            const isVerticalEl = isText && (startElement as TextElement).writingMode === 'vertical';
            const shouldKeepRatio = isImage ? !e.shiftKey : e.shiftKey;

            if (isText) {
                const padding = 12 + Math.ceil((startElement.strokeWidth || 0) / 2);
                const lineHeightPx = startElement.fontSize * startElement.lineHeight;
                const minBoxWidth  = isVerticalEl ? padding * 2 + lineHeightPx : padding * 2 + Math.ceil(startElement.fontSize * 0.5);
                const minBoxHeight = isVerticalEl ? padding * 2 + Math.ceil(startElement.fontSize * 0.5) : padding * 2 + lineHeightPx;
                newWidth  = Math.max(minBoxWidth,  newWidth);
                newHeight = Math.max(minBoxHeight, newHeight);

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.font = `${startElement.isItalic ? 'italic' : ''} ${startElement.isBold ? 'bold' : ''} ${startElement.fontSize}px ${startElement.fontFamily}`;
                    const letterSp = (startElement as TextElement).letterSpacing || 0;
                    if (isVerticalEl) {
                        const availableHeight = Math.max(10, newHeight - padding * 2);
                        const { height: totalColumnsWidth } = wrapTextCanvas(ctx, startElement.text, availableHeight, lineHeightPx, true, startElement.fontSize, letterSp);
                        newWidth = totalColumnsWidth + padding * 2;
                    } else {
                        const availableWidth = Math.max(10, newWidth - padding * 2);
                        const { height: textHeight } = wrapTextCanvas(ctx, startElement.text, availableWidth, lineHeightPx, false, startElement.fontSize, letterSp);
                        newHeight = textHeight + padding * 2;
                    }
                }
            } else if (shouldKeepRatio) {
                const ratio = startElement.width / startElement.height;
                if (ws === 0) {
                    newWidth = newHeight * ratio;
                } else if (hs === 0) {
                    newHeight = newWidth / ratio;
                } else {
                    if (Math.abs(ws * rotDx) > Math.abs(hs * rotDy)) newHeight = newWidth / ratio;
                    else newWidth = newHeight * ratio;
                }
            }

            const dw = newWidth  - startElement.width;
            const dh = newHeight - startElement.height;
            // For horizontal text, top edge is always the anchor (text grows downward)
            const effectivePy = (isText && !isVerticalEl) ? +1 : py;
            const localDx = dw / 2 * px;
            const localDy = dh / 2 * effectivePy;
            const posDx = localDx * Math.cos(rad) - localDy * Math.sin(rad);
            const posDy = localDx * Math.sin(rad) + localDy * Math.cos(rad);

            onUpdate({
                ...startElement,
                width: newWidth,
                height: newHeight,
                ...(isText ? {
                    isWidthLocked: !isVerticalEl ? true : (startElement as TextElement).isWidthLocked,
                    isHeightLocked: isVerticalEl ? true : (startElement as TextElement).isHeightLocked
                } : {}),
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
    }, [interaction, onUpdate, zoom, element.position.x, element.position.y, element]);

    const handleInteractionEnd = useCallback(() => {
        if (interaction?.type === 'drag') {
            onDragEnd?.();
        }
        if (interaction) {
          onInteractionEnd();
        }
        setInteraction(null);
    }, [interaction, onDragEnd, onInteractionEnd]);

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
    
    const handleElementContextMenu = (e: React.MouseEvent) => {
        if (element.isLocked || interactionMode === 'hand') return;
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e, screenToWorld({ x: e.clientX, y: e.clientY }), element.id);
    };

    const handleArtboardContextMenu = (e: React.MouseEvent) => {
        if (interactionMode === 'hand') return;
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e, screenToWorld({ x: e.clientX, y: e.clientY }), element.id);
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

    // 在渲染邏輯裡新增 artboard 的處理
    if (element.type === 'artboard') {
        const artboardBorderColor = '#007AFF'; // 蘋果風格藍色，與選取框一致
        return (
            <>
                {/* 實際的工作區域背景（底層） */}
                <div
                    style={{
                        position: 'absolute',
                        left: element.position.x - element.width / 2,
                        top:  element.position.y - element.height / 2,
                        width:  element.width,
                        height: element.height,
                        backgroundColor: element.backgroundColor || '#ffffff',
                        boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
                        zIndex: element.zIndex,
                        pointerEvents: interactionMode === 'select' ? 'auto' : 'none',
                        cursor: interactionMode === 'select' ? 'move' : 'default',
                        isolation: 'isolate',
                    }}
                    onMouseDown={(e) => handleInteractionStart(e, 'drag')}
                    onDoubleClick={() => {/* 雙擊可重新命名 */}}
                    onContextMenu={handleArtboardContextMenu}
                >
                    {/* 左上角名稱標籤 */}
                    <div style={{
                        position: 'absolute',
                        top: -22,
                        left: 0,
                        fontSize: 11,
                        color: '#86868B',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        userSelect: 'none',
                    }}>
                        {element.artboardName}
                    </div>
                </div>

                {/* 頂層邊框層：確保邊框永遠可見 */}
                <div
                    style={{
                        position: 'absolute',
                        left: element.position.x - element.width / 2,
                        top:  element.position.y - element.height / 2,
                        width:  element.width,
                        height: element.height,
                        border: `2px solid ${artboardBorderColor}`,
                        pointerEvents: 'none', // 關鍵：不干擾下方物件操作
                        zIndex: 999999, // 確保在最上層
                        opacity: isSelected ? 1 : 0.3, // 未選取時半透明，選取時全亮
                        transition: 'opacity 0.2s ease',
                    }}
                />
            </>
        );
    }

    // Modified: Only Note elements are rounded. Text and everything else is square (rounded-none).
    const borderRadiusClass = (element.type === 'note') ? 'rounded-2xl' : 'rounded-none';
    const pointerEventsClass = interactionMode === 'hand' ? '!pointer-events-none' : (element.isLocked ? 'pointer-events-auto' : '');

const getShapePath = (shapeEl: ShapeElement, w: number, h: number) => {
    const { shapeType } = shapeEl;

    // 矩形類直接回傳，不需要正規化
    switch (shapeType) {
        case 'rectangle':
            return `M0,0 L${w},0 L${w},${h} L0,${h} Z`;
        case 'rounded_rect':
            return `M20,0 L${w-20},0 Q${w},0 ${w},20 L${w},${h-20} Q${w},${h} ${w-20},${h} L20,${h} Q0,${h} 0,${h-20} L0,20 Q0,0 20,0 Z`;
        case 'circle':
            return `M${w/2},0 A${w/2},${h/2} 0 1,0 ${w/2},${h} A${w/2},${h/2} 0 1,0 ${w/2},0 Z`;
        case 'heart':
            return `M ${w*0.5} ${h*0.22} C ${w*0.5} ${h*0.16} ${w*0.42} ${h*0.0} ${w*0.25} ${h*0.0} C ${w*0.08} ${h*0.0} ${w*0.0} ${h*0.14} ${w*0.0} ${h*0.3} C ${w*0.0} ${h*0.52} ${w*0.18} ${h*0.75} ${w*0.5} ${h*1.0} C ${w*0.82} ${h*0.75} ${w*1.0} ${h*0.52} ${w*1.0} ${h*0.3} C ${w*1.0} ${h*0.14} ${w*0.92} ${h*0.0} ${w*0.75} ${h*0.0} C ${w*0.58} ${h*0.0} ${w*0.5} ${h*0.16} ${w*0.5} ${h*0.22} Z`;
    }

    // 需要正規化的圖形：先計算原始頂點
    let rawPoints: { x: number; y: number }[] = [];

    if (shapeType === 'triangle') {
        rawPoints = [
            { x: w/2, y: 0 },
            { x: w,   y: h },
            { x: 0,   y: h },
        ];
    } else if (shapeType === 'pentagon') {
        for (let i = 0; i < 5; i++) {
            const angle = i * 2 * Math.PI / 5 - Math.PI / 2;
            rawPoints.push({ x: w/2 + w/2 * Math.cos(angle), y: h/2 + h/2 * Math.sin(angle) });
        }
    } else if (shapeType === 'hexagon') {
        for (let i = 0; i < 6; i++) {
            const angle = i * 2 * Math.PI / 6 - Math.PI / 6;
            rawPoints.push({ x: w/2 + w/2 * Math.cos(angle), y: h/2 + h/2 * Math.sin(angle) });
        }
    } else if (shapeType === 'star') {
        const outerR = Math.min(w, h) / 2;
        const innerR = outerR * 0.42;
        for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? outerR : innerR;
            const angle = i * Math.PI / 5 - Math.PI / 2;
            rawPoints.push({ x: w/2 + r * Math.cos(angle), y: h/2 + r * Math.sin(angle) });
        }
    }

    if (rawPoints.length === 0) return '';

    // 正規化：計算緊密邊界框，縮放平移到填滿 0,0 ~ w,h
    const minX = Math.min(...rawPoints.map(p => p.x));
    const maxX = Math.max(...rawPoints.map(p => p.x));
    const minY = Math.min(...rawPoints.map(p => p.y));
    const maxY = Math.max(...rawPoints.map(p => p.y));
    const bw = maxX - minX;
    const bh = maxY - minY;

    const normalized = rawPoints.map(p => ({
        x: bw > 0 ? (p.x - minX) / bw * w : w / 2,
        y: bh > 0 ? (p.y - minY) / bh * h : h / 2,
    }));

    return 'M' + normalized.map(p => `${p.x},${p.y}`).join(' L') + ' Z';
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
                cursor: (element.isLocked) ? 'not-allowed' : (isOutpainting ? 'move' : 'move'),
                zIndex: element.zIndex,
                pointerEvents: 'auto',
                opacity: element.opacity ?? 1,
                mixBlendMode: element.type === 'note' ? 'normal' : (element.blendMode || 'normal'), // ✅ 新增
            }}
            onMouseDown={(e) => handleInteractionStart(e, 'drag')}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleElementContextMenu}
        >
            <div className={`element-body w-full h-full relative ${element.isLocked ? 'opacity-90' : ''}`}>
              {/* Locked Indicator */}
              {element.isLocked && element.type !== 'artboard' && (
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
                        {
                            // SVG RENDERER FOR TEXT (always shown; transparent textarea overlaid when editing)
                            const padding = 12 + Math.ceil((el.strokeWidth || 0) / 2);
                            const isVertical = el.writingMode === 'vertical';
                            const lineHeightPx = el.fontSize * el.lineHeight;
                            const curveStrength = el.curveStrength || 0;
                            
                            const shadowFilters = [];
                            if (el.shadowColor && el.shadowBlur !== undefined && el.shadowBlur > 0) {
                                shadowFilters.push(`drop-shadow(4px 4px ${el.shadowBlur}px ${el.shadowColor})`);
                            }
                            if (el.glowColor && el.glowBlur !== undefined && el.glowBlur > 0) {
                                shadowFilters.push(`drop-shadow(0 0 ${el.glowBlur}px ${el.glowColor})`);
                            }
                            const filterString = shadowFilters.join(' ');

                            let textAnchor: "start" | "middle" | "end" = 'start';
                            if (el.align === 'center') textAnchor = 'middle';
                            else if (el.align === 'right') textAnchor = 'end'; 

                            const linesToRender = wrappedTextData ? wrappedTextData.lines : [];

                            // Measurement context for char-by-char width calculation (both horizontal and vertical)
                            const measureCanvas = document.createElement('canvas');
                            const measureCtx = measureCanvas.getContext('2d');
                            if (measureCtx) {
                                // @ts-ignore
                                measureCtx.letterSpacing = '0px';
                                measureCtx.font = `${el.isItalic ? 'italic' : ''} ${el.isBold ? 'bold' : ''} ${el.fontSize}px ${el.fontFamily}`;
                            }

                            return (
                                <div style={{...style, overflow: 'visible', pointerEvents: 'none'}}> 
                                    {el.backgroundColor && el.backgroundColor !== 'transparent' && (
                                        <div className={`absolute inset-0 ${borderRadiusClass}`} style={{ backgroundColor: el.backgroundColor }} />
                                    )}
                                    <svg 
                                        width="100%" 
                                        height="100%" 
                                        viewBox={`0 0 ${el.width} ${el.height}`} 
                                        style={{ overflow: 'visible' }}
                                    >
                                        <defs>
                                            {!isVertical && Math.abs(curveStrength) > 0.1 && linesToRender.map((_, i) => {
                                                const baseRadius = 10000 / Math.abs(curveStrength);
                                                const isArch = curveStrength > 0;
                                                const currentRadius = isArch 
                                                    ? baseRadius - (i * lineHeightPx)
                                                    : baseRadius + (i * lineHeightPx);
                                                const r = Math.max(1, currentRadius);
                                                
                                                const startX = el.width/2 - r;
                                                const endX = el.width/2 + r;
                                                
                                                // Adjust center Y
                                                const boxMidY = el.height / 2;
                                                const sagitta = r * (1 - Math.cos((el.width / r) / 2));
                                                const shiftY = isArch ? -sagitta/2 : sagitta/2;
                                                
                                                const pivotY = isArch ? boxMidY + r + shiftY : boxMidY - r + shiftY;

                                                const pathD = curveStrength > 0
                                                    ? `M ${startX} ${pivotY} A ${r} ${r} 0 0 1 ${endX} ${pivotY}`
                                                    : `M ${endX} ${pivotY} A ${r} ${r} 0 0 0 ${startX} ${pivotY}`;
                                                return (
                                                    <path id={`curve-${el.id}-${i}`} d={pathD} key={i} />
                                                );
                                            })}
                                        </defs>

                                        {isVertical ? (
                                            Math.abs(curveStrength) > 0.1 ? (
                                                // --- VERTICAL CURVE RENDERER ---
                                                linesToRender.map((line, i) => {
                                                    const radius = 10000 / Math.abs(curveStrength);
                                                    const isArch = curveStrength > 0;
                                                    const totalTextThickness = linesToRender.length * lineHeightPx;
                                                    const startX = el.width/2 + (totalTextThickness)/2 - lineHeightPx/2;
                                                    
                                                    const colX = startX - (i * lineHeightPx);
                                                    const lineOffset = (i - (linesToRender.length-1)/2) * lineHeightPx;
                                                    const currentRadius = isArch ? radius + lineOffset : radius - lineOffset;
                                                    const pivotX = isArch ? colX - currentRadius : colX + currentRadius;
                                                    const centerY = el.height / 2;

                                                    const chars = line.split('');
                                                    const totalH = chars.reduce((sum, char) => sum + (isCJK(char) ? el.fontSize : el.fontSize * 0.6), 0) + (chars.length - 1) * (el.letterSpacing || 0);
                                                    const totalAngle = totalH / currentRadius;
                                                    
                                                    let currentAngle = isArch ? -totalAngle / 2 : Math.PI + totalAngle / 2;
                                                    
                                                    return chars.map((char, charIdx) => {
                                                        const stepAngle = el.fontSize / currentRadius;
                                                        const letterSpacingAngle = (el.letterSpacing || 0) / currentRadius;
                                                        
                                                        const theta = isArch ? (currentAngle + stepAngle / 2) : (currentAngle - stepAngle / 2);
                                                        const cx = pivotX + currentRadius * Math.cos(theta);
                                                        const cy = centerY + currentRadius * Math.sin(theta);
                                                        
                                                        const thetaDeg = theta * 180 / Math.PI;
                                                        let rot = isArch ? thetaDeg : (thetaDeg + 180);
                                                        if (!isCJK(char)) rot += 90;

                                                        if (isArch) currentAngle += stepAngle + letterSpacingAngle;
                                                        else currentAngle -= stepAngle + letterSpacingAngle;

                                                        return (
                                                            <text 
                                                                key={`${i}-${charIdx}`} 
                                                                x={0} y={0}
                                                                transform={`translate(${cx},${cy}) rotate(${rot})`}
                                                                fill={el.color} stroke={el.strokeColor} strokeWidth={el.strokeWidth || 0}
                                                                fontFamily={el.fontFamily} fontSize={el.fontSize} fontWeight={el.isBold ? 'bold' : 'normal'}
                                                                style={{ filter: filterString, paintOrder: 'stroke' }}
                                                                textAnchor="middle" dominantBaseline="middle"
                                                                strokeLinejoin="round" strokeLinecap="round"
                                                            >
                                                                {char}
                                                            </text>
                                                        );
                                                    });
                                                })
                                            ) : (
                                                // --- VERTICAL STRAIGHT RENDERER ---
                                                linesToRender.map((line, i) => {
                                                    const totalTextWidth = linesToRender.length * lineHeightPx;
                                                    const startX = (el.width - totalTextWidth)/2 + (linesToRender.length - 1 - i) * lineHeightPx + lineHeightPx/2;
                                                    
                                                    const calcLineHeight = (line: string) =>
                                                        line.split('').reduce((sum, char) => 
                                                            sum + (isCJK(char) ? el.fontSize : el.fontSize * 0.6), 0)
                                                        + (line.length - 1) * (el.letterSpacing || 0);

                                                    const lineH = calcLineHeight(line);
                                                    let yPos = padding;
                                                    if (el.align === 'center') yPos = el.height / 2 - lineH / 2;
                                                    else if (el.align === 'right') yPos = el.height - padding - lineH;

                                                    const chars = line.split('');
                                                    let currentY = yPos;

                                                    return chars.map((char, charIdx) => {
                                                        const isVerticalChar = isCJK(char);
                                                        let renderY = currentY;
                                                        if (isVerticalChar) {
                                                            renderY += el.fontSize / 2;
                                                            currentY += el.fontSize;
                                                        } else {
                                                            const charW = measureCtx ? measureCtx.measureText(char).width : el.fontSize * 0.6;
                                                            renderY += charW / 2;
                                                            currentY += charW;
                                                        }
                                                        currentY += el.letterSpacing || 0;

                                                        return (
                                                            <text 
                                                                key={`${i}-${charIdx}`}
                                                                x={startX} y={renderY}
                                                                fill={el.color} stroke={el.strokeColor} strokeWidth={el.strokeWidth || 0}
                                                                fontFamily={el.fontFamily} fontSize={el.fontSize} fontWeight={el.isBold ? 'bold' : 'normal'} fontStyle={el.isItalic ? 'italic' : 'normal'}
                                                                textDecoration={el.isUnderline ? 'underline' : 'none'}
                                                                style={{ 
                                                                    filter: filterString, 
                                                                    writingMode: isVerticalChar ? 'horizontal-tb' : 'horizontal-tb',
                                                                    paintOrder: 'stroke'
                                                                }}
                                                                transform={!isVerticalChar ? `rotate(90, ${startX}, ${renderY})` : undefined}
                                                                dominantBaseline="middle" textAnchor="middle"
                                                                strokeLinejoin="round" strokeLinecap="round"
                                                            >
                                                                {char}
                                                            </text>
                                                        )
                                                    });
                                                })
                                            )
                                        ) : (
                                            // --- HORIZONTAL RENDERER ---
                                            Math.abs(curveStrength) > 0.1 ? (
                                                linesToRender.map((line, i) => (
                                                    <text key={i} fill={el.color} stroke={el.strokeColor} strokeWidth={el.strokeWidth}
                                                        fontFamily={el.fontFamily} fontSize={el.fontSize} fontWeight={el.isBold ? 'bold' : 'normal'}
                                                        style={{ filter: filterString, letterSpacing: `${el.letterSpacing || 0}px`, paintOrder: 'stroke' }} dominantBaseline="middle"
                                                        strokeLinejoin="round" strokeLinecap="round"
                                                    >
                                                        <textPath 
                                                            href={`#curve-${el.id}-${i}`} 
                                                            startOffset="50%" 
                                                            textAnchor="middle" 
                                                        >
                                                            {line}
                                                        </textPath>
                                                    </text>
                                                ))
                                            ) : (
                                                // --- HORIZONTAL STRAIGHT: char-by-char for precise alignment & letter-spacing ---
                                                (() => {
                                                    const spacingPx = el.letterSpacing || 0;
                                                    const totalLines = linesToRender.length;
                                                    const totalH = totalLines * lineHeightPx;
                                                    const yStart = (el.height - totalH) / 2 + lineHeightPx / 2;
                                                    const commonTextProps = {
                                                        fill: el.color,
                                                        stroke: el.strokeColor,
                                                        strokeWidth: el.strokeWidth || 0,
                                                        strokeLinejoin: 'round' as const,
                                                        strokeLinecap: 'round' as const,
                                                        paintOrder: 'stroke',
                                                        fontFamily: el.fontFamily,
                                                        fontSize: el.fontSize,
                                                        fontWeight: el.isBold ? 'bold' : 'normal',
                                                        fontStyle: el.isItalic ? 'italic' : 'normal',
                                                        textDecoration: el.isUnderline ? 'underline' : 'none',
                                                        dominantBaseline: 'middle' as const,
                                                        style: { filter: filterString, paintOrder: 'stroke' },
                                                    };
                                                    return linesToRender.map((line, i) => {
                                                        const yPos = yStart + i * lineHeightPx;
                                                        const chars = line.split('');
                                                        const lineWidth = measureCtx
                                                            ? chars.reduce((sum, c) => sum + measureCtx!.measureText(c).width, 0) + Math.max(0, chars.length - 1) * spacingPx
                                                            : chars.length * el.fontSize * 0.6;
                                                        let startX: number;
                                                        if (el.align === 'center') startX = el.width / 2 - lineWidth / 2;
                                                        else if (el.align === 'right') startX = el.width - padding - lineWidth;
                                                        else startX = padding;
                                                        let cx = startX;
                                                        return chars.map((char, ci) => {
                                                            const cw = measureCtx ? measureCtx.measureText(char).width : el.fontSize * 0.6;
                                                            const x = cx;
                                                            cx += cw + spacingPx;
                                                            return (
                                                                <text key={`${i}-${ci}`} x={x} y={yPos} textAnchor="start" {...commonTextProps}>
                                                                    {char}
                                                                </text>
                                                            );
                                                        });
                                                    });
                                                })()
                                            )
                                        )}
                                    </svg>
                                    {/* 透明 textarea 覆蓋層：只在編輯時顯示，文字透明但游標可見 */}
                                    {isEditing && (
                                        <textarea
                                            ref={textareaRef}
                                            value={el.text}
                                            onChange={(e) => onUpdate({ ...el, text: e.target.value })}
                                            onBlur={() => setIsEditing(false)}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                color: 'transparent',
                                                caretColor: el.color,
                                                background: 'transparent',
                                                resize: 'none',
                                                border: 'none',
                                                outline: 'none',
                                                padding: `${12 + Math.ceil((el.strokeWidth || 0) / 2)}px`,
                                                fontSize: `${el.fontSize}px`,
                                                lineHeight: el.lineHeight,
                                                letterSpacing: `${el.letterSpacing || 0}px`,
                                                fontFamily: el.fontFamily,
                                                fontWeight: el.isBold ? 'bold' : 'normal',
                                                fontStyle: el.isItalic ? 'italic' : 'normal',
                                                whiteSpace: 'pre-wrap',
                                                writingMode: el.writingMode === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
                                                overflow: 'hidden',
                                                cursor: 'text',
                                                zIndex: 10,
                                                pointerEvents: 'auto',
                                            }}
                                            className="cursor-text"
                                        />
                                    )}
                                </div>
                            );
                        }
                    case 'image':
                        const maskStyle = el.fade ? generateSimpleMaskCSS(el.fade) : '';
                        const imgShadow = (el as any).shadowEnabled
                            ? `${(el as any).shadowOffsetX ?? 4}px ${(el as any).shadowOffsetY ?? 4}px ${(el as any).shadowBlur ?? 10}px ${(el as any).shadowColor ?? 'rgba(0,0,0,0.4)'}`
                            : 'none';
                        return (
                            <div style={{
                                ...style,
                                boxShadow: imgShadow,
                            }}> {/* ✅ 修改：移除 mask，避免與 transform 衝突 */}
                                <div style={{
                                    width: '100%',
                                    height: '100%',
                                    WebkitMaskImage: maskStyle || undefined,
                                    maskImage: maskStyle || undefined,
                                    WebkitMaskSize: '100% 100%',
                                    maskSize: '100% 100%',
                                    WebkitMaskRepeat: 'no-repeat',
                                    maskRepeat: 'no-repeat',
                                }}> {/* ✅ 修改：mask 移到內層 div 避免 transform 衝突 */}
                                    <img src={el.src} alt="Canvas element" style={{ width: '100%', height: '100%', objectFit: 'fill' }} className="pointer-events-none" draggable={false} /> {/* ✅ 修改：移除 style={style}，改為尺寸填滿，避免 double transform */}
                                </div>
                            </div>
                        );
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
                        const arrowEl = el as ArrowElement;
                        const headSize = (arrowEl.strokeWidth || 4) * 3;
                        let dashArray = 'none';
                        if (arrowEl.strokeStyle === 'dashed') {
                            dashArray = `${(arrowEl.strokeWidth || 4) * 3}, ${(arrowEl.strokeWidth || 4) * 2}`;
                        } else if (arrowEl.strokeStyle === 'dotted') {
                            dashArray = `0, ${(arrowEl.strokeWidth || 4) * 2}`;
                        }
                        
                        return (
                            <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="100%" height="100%" viewBox={`0 -20 ${el.width} 40`} style={{ overflow: 'visible' }}>
                                    <path 
                                        d={`M 0 0 L ${el.width} 0`} 
                                        stroke={arrowEl.color || '#000'} 
                                        strokeWidth={arrowEl.strokeWidth || 4} 
                                        strokeLinecap="round" 
                                        strokeDasharray={dashArray}
                                    />
                                    {arrowEl.startArrowhead !== 'none' && (
                                        <path 
                                            d={getArrowHeadPath(0, 0, 180, headSize, arrowEl.startArrowhead)} 
                                            fill={arrowEl.startArrowhead !== 'arrow' ? (arrowEl.color || '#000') : 'none'}
                                            stroke={arrowEl.color || '#000'}
                                            strokeWidth={arrowEl.strokeWidth || 4}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    )}
                                    {arrowEl.endArrowhead !== 'none' && (
                                        <path 
                                            d={getArrowHeadPath(el.width, 0, 0, headSize, arrowEl.endArrowhead)} 
                                            fill={arrowEl.endArrowhead !== 'arrow' ? (arrowEl.color || '#000') : 'none'}
                                            stroke={arrowEl.color || '#000'}
                                            strokeWidth={arrowEl.strokeWidth || 4}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    )}
                                </svg>
                            </div>
                        );
                    case 'shape':
                        let shapeDashArray = 'none';
                        if (el.strokeStyle === 'dashed') {
                            shapeDashArray = `${el.strokeWidth * 3}, ${el.strokeWidth * 2}`;
                        } else if (el.strokeStyle === 'dotted') {
                            shapeDashArray = `0, ${el.strokeWidth * 2}`;
                        }

                        return (
                            <div style={style}>
                                <svg width="100%" height="100%" viewBox={`${-el.strokeWidth/2} ${-el.strokeWidth/2} ${el.width + el.strokeWidth} ${el.height + el.strokeWidth}`} style={{ overflow: 'visible' }}>
                                    {isGradient(el.fillColor) && (() => {
                                        const parsed = parseLinearGradient(el.fillColor);
                                        if (!parsed) return null;
                                        const coords = gradientAngleToSVG(parsed.angle);
                                        return (
                                            <defs>
                                                <linearGradient id={`grad-${el.id}`} x1={coords.x1} y1={coords.y1} x2={coords.x2} y2={coords.y2}>
                                                    <stop offset="0%" stopColor={parsed.color1} />
                                                    <stop offset="100%" stopColor={parsed.color2} />
                                                </linearGradient>
                                            </defs>
                                        );
                                    })()}
                                    {el.shapeType === 'rectangle' && <rect x="0" y="0" width={el.width} height={el.height} fill={isGradient(el.fillColor) ? `url(#grad-${el.id})` : el.fillColor} stroke={el.strokeColor} strokeWidth={el.strokeWidth} strokeDasharray={shapeDashArray} strokeLinecap="round" strokeLinejoin="round" />}
                                    {el.shapeType === 'rounded_rect' && <rect x="0" y="0" width={el.width} height={el.height} rx="20" ry="20" fill={isGradient(el.fillColor) ? `url(#grad-${el.id})` : el.fillColor} stroke={el.strokeColor} strokeWidth={el.strokeWidth} strokeDasharray={shapeDashArray} strokeLinecap="round" strokeLinejoin="round" />}
                                    {el.shapeType === 'circle' && <ellipse cx={el.width/2} cy={el.height/2} rx={el.width/2} ry={el.height/2} fill={isGradient(el.fillColor) ? `url(#grad-${el.id})` : el.fillColor} stroke={el.strokeColor} strokeWidth={el.strokeWidth} strokeDasharray={shapeDashArray} strokeLinecap="round" strokeLinejoin="round" />}
                                    {['triangle', 'pentagon', 'hexagon', 'star', 'heart'].includes(el.shapeType) && (
                                        <path d={getShapePath(el, el.width, el.height)} fill={isGradient(el.fillColor) ? `url(#grad-${el.id})` : el.fillColor} stroke={el.strokeColor} strokeWidth={el.strokeWidth} strokeDasharray={shapeDashArray} strokeLinecap="round" strokeLinejoin="round" />
                                    )}
                                </svg>
                            </div>
                        );
                    default:
                        return null;
                }
              })()}
            </div>

            {isSelected && !isOutpainting && !element.isLocked && interactionMode === 'select' && element.type !== 'artboard' && (
                <>
                    {/* 選取框：1px 貼齊 element 邊緣 */}
                    <div className={`absolute inset-0 border pointer-events-none ${borderRadiusClass}`} style={{ borderColor: getLayerColor(element.type) }} />

                    {element.type === 'arrow' ? (
                        <>
                            <div className="absolute top-1/2 -translate-y-1/2 cursor-grab transform-handle"
                                style={{ left: -5, width: 10, height: 10, backgroundColor: 'white', border: `1.5px solid ${getLayerColor(element.type)}`, borderRadius: 2 }}
                                onMouseDown={(e) => handleInteractionStart(e, 'resize-arrow-start')} />
                            <div className="absolute top-1/2 -translate-y-1/2 cursor-grab transform-handle"
                                style={{ right: -5, width: 10, height: 10, backgroundColor: 'white', border: `1.5px solid ${getLayerColor(element.type)}`, borderRadius: 2 }}
                                onMouseDown={(e) => handleInteractionStart(e, 'resize-arrow-end')} />
                        </>
                    ) : (
                        <>
                            {/* 旋轉鈕：貼齊選取框上方 */}
                            <div className="absolute left-1/2 -translate-x-1/2 cursor-alias transform-handle flex items-center justify-center hover:scale-110 transition-transform"
                                style={{ top: -24, width: 14, height: 14, backgroundColor: 'white', border: `1.5px solid ${getLayerColor(element.type)}`, borderRadius: '50%' }}
                                onMouseDown={(e) => handleInteractionStart(e, 'rotate')}>
                                <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: getLayerColor(element.type) }} />
                            </div>
                            <div className="absolute left-1/2 -translate-x-1/2 w-px pointer-events-none opacity-40"
                                style={{ top: -12, height: 12, backgroundColor: getLayerColor(element.type) }} />

                            {/* Corner handles：中心精確對齊選取框角落（7px 正方形，偏移 -3px = 半寬） */}
                            {([
                                ['nw', { top: -4, left:  -4 }, 'cursor-nw-resize'],
                                ['ne', { top: -4, right: -4 }, 'cursor-ne-resize'],
                                ['sw', { bottom: -4, left:  -4 }, 'cursor-sw-resize'],
                                ['se', { bottom: -4, right: -4 }, 'cursor-se-resize'],
                            ] as [ResizeHandle, React.CSSProperties, string][]).map(([dir, pos, cur]) => (
                                <div key={dir}
                                    className={`absolute transform-handle hover:scale-125 transition-transform ${cur}`}
                                    style={{ ...pos, width: 7, height: 7, backgroundColor: 'white', border: `1.5px solid ${getLayerColor(element.type)}`, borderRadius: 1 }}
                                    onMouseDown={(e) => handleInteractionStart(e, 'resize', dir)} />
                            ))}
                            {/* Edge handles：中心精確對齊選取框邊中點（7px 正方形，偏移 -3px） */}
                            {([
                                ['e', { top: '50%', right: -4, transform: 'translateY(-50%)' }, 'cursor-e-resize',  true],
                                ['w', { top: '50%', left:  -4, transform: 'translateY(-50%)' }, 'cursor-w-resize',  true],
                                ['s', { bottom: -4, left: '50%', transform: 'translateX(-50%)' }, 'cursor-s-resize', element.type !== 'text'],
                                ['n', { top:    -4, left: '50%', transform: 'translateX(-50%)' }, 'cursor-n-resize', element.type !== 'text'],
                            ] as [ResizeHandle, React.CSSProperties, string, boolean][]).filter(([,,,show]) => show).map(([dir, pos, cur]) => (
                                <div key={dir}
                                    className={`absolute transform-handle hover:scale-125 transition-transform ${cur}`}
                                    style={{ ...pos, width: 7, height: 7, backgroundColor: 'white', border: `1.5px solid ${getLayerColor(element.type)}`, borderRadius: 1 }}
                                    onMouseDown={(e) => handleInteractionStart(e, 'resize', dir)} />
                            ))}
                        </>
                    )}
                </>
            )}
        </div>
    );
};