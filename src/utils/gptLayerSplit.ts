/**
 * 魔法分層 v2.0（批次 1：架構重構）
 *
 * 核心原則：語意歸 AI、幾何歸前端、能用像素運算就不串 AI
 *
 * 流程：
 *   Gemini 偵測（bbox + category + maskStrategy）
 *   → [前端] 從「原圖」裁切物件區域（不送 GPT 重繪）
 *   → BiRefNet（PHOTO）/ Delta-E 背景減除（FLAT）→ 透明 PNG
 *   → [前端] Mask 驅動幾何：掃描真實像素邊界 → 原圖絕對座標比例
 *   → 失敗則 Hard Crop Fallback（保留原圖矩形，不讓物件消失）
 *   → 背景：Gemini 移除物件補全 → [前端] Alpha 軟遮罩合成（只貼洞，洞外保留原圖）
 */

import { GoogleGenAI } from '@google/genai';
import { compressForAtlas } from './atlasImage';
import { birefnetRemoveBg } from './geminiLayer';
import { trimTransparentPixels, LayerResult } from './falImage';

// ── 偵測結果 ─────────────────────────────────────────────────────────────────
type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

interface DetectedObject {
    label: string;
    labelEn: string;
    category: 'SUBJECT' | 'PRODUCT' | 'OBJECTS' | 'DECOR' | 'TEXT';
    edgeComplexity: 'simple' | 'complex';
    /** 萃取策略：BIREFNET（照片物件）/ COLOR_SUBTRACT（扁平色塊/純底文字） */
    maskStrategy: 'BIREFNET' | 'COLOR_SUBTRACT';
    bbox: { x: number; y: number; w: number; h: number };
    /** v2.0 語意欄位（先存不消費）*/
    layerType?: string;
    semanticRole?: string;
    /** Gemini 自評信心 0-1（推導 semanticRisk）*/
    confidence?: number;
}

type PrimaryType = 'PHOTO' | 'DESIGN_POSTER' | 'INFOGRAPHIC' | 'UI' | 'LOGO' | 'MIXED';
interface DetectResult {
    primaryType: PrimaryType;
    traits: string[];
    objects: DetectedObject[];
}

/** 把 Gemini 回傳的單筆 raw 物件正規化成 DetectedObject */
function normalizeObject(o: any): DetectedObject {
    return {
        label:    o.label ?? '物件',
        labelEn:  o.labelEn ?? 'object',
        category: ['SUBJECT', 'PRODUCT', 'OBJECTS', 'DECOR', 'TEXT'].includes(o.category) ? o.category : 'OBJECTS',
        edgeComplexity: (o.edgeComplexity === 'complex' || o.edgeComplexity === 'simple') ? o.edgeComplexity : 'simple',
        maskStrategy:   (o.maskStrategy === 'BIREFNET' || o.maskStrategy === 'COLOR_SUBTRACT') ? o.maskStrategy : 'BIREFNET',
        layerType:    o.layerType ?? o.category,
        semanticRole: o.semanticRole ?? 'UNKNOWN',
        confidence:   typeof o.confidence === 'number' ? Math.max(0, Math.min(1, o.confidence)) : 0.8,
        bbox: {
            x: Math.max(0, Math.min(1, o.bbox?.x ?? 0)),
            y: Math.max(0, Math.min(1, o.bbox?.y ?? 0)),
            w: Math.max(0.01, Math.min(1, o.bbox?.w ?? 1)),
            h: Math.max(0.01, Math.min(1, o.bbox?.h ?? 1)),
        },
    };
}

// ── withTimeout ───────────────────────────────────────────────────────────────
function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => Promise<T>): Promise<T> {
    let didTimeout = false;
    const timer = new Promise<never>((_, reject) =>
        setTimeout(() => { didTimeout = true; reject(new Error('timeout')); }, ms)
    );
    return Promise.race([promise, timer]).catch(err => {
        if (didTimeout || err.message === 'timeout') {
            console.warn(`[withTimeout] timed out after ${ms}ms, falling back`);
            return onTimeout();
        }
        throw err;
    });
}

// ── IoU 工具 ─────────────────────────────────────────────────────────────────
function iou(a: DetectedObject['bbox'], b: DetectedObject['bbox']): number {
    const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
    const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    const inter = ix * iy;
    const union = a.w * a.h + b.w * b.h - inter;
    return union > 0 ? inter / union : 0;
}

