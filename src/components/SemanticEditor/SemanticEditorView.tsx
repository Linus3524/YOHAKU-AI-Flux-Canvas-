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

// ─── SVG 圖示 ──────────────────────────────────────────────────────────────────
const Ic = {
    Home: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    Dots: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>,
    Trash: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
    Lock: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    Unlock: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>,
    Download: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    Refresh: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21"/></svg>,
    Scan: () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12" strokeWidth="2.5"/></svg>,
    Crop: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"/><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"/></svg>,
    Brush: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>,
    Eraser: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 20H7L3 16C2.5 15.5 2.5 14.5 3 14L13 4C13.5 3.5 14.5 3.5 15 4L20 9C20.5 9.5 20.5 10.5 20 11L11 20"/><path d="M16 16L20 20"/></svg>,
    Image: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
    ChevronDown: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
    ChevronRight: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
    Paperclip: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>,
    Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>,
    Send: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
    Eye: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    EyeOff: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
    Wand: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg>,
    Spinner: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin" style={{ animationDuration: '0.8s' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
    Close: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
};

// ─── 選取框（用 cropRatio：SAM2 精確像素邊界，不用 Gemini bbox 矩形）────────────
function BBoxOverlay({ layer }: { layer: SmartLayer }) {
    // cropRatio = trimTransparentPixels 後的真實邊界，緊貼物件邊緣
    const bbox = layer.cropRatio;
    const cpStyle: React.CSSProperties = {
        position: 'absolute',
        width: 6,
        height: 6,
        background: 'white',
        border: '1.5px solid #3b82f6',
        cursor: 'pointer',
    };
    const half = -3;
    return (
        <div
            style={{
                position: 'absolute',
                left:   `${bbox.x * 100}%`,
                top:    `${bbox.y * 100}%`,
                width:  `${bbox.w * 100}%`,
                height: `${bbox.h * 100}%`,
                border: '1.5px solid #3b82f6',
                pointerEvents: 'none',
                zIndex: 10,
                boxSizing: 'border-box',
            }}
        >
            {/* 角點 */}
            <div style={{ ...cpStyle, top: half, left: half }} />
            <div style={{ ...cpStyle, top: half, right: half }} />
            <div style={{ ...cpStyle, bottom: half, left: half }} />
            <div style={{ ...cpStyle, bottom: half, right: half }} />
            {/* 邊中點 */}
            <div style={{ ...cpStyle, top: half, left: '50%', transform: 'translateX(-50%)' }} />
            <div style={{ ...cpStyle, bottom: half, left: '50%', transform: 'translateX(-50%)' }} />
            <div style={{ ...cpStyle, top: '50%', left: half, transform: 'translateY(-50%)' }} />
            <div style={{ ...cpStyle, top: '50%', right: half, transform: 'translateY(-50%)' }} />
        </div>
    );
}

