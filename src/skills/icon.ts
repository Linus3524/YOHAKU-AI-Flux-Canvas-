// ============================================================
// 設計大師 — 圖示設計 (Icon Design) Skill
// 結構化選項 → 組裝成精準的圖示生成 prompt。
// 內容（content）來自便利貼文字；此模組負責配置與呈現方式。
// ============================================================

import { SkillOption } from './sticker';

export interface IconSkillConfig {
  layoutMode: 'single' | 'collection';
  sheetCount: number;
  collectionItemPrompts: string[];
  style: string;          // 預設 10+ 種常見 icon 風格
  complexity: 'minimalist' | 'normal' | 'complex'; // 精緻複雜度
  aspect: string;         // 比例
  artStyle: string;       // 疊加的藝術風格 (可選填或無)
  background: 'transparent' | 'white' | 'colored' | 'pattern';
}

export const ICON_DEFAULT_CONFIG: IconSkillConfig = {
  layoutMode: 'single',
  sheetCount: 6,
  collectionItemPrompts: [],
  style: 'outline-mono',
  complexity: 'normal',
  aspect: '1:1',
  artStyle: 'none',
  background: 'transparent',
};

// ── 12 種對標業界主流的 Icon 風格 ──────────────────────────────────────
export const ICON_STYLES: SkillOption[] = [
  {
    id: 'outline-mono',
    name: 'Minimal Outline',
    name_zh: '單色線條',
    desc: '乾淨的單色等寬線條設計，無填充色',
    promptModifier: 'Style: Minimalist monoline outline icon. Single-weight clean outlines, open path structures, NO solid color fills. Pure black lines on white background (or pure outline silhouette). Symmetrical and visually balanced.'
  },
  {
    id: 'flat-solid',
    name: 'Solid Filled',
    name_zh: '扁平填色',
    desc: '二維扁平純色塊填充，無描邊',
    promptModifier: 'Style: Flat 2D solid filled icon. Solid color blocks only, strictly NO outlines, NO gradients, NO shadows. Minimalist silhouette with clean shapes and high-contrast hues.'
  },
  {
    id: 'line-fill',
    name: 'Line & Fill',
    name_zh: '線條與填充',
    desc: '清晰線條描邊，搭配純色板塊填充',
    promptModifier: 'Style: Flat line art and color fill icon. Solid color fills perfectly nested within (or slightly offset from) clear bold dark outlines. Fun, modern, and highly readable.'
  },
  {
    id: 'gradient',
    name: 'Modern Gradient',
    name_zh: '現代漸變',
    desc: '流暢雙色/多色漸層，展現數位活力',
    promptModifier: 'Style: Modern gradient icon with vibrant dual-tone or multi-tone color transitions. Smooth blends, soft vector reflections, digital-native aesthetic, clean look without 3D models.'
  },
  {
    id: 'clay-3d',
    name: '3D Clay / Plastic',
    name_zh: '3D 黏土塑膠',
    desc: '具膨脹體積感、柔和陰影的立體圖示',
    promptModifier: 'Style: Volumetric 3D clay / plastic icon. Puffy and inflated forms, soft diffuse lighting, gentle occlusion shadows underneath, glossy resin highlights, tactile toy-like quality.'
  },
  {
    id: 'glassmorphism',
    name: 'Frosted Glassmorphism',
    name_zh: '磨砂玻璃',
    desc: '半透明磨砂、折射與模糊的玻璃質感',
    promptModifier: 'Style: Frosted glassmorphism icon. Semi-transparent layers, glassy refraction, blurred background visible through layers, crisp glowing highlights along the edges, premium iOS/macOS look.'
  },
  {
    id: 'isometric',
    name: 'Isometric 3D',
    name_zh: '等角立體',
    desc: '3D 立體投影，等角透視，適合系統圖示',
    promptModifier: 'Style: Isometric 3D icon. Rendered at a precise 30-degree isometric perspective, showing top, left, and right planes. Clean geometric structure, technical and digital feel.'
  },
  {
    id: 'vintage-retro',
    name: 'Vintage Retro',
    name_zh: '復古做舊',
    desc: '斑駁網點、懷舊色調與印刷感質感',
    promptModifier: 'Style: Vintage retro distressed icon. Faded low-saturation color palette, subtle halftone screen dot texture, worn ink stamp edges, nostalgic mid-century design.'
  },
  {
    id: 'pixel-art',
    name: 'Pixel Art',
    name_zh: '像素網格',
    desc: '復古 8-bit / 16-bit 像素圖示',
    promptModifier: 'Style: 8-bit / 16-bit pixel art icon. Deliberately aligned to a visible pixel grid, sharp square edges, limited retro color palette, nostalgic game style.'
  },
  {
    id: 'neon-glow',
    name: 'Neon Glow',
    name_zh: '霓虹發光',
    desc: '暗底上帶有亮麗自發光的霓虹線條',
    promptModifier: 'Style: Futuristic neon glow icon. High-contrast glowing vector lines, bright self-illuminating colors on a dark background, soft electric lighting halo.'
  },
  {
    id: 'papercut',
    name: 'Flat Papercut',
    name_zh: '層疊剪紙',
    desc: '層疊紙張、帶有些微高度與陰影層次',
    promptModifier: 'Style: Multi-layered papercut icon. Stacked vector paper layers, subtle crisp drop shadows between overlapping layers, tactile 3D relief art effect.'
  },
  {
    id: 'metallic',
    name: 'Gold / Chrome Metallic',
    name_zh: '金屬質感',
    desc: '亮麗鏡面反射、鍍金或鍍鉻的貴金屬質感',
    promptModifier: 'Style: Polished metallic chrome / gold icon. High specular reflections, mirror-like metallic finish, shiny highlights, luxurious and premium feel.'
  }
];

