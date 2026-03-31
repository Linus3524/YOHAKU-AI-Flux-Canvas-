
import React, { useRef, useEffect, useState } from 'react';
import type { Point, ElementType } from '../types';
import { COLORS } from '../utils/helpers';

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
    exportArtboard: (elementId: string) => void;
    copyStyle: (elementId: string) => void;
    pasteStyle: (elementIds: string[]) => void;
    exportCanvas: () => void;
    importCanvas: () => void;
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
    extractPrompt: (elementId: string) => void; // Added extractPrompt
  };
  canChangeColor: boolean;
  elementType: ElementType | null;
  hasCopiedStyle: boolean;
  // State props
  selectionCount: number;
  isGrouped: boolean;
  isLocked: boolean;
  isVisible: boolean;
}

const MenuIcons = {
  // Use Specific minimalist icons matching Toolbar
  Add: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  Note: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  ),
  Draw: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19l7-7 3 3-7 7-3-3z"/>
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
      <path d="M2 2l7.586 7.586"/>
    </svg>
  ),
  Arrow: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  Image: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  ),
  Frame: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeDasharray="4 4"></rect>
      <line x1="12" y1="8" x2="12" y2="16"></line>
      <line x1="8" y1="12" x2="16" y2="12"></line>
    </svg>
  ),
  Copy: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>,
  Magic: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>,
  ArtPalette: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5"></circle><circle cx="17.5" cy="10.5" r=".5"></circle><circle cx="8.5" cy="7.5" r=".5"></circle><circle cx="6.5" cy="12.5" r=".5"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path></svg>,
  Paste: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>,
  Edit: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  Expand: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>,
  Download: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
  Palette: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5"></circle><circle cx="17.5" cy="10.5" r=".5"></circle><circle cx="8.5" cy="7.5" r=".5"></circle><circle cx="6.5" cy="12.5" r=".5"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path></svg>,
  LayerUp: () => (
    // 移至最前：箭頭朝上 + 頂部粗線（代表到達最頂層）
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="3" x2="19" y2="3" strokeWidth="2.5"/>
      <line x1="12" y1="21" x2="12" y2="9"/>
      <polyline points="7 14 12 9 17 14"/>
    </svg>
  ),
  LayerDown: () => (
    // 移至最後：箭頭朝下 + 底部粗線（代表到達最底層）
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="3" x2="12" y2="15"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="5" y1="21" x2="19" y2="21" strokeWidth="2.5"/>
    </svg>
  ),
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  File: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>,
  Group: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>,
  Ungroup: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
  Lock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
  Unlock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>,
  Eye: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
  EyeOff: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>,
  UnlockAll: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path><line x1="8" y1="21" x2="16" y2="21"></line></svg>,
  ShowAll: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle><line x1="4" y1="4" x2="8" y2="8"></line><line x1="20" y1="4" x2="16" y2="8"></line></svg>,
  Text: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 4 4 20 4 20 7"></polyline>
      <line x1="9" y1="20" x2="15" y2="20"></line>
      <line x1="12" y1="4" x2="12" y2="20"></line>
    </svg>
  ),
  Merge: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path><path d="M8 8h8v8H8z"></path></svg>,
  LayerUpOne: () => (
    // 前移一層：箭頭朝上 + 底部細線（代表從當前位置往上移一步）
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="8"/>
      <polyline points="7 13 12 8 17 13"/>
      <line x1="5" y1="21" x2="19" y2="21" strokeWidth="1.5" strokeOpacity="0.4"/>
    </svg>
  ),
  LayerDownOne: () => (
    // 後移一層：箭頭朝下 + 頂部細線（代表從當前位置往下移一步）
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="3" x2="19" y2="3" strokeWidth="1.5" strokeOpacity="0.4"/>
      <line x1="12" y1="4" x2="12" y2="16"/>
      <polyline points="7 11 12 16 17 11"/>
    </svg>
  ),
  FlipH: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M4 7l4 5-4 5M20 7l-4 5 4 5"></path></svg>,
  FlipV: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M7 4l5 4 5-4M7 20l5-4 5 4"></path></svg>,
  Layout: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>,
  Reorder: () => (
    // 圖層排序觸發：三層堆疊矩形，最上層最明顯（代表圖層面板）
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="14" width="18" height="5" rx="1.5"/>
      <rect x="3" y="8" width="18" height="5" rx="1.5"/>
      <rect x="3" y="2" width="18" height="5" rx="1.5"/>
    </svg>
  ),
  Export: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
  ),
  Import: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line>
    </svg>
  ),
  Search: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
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
        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors group
            ${disabled ? 'text-gray-300 bg-transparent cursor-not-allowed' : 'hover:bg-[#F5F5F7]'}
            ${destructive && !disabled ? 'text-red-500 hover:bg-red-50' : 'text-[#1D1D1F]'}
        `}
    >
        {icon && <span className={`${destructive ? 'text-red-500' : 'text-[#86868B] group-hover:text-[#1D1D1F]'} transition-colors`}>{icon}</span>}
        <span>{children}</span>
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
    isGrouped,
    isLocked,
    isVisible
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [colorSubMenuVisible, setColorSubMenuVisible] = useState(false);
    const [frameSubMenuVisible, setFrameSubMenuVisible] = useState(false);
    const [layerOrderSubMenuVisible, setLayerOrderSubMenuVisible] = useState(false);
    const [layoutSubMenuVisible, setLayoutSubMenuVisible] = useState(false);

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
    
    const handleColorSubMenu = (e: React.MouseEvent) => {
        if (!canChangeColor) return;
        e.stopPropagation();
        setColorSubMenuVisible(true);
        setFrameSubMenuVisible(false);
    };

    const handleFrameSubMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        setFrameSubMenuVisible(true);
        setColorSubMenuVisible(false);
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
            className="w-64 rounded-2xl bg-white/90 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-white/50 py-2 ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
        >
            {menuData.elementId ? (
                // Element Menu
                elementType === 'artboard' ? (
                    <>
                        <div className="px-4 py-1.5 text-[10px] font-bold text-[#86868B] uppercase tracking-wider opacity-60">工作區域</div>
                        <MenuItem
                            icon={isLocked ? <MenuIcons.Unlock /> : <MenuIcons.Lock />}
                            onClick={() => handleAction(() => actions.toggleLock(menuData.elementId!))}
                        >
                            {isLocked ? '解鎖工作區域' : '鎖定工作區域'}
                        </MenuItem>
                        <div className="border-t my-1 border-gray-100/50" />
                        <MenuItem
                            icon={<MenuIcons.Export />}
                            onClick={() => handleAction(() => actions.exportArtboard(menuData.elementId!))}
                        >
                            匯出工作區域
                        </MenuItem>
                        <div className="border-t my-1 border-gray-100/50" />
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
                        <div className="px-4 py-1.5 text-[10px] font-bold text-[#86868B] uppercase tracking-wider opacity-60">編輯</div>
                        <MenuItem icon={<MenuIcons.Unlock />} onClick={() => handleAction(() => actions.toggleLock(menuData.elementId!))}>
                            解鎖物件
                        </MenuItem>
                    </>
                ) : (
                    <>
                        <div className="px-4 py-1.5 text-[10px] font-bold text-[#86868B] uppercase tracking-wider opacity-60">編輯</div>

                        {/* Locking & Visibility */}
                        <MenuItem icon={isLocked ? <MenuIcons.Unlock /> : <MenuIcons.Lock />} onClick={() => handleAction(() => actions.toggleLock(menuData.elementId!))}>
                            {isLocked ? '解鎖物件' : '鎖定物件'}
                        </MenuItem>
                        <MenuItem icon={isVisible ? <MenuIcons.EyeOff /> : <MenuIcons.Eye />} onClick={() => handleAction(() => actions.toggleVisibility(menuData.elementId!))}>
                            {isVisible ? '隱藏物件' : '顯示物件'}
                        </MenuItem>

                        {/* Grouping / Merging */}
                        {selectionCount > 1 && (
                            <>
                                <MenuItem icon={<MenuIcons.Group />} onClick={() => handleAction(actions.group)}>
                                    建立群組 (Group)
                                </MenuItem>
                                <MenuItem icon={<MenuIcons.Merge />} onClick={() => handleAction(actions.mergeLayers)}>
                                    合併圖層 (Merge Layers)
                                </MenuItem>
                            </>
                        )}
                        {isGrouped && (
                            <MenuItem icon={<MenuIcons.Ungroup />} onClick={() => handleAction(actions.ungroup)}>
                                解散群組 (Ungroup)
                            </MenuItem>
                        )}

                        <div className="border-t my-1 border-gray-100/50" />

                        {elementType === 'text' && (
                             <>
                                <MenuItem icon={<MenuIcons.Magic />} onClick={() => handleAction(() => actions.rasterizeText(menuData.elementId!))}>
                                    轉換為圖片 (Rasterize)
                                </MenuItem>
                                <div className="border-t my-1 border-gray-100/50" />
                            </>
                        )}

                        {elementType === 'shape' && (
                             <>
                                <MenuItem icon={<MenuIcons.Magic />} onClick={() => handleAction(() => actions.rasterizeShape(menuData.elementId!))}>
                                    轉換為圖片 (Rasterize)
                                </MenuItem>
                                <div className="border-t my-1 border-gray-100/50" />
                            </>
                        )}

                        {elementType === 'arrow' && (
                             <>
                                <MenuItem icon={<MenuIcons.Magic />} onClick={() => handleAction(() => actions.rasterizeArrow(menuData.elementId!))}>
                                    轉換為圖片 (Rasterize)
                                </MenuItem>
                                <div className="border-t my-1 border-gray-100/50" />
                            </>
                        )}

                        {elementType === 'image' && (
                             <>
                                {/* 佈局 submenu */}
                                <div className="relative" onMouseLeave={() => setLayoutSubMenuVisible(false)}>
                                    <button
                                        onMouseEnter={() => { setLayoutSubMenuVisible(true); setLayerOrderSubMenuVisible(false); setColorSubMenuVisible(false); setFrameSubMenuVisible(false); }}
                                        className="w-full flex justify-between items-center text-left px-4 py-2.5 text-sm text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-[#86868B] group-hover:text-[#1D1D1F] transition-colors"><MenuIcons.Layout /></span>
                                            <span>佈局</span>
                                        </div>
                                        <span className="text-xs text-[#86868B]">▶</span>
                                    </button>
                                    {layoutSubMenuVisible && (
                                        <div style={subMenuStyle} className="w-44 rounded-2xl bg-white/90 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-white/50 py-2 ring-1 ring-black/5">
                                            <MenuItem icon={<MenuIcons.FlipH />} onClick={() => handleAction(() => actions.flipHorizontal(menuData.elementId!))}>水平翻轉</MenuItem>
                                            <MenuItem icon={<MenuIcons.FlipV />} onClick={() => handleAction(() => actions.flipVertical(menuData.elementId!))}>垂直翻轉</MenuItem>
                                        </div>
                                    )}
                                </div>
                                <div className="border-t my-1 border-gray-100/50" />
                                <MenuItem icon={<MenuIcons.Search />} onClick={() => handleAction(() => actions.extractPrompt(menuData.elementId!))}>
                                    提取提示詞
                                </MenuItem>
                                <MenuItem icon={<MenuIcons.Magic />} onClick={() => handleAction(() => actions.copyStyle(menuData.elementId!))}>
                                    複製風格
                                </MenuItem>
                                <MenuItem
                                    icon={<MenuIcons.Paste />}
                                    onClick={() => handleAction(() => actions.pasteStyle([menuData.elementId!]))}
                                    disabled={!hasCopiedStyle}
                                >
                                    貼上風格 (Paste Style)
                                </MenuItem>
                                <div className="border-t my-1 border-gray-100/50" />
                                <MenuItem icon={<MenuIcons.Edit />} onClick={() => handleAction(() => actions.startImageEdit(menuData.elementId!))}>
                                    局部重繪與圖片編輯
                                </MenuItem>
                                <MenuItem icon={<MenuIcons.Expand />} onClick={() => handleAction(() => actions.startOutpainting(menuData.elementId!))}>
                                    擴展圖片 (Outpainting)
                                </MenuItem>
                                 <div className="border-t my-1 border-gray-100/50" />
                            </>
                        )}
                        
                        {elementType === 'drawing' && (
                             <>
                                <MenuItem icon={<MenuIcons.Edit />} onClick={() => handleAction(() => actions.editDrawing(menuData.elementId!))}>
                                    編輯手繪
                                </MenuItem>
                                 <div className="border-t my-1 border-gray-100/50" />
                            </>
                        )}
                        
                        {(elementType === 'image' || elementType === 'drawing') && (
                            <>
                                <MenuItem icon={<MenuIcons.Download />} onClick={() => handleAction(() => actions.downloadImage(menuData.elementId!))}>
                                    下載圖片
                                </MenuItem>
                                <div className="border-t my-1 border-gray-100/50" />
                            </>
                        )}
                        
                        {canChangeColor && (
                            <>
                                <div className="relative" onMouseLeave={() => setColorSubMenuVisible(false)}>
                                    <button
                                        onMouseEnter={handleColorSubMenu}
                                        className="w-full flex justify-between items-center text-left px-4 py-2.5 text-sm text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-[#86868B] group-hover:text-[#1D1D1F] transition-colors"><MenuIcons.Palette /></span>
                                            <span>變更顏色</span>
                                        </div>
                                        <span className="text-xs text-[#86868B]">▶</span>
                                    </button>
                                    {colorSubMenuVisible && (
                                        <div 
                                            style={subMenuStyle}
                                            className="w-52 rounded-2xl bg-white/90 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-white/50 py-2 ring-1 ring-black/5"
                                        >
                                            <div className="p-3 grid grid-cols-4 gap-2">
                                                {COLORS.map(color => (
                                                    <button
                                                        key={color.name}
                                                        onClick={() => handleAction(() => actions.changeColor(color.bg))}
                                                        className={`w-8 h-8 rounded-full ${color.bg} border-2 border-white ring-1 ring-black/5 shadow-sm hover:scale-110 transition-transform`}
                                                        aria-label={`變更顏色為 ${color.name}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="border-t my-1 border-gray-100/50" />
                            </>
                        )}
                        
                        <div className="px-4 py-1.5 text-[10px] font-bold text-[#86868B] uppercase tracking-wider opacity-60">圖層與整理</div>
                        {/* 圖層排序 submenu */}
                        <div className="relative" onMouseLeave={() => setLayerOrderSubMenuVisible(false)}>
                            <button
                                onMouseEnter={() => { setLayerOrderSubMenuVisible(true); setLayoutSubMenuVisible(false); setColorSubMenuVisible(false); setFrameSubMenuVisible(false); }}
                                className="w-full flex justify-between items-center text-left px-4 py-2.5 text-sm text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-[#86868B] group-hover:text-[#1D1D1F] transition-colors"><MenuIcons.Reorder /></span>
                                    <span>圖層排序</span>
                                </div>
                                <span className="text-xs text-[#86868B]">▶</span>
                            </button>
                            {layerOrderSubMenuVisible && (
                                <div style={subMenuStyle} className="w-44 rounded-2xl bg-white/90 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-white/50 py-2 ring-1 ring-black/5">
                                    <MenuItem icon={<MenuIcons.LayerUp />} onClick={() => handleAction(actions.bringToFront)}>移至最前</MenuItem>
                                    <MenuItem icon={<MenuIcons.LayerUpOne />} onClick={() => handleAction(actions.bringForward)}>前移一層</MenuItem>
                                    <MenuItem icon={<MenuIcons.LayerDownOne />} onClick={() => handleAction(actions.sendBackward)}>後移一層</MenuItem>
                                    <MenuItem icon={<MenuIcons.LayerDown />} onClick={() => handleAction(actions.sendToBack)}>移至最後</MenuItem>
                                </div>
                            )}
                        </div>
                        <div className="border-t my-1 border-gray-100/50" />
                        <MenuItem icon={<MenuIcons.Trash />} onClick={() => handleAction(actions.deleteElement)} destructive>刪除</MenuItem>
                    </>
                )
            ) : (
                // Canvas Menu
                <>
                    <div className="px-4 py-1.5 text-[10px] font-bold text-[#86868B] uppercase tracking-wider opacity-60">新增</div>
                    <MenuItem icon={<MenuIcons.Note />} onClick={() => handleAction(() => actions.addNote(menuData.worldPoint))}>新增便利貼</MenuItem>
                    <MenuItem icon={<MenuIcons.Text />} onClick={() => handleAction(() => actions.addText(menuData.worldPoint))}>新增文字</MenuItem>
                    <MenuItem icon={<MenuIcons.Arrow />} onClick={() => handleAction(() => actions.addArrow(menuData.worldPoint))}>新增箭頭</MenuItem>
                    <MenuItem icon={<MenuIcons.Draw />} onClick={() => handleAction(() => actions.addDrawing(menuData.worldPoint))}>新增手繪</MenuItem>
                    <div className="border-t my-1 border-gray-100/50" />
                    <MenuItem icon={<MenuIcons.Image />} onClick={() => handleAction(() => actions.addImage(menuData.worldPoint))}>新增圖片</MenuItem>
                    
                     <div className="relative" onMouseLeave={() => setFrameSubMenuVisible(false)}>
                        <button
                            onMouseEnter={handleFrameSubMenu}
                            className="w-full flex justify-between items-center text-left px-4 py-2.5 text-sm text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-[#86868B] group-hover:text-[#1D1D1F] transition-colors"><MenuIcons.Frame /></span>
                                <span>新增畫框</span>
                            </div>
                            <span className="text-xs text-[#86868B]">▶</span>
                        </button>
                        {frameSubMenuVisible && (
                            <div 
                                style={subMenuStyle}
                                className="w-48 rounded-2xl bg-white/90 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-white/50 py-2 ring-1 ring-black/5"
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

                    <div className="border-t my-1 border-gray-100/50" />
                    <div className="px-4 py-1.5 text-[10px] font-bold text-[#86868B] uppercase tracking-wider opacity-60">圖層管理</div>
                    <MenuItem icon={<MenuIcons.UnlockAll />} onClick={() => handleAction(actions.unlockAll)}>全部解除鎖定</MenuItem>
                    <MenuItem icon={<MenuIcons.ShowAll />} onClick={() => handleAction(actions.showAll)}>顯示全部物件</MenuItem>

                    <div className="border-t my-1 border-gray-100/50" />

                    <MenuItem icon={<MenuIcons.Export />} onClick={() => handleAction(actions.exportCanvas)}>匯出畫布</MenuItem>
                    <MenuItem icon={<MenuIcons.Import />} onClick={() => handleAction(actions.importCanvas)}>匯入畫布</MenuItem>
                </>
            )}
        </div>
    );
};