// ─── 參考圖預覽（已上傳狀態）────────────────────────────────────────────────
function RefImagePreview({
    src,
    onRemove,
    onReplace,
}: {
    src: string;
    onRemove: () => void;
    onReplace: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    const [hovered, setHovered] = React.useState(false);
    const replaceRef = React.useRef<HTMLInputElement>(null);
    return (
        <div
            style={{ position: 'relative', width: '100%', height: 96, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <img src={src} alt="reference" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            {/* 懸停遮罩 */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(17,24,39,0.35)',
                backdropFilter: 'blur(2px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: hovered ? 1 : 0,
                transition: 'opacity 0.18s',
            }}>
                {/* 更換按鈕 */}
                <button
                    onClick={() => replaceRef.current?.click()}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
                    title="更換圖片"
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                </button>
                {/* 刪除按鈕 */}
                <button
                    onClick={onRemove}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(239,68,68,0.8)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
                    title="移除參考圖"
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            {/* REF 標籤 */}
            <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', color: '#fff', fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', padding: '2px 5px', borderRadius: 4, lineHeight: 1.5 }}>
                REF
            </div>
            <input ref={replaceRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onReplace} />
        </div>
    );
}

// ─── 浮動 Prompt 編輯框（對應 .floating-prompt-box）──────────────────────────
function FloatingPromptBox({
    layer,
    onPromptChange,
    onApply,
    isRegenerating,
    onReferenceImageChange,
}: {
    layer: SmartLayer;
    onPromptChange: (id: string, v: string) => void;
    onApply: (layer: SmartLayer) => void;
    isRegenerating: boolean;
    onReferenceImageChange: (id: string, img: string | undefined) => void;
}) {
    // 浮動 Prompt 框定位：用 cropRatio（緊貼物件邊緣）
    const cr = layer.cropRatio;
    const toRight = cr.x + cr.w < 0.70;
    const posStyle: React.CSSProperties = toRight
        ? { left: `calc(${(cr.x + cr.w) * 100}% + 12px)`, top: `${cr.y * 100}%` }
        : { right: `calc(${(1 - cr.x) * 100}% + 12px)`, top: `${cr.y * 100}%` };

    return (
        <div
            style={{
                position: 'absolute',
                ...posStyle,
                background: 'white',
                borderRadius: 16,
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.10), 0 0 1px rgba(0,0,0,0.10)',
                padding: '16px 16px 14px',
                width: 240,
                zIndex: 20,
            }}
            onClick={e => e.stopPropagation()}
        >
            <p style={{ fontSize: 10, color: '#9ca3af', margin: '0 0 10px 0', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Prompt
            </p>
            {/* 整合式輸入區：textarea + 參考圖列 */}
            <div style={{
                background: '#f9fafb',
                border: '1px solid #f3f4f6',
                borderRadius: 12,
                padding: '10px 12px',
                marginBottom: 12,
            }}>
                <textarea
                    rows={3}
                    value={layer.prompt}
                    onChange={e => onPromptChange(layer.id, e.target.value)}
                    style={{
                        width: '100%',
                        fontSize: 13,
                        color: '#1f2937',
                        border: 'none',
                        outline: 'none',
                        resize: 'none',
                        background: 'transparent',
                        lineHeight: 1.6,
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        padding: 0,
                    }}
                    placeholder="描述這個圖層..."
                />
                {/* 參考圖列 */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    paddingTop: 8, marginTop: 4,
                    borderTop: '1px solid #e5e7eb',
                }}>
                    {layer.referenceImage ? (
                        <RefImagePreview
                            src={layer.referenceImage}
                            onRemove={() => onReferenceImageChange(layer.id, undefined)}
                            onReplace={async e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = async ev => {
                                    const raw = ev.target?.result as string;
                                    const { compressForAtlas } = await import('../../utils/atlasImage');
                                    const compressed = await compressForAtlas(raw, 1024, 0.85, false);
                                    onReferenceImageChange(layer.id, compressed);
                                };
                                reader.readAsDataURL(file);
                                e.target.value = '';
                            }}
                        />
                    ) : (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <span style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: 24, height: 24, borderRadius: 6,
                                background: '#fff', border: '1px solid #e5e7eb',
                                color: '#6b7280', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                flexShrink: 0,
                            }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <polyline points="21 15 16 10 5 21"/>
                                </svg>
                            </span>
                            <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, userSelect: 'none' }}>參考圖 (選填)</span>
                            <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={async e => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = async ev => {
                                        const raw = ev.target?.result as string;
                                        const { compressForAtlas } = await import('../../utils/atlasImage');
                                        const compressed = await compressForAtlas(raw, 1024, 0.85, false);
                                        onReferenceImageChange(layer.id, compressed);
                                    };
                                    reader.readAsDataURL(file);
                                    e.target.value = '';
                                }}
                            />
                        </label>
                    )}
                </div>
            </div>
            {/* Apply 按鈕 */}
            <button
                onClick={() => onApply(layer)}
                disabled={isRegenerating}
                style={{
                    marginTop: 12,
                    width: '100%',
                    height: 36,
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    border: 'none',
                    cursor: isRegenerating ? 'not-allowed' : 'pointer',
                    background: isRegenerating ? '#e5e7eb' : '#111827',
                    color: isRegenerating ? '#9ca3af' : '#ffffff',
                    transition: 'all 0.15s',
                }}
            >
                {isRegenerating
                    ? <><Ic.Spinner /> 生成中...</>
                    : <><Ic.Wand /> Apply</>
                }
            </button>
        </div>
    );
}

// ─── 圖層縮圖（用 clip-path 模擬 mockup 的切割效果）──────────────────────────
function LayerThumb({
    layer,
    originalBase64,
    isSelected,
}: {
    layer: SmartLayer;
    originalBase64: string;
    isSelected: boolean;
}) {
    // 優先用透明 PNG（layer.base64）顯示物件本身，搭配棋盤背景
    // 若尚未去背（base64 = originalBase64）則 fallback 用原圖的 bbox 區域
    const useTransparent = layer.base64 !== layer.originalBase64 || layer.base64 !== originalBase64;

    if (useTransparent) {
        return (
            <div style={{
                width: 40, height: 40, borderRadius: 8, overflow: 'hidden',
                flexShrink: 0, position: 'relative',
                border: `1.5px solid ${isSelected ? '#93c5fd' : '#e5e7eb'}`,
                // 棋盤背景表示透明
                backgroundImage: 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)',
                backgroundSize: '8px 8px',
                backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                backgroundColor: '#fff',
            }}>
                <img
                    src={layer.base64}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
                />
            </div>
        );
    }

    // Fallback：從原圖 bbox 裁出縮圖
    const { bbox } = layer;
    const scale = Math.min(1 / Math.max(bbox.w, 0.01), 1 / Math.max(bbox.h, 0.01));
    const tx = -(bbox.x * scale * 100);
    const ty = -(bbox.y * scale * 100);
    return (
        <div style={{
            width: 40, height: 40, borderRadius: 8, overflow: 'hidden',
            flexShrink: 0, position: 'relative',
            border: `1.5px solid ${isSelected ? '#93c5fd' : '#e5e7eb'}`,
            background: '#f9fafb',
        }}>
            <img
                src={originalBase64}
                alt=""
                style={{
                    position: 'absolute',
                    width: `${scale * 100}%`,
                    height: `${scale * 100}%`,
                    left: `${tx}%`,
                    top: `${ty}%`,
                    objectFit: 'cover',
                    pointerEvents: 'none',
                }}
            />
        </div>
    );
}

