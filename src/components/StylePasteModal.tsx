// src/components/StylePasteModal.tsx
import React, { useState } from 'react';

export interface StyleAnalysisResult {
    color: string;
    lighting: string;
    artStyle: string;
    composition: string;
    texture: string;
    pose: string;
    expression: string;
    clothing: string;
    background: string;
    hair: string;
    typography: string;
}

const STYLE_ELEMENTS: { key: keyof StyleAnalysisResult; label: string }[] = [
    { key: 'color',       label: '色調／配色'     },
    { key: 'lighting',    label: '光影／打光'     },
    { key: 'artStyle',    label: '畫風／藝術風格' },
    { key: 'composition', label: '視角／構圖'     },
    { key: 'texture',     label: '色彩細節／紋理' },
    { key: 'pose',        label: '人物姿勢／動作' },
    { key: 'expression',  label: '面部表情／情緒' },
    { key: 'clothing',    label: '服裝／穿著'     },
    { key: 'background',  label: '背景環境'       },
    { key: 'hair',        label: '髮型設計'       },
    { key: 'typography',  label: '字體風格'       },
];

// 每個模式預設勾選的元素
const MODE_PRESETS: Record<'texture' | 'artistic', Array<keyof StyleAnalysisResult>> = {
    texture:  ['artStyle', 'texture'],
    artistic: ['color', 'lighting', 'artStyle', 'texture', 'background'],
};

interface StylePasteModalProps {
    analysis: StyleAnalysisResult;
    onApply: (selectedKeys: string[]) => void;
    onClose: () => void;
}

