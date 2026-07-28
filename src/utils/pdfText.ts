import type { Font, PathCommand } from 'opentype.js';
import * as opentype from 'opentype.js';
import type { jsPDF } from 'jspdf';
import type { ArtboardElement, TextElement } from '../types';
import { loadImage } from './helpers';
import { rasterizeTextEffects, rasterizeTextElement } from './textRasterize';

const PX_TO_PT = 0.75;
export type PdfTextMode = 'editable-text' | 'outlines';

const GOOGLE_FONT_FAMILIES = new Set([
    'Noto Sans TC',
    'Chiron GoRound TC',
    'Noto Serif TC',
    'Shippori Mincho',
    'DotGothic16',
    'LINE Seed JP',
    'Kaisei Opti',
    'Zen Maru Gothic',
    'M PLUS Rounded 1c',
    'Klee One',
    'Hachi Maru Pop',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Varela Round',
    'Nunito',
    'Playfair Display',
    'Merriweather',
    'Cinzel',
    'Great Vibes',
    'Dancing Script',
]);

const DIRECT_TTF_SOURCES: Record<string, string> = {
    'LXGW WenKai TC': 'https://raw.githubusercontent.com/lxgw/LxgwWenKai/main/fonts/TTF/LXGWWenKai-Regular.ttf',
    'Iansui': 'https://cdn.jsdelivr.net/gh/ButTaiwan/iansui@latest/fonts/ttf/Iansui-Regular.ttf',
    'Cubic 11': 'https://raw.githubusercontent.com/ACh-K/Cubic-11/main/fonts/ttf/Cubic_11.ttf',
};

interface FontResource {
    bytes: Uint8Array;
    font: Font;
}

interface RegisteredFontResource extends FontResource {
    pdfName: string;
}

interface Matrix2D {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
}

interface LiveGlyph {
    char: string;
    node: SVGTextElement;
    matrix: Matrix2D;
    bbox: DOMRect;
}

const fontResourceCache = new Map<string, Promise<FontResource[]>>();
const registeredPdfFonts = new WeakMap<jsPDF, Map<string, RegisteredFontResource[]>>();

