import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import {
  DEFAULT_MAGIC_LAYER_OPTIONS,
  mergeMagicLayerPlanItems,
  splitMagicLayerPlanItem,
  type MagicLayerModel,
  type MagicLayerOptions,
  type MagicLayerPlan,
  type MagicLayerPlanItem,
} from '../utils/gptLayerSplit';
import { atlasModelSupportsTransparency } from '../utils/atlasImage';

type RatioBox = { x: number; y: number; w: number; h: number };

interface MagicLayerModalProps {
  defaultModel: MagicLayerModel;
  hasAtlasKey: boolean;
  /** 要分層的原圖，用來在規劃階段顯示每一層的位置框。 */
  imageSrc: string;
  onClose: () => void;
  onStart: (options: MagicLayerOptions) => void;
  onAnalyze: (options: MagicLayerOptions) => Promise<MagicLayerPlan>;
  /** 追加單一圖層：依使用者拉的框和／或名稱辨識那一個物件，不重跑整張圖的分析。 */
  onAddLayer: (request: { bbox?: RatioBox; hint?: string }) => Promise<MagicLayerPlanItem>;
}

const CATEGORIES = ['主體／人物', '商品／產品', '文字／Logo', '道具／小物', '裝飾／圖形'];
const COUNTS: Array<'auto' | number> = ['auto', 2, 4, 6, 8, 12, 16, 20];
/** 只有這些設定會改變分析結果；其他（模型、排列、去背方式）改了不需要重新分析。 */
const PLAN_AFFECTING_KEYS: Array<keyof MagicLayerOptions> = ['layerCount', 'groupingStrategy', 'categories', 'customInstruction'];
const LAYER_COLORS = ['#7c3aed', '#0891b2', '#db2777', '#ea580c', '#16a34a', '#2563eb', '#ca8a04', '#dc2626'];
const layerColor = (index: number) => LAYER_COLORS[index % LAYER_COLORS.length];

const MODEL_INFO: Record<MagicLayerModel, { title: string; detail: string }> = {
  gemini: { title: 'Gemini', detail: '語意辨識後逐物件分離' },
  'gpt-image-2.5-sunburst': { title: 'GPT Image 2.5 Sunburst', detail: '精細隔離與背景補全・精細度優先' },
  'gpt-image-2.5-flare': { title: 'GPT Image 2.5 Flare', detail: '隔離與背景補全・速度優先' },
  'gpt-image-2.6-sunburst': { title: 'GPT Image 2.6 Sunburst', detail: '精細隔離與背景補全・精細度優先' },
  'gpt-image-2.6-flare': { title: 'GPT Image 2.6 Flare', detail: '隔離與背景補全・速度優先' },
  'gpt-image-2': { title: 'GPT Image 2', detail: '精細隔離與背景補全' },
  'seedream-v5-pro': { title: '即夢 Seedream 5.0 Pro', detail: '逐物件生成後自動去背，保留材質與位置' },
};

