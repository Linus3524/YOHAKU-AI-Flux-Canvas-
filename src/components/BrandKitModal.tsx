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

export const BrandKitModal: React.FC<BrandKitModalProps> = ({ imageName, hasAtlas = false, onGenerate, onClose }) => {
  const [brandName, setBrandName] = useState(imageName?.replace(/[（(].+[）)]$/, '').trim() || '');
  const [slogan, setSlogan] = useState('');
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
      isBrandKit: true,
      brandKitResolution: imageSize,
    };
    onGenerate(brief, model, imageSize, selectedAssets);
    onClose();
  };

  const selectClass = "w-full appearance-none bg-white border border-[#E2E8F0] rounded-xl pl-3 pr-8 py-2 text-[12px] font-semibold text-[#1E293B] focus:outline-none focus:border-[#AF52DE] cursor-pointer";
  const inputClass = "w-full bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-[12px] text-[#1E293B] placeholder:text-gray-300 focus:outline-none focus:border-[#AF52DE]";

  return (
    <div className="fixed inset-0 z-[7000] flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/50 w-[440px] max-h-[85vh] overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}
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
          className={`${inputClass} mb-3`}
          autoFocus
        />

        {/* 品牌標語（選填） */}
        <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-1.5">品牌標語 <span className="text-gray-300 font-normal normal-case">（選填）</span></div>
        <input
          value={slogan}
          onChange={e => setSlogan(e.target.value)}
          placeholder="例：Design Your Imagination"
          className={`${inputClass} mb-4`}
        />

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
        <p className="text-center text-[10px] text-[#86868B] mt-2">結果自動排在主 Logo 圖片右側</p>
      </div>
    </div>
  );
};
