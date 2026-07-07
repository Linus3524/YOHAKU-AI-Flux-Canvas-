// 畫布持久化（拆分版）：把元素內的大型 base64 欄位（image/drawing 的 src、
// note 的 referenceImages）拆到獨立的 IndexedDB key，元素 JSON 只留輕量 metadata。
//
// 動機：舊版每次存檔 = JSON.stringify(全部元素含所有圖片 base64)，在主執行緒同步執行，
// 圖多時一次凍結數百 ms（拖曳放開後 1 秒的頓挫感來源）。拆分後：
//   - meta JSON 只剩幾 KB，stringify 幾乎零成本
//   - 圖片 payload 以「字串參照相等」判斷是否變更，沒變的圖完全不重寫
//
// 注意：僅用於 IndexedDB 自動存檔。匯出/匯入 .json 檔案仍走完整資料（不受影響）。
import type { CanvasElement } from '../types';

const PAYLOAD_MARKER = '__IDB_PAYLOAD__:';
const PAYLOAD_PREFIX = 'yohaku_payload:';
const MIN_EXTRACT_LENGTH = 2048; // 小於此長度的 data: 字串不值得拆

const isBigData = (v: unknown): v is string =>
    typeof v === 'string' && v.startsWith('data:') && v.length >= MIN_EXTRACT_LENGTH;

// 已寫入 IDB 的 payload 快取：key → 字串參照（同參照 = 內容沒變 = 免重寫）
const writtenPayloads = new Map<string, string>();

/** meta JSON 是否含拆分標記（供舊版 localStorage 遷移路徑判斷） */
export const hasPayloadMarkers = (json: string): boolean => json.includes(PAYLOAD_MARKER);

/**
 * 存檔：payload 增量寫入 + 輕量 meta JSON。
 * 回傳 meta JSON 字串（呼叫端可用來做「內容沒變就跳過」比對）。
 */
export async function persistCanvasSplit(metaKey: string, elements: CanvasElement[]): Promise<string> {
    const { set, del, keys } = await import('idb-keyval');
    const payloadWrites: Promise<void>[] = [];
    const liveKeys = new Set<string>();

    const queueWrite = (key: string, value: string) => {
        liveKeys.add(key);
        if (writtenPayloads.get(key) === value) return; // 同參照/同內容 → 免重寫
        payloadWrites.push(set(key, value).then(() => { writtenPayloads.set(key, value); }));
    };

    const lightElements = elements.map(el => {
        let out: any = el;
        const src = (el as any).src;
        if (isBigData(src)) {
            const key = `${PAYLOAD_PREFIX}${el.id}:src`;
            queueWrite(key, src);
            out = { ...el, src: PAYLOAD_MARKER + key };
        }
        const refs = (el as any).referenceImages;
        if (Array.isArray(refs) && refs.some(isBigData)) {
            if (out === el) out = { ...el };
            out.referenceImages = refs.map((r: unknown, i: number) => {
                if (!isBigData(r)) return r;
                const key = `${PAYLOAD_PREFIX}${el.id}:ref${i}`;
                queueWrite(key, r);
                return PAYLOAD_MARKER + key;
            });
        }
        return out as CanvasElement;
    });

    const json = JSON.stringify(lightElements);
    await Promise.all(payloadWrites);
    await set(metaKey, json);

    // 清掉孤兒 payload（元素已刪除/圖已替換）：非同步進行，失敗不影響存檔
    (async () => {
        try {
            const allKeys = await keys();
            const orphans = allKeys.filter(k => typeof k === 'string' && k.startsWith(PAYLOAD_PREFIX) && !liveKeys.has(k));
            await Promise.all(orphans.map(k => del(k).then(() => { writtenPayloads.delete(k as string); })));
        } catch {}
    })();

    return json;
}

/** 把含標記的輕量元素還原成完整元素（payload 從 IDB 取回） */
export async function resolveLightElements(parsed: CanvasElement[]): Promise<CanvasElement[]> {
    const markerKeys = new Set<string>();
    for (const el of parsed) {
        const src = (el as any).src;
        if (typeof src === 'string' && src.startsWith(PAYLOAD_MARKER)) markerKeys.add(src.slice(PAYLOAD_MARKER.length));
        const refs = (el as any).referenceImages;
        if (Array.isArray(refs)) {
            for (const r of refs) {
                if (typeof r === 'string' && r.startsWith(PAYLOAD_MARKER)) markerKeys.add(r.slice(PAYLOAD_MARKER.length));
            }
        }
    }
    if (markerKeys.size === 0) return parsed; // 舊版完整 JSON，直接用

    const { getMany } = await import('idb-keyval');
    const keyList = Array.from(markerKeys);
    const values = await getMany<string>(keyList);
    const payloadMap = new Map<string, string>();
    keyList.forEach((k, i) => {
        const v = values[i];
        if (typeof v === 'string') {
            payloadMap.set(k, v);
            writtenPayloads.set(k, v); // 預熱快取：載入後第一次存檔不會全部重寫
        }
    });

    const restore = (v: unknown): unknown => {
        if (typeof v === 'string' && v.startsWith(PAYLOAD_MARKER)) {
            return payloadMap.get(v.slice(PAYLOAD_MARKER.length)) ?? ''; // payload 遺失 → 空字串（不讓 app 崩潰）
        }
        return v;
    };

    return parsed.map(el => {
        let out: any = el;
        const src = (el as any).src;
        if (typeof src === 'string' && src.startsWith(PAYLOAD_MARKER)) {
            out = { ...el, src: restore(src) };
        }
        const refs = (el as any).referenceImages;
        if (Array.isArray(refs) && refs.some(r => typeof r === 'string' && r.startsWith(PAYLOAD_MARKER))) {
            if (out === el) out = { ...el };
            out.referenceImages = refs.map(restore);
        }
        return out as CanvasElement;
    });
}