// ── 精緻複雜度 (Complexity Option) ──────────────────────────────────
export const ICON_COMPLEXITIES = [
  {
    id: 'minimalist',
    name: 'Minimalist',
    name_zh: '簡約',
    desc: '極簡抽象幾何，低資訊密度',
    promptModifier: 'COMPLEXITY DETAIL: Ruthless simplicity. Restricted to basic geometric primitives, maximum white space, zero ornamentations, ultra-clean silhouettes, highly abstract form.'
  },
  {
    id: 'normal',
    name: 'Normal',
    name_zh: '普通',
    desc: '細節平衡，標準圖示密度',
    promptModifier: 'COMPLEXITY DETAIL: Balanced complexity. Standard detail density, clear functional representation, legible at medium sizes, professional production quality.'
  },
  {
    id: 'complex',
    name: 'Complex',
    name_zh: '複雜',
    desc: '細節豐富，帶有微小紋理與層次',
    promptModifier: 'COMPLEXITY DETAIL: High-fidelity details. Detailed micro-textures, intricate nested elements, auxiliary decorations, high-end elaborate composition.'
  }
];

// ── 比例 ──────────────────────────────────────────────────────
export const ICON_ASPECTS: SkillOption[] = [
  { id: '1:1', name: '1:1', name_zh: '正方形 (1:1)', desc: '標準圖示比例', promptModifier: 'aspect ratio 1:1' },
  { id: '4:3', name: '4:3', name_zh: '標準 (4:3)', desc: '適合簡報或卡片圖示', promptModifier: 'aspect ratio 4:3' },
  { id: '16:9', name: '16:9', name_zh: '寬螢幕 (16:9)', desc: '適合橫幅或首圖圖示', promptModifier: 'aspect ratio 16:9' },
  { id: '3:4', name: '3:4', name_zh: '直向 (3:4)', desc: '適合直式排版圖示', promptModifier: 'aspect ratio 3:4' },
];

// ── 背景 ──────────────────────────────────────────────────────
export const ICON_BACKGROUNDS: SkillOption[] = [
  {
    id: 'transparent',
    name: 'Transparent',
    name_zh: '透明背景',
    desc: '使用高飽和去背底色，生成後自動去背',
    promptModifier: 'Background: A single FLAT, FULLY-SATURATED solid chroma-key background color. Pick whichever vivid, fully-saturated color is VISUALLY FARTHEST from every color used in the icon subject (vivid green, magenta/hot-pink, cyan, or electric blue) — e.g. for a warm/red subject use green, for a green subject use magenta. The background must be plain and evenly lit: no scenery, gradients, patterns, texture, or shading. Keep the subject fully inside the frame with generous margin and crisp, high-contrast edges.'
  },
  {
    id: 'white',
    name: 'White',
    name_zh: '白色背景',
    desc: '乾淨的白色底，帶有微弱環境陰影',
    promptModifier: 'Background: Solid pure white background, clean presentation, soft contact shadow underneath the icon.'
  },
  {
    id: 'colored',
    name: 'Colored',
    name_zh: '彩色背景',
    desc: '配合圖示色調的單色底',
    promptModifier: 'Background: A single solid colored background that harmonizes with the icon colors, flat matte finish.'
  },
  {
    id: 'pattern',
    name: 'Patterned',
    name_zh: '圖案背景',
    desc: '簡約裝飾性格線或點陣背景',
    promptModifier: 'Background: Minimalist background pattern (clean dot grid or subtle lines) to frame the icon.'
  }
];

