import React, { useState } from 'react';
import { CROSS_PLATFORM_SPECS } from '../skills/crossPlatform';

const MODEL_OPTIONS: { id: string; label: string; needsAtlas: boolean }[] = [
  { id: 'gemini', label: 'Gemini 3 Flash / Pro（預設）', needsAtlas: false },
  { id: 'gpt-image-2', label: 'GPT Image 2', needsAtlas: true },
  { id: 'seedream-v4.5', label: '即夢 Seedream v4.5', needsAtlas: true },
  { id: 'seedream-v5', label: '即夢 Seedream v5 Lite', needsAtlas: true },
  { id: 'qwen-image-2', label: '通義千問 Qwen Image 2.0', needsAtlas: true },
];

interface CrossPlatformModalProps {
  imageName?: string;
  /** 目前全域生成模型,當作預設選項 */
  defaultModel?: string;
  /** 是否有 Atlas Cloud Key（沒有則 Atlas 系模型停用） */
  hasAtlas?: boolean;
  onGenerate: (platformIds: string[], opts: { preserveSubject: boolean; keepText: boolean; model: string; imageSize: '2K' | '4K' }) => void;
  onClose: () => void;
}

const DEFAULT_SELECTED = ['xiaohongshu', 'instagram-feed', 'instagram-story', 'youtube', 'facebook-link'];
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
  const [model, setModel] = useState<string>(() => {
    const d = defaultModel || 'gemini';
    const opt = MODEL_OPTIONS.find(o => o.id === d);
    return opt && (!opt.needsAtlas || hasAtlas) ? d : 'gemini';
  });
  const isGemini = model === 'gemini';

  const toggle = (id: string) =>
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const submit = () => {
    if (selected.length === 0) return;
    onGenerate(selected, { preserveSubject, keepText, model, imageSize });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[7000] flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/50 w-[440px] p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4">
          <h3 className="font-bold text-[#1D1D1F] text-[15px] mb-1">一鍵跨平台適配</h3>
          <p className="text-[11px] text-[#86868B] leading-relaxed">
            把{imageName ? `「${imageName}」` : '這張圖'}依各平台比例與安全區重構成多張成品。<br />
            每個平台會以原圖為參考、由 AI 重新構圖（必要時擴圖、不裁壞主體）。
          </p>
        </div>

        <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-2">生成模型</div>
        <select
          value={model}
          onChange={e => setModel(e.target.value)}
          className="w-full mb-4 bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-[12px] font-semibold text-[#1E293B] focus:outline-none focus:border-[#AF52DE] cursor-pointer"
        >
          {MODEL_OPTIONS.map(o => (
            <option key={o.id} value={o.id} disabled={o.needsAtlas && !hasAtlas}>
              {o.label}{o.needsAtlas && !hasAtlas ? '（需 Atlas Key）' : ''}
            </option>
          ))}
        </select>

        <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-2">輸出解析度</div>
        <div className="grid grid-cols-2 gap-1.5 bg-[#F1F5F9] p-0.5 rounded-xl mb-1">
          {SIZE_OPTIONS.map(o => (
            <button
              key={o.id}
              type="button"
              disabled={isGemini}
              onClick={() => setImageSize(o.id)}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                imageSize === o.id && !isGemini
                  ? 'bg-white text-[#AF52DE] shadow-[0_2px_4px_rgba(0,0,0,0.05)]'
                  : 'text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-[#86868B] mb-4">
          {isGemini ? 'Gemini 固定輸出原生解析度（約 1K 級），此設定不適用。' : '僅影響 Atlas 系模型（GPT/Seedream/Qwen）的輸出解析度。'}
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
