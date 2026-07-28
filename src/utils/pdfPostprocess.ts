import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRef } from 'pdf-lib';

const FONT_FILE_KEYS = [
    PDFName.of('FontFile'),
    PDFName.of('FontFile2'),
    PDFName.of('FontFile3'),
];

/**
 * Keep the PDF text objects, metrics and ToUnicode maps, but remove embedded
 * font programs. Illustrator can then ask the user to replace the missing
 * typeface while preserving the text content as text.
 */
export async function removeEmbeddedFontPrograms(
    input: ArrayBuffer,
): Promise<Uint8Array> {
    const document = await PDFDocument.load(input);
    const context = document.context;

    for (const page of document.getPages()) {
        const resources = page.node.Resources();
        const fonts = resources?.lookupMaybe(PDFName.of('Font'), PDFDict);
        if (!fonts) continue;

        for (const [, fontValue] of fonts.entries()) {
            const font = context.lookup(fontValue, PDFDict);
            const descendants = font.lookupMaybe(PDFName.of('DescendantFonts'), PDFArray);
            if (!descendants || descendants.size() === 0) continue;
            const descendant = descendants.lookup(0, PDFDict);
            const descriptor = descendant.lookupMaybe(PDFName.of('FontDescriptor'), PDFDict);
            if (!descriptor) continue;

            for (const key of FONT_FILE_KEYS) {
                const fontFile = descriptor.get(key);
                descriptor.delete(key);
                if (fontFile instanceof PDFRef) context.delete(fontFile);
            }
        }
    }

    return document.save({
        addDefaultPage: false,
        useObjectStreams: false,
    });
}
