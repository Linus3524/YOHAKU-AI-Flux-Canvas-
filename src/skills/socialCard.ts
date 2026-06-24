// 設計大師 — 社群圖卡 Skill
import { SkillOption } from './sticker';

export interface SocialCardSkillConfig {
  style: string;
  layout: string;
  strategy: string;
  aspect: string;
}

export const SOCIAL_DEFAULT_CONFIG: SocialCardSkillConfig = {
  style: 'cute',
  layout: 'balanced',
  strategy: 'info-dense',
  aspect: '3:4', // 預設小紅書/Threads 直向比例
};

export const SOCIAL_STYLES: SkillOption[] = [
  { id: 'cute', name: 'Cute', name_zh: '可愛風', desc: '粉嫩少女感、貼紙手帳風。小紅書與 IG 經典風格', promptModifier: 'girly cute aesthetic, pastel colors, soft stickers, ribbon details, polaroid frames, hand-drawn stars/sparkles.' },
  { id: 'bold', name: 'Bold', name_zh: '大膽吸睛', desc: '高對比強衝擊、粗描邊與螢光強調。適合知識乾貨與 Threads/FB 封面', promptModifier: 'high contrast bold graphics, dark background with neon yellow/red accents, thick black outlines, dramatic callout elements.' },
  { id: 'fresh', name: 'Fresh', name_zh: '清新自然', desc: '薄荷綠/天藍色調、留白充足。適合健康養生、生活感貼文', promptModifier: 'clean fresh natural aesthetic, soft mint green/sky blue/white colors, botanical leaf details, generous whitespace.' },
  { id: 'minimal', name: 'Minimal', name_zh: '極簡精緻', desc: '黑白灰主色、纖細線條。適合高檔品牌、專業理智內容', promptModifier: 'minimalist clean aesthetic, off-white background, black hairline borders, refined simple spacing, single accent color.' },
  { id: 'notion', name: 'Notion風', name_zh: 'Notion風', desc: '極簡黑白手繪線稿、配淡雅色塊。知性且有質感', promptModifier: 'Notion minimalist hand-drawn line art, black/gray ink style, thick wobble outlines, pastel color highlights, ample whitespace.' },
  { id: 'pop', name: 'Pop', name_zh: '波普潮流', desc: '對比強烈的美式漫畫波普風。適合潮流、趣聞、社群爆點', promptModifier: 'vibrant pop art style, bold primary colors (red, yellow, blue), halftone dots, exclamation bubbles, dynamic shapes.' },
  { id: 'retro', name: 'Retro', name_zh: '復古懷舊', desc: '牛皮紙/底片顆粒質感、復古配色。適合故事、經典語錄', promptModifier: 'vintage retro aesthetic, film grain, aged paper texture, faded orange/teal colors, filmstrip frames, stamp margins.' },
  { id: 'study-notes', name: 'Study Notes', name_zh: '學霸筆記', desc: '俯瞰課桌寫實照片感、密密麻麻的手寫筆記與紅筆圈畫', promptModifier: 'top-down study desk photo, realistic handwritten text, blue/black ballpoint ink, yellow highlighter, red pen circle annotations.' },
  { id: 'warm', name: 'Warm', name_zh: '溫慢療癒', desc: '暖橘/奶茶色系、柔光氛圍。適合心路歷程、情感共鳴', promptModifier: 'cozy warm healing aesthetic, warm orange/cream colors, soft glow lighting, coffee cups, polaroid tape corners.' },
  { id: 'chalkboard', name: 'Chalkboard', name_zh: '黑板手繪', desc: '黑板背景與粉筆手繪，懷舊教育感。適合教學與圖解', promptModifier: 'classroom chalkboard aesthetic, chalk illustrations, chalk dust smudges, colorful chalk text highlights.' },
];

