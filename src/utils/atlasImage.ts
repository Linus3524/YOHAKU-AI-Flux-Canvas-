
/**
 * Atlas Cloud Image Generation Utility
 * Async polling pattern: POST → prediction_id → poll until completed
 */

const ATLAS_BASE_URL = 'https://api.atlascloud.ai/api/v1';
const POLL_INTERVAL_MS = 2500;
const MAX_WAIT_MS = 600000; // 10 minutes（參考圖模式需要更長時間）

export type AtlasGenerationModel = 'gpt-image-2' | 'seedream-v4.5' | 'seedream-v5' | 'qwen-image-2';

/** Seedream v4.5 / v5 — 8 種比例 × 2K/4K（使用 * 分隔符） */
export const ATLAS_SIZES: { ratio: string; label: string; w2k: string; w4k: string }[] = [
    { ratio: '1:1',  label: '1:1',  w2k: '2048*2048', w4k: '4096*4096' },
    { ratio: '4:3',  label: '4:3',  w2k: '2304*1728', w4k: '4704*3520' },
    { ratio: '3:4',  label: '3:4',  w2k: '1728*2304', w4k: '3520*4704' },
    { ratio: '4:5',  label: '4:5',  w2k: '1792*2240', w4k: '3584*4480' },
    { ratio: '16:9', label: '16:9', w2k: '2848*1600', w4k: '5504*3040' },
    { ratio: '9:16', label: '9:16', w2k: '1600*2848', w4k: '3040*5504' },
    { ratio: '3:2',  label: '3:2',  w2k: '2496*1664', w4k: '4992*3328' },
    { ratio: '2:3',  label: '2:3',  w2k: '1664*2496', w4k: '3328*4992' },
    { ratio: '21:9', label: '21:9', w2k: '3136*1344', w4k: '6240*2656' },
];

/** 通義千問 Qwen Image 2.0 — 單層尺寸（每邊最大 2048px，* 分隔） */
export const QWEN_SIZES: { ratio: string; label: string; w2k: string; w4k: string }[] = [
    { ratio: '1:1',  label: '1:1',  w2k: '1536*1536', w4k: '2048*2048' },
    { ratio: '4:3',  label: '4:3',  w2k: '1536*1152', w4k: '2048*1536' },
    { ratio: '3:4',  label: '3:4',  w2k: '1152*1536', w4k: '1536*2048' },
    { ratio: '4:5',  label: '4:5',  w2k: '1280*1600', w4k: '1638*2048' },
    { ratio: '16:9', label: '16:9', w2k: '1536*864',  w4k: '2048*1152' },
    { ratio: '9:16', label: '9:16', w2k: '864*1536',  w4k: '1152*2048' },
    { ratio: '3:2',  label: '3:2',  w2k: '1536*1024', w4k: '2048*1366' },
    { ratio: '2:3',  label: '2:3',  w2k: '1024*1536', w4k: '1366*2048' },
    { ratio: '21:9', label: '21:9', w2k: '1512*648',  w4k: '2048*878'  },
];

/** GPT Image 2 — 使用 x 分隔符，quality 控制解析度 */
export const GPT_SIZES: { ratio: string; label: string; w2k: string; w4k: string }[] = [
    { ratio: '1:1',  label: '1:1',  w2k: '1024x1024', w4k: '1024x1024' },
    { ratio: '4:3',  label: '4:3',  w2k: '1536x1024', w4k: '1536x1024' },
    { ratio: '3:4',  label: '3:4',  w2k: '1024x1536', w4k: '1024x1536' },
    // GPT Image 2 無原生 4:5，吸附至最接近的直式 1024x1536（實際 2:3）
    { ratio: '4:5',  label: '4:5',  w2k: '1024x1536', w4k: '1024x1536' },
    { ratio: '16:9', label: '16:9', w2k: '2560x1440', w4k: '3840x2160' },
    { ratio: '9:16', label: '9:16', w2k: '1440x2560', w4k: '2160x3840' },
    { ratio: '3:2',  label: '3:2',  w2k: '1536x1024', w4k: '1536x1024' },
    { ratio: '2:3',  label: '2:3',  w2k: '1024x1536', w4k: '1024x1536' },
];

/** 依模型取對應的尺寸表（供 UI 使用） */
export function getModelSizes(model: AtlasGenerationModel) {
    if (model === 'gpt-image-2') return GPT_SIZES;
    if (model === 'qwen-image-2') return QWEN_SIZES;
    return ATLAS_SIZES;
}

