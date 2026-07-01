import React, { useState, useEffect } from 'react';
import {
  PRODUCT_MARKETING_PLATFORMS,
  PRODUCT_MARKETING_DEFAULT_CONFIG,
  type ProductMarketingBrief,
} from '../skills/marketing';

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

interface ProductMarketingModalProps {
  imageName?: string;
  hasAtlas?: boolean;
  onGenerate: (brief: ProductMarketingBrief, model: string, resolution: '1K' | '2K' | '4K', selectedRecipeIds: string[], platformId: string) => void;
  onClose: () => void;
}

const cleanName = (name: string): string => {
  if (!name) return '';
  return name
    .trim()
    .replace(/[\uff08(].*?[\uff09)]/g, '')
    .replace(/\.[a-zA-Z0-9]+$/, '')
    .trim();
};

export const ProductMarketingModal: React.FC<ProductMarketingModalProps> = ({ imageName, hasAtlas = false, onGenerate, onClose }) => {
  const [productName, setProductName] = useState('');
  const [sellingPoints, setSellingPoints] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [visualTone, setVisualTone] = useState('乾淨專業');
  const [lockStyleConsistency, setLockStyleConsistency] = useState(true);
  const [model, setModel] = useState('gemini');
  const [imageSize, setImageSize] = useState<'2K' | '4K'>('2K');

  // 當前選定的平台分類，預設通用電商
  const [activePlatform, setActivePlatform] = useState<string>('general_ecommerce');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [isMouseDownOnBackdrop, setIsMouseDownOnBackdrop] = useState(false);

  // 動態增設自訂規格清單
  const [dynamicCustomAssets, setDynamicCustomAssets] = useState<{ id: string; title: string }[]>([]);
  const [newAssetInput, setNewAssetInput] = useState('');

  const currentPlatformSpecs = PRODUCT_MARKETING_PLATFORMS[activePlatform]?.recipes || [];

  const navRef = React.useRef<HTMLDivElement>(null);
  const activeTabRef = React.useRef<HTMLButtonElement>(null);

  // 當切換平台分類時，預設留空不勾選任何內建規格項目
  useEffect(() => {
    setSelectedAssets(prev => {
      // 僅保留自訂項目 ID (以 'custom_' 開頭)
      return prev.filter(id => id.startsWith('custom_'));
    });
  }, [activePlatform]);

  // 1. 自動將目前選取的平台分頁置中捲動
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activePlatform]);

  // 2. 映射滑輪事件以支援桌機滑鼠橫向滾動
  useEffect(() => {
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

  // 全選/全不選功能
  const activePlatformCheckedCount = currentPlatformSpecs.filter(s => selectedAssets.includes(s.id)).length;
  const isAllChecked = activePlatformCheckedCount === currentPlatformSpecs.length;

  const toggleAll = () => {
    const recipeIds = currentPlatformSpecs.map(s => s.id);
    if (isAllChecked) {
      setSelectedAssets(prev => prev.filter(id => !recipeIds.includes(id)));
    } else {
      setSelectedAssets(prev => {
        const others = prev.filter(id => !recipeIds.includes(id));
        return [...others, ...recipeIds];
      });
    }
  };

  const addCustomAsset = () => {
    const val = newAssetInput.trim();
    if (!val) return;
    const newId = `custom_${Date.now()}`;
    setDynamicCustomAssets(prev => [...prev, { id: newId, title: val }]);
    setSelectedAssets(prev => [...prev, newId]);
    setNewAssetInput('');
  };

  const removeCustomAsset = (id: string) => {
    setDynamicCustomAssets(prev => prev.filter(item => item.id !== id));
    setSelectedAssets(prev => prev.filter(x => x !== id));
  };

  const submit = () => {
    const activeCustom = dynamicCustomAssets
      .filter(item => selectedAssets.includes(item.id))
      .map(item => item.title);
    const activeBuiltIn = selectedAssets.filter(id => !id.startsWith('custom_'));

    if (!productName.trim() || (activeBuiltIn.length === 0 && activeCustom.length === 0)) return;

    const brief: ProductMarketingBrief = {
      productName: productName.trim(),
      sellingPoints: sellingPoints.trim(),
      targetAudience: targetAudience.trim(),
      visualTone: visualTone.trim() || '乾淨專業',
      customAssets: activeCustom,
      lockStyleConsistency,
    };

    onGenerate(brief, model, imageSize, activeBuiltIn, activePlatform);
    onClose();
  };

  const inputClass = "w-full bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-[12px] text-[#1E293B] placeholder:text-gray-300 focus:outline-none focus:border-[#AF52DE]";
  const selectClass = "w-full appearance-none bg-white border border-[#E2E8F0] rounded-xl pl-3 pr-8 py-2 text-[12px] font-semibold text-[#1E293B] focus:outline-none focus:border-[#AF52DE] cursor-pointer";

  return (
    <div
      className="fixed inset-0 z-[7000] flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      <style>{`
        .mktg-platform-nav::-webkit-scrollbar {
          display: none;
        }
        .mktg-platform-nav {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div
        className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/50 w-[460px] max-h-[85vh] overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4">
          <h3 className="font-bold text-[#1D1D1F] text-[15px] mb-1">📦 產品行銷組圖</h3>
          <p className="text-[11px] text-[#86868B] leading-relaxed">
            AI 將智慧分析您的商品照，自動保留產品本體與細節，延伸融入符合各平台行銷規格的精美場景。
          </p>
        </div>

        {/* 產品名稱 */}
        <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-1.5">產品名稱 / 品類 *</div>
        <input
          value={productName}
          onChange={e => setProductName(e.target.value)}
          placeholder="例：智慧保溫杯、無矽靈洗髮精"
          className={`${inputClass} mb-3`}
          autoFocus
        />

        {/* 進階設定折疊面板 */}
        <details className="mb-4 group border border-gray-100 rounded-xl bg-purple-50/10 p-1">
          <summary className="text-[11px] font-bold text-[#AF52DE] cursor-pointer select-none py-1.5 px-2.5">
            進階行銷與視覺設定（選填）
          </summary>
          <div className="space-y-3 mt-2 p-2.5 bg-white rounded-lg border border-gray-100/50">
            {/* 風格一致性鎖定 */}
            <div className="flex items-center gap-2 mb-1 bg-purple-50/20 p-2.5 rounded-xl border border-purple-100/50">
              <label className="flex items-center gap-2.5 cursor-pointer select-none w-full">
                <input
                  type="checkbox"
                  checked={lockStyleConsistency}
                  onChange={e => setLockStyleConsistency(e.target.checked)}
                  className="rounded border-[#AF52DE]/30 text-[#AF52DE] focus:ring-[#AF52DE] w-3.5 h-3.5 cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#AF52DE]">保持整組風格與色調一致</span>
                  <span className="text-[9px] text-[#86868B] font-normal leading-tight mt-0.5">鎖定種子碼與智慧配色分析，使系列圖極具一致感</span>
                </div>
              </label>
            </div>

            {/* 核心賣點 */}
            <div>
              <div className="text-[10px] font-bold text-[#86868B] uppercase tracking-wide mb-1">核心賣點</div>
              <input
                value={sellingPoints}
                onChange={e => setSellingPoints(e.target.value)}
                placeholder="例：24小時雙層保溫、莫蘭迪色簡約杯身"
                className={inputClass}
              />
            </div>

            {/* 目標受眾 */}
            <div>
              <div className="text-[10px] font-bold text-[#86868B] uppercase tracking-wide mb-1">目標受眾</div>
              <input
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value)}
                placeholder="例：上班族、長途旅行者、精緻生活追求者"
                className={inputClass}
              />
            </div>

            {/* 視覺風格調性 */}
            <div>
              <div className="text-[10px] font-bold text-[#86868B] uppercase tracking-wide mb-1">視覺風格調性</div>
              <input
                value={visualTone}
                onChange={e => setVisualTone(e.target.value)}
                placeholder="例：乾淨專業、溫馨木質調、現代科技感"
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
        <p className="text-[10px] text-[#86868B] mb-4">解析度越高生成時間越長。</p>

        {/* 行銷平台選擇 Tab 列 */}
        <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-2">選擇行銷平台 / 通路</div>
        <div className="relative mb-3">
          <div
            ref={navRef}
            className="flex gap-1 overflow-x-auto pb-1 border-b border-[#E2E8F0] mktg-platform-nav scroll-smooth"
          >
            {Object.values(PRODUCT_MARKETING_PLATFORMS).map(platform => {
              const active = activePlatform === platform.id;
              return (
                <button
                  key={platform.id}
                  ref={active ? activeTabRef : undefined}
                  type="button"
                  onClick={() => setActivePlatform(platform.id)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#AF52DE]/10 text-[#AF52DE]'
                      : 'text-[#64748B] hover:bg-gray-50'
                  }`}
                >
                  {platform.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 選擇要延伸生成的行銷規格 */}
        <div className="flex justify-between items-center mb-2">
          <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide">選擇要延伸生成的行銷規格</div>
          <button
            type="button"
            onClick={toggleAll}
            className="text-[#AF52DE] text-[10px] font-semibold hover:underline cursor-pointer"
          >
            {isAllChecked ? '✕ 全不選' : '✓ 全選'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto mb-3 border border-[#E2E8F0] p-2.5 rounded-xl bg-gray-50/50">
          {/* 內建平台專屬規格 */}
          {currentPlatformSpecs.map(spec => {
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
                <div className="truncate flex-1">
                  <div>{spec.title}</div>
                  <div className="text-[9px] text-[#86868B] font-normal">{spec.aspectRatio}</div>
                </div>
              </button>
            );
          })}

          {/* 動態自訂規格 */}
          {dynamicCustomAssets.map(item => {
            const on = selectedAssets.includes(item.id);
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all group/item ${
                  on
                    ? 'border-[#AF52DE] bg-purple-50 text-[#AF52DE]'
                    : 'border-[#E2E8F0] bg-white text-[#64748B]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleAsset(item.id)}
                  className="flex items-center gap-2 text-left truncate flex-1 cursor-pointer"
                >
                  <span
                    className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] text-white shrink-0 ${
                      on ? 'bg-[#AF52DE]' : 'bg-gray-200'
                    }`}
                  >
                    {on ? '✓' : ''}
                  </span>
                  <div className="truncate flex-1">
                    <div>{item.title}</div>
                    <div className="text-[9px] text-[#86868B] font-normal">4:3</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => removeCustomAsset(item.id)}
                  className="text-gray-400 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity ml-1 px-1 cursor-pointer"
                  title="刪除此項目"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        {/* 新增自訂規格輸入列 */}
        <div className="flex gap-1.5 mb-5">
          <input
            value={newAssetInput}
            onChange={e => setNewAssetInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomAsset();
              }
            }}
            placeholder="自訂其他行銷規格，例：中秋促銷海報"
            className="flex-1 bg-white border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-[11px] text-[#1E293B] placeholder:text-gray-300 focus:outline-none focus:border-[#AF52DE]"
          />
          <button
            type="button"
            onClick={addCustomAsset}
            className="px-3.5 py-1.5 bg-[#AF52DE] text-white text-[11px] font-medium rounded-xl hover:bg-[#9a3fc7] transition-colors cursor-pointer shrink-0"
          >
            ＋新增
          </button>
        </div>

        {/* 按鈕 */}
        {(() => {
          const activeCustomCount = dynamicCustomAssets.filter(item => selectedAssets.includes(item.id)).length;
          const activeBuiltInCount = selectedAssets.filter(id => currentPlatformSpecs.map(r => r.id).includes(id)).length;
          const totalCount = activeCustomCount + activeBuiltInCount;
          const isButtonDisabled = !productName.trim() || totalCount === 0;

          return (
            <>
              <div className="flex gap-2">
                <button onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors">
                  取消
                </button>
                <button onClick={submit} disabled={isButtonDisabled}
                  className="flex-1 py-2.5 rounded-xl bg-[#AF52DE] text-white text-[13px] font-medium hover:bg-[#9a3fc7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  生成 {totalCount} 張行銷物料
                </button>
              </div>
              <p className="text-center text-[10px] text-[#86868B] mt-2">結果自動排在主產品圖片右側</p>
            </>
          );
        })()}
      </div>
    </div>
  );
};
