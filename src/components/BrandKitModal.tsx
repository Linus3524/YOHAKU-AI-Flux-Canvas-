import React, { useState } from 'react';
import {
  LOGO_DEFAULT_CONFIG, LOGO_BRAND_OUTPUTS, type LogoSkillConfig,
} from '../skills/logo';

const MODEL_OPTIONS: { id: string; label: string; needsAtlas: boolean }[] = [
  { id: 'gemini', label: 'Gemini 3 Flash / Pro（預設）', needsAtlas: false },
  { id: 'gpt-image-2', label: 'GPT Image 2', needsAtlas: true },
  { id: 'seedream-v4.5', label: '即夢 Seedream v4.5', needsAtlas: true },
  { id: 'seedream-v5', label: '即夢 Seedream v5 Lite', needsAtlas: true },
  { id: 'qwen-image-2', label: '通義千問 Qwen Image 2.0', needsAtlas: true },
];

const SIZE_OPTIONS: { id: '2K' | '4K'; label: string }[] = [
  { id: '2K', label: '2K（建議）' },
  { id: '4K', label: '4K（慢，較貴）' },
];

interface BrandKitModalProps {
  imageName?: string;
  hasAtlas?: boolean;
  onGenerate: (brief: LogoSkillConfig, model: string, resolution: '1K' | '2K' | '4K', selectedAssetIds: string[]) => void;
  onClose: () => void;
}

const cleanName = (name: string): string => {
  if (!name) return '';
  return name
    .trim()
    .replace(/[\uff08(].*?[\uff09)]/g, '') // 清除全形與半形括弧及其內容 (如：主 Logo)
    .replace(/\.[a-zA-Z0-9]+$/, '') // 清除副檔名 (如：.png, .jpg)
    .trim();
};

