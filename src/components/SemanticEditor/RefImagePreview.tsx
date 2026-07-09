import React from 'react';

// ─── 參考圖預覽（已上傳狀態）────────────────────────────────────────────────
export function RefImagePreview({
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
