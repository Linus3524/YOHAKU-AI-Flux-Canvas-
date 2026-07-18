import type { CanvasElement } from '../types';

export type LayerArrangeCommand = 'front' | 'forward' | 'backward' | 'back';

const stableSortByZ = (elements: CanvasElement[]): CanvasElement[] =>
    elements
        .map((element, index) => ({ element, index }))
        .sort((a, b) => a.element.zIndex - b.element.zIndex || a.index - b.index)
        .map(item => item.element);

/**
 * 產生唯一且連續的堆疊序列：
 * - 畫板永遠位於一般物件下方，使用負 zIndex。
 * - 一般物件從 1 起算。
 * - 相同 zIndex 以原陣列順序穩定解決，之後不再留下撞號。
 */
export function normalizeLayerOrder(elements: CanvasElement[]): CanvasElement[] {
    const artboards = stableSortByZ(elements.filter(element => element.type === 'artboard'));
    const objects = stableSortByZ(elements.filter(element => element.type !== 'artboard'));
    return reindexOrderedCategories(artboards, objects);
}

/** 依呼叫端提供的「後 → 前」陣列順序重新編號，不再依舊 zIndex 排序。 */
export function reindexLayerOrder(elementsBackToFront: CanvasElement[]): CanvasElement[] {
    return reindexOrderedCategories(
        elementsBackToFront.filter(element => element.type === 'artboard'),
        elementsBackToFront.filter(element => element.type !== 'artboard'),
    );
}

const reindexOrderedCategories = (
    artboardsBackToFront: CanvasElement[],
    objectsBackToFront: CanvasElement[],
): CanvasElement[] => {
    const normalizedArtboards = artboardsBackToFront.map((element, index) => ({
        ...element,
        zIndex: index - artboardsBackToFront.length,
    }));
    const normalizedObjects = objectsBackToFront.map((element, index) => ({
        ...element,
        zIndex: index + 1,
    }));
    return [...normalizedArtboards, ...normalizedObjects];
};

const reorderCategoryByPanelDrop = (
    category: CanvasElement[],
    sourceId: string,
    targetId: string,
): CanvasElement[] => {
    // 圖層面板由上到下顯示「前 → 後」，所以用降冪序列處理拖放。
    const panelOrder = stableSortByZ(category).reverse();
    const sourceIndex = panelOrder.findIndex(element => element.id === sourceId);
    if (sourceIndex < 0 || !panelOrder.some(element => element.id === targetId)) return category;
    const [moved] = panelOrder.splice(sourceIndex, 1);
    const targetIndex = panelOrder.findIndex(element => element.id === targetId);
    panelOrder.splice(targetIndex, 0, moved);
    return panelOrder.reverse();
};

/** 圖層面板單物件拖排；只在同一類別（畫板／一般物件）內移動。 */
export function reorderLayerByPanelDrop(
    elements: CanvasElement[],
    sourceId: string,
    targetId: string,
): CanvasElement[] {
    const source = elements.find(element => element.id === sourceId);
    const target = elements.find(element => element.id === targetId);
    if (!source || !target || (source.type === 'artboard') !== (target.type === 'artboard')) {
        return elements;
    }
    const isArtboard = source.type === 'artboard';
    const category = elements.filter(element => (element.type === 'artboard') === isArtboard);
    const reordered = reorderCategoryByPanelDrop(category, sourceId, targetId);
    const other = stableSortByZ(elements.filter(element => (element.type === 'artboard') !== isArtboard));
    return isArtboard
        ? reindexOrderedCategories(reordered, other)
        : reindexOrderedCategories(other, reordered);
}

/** 圖層面板群組拖排；群組成員視為連續區塊並保留內部順序。 */
export function reorderGroupByPanelDrop(
    elements: CanvasElement[],
    groupId: string,
    targetId: string,
): CanvasElement[] {
    const target = elements.find(element => element.id === targetId);
    if (!target || target.type === 'artboard') return elements;
    const objectPanelOrder = stableSortByZ(elements.filter(element => element.type !== 'artboard')).reverse();
    const selected = objectPanelOrder.filter(element => element.groupId === groupId);
    if (selected.length === 0 || selected.some(element => element.id === targetId)) return elements;
    const remainder = objectPanelOrder.filter(element => element.groupId !== groupId);
    const targetIndex = remainder.findIndex(element => element.id === targetId);
    if (targetIndex < 0) return elements;
    remainder.splice(targetIndex, 0, ...selected);
    const artboards = stableSortByZ(elements.filter(element => element.type === 'artboard'));
    return reindexOrderedCategories(artboards, remainder.reverse());
}

const arrangeCategory = (
    category: CanvasElement[],
    selectedIds: Set<string>,
    command: LayerArrangeCommand,
): CanvasElement[] => {
    const ordered = stableSortByZ(category); // 後 → 前
    const selected = ordered.filter(element => selectedIds.has(element.id));
    if (selected.length === 0) return ordered;
    const remainder = ordered.filter(element => !selectedIds.has(element.id));

    if (command === 'front') return [...remainder, ...selected];
    if (command === 'back') return [...selected, ...remainder];

    const selectedPositions = ordered
        .map((element, index) => selectedIds.has(element.id) ? index : -1)
        .filter(index => index >= 0);

    if (command === 'forward') {
        const highestSelectedIndex = Math.max(...selectedPositions);
        const nextAbove = ordered.findIndex(
            (element, index) => index > highestSelectedIndex && !selectedIds.has(element.id),
        );
        if (nextAbove < 0) return ordered;
        const anchorId = ordered[nextAbove].id;
        const insertAfter = remainder.findIndex(element => element.id === anchorId) + 1;
        return [...remainder.slice(0, insertAfter), ...selected, ...remainder.slice(insertAfter)];
    }

    const lowestSelectedIndex = Math.min(...selectedPositions);
    let nextBelow = -1;
    for (let index = lowestSelectedIndex - 1; index >= 0; index -= 1) {
        if (!selectedIds.has(ordered[index].id)) {
            nextBelow = index;
            break;
        }
    }
    if (nextBelow < 0) return ordered;
    const anchorId = ordered[nextBelow].id;
    const insertBefore = remainder.findIndex(element => element.id === anchorId);
    return [...remainder.slice(0, insertBefore), ...selected, ...remainder.slice(insertBefore)];
};

/**
 * 多選排列視為一個區塊，保留選取物件內部順序。
 * 畫板與一般物件各自在自己的堆疊區操作，不會跨越邊界。
 */
export function arrangeLayerSelection(
    elements: CanvasElement[],
    ids: Iterable<string>,
    command: LayerArrangeCommand,
): CanvasElement[] {
    const selectedIds = new Set(ids);
    const artboards = arrangeCategory(
        elements.filter(element => element.type === 'artboard'),
        selectedIds,
        command,
    );
    const objects = arrangeCategory(
        elements.filter(element => element.type !== 'artboard'),
        selectedIds,
        command,
    );
    return reindexOrderedCategories(artboards, objects);
}

export function nextTopLayerIndex(elements: CanvasElement[]): number {
    return Math.max(0, ...elements.filter(element => element.type !== 'artboard').map(element => element.zIndex)) + 1;
}
