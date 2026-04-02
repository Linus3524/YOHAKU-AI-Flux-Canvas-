/**
 * @project     YOHAKU (Infinite Canvas Design Tool)
 * @author      LINUS Nice Day Japan (CHANG CHIN WEI)
 * @copyright   Copyright © 2026 LINUS Nice Day Japan (CHANG CHIN WEI). All Rights Reserved.
 *
 * @credits     Based on the open-source foundational framework "Nano Banana"
 * by @prompt_case, used under MIT License.
 *
 * This file contains proprietary enhancements and logic specific to YOHAKU.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { 
    CanvasElement, Point, ShapeType, 
    ImageElement, TextElement, ShapeElement, ArrowElement, NoteElement, FrameElement, DrawingElement, ArtboardElement 
} from '../types';
import { useHistoryState } from './useHistoryState';
import { trimCanvas, wrapTextCanvas, loadImage, createShapeDataUrl, createArrowDataUrl, COLORS, getRandomPosition } from '../utils/helpers';
import { drawTextOnCanvas } from '../utils/textCanvas'; // ✅ 修改
import type { CanvasApi } from '../components/InfiniteCanvas';

// LocalStorage
const STORAGE_KEY = 'yohaku_canvas';
const MAX_STORAGE_BYTES = 5 * 1024 * 1024; // 5MB

const DEFAULT_WELCOME_NOTE: CanvasElement = {
    id: 'welcome-note',
    type: 'note',
    position: { x: -200, y: -150 },
    width: 400,
    height: 300,
    rotation: 0,
    content: '輸入想法，框選後生成圖片 ✦\n圖片可直接拖曳進畫布編輯',
    color: 'bg-[#FEFCE8]',
    zIndex: 1,
    isVisible: true,
    isLocked: false,
    name: 'Note 1',
    groupId: null,
};

const loadInitialElements = (): CanvasElement[] => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved) as CanvasElement[];
            if (parsed.length > 0) return parsed;
        }
    } catch {}
    return [DEFAULT_WELCOME_NOTE];
};

export type StorageStatus = 'saved' | 'warning' | 'critical' | 'full';

export const useCanvas = (showToast: (msg: string) => void) => {
    const {
        state: elements,
        setState: setElements,
        undo,
        redo,
        canUndo,
        canRedo
    } = useHistoryState<CanvasElement[]>(loadInitialElements());

    const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
    const [clipboardElements, setClipboardElements] = useState<CanvasElement[]>([]);
    const [croppingElementId, setCroppingElementId] = useState<string | null>(null);
    const [activeShapeTool, setActiveShapeTool] = useState<ShapeType | null>(null);
    const [creatingShapeId, setCreatingShapeId] = useState<string | null>(null);
    const shapeStartPointRef = useRef<Point | null>(null);
    const zIndexCounter = useRef(1);
    const canvasApiRef = useRef<CanvasApi>(null);

    // --- LocalStorage Auto-Save ---
    const [storageStatus, setStorageStatus] = useState<StorageStatus>('saved');
    const hasMountedRef = useRef(false);

    useEffect(() => {
        // Skip first render (initial load from localStorage)
        if (!hasMountedRef.current) {
            hasMountedRef.current = true;
            return;
        }
        const timer = setTimeout(() => {
            try {
                const json = JSON.stringify(elements);
                const bytes = new Blob([json]).size;
                const ratio = bytes / MAX_STORAGE_BYTES;
                localStorage.setItem(STORAGE_KEY, json);
                if (ratio > 0.9) setStorageStatus('critical');
                else if (ratio > 0.7) setStorageStatus('warning');
                else setStorageStatus('saved');
            } catch {
                setStorageStatus('full');
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [elements]);

    const clearStorage = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setElements([]);
        setStorageStatus('saved');
        showToast('存檔已清除，畫布重置');
    }, [setElements, showToast]);

    // --- Core Add Functions ---
    const getCenterOfViewport = useCallback((): Point => {
        if (canvasApiRef.current) {
            const screenCenter: Point = {
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
            };
            return canvasApiRef.current.screenToWorld(screenCenter);
        }
        return getRandomPosition();
    }, []);

    const addElement = useCallback((newElement: Omit<NoteElement, 'id' | 'zIndex' | 'isVisible' | 'isLocked' | 'name' | 'groupId'> | Omit<ImageElement, 'id' | 'zIndex' | 'isVisible' | 'isLocked' | 'name' | 'groupId'> | Omit<ArrowElement, 'id' | 'zIndex' | 'isVisible' | 'isLocked' | 'name' | 'groupId'> | Omit<DrawingElement, 'id' | 'zIndex' | 'isVisible' | 'isLocked' | 'name' | 'groupId'> | Omit<FrameElement, 'id' | 'zIndex' | 'isVisible' | 'isLocked' | 'name' | 'groupId'> | Omit<TextElement, 'id' | 'zIndex' | 'isVisible' | 'isLocked' | 'name' | 'groupId'> | Omit<ShapeElement, 'id' | 'zIndex' | 'isVisible' | 'isLocked' | 'name' | 'groupId'> | Omit<ArtboardElement, 'id' | 'zIndex' | 'isVisible' | 'isLocked' | 'name' | 'groupId'>) => {
    
        const count = elements.filter(el => el.type === newElement.type).length + 1;
        let baseName = '';
        switch(newElement.type) {
            case 'note': baseName = `Note ${count}`; break;
            case 'image': baseName = `Image ${count}`; break;
            case 'arrow': baseName = `Arrow ${count}`; break;
            case 'drawing': baseName = `Drawing ${count}`; break;
            case 'frame': baseName = `Frame ${count}`; break;
            case 'text': baseName = `Text ${count}`; break;
            case 'shape': baseName = `Shape ${count}`; break;
            case 'artboard': baseName = `Artboard ${count}`; break;
            default: baseName = `Element ${count}`;
        }
    
        const elementWithId: CanvasElement = {
            ...newElement,
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            zIndex: newElement.type === 'artboard' ? -1 : zIndexCounter.current++,
            isVisible: true,
            isLocked: false,
            name: baseName,
            groupId: null
        } as CanvasElement;
         setElements(prev => [...prev, elementWithId]);
         return elementWithId.id; 
    }, [setElements, elements]);

    const addArtboard = useCallback((
        preset: { name: string; w: number; h: number },
        position: Point
    ) => {
        return addElement({
            type: 'artboard',
            position,
            width: preset.w,
            height: preset.h,
            rotation: 0,
            artboardName: preset.name,
            backgroundColor: '#ffffff',
            showBorder: true,
            presetName: preset.name,
        });
    }, [addElement]);

    const addNote = useCallback((position?: Point) => {
        addElement({
          type: 'note',
          position: position || getCenterOfViewport(),
          width: 150,
          height: 100,
          rotation: 0,
          content: '新筆記',
          color: COLORS.filter(c => c.name !== '透明')[Math.floor(Math.random() * (COLORS.length - 1))].bg,
        });
    }, [addElement, getCenterOfViewport]);

    const addText = useCallback((position?: Point) => {
        addElement({
          type: 'text',
          position: position || getCenterOfViewport(),
          width: 300,
          height: 100,
          rotation: 0,
          text: '雙擊編輯文字',
          fontFamily: '"Noto Sans TC", sans-serif',
          fontSize: 24,
          color: '#1D1D1F',
          align: 'left',
          letterSpacing: 0,
          lineHeight: 1.5,
          isBold: false,
          isItalic: false,
          isUnderline: false,
          strokeColor: '#FF3B30',
          strokeWidth: 0,
          backgroundColor: 'transparent',
          shadowColor: undefined,
          shadowBlur: 0,
          glowColor: undefined,
          glowBlur: 0
        });
    }, [addElement, getCenterOfViewport]);

    const addArrow = useCallback((config: Partial<ArrowElement> = {}) => {
        const start = getCenterOfViewport();
        const end = { x: start.x + 150, y: start.y };
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const width = Math.sqrt(dx * dx + dy * dy);
        const rotation = Math.atan2(dy, dx) * (180 / Math.PI);
        const centerPosition = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
        addElement({
          type: 'arrow',
          start,
          end,
          position: centerPosition,
          width,
          height: 30,
          rotation,
          color: '#1D1D1F',
          strokeWidth: 4,
          strokeStyle: 'solid',
          startArrowhead: 'none',
          endArrowhead: 'triangle',
          ...config
        });
    }, [addElement, getCenterOfViewport]);
    
    const addDrawing = useCallback((position?: Point) => {
        addElement({
          type: 'drawing',
          position: position || getCenterOfViewport(),
          width: 400,
          height: 300,
          rotation: 0,
          src: '',
        });
    }, [addElement, getCenterOfViewport]);

    const addFrame = useCallback((ratioLabel: string, ratioValue: number, position?: Point) => {
        const baseSize = 300;
        let width = baseSize;
        let height = baseSize;
        if (ratioValue > 1) {
            height = baseSize / ratioValue;
        } else {
            width = baseSize * ratioValue;
        }
        addElement({
            type: 'frame',
            position: position || getCenterOfViewport(),
            width,
            height,
            rotation: 0,
            aspectRatioLabel: ratioLabel,
            aspectRatioValue: ratioValue
        });
        showToast("已新增畫框，請搭配便利貼輸入提示詞後才可生成 🎨");
    }, [addElement, getCenterOfViewport, showToast]);

    const addImagesToCanvas = useCallback((files: File[], basePosition: Point) => {
        const imagePromises = files.map((file, index) => {
          return new Promise<Omit<ImageElement, 'id' | 'zIndex' | 'isVisible' | 'isLocked' | 'name' | 'groupId'> | null>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const src = e.target?.result as string;
              if (!src) return resolve(null);
              const img = new Image();
              img.onload = () => {
                const MAX_DIMENSION = 300;
                let { width, height } = img;
                if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                  if (width > height) {
                    height = (height / width) * MAX_DIMENSION;
                    width = MAX_DIMENSION;
                  } else {
                    width = (width / height) * MAX_DIMENSION;
                    height = MAX_DIMENSION;
                  }
                }
                const position = { x: basePosition.x + index * 20, y: basePosition.y + index * 20 };
                resolve({ type: 'image', position, src, width, height, rotation: 0 });
              };
              img.onerror = () => resolve(null);
              img.src = src;
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          });
        });
        Promise.all(imagePromises).then(results => {
          const newElements = results.filter((el): el is Omit<ImageElement, 'id' | 'zIndex' | 'isVisible' | 'isLocked' | 'name' | 'groupId'> | null => el !== null);
          if (newElements.length > 0) {
            const count = elements.length + 1;
            setElements(prev => [
              ...prev,
              ...newElements.map((el, i) => ({
                ...el,
                id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                zIndex: zIndexCounter.current++,
                isVisible: true,
                isLocked: false,
                name: `Image ${count + i}`,
                groupId: null
              } as CanvasElement))
            ]);
          }
        });
    }, [setElements, elements.length]);


    // --- Selection & Updates ---
    const handleSelectElement = useCallback((id: string | null, shiftKey: boolean) => {
        if (creatingShapeId) return;
        if (id === null) {
          if (!shiftKey) {
              setSelectedElementIds([]);
              selectedElementIdsRef.current = [];
          }
          return;
        }
        const element = elements.find(el => el.id === id);
        let idsToSelect = [id];
        if (element && element.groupId) {
            const groupMembers = elements.filter(el => el.groupId === element.groupId && el.isVisible).map(el => el.id);
            if (groupMembers.length > 0) idsToSelect = groupMembers;
        }
        
        setSelectedElementIds(prevIds => {
          let nextIds: string[];
          if (shiftKey) {
              const hasAny = idsToSelect.some(i => prevIds.includes(i));
              if (hasAny) nextIds = prevIds.filter(pid => !idsToSelect.includes(pid));
              else nextIds = [...prevIds, ...idsToSelect];
          } else {
            const isAlreadySelected = idsToSelect.every(i => prevIds.includes(i));
            if (isAlreadySelected) nextIds = prevIds;
            else nextIds = idsToSelect;
          }
          selectedElementIdsRef.current = nextIds;
          return nextIds;
        });
    }, [elements, creatingShapeId]);
    
    const handleMarqueeSelect = useCallback((ids: string[], shiftKey: boolean) => {
        const expandedIds = new Set(ids);
        elements.forEach(el => {
            if (expandedIds.has(el.id) && el.groupId) {
                const groupMembers = elements.filter(m => m.groupId === el.groupId && m.isVisible);
                groupMembers.forEach(m => expandedIds.add(m.id));
            }
        });
        setSelectedElementIds(prevIds => {
          let nextIds: string[];
          if (shiftKey) {
            const newIds = Array.from(expandedIds).filter(id => !prevIds.includes(id));
            nextIds = [...prevIds, ...newIds];
          } else {
            nextIds = Array.from(expandedIds);
          }
          selectedElementIdsRef.current = nextIds;
          return nextIds;
        });
    }, [elements]);

    const selectedElementIdsRef = useRef(selectedElementIds);
    useEffect(() => {
        selectedElementIdsRef.current = selectedElementIds;
    }, [selectedElementIds]);

    const updateElements = useCallback((updatedElement: CanvasElement, dragDelta?: Point) => {
        setElements(prevElements => {
            const leaderId = updatedElement.id;
            const leaderInState = prevElements.find(el => el.id === leaderId);
            if (!leaderInState) return prevElements;

            if (dragDelta) {
                // Leader-Follower Logic: Calculate actual delta relative to current state
                const actualDelta = {
                    x: updatedElement.position.x - leaderInState.position.x,
                    y: updatedElement.position.y - leaderInState.position.y
                };

                // Skip if no movement to prevent redundant updates
                if (actualDelta.x === 0 && actualDelta.y === 0) return prevElements;

                const groupId = updatedElement.groupId;
                const selectedSet = new Set(selectedElementIdsRef.current);

                return prevElements.map(el => {
                    if (el.id === leaderId) return updatedElement;
                    
                    const isSameGroup = groupId && el.groupId === groupId && el.isVisible;
                    const isSelected = selectedSet.has(el.id);
                    
                    if ((isSameGroup || isSelected) && !el.isLocked) {
                        // Move followers by the same actual delta
                        if (el.type === 'arrow') {
                            return {
                                ...el,
                                position: { x: el.position.x + actualDelta.x, y: el.position.y + actualDelta.y },
                                start: { x: el.start.x + actualDelta.x, y: el.start.y + actualDelta.y },
                                end: { x: el.end.x + actualDelta.x, y: el.end.y + actualDelta.y }
                            };
                        }
                        return { ...el, position: { x: el.position.x + actualDelta.x, y: el.position.y + actualDelta.y } };
                    }
                    return el;
                });
            }
            // Non-drag update (e.g. resize)
            return prevElements.map(el => (el.id === leaderId ? updatedElement : el));
        }, { addToHistory: false });
    }, [setElements]);

    // --- Merge Logic ---
    const handleMergeLayers = useCallback(async () => {
        // ✅ 移除 (刪除這三行: hasArtboard 判斷＋toast＋return)

        const validTypes = ['image', 'text', 'shape', 'arrow', 'drawing', 'note'];
        const targetElements = elements
          .filter(el => selectedElementIds.includes(el.id) && el.type !== 'artboard')
          .filter(el => validTypes.includes(el.type))
          .sort((a, b) => a.zIndex - b.zIndex); // Bottom to Top
    
        if (targetElements.length < 2) {
             showToast("無法合併：請至少選取兩個圖層 (已排除工作區域)");
             return;
        }
    
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        targetElements.forEach(el => {
            const r = (el.rotation * Math.PI) / 180;
            const cos = Math.cos(r);
            const sin = Math.sin(r);
            const w = el.width;
            const h = el.height;
            const cx = el.position.x;
            const cy = el.position.y;
            
            const corners = [
                { x: -w/2, y: -h/2 },
                { x: w/2, y: -h/2 },
                { x: w/2, y: h/2 },
                { x: -w/2, y: h/2 }
            ];
            
            corners.forEach(p => {
                const rx = p.x * cos - p.y * sin + cx;
                const ry = p.x * sin + p.y * cos + cy;
                minX = Math.min(minX, rx);
                maxX = Math.max(maxX, rx);
                minY = Math.min(minY, ry);
                maxY = Math.max(maxY, ry);
            });
        });
    
        const padding = 50; 
        minX = Math.floor(minX - padding);
        minY = Math.floor(minY - padding);
        maxX = Math.ceil(maxX + padding);
        maxY = Math.ceil(maxY + padding);
        
        const width = maxX - minX;
        const height = maxY - minY;
    
        if (width <= 0 || height <= 0) return;
    
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
    
        // Render Elements
        for (const el of targetElements) {
            ctx.save();
            const lx = el.position.x - minX;
            const ly = el.position.y - minY;
            ctx.translate(lx, ly);
            ctx.rotate((el.rotation * Math.PI) / 180);

            // 建立離屏畫布以隔離效果 (解決淡出遮罩與混合模式衝突)
            const offCanvas = document.createElement('canvas');
            const offPadding = 100; // 預留緩衝，避免陰影或粗線條被裁切
            offCanvas.width = el.width + offPadding * 2;
            offCanvas.height = el.height + offPadding * 2;
            const offCtx = offCanvas.getContext('2d');
            if (!offCtx) { ctx.restore(); continue; }
            offCtx.translate(offCanvas.width / 2, offCanvas.height / 2);

            try {
                if (el.type === 'image' || el.type === 'drawing') {
                    const img = await loadImage((el as any).src);

                    // 套用陰影（canvas shadow 在 drawImage 前設定）
                    if ((el as any).shadowEnabled) {
                        offCtx.shadowColor = (el as any).shadowColor ?? 'rgba(0,0,0,0.4)';
                        offCtx.shadowBlur = (el as any).shadowBlur ?? 10;
                        offCtx.shadowOffsetX = (el as any).shadowOffsetX ?? 4;
                        offCtx.shadowOffsetY = (el as any).shadowOffsetY ?? 4;
                    }
                    offCtx.drawImage(img, -el.width / 2, -el.height / 2, el.width, el.height);
                    // 重置陰影，避免影響後續效果
                    offCtx.shadowColor = 'transparent';
                    offCtx.shadowBlur = 0;
                    offCtx.shadowOffsetX = 0;
                    offCtx.shadowOffsetY = 0;

                    // 處理 fade 效果（作為遮罩應用）
                    const fade = (el as ImageElement).fade;
                    if (fade && fade.direction !== 'none') {
                        offCtx.save();
                        let gradient;
                        const { direction, intensity } = fade;
                        const w = el.width;
                        const h = el.height;
                        const x = -w / 2;
                        const y = -h / 2;

                        // 修正方向座標：0 為不透明，1 為透明
                        if (direction === 'radial') {
                            // ✅ 修改 radial
                            const cx = x + w / 2;
                            const cy = y + h / 2;
                            
                            // ✅ 修復邏輯相反：intensity 越大，淡出範圍越大，起點越靠近中心
                            const fadeStart = 1 - (intensity / 100);
                            
                            offCtx.save();
                            
                            // ✅ 修復形狀：用 scale 把正圓拉伸成橢圓，模擬 CSS closest-side
                            // 移動原點到圖片中心，依長寬比縮放
                            offCtx.translate(cx, cy);
                            offCtx.scale(w / 2, h / 2);  // 將座標系縮放，讓半徑 1 的圓 = 圖片邊緣
                            
                            // 在縮放後的座標系中，圓心(0,0)，半徑 1
                            gradient = offCtx.createRadialGradient(0, 0, 0, 0, 0, 1);
                            
                            // ✅ 對齊 CSS 邏輯：中心實心，往外漸變到透明
                            // CSS: black (100-intensity)%, ... transparent 100%
                            gradient.addColorStop(0, 'black');
                            if (fadeStart > 0) gradient.addColorStop(fadeStart, 'black');
                            gradient.addColorStop(
                                Math.min(fadeStart + (1 - fadeStart) * 0.25, 1), 'rgba(0,0,0,0.5)'
                            );
                            gradient.addColorStop(
                                Math.min(fadeStart + (1 - fadeStart) * 0.5, 1), 'rgba(0,0,0,0.2)'
                            );
                            gradient.addColorStop(
                                Math.min(fadeStart + (1 - fadeStart) * 0.75, 1), 'rgba(0,0,0,0.05)'
                            );
                            gradient.addColorStop(1, 'transparent');
                            
                            // 在縮放後的座標系中填滿單位圓覆蓋範圍
                            // 需要用逆縮放後的矩形座標填色
                            offCtx.fillStyle = gradient;
                            offCtx.globalCompositeOperation = 'destination-in';
                            offCtx.fillRect(-1, -1, 2, 2);  // 縮放後 -1~1 = 圖片完整範圍
                            
                            offCtx.restore();
                            gradient = undefined; // 避免觸發下方的 linear fillRect
                        } else {
                            // ✅ 修改 linear
                            const fadeEnd = intensity / 100;
                            if (direction === 'top') gradient = offCtx.createLinearGradient(0, y, 0, y + h);
                            else if (direction === 'bottom') gradient = offCtx.createLinearGradient(0, y + h, 0, y);
                            else if (direction === 'left') gradient = offCtx.createLinearGradient(x, 0, x + w, 0);
                            else if (direction === 'right') gradient = offCtx.createLinearGradient(x + w, 0, x, 0);
                            
                            if (gradient) {
                                gradient.addColorStop(0, 'transparent');
                                gradient.addColorStop(fadeEnd * 0.25, 'rgba(0,0,0,0.05)');
                                gradient.addColorStop(fadeEnd * 0.5,  'rgba(0,0,0,0.2)');
                                gradient.addColorStop(fadeEnd * 0.75, 'rgba(0,0,0,0.5)');
                                gradient.addColorStop(fadeEnd, 'black');
                                if (fadeEnd < 1) gradient.addColorStop(1, 'black');
                            }
                        }

                        if (gradient) {
                            offCtx.fillStyle = gradient;
                            offCtx.globalCompositeOperation = 'destination-in';
                            offCtx.fillRect(x, y, w, h);
                        }
                        offCtx.restore();
                    }

                } else if (el.type === 'shape') {
                    const shapeEl = el as ShapeElement;
                    const shapePadding = Math.max(20, shapeEl.strokeWidth * 2);
                    const dataUrl = await createShapeDataUrl(shapeEl);
                    const img = await loadImage(dataUrl);
                    const drawW = shapeEl.width + shapePadding * 2;
                    const drawH = shapeEl.height + shapePadding * 2;
                    offCtx.drawImage(img, -(drawW / 2), -(drawH / 2), drawW, drawH);

                } else if (el.type === 'arrow') {
                    const arrowEl = el as any;
                    // 箭頭座標需要相對於元素中心點
                    const sx = arrowEl.start.x - el.position.x;
                    const sy = arrowEl.start.y - el.position.y;
                    const ex = arrowEl.end.x - el.position.x;
                    const ey = arrowEl.end.y - el.position.y;

                    let color = arrowEl.color || '#1D1D1F';
                    if (color.startsWith('text-[')) color = color.match(/text-\[(.*?)\]/)?.[1] || '#1D1D1F';
                    else if (color.startsWith('text-')) color = '#1D1D1F';

                    const strokeWidth = arrowEl.strokeWidth || 2;
                    offCtx.strokeStyle = color;
                    offCtx.fillStyle = color;
                    offCtx.lineWidth = strokeWidth;
                    offCtx.lineCap = 'round';
                    offCtx.lineJoin = 'round';

                    if (arrowEl.strokeStyle === 'dashed') offCtx.setLineDash([strokeWidth * 3, strokeWidth * 2]);
                    else if (arrowEl.strokeStyle === 'dotted') offCtx.setLineDash([0, strokeWidth * 2]);
                    else offCtx.setLineDash([]);

                    const angleEnd   = Math.atan2(ey - sy, ex - sx) * 180 / Math.PI;
                    const angleStart = Math.atan2(sy - ey, sx - ex) * 180 / Math.PI;
                    const headSize   = strokeWidth * 3;

                    offCtx.beginPath();
                    offCtx.moveTo(sx, sy);
                    offCtx.lineTo(ex, ey);
                    offCtx.stroke();
                    offCtx.setLineDash([]);

                    const drawArrowHead = (x: number, y: number, angleDeg: number, type: string) => {
                        if (type === 'none' || !type) return;
                        const rad = angleDeg * (Math.PI / 180);
                        const rotate = (px: number, py: number) => ({
                            x: x + px * Math.cos(rad) - py * Math.sin(rad),
                            y: y + px * Math.sin(rad) + py * Math.cos(rad),
                        });

                        offCtx.beginPath();
                        if (type === 'triangle') {
                            const p1 = rotate(0, 0);
                            const p2 = rotate(-headSize * 2, -headSize);
                            const p3 = rotate(-headSize * 2, headSize);
                            offCtx.moveTo(p1.x, p1.y);
                            offCtx.lineTo(p2.x, p2.y);
                            offCtx.lineTo(p3.x, p3.y);
                            offCtx.closePath();
                            offCtx.fill();
                        } else if (type === 'arrow') {
                            const p1 = rotate(0, 0);
                            const p2 = rotate(-headSize * 2, -headSize * 1.2);
                            const p3 = rotate(-headSize * 2, headSize * 1.2);
                            offCtx.moveTo(p2.x, p2.y);
                            offCtx.lineTo(p1.x, p1.y);
                            offCtx.lineTo(p3.x, p3.y);
                            offCtx.stroke();
                        } else if (type === 'circle') {
                            const center = rotate(-headSize, 0);
                            offCtx.arc(center.x, center.y, headSize, 0, Math.PI * 2);
                            offCtx.fill();
                        }
                    };

                    if (arrowEl.endArrowhead && arrowEl.endArrowhead !== 'none') drawArrowHead(ex, ey, angleEnd, arrowEl.endArrowhead);
                    if (arrowEl.startArrowhead && arrowEl.startArrowhead !== 'none') drawArrowHead(sx, sy, angleStart, arrowEl.startArrowhead);

                } else if (el.type === 'text') {
                    const textEl = el as TextElement;
                    offCtx.save();
                    // ✅ 修改：座標系配合現有其他元素的 translate 方式
                    if (textEl.rotation) offCtx.rotate((textEl.rotation * Math.PI) / 180);
                    drawTextOnCanvas(offCtx, textEl, -textEl.width / 2, -textEl.height / 2);
                    offCtx.restore();

                } else if (el.type === 'note') {
                    const noteEl = el as any;
                    if (noteEl.color !== 'bg-transparent') {
                        const bgColor = noteEl.color?.match(/bg-\[(.*?)\]/)?.[1] || '#FFFDE7';
                        offCtx.fillStyle = bgColor;
                        offCtx.beginPath();
                        offCtx.roundRect(-el.width / 2, -el.height / 2, el.width, el.height, 8);
                        offCtx.fill();
                    }
                    offCtx.fillStyle = '#1D1D1F';
                    offCtx.font = '14px -apple-system, sans-serif';
                    offCtx.textBaseline = 'top';
                    offCtx.textAlign = 'left';
                    const noteLines = noteEl.content?.split('\n') || [];
                    noteLines.forEach((line: string, i: number) => {
                        offCtx.fillText(line, -el.width / 2 + 12, -el.height / 2 + 12 + i * 20);
                    });
                }

                // 將離屏畫布繪製回主畫布，並應用透明度與混合模式
                ctx.globalAlpha = (el as any).opacity ?? 1;
                const blendMode = (el as any).blendMode === 'normal' ? 'source-over' : ((el as any).blendMode ?? 'source-over');
                ctx.globalCompositeOperation = blendMode as GlobalCompositeOperation;
                
                ctx.drawImage(offCanvas, -offCanvas.width / 2, -offCanvas.height / 2);

            } catch(e) {
                console.error('Failed to draw element:', el.id, el.type, e);
            }
            ctx.restore();
        }
    
        const trimmed = trimCanvas(canvas);
        if (!trimmed) {
            showToast("合併結果為空");
            return;
        }
    
        const worldLeft = minX + trimmed.x;
        const worldTop = minY + trimmed.y;
        const centerX = worldLeft + trimmed.width / 2;
        const centerY = worldTop + trimmed.height / 2;
    
        const mergedElement: ImageElement = {
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            type: 'image',
            src: trimmed.dataUrl,
            position: { x: centerX, y: centerY },
            width: trimmed.width,
            height: trimmed.height,
            rotation: 0,
            zIndex: targetElements[targetElements.length - 1].zIndex, // Inherit top zIndex
            isVisible: true,
            isLocked: false,
            name: 'Merged Layer',
            groupId: null,
            opacity: 1,
            blendMode: 'normal'
        };
    
        setElements(prev => {
            // Remove originals, but NEVER remove artboards
            const idsToRemove = new Set(targetElements.map(e => e.id));
            const filtered = prev.filter(el => el.type === 'artboard' || !idsToRemove.has(el.id));
            return [...filtered, mergedElement];
        });
        setSelectedElementIds([mergedElement.id]);
        showToast(`成功合併 ${targetElements.length} 個圖層 (已自動裁切空白) ✨`);
    
    }, [selectedElementIds, elements, setElements, showToast]);

    // --- Rasterize Handlers ---
    const handleRasterizeText = useCallback(async (id: string) => {
        const element = elements.find(el => el.id === id) as TextElement;
        if (!element || element.type !== 'text') return;
    
        try {
            // Use scaling factor to prevent blurriness on Retina displays
            // IMPORTANT: This creates the canvas but drawing logic is in App.tsx due to complexity.
            // The hook just notifies App to do it via callback in App.tsx "handleRasterizeTextOverride"
            // Wait, useCanvas doesn't know about App.tsx's drawTextOnCanvas.
            // In App.tsx we override this function.
            // So this default implementation might be unused or basic.
            // We'll leave it as a placeholder or basic implementation, 
            // but the real work is done in App.tsx override.
            // However, to be safe, we return the function signature so App can override it.
        } catch (e) {
            console.error("Rasterize failed", e);
            showToast("文字轉換圖片失敗");
        }
    }, [elements, setElements, showToast]);

    const handleRasterizeShape = useCallback(async (id: string) => {
        const element = elements.find(el => el.id === id) as ShapeElement;
        if (!element || element.type !== 'shape') return;
    
        try {
            const newSrc = await createShapeDataUrl(element);
            // 尺寸與原 SVG 一致，不加額外 padding（stroke 已在 createShapeDataUrl 中處理）
            const newImage: ImageElement = {
                id: element.id,
                type: 'image',
                src: newSrc,
                position: element.position,
                width: element.width,
                height: element.height,
                rotation: element.rotation,
                zIndex: element.zIndex,
                isVisible: element.isVisible,
                isLocked: element.isLocked,
                name: `${element.name} (Rasterized)`,
                groupId: element.groupId
            };

            setElements(prev => prev.map(el => el.id === id ? newImage : el));
            showToast("形狀已轉換為圖片圖層！");
        } catch (e) {
            console.error("Rasterize failed", e);
            showToast("形狀轉換圖片失敗");
        }
    }, [elements, setElements, showToast]);

    const handleRasterizeArrow = useCallback(async (id: string) => {
        const element = elements.find(el => el.id === id) as ArrowElement;
        if (!element || element.type !== 'arrow') return;

        try {
            const newSrc = await createArrowDataUrl(element);
            const headSize = (element.strokeWidth || 4) * 3;
            const padding = headSize + 20; 
            
            const newImage: ImageElement = {
                id: element.id,
                type: 'image',
                src: newSrc,
                position: element.position,
                width: element.width + padding * 2,
                height: element.height + padding * 2,
                rotation: element.rotation,
                zIndex: element.zIndex,
                isVisible: element.isVisible,
                isLocked: element.isLocked,
                name: `${element.name} (Rasterized)`,
                groupId: element.groupId
            };

            setElements(prev => prev.map(el => el.id === id ? newImage : el));
            showToast("箭頭已轉換為圖片圖層！");
        } catch (e) {
            console.error("Rasterize arrow failed", e);
            showToast("箭頭轉換圖片失敗");
        }
    }, [elements, setElements, showToast]);

    // --- Crop Handlers ---
    const handleStartCrop = useCallback(() => {
        if (selectedElementIds.length === 1) {
            const el = elements.find(e => e.id === selectedElementIds[0]);
            if (el && el.type === 'image') {
                setCroppingElementId(el.id);
            }
        }
    }, [selectedElementIds, elements]);
  
    const handleCancelCrop = useCallback(() => {
        setCroppingElementId(null);
    }, []);
  
    const handleApplyCrop = useCallback(async (cropRect: { x: number, y: number, width: number, height: number }) => {
        if (!croppingElementId) return;
        const element = elements.find(el => el.id === croppingElementId) as ImageElement | undefined;
        if (!element) return;
  
        try {
            const img = await loadImage(element.src);
            const canvas = document.createElement('canvas');
            const scaleX = img.naturalWidth / element.width;
            const scaleY = img.naturalHeight / element.height;
  
            const sx = Math.round(cropRect.x * scaleX);
            const sy = Math.round(cropRect.y * scaleY);
            const sWidth = Math.round(cropRect.width * scaleX);
            const sHeight = Math.round(cropRect.height * scaleY);

            canvas.width = sWidth;
            canvas.height = sHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Canvas context failed");

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
            const newSrc = canvas.toDataURL('image/png');
  
            const oldTopLeftX = element.position.x - element.width / 2;
            const oldTopLeftY = element.position.y - element.height / 2;
            
            const centerXLocal = cropRect.x + cropRect.width / 2;
            const centerYLocal = cropRect.y + cropRect.height / 2;
  
            const dx = centerXLocal - (element.width / 2);
            const dy = centerYLocal - (element.height / 2);
  
            const rad = (element.rotation * Math.PI) / 180;
            const rotatedDx = dx * Math.cos(rad) - dy * Math.sin(rad);
            const rotatedDy = dx * Math.sin(rad) + dy * Math.cos(rad);
  
            const newX = element.position.x + rotatedDx;
            const newY = element.position.y + rotatedDy;
  
            setElements(prev => prev.map(el => el.id === croppingElementId ? {
                ...el,
                src: newSrc,
                width: cropRect.width,
                height: cropRect.height,
                position: { x: newX, y: newY }
            } : el));
            
            setCroppingElementId(null);
            showToast("圖片裁剪完成！✂️");
  
        } catch (e) {
            console.error("Crop failed", e);
            showToast("圖片裁剪失敗");
        }
  
    }, [croppingElementId, elements, setElements, showToast]);

    // --- Other Canvas Operations ---
    const handleToggleVisibility = useCallback((id: string) => {
        setElements(prev => prev.map(el => el.id === id ? { ...el, isVisible: !el.isVisible } : el), { addToHistory: false });
    }, [setElements]);

    const handleToggleLock = useCallback((id: string) => {
        setElements(prev => prev.map(el => el.id === id ? { ...el, isLocked: !el.isLocked } : el), { addToHistory: false });
    }, [setElements]);

    const handleRename = useCallback((id: string, newName: string) => {
        setElements(prev => prev.map(el => el.id === id ? { ...el, name: newName } : el));
    }, [setElements]);

    const handleLayerDragDrop = useCallback((sourceId: string, targetId: string) => {
        if (sourceId === targetId) return;

        setElements(prev => {
            const sourceIndex = prev.findIndex(el => el.id === sourceId);
            const targetIndex = prev.findIndex(el => el.id === targetId);
            
            if (sourceIndex === -1 || targetIndex === -1) return prev;

            const newElements = [...prev];
            const [movedElement] = newElements.splice(sourceIndex, 1);
            newElements.splice(targetIndex, 0, movedElement);
            
            return newElements.map((el, index) => ({ ...el, zIndex: index + 1 }));
        });
    }, [setElements]);

    const handleDeleteLayer = useCallback((id: string) => {
        setElements(prev => prev.filter(el => el.id !== id || el.isLocked));
        setSelectedElementIds(prev => prev.filter(selId => selId !== id));
    }, [setElements]);

    const handleGroup = useCallback(() => {
        if (selectedElementIds.length < 2) return;
        const groupId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        setElements(prev => prev.map(el => selectedElementIds.includes(el.id) ? { ...el, groupId } : el));
        showToast(`已建立群組`);
    }, [selectedElementIds, setElements, showToast]);

    const handleUngroup = useCallback(() => {
        setElements(prev => prev.map(el => selectedElementIds.includes(el.id) ? { ...el, groupId: null } : el));
    }, [selectedElementIds, setElements]);

    const copySelection = useCallback(() => {
        if (selectedElementIds.length === 0) return;
        const selected = elements.filter(el => selectedElementIds.includes(el.id));
        setClipboardElements(JSON.parse(JSON.stringify(selected)));
        showToast(`已複製 ${selected.length} 個物件到剪貼簿`);
    }, [elements, selectedElementIds, showToast]);

    const pasteSelection = useCallback(() => {
        if (clipboardElements.length === 0) return;
        const offset = 30;
        const newElements: CanvasElement[] = [];
        const newIds: string[] = [];
        
        // Sort by original zIndex to maintain layering order
        const sortedClipboard = [...clipboardElements].sort((a, b) => a.zIndex - b.zIndex);
        
        sortedClipboard.forEach(el => {
            const newId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            const newEl = {
                ...el,
                id: newId,
                position: { x: el.position.x + offset, y: el.position.y + offset },
                zIndex: zIndexCounter.current++,
                name: `${el.name} (Copy)`,
                groupId: null
            };
            if (newEl.type === 'arrow') {
                (newEl as ArrowElement).start = { x: (el as ArrowElement).start.x + offset, y: (el as ArrowElement).start.y + offset };
                (newEl as ArrowElement).end = { x: (el as ArrowElement).end.x + offset, y: (el as ArrowElement).end.y + offset };
            }
            newElements.push(newEl as CanvasElement);
            newIds.push(newId);
        });

        if (newElements.length > 0) {
            setElements(prev => {
                // To maintain the relative order and keep artboards at the bottom,
                // we should insert pasted elements right after their originals if possible,
                // or at least ensure artboards stay below objects.
                
                const finalElements: CanvasElement[] = [];
                const sortedPrev = [...prev].sort((a, b) => a.zIndex - b.zIndex);
                
                // Separate artboards and objects from the new elements
                const newArtboards = newElements.filter(el => el.type === 'artboard');
                const newObjects = newElements.filter(el => el.type !== 'artboard');
                
                // Separate artboards and objects from existing elements
                const existingArtboards = sortedPrev.filter(el => el.type === 'artboard');
                const existingObjects = sortedPrev.filter(el => el.type !== 'artboard');
                
                // Combine them: Existing Artboards -> New Artboards -> Existing Objects -> New Objects
                finalElements.push(...existingArtboards);
                finalElements.push(...newArtboards);
                finalElements.push(...existingObjects);
                finalElements.push(...newObjects);
                
                // Re-assign zIndexes to ensure they are sequential and correct
                const reindexedElements = finalElements.map((el, index) => ({
                    ...el,
                    zIndex: index + 1
                }));
                
                // Update the global zIndex counter
                zIndexCounter.current = reindexedElements.length + 1;
                
                return reindexedElements;
            });
            setSelectedElementIds(newIds);
            showToast(`已貼上 ${newElements.length} 個物件`);
            setClipboardElements(newElements);
        }
    }, [clipboardElements, setElements, showToast]);
    
    const duplicateSelection = useCallback(() => {
        if (selectedElementIds.length === 0) return;
        const offset = 30;
        const newElements: CanvasElement[] = [];
        const newIds: string[] = [];
        const groupMapping: { [oldGroupId: string]: string } = {};

        // Sort by original zIndex to maintain layering order
        const sortedSelectedElements = elements
            .filter(el => selectedElementIds.includes(el.id))
            .sort((a, b) => a.zIndex - b.zIndex);

        sortedSelectedElements.forEach(el => {
            const newId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            let newGroupId = null;
            if (el.groupId) {
                if (!groupMapping[el.groupId]) {
                    groupMapping[el.groupId] = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                }
                newGroupId = groupMapping[el.groupId];
            }

            const newEl = {
                ...el,
                id: newId,
                position: { x: el.position.x + offset, y: el.position.y + offset },
                zIndex: zIndexCounter.current++,
                name: `${el.name} (Copy)`,
                groupId: newGroupId
            } as CanvasElement;

            switch (newEl.type) {
                case 'arrow':
                    (newEl as ArrowElement).start = { x: (el as ArrowElement).start.x + offset, y: (el as ArrowElement).start.y + offset };
                    (newEl as ArrowElement).end = { x: (el as ArrowElement).end.x + offset, y: (el as ArrowElement).end.y + offset };
                    break;
                case 'artboard':
                    // Inherit width, height, rotation, backgroundColor via spread
                    break;
            }
            
            newElements.push(newEl);
            newIds.push(newId);
        });
        if (newElements.length > 0) {
            setElements(prev => {
                const finalElements: CanvasElement[] = [];
                const sortedPrev = [...prev].sort((a, b) => a.zIndex - b.zIndex);
                
                // Separate artboards and objects from the new elements
                const newArtboards = newElements.filter(el => el.type === 'artboard');
                const newObjects = newElements.filter(el => el.type !== 'artboard');
                
                // Separate artboards and objects from existing elements
                const existingArtboards = sortedPrev.filter(el => el.type === 'artboard');
                const existingObjects = sortedPrev.filter(el => el.type !== 'artboard');
                
                // Combine them: Existing Artboards -> New Artboards -> Existing Objects -> New Objects
                finalElements.push(...existingArtboards);
                finalElements.push(...newArtboards);
                finalElements.push(...existingObjects);
                finalElements.push(...newObjects);
                
                // Re-assign zIndexes to ensure they are sequential and correct
                const reindexedElements = finalElements.map((el, index) => ({
                    ...el,
                    zIndex: index + 1
                }));
                
                // Update the global zIndex counter
                zIndexCounter.current = reindexedElements.length + 1;
                
                return reindexedElements;
            });
            setSelectedElementIds(newIds);
            showToast(`已複製 ${newElements.length} 個物件`);
        }
    }, [elements, selectedElementIds, setElements, showToast]);

    const duplicateInPlace = useCallback((activeId?: string, isShift?: boolean) => {
        let currentSelection = selectedElementIdsRef.current;
        
        // Synchronously calculate new selection if activeId is provided to ensure correct duplication set
        if (activeId) {
            const element = elements.find(el => el.id === activeId);
            let idsToSelect = [activeId];
            if (element && element.groupId) {
                const groupMembers = elements.filter(el => el.groupId === element.groupId && el.isVisible).map(el => el.id);
                if (groupMembers.length > 0) idsToSelect = groupMembers;
            }

            if (isShift) {
                const hasAny = idsToSelect.some(i => currentSelection.includes(i));
                if (hasAny) currentSelection = currentSelection.filter(pid => !idsToSelect.includes(pid));
                else currentSelection = [...currentSelection, ...idsToSelect];
            } else {
                const isAlreadySelected = idsToSelect.every(i => currentSelection.includes(i));
                if (!isAlreadySelected) {
                    currentSelection = idsToSelect;
                }
            }
        }

        if (currentSelection.length === 0) return {};
        
        // 1. Expansion Logic (Smart Packaging)
        const toDuplicateIdsSet = new Set<string>(currentSelection);
        
        // Helper: Check if point is inside artboard
        const isElementInArtboard = (el: CanvasElement, ab: ArtboardElement) => {
            if (el.type === 'artboard') return false;
            const ax = ab.position.x - ab.width / 2;
            const ay = ab.position.y - ab.height / 2;
            return (
                el.position.x >= ax && el.position.x <= ax + ab.width &&
                el.position.y >= ay && el.position.y <= ay + ab.height
            );
        };

        // Expand by Group
        currentSelection.forEach(id => {
            const el = elements.find(e => e.id === id);
            if (el && el.groupId) {
                elements.filter(e => e.groupId === el.groupId).forEach(e => toDuplicateIdsSet.add(e.id));
            }
        });

        // Expand by Artboard
        currentSelection.forEach(id => {
            const el = elements.find(e => e.id === id);
            if (el && el.type === 'artboard') {
                elements.forEach(child => {
                    if (isElementInArtboard(child, el as ArtboardElement)) {
                        toDuplicateIdsSet.add(child.id);
                        // If the child is in a group, bring the whole group
                        if (child.groupId) {
                            elements.filter(e => e.groupId === child.groupId).forEach(e => toDuplicateIdsSet.add(e.id));
                        }
                    }
                });
            }
        });

        // Filter out locked elements
        const toDuplicateIds = Array.from(toDuplicateIdsSet).filter(id => {
            const el = elements.find(e => e.id === id);
            return el && !el.isLocked;
        });

        if (toDuplicateIds.length === 0) return {};
        
        const newElements: CanvasElement[] = [];
        const newIds: string[] = [];
        const mapping: { [oldId: string]: CanvasElement } = {};
        const newGroupIdsMap = new Map<string, string>();
        const offset = 0; // Ensure no offset for in-place duplication

        // 3. Sort by original zIndex to maintain layering order
        const sortedSelectedElements = elements
            .filter(el => toDuplicateIds.includes(el.id))
            .sort((a, b) => a.zIndex - b.zIndex);

        sortedSelectedElements.forEach(el => {
            const newId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            
            // 2. Re-grouping Logic
            let newGroupId = null;
            if (el.groupId) {
                if (!newGroupIdsMap.has(el.groupId)) {
                    newGroupIdsMap.set(el.groupId, `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
                }
                newGroupId = newGroupIdsMap.get(el.groupId)!;
            }

            const newEl = {
                ...el,
                id: newId,
                position: { x: el.position.x + offset, y: el.position.y + offset },
                zIndex: zIndexCounter.current++,
                name: `${el.name} (Copy)`,
                groupId: newGroupId,
                isLocked: el.isLocked // Preserve original lock status, do not force lock
            } as CanvasElement;

            if (newEl.type === 'arrow') {
                (newEl as ArrowElement).start = { x: (el as ArrowElement).start.x + offset, y: (el as ArrowElement).start.y + offset };
                (newEl as ArrowElement).end = { x: (el as ArrowElement).end.x + offset, y: (el as ArrowElement).end.y + offset };
            }
            
            newElements.push(newEl);
            newIds.push(newId);
            mapping[el.id] = newEl;
        });

        if (newElements.length > 0) {
            setElements(prev => {
                // To maintain the relative order, we need to insert the new elements right after their originals
                // but since we are duplicating multiple elements, it's easier to just append them and let zIndex handle the sorting
                // Wait, if we just append them and their zIndex is higher, they will be on top of EVERYTHING.
                // If we want them to be just above the original, we need to adjust zIndexes.
                // For now, the user requested: "工作區域照理說應該都在最下面" (Artboards should be at the bottom).
                // If we duplicate an artboard, its new zIndex will be higher than existing objects if we use zIndexCounter.current++.
                // Let's fix this by inserting the duplicated elements immediately after the original elements in the zIndex order.
                
                let nextElements = [...prev];
                
                // For each new element, we want to place it right above its original element.
                // This means we need to shift the zIndex of all elements above it.
                // A simpler approach is to recalculate all zIndexes after inserting them in the correct order.
                
                // Let's build a new array of elements.
                const finalElements: CanvasElement[] = [];
                
                // Sort original elements by zIndex
                const sortedPrev = [...prev].sort((a, b) => a.zIndex - b.zIndex);
                
                sortedPrev.forEach(existingEl => {
                    finalElements.push(existingEl);
                    // If this existing element was duplicated, insert its duplicate right after it
                    const duplicate = newElements.find(newEl => mapping[existingEl.id]?.id === newEl.id);
                    if (duplicate) {
                        finalElements.push(duplicate);
                    }
                });
                
                // Re-assign zIndexes to ensure they are sequential and correct
                const reindexedElements = finalElements.map((el, index) => ({
                    ...el,
                    zIndex: index + 1
                }));
                
                // Update the global zIndex counter
                zIndexCounter.current = reindexedElements.length + 1;
                
                return reindexedElements;
            });
            setSelectedElementIds(newIds);
            // CRITICAL: Update ref immediately to prevent drag linkage errors during rapid mousemove
            selectedElementIdsRef.current = newIds;
        }
        return mapping;
    }, [elements, setElements]);

    const bringToFront = useCallback(() => {
        if (selectedElementIds.length === 0) return;
        const selectedSet = new Set(selectedElementIds);
        const targetElements = elements.filter(el => selectedSet.has(el.id));
        const isArtboard = targetElements.every(el => el.type === 'artboard');
        
        if (isArtboard) {
            // artboard 移至最前只能超過其他 artboard，不能超過一般元素
            const artboards = elements.filter(e => e.type === 'artboard');
            const maxArtboardZ = Math.max(...artboards.map(e => e.zIndex), 0);
            setElements(prev => prev.map(el => selectedSet.has(el.id) ? { ...el, zIndex: maxArtboardZ + 1 } : el));
        } else {
            // 一般元素移至最前維持現有邏輯
            const maxZ = Math.max(...elements.map(el => el.zIndex), 0);
            setElements(prev => prev.map(el => selectedSet.has(el.id) ? { ...el, zIndex: maxZ + 1 } : el));
            zIndexCounter.current = maxZ + 2;
        }
    }, [selectedElementIds, elements, setElements]);
    
    const bringForward = useCallback(() => {
        if (selectedElementIds.length === 0) return;
        const selectedSet = new Set(selectedElementIds);
        const currentMaxZ = Math.max(...elements.filter(el => selectedSet.has(el.id)).map(el => el.zIndex));
        const above = elements
            .filter(el => !selectedSet.has(el.id) && el.zIndex > currentMaxZ)
            .sort((a, b) => a.zIndex - b.zIndex);
        if (above.length === 0) return; // already at top
        const swapZ = above[0].zIndex;
        setElements(prev => prev.map(el => {
            if (selectedSet.has(el.id)) return { ...el, zIndex: swapZ + 1 };
            if (el.zIndex === swapZ) return { ...el, zIndex: currentMaxZ };
            return el;
        }));
    }, [selectedElementIds, elements, setElements]);

    const sendBackward = useCallback(() => {
        if (selectedElementIds.length === 0) return;
        const selectedSet = new Set(selectedElementIds);
        const currentMinZ = Math.min(...elements.filter(el => selectedSet.has(el.id)).map(el => el.zIndex));
        const below = elements
            .filter(el => !selectedSet.has(el.id) && el.zIndex < currentMinZ)
            .sort((a, b) => b.zIndex - a.zIndex);
        if (below.length === 0) return; // already at bottom
        const swapZ = below[0].zIndex;
        setElements(prev => prev.map(el => {
            if (selectedSet.has(el.id)) return { ...el, zIndex: swapZ - 1 };
            if (el.zIndex === swapZ) return { ...el, zIndex: currentMinZ };
            return el;
        }));
    }, [selectedElementIds, elements, setElements]);

    const sendToBack = useCallback(() => {
        if (selectedElementIds.length === 0) return;
        const selectedSet = new Set(selectedElementIds);
        const targetId = selectedElementIds[0]; // 假設單選或多選處理邏輯一致

        // ✅ 修改：確保 artboard 永遠在所有非 artboard 元素的最底層
        const artboardMaxZ = Math.max(
            ...elements.filter(e => e.type === 'artboard').map(e => e.zIndex),
            -1
        );
        const nonArtboardMinZ = Math.min(
            ...elements.filter(e => e.type !== 'artboard' && !selectedSet.has(e.id)).map(e => e.zIndex),
            artboardMaxZ + 2
        );
        
        const newZIndex = Math.max(artboardMaxZ + 1, nonArtboardMinZ - 1);
        
        setElements(prev => prev.map(el => selectedSet.has(el.id) ? { ...el, zIndex: newZIndex } : el));
    }, [selectedElementIds, elements, setElements]);

    // --- Export Logic ---
    const handleExportCanvas = useCallback(() => {
        const dataStr = JSON.stringify(elements, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.download = 'YOHAKU-AI-Flux-Canvas-export.json';
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [elements]);

    // --- Import Logic ---
    const handleImportCanvas = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = e.target?.result;
                if (typeof result !== 'string') throw new Error("File could not be read as text.");
                const importedElements = JSON.parse(result) as CanvasElement[];
                if (!Array.isArray(importedElements) || (importedElements.length > 0 && !importedElements[0].id)) throw new Error("Invalid file format.");
                
                // Normalize imported elements
                const normalizedElements = importedElements.map(el => ({
                    ...el,
                    isVisible: el.isVisible ?? true,
                    isLocked: el.isLocked ?? false,
                    name: el.name ?? `${el.type} (Imported)`,
                    groupId: el.groupId ?? null
                }));
                
                setElements(normalizedElements);
                const maxZ = Math.max(0, ...normalizedElements.map(el => el.zIndex || 0));
                zIndexCounter.current = maxZ + 1;
                
                showToast('畫布匯入成功！');
            } catch (error) {
                console.error("Error importing canvas:", error);
                showToast("匯入畫布失敗。檔案可能已損壞或格式錯誤。");
            }
        };
        reader.onerror = () => {
            showToast("讀取檔案時發生錯誤。");
        };
        reader.readAsText(file);
        if (event.target) event.target.value = "";
    }, [setElements, showToast]);

    return {
        elements,
        setElements,
        selectedElementIds,
        setSelectedElementIds,
        undo,
        redo,
        canUndo,
        canRedo,
        canvasApiRef,
        zIndexCounter,
        croppingElementId,
        setCroppingElementId,
        activeShapeTool,
        setActiveShapeTool,
        creatingShapeId,
        setCreatingShapeId,
        shapeStartPointRef,
        getCenterOfViewport,
        addNote,
        addText,
        addArrow,
        addDrawing,
        addImagesToCanvas,
        addFrame,
        addElement,
        addArtboard,
        handleSelectElement,
        handleMarqueeSelect,
        updateElements,
        handleMergeLayers,
        handleStartCrop,
        handleCancelCrop,
        handleApplyCrop,
        handleToggleVisibility,
        handleToggleLock,
        handleRename,
        handleLayerDragDrop,
        handleDeleteLayer,
        handleGroup,
        handleUngroup,
        copySelection,
        pasteSelection,
        duplicateSelection,
        duplicateInPlace,
        bringToFront,
        bringForward,
        sendBackward,
        sendToBack,
        handleRasterizeText,
        handleRasterizeShape,
        handleRasterizeArrow,
        handleExportCanvas,
        handleImportCanvas,
        storageStatus,
        clearStorage,
    };
};