// ── 排序 + 去重 + 上限 ───────────────────────────────────────────────────────
function dedupeAndSort(objects: DetectedObject[]): DetectedObject[] {
    const PRIORITY: Record<string, number> = { SUBJECT: 0, PRODUCT: 1, TEXT: 2, OBJECTS: 3, DECOR: 4 };
    objects.sort((a, b) => (PRIORITY[a.category] ?? 5) - (PRIORITY[b.category] ?? 5));

    // 標準 IoU 去重（跨類別）
    const deduped: DetectedObject[] = [];
    for (const obj of objects) {
        const isLogo = (c: string) => c === 'TEXT' || c === 'DECOR';
        const dup = deduped.some(k => iou(k.bbox, obj.bbox) > (isLogo(k.category) && isLogo(obj.category) ? 0.25 : 0.5));
        if (!dup) deduped.push(obj);
    }

    // ── B: 同人重複層過濾 ────────────────────────────────────────────────────
    // 同 category + label 相近 + IoU > 0.4 + bbox 中心距離 < 較大 bbox 對角線 30%
    // → 保留面積最大的那個，其餘視為「同一物件被偵測多次」
    const bboxArea = (b: DetectedObject['bbox']) => b.w * b.h;
    const centerDist = (a: DetectedObject['bbox'], b: DetectedObject['bbox']) =>
        Math.sqrt(((a.x + a.w / 2) - (b.x + b.w / 2)) ** 2 + ((a.y + a.h / 2) - (b.y + b.h / 2)) ** 2);
    const labelsMatch = (a: string, b: string) => {
        const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9一-鿿]/g, '');
        return norm(a) === norm(b) || norm(a).includes(norm(b)) || norm(b).includes(norm(a));
    };

    const keepSet = new Set(deduped.map((_, i) => i));
    for (let i = 0; i < deduped.length; i++) {
        if (!keepSet.has(i)) continue;
        for (let j = i + 1; j < deduped.length; j++) {
            if (!keepSet.has(j)) continue;
            const a = deduped[i], b = deduped[j];
            if (a.category !== b.category) continue;
            const overlap = iou(a.bbox, b.bbox);
            const diag = Math.sqrt((Math.max(a.bbox.w, b.bbox.w)) ** 2 + (Math.max(a.bbox.h, b.bbox.h)) ** 2);
            const dist = centerDist(a.bbox, b.bbox);
            const isSamePerson = overlap > 0.4 && dist < diag * 0.3 && labelsMatch(a.labelEn, b.labelEn);
            if (isSamePerson) {
                // 保留面積較大的，移除較小的
                if (bboxArea(a.bbox) >= bboxArea(b.bbox)) keepSet.delete(j);
                else keepSet.delete(i);
            }
        }
    }
    const filtered = deduped.filter((_, i) => keepSet.has(i));
    return filtered.length > 10 ? filtered.slice(0, 10) : filtered;
}

// ── Composite Subject Removal ────────────────────────────────────────────────
// 移除「包含 >= 2 個獨立 SUBJECT 的父層」（男女組合、群體層）
// 規則：某 SUBJECT 的 bbox 對其他 >= 2 個 SUBJECT 的包含率 > 70%
//       → 判定為「群組垃圾層」→ 刪除，保留被包含的個別層
// 比 IoU 去重更安全：麥當勞叔叔+場景 = 只含 1 個 SUBJECT → 不刪
function removeCompositeSubjects(objects: DetectedObject[]): DetectedObject[] {
    const subjects = objects.filter(o => o.category === 'SUBJECT');
    if (subjects.length < 3) return objects; // 少於 3 個 SUBJECT，不可能有組合層

    // 包含率 = 兩 bbox 交集 / 被包含 bbox 的面積（小 bbox 有多少比例在大 bbox 裡）
    const containment = (large: DetectedObject['bbox'], small: DetectedObject['bbox']): number => {
        const ix = Math.max(0, Math.min(large.x + large.w, small.x + small.w) - Math.max(large.x, small.x));
        const iy = Math.max(0, Math.min(large.y + large.h, small.y + small.h) - Math.max(large.y, small.y));
        const inter = ix * iy;
        const smallArea = small.w * small.h;
        return smallArea > 0 ? inter / smallArea : 0;
    };

    const compositeIds = new Set<string>();
    for (const candidate of subjects) {
        // 計算此 candidate 包含了多少個「其他 SUBJECT」70% 以上
        const containedCount = subjects.filter(other => {
            if (other === candidate) return false;
            // candidate 的面積必須明顯比 other 大（1.3 倍以上）
            const areaRatio = (candidate.bbox.w * candidate.bbox.h) / (other.bbox.w * other.bbox.h);
            if (areaRatio < 1.3) return false;
            return containment(candidate.bbox, other.bbox) > 0.7;
        }).length;

        if (containedCount >= 2) {
            // 此 candidate 包含了 2 個以上的獨立人物 → 是群組垃圾層
            compositeIds.add(candidate.labelEn + '_' + JSON.stringify(candidate.bbox));
            console.info(`[magicLayer] Composite subject removed: "${candidate.label}" (contains ${containedCount} subjects)`);
        }
    }

    if (compositeIds.size === 0) return objects;
    return objects.filter(o => {
        if (o.category !== 'SUBJECT') return true;
        return !compositeIds.has(o.labelEn + '_' + JSON.stringify(o.bbox));
    });
}

