// 設計大師面板 — 更加精緻的 iOS/macOS 玻璃質感介面，解決多重滾動條與按鈕沉重感
import React, { useState } from 'react';
import { STYLE_PRESETS } from '../utils/helpers';
import { VISUAL_STYLE_TEMPLATES } from '../skills/styles';
import { DESIGN_MD_TEMPLATES } from '../skills/designs';
import { Icon } from './Icon';
import {
  SKILL_LIST,
  SkillType,
  buildSkillPrompt,
} from '../skills';
import { UI_PLATFORMS, UI_RESOLUTIONS, resolveAspectFromResolution } from '../skills/uiWebpage';
import { optimizePrompt } from '../skills/promptOptimizer';
import { Smartphone, Tablet, Monitor, Globe } from 'lucide-react';

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
  onGenerate: (prompt: string, count: 1 | 2 | 3 | 4, model: string, autoRemoveBg: boolean, aspect?: string) => void;
  onClose: () => void;
}

const MODEL_OPTIONS: { id: string; label: string; needsAtlas: boolean }[] = [
  { id: 'gemini', label: 'Gemini 3 Flash / Pro（預設）', needsAtlas: false },
  { id: 'gpt-image-2', label: 'GPT Image 2', needsAtlas: true },
  { id: 'seedream-v4.5', label: '即夢 Seedream v4.5', needsAtlas: true },
  { id: 'seedream-v5', label: '即夢 Seedream v5 Lite', needsAtlas: true },
  { id: 'qwen-image-2', label: '通義千問 Qwen Image 2.0', needsAtlas: true },
];

export const DesignMasterPanel: React.FC<DesignMasterPanelProps> = ({
  noteContent,
  isGenerating,
  hasAtlasKey,
  apiKey,
  showToast,
  onGenerate,
  onClose,
}) => {
  const [activeSkill, setActiveSkill] = useState<SkillType>('sticker');
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleOptimizePrompt = async () => {
    if (!content.trim()) return;
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

  const [count, setCount] = useState<1 | 2 | 3 | 4>(1);
  const [content, setContent] = useState(noteContent);
  const [model, setModel] = useState('gemini');

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
    const prompt = buildSkillPrompt(activeSkill, content, configs[activeSkill]);
    const isSticker = activeSkill === 'sticker';
    const autoRemoveBg = isSticker && configs.sticker.background === 'transparent';
    
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
    
    onGenerate(prompt, count, model, autoRemoveBg, aspect);
  };

  return (
    <div
      className="fixed inset-0 z-[6050] flex items-center justify-center bg-[#0F172A]/40 backdrop-blur-[8px]"
      onClick={onClose}
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
            onClick={onClose}
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
                disabled={isOptimizing || !content.trim()}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#AF52DE] bg-purple-50 hover:bg-purple-100 disabled:opacity-40 disabled:hover:bg-purple-50 transition-all border border-purple-100/50 cursor-pointer"
              >
                <Icon name="auto_awesome" size={11} className={isOptimizing ? "animate-spin" : ""} />
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

          {/* 生圖模型 */}
          <div>
            <div className="text-[12px] font-bold text-[#475569] mb-2">生圖模型</div>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-[13px] text-[#1E293B] cursor-pointer appearance-none focus:outline-none focus:bg-white focus:border-[#AF52DE] focus:ring-4 focus:ring-[#AF52DE]/10 transition-all font-semibold"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 16px center'
              }}
            >
              {MODEL_OPTIONS.map(m => (
                <option key={m.id} value={m.id} disabled={m.needsAtlas && !hasAtlasKey}>
                  {m.label}{m.needsAtlas && !hasAtlasKey ? '（需 Atlas Key）' : ''}
                </option>
              ))}
            </select>
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
                return true;
              })
              .map(group => {
                const isStyleGroup = ['style', 'rendering', 'art', 'preset', 'brand'].includes(group.key);
                return (
                <div key={group.key}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[11px] font-bold text-[#475569] tracking-wide">{group.label}</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                      const selectedPreset = VISUAL_STYLE_TEMPLATES.find(p => p.id === currentVal)
                        || DESIGN_MD_TEMPLATES.find(p => p.id === currentVal);
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
                              <Icon name="palette" size={15} className={active ? 'text-[#AF52DE]' : 'text-gray-400'} />
                              {active ? selectedPreset.name_zh : (group.key === 'brand' ? '設計規格書...' : '藝術風格庫...')}
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
                            {active ? `風格：${selectedPreset.name}` : (group.key === 'brand' ? '選擇 50+ 種系統內建品牌規格書' : '選擇 60+ 種系統預設風格')}
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
                            <option value="">{group.key === 'brand' ? '選擇其他品牌規格書 / 清除品牌...' : '選擇其他藝術風格 / 清除風格...'}</option>
                            {group.key === 'brand'
                              ? BRAND_CATEGORIES.map(category => {
                                  const categoryPresets = category.ids
                                    .map(id => DESIGN_MD_TEMPLATES.find(p => p.id === id))
                                    .filter(Boolean) as typeof DESIGN_MD_TEMPLATES;
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
                                })
                              : DESIGN_STYLE_CATEGORIES.map(category => {
                                  const categoryPresets = category.ids
                                    .map(id => VISUAL_STYLE_TEMPLATES.find(p => p.id === id))
                                    .filter(Boolean) as typeof VISUAL_STYLE_TEMPLATES;
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
                                })
                            }
                          </select>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
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
