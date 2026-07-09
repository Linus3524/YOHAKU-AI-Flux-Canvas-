// 節點圖執行引擎（純 TS，不碰 React）。
// #3 階段 A：線性鏈 + 本機去背。重用 src/ai/pipelines/* 現成函式，不重寫 AI 邏輯。
// 中間結果只在本函式回傳的 Map（記憶體），呼叫端不得寫進 graph 存檔。
import type { GraphNode, NodeGraphData, NodeRunStatus, ImageGenParams, RemoveBgParams } from '../types';
import { runLocalRmbgPipeline, checkLocalModelReady } from '../../../ai/pipelines/localModels';
import { geminiGenerateImage, atlasBatch } from '../../../ai/pipelines/generate';
import { buildPresetStylePrompt, generateStyledImage } from '../../../ai/pipelines/styleTransfer';
import type { AtlasGenerationModel } from '../../../utils/atlasImage';
import { isImageSrc } from '../mediaSrc';

const ATLAS_MODELS = ['seedream-v5', 'seedream-v4.5', 'gpt-image-2', 'flux-2-pro', 'qwen-image-2'];
const STYLE_PRESET_BY_KEY: Record<string, string> = {
  pixel: 'Pixel Art 8-bit / 16-bit',
  watercolor: 'Watercolor Bleed',
  anime: 'Japanese Anime Style',
  cyberpunk: 'Cyberpunk',
  clay: 'Claymation',
};

/** imageGen 節點：便利貼文字→提示詞、上游圖→參考圖，呼叫既有生圖 pipeline（Gemini / Atlas）。 */
async function runImageGen(
  params: Partial<ImageGenParams>,
  upstreams: string[],
  engine: ExecutorEngine,
): Promise<string> {
  const refImages = upstreams.filter(src => isImageSrc(src));
  const upstreamPrompt = upstreams.filter(src => !isImageSrc(src)).map(src => src.trim()).filter(Boolean).join('\n');
  const prompt = [upstreamPrompt, params.prompt].map(part => part?.trim()).filter(Boolean).join('\n\n');
  if (!prompt) throw new Error('生圖節點需要提示詞（便利貼文字或節點輸入框）');
  const aspectRatio = params.aspectRatio || '1:1';
  const model = params.model || 'gemini';

  if (ATLAS_MODELS.includes(model)) {
    if (!engine.atlasApiKey) throw new Error('此模型需要 Atlas API Key');
    // Atlas img2img 目前只接單張參考圖；多輸入時取第一張，Gemini 路徑可吃多張。
    const out = await atlasBatch(
      { prompt, ratio: aspectRatio, count: 1, refImage: refImages[0] },
      { model: model as AtlasGenerationModel, apiKey: engine.atlasApiKey },
    );
    if (!out[0]) throw new Error('生圖沒有回傳圖片');
    return out[0];
  }

  // Gemini 路徑
  if (!engine.geminiApiKey) throw new Error('生圖需要 Gemini API Key');
  const parts: any[] = [];
  for (const refImage of refImages) {
    const [header, data] = refImage.split(',');
    const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
    parts.push({ inlineData: { data, mimeType } });
  }
  parts.push({ text: prompt });
  const src = await geminiGenerateImage(
    { parts, aspectRatio, imageSize: '1K' },
    { apiKey: engine.geminiApiKey, model: engine.geminiImageModel || 'gemini-3.1-flash-image-preview' },
  );
  if (!src) throw new Error('生圖沒有回傳圖片');
  return src;
}

async function runStyleTransfer(
  styleKey: string | undefined,
  upstream: string,
  engine: ExecutorEngine,
): Promise<string> {
  if (!styleKey || styleKey === 'none') return upstream;
  if (!isImageSrc(upstream)) throw new Error('風格轉換節點需要上游圖片');
  if (!engine.geminiApiKey) throw new Error('風格轉換需要 Gemini API Key');

  const styleName = STYLE_PRESET_BY_KEY[styleKey] ?? styleKey;
  const src = await generateStyledImage(
    {
      srcImage: upstream,
      stylePrompt: buildPresetStylePrompt(styleName),
      preserveTransparency: true,
      transparencyKeys: {
        geminiApiKey: engine.geminiApiKey,
        imageModel: engine.geminiImageModel,
      },
    },
    {
      model: 'gemini',
      geminiApiKey: engine.geminiApiKey,
      geminiImageModel: engine.geminiImageModel || 'gemini-3.1-flash-image-preview',
      imageSize: '1K',
    },
  );
  if (!src) throw new Error('風格轉換沒有回傳圖片');
  return src;
}

