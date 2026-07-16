import React from 'react';
import { useReactFlow, type NodeProps } from '@xyflow/react';
import type { CrossPlatformParams } from '../types';
import { CROSS_PLATFORM_SPECS, crossPlatformRatioForModel } from '../../../skills/crossPlatform';
import { BatchNodeShell } from './BatchNodeShell';

const MODEL_OPTIONS = [
  { value: 'gemini', label: 'Gemini' },
  { value: 'seedream-v5', label: 'Seedream v5' },
  { value: 'seedream-v5-pro', label: 'Seedream v5 Pro' },
  { value: 'gpt-image-2', label: 'GPT Image 2' },
];

type NodeResolutionOption = { value: CrossPlatformParams['imageSize']; label: string };
function resolutionOptionsForModel(model: string): NodeResolutionOption[] {
  if (model === 'gemini') return ['1K', '2K', '4K'].map(value => ({ value: value as CrossPlatformParams['imageSize'], label: value }));
  if (model === 'seedream-v5-pro') return [{ value: '2K', label: '2K（最高）' }];
  if (model === 'seedream-v5') return [{ value: '2K', label: '2K' }, { value: '4K', label: '3K' }];
  if (model === 'seedream-v4.5') return [{ value: '2K', label: '2K' }, { value: '4K', label: '4K' }];
  if (model === 'qwen-image-2' || model === 'flux-2-pro') return [{ value: '2K', label: '1.5K' }, { value: '4K', label: '2K max' }];
  if (model === 'gpt-image-2') return [{ value: '2K', label: 'Medium' }, { value: '4K', label: 'High' }];
  return [{ value: '2K', label: '2K' }];
}
const DEFAULT_PLATFORMS = ['instagram-story', 'xiaohongshu', 'social-square', 'youtube'];

export function CrossPlatformNode({ id, data }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const params = (data?.params ?? {}) as Partial<CrossPlatformParams>;
  const platformIds = Array.isArray(params.platformIds) && params.platformIds.length > 0
    ? params.platformIds
    : DEFAULT_PLATFORMS;
  const selectedModel = params.model ?? 'gemini';
  const resolutionOptions = resolutionOptionsForModel(selectedModel);
  const selectedImageSize = resolutionOptions.some(option => option.value === params.imageSize)
    ? params.imageSize
    : resolutionOptions[0].value;

  const setParams = (patch: Partial<CrossPlatformParams>) => {
    updateNodeData(id, { params: { ...params, ...patch } });
  };

  const togglePlatform = (platformId: string) => {
    const next = platformIds.includes(platformId)
      ? platformIds.filter(selectedId => selectedId !== platformId)
      : [...platformIds, platformId];
    setParams({ platformIds: next.length > 0 ? next : platformIds });
  };

  return (
    <BatchNodeShell
      id={id}
      title="平台圖"
      emptyTitle="跨平台適配"
      emptyHint="執行後展開平台版本"
      itemName="平台圖"
      progressiveExpectedCount={platformIds.length}
    >
      <div className="space-y-1.5">
        <div className="grid grid-cols-2 gap-1">
          <select
            value={selectedModel}
            onChange={(e) => {
              const nextModel = e.target.value;
              const nextOptions = resolutionOptionsForModel(nextModel);
              const nextImageSize = nextOptions.some(option => option.value === params.imageSize)
                ? params.imageSize
                : nextOptions[0].value;
              setParams({ model: nextModel, imageSize: nextImageSize });
            }}
            className="border border-neutral-200 bg-neutral-50 px-1 py-1 text-[10px] focus:outline-none focus:border-neutral-400"
          >
            {MODEL_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={selectedImageSize}
            onChange={(e) => setParams({ imageSize: e.target.value as CrossPlatformParams['imageSize'] })}
            className="border border-neutral-200 bg-neutral-50 px-1 py-1 text-[10px] focus:outline-none focus:border-neutral-400"
          >
            {resolutionOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {CROSS_PLATFORM_SPECS.slice(0, 8).map(spec => {
            const effectiveRatio = crossPlatformRatioForModel(selectedModel, spec.atlasRatio);
            const fallbackRatio = effectiveRatio !== spec.atlasRatio ? effectiveRatio : null;
            return (
              <button
                key={spec.id}
                type="button"
                onClick={() => togglePlatform(spec.id)}
                className={`min-h-6 border px-1 py-1 text-[9px] leading-tight ${platformIds.includes(spec.id) ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-600'}`}
                title={fallbackRatio ? `${spec.name}；此模型將以最接近的 ${fallbackRatio} 生成` : spec.name}
              >
                <span className="block">{spec.name}</span>
                {fallbackRatio && <span className={`mt-0.5 block text-[8px] ${platformIds.includes(spec.id) ? 'text-white/65' : 'text-neutral-400'}`}>最接近 → {fallbackRatio}</span>}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-1.5 text-[10px] text-neutral-500">
          <input
            type="checkbox"
            checked={params.preserveSubject !== false}
            onChange={(e) => setParams({ preserveSubject: e.target.checked })}
          />
          保留主體
        </label>
        <label className="flex items-center gap-1.5 text-[10px] text-neutral-500">
          <input
            type="checkbox"
            checked={params.keepText === true}
            onChange={(e) => setParams({ keepText: e.target.checked })}
          />
          保留文字
        </label>
      </div>
    </BatchNodeShell>
  );
}
