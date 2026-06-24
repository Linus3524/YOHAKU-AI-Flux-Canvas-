// 設計大師 — 知識漫畫 Skill
import { SkillOption } from './sticker';

export interface ComicSkillConfig {
  art: string;
  tone: string;
  layout: string;
  pageCount: number;
  aspect: string;
}

export const COMIC_DEFAULT_CONFIG: ComicSkillConfig = {
  art: 'ligne-claire',
  tone: 'neutral',
  layout: 'standard',
  pageCount: 4,
  aspect: '4:3',
};

export const COMIC_ART_STYLES: SkillOption[] = [
  { id: 'ligne-claire', name: 'Ligne Claire', name_zh: '清線畫風', desc: '粗細均勻墨線、無漸變色。丁丁歷險記風格，適合科普', promptModifier: 'Classic European Ligne Claire comic style. Uniform clean outlines (2px), flat color fills with no gradients, detailed realistic backgrounds, stylized characters.' },
  { id: 'manga', name: 'Manga', name_zh: '日漫畫風', desc: '經典日系動漫線條與大眼睛。活力感強、情緒豐富', promptModifier: 'Japanese manga art style. Expressive character eyes, dynamic poses, speed lines, screentone shading effects, clean bright anime colors.' },
  { id: 'realistic', name: 'Realistic', name_zh: '寫實畫風', desc: '美式寫實、豐富厚塗與立體光影。適合深厚故事與專業感', promptModifier: 'Realistic digital painting style. Anatomically accurate proportions, soft shading gradients on skin and fabric, realistic environmental lighting.' },
  { id: 'ink-brush', name: 'Ink Brush', name_zh: '國風水墨', desc: '動態毛筆線條配墨暈。適合武俠、歷史、文藝內容', promptModifier: 'Traditional Chinese ink brush painting style. Callographic brush strokes (2-3px) with varying weight, ink wash textures, misty layered depth.' },
  { id: 'chalk', name: 'Chalk', name_zh: '黑板粉筆', desc: '黑板背景底配彩色粉筆手繪。充滿課堂講學感', promptModifier: 'Classroom chalkboard black background, sketchy chalk drawings, visible chalk texture, chalkboard eraser residue smudges.' },
];

export const COMIC_ASPECTS: SkillOption[] = [
  { id: '16:9', name: '16:9', name_zh: '寬螢幕 (16:9)', desc: '適合寬屏漫畫分鏡', promptModifier: 'aspect ratio 16:9' },
  { id: '4:3', name: '4:3', name_zh: '標準 (4:3)', desc: '經典漫畫單頁比例', promptModifier: 'aspect ratio 4:3' },
  { id: '1:1', name: '1:1', name_zh: '正方形 (1:1)', desc: '正方形漫畫佈局', promptModifier: 'aspect ratio 1:1' },
  { id: '3:4', name: '3:4', name_zh: '直向 (3:4)', desc: '直向漫畫佈局', promptModifier: 'aspect ratio 3:4' },
  { id: '9:16', name: '9:16', name_zh: '直向 (9:16)', desc: '垂直長版條漫比例', promptModifier: 'aspect ratio 9:16' },
];

export const COMIC_TONES: SkillOption[] = [
  { id: 'neutral', name: 'Neutral', name_zh: '中性理智', desc: '理性、客觀的科普基調。色調均勻、光照自然', promptModifier: 'Balanced objective tone. Even clear lighting, minimal dramatic shadows, balanced color saturation.' },
  { id: 'warm', name: 'Warm', name_zh: '溫馨療癒', desc: '溫潤的暖黃/奶茶光暈。適合個人回憶、成長故事', promptModifier: 'Warm inviting cozy tone. Soft golden hour lighting, slightly warm sepia shift (+15%), comforting atmosphere.' },
  { id: 'dramatic', name: 'Dramatic', name_zh: '戲劇張力', desc: '強光影對比與深色調。適合高潮轉折、科學突破', promptModifier: 'High-contrast dramatic tone. Sharp light-dark divisions, deep shadows, rim lighting on characters, intense atmosphere.' },
  { id: 'romantic', name: 'Romantic', name_zh: '浪漫唯美', desc: '粉紫色調、帶有亮光花瓣。適合細膩情感與夢想', promptModifier: 'Dreamy romantic tone. Soft pastel palette (pink, lavender, cream), floating flower petals, sparkle highlights.' },
  { id: 'energetic', name: 'Energetic', name_zh: '熱血活力', desc: '高飽和色彩、動態速度線。適合熱血冒險、趣味發現', promptModifier: 'High-energy active tone. Bright vibrant primary colors, speed lines, burst effects, wide expressive eyes.' },
  { id: 'vintage', name: 'Vintage', name_zh: '復古懷舊', desc: '做舊泛黃紙張與古典褐色。適合歷史事件、老故事', promptModifier: 'Vintage historical tone. Faded sepia colors, yellowed paper background texture, classical formal compositions.' },
];

export const COMIC_LAYOUTS: SkillOption[] = [
  { id: 'standard', name: 'Standard', name_zh: '標準網格', desc: '4-6 格經典排版，均勻間隔。適合平鋪直敘說明', promptModifier: 'Standard comic grid layout with 4-6 panels per page, regular grid structure, thin white gutters.' },
  { id: 'cinematic', name: 'Cinematic', name_zh: '電影佈局', desc: '寬螢幕橫向大格 (2-4格)。重氛圍與大視角', promptModifier: 'Cinematic widescreen layout with 2-4 wide panels per page, panoramic horizontal framing, filmic focus.' },
  { id: 'dense', name: 'Dense', name_zh: '密集多格', desc: '6-8 格緊密排版。適合快節奏或細節極多的概念', promptModifier: 'Dense layout with 6-8 panels, compact spacing, lots of dialogue boxes, fast pacing.' },
  { id: 'webtoon', name: 'Webtoon', name_zh: '條漫佈局', desc: '垂直長條排版，適合手機下拉閱讀', promptModifier: 'Webtoon vertical scrolling format, panels arranged vertically with generous spacing, seamless reading flow.' },
];

export const COMIC_OPTION_GROUPS = [
  { key: 'art' as const, label: '畫風', options: COMIC_ART_STYLES },
  { key: 'aspect' as const, label: '尺寸比例', options: COMIC_ASPECTS },
  { key: 'tone' as const, label: '基調氛圍', options: COMIC_TONES },
  { key: 'layout' as const, label: '版面格數', options: COMIC_LAYOUTS },
];

export function buildComicPrompt(content: string, config: ComicSkillConfig): string {
  const artMod = COMIC_ART_STYLES.find(o => o.id === config.art)?.promptModifier ?? '';
  const toneMod = COMIC_TONES.find(o => o.id === config.tone)?.promptModifier ?? '';
  const layoutMod = COMIC_LAYOUTS.find(o => o.id === config.layout)?.promptModifier ?? '';
  const aspectMod = COMIC_ASPECTS.find(o => o.id === config.aspect)?.promptModifier ?? 'aspect ratio 4:3';

  return `
Create a single knowledge comic image containing ${config.pageCount} panels.

ART STYLE: ${config.art}
${artMod}

TONE: ${config.tone}
${toneMod}

LAYOUT: ${config.layout} — ${config.pageCount} panels total
${layoutMod}

ASPECT RATIO:
${aspectMod}

PANEL COUNT: ${config.pageCount} panels within this single image. All panels must share consistent character designs, colors, and perspective.

CONTENT:
${content}
  `.trim();
}
