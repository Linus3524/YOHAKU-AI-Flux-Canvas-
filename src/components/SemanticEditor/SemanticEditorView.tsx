/**
 * SemanticEditorView
 * UI 參考：yohaku_semantic_editor.html
 * 全螢幕語意分層編輯器：左/中畫布 + 右側 Reve 式圖層面板
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSemanticEditor, CATEGORY_META } from './useSemanticEditor';
import type { SmartLayer, SmartLayerCategory } from '../../types';
import { getModelStatus } from '../../utils/onnxModelCache';
import { sam2EncodeInWorker, sam2DecodeInWorker } from '../../utils/sam2WorkerClient';
import { buildSmartLayerFromMask, describeLayerWithGemini } from './semanticLayerUtils';
import { Icon } from '../Icon';
import { LayerThumb, LayerRow, RightPanel, VersionThumb, NavBtn, HoverHitArea } from './LayerListPanel';
import { BBoxOverlay } from './BBoxOverlay';
import { Ic } from './icons';
import { PillToolbar } from './PillToolbar';
import { FloatingPromptBox } from './FloatingPromptBox';

// ─── LayerThumb / RightPanel / LayerRow → 已搬至 LayerListPanel.tsx ─────────

// ─── 右側圖層面板 ──────────────────────────────────────────────────────────────




// ─── 主元件 ────────────────────────────────────────────────────────────────────
interface SemanticEditorViewProps {
    originalBase64: string;
    imageName?: string;
    /**
     * save=true  → 保留編輯紀錄（返回畫布）
     * save=false → 清除紀錄（垃圾桶）
     */
    onClose: (save: boolean, state?: { compositeBase64: string; backgroundBase64?: string; layers: import('../../types').SmartLayer[]; originalLayers?: import('../../types').SmartLayer[]; versions: import('../../types').EditorVersion[] }) => void;
    /** 上次保留的狀態（重新開啟時恢復） */
    initialState?: {
        compositeBase64: string;
        layers: import('../../types').SmartLayer[];
        versions: import('../../types').EditorVersion[];
    };
    /** 匯入合成結果到畫布（同時傳當前 state 供外部儲存） */
    onImportToCanvas?: (compositeBase64: string, currentState: { compositeBase64: string; layers: import('../../types').SmartLayer[]; versions: import('../../types').EditorVersion[] }) => void;
    /** 匯入選取的個別圖層到畫布（原位放置） */
    onImportLayersToCanvas?: (layers: import('../../types').SmartLayer[]) => void;
    geminiApiKey?: string;
    atlasApiKey?: string;
    falApiKey?: string;
    imageModel?: string;
}