// ─── 右側圖層面板 ──────────────────────────────────────────────────────────────
function RightPanel({
    layers,
    originalBase64,
    compositeBase64,
    selectedLayerId,
    onSelect,
    onToggleVisibility,
    onToggleLock,
    onDeleteLayer,
    onRenameLayer,
    imageName,
    dirtyCount,
    onApplyAll,
    isApplying,
    checkedLayerIds,
    onToggleCheck,
    onDownloadLayer,
    onDownloadChecked,
    onImportLayersToCanvas,
}: {
    layers: SmartLayer[];
    originalBase64: string;
    compositeBase64: string;   // 目前版本的合成圖（頂部主圖縮圖用）
    selectedLayerId: string | null;
    onSelect: (id: string | null) => void;
    onToggleVisibility: (id: string) => void;
    onToggleLock: (id: string) => void;
    onDeleteLayer: (id: string) => void;
    onRenameLayer?: (id: string, name: string) => void;
    imageName: string;
    dirtyCount: number;
    onApplyAll: () => void;
    isApplying: boolean;
    checkedLayerIds: string[];
    onToggleCheck: (id: string) => void;
    onDownloadLayer: (layer: SmartLayer) => void;
    onDownloadChecked: () => void;
    onImportLayersToCanvas?: (layers: SmartLayer[]) => void;
}) {
    const sorted = [...layers].sort((a, b) => b.zIndex - a.zIndex);

    return (
        <div style={{
            width: 300,
            background: '#ffffff',
            borderLeft: '1px solid #f3f4f6',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            zIndex: 30,
        }}>
            {/* 標題列 */}
            <div style={{
                display: 'flex', alignItems: 'center',
                padding: '0 16px', height: 56, borderBottom: '1px solid #f3f4f6',
            }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>圖層</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>
                    {layers.length} 個物件
                </span>
            </div>

            {/* 多選操作欄（有選取時才顯示） */}
            {checkedLayerIds.length > 0 && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 12px', background: '#f0f9ff',
                    borderBottom: '1px solid #e0f2fe',
                }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#0369a1', flex: 1 }}>
                        已選 {checkedLayerIds.length} 個圖層
                    </span>
                    {/* 下載 */}
                    <button
                        onClick={onDownloadChecked}
                        title="下載選取的圖層（透明 PNG）"
                        style={{ background: 'none', border: '1px solid #0369a1', borderRadius: 6,
                            color: '#0369a1', fontSize: 11, fontWeight: 600, padding: '4px 8px',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                    >
                        <Ic.Download /> 下載
                    </button>
                    {/* 匯入畫布（原位） */}
                    {onImportLayersToCanvas && (
                        <button
                            onClick={() => onImportLayersToCanvas(layers.filter(l => checkedLayerIds.includes(l.id)))}
                            title="在原位匯入到畫布"
                            style={{ background: '#111827', border: 'none', borderRadius: 6,
                                color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 8px',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                        >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                            匯入畫布
                        </button>
                    )}
                </div>
            )}

            {/* 圖層列表 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', scrollbarWidth: 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* 主圖行（目前版本的合成圖，頂部顯示） */}
                    <LayerRow
                        label={imageName}
                        isSelected={selectedLayerId === null}
                        isVisible={true}
                        onClick={() => onSelect(null)}
                        onToggleVisibility={() => {}}
                        thumb={
                            <img
                                src={compositeBase64}
                                alt=""
                                style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                            />
                        }
                    />

                    {/* 語意圖層 */}
                    {sorted.map(layer => {
                        const isDirty   = layer.prompt.trim() !== layer.appliedPrompt.trim();
                        const isChecked = checkedLayerIds.includes(layer.id);
                        return (
                        <React.Fragment key={layer.id}>
                        <LayerRow
                            label={layer.name}
                            isSelected={layer.id === selectedLayerId}
                            isVisible={layer.isVisible}
                            isLocked={layer.isLocked}
                            isDirty={isDirty}
                            isChecked={isChecked}
                            onClick={() => onSelect(layer.id === selectedLayerId ? null : layer.id)}
                            onToggleVisibility={() => onToggleVisibility(layer.id)}
                            onToggleLock={() => onToggleLock(layer.id)}
                            onDelete={() => onDeleteLayer(layer.id)}
                            onToggleCheck={() => onToggleCheck(layer.id)}
                            onDownload={() => onDownloadLayer(layer)}
                            onRename={onRenameLayer ? (n) => onRenameLayer(layer.id, n) : undefined}
                            thumb={
                                <LayerThumb
                                    layer={layer}
                                    originalBase64={originalBase64}
                                    isSelected={layer.id === selectedLayerId}
                                />
                            }
                        />
                        </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* 底部 Apply All 區域 */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', background: '#fff' }}>
                {/* 說明文字 */}
                <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8, textAlign: 'center' }}>
                    {dirtyCount > 0
                        ? `${dirtyCount} 個圖層已修改提示詞，尚未套用`
                        : '修改上方圖層的提示詞後點擊 Apply All'
                    }
                </p>

                {/* Apply All 按鈕 */}
                <button
                    onClick={onApplyAll}
                    disabled={isApplying || dirtyCount === 0}
                    style={{
                        width: '100%',
                        height: 40,
                        borderRadius: 12,
                        border: 'none',
                        fontSize: 13,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        cursor: (isApplying || dirtyCount === 0) ? 'not-allowed' : 'pointer',
                        background: (isApplying || dirtyCount === 0) ? '#f3f4f6' : '#111827',
                        color: (isApplying || dirtyCount === 0) ? '#9ca3af' : '#fff',
                        transition: 'all 0.2s',
                    }}
                >
                    {isApplying ? (
                        <><Ic.Spinner /> 重繪中...</>
                    ) : dirtyCount > 0 ? (
                        <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 3l14 9-14 9V3z"/></svg>
                            Apply All（{dirtyCount} 個圖層）
                        </>
                    ) : (
                        <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                            所有圖層已是最新
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

// ─── 圖層行（共用）────────────────────────────────────────────────────────────
function LayerRow({
    label,
    isSelected,
    isVisible,
    isLocked,
    isDirty,
    isChecked,
    onClick,
    onToggleVisibility,
    onToggleLock,
    onDelete,
    onToggleCheck,
    onDownload,
    onRename,
    thumb,
}: {
    label: string;
    isSelected: boolean;
    isVisible: boolean;
    isLocked?: boolean;
    isDirty?: boolean;
    isChecked?: boolean;
    onClick: () => void;
    onToggleVisibility: () => void;
    onToggleLock?: () => void;
    onDelete?: () => void;
    onToggleCheck?: () => void;
    onDownload?: () => void;
    onRename?: (newName: string) => void;
    thumb: React.ReactNode;
}) {
    const [hovered, setHovered] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editVal, setEditVal] = useState(label);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const startEdit = (e: React.MouseEvent) => {
        if (!onRename) return;
        e.stopPropagation();
        setEditVal(label);
        setEditing(true);
        setTimeout(() => { inputRef.current?.select(); }, 30);
    };
    const commitEdit = () => {
        setEditing(false);
        const trimmed = editVal.trim();
        if (trimmed && trimmed !== label) onRename?.(trimmed);
    };
    const iconBtn: React.CSSProperties = {
        color: '#9ca3af', border: 'none', background: 'none',
        cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0,
        borderRadius: 4, transition: 'color 0.15s',
    };

    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 10px',
                borderRadius: 12,
                cursor: 'pointer',
                background: isSelected ? '#eff6ff' : hovered ? '#f3f4f6' : 'transparent',
                transition: 'background 0.15s',
                marginBottom: 2,
                opacity: isVisible ? 1 : 0.45,
            }}
        >
            {/* Checkbox（hover 或已勾選時顯示） */}
            {(hovered || isChecked) && onToggleCheck && (
                <div
                    onClick={e => { e.stopPropagation(); onToggleCheck(); }}
                    style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                        border: isChecked ? 'none' : '1.5px solid #d1d5db',
                        background: isChecked ? '#7c3aed' : 'white',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    {isChecked && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    )}
                </div>
            )}

            {/* 縮圖 */}
            {thumb}

            {/* 名稱 + dirty 橘點 */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                {editing ? (
                    <input
                        ref={inputRef}
                        value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false); }}
                        onClick={e => e.stopPropagation()}
                        style={{
                            fontSize: 13, fontWeight: 700, color: '#111827',
                            border: '1.5px solid #7c3aed', borderRadius: 6,
                            padding: '1px 6px', outline: 'none', width: '100%',
                            background: '#fff',
                        }}
                        autoFocus
                    />
                ) : (
                    <span
                        style={{
                            fontSize: 13,
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? '#111827' : '#374151',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            minWidth: 0,
                            cursor: onRename ? 'text' : undefined,
                        }}
                        onDoubleClick={startEdit}
                        title={onRename ? '雙擊改名' : undefined}
                    >
                        {label}
                    </span>
                )}
                {isDirty && (
                    <span
                        title="提示詞已修改，尚未套用"
                        style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: '#f59e0b', flexShrink: 0, display: 'inline-block',
                        }}
                    />
                )}
            </div>

            {/* 鎖定常態顯示 */}
            {isLocked && !hovered && (
                <span style={{ color: '#d97706', display: 'flex', flexShrink: 0 }}>
                    <Ic.Lock />
                </span>
            )}

            {/* Hover 操作按鈕群 */}
            {hovered && (
                <div
                    onClick={e => e.stopPropagation()}
                    style={{ display: 'flex', alignItems: 'center', gap: 2 }}
                >
                    <button onClick={() => onToggleVisibility()}
                        title={isVisible ? '隱藏' : '顯示'} style={iconBtn}
                        onMouseEnter={e => (e.currentTarget.style.color = '#374151')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}>
                        {isVisible ? <Ic.Eye /> : <Ic.EyeOff />}
                    </button>

                    {onToggleLock && (
                        <button onClick={() => onToggleLock()}
                            title={isLocked ? '解鎖' : '鎖定'}
                            style={{ ...iconBtn, color: isLocked ? '#d97706' : '#9ca3af' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#d97706')}
                            onMouseLeave={e => (e.currentTarget.style.color = isLocked ? '#d97706' : '#9ca3af')}>
                            {isLocked ? <Ic.Lock /> : <Ic.Unlock />}
                        </button>
                    )}

                    {onDownload && (
                        <button onClick={() => onDownload()}
                            title="下載此圖層（PNG）" style={iconBtn}
                            onMouseEnter={e => (e.currentTarget.style.color = '#374151')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}>
                            <Ic.Download />
                        </button>
                    )}

                    {onDelete && (
                        <button onClick={() => onDelete()}
                            title="刪除圖層" style={iconBtn}
                            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}>
                            <Ic.Trash />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── 底部膠囊工具列（對應 .pill-toolbar）──────────────────────────────────────
function PillToolbar({
    activeTool,
    onTool,
    onExport,
    onReanalyze,
    onGenerateLama,
    isAnalyzing,
    hasLayers,
    lamaReady,
}: {
    activeTool: string;
    onTool: (t: string) => void;
    onExport: () => void;
    onReanalyze: () => void;
    onGenerateLama: () => void;
    isAnalyzing: boolean;
    hasLayers: boolean;
    lamaReady: boolean;
}) {
    // SAM2 點選圖示：藍色游標 + 右上大閃光
    const Sam2Icon = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
            {/* 游標箭頭（藍色） */}
            <path d="M4 4l14 9-7.5 1.5-3 6.5z"
                fill="#3b82f6" fillOpacity="0.18" stroke="#3b82f6" strokeWidth="1.7"/>
            {/* 閃光（右上角） */}
            <path d="M19.5 1l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2z"
                fill="#3b82f6" stroke="none"/>
        </svg>
    );

    // 矩形框選圖示：紫色虛線方框（dash 間距適中）
    const RectIcon = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="5 3"/>
        </svg>
    );
    // 多點圖示
    const PointsIcon = () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
            <circle cx="7"  cy="12" r="2.5" fill="#22c55e" stroke="#22c55e"/>
            <circle cx="17" cy="8"  r="2.5" fill="#22c55e" stroke="#22c55e"/>
            <circle cx="12" cy="17" r="2.5" fill="#ef4444" stroke="#ef4444"/>
        </svg>
    );

    // LaMa 背景圖示：魔法棒 + 層次感
    // 生成純背景：圓角方框 + 左上四角星（縱向拉長）+ 下方地平線弧
    const LamaIcon = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            {/* 圓角方框 */}
            <rect x="1.5" y="1.5" width="21" height="21" rx="3.5"/>
            {/* 四角星（縱向拉長，左上角，加粗） */}
            <path d="M8.75 4.25 L9.95 7.75 L13.25 8.75 L9.95 9.75 L8.75 13.25 L7.55 9.75 L4.25 8.75 L7.55 7.75 Z" fill="currentColor" stroke="none"/>
            {/* 地平線弧（平緩，上移） */}
            <path d="M4 17 Q12 12.5 20 17" fill="none" strokeWidth="1.9"/>
        </svg>
    );

    // 筆塗選取：使用者提供的手繪波浪筆觸 SVG
    const BrushIcon = () => (
        <svg width="22" height="22" viewBox="-8 -8 152 130" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path
                d="M5.5,59.34c11.99-10.48,23.65-21.15,35.41-31.77,9.39-8.1,19.18-17.3,31.16-21.07,13.01-4,21.73,4.48,17.38,17.42-5.91,20.33-46.61,44.14-46.36,64.03.79,4.74,8.58,3.02,12.7,1.13,5.93-2.42,12.59-7.01,18.48-11.78,7.83-6.16,14.8-13.48,23.55-17.06,6.95-2.98,15.19-1.4,14.76,7.39-.35,8.99-7.93,18.89-8.96,28.29-.98,6.2,2.75,12.02,9.42,11.99,6.02.15,12.05-3.07,17.63-5.97"
                stroke="#f97316" strokeWidth="15" fill="none"
            />
        </svg>
    );

    const tools = [
        { id: 'refresh', icon: isAnalyzing ? <Ic.Spinner /> : <Ic.Scan />, label: '全圖分析 (Analyze)', onClick: onReanalyze, disabled: false },
        { id: 'sam2',    icon: <Sam2Icon />,  label: '智能點選 (Auto Segment)',      onClick: () => onTool('sam2'),   disabled: false },
        { id: 'rect',    icon: <RectIcon />,  label: '矩形框選 (Bounding Box)',       onClick: () => onTool('rect'),   disabled: false },
        { id: 'points',  icon: <PointsIcon />,label: '多點精確選取 (Multi-points)',   onClick: () => onTool('points'), disabled: false },
        { id: 'brush',   icon: <BrushIcon />, label: '筆塗選取 (Brush Select)',         onClick: () => onTool('brush'),  disabled: false },
        {
            id: 'lama',
            icon: <LamaIcon />,
            label: lamaReady ? 'LaMa 生成純背景' : 'LaMa（需先下載模型）',
            onClick: onGenerateLama,
            disabled: !lamaReady || !hasLayers,
        },
    ];

    const btnBase: React.CSSProperties = {
        width: 36,
        height: 36,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        border: 'none',
        transition: 'all 0.15s',
    };

    return (
        <div style={{
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 4px 20px -4px rgba(0,0,0,0.08)',
            borderRadius: 9999,
            padding: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
        }}>
            {tools.map(t => (
                <div key={t.id} style={{ position: 'relative' }}
                    onMouseEnter={e => {
                        const tip = e.currentTarget.querySelector('.tool-tip') as HTMLElement;
                        if (tip) tip.style.opacity = '1';
                    }}
                    onMouseLeave={e => {
                        const tip = e.currentTarget.querySelector('.tool-tip') as HTMLElement;
                        if (tip) tip.style.opacity = '0';
                    }}
                >
                <button
                    onClick={t.disabled ? undefined : (t.onClick ?? (() => onTool(t.id)))}
                    disabled={t.disabled}
                    style={{
                        ...btnBase,
                        background: activeTool === t.id ? '#eff6ff' : 'transparent',
                        color: t.disabled ? '#d1d5db' : activeTool === t.id ? '#9333ea' : '#6b7280',
                        cursor: t.disabled ? 'not-allowed' : 'pointer',
                        opacity: t.disabled ? 0.5 : 1,
                    }}
                    onMouseEnter={e => {
                        if (activeTool !== t.id) {
                            (e.currentTarget as HTMLElement).style.background = '#f3f4f6';
                            (e.currentTarget as HTMLElement).style.color = '#111827';
                        }
                    }}
                    onMouseLeave={e => {
                        if (activeTool !== t.id) {
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                            (e.currentTarget as HTMLElement).style.color = '#6b7280';
                        }
                    }}
                >
                    {t.icon}
                </button>
                {/* 自訂 tooltip */}
                <div className="tool-tip" style={{
                    position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(15,15,20,0.85)',
                    backdropFilter: 'blur(8px)',
                    color: '#fff', fontSize: 11, fontWeight: 500,
                    padding: '4px 9px', borderRadius: 6,
                    whiteSpace: 'nowrap', pointerEvents: 'none',
                    opacity: 0, transition: 'opacity 0.15s',
                    border: '1px solid rgba(255,255,255,0.1)',
                    zIndex: 50,
                }}>
                    {t.label}
                </div>
                </div>
            ))}
        </div>
    );
}

// ─── 主元件 ────────────────────────────────────────────────────────────────────
interface SemanticEditorViewProps {
    originalBase64: string;
    imageName?: string;
    /**
     * save=true  → 保留編輯紀錄（返回畫布）
     * save=false → 清除紀錄（垃圾桶）
     */
    onClose: (save: boolean, state?: { compositeBase64: string; layers: import('../../types').SmartLayer[]; versions: import('../../types').EditorVersion[] }) => void;
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
        selectLayer,
        updatePrompt,
        updateReferenceImage,
        applyLayerRegen,
        cancelOperation,
        switchVersion,
        switchToOriginal,
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
        originalBase64, geminiApiKey, atlasApiKey, falApiKey, initialState,
        useLocalSAM2: useOnnxSAM2,
    });
    const [onnxSAM2Ready, setOnnxSAM2Ready] = useState(false);
    const [onnxEmbeddingLoading, setOnnxEmbeddingLoading] = useState(false);
    const [onnxEmbeddingReady, setOnnxEmbeddingReady] = useState(false);
    const isComputingEmbeddingRef = useRef(false);

    // 開啟時檢查 ONNX 模型是否已下載
    const [lamaReady, setLamaReady] = useState(false);
    useEffect(() => {
        Promise.all([
            getModelStatus('sam2_encoder'),
            getModelStatus('sam2_decoder'),
            getModelStatus('lama'),
        ]).then(([enc, dec, lama]) => {
            setOnnxSAM2Ready(enc === 'ready' && dec === 'ready');
            setLamaReady(lama === 'ready');
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
    const brushCanvasRefCb = useCallback((el: HTMLCanvasElement | null) => {
        brushCanvasRef.current = el;
        if (el && imgRef.current) {
            el.width  = imgRef.current.offsetWidth;
            el.height = imgRef.current.offsetHeight;
        }
    }, []);

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
        if (!atlasApiKey) { showToast('⚠️ Apply 需要 Atlas（GPT Image 2）API Key'); return; }
        if (!falApiKey)   { showToast('⚠️ Apply 需要 fal.ai Key（SAM2 分割用）'); return; }
        applyLayerRegen(layer).catch(e => {
            showToast(`❌ 重繪失敗：${e?.message?.slice(0, 60) || '未知錯誤'}`);
        });
    }, [geminiApiKey, applyLayerRegen, showToast]);

    // Apply All（批次）
    const handleApplyAll = useCallback(() => {
        if (!atlasApiKey) { showToast('⚠️ Apply 需要 Atlas（GPT Image 2）API Key'); return; }
        applyAllDirtyLayers().catch(e => {
            showToast(`❌ 批次重繪失敗：${e?.message?.slice(0, 60) || '未知錯誤'}`);
        });
    }, [atlasApiKey, applyAllDirtyLayers, showToast]);

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
                describeLayerWithGemini(newLayer.base64, geminiApiKey).then(desc => {
                    if (desc) updatePrompt(newLayer.id, desc);
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
    }, [selectLayer]);

    // C：筆塗 handlers
    const getBrushPos = useCallback((e: React.MouseEvent | MouseEvent) => {
        if (!imgRef.current) return null;
        const rect = imgRef.current.getBoundingClientRect();
        return {
            x: Math.max(0, Math.min(rect.width,  e.clientX - rect.left)),
            y: Math.max(0, Math.min(rect.height, e.clientY - rect.top)),
        };
    }, []);

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
            // fal.ai fallback：從筆塗重心算出 click point
            let sumX = 0, sumY = 0, count = 0;
            for (let i = 0; i < W * H; i++) {
                if (bwData.data[i * 4] > 127) {
                    sumX += i % W; sumY += Math.floor(i / W); count++;
                }
            }
            if (count === 0) return;
            const clickPixel = { x: Math.round(sumX / count), y: Math.round(sumY / count) };
            addClickLayer(clickPixel).catch(err =>
                showToast(`❌ 分割失敗：${err?.message?.slice(0, 60) || ''}`)
            );
        } else {
            showToast('⚠️ 筆塗模式需要本機 SAM2 ONNX 或 fal.ai API Key');
        }
    }, [brushHasStroke, useOnnxSAM2, falApiKey, runOnnxAndAddLayer, addClickLayer, showToast]);

    // 返回畫布（保留狀態）
    const handleBack = useCallback(() => {
        onClose(true, {
            compositeBase64: state.compositeBase64,
            layers:          state.layers,
            versions:        state.versions,
        });
    }, [onClose, state.compositeBase64, state.layers, state.versions]);

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#9ca3af', fontWeight: 500 }}>
                        <button
                            onClick={handleBack}
                            title="返回畫布（保留編輯紀錄）"
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: '#9ca3af', fontSize: 13, fontWeight: 500,
                                padding: 0, transition: 'color 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#111827')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
                        >
                            {/* ← 箭頭 */}
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                            <Ic.Home />
                            <span>YOHAKU</span>
                        </button>
                        <span style={{ color: '#d1d5db' }}>/</span>
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
                        {/* 匯入畫布 icon（有版本才顯示，和其他 NavBtn 統一風格） */}
                        {onImportToCanvas && state.versions.length > 0 && (
                            <NavBtn title="匯入目前版本到畫布" onClick={() => onImportToCanvas(state.compositeBase64, { compositeBase64: state.compositeBase64, layers: state.layers, versions: state.versions })}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                            </NavBtn>
                        )}
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
                        <NavBtn title="匯出 PNG" onClick={handleExport}><Ic.Download /></NavBtn>
                        <NavBtn title="清除所有編輯紀錄並退出" onClick={handleDelete}><Ic.Trash /></NavBtn>
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
                            cursor: activeTool === 'sam2' ? 'crosshair'
                                : activeTool === 'rect' ? 'crosshair'
                                : activeTool === 'points' ? 'cell'
                                : 'default',
                        }}
                        onClick={activeTool === 'sam2'    ? handleCanvasClick
                               : activeTool === 'points'  ? handlePointsClick
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
                                                    await runOnnxAndAddLayer({ bbox: r });
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
                                maxWidth: '100%',
                                maxHeight: 'calc(100vh - 180px)',
                                objectFit: 'contain',
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
                                        inset: 0,
                                        width: '100%',
                                        height: '100%',
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
                                    objectFit: 'contain',
                                    pointerEvents: 'none',
                                    // clip-path 也用 cropRatio，讓高亮區域與選取框一致
                                    clipPath: `inset(${selectedLayer.cropRatio.y * 100}% ${(1 - selectedLayer.cropRatio.x - selectedLayer.cropRatio.w) * 100}% ${(1 - selectedLayer.cropRatio.y - selectedLayer.cropRatio.h) * 100}% ${selectedLayer.cropRatio.x * 100}%)`,
                                }}
                            />
                        )}

                        {/* 未選取：所有圖層的 hover 可點擊區域 */}
                        {!selectedLayer && state.layers.filter(l => l.isVisible).map(l => (
                            <React.Fragment key={l.id}><HoverHitArea layer={l} onSelect={() => selectLayer(l.id)} /></React.Fragment>
                        ))}

                        {/* BBox 選取框 */}
                        {selectedLayer && <BBoxOverlay layer={selectedLayer} />}

                        {/* 浮動 Prompt 框 */}
                        {selectedLayer && (
                            <FloatingPromptBox
                                layer={selectedLayer}
                                onPromptChange={updatePrompt}
                                onApply={handleApply}
                                isRegenerating={isRegenerating}
                                onReferenceImageChange={updateReferenceImage}
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
                        position: 'absolute',
                        bottom: state.versions.length > 0 ? 104 : 32,
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
                onImportLayersToCanvas={onImportLayersToCanvas}
            />

            {/* ── 版本分頁列（有版本時才顯示，固定在底部） ── */}
            {state.versions.length > 0 && (
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
function VersionThumb({
    label, thumbnailBase64, isActive, onClick, onRename,
}: { label: string; thumbnailBase64: string; isActive: boolean; onClick: () => void; onImport?: () => void; onRename?: (n: string) => void }) {
    const [hovered, setHovered] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editVal, setEditVal] = useState(label);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const startEdit = (e: React.MouseEvent) => {
        if (!onRename) return;
        e.stopPropagation();
        setEditVal(label);
        setEditing(true);
        setTimeout(() => inputRef.current?.select(), 30);
    };
    const commitEdit = () => {
        setEditing(false);
        const t = editVal.trim();
        if (t && t !== label) onRename?.(t);
    };

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{ flexShrink: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, position: 'relative' }}
        >
            <div
                onClick={onClick}
                style={{
                    width: 56, height: 56, borderRadius: 8, overflow: 'hidden',
                    border: isActive ? '2.5px solid #7c3aed' : hovered ? '2px solid #c4b5fd' : '2px solid #e5e7eb',
                    boxShadow: isActive ? '0 0 0 3px rgba(124,58,237,0.15)' : 'none',
                    transition: 'all 0.15s',
                }}
            >
                <img src={thumbnailBase64} alt={label}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            {editing ? (
                <input
                    ref={inputRef}
                    value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false); }}
                    onClick={e => e.stopPropagation()}
                    style={{
                        fontSize: 10, fontWeight: 700, color: '#7c3aed',
                        border: '1px solid #7c3aed', borderRadius: 4,
                        padding: '1px 4px', outline: 'none', width: 64,
                        textAlign: 'center', background: '#fff',
                    }}
                    autoFocus
                />
            ) : (
                <span
                    style={{
                        fontSize: 10, fontWeight: isActive ? 700 : 500,
                        color: isActive ? '#7c3aed' : '#6b7280',
                        maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center',
                    }}
                    onDoubleClick={startEdit}
                    title={onRename ? '雙擊改名' : undefined}
                >
                    {label}
                </span>
            )}
        </div>
    );
}

