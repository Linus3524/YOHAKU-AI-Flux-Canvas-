// 設計大師 — 投影片簡報 Skill
import { SkillOption } from './sticker';

export interface SlideDeckSkillConfig {
  preset: string;
  audience: string;
  aspect: string;
}

export const SLIDE_DEFAULT_CONFIG: SlideDeckSkillConfig = {
  preset: 'blueprint',
  audience: 'general',
  aspect: '16:9',
};

export const SLIDE_PRESETS: SkillOption[] = [
  { id: 'blueprint', name: 'Blueprint', name_zh: '藍圖風格', desc: '工程感格線底配白/藍技術圖表。精密專業', promptModifier: 'Blueprint aesthetic. Light blueprint off-white background with subtle grid overlay, slate primary text, engineering blue accents. Technical schematics, clean vector graphics.' },
  { id: 'bold-editorial', name: 'Bold Editorial', name_zh: '雜誌大膽', desc: '黑白強烈對比色塊與巨大標題。吸睛大氣', promptModifier: 'Bold Editorial style. Deep black background, oversized condensed typography in all caps, bright electric blue/orange accents, geometric layout.' },
  { id: 'chalkboard', name: 'Chalkboard', name_zh: '黑板手繪', desc: '黑板背景與彩粉筆。適合教學與課程培訓', promptModifier: 'Chalkboard style. Chalkboard black background, chalk dust particles, hand-drawn white/yellow/pink chalk diagrams, wooden frame.' },
  { id: 'corporate', name: 'Corporate', name_zh: '商務精英', desc: '深藍配金色輔助、極簡格線。適合商業提案、報告', promptModifier: 'Corporate style. Pure white background, navy primary text, gold accents, clean structured grid, professional outlined icons.' },
  { id: 'dark-atmospheric', name: 'Dark Atmospheric', name_zh: '暗色發光', desc: '深紫背景配霓虹漸變線條。科技感與高端品牌感', promptModifier: 'Dark Atmospheric style. Deep purple-black background, glowing neon-purple/cyan borders, backlit edge effects.' },
  { id: 'editorial-infographic', name: 'Editorial Infographic', name_zh: '編輯資訊圖表', desc: '雜誌說明的多圖排版與圖說，資訊豐富', promptModifier: 'Editorial Infographic style. Light gray background, bold serif headlines, multi-section layouts, icon data visualizations.' },
  { id: 'fantasy-animation', name: 'Fantasy Animation', name_zh: '幻想動畫', desc: '吉卜力/迪士尼暖萌畫風。童趣故事、文學', promptModifier: 'Fantasy Animation style. Soft warm cream background, watercolor washes, charming characters, leaves and magical sparkles.' },
  { id: 'intuition-machine', name: 'Intuition Machine', name_zh: '直覺機器', desc: '泛黃筆記本格線底配雙語圖說。知性且有質感', promptModifier: 'Intuition Machine style. Aged cream paper background, dark maroon headlines, bilingual labels, teal technical diagrams.' },
  { id: 'minimal', name: 'Minimal', name_zh: '極簡精緻', desc: '全白背景、極大字重對比、極多留白。經典 Keynote 風格', promptModifier: 'Minimal Keynote style. Pure white background, maximum whitespace, light sans-serif headlines, single blue accent color, zen simplicity.' },
  { id: 'notion', name: 'Notion', name_zh: 'Notion 灰卡', desc: '淺灰背景配白色卡片、圓角細線。簡潔實用', promptModifier: 'Notion style. Light gray background, white content cards, light border dividers, blue links, tag chips, clean dashboard look.' },
  { id: 'pixel-art', name: 'Pixel Art', name_zh: '像素藝術', desc: '復古8位/16位像素圖表。適合極客、懷舊主題', promptModifier: 'Pixel Art style. Light blue background, visible pixel grid, blocky bitmap fonts, pixel progress bars.' },
  { id: 'scientific', name: 'Scientific', name_zh: '科學精準', desc: '教科書或期刊般精確的結構標示。適合學術報告', promptModifier: 'Scientific style. Off-white background,Times New Roman serif headlines, color-coded chemical/biology diagrams.' },
  { id: 'sketch-notes', name: 'Sketch Notes', name_zh: '手繪筆記', desc: '泛黃筆記紙底配彩色麥克風手寫標註。溫暖好懂', promptModifier: 'Charcut style. Warm paper background, hand-drawn marker calligraphy headlines, casual handwritten body text, wavy arrows.' },
  { id: 'vector-illustration', name: 'Vector Illustration', name_zh: '向量插畫', desc: '馬卡龍色塊拼接配粗黑描邊。扁平插畫質感', promptModifier: 'Vector Illustration style. Cream background, uniform black outlines, solid coral/mint/yellow blocks, lollipop trees.' },
];