export function MagicLayerModal({ defaultModel, hasAtlasKey, imageSrc, onClose, onStart, onAnalyze, onAddLayer }: MagicLayerModalProps) {
  const [options, setOptions] = useState<MagicLayerOptions>({ ...DEFAULT_MAGIC_LAYER_OPTIONS, model: defaultModel });
  const [plan, setPlan] = useState<MagicLayerPlan | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  // 規劃是依舊設定分析出來的（設定已變更但尚未重新分析）
  const [planStale, setPlanStale] = useState(false);
  // 使用者手動調整過規劃（改名／合併／拆開／刪除／追加）
  const [planEdited, setPlanEdited] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  // 追加圖層
  const [addMode, setAddMode] = useState(false);
  const [drawBox, setDrawBox] = useState<RatioBox | null>(null);
  const [addHint, setAddHint] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const drawStart = useRef<{ x: number; y: number } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOptions(current => ({ ...current, model: defaultModel }));
  }, [defaultModel]);

  const set = <K extends keyof MagicLayerOptions>(key: K, value: MagicLayerOptions[K]) => {
    setOptions(current => ({ ...current, [key]: value }));
    // 規劃不丟：只有會影響分析的設定才標記為「待重新分析」，由使用者決定要不要重跑。
    if (plan && PLAN_AFFECTING_KEYS.includes(key)) setPlanStale(true);
    setAnalyzeError('');
  };

  const resetPlanUi = () => {
    setSelectedIds([]);
    setRenamingId(null);
    setHoveredId(null);
    setAddMode(false);
    setDrawBox(null);
    setAddHint('');
    setAddError('');
  };

  const analyze = async () => {
    setIsAnalyzing(true);
    setAnalyzeError('');
    try {
      setPlan(await onAnalyze(options));
      setPlanStale(false);
      setPlanEdited(false);
      resetPlanUi();
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

  // ── 規劃的手動編輯 ─────────────────────────────────────────────────────────
  const updateLayers = (updater: (layers: MagicLayerPlanItem[]) => MagicLayerPlanItem[]) => {
    setPlan(current => {
      if (!current) return current;
      const layers = updater(current.layers);
      return { ...current, targetForegroundCount: layers.length, layers };
    });
    setPlanEdited(true);
  };

  const removePlannedLayer = (layerId: string) => {
    updateLayers(layers => layers.filter(layer => layer.id !== layerId));
    setSelectedIds(ids => ids.filter(id => id !== layerId));
  };

  const toggleSelected = (layerId: string) => {
    setSelectedIds(ids => ids.includes(layerId) ? ids.filter(id => id !== layerId) : [...ids, layerId]);
  };

  const mergeSelected = () => {
    if (selectedIds.length < 2) return;
    const picked = selectedIds;
    updateLayers(layers => {
      const members = layers.filter(layer => picked.includes(layer.id));
      if (members.length < 2) return layers;
      const firstIndex = layers.findIndex(layer => picked.includes(layer.id));
      const rest = layers.filter(layer => !picked.includes(layer.id));
      rest.splice(Math.min(firstIndex, rest.length), 0, mergeMagicLayerPlanItems(members));
      return rest;
    });
    setSelectedIds([]);
  };

  const splitLayer = (layerId: string) => {
    updateLayers(layers => layers.flatMap(layer => layer.id === layerId ? splitMagicLayerPlanItem(layer) : [layer]));
    setSelectedIds(ids => ids.filter(id => id !== layerId));
  };

  const commitRename = () => {
    const label = renameDraft.trim();
    const targetId = renamingId;
    if (targetId && label) {
      updateLayers(layers => layers.map(layer => layer.id === targetId ? { ...layer, label } : layer));
    }
    setRenamingId(null);
  };

  // ── 追加圖層：在預覽圖上拉框 ───────────────────────────────────────────────
  const pointToRatio = (event: React.PointerEvent) => {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  };

  const onDrawStart = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = pointToRatio(event);
    if (!point) return;
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* 合成事件沒有可捕捉的指標 */ }
    drawStart.current = point;
    setDrawBox({ x: point.x, y: point.y, w: 0, h: 0 });
    setAddError('');
  };

  const onDrawMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = drawStart.current;
    const point = pointToRatio(event);
    if (!start || !point) return;
    setDrawBox({ x: Math.min(start.x, point.x), y: Math.min(start.y, point.y), w: Math.abs(point.x - start.x), h: Math.abs(point.y - start.y) });
  };

  const onDrawEnd = () => {
    drawStart.current = null;
    // 太小的框視為誤觸
    setDrawBox(box => box && box.w >= 0.02 && box.h >= 0.02 ? box : null);
  };

  const cancelAdd = () => {
    setAddMode(false);
    setDrawBox(null);
    setAddHint('');
    setAddError('');
  };

  const confirmAdd = async () => {
    const hint = addHint.trim();
    if (isAdding || (!drawBox && !hint)) return;
    setIsAdding(true);
    setAddError('');
    try {
      const item = await onAddLayer({ bbox: drawBox ?? undefined, hint: hint || undefined });
      updateLayers(layers => [...layers, item]);
      cancelAdd();
    } catch (error) {
      setAddError(error instanceof Error ? error.message : '追加圖層失敗');
    } finally {
      setIsAdding(false);
    }
  };

  // GPT 2.5 / 2.6 直接輸出原生 alpha，引擎會略過三角測量；UI 同步停用，避免使用者以為要勾。
  const nativeAlpha = hasAtlasKey && atlasModelSupportsTransparency(options.model);

  const hasPlannedOutput = !!plan && (options.includeBackground || plan.layers.length > 0);

  return (
    <div className="fixed inset-0 z-[7000] flex items-center justify-center bg-black/35 p-4" onMouseDown={onClose}>
      <section className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-lg bg-white shadow-2xl ${plan ? 'max-w-[860px]' : 'max-w-[680px]'}`} onMouseDown={event => event.stopPropagation()}>
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
              <label htmlFor="magic-layer-model" className="mb-2 block text-xs font-semibold text-neutral-700">分層模型</label>
              <div className="relative">
                <select
                  id="magic-layer-model"
                  value={options.model}
                  onChange={event => set('model', event.target.value as MagicLayerModel)}
                  className="h-10 w-full cursor-pointer appearance-none border border-neutral-200 bg-white pl-3 pr-9 text-sm font-medium text-neutral-900 outline-none transition-colors hover:border-neutral-400 focus:border-violet-500"
                >
                  {(Object.keys(MODEL_INFO) as MagicLayerModel[]).map(model => {
                    const unavailable = model !== 'gemini' && !hasAtlasKey;
                    return (
                      <option key={model} value={model} disabled={unavailable}>
                        {MODEL_INFO[model].title}{unavailable ? '（需要 Atlas Key）' : ''}
                      </option>
                    );
                  })}
                </select>
                <Icon name="expand_more" size={18} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-500">{MODEL_INFO[options.model].detail}</p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-neutral-700">希望拆出幾層</label>
              <div className="grid grid-cols-4 gap-1.5">
                {COUNTS.map(count => (
                  <button key={String(count)} type="button" disabled={options.groupingStrategy === 'custom' || options.groupingStrategy === 'category'} onClick={() => set('layerCount', count)} className={`h-8 border text-xs font-medium disabled:cursor-not-allowed disabled:opacity-35 ${options.layerCount === count ? 'border-violet-500 bg-violet-600 text-white' : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'}`}>
                    {count === 'auto' ? '自動' : `${count} 層`}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-500">{options.groupingStrategy === 'custom'
                ? '依照指令模式會以列出的物件決定層數。'
                : options.groupingStrategy === 'category'
                ? '依類別模式由偵測到的類別決定層數：主體、產品、小物、裝飾、文字各一層。'
                : '模型會依內容調整；背景層會計入目標層數。'}</p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-neutral-700">拆分策略</label>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  ['smart', '智慧分組'],
                  ['separate', '盡量分開'],
                  ['category', '依類別'],
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

              {nativeAlpha ? (
                <div className="flex items-start gap-2 border-t border-neutral-100 pt-2">
                  <Icon name="check_circle" size={14} className="mt-0.5 text-emerald-600" />
                  <span>
                    原生透明輸出
                    <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">不需額外生成</span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-neutral-500">
                      此模型直接輸出含 alpha 通道的圖層，髮絲與半透明邊緣已內建，不需要三角測量去背。
                    </span>
                  </span>
                </div>
              ) : (
                <label className="flex cursor-pointer items-start gap-2 border-t border-neutral-100 pt-2">
                  <input
                    type="checkbox"
                    checked={options.highPrecisionEdge}
                    onChange={event => set('highPrecisionEdge', event.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 accent-violet-600"
                  />
                  <span>
                    高精度邊緣（三角測量）
                    <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">每層多一次生成</span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-neutral-500">
                      髮絲、玻璃、煙霧會有真正的半透明過渡而非硬邊。失敗自動退回一般去背。
                    </span>
                  </span>
                </label>
              )}
            </div>
          </div>

          {(plan || isAnalyzing || analyzeError) && (
            <div className="md:col-span-2 border-t border-neutral-200 pt-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="text-xs font-semibold text-neutral-700">預計圖層</span>
                {plan && (() => {
                  // 直接把「實際會產出幾層」講出來。層數選項只是上限，依類別／依照指令
                  // 模式更是完全由內容決定，不講清楚使用者會以為選 4 就一定拿到 4。
                  const total = plan.layers.length + (options.includeBackground ? 1 : 0);
                  const requested = typeof options.layerCount === 'number' ? options.layerCount : null;
                  const mismatch = requested !== null
                    && !planEdited
                    && !planStale
                    && options.groupingStrategy !== 'category'
                    && options.groupingStrategy !== 'custom'
                    && total !== requested;
                  return (
                    <span className="text-[11px] text-neutral-500">
                      偵測 {plan.detectedObjectCount} 個物件 ·{' '}
                      <span className="font-semibold text-neutral-800">實際產出 {total} 層</span>
                      {options.includeBackground ? `（${plan.layers.length} 前景 + 背景）` : ''}
                      {planEdited && <span className="ml-1 text-violet-600">· 已手動調整</span>}
                      {mismatch && (
                        <span className="ml-1 text-amber-600">· 少於指定的 {requested} 層，可偵測物件不足</span>
                      )}
                    </span>
                  );
                })()}
              </div>
              {isAnalyzing && <div className="mb-2 border border-neutral-200 p-3 text-xs text-neutral-500">正在盤點物件並規劃圖層...</div>}
              {analyzeError && <div className="mb-2 border border-red-200 bg-red-50 p-3 text-xs text-red-600">{analyzeError}</div>}
              {plan && planStale && !isAnalyzing && (
                <div className="mb-2 border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-700">
                  拆分設定已變更。下方仍是先前的規劃，可以直接沿用；按「重新分析」才會依新設定重新盤點{planEdited ? '（會覆蓋你的手動調整）' : ''}。
                </div>
              )}
              {plan && (
                <div className="grid gap-4 md:grid-cols-2">
                  {/* 原圖預覽 + 位置框 */}
                  <div>
                    <div className="flex justify-center bg-neutral-100 p-2">
                      <div ref={previewRef} className="relative inline-block select-none overflow-hidden">
                        {imageSrc && <img src={imageSrc} alt="要分層的原圖" draggable={false} className="block max-h-[42vh] max-w-full" />}
                        {plan.layers.map((layer, index) => {
                          const active = hoveredId === layer.id || selectedIds.includes(layer.id);
                          const dimmed = (hoveredId !== null || selectedIds.length > 0) && !active;
                          return (
                            <button
                              key={layer.id}
                              type="button"
                              onMouseEnter={() => setHoveredId(layer.id)}
                              onMouseLeave={() => setHoveredId(null)}
                              onClick={() => toggleSelected(layer.id)}
                              title={layer.label}
                              aria-label={`圖層 ${index + 1}：${layer.label}`}
                              data-magic-layer-box={layer.id}
                              className="absolute block p-0"
                              style={{
                                left: `${layer.bbox.x * 100}%`,
                                top: `${layer.bbox.y * 100}%`,
                                width: `${layer.bbox.w * 100}%`,
                                height: `${layer.bbox.h * 100}%`,
                                border: `2px solid ${layerColor(index)}`,
                                background: active ? `${layerColor(index)}33` : 'transparent',
                                opacity: dimmed ? 0.35 : 1,
                                zIndex: active ? 2 : 1,
                                pointerEvents: addMode ? 'none' : 'auto',
                              }}
                            >
                              <span className="absolute left-0 top-0 px-1 text-[10px] font-semibold leading-4 text-white" style={{ background: layerColor(index) }}>{index + 1}</span>
                            </button>
                          );
                        })}
                        {addMode && (
                          <div
                            data-magic-layer-draw
                            className="absolute inset-0 z-10 cursor-crosshair touch-none bg-black/10"
                            onPointerDown={onDrawStart}
                            onPointerMove={onDrawMove}
                            onPointerUp={onDrawEnd}
                            onPointerCancel={onDrawEnd}
                          >
                            {drawBox && (
                              <div
                                className="absolute border-2 border-dashed border-white bg-violet-500/25 outline outline-1 outline-violet-600"
                                style={{ left: `${drawBox.x * 100}%`, top: `${drawBox.y * 100}%`, width: `${drawBox.w * 100}%`, height: `${drawBox.h * 100}%` }}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {addMode ? (
                      <div className="mt-2 space-y-2 border border-violet-200 bg-violet-50/60 p-2.5">
                        <p className="text-[11px] leading-relaxed text-violet-800">
                          在圖上拖曳框出漏掉的物件，或只輸入名稱讓 AI 自己找。兩者都給最準。
                          {drawBox ? ' 已框選區域。' : ''}
                        </p>
                        <input
                          value={addHint}
                          onChange={event => setAddHint(event.target.value)}
                          onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); void confirmAdd(); } }}
                          placeholder="物件名稱，例如：招牌"
                          aria-label="要追加的物件名稱"
                          className="h-8 w-full border border-neutral-200 bg-white px-2 text-xs outline-none focus:border-violet-500"
                        />
                        {addError && <p className="text-[11px] text-red-600">{addError}</p>}
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={cancelAdd} disabled={isAdding} className="h-7 border border-neutral-200 bg-white px-2.5 text-[11px] text-neutral-600 hover:bg-neutral-50">取消</button>
                          <button type="button" onClick={() => void confirmAdd()} disabled={isAdding || (!drawBox && !addHint.trim())} className="h-7 bg-violet-600 px-2.5 text-[11px] font-medium text-white hover:bg-violet-700 disabled:opacity-50">
                            {isAdding ? '辨識中...' : '加入這一層'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-500">框線編號對應右側清單；點框線或勾選可選取多層後合併。</p>
                    )}
                  </div>

                  {/* 圖層清單 */}
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2">
                      <button type="button" onClick={() => setAddMode(true)} disabled={addMode || plan.layers.length >= 20} className="flex h-7 items-center gap-1 border border-neutral-200 px-2 text-[11px] text-neutral-700 hover:border-neutral-400 disabled:opacity-40" title={plan.layers.length >= 20 ? '最多 20 個前景層' : '追加 AI 沒抓到的物件'}>
                        <Icon name="add" size={14} />追加圖層
                      </button>
                      <button type="button" onClick={mergeSelected} disabled={selectedIds.length < 2} className="h-7 border border-neutral-200 px-2 text-[11px] text-neutral-700 hover:border-neutral-400 disabled:opacity-40">
                        合併所選{selectedIds.length >= 2 ? `（${selectedIds.length}）` : ''}
                      </button>
                    </div>
                    <div className="max-h-[42vh] space-y-1.5 overflow-y-auto pr-1">
                      {options.includeBackground && <div className="border border-neutral-200 bg-neutral-50 p-2.5 text-xs"><span className="font-medium">背景</span><span className="ml-2 text-neutral-500">移除所有前景後補全</span></div>}
                      {plan.layers.map((layer, index) => {
                        const memberCount = layer.members?.length ?? 1;
                        const selected = selectedIds.includes(layer.id);
                        return (
                          <div
                            key={layer.id}
                            data-magic-layer-row={layer.id}
                            onMouseEnter={() => setHoveredId(layer.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            className={`flex items-start gap-2 border p-2 text-xs ${selected ? 'border-violet-400 bg-violet-50/60' : hoveredId === layer.id ? 'border-neutral-400' : 'border-neutral-200'}`}
                          >
                            <input type="checkbox" checked={selected} onChange={() => toggleSelected(layer.id)} aria-label={`選取「${layer.label}」`} className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-violet-600" />
                            <span className="mt-px shrink-0 px-1 text-[10px] font-semibold leading-4 text-white" style={{ background: layerColor(index) }}>{index + 1}</span>
                            <div className="min-w-0 flex-1">
                              {renamingId === layer.id ? (
                                <input
                                  autoFocus
                                  value={renameDraft}
                                  onChange={event => setRenameDraft(event.target.value)}
                                  onBlur={commitRename}
                                  onKeyDown={event => {
                                    if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); commitRename(); }
                                    if (event.key === 'Escape') { event.stopPropagation(); setRenamingId(null); }
                                  }}
                                  aria-label="圖層名稱"
                                  className="h-6 w-full border border-violet-400 px-1.5 text-xs outline-none"
                                />
                              ) : (
                                <button type="button" onClick={() => { setRenamingId(layer.id); setRenameDraft(layer.label); }} title="點一下改名" className="block max-w-full truncate text-left font-medium text-neutral-800 hover:text-violet-700">
                                  {layer.label}
                                </button>
                              )}
                              {memberCount > 1 && <div className="mt-0.5 truncate text-[11px] text-neutral-500">{layer.memberLabels.join('、')}</div>}
                            </div>
                            {memberCount > 1 && (
                              <button type="button" onClick={() => splitLayer(layer.id)} title={`拆成 ${memberCount} 層`} className="h-6 shrink-0 border border-neutral-200 px-1.5 text-[11px] text-neutral-600 hover:border-neutral-400">拆開</button>
                            )}
                            <button
                              type="button"
                              onClick={() => removePlannedLayer(layer.id)}
                              className="grid h-6 w-6 shrink-0 place-items-center text-neutral-400 hover:bg-red-50 hover:text-red-600"
                              title={`不要拆出「${layer.label}」`}
                              aria-label={`刪除預計圖層「${layer.label}」`}
                            >
                              <Icon name="close" size={14} />
                            </button>
                          </div>
                        );
                      })}
                      {plan.layers.length === 0 && !options.includeBackground && (
                        <div className="border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-700">至少保留一個前景層，或開啟背景圖層。</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-neutral-200 px-5 py-3.5">
          <span className="text-xs text-neutral-500">{MODEL_INFO[options.model].title} · {plan ? `${plan.layers.length + (options.includeBackground ? 1 : 0)} 層` : options.layerCount === 'auto' ? '自動層數' : `${options.layerCount} 層目標`}</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-9 border border-neutral-200 px-3 text-sm text-neutral-600 hover:bg-neutral-50">取消</button>
            {plan && <button type="button" onClick={analyze} disabled={isAnalyzing || isAdding} className="h-9 border border-violet-200 px-3 text-sm text-violet-700 hover:bg-violet-50 disabled:opacity-50">重新分析</button>}
            <button
              type="button"
              disabled={isAnalyzing || isAdding || (!!plan && !hasPlannedOutput)}
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
