import type { ImageElement, NoteElement, TextElement } from '../../types';
import { loadImage } from '../../utils/helpers';
import { downloadImageAsBase64 } from '../../utils/atlasImage';
import { generateOneImage, type ImageEngineConfig } from '../generateImage';
import {
    type LogoSkillConfig,
    LOGO_BRAND_OUTPUTS,
    type LogoBrandOutputSpec,
    buildLogoPrompt,
    buildLogoBrandPrompt,
} from '../../skills/logo';

export type BrandKitAsset = ImageElement;

export async function runLogoBrandKitPipeline({
    sourceElement,
    content,
    brief,
    engine,
    nextZIndex,
    onToast,
    onAsset,
}: {
    sourceElement: NoteElement | TextElement;
    content: string;
    brief: LogoSkillConfig;
    engine: ImageEngineConfig;
    nextZIndex: () => number;
    onToast: (msg: string) => void;
    onAsset: (asset: BrandKitAsset) => void;
}): Promise<{ successCount: number; total: number }> {
    // 排成一列放原便利貼右側, 固定顯示高度
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
        const newId = `brandkit_${Date.now()}_${key}`;
        const newEl: ImageElement = {
            type: 'image', id: newId, src: resultSrc,
            name: `${brief.brandName || 'Brand'}（${title}）`,
            position: { x: cursorX + w / 2, y: baseTop + h / 2 },
            width: w, height: h, rotation: 0,
            zIndex: nextZIndex(),
            groupId: null, isVisible: true, isLocked: false,
        };
        onAsset(newEl);
        cursorX += w + gap;
        return true;
    };

    const specs = LOGO_BRAND_OUTPUTS;
    const total = specs.length + 1; // 含主 Logo
    let successCount = 0;

    // ── Step 1：先獨立生成主 Logo（純文字創作，使用者最終要的標誌長相由這步決定）──
    onToast(`🎯 品牌視覺套件：主 Logo（1/${total}）...`);
    const logoAspect = brief.size || '1:1';
    const logoPrompt = buildLogoPrompt(content, brief);
    let logoSrc = '';
    try {
        logoSrc = await generateOneImage({ prompt: logoPrompt, aspectRatio: logoAspect }, engine);
    } catch (e) {
        console.warn('[logoBrandKit] 主 Logo 生成失敗', e);
    }
    if (!logoSrc) {
        onToast('❌ 主 Logo 生成失敗，品牌套件中止');
        return { successCount, total };
    }
    // Atlas 可能回傳 CDN URL，後續 img2img 需要 base64 才能當參考圖
    if (!logoSrc.startsWith('data:')) {
        try { logoSrc = await downloadImageAsBase64(logoSrc); } catch { /* 失敗則維持原樣 */ }
    }
    if (await placeAsset(logoSrc, '主 Logo', 1, 'logo')) successCount += 1;

    // ── Step 2：用選定的主 Logo 圖片當錨點，延伸生成其餘 4 個品牌資產 ──
    // 明確要求模型重用這個 EXACT 標誌，不要重新設計，確保整套套件用的是同一個 logo。
    for (let i = 0; i < specs.length; i++) {
        const spec = specs[i];
        onToast(`🎯 品牌視覺套件：${spec.title}（${i + 2}/${total}）...`);
        const prompt = buildLogoBrandPrompt(content, brief, spec, i, specs.length);
        let resultSrc = '';

        try {
            // 以主 Logo 為參考圖錨定同一標誌；Atlas 不支援 img2img 時原語自動退回純文字生成
            resultSrc = await generateOneImage(
                { prompt, aspectRatio: spec.aspectRatio, refImage: logoSrc },
                engine,
            );
        } catch (e) {
            console.warn('[logoBrandKit] 生成失敗', spec.id, e);
            onToast(`⚠️ ${spec.title} 生成失敗,略過`);
            continue;
        }

        if (!resultSrc) { onToast(`⚠️ ${spec.title} 未回傳圖片,略過`); continue; }
        if (await placeAsset(resultSrc, spec.title, spec.ratioValue, String(i))) successCount += 1;
    }

    return { successCount, total };
}

