import React from 'react';
import { useReactFlow, type NodeProps } from '@xyflow/react';
import type { BrandKitParams } from '../types';
import { LOGO_BRAND_OUTPUTS } from '../../../skills/logo';
import { BatchNodeShell } from './BatchNodeShell';

const MODEL_OPTIONS = [
  { value: 'gemini', label: 'Gemini' },
  { value: 'seedream-v5', label: 'Seedream v5' },
  { value: 'gpt-image-2', label: 'GPT Image 2' },
];

const IMAGE_SIZES: BrandKitParams['imageSize'][] = ['1K', '2K', '4K'];

export function BrandKitNode({ id, data }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const params = (data?.params ?? {}) as Partial<BrandKitParams>;
  const selectedAssetIds = Array.isArray(params.selectedAssetIds) && params.selectedAssetIds.length > 0
    ? params.selectedAssetIds
    : LOGO_BRAND_OUTPUTS.slice(0, 4).map(spec => spec.id);

  const setParams = (patch: Partial<BrandKitParams>) => {
    updateNodeData(id, { params: { ...params, ...patch } });
  };

  const toggleAsset = (assetId: string) => {
    const next = selectedAssetIds.includes(assetId)
      ? selectedAssetIds.filter(selectedId => selectedId !== assetId)
      : [...selectedAssetIds, assetId];
    setParams({ selectedAssetIds: next.length > 0 ? next : selectedAssetIds });
  };

  return (
    <BatchNodeShell
      id={id}
      title="品牌資產"
      emptyTitle="品牌識別"
      emptyHint="執行後展開整組資產"
      itemName="品牌資產"
    >
      <div className="space-y-1.5">
        <input
          value={params.brandName ?? ''}
          onChange={(e) => setParams({ brandName: e.target.value })}
          placeholder="品牌名稱"
          className="block w-full border border-neutral-200 bg-neutral-50 px-1.5 py-1 text-[11px] focus:outline-none focus:border-neutral-400"
        />
        <input
          value={params.slogan ?? ''}
          onChange={(e) => setParams({ slogan: e.target.value })}
          placeholder="Slogan"
          className="block w-full border border-neutral-200 bg-neutral-50 px-1.5 py-1 text-[11px] focus:outline-none focus:border-neutral-400"
        />
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
            onChange={(e) => setParams({ imageSize: e.target.value as BrandKitParams['imageSize'] })}
            className="border border-neutral-200 bg-neutral-50 px-1 py-1 text-[10px] focus:outline-none focus:border-neutral-400"
          >
            {IMAGE_SIZES.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {LOGO_BRAND_OUTPUTS.slice(0, 6).map(spec => (
            <button
              key={spec.id}
              type="button"
              onClick={() => toggleAsset(spec.id)}
              className={`h-6 border px-1 text-[9px] leading-none ${selectedAssetIds.includes(spec.id) ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-600'}`}
              title={spec.title}
            >
              {spec.title}
            </button>
          ))}
        </div>
      </div>
    </BatchNodeShell>
  );
}
