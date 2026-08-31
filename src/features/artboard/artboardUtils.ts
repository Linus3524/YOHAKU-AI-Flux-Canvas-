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