function primaryFontFamily(fontFamily: string): string {
    return fontFamily.split(',')[0].replace(/['"]/g, '').trim();
}

function uniqueCharacters(text: string): string {
    return [...new Set([...text].filter(char => char !== '\n'))].join('');
}

async function bytesFromUrl(url: string): Promise<Uint8Array> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unable to fetch PDF font (${response.status})`);
    return new Uint8Array(await response.arrayBuffer());
}

function pdfFontEndpoint(
    family: string,
    weight: number,
    italic: boolean,
    text: string,
): string {
    const params = new URLSearchParams({
        family,
        weight: String(weight),
        italic: italic ? '1' : '0',
        text,
    });
    return `/api/pdf-font?${params.toString()}`;
}

async function loadFontResources(element: TextElement): Promise<FontResource[]> {
    const family = primaryFontFamily(element.fontFamily);
    const weight = element.isBold ? 700 : 400;
    const italic = !!element.isItalic;
    const text = uniqueCharacters(element.text) || ' ';
    const cacheKey = `${family}|${weight}|${italic ? 'italic' : 'normal'}|${text}`;

    if (!fontResourceCache.has(cacheKey)) {
        fontResourceCache.set(cacheKey, (async () => {
            const resources: FontResource[] = [];
            const source = GOOGLE_FONT_FAMILIES.has(family)
                ? pdfFontEndpoint(family, weight, italic, text)
                : DIRECT_TTF_SOURCES[family];
            if (!source) return resources;

            try {
                const bytes = await bytesFromUrl(source);
                const buffer = bytes.buffer.slice(
                    bytes.byteOffset,
                    bytes.byteOffset + bytes.byteLength,
                ) as ArrayBuffer;
                resources.push({
                    bytes,
                    font: opentype.parse(buffer),
                });
            } catch (error) {
                console.warn(`Skipping unusable PDF font source for ${family}.`, error);
            }
            return resources;
        })());
    }

    return fontResourceCache.get(cacheKey)!;
}

function bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}

async function registerFonts(pdf: jsPDF, element: TextElement): Promise<RegisteredFontResource[]> {
    const family = primaryFontFamily(element.fontFamily);
    const weight = element.isBold ? 700 : 400;
    const italic = !!element.isItalic;
    const text = uniqueCharacters(element.text) || ' ';
    const cacheKey = `${family}|${weight}|${italic ? 'italic' : 'normal'}|${text}`;
    let pdfCache = registeredPdfFonts.get(pdf);
    if (!pdfCache) {
        pdfCache = new Map();
        registeredPdfFonts.set(pdf, pdfCache);
    }
    if (pdfCache.has(cacheKey)) return pdfCache.get(cacheKey)!;

    const resources = await loadFontResources(element);
    const registered: RegisteredFontResource[] = [];

    resources.forEach((resource, index) => {
        const safeFamily = family.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'WebFont';
        const suffix = `${pdfCache!.size}-${index}`;
        const fileName = `${safeFamily}-${suffix}.ttf`;
        const pdfName = `YOHAKU-${safeFamily}-${suffix}`;
        try {
            pdf.addFileToVFS(fileName, bytesToBase64(resource.bytes));
            pdf.addFont(fileName, pdfName, 'normal', 400, 'Identity-H');
            registered.push({ ...resource, pdfName });
        } catch (error) {
            console.warn(`Unable to embed ${family} in PDF.`, error);
        }
    });

    pdfCache.set(cacheKey, registered);
    return registered;
}

function fontForCharacter(
    resources: RegisteredFontResource[],
    char: string,
): RegisteredFontResource | undefined {
    if (/\s/u.test(char)) return resources[0];
    return resources.find(resource => resource.font.charToGlyphIndex(char) !== 0);
}

function ownTransform(node: SVGTextElement): Matrix2D {
    const matrix = node.transform.baseVal.consolidate()?.matrix;
    return matrix
        ? { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d, e: matrix.e, f: matrix.f }
        : { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
}

function collectLiveGlyphs(element: TextElement): LiveGlyph[] {
    const container = document.querySelector(`[data-element-id="${element.id}"]`);
    const svg = container?.querySelector('svg');
    if (!svg) return [];

    return [...svg.querySelectorAll('text')]
        .filter(node =>
            !node.closest('[filter]') &&
            node.getAttribute('fill') !== 'none' &&
            (node.getAttribute('stroke') === 'none' || !node.getAttribute('stroke'))
        )
        .map(node => ({
            char: node.textContent ?? '',
            node,
            matrix: ownTransform(node),
            bbox: node.getBBox(),
        }))
        .filter(glyph => glyph.char.length > 0);
}

function applyMatrix(point: { x: number; y: number }, matrix: Matrix2D): { x: number; y: number } {
    return {
        x: matrix.a * point.x + matrix.c * point.y + matrix.e,
        y: matrix.b * point.x + matrix.d * point.y + matrix.f,
    };
}

function localToPdf(
    element: TextElement,
    artboard: ArtboardElement,
    point: { x: number; y: number },
): { x: number; y: number } {
    const radians = element.rotation * Math.PI / 180;
    const dx = point.x - element.width / 2;
    const dy = point.y - element.height / 2;
    const rotatedX = dx * Math.cos(radians) - dy * Math.sin(radians);
    const rotatedY = dx * Math.sin(radians) + dy * Math.cos(radians);
    const artboardLeft = artboard.position.x - artboard.width / 2;
    const artboardTop = artboard.position.y - artboard.height / 2;
    return {
        x: (element.position.x - artboardLeft + rotatedX) * PX_TO_PT,
        y: (element.position.y - artboardTop + rotatedY) * PX_TO_PT,
    };
}

function parseColor(color: string | undefined, fallback: string): string {
    if (!color || color === 'transparent') return fallback;
    return color;
}

function drawElementBackground(pdf: jsPDF, element: TextElement, artboard: ArtboardElement): void {
    if (!element.backgroundColor || element.backgroundColor === 'transparent') return;
    const corners = [
        { x: 0, y: 0 },
        { x: element.width, y: 0 },
        { x: element.width, y: element.height },
        { x: 0, y: element.height },
    ].map(point => localToPdf(element, artboard, point));
    pdf.setFillColor(element.backgroundColor);
    pdf.path([
        { op: 'm', c: [corners[0].x, corners[0].y] },
        { op: 'l', c: [corners[1].x, corners[1].y] },
        { op: 'l', c: [corners[2].x, corners[2].y] },
        { op: 'l', c: [corners[3].x, corners[3].y] },
        { op: 'h', c: [] },
    ], 'F');
}

async function rotateRaster(
    dataUrl: string,
    width: number,
    height: number,
    rotation: number,
): Promise<{ dataUrl: string; width: number; height: number }> {
    if (Math.abs(rotation) < 0.01) return { dataUrl, width, height };
    const radians = rotation * Math.PI / 180;
    const rotatedWidth = Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians));
    const rotatedHeight = Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians));
    const image = await loadImage(dataUrl);
    const scale = Math.max(1, image.naturalWidth / width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(rotatedWidth * scale);
    canvas.height = Math.ceil(rotatedHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to rotate PDF text raster');
    context.scale(scale, scale);
    context.translate(rotatedWidth / 2, rotatedHeight / 2);
    context.rotate(radians);
    context.drawImage(image, -width / 2, -height / 2, width, height);
    return {
        dataUrl: canvas.toDataURL('image/png'),
        width: rotatedWidth,
        height: rotatedHeight,
    };
}

async function addLocalRaster(
    pdf: jsPDF,
    element: TextElement,
    artboard: ArtboardElement,
    raster: { dataUrl: string; width: number; height: number },
): Promise<void> {
    const rotated = await rotateRaster(raster.dataUrl, raster.width, raster.height, element.rotation);
    const artboardLeft = artboard.position.x - artboard.width / 2;
    const artboardTop = artboard.position.y - artboard.height / 2;
    const centerX = element.position.x - artboardLeft;
    const centerY = element.position.y - artboardTop;
    pdf.addImage(
        rotated.dataUrl,
        'PNG',
        (centerX - rotated.width / 2) * PX_TO_PT,
        (centerY - rotated.height / 2) * PX_TO_PT,
        rotated.width * PX_TO_PT,
        rotated.height * PX_TO_PT,
        undefined,
        'FAST',
    );
}

function applyElementOpacity(pdf: jsPDF, opacity: number | undefined): void {
    const alpha = Math.max(0, Math.min(1, opacity ?? 1));
    if (alpha >= 0.999) return;
    const PdfGState = (pdf as unknown as { GState: new (options: Record<string, number>) => unknown }).GState;
    pdf.setGState(new PdfGState({ opacity: alpha, 'stroke-opacity': alpha }));
}

function drawLiveText(
    pdf: jsPDF,
    element: TextElement,
    artboard: ArtboardElement,
    glyphs: LiveGlyph[],
    fonts: RegisteredFontResource[],
): boolean {
    if (glyphs.length === 0) return false;
    if (glyphs.some(glyph => !fontForCharacter(fonts, glyph.char))) return false;

    pdf.setTextColor(parseColor(element.color, '#1D1D1F'));
    pdf.setDrawColor(parseColor(element.strokeColor, element.color));
    pdf.setLineWidth((element.strokeWidth || 0) * PX_TO_PT);

    for (const glyph of glyphs) {
        const font = fontForCharacter(fonts, glyph.char)!;
        const x = Number(glyph.node.getAttribute('x') || 0);
        const y = Number(glyph.node.getAttribute('y') || 0);
        const transformed = applyMatrix({ x, y }, glyph.matrix);
        const point = localToPdf(element, artboard, transformed);
        const glyphRotation = Math.atan2(glyph.matrix.b, glyph.matrix.a) * 180 / Math.PI;
        pdf.setFont(font.pdfName, 'normal');
        pdf.setFontSize(element.fontSize * PX_TO_PT);
        pdf.text(glyph.char, point.x, point.y, {
            baseline: 'middle',
            angle: element.rotation + glyphRotation,
            renderingMode: (element.strokeWidth || 0) > 0 && element.strokeColor
                ? 'fillThenStroke'
                : 'fill',
        });
    }
    return true;
}

function transformPathPoint(
    element: TextElement,
    artboard: ArtboardElement,
    matrix: Matrix2D,
    point: { x: number; y: number },
): { x: number; y: number } {
    return localToPdf(element, artboard, applyMatrix(point, matrix));
}

function outlineCommands(
    commands: PathCommand[],
    element: TextElement,
    artboard: ArtboardElement,
    matrix: Matrix2D,
    scaleX: number,
    scaleY: number,
    translateX: number,
    translateY: number,
): Array<{ op: string; c: number[] }> {
    const result: Array<{ op: string; c: number[] }> = [];
    let current = { x: 0, y: 0 };
    const map = (x: number, y: number) => transformPathPoint(element, artboard, matrix, {
        x: x * scaleX + translateX,
        y: y * scaleY + translateY,
    });

    for (const command of commands) {
        if (command.type === 'M') {
            const point = map(command.x, command.y);
            result.push({ op: 'm', c: [point.x, point.y] });
            current = { x: command.x, y: command.y };
        } else if (command.type === 'L') {
            const point = map(command.x, command.y);
            result.push({ op: 'l', c: [point.x, point.y] });
            current = { x: command.x, y: command.y };
        } else if (command.type === 'C') {
            const first = map(command.x1, command.y1);
            const second = map(command.x2, command.y2);
            const point = map(command.x, command.y);
            result.push({ op: 'c', c: [first.x, first.y, second.x, second.y, point.x, point.y] });
            current = { x: command.x, y: command.y };
        } else if (command.type === 'Q') {
            const c1 = {
                x: current.x + (2 / 3) * (command.x1 - current.x),
                y: current.y + (2 / 3) * (command.y1 - current.y),
            };
            const c2 = {
                x: command.x + (2 / 3) * (command.x1 - command.x),
                y: command.y + (2 / 3) * (command.y1 - command.y),
            };
            const first = map(c1.x, c1.y);
            const second = map(c2.x, c2.y);
            const point = map(command.x, command.y);
            result.push({ op: 'c', c: [first.x, first.y, second.x, second.y, point.x, point.y] });
            current = { x: command.x, y: command.y };
        } else if (command.type === 'Z') {
            result.push({ op: 'h', c: [] });
        }
    }
    return result;
}

function drawOutlinedText(
    pdf: jsPDF,
    element: TextElement,
    artboard: ArtboardElement,
    glyphs: LiveGlyph[],
    fonts: RegisteredFontResource[],
): boolean {
    if (glyphs.length === 0) return false;
    if (glyphs.some(glyph => !fontForCharacter(fonts, glyph.char))) return false;

    pdf.setFillColor(parseColor(element.color, '#1D1D1F'));
    pdf.setDrawColor(parseColor(element.strokeColor, element.color));
    pdf.setLineWidth((element.strokeWidth || 0) * PX_TO_PT);
    const style = (element.strokeWidth || 0) > 0 && element.strokeColor ? 'FD' : 'F';

    for (const glyph of glyphs) {
        if (/\s/u.test(glyph.char)) continue;
        const resource = fontForCharacter(fonts, glyph.char)!;
        const path = resource.font.getPath(glyph.char, 0, 0, element.fontSize);
        const pathBox = path.getBoundingBox();
        const pathWidth = Math.max(0.001, pathBox.x2 - pathBox.x1);
        const pathHeight = Math.max(0.001, pathBox.y2 - pathBox.y1);
        const scaleX = glyph.bbox.width / pathWidth;
        const scaleY = glyph.bbox.height / pathHeight;
        const translateX = glyph.bbox.x - pathBox.x1 * scaleX;
        const translateY = glyph.bbox.y - pathBox.y1 * scaleY;
        const operations = outlineCommands(
            path.commands,
            element,
            artboard,
            glyph.matrix,
            scaleX,
            scaleY,
            translateX,
            translateY,
        );
        if (operations.length > 0) pdf.path(operations, style);
    }
    return true;
}

export async function addEditableTextElementToPdf(
    pdf: jsPDF,
    element: TextElement,
    artboard: ArtboardElement,
    mode: PdfTextMode,
): Promise<'text' | 'outline' | 'raster'> {
    pdf.saveGraphicsState();
    applyElementOpacity(pdf, element.opacity);
    drawElementBackground(pdf, element, artboard);

    const effects = await rasterizeTextEffects(element, 2);
    if (effects) await addLocalRaster(pdf, element, artboard, effects);

    const glyphs = collectLiveGlyphs(element);
    const fonts = await registerFonts(pdf, element);
    const rendered = mode === 'outlines'
        ? drawOutlinedText(pdf, element, artboard, glyphs, fonts)
        : drawLiveText(pdf, element, artboard, glyphs, fonts);

    if (rendered) {
        pdf.restoreGraphicsState();
        return mode === 'outlines' ? 'outline' : 'text';
    }

    console.warn(`Text ${element.id} could not be embedded or outlined; using local raster fallback.`);
    const raster = await rasterizeTextElement(element, 2);
    await addLocalRaster(pdf, element, artboard, raster);
    pdf.restoreGraphicsState();
    return 'raster';
}
