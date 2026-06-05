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
    segmentSemanticLayers, compositeSmartLayers, regenerateLayer,
    addLayerByClick, addLayerByBox, addLayerByPoints,
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
    /** 上次退出時保留的狀態（重新開啟時恢復） */
    initialState?: {
        compositeBase64: string;
        layers: SmartLayer[];
        versions: EditorVersion[];
    };
}

export function useSemanticEditor({
    originalBase64,
    geminiApiKey,
    atlasApiKey,
    falApiKey,
    initialState,
}: SemanticEditorOptions) {

    const [state, setState] = useState<SemanticEditorState>(() => ({
        originalBase64,
        compositeBase64: initialState?.compositeBase64 ?? originalBase64,
        layers:          initialState?.layers          ?? [],
        selectedLayerId: null,
        status:          'idle',
        statusMessage:   '',
        versions:        initialState?.versions        ?? [],
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
        if (!falApiKey)    throw new Error('SAM2 分割需要 fal.ai API Key');

        analyzingRef.current = true;
        setStatus('analyzing', '🔍 Gemini 分析圖片中...');

        try {
            const layers = await segmentSemanticLayers({
                imageBase64: originalBase64,
                geminiApiKey,
                falApiKey,
                onProgress: msg => setStatus('segmenting', msg),
            });

            setStatus('compositing', '🖼 合成預覽...');
            const composite = await compositeSmartLayers(originalBase64, layers);

            setState(s => ({
                ...s,
                layers,
                compositeBase64: composite,
                selectedLayerId: null,
                status: 'idle',
                statusMessage: '',
            }));
        } catch (e) {
            analyzingRef.current = false;
            setStatus('idle', '');
            throw e;
        }
        analyzingRef.current = false;
    }, [originalBase64, geminiApiKey, falApiKey, setStatus]);

    // ── 選取圖層 ─────────────────────────────────────────────────────────────
    const selectLayer = useCallback((id: string | null) => {
        setState(s => ({ ...s, selectedLayerId: id }));
    }, []);

    // ── 更新 Prompt ──────────────────────────────────────────────────────────
    const updatePrompt = useCallback((layerId: string, prompt: string) => {
        setState(s => ({
            ...s,
            layers: s.layers.map(l => l.id === layerId ? { ...l, prompt } : l),
        }));
    }, []);

    // ── 單層 Apply（inpaint → 全部重新切割）────────────────────────────────
    const applyLayerRegen = useCallback(async (layer: SmartLayer) => {
        if (!atlasApiKey) throw new Error('Apply 需要 Atlas（GPT Image 2）API Key');

        cancelledRef.current = false;
        // 建立新的 AbortController，取消按鈕會呼叫 abort()
        const ctrl = new AbortController();
        abortCtrlRef.current = ctrl;
        setStatus('regenerating', `🎨 重新生成「${layer.name}」...`);

        // 5 分鐘超時保護
        const TIMEOUT_MS = 5 * 60 * 1000;
        const timeoutId = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

        try {
            const result = await regenerateLayer({
                layer,
                originalBase64: state.compositeBase64,
                newPrompt: layer.prompt,
                atlasApiKey,
                falApiKey: falApiKey || undefined,
                signal:    ctrl.signal,
                onProgress: msg => { if (!cancelledRef.current) setStatus('regenerating', msg); },
            });
            clearTimeout(timeoutId);

            // 使用者已按取消，忽略結果
            if (cancelledRef.current) return;

            // Step 2：全部重新切割（Gemini + SAM2 從新合成圖重新分層）
            let freshLayers: SmartLayer[] = [];
            if (geminiApiKey && falApiKey) {
                setStatus('segmenting', '✨ 重新分析新圖層...');
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
            const newVersion: EditorVersion = {
                id:               `ev_${Date.now()}`,
                timestamp:        Date.now(),
                changedLayerName: layer.name,
                prompt:           layer.prompt,
                compositeBase64:  result.newCompositeBase64,
                layers:           freshLayers,
            };

            setState(s => ({
                ...s,
                compositeBase64:    result.newCompositeBase64,
                layers:             freshLayers,
                versions:           [...s.versions, newVersion],
                activeVersionIndex: s.versions.length,
                status:             'idle',
                statusMessage:      '',
            }));

        } catch (e: any) {
            clearTimeout(timeoutId);
            abortCtrlRef.current = null;
            if (e?.name === 'AbortError' || e?.message === '使用者取消操作' || cancelledRef.current) {
                setStatus('idle', '');
                return;
            }
            setStatus('idle', '');
            throw e;
        }
    }, [state.compositeBase64, state.layers, state.versions.length, geminiApiKey, atlasApiKey, falApiKey, setStatus]);

    // ── 批次 Apply（所有 prompt 已修改但未套用的圖層）────────────────────────
    const applyAllDirtyLayers = useCallback(async () => {
        if (!atlasApiKey) throw new Error('Apply 需要 Atlas（GPT Image 2）API Key');

        // 找出所有「prompt 已改但未套用」的圖層
        const dirtyLayers = state.layers.filter(
            l => l.prompt.trim() !== l.appliedPrompt.trim() && !l.isLocked
        );
        if (dirtyLayers.length === 0) return;

        setStatus('regenerating', `🎨 批次重繪 ${dirtyLayers.length} 個圖層...`);

        // 依序處理，每次 inpaint 的結果作為下一次的 base（視覺一致）
        let currentComposite = state.compositeBase64;
        let currentLayers    = [...state.layers];

        try {
            for (let i = 0; i < dirtyLayers.length; i++) {
                const layer = dirtyLayers[i];
                // 從 currentLayers 取最新版（可能上一輪已更新）
                const latestLayer = currentLayers.find(l => l.id === layer.id) ?? layer;

                setStatus('regenerating',
                    `🎨 重繪 ${i + 1}/${dirtyLayers.length}：${latestLayer.name}...`
                );

                const result = await regenerateLayer({
                    layer:          latestLayer,
                    originalBase64: currentComposite,   // 疊加上一層結果
                    newPrompt:      latestLayer.prompt,
                    atlasApiKey,
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
                setStatus('segmenting', '✨ 重新分析新圖層...');
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
    }, [state.compositeBase64, state.layers, state.versions.length, atlasApiKey, falApiKey, setStatus]);

    // ── 切換版本 ─────────────────────────────────────────────────────────────
    const switchVersion = useCallback((index: number) => {
        setState(s => {
            if (index < 0 || index >= s.versions.length) return s;
            const ver = s.versions[index];
            return {
                ...s,
                compositeBase64:    ver.compositeBase64,
                layers:             ver.layers,
                selectedLayerId:    null,
                activeVersionIndex: index,
            };
        });
    }, []);

    // ── 切換回原始（v0）───────────────────────────────────────────────────────
    const switchToOriginal = useCallback(() => {
        setState(s => ({
            ...s,
            compositeBase64:    s.originalBase64,
            selectedLayerId:    null,
            activeVersionIndex: -1,
        }));
    }, []);

    // ── 手動點選新增圖層 ─────────────────────────────────────────────────────
    const addClickLayer = useCallback(async (clickPixel: { x: number; y: number }) => {
        if (!falApiKey) throw new Error('SAM2 需要 fal.ai API Key');

        setStatus('segmenting', '🎯 SAM2 分割點選物件...');
        try {
            const newLayer = await addLayerByClick({
                imageBase64: originalBase64,
                falApiKey,
                clickPixel,
                onProgress: msg => setStatus('segmenting', msg),
            });

            setState(s => {
                const updated = [...s.layers, newLayer];
                compositeSmartLayers(s.originalBase64, updated).then(composite => {
                    setState(ss => ({ ...ss, compositeBase64: composite }));
                });
                return {
                    ...s,
                    layers: updated,
                    selectedLayerId: newLayer.id,
                    status: 'idle',
                    statusMessage: '',
                };
            });
        } catch (e) {
            setStatus('idle', '');
            throw e;
        }
    }, [originalBase64, falApiKey, setStatus]);

    // ── A：矩形框選新增圖層 ──────────────────────────────────────────────────
    const addBoxLayer = useCallback(async (boxRatio: { x: number; y: number; w: number; h: number }) => {
        if (!falApiKey) throw new Error('SAM2 需要 fal.ai API Key');
        setStatus('segmenting', '🎯 SAM2 框選分割...');
        try {
            const newLayer = await addLayerByBox({
                imageBase64: originalBase64,
                falApiKey,
                boxRatio,
                onProgress: msg => setStatus('segmenting', msg),
            });
            setState(s => {
                const updated = [...s.layers, newLayer];
                compositeSmartLayers(s.originalBase64, updated).then(c =>
                    setState(ss => ({ ...ss, compositeBase64: c }))
                );
                return { ...s, layers: updated, selectedLayerId: newLayer.id, status: 'idle', statusMessage: '' };
            });
        } catch (e) { setStatus('idle', ''); throw e; }
    }, [originalBase64, falApiKey, setStatus]);

    // ── B：多點模式新增圖層 ──────────────────────────────────────────────────
    const addPointsLayer = useCallback(async (points: SAM2Point[]) => {
        if (!falApiKey) throw new Error('SAM2 需要 fal.ai API Key');
        setStatus('segmenting', '🎯 SAM2 多點分割...');
        try {
            const newLayer = await addLayerByPoints({
                imageBase64: originalBase64,
                falApiKey,
                points,
                onProgress: msg => setStatus('segmenting', msg),
            });
            setState(s => {
                const updated = [...s.layers, newLayer];
                compositeSmartLayers(s.originalBase64, updated).then(c =>
                    setState(ss => ({ ...ss, compositeBase64: c }))
                );
                return { ...s, layers: updated, selectedLayerId: newLayer.id, status: 'idle', statusMessage: '' };
            });
        } catch (e) { setStatus('idle', ''); throw e; }
    }, [originalBase64, falApiKey, setStatus]);

    // ── 切換可見性 ───────────────────────────────────────────────────────────
    const toggleVisibility = useCallback((layerId: string) => {
        setState(s => {
            const updated = s.layers.map(l =>
                l.id === layerId ? { ...l, isVisible: !l.isVisible } : l
            );
            compositeSmartLayers(s.originalBase64, updated).then(composite => {
                setState(ss => ({ ...ss, compositeBase64: composite }));
            });
            return { ...s, layers: updated };
        });
    }, []);

    // ── 切換鎖定 ─────────────────────────────────────────────────────────────
    const toggleLock = useCallback((layerId: string) => {
        setState(s => ({
            ...s,
            layers: s.layers.map(l =>
                l.id === layerId ? { ...l, isLocked: !l.isLocked } : l
            ),
        }));
    }, []);

    // ── 刪除圖層 ─────────────────────────────────────────────────────────────
    const deleteLayer = useCallback((layerId: string) => {
        setState(s => {
            const updated = s.layers.filter(l => l.id !== layerId);
            compositeSmartLayers(s.originalBase64, updated).then(composite => {
                setState(ss => ({ ...ss, compositeBase64: composite }));
            });
            return {
                ...s,
                layers: updated,
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
            compositeSmartLayers(s.originalBase64, updated).then(composite => {
                setState(ss => ({ ...ss, compositeBase64: composite }));
            });
            return { ...s, layers: updated };
        });
    }, []);

    const selectedLayer = state.layers.find(l => l.id === state.selectedLayerId) ?? null;
    const isLoading     = state.status !== 'idle';

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
        applyLayerRegen,
        applyAllDirtyLayers,
        switchVersion,
        switchToOriginal,
        cancelOperation,
        addClickLayer,
        addBoxLayer,
        addPointsLayer,
        toggleVisibility,
        toggleLock,
        deleteLayer,
        resetLayer,
        setStatus,
    };
}
