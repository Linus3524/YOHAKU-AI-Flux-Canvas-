// src/components/TransformableElement.tsx

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useDisplaySrc } from '../utils/displayThumb';
import type { CanvasElement, Point, ArrowElement, NoteElement, TextElement, ShapeElement } from '../types';
import { wrapTextCanvas, getArrowHeadPath, isCJK, measureTextVisualBounds, getTextBoxPadding, consumeTextAutoEdit } from '../utils/helpers';
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
  /** 拖曳 fast path：提供時，drag 期間改走此路（不進全域 state），mouseup 由外層一次 commit */
  onLiveDrag?: (element: CanvasElement) => void;
  onInteractionStart?: () => void;
  onInteractionEnd: () => void;
  onContextMenu: (e: React.MouseEvent, worldPoint: Point, elementId: string) => void;
  onEditDrawing: (elementId: string) => void;
  onDuplicateInPlace?: (activeId: string, isShift: boolean) => { [oldId: string]: CanvasElement };
  onDragStart?: () => void;
  onDragEnd?: () => void;
  interactionMode: 'select' | 'hand';
  screenToWorld: (screenPoint: Point) => Point;
  disableResizeHandles?: boolean;
  showImageSizes?: boolean;
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

// ─── Fan-out positions per image count ───────────────────────────────────────
const NOTE_FAN: Record<1|2|3|4, Array<{tx:number;ty:number;rot:number}>> = {
    1: [{ tx:-220, ty:-220, rot:-5 }],
    2: [{ tx:-270, ty:-90, rot:-10 }, { tx:-90, ty:-270, rot:10 }],
    3: [{ tx:-295, ty:-40, rot:-15 }, { tx:-212, ty:-212, rot:0 }, { tx:-40, ty:-295, rot:15 }],
    4: [{ tx:-305, ty:0, rot:-15 }, { tx:-264, ty:-154, rot:-5 }, { tx:-154, ty:-264, rot:5 }, { tx:0, ty:-305, rot:15 }],
};
const NOTE_STACK = [
    'rotate(-6deg) translate(-2px, 2px)',
    'rotate(-2deg) translate(2px, -1px)',
    'rotate(4deg) translate(-1px, 3px)',
    'rotate(8deg) translate(3px, 0)',
];

interface NoteGalleryProps {
    refImgs: (string|null)[];
    zoom: number;
    noteWidth: number;   // 便利貼世界寬度，用來限制卡片上限
    onUpload: (idx: number, file: File) => void;
    onRemove: (idx: number) => void;
    onHoverChange: (hovered: boolean) => void;
}

