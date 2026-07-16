import type { ImageElement } from '../../types';
import { loadImage } from '../../utils/helpers';
import { downloadImageAsBase64 } from '../../utils/atlasImage';
import { generateOneImage, type ImageEngineConfig } from '../generateImage';
import { crossPlatformSpec, crossPlatformRatioForModel, buildCrossPlatformPrompt, type CrossPlatformSpec } from '../../skills/crossPlatform';

export async function runCrossPlatformPipeline({
    sourceElement,
    platformIds,
    opts,
    engine,
    nextZIndex,
    onToast,
    onAsset,
    onItemStart,
    onItemFailed,
}: {
    sourceElement: ImageElement;
    platformIds: string[];
    opts: { preserveSubject?: boolean; keepText?: boolean; model?: string; imageSize?: '2K' | '4K'; seed?: number };
    engine: ImageEngineConfig;
    nextZIndex: () => number;
    onToast: (msg: string) => void;
    onAsset: (asset: ImageElement, index: number, spec: CrossPlatformSpec) => void;
    onItemStart?: (index: number, spec: CrossPlatformSpec) => void;
    onItemFailed?: (index: number, spec: CrossPlatformSpec) => void;
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

    const ratioValue = (ratio: string): number => {
        const [width, height] = ratio.split(':').map(Number);
        return width / height;
    };

    const readImageRatio = async (imageSrc: string): Promise<number> => {
        const image = await loadImage(imageSrc);
        return image.naturalWidth > 0 && image.naturalHeight > 0
            ? image.naturalWidth / image.naturalHeight
            : 0;
    };

    for (let i = 0; i < specs.length; i++) {
        const spec = specs[i];
        const effectiveRatio = crossPlatformRatioForModel(engine.model, spec.atlasRatio);
        const effectiveRatioValue = ratioValue(effectiveRatio);
        onItemStart?.(i, spec);
        onToast(`🎯 跨平台適配：${spec.name}（${i + 1}/${specs.length}）...`);
        const prompt = `${buildCrossPlatformPrompt(spec, opts)}\nTechnical output canvas: ${effectiveRatio}. The final raster canvas must use this wide aspect ratio; do not return a square canvas.`;
        let resultSrc = '';
        try {
            for (let attempt = 0; attempt < 2; attempt++) {
                resultSrc = await generateOneImage(
                    {
                        prompt: attempt === 0 ? prompt : `${prompt}\nRetry requirement: the previous result used the wrong canvas ratio. Return exactly ${effectiveRatio}, never 1:1.`,
                        aspectRatio: effectiveRatio,
                        refImage: src,
                        seed: opts.seed !== undefined ? opts.seed + attempt : undefined,
                    },
                    engine,
                );
                if (!resultSrc) continue;
                const returnedRatio = await readImageRatio(resultSrc).catch(() => effectiveRatioValue);
                const mismatch = Math.abs(returnedRatio - effectiveRatioValue) / effectiveRatioValue;
                if (mismatch <= 0.2 || attempt === 1) break;
                onToast(`↻ ${spec.name} 回傳比例不符，正自動重試 ${effectiveRatio}`);
            }
        } catch (e) {
            console.warn('[crossPlatform] 生成失敗', spec.id, e);
            const reason = e instanceof Error ? e.message : '未知錯誤';
            onToast(`⚠️ ${spec.name} 生成失敗：${reason.slice(0, 100)}`);
            onItemFailed?.(i, spec);
            continue;
        }
        if (!resultSrc) {
            onToast(`⚠️ ${spec.name} 未回傳圖片,略過`);
            onItemFailed?.(i, spec);
            continue;
        }

        // 用「結果圖的實際像素比例」定畫布寬高,而非規格假設比例——
        // 模型/Atlas 回傳的真實比例可能跟 spec.ratioValue 不同,用假設值會把圖拉伸壓扁。
        let realRatio = effectiveRatioValue;
        try {
            const im = await loadImage(resultSrc);
            if (im.naturalWidth > 0 && im.naturalHeight > 0) {
                realRatio = im.naturalWidth / im.naturalHeight;
                const ratioDifference = Math.abs(realRatio - effectiveRatioValue) / effectiveRatioValue;
                if (ratioDifference > 0.2) {
                    onToast(`⚠️ ${spec.name}：模型實際回傳約 ${realRatio.toFixed(2)}:1，已保留完整圖片、不裁切`);
                }
            }
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
        onAsset(newEl, i, spec);
        cursorX += w + gap;
        generatedCount += 1;
    }

    return { generatedCount };
}
