import React from 'react';
import { useReactFlow, type NodeProps } from '@xyflow/react';
import type { CrossPlatformParams } from '../types';
import { CROSS_PLATFORM_SPECS } from '../../../skills/crossPlatform';
import { BatchNodeShell } from './BatchNodeShell';

const MODEL_OPTIONS = [
  { value: 'gemini', label: 'Gemini' },
  { value: 'seedream-v5', label: 'Seedream v5' },
  { value: 'seedream-v5-pro', label: 'Seedream v5 Pro' },
  { value: 'gpt-image-2', label: 'GPT Image 2' },
];

const IMAGE_SIZES: CrossPlatformParams['imageSize'][] = ['1K', '2K', '4K'];
const DEFAULT_PLATFORMS = ['instagram-story', 'xiaohongshu', 'social-square', 'youtube'];

export function CrossPlatformNode({ id, data }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const params = (data?.params ?? {}) as Partial<CrossPlatformParams>;
  const platformIds = Array.isArray(params.platformIds) && params.platformIds.length > 0
    ? params.platformIds
    : DEFAULT_PLATFORMS;

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
    >
      <div className="space-y-1.5">
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
            onChange={(e) => setParams({ imageSize: e.target.value as CrossPlatformParams['imageSize'] })}
            className="border border-neutral-200 bg-neutral-50 px-1 py-1 text-[10px] focus:outline-none focus:border-neutral-400"
          >
            {IMAGE_SIZES.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {CROSS_PLATFORM_SPECS.slice(0, 8).map(spec => (
            <button
              key={spec.id}
              type="button"
              onClick={() => togglePlatform(spec.id)}
              className={`h-6 border px-1 text-[9px] leading-none ${platformIds.includes(spec.id) ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-600'}`}
              title={spec.name}
            >
              {spec.name}
            </button>
          ))}
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
