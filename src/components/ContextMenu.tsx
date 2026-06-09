
import React, { useRef, useEffect, useState } from 'react';
import type { Point, ElementType } from '../types';
import { COLORS } from '../utils/helpers';
import { Icon } from './Icon';

interface ContextMenuData {
    x: number;
    y: number;
    worldPoint: Point;
    elementId: string | null;
}

interface ContextMenuProps {
  menuData: ContextMenuData;
  onClose: () => void;
  actions: {
    addNote: (position: Point) => void;
    addText: (position: Point) => void;
    addArrow: (position: Point) => void;
    addDrawing: (position: Point) => void;
    editDrawing: (elementId: string) => void;
    startImageEdit: (elementId: string) => void;
    startOutpainting: (elementId: string) => void;
    addImage: (position: Point) => void;
    addFrame: (ratioLabel: string, ratioValue: number, position: Point) => void;
    deleteElement: () => void;
    bringToFront: () => void;
    bringForward: () => void;
    sendBackward: () => void;
    sendToBack: () => void;
    flipHorizontal: (elementId: string) => void;
    flipVertical: (elementId: string) => void;
    changeColor: (color: string) => void;
    downloadImage: (elementId: string) => void;
    downloadImages: (elementIds: string[]) => void;
    exportArtboard: (elementId: string) => void;
    copyStyle: (elementId: string) => void;
    pasteStyle: (elementIds: string[]) => void;
    exportCanvas: () => void;
    importCanvas: () => void;
    saveFile?: () => void;
    saveAsFile?: () => void;
    openFile?: () => void;
    isFileSystemSupported?: boolean;
    currentFileName?: string | null;
    // New Actions
    group: () => void;
    ungroup: () => void;
    toggleLock: (elementId: string) => void;
    toggleVisibility: (elementId: string) => void;
    unlockAll: () => void;
    showAll: () => void;
    rasterizeText: (elementId: string) => void;
    rasterizeShape: (elementId: string) => void;
    rasterizeArrow: (elementId: string) => void;
    mergeLayers: () => void; 
    extractPrompt: (elementId: string) => void;
    magicLayer: (elementId: string) => void;
    semanticEditor: (elementId: string) => void;
    ocrConvert: (elementId: string) => void;
    clearStorage: () => void;
  };
  canChangeColor: boolean;
  elementType: ElementType | null;
  hasCopiedStyle: boolean;
  // State props
  selectionCount: number;
  selectedElementIds: string[];
  isGrouped: boolean;
  isLocked: boolean;
  isVisible: boolean;
  hasLockedElements: boolean;
  hasHiddenElements: boolean;
}

const MenuIcons = {
  Add:          () => <Icon name="add" size={15} />,
  Note:         () => <Icon name="note_stack_add" size={15} />,
  Draw:         () => <Icon name="draw" size={15} />,
  Arrow:        () => <Icon name="trending_flat" size={15} />,
  Image:        () => <Icon name="image" size={15} />,
  Frame:        () => <Icon name="crop_free" size={15} />,
  Copy:         () => <Icon name="content_copy" size={15} />,
  CopyStyle:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="m22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16"/><path d="M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2"/><circle cx="13" cy="7" r="1" fill="currentColor"/><rect x="8" y="2" width="14" height="14" rx="2"/></svg>,
  Magic:        () => <Icon name="auto_awesome" size={15} />,
  Wand:         () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h.01"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/></svg>,
  Trash:        () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  ArtPalette:   () => <Icon name="palette" size={15} />,
  Paste:        () => <Icon name="note_alt" size={15} />,
  Edit:         () => <Icon name="edit" size={15} />,
  Expand:       () => <Icon name="open_in_full" size={15} />,
  Download:     () => <Icon name="download" size={15} />,
  Palette:      () => <Icon name="palette" size={15} />,
  LayerUp:      () => <Icon name="flip_to_front" size={15} />,
  LayerDown:    () => <Icon name="flip_to_back" size={15} />,
  File:         () => <Icon name="draft" size={15} />,
  Group:        () => <Icon name="group_work" size={15} />,
  Ungroup:      () => <Icon name="ungroup" size={15} />,
  Lock:         () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Unlock:       () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>,
  Eye:          () => <Icon name="visibility" size={15} />,
  EyeOff:       () => <Icon name="visibility_off" size={15} />,
  UnlockAll:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>,
  ShowAll:      () => <Icon name="visibility" size={15} />,
  Text:         () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M12 4v16"/><path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2"/><path d="M9 20h6"/></svg>,
  Merge:        () => <Icon name="merge" size={15} />,
  LayerUpOne:   () => <Icon name="move_up" size={15} />,
  LayerDownOne: () => <Icon name="move_down" size={15} />,
  FlipH:        () => <Icon name="flip" size={15} />,
  FlipV:        () => <Icon name="flip" size={15} style={{ transform: 'rotate(90deg)' }} />,
  Layout:       () => <Icon name="space_dashboard" size={15} />,
  Reorder:      () => <Icon name="reorder" size={15} />,
  Export:       () => <Icon name="save" size={15} />,
  Import:       () => <Icon name="file_open" size={15} />,
  Search:       () => <Icon name="search" size={15} />,
  OCR:          () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8h8"/><path d="M7 12h10"/><path d="M7 16h6"/></svg>,
};

