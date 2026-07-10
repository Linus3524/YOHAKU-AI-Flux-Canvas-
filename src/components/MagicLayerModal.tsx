import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';
import {
  DEFAULT_MAGIC_LAYER_OPTIONS,
  type MagicLayerModel,
  type MagicLayerOptions,
} from '../utils/gptLayerSplit';

interface MagicLayerModalProps {
  defaultModel: MagicLayerModel;
  hasAtlasKey: boolean;
  onClose: () => void;
  onStart: (options: MagicLayerOptions) => void;
}

const CATEGORIES = ['主體／人物', '商品／產品', '文字／Logo', '道具／小物', '裝飾／圖形'];
const COUNTS: Array<'auto' | number> = ['auto', 2, 4, 6, 8, 12, 16, 20];

const MODEL_INFO: Record<MagicLayerModel, { title: string; detail: string }> = {
  gemini: { title: 'Gemini', detail: '語意辨識後逐物件分離' },
  'gpt-image-2': { title: 'GPT Image 2', detail: '精細隔離與背景補全' },
  'seedream-v5-pro': { title: '即夢 Seedream 5.0 Pro', detail: '原生多圖層透明 PNG 輸出' },
};

export function MagicLayerModal({ defaultModel, hasAtlasKey, onClose, onStart }: MagicLayerModalProps) {
  const [options, setOptions] = useState<MagicLayerOptions>({ ...DEFAULT_MAGIC_LAYER_OPTIONS, model: defaultModel });

  useEffect(() => {
    setOptions(current => ({ ...current, model: defaultModel }));
  }, [defaultModel]);

  const set = <K extends keyof MagicLayerOptions>(key: K, value: MagicLayerOptions[K]) => {
    setOptions(current => ({ ...current, [key]: value }));
  };

  const toggleCategory = (category: string) => {
    set('categories', options.categories.includes(category)
      ? options.categories.filter(item => item !== category)
      : [...options.categories, category]);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4" onMouseDown={onClose}>
      <section className="w-full max-w-[620px] overflow-hidden rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">魔法分層</h2>
            <p className="mt-0.5 text-xs text-neutral-500">先決定需要哪些可編輯圖層，再開始處理。</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center text-neutral-500 hover:bg-neutral-100" title="關閉">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="grid gap-5 p-5 md:grid-cols-[1.1fr_.9fr]">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold text-neutral-700">分層模型</label>
              <div className="space-y-2">
                {(Object.keys(MODEL_INFO) as MagicLayerModel[]).map(model => {
                  const unavailable = model !== 'gemini' && !hasAtlasKey;
                  return (
                    <button
                      key={model}
                      type="button"
                      disabled={unavailable}
                      onClick={() => set('model', model)}
                      className={`w-full border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${options.model === model ? 'border-violet-500 bg-violet-50' : 'border-neutral-200 hover:border-neutral-400'}`}
                    >
                      <span className="block text-sm font-medium text-neutral-900">{MODEL_INFO[model].title}</span>
                      <span className="mt-0.5 block text-xs text-neutral-500">{MODEL_INFO[model].detail}{unavailable ? '，需要 Atlas Key' : ''}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-neutral-700">希望拆出幾層</label>
              <div className="grid grid-cols-4 gap-1.5">
                {COUNTS.map(count => (
                  <button key={String(count)} type="button" onClick={() => set('layerCount', count)} className={`h-8 border text-xs font-medium ${options.layerCount === count ? 'border-violet-500 bg-violet-600 text-white' : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'}`}>
                    {count === 'auto' ? '自動' : `${count} 層`}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-500">模型會依內容調整；即夢 Pro 會依指令產生背景與多張透明圖層。</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold text-neutral-700">優先拆出</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(category => (
                  <button key={category} type="button" onClick={() => toggleCategory(category)} className={`border px-2.5 py-1.5 text-xs ${options.categories.includes(category) ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'}`}>
                    {category}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-neutral-500">不選時由模型自動判斷。</p>
            </div>

            <div>
              <label htmlFor="magic-layer-instruction" className="mb-2 block text-xs font-semibold text-neutral-700">補充指令</label>
              <textarea id="magic-layer-instruction" value={options.customInstruction} onChange={event => set('customInstruction', event.target.value)} placeholder="例如：人物、杯子與招牌分開；保留人物手上的花束。" className="h-24 w-full resize-none border border-neutral-200 p-2.5 text-xs leading-relaxed outline-none focus:border-violet-500" />
            </div>

            <div className="space-y-2 border-y border-neutral-100 py-3 text-xs text-neutral-700">
              {([
                ['includeBackground', '包含背景圖層'],
                ['preservePosition', '保留原圖對齊位置'],
                ['autoArrange', '完成後排列到原圖右側'],
              ] as Array<[keyof Pick<MagicLayerOptions, 'includeBackground' | 'preservePosition' | 'autoArrange'>, string]>).map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={options[key]} onChange={event => set(key, event.target.checked)} className="h-3.5 w-3.5 accent-violet-600" />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-neutral-200 px-5 py-3.5">
          <span className="text-xs text-neutral-500">{MODEL_INFO[options.model].title} · {options.layerCount === 'auto' ? '自動層數' : `${options.layerCount} 層目標`}</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-9 border border-neutral-200 px-3 text-sm text-neutral-600 hover:bg-neutral-50">取消</button>
            <button type="button" onClick={() => onStart(options)} className="h-9 bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700">開始分層</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
