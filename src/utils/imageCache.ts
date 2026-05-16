/**
 * IndexedDB image cache for Atlas-generated images.
 * Prevents broken images after page reload when Atlas CDN URLs expire.
 * Key: element ID, Value: base64 data URL string
 */
import { get, set, del } from 'idb-keyval';

const PREFIX = 'yohaku_img_';

export const cacheImage = async (elementId: string, base64: string): Promise<void> => {
    try {
        await set(PREFIX + elementId, base64);
    } catch (e) {
        console.warn('[ImageCache] Failed to cache image:', e);
    }
};

export const getCachedImage = async (elementId: string): Promise<string | undefined> => {
    try {
        return await get<string>(PREFIX + elementId);
    } catch {
        return undefined;
    }
};

export const deleteCachedImage = async (elementId: string): Promise<void> => {
    try {
        await del(PREFIX + elementId);
    } catch { /* silent */ }
};
