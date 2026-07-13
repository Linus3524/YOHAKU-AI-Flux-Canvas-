import type { ComponentType } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { NodeKind } from './types';
import { InputNode } from './nodes/InputNode';
import { OutputNode } from './nodes/OutputNode';
import { RemoveBgNode } from './nodes/RemoveBgNode';
import { ImageGenNode } from './nodes/ImageGenNode';
import { StyleNode } from './nodes/StyleNode';
import { CameraAngleNode } from './nodes/CameraAngleNode';
import { UpscaleNode } from './nodes/UpscaleNode';
import { PromptOptimizeNode } from './nodes/PromptOptimizeNode';
import { AnalyzeNode } from './nodes/AnalyzeNode';
import { OutpaintNode } from './nodes/OutpaintNode';
import { CopyStyleNode } from './nodes/CopyStyleNode';
import { ApplyStyleNode } from './nodes/ApplyStyleNode';
import { InpaintNode } from './nodes/InpaintNode';
import { AdjustmentsNode } from './nodes/AdjustmentsNode';
import { LayerSplitNode } from './nodes/LayerSplitNode';
import { BrandKitNode } from './nodes/BrandKitNode';
import { CrossPlatformNode } from './nodes/CrossPlatformNode';
import { ProductMarketingNode } from './nodes/ProductMarketingNode';
import { GroupNode } from './nodes/GroupNode';
import { NoteNode } from './nodes/NoteNode';

export type NodeIoType = 'none' | 'image' | 'text' | 'imageOrText' | 'imageBatch';
export type NodeCategory = 'input' | 'layout' | 'process' | 'generate' | 'analysis' | 'output';

export interface NodeRegistryEntry {
  kind: NodeKind;
  component: ComponentType<NodeProps>;
  label: string;
  addLabel?: string;
  addable: boolean;
  category: NodeCategory;
  needsUpstream: boolean;
  input: NodeIoType;
  output: NodeIoType;
}

