import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { CanvasElement, Point } from '../types';
import type { OutpaintingState } from '../types';
import { computeDragSnap, type SnapGuideline } from '../utils/snapping';
import { TransformableElement } from './TransformableElement';

interface ElementsLayerProps {
  sortedElements: CanvasElement[];
  elements: CanvasElement[];
  selectedElementIds: string[];
  selectedIdSet: Set<string>;
  qMinX: number; qMinY: number; qMaxX: number; qMaxY: number;
  groupActive: boolean;
  croppingElementId?: string | null;
  outpaintingState?: OutpaintingState | null;
  zoom: number;
  activeGuidelines: SnapGuideline[];
  snapToObjects: boolean;
  interactionMode: 'select' | 'hand';
  showImageSizes: boolean;
  screenToWorld: (p: Point) => Point;
  onSelectElement: (id: string, shiftKey: boolean) => void;
  onUpdateElement: (element: CanvasElement, dragDelta?: Point) => void;
  onUpdateMultipleElements?: (elements: CanvasElement[]) => void;
  onInteractionStart?: () => void;
  onInteractionEnd: () => void;
  onContextMenu: (e: React.MouseEvent, screenPoint: Point, id: string | null) => void;
  onEditDrawing: (elementId: string) => void;
  onOpenNodeWorkflow: (elementId: string) => void;
  onDuplicateInPlace?: (activeId: string, isShift: boolean) => { [oldId: string]: CanvasElement };
  onDragStart?: () => void;
  onDragEnd?: () => void;
  /** 手勢起迄各呼叫一次，父層用來隱藏拖曳中不跟動的 overlay */
  onDragActiveChange: (dragging: boolean) => void;
}

