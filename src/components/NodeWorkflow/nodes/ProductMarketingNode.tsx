import React from 'react';
import { useReactFlow, type NodeProps } from '@xyflow/react';
import type { ProductMarketingParams } from '../types';
import { PRODUCT_MARKETING_PLATFORMS } from '../../../skills/marketing';
import { BatchNodeShell } from './BatchNodeShell';

const MODEL_OPTIONS = [
  { value: 'gemini', label: 'Gemini' },
  { value: 'seedream-v5', label: 'Seedream v5' },
  { value: 'seedream-v5-pro', label: 'Seedream v5 Pro' },
  { value: 'gpt-image-2', label: 'GPT Image 2' },
];

const IMAGE_SIZES: ProductMarketingParams['imageSize'][] = ['1K', '2K', '4K'];
const PLATFORM_IDS = Object.keys(PRODUCT_MARKETING_PLATFORMS);

export function ProductMarketingNode({ id, data }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const params = (data?.params ?? {}) as Partial<ProductMarketingParams>;
  const platformId = params.platformId && PRODUCT_MARKETING_PLATFORMS[params.platformId]
    ? params.platformId
    : 'shopee';
  const recipes = PRODUCT_MARKETING_PLATFORMS[platformId]?.recipes ?? [];
  const selectedRecipeIds = Array.isArray(params.selectedRecipeIds) && params.selectedRecipeIds.length > 0
    ? params.selectedRecipeIds
    : recipes.slice(0, 3).map(recipe => recipe.id);

  const setParams = (patch: Partial<ProductMarketingParams>) => {
    updateNodeData(id, { params: { ...params, ...patch } });
  };

  const toggleRecipe = (recipeId: string) => {
    const next = selectedRecipeIds.includes(recipeId)
      ? selectedRecipeIds.filter(selectedId => selectedId !== recipeId)
      : [...selectedRecipeIds, recipeId];
    setParams({ selectedRecipeIds: next.length > 0 ? next : selectedRecipeIds });
  };

  return (
    <BatchNodeShell
      id={id}
      title="行銷圖"
      emptyTitle="商品行銷圖"
      emptyHint="執行後展開整組素材"
      itemName="行銷圖"
    >
      <div className="space-y-1.5">
        <input
          value={params.productName ?? ''}
          onChange={(e) => setParams({ productName: e.target.value })}
          placeholder="商品名稱"
          className="block w-full border border-neutral-200 bg-neutral-50 px-1.5 py-1 text-[11px] focus:outline-none focus:border-neutral-400"
        />
        <textarea
          value={params.sellingPoints ?? ''}
          onChange={(e) => setParams({ sellingPoints: e.target.value })}
          placeholder="賣點"
          className="block w-full h-[40px] resize-none border border-neutral-200 bg-neutral-50 px-1.5 py-1 text-[11px] leading-relaxed focus:outline-none focus:border-neutral-400"
        />
        <input
          value={params.visualTone ?? ''}
          onChange={(e) => setParams({ visualTone: e.target.value })}
          placeholder="視覺調性"
          className="block w-full border border-neutral-200 bg-neutral-50 px-1.5 py-1 text-[11px] focus:outline-none focus:border-neutral-400"
        />
        <select
          value={platformId}
          onChange={(e) => setParams({ platformId: e.target.value, selectedRecipeIds: [] })}
          className="block w-full border border-neutral-200 bg-neutral-50 px-1 py-1 text-[10px] focus:outline-none focus:border-neutral-400"
        >
          {PLATFORM_IDS.map(pid => (
            <option key={pid} value={pid}>{PRODUCT_MARKETING_PLATFORMS[pid].name}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-1">
          <select
            value={params.model ?? 'gemini'}
            onChange={(e) => setParams({ model: e.target.value })}
            className="border border-neutral-200 bg-neutral-50 px-1 py-1 text-[10px] focus:outline-none focus:border-neutral-400"
          >
            {MODEL_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={params.imageSize ?? '1K'}
            onChange={(e) => setParams({ imageSize: e.target.value as ProductMarketingParams['imageSize'] })}
            className="border border-neutral-200 bg-neutral-50 px-1 py-1 text-[10px] focus:outline-none focus:border-neutral-400"
          >
            {IMAGE_SIZES.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {recipes.slice(0, 6).map(recipe => (
            <button
              key={recipe.id}
              type="button"
              onClick={() => toggleRecipe(recipe.id)}
              className={`h-6 border px-1 text-[9px] leading-none ${selectedRecipeIds.includes(recipe.id) ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-600'}`}
              title={recipe.title}
            >
              {recipe.title}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-[10px] text-neutral-500">
          <input
            type="checkbox"
            checked={params.lockStyleConsistency === true}
            onChange={(e) => setParams({ lockStyleConsistency: e.target.checked })}
          />
          鎖定整組風格
        </label>
      </div>
    </BatchNodeShell>
  );
}
