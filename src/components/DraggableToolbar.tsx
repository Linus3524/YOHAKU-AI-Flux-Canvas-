
import React, { useState, useRef, useEffect } from 'react';
import type { ShapeType, ArrowElement, Point, CanvasElement } from '../types';
import { getPresetsByGroup, ArtboardPreset } from '../features/artboard/presets';

interface DraggableToolbarProps {
  onAddNote: () => void;
  onAddText: () => void;
  onAddArrow: (config?: Partial<ArrowElement>) => void;
  onAddDrawing: () => void;
  onAddImage: () => void;
  onAddFrame: (ratioLabel: string, ratioValue: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onDuplicate: () => void;
  onOpenStyleLibrary: () => void;
  hasSelection: boolean;
  selectedElement?: CanvasElement;
  isProcessing: boolean;
  onCrop: () => void;
  canCrop: boolean;
  interactionMode: 'select' | 'hand';
  onSetInteractionMode: (mode: 'select' | 'hand') => void;
  onSelectShapeTool: (shapeType: ShapeType) => void;
  onExportCanvas: () => void;
  onImportCanvas: () => void;
  onAddArtboard: (preset: ArtboardPreset) => void;
}

// Icons (Apple Style - Minimalist Thin Stroke 1.5px, Neutral Gray)
const Icons = {
  Grip: () => (
    <svg width="6" height="14" viewBox="0 0 6 14" fill="currentColor" className="text-black/10">
      <circle cx="1" cy="1" r="1"/>
      <circle cx="1" cy="7" r="1"/>
      <circle cx="1" cy="13" r="1"/>
      <circle cx="5" cy="1" r="1"/>
      <circle cx="5" cy="7" r="1"/>
      <circle cx="5" cy="13" r="1"/>
    </svg>
  ),
  Select: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path><path d="M13 13l6 6"></path>
    </svg>
  ),
  Hand: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"></path><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"></path><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"></path><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"></path>
    </svg>
  ),
  Note: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  ),
  Text: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 4 4 20 4 20 7"></polyline>
      <line x1="9" y1="20" x2="15" y2="20"></line>
      <line x1="12" y1="4" x2="12" y2="20"></line>
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
  Shape: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
    </svg>
  ),
  Add: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  ),
  Image: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  ),
  Frame: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeDasharray="4 4"></rect>
      <line x1="12" y1="8" x2="12" y2="16"></line>
      <line x1="8" y1="12" x2="16" y2="12"></line>
    </svg>
  ),
  Copy: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  ),
  Undo: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6"/>
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
    </svg>
  ),
  Redo: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7v6h-6"/>
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>
    </svg>
  ),
  Magic: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
  Crop: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  ),
  Patterns: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l10 7-3.5 13H5.5L2 9z"/>
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
  )
};

const ASPECT_RATIOS = [
  { label: '1:1', value: 1 },
  { label: '3:4', value: 3/4 },
  { label: '4:3', value: 4/3 },
  { label: '9:16', value: 9/16 },
  { label: '16:9', value: 16/9 },
];

