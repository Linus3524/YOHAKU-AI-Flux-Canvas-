import React, { useState } from 'react';
import { CROSS_PLATFORM_SPECS } from '../skills/crossPlatform';

const MODEL_OPTIONS: { id: string; label: string; badge: string; needsAtlas: boolean }[] = [
  { id: 'gemini', label: 'Gemini 3 Flash / Pro', badge: 'Gemini Key', needsAtlas: false },
  { id: 'gpt-image-2', label: 'GPT Image 2', badge: 'Atlas Cloud', needsAtlas: true },
  { id: 'flux-2-pro', label: 'FLUX.2 Pro', badge: 'Atlas Cloud', needsAtlas: true },
  { id: 'seedream-v4.5', label: '即夢 Seedream v4.5', badge: 'Atlas Cloud', needsAtlas: true },
  { id: 'seedream-v5', label: '即夢 Seedream v5 Lite', badge: 'Atlas Cloud', needsAtlas: true },
  { id: 'qwen-image-2', label: '通義千問 Qwen Image 2.0', badge: 'Atlas Cloud', needsAtlas: true },
];

interface CrossPlatformModalProps {
  imageName?: string;
  /** 目前全域生成模型,當作預設選項 */
  defaultModel?: string;
  /** 是否有 Atlas Cloud Key（沒有則 Atlas 系模型停用） */
  hasAtlas?: boolean;
  onGenerate: (platformIds: string[], opts: { preserveSubject: boolean; keepText: boolean; model: string; imageSize: '2K' | '4K'; seed?: number }) => void;
  onClose: () => void;
}

const DEFAULT_SELECTED = ['instagram-feed'];
// Atlas quality 只有 2K/4K 兩檔（無 1K），這裡只給真實存在的檔位，避免假選項
const SIZE_OPTIONS: { id: '2K' | '4K'; label: string }[] = [
  { id: '2K', label: '2K（建議）' },
  { id: '4K', label: '4K（慢，較貴）' },
];

export const CrossPlatformModal: React.FC<CrossPlatformModalProps> = ({ imageName, defaultModel, hasAtlas = false, onGenerate, onClose }) => {
  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTED);
  const [preserveSubject, setPreserveSubject] = useState(true);
  const [keepText, setKeepText] = useState(false);
  const [imageSize, setImageSize] = useState<'2K' | '4K'>('2K');
  const [model, setModel] = useState<string>('gemini');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [useCustomSeed, setUseCustomSeed] = useState(false);
  const [customSeedValue, setCustomSeedValue] = useState<number | ''>('');
  const isGemini = model === 'gemini';

  const toggle = (id: string) =>
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const submit = () => {
    if (selected.length === 0) return;
    const seedParam = useCustomSeed && customSeedValue !== '' ? Number(customSeedValue) : undefined;
    onGenerate(selected, { preserveSubject, keepText, model, imageSize, seed: seedParam });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[7000] flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/50 w-[440px] p-6"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
      >
        <div className="mb-4">
          <h3 className="font-bold text-[#1D1D1F] text-[15px] mb-1">一鍵跨平台適配</h3>
          <p className="text-[11px] text-[#86868B] leading-relaxed">
            將您選取的圖片，自動調整成多種不同的社群平台尺寸。<br />
            AI 會自動延伸背景並調整構圖，確保主體不變形、人臉與重點不被切到。
          </p>
        </div>

        <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-2">生成模型</div>
        <div className="relative w-full mb-4">
          {(() => {
            const selectedModelOpt = MODEL_OPTIONS.find(o => o.id === model) || MODEL_OPTIONS[0];
            return (
              <>
                <button
                  type="button"
                  onClick={() => setIsModelDropdownOpen(v => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-[12px] font-semibold text-[#1E293B] cursor-pointer hover:bg-[#F8FAFC] transition-all"
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
                        const isDisabled = opt.needsAtlas && !hasAtlas;
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
                            className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
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
        <p className="text-[10px] text-[#86868B] mb-4">
          僅影響生圖輸出的畫質等級。解析度越高生成時間越長。
        </p>

        <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-2">選擇平台</div>
        <div className="grid grid-cols-2 gap-1.5 mb-4">
          {CROSS_PLATFORM_SPECS.map(spec => {
            const on = selected.includes(spec.id);
            return (
              <button
                key={spec.id}
                type="button"
                onClick={() => toggle(spec.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[12px] font-semibold text-left transition-all cursor-pointer ${
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
                {spec.name}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 mb-4 bg-white/40 p-2.5 rounded-xl border border-gray-100">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={preserveSubject} onChange={e => setPreserveSubject(e.target.checked)}
              className="rounded border-[#cbd5e1] text-purple-600 focus:ring-purple-500" />
            <span className="text-[12px] font-semibold text-gray-700">嚴格保留主體（臉/產品身分）</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={keepText} onChange={e => setKeepText(e.target.checked)}
              className="rounded border-[#cbd5e1] text-purple-600 focus:ring-purple-500" />
            <span className="text-[12px] font-semibold text-gray-700">保留原圖文字（不新增文字）</span>
          </label>
        </div>

        {/* 進階風格控制 (Seed) */}
        <div className="mb-4 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide">進階風格控制 (Seed)</span>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input type="checkbox" checked={useCustomSeed} onChange={e => setUseCustomSeed(e.target.checked)}
                className="rounded border-[#cbd5e1] text-[#AF52DE] focus:ring-[#AF52DE] w-3 h-3 cursor-pointer" />
              <span className="text-[11px] font-semibold text-gray-500">自訂 Seed</span>
            </label>
          </div>
          {useCustomSeed && (
            <div className="bg-[#f8fafc] border border-[#E2E8F0] rounded-xl p-2.5 flex items-center gap-2 animate-fade-in-down">
              <input
                type="number"
                placeholder="請輸入種子碼 (例如 123456)"
                value={customSeedValue}
                onChange={e => {
                  const v = e.target.value;
                  setCustomSeedValue(v === '' ? '' : Math.max(0, parseInt(v, 10)));
                }}
                className="flex-1 bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-gray-800 focus:outline-none focus:border-[#AF52DE] font-mono"
              />
              <button
                type="button"
                onClick={() => setCustomSeedValue(Math.floor(Math.random() * 2147483647))}
                className="px-2 py-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-gray-50 text-gray-500 text-[10px] font-bold transition-all active:scale-95"
              >
                🎲 隨機
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors">
            取消
          </button>
          <button onClick={submit} disabled={selected.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-[#AF52DE] text-white text-[13px] font-medium hover:bg-[#9a3fc7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            生成 {selected.length} 張
          </button>
        </div>
        <p className="text-center text-[10px] text-[#86868B] mt-2">逐張依序生成（image API 較慢）· 結果排在原圖右側</p>
      </div>
    </div>
  );
};