const NoteReferenceGallery: React.FC<NoteGalleryProps> = ({ refImgs, zoom, noteWidth, onUpload, onRemove, onHoverChange }) => {
    const [hovered, setHovered] = useState(false);

    // 縮放補償：zoom>100% 鎖住螢幕 92px；zoom 30-100% 固定 92 world-px；zoom<30% 停止膨脹
    const BASE_GS = 92;
    const maxGS   = Math.round(Math.min(noteWidth * 0.45, 200));
    const GS = zoom > 1
        ? Math.round(BASE_GS / zoom)                                 // 螢幕固定 92px
        : zoom >= 0.3
            ? BASE_GS
            : Math.min(maxGS, Math.max(80, Math.round(48 / zoom)));
    const gsScale = GS / BASE_GS;
    const MARGIN = Math.round(20 * gsScale);
    // 刪除鈕尺寸（1.5× 基準值，隨 gsScale 縮放）
    const DS   = Math.round(36 * gsScale);   // button diameter
    const DO   = -Math.round(DS / 2);        // offset to top-left corner
    const DICO = Math.round(15 * gsScale);   // icon size inside button

    // Build ordered list of filled slots
    const filled = (refImgs as (string|null)[]).reduce(
        (acc: {src:string;origIdx:number;filledIdx:number}[], img, origIdx) => { if (img) acc.push({src:img,origIdx,filledIdx:acc.length}); return acc; }, [] as {src:string;origIdx:number;filledIdx:number}[]
    );
    const count = filled.length as 0|1|2|3|4;

    const setH = (v: boolean) => { setHovered(v); onHoverChange(v); };

    const triggerUpload = (e: React.MouseEvent) => {
        e.stopPropagation();
        const emptyIdx = refImgs.findIndex(img => !img);
        if (emptyIdx === -1) return;
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*';
        input.onchange = (ev) => {
            const file = (ev.target as HTMLInputElement).files?.[0];
            if (file) onUpload(emptyIdx, file);
        };
        input.click();
    };

    return (
        <div
            style={{ position:'absolute', bottom:MARGIN, right:MARGIN, width:GS, height:GS,
                zIndex: hovered ? 9999 : 10, overflow:'visible' }}
            onMouseEnter={() => setH(true)}
            onMouseLeave={() => setH(false)}
            onMouseDown={e => e.stopPropagation()}
        >
            {/* Invisible shield: keeps hover alive as mouse moves toward fanned photos */}
            {hovered && (
                <div style={{ position:'absolute',
                    top: -Math.round(360 * gsScale), left: -Math.round(360 * gsScale),
                    right:-20, bottom:-20, zIndex:-1, pointerEvents:'auto' }} />
            )}

            {/* Photo cards */}
            {filled.map(({ src, origIdx, filledIdx }) => {
                const fanBase = hovered && count > 0
                    ? (NOTE_FAN[count as 1|2|3|4] ?? [])[filledIdx] : null;
                const fanPos = fanBase
                    ? { tx: fanBase.tx * gsScale, ty: fanBase.ty * gsScale, rot: fanBase.rot } : null;
                const transform = fanPos
                    ? `translate(${fanPos.tx}px,${fanPos.ty}px) rotate(${fanPos.rot}deg) scale(1.1)`
                    : NOTE_STACK[filledIdx] ?? NOTE_STACK[0];
                return (
                    // Outer wrapper: handles transform, overflow:visible so delete btn is never clipped
                    <div key={origIdx} style={{
                        position:'absolute', bottom:0, right:0, width:GS, height:GS,
                        transform, transformOrigin:'center center',
                        transition:'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                        zIndex: hovered ? 5 + filledIdx : 1 + filledIdx,
                        overflow:'visible',
                    }}>
                        {/* Inner: clips image to rounded rect */}
                        <div style={{
                            position:'absolute', inset:0,
                            borderRadius:6, background:'#fff',
                            border:'2px solid rgba(255,255,255,0.9)',
                            boxShadow: hovered ? '0 8px 20px rgba(0,0,0,0.12)' : '0 2px 6px rgba(0,0,0,0.08)',
                            overflow:'hidden',
                        }}>
                            <img src={src} style={{width:'100%',height:'100%',objectFit:'cover'}} draggable={false} />
                        </div>
                        {/* Delete button — outside inner clip so it's never hidden */}
                        <div
                            onClick={e => { e.stopPropagation(); onRemove(origIdx); }}
                            style={{
                                position:'absolute', top:DO, left:DO, width:DS, height:DS,
                                borderRadius:'50%', background:'rgba(0,0,0,0.8)', color:'white',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                opacity: hovered ? 1 : 0,
                                transform: hovered ? 'scale(1)' : 'scale(0.5)',
                                cursor:'pointer', zIndex:20,
                                transition:'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                                transitionDelay: hovered ? '0.1s' : '0s',
                                border:`${Math.max(1.5, 1.5 * gsScale)}px solid rgba(255,255,255,0.9)`,
                                boxShadow:'0 2px 8px rgba(0,0,0,0.35)',
                            }}
                        >
                            <svg width={DICO} height={DICO} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </div>
                    </div>
                );
            })}

            {/* Add (+) button — always on top when not hovered, sinks behind when fanning */}
            {count < 4 && (
                <button
                    onClick={triggerUpload}
                    onMouseDown={e => e.stopPropagation()}
                    title={`上傳參考圖 (${count}/4)`}
                    style={{
                        position:'absolute', inset:0, width:'100%', height:'100%',
                        borderRadius:6, border:'none',
                        background: hovered ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        color:'rgba(0,0,0,0.45)', cursor:'pointer',
                        backdropFilter:'blur(4px)',
                        transition:'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                        transform: hovered && count > 0 ? 'scale(0.95)' : 'scale(1)',
                        zIndex: hovered && count > 0 ? 0 : 10,
                        boxShadow: hovered ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                    }}
                >
                    {/* SVG 圓形點虛線邊框：pathLength 均勻分布，避免角落擠點 */}
                    {(() => {
                        const gsScreen = GS * zoom;
                        const vu       = gsScreen / 100;           // 1 viewBox unit = vu screen px
                        const dotStroke = Math.max(1, 2 * (GS / 92));  // 隨 GS 縮放，zoom大時變細
                        const rx = 5;
                        const perimVU = 4 * (97 - 2 * rx) + 2 * Math.PI * rx; // ≈379 VU
                        const perimScreen = perimVU * vu;
                        const numDots = Math.max(4, Math.round(perimScreen / (dotStroke + 3)));
                        return (
                            <svg viewBox="0 0 100 100" preserveAspectRatio="none"
                                 style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
                                <rect x="1.5" y="1.5" width="97" height="97" rx={rx}
                                      fill="none"
                                      stroke={hovered ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.22)'}
                                      strokeWidth={dotStroke}
                                      pathLength={numDots}
                                      strokeDasharray="0.001 1"
                                      strokeLinecap="round"
                                      vectorEffect="non-scaling-stroke"/>
                            </svg>
                        );
                    })()}
                    {/* + 圖示：與 GS 等比縮放，高 zoom 不會太粗 */}
                    {(() => {
                        const iconSize = Math.round(GS * 22 / 92);
                        const iconStroke = Math.max(1, (GS / 92) * 2.5);
                        return (
                            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none"
                                 stroke="currentColor" strokeWidth={iconStroke.toFixed(2)} strokeLinecap="round">
                                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                        );
                    })()}
                </button>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────

const TransformableElementInner: React.FC<TransformableElementProps> = ({ element, isSelected, isOutpainting, zoom, onSelect, onUpdate, onLiveDrag, onInteractionStart, onInteractionEnd, onContextMenu, onEditDrawing, onDuplicateInPlace, onDragStart, onDragEnd, interactionMode, screenToWorld, disableResizeHandles, showImageSizes = false }) => {
  const [interaction, setInteraction] = useState<Interaction>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [galleryHovered, setGalleryHovered] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasMovedRef = useRef(false);

  // 顯示用縮圖代理：畫布上的 <img> 用 ~1600px 縮圖，元素 src 原圖不動
  //（AI/匯出/效果全部照常讀原圖）。非圖片元素傳 undefined，hook 無條件呼叫以符合 hooks 規則。
  const displaySrc = useDisplaySrc(
      (element.type === 'image' || element.type === 'drawing') ? (element as any).src : undefined
  );

  // 讀取圖片原始像素尺寸
  useEffect(() => {
    if ((element.type === 'image' || element.type === 'drawing') && element.src && showImageSizes) {
      const img = new Image();
      img.onload = () => setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = element.src;
    }
  }, [element.src, element.type, showImageSizes]);

  useEffect(() => {
    if (!isSelected) {
      setIsEditing(false);
    }
  }, [isSelected]);

  // 新建文字元素自動進入編輯（addText 透過 requestTextAutoEdit 登記）
  useEffect(() => {
    if (element.type === 'text' && consumeTextAutoEdit(element.id)) {
        setIsEditing(true);
        setTimeout(() => {
            textareaRef.current?.focus();
            textareaRef.current?.setSelectionRange(0, textareaRef.current.value.length);
        }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -- UseEffect to Sync Visual Bounds for Text (Auto-Resize Logic) --
  useEffect(() => {
      if (element.type === 'text' && !interaction) {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
              const isVertical = element.writingMode === 'vertical';
              // Curved text always auto-resizes (ignore locks) so box always wraps text
              const isCurvedMode = Math.abs((element as any).curveStrength || 0) > 0.1;

              if (isCurvedMode) {
                  // ── 彎曲模式：內容決定自然尺寸；使用者拉過的主軸（鎖定軸）保留，對齊才有意義 ──
                  const bounds = measureTextVisualBounds(element, ctx);
                  let targetW = bounds.width;
                  let targetH = bounds.height;
                  if (!isVertical && element.isWidthLocked) targetW = Math.max(element.width, bounds.width);
                  if (isVertical && element.isHeightLocked) targetH = Math.max(element.height, bounds.height);
                  if (Math.abs(targetW - element.width) > 2 || Math.abs(targetH - element.height) > 2) {
                      onUpdate({ ...element, width: targetW, height: targetH });
                  }
              } else if (element.isWidthLocked && element.isHeightLocked) {
                  // ── 固定模式：寬高都鎖，什麼都不做 ──

              } else if (element.isWidthLocked || element.isHeightLocked) {
                  // ── 固定寬 / 固定高模式：一軸固定，另一軸自動 ──
                  const padding = getTextBoxPadding(element);
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
                  // measureTextVisualBounds already includes sagitta for curved text
                  const bounds = measureTextVisualBounds(element, ctx);
                  const targetWidth = bounds.width;
                  const targetHeight = bounds.height;
                  if (Math.abs(targetWidth - element.width) > 2 || Math.abs(targetHeight - element.height) > 2) {
                      onUpdate({ ...element, width: targetWidth, height: targetHeight });
                  }
              }
          }
      }
  }, [
      element.type === 'text' ? element.text : null,
      element.type === 'text' ? element.fontSize : null,
      element.type === 'text' ? element.lineHeight : null,
      element.type === 'text' ? element.letterSpacing : null,
      element.type === 'text' ? element.strokeWidth : null,
      element.type === 'text' ? element.writingMode : null,
      element.type === 'text' ? element.isWidthLocked : null,
      element.type === 'text' ? element.isHeightLocked : null,
      element.type === 'text' ? element.width : null,
      element.type === 'text' ? element.height : null,
      element.type === 'text' ? (element as any).curveStrength : null,
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
      
      const textPadding = getTextBoxPadding(element);
      // 彎曲文字不按盒寬換行重排：盒寬（弦長）遠小於直排寬，重排會造成換行→量測縮小→再換行的回饋循環
      const isCurvedText = Math.abs((element as any).curveStrength || 0) > 0.1;
      const isLocked = !isCurvedText && (element.isWidthLocked || element.isHeightLocked);
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
      // For rotate/resize: never toggle with shiftKey (prevents deselecting during Shift+rotate)
      onSelect(element.id, type === 'drag' ? e.shiftKey : false);

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
      hasMovedRef.current = false;
      // 通知手勢開始：讓歷史在首幀新增一筆，保住手勢前狀態（修復幽靈歷史）
      onInteractionStart?.();
      setInteraction(interactionDetails);
    }, [element, onSelect, isOutpainting, onInteractionStart]);

    const processInteractionMove = useCallback((e: MouseEvent) => {
        if (!interaction) return;

        const { type, startPoint, startElement } = interaction;
        const dx = (e.clientX - startPoint.x) / zoom;
        const dy = (e.clientY - startPoint.y) / zoom;

        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
            hasMovedRef.current = true;
        }

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
            if (onLiveDrag) {
                // fast path：拖曳期間不進全域 state，由 InfiniteCanvas 以 local override 呈現
                onLiveDrag(updatedElement);
            } else {
                onUpdate(updatedElement, delta);
            }
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

            const isTextCornerScale = isText && ws !== 0 && hs !== 0;
            let textScaledProps: Partial<TextElement> = {};

            if (isTextCornerScale) {
                // 角落把手：等比縮放字級（Figma/Canva 慣例）；側邊把手才是重排版
                const startText = startElement as TextElement;
                const kRaw = Math.abs(ws * rotDx) > Math.abs(hs * rotDy)
                    ? newWidth / startElement.width
                    : newHeight / startElement.height;
                const newFontSize = Math.max(4, Math.min(500, startText.fontSize * kRaw));
                const k = newFontSize / startText.fontSize;
                newWidth  = startElement.width * k;
                newHeight = startElement.height * k;
                textScaledProps = {
                    fontSize: newFontSize,
                    letterSpacing: (startText.letterSpacing || 0) * k,
                };
            } else if (isText) {
                const padding = getTextBoxPadding(startElement);
                const lineHeightPx = startElement.fontSize * startElement.lineHeight;
                const minBoxWidth  = isVerticalEl ? padding * 2 + lineHeightPx : padding * 2 + Math.ceil(startElement.fontSize * 0.5);
                const minBoxHeight = isVerticalEl ? padding * 2 + Math.ceil(startElement.fontSize * 0.5) : padding * 2 + lineHeightPx;
                newWidth  = Math.max(minBoxWidth,  newWidth);
                newHeight = Math.max(minBoxHeight, newHeight);

                // 彎曲文字不重排：側邊把手只改主軸尺寸，放開後 effect 會校正另一軸
                const isCurvedResize = Math.abs(((startElement as TextElement).curveStrength) || 0) > 0.1;
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (ctx && !isCurvedResize) {
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
            // For horizontal text side-resize, top edge is always the anchor (text grows downward);
            // corner scale anchors the opposite corner like other elements
            const effectivePy = (isText && !isVerticalEl && !isTextCornerScale) ? +1 : py;
            const localDx = dw / 2 * px;
            const localDy = dh / 2 * effectivePy;
            const posDx = localDx * Math.cos(rad) - localDy * Math.sin(rad);
            const posDy = localDx * Math.sin(rad) + localDy * Math.cos(rad);

            onUpdate({
                ...startElement,
                width: newWidth,
                height: newHeight,
                ...(isText && !isTextCornerScale ? {
                    isWidthLocked: !isVerticalEl ? true : (startElement as TextElement).isWidthLocked,
                    isHeightLocked: isVerticalEl ? true : (startElement as TextElement).isHeightLocked
                } : {}),
                ...textScaledProps,
                position: {
                    x: startElement.position.x + posDx,
                    y: startElement.position.y + posDy
                }
            });
        } else if (type === 'rotate' && interaction.center && interaction.startAngle !== undefined) {
             const { center, startAngle } = interaction;
             const currentAngle = Math.atan2(e.clientY - center.y, e.clientX - center.x);
             const angleDiff = currentAngle - startAngle;
             let newRotation = startElement.rotation + angleDiff * (180 / Math.PI);
             if (e.shiftKey) newRotation = Math.round(newRotation / 45) * 45;
             onUpdate({ ...startElement, rotation: newRotation });
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
    }, [interaction, onUpdate, onLiveDrag, zoom, element.position.x, element.position.y, element]);

    // rAF 節流：高回報率滑鼠（125~1000Hz）一幀可能塞進多個 mousemove，
    // 只保留最新事件、每幀最多處理一次，避免一幀內多次 React commit。
    const moveRafRef = useRef(0);
    const lastMoveEventRef = useRef<MouseEvent | null>(null);
    const handleInteractionMove = useCallback((e: MouseEvent) => {
        lastMoveEventRef.current = e;
        if (moveRafRef.current) return;
        moveRafRef.current = requestAnimationFrame(() => {
            moveRafRef.current = 0;
            if (lastMoveEventRef.current) processInteractionMove(lastMoveEventRef.current);
        });
    }, [processInteractionMove]);

    const handleInteractionEnd = useCallback(() => {
        // 沖掉還沒跑的最後一幀，確保 mouseup 前的位移不遺失
        if (moveRafRef.current) {
            cancelAnimationFrame(moveRafRef.current);
            moveRafRef.current = 0;
            if (lastMoveEventRef.current) processInteractionMove(lastMoveEventRef.current);
        }
        lastMoveEventRef.current = null;
        if (interaction?.type === 'drag') {
            onDragEnd?.();
        }
        if (interaction && hasMovedRef.current) {
          onInteractionEnd();
        }
        hasMovedRef.current = false;
        setInteraction(null);
    }, [interaction, onDragEnd, onInteractionEnd, processInteractionMove]);

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
        if (interactionMode === 'hand') return;
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

    // 只在 unmount 時取消殘留的 rAF（不能放上面的 effect：它每幀重跑，會誤殺進行中的排程）
    useEffect(() => () => {
        if (moveRafRef.current) cancelAnimationFrame(moveRafRef.current);
    }, []);
    
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
                        cursor: element.isLocked ? 'default' : (interactionMode === 'select' ? 'move' : 'default'),
                        isolation: 'isolate',
                    }}
                    onMouseDown={(e) => handleInteractionStart(e, 'drag')}
                    onDoubleClick={() => {/* 雙擊可重新命名 */}}
                    onContextMenu={handleArtboardContextMenu}
                >
                    {/* 左上角名稱標籤：反向縮放，螢幕上維持約 13px 可讀大小 */}
                    {(() => {
                        const fs = Math.round(10 / zoom);
                        return (
                            <div style={{
                                position: 'absolute',
                                top: -(fs + Math.round(4 / zoom)),
                                left: 0,
                                fontSize: fs,
                                lineHeight: 1,
                                color: '#6E6E73',
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                                pointerEvents: 'none',
                                userSelect: 'none',
                            }}>
                                {element.artboardName}
                            </div>
                        );
                    })()}
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
    // Locked elements keep pointer-events so right-click (context menu) still works;
    // left-click is blocked inside handleInteractionStart (early return when isLocked).
    const pointerEventsClass = interactionMode === 'hand' ? '!pointer-events-none' : '';

// ── tldraw 雲形演算法移植 ──
// 來源：tldraw getGeoShapePath.ts 的 getCloudPath，改寫為輸出 SVG path 字串。
// 原理：沿內縮 pill（膠囊）周長等距取 numBumps 個點，兩端點做 seeded 隨機 wiggle 讓凸起「popping」，
// 相鄰兩點以三點求圓心畫外凸圓弧 → 蓬鬆有機的雲，而非固定圓弧拼貼。
type CloudVec = { x: number; y: number };
function cloudRng(seed: string) {
    let x = 0, y = 0, z = 0, w = 0;
    function next() {
        const t = x ^ (x << 11);
        x = y; y = z; z = w;
        w ^= ((w >>> 19) ^ t ^ (t >>> 8)) >>> 0;
        return (w / 0x100000000) * 2;
    }
    for (let k = 0; k < seed.length + 64; k++) { x ^= seed.charCodeAt(k) | 0; next(); }
    return next;
}
function cloudOvalPerimeter(h: number, w: number) {
    if (h > w) return (Math.PI * (w / 2) + (h - w)) * 2;
    return (Math.PI * (h / 2) + (w - h)) * 2;
}
function cloudCenterFrom3(a: CloudVec, b: CloudVec, c: CloudVec): CloudVec | null {
    const u = -2 * (a.x * (b.y - c.y) - a.y * (b.x - c.x) + b.x * c.y - c.x * b.y);
    const x = ((a.x*a.x + a.y*a.y) * (c.y - b.y) + (b.x*b.x + b.y*b.y) * (a.y - c.y) + (c.x*c.x + c.y*c.y) * (b.y - a.y)) / u;
    const y = ((a.x*a.x + a.y*a.y) * (b.x - c.x) + (b.x*b.x + b.y*b.y) * (c.x - a.x) + (c.x*c.x + c.y*c.y) * (a.x - b.x)) / u;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
}
function cloudDist(a: CloudVec, b: CloudVec) { return Math.hypot(a.x - b.x, a.y - b.y); }
type CloudPill = { type: 'straight'; start: CloudVec; delta: CloudVec } | { type: 'arc'; center: CloudVec; startAngle: number };
function cloudPillPoints(width: number, height: number, numPoints: number): CloudVec[] {
    const PI = Math.PI;
    const radius = Math.min(width, height) / 2;
    const longSide = Math.max(width, height) - radius * 2;
    const circumference = PI * (radius * 2) + 2 * longSide;
    const spacing = circumference / numPoints;
    const sections: CloudPill[] = width > height
        ? [
            { type: 'straight', start: { x: radius, y: 0 }, delta: { x: 1, y: 0 } },
            { type: 'arc', center: { x: width - radius, y: radius }, startAngle: -PI / 2 },
            { type: 'straight', start: { x: width - radius, y: height }, delta: { x: -1, y: 0 } },
            { type: 'arc', center: { x: radius, y: radius }, startAngle: PI / 2 },
          ]
        : [
            { type: 'straight', start: { x: width, y: radius }, delta: { x: 0, y: 1 } },
            { type: 'arc', center: { x: radius, y: height - radius }, startAngle: 0 },
            { type: 'straight', start: { x: 0, y: height - radius }, delta: { x: 0, y: -1 } },
            { type: 'arc', center: { x: radius, y: radius }, startAngle: PI },
          ];
    let sectionOffset = 0;
    const points: CloudVec[] = [];
    for (let i = 0; i < numPoints; i++) {
        const section = sections[0];
        if (section.type === 'straight') {
            points.push({ x: section.start.x + section.delta.x * sectionOffset, y: section.start.y + section.delta.y * sectionOffset });
        } else {
            const a = section.startAngle + sectionOffset / radius;
            points.push({ x: section.center.x + radius * Math.cos(a), y: section.center.y + radius * Math.sin(a) });
        }
        sectionOffset += spacing;
        let sectionLength = section.type === 'straight' ? longSide : PI * radius;
        while (sectionOffset > sectionLength) {
            sectionOffset -= sectionLength;
            sections.push(sections.shift()!);
            sectionLength = sections[0].type === 'straight' ? longSide : PI * radius;
        }
    }
    return points;
}
function getCloudPath(width: number, height: number, seed: string): string {
    const getRandom = cloudRng(seed);
    // SIZE 越大 → 凸起越少越寬；BUMP_PROTRUSION 越大 → 凸得越飽滿。
    const BUMP_PROTRUSION = 0.3, SIZE = 130, scale = 1;
    const pillCircumference = cloudOvalPerimeter(width, height);
    const numBumps = Math.max(
        Math.ceil(pillCircumference / SIZE),
        5,
        Math.ceil(pillCircumference / Math.min(width, height)),
    );
    const targetBumpProtrusion = (pillCircumference / numBumps) * BUMP_PROTRUSION;
    const innerWidth = Math.max(width - targetBumpProtrusion * 2, 1);
    const innerHeight = Math.max(height - targetBumpProtrusion * 2, 1);
    const innerCircumference = cloudOvalPerimeter(innerWidth, innerHeight);
    const distanceBetweenPointsOnPerimeter = innerCircumference / numBumps;
    const paddingX = (width - innerWidth) / 2;
    const paddingY = (height - innerHeight) / 2;
    const bumpPoints = cloudPillPoints(innerWidth, innerHeight, numBumps).map(p => ({ x: p.x + paddingX, y: p.y + paddingY }));
    const maxWiggleX = width < 20 ? 0 : targetBumpProtrusion * 0.3;
    const maxWiggleY = height < 20 ? 0 : targetBumpProtrusion * 0.3;
    const wiggledPoints = bumpPoints.slice(0);
    for (let i = 0; i < Math.floor(numBumps / 2); i++) {
        wiggledPoints[i] = { x: wiggledPoints[i].x + getRandom() * maxWiggleX * scale, y: wiggledPoints[i].y + getRandom() * maxWiggleY * scale };
        const k = numBumps - i - 1;
        wiggledPoints[k] = { x: wiggledPoints[k].x + getRandom() * maxWiggleX * scale, y: wiggledPoints[k].y + getRandom() * maxWiggleY * scale };
    }
    let d = '';
    for (let i = 0; i < wiggledPoints.length; i++) {
        const j = i === wiggledPoints.length - 1 ? 0 : i + 1;
        const leftWiggle = wiggledPoints[i], rightWiggle = wiggledPoints[j];
        const leftPoint = bumpPoints[i], rightPoint = bumpPoints[j];
        const distOrig = cloudDist(leftPoint, rightPoint);
        const curvatureOffset = distanceBetweenPointsOnPerimeter - distOrig;
        const distWiggle = cloudDist(leftWiggle, rightWiggle);
        const relativeSize = distWiggle / distOrig;
        const finalDistance = (Math.max(paddingX, paddingY) + curvatureOffset) * relativeSize;
        const dir = { x: rightPoint.x - leftPoint.x, y: rightPoint.y - leftPoint.y };
        const len = Math.hypot(dir.x, dir.y) || 1;
        const perX = dir.y / len, perY = -dir.x / len; // 單位向量的垂直向量（tldraw Vec.per）
        const midX = (leftPoint.x + rightPoint.x) / 2, midY = (leftPoint.y + rightPoint.y) / 2;
        const arcPoint = { x: midX + perX * finalDistance, y: midY + perY * finalDistance };
        arcPoint.x = Math.max(0, Math.min(width, arcPoint.x));
        arcPoint.y = Math.max(0, Math.min(height, arcPoint.y));
        const center = cloudCenterFrom3(leftWiggle, rightWiggle, arcPoint);
        const radius = cloudDist(center ?? { x: (leftWiggle.x + rightWiggle.x) / 2, y: (leftWiggle.y + rightWiggle.y) / 2 }, leftWiggle);
        if (i === 0) d += `M${leftWiggle.x},${leftWiggle.y} `;
        d += `A${radius},${radius} 0 0 1 ${rightWiggle.x},${rightWiggle.y} `;
    }
    return d + 'Z';
}

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
        case 'diamond':
            return `M${w/2},0 L${w},${h/2} L${w/2},${h} L0,${h/2} Z`;
        case 'cross': {
            const t = Math.min(w, h) * 0.3;
            return `M${(w-t)/2},0 L${(w+t)/2},0 L${(w+t)/2},${(h-t)/2} L${w},${(h-t)/2} L${w},${(h+t)/2} L${(w+t)/2},${(h+t)/2} L${(w+t)/2},${h} L${(w-t)/2},${h} L${(w-t)/2},${(h+t)/2} L0,${(h+t)/2} L0,${(h-t)/2} L${(w-t)/2},${(h-t)/2} Z`;
        }
        case 'trapezoid': {
            const inset = w * 0.2;
            return `M${inset},0 L${w-inset},0 L${w},${h} L0,${h} Z`;
        }
        case 'parallelogram': {
            const skew = w * 0.2;
            return `M${skew},0 L${w},0 L${w-skew},${h} L0,${h} Z`;
        }
        case 'cloud':
            return getCloudPath(w, h, shapeEl.id);
        case 'arrow_right': {
            const ah = h * 0.4, ay = (h - ah) / 2;
            const ax = w * 0.55;
            return `M0,${ay} L${ax},${ay} L${ax},0 L${w},${h/2} L${ax},${h} L${ax},${h-ay} L0,${h-ay} Z`;
        }
        case 'arrow_left': {
            const ah2 = h * 0.4, ay2 = (h - ah2) / 2;
            const ax2 = w * 0.45;
            return `M${w},${ay2} L${ax2},${ay2} L${ax2},0 L0,${h/2} L${ax2},${h} L${ax2},${h-ay2} L${w},${h-ay2} Z`;
        }
        case 'arrow_up': {
            const aw = w * 0.4, axu = (w - aw) / 2;
            const ayu = h * 0.55;
            return `M${axu},${h} L${axu},${ayu} L0,${ayu} L${w/2},0 L${w},${ayu} L${w-axu},${ayu} L${w-axu},${h} Z`;
        }
        case 'arrow_down': {
            const awd = w * 0.4, axd = (w - awd) / 2;
            const ayd = h * 0.45;
            return `M${axd},0 L${axd},${ayd} L0,${ayd} L${w/2},${h} L${w},${ayd} L${w-axd},${ayd} L${w-axd},0 Z`;
        }
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
    } else if (shapeType === 'octagon') {
        for (let i = 0; i < 8; i++) {
            const angle = i * 2 * Math.PI / 8 - Math.PI / 8;
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
            data-element-id={element.id}
            className={`absolute group ${pointerEventsClass} select-none`}
            style={{
                left: element.position.x,
                top: element.position.y,
                width: element.width,
                height: element.height,
                transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
                // 僅選取中（= 可能正被拖曳/縮放/旋轉）的元素才提示 GPU 合成；
                // 全部元素常駐 will-change 在多圖時反而會增加合成層記憶體開銷
                willChange: isSelected ? 'transform' : undefined,
                cursor: isOutpainting ? 'move' : 'move',
                zIndex: galleryHovered ? 99999 : element.zIndex,
                overflow: element.type === 'note' ? 'visible' : undefined,
                pointerEvents: 'auto',
                opacity: element.opacity ?? 1,
                mixBlendMode: element.type === 'note' ? 'normal' : (element.blendMode || 'normal'), // ✅ 新增
            }}
            onMouseDown={(e) => handleInteractionStart(e, 'drag')}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleElementContextMenu}
        >
            <div className={`element-body w-full h-full relative`}>
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
                    case 'note': {
                        const refImgs = el.referenceImages ?? [null, null, null, null];

                        const handleRefUpload = (idx: number, file: File) => {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                                const src = ev.target?.result as string;
                                const newRefs = [...refImgs];
                                newRefs[idx] = src;
                                onUpdate({ ...el, referenceImages: newRefs });
                            };
                            reader.readAsDataURL(file);
                        };

                        const handleRefRemoveIdx = (idx: number) => {
                            const newRefs = [...refImgs];
                            newRefs[idx] = null;
                            onUpdate({ ...el, referenceImages: newRefs });
                        };

                        // 與 NoteReferenceGallery 完全相同的 GS 計算（保持同步）
                        const _maxGS   = Math.round(Math.min(el.width * 0.45, 200));
                        const galleryGS = zoom > 1
                            ? Math.round(92 / zoom)
                            : zoom >= 0.3
                                ? 92
                                : Math.min(_maxGS, Math.max(80, Math.round(48 / zoom)));
                        const galleryMargin = Math.round(20 * (galleryGS / 144));

                        // 便利貼夠寬 AND 便利貼世界尺寸 > 卡片 × 1.3（避免卡片蓋過便利貼）
                        const showGallery = el.width >= 240 && el.width > galleryGS * 1.3;

                        // 螢幕目標字級隨 zoom 階段切換
                        const targetScreen = zoom > 1.0 ? 18
                                           : zoom >= 0.5 ? 18
                                           : zoom >= 0.3 ? 15
                                           : 12;
                        const noteFontSize = Math.round(targetScreen / zoom);
                        const notePadH = Math.round(Math.max(12, 24 / zoom));
                        const notePadV = Math.round(Math.max(10, 16 / zoom));
                        // 底部留空給右下角畫廊（與上方 galleryGS 同步）
                        const notePadB = showGallery
                            ? Math.round(Math.max(notePadV, galleryGS + galleryMargin + 16))
                            : notePadV;

                        return (
                            // 外層 overflow:visible 讓畫廊照片可展開到元素外
                            <div style={{ ...style, position:'relative', overflow:'visible' }}>
                                {/* 便利貼本體：圓角 + overflow:hidden 限制文字 */}
                                <div className={`absolute inset-0 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] text-[#1D1D1F] font-medium flex flex-col ${el.color} transition-shadow hover:shadow-[0_12px_40px_rgba(0,0,0,0.18)] overflow-hidden`}>
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
                                        className={`flex-1 min-h-0 bg-transparent text-[#1D1D1F] resize-none border-none focus:outline-none placeholder-[#1D1D1F]/40 ${isEditing ? 'cursor-text' : (el.isLocked ? 'cursor-not-allowed' : 'cursor-move')} ${el.textAlign === 'center' ? 'text-center' : 'text-left'}`}
                                        style={{
                                            fontFamily: 'inherit',
                                            fontSize: noteFontSize,
                                            lineHeight: '1.6',
                                            fontWeight: 300,
                                            paddingLeft: notePadH,
                                            paddingRight: notePadH,
                                            paddingTop: notePadV,
                                            paddingBottom: notePadB,
                                        }}
                                        placeholder={el.isLocked ? "" : "請輸入內容..."}
                                    />
                                </div>

                                {/* 右下角參考圖畫廊 */}
                                {showGallery && (
                                    <NoteReferenceGallery
                                        refImgs={refImgs}
                                        zoom={zoom}
                                        noteWidth={el.width}
                                        onUpload={handleRefUpload}
                                        onRemove={handleRefRemoveIdx}
                                        onHoverChange={setGalleryHovered}
                                    />
                                )}
                            </div>
                        );
                    }
                    case 'text':
                        {
                            // SVG RENDERER FOR TEXT (always shown; transparent textarea overlaid when editing)
                            const padding = getTextBoxPadding(el);
                            const isVertical = el.writingMode === 'vertical';
                            const lineHeightPx = el.fontSize * el.lineHeight;

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
                                        <div className={`absolute inset-0 ${borderRadiusClass}`} style={{ backgroundColor: el.backgroundColor, zIndex: 0 }} />
                                    )}
                                    <svg
                                        width="100%"
                                        height="100%"
                                        viewBox={`0 0 ${el.width} ${el.height}`}
                                        style={{ overflow: 'visible', position: 'relative', zIndex: 1 }}
                                    >
                                        {isVertical ? (
                                            (() => {
                                                const spacingPx = el.letterSpacing || 0;
                                                const isCurvedV = Math.abs(el.curveStrength || 0) > 0.1;
                                                const totalTextWidth = linesToRender.length * lineHeightPx;

                                                const basePropsV = {
                                                    fontFamily: el.fontFamily, fontSize: el.fontSize,
                                                    fontWeight: el.isBold ? 'bold' : 'normal' as const,
                                                    fontStyle: el.isItalic ? 'italic' : 'normal' as const,
                                                    textDecoration: el.isUnderline ? 'underline' : 'none' as const,
                                                    dominantBaseline: 'middle' as const, textAnchor: 'middle' as const,
                                                    strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const,
                                                };
                                                const hasStrokeV = !!(el.strokeWidth && el.strokeWidth > 0 && el.strokeColor);

                                                if (isCurvedV) {
                                                    // --- VERTICAL CURVED RENDERER ---
                                                    // Mirror of canvas textCanvas.ts vertical curved section
                                                    // Main axis = Y (top→bottom), arc deflects in X
                                                    const curveStrength = el.curveStrength!;
                                                    const curvatureNorm = curveStrength / 100;
                                                    const isNeg = curvatureNorm < 0;

                                                    const allCurvedCharsV: { char: string; cx: number; cy: number; rotDeg: number; key: string }[] = [];

                                                    linesToRender.forEach((line, i) => {
                                                        const colX = (el.width - totalTextWidth) / 2 + (linesToRender.length - 1 - i) * lineHeightPx + lineHeightPx / 2;
                                                        const chars = line.split('');
                                                        const charHeights = chars.map(c => isCJK(c) ? el.fontSize : el.fontSize * 0.6);
                                                        // n spacings (not n-1): wrap-point gap = spacingPx at ±100
                                                        const totalColH = charHeights.reduce((s, h) => s + h, 0) + chars.length * spacingPx;

                                                        const arcAngle = Math.abs(curvatureNorm) * 2 * Math.PI;
                                                        const baseR = totalColH / arcAngle;
                                                        const lineOff = (i - (linesToRender.length - 1) / 2) * lineHeightPx;
                                                        const R = isNeg ? baseR + lineOff : baseR - lineOff;
                                                        if (R <= 0) return;

                                                        const sagitta = R * (1 - Math.cos(arcAngle / 2));
                                                        const shiftX = isNeg ? -sagitta / 2 : sagitta / 2;

                                                        // 對齊：直書弧心 Y 依 align 靠上(left)/置中/靠下(right)
                                                        const halfArcV = arcAngle / 2;
                                                        const ySpanLine = halfArcV <= Math.PI / 2 ? 2 * R * Math.sin(halfArcV) : 2 * R;
                                                        let arcCenterY = el.height / 2;
                                                        if (el.align === 'left') arcCenterY = padding + ySpanLine / 2;
                                                        else if (el.align === 'right') arcCenterY = el.height - padding - ySpanLine / 2;

                                                        let accumulated = 0;
                                                        chars.forEach((char, charIdx) => {
                                                            const charH = charHeights[charIdx];
                                                            const s = accumulated + charH / 2 - totalColH / 2;
                                                            accumulated += charH + spacingPx; // always add (wrap-gap fix)

                                                            const theta = s / R;
                                                            const cy = arcCenterY + R * Math.sin(theta);
                                                            const baseX = R * (1 - Math.cos(theta));
                                                            const cx = isNeg ? colX + baseX + shiftX : colX - baseX + shiftX;
                                                            // isNeg: mirror lean (-theta), NOT flip 180°
                                                            let rotDeg = isNeg ? -theta * 180 / Math.PI : theta * 180 / Math.PI;
                                                            if (!isCJK(char)) rotDeg += 90;

                                                            allCurvedCharsV.push({ char, cx, cy, rotDeg, key: `${i}-${charIdx}` });
                                                        });
                                                    });

                                                    return (
                                                        <>
                                                            {filterString && (
                                                                <g filter={filterString}>
                                                                    {allCurvedCharsV.map(({ char, cx, cy, rotDeg, key }) => (
                                                                        <text key={key} transform={`translate(${cx},${cy}) rotate(${rotDeg})`}
                                                                            fill={el.color} stroke={hasStrokeV ? el.strokeColor : 'none'}
                                                                            strokeWidth={hasStrokeV ? (el.strokeWidth || 0) : 0}
                                                                            {...basePropsV}>{char}</text>
                                                                    ))}
                                                                </g>
                                                            )}
                                                            {hasStrokeV && (
                                                                <g>
                                                                    {allCurvedCharsV.map(({ char, cx, cy, rotDeg, key }) => (
                                                                        <text key={`s-${key}`} transform={`translate(${cx},${cy}) rotate(${rotDeg})`}
                                                                            fill="none" stroke={el.strokeColor} strokeWidth={el.strokeWidth || 0}
                                                                            {...basePropsV}>{char}</text>
                                                                    ))}
                                                                </g>
                                                            )}
                                                            <g>
                                                                {allCurvedCharsV.map(({ char, cx, cy, rotDeg, key }) => (
                                                                    <text key={`f-${key}`} transform={`translate(${cx},${cy}) rotate(${rotDeg})`}
                                                                        fill={el.color} stroke="none" {...basePropsV}>{char}</text>
                                                                ))}
                                                            </g>
                                                        </>
                                                    );
                                                }

                                                // --- VERTICAL STRAIGHT RENDERER: three-pass ---
                                                const allCharsV: { char: string; x: number; y: number; transform?: string; key: string }[] = [];
                                                linesToRender.forEach((line, i) => {
                                                    const startX = (el.width - totalTextWidth)/2 + (linesToRender.length - 1 - i) * lineHeightPx + lineHeightPx/2;
                                                    const lineH = line.split('').reduce((sum, c) => sum + (isCJK(c) ? el.fontSize : el.fontSize * 0.6), 0) + (line.length - 1) * spacingPx;
                                                    let yPos = padding;
                                                    if (el.align === 'center') yPos = el.height / 2 - lineH / 2;
                                                    else if (el.align === 'right') yPos = el.height - padding - lineH;
                                                    let currentY = yPos;
                                                    line.split('').forEach((char, charIdx) => {
                                                        const isVChar = isCJK(char);
                                                        let renderY = currentY;
                                                        if (isVChar) { renderY += el.fontSize / 2; currentY += el.fontSize; }
                                                        else { const cw = measureCtx ? measureCtx.measureText(char).width : el.fontSize * 0.6; renderY += cw / 2; currentY += cw; }
                                                        currentY += spacingPx;
                                                        allCharsV.push({ char, x: startX, y: renderY, transform: !isVChar ? `rotate(90, ${startX}, ${renderY})` : undefined, key: `${i}-${charIdx}` });
                                                    });
                                                });
                                                return (
                                                    <>
                                                        {filterString && (
                                                            <g filter={filterString}>
                                                                {allCharsV.map(({ char, x, y, transform, key }) => (
                                                                    <text key={key} x={x} y={y} transform={transform} fill={el.color} stroke={hasStrokeV ? el.strokeColor : 'none'} strokeWidth={hasStrokeV ? (el.strokeWidth || 0) : 0} {...basePropsV}>{char}</text>
                                                                ))}
                                                            </g>
                                                        )}
                                                        {hasStrokeV && (
                                                            <g>
                                                                {allCharsV.map(({ char, x, y, transform, key }) => (
                                                                    <text key={`s-${key}`} x={x} y={y} transform={transform} fill="none" stroke={el.strokeColor} strokeWidth={el.strokeWidth || 0} {...basePropsV}>{char}</text>
                                                                ))}
                                                            </g>
                                                        )}
                                                        <g>
                                                            {allCharsV.map(({ char, x, y, transform, key }) => (
                                                                <text key={`f-${key}`} x={x} y={y} transform={transform} fill={el.color} stroke="none" {...basePropsV}>{char}</text>
                                                            ))}
                                                        </g>
                                                    </>
                                                );
                                            })()
                                        ) : (
                                            (() => {
                                            const isCurved = Math.abs(el.curveStrength || 0) > 0.1;
                                            const spacingPx = el.letterSpacing || 0;

                                            if (isCurved) {
                                                // --- HORIZONTAL CURVED: new polar formula ---
                                                // R = totalLineWidth / (|curvatureNorm| * 2π)
                                                // +100 = ∩ full circle, -100 = ∪ full circle baseline-out
                                                const curveStrength = el.curveStrength!;
                                                const curvatureNorm = curveStrength / 100;
                                                const isNeg = curvatureNorm < 0;
                                                const boxCenterY = el.height / 2;

                                                const allCurvedChars: { char: string; x: number; y: number; rotation: number; key: string }[] = [];

                                                linesToRender.forEach((line, lineIdx) => {
                                                    const chars = line.split('');
                                                    const charWidths = measureCtx
                                                        ? chars.map(c => measureCtx!.measureText(c).width)
                                                        : chars.map(() => el.fontSize * 0.6);
                                                    // n spacings (not n-1): wrap-point gap = spacingPx at ±100
                                                    const totalLineWidth = charWidths.reduce((sum, w) => sum + w, 0) + chars.length * spacingPx;

                                                    const arcAngle = Math.abs(curvatureNorm) * 2 * Math.PI;
                                                    const baseR = totalLineWidth / arcAngle;
                                                    const lineOffset = (lineIdx - (linesToRender.length - 1) / 2) * lineHeightPx;
                                                    const R = isNeg ? baseR + lineOffset : baseR - lineOffset;
                                                    if (R <= 0) return;

                                                    const sagitta = R * (1 - Math.cos(arcAngle / 2));
                                                    const shiftY = isNeg ? sagitta / 2 : -sagitta / 2;

                                                    // 對齊：弧心 X 依 align 靠左/置中/靠右（xSpan = 弧的水平跨距）
                                                    const halfArcH = arcAngle / 2;
                                                    const xSpanLine = halfArcH <= Math.PI / 2 ? 2 * R * Math.sin(halfArcH) : 2 * R;
                                                    let arcCenterX = el.width / 2;
                                                    if (el.align === 'left') arcCenterX = padding + xSpanLine / 2;
                                                    else if (el.align === 'right') arcCenterX = el.width - padding - xSpanLine / 2;

                                                    let accumulated = 0;
                                                    chars.forEach((char, charIdx) => {
                                                        const charW = charWidths[charIdx];
                                                        const s = accumulated + charW / 2 - totalLineWidth / 2;
                                                        accumulated += charW + spacingPx; // always add (wrap-gap fix)

                                                        const theta = s / R;
                                                        const charX = arcCenterX + R * Math.sin(theta);
                                                        const baseY = isNeg ? -R * (1 - Math.cos(theta)) : R * (1 - Math.cos(theta));
                                                        const charY = boxCenterY + baseY + shiftY;
                                                        // isNeg: mirror lean (-theta), NOT flip 180°
                                                        const rotDeg = isNeg ? -theta * 180 / Math.PI : theta * 180 / Math.PI;

                                                        allCurvedChars.push({ char, x: charX, y: charY, rotation: rotDeg, key: `${lineIdx}-${charIdx}` });
                                                    });
                                                });

                                                const basePropsCurved = {
                                                    fontFamily: el.fontFamily, fontSize: el.fontSize,
                                                    fontWeight: el.isBold ? 'bold' : 'normal' as const,
                                                    fontStyle: el.isItalic ? 'italic' : 'normal' as const,
                                                    textDecoration: el.isUnderline ? 'underline' : 'none' as const,
                                                    dominantBaseline: 'middle' as const, textAnchor: 'middle' as const,
                                                    strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const,
                                                };
                                                const hasStrokeCurved = !!(el.strokeWidth && el.strokeWidth > 0 && el.strokeColor);

                                                return (
                                                    <>
                                                        {filterString && (
                                                            <g filter={filterString}>
                                                                {allCurvedChars.map(({ char, x, y, rotation, key }) => (
                                                                    <text key={key} transform={`translate(${x},${y}) rotate(${rotation})`}
                                                                        fill={el.color} stroke={hasStrokeCurved ? el.strokeColor : 'none'}
                                                                        strokeWidth={hasStrokeCurved ? (el.strokeWidth || 0) : 0}
                                                                        {...basePropsCurved}>{char}</text>
                                                                ))}
                                                            </g>
                                                        )}
                                                        {hasStrokeCurved && (
                                                            <g>
                                                                {allCurvedChars.map(({ char, x, y, rotation, key }) => (
                                                                    <text key={`s-${key}`} transform={`translate(${x},${y}) rotate(${rotation})`}
                                                                        fill="none" stroke={el.strokeColor} strokeWidth={el.strokeWidth || 0}
                                                                        {...basePropsCurved}>{char}</text>
                                                                ))}
                                                            </g>
                                                        )}
                                                        <g>
                                                            {allCurvedChars.map(({ char, x, y, rotation, key }) => (
                                                                <text key={`f-${key}`} transform={`translate(${x},${y}) rotate(${rotation})`}
                                                                    fill={el.color} stroke="none" {...basePropsCurved}>{char}</text>
                                                            ))}
                                                        </g>
                                                    </>
                                                );
                                            }

                                            // --- HORIZONTAL STRAIGHT: char-by-char, three-pass rendering ---
                                            // Pass 1: glow/shadow (group filter), Pass 2: stroke, Pass 3: fill
                                            // This prevents right-char stroke from overlapping left-char fill
                                            return (() => {
                                                    const totalH = linesToRender.length * lineHeightPx;
                                                    const yStart = (el.height - totalH) / 2 + lineHeightPx / 2;

                                                    // Compute positions for all chars across all lines
                                                    const allChars: { char: string; x: number; y: number; key: string }[] = [];
                                                    linesToRender.forEach((line, i) => {
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
                                                        chars.forEach((char, ci) => {
                                                            const cw = measureCtx ? measureCtx.measureText(char).width : el.fontSize * 0.6;
                                                            allChars.push({ char, x: cx, y: yPos, key: `${i}-${ci}` });
                                                            cx += cw + spacingPx;
                                                        });
                                                    });

                                                    const baseProps = {
                                                        fontFamily: el.fontFamily,
                                                        fontSize: el.fontSize,
                                                        fontWeight: el.isBold ? 'bold' : 'normal' as const,
                                                        fontStyle: el.isItalic ? 'italic' : 'normal' as const,
                                                        textDecoration: el.isUnderline ? 'underline' : 'none' as const,
                                                        dominantBaseline: 'middle' as const,
                                                        textAnchor: 'start' as const,
                                                        strokeLinejoin: 'round' as const,
                                                        strokeLinecap: 'round' as const,
                                                    };
                                                    const hasStroke = !!(el.strokeWidth && el.strokeWidth > 0 && el.strokeColor);

                                                    return (
                                                        <>
                                                            {/* Pass 1: glow/shadow applied at group level (behind everything) */}
                                                            {filterString && (
                                                                <g filter={filterString}>
                                                                    {allChars.map(({ char, x, y, key }) => (
                                                                        <text key={key} x={x} y={y} fill={el.color}
                                                                            stroke={hasStroke ? el.strokeColor : 'none'}
                                                                            strokeWidth={hasStroke ? (el.strokeWidth || 0) : 0}
                                                                            {...baseProps}>{char}</text>
                                                                    ))}
                                                                </g>
                                                            )}
                                                            {/* Pass 2: stroke only, all chars (middle layer) */}
                                                            {hasStroke && (
                                                                <g>
                                                                    {allChars.map(({ char, x, y, key }) => (
                                                                        <text key={`s-${key}`} x={x} y={y} fill="none"
                                                                            stroke={el.strokeColor} strokeWidth={el.strokeWidth || 0}
                                                                            {...baseProps}>{char}</text>
                                                                    ))}
                                                                </g>
                                                            )}
                                                            {/* Pass 3: fill only, all chars (top layer) */}
                                                            <g>
                                                                {allChars.map(({ char, x, y, key }) => (
                                                                    <text key={`f-${key}`} x={x} y={y} fill={el.color} stroke="none"
                                                                        {...baseProps}>{char}</text>
                                                                ))}
                                                            </g>
                                                        </>
                                                    );
                                                })();
                                            })()
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
                                                padding: `${getTextBoxPadding(el)}px`,
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
                    case 'image': {
                        const maskStyle = el.fade ? generateSimpleMaskCSS(el.fade) : '';
                        const imgDropShadow = (el as any).shadowEnabled
                            ? `drop-shadow(${(el as any).shadowOffsetX ?? 4}px ${(el as any).shadowOffsetY ?? 4}px ${(el as any).shadowBlur ?? 10}px ${(el as any).shadowColor ?? 'rgba(0,0,0,0.4)'})`
                            : undefined;
                        const flipTransform = [
                            el.flipX ? 'scaleX(-1)' : '',
                            el.flipY ? 'scaleY(-1)' : '',
                        ].filter(Boolean).join(' ') || undefined;
                        return (
                            <div style={{ ...style }}> {/* 外層不加 boxShadow，避免方形框陰影 */}
                                <div style={{
                                    width: '100%',
                                    height: '100%',
                                    WebkitMaskImage: maskStyle || undefined,
                                    maskImage: maskStyle || undefined,
                                    WebkitMaskSize: '100% 100%',
                                    maskSize: '100% 100%',
                                    WebkitMaskRepeat: 'no-repeat',
                                    maskRepeat: 'no-repeat',
                                    filter: imgDropShadow,
                                    transform: flipTransform,
                                }}>
                                    <img src={displaySrc ?? el.src} alt="Canvas element" style={{ width: '100%', height: '100%', objectFit: 'fill' }} className="pointer-events-none" draggable={false} />
                                </div>
                            </div>
                        );
                    }
                    case 'drawing': {
                        // 提示文字反向縮放：zoom 縮小時維持螢幕固定字級（目標約 10px），避免看不清
                        const hintScale = 1 / Math.min(zoom, 1);
                        const hintFont = Math.min(48, Math.round(10 * hintScale));
                        const hintPadH = Math.min(40, Math.round(10 * hintScale));
                        const hintPadV = Math.min(28, Math.round(7 * hintScale));
                        return (
                            <div style={style} className="rounded-xl flex items-center justify-center">
                                {el.src ? (
                                    <img src={displaySrc ?? el.src} alt="User drawing" style={style} className="rounded-xl object-contain drop-shadow-xl" draggable="false" />
                                ) : (
                                    <span
                                        className="text-[#86868B] text-center bg-white/50 rounded-lg backdrop-blur-sm border border-black/5 whitespace-nowrap"
                                        style={{ fontSize: hintFont, padding: `${hintPadV}px ${hintPadH}px`, lineHeight: 1.2 }}
                                    >點擊兩下以繪圖</span>
                                )}
                            </div>
                        );
                    }
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
                                    {!['rectangle', 'rounded_rect', 'circle'].includes(el.shapeType) && (
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

                    {/* 圖片尺寸標籤 */}
                    {showImageSizes && (element.type === 'image' || element.type === 'drawing') && (() => {
                        const labelScale = 1 / zoom;
                        const displayW = Math.round(element.width);
                        const displayH = Math.round(element.height);
                        return (
                            <div
                                className="absolute pointer-events-none"
                                style={{
                                    left: 0,
                                    bottom: 0,
                                    transform: `translate(0, 100%) scale(${labelScale})`,
                                    transformOrigin: 'top left',
                                    zIndex: 9999,
                                }}
                            >
                                <div style={{
                                    background: 'rgba(0,0,0,0.75)',
                                    color: '#fff',
                                    fontSize: '11px',
                                    fontFamily: 'SF Mono, Menlo, monospace',
                                    padding: '2px 6px',
                                    borderRadius: '0 0 4px 4px',
                                    whiteSpace: 'nowrap',
                                    lineHeight: '1.4',
                                    backdropFilter: 'blur(4px)',
                                }}>
                                    {displayW} × {displayH} px
                                    {naturalSize && <span style={{ opacity: 0.55, marginLeft: 6 }}>
                                        (原始: {naturalSize.w} × {naturalSize.h})
                                    </span>}
                                </div>
                            </div>
                        );
                    })()}

                    {(() => {
                        // zoom 補償：縮小畫布時把 handle 放大，上限 5.5×（zoom≈18% 時觸頂）
                        const hScale  = Math.min(1 / zoom, 5.5);
                        const HS  = Math.round(7  * hScale);   // handle square size
                        const HO  = -Math.ceil(HS / 2);         // corner/edge offset
                        // 30% 以下允許邊框再加粗，讓方框/圓鈕輪廓更清楚
                        const HBWcap = zoom < 0.3 ? 10 : 3;
                        const HBW = `${Math.min(HBWcap, 1.5 * hScale).toFixed(1)}px`;
                        const RS  = Math.round(14 * hScale);   // rotate circle
                        const RTop = -Math.round(24 * hScale); // rotate button top
                        const CTop = -Math.round(12 * hScale); // connector line top
                        const CLen = Math.round(12 * hScale);  // connector line height
                        const RDot = Math.round(4  * hScale);  // inner dot
                        const layerColor = getLayerColor(element.type);
                        return element.type === 'arrow' ? (
                            <>
                                <div className="absolute top-1/2 -translate-y-1/2 cursor-grab transform-handle"
                                    style={{ left: HO, width: HS, height: HS, backgroundColor: 'white', border: `${HBW} solid ${layerColor}`, borderRadius: 2 }}
                                    onMouseDown={(e) => handleInteractionStart(e, 'resize-arrow-start')} />
                                <div className="absolute top-1/2 -translate-y-1/2 cursor-grab transform-handle"
                                    style={{ right: HO, width: HS, height: HS, backgroundColor: 'white', border: `${HBW} solid ${layerColor}`, borderRadius: 2 }}
                                    onMouseDown={(e) => handleInteractionStart(e, 'resize-arrow-end')} />
                            </>
                        ) : (
                            <>
                                {/* 旋轉鈕：貼齊選取框上方 */}
                                <div className="absolute left-1/2 -translate-x-1/2 cursor-alias transform-handle flex items-center justify-center hover:scale-110 transition-transform"
                                    style={{ top: RTop, width: RS, height: RS, backgroundColor: 'white', border: `${HBW} solid ${layerColor}`, borderRadius: '50%' }}
                                    onMouseDown={(e) => handleInteractionStart(e, 'rotate')}>
                                    <div style={{ width: RDot, height: RDot, borderRadius: '50%', backgroundColor: layerColor }} />
                                </div>
                                <div className="absolute left-1/2 -translate-x-1/2 w-px pointer-events-none opacity-40"
                                    style={{ top: CTop, height: CLen, backgroundColor: layerColor }} />

                                {/* Group mode: suppress individual resize handles */}
                                {(() => {
                                    // 彎曲文字：保留角落把手（等比縮放字級），只隱藏側邊重排把手
                                    const isCurvedText = element.type === 'text' && Math.abs((element as any).curveStrength || 0) > 0.1;
                                    if (disableResizeHandles) return null;
                                    return (
                                        <>
                                            {/* Corner handles */}
                                            {([
                                                ['nw', { top: HO, left:  HO }, 'cursor-nw-resize'],
                                                ['ne', { top: HO, right: HO }, 'cursor-ne-resize'],
                                                ['sw', { bottom: HO, left:  HO }, 'cursor-sw-resize'],
                                                ['se', { bottom: HO, right: HO }, 'cursor-se-resize'],
                                            ] as [ResizeHandle, React.CSSProperties, string][]).map(([dir, pos, cur]) => (
                                                <div key={dir}
                                                    className={`absolute transform-handle hover:scale-125 transition-transform ${cur}`}
                                                    style={{ ...pos, width: HS, height: HS, backgroundColor: 'white', border: `${HBW} solid ${layerColor}`, borderRadius: 1 }}
                                                    onMouseDown={(e) => handleInteractionStart(e, 'resize', dir)} />
                                            ))}
                                            {/* Edge handles */}
                                            {isCurvedText ? null : ([
                                                ['e', { top: '50%', right: HO, transform: 'translateY(-50%)' }, 'cursor-e-resize',  true],
                                                ['w', { top: '50%', left:  HO, transform: 'translateY(-50%)' }, 'cursor-w-resize',  true],
                                                ['s', { bottom: HO, left: '50%', transform: 'translateX(-50%)' }, 'cursor-s-resize', element.type !== 'text'],
                                                ['n', { top:    HO, left: '50%', transform: 'translateX(-50%)' }, 'cursor-n-resize', element.type !== 'text'],
                                            ] as [ResizeHandle, React.CSSProperties, string, boolean][]).filter(([,,,show]) => show).map(([dir, pos, cur]) => (
                                                <div key={dir}
                                                    className={`absolute transform-handle hover:scale-125 transition-transform ${cur}`}
                                                    style={{ ...pos, width: HS, height: HS, backgroundColor: 'white', border: `${HBW} solid ${layerColor}`, borderRadius: 1 }}
                                                    onMouseDown={(e) => handleInteractionStart(e, 'resize', dir)} />
                                            ))}
                                        </>
                                    );
                                })()}
                            </>
                        );
                    })()}
                </>
            )}
        </div>
    );
};

/**
 * memo：只有當該元素自身的 props 改變時才重繪。
 * 平移/縮放等不改變單一元素 props 的操作，未變動的元素直接跳過 → 大幅降低多圖時的卡頓。
 * （props 多為穩定參考：element 物件僅在該元素被更新時換新引用，handler 皆 useCallback / 父層 prop）
 */
export const TransformableElement = React.memo(TransformableElementInner);