export const BrandKitModal: React.FC<BrandKitModalProps> = ({ imageName, hasAtlas = false, onGenerate, onClose }) => {
  const [brandName, setBrandName] = useState('');
  const [slogan, setSlogan] = useState('');
  const [model, setModel] = useState('gemini');
  const [imageSize, setImageSize] = useState<'2K' | '4K'>('2K');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]); // 預設全部沒勾，使用者自己挑
  const [isMouseDownOnBackdrop, setIsMouseDownOnBackdrop] = useState(false);

  // 選填進階欄位
  const [industry, setIndustry] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [positioning, setPositioning] = useState('');
  const [personality, setPersonality] = useState('');
  const [logoStyle, setLogoStyle] = useState('');
  const [usageContexts, setUsageContexts] = useState('');
  const [customAssetsInput, setCustomAssetsInput] = useState('');

  const parsedCustomAssets = customAssetsInput
    .split(/[,，、;；]/)
    .map(x => x.trim())
    .filter(Boolean);

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsMouseDownOnBackdrop(true);
    } else {
      setIsMouseDownOnBackdrop(false);
    }
  };

  const handleBackdropMouseUp = (e: React.MouseEvent) => {
    if (isMouseDownOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
    setIsMouseDownOnBackdrop(false);
  };

  const toggleAsset = (id: string) => {
    setSelectedAssets(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const submit = () => {
    const customList = parsedCustomAssets;
    if (!brandName.trim() || (selectedAssets.length === 0 && customList.length === 0)) return;
    const brief: LogoSkillConfig = {
      ...LOGO_DEFAULT_CONFIG,
      brandName: brandName.trim(),
      slogan: slogan.trim(),
      industry: industry.trim() || LOGO_DEFAULT_CONFIG.industry,
      targetAudience: targetAudience.trim() || LOGO_DEFAULT_CONFIG.targetAudience,
      positioning: positioning.trim() || LOGO_DEFAULT_CONFIG.positioning,
      personality: personality.trim() || LOGO_DEFAULT_CONFIG.personality,
      usageContexts: usageContexts.trim() || LOGO_DEFAULT_CONFIG.usageContexts,
      logoStyle: logoStyle.trim() || LOGO_DEFAULT_CONFIG.logoStyle,
      isBrandKit: true,
      brandKitResolution: imageSize,
      customAssets: customList,
    };
    onGenerate(brief, model, imageSize, selectedAssets);
    onClose();
  };

  const selectClass = "w-full appearance-none bg-white border border-[#E2E8F0] rounded-xl pl-3 pr-8 py-2 text-[12px] font-semibold text-[#1E293B] focus:outline-none focus:border-[#AF52DE] cursor-pointer";
  const inputClass = "w-full bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-[12px] text-[#1E293B] placeholder:text-gray-300 focus:outline-none focus:border-[#AF52DE]";
  const labelClass = "text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-1.5 block";

  return (
    <div
      className="fixed inset-0 z-[7000] flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      <div
        className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/50 w-[440px] max-h-[85vh] overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4">
          <h3 className="font-bold text-[#1D1D1F] text-[15px] mb-1">🎨 延伸品牌套件</h3>
          <p className="text-[11px] text-[#86868B] leading-relaxed">
            AI 將自動分析您選取的這張 Logo 圖片，智慧擷取其色彩、風格與視覺意境，
            延伸生成一系列專業品牌視覺資產。
          </p>
        </div>

        {/* 品牌名稱（必填） */}
        <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-1.5">品牌名稱 *</div>
        <input
          value={brandName}
          onChange={e => setBrandName(e.target.value)}
          placeholder="例：YOHAKU、Café Lumière"
          className={`${inputClass} mb-4`}
          autoFocus
        />

        {/* 進階品牌自訂選項（選填） */}
        <details className="mb-4 group border border-gray-100 rounded-xl bg-purple-50/10 p-1">
          <summary className="text-[11px] font-bold text-[#AF52DE] cursor-pointer select-none py-1.5 px-2.5">
            ▶ 進階品牌設定（選填，未填寫則由 AI 自動分析 Logo）
          </summary>
          <div className="space-y-3 mt-2 p-2.5 bg-white rounded-lg border border-gray-100/50">
            <div>
              <div className="text-[10px] font-bold text-[#86868B] uppercase tracking-wide mb-1">品牌標語</div>
              <input
                value={slogan}
                onChange={e => setSlogan(e.target.value)}
                placeholder="例：Design Your Imagination"
                className={inputClass}
              />
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#86868B] uppercase tracking-wide mb-1">行業背景</div>
              <input
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                placeholder="例：精品咖啡、智慧科技 SaaS"
                className={inputClass}
              />
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#86868B] uppercase tracking-wide mb-1">目標受眾</div>
              <input
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value)}
                placeholder="例：注重質感的生活美學追求者"
                className={inputClass}
              />
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#86868B] uppercase tracking-wide mb-1">品牌定位</div>
              <input
                value={positioning}
                onChange={e => setPositioning(e.target.value)}
                placeholder="例：高端、簡約、具獨特品牌記憶點"
                className={inputClass}
              />
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#86868B] uppercase tracking-wide mb-1">品牌人格</div>
              <input
                value={personality}
                onChange={e => setPersonality(e.target.value)}
                placeholder="例：現代、優雅、精緻"
                className={inputClass}
              />
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#86868B] uppercase tracking-wide mb-1">Logo 設計風格</div>
              <input
                value={logoStyle}
                onChange={e => setLogoStyle(e.target.value)}
                placeholder="例：極簡線條、莫蘭迪色扁平插畫"
                className={inputClass}
              />
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#86868B] uppercase tracking-wide mb-1">使用情境</div>
              <input
                value={usageContexts}
                onChange={e => setUsageContexts(e.target.value)}
                placeholder="例：官網、名片、實體店面、產品包裝"
                className={inputClass}
              />
            </div>
          </div>
        </details>

        {/* 生成模型 */}
        <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-2">生成模型</div>
        <div className="relative w-full mb-4">
          <select value={model} onChange={e => setModel(e.target.value)} className={selectClass}>
            {MODEL_OPTIONS.map(o => (
              <option key={o.id} value={o.id} disabled={o.needsAtlas && !hasAtlas}>
                {o.label}{o.needsAtlas && !hasAtlas ? '（需 Atlas Key）' : ''}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#64748B] flex items-center">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* 輸出解析度 */}
        <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-2">輸出解析度</div>
        <div className="grid grid-cols-2 gap-1.5 bg-[#F1F5F9] p-0.5 rounded-xl mb-1">
          {SIZE_OPTIONS.map(o => (
            <button
              key={o.id}
              type="button"
              onClick={() => setImageSize(o.id)}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                imageSize === o.id
                  ? 'bg-white text-[#AF52DE] shadow-[0_2px_4px_rgba(0,0,0,0.05)]'
                  : 'text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-[#86868B] mb-4">僅影響生圖輸出的畫質等級。解析度越高生成時間越長。</p>

        {/* 選擇要延伸生成的品牌資產 */}
        <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-2">選擇要延伸生成的品牌資產</div>
        <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto mb-4 border border-[#E2E8F0] p-2.5 rounded-xl bg-gray-50/50">
          {LOGO_BRAND_OUTPUTS.map(spec => {
            const on = selectedAssets.includes(spec.id);
            return (
              <button
                key={spec.id}
                type="button"
                onClick={() => toggleAsset(spec.id)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold text-left transition-all cursor-pointer ${
                  on
                    ? 'border-[#AF52DE] bg-purple-50 text-[#AF52DE]'
                    : 'border-[#E2E8F0] bg-white text-[#64748B] hover:border-purple-200'
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] text-white shrink-0 ${
                    on ? 'bg-[#AF52DE]' : 'bg-gray-200'
                  }`}
                >
                  {on ? '✓' : ''}
                </span>
                <span className="truncate">{spec.title}</span>
              </button>
            );
          })}
        </div>

        {/* 自訂其他品牌資產（選填） */}
        <div className="mb-5">
          <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-1.5 flex items-center gap-1">
            <span>📝 自訂額外品牌資產</span>
            <span className="text-[#AF52DE] font-normal normal-case text-[10px]">（選填，多個以逗號區隔）</span>
          </div>
          <input
            value={customAssetsInput}
            onChange={e => setCustomAssetsInput(e.target.value)}
            placeholder="例：外帶飲料杯、店員帆布圍裙、外送保溫袋"
            className={inputClass}
          />
          <p className="text-[10px] text-[#86868B] mt-1.5 leading-relaxed">
            AI 將依您輸入的項目自動設計專業 Mockup，並智慧融合您的 Logo、配色與風格氣氛。
          </p>
        </div>

        {/* 按鈕 */}
        {(() => {
          const totalCount = selectedAssets.length + parsedCustomAssets.length;
          return (
            <>
              <div className="flex gap-2">
                <button onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors">
                  取消
                </button>
                <button onClick={submit} disabled={!brandName.trim() || totalCount === 0}
                  className="flex-1 py-2.5 rounded-xl bg-[#AF52DE] text-white text-[13px] font-medium hover:bg-[#9a3fc7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  生成 {totalCount} 張延伸資產
                </button>
              </div>
              <p className="text-center text-[10px] text-[#86868B] mt-2">結果自動排在主 Logo 圖片右側</p>
            </>
          );
        })()}
      </div>
    </div>
  );
};