// ── Gemini 偵測：contentType 分類 + role-routed discovery ─────────────────────
async function detectObjects(imageBase64: string, apiKey: string): Promise<DetectResult> {
    const ai = new GoogleGenAI({ apiKey });
    const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
    const mimeType = imageBase64.match(/data:(.*);base64/)?.[1] ?? 'image/png';

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { mimeType, data: cleanBase64 } },
                {
                    text: `You are a professional design layer segmentation AI.

━━━ STEP A: CLASSIFY THE IMAGE ━━━
primaryType (pick ONE):
- PHOTO: real photograph (people, products, scenes)
- DESIGN_POSTER: marketing poster / ad / flyer (visual + headline + logo)
- INFOGRAPHIC: charts, data, icons, numbers
- UI: app/web screen (buttons, inputs, cards)
- LOGO: single logo / brand mark
- MIXED: clearly several of the above combined
traits (0-3 tags): "PHOTO","ILLUSTRATION","LOGO_HEAVY","TEXT_HEAVY","GRADIENT_BG","FLAT_BG"

━━━ STEP B: DISCOVER LAYERS (rules depend on primaryType) ━━━
PHOTO       → find: main people / animals / products / distinct foreground objects
DESIGN_POSTER → find: hero visual/model, headline text, subhead text, logo, decorative shapes, key product
INFOGRAPHIC → find: title, each chart/graph, icon groups, big numbers, distinct content blocks
UI          → find: buttons, input fields, icons, images, text blocks, cards
LOGO        → find: the mark, the wordmark (separately if visually distinct)
MIXED       → combine the relevant rules above

━━━ INCLUSION ━━━ self-contained, meaningful alone, bounded region, clear edges.
━━━ EXCLUDE ━━━ shadows, gradients, glow/bloom, >40% plain bg fills, reflections, haze, full-image textures.
━━━ GROUPING ━━━ touching/related → ONE layer (person+chair, rider+bike, product+base, repeated small items).
━━━ COUNT ━━━ simple 2-3 / moderate 3-5 / complex 5-10. Max 10. Precise beats noisy.

━━━ PER-LAYER FIELDS ━━━
- category: SUBJECT/PRODUCT/OBJECTS/DECOR/TEXT
- layerType: SUBJECT/TEXT/LOGO/DECOR/PRODUCT
- semanticRole: HERO/HEADLINE/SUBHEAD/BRAND/BODY/ICON/DECORATION/PRODUCT
- maskStrategy: "BIREFNET" (photographic / on photo-or-gradient bg) OR "COLOR_SUBTRACT" (flat shape/logo / text on SOLID flat bg)
- edgeComplexity: "simple" or "complex" (hair/fur/glass/smoke)
- bbox: tightest rect, x,y,w,h fractions 0-1 (search range, not final geometry)
- confidence: 0-1, your certainty this is a correct independent layer

Return ONLY valid JSON, no markdown:
{"primaryType":"DESIGN_POSTER","traits":["PHOTO","TEXT_HEAVY"],"layers":[{"label":"人物","labelEn":"person","category":"SUBJECT","layerType":"SUBJECT","semanticRole":"HERO","maskStrategy":"BIREFNET","edgeComplexity":"complex","bbox":{"x":0.10,"y":0.05,"w":0.35,"h":0.85},"confidence":0.93}]}`
                }
            ]
        },
    });

    const text = response.text ?? '';
    const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    const match = stripped.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Gemini 未回傳物件偵測結果');

    let parsed: { primaryType?: string; traits?: string[]; layers?: any[] };
    try { parsed = JSON.parse(match[0]); }
    catch { throw new Error('Gemini 回傳 JSON 解析失敗'); }
    const rawLayers = parsed.layers ?? [];
    if (rawLayers.length === 0) throw new Error('Gemini 未偵測到任何物件');

    const validTypes: PrimaryType[] = ['PHOTO', 'DESIGN_POSTER', 'INFOGRAPHIC', 'UI', 'LOGO', 'MIXED'];
    const primaryType = (validTypes.includes(parsed.primaryType as PrimaryType) ? parsed.primaryType : 'MIXED') as PrimaryType;

    const objects = dedupeAndSort(rawLayers.map(normalizeObject));
    return { primaryType, traits: parsed.traits ?? [], objects };
}

