import React, { useState } from 'react';
import {
  LOGO_STYLES, LOGO_PALETTES, LOGO_INDUSTRIES, LOGO_MOODS,
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

export const BrandKitModal: React.FC<BrandKitModalProps> = ({ imageName, hasAtlas = false, onGenerate, onClose }) => {
  const [brandName, setBrandName] = useState(imageName?.replace(/[（(].+[）)]$/, '').trim() || '');
  const [slogan, setSlogan] = useState('');
  const [industry, setIndustry] = useState(LOGO_DEFAULT_CONFIG.industry);
  const [style, setStyle] = useState(LOGO_DEFAULT_CONFIG.style);
  const [palette, setPalette] = useState(LOGO_DEFAULT_CONFIG.palette);
  const [mood, setMood] = useState(LOGO_DEFAULT_CONFIG.mood);
  const [targetAudience, setTargetAudience] = useState(LOGO_DEFAULT_CONFIG.targetAudience);
  const [positioning, setPositioning] = useState(LOGO_DEFAULT_CONFIG.positioning);
  const [personality, setPersonality] = useState(LOGO_DEFAULT_CONFIG.personality);
  const [usageContexts, setUsageContexts] = useState(LOGO_DEFAULT_CONFIG.usageContexts);
  const [model, setModel] = useState('gemini');
  const [imageSize, setImageSize] = useState<'2K' | '4K'>('2K');
  const [selectedAssets, setSelectedAssets] = useState<string[]>(LOGO_BRAND_OUTPUTS.map(x => x.id));

  const toggleAsset = (id: string) => {
    setSelectedAssets(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const submit = () => {
    if (!brandName.trim() || selectedAssets.length === 0) return;
    const brief: LogoSkillConfig = {
      ...LOGO_DEFAULT_CONFIG,
      brandName: brandName.trim(),
      slogan: slogan.trim(),
      industry,
      style,
      palette,
      mood,
      targetAudience: targetAudience.trim() || LOGO_DEFAULT_CONFIG.targetAudience,
      positioning: positioning.trim() || LOGO_DEFAULT_CONFIG.positioning,
      personality: personality.trim() || LOGO_DEFAULT_CONFIG.personality,
      usageContexts: usageContexts.trim() || LOGO_DEFAULT_CONFIG.usageContexts,
      isBrandKit: true,
      brandKitResolution: imageSize,
    };
    onGenerate(brief, model, imageSize, selectedAssets);
    onClose();
  };

  const selectClass = "w-full appearance-none bg-white border border-[#E2E8F0] rounded-xl pl-3 pr-8 py-2 text-[12px] font-semibold text-[#1E293B] focus:outline-none focus:border-[#AF52DE] cursor-pointer";
  const inputClass = "w-full bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-[12px] text-[#1E293B] placeholder:text-gray-300 focus:outline-none focus:border-[#AF52DE]";
  const labelClass = "text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-1.5 block";

  // 自訂下拉選單渲染輔助，整合自訂三角形
  const renderCustomSelect = (
    val: string,
    onChangeFn: (e: React.ChangeEvent<HTMLSelectElement>) => void,
    opts: React.ReactNode,
    extraClass = ""
  ) => (
    <div className={`relative w-full ${extraClass}`}>
      <select value={val} onChange={onChangeFn} className={selectClass}>
        {opts}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#64748B] flex items-center">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[7000] flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/50 w-[460px] max-h-[85vh] overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5">
          <h3 className="font-bold text-[#1D1D1F] text-[15px] mb-1">🎨 延伸品牌套件</h3>
          <p className="text-[11px] text-[#86868B] leading-relaxed">
            以您右鍵選取的這張圖片作為「主 Logo 錨點」，AI 將保留這個<strong>完全相同的標誌設計</strong>，
            延伸生成 4 張 brand 視覺資產：品牌視覺板、名片/信紙/包裝、社群橫幅、網站首頁。
          </p>
        </div>

        {/* 品牌名稱（必填） */}
        <label className={labelClass}>品牌名稱 *</label>
        <input
          value={brandName}
          onChange={e => setBrandName(e.target.value)}
          placeholder="例：YOHAKU、Café Lumière"
          className={`${inputClass} mb-3`}
          autoFocus
        />

        {/* 品牌標語（選填） */}
        <label className={labelClass}>品牌標語 <span className="text-gray-300 font-normal normal-case">（選填）</span></label>
        <input
          value={slogan}
          onChange={e => setSlogan(e.target.value)}
          placeholder="例：Design Your Imagination"
          className={`${inputClass} mb-3`}
        />

        {/* 兩欄佈局 */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className={labelClass}>行業</label>
            {renderCustomSelect(
              industry,
              e => setIndustry(e.target.value),
              LOGO_INDUSTRIES.map(o => <option key={o.id} value={o.id}>{o.name_zh} {o.name}</option>)
            )}
          </div>
          <div>
            <label className={labelClass}>品牌調性</label>
            {renderCustomSelect(
              mood,
              e => setMood(e.target.value),
              LOGO_MOODS.map(o => <option key={o.id} value={o.id}>{o.name_zh} {o.name}</option>)
            )}
          </div>
          <div>
            <label className={labelClass}>視覺風格</label>
            {renderCustomSelect(
              style,
              e => setStyle(e.target.value),
              LOGO_STYLES.map(o => <option key={o.id} value={o.id}>{o.name_zh} {o.name}</option>)
            )}
          </div>
          <div>
            <label className={labelClass}>配色方案</label>
            {renderCustomSelect(
              palette,
              e => setPalette(e.target.value),
              LOGO_PALETTES.map(o => <option key={o.id} value={o.id}>{o.name_zh} {o.name}</option>)
            )}
          </div>
        </div>

        {/* 品牌簡報（進階） */}
        <details className="mb-4 group">
          <summary className="text-[11px] font-bold text-[#AF52DE] cursor-pointer select-none mb-2">
            ▶ 進階品牌簡報（展開可自訂）
          </summary>
          <div className="space-y-2.5 mt-2 bg-purple-50/30 rounded-xl p-3 border border-purple-100/50">
            <div>
              <label className={labelClass}>目標受眾</label>
              <input value={targetAudience} onChange={e => setTargetAudience(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>品牌定位</label>
              <input value={positioning} onChange={e => setPositioning(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>品牌人格</label>
              <input value={personality} onChange={e => setPersonality(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>使用情境</label>
              <input value={usageContexts} onChange={e => setUsageContexts(e.target.value)} className={inputClass} />
            </div>
          </div>
        </details>

        {/* 生成模型 */}
        <label className={labelClass}>生成模型</label>
        {renderCustomSelect(
          model,
          e => setModel(e.target.value),
          MODEL_OPTIONS.map(o => (
            <option key={o.id} value={o.id} disabled={o.needsAtlas && !hasAtlas}>
              {o.label}{o.needsAtlas && !hasAtlas ? '（需 Atlas Key）' : ''}
            </option>
          )),
          "mb-3"
        )}

        {/* 輸出解析度 */}
        <label className={labelClass}>輸出解析度</label>
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

        {/* 選擇品牌資產 */}
        <div className={labelClass}>選擇要延伸生成的品牌資產</div>
        <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto mb-5 border border-[#E2E8F0] p-2.5 rounded-xl bg-gray-50/50">
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
                  className={`w-3 h-3 rounded flex items-center justify-center text-[8px] text-white shrink-0 ${
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

        {/* 按鈕 */}
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors">
            取消
          </button>
          <button onClick={submit} disabled={!brandName.trim() || selectedAssets.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-[#AF52DE] text-white text-[13px] font-medium hover:bg-[#9a3fc7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            生成 {selectedAssets.length} 張延伸資產
          </button>
        </div>
        <p className="text-center text-[10px] text-[#86868B] mt-2">逐張依序生成（每張約 6–15 秒）· 結果排在原圖右側</p>
      </div>
    </div>
  );
};