export function SemanticEditorView({
    originalBase64,
    imageName = '未命名圖片',
    onClose,
    initialState,
    onImportToCanvas,
    onImportLayersToCanvas,
    geminiApiKey,
    atlasApiKey,
    falApiKey,
    imageModel,
}: SemanticEditorViewProps) {
    // 工具模式：'select' | 'sam2' | 'rect' | 'points'
    const [activeTool, setActiveTool] = useState('select');
    const [sam2Mode, setSam2Mode] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    // ── ONNX SAM2 ────────────────────────────────────────────────────────────────
    const [useOnnxSAM2, setUseOnnxSAM2] = useState(false);

    const {
        state,
        selectedLayer,
        isLoading,
        analyzeImage,
        analyzeTextRegions,
        selectLayer,
        updatePrompt,
        updateReferenceImage,
        applyLayerRegen,
        applyTextLayerEdit,
        cancelOperation,
        switchVersion,
        switchToOriginal,
        deleteVersion,
        addClickLayer,
        addBoxLayer,
        addPointsLayer,
        addLayerFromMaskBase64,
        setStatus,
        toggleVisibility,
        toggleLock,
        deleteLayer,
        resetLayer,
        renameLayer,
        renameVersion,
        generateLamaBackground,
        dirtyCount,
        applyAllDirtyLayers,
    } = useSemanticEditor({
        originalBase64, geminiApiKey, atlasApiKey, falApiKey, imageModel, initialState,
        useLocalSAM2: useOnnxSAM2,
    });

    // 重繪引擎
    const canUseGpt    = !!atlasApiKey;
    const canUseGemini = !!geminiApiKey;
    const [inpaintEngine, setInpaintEngine] = useState<'gpt' | 'seedream-v5-pro' | 'gemini'>(canUseGpt ? 'gpt' : 'gemini');
    const [onnxSAM2Ready, setOnnxSAM2Ready] = useState(false);
    const [onnxEmbeddingLoading, setOnnxEmbeddingLoading] = useState(false);
    const [onnxEmbeddingReady, setOnnxEmbeddingReady] = useState(false);
    const isComputingEmbeddingRef = useRef(false);

    // 開啟時檢查 ONNX 模型是否已下載
    const [lamaReady, setLamaReady] = useState(false);
    // 文字辨識引擎：預設 Gemini（設計字較準）；裝了本機 OCR 才能切到 'local'
    const [ocrReady, setOcrReady] = useState(false);
    const [ocrEngine, setOcrEngine] = useState<'gemini' | 'local'>('gemini');
    useEffect(() => {
        Promise.all([
            getModelStatus('sam2_encoder'),
            getModelStatus('sam2_decoder'),
            getModelStatus('lama'),
            getModelStatus('ocr_det'),
            getModelStatus('ocr_rec'),
            getModelStatus('ocr_dict'),
        ]).then(([enc, dec, lama, det, rec, dict]) => {
            setOnnxSAM2Ready(enc === 'ready' && dec === 'ready');
            setLamaReady(lama === 'ready');
            const localOcrReady = det === 'ready' && rec === 'ready' && dict === 'ready';
            setOcrReady(localOcrReady);
            // 本機 OCR 已安裝 → 預設就用本機偵測（框緊、免費離線），第一次分析不再走 Gemini。
            // 沒裝本機模型才留在 Gemini 當後備；使用者仍可用切換鈕改回 Gemini。
            if (localOcrReady) setOcrEngine('local');
        });
    }, []);

    // 圖片載入後計算 embedding（Worker 模式，不凍結 UI）
    const computeOnnxEmbedding = useCallback(async () => {
        if (!useOnnxSAM2 || !state.compositeBase64) return;
        if (isComputingEmbeddingRef.current) return;
        isComputingEmbeddingRef.current = true;
        setOnnxEmbeddingReady(false);
        setOnnxEmbeddingLoading(true);
        try {
            await sam2EncodeInWorker(state.compositeBase64);
            setOnnxEmbeddingReady(true);
        } catch (e) {
            console.error('[SAM2 Worker] Embedding 計算失敗', e);
            showToast(`❌ SAM2 Embedding 失敗：${(e as Error).message?.slice(0, 60)}`);
        } finally {
            setOnnxEmbeddingLoading(false);
            isComputingEmbeddingRef.current = false;
        }
    }, [useOnnxSAM2, state.compositeBase64]);

    // 切換到 ONNX 模式時：計算 embedding
    useEffect(() => {
        if (useOnnxSAM2) {
            showToast('SAM2 本機 Worker 已就緒，計算 Embedding 中...');
            computeOnnxEmbedding();
        }
    }, [useOnnxSAM2]);

    // compositeBase64 改變時重新計算 embedding
    useEffect(() => {
        if (useOnnxSAM2) {
            setOnnxEmbeddingReady(false);
            computeOnnxEmbedding();
        }
    }, [state.compositeBase64, useOnnxSAM2]);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    // 圖層多選
    const [checkedLayerIds, setCheckedLayerIds] = useState<string[]>([]);
    const toggleCheck = useCallback((id: string) => {
        setCheckedLayerIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    }, []);
    const checkedLayers = state.layers.filter(l => checkedLayerIds.includes(l.id));

    // 下載單一圖層（透明 PNG）
    const downloadLayer = useCallback((layer: import('../../types').SmartLayer) => {
        const a = document.createElement('a');
        a.href = layer.base64;
        a.download = `${layer.name}.png`;
        a.click();
    }, []);

    // 下載多層（zip 太複雜，改成依序下載）
    const downloadCheckedLayers = useCallback(() => {
        checkedLayers.forEach((l, i) => {
            setTimeout(() => downloadLayer(l), i * 300);
        });
    }, [checkedLayers, downloadLayer]);

    // A：矩形框選狀態
    const [rectDrag, setRectDrag] = useState<{
        startX: number; startY: number;    // 相對圖片左上角（0–1）
        curX: number; curY: number;
        active: boolean;
    } | null>(null);
    // 框選完成但尚未送出分析（等待使用者確認）
    const [pendingRect, setPendingRect] = useState<{
        x: number; y: number; w: number; h: number;
    } | null>(null);

    // B：多點模式狀態
    const [multiPoints, setMultiPoints] = useState<
        { x: number; y: number; label: 1 | 0; dispX: number; dispY: number }[]
    >([]);

    // C：筆塗模式狀態（ImageEditModal 同款邏輯）
    const brushCanvasRef    = useRef<HTMLCanvasElement>(null);
    const brushPainting     = useRef(false);
    const brushHasStrokeRef = useRef(false);
    const brushSnapshot     = useRef<ImageData | null>(null);  // 每筆起始的 canvas 快照
    const brushStrokePoints = useRef<{ x: number; y: number }[]>([]);
    const [brushSize, setBrushSize] = useState(24);
    const [brushEraser, setBrushEraser] = useState(false);
    const [brushHasStroke, setBrushHasStroke] = useState(false);

    // stable ref callback — 只在 mount 時設尺寸，不因 re-render 重複執行清 canvas
    /** objectFit:contain 下，計算圖片實際渲染區域（相對容器的偏移 + 尺寸） */
    const getRenderedImageRect = useCallback(() => {
        const img = imgRef.current;
        if (!img) return null;
        const cW = img.offsetWidth;
        const cH = img.offsetHeight;
        const nW = img.naturalWidth;
        const nH = img.naturalHeight;
        if (!nW || !nH) return null;
        const naturalAspect    = nW / nH;
        const containerAspect = cW / cH;
        let imgW: number, imgH: number, imgX: number, imgY: number;
        if (naturalAspect > containerAspect) {
            // 橫向填滿，上下 letterbox
            imgW = cW;
            imgH = cW / naturalAspect;
            imgX = 0;
            imgY = (cH - imgH) / 2;
        } else {
            // 縱向填滿，左右 pillarbox
            imgH = cH;
            imgW = cH * naturalAspect;
            imgX = (cW - imgW) / 2;
            imgY = 0;
        }
        return { imgX, imgY, imgW, imgH };
    }, []);

    const brushCanvasRefCb = useCallback((el: HTMLCanvasElement | null) => {
        brushCanvasRef.current = el;
        if (el && imgRef.current) {
            const r = getRenderedImageRect();
            // 用實際圖片渲染尺寸作為 canvas 像素大小，排除 letterbox 空白
            el.width  = r ? Math.round(r.imgW) : imgRef.current.offsetWidth;
            el.height = r ? Math.round(r.imgH) : imgRef.current.offsetHeight;
            // 定位 canvas 剛好覆蓋圖片（非整個容器）
            el.style.left   = r ? `${r.imgX}px` : '0';
            el.style.top    = r ? `${r.imgY}px` : '0';
            el.style.width  = r ? `${r.imgW}px` : '100%';
            el.style.height = r ? `${r.imgH}px` : '100%';
        }
    }, [getRenderedImageRect]);

    // HUD 拖曳狀態
    const [hudPos, setHudPos] = useState<{ x: number; y: number } | null>(null);
    const [brushHudPos, setBrushHudPos] = useState<{ x: number; y: number } | null>(null);
    const brushHudRef = useRef<HTMLDivElement>(null);
    const brushHudDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
    const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
    const toolbarDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);

    const handleToolbarMouseDown = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).tagName === 'BUTTON') return;
        e.preventDefault();
        const rect = toolbarRef.current?.getBoundingClientRect();
        toolbarDragRef.current = {
            startX: e.clientX, startY: e.clientY,
            origX: toolbarPos?.x ?? (rect ? rect.left + rect.width / 2 : window.innerWidth / 2),
            origY: toolbarPos?.y ?? (rect ? rect.top + rect.height / 2 : window.innerHeight - 60),
        };
        const onMove = (ev: MouseEvent) => {
            if (!toolbarDragRef.current) return;
            setToolbarPos({
                x: toolbarDragRef.current.origX + (ev.clientX - toolbarDragRef.current.startX),
                y: toolbarDragRef.current.origY + (ev.clientY - toolbarDragRef.current.startY),
            });
        };
        const onUp = () => {
            toolbarDragRef.current = null;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [toolbarPos]);
    const hudDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
    const hudRef = useRef<HTMLDivElement>(null);

    const handleHudMouseDown = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).tagName === 'BUTTON') return;
        e.preventDefault();
        const rect       = hudRef.current?.getBoundingClientRect();
        const parentRect = hudRef.current?.parentElement?.getBoundingClientRect();
        hudDragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            // 減去 parent offset，轉成容器相對座標
            origX: hudPos?.x ?? (rect && parentRect
                ? rect.left - parentRect.left + rect.width / 2
                : window.innerWidth / 2),
            origY: hudPos?.y ?? (rect && parentRect
                ? rect.top - parentRect.top
                : 60),
        };
        const onMove = (ev: MouseEvent) => {
            if (!hudDragRef.current) return;
            setHudPos({
                x: hudDragRef.current.origX + (ev.clientX - hudDragRef.current.startX),
                y: hudDragRef.current.origY + (ev.clientY - hudDragRef.current.startY),
            });
        };
        const onUp = () => {
            hudDragRef.current = null;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [hudPos]);

    const handleBrushHudMouseDown = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button, input')) return;
        e.preventDefault();
        const rect       = brushHudRef.current?.getBoundingClientRect();
        const parentRect = brushHudRef.current?.parentElement?.getBoundingClientRect();
        brushHudDragRef.current = {
            startX: e.clientX, startY: e.clientY,
            origX: brushHudPos?.x ?? (rect && parentRect
                ? rect.left - parentRect.left + rect.width / 2
                : window.innerWidth / 2),
            origY: brushHudPos?.y ?? (rect && parentRect
                ? rect.top - parentRect.top
                : 12),
        };
        const onMove = (ev: MouseEvent) => {
            if (!brushHudDragRef.current) return;
            setBrushHudPos({
                x: brushHudDragRef.current.origX + (ev.clientX - brushHudDragRef.current.startX),
                y: brushHudDragRef.current.origY + (ev.clientY - brushHudDragRef.current.startY),
            });
        };
        const onUp = () => {
            brushHudDragRef.current = null;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [brushHudPos]);

    const showToast = useCallback((msg: string, duration = 3500) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), duration);
    }, []);

    // 開啟時：有紀錄就恢復提示，沒有就靜默等待使用者操作
    useEffect(() => {
        if (initialState) {
            showToast('✅ 已恢復上次編輯紀錄');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isRegenerating = state.status === 'regenerating';

    // Apply：單層重繪
    const handleApply = useCallback(async (layer: SmartLayer) => {
        if ((inpaintEngine === 'gpt' || inpaintEngine === 'seedream-v5-pro') && !atlasApiKey)  { showToast('⚠️ Atlas 重繪需要 Atlas API Key'); return; }
        if (inpaintEngine === 'gemini' && !geminiApiKey) { showToast('⚠️ Gemini 重繪需要 Gemini API Key'); return; }
        if (!falApiKey) { showToast('⚠️ 需要 fal.ai Key（SAM2 分割用）'); return; }
        applyLayerRegen(layer, inpaintEngine).catch(e => {
            showToast(`❌ 重繪失敗：${e?.message?.slice(0, 60) || '未知錯誤'}`);
        });
    }, [inpaintEngine, atlasApiKey, geminiApiKey, falApiKey, applyLayerRegen, showToast]);

    // 文字編輯 Apply（文字模式專用：只換框內文字）
    // 與物件重繪一致，跟隨使用者的引擎切換鈕（inpaintEngine）：選 GPT 用 GPT、選 Gemini 用 Gemini。
    const handleApplyText = useCallback((layer: SmartLayer, newText: string) => {
        if (!newText.trim()) { showToast('⚠️ 請輸入文字內容'); return; }
        if ((inpaintEngine === 'gpt' || inpaintEngine === 'seedream-v5-pro') && !atlasApiKey)  { showToast('⚠️ Atlas 重繪需要 Atlas API Key'); return; }
        if (inpaintEngine === 'gemini' && !geminiApiKey) { showToast('⚠️ Gemini 重繪需要 Gemini API Key'); return; }
        applyTextLayerEdit(layer, newText, inpaintEngine).catch(e => {
            showToast(`❌ 文字重繪失敗：${e?.message?.slice(0, 60) || '未知錯誤'}`);
        });
    }, [inpaintEngine, atlasApiKey, geminiApiKey, applyTextLayerEdit, showToast]);

    // Apply All（批次）
    const handleApplyAll = useCallback(() => {
        if ((inpaintEngine === 'gpt' || inpaintEngine === 'seedream-v5-pro') && !atlasApiKey)  { showToast('⚠️ Atlas 重繪需要 Atlas API Key'); return; }
        if (inpaintEngine === 'gemini' && !geminiApiKey) { showToast('⚠️ Gemini 重繪需要 Gemini API Key'); return; }
        applyAllDirtyLayers(inpaintEngine).catch(e => {
            showToast(`❌ 批次重繪失敗：${e?.message?.slice(0, 60) || '未知錯誤'}`);
        });
    }, [inpaintEngine, atlasApiKey, geminiApiKey, applyAllDirtyLayers, showToast]);

    // 重新分析
    const handleReanalyze = useCallback(() => {
        if (!geminiApiKey) { showToast('⚠️ 請先設定 Gemini API Key'); return; }

        // ONNX 模式：本機 SAM2 Worker 做全圖分析
        if (useOnnxSAM2) {
            showToast('本機 SAM2 全圖分析中...');
            analyzeImage().catch(e => {
                showToast(`❌ 分析失敗：${e?.message?.slice(0, 60) || '未知錯誤'}`);
            });
            return;
        }

        // fal.ai 模式
        if (!falApiKey) {
            showToast('⚠️ 需要 fal.ai API Key 或先載入本機 SAM2 模型');
            return;
        }
        analyzeImage().catch(e => {
            showToast(`❌ 分析失敗：${e?.message?.slice(0, 60) || '未知錯誤'}`);
        });
    }, [geminiApiKey, falApiKey, analyzeImage, showToast, useOnnxSAM2]);

    // LaMa 生成純背景
    const handleGenerateLama = useCallback(() => {
        generateLamaBackground().catch(e => {
            showToast(`❌ LaMa 背景生成失敗：${e?.message?.slice(0, 60) || '未知錯誤'}`);
        });
    }, [generateLamaBackground, showToast]);

    // 匯出
    const handleExport = useCallback(() => {
        const a = document.createElement('a');
        a.href = state.compositeBase64;
        a.download = `${imageName.replace(/\.[^.]+$/, '')}_edited.png`;
        a.click();
    }, [state.compositeBase64, imageName]);

    // 點選模式：點圖片 → SAM2 選取物件
    // 共用：把 event 座標轉成相對圖片的 {relX, relY}（0–1）和原圖像素座標
    const getImgCoords = useCallback((e: React.MouseEvent) => {
        if (!imgRef.current) return null;
        const rect = imgRef.current.getBoundingClientRect();
        const relX = (e.clientX - rect.left) / rect.width;
        const relY = (e.clientY - rect.top)  / rect.height;
        const pixX = Math.round(relX * imgRef.current.naturalWidth);
        const pixY = Math.round(relY * imgRef.current.naturalHeight);
        return { relX, relY, pixX, pixY };
    }, []);

    // 選取模式：點擊畫布選中最上層的圖層
    const handleSelectClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        const c = getImgCoords(e);
        if (!c) return;
        const { relX, relY } = c;
        // 找所有可見圖層中包含該點的，取 zIndex 最高的
        const hit = [...state.layers]
            .filter(l => l.isVisible && !l.isLocked)
            .filter(l => relX >= l.cropRatio.x && relX <= l.cropRatio.x + l.cropRatio.w
                      && relY >= l.cropRatio.y && relY <= l.cropRatio.y + l.cropRatio.h)
            .sort((a, b) => b.zIndex - a.zIndex)[0];
        selectLayer(hit?.id ?? null);
    }, [state.layers, getImgCoords, selectLayer]);

    // 文字模式：點擊畫布只選中 TEXT 類圖層（取 zIndex 最高的）
    const handleTextSelectClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        const c = getImgCoords(e);
        if (!c) return;
        const { relX, relY } = c;
        const hit = [...state.layers]
            .filter(l => l.category === 'TEXT' && l.isVisible && !l.isLocked)
            .filter(l => relX >= l.cropRatio.x && relX <= l.cropRatio.x + l.cropRatio.w
                      && relY >= l.cropRatio.y && relY <= l.cropRatio.y + l.cropRatio.h)
            .sort((a, b) => b.zIndex - a.zIndex)[0];
        selectLayer(hit?.id ?? null);
    }, [state.layers, getImgCoords, selectLayer]);

    // SAM2 單點模式：click
    const handleCanvasClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
        if (activeTool !== 'sam2' || isLoading) return;
        const c = getImgCoords(e);
        if (!c) return;

        if (useOnnxSAM2) {
            // ── 本機 SAM2 Worker 路徑 ─────────────────────────────────────
            if (onnxEmbeddingLoading) {
                showToast('SAM2 計算 Embedding 中，請稍候...');
                return;
            }
            if (!onnxEmbeddingReady) {
                showToast('SAM2 Embedding 尚未就緒，請稍候...');
                return;
            }
            try {
                setStatus('segmenting', 'SAM2 本機推論中...');
                const maskBase64 = await sam2DecodeInWorker(
                    { clickPoint: { x: c.pixX, y: c.pixY } },
                    state.compositeBase64,
                );
                const newLayer = await buildSmartLayerFromMask(maskBase64);
                await addLayerFromMaskBase64(newLayer);
            } catch (err: any) {
                console.error('[SAM2 Worker] 失敗', err);
                setStatus('idle', '');
                showToast(`❌ SAM2 失敗：${err?.message?.slice(0, 80) || '未知錯誤'}`);
            }
        } else {
            // ── fal.ai 路徑（原本） ────────────────────────────────────────
            addClickLayer({ x: c.pixX, y: c.pixY }).catch(err =>
                showToast(`❌ SAM2 點選失敗：${err?.message?.slice(0, 60) || ''}`)
            );
        }
    }, [activeTool, isLoading, useOnnxSAM2, addClickLayer, showToast, getImgCoords]);

    // A：矩形框選 — 全部用 window 層級監聽，游標離圖片也能更新，座標 clamp 到 [0,1]
    const getRectCoords = useCallback((clientX: number, clientY: number) => {
        if (!imgRef.current) return null;
        const rect = imgRef.current.getBoundingClientRect();
        return {
            relX: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
            relY: Math.max(0, Math.min(1, (clientY - rect.top)  / rect.height)),
        };
    }, []);

    const handleRectMouseDown = useCallback((e: React.MouseEvent) => {
        if (activeTool !== 'rect' || isLoading) return;
        // 避免點確認/取消按鈕時觸發新的框選
        if ((e.target as HTMLElement).closest('button')) return;
        e.stopPropagation();
        const c = getRectCoords(e.clientX, e.clientY);
        if (!c) return;
        setPendingRect(null);
        setRectDrag({ startX: c.relX, startY: c.relY, curX: c.relX, curY: c.relY, active: true });

        // Window 層級，游標移到圖片外也能持續追蹤
        const onMove = (ev: MouseEvent) => {
            const cc = getRectCoords(ev.clientX, ev.clientY);
            if (!cc) return;
            setRectDrag(d => d ? { ...d, curX: cc.relX, curY: cc.relY } : null);
        };
        const onUp = (ev: MouseEvent) => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            const cc = getRectCoords(ev.clientX, ev.clientY);
            setRectDrag(prev => {
                if (!prev) return null;
                const ex = cc?.relX ?? prev.curX;
                const ey = cc?.relY ?? prev.curY;
                const x = Math.max(0, Math.min(1, Math.min(prev.startX, ex)));
                const y = Math.max(0, Math.min(1, Math.min(prev.startY, ey)));
                const w = Math.max(0, Math.min(1 - x, Math.abs(ex - prev.startX)));
                const h = Math.max(0, Math.min(1 - y, Math.abs(ey - prev.startY)));
                if (w >= 0.02 && h >= 0.02) setPendingRect({ x, y, w, h });
                return null;
            });
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [activeTool, isLoading, getRectCoords]);

    // Move/Up 保留空 handler 避免 JSX 報錯，實際已由 window 接管
    const handleRectMouseMove = useCallback((_e: React.MouseEvent) => {}, []);
    const handleRectMouseUp   = useCallback((_e: React.MouseEvent) => {}, []);

    // B：多點模式
    const handlePointsClick = useCallback((e: React.MouseEvent) => {
        if (activeTool !== 'points' || isLoading) return;
        e.stopPropagation();
        const c = getImgCoords(e);
        if (!c) return;
        const label: 1 | 0 = e.button === 2 ? 0 : 1;  // 左鍵=前景, 右鍵=背景
        setMultiPoints(pts => [...pts, {
            x: c.pixX, y: c.pixY, label,
            dispX: c.relX * 100, dispY: c.relY * 100,
        }]);
    }, [activeTool, isLoading, getImgCoords]);

    // 共用：SAM2 Worker 推論 → addLayerFromMaskBase64
    const runOnnxAndAddLayer = useCallback(async (
        options: {
            clickPoint?: { x: number; y: number };
            points?:     { x: number; y: number; label: 0 | 1 }[];
            bbox?:       { x: number; y: number; w: number; h: number };
            roughMask?:  string;
        }
    ) => {
        if (!onnxEmbeddingReady) {
            showToast('SAM2 Embedding 尚未就緒，請稍候...');
            return false;
        }
        try {
            setStatus('segmenting', 'SAM2 本機推論中...');
            const maskBase64 = await sam2DecodeInWorker(options, state.compositeBase64);
            const newLayer = await buildSmartLayerFromMask(maskBase64);
            if (geminiApiKey) {
                describeLayerWithGemini(newLayer.base64, geminiApiKey).then(({ name, prompt }) => {
                    if (prompt) updatePrompt(newLayer.id, prompt);
                    if (name) renameLayer(newLayer.id, name);
                });
            }
            await addLayerFromMaskBase64(newLayer);
            return true;
        } catch (err: any) {
            console.error('[SAM2 Worker] 推論失敗', err);
            setStatus('idle', '');
            showToast(`❌ SAM2 失敗：${err?.message?.slice(0, 60) || ''}`);
            return false;
        }
    }, [onnxEmbeddingReady, state.compositeBase64, geminiApiKey, updatePrompt, addLayerFromMaskBase64, setStatus, showToast]);

    const handlePointsConfirm = useCallback(async () => {
        if (multiPoints.length === 0) return;
        const pts = multiPoints.map(p => ({ x: p.x, y: p.y, label: p.label as 0 | 1 }));
        setMultiPoints([]);
        if (useOnnxSAM2 && onnxEmbeddingReady) {
            await runOnnxAndAddLayer({ points: pts });
        } else {
            addPointsLayer(pts).catch(err =>
                showToast(`❌ 多點分割失敗：${err?.message?.slice(0, 60) || ''}`)
            );
        }
    }, [multiPoints, useOnnxSAM2, addPointsLayer, runOnnxAndAddLayer, showToast]);

    // 工具切換
    // 文字掃描（進入文字模式時自動觸發；只需 Gemini，跳過 SAM2）
    const handleScanText = useCallback(() => {
        // 本機 OCR 不需 Gemini key；只有用 Gemini 引擎才需要
        if (ocrEngine === 'gemini' && !geminiApiKey) { showToast('⚠️ 文字掃描需要 Gemini API Key'); return; }
        analyzeTextRegions(ocrEngine).catch(e => {
            showToast(`❌ 文字掃描失敗：${e?.message?.slice(0, 60) || '未知錯誤'}`);
        });
    }, [geminiApiKey, ocrEngine, analyzeTextRegions, showToast]);

    const handleToolChange = useCallback((tool: string) => {
        setActiveTool(tool);
        setSam2Mode(tool === 'sam2');
        setRectDrag(null);
        setMultiPoints([]);
        setBrushEraser(false);
        setBrushHasStroke(false);
        setBrushHudPos(null);
        brushHasStrokeRef.current = false;
        brushSnapshot.current = null;
        brushStrokePoints.current = [];
        // 切換工具時清空筆塗 canvas
        if (brushCanvasRef.current) {
            const ctx = brushCanvasRef.current.getContext('2d');
            ctx?.clearRect(0, 0, brushCanvasRef.current.width, brushCanvasRef.current.height);
        }
        if (!['sam2', 'rect', 'points', 'brush'].includes(tool)) selectLayer(null);
        // 進入文字模式且尚未做過逐塊文字掃描，或已在文字模式再次點擊 → 自動/重新掃描全圖文字
        if (tool === 'text' && !isLoading) {
            const hasTextScan = state.layers.some(l => l.fromTextScan);
            if (activeTool === 'text' || !hasTextScan) {
                handleScanText();
            }
        }
    }, [selectLayer, isLoading, state.layers, handleScanText, activeTool]);

    // C：筆塗 handlers
    const getBrushPos = useCallback((e: React.MouseEvent | MouseEvent) => {
        if (!imgRef.current || !brushCanvasRef.current) return null;
        const containerRect = imgRef.current.getBoundingClientRect();
        const r = getRenderedImageRect();
        if (!r) return null;
        const canvas = brushCanvasRef.current;
        // 滑鼠相對容器的位置，減去 letterbox 偏移，得到相對圖片的座標
        const xInImg = e.clientX - containerRect.left - r.imgX;
        const yInImg = e.clientY - containerRect.top  - r.imgY;
        // 再從 CSS 顯示尺寸換算到 canvas 像素座標
        const scaleX = canvas.width  / r.imgW;
        const scaleY = canvas.height / r.imgH;
        return {
            x: Math.max(0, Math.min(canvas.width,  xInImg * scaleX)),
            y: Math.max(0, Math.min(canvas.height, yInImg * scaleY)),
        };
    }, [getRenderedImageRect]);

    // 每次 mousemove 清掉「本筆畫的起始快照」再重繪整條路徑
    // 同 ImageEditModal 做法：整筆一次 stroke，不會有半透明重疊接頭
    const redrawCurrentStroke = useCallback(() => {
        const canvas = brushCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        const pts = brushStrokePoints.current;
        if (pts.length === 0) return;

        // 還原到本筆畫開始前的狀態
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (brushSnapshot.current) ctx.putImageData(brushSnapshot.current, 0, 0);

        ctx.lineCap  = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = brushSize;

        if (brushEraser) {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = 'rgba(249,115,22,0.55)';  // 橘色
        }

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
    }, [brushSize, brushEraser]);

    const handleBrushMouseDown = useCallback((e: React.MouseEvent) => {
        if (activeTool !== 'brush' || isLoading) return;
        if ((e.target as HTMLElement).closest('button')) return;
        e.stopPropagation();

        // 快照目前 canvas 狀態（之前的筆畫已烙進去）
        const canvas = brushCanvasRef.current;
        if (canvas) {
            brushSnapshot.current = canvas.getContext('2d')!
                .getImageData(0, 0, canvas.width, canvas.height);
        }
        brushStrokePoints.current = [];
        brushPainting.current = true;

        const addPoint = (ev: MouseEvent | React.MouseEvent) => {
            const p = getBrushPos(ev as MouseEvent);
            if (!p) return;
            brushStrokePoints.current.push(p);
            redrawCurrentStroke();
        };

        addPoint(e as unknown as MouseEvent);

        const onMove = (ev: MouseEvent) => { if (brushPainting.current) addPoint(ev); };
        const onUp   = () => {
            brushPainting.current = false;
            if (!brushEraser && brushStrokePoints.current.length > 0) {
                brushHasStrokeRef.current = true;
                setBrushHasStroke(true);
            }
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [activeTool, isLoading, getBrushPos, redrawCurrentStroke, brushEraser]);

    // 筆塗確認：canvas → B&W mask → SAM2（含 roughMask）
    const handleBrushConfirm = useCallback(async () => {
        const canvas = brushCanvasRef.current;
        if (!canvas || !brushHasStroke) return;

        // 讀取筆塗像素，轉成 B&W mask（有筆跡=白，空白=黑）
        const ctx = canvas.getContext('2d')!;
        const { width: W, height: H } = canvas;
        const px = ctx.getImageData(0, 0, W, H).data;
        const bwC = document.createElement('canvas');
        bwC.width = W; bwC.height = H;
        const bwCtx = bwC.getContext('2d')!;
        bwCtx.fillStyle = '#000';
        bwCtx.fillRect(0, 0, W, H);
        const bwData = bwCtx.createImageData(W, H);
        for (let i = 0; i < W * H; i++) {
            const v = px[i * 4 + 3] > 30 ? 255 : 0;
            bwData.data[i * 4] = bwData.data[i * 4 + 1] = bwData.data[i * 4 + 2] = v;
            bwData.data[i * 4 + 3] = 255;
        }
        bwCtx.putImageData(bwData, 0, 0);
        const roughMask = bwC.toDataURL('image/png');

        // 清空筆塗
        ctx.clearRect(0, 0, W, H);
        brushHasStrokeRef.current = false;
        setBrushHasStroke(false);

        if (useOnnxSAM2 && onnxEmbeddingReady) {
            await runOnnxAndAddLayer({ roughMask });
        } else if (falApiKey) {
            // fal.ai：網格均勻取樣 + 四角負點
            // 1. 收集筆塗像素，算出 bbox
            let minX = W, minY = H, maxX = 0, maxY = 0;
            const painted: [number, number][] = [];
            for (let i = 0; i < W * H; i++) {
                if (bwData.data[i * 4] > 127) {
                    const x = i % W, y = Math.floor(i / W);
                    painted.push([x, y]);
                    if (x < minX) minX = x; if (x > maxX) maxX = x;
                    if (y < minY) minY = y; if (y > maxY) maxY = y;
                }
            }
            if (painted.length === 0) return;

            // 2. 3×3 網格均勻取樣（每格取最靠近中心的筆塗點）
            const GRID = 3;
            const cellW = (maxX - minX + 1) / GRID;
            const cellH = (maxY - minY + 1) / GRID;
            const posPoints: [number, number][] = [];
            for (let row = 0; row < GRID; row++) {
                for (let col = 0; col < GRID; col++) {
                    const cx = minX + cellW * (col + 0.5);
                    const cy = minY + cellH * (row + 0.5);
                    // 找此格內最靠近中心的筆塗點
                    let best: [number, number] | null = null;
                    let bestDist = Infinity;
                    for (const [px, py] of painted) {
                        if (px >= minX + cellW * col && px < minX + cellW * (col + 1) &&
                            py >= minY + cellH * row && py < minY + cellH * (row + 1)) {
                            const d = (px - cx) ** 2 + (py - cy) ** 2;
                            if (d < bestDist) { bestDist = d; best = [px, py]; }
                        }
                    }
                    if (best) posPoints.push(best);
                }
            }
            if (posPoints.length === 0) posPoints.push(painted[Math.floor(painted.length / 2)]);

            // 3. 四角加負點（bbox 角落若未塗到，則排除）
            const corners: [number, number][] = [[minX, minY], [maxX, minY], [minX, maxY], [maxX, maxY]];
            const negPoints = corners.filter(([cx, cy]) => {
                const i = cy * W + cx;
                return bwData.data[i * 4] <= 127;
            });

            // 4. 換算到原圖像素座標
            const img = imgRef.current;
            const dispW = img ? img.offsetWidth  : W;
            const dispH = img ? img.offsetHeight : H;
            const { getImageDims } = await import('./semanticLayerUtils');
            const origDims = await getImageDims(state.compositeBase64);
            const sx = origDims.w / dispW;
            const sy = origDims.h / dispH;
            const points = [
                ...posPoints.map(([x, y]) => ({ x: Math.round(x * sx), y: Math.round(y * sy), label: 1 as 0 | 1 })),
                ...negPoints.map(([x, y]) => ({ x: Math.round(x * sx), y: Math.round(y * sy), label: 0 as 0 | 1 })),
            ];
            addPointsLayer(points, 'SAM2 筆塗選區分割中...', '筆塗物件').catch(err =>
                showToast(`❌ 分割失敗：${err?.message?.slice(0, 60) || ''}`)
            );
        } else {
            showToast('⚠️ 筆塗模式需要本機 SAM2 ONNX 或 fal.ai API Key');
        }
    }, [brushHasStroke, useOnnxSAM2, falApiKey, runOnnxAndAddLayer, addClickLayer, addPointsLayer, showToast]);

    // 返回畫布（保留狀態）
    const handleBack = useCallback(() => {
        onClose(true, {
            compositeBase64:  state.compositeBase64,
            backgroundBase64: state.backgroundBase64,
            layers:           state.layers,
            originalLayers:   state.originalLayers,
            versions:         state.versions,
        });
    }, [onClose, state.compositeBase64, state.backgroundBase64, state.layers, state.originalLayers, state.versions]);

    // 刪除並退出（清除紀錄）
    const handleDelete = useCallback(() => {
        if (window.confirm('確定要清除這張圖的所有編輯紀錄嗎？')) {
            onClose(false);
        }
    }, [onClose]);

    // Esc：先清除選取操作，再返回畫布
    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (activeTool !== 'select') {
                    handleToolChange('select');
                } else {
                    handleBack();
                }
            }
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [handleBack, activeTool, handleToolChange]);

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 50,
                display: 'flex',
                background: '#f7f7f8',
                fontFamily: "'Inter', 'Noto Sans TC', sans-serif",
                color: '#111827',
                overflow: 'hidden',
            }}
        >
            {/* ── 左/中：畫布工作區 ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

                {/* 頂部導覽 */}
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    height: 56,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 24px',
                    zIndex: 30,
                }}>
                    {/* ← 返回畫布（保留紀錄） */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: '#9ca3af' }}>
                        <button
                            onClick={handleBack}
                            title="返回畫布（保留編輯紀錄）"
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit',
                                padding: 0, transition: 'color 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#111827')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
                        >
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ display: 'block', flexShrink: 0 }}><polyline points="15 18 9 12 15 6"/></svg>
                            <Ic.Home />
                            <span>YOHAKU</span>
                        </button>
                        <span style={{ color: '#d1d5db', marginTop: '-2px' }}>|</span>
                        <span style={{ color: '#111827', fontWeight: 700, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {imageName}
                        </span>
                        {/* 有保留紀錄時顯示小標籤 */}
                        {state.versions.length > 0 && (
                            <span style={{ fontSize: 10, fontWeight: 600, color: '#7c3aed', background: '#f3e8ff', padding: '2px 7px', borderRadius: 9999 }}>
                                {state.versions.length} 個版本
                            </span>
                        )}
                    </div>

                    {/* 右側操作按鈕 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#9ca3af' }}>
                        {/* SAM2 模式切換（有 ONNX 模型才顯示） */}
                        {onnxSAM2Ready && (
                            <button
                                onClick={async () => {
                                    const next = !useOnnxSAM2;
                                    setUseOnnxSAM2(next);
                                    showToast(next ? '切換至本機 SAM2 (ONNX)' : '切換至 fal.ai SAM2');
                                }}
                                title={useOnnxSAM2 ? '目前：本機 ONNX（免費）— 點選切換至 fal.ai' : '目前：fal.ai SAM2（付費）— 點選切換至本機 ONNX'}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    padding: '4px 10px', borderRadius: 9999,
                                    border: `1px solid ${useOnnxSAM2 ? '#10b981' : '#d1d5db'}`,
                                    background: useOnnxSAM2 ? '#ecfdf5' : '#f9fafb',
                                    color: useOnnxSAM2 ? '#059669' : '#6b7280',
                                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <span style={{
                                    width: 6, height: 6, borderRadius: '50%',
                                    background: useOnnxSAM2 ? '#10b981' : '#9ca3af',
                                    flexShrink: 0,
                                }} />
                                {useOnnxSAM2 ? '本機 SAM2' : 'fal.ai SAM2'}
                                {onnxEmbeddingLoading && <span style={{ opacity: 0.6 }}>計算中...</span>}
                            </button>
                        )}
                        {/* 文字辨識引擎切換（在文字模式、且已安裝本機 OCR 才顯示） */}
                        {ocrReady && activeTool === 'text' && (
                            <button
                                onClick={() => {
                                    const next = ocrEngine === 'gemini' ? 'local' : 'gemini';
                                    setOcrEngine(next);
                                    showToast(next === 'local' ? '文字辨識：本機 OCR（免費離線）' : '文字辨識：Gemini（設計字較準）');
                                    // 立即用新引擎重掃，結果即時更新
                                    if (!isLoading) {
                                        analyzeTextRegions(next).catch(e =>
                                            showToast(`❌ 文字掃描失敗：${e?.message?.slice(0, 60) || '未知錯誤'}`)
                                        );
                                    }
                                }}
                                title={ocrEngine === 'local'
                                    ? '文字辨識：本機 OCR（免費離線）— 點選切換至 Gemini'
                                    : '文字辨識：Gemini（雲端，設計字較準）— 點選切換至本機 OCR'}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    padding: '4px 10px', borderRadius: 9999,
                                    border: `1px solid ${ocrEngine === 'local' ? '#10b981' : '#d1d5db'}`,
                                    background: ocrEngine === 'local' ? '#ecfdf5' : '#f9fafb',
                                    color: ocrEngine === 'local' ? '#059669' : '#6b7280',
                                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <span style={{
                                    width: 6, height: 6, borderRadius: '50%',
                                    background: ocrEngine === 'local' ? '#10b981' : '#9ca3af',
                                    flexShrink: 0,
                                }} />
                                {ocrEngine === 'local' ? '本機 OCR' : 'Gemini OCR'}
                            </button>
                        )}
                        {/* 重繪模型切換 */}
                        {(canUseGpt || canUseGemini) && (
                            <button
                                onClick={() => setInpaintEngine(inpaintEngine === 'gpt' ? (canUseGpt ? 'seedream-v5-pro' : 'gemini') : inpaintEngine === 'seedream-v5-pro' ? 'gemini' : 'gpt')}
                                title="重繪模型：點選切換"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    padding: '4px 10px', borderRadius: 9999,
                                    border: '1px solid #8b5cf6',
                                    background: '#f5f3ff',
                                    color: '#7c3aed',
                                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <span style={{
                                    width: 6, height: 6, borderRadius: '50%',
                                    background: '#7c3aed', flexShrink: 0,
                                }} />
                                {inpaintEngine === 'gpt' ? 'GPT Image 2' : inpaintEngine === 'seedream-v5-pro' ? '即夢 Pro' : 'Gemini'}
                            </button>
                        )}
                        {onImportToCanvas && (
                            <NavBtn title="匯入目前版本到畫布" onClick={() => { onImportToCanvas(state.compositeBase64, { compositeBase64: state.compositeBase64, layers: state.layers, versions: state.versions }); showToast('✅ 已匯入目前版本到畫布'); }}>
                                <Icon name="place_item" size={20} />
                            </NavBtn>
                        )}
                        <NavBtn title="匯出 PNG" onClick={handleExport}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21"/><path d="m14 19 3 3v-5.5"/><path d="m17 22 3-3"/><circle cx="9" cy="9" r="2"/></svg>
                        </NavBtn>
                        <NavBtn title="清除所有編輯紀錄並退出" onClick={handleDelete}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></NavBtn>
                    </div>
                </div>

                {/* 狀態提示（AI 進行中） */}
                {state.statusMessage && (
                    <div style={{
                        position: 'absolute',
                        top: 72,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 40,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        overflow: 'hidden',
                        borderRadius: 9999,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    }}>
                        {/* Shimmer 背景（與畫布 animate-shimmer 一致） */}
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.25)',
                            borderRadius: 9999,
                        }} />
                        <div className="animate-shimmer" style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: 9999,
                        }} />
                        {/* 前景內容 */}
                        <div style={{
                            position: 'relative',
                            zIndex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            background: 'rgba(255,255,255,0.88)',
                            backdropFilter: 'blur(8px)',
                            padding: '6px 12px 6px 16px',
                            borderRadius: 9999,
                            fontSize: 12,
                            fontWeight: 500,
                            color: '#374151',
                        }}>
                            <Ic.Spinner />
                            <span>{state.statusMessage}</span>
                            <button
                                onClick={cancelOperation}
                                title="取消目前操作"
                                style={{
                                    marginLeft: 4,
                                    padding: '3px 10px',
                                    borderRadius: 9999,
                                    border: '1px solid #e5e7eb',
                                    background: '#fff',
                                    color: '#6b7280',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = '#fee2e2';
                                    e.currentTarget.style.color = '#ef4444';
                                    e.currentTarget.style.borderColor = '#fca5a5';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = '#fff';
                                    e.currentTarget.style.color = '#6b7280';
                                    e.currentTarget.style.borderColor = '#e5e7eb';
                                }}
                            >
                                取消
                            </button>
                        </div>
                    </div>
                )}

                {/* 畫布容器 */}
                <div
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingTop: 56,
                        paddingBottom: 72,
                        paddingLeft: 24,
                        paddingRight: 24,
                    }}
                    onClick={() => selectLayer(null)}
                >
                    {/* 影像主體容器（白底 + shadow，對應 mockup） */}
                    <div
                        style={{
                            position: 'relative',
                            background: '#ffffff',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                            lineHeight: 0,
                            maxWidth: '100%',
                            width: 'fit-content',
                            height: 'fit-content',
                            cursor: activeTool === 'sam2' ? 'crosshair'
                                : activeTool === 'rect' ? 'crosshair'
                                : activeTool === 'points' ? 'cell'
                                : activeTool === 'select' ? 'pointer'
                                : activeTool === 'text' ? 'pointer'
                                : 'default',
                        }}
                        onClick={activeTool === 'sam2'    ? handleCanvasClick
                               : activeTool === 'points'  ? handlePointsClick
                               : activeTool === 'select'  ? handleSelectClick
                               : activeTool === 'text'    ? handleTextSelectClick
                               : (e => e.stopPropagation())}
                        onMouseDown={activeTool === 'rect'  ? handleRectMouseDown
                                   : activeTool === 'brush' ? handleBrushMouseDown : undefined}
                        onMouseMove={activeTool === 'rect'  ? handleRectMouseMove : undefined}
                        onMouseUp={activeTool === 'rect'    ? handleRectMouseUp   : undefined}
                        onContextMenu={activeTool === 'points' ? (e => { e.preventDefault(); handlePointsClick(e); }) : undefined}
                    >
                        {/* sam2 / rect 模式提示條 */}
                        {(activeTool === 'sam2' || activeTool === 'rect') && !isLoading && (
                            <div style={{
                                position: 'absolute', top: 12, left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 20,
                                background: 'rgba(15,15,20,0.72)',
                                backdropFilter: 'blur(10px)',
                                color: '#fff', fontSize: 11, fontWeight: 500,
                                letterSpacing: '0.02em',
                                padding: '5px 16px', borderRadius: 9999,
                                lineHeight: '1',
                                pointerEvents: 'none', whiteSpace: 'nowrap',
                                border: '1px solid rgba(255,255,255,0.12)',
                                boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
                            }}>
                                {activeTool === 'sam2' && '點擊任意物件新增圖層'}
                                {activeTool === 'rect' && '拖曳畫框選取物件範圍'}
                            </div>
                        )}

                        {/* 文字模式提示條 */}
                        {activeTool === 'text' && !isLoading && !selectedLayer && (
                            <div style={{
                                position: 'absolute', top: 12, left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 20,
                                background: 'rgba(5,150,105,0.82)',
                                backdropFilter: 'blur(10px)',
                                color: '#fff', fontSize: 11, fontWeight: 500,
                                letterSpacing: '0.02em',
                                padding: '5px 16px', borderRadius: 9999,
                                lineHeight: '1',
                                pointerEvents: 'none', whiteSpace: 'nowrap',
                                border: '1px solid rgba(255,255,255,0.12)',
                                boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
                            }}>
                                {state.layers.some(l => l.category === 'TEXT')
                                    ? '點選文字方塊以編輯文字'
                                    : '未偵測到文字（再次點擊「文字編輯」可重掃）'}
                            </div>
                        )}

                        {/* points 模式：整合式 HUD（可拖曳） */}
                        {activeTool === 'points' && !isLoading && (
                            <div
                                ref={hudRef}
                                onMouseDown={handleHudMouseDown}
                                style={{
                                position: 'absolute',
                                ...(hudPos
                                    ? { left: hudPos.x, top: hudPos.y, transform: 'translate(-50%, 0)' }
                                    : { top: 12, left: '50%', transform: 'translateX(-50%)' }),
                                zIndex: 20,
                                cursor: 'grab',
                                background: 'rgba(18,20,28,0.92)',
                                backdropFilter: 'blur(12px)',
                                borderRadius: 9999,
                                padding: '6px 6px 6px 16px',
                                display: 'flex', alignItems: 'center', gap: 16,
                                border: '1px solid rgba(255,255,255,0.08)',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                                whiteSpace: 'nowrap',
                            }}>
                                {/* 左鍵前景 */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <span style={{
                                        width: 10, height: 10, borderRadius: '50%',
                                        background: '#10b981',
                                        boxShadow: '0 0 8px rgba(16,185,129,0.7)',
                                        flexShrink: 0,
                                    }} />
                                    <span style={{ color: '#fff', fontSize: 12, fontWeight: 600, letterSpacing: '0.01em' }}>
                                        左鍵標記前景
                                    </span>
                                </div>
                                <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 14 }}>|</span>
                                {/* 右鍵背景 */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <span style={{
                                        width: 10, height: 10, borderRadius: '50%',
                                        background: '#ef4444',
                                        boxShadow: '0 0 8px rgba(239,68,68,0.7)',
                                        flexShrink: 0,
                                    }} />
                                    <span style={{ color: '#fff', fontSize: 12, fontWeight: 600, letterSpacing: '0.01em' }}>
                                        右鍵標記背景
                                    </span>
                                </div>
                                {/* 計數器 */}
                                {multiPoints.length > 0 && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        background: 'rgba(0,0,0,0.4)',
                                        borderRadius: 9999, padding: '4px 10px',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        fontFamily: 'monospace', fontSize: 12,
                                    }}>
                                        <span style={{ color: '#34d399', fontWeight: 700 }}>
                                            {multiPoints.filter(p => p.label === 1).length}
                                        </span>
                                        <span style={{ color: '#6b7280' }}>/</span>
                                        <span style={{ color: '#f87171', fontWeight: 700 }}>
                                            {multiPoints.filter(p => p.label === 0).length}
                                        </span>
                                    </div>
                                )}
                                {/* 清除所有點 */}
                                {multiPoints.length > 0 && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setMultiPoints([]); }}
                                        style={{
                                            background: 'rgba(255,255,255,0.08)',
                                            color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.12)',
                                            borderRadius: 9999, padding: '5px 10px',
                                            fontSize: 11, fontWeight: 500, cursor: 'pointer',
                                            flexShrink: 0, whiteSpace: 'nowrap',
                                            lineHeight: '1',
                                        }}
                                    >
                                        清除
                                    </button>
                                )}
                                {/* 取消模式 */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setMultiPoints([]); handleToolChange('select'); setHudPos(null); }}
                                    style={{
                                        background: 'rgba(255,255,255,0.08)',
                                        color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: 9999, padding: '5px 10px',
                                        fontSize: 11, fontWeight: 500, cursor: 'pointer',
                                        flexShrink: 0, whiteSpace: 'nowrap',
                                        lineHeight: '1',
                                    }}
                                >
                                    取消
                                </button>
                                {/* 確認按鈕 */}
                                {multiPoints.length > 0 && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handlePointsConfirm(e as any); }}
                                        style={{
                                            background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                                            color: '#fff', border: 'none',
                                            borderRadius: 9999, padding: '7px 18px',
                                            fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            boxShadow: '0 4px 12px rgba(124,58,237,0.35)',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"/>
                                        </svg>
                                        確認分割
                                    </button>
                                )}
                            </div>
                        )}

                        {/* A：拖曳中的矩形預覽 */}
                        {rectDrag && activeTool === 'rect' && (() => {
                            const x = Math.min(rectDrag.startX, rectDrag.curX) * 100;
                            const y = Math.min(rectDrag.startY, rectDrag.curY) * 100;
                            const w = Math.abs(rectDrag.curX - rectDrag.startX) * 100;
                            const h = Math.abs(rectDrag.curY - rectDrag.startY) * 100;
                            return (
                                <div style={{
                                    position: 'absolute',
                                    left: `${x}%`, top: `${y}%`,
                                    width: `${w}%`, height: `${h}%`,
                                    border: '2px dashed #7c3aed',
                                    background: 'rgba(124,58,237,0.08)',
                                    pointerEvents: 'none',
                                    zIndex: 15,
                                    boxSizing: 'border-box',
                                }} />
                            );
                        })()}

                        {/* A：框選完成待確認 */}
                        {pendingRect && activeTool === 'rect' && (() => {
                            // 依框選位置決定按鈕在上/下、靠左/右
                            const EDGE = 0.15; // 距圖片邊界 15% 以內算「靠邊」
                            const showAbove = (pendingRect.y + pendingRect.h) > (1 - EDGE);
                            const anchorRight = (pendingRect.x + pendingRect.w) > (1 - EDGE);

                            const btnLeft  = anchorRight
                                ? `${pendingRect.x * 100}%`               // 靠右時：按鈕左對齊選框左緣
                                : `${(pendingRect.x + pendingRect.w) * 100}%`; // 正常：右緣
                            const btnTop   = showAbove
                                ? `${pendingRect.y * 100}%`                // 靠下時：按鈕貼選框上緣
                                : `${(pendingRect.y + pendingRect.h) * 100}%`; // 正常：下緣
                            const btnTransform = [
                                anchorRight ? 'translateX(0)'   : 'translateX(-100%)',
                                showAbove   ? 'translateY(calc(-100% - 6px))' : 'translateY(6px)',
                            ].join(' ');

                            return (
                                <>
                                    {/* 框線 */}
                                    <div style={{
                                        position: 'absolute',
                                        left: `${pendingRect.x * 100}%`,
                                        top: `${pendingRect.y * 100}%`,
                                        width: `${pendingRect.w * 100}%`,
                                        height: `${pendingRect.h * 100}%`,
                                        border: '2px solid #7c3aed',
                                        background: 'rgba(124,58,237,0.06)',
                                        pointerEvents: 'none',
                                        zIndex: 15,
                                        boxSizing: 'border-box',
                                        borderRadius: 4,
                                    }} />
                                    {/* 確認/取消按鈕 — 自動避開邊界 */}
                                    <div style={{
                                        position: 'absolute',
                                        left: btnLeft,
                                        top: btnTop,
                                        transform: btnTransform,
                                        zIndex: 20,
                                        display: 'flex',
                                        gap: 6,
                                        pointerEvents: 'all',
                                    }}>
                                        <button
                                            onClick={async () => {
                                                const r = pendingRect!;
                                                setPendingRect(null);
                                                if (useOnnxSAM2 && onnxEmbeddingReady) {
                                                    const iW = imgRef.current?.naturalWidth  ?? 1;
                                                    const iH = imgRef.current?.naturalHeight ?? 1;
                                                    await runOnnxAndAddLayer({ bbox: {
                                                        x: r.x * iW, y: r.y * iH,
                                                        w: r.w * iW, h: r.h * iH,
                                                    }});
                                                } else {
                                                    addBoxLayer(r).catch(err =>
                                                        showToast(`❌ 框選失敗：${err?.message?.slice(0, 60) || ''}`)
                                                    );
                                                }
                                            }}
                                            style={{
                                                padding: '5px 12px',
                                                borderRadius: 9999,
                                                background: '#7c3aed',
                                                color: '#fff',
                                                border: 'none',
                                                fontSize: 12,
                                                fontWeight: 700,
                                                lineHeight: '1',
                                                cursor: 'pointer',
                                                boxShadow: '0 2px 8px rgba(124,58,237,0.4)',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            開始分析
                                        </button>
                                        <button
                                            onClick={() => setPendingRect(null)}
                                            style={{
                                                padding: '5px 10px',
                                                borderRadius: 9999,
                                                background: '#fff',
                                                color: '#6b7280',
                                                border: '1px solid #e5e7eb',
                                                fontSize: 12,
                                                fontWeight: 600,
                                                lineHeight: '1',
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            取消
                                        </button>
                                    </div>
                                </>
                            );
                        })()}

                        {/* B：多點標記 */}
                        {activeTool === 'points' && multiPoints.map((pt, i) => (
                            <div key={i} style={{
                                position: 'absolute',
                                left: `${pt.dispX}%`, top: `${pt.dispY}%`,
                                transform: 'translate(-50%, -50%)',
                                width: 14, height: 14,
                                borderRadius: '50%',
                                background: pt.label === 1 ? '#22c55e' : '#ef4444',
                                border: '2px solid white',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                pointerEvents: 'none',
                                zIndex: 15,
                            }} />
                        ))}

                        {/* 分析中 overlay — 與畫布 shimmer 一致 */}
                        {isLoading && (
                            <div style={{ position: 'absolute', inset: 0, zIndex: 15, overflow: 'hidden' }}
                                 className="pointer-events-none">
                                {/* 暗色底層 */}
                                <div className="absolute inset-0 bg-black/25" />
                                {/* Shimmer 掃光 */}
                                <div className="absolute inset-0 animate-shimmer" />
                                {/* 中央 badge */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-white/90 backdrop-blur-md rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow-lg">
                                        <svg className="animate-spin h-3 w-3 text-gray-800 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                        </svg>
                                        <span className="text-[11px] font-semibold text-gray-800 whitespace-nowrap">
                                            AI 運算中
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 原圖（無選取時 100% 不透明；有選取時略暗） */}
                        <img
                            ref={imgRef}
                            src={state.compositeBase64}
                            alt="原圖"
                            draggable={false}
                            onDragStart={e => e.preventDefault()}
                            style={{
                                display: 'block',
                                width: 'auto',
                                height: 'auto',
                                maxWidth: '100%',
                                maxHeight: 'calc(100vh - 180px)',
                                userSelect: 'none',
                                WebkitUserDrag: 'none',
                                opacity: selectedLayer ? 0.5 : 1,
                                transition: 'opacity 0.2s',
                            } as React.CSSProperties}
                        />

                        {/* C：筆塗 overlay canvas（跟著 img 尺寸） */}
                        {activeTool === 'brush' && (
                            <>
                                <canvas
                                    ref={brushCanvasRefCb}
                                    style={{
                                        position: 'absolute',
                                        pointerEvents: 'none',
                                        zIndex: 14,
                                        cursor: brushEraser ? 'cell' : 'crosshair',
                                    }}
                                />
                                {/* 筆塗 HUD — 可拖曳，與多點模式 bar 同規格 */}
                                {!isLoading && (
                                    <div
                                        ref={brushHudRef}
                                        onMouseDown={handleBrushHudMouseDown}
                                        style={{
                                        position: 'absolute',
                                        ...(brushHudPos
                                            ? { left: brushHudPos.x, top: brushHudPos.y, transform: 'translate(-50%, 0)' }
                                            : { top: 12, left: '50%', transform: 'translateX(-50%)' }),
                                        zIndex: 22,
                                        cursor: 'grab',
                                        background: 'rgba(18,20,28,0.92)',
                                        backdropFilter: 'blur(12px)',
                                        borderRadius: 9999,
                                        padding: '6px 6px 6px 16px',
                                        display: 'flex', alignItems: 'center', gap: 16,
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                                        whiteSpace: 'nowrap',
                                        userSelect: 'none',
                                    }}>
                                        {/* 筆刷大小 */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 500 }}>筆刷</span>
                                            <input
                                                type="range" min={8} max={80} value={brushSize}
                                                onChange={e => setBrushSize(Number(e.target.value))}
                                                style={{ width: 72, accentColor: '#7c3aed', cursor: 'pointer' }}
                                                onMouseDown={e => e.stopPropagation()}
                                            />
                                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'monospace', minWidth: 20 }}>{brushSize}</span>
                                        </div>

                                        <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 14 }}>|</span>

                                        {/* 橡皮擦 */}
                                        <button
                                            onMouseDown={e => e.stopPropagation()}
                                            onClick={() => setBrushEraser(v => !v)}
                                            style={{
                                                background: brushEraser ? 'linear-gradient(135deg,#7c3aed,#6366f1)' : 'rgba(255,255,255,0.08)',
                                                color: brushEraser ? '#fff' : 'rgba(255,255,255,0.65)',
                                                border: '1px solid rgba(255,255,255,0.12)',
                                                borderRadius: 9999, padding: '5px 12px',
                                                fontSize: 11, fontWeight: 500, cursor: 'pointer',
                                                lineHeight: '1', whiteSpace: 'nowrap',
                                                boxShadow: brushEraser ? '0 4px 12px rgba(124,58,237,0.35)' : 'none',
                                                transition: 'all 0.15s',
                                            }}
                                        >橡皮擦</button>

                                        {/* 清除 */}
                                        {brushHasStroke && (
                                            <button
                                                onMouseDown={e => e.stopPropagation()}
                                                onClick={() => {
                                                    const c = brushCanvasRef.current;
                                                    if (c) c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
                                                    brushHasStrokeRef.current = false;
                                                    brushSnapshot.current = null;
                                                    brushStrokePoints.current = [];
                                                    setBrushHasStroke(false);
                                                }}
                                                style={{
                                                    background: 'rgba(255,255,255,0.08)',
                                                    color: 'rgba(255,255,255,0.65)',
                                                    border: '1px solid rgba(255,255,255,0.12)',
                                                    borderRadius: 9999, padding: '5px 12px',
                                                    fontSize: 11, fontWeight: 500, cursor: 'pointer',
                                                    lineHeight: '1', whiteSpace: 'nowrap',
                                                }}
                                            >清除</button>
                                        )}

                                        {/* 取消模式 */}
                                        <button
                                            onMouseDown={e => e.stopPropagation()}
                                            onClick={() => handleToolChange('select')}
                                            style={{
                                                background: 'rgba(255,255,255,0.08)',
                                                color: 'rgba(255,255,255,0.65)',
                                                border: '1px solid rgba(255,255,255,0.12)',
                                                borderRadius: 9999, padding: '5px 12px',
                                                fontSize: 11, fontWeight: 500, cursor: 'pointer',
                                                lineHeight: '1', whiteSpace: 'nowrap',
                                            }}
                                        >取消</button>

                                        {/* 確認送 SAM2 */}
                                        {brushHasStroke && (
                                            <button
                                                onMouseDown={e => e.stopPropagation()}
                                                onClick={handleBrushConfirm}
                                                style={{
                                                    background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                                                    color: '#fff', border: 'none',
                                                    borderRadius: 9999, padding: '7px 18px',
                                                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: 6,
                                                    boxShadow: '0 4px 12px rgba(124,58,237,0.35)',
                                                    transition: 'all 0.15s',
                                                    lineHeight: '1', whiteSpace: 'nowrap',
                                                }}
                                            >
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"/>
                                                </svg>
                                                確認分割
                                            </button>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* 選中層高亮（疊在暗化的原圖上） */}
                        {selectedLayer && (
                            <img
                                src={state.compositeBase64}
                                alt=""
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    width: '100%',
                                    height: '100%',
                                    pointerEvents: 'none',
                                    // clip-path 也用 cropRatio，讓高亮區域與選取框一致
                                    clipPath: `inset(${selectedLayer.cropRatio.y * 100}% ${(1 - selectedLayer.cropRatio.x - selectedLayer.cropRatio.w) * 100}% ${(1 - selectedLayer.cropRatio.y - selectedLayer.cropRatio.h) * 100}% ${selectedLayer.cropRatio.x * 100}%)`,
                                }}
                            />
                        )}

                        {/* 未選取（非文字模式）：所有圖層的 hover 可點擊區域 */}
                        {!selectedLayer && activeTool !== 'text' && state.layers.filter(l => l.isVisible && !l.isLocked).map(l => (
                            <React.Fragment key={l.id}><HoverHitArea layer={l} onSelect={() => selectLayer(l.id)} /></React.Fragment>
                        ))}

                        {/* 文字模式：把所有 TEXT 圖層用虛線框標示（點擊由 canvas 處理） */}
                        {activeTool === 'text' && !selectedLayer && state.layers
                            .filter(l => l.category === 'TEXT' && l.isVisible && !l.isLocked)
                            .map(l => (
                                <div key={l.id} style={{
                                    position: 'absolute',
                                    left:   `${l.cropRatio.x * 100}%`,
                                    top:    `${l.cropRatio.y * 100}%`,
                                    width:  `${l.cropRatio.w * 100}%`,
                                    height: `${l.cropRatio.h * 100}%`,
                                    border: '2px dashed #059669',
                                    borderRadius: 4,
                                    background: 'rgba(5,150,105,0.06)',
                                    pointerEvents: 'none',
                                    boxSizing: 'border-box',
                                }} />
                            ))
                        }

                        {/* BBox 選取框 */}
                        {selectedLayer && <BBoxOverlay layer={selectedLayer} />}

                        {/* 浮動 Prompt 框（文字模式顯示文字編輯框） */}
                        {selectedLayer && (
                            <FloatingPromptBox
                                layer={selectedLayer}
                                onPromptChange={updatePrompt}
                                onApply={handleApply}
                                isRegenerating={isRegenerating}
                                onReferenceImageChange={updateReferenceImage}
                                textMode={activeTool === 'text'}
                                onApplyText={handleApplyText}
                            />
                        )}
                    </div>
                </div>

                {/* 工具列（可拖曳懸浮） */}
                <div
                    ref={toolbarRef}
                    onMouseDown={handleToolbarMouseDown}
                    style={toolbarPos ? {
                        // 拖曳後：fixed 定位（相對視窗，可懸停任意位置）
                        position: 'fixed',
                        left: toolbarPos.x, top: toolbarPos.y,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 20, cursor: 'grab', userSelect: 'none',
                    } : {
                        // 初始：absolute 定位（相對畫布容器，維持在圖片下方置中）
                        // 版本列永遠固定在底部（z35），工具列固定抬高到版本列上方，避免被蓋住
                        position: 'absolute',
                        bottom: 104,
                        left: '50%', transform: 'translateX(-50%)',
                        zIndex: 20, cursor: 'grab', userSelect: 'none',
                    }}
                >
                    <PillToolbar
                        activeTool={activeTool}
                        onTool={handleToolChange}
                        onExport={handleExport}
                        onReanalyze={handleReanalyze}
                        onGenerateLama={handleGenerateLama}
                        isAnalyzing={isLoading}
                        hasLayers={state.layers.filter(l => l.category !== 'BACKGROUND').length > 0}
                        lamaReady={lamaReady}
                    />
                </div>
            </div>

            {/* ── 右側圖層面板 ── */}
            <RightPanel
                layers={state.layers}
                originalBase64={originalBase64}
                compositeBase64={state.compositeBase64}
                selectedLayerId={state.selectedLayerId}
                onSelect={selectLayer}
                onToggleVisibility={toggleVisibility}
                onToggleLock={toggleLock}
                onDeleteLayer={deleteLayer}
                onRenameLayer={renameLayer}
                imageName={imageName}
                dirtyCount={dirtyCount}
                onApplyAll={handleApplyAll}
                isApplying={isLoading}
                checkedLayerIds={checkedLayerIds}
                onToggleCheck={toggleCheck}
                onDownloadLayer={downloadLayer}
                onDownloadChecked={downloadCheckedLayers}
                onImportLayersToCanvas={onImportLayersToCanvas ? (layers) => {
                    onImportLayersToCanvas(layers);
                    showToast(`✅ 已匯入 ${layers.length} 個圖層到畫布`);
                } : undefined}
            />

            {/* ── 版本分頁列（永遠固定在底部；至少顯示「原始」，刪到沒版本也不消失） ── */}
            {(
                <div style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 300,   // 讓開右側面板
                    zIndex: 35,
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(12px)',
                    borderTop: '1px solid rgba(0,0,0,0.06)',
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    overflowX: 'auto',
                }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', flexShrink: 0 }}>
                        版本
                    </span>

                    {/* 原始版本 */}
                    <VersionThumb
                        label="原始"
                        thumbnailBase64={originalBase64}
                        isActive={state.activeVersionIndex === -1}
                        onClick={switchToOriginal}
                    />

                    {/* 每個 Apply 的版本 */}
                    {state.versions.map((ver, i) => (
                        <React.Fragment key={ver.id}><VersionThumb
                            label={`v${i + 1} · ${ver.changedLayerName}`}
                            thumbnailBase64={ver.compositeBase64}
                            isActive={state.activeVersionIndex === i}
                            onClick={() => switchVersion(i)}
                            onRename={(n) => renameVersion(i, n)}
                            onDelete={() => deleteVersion(i)}
                        /></React.Fragment>
                    ))}

                    {/* hover 縮圖即可匯入，不需要額外按鈕 */}
                </div>
            )}

            {/* Toast 通知 */}
            {toastMsg && (
                <div style={{
                    position: 'fixed',
                    top: 68,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 100,
                    background: 'rgba(17,24,39,0.92)',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 500,
                    padding: '10px 20px',
                    borderRadius: 9999,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                }}>
                    {toastMsg}
                </div>
            )}
        </div>
    );
}

// ─── 版本縮圖 ─────────────────────────────────────────────────────────────────
// ─── VersionThumb / NavBtn / HoverHitArea → 已搬至 LayerListPanel.tsx ───────