interface ModelConfig {
    // 文生圖
    id: string;
    useInputWrapper: boolean;
    sizeParam?: string;           // API 尺寸欄位名稱（e.g. 'size', 'image_size'）
    useGptSizes?: boolean;        // true = 使用 GPT_SIZES（x 分隔）；false/undefined = ATLAS_SIZES（* 分隔）
    useQwenSizes?: boolean;       // true = 使用 QWEN_SIZES（* 分隔，max 2048px）
    supportsBase64Output?: boolean; // 支援 enable_base64_output
    supportsQualityParam?: boolean; // 支援 quality: low/medium/high（GPT Image 2）
    extraParams?: Record<string, unknown>; // 固定附加參數
    // 圖生圖
    img2imgId?: string;
    img2imgUseInputWrapper?: boolean;
    img2imgImageParam?: string;
    img2imgImageIsArray?: boolean;
}

const MODEL_CONFIGS: Record<AtlasGenerationModel, ModelConfig> = {
    'gpt-image-2': {
        id: 'openai/gpt-image-2/text-to-image',
        useInputWrapper: false,
        sizeParam: 'size',
        useGptSizes: true,
        supportsBase64Output: true,
        supportsQualityParam: true,
        extraParams: { output_format: 'png' },
        img2imgId: 'openai/gpt-image-2/edit',
        img2imgUseInputWrapper: false,
        img2imgImageParam: 'images',
        img2imgImageIsArray: true,
    },
    'seedream-v4.5': {
        id: 'bytedance/seedream-v4.5',
        useInputWrapper: false,
        sizeParam: 'size',
        supportsBase64Output: true,
        img2imgId: 'bytedance/seedream-v4.5/edit',
        img2imgUseInputWrapper: false,
        img2imgImageParam: 'images',
        img2imgImageIsArray: true,
    },
    'seedream-v5': {
        id: 'bytedance/seedream-v5.0-lite',
        useInputWrapper: false,
        sizeParam: 'size',
        supportsBase64Output: true,
        img2imgId: 'bytedance/seedream-v5.0-lite/edit',
        img2imgUseInputWrapper: false,
        img2imgImageParam: 'images',
        img2imgImageIsArray: true,
    },
    'qwen-image-2': {
        id: 'qwen/qwen-image-2.0/text-to-image',
        useInputWrapper: false,
        sizeParam: 'size',
        useQwenSizes: true,
        supportsBase64Output: true,
        img2imgId: 'qwen/qwen-image-2.0/edit',
        img2imgUseInputWrapper: false,
        img2imgImageParam: 'images',
        img2imgImageIsArray: true,
    },
};

/** ratio ('1:1' etc.) + quality ('2K'|'4K') + sizes table → size string */
function resolveSize(
    ratio: string,
    quality: '2K' | '4K',
    useGptSizes?: boolean,
    useQwenSizes?: boolean,
): string | undefined {
    const table = useGptSizes ? GPT_SIZES : useQwenSizes ? QWEN_SIZES : ATLAS_SIZES;
    const entry = table.find(s => s.ratio === ratio);
    if (!entry) return undefined;
    return quality === '4K' ? entry.w4k : entry.w2k;
}

interface AtlasPredictionData {
    id: string;
    status: string;
    output?: string | string[];
    outputs?: string | string[] | null;
    urls?: { get?: string };
    error?: string;
}

interface AtlasApiResponse {
    code?: number;
    message?: string;
    data?: AtlasPredictionData;
    id?: string;
    status?: string;
    output?: string | string[];
    error?: string;
}

async function blobToBase64(blob: Blob, fallback: string): Promise<string> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) || fallback);
        reader.onerror  = () => resolve(fallback);
        reader.readAsDataURL(blob);
    });
}

