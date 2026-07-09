import type { ImageElement } from '../../types';
import { loadImage } from '../../utils/helpers';
import { downloadImageAsBase64 } from '../../utils/atlasImage';
import { generateOneImage, type ImageEngineConfig } from '../generateImage';
import { analyzeProductStyleAnchor } from './analysis';
import {
    PRODUCT_MARKETING_PLATFORMS,
    buildProductMarketingPrompt,
    type ProductMarketingBrief,
    type ProductMarketingOutputSpec,
} from '../../skills/marketing';

export async function runProductMarketingPipeline({
    sourceElement,
    productSrc: initialProductSrc,
    brief,
    engine,
    selectedRecipeIds,
    platformId,
    customSeed,
    apiKey,
    nextZIndex,
    onToast,
    onAsset,
}: {
    sourceElement: ImageElement;
    productSrc: string;
    brief: ProductMarketingBrief;
    engine: ImageEngineConfig;
    selectedRecipeIds?: string[];
    platformId: string;
    customSeed?: number;
    apiKey?: string | null;
    nextZIndex: () => number;
    onToast: (msg: string) => void;
    onAsset: (asset: ImageElement) => void;
}): Promise<{ successCount: number; total: number }> {
    let productSrc = initialProductSrc;

    // 1. base64 轉換移至最前面，以供後續分析及生圖共用
    if (!productSrc.startsWith('data:')) {
        try { productSrc = await downloadImageAsBase64(productSrc); } catch { /* 失敗則維持原樣 */ }
    }

    // 2. 進行風格預分析以抽取配色與氛圍錨點（後台呼叫在 src/ai/pipelines/analysis.ts）
    let sharedStyleAnchor = '';
    if (brief.lockStyleConsistency && apiKey && productSrc.startsWith('data:')) {
        onToast('🔍 正在分析商品風格，為成套行銷圖鎖定風格與色調...');
        try {
            sharedStyleAnchor = await analyzeProductStyleAnchor(productSrc, apiKey);
        } catch (e) {
            console.warn('[productStyleAnalysis] 風格分析失敗，將使用默認風格設定進行生成', e);
        }
    }

    // 3. 風格一致性隨機種子碼
    const consistencySeed = customSeed !== undefined
        ? customSeed
        : (brief.lockStyleConsistency ? Math.floor(Math.random() * 2147483647) : undefined);

    // 排成一列放原產品圖片右側, 固定顯示高度
    const ROW_H = 220;
    const gap = 24;
    let cursorX = sourceElement.position.x + sourceElement.width / 2 + 60;
    const baseTop = sourceElement.position.y - sourceElement.height / 2;

    // 把一張結果圖放上畫布（依實際像素比例定寬高），回傳是否成功
    const placeAsset = async (resultSrc: string, title: string, fallbackRatio: number, key: string): Promise<boolean> => {
        if (!resultSrc) return false;
        let realRatio = fallbackRatio;
        try {
            const im = await loadImage(resultSrc);
            if (im.naturalWidth > 0 && im.naturalHeight > 0) realRatio = im.naturalWidth / im.naturalHeight;
        } catch { /* 載入失敗則沿用規格比例 */ }
        const h = ROW_H;
        const w = Math.round(ROW_H * realRatio);
        const newId = `mktg_${Date.now()}_${key}`;
        const newEl: ImageElement = {
            type: 'image', id: newId, src: resultSrc,
            name: `${brief.productName || 'Product'}（${title}）`,
            position: { x: cursorX + w / 2, y: baseTop + h / 2 },
            width: w, height: h, rotation: 0,
            zIndex: nextZIndex(),
            groupId: null, isVisible: true, isLocked: false,
        };
        onAsset(newEl);
        cursorX += w + gap;
        return true;
    };

    const platformSpec = PRODUCT_MARKETING_PLATFORMS[platformId];
    if (!platformSpec) { onToast('⚠️ 找不到指定的行銷平台設定'); return { successCount: 0, total: 0 }; }

    const allSpecs = platformSpec.recipes;
    const baseSpecs = selectedRecipeIds
        ? allSpecs.filter(s => selectedRecipeIds.includes(s.id))
        : allSpecs;

    // 支援自訂規格動態生成
    const customSpecs: ProductMarketingOutputSpec[] = (brief.customAssets || []).map((title, idx) => {
        return {
            id: `custom_mktg_${idx}_${Date.now()}`,
            title: `自訂：${title}`,
            aspectRatio: '4:3', // 預設使用 4:3 萬能電商比例
            ratioValue: 4 / 3,
            note: `使用者自訂產品行銷 Mockup：${title}`,
            guidance: [
                `Generate a professional e-commerce product advertisement visual featuring a ${title} showcasing the product.`,
                `The product from the reference image must be realistically placed and integrated in the scene.`,
                `Maintain aesthetic studio lighting, clean background, and clear design layout.`
            ]
        };
    });

    const specs = [...baseSpecs, ...customSpecs];
    const total = specs.length;
    if (total === 0) { onToast('⚠️ 未選取或輸入任何行銷規格'); return { successCount: 0, total }; }
    let successCount = 0;

    // ── 逐一調用 AI 模型生成 ──
    for (let i = 0; i < specs.length; i++) {
        const spec = specs[i];
        onToast(`🎯 產品行銷組圖：${spec.title}（${i + 1}/${total}）...`);
        const prompt = buildProductMarketingPrompt(brief, spec, i, specs.length, sharedStyleAnchor || undefined);
        let resultSrc = '';

        try {
            // 以產品圖為參考圖；原語內 seed 一律放 config 頂層（修正舊版塞在
            // imageConfig 內層被 SDK 靜默忽略 → 風格一致性 seed 實際無效的 bug）
            resultSrc = await generateOneImage(
                { prompt, aspectRatio: spec.aspectRatio, refImage: productSrc, seed: consistencySeed },
                engine,
            );
        } catch (e) {
            console.warn('[productMarketingSet] 延伸生成失敗', spec.id, e);
            onToast(`⚠️ ${spec.title} 生成失敗,略過`);
            continue;
        }

        if (!resultSrc) { onToast(`⚠️ ${spec.title} 未回傳圖片,略過`); continue; }
        if (await placeAsset(resultSrc, spec.title, spec.ratioValue, String(i))) successCount += 1;
    }

    return { successCount, total };
}
