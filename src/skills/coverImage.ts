// 設計大師 — 封面圖 Skill
import { SkillOption } from './sticker';

export interface CoverImageSkillConfig {
  type: string;
  palette: string;
  rendering: string;
  text: string;
  mood: string;
  font: string;
  title: string;
  subtitle: string;
}

export const COVER_DEFAULT_CONFIG: CoverImageSkillConfig = {
  type: 'hero',
  palette: 'warm',
  rendering: 'flat-vector',
  text: 'title-subtitle',
  mood: 'balanced',
  font: 'clean',
  title: '',
  subtitle: '',
};

export const COVER_TYPES: SkillOption[] = [
  { id: 'hero', name: 'Hero', name_zh: '主視覺', desc: '大視覺衝擊，標題覆蓋。適合產品發布、品牌推廣', promptModifier: 'Large focal visual (60-70% area), title overlay on visual, dramatic composition.' },
  { id: 'conceptual', name: 'Conceptual', name_zh: '概念化', desc: '概念視覺化，抽象核心概念。適合技術文章、架構設計', promptModifier: 'Abstract shapes representing core concepts, information hierarchy, clean zones.' },
  { id: 'typography', name: 'Typography', name_zh: '排版主導', desc: '以文字為主的佈局，突出標題。適合觀點文章、金句', promptModifier: 'Title as primary element (40%+ area), minimal supporting visuals, strong hierarchy.' },
  { id: 'metaphor', name: 'Metaphor', name_zh: '隱喻', desc: '視覺隱喻，具體表達抽象。適合哲學、個人成長', promptModifier: 'Concrete object/scene representing abstract idea, symbolic elements, emotional resonance.' },
  { id: 'scene', name: 'Scene', name_zh: '場景', desc: '氛圍感場景，具敘事感。適合故事、旅行、生活方式', promptModifier: 'Atmospheric environment, narrative elements, mood-setting lighting and colors.' },
  { id: 'minimal', name: 'Minimal', name_zh: '極簡', desc: '極簡構圖，大量留白。適合禪意、專注、核心概念', promptModifier: 'Single focal element, generous whitespace (60%+), essential shapes only.' },
];

export const COVER_PALETTES: SkillOption[] = [
  { id: 'warm', name: 'Warm', name_zh: '暖色', desc: '友好、親切、以人為本', promptModifier: 'Color Palette: Primary Warm Orange, Golden Yellow, Terracotta, Background Cream/Soft Peach, Accent Deep Brown. Warm lighting, organic curves, friendly icons.' },
  { id: 'elegant', name: 'Elegant', name_zh: '優雅', desc: '精緻、高雅、低調奢華', promptModifier: 'Color Palette: Soft Coral, Muted Teal, Dusty Rose, Background Warm Cream/Soft Beige, Accent Gold. Delicate details, soft transitions, refined geometric patterns.' },
  { id: 'cool', name: 'Cool', name_zh: '冷色', desc: '科技、專業、精確', promptModifier: 'Color Palette: Engineering Blue, Navy Blue, Cyan, Background Light Gray/Off-White, Accent Amber. Grid lines, technical schematics, geometric precision.' },
  { id: 'dark', name: 'Dark', name_zh: '暗色', desc: '電影感、高端、氛圍感', promptModifier: 'Color Palette: Electric Purple, Cyan Blue, Magenta Pink, Background Deep Purple-Black/Rich Navy, Accent Pure White. Glowing elements, neon highlights, atmospheric fog.' },
  { id: 'earth', name: 'Earth', name_zh: '大地', desc: '自然、有機、穩重', promptModifier: 'Color Palette: Forest Green, Sage, Earth Brown, Background Sand Beige/Sky Blue, Accent Sunset Orange. Leaves, natural forms, organic flowing lines, natural patterns.' },
  { id: 'vivid', name: 'Vivid', name_zh: '鮮豔', desc: '充滿活力、大膽、吸睛', promptModifier: 'Color Palette: Bright Red, Neon Green, Electric Blue, Background Light Blue/Soft Lavender, Accent Bright Orange. Dynamic diagonal lines, bold geometric blocks, high energy.' },
  { id: 'pastel', name: 'Pastel', name_zh: '柔和', desc: '溫和、奇幻、柔軟', promptModifier: 'Color Palette: Soft Pink, Mint, Lavender, Background White/Light Cream, Accent Sky Blue. Cute rounded proportions, stars, sparkles, soft shadows.' },
  { id: 'mono', name: 'Mono', name_zh: '單色', desc: '乾淨、專注、本質', promptModifier: 'Color Palette: Pure Black, Near Black, Background White/Off-White, Accent single color. Maximum negative space, thin lines, stark contrast.' },
  { id: 'retro', name: 'Retro', name_zh: '復古', desc: '懷舊、經典、復古風', promptModifier: 'Color Palette: Coral Red, Mint Green, Mustard Yellow, Dark Maroon, Background Cream Off-White/Aged Paper, Accent Vintage Gold. Halftone dots, aged textures, radiating lines, retro motifs.' },
];

