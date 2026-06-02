import React, { useState } from 'react';
import type { ArtboardElement, CanvasElement } from '../types';
import { downloadArtboardAsSVG } from '../features/artboard';

interface SVGExportModalProps {
    artboards: ArtboardElement[];
    allElements: CanvasElement[];
    onClose: () => void;
}

export const SVGExportModal: React.FC<SVGExportModalProps> = ({ artboards, allElements, onClose }) => {
    const [selected, setSelected] = useState<Set<string>>(new Set(artboards.map(a => a.id)));
    const [exporting, setExporting] = useState(false);

    const toggle = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === artboards.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(artboards.map(a => a.id)));
        }
    };

    const handleExport = async () => {
        const toExport = artboards.filter(a => selected.has(a.id));
        if (toExport.length === 0) return;
        setExporting(true);
        for (let i = 0; i < toExport.length; i++) {
            downloadArtboardAsSVG(toExport[i], allElements);
            if (i < toExport.length - 1) {
                await new Promise(r => setTimeout(r, 300));
            }
        }
        setExporting(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-[380px] max-h-[80vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 pt-5 pb-4 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-[#1D1D1F]">匯出為 SVG</h2>
                    <p className="text-xs text-[#86868B] mt-1">選擇要匯出的工作區域，每個匯出為獨立 .svg 檔案</p>
                </div>

                {/* Select All */}
                <div className="px-6 py-3 border-b border-gray-100">
                    <label className="flex items-center gap-2.5 cursor-pointer text-sm text-[#1D1D1F] font-medium">
                        <input
                            type="checkbox"
                            checked={selected.size === artboards.length}
                            onChange={toggleAll}
                            className="w-4 h-4 rounded accent-[#007AFF] cursor-pointer"
                        />
                        全選（{artboards.length} 個工作區域）
                    </label>
                </div>

                {/* Artboard List */}
                <div className="flex-1 overflow-y-auto px-6 py-3 flex flex-col gap-2">
                    {artboards.map(ab => (
                        <label
                            key={ab.id}
                            className="flex items-center gap-3 cursor-pointer group py-1.5 px-2 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            <input
                                type="checkbox"
                                checked={selected.has(ab.id)}
                                onChange={() => toggle(ab.id)}
                                className="w-4 h-4 rounded accent-[#007AFF] cursor-pointer flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-[#1D1D1F] truncate">
                                    {ab.artboardName || '未命名工作區域'}
                                </div>
                                <div className="text-xs text-[#86868B]">
                                    {Math.round(ab.width)} × {Math.round(ab.height)} px
                                </div>
                            </div>
                        </label>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-[#1D1D1F] hover:bg-gray-50 transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={selected.size === 0 || exporting}
                        className="flex-1 py-2.5 rounded-xl bg-[#1D1D1F] text-white text-sm font-bold hover:bg-[#333] transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                    >
                        {exporting ? '匯出中...' : `匯出 ${selected.size} 個`}
                    </button>
                </div>
            </div>
        </div>
    );
};
