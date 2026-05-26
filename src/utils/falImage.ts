/**
 * fal.ai Qwen Image Layered Utility
 * 將一張圖自動分解成多個 RGBA 透明 PNG 圖層（魔法分層功能）
 */

import { fal } from '@fal-ai/client';
import { downloadImageAsBase64 } from './atlasImage';

/** base64 data URI → Blob */
function base64ToBlob(base64: string): Blob {
    const [header, data] = base64.includes(',') ? base64.split(',') : ['data:image/png;base64', base64];
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
    const binary = atob(data);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return new Blob([arr], { type: mime });
}

/**
 * 呼叫 fal.ai Qwen-Image-Layered：
 * 上傳原圖 → 模型自動分解成 N 個透明 PNG 圖層 → 回傳 base64 陣列
 */
export async function callFalQwenImageLayered(
    imageBase64: string,
    falKey: string,
    numLayers: number = 4
): Promise<string[]> {
    // 設定 fal.ai API key
    fal.config({ credentials: falKey });

    // base64 → Blob → 上傳到 fal.ai storage 取得 HTTP URL（API 需要 URL，不接受 base64）
    const blob = base64ToBlob(imageBase64);
    const imageUrl = await fal.storage.upload(blob);

    // 呼叫 qwen-image-layered 並等待結果
    const result = await fal.subscribe('fal-ai/qwen-image-layered', {
        input: {
            image_url: imageUrl,
            num_layers: numLayers,
            output_format: 'png',
            acceleration: 'regular',
        },
    });

    // 回傳的是 fal.media 暫時 URL，需轉成 base64 才能持久存在畫布
    const layerUrls: string[] = (result.data.images ?? []).map((img: { url: string }) => img.url);
    const base64Layers = await Promise.all(layerUrls.map(url => downloadImageAsBase64(url)));
    return base64Layers.filter(Boolean) as string[];
}
