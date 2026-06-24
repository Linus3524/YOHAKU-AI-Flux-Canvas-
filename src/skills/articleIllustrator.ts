// 設計大師 — 文章插畫 Skill
import { SkillOption } from './sticker';

export interface ArticleIllustratorSkillConfig {
  type: string;
  style: string;
  density: string;
}

export const ILLUSTRATOR_DEFAULT_CONFIG: ArticleIllustratorSkillConfig = {
  type: 'infographic',
  style: 'vector-illustration',
  density: 'balanced',
};

export const ARTICLE_TYPES: SkillOption[] = [
  { id: 'infographic', name: 'Infographic', name_zh: '資訊圖表', desc: '數據、指標或流程視覺化。適合科技/乾貨', promptModifier: 'Infographic type. Structured data visualization, clean charts, graphs, and diagrams. Icons representing key metrics, quantitative focus.' },
  { id: 'scene', name: 'Scene', name_zh: '場景插畫', desc: '具氛圍感與敘事性。適合情感故事、心路歷程', promptModifier: 'Scene type. Atmospheric and emotional, character or subject-focused, environmental storytelling, mood-driven composition.' },
  { id: 'flowchart', name: 'Flowchart', name_zh: '流程圖', desc: '展示步驟與決策分支。適合操作指引、工作流', promptModifier: 'Flowchart type. Step-by-step progression, clear directional flow, decision points, process visualization, sequential focus.' },
  { id: 'comparison', name: 'Comparison', name_zh: '對比圖', desc: '左右或對角對比。適合優缺點、前後改變', promptModifier: 'Comparison type. Side-by-side layout, clear visual separation, highlighted differences, balanced contrast presentation.' },
  { id: 'framework', name: 'Framework', name_zh: '框架圖', desc: '架構與組成模型。適合系統架構、思維框架', promptModifier: 'Framework type. Hierarchical structure, component relationships, modular representation, structural focus.' },
  { id: 'timeline', name: 'Timeline', name_zh: '時間線', desc: '按時間排序的發展歷史。適合演進、歷程', promptModifier: 'Timeline type. Chronological progression, milestone markers, temporal relationships, evolution focus.' },
];

export const ARTICLE_STYLES: SkillOption[] = [
  { id: 'vector-illustration', name: 'Vector Illustration', name_zh: '矢量插畫', desc: '扁平幾何、無漸變、乾淨邊線。適合技術知識', promptModifier: 'Clean flat vector art, bold geometric forms, vibrant but harmonious color palette, clear visual hierarchy, modern and professional.' },
  { id: 'notion', name: 'Notion', name_zh: 'Notion 風格', desc: '黑白手繪線稿配淡雅背景。簡約有質感', promptModifier: 'Minimalist hand-drawn line art, black/gray ink outlines with slight wobble, soft pastel highlights, clean paper background.' },
  { id: 'warm', name: 'Warm', name_zh: '溫暖插畫', desc: '溫潤黃光與柔和漸層。適合故事、成長教育', promptModifier: 'Cozy atmosphere, soft golden hour lighting, soft gradients, natural textures, inviting and personal feeling.' },
  { id: 'minimal', name: 'Minimal', name_zh: '極簡插畫', desc: '極少元素與大量空白。適合禪意哲理', promptModifier: 'Ultra-clean composition, maximum negative space, essential elements only, focus on single core visual metaphor.' },
  { id: 'blueprint', name: 'Blueprint', name_zh: '藍圖風格', desc: '經典藍底白線與工程格線。適合科技與架構', promptModifier: 'Technical engineering precision, blueprint dark blue background with white line work, grid overlay, data-focused annotations.' },
  { id: 'watercolor', name: 'Watercolor', name_zh: '水彩風', desc: '邊緣柔和與色彩暈染。適合旅行與生活藝術', promptModifier: 'Artistic watercolor washes, soft color bleeding, dreamy and creative mood, delicate overlay lines, organic shapes.' },
  { id: 'elegant', name: 'Elegant', name_zh: '優雅商業', desc: '沉穩奢華與克制排版。適合商業、論壇配圖', promptModifier: 'Refined sophisticated aesthetic, business-appropriate navy/gold accents, balanced typography, professional and polished.' },
  { id: 'editorial', name: 'Editorial', name_zh: '雜誌雜文', desc: '像雜誌說明的多圖布局與圖說。適合科普報導', promptModifier: 'Magazine-quality polished explainer, clear visual narrative flow, multi-section layouts, callout boxes for key insights.' },
  { id: 'scientific', name: 'Scientific', name_zh: '科學精準', desc: '教科書或期刊般精確的結構標示。適合學術', promptModifier: 'Academic precision textbook illustration, proper labels with pointer lines, technical accuracy, clear biology/chemistry layout.' },
  { id: 'chalkboard', name: 'Chalkboard', name_zh: '黑板粉筆', desc: '黑板底與彩粉筆質地。適合教學說明', promptModifier: 'Classroom chalkboard black green background, hand-drawn chalk textures, sketchy lines, eraser residue, colorful accents.' },
  { id: 'fantasy-animation', name: 'Fantasy Animation', name_zh: '幻想動畫', desc: '吉卜力/迪士尼暖萌畫風。適合童話與奇幻故事', promptModifier: 'Charming hand-drawn animation style, Ghibli-inspired, soft painterly textures, warm colors, friendly characters.' },
  { id: 'flat', name: 'Flat', name_zh: '純扁平', desc: '幾何色塊拼接。簡潔現代', promptModifier: 'Modern bold geometric shapes, flat color blocks, clean vector layout, contemporary digital aesthetic.' },
];

