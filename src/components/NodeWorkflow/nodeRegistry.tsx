import type { ComponentType } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { NodeKind } from './types';
import { InputNode } from './nodes/InputNode';
import { OutputNode } from './nodes/OutputNode';
import { RemoveBgNode } from './nodes/RemoveBgNode';
import { ImageGenNode } from './nodes/ImageGenNode';
import { StyleNode } from './nodes/StyleNode';
import { LayerSplitNode } from './nodes/LayerSplitNode';

export type NodeIoType = 'none' | 'image' | 'text' | 'imageOrText' | 'imageBatch';
export type NodeCategory = 'input' | 'process' | 'generate' | 'analysis' | 'output';

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
    addLabel: '＋ 生圖',
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
  layerSplit: {
    kind: 'layerSplit',
    component: LayerSplitNode,
    label: '圖層分離',
    addLabel: '＋ 圖層分離',
    addable: true,
    category: 'process',
    needsUpstream: true,
    input: 'image',
    output: 'imageBatch',
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
    label: entry.addLabel ?? `＋ ${entry.label}`,
    category: entry.category,
  }));

export const nodeRequiresUpstream = (kind: NodeKind): boolean => NODE_REGISTRY[kind].needsUpstream;
