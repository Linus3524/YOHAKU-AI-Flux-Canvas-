/**
 * 一鍵跨平台適配（cross-platform adapt）
 *
 * 把 1 張來源圖,依各平台比例 + 安全區重構成多張成品。
 * 作法對標開源 AI-Canvas：每個平台 = 一個「參考圖 + prompt（比例/安全區/執行要求）」
 * 的重構任務,由圖像模型重新構圖（必要時擴圖、重排,不裁壞主體）。
 *
 * 注意：prompt 內容統一用英文（避免中英混雜稀釋指令權重）;name 為 UI 顯示用中文。
 */

export interface CrossPlatformSpec {
  id: string;
  name: string;          // UI 顯示名稱（含比例,中文）
  promptLabel: string;   // prompt 內用的平台英文名
  /** 對應到 Atlas 支援的比例字串（見 atlasImage.ts ATLAS_SIZES）；Gemini 路徑寫進 prompt */
  atlasRatio: string;
  /** 名目比例（擺放時的 fallback;實際以結果圖真實像素比例為準） */
  ratioValue: number;
  standard: string;      // 平台規格說明（en）
  safeArea: string;      // 安全區規則（en）
  guidance: string[];    // 執行要求（en）
}

export const CROSS_PLATFORM_SPECS: CrossPlatformSpec[] = [
  {
    id: 'xiaohongshu',
    name: '小紅書 3:4',
    promptLabel: 'Xiaohongshu (RED) cover',
    atlasRatio: '3:4',
    ratioValue: 3 / 4,
    standard: 'Xiaohongshu posts use a vertical 3:4 cover; the first image sets the visual proportion of the whole note and vertical fills the mobile screen better.',
    safeArea: 'Keep the title, faces, product and key selling points away from all four edges; leave at least 8% top/bottom safe margin so thumbnails and cropping do not break it.',
    guidance: [
      'Preserve subject identity, faces/product and the original style; extend the background up/down when more vertical space is needed.',
      'Make it easy to recognize quickly in a small waterfall feed; avoid cluttered information and cheap promo feel.',
    ],
  },
  {
    id: 'instagram-feed',
    name: 'Instagram Feed 4:5',
    promptLabel: 'Instagram feed post',
    atlasRatio: '4:5',
    ratioValue: 4 / 5,
    standard: 'Instagram feed brand content commonly uses 4:5 portrait to occupy more screen space in the feed.',
    safeArea: 'Keep faces, product, logo and title within the central safe area, at least 8% margin on all sides to survive grid previews and cropping.',
    guidance: [
      'Recompose into a clean mobile feed composition with the subject clearly defined.',
      'Background may be extended or simplified, but do not change subject identity, product shape or brand colors.',
    ],
  },
  {
    id: 'instagram-story',
    name: 'IG Story/Reels 9:16',
    promptLabel: 'Instagram Story / Reels',
    atlasRatio: '9:16',
    ratioValue: 9 / 16,
    standard: 'Instagram Stories/Reels use full-screen vertical 9:16; platform UI covers the top and bottom areas.',
    safeArea: 'Top ~14% and bottom ~20% must NOT hold key text, logo, faces, product or CTA; the middle area carries the main visual.',
    guidance: [
      'Place the subject in the central safe area; extend up/down when needed instead of stretching the original.',
      'Keep top and bottom as clean / low-information background so platform controls can overlay.',
    ],
  },
  {
    id: 'youtube',
    name: 'YouTube 縮圖 16:9',
    promptLabel: 'YouTube thumbnail',
    atlasRatio: '16:9',
    ratioValue: 16 / 9,
    standard: 'YouTube thumbnail 16:9 must stay highly recognizable at small size; usually needs space for a big title and strong subject contrast.',
    safeArea: 'Keep subject and title centered; leave the bottom-right corner clear of key info (duration label sits there); avoid touching edges.',
    guidance: [
      'Strengthen the subject and contrast; extend the background left/right when needed instead of stretching.',
      'Leave room for a large title; avoid messy backgrounds, garbled text and watermarks.',
    ],
  },
  {
    id: 'facebook-link',
    name: 'FB 連結分享 1.91:1',
    promptLabel: 'Facebook link-share image',
    atlasRatio: '16:9',
    ratioValue: 1.91,
    standard: 'Facebook link-share / feed landscape image uses about 1.91:1; it appears in the feed and link preview cards.',
    safeArea: 'Keep subject, title and logo within the central 85%; avoid key info near the left/right edges where link cards may crop.',
    guidance: [
      'Recompose into a clean landscape feed/link image; extend the background sideways when needed instead of stretching.',
      'Keep brand colors, product and identity intact; readable at small preview size.',
    ],
  },
  {
    id: 'facebook-cover',
    name: 'FB 封面 2.6:1',
    promptLabel: 'Facebook page cover banner',
    atlasRatio: '21:9',
    ratioValue: 2.6,
    standard: 'Facebook page cover is a wide banner (~2.6:1); on mobile the left/right and bottom get cropped, so keep focus centered.',
    safeArea: 'Keep the subject, title and logo within the central safe area; left/right edges and bottom may be cropped on mobile, so put nothing critical there.',
    guidance: [
      'Recompose into a wide cover banner; extend the sky/background sideways generously rather than stretching the subject.',
      'Keep the main subject clear and not too small; preserve brand identity and colors.',
    ],
  },
  {
    id: 'wechat',
    name: '公眾號封面 21:9',
    promptLabel: 'WeChat Official Account article cover',
    atlasRatio: '21:9',
    ratioValue: 21 / 9,
    standard: 'WeChat Official Account article cover needs a horizontal banner feel; mobile lists and share cards compress the preview, so subject/brand must stay readable at small size.',
    safeArea: 'Keep subject and title in the central safe area; avoid key info at the left/right edges; at least 8% margin all around.',
    guidance: [
      'Recompose into an article cover banner with a clear subject and stable title area.',
      'Extend the background sideways generously when needed; avoid making the subject too small or cropped.',
    ],
  },
  {
    id: 'social-square',
    name: '社群/廣告方圖 1:1',
    promptLabel: 'social square post',
    atlasRatio: '1:1',
    ratioValue: 1,
    standard: 'Square 1:1 aspect ratio is universally supported across most social platforms (LINE, FB, IG) and display ad networks, providing a stable cross-device visual format.',
    safeArea: 'Keep key subjects, face, logo, and core message within the central 80% safe zone; leave at least 10% margins around the edges to prevent accidental cropping on mobile screens.',
    guidance: [
      'Recompose into a clean, balanced square layout where the subject is instantly recognizable.',
      'Naturally extend the background equally to all sides or simplify the surroundings to fit the square frame without warping the main subject.',
    ],
  },
  {
    id: 'pinterest',
    name: 'Pinterest 貼文 2:3',
    promptLabel: 'Pinterest vertical pin',
    atlasRatio: '2:3',
    ratioValue: 2 / 3,
    standard: 'Pinterest uses a high-aspect vertical 2:3 ratio; this format fills the user waterfall feed beautifully and is ideal for showcasing detail, products, and vertical scenes.',
    safeArea: 'Keep key visual elements, text, and product details away from the absolute top and bottom edges; maintain a 10% vertical safe margin for lists overlay.',
    guidance: [
      'Recompose into an elegant vertical waterfall layout, accentuating height and depth.',
      'Extend the background vertically (up/down) to fit the ratio; do not stretch the subject horizontally.',
    ],
  },
];