export async function downloadImageAsBase64(url: string): Promise<string> {
    if (url.startsWith('data:')) return url;

    // 1️⃣ 直接 CORS fetch
    try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await blobToBase64(await res.blob(), url);
    } catch { /* 繼續 */ }

    // 2️⃣ 自架 Vercel proxy（生產）or corsproxy.io（本機）
    const isLocal = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV === true;
    const proxyUrls = isLocal
        ? [`https://corsproxy.io/?url=${encodeURIComponent(url)}`]
        : [
            `/api/image-proxy?url=${encodeURIComponent(url)}`,
            `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
          ];

    for (const proxyUrl of proxyUrls) {
        try {
            const res = await fetch(proxyUrl);
            if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
            return await blobToBase64(await res.blob(), url);
        } catch { /* 繼續 */ }
    }

    // 3️⃣ 最後手段：直接用 URL（重新整理後可能失效）
    return url;
}

async function pollPrediction(
    predictionId: string,
    atlasKey: string,
    signal?: AbortSignal,
): Promise<string[]> {
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_WAIT_MS) {
        // AbortSignal 已觸發 → 立即中止輪詢
        if (signal?.aborted) throw new Error('使用者取消操作');

        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

        if (signal?.aborted) throw new Error('使用者取消操作');

        const res = await fetch(`${ATLAS_BASE_URL}/model/result/${predictionId}`, {
            headers: { Authorization: `Bearer ${atlasKey}` },
            signal,   // fetch 本身也帶 signal，abort 後 fetch 立即拋錯
        });

        if (!res.ok) throw new Error(`Atlas poll error: ${res.status}`);

        const json: AtlasApiResponse = await res.json();
        const pred = json.data ?? (json as unknown as AtlasPredictionData);
        const status = pred.status;

        if (status === 'completed' || status === 'succeeded' || status === 'success') {
            const rawOutput =
                pred.outputs ??
                pred.output ??
                (json as any).outputs ??
                (json as any).output ??
                (json as any).images ??
                null;

            let urls: string[] = [];

            // 將各種格式統一成可用的圖片字串（URL 或 data URI）
            const normalizeOutput = (u: any): string | null => {
                if (typeof u !== 'string' || !u) return null;
                if (u.startsWith('http') || u.startsWith('data:')) return u;
                // 裸 base64（JPEG: /9j/、PNG: iVBOR、WebP: UklG 等）
                if (u.startsWith('/9j/') || u.startsWith('iVBOR') || u.startsWith('UklG') || u.length > 100) {
                    // 猜測 MIME：/9j/ = jpeg，其餘預設 png
                    const mime = u.startsWith('/9j/') ? 'image/jpeg' : 'image/png';
                    return `data:${mime};base64,${u}`;
                }
                return null;
            };

            if (Array.isArray(rawOutput)) {
                urls = rawOutput.map(normalizeOutput).filter(Boolean) as string[];
            } else if (typeof rawOutput === 'string') {
                const n = normalizeOutput(rawOutput);
                if (n) urls = [n];
            } else if (rawOutput && typeof rawOutput === 'object') {
                const inner = (rawOutput as any).images ?? (rawOutput as any).url ?? (rawOutput as any).urls;
                if (Array.isArray(inner)) urls = inner.map(normalizeOutput).filter(Boolean) as string[];
                else if (typeof inner === 'string') { const n = normalizeOutput(inner); if (n) urls = [n]; }
            }

            if (urls.length === 0) {
                throw new Error(`completed 但找不到圖片 URL：${JSON.stringify(json).slice(0, 300)}`);
            }
            return Promise.all(urls.map(downloadImageAsBase64));
        }

        if (status === 'failed' || status === 'error') {
            throw new Error(`Atlas 生成失敗: ${pred.error || '未知錯誤'}`);
        }
    }

    throw new Error('Atlas 生成逾時（超過 2 分鐘），請稍後再試');
}

async function postGeneration(body: Record<string, unknown>, atlasKey: string): Promise<string> {
    const res = await fetch(`${ATLAS_BASE_URL}/model/generateImage`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${atlasKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Atlas 請求失敗 (${res.status}): ${errText}`);
    }

    const json: AtlasApiResponse = await res.json();
    const predId = json.data?.id ?? json.id;
    if (!predId) throw new Error(`Atlas 未回傳 prediction ID，回應：${JSON.stringify(json)}`);
    return predId;
}

// ── 文生圖 ─────────────────────────────────────────────

interface AtlasCallOptions {
    ratio?: string;       // '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '3:2' | '2:3' | '21:9'
    quality?: '2K' | '4K';
    transparentBg?: boolean; // 要求輸出透明背景（background: 'transparent'）
    keepAlpha?: boolean;     // 壓縮時使用 PNG 保留 alpha（預設 JPEG 會破壞透明）
    seed?: number;           // 鎖定隨機種子碼以利批次風格一致
}

function qualityToGpt(q?: '2K' | '4K'): 'low' | 'medium' | 'high' {
    return q === '4K' ? 'high' : 'medium';
}

