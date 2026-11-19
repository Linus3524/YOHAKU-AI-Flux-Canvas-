/** 節點選單共用的生圖模型清單（名稱與主畫布生成設定面板一致）。 */
export interface NodeModelOption {
  id: string;
  label: string;
  needsAtlas: boolean;
}

export const NODE_IMAGE_MODELS: NodeModelOption[] = [
  { id: 'gemini', label: 'Gemini', needsAtlas: false },
  { id: 'gpt-image-2', label: 'GPT Image 2', needsAtlas: true },
  { id: 'gpt-image-2.5-sunburst', label: 'GPT Image 2.5 Sunburst', needsAtlas: true },
  { id: 'gpt-image-2.5-flare', label: 'GPT Image 2.5 Flare', needsAtlas: true },
  { id: 'gpt-image-2.6-sunburst', label: 'GPT Image 2.6 Sunburst', needsAtlas: true },
  { id: 'gpt-image-2.6-flare', label: 'GPT Image 2.6 Flare', needsAtlas: true },
  { id: 'flux-2-pro', label: 'FLUX.2 Pro', needsAtlas: true },
  { id: 'seedream-v4.5', label: '即夢 Seedream v4.5', needsAtlas: true },
  { id: 'seedream-v5', label: '即夢 Seedream v5 Lite', needsAtlas: true },
  { id: 'seedream-v5-pro', label: '即夢 Seedream v5 Pro', needsAtlas: true },
];

/** 魔法分層可用的模型（對應 gptLayerSplit 的 MagicLayerModel；'gemini' 走 Gemini + BiRefNet 舊路徑）。 */
export const NODE_LAYER_SPLIT_MODELS: NodeModelOption[] = [
  { id: 'gemini', label: 'Gemini + 去背', needsAtlas: false },
  { id: 'gpt-image-2.6-sunburst', label: 'GPT Image 2.6 Sunburst', needsAtlas: true },
  { id: 'gpt-image-2.6-flare', label: 'GPT Image 2.6 Flare', needsAtlas: true },
  { id: 'gpt-image-2.5-sunburst', label: 'GPT Image 2.5 Sunburst', needsAtlas: true },
  { id: 'gpt-image-2.5-flare', label: 'GPT Image 2.5 Flare', needsAtlas: true },
  { id: 'gpt-image-2', label: 'GPT Image 2', needsAtlas: true },
  { id: 'seedream-v5-pro', label: '即夢 Seedream v5 Pro', needsAtlas: true },
];