export function crossPlatformSpec(id: string): CrossPlatformSpec | undefined {
  return CROSS_PLATFORM_SPECS.find(s => s.id === id);
}

export interface CrossPlatformPromptOptions {
  /** 是否嚴格保留主體（臉/產品身分） */
  preserveSubject?: boolean;
  /** 文字策略：保留原圖文字 / 不新增文字 */
  keepText?: boolean;
}

/** 依平台規格組出重構 prompt（全英文,對標 AI-Canvas server 的 job.prompt 結構）。 */
export function buildCrossPlatformPrompt(
  spec: CrossPlatformSpec,
  opts: CrossPlatformPromptOptions = {},
): string {
  const preserve = opts.preserveSubject !== false;
  const textPolicy = opts.keepText
    ? 'Preserve any text already in the source image; do not add new text.'
    : 'Do not add new text unless it is essential to the layout.';

  return [
    `Generate a finished ${spec.promptLabel} at ${spec.atlasRatio} aspect ratio by re-composing the reference image.`,
    `Treat the people, product, logo and headline as separate design elements and rearrange them into a clean ${spec.atlasRatio} layout.`,
    `Platform standard: ${spec.standard}`,
    `Safe area: ${spec.safeArea}`,
    `Execution: ${spec.guidance.join(' ')}`,
    preserve
      ? 'Ensure the main subjects (faces, products, logos) retain their natural visual proportions; avoid any unnatural stretching, squashing, or distortion of key elements.'
      : 'Keep the overall subject and style consistent with the reference.',
    'When adapting to the new ratio, seamlessly extend or fill the background with cohesive lighting, realistic shadows, and style consistency. Naturally blend the original subject with the newly generated environment to create a visually polished, professional design.',
    'Output the final designed raster image directly — no editing frames, no platform UI, no watermark.',
    textPolicy,
  ].join('\n');
}
