// 設計大師面板 — 便利貼右鍵開啟，選結構化選項生成貼圖
import React, { useState } from 'react';
import { Icon } from './Icon';
import {
  StickerSkillConfig,
  STICKER_DEFAULT_CONFIG,
  STICKER_OPTION_GROUPS,
  buildStickerPrompt,
} from '../skills/sticker';

interface DesignMasterPanelProps {
  noteContent: string;
  isGenerating: boolean;
  generationModel: string;
  hasAtlasKey: boolean;
  onGenerate: (prompt: string, count: 1 | 2 | 3 | 4, model: string, autoRemoveBg: boolean) => void;
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
  generationModel,
  hasAtlasKey,
  onGenerate,
  onClose,
}) => {
  const [config, setConfig] = useState<StickerSkillConfig>(STICKER_DEFAULT_CONFIG);
  const [count, setCount] = useState<1 | 2 | 3 | 4>(1);
  const [content, setContent] = useState(noteContent);
  const [model, setModel] = useState('gemini');

  const set = (key: keyof StickerSkillConfig, id: string) =>
    setConfig(prev => ({ ...prev, [key]: id }));

  const handleGenerate = () => {
    if (isGenerating) return;
    const prompt = buildStickerPrompt(content, config);
    onGenerate(prompt, count, model, config.background === 'transparent');
  };

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
      onClick={onClose}
      onKeyDown={e => e.stopPropagation()}
    >
      <div
        className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-white/60 w-[460px] max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 標題列 */}
        <div className="px-4 py-3 border-b border-black/5 flex justify-between items-center bg-white/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[#AF52DE]"><Icon name="auto_awesome" size={18} /></span>
            <h3 className="font-bold text-[#1D1D1F]">設計大師</h3>
            <span className="text-xs font-normal text-[#86868B]">貼圖</span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full text-[#86868B] hover:bg-black/5 hover:text-[#1D1D1F] transition-colors"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* 內容（可編輯） */}
        <div className="px-4 pt-3 flex-shrink-0">
          <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-1">內容（來自便利貼，可編輯）</div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="（便利貼是空的，將生成通用貼圖）"
            className="w-full text-[13px] text-[#1D1D1F] bg-[#F5F5F7] rounded-lg px-3 py-2 h-16 resize-none overflow-y-auto focus:outline-none focus:ring-2 focus:ring-[#AF52DE]/30"
          />
        </div>

        {/* 生圖模型 */}
        <div className="px-4 pt-3 flex-shrink-0">
          <div className="text-[11px] font-bold text-[#86868B] uppercase tracking-wide mb-1">生圖模型</div>
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            className="w-full bg-[#F5F5F7] border border-transparent rounded-lg px-3 py-2 text-[13px] text-[#1D1D1F] cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-[#AF52DE]/30"
          >
            {MODEL_OPTIONS.map(m => (
              <option key={m.id} value={m.id} disabled={m.needsAtlas && !hasAtlasKey}>
                {m.label}{m.needsAtlas && !hasAtlasKey ? '（需 Atlas Key）' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 選項群組 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {STICKER_OPTION_GROUPS.map(group => (
            <div key={group.key}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold text-[#86868B] tracking-wide">{group.label}</span>
                <div className="flex-1 h-px bg-black/6" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {group.options.map(opt => {
                  const active = config[group.key] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => set(group.key, opt.id)}
                      title={opt.desc}
                      className={`flex flex-col gap-0.5 px-2.5 py-2 rounded-xl border text-left transition-all ${
                        active
                          ? 'bg-[#1D1D1F] border-[#1D1D1F] text-white'
                          : 'bg-white border-black/5 hover:border-black/20'
                      }`}
                    >
                      <span className={`text-[12px] font-bold leading-tight ${active ? 'text-white' : 'text-[#1D1D1F]'}`}>{opt.name_zh}</span>
                      <span className={`text-[9px] leading-tight truncate ${active ? 'text-white/60' : 'text-[#A1A1A6]'}`}>{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 底部：數量 + 生成 */}
        <div className="px-4 py-3 border-t border-black/5 bg-gray-50/80 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#86868B]">數量</span>
            {([1, 2, 3, 4] as const).map(n => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`w-7 h-7 rounded-lg text-[12px] font-bold transition-all ${
                  count === n ? 'bg-[#AF52DE] text-white' : 'bg-white border border-black/5 text-[#1D1D1F] hover:border-black/20'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#AF52DE] to-[#007AFF] text-white font-bold text-[13px] shadow-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Icon name="auto_awesome" size={15} />
            {isGenerating ? '生成中…' : '生成貼圖'}
          </button>
        </div>
      </div>
    </div>
  );
};