export const StylePasteModal: React.FC<StylePasteModalProps> = ({ analysis, onApply, onClose }) => {
    // null = 手動模式（自己選）
    const [activeMode, setActiveMode] = useState<'texture' | 'artistic' | null>(null);
    // 手動勾選狀態（只在 activeMode === null 時生效）
    const [manualChecked, setManualChecked] = useState<Record<string, boolean>>(
        Object.fromEntries(STYLE_ELEMENTS.map(el => [el.key, false]))
    );

    const isManual = activeMode === null;

    // 目前實際生效的 keys
    const effectiveKeys: string[] = isManual
        ? STYLE_ELEMENTS.filter(el => manualChecked[el.key]).map(el => el.key)
        : MODE_PRESETS[activeMode];

    const isNotApplicable = (key: keyof StyleAnalysisResult) =>
        analysis[key]?.toLowerCase().includes('not applicable');

    const toggleManual = (key: string) => {
        if (!isManual) return;
        setManualChecked(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const selectMode = (m: 'texture' | 'artistic') => {
        setActiveMode(prev => prev === m ? null : m); // 點同一個模式 = 取消
    };

    const clearMode = (e: React.MouseEvent, m: 'texture' | 'artistic') => {
        e.stopPropagation();
        if (activeMode === m) setActiveMode(null);
    };

    const selectAll = () => {
        if (!isManual) return;
        setManualChecked(Object.fromEntries(STYLE_ELEMENTS.map(el => [el.key, true])));
    };
    const deselectAll = () => {
        if (!isManual) return;
        setManualChecked(Object.fromEntries(STYLE_ELEMENTS.map(el => [el.key, false])));
    };

    const canApply = effectiveKeys.length > 0;

    const isChecked = (key: string): boolean => {
        if (!isManual) return effectiveKeys.includes(key);
        return manualChecked[key] ?? false;
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-[420px] max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 flex-shrink-0">
                    <div>
                        <h2 className="text-[15px] font-semibold text-[#1D1D1F]">貼上風格</h2>
                        <p className="text-[11px] text-[#86868B] mt-0.5">
                            {isManual ? '手動選擇套用元素，或使用下方快速模式' : `已選用快速模式，共 ${effectiveKeys.length} 個元素`}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-[#86868B] hover:text-[#1D1D1F] transition-colors">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                {/* 元素清單 */}
                <div className="px-5 py-4 overflow-y-auto flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] font-medium text-[#86868B] uppercase tracking-wide">套用元素</p>
                        {isManual && (
                            <div className="flex gap-2">
                                <button onClick={selectAll} className="text-[10px] text-[#007AFF] hover:underline">全選</button>
                                <span className="text-[10px] text-[#86868B]">/</span>
                                <button onClick={deselectAll} className="text-[10px] text-[#007AFF] hover:underline">全不選</button>
                            </div>
                        )}
                        {!isManual && (
                            <span className="text-[10px] text-[#86868B]">取消模式可手動選擇</span>
                        )}
                    </div>

                    <div className="space-y-1">
                        {STYLE_ELEMENTS.map(el => {
                            const notApplicable = isNotApplicable(el.key);
                            const checked = isChecked(el.key);
                            const isModeItem = !isManual && checked;
                            const disabled = notApplicable || !isManual;

                            return (
                                <button
                                    key={el.key}
                                    onClick={() => !disabled && toggleManual(el.key)}
                                    disabled={disabled && !notApplicable ? false : disabled}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                                        notApplicable
                                            ? 'opacity-25 cursor-not-allowed'
                                            : !isManual
                                                ? 'cursor-default'
                                                : checked
                                                    ? 'bg-[#F5F5F7] hover:bg-[#EBEBED] cursor-pointer'
                                                    : 'hover:bg-[#F5F5F7] cursor-pointer'
                                    }`}
                                >
                                    {/* Checkbox */}
                                    <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                        checked && !notApplicable
                                            ? isModeItem
                                                ? 'bg-black/15 border-black/20'   // 灰勾 = 模式自動勾
                                                : 'bg-[#1D1D1F] border-[#1D1D1F]' // 深色 = 手動勾
                                            : 'border-black/20'
                                    }`}>
                                        {checked && !notApplicable && (
                                            <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                                                <path
                                                    d="M2 6l3 3 5-5"
                                                    stroke={isModeItem ? '#555' : 'white'}
                                                    strokeWidth="1.8"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className={`text-[12px] font-medium ${notApplicable ? 'text-[#86868B]' : 'text-[#1D1D1F]'}`}>
                                            {el.label}
                                        </span>
                                        {notApplicable && (
                                            <span className="text-[10px] text-[#86868B] ml-2">（此圖不適用）</span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 套用模式（快速預設） */}
                <div className="px-5 py-3 border-t border-black/5 flex-shrink-0">
                    <p className="text-[11px] font-medium text-[#86868B] uppercase tracking-wide mb-2">快速模式</p>
                    <div className="flex gap-2">
                        {(['texture', 'artistic'] as const).map(m => {
                            const labels = { texture: '紋理模式', artistic: '藝術樣式' };
                            const subs = { texture: '畫風＋紋理', artistic: '色調＋光影＋畫風＋紋理＋背景' };
                            const isActive = activeMode === m;
                            return (
                                <button
                                    key={m}
                                    onClick={() => selectMode(m)}
                                    className={`relative flex-1 py-2 px-3 rounded-xl text-left text-[12px] font-medium border transition-all ${
                                        isActive
                                            ? 'bg-[#1D1D1F] text-white border-[#1D1D1F]'
                                            : 'bg-white text-[#1D1D1F] border-black/10 hover:border-black/30'
                                    }`}
                                >
                                    {/* ✕ 取消按鈕 */}
                                    {isActive && (
                                        <span
                                            onClick={e => clearMode(e, m)}
                                            className="absolute top-1 right-1.5 text-white/60 hover:text-white text-[11px] leading-none cursor-pointer"
                                        >
                                            ✕
                                        </span>
                                    )}
                                    <div className="font-semibold">{labels[m]}</div>
                                    <div className={`text-[10px] mt-0.5 ${isActive ? 'text-white/60' : 'text-[#86868B]'}`}>
                                        {subs[m]}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-black/5 flex gap-2 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl text-[13px] font-medium border border-black/10 text-[#1D1D1F] hover:bg-[#F5F5F7] transition-all"
                    >
                        取消
                    </button>
                    <button
                        onClick={() => canApply && onApply(effectiveKeys)}
                        disabled={!canApply}
                        className="flex-1 py-2.5 rounded-xl text-[13px] font-medium bg-[#1D1D1F] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black transition-all"
                    >
                        套用風格 ({effectiveKeys.length})
                    </button>
                </div>
            </div>
        </div>
    );
};