export const NODE_REGISTRY = {
  input: {
    kind: 'input',
    component: InputNode,
    label: 'Input',
    addable: false,
    category: 'input',
    needsUpstream: false,
    input: 'none',
    output: 'imageOrText',
  },
  output: {
    kind: 'output',
    component: OutputNode,
    label: 'Output',
    addLabel: '＋ 輸出',
    addable: true,
    category: 'output',
    needsUpstream: true,
    input: 'imageOrText',
    output: 'imageOrText',
  },
  removeBg: {
    kind: 'removeBg',
    component: RemoveBgNode,
    label: '去背',
    addLabel: '＋ 去背',
    addable: true,
    category: 'process',
    needsUpstream: true,
    input: 'image',
    output: 'image',
  },
  imageGen: {
    kind: 'imageGen',
    component: ImageGenNode,
    label: '生成圖片',
    addLabel: '＋ 生成圖片',
    addable: true,
    category: 'generate',
    needsUpstream: false,
    input: 'imageOrText',
    output: 'image',
  },
  style: {
    kind: 'style',
    component: StyleNode,
    label: '風格轉換',
    addLabel: '＋ 風格',
    addable: true,
    category: 'process',
    needsUpstream: true,
    input: 'image',
    output: 'image',
  },
  cameraAngle: {
    kind: 'cameraAngle',
    component: CameraAngleNode,
    label: '視角轉換',
    addLabel: '＋ 視角',
    addable: true,
    category: 'process',
    needsUpstream: true,
    input: 'image',
    output: 'image',
  },
  upscale: {
    kind: 'upscale',
    component: UpscaleNode,
    label: '放大',
    addLabel: '＋ 放大',
    addable: true,
    category: 'process',
    needsUpstream: true,
    input: 'image',
    output: 'image',
  },
  promptOptimize: {
    kind: 'promptOptimize',
    component: PromptOptimizeNode,
    label: '提示詞優化',
    addLabel: '＋ 優化提示',
    addable: true,
    category: 'analysis',
    needsUpstream: false,
    input: 'text',
    output: 'text',
  },
  analyze: {
    kind: 'analyze',
    component: AnalyzeNode,
    label: '圖片分析',
    addLabel: '＋ 分析',
    addable: true,
    category: 'analysis',
    needsUpstream: true,
    input: 'image',
    output: 'text',
  },
  outpaint: {
    kind: 'outpaint',
    component: OutpaintNode,
    label: '擴展圖片 (Outpainting)',
    addLabel: '＋ 擴展圖片',
    addable: true,
    category: 'process',
    needsUpstream: true,
    input: 'image',
    output: 'image',
  },
  inpaint: {
    kind: 'inpaint', component: InpaintNode, label: 'AI 局部重繪', addLabel: '＋ AI 局部重繪',
    addable: true, category: 'process', needsUpstream: true, input: 'image', output: 'image',
  },
  adjustments: {
    kind: 'adjustments', component: AdjustmentsNode, label: '基礎調色', addLabel: '＋ 基礎調色',
    addable: true, category: 'process', needsUpstream: true, input: 'image', output: 'image',
  },
  copyStyle: {
    kind: 'copyStyle',
    component: CopyStyleNode,
    label: '複製風格',
    addLabel: '＋ 複製風格',
    addable: true,
    category: 'process',
    needsUpstream: true,
    input: 'image',
    output: 'text',
  },
  applyStyle: {
    kind: 'applyStyle', component: ApplyStyleNode, label: '貼上風格', addLabel: '＋ 貼上風格',
    addable: true, category: 'process', needsUpstream: true, input: 'imageOrText', output: 'image',
  },
  layerSplit: {
    kind: 'layerSplit',
    component: LayerSplitNode,
    label: '一鍵拆分貼圖/圖示',
    addLabel: '＋ 拆分貼圖',
    addable: true,
    category: 'process',
    needsUpstream: true,
    input: 'image',
    output: 'imageBatch',
  },
  brandKit: {
    kind: 'brandKit',
    component: BrandKitNode,
    label: '延伸品牌套件',
    addLabel: '＋ 延伸品牌',
    addable: true,
    category: 'generate',
    needsUpstream: true,
    input: 'image',
    output: 'imageBatch',
  },
  crossPlatform: {
    kind: 'crossPlatform',
    component: CrossPlatformNode,
    label: '一鍵跨平台適配',
    addLabel: '＋ 跨平台適配',
    addable: true,
    category: 'generate',
    needsUpstream: true,
    input: 'image',
    output: 'imageBatch',
  },
  productMarketing: {
    kind: 'productMarketing',
    component: ProductMarketingNode,
    label: '產品行銷組圖',
    addLabel: '＋ 產品行銷',
    addable: true,
    category: 'generate',
    needsUpstream: true,
    input: 'image',
    output: 'imageBatch',
  },
  group: {
    kind: 'group',
    component: GroupNode,
    label: '節點框組',
    addLabel: '＋ 框組',
    addable: true,
    category: 'layout',
    needsUpstream: false,
    input: 'none',
    output: 'none',
  },
  note: {
    kind: 'note',
    component: NoteNode,
    label: '便利貼',
    addable: true,
    category: 'layout',
    needsUpstream: false,
    input: 'none',
    output: 'text',
  },
} satisfies Record<NodeKind, NodeRegistryEntry>;

export const nodeTypes = Object.fromEntries(
  Object.entries(NODE_REGISTRY).map(([kind, entry]) => [kind, entry.component]),
) as Record<NodeKind, NodeRegistryEntry['component']>;

export const DEFAULT_NODE_LABELS = Object.fromEntries(
  Object.entries(NODE_REGISTRY).map(([kind, entry]) => [kind, entry.label]),
) as Record<NodeKind, string>;

const NODE_REGISTRY_ENTRIES = Object.values(NODE_REGISTRY) as NodeRegistryEntry[];

export const ADDABLE_NODES = NODE_REGISTRY_ENTRIES
  .filter(entry => entry.addable)
  .map(entry => ({
    kind: entry.kind,
    label: entry.label,
    category: entry.category,
  }));

export const nodeRequiresUpstream = (kind: NodeKind): boolean => NODE_REGISTRY[kind].needsUpstream;
