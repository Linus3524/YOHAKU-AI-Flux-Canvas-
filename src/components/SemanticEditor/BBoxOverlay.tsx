import type React from 'react';
import type { SmartLayer } from '../../types';

// ─── 選取框（用 cropRatio：SAM2 精確像素邊界，不用 Gemini bbox 矩形）────────────
export function BBoxOverlay({ layer }: { layer: SmartLayer }) {
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