// ─── 小工具元件 ────────────────────────────────────────────────────────────────
function NavBtn({ children, title, onClick }: { children: React.ReactNode; title?: string; onClick?: () => void }) {
    return (
        <button
            title={title}
            onClick={onClick}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex', alignItems: 'center' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#111827')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#9ca3af')}
        >
            {children}
        </button>
    );
}

function HoverHitArea({ layer, onSelect }: { layer: SmartLayer; onSelect: () => void }) {
    const [h, setH] = useState(false);
    return (
        <div
            onClick={e => { e.stopPropagation(); onSelect(); }}
            onMouseEnter={() => setH(true)}
            onMouseLeave={() => setH(false)}
            style={{
                position: 'absolute',
                // HoverHitArea：也用 cropRatio，hover 框緊貼 SAM2 邊界
                left:   `${layer.cropRatio.x * 100}%`,
                top:    `${layer.cropRatio.y * 100}%`,
                width:  `${layer.cropRatio.w * 100}%`,
                height: `${layer.cropRatio.h * 100}%`,
                cursor: 'pointer',
                border: h ? '1.5px solid #93c5fd' : '1.5px solid transparent',
                borderRadius: 2,
                transition: 'border-color 0.15s',
                boxSizing: 'border-box',
            }}
        >
            {h && (() => {
                // 彈性定位：靠近底部邊緣時往上顯示，靠近右邊緣時靠右對齊
                const nearBottom = layer.cropRatio.y + layer.cropRatio.h > 0.88;
                const nearRight  = layer.cropRatio.x + layer.cropRatio.w > 0.75;
                const posStyle: React.CSSProperties = nearBottom
                    ? { top: -28 }
                    : { bottom: -28 };
                const alignStyle: React.CSSProperties = nearRight
                    ? { right: 0 }
                    : { left: 0 };
                return (
                    <div style={{
                        position: 'absolute',
                        ...posStyle,
                        ...alignStyle,
                        background: '#3b82f6',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '3px 9px',
                        borderRadius: 9999,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        boxShadow: '0 1px 6px rgba(59,130,246,0.45)',
                        letterSpacing: '0.02em',
                        zIndex: 30,
                        lineHeight: '1.5',
                    }}>
                        {CATEGORY_META[layer.category].label} · {layer.name}
                    </div>
                );
            })()}
        </div>
    );
}