function buildT2IBody(config: ModelConfig, prompt: string, options?: AtlasCallOptions) {
    const extra: Record<string, unknown> = { ...(config.extraParams ?? {}) };
    if (config.sizeParam && options?.ratio && options.ratio !== 'Original') {
        const size = resolveSize(options.ratio, options.quality ?? '2K', config.useGptSizes, config.useQwenSizes);
        if (size) extra[config.sizeParam] = size;
    }
    if (config.supportsQualityParam) {
        extra['quality'] = qualityToGpt(options?.quality);
    }
    if (config.supportsBase64Output) {
        extra['enable_base64_output'] = true;
    }
    if (options?.transparentBg) {
        extra['background'] = 'transparent';
    }
    if (options?.seed !== undefined) {
        extra['seed'] = options.seed;
    }
    return config.useInputWrapper
        ? { model: config.id, input: { prompt, ...extra } }
        : { model: config.id, prompt, ...extra };
}

/** 文生圖：回傳 base64 陣列（count 張），單張失敗不影響其他 */
export async function callAtlasGenerate(
    prompt: string,
    model: AtlasGenerationModel,
    atlasKey: string,
    count: number = 2,
    options?: AtlasCallOptions
): Promise<string[]> {
    const config = MODEL_CONFIGS[model];
    const submitResults = await Promise.allSettled(
        Array.from({ length: count }, () =>
            postGeneration(buildT2IBody(config, prompt, options), atlasKey)
        )
    );
    const predIds = submitResults
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
        .map(r => r.value);
    if (predIds.length === 0) throw new Error('Atlas: 所有生成請求均失敗');
    const results = await Promise.allSettled(predIds.map(id => pollPrediction(id, atlasKey)));
    return results
        .filter((r): r is PromiseFulfilledResult<string[]> => r.status === 'fulfilled')
        .flatMap(r => r.value)
        .filter(Boolean);
}

// ── 圖生圖 ─────────────────────────────────────────────

// images: 第一張為主參考圖，其餘為便利貼附加參考圖
function buildI2IBody(config: ModelConfig, prompt: string, images: string[], options?: AtlasCallOptions) {
    const imgParam = config.img2imgImageParam  ?? 'images';
    const isArray  = config.img2imgImageIsArray ?? true;
    const imgValue = isArray ? images : images[0];
    const extra: Record<string, unknown> = { ...(config.extraParams ?? {}) };
    if (config.sizeParam && options?.ratio && options.ratio !== 'Original') {
        const size = resolveSize(options.ratio, options.quality ?? '2K', config.useGptSizes, config.useQwenSizes);
        if (size) extra[config.sizeParam] = size;
    }
    if (config.supportsQualityParam) {
        extra['quality'] = qualityToGpt(options?.quality);
    }
    if (config.supportsBase64Output) {
        extra['enable_base64_output'] = true;
    }
    if (options?.transparentBg) {
        extra['background'] = 'transparent';
    }
    if (options?.seed !== undefined) {
        extra['seed'] = options.seed;
    }
    return config.img2imgUseInputWrapper
        ? { model: config.img2imgId, input: { prompt, [imgParam]: imgValue, ...extra } }
        : { model: config.img2imgId, prompt, [imgParam]: imgValue, ...extra };
}

/** 從 base64 圖片偵測實際尺寸，回傳最接近的 ATLAS_SIZES 比例字串 */
export async function detectClosestRatio(base64: string): Promise<string> {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const targetRatio = img.naturalWidth / img.naturalHeight;
            let closest = ATLAS_SIZES[0].ratio;
            let minDiff = Infinity;
            for (const s of ATLAS_SIZES) {
                const [rw, rh] = s.ratio.split(':').map(Number);
                const diff = Math.abs(rw / rh - targetRatio);
                if (diff < minDiff) { minDiff = diff; closest = s.ratio; }
            }
            resolve(closest);
        };
        img.onerror = () => resolve('1:1');
        img.src = base64;
    });
}

/**
 * 取得最接近某圖片比例的 GPT Image 2 尺寸字串（像素，如 '1024x1536'）。
 * gpt-image-2/edit 未指定 size 時預設輸出 1024x1024 方形；若原圖為直/橫式，
 * 輸出方形會導致 inpaint 結果與原圖比例不符、貼回時錯位。指定 size 修正此問題。
 */
export async function gptSizeForImage(base64: string): Promise<string> {
    const ratio = await detectClosestRatio(base64);
    const match = GPT_SIZES.find(s => s.ratio === ratio) ?? GPT_SIZES[0];
    return match.w2k;
}

/**
 * 送給 Atlas 前壓縮圖片：最長邊縮到 1024px，轉 JPEG 85%
 * 大幅減少傳輸量（原圖可能 3-5MB → 壓縮後約 200-400KB），加快 API 處理速度
 */
