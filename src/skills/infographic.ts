// 設計大師 — 資訊圖表 Skill
import { SkillOption } from './sticker';

export interface InfographicSkillConfig {
  layout: string;
  style: string;
  aspect: string;
}

export const INFOGRAPHIC_DEFAULT_CONFIG: InfographicSkillConfig = {
  layout: 'bento-grid',
  style: 'craft-handmade',
  aspect: 'square',
};

export const INFOGRAPHIC_LAYOUTS: SkillOption[] = [
  { id: 'bento-grid', name: 'Bento Grid', name_zh: '便當網格', desc: '模組化網格，主次分明。適合多主題概述、特點展示', promptModifier: 'Grid of rectangular cells with mixed cell sizes (1x1, 2x1, 1x2, 2x2). Hero cell for main point. Clear boundaries.' },
  { id: 'binary-comparison', name: 'Binary Comparison', name_zh: '二元對比', desc: '左右分割，鏡像排版。適合前後對比、優缺點分析', promptModifier: 'Vertical divider splitting image in half. Left side: Item A/Before/Pro. Right side: Item B/After/Con. VS symbol centered.' },
  { id: 'bridge', name: 'Bridge', name_zh: '橋樑', desc: '橫向跨越結構。適合痛點至解決方案的進程分析', promptModifier: 'Left side: problem/current. Right side: solution/future. Bridge structure connects both platforms with steps.' },
  { id: 'circular-flow', name: 'Circular Flow', name_zh: '循環流程', desc: '環形箭頭循環。適合產品生命週期、反饋閉環', promptModifier: 'Circular loop with steps and arrows showing direction. No clear start/end (continuous process).' },
  { id: 'hub-spoke', name: 'Hub and Spoke', name_zh: '中心輻射', desc: '核心向外延伸。適合主題分支、產品功能生態圖', promptModifier: 'Central hub (main concept) with spokes radiating outward to surrounding nodes. Clean lines, icons per node.' },
  { id: 'iceberg', name: 'Iceberg', name_zh: '冰山', desc: '水面上與水面下層次。適合表象與深層根因分析', promptModifier: 'Waterline dividing visible tip (surface factors) from a larger underwater mass (hidden deep layers).' },
  { id: 'linear-progression', name: 'Linear Progression', name_zh: '線性進程', desc: '單向時間軸或步驟。適合操作步驟、發展里程碑', promptModifier: 'Linear path (horizontal/vertical) with numbered nodes/milestones. Clear start, progress flow, and end.' },
  { id: 'structural-breakdown', name: 'Structural Breakdown', name_zh: '結構拆解', desc: '主體結構爆炸圖與標籤。適合硬體零件、系統組成', promptModifier: 'Central subject shown in exploded or cutaway view. Labels with thin callout lines pointing to parts.' },
  { id: 'tree-branching', name: 'Tree Branching', name_zh: '樹形分支', desc: '分類樹狀圖。適合層級結構、決策路徑、組織架構', promptModifier: 'Root concept at top/left, branching into subcategories and child nodes. Clean hierarchical structure.' },
  { id: 'venn-diagram', name: 'Venn Diagram', name_zh: '維恩圖', desc: '交疊的圓形。適合概念交集、定位分析、受眾重疊', promptModifier: '2-3 overlapping translucent circles. Overlap regions show shared elements, center is common to all.' },
];

