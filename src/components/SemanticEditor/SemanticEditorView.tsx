/**
 * SemanticEditorView
 * UI 參考：yohaku_semantic_editor.html
 * 全螢幕語意分層編輯器：左/中畫布 + 右側 Reve 式圖層面板
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSemanticEditor, CATEGORY_META } from './useSemanticEditor';
import type { SmartLayer, SmartLayerCategory } from '../../types';

// ─── SVG 圖示 ──────────────────────────────────────────────────────────────────
const Ic = {
    Home: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    Dots: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>,
    Trash: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
    Lock: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    Unlock: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>,
    Download: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    Refresh: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21"/></svg>,
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

// ─── 浮動 Prompt 編輯框（對應 .floating-prompt-box）──────────────────────────
function FloatingPromptBox({
    layer,
    onPromptChange,
    onApply,
    isRegenerating,
}: {
    layer: SmartLayer;
    onPromptChange: (id: string, v: string) => void;
    onApply: (layer: SmartLayer) => void;
    isRegenerating: boolean;
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
                padding: '12px 16px',
                width: 240,
                zIndex: 20,
            }}
            onClick={e => e.stopPropagation()}
        >
            <p style={{ fontSize: 10, color: '#6b7280', marginBottom: 4, fontWeight: 500 }}>
                Prompt
            </p>
            <textarea
                rows={4}
                value={layer.prompt}
                onChange={e => onPromptChange(layer.id, e.target.value)}
                style={{
                    width: '100%',
                    fontSize: 12,
                    color: '#111827',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    background: '#eff6ff',
                    padding: '4px 6px',
                    borderRadius: 4,
                    lineHeight: 1.5,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                }}
                placeholder="描述這個圖層..."
            />
            {/* Apply 按鈕 */}
            <button
                onClick={() => onApply(layer)}
                disabled={isRegenerating}
                style={{
                    marginTop: 8,
                    width: '100%',
                    height: 32,
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
    selectedLayerId,
    onSelect,
    onToggleVisibility,
    onToggleLock,
    onDeleteLayer,
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
    selectedLayerId: string | null;
    onSelect: (id: string | null) => void;
    onToggleVisibility: (id: string) => void;
    onToggleLock: (id: string) => void;
    onDeleteLayer: (id: string) => void;
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
                    {/* 原圖行（永遠在頂部） */}
                    <LayerRow
                        label={imageName}
                        isSelected={selectedLayerId === null}
                        isVisible={true}
                        onClick={() => onSelect(null)}
                        onToggleVisibility={() => {}}
                        thumb={
                            <img
                                src={originalBase64}
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
                        <LayerRow
                            key={layer.id}
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
                            thumb={
                                <LayerThumb
                                    layer={layer}
                                    originalBase64={originalBase64}
                                    isSelected={layer.id === selectedLayerId}
                                />
                            }
                        />
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
    thumb: React.ReactNode;
}) {
    const [hovered, setHovered] = useState(false);
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
                <span style={{
                    fontSize: 13,
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? '#111827' : '#374151',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    minWidth: 0,
                }}>
                    {label}
                </span>
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
    isAnalyzing,
}: {
    activeTool: string;
    onTool: (t: string) => void;
    onExport: () => void;
    onReanalyze: () => void;
    isAnalyzing: boolean;
}) {
    // SAM2 點選圖示
    const Sam2Icon = () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
            <path d="M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>
        </svg>
    );

    // 矩形框選圖示
    const RectIcon = () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2"/>
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

    const tools = [
        { id: 'refresh', icon: isAnalyzing ? <Ic.Spinner /> : <Ic.Refresh />, label: '重新分析', onClick: onReanalyze },
        { id: 'sam2',    icon: <Sam2Icon />,   label: '點選新增圖層', onClick: () => onTool('sam2') },
        { id: 'rect',    icon: <RectIcon />,   label: '矩形框選（A）', onClick: () => onTool('rect') },
        { id: 'points',  icon: <PointsIcon />, label: '多點選取（B）左鍵前景 右鍵背景', onClick: () => onTool('points') },
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
                <button
                    key={t.id}
                    title={t.label}
                    onClick={t.onClick ?? (() => onTool(t.id))}
                    style={{
                        ...btnBase,
                        background: activeTool === t.id ? '#eff6ff' : 'transparent',
                        color: activeTool === t.id ? '#9333ea' : '#6b7280',
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
    /** 匯入合成結果到畫布 */
    onImportToCanvas?: (compositeBase64: string) => void;
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
    const {
        state,
        selectedLayer,
        isLoading,
        analyzeImage,
        selectLayer,
        updatePrompt,
        applyLayerRegen,
        cancelOperation,
        switchVersion,
        switchToOriginal,
        addClickLayer,
        addBoxLayer,
        addPointsLayer,
        toggleVisibility,
        toggleLock,
        deleteLayer,
        resetLayer,
        dirtyCount,
        applyAllDirtyLayers,
    } = useSemanticEditor({ originalBase64, geminiApiKey, atlasApiKey, falApiKey, initialState });

    // 工具模式：'select' | 'sam2' | 'rect' | 'points'
    const [activeTool, setActiveTool] = useState('select');
    const [sam2Mode, setSam2Mode] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
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

    // B：多點模式狀態
    const [multiPoints, setMultiPoints] = useState<
        { x: number; y: number; label: 1 | 0; dispX: number; dispY: number }[]
    >([]);   // dispX/Y 是相對圖片容器的 % 位置（顯示用）

    const showToast = useCallback((msg: string, duration = 3500) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), duration);
    }, []);

    // 開啟時自動分析（有 initialState 則跳過，直接恢復上次紀錄）
    useEffect(() => {
        if (initialState) {
            showToast('✅ 已恢復上次編輯紀錄');
            return;
        }
        if (!geminiApiKey) {
            showToast('⚠️ 請先設定 Gemini API Key 才能分析圖片');
            return;
        }
        analyzeImage().catch(e => {
            showToast(`❌ 分析失敗：${e?.message?.slice(0, 60) || '未知錯誤'}`);
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);   // 只在 mount 時執行一次

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
        analyzeImage().catch(e => {
            showToast(`❌ 分析失敗：${e?.message?.slice(0, 60) || '未知錯誤'}`);
        });
    }, [geminiApiKey, analyzeImage, showToast]);

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
    const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (activeTool !== 'sam2' || isLoading) return;
        const c = getImgCoords(e);
        if (!c) return;
        addClickLayer({ x: c.pixX, y: c.pixY }).catch(err =>
            showToast(`❌ SAM2 點選失敗：${err?.message?.slice(0, 60) || ''}`)
        );
    }, [activeTool, isLoading, addClickLayer, showToast, getImgCoords]);

    // A：矩形框選
    const handleRectMouseDown = useCallback((e: React.MouseEvent) => {
        if (activeTool !== 'rect' || isLoading) return;
        e.stopPropagation();
        const c = getImgCoords(e);
        if (!c) return;
        setRectDrag({ startX: c.relX, startY: c.relY, curX: c.relX, curY: c.relY, active: true });
    }, [activeTool, isLoading, getImgCoords]);

    const handleRectMouseMove = useCallback((e: React.MouseEvent) => {
        if (!rectDrag?.active) return;
        const c = getImgCoords(e);
        if (!c) return;
        setRectDrag(d => d ? { ...d, curX: c.relX, curY: c.relY } : null);
    }, [rectDrag, getImgCoords]);

    const handleRectMouseUp = useCallback((e: React.MouseEvent) => {
        if (!rectDrag?.active || isLoading) return;
        const c = getImgCoords(e);
        if (!c) return;
        const x = Math.min(rectDrag.startX, c.relX);
        const y = Math.min(rectDrag.startY, c.relY);
        const w = Math.abs(c.relX - rectDrag.startX);
        const h = Math.abs(c.relY - rectDrag.startY);
        setRectDrag(null);
        if (w < 0.02 || h < 0.02) return; // 太小忽略
        addBoxLayer({ x, y, w, h }).catch(err =>
            showToast(`❌ 框選失敗：${err?.message?.slice(0, 60) || ''}`)
        );
    }, [rectDrag, isLoading, addBoxLayer, showToast, getImgCoords]);

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

    const handlePointsConfirm = useCallback(() => {
        if (multiPoints.length === 0) return;
        addPointsLayer(multiPoints.map(p => ({ x: p.x, y: p.y, label: p.label }))).catch(err =>
            showToast(`❌ 多點分割失敗：${err?.message?.slice(0, 60) || ''}`)
        );
        setMultiPoints([]);
    }, [multiPoints, addPointsLayer, showToast]);

    // 工具切換
    const handleToolChange = useCallback((tool: string) => {
        setActiveTool(tool);
        setSam2Mode(tool === 'sam2');
        setRectDrag(null);
        setMultiPoints([]);
        if (!['sam2', 'rect', 'points'].includes(tool)) selectLayer(null);
    }, [selectLayer]);

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
                            <NavBtn title="匯入目前版本到畫布" onClick={() => onImportToCanvas(state.compositeBase64)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                            </NavBtn>
                        )}
                        <NavBtn title="匯出 PNG" onClick={handleExport}><Ic.Download /></NavBtn>
                        <NavBtn title="清除所有編輯紀錄並退出" onClick={handleDelete}><Ic.Trash /></NavBtn>
                    </div>
                </div>

                {/* 狀態提示（AI 進行中） */}
                {state.statusMessage && (
                    <div style={{
                        position: 'absolute',
                        top: 64,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 40,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'rgba(255,255,255,0.92)',
                        backdropFilter: 'blur(8px)',
                        padding: '6px 12px 6px 16px',
                        borderRadius: 9999,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                        fontSize: 12,
                        fontWeight: 500,
                        color: '#374151',
                        border: '1px solid rgba(0,0,0,0.06)',
                    }}>
                        <Ic.Spinner />
                        <span>{state.statusMessage}</span>
                        {/* 取消按鈕 */}
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
                        onMouseDown={activeTool === 'rect' ? handleRectMouseDown : undefined}
                        onMouseMove={activeTool === 'rect' ? handleRectMouseMove : undefined}
                        onMouseUp={activeTool === 'rect'   ? handleRectMouseUp   : undefined}
                        onContextMenu={activeTool === 'points' ? (e => { e.preventDefault(); handlePointsClick(e); }) : undefined}
                    >
                        {/* 模式提示條 */}
                        {(activeTool === 'sam2' || activeTool === 'rect' || activeTool === 'points') && !isLoading && (
                            <div style={{
                                position: 'absolute', top: 8, left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 20,
                                background: activeTool === 'points' ? 'rgba(16,185,129,0.90)' : 'rgba(124,58,237,0.90)',
                                color: '#fff', fontSize: 11, fontWeight: 600,
                                padding: '5px 14px', borderRadius: 9999,
                                pointerEvents: 'none', whiteSpace: 'nowrap',
                            }}>
                                {activeTool === 'sam2'   && '✛ 點擊任意物件新增圖層'}
                                {activeTool === 'rect'   && '□ 拖拉畫框選取物件範圍'}
                                {activeTool === 'points' && '● 左鍵=前景（綠）右鍵=背景（紅）雙擊確認'}
                            </div>
                        )}

                        {/* A：矩形框選預覽 */}
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

                        {/* B：多點確認按鈕 */}
                        {activeTool === 'points' && multiPoints.length > 0 && (
                            <button
                                onDoubleClick={handlePointsConfirm}
                                onClick={handlePointsConfirm}
                                style={{
                                    position: 'absolute', bottom: 12, left: '50%',
                                    transform: 'translateX(-50%)',
                                    zIndex: 20,
                                    background: '#22c55e', color: '#fff',
                                    border: 'none', borderRadius: 8,
                                    fontSize: 12, fontWeight: 700,
                                    padding: '7px 16px', cursor: 'pointer',
                                }}
                            >
                                ✓ 確認分割（{multiPoints.filter(p => p.label === 1).length} 前景 / {multiPoints.filter(p => p.label === 0).length} 背景）
                            </button>
                        )}
                        {/* 分析中 overlay */}
                        {isLoading && (
                            <div style={{
                                position: 'absolute', inset: 0, zIndex: 15,
                                background: 'rgba(255,255,255,0.75)',
                                backdropFilter: 'blur(4px)',
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                gap: 10,
                            }}>
                                <Ic.Spinner />
                                <span style={{ fontSize: 12, fontWeight: 500, color: '#6b7280' }}>
                                    {state.statusMessage || 'AI 分析中...'}
                                </span>
                            </div>
                        )}

                        {/* 原圖（無選取時 100% 不透明；有選取時略暗） */}
                        <img
                            ref={imgRef}
                            src={state.compositeBase64}
                            alt="原圖"
                            style={{
                                display: 'block',
                                maxWidth: '100%',
                                maxHeight: 'calc(100vh - 180px)',
                                objectFit: 'contain',
                                userSelect: 'none',
                                opacity: selectedLayer ? 0.5 : 1,
                                transition: 'opacity 0.2s',
                            }}
                        />

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
                            <HoverHitArea key={l.id} layer={l} onSelect={() => selectLayer(l.id)} />
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
                            />
                        )}
                    </div>
                </div>

                {/* 底部工具列（有版本列時上移讓出空間） */}
                <div style={{
                    position: 'absolute',
                    bottom: state.versions.length > 0 ? 104 : 32,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 20,
                }}>
                    <PillToolbar
                        activeTool={activeTool}
                        onTool={handleToolChange}
                        onExport={handleExport}
                        onReanalyze={handleReanalyze}
                        isAnalyzing={isLoading}
                    />
                </div>
            </div>

            {/* ── 右側圖層面板 ── */}
            <RightPanel
                layers={state.layers}
                originalBase64={originalBase64}
                selectedLayerId={state.selectedLayerId}
                onSelect={selectLayer}
                onToggleVisibility={toggleVisibility}
                onToggleLock={toggleLock}
                onDeleteLayer={deleteLayer}
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
                        <VersionThumb
                            key={ver.id}
                            label={`v${i + 1} · ${ver.changedLayerName}`}
                            thumbnailBase64={ver.compositeBase64}
                            isActive={state.activeVersionIndex === i}
                            onClick={() => switchVersion(i)}
                            onImport={onImportToCanvas
                                ? () => onImportToCanvas(ver.compositeBase64)
                                : undefined}
                        />
                    ))}

                    {/* hover 縮圖即可匯入，不需要額外按鈕 */}
                </div>
            )}

            {/* Toast 通知 */}
            {toastMsg && (
                <div style={{
                    position: 'fixed',
                    bottom: 32,
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
    label, thumbnailBase64, isActive, onClick, onImport,
}: { label: string; thumbnailBase64: string; isActive: boolean; onClick: () => void; onImport?: () => void }) {
    const [hovered, setHovered] = useState(false);
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
                    transition: 'all 0.15s', position: 'relative',
                }}
            >
                <img src={thumbnailBase64} alt={label}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                {/* hover 時顯示匯入圖示 */}
                {hovered && onImport && (
                    <div
                        onClick={e => { e.stopPropagation(); onImport(); }}
                        title="匯入此版本到畫布"
                        style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(17,24,39,0.6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                    </div>
                )}
            </div>
            <span style={{
                fontSize: 10, fontWeight: isActive ? 700 : 500,
                color: isActive ? '#7c3aed' : '#6b7280',
                maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center',
            }}>
                {label}
            </span>
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
            {h && (
                <div style={{
                    position: 'absolute',
                    bottom: -22,
                    left: 0,
                    background: '#3b82f6',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: 4,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                }}>
                    {CATEGORY_META[layer.category].label} · {layer.name}
                </div>
            )}
        </div>
    );
}