const SHAPES = [
    { type: 'rectangle', label: '矩形', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg> },
    { type: 'circle', label: '圓形', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg> },
    { type: 'triangle', label: '三角形', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 22h20L12 2z"/></svg> },
    { type: 'pentagon', label: '五角形', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l10 7-3.5 13H5.5L2 9z"/></svg> },
    { type: 'hexagon', label: '六角形', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l9 5v10l-9 5-9-5V7z"/></svg> },
    { type: 'star', label: '星形', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> },
    { type: 'heart', label: '心形', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21.35C12 21.35 22 13 22 8.5C22 5.42 19.58 3 16.5 3C14.76 3 13.09 3.81 12 5.09C10.91 3.81 9.24 3 7.5 3C4.42 3 2 5.42 2 8.5C2 13 12 21.35 12 21.35Z"/></svg> },
    { type: 'rounded_rect', label: '圓角矩形', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" ry="5"/></svg> },
];

export const DraggableToolbar: React.FC<DraggableToolbarProps> = ({
  onAddNote,
  onAddText,
  onAddArrow,
  onAddDrawing,
  onAddImage,
  onAddFrame,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onDuplicate,
  onOpenStyleLibrary,
  hasSelection,
  selectedElement,
  isProcessing,
  onCrop,
  canCrop,
  interactionMode,
  onSetInteractionMode,
  onSelectShapeTool,
  onExportCanvas,
  onImportCanvas,
  onAddArtboard
}) => {
  // Initialize at bottom center
  const [position, setPosition] = useState(() => ({
    x: window.innerWidth / 2 - 310,
    y: window.innerHeight - 100
  }));

  // Mount 後量測實際寬度，精確水平置中
  useEffect(() => {
    if (toolbarRef.current) {
      const w = toolbarRef.current.offsetWidth;
      setPosition(prev => ({ ...prev, x: window.innerWidth / 2 - w / 2 }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isDragging, setIsDragging] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showPatternsMenu, setShowPatternsMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'社群媒體' | '網頁' | '印刷'>('社群媒體');
  const offsetRef = useRef({ x: 0, y: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const patternsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node) && 
          toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setShowAddMenu(false);
      }
      if (patternsMenuRef.current && !patternsMenuRef.current.contains(event.target as Node) && 
          toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setShowPatternsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ensure toolbar stays within bounds on resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => {
        const width = toolbarRef.current?.offsetWidth || 620;
        const height = toolbarRef.current?.offsetHeight || 80;
        const maxX = window.innerWidth - width - 20;
        const maxY = window.innerHeight - height - 20;
        return {
          x: Math.min(Math.max(20, prev.x), maxX),
          y: Math.min(Math.max(20, prev.y), maxY)
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.no-drag')) return;
    
    setIsDragging(true);
    offsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();

      let newX = e.clientX - offsetRef.current.x;
      let newY = e.clientY - offsetRef.current.y;
      
      const width = toolbarRef.current?.offsetWidth || 620;
      const height = toolbarRef.current?.offsetHeight || 80;
      const padding = 20;

      newX = Math.max(padding, Math.min(newX, window.innerWidth - width - padding));
      newY = Math.max(padding, Math.min(newY, window.innerHeight - height - padding));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleAddMenuClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowAddMenu(!showAddMenu);
      setShowPatternsMenu(false);
  };

  const handlePatternsMenuClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowPatternsMenu(!showPatternsMenu);
      setShowAddMenu(false);
  };

  return (
    <div
      ref={toolbarRef}
      style={{ 
        left: position.x, 
        top: position.y,
        touchAction: 'none'
      }}
      onMouseDown={handleMouseDown}
      className={`
        fixed z-[999] flex items-center gap-2 px-2 py-2
        bg-white/80 backdrop-blur-xl
        rounded-full
        border border-white/50
        shadow-[0_8px_32px_rgba(0,0,0,0.12)]
        select-none
        ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
      `}
    >
      {/* Grip Handle */}
      <div className="pl-3 pr-1 cursor-grab flex items-center justify-center opacity-40 hover:opacity-80 transition-opacity">
        <Icons.Grip />
      </div>

      {/* Interaction Mode Switcher */}
      <div className="flex bg-black/5 rounded-2xl p-1 gap-1">
          <ToolButton 
            onClick={() => onSetInteractionMode('select')} 
            icon={<Icons.Select />} 
            label="選取" 
            active={interactionMode === 'select'}
          />
          <ToolButton 
            onClick={() => onSetInteractionMode('hand')} 
            icon={<Icons.Hand />} 
            label="抓手" 
            active={interactionMode === 'hand'}
          />
      </div>

      <div className="w-px h-8 bg-black/5 mx-1" />

      {/* Creation Tools */}
      <ToolButton onClick={onAddNote} icon={<Icons.Note />} label="便利貼" />
      <ToolButton onClick={onAddText} icon={<Icons.Text />} label="文字" />
      <ToolButton onClick={onAddDrawing} icon={<Icons.Draw />} label="手繪" />
      
      <div className="relative no-drag">
          <ToolButton 
            onClick={handlePatternsMenuClick} 
            icon={<Icons.Patterns />} 
            label="圖案" 
            active={showPatternsMenu}
          />
          {showPatternsMenu && (
              <div 
                ref={patternsMenuRef}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-72 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-white/50 p-3 flex flex-col gap-3 animate-fade-in-up origin-bottom"
              >
                  {/* Lines Section */}
                  <div>
                      <span className="text-[10px] font-bold text-yohaku-text-muted uppercase tracking-wider pl-1 mb-1 block">線條 (Lines)</span>
                      <div className="grid grid-cols-3 gap-1">
                          <button
                            onClick={() => { onAddArrow({ startArrowhead: 'none', endArrowhead: 'none' }); setShowPatternsMenu(false); }}
                            className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-gray-100 transition-colors gap-1"
                            title="直線"
                          >
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="12" x2="20" y2="12" /></svg>
                              <span className="text-[9px] font-medium opacity-70">直線</span>
                          </button>
                          <button
                            onClick={() => { onAddArrow({ startArrowhead: 'none', endArrowhead: 'triangle' }); setShowPatternsMenu(false); }}
                            className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-gray-100 transition-colors gap-1"
                            title="箭頭"
                          >
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="12" x2="20" y2="12" /><polyline points="16 8 20 12 16 16" /></svg>
                              <span className="text-[9px] font-medium opacity-70">箭頭</span>
                          </button>
                          <button
                            onClick={() => { onAddArrow({ startArrowhead: 'triangle', endArrowhead: 'triangle' }); setShowPatternsMenu(false); }}
                            className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-gray-100 transition-colors gap-1"
                            title="雙向箭頭"
                          >
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="12" x2="20" y2="12" /><polyline points="8 8 4 12 8 16" /><polyline points="16 8 20 12 16 16" /></svg>
                              <span className="text-[9px] font-medium opacity-70">雙向</span>
                          </button>
                      </div>
                  </div>

                  <div className="h-px bg-gray-100 w-full" />

                  {/* Shapes Section */}
                  <div>
                      <span className="text-[10px] font-bold text-yohaku-text-muted uppercase tracking-wider pl-1 mb-1 block">形狀 (Shapes)</span>
                      <div className="grid grid-cols-4 gap-1">
                        {SHAPES.map((shape) => (
                            <button
                                key={shape.type}
                                onClick={() => { onSelectShapeTool(shape.type as ShapeType); setShowPatternsMenu(false); }}
                                className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-gray-100 transition-colors gap-1 text-yohaku-text-main"
                                title={shape.label}
                            >
                                <div className="scale-75">{shape.icon}</div>
                                <span className="text-[9px] font-medium opacity-70">{shape.label}</span>
                            </button>
                        ))}
                      </div>
                  </div>
              </div>
          )}
      </div>

      <div className="relative no-drag">
          <ToolButton 
            onClick={handleAddMenuClick} 
            icon={<Icons.Add />} 
            label="新增" 
            active={showAddMenu}
          />
          
          {/* Add Menu Popover */}
          {showAddMenu && (
            <div 
                ref={addMenuRef}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-[320px] bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.1)] p-4 flex flex-col animate-fade-in-up origin-bottom max-h-[70vh] overflow-y-auto"
            >
                {/* 新增畫框 */}
                <div className="text-[10px] font-semibold text-yohaku-text-muted uppercase tracking-[0.06em] mb-2">新增畫框</div>
                <div className="grid grid-cols-3 gap-1.5 mb-0">
                    {ASPECT_RATIOS.map(ratio => (
                        <button
                            key={ratio.label}
                            onClick={() => { onAddFrame(ratio.label, ratio.value); setShowAddMenu(false); }}
                            className="border-[1.5px] border-dashed border-[#c0c0c0] rounded-xl py-2 px-1.5 cursor-pointer text-center flex flex-col items-center gap-1 bg-[#fafafa] hover:border-purple-400 hover:bg-purple-50 transition-colors"
                        >
                            <div 
                                className="border-2 border-dashed border-gray-300 rounded-sm"
                                style={{ 
                                    width: ratio.value >= 1 ? '16px' : `${16 * ratio.value}px`,
                                    height: ratio.value >= 1 ? `${16 / ratio.value}px` : '16px'
                                }}
                            />
                            <div className="text-xs font-semibold text-yohaku-text-main">{ratio.label}</div>
                        </button>
                    ))}
                </div>

                <div className="h-px bg-[#f0f0f0] my-3" />

                {/* 工作區域 Tab */}
                <div className="text-[10px] font-semibold text-yohaku-text-muted uppercase tracking-[0.06em] mb-2">工作區域</div>
                <div className="flex gap-[3px] bg-yohaku-bg-main rounded-lg p-[3px] mb-2.5">
                    {Object.keys(getPresetsByGroup()).filter(g => g !== '自訂').map(group => (
                        <button
                            key={group}
                            onClick={() => setActiveTab(group as any)}
                            className={`flex-1 py-1.5 px-1 rounded-md text-[11px] font-medium text-center cursor-pointer transition-all ${activeTab === group ? 'bg-white text-yohaku-text-main shadow-[0_1px_3px_rgba(0,0,0,0.1)]' : 'text-yohaku-text-muted hover:text-yohaku-text-main'}`}
                        >
                            {group}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                    {getPresetsByGroup()[activeTab]?.map(preset => (
                        <button
                            key={preset.name}
                            onClick={() => { onAddArtboard(preset); setShowAddMenu(false); }}
                            className="border border-[#e8e8e8] rounded-xl py-2 px-2.5 text-[11px] text-yohaku-text-main bg-[#fafafa] cursor-pointer text-center hover:bg-gray-100 transition-colors"
                        >
                            <div className="font-medium text-xs truncate">{preset.name}</div>
                            <div className="text-[10px] text-yohaku-text-muted mt-0.5">{preset.w} × {preset.h}</div>
                        </button>
                    ))}
                    {getPresetsByGroup()['自訂']?.map(preset => (
                        <button
                            key={preset.name}
                            onClick={() => { onAddArtboard(preset); setShowAddMenu(false); }}
                            className="border-[1.5px] border-dashed border-yohaku-accent rounded-xl py-2 px-2.5 text-[11px] text-yohaku-accent bg-[#f0f7ff] cursor-pointer text-center hover:bg-blue-50 transition-colors"
                        >
                            <div className="font-medium text-xs">{preset.name}</div>
                            <div className="text-[10px] mt-0.5">輸入寬 × 高</div>
                        </button>
                    ))}
                </div>

                <div className="h-px bg-[#f0f0f0] my-3" />

                {/* 匯出匯入 */}
                <div className="flex gap-2 mt-0">
                    <button 
                        onClick={() => { onExportCanvas(); setShowAddMenu(false); }}
                        className="flex-1 p-2 rounded-xl text-xs font-medium border border-[#e8e8e8] bg-[#fafafa] text-yohaku-text-main text-center cursor-pointer flex items-center justify-center gap-1.5 hover:bg-gray-100 transition-colors"
                    >
                        <Icons.Export />
                        匯出畫布
                    </button>
                    <button 
                        onClick={() => { onImportCanvas(); setShowAddMenu(false); }}
                        className="flex-1 p-2 rounded-xl text-xs font-medium border border-[#e8e8e8] bg-[#fafafa] text-yohaku-text-main text-center cursor-pointer flex items-center justify-center gap-1.5 hover:bg-gray-100 transition-colors"
                    >
                        <Icons.Import />
                        匯入畫布
                    </button>
                </div>
            </div>
          )}
      </div>

      <div className="w-px h-8 bg-black/5 mx-1" />
      
      {/* Duplicate Tool */}
      <ToolButton onClick={onDuplicate} icon={<Icons.Copy />} label="複製" disabled={!hasSelection} />

      <div className="w-px h-8 bg-black/5 mx-1" />

      {/* History Controls */}
      <ToolButton onClick={onUndo} icon={<Icons.Undo />} label="復原" disabled={!canUndo} />
      <ToolButton onClick={onRedo} icon={<Icons.Redo />} label="重做" disabled={!canRedo} />
      
      <div className="w-px h-8 bg-black/5 mx-1" />

      {/* Crop Tool */}
      <ToolButton onClick={onCrop} icon={<Icons.Crop />} label="裁剪" disabled={!canCrop} />

      <div className="w-px h-8 bg-black/5 mx-1" />

      {/* Magic Button - Integrated Style */}
      {selectedElement?.type !== 'artboard' && (
        <button
          onClick={(e) => {
              e.stopPropagation(); 
              onOpenStyleLibrary();
          }}
          disabled={isProcessing}
          className={`
              group flex flex-col items-center justify-center gap-1.5 px-4 py-2 rounded-2xl transition-all duration-200
              ${isProcessing 
                  ? 'opacity-50 cursor-wait' 
                  : 'hover:bg-purple-50 active:scale-95'}
          `}
        >
          <div className={`
              flex items-center justify-center w-5 h-5 transition-all
              ${isProcessing ? 'animate-spin border-2 border-[#AF52DE] border-t-transparent rounded-full' : 'text-[#AF52DE]'}
          `}>
                {!isProcessing && <Icons.Magic />}
          </div>
          <span className={`text-[10px] font-medium leading-none tracking-tight ${isProcessing ? 'text-gray-400' : 'text-yohaku-text-muted group-hover:text-[#AF52DE]'}`}>
              Magic
          </span>
        </button>
      )}

    </div>
  );
};

const ToolButton: React.FC<{ onClick: (e: React.MouseEvent) => void; icon: React.ReactNode; label: string; disabled?: boolean; active?: boolean }> = ({ onClick, icon, label, disabled, active }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      flex flex-col items-center justify-center gap-1.5 px-4 py-2 rounded-2xl transition-all duration-200
      ${disabled 
        ? 'opacity-30 cursor-not-allowed' 
        : active 
            ? 'bg-black text-white shadow-lg shadow-black/20'
            : 'hover:bg-black/5 text-yohaku-text-muted hover:text-yohaku-text-main active:scale-95'}
      min-w-[60px]
    `}
  >
    <div className="text-current">{icon}</div>
    <span className="text-[10px] font-medium tracking-tight leading-none text-current">{label}</span>
  </button>
);