// ── Verifier Pass：第二次 Gemini 校對（補漏/去重/合 Logo/該拆未拆）──────────
async function verifierPass(imageBase64: string, current: DetectedObject[], apiKey: string): Promise<DetectedObject[]> {
    try {
        const ai = new GoogleGenAI({ apiKey });
        const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
        const mimeType = imageBase64.match(/data:(.*);base64/)?.[1] ?? 'image/png';
        const summary = current.map((o, i) => ({ idx: i, label: o.labelEn, category: o.category, bbox: o.bbox }));

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: cleanBase64 } },
                    {
                        text: `Here is a first-pass layer detection on the attached image:
${JSON.stringify(summary)}

Review carefully and return CORRECTIONS ONLY as JSON (no markdown):
{
  "add":    [ /* layers that were MISSED (esp. small icons, secondary text). full layer object with bbox+category+maskStrategy+edgeComplexity */ ],
  "removeIdx": [ /* idx of duplicates or layers fully contained in another */ ],
  "splitIdx":  [ { "idx": N, "into": [ /* full layer objects, e.g. CRYSTAL and LAB as two */ ] } ]
}
Be conservative: only correct clear mistakes. If detection is already good, return empty arrays.
Layer object shape: {"label","labelEn","category","layerType","semanticRole","maskStrategy","edgeComplexity","bbox":{x,y,w,h},"confidence"}`
                    }
                ]
            },
        });
        const text = response.text ?? '';
        const m = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim().match(/\{[\s\S]*\}/);
        if (!m) return current;
        const corr = JSON.parse(m[0]) as { add?: any[]; removeIdx?: number[]; splitIdx?: { idx: number; into: any[] }[] };

        const removeSet = new Set(corr.removeIdx ?? []);
        const splitMap = new Map((corr.splitIdx ?? []).map(s => [s.idx, s.into]));
        let result: DetectedObject[] = [];
        current.forEach((obj, i) => {
            if (removeSet.has(i)) return;                              // 移除重複
            if (splitMap.has(i)) { result.push(...splitMap.get(i)!.map(normalizeObject)); return; } // 拆分
            result.push(obj);
        });
        if (corr.add?.length) result.push(...corr.add.map(normalizeObject));  // 補漏
        return dedupeAndSort(result);
    } catch (e) {
        console.warn('[verifier] failed, keeping first pass:', e);
        return current;
    }
}

// ── Gemini 背景描述（供補全 prompt 參考）──────────────────────────────────────
async function analyzeBackground(imageBase64: string, apiKey: string): Promise<string> {
    try {
        const ai = new GoogleGenAI({ apiKey });
        const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
        const mimeType = imageBase64.match(/data:(.*);base64/)?.[1] ?? 'image/png';
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: cleanBase64 } },
                    { text: `Analyze ONLY the background (ignore foreground subjects). Return JSON, no markdown:
{"scene":"...","colors":"dominant bg colors with hex","lighting":"direction/quality/temperature","texture":"surface textures","gradient":"gradient direction/colors if any"}` },
                ],
            },
        });
        const raw = response.text?.trim() ?? '';
        try {
            const p = JSON.parse(raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim());
            return [p.scene, p.colors && `Colors: ${p.colors}`, p.lighting && `Lighting: ${p.lighting}`, p.texture && `Texture: ${p.texture}`, p.gradient && `Gradient: ${p.gradient}`].filter(Boolean).join('. ');
        } catch { return raw; }
    } catch { return ''; }
}

// ── 從「原圖」裁切物件區域（不送 GPT 重繪）──────────────────────────────────
interface CropResult { cropBase64: string; cropX: number; cropY: number; cropW: number; cropH: number; origW: number; origH: number; }
interface PadSides { top: number; right: number; bottom: number; left: number; }

function cropRegion(base64: string, bbox: DetectedObject['bbox'], pad: number | PadSides): Promise<CropResult | null> {
    const sides: PadSides = typeof pad === 'number'
        ? { top: pad, right: pad, bottom: pad, left: pad }
        : pad;
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const W = img.naturalWidth, H = img.naturalHeight;
            const x  = Math.max(0, Math.floor((bbox.x - sides.left)   * W));
            const y  = Math.max(0, Math.floor((bbox.y - sides.top)    * H));
            const x2 = Math.min(W, Math.ceil((bbox.x + bbox.w + sides.right)  * W));
            const y2 = Math.min(H, Math.ceil((bbox.y + bbox.h + sides.bottom) * H));
            const cw = Math.max(1, x2 - x), ch = Math.max(1, y2 - y);
            const canvas = document.createElement('canvas');
            canvas.width = cw; canvas.height = ch;
            canvas.getContext('2d')!.drawImage(img, x, y, cw, ch, 0, 0, cw, ch);
            resolve({ cropBase64: canvas.toDataURL('image/png'), cropX: x, cropY: y, cropW: cw, cropH: ch, origW: W, origH: H });
        };
        img.onerror = () => resolve(null);
        img.src = base64;
    });
}