export async function compressForAtlas(
    base64: string,
    maxPx = 1024,
    quality = 0.85,
    keepAlpha = false,  // true → PNG（保留透明），false → JPEG（較小）
): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const { naturalWidth: w, naturalHeight: h } = img;
            const scale = w > h ? maxPx / w : maxPx / h;
            // 已經夠小就不放大，直接用原圖
            if (scale >= 1) { resolve(base64); return; }
            const canvas = document.createElement('canvas');
            canvas.width  = Math.round(w * scale);
            canvas.height = Math.round(h * scale);
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(keepAlpha
                ? canvas.toDataURL('image/png')
                : canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(base64); // 壓縮失敗就用原圖
        img.src = base64;
    });
}

/** 某模型是否支援圖生圖 */
export function atlasModelSupportsImg2Img(model: AtlasGenerationModel): boolean {
    return !!MODEL_CONFIGS[model].img2imgId;
}

/** 圖生圖：主參考圖 + 可選的便利貼附加參考圖，回傳生成結果 base64 陣列 */
export async function callAtlasImg2Img(
    prompt: string,
    model: AtlasGenerationModel,
    atlasKey: string,
    referenceImageBase64: string,
    count: number = 2,
    options?: AtlasCallOptions,
    noteRefImages?: string[]   // 便利貼附加參考圖（base64），追加在主參考圖之後
): Promise<string[]> {
    const config = MODEL_CONFIGS[model];
    if (!config.img2imgId) throw new Error(`${model} 不支援圖生圖`);

    // 「原圖比例」→ 自動偵測參考圖實際比例，換算成最接近的 Atlas 比例字串
    let resolvedOptions = options;
    if (options?.ratio === 'Original') {
        const detectedRatio = await detectClosestRatio(referenceImageBase64);
        resolvedOptions = { ...options, ratio: detectedRatio };
    }

    // 送出前壓縮所有參考圖（最長邊 1024px），keepAlpha 時改用 PNG 保留透明
    const rawImages = [referenceImageBase64, ...(noteRefImages ?? [])].filter(Boolean).slice(0, 8);
    const allImages = await Promise.all(rawImages.map(img => compressForAtlas(img, 1024, 0.85, options?.keepAlpha)));

    const submitResults = await Promise.allSettled(
        Array.from({ length: count }, () =>
            postGeneration(buildI2IBody(config, prompt, allImages, resolvedOptions), atlasKey)
        )
    );
    const predIds = submitResults
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
        .map(r => r.value);
    if (predIds.length === 0) throw new Error('Atlas img2img: 所有生成請求均失敗');
    const results = await Promise.allSettled(predIds.map(id => pollPrediction(id, atlasKey)));
    return results
        .filter((r): r is PromiseFulfilledResult<string[]> => r.status === 'fulfilled')
        .flatMap(r => r.value)
        .filter(Boolean);
}

/**
 * 將遮罩區域設為透明（alpha=0），回傳帶透明度的 PNG base64
 * GPT Image 2 Edit 原生支援透明遮罩：透明區域 = 要重新生成的區域
 */