export const COVER_RENDERINGS: SkillOption[] = [
  { id: 'flat-vector', name: 'Flat Vector', name_zh: '扁平矢量', desc: '乾淨、現代、幾何插畫', promptModifier: 'Flat design with clean outlines, uniform fills, and no texture or depth. Lines: Clean outlines with uniform stroke weight, rounded line endings. Texture: None. Depth: 2D layering. Isolated elements on clean backgrounds.' },
  { id: 'hand-drawn', name: 'Hand Drawn', name_zh: '手繪', desc: '草稿感、有機、有溫度', promptModifier: 'Hand-drawn illustration with visible imperfections, organic line quality. Sketchy, organic strokes, paper grain texture, light hand-drawn shadows or hatching.' },
  { id: 'painterly', name: 'Painterly', name_zh: '繪畫風', desc: '柔和、藝術、表現力強', promptModifier: 'Watercolor or paint-style illustration with visible brush strokes, color bleeds, and artistic texture. Soft brush strokes with variable opacity, no hard outlines, color transitions.' },
  { id: 'digital', name: 'Digital', name_zh: '數字風', desc: '精緻、精確、現代', promptModifier: 'Clean digital illustration with polished finish, precise edges. Smooth surfaces, subtle gradients, frosted glass effects, card-based layouts.' },
  { id: 'pixel', name: 'Pixel', name_zh: '像素風', desc: '復古8位、懷舊、顆粒感', promptModifier: 'Pixel art aesthetic with visible pixel grid, limited color palette, NES/SNES retro gaming feel. Staircase edges on diagonals, pixelated bitmap fonts.' },
  { id: 'chalk', name: 'Chalk', name_zh: '粉筆', desc: '教育、真實、黑板粉筆感', promptModifier: 'Chalk on blackboard aesthetic with imperfect strokes, dust effects, and authentic classroom feel. Chalk board background, chalk smudges.' },
];

export const COVER_TEXTS: SkillOption[] = [
  { id: 'none', name: 'None', name_zh: '無文字', desc: '純視覺封面，不含文字', promptModifier: 'Pure visual cover with no text elements. Emphasis on visual metaphor.' },
  { id: 'title-only', name: 'Title Only', name_zh: '僅標題', desc: '單一標題，最大衝擊力', promptModifier: 'Single headline, maximum impact. Title prominent placement. Visual supports title message.' },
  { id: 'title-subtitle', name: 'Title + Subtitle', name_zh: '標題+副標題', desc: '標題配上輔助資訊', promptModifier: 'Title with supporting context. Clear hierarchy between title/subtitle.' },
  { id: 'text-rich', name: 'Text Rich', name_zh: '豐富文字', desc: '資訊密集，含多個文字元素', promptModifier: 'Information-dense cover with multiple text elements: title, subtitle, and 2-4 tag keyword badges.' },
];

