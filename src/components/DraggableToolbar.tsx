
import React, { useState, useRef, useEffect } from 'react';
import type { ShapeType, ArrowElement, Point, CanvasElement } from '../types';
import { getPresetsByGroup, ArtboardPreset } from '../features/artboard/presets';
import { Icon } from './Icon';
import { Plus, Copy, Undo, Redo, Crop, Save, FolderOpen, SaveAll } from 'lucide-react';

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
  onSaveFile?: () => void;
  onSaveAsFile?: () => void;
  onOpenFile?: () => void;
  currentFileName?: string | null;
  isFileSystemSupported?: boolean;
  onAddArtboard: (preset: ArtboardPreset) => void;
  generationModel?: string;
  onSetGenerationModel?: (model: string) => void;
  hasAtlasKey?: boolean;
}

const Icons = {
  Grip:     () => <Icon name="drag_indicator" size={18} className="text-black/20" />,
  Select:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M12.586 12.586 19 19"/><path d="M3.688 3.037a.497.497 0 0 0-.651.651l6.5 15.999a.501.501 0 0 0 .947-.062l1.569-6.083a2 2 0 0 1 1.448-1.479l6.124-1.579a.5.5 0 0 0 .063-.947z"/></svg>,
  Hand:     () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>,
  Note:     () => <Icon name="note_stack_add" size={20} />,
  Text:     () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M12 4v16"/><path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2"/><path d="M9 20h6"/></svg>,
  Draw:     () => <Icon name="draw" size={20} />,
  Arrow:    () => <Icon name="trending_flat" size={20} />,
  Shape:    () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11 13.5v8H3v-8h8zm9.5.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zM10 15H4v5h6v-5zm11 .5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM15 2l4.5 7.5H10.5L15 2zm-5 1H2V11h8V3zm6.5.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM9 4H3v6h6V4zm7.5.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM15 4.4 12.27 9h5.46L15 4.4z"/></svg>,
  Add:      () => <Plus size={18} strokeWidth={1.75} />,
  Image:    () => <Icon name="image" size={20} />,
  Frame:    () => <Icon name="crop_free" size={20} />,
  Copy:     () => <Copy size={18} strokeWidth={1.75} />,
  Undo:     () => <Undo size={18} strokeWidth={1.75} />,
  Redo:     () => <Redo size={18} strokeWidth={1.75} />,
  Magic:    () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"/></svg>,
  Crop:     () => <Crop size={18} strokeWidth={1.75} />,
  Patterns: () => <Icon name="shapes" size={20} />,
  Export:   () => <Save size={18} strokeWidth={1.75} />,
  Import:   () => <FolderOpen size={18} strokeWidth={1.75} />,
  SaveAs:   () => <SaveAll size={18} strokeWidth={1.75} />,
};

const ASPECT_RATIOS = [
  { label: '1:1', value: 1 },
  { label: '4:5', value: 4/5 },
  { label: '3:4', value: 3/4 },
  { label: '4:3', value: 4/3 },
  { label: '9:16', value: 9/16 },
  { label: '16:9', value: 16/9 },
];

