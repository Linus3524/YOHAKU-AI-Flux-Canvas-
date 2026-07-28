/**
 * svgCapture.ts
 *
 * Captures a text element's live SVG DOM node and converts it to a PNG data URL.
 * Embeds only the font subsets needed for the actual text content so CJK fonts
 * (which have 100+ unicode-range subsets) don't require fetching the entire font.
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

async function blobToDataURL(blob: Blob): Promise<string> {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    });
}

/** Replace all url(...) references inside a CSS string with base64 data URLs. */
async function embedURLsInCSS(css: string): Promise<string> {
    const matches: Array<{ original: string; url: string }> = [];
    const pat = /url\(['"]?([^'")\s]+)['"]?\)/g;
    let m: RegExpExecArray | null;
    while ((m = pat.exec(css)) !== null) {
        if (!m[1].startsWith('data:')) {
            matches.push({ original: m[0], url: m[1] });
        }
    }

    // Sequential (not Promise.all) to avoid race condition on `result` string
    let result = css;
    for (const { original, url } of matches) {
        try {
            const resp = await fetch(url);
            const blob = await resp.blob();
            const dataUrl = await blobToDataURL(blob);
            result = result.split(original).join(`url('${dataUrl}')`);
        } catch {
            // Network/CORS failure — keep original URL
        }
    }
    return result;
}

/**
 * Check whether any character in `text` falls inside a CSS unicode-range string.
 * Used to skip font subsets that the text doesn't need.
 */
function textUsesUnicodeRange(text: string, unicodeRange: string): boolean {
    const chars = [...text]; // split by code point, not JS char
    const rangeTokens = unicodeRange.match(/U\+[0-9A-Fa-f?]+(?:-[0-9A-Fa-f]+)?/g) ?? [];

    for (const token of rangeTokens) {
        const parts = token.slice(2).split('-');
        // Support wildcard '?' → replace with 0/F for start/end
        const startHex = parts[0].replace(/\?/g, '0');
        const endHex   = parts[1] ? parts[1] : parts[0].replace(/\?/g, 'F');
        const start = parseInt(startHex, 16);
        const end   = parseInt(endHex,   16);

        for (const char of chars) {
            const cp = char.codePointAt(0) ?? 0;
            if (cp >= start && cp <= end) return true;
        }
    }
    return false;
}

// ── Font embedding cache ──────────────────────────────────────────────────────

/**
 * Cache keyed by `"fontFamily|||textContent"` (per-text-content to allow subset filtering).
 * Cleared entries would waste memory but this is fine for a session.
 */
const fontCSSCache = new Map<string, string>();

/**
 * Build @font-face CSS for `fontFamily`, embedding only the font files
 * needed to render `textContent`.  Results are cached.
 */
export async function getEmbeddedFontCSS(fontFamily: string, textContent: string): Promise<string> {
    const cacheKey = `${fontFamily.toLowerCase()}|||${textContent}`;
    if (fontCSSCache.has(cacheKey)) return fontCSSCache.get(cacheKey)!;

    // Extract primary font name from full font stack (e.g. '"Chiron GoRound TC", sans-serif' → 'chiron goround tc')
    const familyKey = fontFamily.split(',')[0].replace(/['"]/g, '').toLowerCase().trim();
    const collected: string[] = [];

    const extractBlocks = async (css: string) => {
        // Match complete @font-face blocks (multiline)
        const blocks = css.match(/@font-face\s*\{[^}]+\}/gs) ?? [];
        for (const block of blocks) {
            // Only process blocks for our font family
            const famMatch = block.match(/font-family\s*:\s*['"]?([^;'"]+)['"]?/i);
            if (!famMatch) continue;
            if (famMatch[1].trim().toLowerCase() !== familyKey) continue;

            // If the block has unicode-range, skip subsets not needed by this text
            const urMatch = block.match(/unicode-range\s*:\s*([^;]+)/i);
            if (urMatch && !textUsesUnicodeRange(textContent, urMatch[1].trim())) continue;

            collected.push(await embedURLsInCSS(block));
        }
    };

    for (const sheet of Array.from(document.styleSheets)) {
        try {
            // Same-origin: cssRules accessible directly
            const rules = Array.from(sheet.cssRules ?? []);
            for (const rule of rules) {
                if (!(rule instanceof CSSFontFaceRule)) continue;
                const family = rule.style
                    .getPropertyValue('font-family')
                    .replace(/['"]/g, '')
                    .toLowerCase()
                    .trim();
                if (family !== familyKey) continue;

                const urProp = rule.style.getPropertyValue('unicode-range');
                if (urProp && !textUsesUnicodeRange(textContent, urProp.trim())) continue;

                collected.push(await embedURLsInCSS(rule.cssText));
            }
        } catch {
            // Cross-origin stylesheet — fetch CSS text directly (Google Fonts, jsDelivr, etc.)
            const href = (sheet as CSSStyleSheet).href;
            if (!href) continue;
            try {
                const css = await (await fetch(href)).text();
                await extractBlocks(css);
            } catch {
                // Network failure — skip
            }
        }
    }

    const result = collected.join('\n');
    fontCSSCache.set(cacheKey, result);
    return result;
}

// ── Main capture function ─────────────────────────────────────────────────────

async function svgToCanvas(
    svg: SVGElement,
    totalW: number,
    totalH: number,
    scale: number,
): Promise<HTMLCanvasElement> {
    const svgString = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(totalW * scale);
    canvas.height = Math.ceil(totalH * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        URL.revokeObjectURL(url);
        throw new Error('Unable to create SVG capture canvas');
    }
    ctx.scale(scale, scale);

    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = url;
        });
        ctx.drawImage(img, 0, 0, totalW, totalH);
        return canvas;
    } finally {
        URL.revokeObjectURL(url);
    }
}