const ElementsLayerInner: React.FC<ElementsLayerProps> = ({
  sortedElements, elements, selectedElementIds, selectedIdSet,
  qMinX, qMinY, qMaxX, qMaxY,
  groupActive, croppingElementId, outpaintingState, zoom,
  activeGuidelines, snapToObjects, interactionMode, showImageSizes, screenToWorld,
  onSelectElement, onUpdateElement, onUpdateMultipleElements,
  onInteractionStart, onInteractionEnd, onContextMenu, onEditDrawing, onOpenNodeWorkflow,
  onDuplicateInPlace, onDragStart, onDragEnd, onDragActiveChange,
}) => {
  // 拖曳期間不進全域 state（App/InfiniteCanvas 皆不重渲染），改以 local override 呈現位置，
  // mouseup 才呼叫 onUpdateMultipleElements 一次 commit（配合 onInteractionStart
  // 的首幀標記 → 整段拖曳只留一筆歷史）。
  const [liveDrag, setLiveDrag] = useState<{ overrides: Map<string, CanvasElement>; guidelines: SnapGuideline[] } | null>(null);
  const liveDragRef = useRef<typeof liveDrag>(null);

  const handleLiveDrag = useCallback((updatedLeader: CanvasElement) => {
      const orig = elements.find(el => el.id === updatedLeader.id);
      if (!orig) return;
      const selectedSet = new Set(selectedElementIds);
      let leader = updatedLeader;
      let guidelines: SnapGuideline[] = [];
      if (snapToObjects) {
          const otherEls = elements.filter(el =>
              el.isVisible && el.id !== leader.id && !selectedSet.has(el.id)
          );
          const snapped = computeDragSnap(leader, otherEls, 5);
          if (leader.type === 'arrow') {
              const sdx = snapped.x - leader.position.x;
              const sdy = snapped.y - leader.position.y;
              leader = {
                  ...leader,
                  position: { x: snapped.x, y: snapped.y },
                  start: { x: (leader as any).start.x + sdx, y: (leader as any).start.y + sdy },
                  end:   { x: (leader as any).end.x + sdx,   y: (leader as any).end.y + sdy },
              } as CanvasElement;
          } else {
              leader = { ...leader, position: { x: snapped.x, y: snapped.y } };
          }
          guidelines = snapped.guidelines;
      }
      // followers 以「手勢起點狀態（elements prop，拖曳期間凍結）」加總位移
      const delta = { x: leader.position.x - orig.position.x, y: leader.position.y - orig.position.y };
      const overrides = new Map<string, CanvasElement>();
      overrides.set(leader.id, leader);
      const gid = leader.groupId;
      for (const el of elements) {
          if (el.id === leader.id) continue;
          const follows = ((gid && el.groupId === gid && el.isVisible) || selectedSet.has(el.id)) && !el.isLocked;
          if (!follows) continue;
          if (el.type === 'arrow') {
              overrides.set(el.id, {
                  ...el,
                  position: { x: el.position.x + delta.x, y: el.position.y + delta.y },
                  start: { x: el.start.x + delta.x, y: el.start.y + delta.y },
                  end:   { x: el.end.x + delta.x,   y: el.end.y + delta.y },
              });
          } else {
              overrides.set(el.id, { ...el, position: { x: el.position.x + delta.x, y: el.position.y + delta.y } });
          }
      }
      const next = { overrides, guidelines };
      liveDragRef.current = next;
      setLiveDrag(next);
  }, [elements, selectedElementIds, snapToObjects]);

  const handleDragStart = useCallback(() => {
      onDragActiveChange(true);
      onDragStart?.();
  }, [onDragActiveChange, onDragStart]);

  const handleElementDragEnd = useCallback(() => {
      const cur = liveDragRef.current;
      liveDragRef.current = null;
      setLiveDrag(null);
      onDragActiveChange(false);
      if (cur && cur.overrides.size > 0 && onUpdateMultipleElements) {
          // 無實際位移就不 commit（避免點一下就多一筆冗餘歷史）
          const finals: CanvasElement[] = [];
          let changed = false;
          cur.overrides.forEach(ov => {
              finals.push(ov);
              const orig = elements.find(el => el.id === ov.id);
              if (!orig || orig.position.x !== ov.position.x || orig.position.y !== ov.position.y) changed = true;
          });
          if (changed) onUpdateMultipleElements(finals);
      }
      onDragEnd?.();
  }, [elements, onUpdateMultipleElements, onDragEnd, onDragActiveChange]);

  // 視口虛擬化：只渲染「可視範圍 + 緩衝」內的元素
  const visibleElements = useMemo(() => {
      return sortedElements.filter(el => {
          // 永遠保留：artboard 底板、選取中、live 拖曳中、正在 outpaint/crop 的元素
          if (el.type === 'artboard') return true;
          if (selectedIdSet.has(el.id)) return true;
          if (liveDrag?.overrides.has(el.id)) return true;
          if (outpaintingState?.element.id === el.id) return true;
          if (croppingElementId === el.id) return true;
          const halfW = el.width / 2, halfH = el.height / 2;
          return el.position.x + halfW >= qMinX &&
                 el.position.x - halfW <= qMaxX &&
                 el.position.y + halfH >= qMinY &&
                 el.position.y - halfH <= qMaxY;
      });
  }, [sortedElements, qMinX, qMinY, qMaxX, qMaxY, selectedIdSet, outpaintingState, croppingElementId, liveDrag]);

  return (
    <>
      {visibleElements.map(el => (
        <TransformableElement
          key={el.id}
          element={liveDrag?.overrides.get(el.id) ?? el}
          isSelected={selectedIdSet.has(el.id) && croppingElementId !== el.id && !groupActive}
          isOutpainting={!!outpaintingState && outpaintingState.element.id === el.id}
          zoom={zoom}
          onSelect={onSelectElement}
          onUpdate={onUpdateElement}
          onLiveDrag={onUpdateMultipleElements ? handleLiveDrag : undefined}
          onInteractionStart={onInteractionStart}
          onInteractionEnd={onInteractionEnd}
          onContextMenu={onContextMenu}
          onEditDrawing={onEditDrawing}
          onOpenNodeWorkflow={onOpenNodeWorkflow}
          onDuplicateInPlace={onDuplicateInPlace}
          onDragStart={handleDragStart}
          onDragEnd={onUpdateMultipleElements ? handleElementDragEnd : onDragEnd}
          interactionMode={interactionMode}
          screenToWorld={screenToWorld}
          disableResizeHandles={false}
          showImageSizes={showImageSizes}
        />
      ))}

      {/* 對齊輔助線（含 live 拖曳中的吸附線） */}
      {[...activeGuidelines, ...(liveDrag?.guidelines ?? [])].map((gl, idx) => (
        gl.type === 'h' ? (
          <div
            key={`gl-h-${idx}`}
            className="absolute border-t border-dashed border-red-500/80 pointer-events-none"
            style={{ left: -100000, right: -100000, top: gl.y, height: 0, zIndex: 9999999 }}
          />
        ) : (
          <div
            key={`gl-v-${idx}`}
            className="absolute border-l border-dashed border-red-500/80 pointer-events-none"
            style={{ top: -100000, bottom: -100000, left: gl.x, width: 0, zIndex: 9999999 }}
          />
        )
      ))}
    </>
  );
};
export const ElementsLayer = React.memo(ElementsLayerInner);
