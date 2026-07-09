
import React, { useRef, useEffect, useState } from 'react';
import type { Point, ElementType } from '../types';
import { COLORS } from '../utils/helpers';
import { Icon } from './Icon';
import { SaveAll, PencilRuler, SquareBottomDashedScissors, SwatchBook } from 'lucide-react';

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
    createNodeWorkflow: (elementId: string) => void;
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
    optimizeNotePrompt: (elementId: string) => void;
    designMaster: (elementId: string) => void;
    magicLayer: (elementId: string) => void;
    semanticEditor: (elementId: string) => void;
    ocrConvert: (elementId: string) => void;
    clearStorage: () => void;
    splitSticker?: (elementId: string) => void;
    crossPlatformAdapt?: (elementId: string) => void;
    extendBrandKit?: (elementId: string) => void;
    productMarketingSet?: (elementId: string) => void;
    toggleSnapToObjects?: () => void;
    toggleShowImageSizes?: () => void;
    resizeImage?: (elementId: string) => void;
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
  snapToObjects?: boolean;
  showImageSizes?: boolean;
  selectedElement?: any;
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
  Magic:        () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M10 3H8"/><path d="m15.007 5.008 3.987 3.986"/><path d="M20 15v4"/><path d="M21.174 6.813a2.82 2.82 0 0 0-3.986-3.987L3.842 16.175a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="M22 17h-4"/><path d="M4 5v4"/><path d="M6 7H2"/><path d="M9 2v2"/></svg>,
  Design:       () => <PencilRuler size={13} strokeWidth={1.75} style={{ display: 'block' }} />,
  Rasterize:    () => <Icon name="reset_image" size={15} />,
  Wand:         () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h.01"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/></svg>,
  Trash:        () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  ArtPalette:   () => <Icon name="palette" size={15} />,
  Paste:        () => <Icon name="note_alt" size={15} />,
  Edit:         () => <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>,
  Expand:       () => <Icon name="resize" size={15} />,
  Download:     () => <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21"/><path d="m14 19 3 3v-5.5"/><path d="m17 22 3-3"/><circle cx="9" cy="9" r="2"/></svg>,
  Palette:      () => <Icon name="palette" size={15} />,
  LayerUp:      () => <Icon name="flip_to_front" size={15} />,
  LayerDown:    () => <Icon name="flip_to_back" size={15} />,
  File:         () => <Icon name="draft" size={15} />,
  Group:        () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5c0-1.1.9-2 2-2h2"/><path d="M17 3h2c1.1 0 2 .9 2 2v2"/><path d="M21 17v2c0 1.1-.9 2-2 2h-2"/><path d="M7 21H5c-1.1 0-2-.9-2-2v-2"/><rect width="7" height="5" x="7" y="7" rx="1"/><rect width="7" height="5" x="10" y="12" rx="1"/></svg>,
  Ungroup:      () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="6" x="5" y="4" rx="1"/><rect width="8" height="6" x="11" y="14" rx="1"/></svg>,
  Lock:         () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Unlock:       () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>,
  Eye:          () => <Icon name="visibility" size={15} />,
  SwatchBook:   () => <SwatchBook size={13} strokeWidth={1.75} style={{ display: 'block' }} />,
  EyeOff:       () => <Icon name="visibility_off" size={15} />,
  UnlockAll:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>,
  ShowAll:      () => <Icon name="visibility" size={15} />,
  Text:         () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M12 4v16"/><path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2"/><path d="M9 20h6"/></svg>,
  Merge:        () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="13" height="13"><path fill="currentColor" d="M4.875 13.75c-0.233335 0 -0.4375 -0.0875 -0.6125 -0.2625 -0.175 -0.175 -0.2625 -0.37915 -0.2625 -0.6125 0 -0.23335 0.0875 -0.4375 0.2625 -0.6125 0.175 -0.175 0.379165 -0.2625 0.6125 -0.2625h14.25c0.23335 0 0.4375 0.0875 0.6125 0.2625 0.175 0.175 0.2625 0.37915 0.2625 0.6125 0 0.23335 -0.0875 0.4375 -0.2625 0.6125 -0.175 0.175 -0.37915 0.2625 -0.6125 0.2625H4.875Zm-0.125 -3.025c-0.216665 0 -0.395835 -0.07085 -0.5375 -0.2125C4.070835 10.37085 4 10.19165 4 9.975c0 -0.21665 0.070835 -0.39585 0.2125 -0.5375 0.141665 -0.14165 0.320835 -0.2125 0.5375 -0.2125h14.5c0.21665 0 0.39585 0.07085 0.5375 0.2125s0.2125 0.32085 0.2125 0.5375c0 0.21665 -0.07085 0.39585 -0.2125 0.5375s-0.32085 0.2125 -0.5375 0.2125h-14.5ZM11.975 22c-0.21665 0 -0.39585 -0.07085 -0.5375 -0.2125s-0.2125 -0.32085 -0.2125 -0.5375v-3.2l-1.4 1.375c-0.15 0.13335 -0.325 0.20415 -0.525 0.2125 -0.2 0.00835 -0.375 -0.0625 -0.525 -0.2125 -0.15 -0.15 -0.225 -0.325 -0.225 -0.525s0.075 -0.375 0.225 -0.525l2.675 -2.65c0.08335 -0.08335 0.16665 -0.14165 0.25 -0.175 0.08335 -0.03335 0.175 -0.05 0.275 -0.05 0.1 0 0.19165 0.01665 0.275 0.05 0.08335 0.03335 0.16665 0.09165 0.25 0.175l2.625 2.65c0.13335 0.15 0.20415 0.325 0.2125 0.525 0.00835 0.2 -0.0625 0.375 -0.2125 0.525 -0.15 0.15 -0.325 0.225 -0.525 0.225s-0.375 -0.075 -0.525 -0.225l-1.35 -1.375v3.2c0 0.21665 -0.07085 0.39585 -0.2125 0.5375S12.19165 22 11.975 22Zm0 -14.5c-0.1 0 -0.19165 -0.01665 -0.275 -0.05 -0.08335 -0.03335 -0.16665 -0.09165 -0.25 -0.175l-2.65 -2.65c-0.13335 -0.133335 -0.20415 -0.304165 -0.2125 -0.5125 -0.00835 -0.208335 0.0625 -0.3875 0.2125 -0.5375 0.15 -0.15 0.325 -0.225 0.525 -0.225s0.375 0.075 0.525 0.225l1.35 1.375V1.75c0 -0.216665 0.07085 -0.395835 0.2125 -0.5375 0.14165 -0.141665 0.32085 -0.2125 0.5375 -0.2125 0.21665 0 0.39585 0.070835 0.5375 0.2125 0.14165 0.141665 0.2125 0.320835 0.2125 0.5375v3.2l1.4 -1.375c0.15 -0.133335 0.325 -0.204165 0.525 -0.2125 0.2 -0.008335 0.375 0.0625 0.525 0.2125 0.15 0.15 0.225 0.325 0.225 0.525s-0.075 0.375 -0.225 0.525l-2.65 2.65c-0.08335 0.08335 -0.16665 0.14165 -0.25 0.175 -0.08335 0.03335 -0.175 0.05 -0.275 0.05Z" strokeWidth="0.5"/></svg>,
  LayerUpOne:   () => <Icon name="move_up" size={15} />,
  LayerDownOne: () => <Icon name="move_down" size={15} />,
  FlipH:        () => <Icon name="flip" size={15} />,
  FlipV:        () => <Icon name="flip" size={15} style={{ transform: 'rotate(90deg)' }} />,
  Layout:       () => <Icon name="space_dashboard" size={15} />,
  NodeWorkflow: () => <Icon name="account_tree" size={15} />,
  MobileLayout: () => <Icon name="mobile_layout" size={15} />,
  ShoppingBag:  () => <Icon name="shopping_bag" size={15} />,
  Reorder:      () => <Icon name="reorder" size={15} />,
  Export:       () => <Icon name="save" size={15} />,
  Save:         () => <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>,
  Import:       () => <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg>,
  Search:       () => <svg width="15" height="15" viewBox="0 0 24 24" strokeWidth="1.5" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 14L20 9C20 9 19.5 7 17.5 7C17.5 7 17.5 5 15.5 5C13.5 5 13.5 7 13.5 7H10.5C10.5 7 10.5 5 8.5 5C6.5 5 6.5 7 6.5 7C4.5 7 4 9 4 9L2.5 14"/><path d="M6 20C8.20914 20 10 18.2091 10 16C10 13.7909 8.20914 12 6 12C3.79086 12 2 13.7909 2 16C2 18.2091 3.79086 20 6 20Z"/><path d="M18 20C20.2091 20 22 18.2091 22 16C22 13.7909 20.2091 12 18 12C15.7909 12 14 13.7909 14 16C14 18.2091 15.7909 20 18 20Z"/><path d="M12 16C13.1046 16 14 15.1046 14 14C14 12.8954 13.1046 12 12 12C10.8954 12 10 12.8954 10 14C10 15.1046 10.8954 16 12 16Z"/></svg>,
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
        {icon && <span className={`w-4 h-4 flex items-center justify-center shrink-0 ${destructive ? 'text-red-500' : 'text-[#86868B] group-hover:text-[#1D1D1F]'} transition-colors`}>{icon}</span>}
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
    snapToObjects = true,
    showImageSizes = false,
    selectedElement,
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    type SubMenuType = 'color' | 'frame' | 'layerOrder' | 'layout' | 'aiImageTools' | 'aiMarketing' | null;
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
                            <MenuItem icon={<MenuIcons.Group />} onClick={() => handleAction(actions.group)} disabled={isGrouped}>
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

                        {(elementType === 'note' || elementType === 'text') && (
                             <>
                                <MenuItem icon={<MenuIcons.Magic />} onClick={() => handleAction(() => actions.optimizeNotePrompt(menuData.elementId!))}>
                                    AI 提示詞優化
                                </MenuItem>
                                <MenuItem icon={<MenuIcons.Design />} onClick={() => handleAction(() => actions.designMaster(menuData.elementId!))}>
                                    設計大師
                                </MenuItem>
                                {elementType === 'note' && (
                                    <MenuItem icon={<MenuIcons.NodeWorkflow />} onClick={() => handleAction(() => actions.createNodeWorkflow(menuData.elementId!))}>
                                        建立節點工作流
                                    </MenuItem>
                                )}
                                <div className="border-t my-0.5 border-gray-100/50" />
                            </>
                        )}

                        {elementType === 'text' && (
                             <>
                                <MenuItem icon={<MenuIcons.Rasterize />} onClick={() => handleAction(() => actions.rasterizeText(menuData.elementId!))}>
                                    轉換為圖片 (Rasterize)
                                </MenuItem>
                                <div className="border-t my-0.5 border-gray-100/50" />
                            </>
                        )}

                        {elementType === 'shape' && (
                             <>
                                <MenuItem icon={<MenuIcons.Rasterize />} onClick={() => handleAction(() => actions.rasterizeShape(menuData.elementId!))}>
                                    轉換為圖片 (Rasterize)
                                </MenuItem>
                                <div className="border-t my-0.5 border-gray-100/50" />
                            </>
                        )}

                        {elementType === 'arrow' && (
                             <>
                                <MenuItem icon={<MenuIcons.Rasterize />} onClick={() => handleAction(() => actions.rasterizeArrow(menuData.elementId!))}>
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
                                {actions.resizeImage && (
                                    <MenuItem icon={<Icon name="aspect_ratio" size={14} />} onClick={() => handleAction(() => actions.resizeImage!(menuData.elementId!))}>
                                        調整圖片尺寸
                                    </MenuItem>
                                )}
                                <div className="border-t my-0.5 border-gray-100/50" />
                                <MenuItem icon={<MenuIcons.NodeWorkflow />} onClick={() => handleAction(() => actions.createNodeWorkflow(menuData.elementId!))}>
                                    建立節點工作流
                                </MenuItem>
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
                                 {/* AI 圖像工具 submenu */}
                                <div className="relative">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleSubMenu('aiImageTools'); }}
                                        className={`w-full flex justify-between items-center text-left px-3 py-[7px] text-[11px] text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors group ${activeSubMenu === 'aiImageTools' ? 'bg-[#F5F5F7]' : ''}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-[#AF52DE] group-hover:text-[#AF52DE] transition-colors"><MenuIcons.Wand /></span>
                                            <span className="font-semibold text-[#AF52DE]">AI 圖像工具</span>
                                        </div>
                                        <Icon name="chevron_right" size={10} className="text-[#86868B] transition-transform" style={{ transform: activeSubMenu === 'aiImageTools' ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                                    </button>
                                    {activeSubMenu === 'aiImageTools' && (
                                        <div style={subMenuStyle} className="w-[176px] rounded-2xl bg-white/90 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-white/50 py-1 ring-1 ring-black/5">
                                            <MenuItem icon={<MenuIcons.Edit />} onClick={() => handleAction(() => actions.startImageEdit(menuData.elementId!))}>
                                                局部重繪與圖片編輯
                                            </MenuItem>
                                            <MenuItem icon={<MenuIcons.Expand />} onClick={() => handleAction(() => actions.startOutpainting(menuData.elementId!))}>
                                                擴展圖片 (Outpainting)
                                            </MenuItem>
                                            <MenuItem icon={<MenuIcons.Wand />} onClick={() => handleAction(() => actions.magicLayer(menuData.elementId!))}>
                                                魔法分層
                                            </MenuItem>
                                            <MenuItem
                                                icon={<Icon name="wallpaper" size={15} />}
                                                onClick={() => handleAction(() => actions.semanticEditor(menuData.elementId!))}
                                            >
                                                物件感知編輯
                                            </MenuItem>
                                            <MenuItem icon={<MenuIcons.OCR />} onClick={() => handleAction(() => actions.ocrConvert(menuData.elementId!))}>
                                                文字辨識轉換
                                            </MenuItem>
                                             {actions.splitSticker && (
                                                 <MenuItem icon={<SquareBottomDashedScissors size={14} strokeWidth={1.8} style={{ display: 'block' }} />} onClick={() => handleAction(() => actions.splitSticker!(menuData.elementId!))}>
                                                     一鍵拆分貼圖/圖示
                                                 </MenuItem>
                                             )}
                                        </div>
                                    )}
                                </div>

                                {/* AI 品牌與行銷 submenu */}
                                <div className="relative mt-0.5">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleSubMenu('aiMarketing'); }}
                                        className={`w-full flex justify-between items-center text-left px-3 py-[7px] text-[11px] text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors group ${activeSubMenu === 'aiMarketing' ? 'bg-[#F5F5F7]' : ''}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-[#AF52DE] group-hover:text-[#AF52DE] transition-colors"><MenuIcons.SwatchBook /></span>
                                            <span className="font-semibold text-[#AF52DE]">AI 品牌與行銷</span>
                                        </div>
                                        <Icon name="chevron_right" size={10} className="text-[#86868B] transition-transform" style={{ transform: activeSubMenu === 'aiMarketing' ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                                    </button>
                                    {activeSubMenu === 'aiMarketing' && (
                                        <div style={subMenuStyle} className="w-[152px] rounded-2xl bg-white/90 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-white/50 py-1 ring-1 ring-black/5">
                                             {actions.crossPlatformAdapt && (
                                                 <MenuItem icon={<MenuIcons.MobileLayout />} onClick={() => handleAction(() => actions.crossPlatformAdapt!(menuData.elementId!))}>
                                                     一鍵跨平台適配
                                                 </MenuItem>
                                             )}
                                             {actions.extendBrandKit && (
                                                 <MenuItem icon={<MenuIcons.SwatchBook />} onClick={() => handleAction(() => actions.extendBrandKit!(menuData.elementId!))}>
                                                     延伸品牌套件
                                                 </MenuItem>
                                             )}
                                             {actions.productMarketingSet && (
                                                 <MenuItem icon={<MenuIcons.ShoppingBag />} onClick={() => handleAction(() => actions.productMarketingSet!(menuData.elementId!))}>
                                                     產品行銷組圖
                                                 </MenuItem>
                                             )}
                                        </div>
                                    )}
                                </div>
                                {selectedElement?.metadata?.seed !== undefined && (
                                    <>
                                        <div className="border-t my-0.5 border-gray-100/50" />
                                        <div className="px-3 py-1 text-[10px] font-bold text-[#AF52DE] uppercase tracking-wider opacity-90 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#AF52DE] animate-pulse" />
                                            AI 生成資訊
                                        </div>
                                        <div className="px-3 py-2 space-y-2 text-left">
                                            {selectedElement.metadata.model && (
                                                <div className="flex justify-between items-center text-[11px]">
                                                    <span className="text-gray-400">生圖模型</span>
                                                    <span className="px-1.5 py-0.5 bg-purple-50 text-[#AF52DE] rounded text-[10px] font-bold uppercase">
                                                        {selectedElement.metadata.model}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center text-[11px]">
                                                <span className="text-gray-400">種子碼 (Seed)</span>
                                                <span 
                                                    className="font-mono font-bold text-gray-700 hover:text-[#AF52DE] flex items-center gap-1 cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(String(selectedElement.metadata.seed));
                                                        alert(`📋 已複製種子碼: ${selectedElement.metadata.seed}`);
                                                    }}
                                                    title="點擊複製種子碼"
                                                >
                                                    {selectedElement.metadata.seed}
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                                </span>
                                            </div>
                                            {selectedElement.metadata.prompt && (
                                                <div 
                                                    className="group relative bg-gray-50 border border-gray-100 rounded-lg p-2 mt-1 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(String(selectedElement.metadata.prompt));
                                                        alert(`📋 已複製提示詞！`);
                                                    }}
                                                    title="點擊複製完整提示詞"
                                                >
                                                    <p className="text-[10px] text-gray-400 font-semibold mb-1">PROMPT (點擊複製)</p>
                                                    <p className="text-[11px] text-gray-600 leading-normal line-clamp-2 hover:line-clamp-none transition-all">
                                                        {selectedElement.metadata.prompt}
                                                    </p>
                                                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                                        <span className="text-[10px] bg-white px-2 py-1 rounded shadow-sm text-gray-700 font-bold">複製提示詞</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
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
                    <div className="px-3 py-1 text-[9px] font-bold text-[#86868B] uppercase tracking-wider opacity-60">畫布工具</div>
                    {actions.toggleSnapToObjects && (
                        <MenuItem
                            icon={
                                <span className={`inline-flex items-center justify-center w-3 h-3 rounded-sm border ${snapToObjects ? 'bg-blue-500 border-blue-500' : 'border-gray-400'}`}>
                                    {snapToObjects && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.2 5.7L6.5 2.3" stroke="white" strokeWidth="1.2" strokeLinecap="round"/></svg>}
                                </span>
                            }
                            onClick={() => { actions.toggleSnapToObjects!(); }}
                        >
                            自動對齊參考線
                        </MenuItem>
                    )}
                    {actions.toggleShowImageSizes && (
                        <MenuItem
                            icon={
                                <span className={`inline-flex items-center justify-center w-3 h-3 rounded-sm border ${showImageSizes ? 'bg-blue-500 border-blue-500' : 'border-gray-400'}`}>
                                    {showImageSizes && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.2 5.7L6.5 2.3" stroke="white" strokeWidth="1.2" strokeLinecap="round"/></svg>}
                                </span>
                            }
                            onClick={() => { actions.toggleShowImageSizes!(); }}
                        >
                            顯示圖片尺寸標籤
                        </MenuItem>
                    )}

                    <div className="border-t my-0.5 border-gray-100/50" />

                    {actions.isFileSystemSupported ? (<>
                        <MenuItem icon={<MenuIcons.Save />} onClick={() => handleAction(actions.saveFile!)}>
                            {actions.currentFileName ? (
                                <span className="flex flex-col items-start leading-snug w-full min-w-0">
                                    <span>儲存</span>
                                    <span className="opacity-40 text-[10px] w-full truncate">{actions.currentFileName}</span>
                                </span>
                            ) : '儲存檔案'}
                        </MenuItem>
                        <MenuItem icon={<MenuIcons.Import />} onClick={() => handleAction(actions.openFile!)}>開啟檔案</MenuItem>
                        <MenuItem icon={<SaveAll size={13} strokeWidth={2} />} onClick={() => handleAction(actions.saveAsFile!)}>另存新檔</MenuItem>
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
