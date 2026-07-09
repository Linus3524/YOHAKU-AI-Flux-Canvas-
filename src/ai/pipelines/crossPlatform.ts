import type { ImageElement } from '../../types';
import { loadImage } from '../../utils/helpers';
import { downloadImageAsBase64 } from '../../utils/atlasImage';
import { generateOneImage, type ImageEngineConfig } from '../generateImage';
import { crossPlatformSpec, buildCrossPlatformPrompt, type CrossPlatformSpec } from '../../skills/crossPlatform';

export async function runCrossPlatformPipeline({
    sourceElement,
    platformIds,
    opts,
    engine,
    nextZIndex,
    onToast,
    onAsset,
}: {
    sourceElement: ImageElement;
    platformIds: string[];
    opts: { preserveSubject?: boolean; keepText?: boolean; model?: string; imageSize?: '2K' | '4K'; seed?: number };
    engine: ImageEngineConfig;
    nextZIndex: () => number;
    onToast: (msg: string) => void;
    onAsset: (asset: ImageElement) => void;
}): Promise<{ generatedCount: number }> {
    const specs = platformIds.map(id => crossPlatformSpec(id)).filter(Boolean) as CrossPlatformSpec[];
    if (specs.length === 0) { onToast('⚠️ 請至少選一個平台'); return { generatedCount: 0 }; }

    let src = sourceElement.src;
    if (!src.startsWith('data:')) src = await downloadImageAsBase64(src);
    if (!src.startsWith('data:')) { onToast('⚠️ 無法讀取來源圖片'); return { generatedCount: 0 }; }

    // 結果排成一列放原圖右側,固定顯示高度、寬度依比例換算
    const ROW_H = 220;
    const gap = 24;
    let cursorX = sourceElement.position.x + sourceElement.width / 2 + 60;
    const baseTop = sourceElement.position.y - sourceElement.height / 2;
    let generatedCount = 0;

    for (let i = 0; i < specs.length; i++) {
        const spec = specs[i];
        onToast(`🎯 跨平台適配：${spec.name}（${i + 1}/${specs.length}）...`);
        const prompt = buildCrossPlatformPrompt(spec, opts);
        let resultSrc = '';
        try {
            resultSrc = await generateOneImage(
                { prompt, aspectRatio: spec.atlasRatio, refImage: src, seed: opts.seed },
                engine,
            );
        } catch (e) {
            console.warn('[crossPlatform] 生成失敗', spec.id, e);
            onToast(`⚠️ ${spec.name} 生成失敗,略過`);
            continue;
        }
        if (!resultSrc) { onToast(`⚠️ ${spec.name} 未回傳圖片,略過`); continue; }

        // 用「結果圖的實際像素比例」定畫布寬高,而非規格假設比例——
        // 模型/Atlas 回傳的真實比例可能跟 spec.ratioValue 不同,用假設值會把圖拉伸壓扁。
        let realRatio = spec.ratioValue;
        try {
            const im = await loadImage(resultSrc);
            if (im.naturalWidth > 0 && im.naturalHeight > 0) realRatio = im.naturalWidth / im.naturalHeight;
        } catch { /* 載入失敗則沿用規格比例 */ }
        const h = ROW_H;
        const w = Math.round(ROW_H * realRatio);
        const newId = `xplatform_${Date.now()}_${i}`;
        const newEl: ImageElement = {
            ...sourceElement,
            id: newId,
            src: resultSrc,
            name: `${sourceElement.name} (${spec.name})`,
            position: { x: cursorX + w / 2, y: baseTop + h / 2 },
            width: w,
            height: h,
            rotation: 0,
            zIndex: nextZIndex(),
            groupId: null,
            isVisible: true,
            isLocked: false,
        };
        onAsset(newEl);
        cursorX += w + gap;
        generatedCount += 1;
    }

    return { generatedCount };
}