export const INFOGRAPHIC_STYLES: SkillOption[] = [
  { id: 'craft-handmade', name: 'Craft Handmade', name_zh: '手作質感', desc: '手繪或剪紙質感，溫馨有機。適合大眾科普', promptModifier: 'Hand-drawn and paper craft aesthetic. Organic lines, layered paper cutouts, drop shadows, warm cream background.' },
  { id: 'claymation', name: 'Claymation', name_zh: '黏土動畫', desc: '3D 黏土捏製玩偶風格，充滿童趣與定格動畫感', promptModifier: '3D clay figure aesthetic. Fingerprint marks, rounded sculpted forms, soft shadows, miniature clay set appearance.' },
  { id: 'kawaii', name: 'Kawaii', name_zh: 'Q版萌系', desc: '日系可愛風格，大眼與馬卡龍色調。適合生活趣味', promptModifier: 'Japanese cute style. Big sparkly eyes, rounded soft shapes, pastel pink/mint/lavender tones, stars and hearts.' },
  { id: 'storybook-watercolor', name: 'Storybook Watercolor', name_zh: '童話水彩', desc: '暈染水彩效果，邊緣柔軟。適合情感敘事、自然', promptModifier: 'Watercolor washes, soft color bleeds, dreamlike atmosphere, delicate line work, hand-painted textures.' },
  { id: 'chalkboard', name: 'Chalkboard', name_zh: '黑板手繪', desc: '黑板背景與粉筆筆觸，懷舊教育感。適合教學', promptModifier: 'Chalkboard black green background, chalk drawings with sketchy imperfect lines, chalk dust effects, chalk text.' },
  { id: 'cyberpunk-neon', name: 'Cyberpunk Neon', name_zh: '賽博霓虹', desc: '暗色底配霓虹發光，未來科技感。適合遊戲、潮流', promptModifier: 'Neon glow lines, deep black/purple background, digital glitch effects, circuits, holographic targets.' },
  { id: 'bold-graphic', name: 'Bold Graphic', name_zh: '大膽波普', desc: '美式漫畫風，粗黑邊線與網點陰影。吸睛度高', promptModifier: 'High-contrast comic style, bold black outlines, halftone dot patterns, dramatic shadows, action lines.' },
  { id: 'technical-schematic', name: 'Technical Schematic', name_zh: '技術線圖', desc: '藍圖或工程圖，精確比例與尺寸標註。適合科技架構', promptModifier: 'Technical engineering precision. Blueprint blue or grid background, white/cyan line work, dimension indicators.' },
  { id: 'ui-wireframe', name: 'UI Wireframe', name_zh: 'UI 線框', desc: '灰階介面草圖，標註規格與流程。適合產品設計', promptModifier: 'Grayscale UI mockup wireframe elements, placeholder boxes with X, annotation redlines, clean layout.' },
  { id: 'retro-pop-grid', name: 'Retro Pop Grid', name_zh: '復古網格', desc: '瑞士網格排版，粗邊線與飽和色塊。設計感極強', promptModifier: '1970s retro pop art, Swiss international grid cells, thick black outlines, solid flat retro colors, checkerboard fills.' },
];

export const INFOGRAPHIC_ASPECTS: SkillOption[] = [
  { id: 'square', name: 'Square (1:1)', name_zh: '正方形 (1:1)', desc: '適合社群貼文', promptModifier: 'aspect ratio 1:1' },
  { id: 'landscape', name: 'Landscape (16:9)', name_zh: '橫向 (16:9)', desc: '適合簡報、螢幕展示', promptModifier: 'aspect ratio 16:9' },
  { id: 'portrait', name: 'Portrait (3:4)', name_zh: '縱向 (3:4)', desc: '適合手機閱讀、資訊流', promptModifier: 'aspect ratio 3:4' },
];

export const INFOGRAPHIC_OPTION_GROUPS = [
  { key: 'layout' as const, label: '排版布局', options: INFOGRAPHIC_LAYOUTS },
  { key: 'style' as const, label: '視覺風格', options: INFOGRAPHIC_STYLES },
  { key: 'aspect' as const, label: '畫面比例', options: INFOGRAPHIC_ASPECTS },
];

export function buildInfographicPrompt(content: string, config: InfographicSkillConfig): string {
  const layoutMod = INFOGRAPHIC_LAYOUTS.find(o => o.id === config.layout)?.promptModifier ?? '';
  const styleMod = INFOGRAPHIC_STYLES.find(o => o.id === config.style)?.promptModifier ?? '';
  const aspectMod = INFOGRAPHIC_ASPECTS.find(o => o.id === config.aspect)?.promptModifier ?? '';

  return `
Create a professional infographic.

LAYOUT: ${config.layout}
${layoutMod}

VISUAL STYLE: ${config.style}
${styleMod}

CORE PRINCIPLES:
- Preserve all source data verbatim—no summarization or rephrasing
- Structure for visual communication (headlines, labels, visual elements)
- Define learning objectives before structuring content

ASPECT RATIO: ${config.aspect} (${aspectMod})

CONTENT:
${content}
  `.trim();
}