const SHAPES = [
    { type: 'rectangle', label: '矩形', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg> },
    { type: 'circle', label: '圓形', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg> },
    { type: 'triangle', label: '三角形', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 22h20L12 2z"/></svg> },
    { type: 'pentagon', label: '五角形', icon: <Icon name="pentagon" size={20} /> },
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
  onSaveFile,
  onSaveAsFile,
  onOpenFile,
  currentFileName,
  isFileSystemSupported = false,
  onAddArtboard,
  generationModel = 'gemini',
  onSetGenerationModel,
  hasAtlasKey = false,
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
  const [showModelMenu, setShowModelMenu] = useState(false);
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
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setShowModelMenu(false);
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
        fixed z-[999] flex items-center gap-0.5 px-1 py-1
        bg-white/80 backdrop-blur-xl
        rounded-full
        border border-white/50
        shadow-[0_8px_32px_rgba(0,0,0,0.12)]
        select-none
        ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
      `}
    >
      {/* Grip Handle */}
      <div className="pl-2 pr-0.5 cursor-grab flex items-center justify-center opacity-40 hover:opacity-80 transition-opacity">
        <Icons.Grip />
      </div>

      {/* Interaction Mode Switcher */}
      <div className="flex items-center bg-[#F5F5F7] rounded-full p-0.5 gap-0.5">
          {([
            { mode: 'select', label: '選取', Icon: Icons.Select },
            { mode: 'hand',   label: '抓手', Icon: Icons.Hand   },
          ] as const).map(({ mode, label, Icon }) => (
            <div key={mode} className="relative group">
              <button
                onClick={() => onSetInteractionMode(mode)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${interactionMode === mode ? 'bg-[#1D1D1F] text-white shadow-md' : 'text-[#86868B] hover:text-[#1D1D1F]'}`}
              >
                <div className="w-[18px] h-[18px] flex items-center justify-center"><Icon /></div>
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900/90 text-white text-[11px] font-medium rounded-lg whitespace-nowrap pointer-events-none z-50 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                {label}
              </div>
            </div>
          ))}
      </div>

      <div className="w-px h-5 bg-black/5 ml-1" />

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
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4">
              <div
                ref={patternsMenuRef}
                className="w-72 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-white/50 p-3 flex flex-col gap-3 animate-fade-in-up origin-bottom"
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
                                className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-gray-100 transition-colors gap-1 text-yohaku-text-muted hover:text-yohaku-text-main"
                                title={shape.label}
                            >
                                <div className="scale-75">{shape.icon}</div>
                                <span className="text-[9px] font-medium opacity-70">{shape.label}</span>
                            </button>
                        ))}
                      </div>
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
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4">
            <div
                ref={addMenuRef}
                className="w-[320px] bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.1)] p-4 flex flex-col animate-fade-in-up origin-bottom max-h-[70vh] overflow-y-auto"
            >
                {/* 新增畫框 */}
                <div className="text-[10px] font-semibold text-yohaku-text-muted uppercase tracking-[0.06em] mb-2">新增畫框</div>
                <div className="grid grid-cols-3 gap-1.5 mb-0">
                    {ASPECT_RATIOS.map(ratio => (
                        <button
                            key={ratio.label}
                            onClick={() => { onAddFrame(ratio.label, ratio.value); setShowAddMenu(false); }}
                            className="border-[1.5px] border-dashed border-[#c0c0c0] rounded-xl py-2 px-1.5 cursor-pointer text-center flex flex-col items-center gap-1.5 bg-[#fafafa] hover:border-purple-400 hover:bg-purple-50 transition-colors"
                        >
                            {/* 固定高度容器，虛線方塊垂直置中，確保數字高度一致 */}
                            <div className="flex items-center justify-center" style={{ width: 24, height: 24 }}>
                                <div
                                    className="border-2 border-dashed border-gray-300 rounded-sm"
                                    style={{
                                        width:  ratio.value >= 1 ? 20 : Math.round(20 * ratio.value),
                                        height: ratio.value >= 1 ? Math.round(20 / ratio.value) : 20,
                                    }}
                                />
                            </div>
                            <div className="text-xs font-semibold text-yohaku-text-main leading-none">{ratio.label}</div>
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

                {/* 儲存 / 開啟 */}
                {isFileSystemSupported ? (
                    <>
                        {currentFileName && (
                            <div className="text-[10px] text-center text-yohaku-text-sub mb-2 truncate px-1">
                                📄 {currentFileName}
                            </div>
                        )}
                        <button
                            onClick={() => { onAddImage(); setShowAddMenu(false); }}
                            className="w-full mb-2 p-2 rounded-xl text-xs font-medium border border-[#e8e8e8] bg-[#fafafa] text-yohaku-text-main text-center cursor-pointer flex items-center justify-center gap-1.5 hover:bg-gray-100 transition-colors"
                        >
                            <Icons.Image />
                            新增圖片
                        </button>
                        <div className="flex gap-2">
                            <button
                                onClick={() => { onSaveFile?.(); setShowAddMenu(false); }}
                                className="flex-1 p-2 rounded-xl text-xs font-medium border border-[#e8e8e8] bg-[#fafafa] text-yohaku-text-main text-center cursor-pointer flex items-center justify-center gap-1 hover:bg-gray-100 transition-colors"
                            >
                                <Icons.Export />
                                {currentFileName ? '儲存' : '儲存'}
                            </button>
                            <button
                                onClick={() => { onOpenFile?.(); setShowAddMenu(false); }}
                                className="flex-1 p-2 rounded-xl text-xs font-medium border border-[#e8e8e8] bg-[#fafafa] text-yohaku-text-main text-center cursor-pointer flex items-center justify-center gap-1 hover:bg-gray-100 transition-colors"
                            >
                                <Icons.Import />
                                開啟
                            </button>
                            <button
                                onClick={() => { onSaveAsFile?.(); setShowAddMenu(false); }}
                                className="flex-1 p-2 rounded-xl text-xs font-medium border border-[#e8e8e8] bg-[#fafafa] text-yohaku-text-sub text-center cursor-pointer flex items-center justify-center gap-1 hover:bg-gray-100 transition-colors"
                            >
                                <Icons.SaveAs />
                                另存
                            </button>
                        </div>
                    </>
                ) : (
                    /* Fallback for unsupported browsers */
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
                )}
            </div>
            </div>
          )}
      </div>

      <div className="w-px h-5 bg-black/5 mx-0" />
      
      {/* Duplicate Tool */}
      <ToolButton onClick={onDuplicate} icon={<Icons.Copy />} label="複製" disabled={!hasSelection} />

      <div className="w-px h-5 bg-black/5 mx-0" />

      {/* History Controls */}
      <ToolButton onClick={onUndo} icon={<Icons.Undo />} label="復原" disabled={!canUndo} />
      <ToolButton onClick={onRedo} icon={<Icons.Redo />} label="重做" disabled={!canRedo} />
      
      <div className="w-px h-5 bg-black/5 mx-0" />

      {/* Crop Tool */}
      <ToolButton onClick={onCrop} icon={<Icons.Crop />} label="裁剪" disabled={!canCrop} />

      <div className="w-px h-5 bg-black/5 mx-0" />

      {/* Magic Button */}
      {selectedElement?.type !== 'artboard' && (
        <div className="relative group pr-1">
          <button
            onClick={(e) => {
                e.stopPropagation();
                onOpenStyleLibrary();
            }}
            disabled={isProcessing}
            className={`
                flex items-center justify-center p-1.5 rounded-lg transition-all duration-200
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
          </button>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900/90 text-white text-[11px] font-medium rounded-lg whitespace-nowrap pointer-events-none z-50 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
            Magic
          </div>
        </div>
      )}

    </div>
  );
};

const ToolButton: React.FC<{ onClick: (e: React.MouseEvent) => void; icon: React.ReactNode; label: string; disabled?: boolean; active?: boolean }> = ({ onClick, icon, label, disabled, active }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          flex items-center justify-center p-1.5 rounded-lg transition-all duration-200
          ${disabled
            ? 'opacity-30 cursor-not-allowed'
            : active
                ? 'bg-black text-white shadow-lg shadow-black/20'
                : 'hover:bg-black/5 text-yohaku-text-muted hover:text-yohaku-text-main active:scale-95'}
        `}
      >
        <div className="text-current flex items-center justify-center w-[18px] h-[18px] shrink-0">{icon}</div>
      </button>
      {show && !disabled && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900/90 text-white text-[11px] font-medium rounded-lg whitespace-nowrap pointer-events-none z-50 shadow-lg">
          {label}
        </div>
      )}
    </div>
  );
};
