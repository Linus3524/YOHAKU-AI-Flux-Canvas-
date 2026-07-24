// 設計大師面板 — 更加精緻的 iOS/macOS 玻璃質感介面，解決多重滾動條與按鈕沉重感
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { STYLE_PRESETS } from '../utils/helpers';
import { VISUAL_STYLE_TEMPLATES } from '../skills/styles';
import { DESIGN_MD_TEMPLATES } from '../skills/designs';
import { LAYOUT_DENSITY_TEMPLATES } from '../skills/layouts';
import { Icon } from './Icon';
import {
  SKILL_LIST,
  SkillType,
  buildSkillPrompt,
  SKILL_STYLE_KEYS,
} from '../skills';
import { UI_PLATFORMS, UI_RESOLUTIONS, resolveAspectFromResolution } from '../skills/uiWebpage';
import { optimizePrompt } from '../skills/promptOptimizer';
import type { NoteReferenceMode, NoteReferenceRole } from '../types';
import { NOTE_REFERENCE_LIMIT, NOTE_REFERENCE_ROLE_OPTIONS } from '../utils/noteReferences';
import { Smartphone, Tablet, Monitor, Globe } from 'lucide-react';

const generateCollectionItemPrompts = async (theme: string, count: number, apiKey: string): Promise<string[]> => {
  if (!apiKey) throw new Error('需要 API Key');
  const genAI = new GoogleGenAI({ apiKey });
  const prompt = `Generate exactly ${count} concise mini sticker subject ideas for one coherent sticker collection.
Theme: "${theme}".
Each line should describe one distinct mini sticker in 3-8 words.
Keep them visually related, concrete, and easy to draw.
Return ONLY the list of subjects, one per line. No numbering, no bullets, no extra text.`;

  const response = await genAI.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: prompt,
  });

  return (response.text || '')
    .split('\n')
    .map(line => line.replace(/^[-*\d.\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, count);
};

const PLATFORM_LUCIDE_ICONS: Record<string, React.ComponentType<any>> = {
  mobile: Smartphone,
  tablet: Tablet,
  pc: Monitor,
  browser: Globe,
};

interface DesignMasterPanelProps {
  noteContent: string;
  isGenerating: boolean;
  generationModel: string;
  hasAtlasKey: boolean;
  apiKey: string;
  showToast: (msg: string) => void;
  onGenerate: (prompt: string, count: 1 | 2 | 3 | 4, model: string, autoRemoveBg: boolean, aspect?: string, imageSize?: '1K' | '2K' | '4K', refStyleIndex?: number, refStyleScope?: 'all' | 'style-only', stickerDebgBorder?: boolean, customSeed?: number) => void;
  onClose: () => void;
  /** 便利貼本身的參考圖插槽（最多 8 張），讓所有 skill 模式都能用同一份參考圖生成 */
  referenceImages?: (string | null)[];
  onUpdateReferenceImages?: (refs: (string | null)[]) => void;
  referenceMode?: NoteReferenceMode;
  referenceRoles?: (NoteReferenceRole[] | null)[];
  referencePrimaryIndex?: number;
  onUpdateReferenceSettings?: (settings: {
    referenceMode?: NoteReferenceMode;
    referenceRoles?: (NoteReferenceRole[] | null)[];
    referencePrimaryIndex?: number;
  }) => void;
  /** 該便利貼上次的設計大師設定（重複進入同一張便利貼時還原；新便利貼為 undefined → 用預設） */
  initialState?: DesignMasterPersistState;
  /** 將目前設定回存（生成或關閉時呼叫），供下次進入同一張便利貼還原 */
  onPersistState?: (s: DesignMasterPersistState) => void;
  onGenerateBrandKit?: (brief: any, model: string, resolution: '1K' | '2K' | '4K') => void;
}

export interface DesignMasterPersistState {
  activeSkill: SkillType;
  configs: Record<SkillType, any>;
  count: 1 | 2 | 3 | 4;
  model: string;
  content: string;
  useCustomSeed?: boolean;
  customSeedValue?: number | '';
}

const MODEL_OPTIONS: { id: string; label: string; badge: string; needsAtlas: boolean }[] = [
  { id: 'gemini', label: 'Gemini 3 Flash / Pro', badge: 'Gemini Key', needsAtlas: false },
  { id: 'gpt-image-2', label: 'GPT Image 2', badge: 'Atlas Cloud', needsAtlas: true },
  { id: 'flux-2-pro', label: 'FLUX.2 Pro', badge: 'Atlas Cloud', needsAtlas: true },
  { id: 'seedream-v4.5', label: '即夢 Seedream v4.5', badge: 'Atlas Cloud', needsAtlas: true },
  { id: 'seedream-v5', label: '即夢 Seedream v5 Lite', badge: 'Atlas Cloud', needsAtlas: true },
  { id: 'seedream-v5-pro', label: '即夢 Seedream v5 Pro', badge: 'Atlas Cloud', needsAtlas: true },
  { id: 'qwen-image-2', label: '通義千問 Qwen Image 2.0', badge: 'Atlas Cloud', needsAtlas: true },
];

export const DesignMasterPanel: React.FC<DesignMasterPanelProps> = ({
  noteContent,
  isGenerating,
  generationModel,
  hasAtlasKey,
  apiKey,
  showToast,
  onGenerate,
  onClose,
  referenceImages,
  onUpdateReferenceImages,
  referenceMode = 'blend',
  referenceRoles,
  referencePrimaryIndex,
  onUpdateReferenceSettings,
  initialState,
  onPersistState,
  onGenerateBrandKit,
}) => {
  const [activeSkill, setActiveSkill] = useState<SkillType>(initialState?.activeSkill ?? 'sticker');
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleOptimizePrompt = async () => {
    const hasLogoBrand = activeSkill === 'logo' && configs.logo.brandName.trim();
    if (!content.trim() && !hasLogoBrand) return;
    if (!apiKey) {
      showToast('⚠️ 請先在設定中配置 Gemini API Key 才能使用 AI 優化');
      return;
    }
    setIsOptimizing(true);
    showToast('AI 正在為您深度優化提示詞...');
    try {
      const optimized = await optimizePrompt(activeSkill, content, configs[activeSkill], apiKey);
      setContent(optimized);
      showToast('提示詞優化完成！');
    } catch (err: any) {
      console.error(err);
      showToast(`優化失敗: ${err.message || err}`);
    } finally {
      setIsOptimizing(false);
    }
  };
  const [configs, setConfigs] = useState<Record<SkillType, any>>(() => {
    // 有上次設定（同一張便利貼重複進入）→ 直接還原
    if (initialState?.configs) return initialState.configs;

    const firstLine = noteContent.split('\n')[0]?.trim() || '';
    const remainingText = noteContent.split('\n').slice(1).join('\n')?.trim() || '';

    const initialConfigs: any = {};
    SKILL_LIST.forEach(skill => {
      initialConfigs[skill.id] = { ...skill.defaultConfig };
    });

    // 填入智慧預設值
    initialConfigs.cover.title = firstLine;
    initialConfigs.cover.subtitle = remainingText;
    initialConfigs.logo.brandName = firstLine;

    return initialConfigs;
  });

  const [count, setCount] = useState<1 | 2 | 3 | 4>(initialState?.count ?? 1);
  const [content, setContent] = useState(initialState?.content ?? noteContent);
  const [model, setModel] = useState(initialState?.model ?? 'gemini');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [useCustomSeed, setUseCustomSeed] = useState(initialState?.useCustomSeed ?? false);
  const [customSeedValue, setCustomSeedValue] = useState<number | ''>(initialState?.customSeedValue ?? '');

  // 回存目前設定（生成或關閉時呼叫），供下次進入同一張便利貼還原
  const persistState = () => onPersistState?.({ activeSkill, configs, count, model, content, useCustomSeed, customSeedValue });
  // 關閉前先回存
  const handleClose = () => { persistState(); onClose(); };
  const [isBrainstorming, setIsBrainstorming] = useState(false); // AI 發想子主題進行中（驅動輸入框動畫）

  const DESIGN_STYLE_CATEGORIES = [
    {
      label: '版面與結構圖解',
      ids: ['notion', 'ikea-manual', 'scientific', 'subway-map', 'blueprint', 'ui-wireframe', 'corporate', 'corporate-memphis', 'technical-schematic', 'minimal', 'aged-academia', 'editorial-infographic', 'intuition-machine', 'knolling']
    },
    {
      label: '社群媒體美學',
      ids: ['xhs-bold', 'xhs-cute', 'xhs-fresh', 'xhs-pop', 'xhs-study-notes', 'ig-chalkboard', 'ig-pixel-art', 'retro-pop-grid', 'morandi-journal', 'neon-kinetic-typographic', 'soft-analog-future-editorial', 'pop-bubble-letter-photo', 'pop-laboratory']
    },
    {
      label: '藝術與手作材質',
      ids: ['claymation', 'origami', 'lego-brick', 'watercolor', 'craft-handmade', 'neubrutalism', 'vaporwave', 'risograph', 'duotone', 'paper-cutout', 'pixel-art', 'bold-editorial', 'bold-graphic', 'chalkboard', 'cm-chalk', 'cm-ink-brush', 'cm-ligne-claire', 'cm-manga', 'cm-realistic', 'fantasy-animation', 'playful-mascot-doodle', 'teenage-skate-scribble', 'gothic-cat-doodle-collage', 'vector-illustration', 'vintage', 'storybook-watercolor', 'cyberpunk-neon', 'dark-atmospheric', 'kawaii', 'sketch-notes']
    },
    {
      label: '品牌配色系列',
      ids: ['cv-cool', 'cv-dark', 'cv-earth', 'cv-elegant', 'cv-mono', 'cv-pastel', 'cv-retro', 'cv-vivid', 'cv-warm']
    }
  ];

  const BRAND_CATEGORIES = [
    {
      label: '矽谷與人工智慧',
      ids: DESIGN_MD_TEMPLATES.filter(t => t.category === 'Tech').map(t => t.id)
    },
    {
      label: '金融與數位支付',
      ids: DESIGN_MD_TEMPLATES.filter(t => t.category === 'Finance').map(t => t.id)
    },
    {
      label: '創意設計與工具',
      ids: DESIGN_MD_TEMPLATES.filter(t => t.category === 'Creative').map(t => t.id)
    },
    {
      label: '極簡與大膽美學',
      ids: DESIGN_MD_TEMPLATES.filter(t => ['Minimal', 'Bold'].includes(t.category)).map(t => t.id)
    }
  ];

  const LAYOUT_CATEGORIES = [
    { label: '密度策略', ids: LAYOUT_DENSITY_TEMPLATES.filter(t => t.category === 'Density').map(t => t.id) },
    { label: '結構版型', ids: LAYOUT_DENSITY_TEMPLATES.filter(t => t.category === 'Structure').map(t => t.id) },
    { label: '流程引導', ids: LAYOUT_DENSITY_TEMPLATES.filter(t => t.category === 'Flow').map(t => t.id) },
  ];

  const navRef = React.useRef<HTMLDivElement>(null);
  const activeTabRef = React.useRef<HTMLButtonElement>(null);

  // 1. Auto-scroll the active tab into view
  React.useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeSkill]);

  // 2. Map vertical scroll wheel gestures to horizontal scrolling on desktop mouse setups
  React.useEffect(() => {
    const navEl = navRef.current;
    if (!navEl) return;
    const handleNavWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        navEl.scrollLeft += e.deltaY * 0.8;
      }
    };
    navEl.addEventListener('wheel', handleNavWheel, { passive: false });
    return () => {
      navEl.removeEventListener('wheel', handleNavWheel);
    };
  }, []);

  const currentSkill = SKILL_LIST.find(s => s.id === activeSkill)!;

  const set = (key: string, id: string) => {
    setConfigs(prev => ({
      ...prev,
      [activeSkill]: {
        ...prev[activeSkill],
        [key]: id,
      },
    }));
  };

  const handleGenerate = () => {
    if (isGenerating) return;
    const prompt = buildSkillPrompt(activeSkill, content, configs[activeSkill], referenceImages);
    const isSticker = activeSkill === 'sticker';
    const isIcon = activeSkill === 'icon';
    const autoRemoveBg = (isSticker && configs.sticker.background === 'transparent') 
      || (isIcon && configs.icon.background === 'transparent')
      || (activeSkill === 'logo' && configs.logo.background === 'transparent');
    
    // Resolve aspect ratio for the generation call
    let aspect: string | undefined;
    const currentConfig = configs[activeSkill];
    if (currentConfig) {
      if (activeSkill === 'social') {
        aspect = currentConfig.aspect;
      } else if (activeSkill === 'logo') {
        aspect = currentConfig.size;
      } else if (activeSkill === 'sticker') {
        aspect = currentConfig.aspect;
      } else if (activeSkill === 'icon') {
        aspect = currentConfig.aspect;
      } else if (activeSkill === 'cover') {
        aspect = currentConfig.aspect;
      } else if (activeSkill === 'illustrator') {
        aspect = currentConfig.aspect;
      } else if (activeSkill === 'comic') {
        aspect = currentConfig.aspect;
      } else if (activeSkill === 'slide') {
        aspect = currentConfig.aspect;
      } else if (activeSkill === 'uiWebpage') {
        aspect = resolveAspectFromResolution(currentConfig.resolution);
      } else if (activeSkill === 'infographic') {
        if (currentConfig.aspect === 'square') aspect = '1:1';
        else if (currentConfig.aspect === 'landscape') aspect = '16:9';
        else if (currentConfig.aspect === 'portrait') aspect = '3:4';
      }
    }
    
    // 預設設計大師內所有模型均以最高解析度（4K）輸出。
    // 例外：Logo 是平面色塊圖形，4K 的分塊放大管線會在背景拼出格狀紙紋髒污，
    // 改用 2K 從源頭消除該 artifact（需要大圖時平面圖形事後放大不失真）。
    const imageSizeOverride: '1K' | '2K' | '4K' = activeSkill === 'logo' ? '2K' : '4K';
    
    // 找出選定的參考圖風格索引與範圍
    const styleKey = SKILL_STYLE_KEYS[activeSkill];
    const isRefStyle = styleKey && currentConfig && currentConfig[styleKey] === 'ref-style';
    const refStyleIndex = isRefStyle ? currentConfig.refStyleIndex : undefined;
    const refStyleScope = isRefStyle ? (currentConfig.refStyleScope || 'all') : undefined;

    // LINE 貼圖：背景已控制成純黑(有白邊)/純白(無白邊)，去背改走泛洪 chroma 主路；
    // 傳白描邊旗標讓去背知道要扣黑還是白、並保住白色 die-cut 邊。其他模式維持語意去背。
    const stickerDebgBorder = (isSticker && configs.sticker.background === 'transparent')
      ? !!configs.sticker.useStickerBorder
      : undefined;

    persistState();   // 生成前先回存設定 + 同步便利貼提示詞
    if (activeSkill === 'logo' && configs.logo.isBrandKit) {
      if (onGenerateBrandKit) {
        onGenerateBrandKit(configs.logo, model, configs.logo.brandKitResolution || '2K');
        return;
      }
    }
    const seedParam = useCustomSeed && customSeedValue !== '' ? Number(customSeedValue) : undefined;
    onGenerate(prompt, count, model, autoRemoveBg, aspect, imageSizeOverride, refStyleIndex, refStyleScope, stickerDebgBorder, seedParam);
  };

  return (
    <div
      className="fixed inset-0 z-[6050] flex items-center justify-center bg-[#0F172A]/40 backdrop-blur-[8px]"
      onClick={handleClose}
      onKeyDown={e => e.stopPropagation()}
    >
      <style>{`
        .design-master-nav::-webkit-scrollbar {
          display: none;
        }
        .design-master-nav {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .design-master-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .design-master-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .design-master-scroll::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 10px;
        }
      `}</style>

      <div
        className="bg-white/95 backdrop-blur-[24px] rounded-[24px] border border-white/80 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05)] w-[520px] max-h-[85vh] flex flex-col overflow-hidden animate-[modalSlideUp_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]"
        onClick={e => e.stopPropagation()}
      >
        {/* 標題列 */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-[#AF52DE]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            </div>
            <h3 className="font-bold text-gray-950 text-base tracking-tight">設計大師</h3>
            <span className="text-[11px] font-bold text-[#AF52DE] bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100/50">
              {currentSkill.name_zh}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Skill 分頁切換選單 (iOS Segmented Control 風格) */}
        <div className="px-6 py-3 border-b border-gray-100 bg-white flex-shrink-0">
          <div className="relative">
            <div 
              ref={navRef}
              className="flex gap-0.5 overflow-x-auto bg-[#F1F5F9] p-1 rounded-xl design-master-nav scroll-smooth"
            >
              {SKILL_LIST.map(skill => {
                const active = activeSkill === skill.id;
                return (
                  <button
                    key={skill.id}
                    ref={active ? activeTabRef : undefined}
                    onClick={() => setActiveSkill(skill.id)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all duration-200 ${
                      active
                        ? 'bg-white text-[#1D1D1F] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                        : 'text-[#64748B] hover:text-[#1D1D1F]'
                    }`}
                  >
                    {skill.name_zh}
                  </button>
                );
              })}
            </div>
            {/* Subtle fade masks to indicate scrolling */}
            <div className="absolute right-1 top-1 bottom-1 w-6 bg-gradient-to-l from-[#F1F5F9] to-transparent pointer-events-none rounded-r-lg" />
            <div className="absolute left-1 top-1 bottom-1 w-6 bg-gradient-to-r from-[#F1F5F9] to-transparent pointer-events-none rounded-l-lg" />
          </div>
        </div>

        {/* 捲動內容區域 */}
        <div className="flex-1 overflow-y-auto design-master-scroll p-6 space-y-6">
          
          {/* 內容素材 */}
          <div>
            <div className="text-[12px] font-bold text-[#475569] mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                內容素材 <span className="font-normal text-gray-400 text-[11px]">(將提供給 AI 繪圖參考)</span>
              </div>
              <button
                type="button"
                onClick={handleOptimizePrompt}
                disabled={isOptimizing || (!content.trim() && !(activeSkill === 'logo' && configs.logo.brandName.trim()))}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#AF52DE] bg-purple-50 hover:bg-purple-100 disabled:opacity-40 disabled:hover:bg-purple-50 transition-all border border-purple-100/50 cursor-pointer"
              >
                {isOptimizing ? (
                  <Icon name="progress_activity" size={11} className="animate-spin" style={{ animationDuration: '0.8s' }} />
                ) : (
                  <Icon name="auto_awesome" size={11} />
                )}
                {isOptimizing ? '優化中...' : 'AI 優化'}
              </button>
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="請輸入畫面描述，或使用便利貼預設內容..."
              className="w-full text-[13px] text-[#1E293B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 h-20 resize-none overflow-y-auto transition-all focus:outline-none focus:bg-white focus:border-[#AF52DE] focus:ring-4 focus:ring-[#AF52DE]/10 leading-relaxed"
            />
          </div>

          {/* 參考圖（與便利貼上的參考圖插槽同步，所有 skill 模式共用） */}
          {onUpdateReferenceImages && (() => {
            const refs = Array.from(
              { length: NOTE_REFERENCE_LIMIT },
              (_, idx) => referenceImages?.[idx] ?? null,
            );
            const roles = Array.from(
              { length: NOTE_REFERENCE_LIMIT },
              (_, idx) => referenceRoles?.[idx] ?? null,
            );
            const handleRefUpload = (idx: number, file: File) => {
              const reader = new FileReader();
              reader.onload = ev => {
                const src = ev.target?.result as string;
                const newRefs = [...refs];
                newRefs[idx] = src;
                onUpdateReferenceImages(newRefs);
                if (referencePrimaryIndex == null) {
                  onUpdateReferenceSettings?.({ referencePrimaryIndex: idx });
                }
              };
              reader.readAsDataURL(file);
            };
            const handleRefRemove = (idx: number) => {
              const newRefs = [...refs];
              newRefs[idx] = null;
              onUpdateReferenceImages(newRefs);
              const newRoles = [...roles];
              newRoles[idx] = null;
              const nextPrimary = referencePrimaryIndex === idx
                ? newRefs.findIndex(Boolean)
                : referencePrimaryIndex;
              onUpdateReferenceSettings?.({
                referenceRoles: newRoles,
                referencePrimaryIndex: typeof nextPrimary === 'number' && nextPrimary >= 0 ? nextPrimary : undefined,
              });
            };
            const filledRefs = refs
              .map((src, idx) => ({ src, idx }))
              .filter((item): item is { src: string; idx: number } => !!item.src);
            return (
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="text-[12px] font-bold text-[#475569] flex items-center gap-1.5">
                    參考圖 <span className="font-normal text-gray-400 text-[11px]">(選填，最多 {NOTE_REFERENCE_LIMIT} 張)</span>
                  </div>
                  {filledRefs.length > 0 && onUpdateReferenceSettings && (
                    <div className="flex rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5">
                      {([
                        ['blend', '自由融合'],
                        ['directed', '指定用途'],
                      ] as const).map(([mode, label]) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => onUpdateReferenceSettings({ referenceMode: mode })}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                            referenceMode === mode
                              ? 'bg-white text-[#AF52DE] shadow-sm'
                              : 'text-[#64748B] hover:text-[#334155]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {refs.map((src, idx) => (
                    <label
                      key={idx}
                      className={`relative aspect-square rounded-xl border overflow-hidden cursor-pointer transition-all ${
                        src ? 'border-[#AF52DE]' : 'border-dashed border-[#cbd5e1] hover:border-[#AF52DE] bg-[#F8FAFC]'
                      }`}
                    >
                      {src ? (
                        <>
                          <img src={src} alt={`參考圖 ${idx + 1}`} className="w-full h-full object-cover" />
                          <span className="absolute top-1 left-1 min-w-5 h-5 px-1 rounded-full bg-black/65 text-white text-[9px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={e => { e.preventDefault(); e.stopPropagation(); handleRefRemove(idx); }}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center"
                          >
                            <Icon name="close" size={11} />
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Icon name="add_photo_alternate" size={18} />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleRefUpload(idx, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  ))}
                </div>
                {filledRefs.length > 0 && (
                  referenceMode === 'blend' ? (
                    <div className="mt-2.5 px-3 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[10.5px] text-[#64748B] leading-relaxed">
                      AI 會把所有參考圖視為同一份視覺情緒板，自由綜合主體、風格、材質、色彩與構圖，並避免做成拼貼。
                    </div>
                  ) : (
                    <div className="mt-2.5 grid grid-cols-1 xl:grid-cols-2 gap-2">
                      {filledRefs.map(({ src, idx }) => {
                        const selectedRoles = roles[idx] ?? [];
                        const isPrimary = referencePrimaryIndex === idx
                          || (referencePrimaryIndex == null && idx === filledRefs[0]?.idx);
                        return (
                          <div key={idx} className={`rounded-xl border p-2.5 ${isPrimary ? 'border-purple-300 bg-purple-50/30' : 'border-[#E2E8F0] bg-white'}`}>
                            <div className="flex items-center gap-2">
                              <img src={src} alt={`參考圖 ${idx + 1}`} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10.5px] font-bold text-[#334155]">參考圖 {idx + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() => onUpdateReferenceSettings?.({
                                      referenceMode: 'directed',
                                      referencePrimaryIndex: idx,
                                    })}
                                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                      isPrimary ? 'bg-[#AF52DE] text-white' : 'bg-[#F1F5F9] text-[#94A3B8]'
                                    }`}
                                  >
                                    {isPrimary ? '★ 主要' : '☆ 主要'}
                                  </button>
                                </div>
                                <div className="text-[9px] text-[#94A3B8] mt-0.5">最多選擇 2 個用途</div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {NOTE_REFERENCE_ROLE_OPTIONS.map(option => {
                                const active = selectedRoles.includes(option.id);
                                const disabled = !active && selectedRoles.length >= 2;
                                return (
                                  <button
                                    key={option.id}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => {
                                      const nextRoles = active
                                        ? selectedRoles.filter(role => role !== option.id)
                                        : [...selectedRoles, option.id];
                                      const next = [...roles];
                                      next[idx] = nextRoles;
                                      onUpdateReferenceSettings?.({
                                        referenceMode: 'directed',
                                        referenceRoles: next,
                                      });
                                    }}
                                    className={`px-1.5 py-1 rounded-full border text-[9px] font-semibold transition-all ${
                                      active
                                        ? 'border-purple-300 bg-purple-50 text-purple-700'
                                        : 'border-[#E2E8F0] bg-white text-[#64748B]'
                                    } ${disabled ? 'opacity-35 cursor-not-allowed' : 'hover:border-purple-200'}`}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            );
          })()}

          {/* 生圖模型 */}
          <div>
            <div className="text-[12px] font-bold text-[#475569] mb-2">生圖模型</div>
            <div className="relative w-full">
              {(() => {
                const selectedModelOpt = MODEL_OPTIONS.find(o => o.id === model) || MODEL_OPTIONS[0];
                return (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsModelDropdownOpen(v => !v)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] font-semibold text-[#1E293B] cursor-pointer hover:bg-[#F1F5F9] transition-all"
                    >
                      <span className="truncate text-left mr-2">{selectedModelOpt.label}</span>
                      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${selectedModelOpt.needsAtlas ? 'bg-indigo-50 text-indigo-600' : 'bg-purple-50 text-purple-600'}`}>
                          {selectedModelOpt.badge}
                        </span>
                        <svg
                          className={`w-3.5 h-3.5 text-[#64748B] transition-transform duration-150 ${isModelDropdownOpen ? 'rotate-180' : 'rotate-0'}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth="2.5"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {isModelDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-[290]" onClick={() => setIsModelDropdownOpen(false)} />
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-black/10 rounded-xl shadow-lg py-1 z-[300] max-h-60 overflow-y-auto">
                          {MODEL_OPTIONS.map(opt => {
                            const isDisabled = opt.needsAtlas && !hasAtlasKey;
                            const isSelected = opt.id === model;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                disabled={isDisabled}
                                onClick={() => {
                                  setModel(opt.id);
                                  setIsModelDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs transition-colors ${
                                  isSelected ? 'bg-[#F5F5F7] text-[#AF52DE] font-semibold' : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                                } ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} gap-3`}
                              >
                                <span className="truncate">{opt.label}</span>
                                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${opt.needsAtlas ? 'bg-indigo-50 text-indigo-600' : 'bg-purple-50 text-purple-600'}`}>
                                    {opt.badge}
                                  </span>
                                  <div className="w-3.5 h-3.5 flex items-center justify-center">
                                    {isSelected && (
                                      <svg className="w-3 h-3 text-[#AF52DE]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* 核心 Skill 專用文字輸入 */}
          {activeSkill === 'cover' && (
            <div className="flex flex-col gap-4 bg-purple-50/20 p-4 rounded-2xl border border-purple-100/30">
              <div>
                <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-1.5">封面標題</div>
                <input
                  type="text"
                  value={configs.cover.title}
                  onChange={e => setConfigs(prev => ({
                    ...prev,
                    cover: { ...prev.cover, title: e.target.value }
                  }))}
                  placeholder="輸入封面標題..."
                  className="w-full text-[13px] text-[#1E293B] bg-white border border-[#E2E8F0] rounded-xl px-3.5 py-2 focus:outline-none focus:border-[#AF52DE] focus:ring-4 focus:ring-[#AF52DE]/10 transition-all"
                />
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-1.5">封面副標題</div>
                <input
                  type="text"
                  value={configs.cover.subtitle}
                  onChange={e => setConfigs(prev => ({
                    ...prev,
                    cover: { ...prev.cover, subtitle: e.target.value }
                  }))}
                  placeholder="輸入封面副標題..."
                  className="w-full text-[13px] text-[#1E293B] bg-white border border-[#E2E8F0] rounded-xl px-3.5 py-2 focus:outline-none focus:border-[#AF52DE] focus:ring-4 focus:ring-[#AF52DE]/10 transition-all"
                />
              </div>
            </div>
          )}

          {activeSkill === 'logo' && (
            <div className="flex flex-col gap-4 bg-purple-50/20 p-4 rounded-2xl border border-purple-100/30">
              <div>
                <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-1.5">品牌名稱</div>
                <input
                  type="text"
                  value={configs.logo.brandName}
                  onChange={e => setConfigs(prev => ({
                    ...prev,
                    logo: { ...prev.logo, brandName: e.target.value }
                  }))}
                  placeholder="輸入品牌名稱..."
                  className="w-full text-[13px] text-[#1E293B] bg-white border border-[#E2E8F0] rounded-xl px-3.5 py-2 focus:outline-none focus:border-[#AF52DE] focus:ring-4 focus:ring-[#AF52DE]/10 transition-all"
                />
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-1.5">品牌標語 (選填)</div>
                <input
                  type="text"
                  value={configs.logo.slogan}
                  onChange={e => setConfigs(prev => ({
                    ...prev,
                    logo: { ...prev.logo, slogan: e.target.value }
                  }))}
                  placeholder="輸入品牌標語..."
                  className="w-full text-[13px] text-[#1E293B] bg-white border border-[#E2E8F0] rounded-xl px-3.5 py-2 focus:outline-none focus:border-[#AF52DE] focus:ring-4 focus:ring-[#AF52DE]/10 transition-all"
                />
              </div>
              <div className="border-t border-purple-100/30 my-1 pt-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={configs.logo.isBrandKit}
                    onChange={e => setConfigs(prev => ({
                      ...prev,
                      logo: { ...prev.logo, isBrandKit: e.target.checked }
                    }))}
                    className="rounded border-[#cbd5e1] text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-[12px] font-bold text-[#1E293B]">生成完整品牌視覺套件 (主/備用Logo、視覺板、App圖示、應用預覽)</span>
                </label>
              </div>

              {configs.logo.isBrandKit && (
                <div className="flex flex-col gap-3 mt-1 pt-3 border-t border-purple-100/20">
                  <div>
                    <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-1.5">目標受眾</div>
                    <input
                      type="text"
                      value={configs.logo.targetAudience}
                      onChange={e => setConfigs(prev => ({
                        ...prev,
                        logo: { ...prev.logo, targetAudience: e.target.value }
                      }))}
                      placeholder="例如：大眾消費者、注重生活質感的追求者"
                      className="w-full text-[13px] text-[#1E293B] bg-white border border-[#E2E8F0] rounded-xl px-3.5 py-2 focus:outline-none focus:border-[#AF52DE] focus:ring-4 focus:ring-[#AF52DE]/10 transition-all"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-1.5">定位與差異點</div>
                    <input
                      type="text"
                      value={configs.logo.positioning}
                      onChange={e => setConfigs(prev => ({
                        ...prev,
                        logo: { ...prev.logo, positioning: e.target.value }
                      }))}
                      placeholder="例如：高端、簡約、有獨特品牌記憶點"
                      className="w-full text-[13px] text-[#1E293B] bg-white border border-[#E2E8F0] rounded-xl px-3.5 py-2 focus:outline-none focus:border-[#AF52DE] focus:ring-4 focus:ring-[#AF52DE]/10 transition-all"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-1.5">品牌人格</div>
                    <input
                      type="text"
                      value={configs.logo.personality}
                      onChange={e => setConfigs(prev => ({
                        ...prev,
                        logo: { ...prev.logo, personality: e.target.value }
                      }))}
                      placeholder="例如：現代、可靠、優雅、精緻"
                      className="w-full text-[13px] text-[#1E293B] bg-white border border-[#E2E8F0] rounded-xl px-3.5 py-2 focus:outline-none focus:border-[#AF52DE] focus:ring-4 focus:ring-[#AF52DE]/10 transition-all"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-1.5">主要使用場景</div>
                    <input
                      type="text"
                      value={configs.logo.usageContexts}
                      onChange={e => setConfigs(prev => ({
                        ...prev,
                        logo: { ...prev.logo, usageContexts: e.target.value }
                      }))}
                      placeholder="例如：官網、社媒頭像、名片、產品包裝"
                      className="w-full text-[13px] text-[#1E293B] bg-white border border-[#E2E8F0] rounded-xl px-3.5 py-2 focus:outline-none focus:border-[#AF52DE] focus:ring-4 focus:ring-[#AF52DE]/10 transition-all"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-1.5">套件解析度</div>
                    <select
                      value={configs.logo.brandKitResolution || '2K'}
                      onChange={e => setConfigs(prev => ({
                        ...prev,
                        logo: { ...prev.logo, brandKitResolution: e.target.value as '1K' | '2K' | '4K' }
                      }))}
                      className="w-full text-[13px] text-[#1E293B] bg-white border border-[#E2E8F0] rounded-xl px-3.5 py-2 focus:outline-none focus:border-[#AF52DE] focus:ring-4 focus:ring-[#AF52DE]/10 transition-all cursor-pointer"
                    >
                      <option value="1K">1K (快速省錢)</option>
                      <option value="2K">2K (平衡畫質)</option>
                      <option value="4K">4K (高清精緻)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSkill === 'icon' && (
            <div className="flex flex-col gap-4 bg-purple-50/20 p-4 rounded-2xl border border-purple-100/30">
              {/* 版面模式 */}
              <div>
                <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-2">生成類型 (版面)</div>
                <div className="grid grid-cols-2 gap-1.5 bg-[#F1F5F9] p-0.5 rounded-xl">
                  {[
                    { id: 'single', name: '單張圖示', tip: '生成單張獨立圖示。' },
                    { id: 'collection', name: '圖示合集', tip: '在一張圖中生成多張成套圖示，支援一鍵切分。' },
                  ].map(mode => {
                    const isSelected = configs.icon.layoutMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        title={mode.tip}
                        onClick={() => {
                          setConfigs(prev => ({
                            ...prev,
                            icon: {
                              ...prev.icon,
                              layoutMode: mode.id as 'single' | 'collection',
                            }
                          }));
                        }}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white text-[#AF52DE] shadow-[0_2px_4px_rgba(0,0,0,0.05)]'
                            : 'text-[#64748B] hover:text-[#1E293B]'
                        }`}
                      >
                        {mode.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 數量滑桿 / 輸入框 (僅在合集模式下顯示) */}
              {configs.icon.layoutMode === 'collection' && (
                <div className="flex flex-col gap-2.5 bg-white/60 p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-600">合集圖示張數</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="2"
                        max="20"
                        value={configs.icon.sheetCount}
                        onChange={e => {
                          const val = Math.max(2, Math.min(20, parseInt(e.target.value) || 2));
                          setConfigs(prev => ({
                            ...prev,
                            icon: {
                              ...prev.icon,
                              sheetCount: val,
                              collectionItemPrompts: Array.from({ length: val }, (_, i) => prev.icon.collectionItemPrompts[i] || '')
                            }
                          }));
                        }}
                        className="w-12 text-center text-xs font-bold bg-[#F1F5F9] border border-gray-200 rounded px-1 py-0.5"
                      />
                      <span className="text-xs text-gray-400">張</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="20"
                    value={configs.icon.sheetCount}
                    onChange={e => {
                      const val = parseInt(e.target.value);
                      setConfigs(prev => ({
                        ...prev,
                        icon: {
                          ...prev.icon,
                          sheetCount: val,
                          collectionItemPrompts: Array.from({ length: val }, (_, i) => prev.icon.collectionItemPrompts[i] || '')
                        }
                      }));
                    }}
                    className="w-full accent-[#AF52DE] cursor-pointer"
                  />

                  {/* 子圖示主題內容 (選填) */}
                  <div className="flex flex-col gap-1.5 mt-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-[#86868B]">子圖示畫面內容 (選填)</span>
                      <button
                        type="button"
                        disabled={isBrainstorming}
                        onClick={async () => {
                          if (isBrainstorming) return;
                          if (!apiKey) {
                            showToast('⚠️ 請先配置 Gemini API Key');
                            return;
                          }
                          if (!content.trim()) {
                            showToast('⚠️ 請先在內容素材輸入大主題，例如「辦公室工具」');
                            return;
                          }
                          setIsBrainstorming(true);
                          showToast('AI 正在發想子主題中...');
                          try {
                            const count = configs.icon.sheetCount;
                            const items = await generateCollectionItemPrompts(content, count, apiKey);
                            setConfigs(prev => ({
                              ...prev,
                              icon: {
                                ...prev.icon,
                                collectionItemPrompts: items
                              }
                            }));
                            showToast('子主題生成完成！✨');
                          } catch (e: any) {
                            showToast(`生成子主題失敗: ${e.message || e}`);
                          } finally {
                            setIsBrainstorming(false);
                          }
                        }}
                        className="text-[10px] font-bold text-[#AF52DE] hover:underline flex items-center gap-0.5 disabled:opacity-60 disabled:cursor-wait"
                      >
                        {isBrainstorming ? (
                          <>
                            <span className="inline-block w-3 h-3 border-[1.5px] border-[#AF52DE] border-t-transparent rounded-full animate-spin" />
                            發想中…
                          </>
                        ) : (
                          <>⚡ AI 發想子主題</>
                        )}
                      </button>
                    </div>
                    <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {Array.from({ length: configs.icon.sheetCount }).map((_, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-gray-400 w-4">{idx + 1}</span>
                          <input
                            type="text"
                            disabled={isBrainstorming}
                            value={configs.icon.collectionItemPrompts[idx] || ''}
                            placeholder={isBrainstorming ? 'AI 發想中…' : `圖示 ${idx + 1} 畫面內容...`}
                            onChange={e => {
                              const val = e.target.value;
                              setConfigs(prev => {
                                const list = [...prev.icon.collectionItemPrompts];
                                list[idx] = val;
                                return {
                                  ...prev,
                                  icon: {
                                    ...prev.icon,
                                    collectionItemPrompts: list
                                  }
                                };
                              });
                            }}
                            className="flex-1 text-[11px] text-[#1E293B] bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#AF52DE]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 背景設定選項 */}
              <div>
                <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-1.5">背景處理</div>
                <select
                  value={configs.icon.background}
                  onChange={e => setConfigs(prev => ({
                    ...prev,
                    icon: {
                      ...prev.icon,
                      background: e.target.value as 'transparent' | 'white' | 'colored' | 'pattern'
                    }
                  }))}
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-[12px] text-[#1E293B]"
                >
                  <option value="transparent">透明背景（生成後自動去背）</option>
                  <option value="white">純白背景</option>
                  <option value="colored">彩色背景</option>
                  <option value="pattern">格線圖案背景</option>
                </select>
              </div>
            </div>
          )}

          {activeSkill === 'comic' && (
            <div className="flex flex-col gap-1.5 bg-purple-50/20 p-4 rounded-2xl border border-purple-100/30">
              <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-1">漫畫格數</div>
              <div className="flex gap-2">
                {([2, 3, 4, 6, 8] as const).map(n => (
                  <button
                    key={n}
                    onClick={() => setConfigs(prev => ({
                      ...prev,
                      comic: { ...prev.comic, pageCount: n }
                    }))}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      configs.comic.pageCount === n
                        ? 'bg-[#1D1D1F] text-white shadow-sm'
                        : 'bg-white border border-[#E2E8F0] text-[#1D1D1F] hover:bg-black/5'
                    }`}
                  >
                    {n} 格
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeSkill === 'uiWebpage' && (
            <div className="flex flex-col gap-4 bg-purple-50/20 p-4 rounded-2xl border border-purple-100/30">
              {/* 平台選擇 */}
              <div>
                <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-2">設計平台</div>
                <div className="grid grid-cols-4 gap-1.5 bg-[#F1F5F9] p-0.5 rounded-xl">
                  {UI_PLATFORMS.map(p => {
                    const isSelected = configs.uiWebpage.platform === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          // Find default resolution for the selected platform
                          const resList = UI_RESOLUTIONS.filter(r => r.platform === p.id);
                          const defaultRes = resList[0]?.id || '';
                          setConfigs(prev => ({
                            ...prev,
                            uiWebpage: {
                              ...prev.uiWebpage,
                              platform: p.id,
                              resolution: defaultRes
                            }
                          }));
                        }}
                        className={`py-2 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-white text-[#AF52DE] shadow-[0_2px_4px_rgba(0,0,0,0.05)]'
                            : 'text-[#64748B] hover:text-[#1E293B]'
                        }`}
                      >
                        {(() => {
                          const LucideIcon = PLATFORM_LUCIDE_ICONS[p.id];
                          return LucideIcon ? <LucideIcon size={16} className={isSelected ? 'text-[#AF52DE]' : 'text-[#64748B]'} /> : null;
                        })()}
                        <span>{p.name_zh}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 解析度預設 */}
              <div>
                <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-1.5">裝置與解析度</div>
                <select
                  value={configs.uiWebpage.resolution}
                  onChange={e => setConfigs(prev => ({
                    ...prev,
                    uiWebpage: {
                      ...prev.uiWebpage,
                      resolution: e.target.value
                    }
                  }))}
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-3.5 py-2 text-[13px] text-[#1E293B] cursor-pointer appearance-none focus:outline-none focus:border-[#AF52DE] focus:ring-4 focus:ring-[#AF52DE]/10 transition-all font-semibold"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 16px center'
                  }}
                >
                  {UI_RESOLUTIONS.filter(r => r.platform === configs.uiWebpage.platform).map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name_zh} - {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {activeSkill === 'sticker' && (
            <div className="flex flex-col gap-4 bg-purple-50/20 p-4 rounded-2xl border border-purple-100/30">
              {/* 版面模式 */}
              <div>
                <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-2">生成類型 (版面)</div>
                <div className="grid grid-cols-3 gap-1.5 bg-[#F1F5F9] p-0.5 rounded-xl">
                  {[
                    { id: 'single', name: '普通輸出', tip: '單張貼圖：一張置中、可模切的貼圖設計。' },
                    { id: 'threeViews', name: '生成設定圖', tip: '角色三視圖：同一角色的「正面 / 側面 / 背面」設定參考圖，水平排列、比例與風格一致，適合做角色設計稿。' },
                    { id: 'collection', name: '貼圖集合', tip: 'LINE 貼圖套組：一張畫布生成多張成系列的小貼圖（可設張數、用「AI 發想子主題」逐張指定內容）。' },
                  ].map(mode => {
                    const isSelected = configs.sticker.layoutMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        title={mode.tip}
                        onClick={() => {
                          setConfigs(prev => ({
                            ...prev,
                            sticker: {
                              ...prev.sticker,
                              layoutMode: mode.id,
                            }
                          }));
                        }}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white text-[#AF52DE] shadow-[0_2px_4px_rgba(0,0,0,0.05)]'
                            : 'text-[#64748B] hover:text-[#1E293B]'
                        }`}
                      >
                        {mode.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 貼圖表情快捷鍵 (Emoji Chips) */}
              <div>
                <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-1.5">快捷表情短語 (點擊附加到提示詞)</div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {['好的/收到', '謝謝', '哈哈大笑', '哭哭', '生氣', 'OK', '早安', '晚安', '加油', '辛苦了', '抱歉', '愛你', '驚訝', '疑問', '讚', '掰掰'].map(expr => (
                    <button
                      key={expr}
                      type="button"
                      onClick={() => {
                        setContent(prev => {
                          const val = prev.trim();
                          return val ? `${val}\n${expr}` : expr;
                        });
                      }}
                      className="text-[10px] font-semibold bg-white border border-gray-200 text-gray-700 hover:border-purple-300 hover:text-[#AF52DE] px-2 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      {expr}
                    </button>
                  ))}
                </div>
              </div>

              {/* 貼貼套組額外設定 */}
              {configs.sticker.layoutMode === 'collection' && (
                <div className="flex flex-col gap-3 bg-white/60 p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-gray-600">LINE 貼圖張數</span>
                    <div className="flex items-center gap-1.5">
                      {[2, 4, 8, 16, 20].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            setConfigs(prev => ({
                              ...prev,
                              sticker: {
                                ...prev.sticker,
                                stickerCollectionCount: n,
                                collectionItemPrompts: Array.from({ length: n }, (_, i) => prev.sticker.collectionItemPrompts[i] || '')
                              }
                            }));
                          }}
                          className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-bold transition-all ${
                            configs.sticker.stickerCollectionCount === n
                              ? 'bg-purple-100 text-[#AF52DE]'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-[#86868B]">子貼圖主題內容 (選填)</span>
                      <button
                        type="button"
                        disabled={isBrainstorming}
                        onClick={async () => {
                          if (isBrainstorming) return;
                          if (!apiKey) {
                            showToast('⚠️ 請先配置 Gemini API Key');
                            return;
                          }
                          if (!content.trim()) {
                            showToast('⚠️ 請先在內容素材輸入套組大主題，例如「可愛小貓」');
                            return;
                          }
                          setIsBrainstorming(true);
                          showToast('AI 正在發想子主題中...');
                          try {
                            const count = configs.sticker.stickerCollectionCount;
                            const items = await generateCollectionItemPrompts(content, count, apiKey);
                            setConfigs(prev => ({
                              ...prev,
                              sticker: {
                                ...prev.sticker,
                                collectionItemPrompts: items
                              }
                            }));
                            showToast('子主題生成完成！✨');
                          } catch (e: any) {
                            showToast(`生成子主題失敗: ${e.message || e}`);
                          } finally {
                            setIsBrainstorming(false);
                          }
                        }}
                        className="text-[10px] font-bold text-[#AF52DE] hover:underline flex items-center gap-0.5 disabled:opacity-60 disabled:cursor-wait"
                      >
                        {isBrainstorming ? (
                          <>
                            <span className="inline-block w-3 h-3 border-[1.5px] border-[#AF52DE] border-t-transparent rounded-full animate-spin" />
                            發想中…
                          </>
                        ) : (
                          <>⚡ AI 發想子主題</>
                        )}
                      </button>
                    </div>
                    <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {Array.from({ length: configs.sticker.stickerCollectionCount }).map((_, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-gray-400 w-4">{idx + 1}</span>
                          <input
                            type="text"
                            disabled={isBrainstorming}
                            value={configs.sticker.collectionItemPrompts[idx] || ''}
                            style={isBrainstorming ? { animationDelay: `${idx * 90}ms` } : undefined}
                            placeholder={isBrainstorming ? 'AI 發想中…' : `子貼圖 ${idx + 1} 畫面內容...`}
                            onChange={e => {
                              const val = e.target.value;
                              setConfigs(prev => {
                                const list = [...prev.sticker.collectionItemPrompts];
                                list[idx] = val;
                                return {
                                  ...prev,
                                  sticker: {
                                    ...prev.sticker,
                                    collectionItemPrompts: list
                                  }
                                };
                              });
                            }}
                            className={`flex-1 text-[11px] text-[#1E293B] bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#AF52DE] ${isBrainstorming ? 'dm-brainstorm-pulse border-[#AF52DE]/40' : ''}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 細節微調開關 */}
              <div className="flex flex-col gap-2">
                <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-1">細節微調</div>
                <div className="grid grid-cols-2 gap-4 bg-white/40 p-2.5 rounded-xl border border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={configs.sticker.useStickerBorder}
                      onChange={e => {
                        const checked = e.target.checked;
                        setConfigs(prev => ({
                          ...prev,
                          sticker: { ...prev.sticker, useStickerBorder: checked }
                        }));
                      }}
                      className="rounded border-[#cbd5e1] text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-[12px] font-semibold text-gray-700">白邊輪廓 (描邊)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={configs.sticker.useFacialFeatures}
                      onChange={e => {
                        const checked = e.target.checked;
                        setConfigs(prev => ({
                          ...prev,
                          sticker: { ...prev.sticker, useFacialFeatures: checked }
                        }));
                      }}
                      className="rounded border-[#cbd5e1] text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-[12px] font-semibold text-gray-700">產生五官與表情</span>
                  </label>
                </div>
              </div>

              {/* 貼圖壓字選項 */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={configs.sticker.textEnabled}
                    onChange={e => {
                      const checked = e.target.checked;
                      setConfigs(prev => ({
                        ...prev,
                        sticker: { ...prev.sticker, textEnabled: checked }
                      }));
                    }}
                    className="rounded border-[#cbd5e1] text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-[12px] font-bold text-gray-700">在貼圖內添加文字</span>
                </label>

                {configs.sticker.textEnabled && (
                  <div className="flex flex-col gap-3 bg-white/60 p-3 rounded-xl border border-gray-100 mt-0.5">
                    <div>
                      <div className="text-[10px] font-bold text-[#86868B] mb-1">文字內容</div>
                      <input
                        type="text"
                        value={configs.sticker.textContent}
                        onChange={e => {
                          const val = e.target.value;
                          setConfigs(prev => ({
                            ...prev,
                            sticker: { ...prev.sticker, textContent: val }
                          }));
                        }}
                        placeholder="請輸入文字，留空則由 AI 自由發揮..."
                        className="w-full text-[12px] text-[#1E293B] bg-white border border-[#E2E8F0] rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#AF52DE]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] font-bold text-[#86868B] mb-1">字型風格</div>
                        <select
                          value={configs.sticker.textFont}
                          onChange={e => {
                            const val = e.target.value;
                            setConfigs(prev => ({
                              ...prev,
                              sticker: { ...prev.sticker, textFont: val }
                            }));
                          }}
                          className="w-full bg-white border border-[#E2E8F0] rounded-xl px-2.5 py-1.5 text-[11px] text-[#1E293B]"
                        >
                          <option value="Fredoka, sans-serif">標準 — 圓潤無襯線 (Sans-Serif)</option>
                          <option value="Bangers, cursive">漫畫 — 粗黑爆炸感 (Comic)</option>
                          <option value="Pacifico, cursive">手寫 — 流暢草寫 (Script)</option>
                          <option value="Orbitron, sans-serif">科技 — 未來幾何感 (Sci-Fi)</option>
                          <option value="Yomogi, cursive">日系 — 可愛手書感 (Kawaii JP)</option>
                          <option value="Abril Fatface, cursive">優雅 — 粗襯線時尚 (Elegant)</option>
                        </select>
                      </div>
                      <div className="flex flex-col justify-end">
                        <label className="flex items-center gap-2 cursor-pointer select-none pb-2">
                          <input
                            type="checkbox"
                            checked={configs.sticker.textBorder}
                            onChange={e => {
                              const checked = e.target.checked;
                              setConfigs(prev => ({
                                ...prev,
                                sticker: { ...prev.sticker, textBorder: checked }
                              }));
                            }}
                            className="rounded border-[#cbd5e1] text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-[11px] font-semibold text-gray-700">添加文字白描邊</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          

          {/* 選項群組 */}
          <div className="space-y-6">
            {currentSkill.optionGroups
              .filter(group => {
                if (activeSkill === 'social') {
                  const currentConfig = configs.social;
                  if (currentConfig && currentConfig.type !== 'social-post') {
                    return group.key !== 'layout' && group.key !== 'strategy';
                  }
                }
                if (activeSkill === 'logo' && configs.logo.isBrandKit) {
                  return group.key !== 'size';
                }
                return true;
              })
              .map(group => {
                const isStyleGroup = ['style', 'rendering', 'art', 'preset', 'brand', 'visualStyle', 'layout'].includes(group.key);
                // 三種獨立疊加層的素材來源：品牌規格書 / 佈局密度策略 / 藝術風格庫
                const groupMeta = group.key === 'brand'
                  ? { templates: DESIGN_MD_TEMPLATES, categories: BRAND_CATEGORIES, placeholder: '設計規格書...', emptyOption: '選擇其他品牌規格書 / 清除品牌...', libraryDesc: '選擇 50+ 種系統內建品牌規格書', icon: 'book' }
                  : group.key === 'layout'
                  ? { templates: LAYOUT_DENSITY_TEMPLATES, categories: LAYOUT_CATEGORIES, placeholder: '佈局密度策略...', emptyOption: '選擇其他佈局密度 / 清除版面...', libraryDesc: '選擇 8 種版面結構與密度策略', icon: 'mobile_layout' }
                  : { templates: VISUAL_STYLE_TEMPLATES, categories: DESIGN_STYLE_CATEGORIES, placeholder: '藝術風格庫...', emptyOption: '選擇其他藝術風格 / 清除風格...', libraryDesc: '選擇 60+ 種系統預設風格', icon: 'palette' };
                return (
                <div key={group.key}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[11px] font-bold text-[#475569] tracking-wide">{group.label}</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {/* 若有上傳參考圖且是風格相關選項組，動態插入「維持參考圖風格」按鈕 */}
                    {isStyleGroup && referenceImages && referenceImages.some(Boolean) && (() => {
                      const active = configs[activeSkill][group.key] === 'ref-style';
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            set(group.key, 'ref-style');
                            const firstValidIdx = referenceImages.findIndex(Boolean);
                            setConfigs(prev => {
                              const updatedConfig = { ...prev[activeSkill] };
                              if (firstValidIdx > -1 && updatedConfig.refStyleIndex === undefined) {
                                updatedConfig.refStyleIndex = firstValidIdx;
                              }
                              // 如果是貼圖模式，自動切換主題為「維持參考圖主題」，避免預設的「角色」主題破壞/擬人化了參考圖
                              if (activeSkill === 'sticker') {
                                updatedConfig.theme = 'ref-theme';
                              }
                              return {
                                ...prev,
                                [activeSkill]: updatedConfig
                              };
                            });
                          }}
                          className={`flex flex-col gap-0.5 px-4 py-3 rounded-2xl border text-left transition-all duration-200 relative ${
                            active
                              ? 'bg-[#FAF5FF] border-[#AF52DE] text-[#AF52DE] shadow-[0_4px_12px_rgba(175,82,222,0.08)]'
                              : 'bg-white border-[#E2E8F0] hover:border-[#cbd5e1] hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] text-[#1E293B]'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={`text-[13px] font-bold leading-tight flex items-center gap-1.5 ${active ? 'text-[#7e22ce]' : 'text-[#1E293B]'}`}>
                              <Icon name="image" size={15} className={active ? 'text-[#AF52DE]' : 'text-gray-400'} />
                              維持參考圖風格
                            </span>
                            {active && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-[#AF52DE] flex-shrink-0">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            )}
                          </div>
                          <span className={`text-[10px] leading-snug mt-1 ${active ? 'text-[#AF52DE]/75' : 'text-[#64748B]'}`}>
                            鎖定選定參考圖的色彩與質感
                          </span>
                        </button>
                      );
                    })()}

                    {/* 若有上傳參考圖且是主題相關選項組，動態插入「維持參考圖主題」按鈕 */}
                    {group.key === 'theme' && referenceImages && referenceImages.some(Boolean) && (() => {
                      const active = configs[activeSkill][group.key] === 'ref-theme';
                      return (
                        <button
                          type="button"
                          onClick={() => set(group.key, 'ref-theme')}
                          className={`flex flex-col gap-0.5 px-4 py-3 rounded-2xl border text-left transition-all duration-200 relative ${
                            active
                              ? 'bg-[#FAF5FF] border-[#AF52DE] text-[#AF52DE] shadow-[0_4px_12px_rgba(175,82,222,0.08)]'
                              : 'bg-white border-[#E2E8F0] hover:border-[#cbd5e1] hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] text-[#1E293B]'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={`text-[13px] font-bold leading-tight flex items-center gap-1.5 ${active ? 'text-[#7e22ce]' : 'text-[#1E293B]'}`}>
                              <Icon name="category" size={15} className={active ? 'text-[#AF52DE]' : 'text-gray-400'} />
                              維持參考圖主題
                            </span>
                            {active && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-[#AF52DE] flex-shrink-0">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            )}
                          </div>
                          <span className={`text-[10px] leading-snug mt-1 ${active ? 'text-[#AF52DE]/75' : 'text-[#64748B]'}`}>
                            由參考圖的主體物導引，不限主題
                          </span>
                        </button>
                      );
                    })()}

                    {group.options.map((opt: any) => {
                      const active = configs[activeSkill][group.key] === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => set(group.key, opt.id)}
                          title={opt.desc}
                          className={`flex flex-col gap-0.5 px-4 py-3 rounded-2xl border text-left transition-all duration-200 relative ${
                            active
                              ? 'bg-[#FAF5FF] border-[#AF52DE] text-[#AF52DE] shadow-[0_4px_12px_rgba(175,82,222,0.08)]'
                              : 'bg-white border-[#E2E8F0] hover:border-[#cbd5e1] hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] text-[#1E293B]'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={`text-[13px] font-semibold leading-tight ${active ? 'text-[#7e22ce]' : 'text-[#1E293B]'}`}>
                              {opt.name_zh}
                            </span>
                            {active && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-[#AF52DE] flex-shrink-0">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            )}
                          </div>
                          <span className={`text-[10px] leading-snug mt-1 ${active ? 'text-[#AF52DE]/75' : 'text-[#64748B]'}`}>
                            {opt.desc}
                          </span>
                        </button>
                      );
                    })}

                    {isStyleGroup && (() => {
                      const currentVal = configs[activeSkill][group.key];
                      const selectedPreset = groupMeta.templates.find((p: any) => p.id === currentVal);
                      const active = !!selectedPreset;
                      return (
                        <div
                          className={`flex flex-col gap-0.5 px-4 py-3 rounded-2xl border text-left transition-all duration-200 relative cursor-pointer min-h-[64px] ${
                            active
                              ? 'bg-[#FAF5FF] border-[#AF52DE] text-[#AF52DE] shadow-[0_4px_12px_rgba(175,82,222,0.08)]'
                              : 'bg-white border-dashed border-[#cbd5e1] hover:border-[#AF52DE] hover:shadow-[0_4px_12px_rgba(175,82,222,0.02)] text-[#64748B]'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full pointer-events-none">
                            <span className={`text-[13px] font-bold leading-tight flex items-center gap-1.5 ${active ? 'text-[#7e22ce]' : 'text-[#475569]'}`}>
                              <Icon name={groupMeta.icon} size={15} className={active ? 'text-[#AF52DE]' : 'text-gray-400'} />
                              {active ? selectedPreset.name_zh : groupMeta.placeholder}
                            </span>
                            {active ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-[#AF52DE] flex-shrink-0">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 flex-shrink-0">
                                <polyline points="6 9 12 15 18 9"></polyline>
                              </svg>
                            )}
                          </div>
                          <span className={`text-[10px] leading-snug mt-1 pointer-events-none ${active ? 'text-[#AF52DE]/75' : 'text-gray-400'}`}>
                            {active ? `風格：${selectedPreset.name}` : groupMeta.libraryDesc}
                          </span>
                          
                          <select
                            value={active ? currentVal : ''}
                            onChange={e => {
                              const val = e.target.value;
                              if (val) {
                                set(group.key, val);
                              } else {
                                const defaultVal = SKILL_LIST.find(s => s.id === activeSkill)?.defaultConfig[group.key];
                                if (defaultVal !== undefined) {
                                  set(group.key, defaultVal);
                                }
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          >
                            <option value="">{groupMeta.emptyOption}</option>
                            {groupMeta.categories.map((category: { label: string; ids: string[] }) => {
                              const categoryPresets = category.ids
                                .map(id => groupMeta.templates.find((p: any) => p.id === id))
                                .filter(Boolean) as any[];
                              if (categoryPresets.length === 0) return null;
                              return (
                                <optgroup key={category.label} label={category.label}>
                                  {categoryPresets.map(preset => (
                                    <option key={preset.id} value={preset.id}>
                                      {preset.name_zh} ({preset.name})
                                    </option>
                                  ))}
                                </optgroup>
                              );
                            })}
                          </select>
                        </div>
                      );
                    })()}
                  </div>

                  {/* 維持參考圖風格的子選擇面板 */}
                  {isStyleGroup && configs[activeSkill][group.key] === 'ref-style' && referenceImages && referenceImages.some(Boolean) && (
                    <div className="mt-3 bg-purple-50/20 border border-purple-100/30 p-4 rounded-2xl flex flex-col gap-4 animate-[fadeIn_0.2s_ease-out]">
                      {/* 1. 選擇參考圖 */}
                      <div className="flex flex-col gap-2.5">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">請選擇風格來源的參考圖：</span>
                        <div className="flex flex-wrap gap-2.5">
                          {referenceImages.map((src, idx) => {
                            if (!src) return null;
                            const circledNums = ['①','②','③','④','⑤','⑥','⑦','⑧'];
                            const isSelected = (configs[activeSkill].refStyleIndex ?? 0) === idx;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setConfigs(prev => ({
                                    ...prev,
                                    [activeSkill]: {
                                      ...prev[activeSkill],
                                      refStyleIndex: idx
                                    }
                                  }));
                                }}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-white border-[#AF52DE] text-[#AF52DE] shadow-[0_2px_8px_rgba(175,82,222,0.12)]'
                                    : 'bg-[#F8FAFC] border-[#E2E8F0] text-gray-600 hover:border-gray-300 hover:bg-white'
                                }`}
                              >
                                <img src={src} alt={`參考圖 ${idx + 1}`} className="w-8 h-8 rounded-lg object-cover border border-black/5" />
                                <span>參考圖 {circledNums[idx]}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. 選擇參考範圍 */}
                      <div className="flex flex-col gap-2.5 border-t border-purple-100/30 pt-3">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">請選擇參考範圍：</span>
                        <div className="flex gap-2">
                          {([
                            { id: 'all', name: '風格與結構並重', desc: '複製排版/姿勢與色彩/質感' },
                            { id: 'style-only', name: '僅參考風格', desc: '僅套用色彩與畫風，忽略其構圖排版' }
                          ] as const).map(item => {
                            const isSelected = (configs[activeSkill].refStyleScope || 'all') === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setConfigs(prev => ({
                                    ...prev,
                                    [activeSkill]: {
                                      ...prev[activeSkill],
                                      refStyleScope: item.id
                                    }
                                  }));
                                }}
                                className={`flex flex-col gap-0.5 px-4 py-2.5 rounded-xl border text-left transition-all cursor-pointer flex-1 ${
                                  isSelected
                                    ? 'bg-white border-[#AF52DE] text-[#AF52DE] shadow-[0_2px_8px_rgba(175,82,222,0.12)]'
                                    : 'bg-[#F8FAFC] border-[#E2E8F0] text-gray-600 hover:border-gray-300 hover:bg-white'
                                }`}
                              >
                                <span className="text-[11px] font-bold">{item.name}</span>
                                <span className="text-[9px] text-gray-400 font-normal leading-tight">{item.desc}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          {/* 進階選項 (Seed 設定) */}
          <div className="mt-6 pt-5 border-t border-gray-100/80 pb-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-bold text-gray-700">🎨 進階風格控制 (Seed)</span>
                <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-px rounded font-semibold">隨機數</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useCustomSeed}
                  onChange={(e) => setUseCustomSeed(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600"></div>
                <span className="ml-2 text-[10px] font-bold text-gray-500">自訂 Seed</span>
              </label>
            </div>
            
            {useCustomSeed && (
              <div className="bg-[#f8fafc] border border-gray-200 rounded-xl p-3 flex items-center gap-2 animate-fade-in-down">
                <input
                  type="number"
                  placeholder="請貼上或輸入種子碼 (例如 123456)"
                  value={customSeedValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCustomSeedValue(v === '' ? '' : Math.max(0, parseInt(v, 10)));
                  }}
                  className="flex-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-gray-800 focus:outline-none focus:border-purple-500 font-mono"
                />
                <button
                  onClick={() => setCustomSeedValue(Math.floor(Math.random() * 2147483647))}
                  className="px-2 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 text-[10px] font-bold transition-all active:scale-95"
                  title="生成隨機 Seed"
                >
                  🎲 隨機
                </button>
              </div>
            )}
            <p className="text-[10px] text-gray-400 mt-1 leading-normal">
              固定 Seed 能讓您在微調 Prompt 提示詞時，維持生成人物長相、背景架構與視覺風格的一致性。
            </p>
          </div>

          </div>

        </div>

        {/* 底部固定欄 (iOS Segmented Control & Premium Gradient 按鈕) */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white/95 backdrop-blur-[12px] flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">數量</span>
            <div className="qty-selector bg-[#F1F5F9] p-0.5 rounded-xl flex gap-0.5">
              {([1, 2, 3, 4] as const).map(n => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`w-8 h-8 rounded-lg text-[13px] font-bold transition-all ${
                    count === n
                      ? 'bg-white text-[#AF52DE] shadow-[0_2px_4px_rgba(0,0,0,0.05)]'
                      : 'text-[#64748B] hover:text-[#1E293B]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#AF52DE] to-[#5856D6] text-white font-bold text-[14px] shadow-[0_4px_12px_rgba(175,82,222,0.25)] hover:opacity-95 hover:shadow-[0_6px_16px_rgba(175,82,222,0.35)] hover:-translate-y-[0.5px] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            <Icon name="auto_awesome" size={15} />
            {isGenerating ? '生成中…' : `生成${currentSkill.name_zh}`}
          </button>
        </div>
      </div>
    </div>
  );
};