export const SLIDE_ASPECTS: SkillOption[] = [
  { id: '16:9', name: '16:9', name_zh: '寬螢幕 (16:9)', desc: '現代簡報標準比例', promptModifier: 'aspect ratio 16:9' },
  { id: '4:3', name: '4:3', name_zh: '標準 (4:3)', desc: '傳統簡報比例', promptModifier: 'aspect ratio 4:3' },
  { id: '1:1', name: '1:1', name_zh: '正方形 (1:1)', desc: '適合 Instagram 輪播卡片', promptModifier: 'aspect ratio 1:1' },
  { id: '3:4', name: '3:4', name_zh: '直向 (3:4)', desc: '適合手機簡報分享', promptModifier: 'aspect ratio 3:4' },
  { id: '9:16', name: '9:16', name_zh: '直向 (9:16)', desc: '適合手機限時動態簡報', promptModifier: 'aspect ratio 9:16' },
];

export const SLIDE_AUDIENCES: SkillOption[] = [
  { id: 'general', name: 'General', name_zh: '通用受眾', desc: '通俗易懂，大眾科普', promptModifier: 'Target audience: general readers. Broad appeal, clear explanations, relatable examples, no heavy jargon.' },
  { id: 'beginners', name: 'Beginners', name_zh: '初學者', desc: '教學導向，循序漸進', promptModifier: 'Target audience: beginners. Educational focus, step-by-step structure, explaining core concepts from scratch.' },
  { id: 'experts', name: 'Experts', name_zh: '專家學者', desc: '學術深度，嚴謹術語', promptModifier: 'Target audience: experts. Technical depth, domain knowledge assumed, precise terminology, dense data acceptable.' },
  { id: 'executives', name: 'Executives', name_zh: '高階主管', desc: '結論先行，高度簡化，看重價值', promptModifier: 'Target audience: executives. High-level insights, outcome/strategic focus, action-oriented, zero technical jargon.' },
];

export const SLIDE_OPTION_GROUPS = [
  { key: 'preset' as const, label: '風格套裝', options: SLIDE_PRESETS },
  { key: 'aspect' as const, label: '尺寸比例', options: SLIDE_ASPECTS },
  { key: 'audience' as const, label: '受眾定位', options: SLIDE_AUDIENCES },
];

export function buildSlideDeckPrompt(content: string, config: SlideDeckSkillConfig): string {
  const presetMod = SLIDE_PRESETS.find(o => o.id === config.preset)?.promptModifier ?? '';
  const audienceMod = SLIDE_AUDIENCES.find(o => o.id === config.audience)?.promptModifier ?? '';
  const aspectMod = SLIDE_ASPECTS.find(o => o.id === config.aspect)?.promptModifier ?? 'aspect ratio 16:9';

  return `
Create a slide deck presentation image.

STYLE PRESET: ${config.preset}
${presetMod}

AUDIENCE: ${config.audience}
${audienceMod}

ASPECT RATIO:
${aspectMod}

DESIGN PHILOSOPHY:
- Self-explanatory without verbal commentary
- Logical flow when scrolling
- All necessary context within each slide
- Optimized for social media sharing

CONTENT:
${content}
  `.trim();
}