export async function runExtendBrandKitPipeline({
    sourceElement,
    logoSrc: initialLogoSrc,
    brief,
    engine,
    selectedAssetIds,
    customSeed,
    nextZIndex,
    onToast,
    onAsset,
}: {
    sourceElement: ImageElement;
    logoSrc: string;
    brief: LogoSkillConfig;
    engine: ImageEngineConfig;
    selectedAssetIds?: string[];
    customSeed?: number;
    nextZIndex: () => number;
    onToast: (msg: string) => void;
    onAsset: (asset: BrandKitAsset) => void;
}): Promise<{ successCount: number; total: number }> {
    let logoSrc = initialLogoSrc;

    // 排成一列放原 Logo 圖片右側, 固定顯示高度
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
        const newId = `brandkit_${Date.now()}_${key}`;
        const newEl: ImageElement = {
            type: 'image', id: newId, src: resultSrc,
            name: `${brief.brandName || 'Brand'}（${title}）`,
            position: { x: cursorX + w / 2, y: baseTop + h / 2 },
            width: w, height: h, rotation: 0,
            zIndex: nextZIndex(),
            groupId: null, isVisible: true, isLocked: false,
        };
        onAsset(newEl);
        cursorX += w + gap;
        return true;
    };

    const allSpecs = LOGO_BRAND_OUTPUTS;
    const baseSpecs = selectedAssetIds
        ? allSpecs.filter(s => selectedAssetIds.includes(s.id))
        : allSpecs;

    // 支援自訂品牌資產動態生成
    const customSpecs: LogoBrandOutputSpec[] = (brief.customAssets || []).map((title, idx) => {
        return {
            id: `custom_asset_${idx}_${Date.now()}`,
            title: `自訂：${title}`,
            aspectRatio: '4:3', // 預設使用 4:3 萬能樣機比例
            ratioValue: 4 / 3,
            note: `使用者自訂品牌應用 Mockup：${title}`,
            guidance: [
                `Generate a professional photo-studio quality mockup featuring a ${title} as the main subject.`,
                `The approved logo from the reference image and the brand name "${brief.brandName}" must be clearly printed, embossed, or styled on the surface of the ${title} in a realistic way.`,
                `Ensure clean studio background, realistic material texture (e.g., paper, fabric, ceramic, glass, or plastic), professional lighting, and perfect placement.`
            ]
        };
    });

    const specs = [...baseSpecs, ...customSpecs];
    const total = specs.length;
    if (total === 0) { onToast('⚠️ 未選取或輸入任何品牌資產'); return { successCount: 0, total }; }
    let successCount = 0;

    // Atlas 可能回傳 CDN URL，後續 img2img 需要 base64 才能當參考圖
    if (!logoSrc.startsWith('data:')) {
        try { logoSrc = await downloadImageAsBase64(logoSrc); } catch { /* 失敗則維持原樣 */ }
    }

    // ── 用選定的主 Logo 圖片當錨點，延伸生成其餘選定的品牌資產 ──
    for (let i = 0; i < specs.length; i++) {
        const spec = specs[i];
        onToast(`🎯 品牌視覺套件：${spec.title}（${i + 1}/${total}）...`);
        const prompt = buildLogoBrandPrompt('', brief, spec, i, specs.length);
        let resultSrc = '';

        try {
            // 以主 Logo 為參考圖錨定同一標誌；Atlas 不支援 img2img 時原語自動退回純文字生成
            resultSrc = await generateOneImage(
                { prompt, aspectRatio: spec.aspectRatio, refImage: logoSrc, seed: customSeed },
                engine,
            );
        } catch (e) {
            console.warn('[logoBrandKit] 延伸生成失敗', spec.id, e);
            onToast(`⚠️ ${spec.title} 生成失敗,略過`);
            continue;
        }

        if (!resultSrc) { onToast(`⚠️ ${spec.title} 未回傳圖片,略過`); continue; }
        if (await placeAsset(resultSrc, spec.title, spec.ratioValue, String(i))) successCount += 1;
    }

    return { successCount, total };
}