async function cloneTextSvg(
    elementId: string,
    worldWidth: number,
    worldHeight: number,
    effectPadding: number,
    fontFamily?: string,
    textContent?: string,
): Promise<SVGElement> {
    await document.fonts.ready;

    const container = document.querySelector(`[data-element-id="${elementId}"]`);
    if (!container) throw new Error(`Element ${elementId} not found in DOM`);

    const svgEl = container.querySelector('svg');
    if (!svgEl) throw new Error(`No SVG found for element ${elementId}`);

    const cloned = svgEl.cloneNode(true) as SVGElement;
    const totalW = worldWidth + effectPadding * 2;
    const totalH = worldHeight + effectPadding * 2;

    cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    cloned.setAttribute('width', String(totalW));
    cloned.setAttribute('height', String(totalH));
    cloned.setAttribute('viewBox', `-${effectPadding} -${effectPadding} ${totalW} ${totalH}`);
    cloned.setAttribute('overflow', 'visible');

    if (fontFamily && textContent) {
        const fontCSS = await getEmbeddedFontCSS(fontFamily, textContent);
        if (fontCSS) {
            let defs = cloned.querySelector('defs');
            if (!defs) {
                defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                cloned.insertBefore(defs, cloned.firstChild);
            }
            const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
            style.textContent = fontCSS;
            defs.insertBefore(style, defs.firstChild);
        }
    }

    return cloned;
}

/**
 * Capture the live SVG for a text element and return a PNG data URL.
 *
 * @param elementId      Element ID (must match data-element-id in the DOM)
 * @param worldWidth     Element width in world units
 * @param worldHeight    Element height in world units
 * @param effectPadding  Extra padding for shadow/glow overflow (world units)
 * @param scale          Pixel density multiplier (e.g. 3 for retina export)
 * @param backgroundColor Optional solid fill behind the text
 * @param fontFamily     Font family used by this element
 * @param textContent    Actual text string (used to select needed unicode subsets)
 */
export async function captureTextElementAsImage(
    elementId: string,
    worldWidth: number,
    worldHeight: number,
    effectPadding: number,
    scale: number,
    backgroundColor?: string,
    fontFamily?: string,
    textContent?: string
): Promise<string> {
    const totalW = worldWidth  + effectPadding * 2;
    const totalH = worldHeight + effectPadding * 2;
    const cloned = await cloneTextSvg(
        elementId,
        worldWidth,
        worldHeight,
        effectPadding,
        fontFamily,
        textContent,
    );
    const canvas = await svgToCanvas(cloned, totalW, totalH, scale);
    const ctx = canvas.getContext('2d')!;

    if (backgroundColor && backgroundColor !== 'transparent') {
        const content = document.createElement('canvas');
        content.width = canvas.width;
        content.height = canvas.height;
        const contentCtx = content.getContext('2d')!;
        contentCtx.drawImage(canvas, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(effectPadding, effectPadding, worldWidth, worldHeight);
        ctx.drawImage(content, 0, 0, totalW, totalH);
    }

    return canvas.toDataURL('image/png');
}

/**
 * Capture only the pixels produced by text shadow/glow filters.
 * The source glyphs are removed so a live-text or outline layer can sit above
 * the raster effect without leaving a duplicate copy of the original text.
 */
export async function captureTextElementEffectsAsImage(
    elementId: string,
    worldWidth: number,
    worldHeight: number,
    effectPadding: number,
    scale: number,
    fontFamily?: string,
    textContent?: string,
): Promise<string> {
    const totalW = worldWidth + effectPadding * 2;
    const totalH = worldHeight + effectPadding * 2;
    const fullSvg = await cloneTextSvg(
        elementId,
        worldWidth,
        worldHeight,
        effectPadding,
        fontFamily,
        textContent,
    );
    const baseSvg = fullSvg.cloneNode(true) as SVGElement;

    // The filtered group contains SourceGraphic + shadow/glow. Removing it
    // leaves the normal stroke/fill passes, which become the subtraction mask.
    baseSvg.querySelectorAll('[filter]').forEach(node => node.remove());

    const [fullCanvas, baseCanvas] = await Promise.all([
        svgToCanvas(fullSvg, totalW, totalH, scale),
        svgToCanvas(baseSvg, totalW, totalH, scale),
    ]);
    const ctx = fullCanvas.getContext('2d');
    if (!ctx) throw new Error('Unable to create text effect canvas');
    ctx.globalCompositeOperation = 'destination-out';
    // A single alpha subtraction leaves a dark anti-aliased fringe because
    // SourceGraphic and the unfiltered pass overlap with fractional alpha.
    // Erase a tiny expanded mask so the raster layer contains only the effect,
    // never a second copy of the glyph beneath editable/outlined text.
    const eraseRadius = Math.max(1, Math.ceil(scale));
    for (let y = -eraseRadius; y <= eraseRadius; y++) {
        for (let x = -eraseRadius; x <= eraseRadius; x++) {
            ctx.drawImage(baseCanvas, x, y);
        }
    }
    ctx.globalCompositeOperation = 'source-over';

    return fullCanvas.toDataURL('image/png');
}