async function runRemoveBg(
  params: Partial<RemoveBgParams>,
  input: string,
  onFallback?: (message: string) => void,
): Promise<string> {
  const mode = params.mode ?? 'local';
  if (mode === 'cloud') {
    onFallback?.('雲端去背 pipeline 尚未存在，暫時改用本機去背');
  }

  const notReady = await checkLocalModelReady('bria_rmbg');
  if (notReady) throw new Error(notReady);
  return await runLocalRmbgPipeline(input);
}

export interface ExecutorEngine {
  geminiApiKey?: string | null;
  atlasApiKey?: string | null;
  geminiImageModel?: string;
}

export interface ExecutorCallbacks {
  onNodeStatus?: (id: string, status: NodeRunStatus, message?: string) => void;
  /** 節點跑出結果時回報（每個動作節點自己顯示結果縮圖用）。 */
  onNodeResult?: (id: string, src: string) => void;
  /** 整張圖跑完後的錯誤彙總；不影響已成功節點的結果展示。 */
  onRunError?: (message: string) => void;
}

export interface ExecuteResult {
  outputSrc: string | null;
  results: Map<string, string>;
}

export interface ExecuteOptions {
  signal?: AbortSignal;
}

class GraphExecutionAbortError extends Error {
  constructor() {
    super('節點工作流已停止');
    this.name = 'GraphExecutionAbortError';
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new GraphExecutionAbortError();
}

/** Kahn 拓撲排序；有環路回傳 null。 */
function topoSort(graph: NodeGraphData): GraphNode[] | null {
  const indeg = new Map<string, number>();
  const byId = new Map<string, GraphNode>();
  for (const n of graph.nodes) { indeg.set(n.id, 0); byId.set(n.id, n); }
  for (const e of graph.edges) {
    if (indeg.has(e.target)) indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  }
  const queue = graph.nodes.filter(n => (indeg.get(n.id) ?? 0) === 0).map(n => n.id);
  const order: GraphNode[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    const node = byId.get(id);
    if (node) order.push(node);
    for (const e of graph.edges) {
      if (e.source !== id) continue;
      const d = (indeg.get(e.target) ?? 0) - 1;
      indeg.set(e.target, d);
      if (d === 0) queue.push(e.target);
    }
  }
  return order.length === graph.nodes.length ? order : null;
}

/** 找某節點的上游輸入圖（線性鏈：取第一條指向它的 edge 的來源結果）。 */
function upstreamSrc(nodeId: string, graph: NodeGraphData, results: Map<string, string>): string | undefined {
  const edge = graph.edges.find(e => e.target === nodeId);
  return edge ? results.get(edge.source) : undefined;
}

function upstreamSrcs(nodeId: string, graph: NodeGraphData, results: Map<string, string>): string[] {
  return graph.edges
    .filter(e => e.target === nodeId)
    .map(e => results.get(e.source))
    .filter((src): src is string => !!src);
}

function blockedByFailedUpstream(
  nodeId: string,
  graph: NodeGraphData,
  unavailableNodeIds: Set<string>,
): string | null {
  const edge = graph.edges.find(e => e.target === nodeId && unavailableNodeIds.has(e.source));
  return edge ? `上游節點 ${edge.source} 失敗或未產生結果` : null;
}

/** 終端節點 = 沒有任何 edge 以它為 source（鏈的末端）。 */
function terminalNodeIds(graph: NodeGraphData): Set<string> {
  const hasOutgoing = new Set(graph.edges.map(e => e.source));
  return new Set(graph.nodes.filter(n => !hasOutgoing.has(n.id)).map(n => n.id));
}

/**
 * 執行整張圖。沒有預放的 output 節點：最終輸出 = 鏈末端（終端節點）的結果。
 * 每個節點跑出結果都透過 onNodeResult 回報，讓該節點自己顯示結果縮圖。
 * 階段 A 只接 removeBg（本機）；imageGen / style 先原樣傳遞，等階段 B。
 */
export async function executeGraph(
  graph: NodeGraphData,
  engine: ExecutorEngine,
  callbacks: ExecutorCallbacks = {},
  options: ExecuteOptions = {},
): Promise<ExecuteResult> {
  const order = topoSort(graph);
  if (!order) throw new Error('節點圖有環路，無法執行');

  const results = new Map<string, string>();
  const status = (id: string, s: NodeRunStatus, msg?: string) => callbacks.onNodeStatus?.(id, s, msg);
  const emitResult = (id: string, src: string) => { results.set(id, src); callbacks.onNodeResult?.(id, src); };
  const terminals = terminalNodeIds(graph);
  const unavailableNodeIds = new Set<string>();
  const errors: { id: string; message: string }[] = [];

  let outputSrc: string | null = null;

  for (const node of order) {
    try {
      throwIfAborted(options.signal);

      if (node.kind === 'input') {
        const src = typeof node.data.src === 'string' ? node.data.src : '';
        emitResult(node.id, src);
        status(node.id, 'done');
      } else {
        const blockedReason = blockedByFailedUpstream(node.id, graph, unavailableNodeIds);
        if (blockedReason) {
          unavailableNodeIds.add(node.id);
          status(node.id, 'idle', blockedReason);
          continue;
        }

        const input = upstreamSrc(node.id, graph, results);
        const needsUpstream = node.kind === 'removeBg' || node.kind === 'style' || node.kind === 'output';
        if (needsUpstream && !input) {
          unavailableNodeIds.add(node.id);
          status(node.id, 'idle', '無上游輸入');
          continue;
        }

        status(node.id, 'running');
        throwIfAborted(options.signal);
        let result: string;
        switch (node.kind) {
          case 'removeBg': {
            result = await runRemoveBg(
              (node.data.params ?? {}) as Partial<RemoveBgParams>,
              input,
              message => status(node.id, 'running', message),
            );
            break;
          }
          case 'imageGen':
            result = await runImageGen(
              (node.data.params ?? {}) as Partial<ImageGenParams>,
              upstreamSrcs(node.id, graph, results),
              engine,
            );
            break;
          case 'output':
            // 輸出節點：直接傳遞上游輸入，並作為最終結果展示
            result = input;
            break;
          case 'style':
            result = await runStyleTransfer(
              typeof node.data.params?.styleKey === 'string' ? node.data.params.styleKey : undefined,
              input,
              engine,
            );
            break;
          default:
            result = input;
            break;
        }
        throwIfAborted(options.signal);
        emitResult(node.id, result);
        status(node.id, 'done');
      }
    } catch (err: any) {
      if (err instanceof GraphExecutionAbortError) {
        status(node.id, 'idle');
        break;
      }
      const message = err?.message || '執行失敗';
      unavailableNodeIds.add(node.id);
      errors.push({ id: node.id, message });
      status(node.id, 'error', message);
    }
  }

  // 決定最終輸出結果：
  // 1. 優先尋找圖中類型為 'output' 且有值的節點結果
  const outputNodes = order.filter(n => n.kind === 'output');
  if (outputNodes.length > 0) {
    for (const n of outputNodes) {
      const r = results.get(n.id);
      if (r) {
        outputSrc = r;
        break;
      }
    }
  }

  // 2. 如果沒有 output 節點，才 fallback 使用末端終端節點的結果
  if (!outputSrc) {
    for (const nodeId of terminals) {
      const r = results.get(nodeId);
      if (r) {
        outputSrc = r;
        break;
      }
    }
  }

  if (errors.length > 0) {
    const details = errors.map(error => `${error.id}: ${error.message}`).join('；');
    callbacks.onRunError?.(`${errors.length} 個節點失敗：${details}`);
  }

  return { outputSrc, results };
}
