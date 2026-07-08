/**
 * LayerListPanel
 * 從 SemanticEditorView.tsx 搬出的右側圖層面板相關元件。
 * 全部為純展示元件（presentational），透過 props 接收資料與回呼，
 * 不持有任何語意編輯器的 React 狀態 → 搬移後行為完全不變。
 */

import React, { useState } from 'react';
import type { SmartLayer, SmartLayerCategory } from '../../types';
import { CATEGORY_META } from './useSemanticEditor';
import { Icon } from '../Icon';

// ─── 圖示（與 SemanticEditorView 共用同一套，保持視覺一致）──────────────────
const Ic = {
    Trash:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
    Lock:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    Unlock:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>,
    Download: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21"/><path d="m14 19 3 3v-5.5"/><path d="m17 22 3-3"/><circle cx="9" cy="9" r="2"/></svg>,
    Spinner:  () => <Icon name="progress_activity" size={13} className="animate-spin" style={{ animationDuration: '0.8s' }} />,
    Eye:      () => <Icon name="visibility" size={14.5} />,
    EyeOff:   () => <Icon name="visibility_off" size={13} />,
    Wand:     () => <Icon name="magic_button" size={13} />,
};

// ─── 圖層縮圖 ────────────────────────────────────────────────────────────────
export function LayerThumb({
    layer,
    originalBase64,
    isSelected,
}: {
    layer: SmartLayer;
    originalBase64: string;
    isSelected: boolean;
}) {
    const useTransparent = layer.base64 !== layer.originalBase64 || layer.base64 !== originalBase64;

    if (useTransparent) {
        return (
            <div style={{
                width: 40, height: 40, borderRadius: 8, overflow: 'hidden',
                flexShrink: 0, position: 'relative',
                border: `1.5px solid ${isSelected ? '#93c5fd' : '#e5e7eb'}`,
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

// ─── 圖層行（共用）────────────────────────────────────────────────────────────
export function LayerRow({
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

            {/* 右側操作區：鎖頭永遠占位，其他按鈕 hover 才出現 */}
            <div
                onClick={e => e.stopPropagation()}
                style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}
            >
                {hovered && (
                    <button onClick={() => onToggleVisibility()}
                        title={isVisible ? '隱藏' : '顯示'} style={iconBtn}
                        onMouseEnter={e => (e.currentTarget.style.color = '#374151')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}>
                        {isVisible ? <Ic.Eye /> : <Ic.EyeOff />}
                    </button>
                )}

                {/* 鎖頭：永遠佔位，locked 時橙色，hover 未鎖定時灰色，其餘透明 */}
                {onToggleLock && (
                    <button onClick={() => onToggleLock()}
                        title={isLocked ? '解鎖' : '鎖定'}
                        style={{
                            ...iconBtn,
                            color: isLocked ? '#d97706' : hovered ? '#9ca3af' : 'transparent',
                            pointerEvents: hovered || isLocked ? 'auto' : 'none',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#d97706')}
                        onMouseLeave={e => (e.currentTarget.style.color = isLocked ? '#d97706' : hovered ? '#9ca3af' : 'transparent')}>
                        {isLocked ? <Ic.Lock /> : <Ic.Unlock />}
                    </button>
                )}

                {hovered && onDownload && (
                    <button onClick={() => onDownload()}
                        title="下載此圖層（PNG）" style={iconBtn}
                        onMouseEnter={e => (e.currentTarget.style.color = '#374151')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}>
                        <Ic.Download />
                    </button>
                )}

                {hovered && onDelete && (
                    <button onClick={() => onDelete()}
                        title="刪除圖層" style={iconBtn}
                        onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}>
                        <Ic.Trash />
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── 右側圖層面板 ──────────────────────────────────────────────────────────────
export function RightPanel({
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
    compositeBase64: string;
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
                            <Icon name="place_item" size={15} />
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
                        const isDirty   = (typeof layer.prompt === 'string' ? layer.prompt.trim() : '') !== (typeof layer.appliedPrompt === 'string' ? layer.appliedPrompt.trim() : '');
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

// ─── 版本縮圖 ──────────────────────────────────────────────────────────────────
export function VersionThumb({
    label, thumbnailBase64, isActive, onClick, onRename, onDelete,
}: { label: string; thumbnailBase64: string; isActive: boolean; onClick: () => void; onImport?: () => void; onRename?: (n: string) => void; onDelete?: () => void }) {
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
            {onDelete && hovered && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    title="刪除此版本"
                    style={{
                        position: 'absolute', top: -6, right: -6,
                        width: 18, height: 18, borderRadius: '50%',
                        background: '#ef4444', color: '#fff', border: '2px solid #fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', padding: 0, lineHeight: 1,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.2)', zIndex: 2,
                    }}
                >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
                </button>
            )}
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
export function NavBtn({ children, title, onClick }: { children: React.ReactNode; title?: string; onClick?: () => void }) {
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

// ─── 畫布物件 hover 感應區 ─────────────────────────────────────────────────────
export function HoverHitArea({ layer, onSelect }: { layer: SmartLayer; onSelect: () => void }) {
    const [h, setH] = useState(false);
    return (
        <div
            onClick={e => { e.stopPropagation(); onSelect(); }}
            onMouseEnter={() => setH(true)}
            onMouseLeave={() => setH(false)}
            style={{
                position: 'absolute',
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
