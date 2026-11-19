import type { CanvasElement, ArtboardElement } from '../../types';

// 判斷元素是否與工作區域有交集 (Bounding Box Intersection)
//
// 放在獨立模組（而非 exportArtboard）是為了讓畫布層可以引用而不必連帶載入 jsPDF。
export const isElementInArtboard = (el: CanvasElement, ab: ArtboardElement): boolean => {
    if (el.type === 'artboard') return false;

    const abLeft = ab.position.x - ab.width / 2;
    const abRight = ab.position.x + ab.width / 2;
    const abTop = ab.position.y - ab.height / 2;
    const abBottom = ab.position.y + ab.height / 2;

    const elLeft = el.position.x - el.width / 2;
    const elRight = el.position.x + el.width / 2;
    const elTop = el.position.y - el.height / 2;
    const elBottom = el.position.y + el.height / 2;

    return (
        elLeft < abRight &&
        elRight > abLeft &&
        elTop < abBottom &&
        elBottom > abTop
    );
};

/**
 * 複製用的選取展開：選取中的工作區域連同其範圍內的所有物件一起帶入。
 * 鎖定物件也包含在內（複本保持鎖定），與 Illustrator 複製工作區域一致；
 * 跨入範圍的群組整組帶入，避免群組被拆開。
 * Option 拖曳、Cmd+D、Cmd+C／V 共用，三者複製的內容才會一致。
 */
export const expandSelectionWithArtboardContents = (
    selectedIds: Iterable<string>,
    elements: readonly CanvasElement[],
): Set<string> => {
    const ids = new Set(selectedIds);
    const artboards = elements.filter(el => el.type === 'artboard' && ids.has(el.id)) as ArtboardElement[];
    for (const ab of artboards) {
        for (const el of elements) {
            if (!isElementInArtboard(el, ab)) continue;
            ids.add(el.id);
            if (el.groupId) {
                for (const member of elements) if (member.groupId === el.groupId) ids.add(member.id);
            }
        }
    }
    return ids;
};