// ── Lab 色彩空間（Delta-E 背景減除用）────────────────────────────────────────
function rgb2lab(r: number, g: number, b: number): [number, number, number] {
    let R = r / 255, G = g / 255, B = b / 255;
    R = R > 0.04045 ? Math.pow((R + 0.055) / 1.055, 2.4) : R / 12.92;
    G = G > 0.04045 ? Math.pow((G + 0.055) / 1.055, 2.4) : G / 12.92;
    B = B > 0.04045 ? Math.pow((B + 0.055) / 1.055, 2.4) : B / 12.92;
    let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
    let y = (R * 0.2126 + G * 0.7152 + B * 0.0722);
    let z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
    x = x > 0.008856 ? Math.cbrt(x) : 7.787 * x + 16 / 116;
    y = y > 0.008856 ? Math.cbrt(y) : 7.787 * y + 16 / 116;
    z = z > 0.008856 ? Math.cbrt(z) : 7.787 * z + 16 / 116;
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
function deltaE(a: [number, number, number], b: [number, number, number]): number {
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

/**
 * Delta-E 背景減除（FLAT 設計用，純前端）
 * 取邊框 top-2 主色當背景候選，色差小於閾值的像素設透明。
 * 文字保留 soft alpha（不二值化，避免鋸齒）。
 */
function deltaERemove(cropBase64: string, edgeComplexity: 'simple' | 'complex'): Promise<string> {
    // Lab 空間閾值（CIE76）：JND≈2.3，去背用較寬
    const hard = edgeComplexity === 'complex' ? 10 : 14;
    const soft = edgeComplexity === 'complex' ? 20 : 26;
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const W = img.naturalWidth, H = img.naturalHeight;
            const canvas = document.createElement('canvas');
            canvas.width = W; canvas.height = H;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            const data = ctx.getImageData(0, 0, W, H).data;

            // 取邊框像素 → 量化統計 top-2 主背景色
            const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
            const addSample = (i: number) => {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const key = `${r >> 4}_${g >> 4}_${b >> 4}`;
                const cur = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
                cur.count++; cur.r += r; cur.g += g; cur.b += b;
                buckets.set(key, cur);
            };
            for (let x = 0; x < W; x++) { addSample((x) * 4); addSample(((H - 1) * W + x) * 4); }
            for (let y = 0; y < H; y++) { addSample((y * W) * 4); addSample((y * W + (W - 1)) * 4); }
            const sorted = [...buckets.values()].sort((a, b) => b.count - a.count).slice(0, 2);
            const bgLabs = sorted.map(s => rgb2lab(s.r / s.count, s.g / s.count, s.b / s.count));
            if (bgLabs.length === 0) { resolve(cropBase64); return; }

            const out = ctx.createImageData(W, H);
            out.data.set(data);
            for (let i = 0; i < out.data.length; i += 4) {
                const lab = rgb2lab(out.data[i], out.data[i + 1], out.data[i + 2]);
                let d = Infinity;
                for (const c of bgLabs) { const dd = deltaE(lab, c); if (dd < d) d = dd; }
                if (d < hard) out.data[i + 3] = 0;
                else if (d < soft) out.data[i + 3] = Math.round(((d - hard) / (soft - hard)) * out.data[i + 3]);
                // d >= soft 保留原 alpha（含原圖抗鋸齒，文字邊緣不鋸齒）
            }
            ctx.putImageData(out, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(cropBase64);
        img.src = cropBase64;
    });
}

// ── 單一物件萃取（原圖裁切 + 分割 + Mask 驅動幾何）──────────────────────────
async function extractOneLayer(
    obj: DetectedObject,
    originalBase64: string,   // 用「原圖」裁切，保最高畫質
    falKey: string | undefined,
    onProgress?: (msg: string) => void,
): Promise<LayerResult | null> {
    // ── A: 裁切擴張計算 ──────────────────────────────────────────────────────
    // SUBJECT（人物）：非對稱擴張 — 頭頂最大（頭髮容易被切）、兩側次之、底部最小
    // 其他 BIREFNET：等距對稱擴張
    // COLOR_SUBTRACT：幾乎無擴張（精準裁切就好）
    const useBiRefNet = obj.maskStrategy === 'BIREFNET' && !!falKey;
    let pad: number | PadSides;
    if (obj.category === 'SUBJECT') {
        // 人物專屬：頭頂 0.4 / 左右 0.25 / 底部 0.2
        pad = { top: 0.4, right: 0.25, bottom: 0.2, left: 0.25 };
    } else if (useBiRefNet) {
        const p = obj.edgeComplexity === 'complex' ? 0.35 : 0.15;
        pad = p;
    } else {
        pad = 0.01;
    }

    const crop = await cropRegion(originalBase64, obj.bbox, pad);
    if (!crop) { console.warn(`[magicLayer] crop failed: ${obj.label}`); return null; }

    // semanticRisk：由 Gemini confidence 推導（看錯角色的風險）
    const conf = obj.confidence ?? 0.8;
    const semanticRisk: RiskLevel = conf < 0.7 ? 'HIGH' : conf < 0.85 ? 'MEDIUM' : 'LOW';
    const common = {
        name:         obj.label,
        category:     obj.category,
        layerType:    obj.layerType,
        semanticRole: obj.semanticRole,
    };

    // 正常結果：mask 在原圖空間的絕對比例（Mask 驅動幾何）
    const buildResult = (transparent: LayerResult): LayerResult => {
        const maskRatioX = (crop.cropX + transparent.cropRatioX * crop.cropW) / crop.origW;
        const maskRatioY = (crop.cropY + transparent.cropRatioY * crop.cropH) / crop.origH;
        const maskRatioW = (transparent.cropRatioW * crop.cropW) / crop.origW;
        const maskRatioH = (transparent.cropRatioH * crop.cropH) / crop.origH;
        // extractionRisk：mask 面積 vs bbox 面積（差太多 = 可能去背過頭/不準）
        const coverage = (maskRatioW * maskRatioH) / Math.max(1e-6, obj.bbox.w * obj.bbox.h);
        const extractionRisk: RiskLevel = coverage < 0.15 ? 'HIGH' : coverage < 0.4 ? 'MEDIUM' : 'LOW';
        return {
            base64:     transparent.base64,
            cropRatioX: maskRatioX, cropRatioY: maskRatioY,
            cropRatioW: maskRatioW, cropRatioH: maskRatioH,
            ...common,
            riskScore: { semanticRisk, extractionRisk, placementRisk: 'LOW' },
        };
    };

    // Hard Crop Fallback：原圖矩形（去背失敗也不讓物件消失）
    const hardCrop = (): LayerResult => ({
        base64:     crop.cropBase64,
        cropRatioX: crop.cropX / crop.origW,
        cropRatioY: crop.cropY / crop.origH,
        cropRatioW: crop.cropW / crop.origW,
        cropRatioH: crop.cropH / crop.origH,
        ...common,
        name:       `${obj.label}（去背失敗·原圖裁切）`,
        riskScore:  { semanticRisk, extractionRisk: 'HIGH', placementRisk: 'HIGH' },
    });

    try {
        const method = useBiRefNet ? `BiRefNet${obj.edgeComplexity === 'complex' ? '/複雜邊緣' : ''}` : 'Delta-E';
        onProgress?.(`✂️ 去背：${obj.label}（${method}）`);

        let transparentSrc: string;
        if (useBiRefNet) {
            transparentSrc = await withTimeout(
                birefnetRemoveBg(crop.cropBase64, falKey!),
                obj.edgeComplexity === 'complex' ? 180_000 : 120_000,
                () => deltaERemove(crop.cropBase64, obj.edgeComplexity),
            );
        } else {
            transparentSrc = await deltaERemove(crop.cropBase64, obj.edgeComplexity);
        }

        const trimmed = await trimTransparentPixels(transparentSrc);
        const emptyMask = !trimmed.pixelWidth || !trimmed.pixelHeight || trimmed.pixelWidth < 2 || trimmed.pixelHeight < 2;
        if (emptyMask) {
            console.warn(`[magicLayer] empty mask, hard-crop fallback: ${obj.label}`);
            return hardCrop();
        }
        return buildResult(trimmed);
    } catch (e) {
        console.warn(`[magicLayer] extract failed, hard-crop fallback: ${obj.label}`, e);
        return hardCrop();
    }
}

// ── 載入圖片成 HTMLImageElement ─────────────────────────────────────────────
function loadImg(src: string): Promise<HTMLImageElement | null> {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

// ── 由所有物件圖層建立背景「洞遮罩」（白=洞·透明=保留），含羽化 ──────────────
async function buildHoleMask(origW: number, origH: number, layers: LayerResult[], featherPx: number): Promise<string | null> {
    const canvas = document.createElement('canvas');
    canvas.width = origW; canvas.height = origH;
    const ctx = canvas.getContext('2d')!;
    let drew = false;
    for (const layer of layers) {
        const img = await loadImg(layer.base64);
        if (!img) continue;
        const dx = layer.cropRatioX * origW;
        const dy = layer.cropRatioY * origH;
        const dw = layer.cropRatioW * origW;
        const dh = layer.cropRatioH * origH;
        // 用物件 alpha 形狀畫成白色剪影（source-in 把內容染白）
        const tmp = document.createElement('canvas');
        tmp.width = Math.max(1, Math.round(dw)); tmp.height = Math.max(1, Math.round(dh));
        const tctx = tmp.getContext('2d')!;
        tctx.drawImage(img, 0, 0, tmp.width, tmp.height);
        tctx.globalCompositeOperation = 'source-in';
        tctx.fillStyle = '#FFFFFF';
        tctx.fillRect(0, 0, tmp.width, tmp.height);
        ctx.drawImage(tmp, dx, dy, dw, dh);
        drew = true;
    }
    if (!drew) return null;
    // 羽化 + 輕微擴張（blur 同時讓邊緣外擴，吞掉殘影）
    if (featherPx > 0) {
        const blurred = document.createElement('canvas');
        blurred.width = origW; blurred.height = origH;
        const bctx = blurred.getContext('2d')!;
        bctx.filter = `blur(${featherPx}px)`;
        bctx.drawImage(canvas, 0, 0);
        return blurred.toDataURL('image/png');
    }
    return canvas.toDataURL('image/png');
}

// ── Alpha 軟遮罩合成：洞內用 AI 填充，洞外逐像素保留原圖 ────────────────────
async function alphaComposite(originalBase64: string, filledBase64: string, holeMaskBase64: string): Promise<string> {
    const [orig, filled, mask] = await Promise.all([loadImg(originalBase64), loadImg(filledBase64), loadImg(holeMaskBase64)]);
    if (!orig) return filledBase64;
    const W = orig.naturalWidth, H = orig.naturalHeight;

    // 1) 暫存：AI 填充圖 ∩ 洞遮罩（destination-in，羽化邊呈半透明）
    const tmp = document.createElement('canvas');
    tmp.width = W; tmp.height = H;
    const tctx = tmp.getContext('2d')!;
    if (filled) tctx.drawImage(filled, 0, 0, W, H);
    if (mask) {
        tctx.globalCompositeOperation = 'destination-in';
        tctx.drawImage(mask, 0, 0, W, H);
    }
    // 2) 主畫布：原圖底 + 疊上「只剩洞內」的填充
    const main = document.createElement('canvas');
    main.width = W; main.height = H;
    const mctx = main.getContext('2d')!;
    mctx.drawImage(orig, 0, 0, W, H);
    mctx.globalCompositeOperation = 'source-over';
    mctx.drawImage(tmp, 0, 0);
    return main.toDataURL('image/png');
}

// ── Gemini 背景補全（移除物件、補全背景）────────────────────────────────────
async function geminiInpaintBackground(imageBase64: string, objects: DetectedObject[], bgDescription: string, apiKey: string, model: string): Promise<string | null> {
    try {
        const ai = new GoogleGenAI({ apiKey });
        const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
        const mimeType = imageBase64.match(/data:(.*);base64/)?.[1] ?? 'image/jpeg';
        const labels = objects.map(o => `"${o.labelEn}" (${o.label})`).join(', ');
        const prompt = `Remove these foreground elements from the image: ${labels}.
Reconstruct the complete background where they were, by naturally extending the surrounding background.
${bgDescription ? `Background reference: ${bgDescription}\n` : ''}Match surrounding colors, textures, lighting and continue patterns seamlessly. Keep the overall background style identical to the original.`;
        const response = await ai.models.generateContent({
            model,
            contents: { parts: [{ inlineData: { data: cleanBase64, mimeType } }, { text: prompt }] },
        });
        const part = response.candidates?.[0]?.content?.parts?.find((p: { inlineData?: { data: string } }) => p.inlineData);
        if (!part?.inlineData?.data) return null;
        return `data:image/png;base64,${part.inlineData.data}`;
    } catch (e) {
        console.warn('[geminiBackground] Failed:', e);
        return null;
    }
}

// ── 主要入口 ─────────────────────────────────────────────────────────────────
export async function gptLayerSegment(
    imageBase64: string,
    geminiApiKey: string,
    atlasKey: string,            // 批次 1 暫不使用（保留簽名相容）
    falKey?: string,
    onProgress?: (msg: string) => void,
    geminiImageModel = 'gemini-3.1-flash-image-preview',
): Promise<LayerResult[]> {
    void atlasKey;

    // Step 1：Gemini 偵測 + contentType 分類
    onProgress?.('🔍 Gemini 分析圖片類型與圖層中...');
    const detected = await detectObjects(imageBase64, geminiApiKey);
    let objects = detected.objects;

    // Step 1.5：Conditional Verifier Pass（複雜/低信心才觸發，省 API）
    const avgConf = objects.reduce((s, o) => s + (o.confidence ?? 0.8), 0) / objects.length;
    const needVerify = objects.length > 6
        || ['DESIGN_POSTER', 'INFOGRAPHIC', 'MIXED'].includes(detected.primaryType)
        || avgConf < 0.82;
    if (needVerify) {
        onProgress?.(`🔎 ${detected.primaryType} 複雜圖，二次校對圖層...`);
        objects = await verifierPass(imageBase64, objects, geminiApiKey);
    }

    // Step 1.6：Composite Subject Removal（純前端，零 API）
    // 移除「包含 >= 2 個獨立 SUBJECT」的群組垃圾層（如男+女組合層）
    const beforeComposite = objects.length;
    objects = removeCompositeSubjects(objects);
    if (objects.length < beforeComposite) {
        onProgress?.(`🧹 移除 ${beforeComposite - objects.length} 個群組垃圾層（已保留個別人物層）`);
    }

    onProgress?.(`✨ [${detected.primaryType}] 偵測到 ${objects.length} 個元素，原圖裁切 + 像素分割中...`);

    // Step 2：背景描述（與物件萃取並行）
    const bgDescPromise = analyzeBackground(imageBase64, geminiApiKey);

    // Step 3：物件萃取（並行）— 全部從「原圖」裁切，不送 GPT 重繪
    const objectResults = await Promise.all(
        objects.map((obj, i) => {
            onProgress?.(`🎨 提取第 ${i + 1}/${objects.length} 層：${obj.label}`);
            return extractOneLayer(obj, imageBase64, falKey, onProgress);
        })
    );
    const validLayers = objectResults.filter((r): r is LayerResult => !!r);

    // Step 4 & 5：背景補全 + Alpha 軟遮罩合成
    onProgress?.('🌄 Gemini 補全背景中...');
    const bgDescription = await bgDescPromise;
    let bgFinal: string | null = null;
    try {
        const orig = await loadImg(imageBase64);
        const origW = orig?.naturalWidth ?? 0, origH = orig?.naturalHeight ?? 0;
        // 背景補全送壓縮圖（省上傳），合成貼回原圖
        const compressed = await compressForAtlas(imageBase64);
        const filled = await geminiInpaintBackground(compressed, objects, bgDescription, geminiApiKey, geminiImageModel);
        if (filled && origW > 0) {
            onProgress?.('🧩 Alpha 合成背景（洞外保留原圖）...');
            // 洞遮罩羽化半徑：原圖較長邊的 0.8%（最少 6px）
            const feather = Math.max(6, Math.round(Math.max(origW, origH) * 0.008));
            const holeMask = await buildHoleMask(origW, origH, validLayers, feather);
            bgFinal = holeMask ? await alphaComposite(imageBase64, filled, holeMask) : filled;
        } else {
            bgFinal = filled;   // 合成失敗用純填充
        }
    } catch (e) {
        console.warn('[magicLayer] background composite failed:', e);
        bgFinal = null;
    }

    // backgroundRisk：前景洞總面積佔比越大、補全越不可靠
    const holeArea = validLayers.reduce((s, l) => s + l.cropRatioW * l.cropRatioH, 0);
    const bgRisk: RiskLevel = holeArea > 0.5 ? 'HIGH' : holeArea > 0.25 ? 'MEDIUM' : 'LOW';

    // Step 6：組合（背景置首）
    const layers: LayerResult[] = [];
    if (bgFinal) {
        layers.push({
            base64: bgFinal, cropRatioX: 0, cropRatioY: 0, cropRatioW: 1, cropRatioH: 1,
            name: '補全背景', category: 'SUBJECT',
            riskScore: { semanticRisk: 'LOW', extractionRisk: 'LOW', placementRisk: 'LOW', backgroundRisk: bgRisk },
        });
    }
    for (const r of validLayers) layers.push(r);

    if (layers.length === 0) throw new Error('所有圖層提取均失敗');
    return layers;
}