const ASPECT_RATIOS = [
  { label: '1:1', value: 1 },
  { label: '3:4', value: 3/4 },
  { label: '4:3', value: 4/3 },
  { label: '9:16', value: 9/16 },
  { label: '16:9', value: 16/9 },
];

// ... MenuItem Component ...
const MenuItem: React.FC<{ onClick: () => void; children: React.ReactNode; disabled?: boolean; destructive?: boolean; icon?: React.ReactNode }> = ({ onClick, children, disabled, destructive, icon }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full flex items-center gap-2 px-3 py-[7px] text-[11px] transition-colors group
            ${disabled ? 'text-gray-300 bg-transparent cursor-not-allowed' : 'hover:bg-[#F5F5F7]'}
            ${destructive && !disabled ? 'text-red-500 hover:bg-red-50' : 'text-[#1D1D1F]'}
        `}
    >
        {icon && <span className={`shrink-0 ${destructive ? 'text-red-500' : 'text-[#86868B] group-hover:text-[#1D1D1F]'} transition-colors`}>{icon}</span>}
        <span className="flex-1 min-w-0 text-left">{children}</span>
    </button>
);

export const ContextMenu: React.FC<ContextMenuProps> = ({ 
    menuData, 
    onClose, 
    actions,
    canChangeColor,
    elementType,
    hasCopiedStyle,
    selectionCount,
    selectedElementIds,
    isGrouped,
    isLocked,
    isVisible,
    hasLockedElements,
    hasHiddenElements,
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    type SubMenuType = 'color' | 'frame' | 'layerOrder' | 'layout' | null;
    const [activeSubMenu, setActiveSubMenu] = useState<SubMenuType>(null);
    const toggleSubMenu = (name: SubMenuType) =>
        setActiveSubMenu(prev => (prev === name ? null : name));

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);
    
    const handleAction = (action: Function) => {
        action();
        onClose();
    };
    

    const menuStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${menuData.x}px`,
        top: `${menuData.y}px`,
        zIndex: 2100, // Higher than other overlays
    };
    
    const subMenuStyle: React.CSSProperties = {
        position: 'absolute',
        left: 'calc(100% + 8px)',
        top: -8,
        zIndex: 2101,
    }

    return (
        <div
            ref={menuRef}
            style={menuStyle}
            className="w-52 rounded-2xl bg-white/90 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-white/50 py-1 ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
        >
            {menuData.elementId ? (
                // Element Menu
                elementType === 'artboard' ? (
                    <>
                        <div className="px-3 py-1 text-[9px] font-bold text-[#86868B] uppercase tracking-wider opacity-60">工作區域</div>
                        <MenuItem
                            icon={isLocked ? <MenuIcons.Unlock /> : <MenuIcons.Lock />}
                            onClick={() => handleAction(() => actions.toggleLock(menuData.elementId!))}
                        >
                            {isLocked ? '解鎖工作區域' : '鎖定工作區域'}
                        </MenuItem>
                        <div className="border-t my-0.5 border-gray-100/50" />
                        <MenuItem
                            icon={<MenuIcons.Export />}
                            onClick={() => handleAction(() => actions.exportArtboard(menuData.elementId!))}
                        >
                            匯出工作區域
                        </MenuItem>
                        <div className="border-t my-0.5 border-gray-100/50" />
                        <MenuItem
                            icon={<MenuIcons.Trash />}
                            onClick={() => handleAction(actions.deleteElement)}
                            destructive
                        >
                            刪除工作區域
                        </MenuItem>
                    </>
                ) : isLocked ? (
                    // Locked element — minimal menu: only unlock
                    <>
                        <div className="px-3 py-1 text-[9px] font-bold text-[#86868B] uppercase tracking-wider opacity-60">編輯</div>
                        <MenuItem icon={<MenuIcons.Unlock />} onClick={() => handleAction(() => actions.toggleLock(menuData.elementId!))}>
                            解鎖物件
                        </MenuItem>
                    </>
                ) : (
                    <>
                        <div className="px-3 py-1 text-[9px] font-bold text-[#86868B] uppercase tracking-wider opacity-60">編輯</div>

                        {/* Locking & Visibility */}
                        <MenuItem icon={isLocked ? <MenuIcons.Unlock /> : <MenuIcons.Lock />} onClick={() => handleAction(() => actions.toggleLock(menuData.elementId!))}>
                            {isLocked ? '解鎖物件' : '鎖定物件'}
                        </MenuItem>
                        <MenuItem icon={isVisible ? <MenuIcons.EyeOff /> : <MenuIcons.Eye />} onClick={() => handleAction(() => actions.toggleVisibility(menuData.elementId!))}>
                            {isVisible ? '隱藏物件' : '顯示物件'}
                        </MenuItem>

                        {/* Grouping / Merging */}
                        {selectionCount > 1 && (
                            <MenuItem icon={<MenuIcons.Group />} onClick={() => handleAction(actions.group)}>
                                建立群組 (Group)
                            </MenuItem>
                        )}
                        {isGrouped && (
                            <MenuItem icon={<MenuIcons.Ungroup />} onClick={() => handleAction(actions.ungroup)}>
                                解散群組 (Ungroup)
                            </MenuItem>
                        )}
                        {selectionCount > 1 && (
                            <MenuItem icon={<MenuIcons.Merge />} onClick={() => handleAction(actions.mergeLayers)}>
                                合併圖層 (Merge Layers)
                            </MenuItem>
                        )}

                        <div className="border-t my-0.5 border-gray-100/50" />

                        <div className="px-3 py-1 text-[9px] font-bold text-[#86868B] uppercase tracking-wider opacity-60">圖層與整理</div>
                        {/* 圖層排序 submenu */}
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleSubMenu('layerOrder'); }}
                                className={`w-full flex justify-between items-center text-left px-3 py-[7px] text-[11px] text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors group ${activeSubMenu === 'layerOrder' ? 'bg-[#F5F5F7]' : ''}`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-[#86868B] group-hover:text-[#1D1D1F] transition-colors"><MenuIcons.Reorder /></span>
                                    <span>圖層排序</span>
                                </div>
                                <Icon name="chevron_right" size={10} className="text-[#86868B] transition-transform" style={{ transform: activeSubMenu === 'layerOrder' ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                            </button>
                            {activeSubMenu === 'layerOrder' && (
                                <div style={subMenuStyle} className="w-36 rounded-2xl bg-white/90 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-white/50 py-1 ring-1 ring-black/5">
                                    <MenuItem icon={<MenuIcons.LayerUp />} onClick={() => handleAction(actions.bringToFront)}>移至最前</MenuItem>
                                    <MenuItem icon={<MenuIcons.LayerUpOne />} onClick={() => handleAction(actions.bringForward)}>前移一層</MenuItem>
                                    <MenuItem icon={<MenuIcons.LayerDownOne />} onClick={() => handleAction(actions.sendBackward)}>後移一層</MenuItem>
                                    <MenuItem icon={<MenuIcons.LayerDown />} onClick={() => handleAction(actions.sendToBack)}>移至最後</MenuItem>
                                </div>
                            )}
                        </div>
                        <div className="border-t my-0.5 border-gray-100/50" />

                        {elementType === 'text' && (
                             <>
                                <MenuItem icon={<MenuIcons.Magic />} onClick={() => handleAction(() => actions.rasterizeText(menuData.elementId!))}>
                                    轉換為圖片 (Rasterize)
                                </MenuItem>
                                <div className="border-t my-0.5 border-gray-100/50" />
                            </>
                        )}

                        {elementType === 'shape' && (
                             <>
                                <MenuItem icon={<MenuIcons.Magic />} onClick={() => handleAction(() => actions.rasterizeShape(menuData.elementId!))}>
                                    轉換為圖片 (Rasterize)
                                </MenuItem>
                                <div className="border-t my-0.5 border-gray-100/50" />
                            </>
                        )}

                        {elementType === 'arrow' && (
                             <>
                                <MenuItem icon={<MenuIcons.Magic />} onClick={() => handleAction(() => actions.rasterizeArrow(menuData.elementId!))}>
                                    轉換為圖片 (Rasterize)
                                </MenuItem>
                                <div className="border-t my-0.5 border-gray-100/50" />
                            </>
                        )}

                        {elementType === 'image' && (
                             <>
                                {/* 佈局 submenu */}
                                <div className="relative">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleSubMenu('layout'); }}
                                        className={`w-full flex justify-between items-center text-left px-3 py-[7px] text-[11px] text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors group ${activeSubMenu === 'layout' ? 'bg-[#F5F5F7]' : ''}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-[#86868B] group-hover:text-[#1D1D1F] transition-colors"><MenuIcons.Layout /></span>
                                            <span>佈局</span>
                                        </div>
                                        <Icon name="chevron_right" size={10} className="text-[#86868B] transition-transform" style={{ transform: activeSubMenu === 'layout' ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                                    </button>
                                    {activeSubMenu === 'layout' && (
                                        <div style={subMenuStyle} className="w-36 rounded-2xl bg-white/90 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-white/50 py-1 ring-1 ring-black/5">
                                            <MenuItem icon={<MenuIcons.FlipH />} onClick={() => handleAction(() => actions.flipHorizontal(menuData.elementId!))}>水平翻轉</MenuItem>
                                            <MenuItem icon={<MenuIcons.FlipV />} onClick={() => handleAction(() => actions.flipVertical(menuData.elementId!))}>垂直翻轉</MenuItem>
                                        </div>
                                    )}
                                </div>
                                <div className="border-t my-0.5 border-gray-100/50" />
                                <MenuItem icon={<MenuIcons.Search />} onClick={() => handleAction(() => actions.extractPrompt(menuData.elementId!))}>
                                    提取提示詞
                                </MenuItem>
                                <MenuItem icon={<MenuIcons.CopyStyle />} onClick={() => handleAction(() => actions.copyStyle(menuData.elementId!))}>
                                    複製風格
                                </MenuItem>
                                <MenuItem
                                    icon={<MenuIcons.Paste />}
                                    onClick={() => handleAction(() => actions.pasteStyle([menuData.elementId!]))}
                                    disabled={!hasCopiedStyle}
                                >
                                    貼上風格 (Paste Style)
                                </MenuItem>
                                <div className="border-t my-0.5 border-gray-100/50" />
                                <MenuItem icon={<MenuIcons.Wand />} onClick={() => handleAction(() => actions.magicLayer(menuData.elementId!))}>
                                    魔法分層
                                </MenuItem>
                                <MenuItem
                                    icon={<Icon name="frame_inspect" size={14} />}
                                    onClick={() => handleAction(() => actions.semanticEditor(menuData.elementId!))}
                                >
                                    語意編輯器
                                </MenuItem>
                                <MenuItem icon={<MenuIcons.OCR />} onClick={() => handleAction(() => actions.ocrConvert(menuData.elementId!))}>
                                    文字辨識轉換
                                </MenuItem>
                                <MenuItem icon={<MenuIcons.Edit />} onClick={() => handleAction(() => actions.startImageEdit(menuData.elementId!))}>
                                    局部重繪與圖片編輯
                                </MenuItem>
                                <MenuItem icon={<MenuIcons.Expand />} onClick={() => handleAction(() => actions.startOutpainting(menuData.elementId!))}>
                                    擴展圖片 (Outpainting)
                                </MenuItem>
                                 <div className="border-t my-0.5 border-gray-100/50" />
                            </>
                        )}
                        
                        {elementType === 'drawing' && (
                             <>
                                <MenuItem icon={<MenuIcons.Edit />} onClick={() => handleAction(() => actions.editDrawing(menuData.elementId!))}>
                                    編輯手繪
                                </MenuItem>
                                 <div className="border-t my-0.5 border-gray-100/50" />
                            </>
                        )}
                        
                        {(elementType === 'image' || elementType === 'drawing') && (
                            <>
                                <MenuItem
                                    icon={<MenuIcons.Download />}
                                    onClick={() => handleAction(() =>
                                        selectionCount > 1
                                            ? actions.downloadImages(selectedElementIds)
                                            : actions.downloadImage(menuData.elementId!)
                                    )}
                                >
                                    {selectionCount > 1 ? `下載圖片（${selectionCount} 張）` : '下載圖片'}
                                </MenuItem>
                                <div className="border-t my-0.5 border-gray-100/50" />
                            </>
                        )}
                        
                        {canChangeColor && (
                            <>
                                <div className="relative">
                                    <button
                                        onClick={(e) => { if (!canChangeColor) return; e.stopPropagation(); toggleSubMenu('color'); }}
                                        className={`w-full flex justify-between items-center text-left px-3 py-[7px] text-[11px] text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors group ${activeSubMenu === 'color' ? 'bg-[#F5F5F7]' : ''}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-[#86868B] group-hover:text-[#1D1D1F] transition-colors"><MenuIcons.Palette /></span>
                                            <span>變更顏色</span>
                                        </div>
                                        <Icon name="chevron_right" size={10} className="text-[#86868B] transition-transform" style={{ transform: activeSubMenu === 'color' ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                                    </button>
                                    {activeSubMenu === 'color' && (
                                        <div
                                            style={subMenuStyle}
                                            className="w-44 rounded-2xl bg-white/90 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-white/50 py-1 ring-1 ring-black/5"
                                        >
                                            <div className="p-2 grid grid-cols-4 gap-1.5">
                                                {COLORS.map(color => (
                                                    color.name === '透明' ? (
                                                        <button
                                                            key={color.name}
                                                            onClick={() => handleAction(() => actions.changeColor(color.bg))}
                                                            className="w-6 h-6 rounded-full border-2 border-white ring-1 ring-black/5 shadow-sm hover:scale-110 transition-transform overflow-hidden"
                                                            aria-label="透明（無背景色）"
                                                            style={{ background: 'repeating-conic-gradient(#D1D1D6 0% 25%, #FFFFFF 0% 50%) 0 0 / 8px 8px' }}
                                                        />
                                                    ) : (
                                                        <button
                                                            key={color.name}
                                                            onClick={() => handleAction(() => actions.changeColor(color.bg))}
                                                            className={`w-6 h-6 rounded-full ${color.bg} border-2 border-white ring-1 ring-black/5 shadow-sm hover:scale-110 transition-transform`}
                                                            aria-label={`變更顏色為 ${color.name}`}
                                                        />
                                                    )
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="border-t my-0.5 border-gray-100/50" />
                            </>
                        )}
                        
                        <MenuItem icon={<MenuIcons.Trash />} onClick={() => handleAction(actions.deleteElement)} destructive>刪除</MenuItem>
                    </>
                )
            ) : (
                // Canvas Menu
                <>
                    <div className="px-3 py-1 text-[9px] font-bold text-[#86868B] uppercase tracking-wider opacity-60">新增</div>
                    <MenuItem icon={<MenuIcons.Note />} onClick={() => handleAction(() => actions.addNote(menuData.worldPoint))}>新增便利貼</MenuItem>
                    <MenuItem icon={<MenuIcons.Text />} onClick={() => handleAction(() => actions.addText(menuData.worldPoint))}>新增文字</MenuItem>
                    <MenuItem icon={<MenuIcons.Arrow />} onClick={() => handleAction(() => actions.addArrow(menuData.worldPoint))}>新增箭頭</MenuItem>
                    <MenuItem icon={<MenuIcons.Draw />} onClick={() => handleAction(() => actions.addDrawing(menuData.worldPoint))}>新增手繪</MenuItem>
                    <div className="border-t my-0.5 border-gray-100/50" />
                    <MenuItem icon={<MenuIcons.Image />} onClick={() => handleAction(() => actions.addImage(menuData.worldPoint))}>新增圖片</MenuItem>
                    
                     <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleSubMenu('frame'); }}
                            className={`w-full flex justify-between items-center text-left px-3 py-[7px] text-[11px] text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors group ${activeSubMenu === 'frame' ? 'bg-[#F5F5F7]' : ''}`}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-[#86868B] group-hover:text-[#1D1D1F] transition-colors"><MenuIcons.Frame /></span>
                                <span>新增畫框</span>
                            </div>
                            <Icon name="chevron_right" size={10} className="text-[#86868B] transition-transform" style={{ transform: activeSubMenu === 'frame' ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                        </button>
                        {activeSubMenu === 'frame' && (
                            <div 
                                style={subMenuStyle}
                                className="w-40 rounded-2xl bg-white/90 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-white/50 py-1 ring-1 ring-black/5"
                            >
                                {ASPECT_RATIOS.map(ratio => (
                                    <MenuItem 
                                        key={ratio.label}
                                        onClick={() => handleAction(() => actions.addFrame(ratio.label, ratio.value, menuData.worldPoint))}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div 
                                                className="border border-gray-400 rounded-sm"
                                                style={{ 
                                                    width: ratio.value >= 1 ? '12px' : `${12 * ratio.value}px`,
                                                    height: ratio.value >= 1 ? `${12 / ratio.value}px` : '12px'
                                                }}
                                            />
                                            {ratio.label}
                                        </div>
                                    </MenuItem>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="border-t my-0.5 border-gray-100/50" />
                    <div className="px-3 py-1 text-[9px] font-bold text-[#86868B] uppercase tracking-wider opacity-60">圖層管理</div>
                    <MenuItem icon={<MenuIcons.UnlockAll />} onClick={() => handleAction(actions.unlockAll)} disabled={!hasLockedElements}>全部解除鎖定</MenuItem>
                    <MenuItem icon={<MenuIcons.ShowAll />} onClick={() => handleAction(actions.showAll)} disabled={!hasHiddenElements}>顯示全部物件</MenuItem>

                    <div className="border-t my-0.5 border-gray-100/50" />

                    {actions.isFileSystemSupported ? (<>
                        <MenuItem icon={<MenuIcons.Export />} onClick={() => handleAction(actions.saveFile!)}>
                            {actions.currentFileName ? (
                                <span className="flex flex-col items-start leading-snug w-full min-w-0">
                                    <span>儲存</span>
                                    <span className="opacity-40 text-[10px] w-full truncate">{actions.currentFileName}</span>
                                </span>
                            ) : '儲存檔案'}
                        </MenuItem>
                        <MenuItem icon={<MenuIcons.Import />} onClick={() => handleAction(actions.openFile!)}>開啟檔案</MenuItem>
                        <MenuItem icon={<MenuIcons.Export />} onClick={() => handleAction(actions.saveAsFile!)}>另存新檔</MenuItem>
                    </>) : (<>
                        <MenuItem icon={<MenuIcons.Export />} onClick={() => handleAction(actions.exportCanvas)}>匯出畫布</MenuItem>
                        <MenuItem icon={<MenuIcons.Import />} onClick={() => handleAction(actions.importCanvas)}>匯入畫布</MenuItem>
                    </>)}
                    <div className="border-t my-0.5 border-gray-100/50" />
                    <MenuItem icon={<MenuIcons.Trash />} onClick={() => handleAction(actions.clearStorage)} destructive>清除存檔</MenuItem>
                </>
            )}
        </div>
    );
};