export const COVER_MOODS: SkillOption[] = [
  { id: 'subtle', name: 'Subtle', name_zh: '柔和', desc: '平靜、低調的視覺存在', promptModifier: 'Calm, understated visual presence. Low contrast between elements, muted/desaturated colors.' },
  { id: 'balanced', name: 'Balanced', name_zh: '平衡', desc: '多功能、和諧的視覺存在', promptModifier: 'Versatile, harmonious visual presence. Medium contrast, natural saturation levels, balanced weight.' },
  { id: 'bold', name: 'Bold', name_zh: '大膽', desc: '動態、高衝擊的視覺存在', promptModifier: 'Dynamic, high-impact visual presence. High contrast, vivid saturated colors, strong shapes.' },
];

export const COVER_FONTS: SkillOption[] = [
  { id: 'clean', name: 'Clean', name_zh: '簡潔', desc: '現代、通用的無襯線字體', promptModifier: 'Clean geometric sans-serif typography, modern minimal letterforms, uniform stroke weight.' },
  { id: 'handwritten', name: 'Handwritten', name_zh: '手寫', desc: '溫暖、有機的手寫/刷筆字體', promptModifier: 'Warm hand-lettered typography with organic brush strokes, friendly personal feel, natural variation.' },
  { id: 'serif', name: 'Serif', name_zh: '襯線', desc: '經典、優雅的襯線字體', promptModifier: 'Elegant serif typography with refined letterforms, classic editorial character, formal trustworthy feel.' },
  { id: 'display', name: 'Display', name_zh: '展示', desc: '粗體、裝飾性強的標題字體', promptModifier: 'Bold decorative display typography, heavy expressive headlines, attention-grabbing character.' },
];

export const COVER_OPTION_GROUPS = [
  { key: 'type' as const, label: '類型', options: COVER_TYPES },
  { key: 'palette' as const, label: '色調', options: COVER_PALETTES },
  { key: 'rendering' as const, label: '渲染風格', options: COVER_RENDERINGS },
  { key: 'text' as const, label: '文字層級', options: COVER_TEXTS },
  { key: 'mood' as const, label: '氛圍', options: COVER_MOODS },
  { key: 'font' as const, label: '字體', options: COVER_FONTS },
];

export function buildCoverImagePrompt(content: string, config: CoverImageSkillConfig): string {
  const typeMod = COVER_TYPES.find(o => o.id === config.type)?.promptModifier ?? '';
  const paletteMod = COVER_PALETTES.find(o => o.id === config.palette)?.promptModifier ?? '';
  const renderingMod = COVER_RENDERINGS.find(o => o.id === config.rendering)?.promptModifier ?? '';
  const textMod = COVER_TEXTS.find(o => o.id === config.text)?.promptModifier ?? '';
  const moodMod = COVER_MOODS.find(o => o.id === config.mood)?.promptModifier ?? '';
  const fontMod = COVER_FONTS.find(o => o.id === config.font)?.promptModifier ?? '';

  return `
Create an elegant cover image for the following content.

TYPE: ${config.type}
${typeMod}

COLOR PALETTE: ${config.palette}
${paletteMod}

RENDERING STYLE: ${config.rendering}
${renderingMod}

TEXT LEVEL: ${config.text}
${textMod}

MOOD: ${config.mood}
${moodMod}

TYPOGRAPHY: ${config.font}
${fontMod}

COMPOSITION PRINCIPLES:
- 40-60% whitespace breathing room
- Visual anchor centered or offset left
- Simplified silhouettes for characters, NO realistic humans

CONTENT TO VISUALIZE:
${content}

${config.title ? `TITLE (must use exact): "${config.title}"` : ''}
${config.subtitle ? `SUBTITLE: "${config.subtitle}"` : ''}
  `.trim();
}