export const SOCIAL_LAYOUTS: SkillOption[] = [
  { id: 'sparse', name: 'Sparse', name_zh: '稀疏 (低密度)', desc: '單一焦點、60-70% 留白。適合金句或首圖封面', promptModifier: 'Sparse Layout: low info density, 60-70% whitespace, single focal point centered, maximum visual impact.' },
  { id: 'balanced', name: 'Balanced', name_zh: '平衡 (中密度)', desc: '常規資訊布局，3-4 個重點。適合一般內容頁', promptModifier: 'Balanced Layout: medium density, 40-50% whitespace, top-weighted title, 3-4 points distributed evenly below.' },
  { id: 'dense', name: 'Dense', name_zh: '密集 (高密度)', desc: '網格或分區，5-8 個要點。適合知識卡片、乾貨彙整', promptModifier: 'Dense Layout: high info density, 20-30% whitespace, organized grid cells, compact but highly readable.' },
  { id: 'list', name: 'List', name_zh: '垂直列表', desc: '序號或清單排版，4-7 項。適合步驟指南、排行榜', promptModifier: 'List Layout: vertical enumeration structure, 4-7 items, left-aligned with clear number/bullet hierarchy.' },
  { id: 'comparison', name: 'Comparison', name_zh: '左右對比', desc: '對稱二元分割。適合前後對照、產品對比、紅黑榜', promptModifier: 'Comparison Layout: left vs right split layout, symmetrical sections, visual divider between contrasting points.' },
  { id: 'flow', name: 'Flow', name_zh: '線性流程', desc: '節點與連接箭頭。適合工作流、歷史時間線、操作步驟', promptModifier: 'Flow Layout: connected nodes with direction arrows, top-to-bottom or left-to-right progression.' },
  { id: 'mindmap', name: 'Mindmap', name_zh: '心智圖', desc: '中心點向外輻射分支。適合概念發散、主題解析', promptModifier: 'Mindmap Layout: central topic node with organic curved branch lines radiating outward to sub-nodes.' },
  { id: 'quadrant', name: 'Quadrant', name_zh: '四象限', desc: '2x2 矩陣分區。適合 SWOT、象限分析、分類管理', promptModifier: 'Quadrant Layout: 2x2 grid matrix, clear X/Y axis labels, four distinct quadrants with content.' },
];

export const SOCIAL_STRATEGIES: SkillOption[] = [
  { id: 'info-dense', name: 'Information-Dense', name_zh: '資訊密集型', desc: '價值優先，結構清晰。適合干貨、教程', promptModifier: 'Strategy: Information-Dense. Value-first, professional credibility, explicit points, conclusion-card structure.' },
  { id: 'story-driven', name: 'Story-Driven', name_zh: '故事驅動型', desc: '個人經歷主線，情感共鳴。適合親測分享', promptModifier: 'Strategy: Story-Driven. Personal experience narrative, emotional resonance, Hook -> Problem -> Experience -> Conclusion.' },
  { id: 'visual-first', name: 'Visual-First', name_zh: '視覺優先型', desc: '視覺衝擊為核心，文字極簡。適合穿搭、美妝', promptModifier: 'Strategy: Visual-First. Visual impact as core, minimal text, hero lifestyle image with small CTA badge.' },
];

export const SOCIAL_ASPECTS: SkillOption[] = [
  { id: '1:1', name: '1:1', name_zh: '正方形 (1:1)', desc: '最適合 IG / FB 常規貼文', promptModifier: 'aspect ratio 1:1' },
  { id: '3:4', name: '3:4', name_zh: '直向 (3:4)', desc: '小紅書 / Threads / IG 資訊流', promptModifier: 'aspect ratio 3:4' },
  { id: '9:16', name: '9:16', name_zh: '垂直限動 (9:16)', desc: 'IG 限時動態 / Reels 封面', promptModifier: 'aspect ratio 9:16' },
];

export const SOCIAL_OPTION_GROUPS = [
  { key: 'style' as const, label: '卡片風格', options: SOCIAL_STYLES },
  { key: 'layout' as const, label: '排版布局', options: SOCIAL_LAYOUTS },
  { key: 'strategy' as const, label: '文案策略', options: SOCIAL_STRATEGIES },
  { key: 'aspect' as const, label: '畫面比例', options: SOCIAL_ASPECTS },
];

export function buildSocialCardPrompt(content: string, config: SocialCardSkillConfig): string {
  const styleMod = SOCIAL_STYLES.find(o => o.id === config.style)?.promptModifier ?? '';
  const layoutMod = SOCIAL_LAYOUTS.find(o => o.id === config.layout)?.promptModifier ?? '';
  const strategyMod = SOCIAL_STRATEGIES.find(o => o.id === config.strategy)?.promptModifier ?? '';
  const aspectMod = SOCIAL_ASPECTS.find(o => o.id === config.aspect)?.promptModifier ?? '';

  return `
Create a professional social media infographic card (suitable for Instagram, Facebook, Threads, or Xiaohongshu).

STYLE: ${config.style}
${styleMod}

LAYOUT: ${config.layout}
${layoutMod}

STRATEGY: ${config.strategy}
${strategyMod}

ASPECT RATIO: ${config.aspect} (${aspectMod})

VISUAL CONSISTENCY:
- Establish a visual anchor with consistent color palettes, fonts, and illustration styles.
- Maintain a clean, readable text layout optimized for mobile screens.

CONTENT:
${content}
  `.trim();
}
