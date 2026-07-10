import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';
import {
  DEFAULT_MAGIC_LAYER_OPTIONS,
  type MagicLayerModel,
  type MagicLayerOptions,
  type MagicLayerPlan,
} from '../utils/gptLayerSplit';

interface MagicLayerModalProps {
  defaultModel: MagicLayerModel;
  hasAtlasKey: boolean;
  onClose: () => void;
  onStart: (options: MagicLayerOptions) => void;
  onAnalyze: (options: MagicLayerOptions) => Promise<MagicLayerPlan>;
}

const CATEGORIES = ['主體／人物', '商品／產品', '文字／Logo', '道具／小物', '裝飾／圖形'];
const COUNTS: Array<'auto' | number> = ['auto', 2, 4, 6, 8, 12, 16, 20];

const MODEL_INFO: Record<MagicLayerModel, { title: string; detail: string }> = {
  gemini: { title: 'Gemini', detail: '語意辨識後逐物件分離' },
  'gpt-image-2': { title: 'GPT Image 2', detail: '精細隔離與背景補全' },
  'seedream-v5-pro': { title: '即夢 Seedream 5.0 Pro', detail: '逐物件透明 PNG 分離，保留材質與位置' },
};

export function MagicLayerModal({ defaultModel, hasAtlasKey, onClose, onStart, onAnalyze }: MagicLayerModalProps) {
  const [options, setOptions] = useState<MagicLayerOptions>({ ...DEFAULT_MAGIC_LAYER_OPTIONS, model: defaultModel });
  const [plan, setPlan] = useState<MagicLayerPlan | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');

  useEffect(() => {
    setOptions(current => ({ ...current, model: defaultModel }));
  }, [defaultModel]);

  const set = <K extends keyof MagicLayerOptions>(key: K, value: MagicLayerOptions[K]) => {
    setOptions(current => ({ ...current, [key]: value }));
    setPlan(null);
    setAnalyzeError('');
  };

  const analyze = async () => {
    setIsAnalyzing(true);
    setAnalyzeError('');
    try {
      setPlan(await onAnalyze(options));
    } catch (error) {
      setAnalyzeError(error instanceof Error ? error.message : '分析失敗');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleCategory = (category: string) => {
    set('categories', options.categories.includes(category)
      ? options.categories.filter(item => item !== category)
      : [...options.categories, category]);
  };

  const removePlannedLayer = (layerId: string) => {
    setPlan(current => {
      if (!current) return current;
      const layers = current.layers.filter(layer => layer.id !== layerId);
      return { ...current, targetForegroundCount: layers.length, layers };
    });
  };

  const hasPlannedOutput = !!plan && (options.includeBackground || plan.layers.length > 0);

  return (
    <div className="fixed inset-0 z-[7000] flex items-center justify-center bg-black/35 p-4" onMouseDown={onClose}>
      <section className="flex max-h-[90vh] w-full max-w-[680px] flex-col overflow-hidden rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">魔法分層</h2>
            <p className="mt-0.5 text-xs text-neutral-500">先決定需要哪些可編輯圖層，再開始處理。</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center text-neutral-500 hover:bg-neutral-100" title="關閉">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="grid overflow-y-auto gap-5 p-5 md:grid-cols-[1.1fr_.9fr]">
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
                  <button key={String(count)} type="button" disabled={options.groupingStrategy === 'custom'} onClick={() => set('layerCount', count)} className={`h-8 border text-xs font-medium disabled:cursor-not-allowed disabled:opacity-35 ${options.layerCount === count ? 'border-violet-500 bg-violet-600 text-white' : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'}`}>
                    {count === 'auto' ? '自動' : `${count} 層`}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-500">{options.groupingStrategy === 'custom' ? '依照指令模式會以列出的物件決定層數。' : '模型會依內容調整；背景層會計入目標層數。'}</p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-neutral-700">拆分策略</label>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  ['smart', '智慧分組'],
                  ['separate', '盡量分開'],
                  ['custom', '依照指令'],
                ] as const).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => set('groupingStrategy', value)} className={`h-8 border text-[11px] font-medium ${options.groupingStrategy === value ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-neutral-200 text-neutral-600'}`}>
                    {label}
                  </button>
                ))}
              </div>
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
              <label htmlFor="magic-layer-instruction" className="mb-2 block text-xs font-semibold text-neutral-700">{options.groupingStrategy === 'custom' ? '要拆出的物件' : '補充指令'}</label>
              <textarea id="magic-layer-instruction" value={options.customInstruction} onChange={event => set('customInstruction', event.target.value)} placeholder="例如：人物、杯子、招牌、花束，各自拆成一層。" className="h-24 w-full resize-none border border-neutral-200 p-2.5 text-xs leading-relaxed outline-none focus:border-violet-500" />
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

          {(plan || isAnalyzing || analyzeError) && (
            <div className="md:col-span-2 border-t border-neutral-200 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-700">預計圖層</span>
                {plan && <span className="text-[11px] text-neutral-500">偵測 {plan.detectedObjectCount} 個物件，規劃 {plan.layers.length} 個前景層</span>}
              </div>
              {isAnalyzing && <div className="border border-neutral-200 p-3 text-xs text-neutral-500">正在盤點物件並規劃圖層...</div>}
              {analyzeError && <div className="border border-red-200 bg-red-50 p-3 text-xs text-red-600">{analyzeError}</div>}
              {plan && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {options.includeBackground && <div className="border border-neutral-200 bg-neutral-50 p-2.5 text-xs"><span className="font-medium">背景</span><span className="ml-2 text-neutral-500">移除所有前景後補全</span></div>}
                  {plan.layers.map((layer, index) => (
                    <div key={layer.id} className="relative border border-neutral-200 p-2.5 pr-9 text-xs">
                      <button
                        type="button"
                        onClick={() => removePlannedLayer(layer.id)}
                        className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center text-neutral-400 hover:bg-red-50 hover:text-red-600"
                        title={`不要拆出「${layer.label}」`}
                        aria-label={`刪除預計圖層「${layer.label}」`}
                      >
                        <Icon name="close" size={14} />
                      </button>
                      <div className="font-medium text-neutral-800">{index + 1}. {layer.label}</div>
                      <div className="mt-1 text-[11px] text-neutral-500">{layer.memberLabels.join('、')}</div>
                    </div>
                  ))}
                  {plan.layers.length === 0 && !options.includeBackground && (
                    <div className="border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-700 sm:col-span-2">至少保留一個前景層，或開啟背景圖層。</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-neutral-200 px-5 py-3.5">
          <span className="text-xs text-neutral-500">{MODEL_INFO[options.model].title} · {options.layerCount === 'auto' ? '自動層數' : `${options.layerCount} 層目標`}</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-9 border border-neutral-200 px-3 text-sm text-neutral-600 hover:bg-neutral-50">取消</button>
            {plan && <button type="button" onClick={analyze} disabled={isAnalyzing} className="h-9 border border-violet-200 px-3 text-sm text-violet-700 hover:bg-violet-50">重新分析</button>}
            <button
              type="button"
              disabled={isAnalyzing || (!!plan && !hasPlannedOutput)}
              onClick={() => plan ? onStart({ ...options, plan }) : analyze()}
              className="h-9 bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {isAnalyzing ? '分析中...' : plan ? '確認並開始分層' : '分析圖層'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