export const ARTICLE_DENSITIES: SkillOption[] = [
  { id: 'minimal', name: 'Minimal', name_zh: '極簡 (1-2幅)', desc: '只保留最核心的視覺，適合短文', promptModifier: 'Minimal density: Generate 1-2 illustrations total. Focus only on the absolute essential core concepts.' },
  { id: 'balanced', name: 'Balanced', name_zh: '平衡 (3-5幅)', desc: '適度點綴，兼顧文字與配圖', promptModifier: 'Balanced density: Generate 3-5 illustrations. A moderate number of visuals supporting key points without clutter.' },
  { id: 'per-section', name: 'Per Section', name_zh: '每節一圖', desc: '每個主要段落都配一張圖 (推薦)', promptModifier: 'Per-section density: Generate one illustration per major section, ensuring every significant section has visual support.' },
  { id: 'rich', name: 'Rich', name_zh: '豐富 (6幅以上)', desc: '資訊極多，高密度配圖', promptModifier: 'Rich density: Generate 6+ illustrations. Maximum visual support for complex, long-form content.' },
];

export const ILLUSTRATOR_OPTION_GROUPS = [
  { key: 'type' as const, label: '插畫類型', options: ARTICLE_TYPES },
  { key: 'style' as const, label: '視覺風格', options: ARTICLE_STYLES },
  { key: 'density' as const, label: '配圖密度', options: ARTICLE_DENSITIES },
];

export function buildArticleIllustratorPrompt(content: string, config: ArticleIllustratorSkillConfig): string {
  const typeMod = ARTICLE_TYPES.find(o => o.id === config.type)?.promptModifier ?? '';
  const styleMod = ARTICLE_STYLES.find(o => o.id === config.style)?.promptModifier ?? '';
  const densityMod = ARTICLE_DENSITIES.find(o => o.id === config.density)?.promptModifier ?? '';

  return `
Create a single article illustration image.

TYPE: ${config.type}
${typeMod}

STYLE: ${config.style}
${styleMod}

DENSITY: ${config.density}
${densityMod}

INSTRUCTION:
This is a SINGLE image. Incorporate visual elements supporting the article structure.
Visualize the underlying concept/metaphor, NOT a literal image.

CONTENT TO ILLUSTRATE:
${content}
  `.trim();
}
