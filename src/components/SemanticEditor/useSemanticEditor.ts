/**
 * useSemanticEditor
 * - 分層：Gemini bbox → crop → SAM2(center click) → 放回原位
 * - Apply：SAM2 mask → Atlas Inpaint（全圖，GPT 處理邊緣）→ 建立新版本
 * - 版本：每次 Apply 產生 EditorVersion，可切換
 */

import { useState, useCallback, useRef } from 'react';
import type {
    SmartLayer, SmartLayerCategory,
    SemanticEditorState, SmartLayerVersion,
    EditorVersion,
} from '../../types';
import {
    segmentSemanticLayers, segmentSemanticLayersOnnx, compositeSmartLayers, regenerateLayer,
    addLayerByClick, addLayerByBox, addLayerByPoints,
    describeLayerWithGemini, buildSmartLayerFromMask,
    layerToFullCanvas, transparentPngToInpaintMask,
    type SAM2Point,
} from './semanticLayerUtils';

// ── Category 顯示設定 ────────────────────────────────────────────────────────
export const CATEGORY_META: Record<SmartLayerCategory, { label: string; color: string; priority: number }> = {
    SUBJECT:    { label: '主角',   color: '#7c3aed', priority: 0 },
    PRODUCT:    { label: '商品',   color: '#2563eb', priority: 1 },
    TEXT:       { label: '文字',   color: '#059669', priority: 2 },
    OBJECTS:    { label: '物件',   color: '#d97706', priority: 3 },
    DECOR:      { label: '裝飾',   color: '#db2777', priority: 4 },
    BACKGROUND: { label: '背景',   color: '#6b7280', priority: 5 },
};

// ── Hook ─────────────────────────────────────────────────────────────────────
export interface SemanticEditorOptions {
    originalBase64: string;
    geminiApiKey?: string;
    atlasApiKey?: string;
    falApiKey?: string;
    imageModel?: string;
    /** 是否使用本機 SAM2 Worker（替代 fal.ai） */
    useLocalSAM2?: boolean;
    /** 上次退出時保留的狀態（重新開啟時恢復） */
    initialState?: {
        compositeBase64: string;
        backgroundBase64?: string;
        layers: SmartLayer[];
        originalLayers?: SmartLayer[];
        versions: EditorVersion[];
    };
}