export const ICON_OPTION_GROUPS = [
  { key: 'style' as const, label: '風格', options: ICON_STYLES },
  { key: 'complexity' as const, label: '精緻度', options: ICON_COMPLEXITIES.map(c => ({ id: c.id, name: c.name, name_zh: c.name_zh, desc: c.desc, promptModifier: c.promptModifier })) },
  { key: 'aspect' as const, label: '比例', options: ICON_ASPECTS },
];

// ── 組裝 prompt ───────────────────────────────────────────────
export function buildIconPrompt(content: string, config: IconSkillConfig): string {
  const isSheet = config.layoutMode === 'collection';
  const subject = (content || '').trim() || 'A professional UI icon concept';
  const aspectMod = ICON_ASPECTS.find(o => o.id === config.aspect)?.promptModifier ?? 'aspect ratio 1:1';
  
  const styleMod = ICON_STYLES.find(o => o.id === config.style)?.promptModifier ?? '';
  const complexityMod = ICON_COMPLEXITIES.find(o => o.id === config.complexity)?.promptModifier ?? '';
  const bgMod = ICON_BACKGROUNDS.find(o => o.id === config.background)?.promptModifier ?? '';

  let layoutInstruction = '';
  if (isSheet) {
    const itemCount = Math.max(2, Math.min(20, config.sheetCount || 6));
    const items = (config.collectionItemPrompts || []).filter(Boolean);
    
    layoutInstruction = `Icon Sheet Collection: Generate exactly ${itemCount} distinct, individual icons arranged on a single canvas. They must belong to the same visual system, sharing consistent line weights, matching perspective, color scheme, and aesthetic treatment. Arrange them in a clean grid or single row layout with generous spacing between each icon, no overlap, and no cropped edges. Each icon should be fully independent and complete.`;
    
    if (items.length > 0) {
      layoutInstruction += ` The icons must depict the following subjects, one icon per subject, in reading order: ${items.map((item, index) => `${index + 1}. ${item}`).join('; ')}.`;
      if (items.length < itemCount) {
        layoutInstruction += ` Add ${itemCount - items.length} additional related icon concepts to reach the total of ${itemCount} icons.`;
      }
    }
  } else {
    layoutInstruction = 'Single Icon Design: A single centered icon representing the subject. Centered composition with generous margins.';
  }

  return `
Create a professional UI / App Icon following these requirements precisely. The icon must be of production-quality, crisp, clean, and highly legible.

1. SUBJECT & CONCEPT
${subject}

2. COMPOSITION & LAYOUT
${layoutInstruction}

3. ARTISTIC STYLE
${styleMod}
${complexityMod}

4. BACKGROUND
${bgMod}
CRITICAL — WHOLE-CANVAS BACKGROUND: The ENTIRE canvas background, including ALL empty space around and between the icons (especially the large empty areas above/below a short row of icons on a square canvas), must be this exact same uniform background — perfectly clean, flat and even. Absolutely NO paper / marble / fabric / canvas texture, NO grain or noise, NO gradient, NO vignette, NO patterns, and NO decorative fills anywhere in the empty space. Empty space stays plain and identical to the rest of the background.

5. ASPECT RATIO
${aspectMod}

6. NEGATIVE CONSTRAINTS (CRITICAL)
- STRICTLY NO realistic photos, NO human portraits, NO blurry edges.
- NO 3D mockup scenes, NO product packaging shadows, NO real-world environments.
- NO background texture, paper/marble/fabric grain, noise, vignette, or decorative fill — every empty area must remain perfectly clean and uniform (no "drawing" in the outer/empty regions).
- NO text, letters, typography, signatures, or watermarks in the design (unless specifically part of a wordmark/lettermark concept).
- Ensure high contrast between the icon outlines/borders and the background for easy mask extraction.
`.trim();
}
