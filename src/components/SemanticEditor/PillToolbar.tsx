import React from 'react';
import { Icon } from '../Icon';
import { Ic } from './icons';

export function PillToolbar({
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
    const tools = [
        { id: 'select',  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M12.586 12.586 19 19"/><path d="M3.688 3.037a.497.497 0 0 0-.651.651l6.5 15.999a.501.501 0 0 0 .947-.062l1.569-6.083a2 2 0 0 1 1.448-1.479l6.124-1.579a.5.5 0 0 0 .063-.947z"/></svg>, label: '選取圖層 (Select Layer)',     onClick: () => onTool('select'), disabled: false },
        { id: 'text',    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>, label: '文字編輯 (Text Edit)',         onClick: () => onTool('text'),   disabled: false },
        { id: 'refresh', icon: isAnalyzing ? <Ic.Spinner /> : <Icon name="split_scene_2" size={20} />, label: '全圖分析 (Analyze)',           onClick: onReanalyze, disabled: false },
        { id: 'sam2',    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M12.034 12.681a.498.498 0 0 1 .647-.647l9 3.5a.5.5 0 0 1-.033.943l-3.444 1.068a1 1 0 0 0-.66.66l-1.067 3.443a.5.5 0 0 1-.943.033z"/><path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"/></svg>, label: '智能點選 (Auto Segment)',      onClick: () => onTool('sam2'),   disabled: false },
        { id: 'rect',    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M5 3a2 2 0 0 0-2 2"/><path d="M19 3a2 2 0 0 1 2 2"/><path d="M21 19a2 2 0 0 1-2 2"/><path d="M5 21a2 2 0 0 1-2-2"/><path d="M9 3h1"/><path d="M9 21h1"/><path d="M14 3h1"/><path d="M14 21h1"/><path d="M3 9v1"/><path d="M21 9v1"/><path d="M3 14v1"/><path d="M21 14v1"/></svg>, label: '矩形框選 (Bounding Box)',      onClick: () => onTool('rect'),   disabled: false },
        { id: 'points',  icon: <Icon name="scatter_plot" size={20} style={{ color: '#22c55e' }} />, label: '多點精確選取 (Multi-points)',  onClick: () => onTool('points'), disabled: false },
        { id: 'brush',   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42"/></svg>, label: '筆塗選取 (Brush Select)',      onClick: () => onTool('brush'),  disabled: false },
        {
            id: 'lama',
            icon: <Icon name="background_replace" size={20} style={{ color: '#0ea5e9' }} />,
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