export function useSemanticEditor({
    originalBase64,
    geminiApiKey,
    atlasApiKey,
    falApiKey,
    imageModel,
    useLocalSAM2 = false,
    initialState,
}: SemanticEditorOptions) {

    // 初始時從 initialState 恢復，backgroundBase64 預設用 originalBase64
    const initBackground = initialState?.versions?.length
        ? (initialState.versions[initialState.versions.length - 1].backgroundBase64 ?? originalBase64)
        : originalBase64;

    const [state, setState] = useState<SemanticEditorState>(() => ({
        originalBase64,
        compositeBase64:    initialState?.compositeBase64 ?? originalBase64,
        backgroundBase64:   initialState?.backgroundBase64 ?? initBackground,
        layers:             initialState?.layers          ?? [],
        originalLayers:     initialState?.originalLayers ?? initialState?.layers ?? [],
        selectedLayerId:    null,
        status:             'idle',
        statusMessage:      '',
        versions:           initialState?.versions        ?? [],
        activeVersionIndex: initialState ? (initialState.versions.length - 1) : -1,
    }));

    const analyzingRef  = useRef(false);
    const cancelledRef  = useRef(false);
    /** 目前 Apply 操作的 AbortController，取消時 abort() 真正中止 Atlas 輪詢 */
    const abortCtrlRef  = useRef<AbortController | null>(null);

    const setStatus = useCallback((
        status: SemanticEditorState['status'],
        message = '',
    ) => {
        setState(s => ({ ...s, status, statusMessage: message }));
    }, []);

    /**
     * 取消目前的 AI 操作：
     * - abort() 中止 Atlas fetch 輪詢（立即停止等待）
     * - UI 回到 idle
     * - Server 端繼續跑（Atlas 無取消 API），但前端不再等待
     */
    const cancelOperation = useCallback(() => {
        cancelledRef.current = true;
        abortCtrlRef.current?.abort();
        abortCtrlRef.current = null;
        setStatus('idle', '');
        setTimeout(() => { cancelledRef.current = false; }, 250);
    }, [setStatus]);

    // ── 分析圖片 ─────────────────────────────────────────────────────────────
    const analyzeImage = useCallback(async () => {
        if (analyzingRef.current) return;
        if (!geminiApiKey) throw new Error('需要設定 Gemini API Key');
        if (!useLocalSAM2 && !falApiKey) throw new Error('SAM2 分割需要 fal.ai API Key（或先下載本機 SAM2 模型）');

        analyzingRef.current = true;
        setStatus('analyzing', `Gemini 分析圖片中（${useLocalSAM2 ? '本機 SAM2' : 'fal.ai SAM2'}）...`);

        try {
            const fgLayers = useLocalSAM2
                ? await segmentSemanticLayersOnnx({
                    imageBase64: originalBase64,
                    geminiApiKey,
                    onProgress: msg => setStatus('segmenting', msg),
                })
                : await segmentSemanticLayers({
                    imageBase64: originalBase64,
                    geminiApiKey,
                    falApiKey: falApiKey!,
                    onProgress: msg => setStatus('segmenting', msg),
                });

            setStatus('compositing', '合成預覽...');
            const composite = await compositeSmartLayers(originalBase64, fgLayers);

            setState(s => ({
                ...s,
                layers:             fgLayers,
                originalLayers:     fgLayers,
                compositeBase64:    composite,
                backgroundBase64:   s.originalBase64,
                lamaBackgroundBase64: undefined,
                selectedLayerId:    null,
                status:             'idle',
                statusMessage:      '',
                versions:           [],
                activeVersionIndex: -1,
            }));
        } catch (e) {
            analyzingRef.current = false;
            setStatus('idle', '');
            throw e;
        }
        analyzingRef.current = false;
    }, [originalBase64, geminiApiKey, falApiKey, useLocalSAM2, setStatus]);

    // ── LaMa 純背景圖層生成（手動觸發，與 SAM2 分析分開）────────────────────────
    const generateLamaBackground = useCallback(async () => {
        const fgLayers = state.layers.filter(l => l.category !== 'BACKGROUND');
        if (fgLayers.length === 0) throw new Error('請先執行分析，再生成背景圖層');

        setStatus('compositing', 'LaMa 移除前景、生成純背景...');
        try {
            const { getModelStatus } = await import('../../utils/onnxModelCache');
            if (await getModelStatus('lama') !== 'ready')
                throw new Error('LaMa 模型尚未下載，請先在「本機 AI 模型」下載');

            const { buildCombinedMaskFromLayers } = await import('../../utils/lamaOnnx');
            const { runLamaInWorker } = await import('../../utils/lamaWorkerClient');
            const { getImageDims } = await import('./semanticLayerUtils');
            const { w: fullW, h: fullH } = await getImageDims(originalBase64);
            const combinedMask = await buildCombinedMaskFromLayers(fgLayers, fullW, fullH);
            // Worker 推論：不阻塞主執行緒，轉圈動畫保持運作
            const lamaBackground = await runLamaInWorker(originalBase64, combinedMask);

            const bgLayer: SmartLayer = {
                id:             `bg_lama_${Date.now()}`,
                name:           '背景',
                category:       'BACKGROUND',
                base64:         lamaBackground,
                originalBase64: lamaBackground,
                prompt:         '原始背景',
                appliedPrompt:  '原始背景',
                bbox:           { x: 0, y: 0, w: 1, h: 1 },
                cropRatio:      { x: 0, y: 0, w: 1, h: 1 },
                pixelWidth:     fullW,
                pixelHeight:    fullH,
                history:        [],
                isVisible:      true,
                isLocked:       true,
                zIndex:         -1,
            };

            // 移除舊的 BACKGROUND 圖層（重新生成時替換）
            const withoutOldBg = state.layers.filter(l => l.category !== 'BACKGROUND');
            const allLayers = [...withoutOldBg, bgLayer];
            const composite = await compositeSmartLayers(lamaBackground, fgLayers);

            setState(s => ({
                ...s,
                layers:               allLayers,
                originalLayers:       s.activeVersionIndex === -1 ? allLayers : s.originalLayers,
                compositeBase64:      composite,
                backgroundBase64:     lamaBackground,
                lamaBackgroundBase64: lamaBackground,
                status:               'idle',
                statusMessage:        '',
            }));
        } catch (e) {
            setStatus('idle', '');
            throw e;
        }
    }, [state.layers, originalBase64, setStatus]);

    // ── 版本快照同步 helper ──────────────────────────────────────────────────
    // 所有修改 layers 的操作都必須呼叫此函式，確保當前版本快照也同步更新
    const withLayerSync = (s: SemanticEditorState, updated: SmartLayer[]) => {
        const onOriginal = s.activeVersionIndex === -1;
        return {
            layers:         updated,
            originalLayers: onOriginal ? updated : s.originalLayers,
            versions:       onOriginal ? s.versions : s.versions.map((ver, i) =>
                i === s.activeVersionIndex ? { ...ver, layers: updated } : ver
            ),
        };
    };

    // ── 選取圖層 ─────────────────────────────────────────────────────────────
    const selectLayer = useCallback((id: string | null) => {
        setState(s => ({ ...s, selectedLayerId: id }));
    }, []);

    // ── 更新 Prompt ──────────────────────────────────────────────────────────
    const updatePrompt = useCallback((layerId: string, prompt: string) => {
        setState(s => {
            const updated = s.layers.map(l => l.id === layerId ? { ...l, prompt } : l);
            return { ...s, ...withLayerSync(s, updated) };
        });
    }, []);

    // ── 更新參考圖 ────────────────────────────────────────────────────────────
    const updateReferenceImage = useCallback((layerId: string, referenceImage: string | undefined) => {
        setState(s => {
            const updated = s.layers.map(l => l.id === layerId ? { ...l, referenceImage } : l);
            return { ...s, ...withLayerSync(s, updated) };
        });
    }, []);

    // ── 單層 Apply（inpaint → 全部重新切割）────────────────────────────────
    const applyLayerRegen = useCallback(async (layer: SmartLayer, engine: 'gpt' | 'gemini' = 'gpt') => {
        if (engine === 'gpt'    && !atlasApiKey)  throw new Error('GPT 重繪需要 Atlas（GPT Image 2）API Key');
        if (engine === 'gemini' && !geminiApiKey) throw new Error('Gemini 重繪需要 Gemini API Key');

        cancelledRef.current = false;
        const ctrl = new AbortController();
        abortCtrlRef.current = ctrl;
        setStatus('regenerating', `重新生成「${layer.name}」...`);

        try {
            // Gemini 路線：用 LaMa 填補舊物件區域，讓它真正消失
            let cleanBase: string | undefined;
            if (engine === 'gemini') {
                const { getModelStatus } = await import('../../utils/onnxModelCache');
                const lamaReady = await getModelStatus('lama') === 'ready';
                if (lamaReady) {
                    const { runLamaInWorker } = await import('../../utils/lamaWorkerClient');
                    const dims = await import('./semanticLayerUtils').then(m => m.getImageDims(state.compositeBase64));
                    const fullLayerPng = await layerToFullCanvas(layer, dims.w, dims.h);
                    const maskBase64   = await transparentPngToInpaintMask(fullLayerPng);
                    setStatus('regenerating', '🧹 LaMa 移除舊物件...');
                    cleanBase = await runLamaInWorker(state.compositeBase64, maskBase64);
                } else {
                    // LaMa 未下載：退而用其他圖層合成
                    const otherLayers = state.layers.filter(
                        l => l.id !== layer.id && l.isVisible && l.category !== 'BACKGROUND'
                    );
                    cleanBase = await compositeSmartLayers(
                        state.backgroundBase64 ?? state.originalBase64, otherLayers
                    );
                }
            }

            const result = await regenerateLayer({
                layer,
                originalBase64: state.compositeBase64,
                newPrompt: layer.prompt,
                engine,
                atlasApiKey,
                geminiApiKey,
                imageModel,
                cleanBase,
                falApiKey: falApiKey || undefined,
                signal:    ctrl.signal,
                onProgress: msg => { if (!cancelledRef.current) setStatus('regenerating', msg); },
                referenceImage: layer.referenceImage,
            });

            // 使用者已按取消，忽略結果
            if (cancelledRef.current) return;

            // Step 2：全部重新切割（Gemini + SAM2 從新合成圖重新分層）
            let freshLayers: SmartLayer[] = [];
            if (geminiApiKey && falApiKey) {
                setStatus('segmenting', '重新分析圖層...');
                try {
                    freshLayers = await segmentSemanticLayers({
                        imageBase64: result.newCompositeBase64,
                        geminiApiKey,
                        falApiKey,
                        onProgress: msg => setStatus('segmenting', msg),
                    });
                } catch (segErr) {
                    console.warn('[applyLayerRegen] Re-segment failed, keeping old layers:', segErr);
                    // fallback：保留舊圖層（只更新被修改的那個）
                    const layerVersion: SmartLayerVersion = {
                        id: `v_${Date.now()}`, timestamp: Date.now(),
                        prompt: layer.prompt, base64: layer.base64,
                    };
                    freshLayers = state.layers.map(l =>
                        l.id === layer.id
                            ? { ...l, base64: result.newLayerBase64, cropRatio: result.newCropRatio,
                                pixelWidth: result.pixelWidth, pixelHeight: result.pixelHeight,
                                appliedPrompt: layer.prompt, history: [...l.history, layerVersion] }
                            : l
                    );
                }
            } else {
                // 無 API key → 只更新被修改的那層
                const layerVersion: SmartLayerVersion = {
                    id: `v_${Date.now()}`, timestamp: Date.now(),
                    prompt: layer.prompt, base64: layer.base64,
                };
                freshLayers = state.layers.map(l =>
                    l.id === layer.id
                        ? { ...l, base64: result.newLayerBase64, cropRatio: result.newCropRatio,
                            pixelWidth: result.pixelWidth, pixelHeight: result.pixelHeight,
                            appliedPrompt: layer.prompt, history: [...l.history, layerVersion] }
                        : l
                );
            }

            // Step 3：建立新版本
            // backgroundBase64 = GPT inpaint 的輸出（新的底圖，物件已被重繪進背景）
            const newVersion: EditorVersion = {
                id:               `ev_${Date.now()}`,
                timestamp:        Date.now(),
                changedLayerName: layer.name,
                prompt:           layer.prompt,
                compositeBase64:  result.newCompositeBase64,
                backgroundBase64: result.newCompositeBase64,
                layers:           freshLayers,
            };

            setState(s => ({
                ...s,
                compositeBase64:    result.newCompositeBase64,
                backgroundBase64:   result.newCompositeBase64,   // 新底圖
                layers:             freshLayers,
                versions:           [...s.versions, newVersion],
                activeVersionIndex: s.versions.length,
                status:             'idle',
                statusMessage:      '',
            }));

        } catch (e: any) {
            abortCtrlRef.current = null;
            if (e?.name === 'AbortError' || e?.message === '使用者取消操作' || cancelledRef.current) {
                setStatus('idle', '');
                return;
            }
            setStatus('idle', '');
            throw e;
        }
    }, [state.compositeBase64, state.layers, state.versions.length, geminiApiKey, atlasApiKey, falApiKey, imageModel, setStatus]);

    // ── 批次 Apply（所有 prompt 已修改但未套用的圖層）────────────────────────
    const applyAllDirtyLayers = useCallback(async (engine: 'gpt' | 'gemini' = 'gpt') => {
        if (engine === 'gpt'    && !atlasApiKey)  throw new Error('GPT 重繪需要 Atlas（GPT Image 2）API Key');
        if (engine === 'gemini' && !geminiApiKey) throw new Error('Gemini 重繪需要 Gemini API Key');

        // 找出所有「prompt 已改但未套用」的圖層
        const dirtyLayers = state.layers.filter(
            l => l.prompt.trim() !== l.appliedPrompt.trim() && !l.isLocked
        );
        if (dirtyLayers.length === 0) return;

        setStatus('regenerating', `批次重繪 ${dirtyLayers.length} 個圖層...`);

        // 依序處理，每次 inpaint 的結果作為下一次的 base（視覺一致）
        let currentComposite = state.compositeBase64;
        let currentLayers    = [...state.layers];

        try {
            for (let i = 0; i < dirtyLayers.length; i++) {
                const layer = dirtyLayers[i];
                // 從 currentLayers 取最新版（可能上一輪已更新）
                const latestLayer = currentLayers.find(l => l.id === layer.id) ?? layer;

                setStatus('regenerating',
                    `重繪 ${i + 1}/${dirtyLayers.length}：${latestLayer.name}...`
                );

                const result = await regenerateLayer({
                    layer:          latestLayer,
                    originalBase64: currentComposite,   // 疊加上一層結果
                    newPrompt:      latestLayer.prompt,
                    engine,
                    atlasApiKey,
                    geminiApiKey,
                    imageModel,
                    falApiKey: falApiKey || undefined,
                    onProgress: msg => setStatus('regenerating', msg),
                });

                // 更新 currentLayers（為下一個圖層準備）
                const layerVersion: SmartLayerVersion = {
                    id:        `v_${Date.now()}_${i}`,
                    timestamp: Date.now(),
                    prompt:    latestLayer.prompt,
                    base64:    latestLayer.base64,
                };
                currentLayers = currentLayers.map(l =>
                    l.id === layer.id
                        ? {
                            ...l,
                            base64:        result.newLayerBase64,
                            cropRatio:     result.newCropRatio,
                            pixelWidth:    result.pixelWidth,
                            pixelHeight:   result.pixelHeight,
                            appliedPrompt: latestLayer.prompt,
                            history:       [...l.history, layerVersion],
                        }
                        : l
                );
                currentComposite = result.newCompositeBase64;
            }

            // 所有 inpaint 完成，重新切割全部圖層
            let finalLayers = currentLayers;
            if (geminiApiKey && falApiKey) {
                setStatus('segmenting', '重新分析圖層...');
                try {
                    finalLayers = await segmentSemanticLayers({
                        imageBase64: currentComposite,
                        geminiApiKey,
                        falApiKey,
                        onProgress: msg => setStatus('segmenting', msg),
                    });
                } catch (segErr) {
                    console.warn('[applyAllDirtyLayers] Re-segment failed:', segErr);
                    finalLayers = currentLayers; // fallback
                }
            }

            const changedNames = dirtyLayers.map(l => l.name).join('、');
            const newVersion: EditorVersion = {
                id:               `ev_batch_${Date.now()}`,
                timestamp:        Date.now(),
                changedLayerName: changedNames,
                prompt:           `批次修改：${changedNames}`,
                compositeBase64:  currentComposite,
                backgroundBase64: currentComposite,
                layers:           finalLayers,
            };

            setState(s => ({
                ...s,
                compositeBase64:    currentComposite,
                layers:             finalLayers,
                versions:           [...s.versions, newVersion],
                activeVersionIndex: s.versions.length,
                status:             'idle',
                statusMessage:      '',
            }));

        } catch (e) {
            setStatus('idle', '');
            throw e;
        }
    }, [state.compositeBase64, state.layers, state.versions.length, geminiApiKey, atlasApiKey, falApiKey, imageModel, setStatus]);

    // ── 切換版本 ─────────────────────────────────────────────────────────────
    const switchVersion = useCallback((index: number) => {
        setState(s => {
            if (index < 0 || index >= s.versions.length) return s;
            const ver = s.versions[index];
            return {
                ...s,
                compositeBase64:    ver.compositeBase64,
                backgroundBase64:   ver.backgroundBase64 ?? s.originalBase64,
                layers:             ver.layers,
                selectedLayerId:    null,
                activeVersionIndex: index,
            };
        });
    }, []);

    const switchToOriginal = useCallback(() => {
        setState(s => ({
            ...s,
            compositeBase64:    s.originalBase64,
            backgroundBase64:   s.originalBase64,
            layers:             s.originalLayers,
            selectedLayerId:    null,
            activeVersionIndex: -1,
        }));
    }, []);

    // ── 手動點選新增圖層 ─────────────────────────────────────────────────────
    const addClickLayer = useCallback(async (clickPixel: { x: number; y: number }) => {
        if (!falApiKey) throw new Error('SAM2 需要 fal.ai API Key');

        setStatus('segmenting', 'SAM2 點選分割...');
        // 用目前版本的合成圖（非原始版本時應在新版圖上框選）
        const workingImage = state.compositeBase64;
        try {
            const newLayer = await addLayerByClick({
                imageBase64: workingImage,
                falApiKey,
                clickPixel,
                onProgress: msg => setStatus('segmenting', msg),
            });

            // Gemini 非同步生成描述（不阻塞圖層顯示）
            if (geminiApiKey) {
                describeLayerWithGemini(newLayer.base64, geminiApiKey).then(({ name, prompt }) => {
                    if (name || prompt) setState(s => {
                        const updated = s.layers.map(l => l.id === newLayer.id
                            ? { ...l, ...(name && { name }), ...(prompt && { prompt, appliedPrompt: prompt }) } : l);
                        return { ...s, ...withLayerSync(s, updated) };
                    });
                });
            }
            setState(s => {
                const updated = [...s.layers, newLayer];
                const fgLayers = updated.filter(l => l.category !== 'BACKGROUND');
                compositeSmartLayers(s.backgroundBase64, fgLayers).then(composite => {
                    setState(ss => ({ ...ss, compositeBase64: composite }));
                });
                return { ...s, ...withLayerSync(s, updated), selectedLayerId: newLayer.id, status: 'idle', statusMessage: '' };
            });
        } catch (e) {
            setStatus('idle', '');
            throw e;
        }
    }, [state.compositeBase64, falApiKey, geminiApiKey, setStatus]);

    // ── A：矩形框選新增圖層 ──────────────────────────────────────────────────
    const addBoxLayer = useCallback(async (boxRatio: { x: number; y: number; w: number; h: number }) => {
        if (!falApiKey) throw new Error('SAM2 需要 fal.ai API Key');
        setStatus('segmenting', 'SAM2 框選分割...');
        const workingImage = state.compositeBase64;
        try {
            const newLayer = await addLayerByBox({
                imageBase64: workingImage,
                falApiKey,
                boxRatio,
                onProgress: msg => setStatus('segmenting', msg),
            });
            if (geminiApiKey) {
                describeLayerWithGemini(newLayer.base64, geminiApiKey).then(({ name, prompt }) => {
                    if (name || prompt) setState(s => {
                        const updated = s.layers.map(l => l.id === newLayer.id
                            ? { ...l, ...(name && { name }), ...(prompt && { prompt, appliedPrompt: prompt }) } : l);
                        return { ...s, ...withLayerSync(s, updated) };
                    });
                });
            }
            setState(s => {
                const updated = [...s.layers, newLayer];
                const fgLayers = updated.filter(l => l.category !== 'BACKGROUND');
                compositeSmartLayers(s.backgroundBase64, fgLayers).then(c =>
                    setState(ss => ({ ...ss, compositeBase64: c }))
                );
                return { ...s, ...withLayerSync(s, updated), selectedLayerId: newLayer.id, status: 'idle', statusMessage: '' };
            });
        } catch (e) { setStatus('idle', ''); throw e; }
    }, [state.compositeBase64, falApiKey, geminiApiKey, setStatus]);

    // ── B：多點模式新增圖層 ──────────────────────────────────────────────────
    const addPointsLayer = useCallback(async (points: SAM2Point[], statusMsg?: string, layerName?: string) => {
        if (!falApiKey) throw new Error('SAM2 需要 fal.ai API Key');
        setStatus('segmenting', statusMsg ?? 'SAM2 多點分割...');
        const workingImage = state.compositeBase64;
        try {
            const newLayer = await addLayerByPoints({
                imageBase64: workingImage,
                falApiKey,
                points,
                layerName,
                onProgress: msg => setStatus('segmenting', msg),
            });
            if (geminiApiKey) {
                describeLayerWithGemini(newLayer.base64, geminiApiKey).then(({ name, prompt }) => {
                    if (name || prompt) setState(s => {
                        const updated = s.layers.map(l => l.id === newLayer.id
                            ? { ...l, ...(name && { name }), ...(prompt && { prompt, appliedPrompt: prompt }) } : l);
                        return { ...s, ...withLayerSync(s, updated) };
                    });
                });
            }
            setState(s => {
                const updated = [...s.layers, newLayer];
                const fgLayers = updated.filter(l => l.category !== 'BACKGROUND');
                compositeSmartLayers(s.backgroundBase64, fgLayers).then(c =>
                    setState(ss => ({ ...ss, compositeBase64: c }))
                );
                return { ...s, ...withLayerSync(s, updated), selectedLayerId: newLayer.id, status: 'idle', statusMessage: '' };
            });
        } catch (e) { setStatus('idle', ''); throw e; }
    }, [state.compositeBase64, falApiKey, geminiApiKey, setStatus]);

    // ── 通用：從已建好的 SmartLayer 加入（ONNX 路徑用）─────────────────────────
    const addLayerFromMaskBase64 = useCallback(async (newLayer: SmartLayer) => {
        // Gemini 非同步生成 prompt
        if (geminiApiKey) {
            describeLayerWithGemini(newLayer.base64, geminiApiKey).then(desc => {
                if (desc) setState(s => {
                    const updated = s.layers.map(l => l.id === newLayer.id
                        ? { ...l, prompt: desc, appliedPrompt: desc } : l);
                    return { ...s, ...withLayerSync(s, updated) };
                });
            });
        }
        setState(s => {
            const updated = [...s.layers, newLayer];
            const fgLayers = updated.filter(l => l.category !== 'BACKGROUND');
            compositeSmartLayers(s.backgroundBase64, fgLayers).then(c =>
                setState(ss => ({ ...ss, compositeBase64: c }))
            );
            return { ...s, ...withLayerSync(s, updated), selectedLayerId: newLayer.id, status: 'idle', statusMessage: '' };
        });
    }, [geminiApiKey, setStatus]);

    // ── 切換可見性 ───────────────────────────────────────────────────────────
    const toggleVisibility = useCallback((layerId: string) => {
        setState(s => {
            const layer = s.layers.find(l => l.id === layerId);
            const updated = s.layers.map(l =>
                l.id === layerId ? { ...l, isVisible: !l.isVisible } : l
            );

            // BACKGROUND 圖層眼睛：切換底圖在 LaMa 背景 ↔ 原始圖之間
            let newBg = s.backgroundBase64;
            if (layer?.category === 'BACKGROUND') {
                newBg = layer.isVisible
                    ? s.originalBase64                              // 隱藏 → 原始圖
                    : (s.lamaBackgroundBase64 ?? s.originalBase64); // 顯示 → LaMa 背景
            }

            // 合成時只用前景層，背景由 backgroundBase64 決定
            const fgLayers = updated.filter(l => l.category !== 'BACKGROUND');
            compositeSmartLayers(newBg, fgLayers).then(composite => {
                setState(ss => ({ ...ss, compositeBase64: composite }));
            });

            return { ...s, ...withLayerSync(s, updated), backgroundBase64: newBg };
        });
    }, []);

    // ── 切換鎖定 ─────────────────────────────────────────────────────────────
    const toggleLock = useCallback((layerId: string) => {
        setState(s => {
            const updated = s.layers.map(l => l.id === layerId ? { ...l, isLocked: !l.isLocked } : l);
            return { ...s, ...withLayerSync(s, updated) };
        });
    }, []);

    // ── 刪除圖層 ─────────────────────────────────────────────────────────────
    const deleteLayer = useCallback((layerId: string) => {
        setState(s => {
            const updated = s.layers.filter(l => l.id !== layerId);
            const fgLayers = updated.filter(l => l.category !== 'BACKGROUND');
            compositeSmartLayers(s.backgroundBase64, fgLayers).then(composite => {
                setState(ss => ({ ...ss, compositeBase64: composite }));
            });
            return {
                ...s,
                ...withLayerSync(s, updated),
                selectedLayerId: s.selectedLayerId === layerId ? null : s.selectedLayerId,
            };
        });
    }, []);

    // ── 回復原始版本 ─────────────────────────────────────────────────────────
    const resetLayer = useCallback((layerId: string) => {
        setState(s => {
            const updated = s.layers.map(l =>
                l.id === layerId ? { ...l, base64: l.originalBase64, history: [] } : l
            );
            const fgLayers = updated.filter(l => l.category !== 'BACKGROUND');
            compositeSmartLayers(s.backgroundBase64, fgLayers).then(composite => {
                setState(ss => ({ ...ss, compositeBase64: composite }));
            });
            return { ...s, ...withLayerSync(s, updated) };
        });
    }, []);

    const selectedLayer = state.layers.find(l => l.id === state.selectedLayerId) ?? null;
    const isLoading     = state.status !== 'idle';

    const renameLayer = useCallback((layerId: string, newName: string) => {
        setState(s => {
            const updated = s.layers.map(l => l.id === layerId ? { ...l, name: newName } : l);
            return { ...s, ...withLayerSync(s, updated) };
        });
    }, []);

    const renameVersion = useCallback((versionIndex: number, newLabel: string) => {
        setState(s => ({
            ...s,
            versions: s.versions.map((v, i) => i === versionIndex ? { ...v, changedLayerName: newLabel } : v),
        }));
    }, []);

    // 有 prompt 已改但未套用的圖層
    const dirtyCount = state.layers.filter(
        l => l.prompt.trim() !== l.appliedPrompt.trim() && !l.isLocked
    ).length;

    return {
        state,
        selectedLayer,
        isLoading,
        dirtyCount,
        analyzeImage,
        selectLayer,
        updatePrompt,
        updateReferenceImage,
        applyLayerRegen,
        applyAllDirtyLayers,
        switchVersion,
        switchToOriginal,
        cancelOperation,
        addClickLayer,
        addBoxLayer,
        addPointsLayer,
        addLayerFromMaskBase64,
        toggleVisibility,
        toggleLock,
        deleteLayer,
        resetLayer,
        renameLayer,
        renameVersion,
        generateLamaBackground,
        setStatus,
    };
}
