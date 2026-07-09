import React from 'react';
import type { SmartLayer } from '../../types';
import { Ic } from './icons';
import { RefImagePreview } from './RefImagePreview';

export function FloatingPromptBox({
    layer,
    onPromptChange,
    onApply,
    isRegenerating,
    onReferenceImageChange,
    textMode = false,
    onApplyText,
}: {
    layer: SmartLayer;
    onPromptChange: (id: string, v: string) => void;
    onApply: (layer: SmartLayer) => void;
    isRegenerating: boolean;
    onReferenceImageChange: (id: string, img: string | undefined) => void;
    /** 文字編輯模式：顯示「文字內容」編輯框，套用時只換文字 */
    textMode?: boolean;
    onApplyText?: (layer: SmartLayer, newText: string) => void;
}) {
    // 文字模式的本地編輯值（切換圖層時重置為該層的原始文字）
    const [textVal, setTextVal] = React.useState(layer.text ?? '');
    React.useEffect(() => { setTextVal(layer.text ?? ''); }, [layer.id, layer.text]);

    // 浮動 Prompt 框定位：用 cropRatio（緊貼物件邊緣）
    const cr = layer.cropRatio;
    const toRight = cr.x + cr.w < 0.70;
    const isLowerHalf = (cr.y + cr.h / 2) > 0.5;
    const posStyle: React.CSSProperties = {
        position: 'absolute',
        ...(toRight
            ? { left: `calc(${(cr.x + cr.w) * 100}% + 12px)` }
            : { right: `calc(${(1 - cr.x) * 100}% + 12px)` }),
        ...(isLowerHalf
            ? { bottom: `${(1 - cr.y - cr.h) * 100}%` }
            : { top: `${cr.y * 100}%` }),
    };

    // ── 文字編輯模式：簡化彈窗（原文 → 可編輯文字 → 套用）──────────────────────
    if (textMode) {
        return (
            <div
                style={{
                    position: 'absolute', ...posStyle,
                    background: 'white', borderRadius: 16,
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.10), 0 0 1px rgba(0,0,0,0.10)',
                    padding: '16px 16px 14px', width: 260, zIndex: 20,
                }}
                onClick={e => e.stopPropagation()}
            >
                <p style={{ fontSize: 10, color: '#9ca3af', margin: '0 0 10px 0', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    文字內容
                </p>
                <textarea
                    rows={3}
                    value={textVal}
                    onChange={e => setTextVal(e.target.value)}
                    autoFocus
                    style={{
                        width: '100%', fontSize: 14, color: '#1f2937',
                        border: '1px solid #e5e7eb', borderRadius: 12, outline: 'none',
                        resize: 'none', background: '#f9fafb', lineHeight: 1.6,
                        fontFamily: 'inherit', boxSizing: 'border-box', padding: '10px 12px',
                    }}
                    placeholder="輸入要替換成的文字..."
                />
                <button
                    onClick={() => onApplyText?.(layer, textVal)}
                    disabled={isRegenerating || !textVal.trim()}
                    style={{
                        marginTop: 12, width: '100%', height: 36, borderRadius: 10,
                        fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: 5, border: 'none',
                        cursor: (isRegenerating || !textVal.trim()) ? 'not-allowed' : 'pointer',
                        background: (isRegenerating || !textVal.trim()) ? '#e5e7eb' : '#111827',
                        color: (isRegenerating || !textVal.trim()) ? '#9ca3af' : '#ffffff',
                        transition: 'all 0.15s',
                    }}
                >
                    {isRegenerating ? <><Ic.Spinner /> 生成中...</> : <><Ic.Wand /> 套用文字</>}
                </button>
            </div>
        );
    }

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