async function createTransparentMaskedImage(imageBase64: string, maskBase64: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const maskImg = new Image();
            maskImg.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0);

                const maskCanvas = document.createElement('canvas');
                maskCanvas.width = maskImg.naturalWidth;
                maskCanvas.height = maskImg.naturalHeight;
                const maskCtx = maskCanvas.getContext('2d')!;
                maskCtx.drawImage(maskImg, 0, 0);
                const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

                const W = canvas.width, H = canvas.height;
                // 1) 先算每個像素的「洞」強度（1=完全挖空）
                const hole = new Float32Array(W * H);
                for (let y = 0; y < H; y++) {
                    for (let x = 0; x < W; x++) {
                        const mx = Math.floor(x * maskCanvas.width / W);
                        const my = Math.floor(y * maskCanvas.height / H);
                        hole[y * W + x] = maskData.data[(my * maskCanvas.width + mx) * 4] > 128 ? 1 : 0;
                    }
                }
                // 2) 邊緣羽化（box blur ×2 ≈ 平滑漸層）：
                //    硬切的直角 alpha 邊界會被 GPT 當成畫面特徵，沿著洞緣畫出框線；
                //    漸層過渡讓模型自然融合，不會看到銳利邊
                const r = 4;
                const blurPass = (src: Float32Array, horizontal: boolean) => {
                    const dst = new Float32Array(W * H);
                    for (let y = 0; y < H; y++) {
                        for (let x = 0; x < W; x++) {
                            let sum = 0, cnt = 0;
                            for (let d = -r; d <= r; d++) {
                                const nx = horizontal ? x + d : x;
                                const ny = horizontal ? y : y + d;
                                if (nx >= 0 && nx < W && ny >= 0 && ny < H) { sum += src[ny * W + nx]; cnt++; }
                            }
                            dst[y * W + x] = sum / cnt;
                        }
                    }
                    return dst;
                };
                const blurred = blurPass(blurPass(hole, true), false);

                const imgData = ctx.getImageData(0, 0, W, H);
                for (let i = 0; i < W * H; i++) {
                    // 取 max(硬洞, 模糊洞)：洞內保持全透明，邊緣向外漸層（只擴張不內縮，殘影也被涵蓋）
                    const strength = Math.max(hole[i], blurred[i]);
                    if (strength > 0) {
                        imgData.data[i * 4 + 3] = Math.round(imgData.data[i * 4 + 3] * (1 - strength));
                    }
                }
                ctx.putImageData(imgData, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            maskImg.onerror = reject;
            maskImg.src = maskBase64;
        };
        img.onerror = reject;
        img.src = imageBase64;
    });
}

/**
 * Inpainting via GPT Image 2 Edit
 * 策略：遮罩區域設透明 → 送 GPT Image 2 Edit（原生支援透明遮罩 inpainting）
 * mask: B&W 圖（白=填充區域、黑=保留區域）
 */
export async function callAtlasInpaint(
    prompt: string,
    imageBase64: string,
    maskBase64: string,
    atlasKey: string,
    referenceImages?: string[],
    surroundingContext?: string,
    signal?: AbortSignal,    // ← 傳入後可中止輪詢
    size?: string,           // ← 指定輸出尺寸（外擴必填，e.g. '1024x1536'）；同尺寸 inpaint 可省略
): Promise<string> {
    // 透明遮罩圖：讓 GPT Image 2 Edit 知道哪裡需要重新生成
    const transparentImage = await createTransparentMaskedImage(imageBase64, maskBase64);

    const hasRefs = referenceImages && referenceImages.length > 0;
    const isRemove = !prompt.trim() && !hasRefs;
    const ctxHint = surroundingContext
        ? ` Surrounding environment: ${surroundingContext} — match this lighting, color temperature, materials and atmosphere exactly.`
        : '';

    let editPrompt: string;
    if (isRemove) {
        editPrompt = `Seamlessly reconstruct the transparent area to match the surrounding background. Extend the nearby textures, colors, and patterns naturally inward so the result looks like the object was never there.${ctxHint}`;
    } else if (hasRefs) {
        const extraDesc = prompt.trim() ? ` Additional instruction: ${prompt.trim()}.` : '';
        editPrompt = `Use the reference image(s) to fill the transparent area. If the reference shows a specific object or subject, place it naturally into the scene. If it shows a style, texture, or aesthetic, apply that to the fill instead. In either case, adapt the lighting, shadows, color temperature, and perspective to seamlessly match the surrounding image.${ctxHint}${extraDesc}`;
    } else {
        editPrompt = `In the transparent area only: ${prompt.trim()}. Make it look completely natural and seamlessly blended.${ctxHint}`;
    }

    // images[0] = masked base image; images[1..] = optional reference images
    const images = [transparentImage, ...(hasRefs ? referenceImages! : [])];

    const body: Record<string, unknown> = {
        model: 'openai/gpt-image-2/edit',
        prompt: editPrompt,
        images,
        enable_base64_output: true,
        output_format: 'png',
        ...(size ? { size } : {}),
    };
    const predId = await postGeneration(body, atlasKey);
    const results = await pollPrediction(predId, atlasKey, signal);
    if (!results[0]) throw new Error('Atlas GPT Image 2 Inpaint 未回傳圖片');
    return results[0];
}

export function isValidAtlasKey(key: string): boolean {
    return key.startsWith('apikey-') && key.length > 10;
}

/** 除錯用：查詢已知 prediction ID */
export async function debugFetchPrediction(predictionId: string, atlasKey: string): Promise<string> {
    const res = await fetch(`${ATLAS_BASE_URL}/model/result/${predictionId}`, {
        headers: { Authorization: `Bearer ${atlasKey}` },
    });
    const json = await res.json();
    return JSON.stringify(json, null, 2);
}
