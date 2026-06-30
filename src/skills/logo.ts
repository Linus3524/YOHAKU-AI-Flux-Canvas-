// 設計大師 — Logo 設計 Skill
import { SkillOption } from './sticker';

export interface LogoSkillConfig {
  type: string;
  style: string;
  palette: string;
  industry: string;
  mood: string;
  size: string;
  brandName: string;
  slogan: string;
  // 品牌套件欄位
  isBrandKit: boolean;
  brandKitResolution: '1K' | '2K' | '4K';
  targetAudience: string;
  positioning: string;
  personality: string;
  usageContexts: string;
}

export const LOGO_DEFAULT_CONFIG: LogoSkillConfig = {
  type: 'wordmark',
  style: 'flat',
  palette: 'monochrome',
  industry: 'general',
  mood: 'minimal',
  size: '1:1',
  brandName: '',
  slogan: '',
  // 品牌套件預設值
  isBrandKit: false,
  brandKitResolution: '2K',
  targetAudience: '大眾消費者、注重質感的生活美學追求者',
  positioning: '高端、簡約、有獨特品牌記憶點',
  personality: '現代、可靠、優雅、精緻',
  usageContexts: '官網、社媒頭像、名片、產品包裝',
};

export const LOGO_TYPES: SkillOption[] = [
  { id: 'wordmark', name: 'Wordmark', name_zh: '文字標識', desc: '品牌名稱即為標識，注重自訂字體', promptModifier: 'Design a WORDMARK logo where the brand name itself IS the logo. Focus on custom lettering with unique letterforms, precise kerning, and strong typographic personality. No icon or symbol.' },
  { id: 'lettermark', name: 'Lettermark', name_zh: '字母標識', desc: '品牌縮寫，1-3個字母，極簡精緻', promptModifier: 'Design a LETTERMARK / MONOGRAM logo using only 1-3 initials. The letters should be compact, geometric or decoratively treated. Emphasize clever negative space or interlocking forms.' },
  { id: 'icon', name: 'Icon / Symbol', name_zh: '圖標標識', desc: '獨立的圖案標記，不含文字', promptModifier: 'Design a standalone PICTORIAL MARK / ICON logo with NO text whatsoever. Create a single recognizable symbol or object. The symbol should be simple, memorable, and work as a single-color silhouette.' },
  { id: 'combination', name: 'Combination Mark', name_zh: '組合標識', desc: '圖案加上文字的排版組合', promptModifier: 'Design a COMBINATION MARK logo with both an icon/symbol AND the brand name text arranged as a cohesive lockup. Ensure clear visual hierarchy between mark and text.' },
  { id: 'emblem', name: 'Emblem', name_zh: '徽章標識', desc: '文字包覆在形狀中（印章、盾牌）', promptModifier: 'Design an EMBLEM logo where text is enclosed within or integrated into a containing shape — badge, seal, crest, or shield. The emblem should feel authoritative, established, and work well as a stamp.' },
  { id: 'mascot', name: 'Mascot', name_zh: '吉祥物', desc: '具個性的插畫角色/動物', promptModifier: 'Design a MASCOT logo featuring an illustrated character or creature that represents the brand. The character should be friendly, approachable, and have a distinctive personality.' },
  { id: 'abstract', name: 'Abstract Mark', name_zh: '抽象標識', desc: '非具象的幾何造形', promptModifier: 'Design an ABSTRACT MARK logo — a non-representational geometric form that does not depict any real-world object. Convey brand feeling through pure form, color, and movement.' },
];

export const LOGO_STYLES: SkillOption[] = [
  { id: 'flat', name: 'Flat / Minimal', name_zh: '扁平', desc: '乾淨的扁平設計，純色填滿', promptModifier: 'VISUAL STYLE: Clean flat design. No gradients, no shadows, no textures, no 3D effects. Use solid color fills only with uniform stroke weights.' },
  { id: 'gradient', name: 'Gradient', name_zh: '漸變', desc: '現代的漸變色彩過渡', promptModifier: 'VISUAL STYLE: Modern gradient design. Smooth, vibrant color transitions within shapes creating depth and dimension without 3D modeling.' },
  { id: '3d', name: '3D / Dimensional', name_zh: '立體', desc: '具光澤與深度的三維效果', promptModifier: 'VISUAL STYLE: Three-dimensional rendering with realistic lighting, soft shadows, and volumetric depth. Glossy or matte material surfaces.' },
  { id: 'line-art', name: 'Line Art', name_zh: '線條', desc: '僅用線條描繪，無填滿色', promptModifier: 'VISUAL STYLE: Pure line art — single-weight or variable-weight outlines only, NO color fills. Clean continuous strokes.' },
  { id: 'geometric', name: 'Geometric', name_zh: '幾何', desc: '以精準的幾何基本形構成', promptModifier: 'VISUAL STYLE: Geometric construction from precise primitives — circles, triangles, squares, golden ratio spirals. Mathematical precision.' },
  { id: 'hand-drawn', name: 'Hand-Drawn', name_zh: '手繪', desc: '帶有手工、職人溫度的筆觸', promptModifier: 'VISUAL STYLE: Hand-drawn, organic quality with visible human touch. Slightly imperfect strokes, natural texture, variable line weight.' },
  { id: 'vintage', name: 'Vintage / Retro', name_zh: '復古', desc: '做舊紋理與經典排版風', promptModifier: 'VISUAL STYLE: Vintage/retro aesthetic with aged textures, distressed edges, and worn patina. Classic typography with decorative serifs.' },
  { id: 'pixel', name: 'Pixel Art', name_zh: '像素', desc: '刻意以網格像素對齊的設計', promptModifier: 'VISUAL STYLE: Pixel art — deliberately pixelated, grid-aligned design with visible square pixels. Limited color palette.' },
];

export const LOGO_PALETTES: SkillOption[] = [
  { id: 'monochrome', name: 'Monochrome', name_zh: '單色', desc: '單一品牌色加上黑/白', promptModifier: 'COLOR SCHEME: Monochrome — use only pure black on white background, or a single brand color on white. The logo must work perfectly in single-color reproduction.' },
  { id: 'dual-tone', name: 'Dual Tone', name_zh: '雙色', desc: '主色搭配一輔助/強調色', promptModifier: 'COLOR SCHEME: Dual tone — exactly two colors plus white. One primary brand color and one accent color with strong contrast.' },
  { id: 'colorful', name: 'Colorful', name_zh: '多彩', desc: '3-5種活潑的配色組合', promptModifier: 'COLOR SCHEME: Colorful — use 3-5 distinct, vibrant colors. Playful, inclusive, dynamic energy. Balanced and harmonious.' },
  { id: 'gradient-colors', name: 'Gradient Colors', name_zh: '漸變色', desc: '2-3色的流暢漸變 transitions', promptModifier: 'COLOR SCHEME: Gradient colors — smooth transitions between 2-3 vibrant colors. Modern, fluid, digital-native feel.' },
  { id: 'earth-tones', name: 'Earth Tones', name_zh: '大地色', desc: '溫暖的棕色、橄欖綠、土色', promptModifier: 'COLOR SCHEME: Earth tones — warm browns, olive greens, terracotta, sand, forest green. Natural, organic, grounded, sustainable.' },
  { id: 'pastel', name: 'Pastel', name_zh: '柔和色', desc: '柔和、低飽和的粉嫩配色', promptModifier: 'COLOR SCHEME: Pastel — soft, desaturated colors. Light pink, mint, lavender, butter yellow, sky blue. Gentle, approachable.' },
  { id: 'bold-contrast', name: 'Bold Contrast', name_zh: '高對比', desc: '高飽和度的主色配強烈對比', promptModifier: 'COLOR SCHEME: Bold contrast — high-saturation primary colors with maximum contrast. Red, blue, yellow, black. Confident and energetic.' },
];

export const LOGO_INDUSTRIES: SkillOption[] = [
  { id: 'tech', name: 'Tech', name_zh: '科技', desc: '科技、網頁、SaaS 服務', promptModifier: 'INDUSTRY CONTEXT: Technology / Internet / SaaS. The logo should convey innovation, precision, and forward-thinking. Clean geometric forms.' },
  { id: 'food', name: 'Food & Beverage', name_zh: '餐飲', desc: '餐廳、食品、飲料品牌', promptModifier: 'INDUSTRY CONTEXT: Food & Beverage / Restaurant. The logo should evoke appetite, warmth, and hospitality. Organic shapes, warm colors.' },
  { id: 'fashion', name: 'Fashion', name_zh: '時尚', desc: '服飾、美容、奢侈品牌', promptModifier: 'INDUSTRY CONTEXT: Fashion / Beauty / Luxury. The logo should exude elegance, sophistication, and premium quality. Refined typography, generous spacing.' },
  { id: 'sports', name: 'Sports', name_zh: '運動', desc: '運動、健身、戶外活動', promptModifier: 'INDUSTRY CONTEXT: Sports / Fitness / Outdoor. The logo should convey energy, movement, strength, and dynamism. Bold forms, angular shapes.' },
  { id: 'education', name: 'Education', name_zh: '教育', desc: '學校、培訓、學術機構', promptModifier: 'INDUSTRY CONTEXT: Education / Learning / Knowledge. The logo should convey wisdom, growth, trust, and accessibility. Book motifs, growth symbols.' },
  { id: 'health', name: 'Health', name_zh: '健康', desc: '醫療、養生、健康管理', promptModifier: 'INDUSTRY CONTEXT: Health / Medical / Wellness. The logo should convey trust, care, cleanliness, and professionalism. Calming colors.' },
  { id: 'finance', name: 'Finance', name_zh: '金融', desc: '銀行、投資、保險行業', promptModifier: 'INDUSTRY CONTEXT: Finance / Banking / Investment. The logo should convey stability, trust, security, and professionalism. Strong geometric forms.' },
  { id: 'creative', name: 'Creative', name_zh: '創意', desc: '設計、藝術、電影、音樂', promptModifier: 'INDUSTRY CONTEXT: Creative / Design / Art / Entertainment. The logo should convey creativity, originality, and artistic flair. Unexpected forms.' },
  { id: 'eco', name: 'Eco / Green', name_zh: '環保', desc: '永續發展、自然有機品牌', promptModifier: 'INDUSTRY CONTEXT: Eco / Sustainability / Nature. The logo should convey environmental consciousness, natural harmony. Leaf motifs, organic shapes.' },
  { id: 'general', name: 'General', name_zh: '通用', desc: '通用類型，不限特定行業', promptModifier: 'INDUSTRY CONTEXT: General purpose — no specific industry constraints. Focus on creating a versatile, memorable mark that works across contexts.' },
];

export const LOGO_MOODS: SkillOption[] = [
  { id: 'playful', name: 'Playful', name_zh: '活潑', desc: '趣味、年輕、親近感', promptModifier: 'MOOD: Playful — fun, youthful, and approachable. Rounded forms, bouncy proportions, and a sense of joy. Avoid anything stiff.' },
  { id: 'professional', name: 'Professional', name_zh: '專業', desc: '可靠、值得信賴、穩健', promptModifier: 'MOOD: Professional — reliable, trustworthy, and established. Clean proportions, balanced composition. Conveys competence.' },
  { id: 'elegant', name: 'Elegant', name_zh: '優雅', desc: '高雅、精緻、高檔感', promptModifier: 'MOOD: Elegant — refined, sophisticated, and premium. Thin strokes, generous whitespace, and luxurious proportions.' },
  { id: 'bold', name: 'Bold', name_zh: '大膽', desc: '強烈、具衝擊力、吸睛', promptModifier: 'MOOD: Bold — strong, impactful, and attention-grabbing. Heavy weights, sharp angles, and commanding presence.' },
  { id: 'minimal', name: 'Minimal', name_zh: '極簡', desc: '克制、純粹、乾淨', promptModifier: 'MOOD: Minimal — restrained to the absolute essentials. Maximum whitespace, fewest possible elements, and ruthless simplicity.' },
  { id: 'friendly', name: 'Friendly', name_zh: '友好', desc: '溫馨、歡迎、親切', promptModifier: 'MOOD: Friendly — warm, welcoming, and approachable. Soft edges, open forms, and inviting proportions.' },
];

export const LOGO_SIZES: SkillOption[] = [
  { id: '1:1', name: '1:1', name_zh: '1:1', desc: '正方形', promptModifier: 'aspect ratio 1:1' },
  { id: '4:3', name: '4:3', name_zh: '4:3', desc: '標準比例', promptModifier: 'aspect ratio 4:3' },
  { id: '16:9', name: '16:9', name_zh: '16:9', desc: '寬螢幕比例', promptModifier: 'aspect ratio 16:9' },
  { id: '3:4', name: '3:4', name_zh: '3:4', desc: '直向比例', promptModifier: 'aspect ratio 3:4' },
];

export const LOGO_OPTION_GROUPS = [
  { key: 'type' as const, label: '類型', options: LOGO_TYPES },
  { key: 'style' as const, label: '視覺風格', options: LOGO_STYLES },
  { key: 'palette' as const, label: '配色方案', options: LOGO_PALETTES },
  { key: 'industry' as const, label: '行業背景', options: LOGO_INDUSTRIES },
  { key: 'mood' as const, label: '品牌調性', options: LOGO_MOODS },
  { key: 'size' as const, label: '比例', options: LOGO_SIZES },
];

export function buildLogoPrompt(content: string, config: LogoSkillConfig): string {
  const typeMod = LOGO_TYPES.find(o => o.id === config.type)?.promptModifier ?? '';
  const styleMod = LOGO_STYLES.find(o => o.id === config.style)?.promptModifier ?? '';
  const paletteMod = LOGO_PALETTES.find(o => o.id === config.palette)?.promptModifier ?? '';
  const industryMod = LOGO_INDUSTRIES.find(o => o.id === config.industry)?.promptModifier ?? '';
  const moodMod = LOGO_MOODS.find(o => o.id === config.mood)?.promptModifier ?? '';
  const sizeMod = LOGO_SIZES.find(o => o.id === config.size)?.promptModifier ?? '';

  return `
Design a professional logo for the brand "${config.brandName || 'My Brand'}".
${config.slogan ? `Brand slogan: "${config.slogan}".` : ''}

LOGO TYPE: ${config.type}
${typeMod}

VISUAL STYLE: ${config.style}
${styleMod}

COLOR PALETTE: ${config.palette}
${paletteMod}

INDUSTRY: ${config.industry}
${industryMod}

MOOD: ${config.mood}
${moodMod}

OUTPUT SIZE: ${config.size} (${sizeMod})

REQUIREMENTS:
- Clean, scalable vector-style output
- The logo should work on both light and dark backgrounds
- Ensure the brand name is legible and well-integrated
- Output as a single centered logo on a clean white background
- No mockups, no background scenes — just the logo mark itself

${content ? `ADDITIONAL CONTEXT:\n${content}` : ''}
  `.trim();
}

export interface LogoBrandOutputSpec {
  id: string;
  title: string;
  aspectRatio: string;
  ratioValue: number;
  note: string;
  guidance: string[];
}

export const LOGO_BRAND_STANDARDS = [
  'A brand style guide must establish consistent rules for logo usage, typography, colors, and design layouts across all assets.',
  'The logo design should be highly recognizable, clean, and memorable; avoid copying famous trademarks or using generic industry templates.',
  'Mockups and preview graphics should ensure high contrast and clear visual presentation for marketing purposes.',
  'Do not add random AI-generated garbled letters or placeholder text unless requested; maintain precise typography.'
];

// 品牌套件延伸資產（4 個，皆錨定使用者選定的主 Logo 圖片，不重新設計標誌本身）。
// 主 Logo 由現有的單張 buildLogoPrompt 流程獨立產生、使用者挑選後才觸發這 4 張延伸。
export const LOGO_BRAND_OUTPUTS: LogoBrandOutputSpec[] = [
  {
    id: 'brand-board',
    title: '品牌視覺板',
    aspectRatio: '16:9',
    ratioValue: 16 / 9,
    note: 'A cohesive brand style guide sheet showing the EXACT provided logo, core color palette, typography mood, and image styling.',
    guidance: [
      'Lay out the EXACT logo mark from the attached reference image (do not redraw or redesign it) alongside a color palette with clear hex color squares, typography choices, and abstract brand styling elements.',
      'Organize the sheet like a professional brand guidelines page with clear visual hierarchy, ample margin, and consistent aesthetic personality.'
    ]
  },
  {
    id: 'stationery-mockup',
    title: '名片 / 信紙 / 包裝盒',
    aspectRatio: '4:3',
    ratioValue: 4 / 3,
    note: 'A realistic flatlay/staged photo mockup showing the brand stationery suite together.',
    guidance: [
      'Generate a realistic top-down flatlay or staged product photo showing THREE items together in one scene: a business card, a letterhead (or envelope), and a product packaging box — all printed with the EXACT provided logo and the brand color palette.',
      'Keep materials, lighting, and styling consistent and professional, as if shot for a real brand presentation deck.'
    ]
  },
  {
    id: 'social-banner',
    title: '社群橫幅',
    aspectRatio: '16:9',
    ratioValue: 16 / 9,
    note: 'A social media cover/banner (e.g. Facebook/X/LinkedIn cover) featuring the brand.',
    guidance: [
      'Design a wide social media cover banner featuring the EXACT provided logo prominently, the brand color palette, and tasteful supporting graphic elements or the brand slogan if provided.',
      'The composition must work as a cropped header banner — keep the logo and key text within the safe central area.'
    ]
  },
  {
    id: 'website-hero',
    title: '網站首頁 Hero',
    aspectRatio: '16:9',
    ratioValue: 16 / 9,
    note: 'A realistic website homepage hero section mockup showcasing the logo in a navigation bar and hero visual.',
    guidance: [
      'Generate a realistic website homepage screenshot/mockup: a top navigation bar featuring the EXACT provided logo, plus a hero section below with a headline, supporting visual, and the brand color palette applied to UI elements (buttons, accents).',
      'Render only the browser viewport content — no browser chrome, no device frames.'
    ]
  },
  {
    id: 'shopping-bag',
    title: '品牌購物紙袋',
    aspectRatio: '1:1',
    ratioValue: 1.0,
    note: 'A premium paper shopping bag mockup with rope handles printed with the brand identity.',
    guidance: [
      'Generate a professional photo mockup of a premium paper shopping bag with textured paper and rope handles, printed with the EXACT provided logo on its side.',
      'Place it in a clean minimal studio setting with soft shadows and realistic lighting.'
    ]
  },
  {
    id: 'storefront-sign',
    title: '實體店面招牌',
    aspectRatio: '4:3',
    ratioValue: 4 / 3,
    note: 'A realistic photo mockup of a 3D backlit storefront signage mounted on a wall.',
    guidance: [
      'Generate a photorealistic close-up of a 3D backlit storefront sign mounted on a clean concrete or brick wall, showcasing the EXACT provided logo glow or metallic finish.',
      'Daytime or night with dramatic lighting and professional architectural photography style.'
    ]
  },
  {
    id: 'merchandise',
    title: 'T-shirt 與帆布袋',
    aspectRatio: '4:3',
    ratioValue: 4 / 3,
    note: 'A mockup displaying a T-shirt and a canvas tote bag printed with the brand logo.',
    guidance: [
      'Generate a clean product photo of a folded cotton T-shirt and a flat canvas tote bag side-by-side on a wooden or neutral table, both printed with the EXACT provided logo.',
      'Ensure organic fabric textures and professional studio lighting.'
    ]
  },
  {
    id: 'office-stationery',
    title: '辦公文具與識別證',
    aspectRatio: '4:3',
    ratioValue: 4 / 3,
    note: 'A mockup of brand corporate office stationery including a notebook, pen, and lanyard badge.',
    guidance: [
      'Generate a realistic desk setup flatlay showing a closed hardcover notebook, a pen, and a corporate ID badge with a woven lanyard, all customized with the EXACT provided logo and the brand color scheme.'
    ]
  },
  {
    id: 'mobile-app',
    title: '手機 App 啟動畫面',
    aspectRatio: '9:16',
    ratioValue: 9 / 16,
    note: 'A mobile app splash screen mockup showing the brand logo on a smartphone display.',
    guidance: [
      'Generate a sleek mockup of a modern smartphone showing a clean app splash screen with the EXACT provided logo centered on a beautiful background color.',
      'Render only the screen content with clean digital UI layout.'
    ]
  },
  {
    id: 'vehicle-wrap',
    title: '品牌宣傳車體廣告',
    aspectRatio: '16:9',
    ratioValue: 16 / 9,
    note: 'A clean delivery van wrap mockup with the brand identity applied to the side panels.',
    guidance: [
      'Generate a photorealistic mockup of a modern delivery van or transit van parked in a clean city street, with the EXACT provided logo and brand tagline wrapped cleanly on the side panels of the van.'
    ]
  }
];

export function buildLogoBrandPrompt(content: string, config: LogoSkillConfig, spec: LogoBrandOutputSpec, index: number, total: number): string {
  const styleMod = LOGO_STYLES.find(o => o.id === config.style)?.promptModifier ?? '';
  const paletteMod = LOGO_PALETTES.find(o => o.id === config.palette)?.promptModifier ?? '';
  const industryMod = LOGO_INDUSTRIES.find(o => o.id === config.industry)?.promptModifier ?? '';
  const moodMod = LOGO_MOODS.find(o => o.id === config.mood)?.promptModifier ?? '';

  return [
    `Design a professional branding asset: "${spec.title}" (Part ${index + 1}/${total} of the Brand Identity Kit, extending an ALREADY-CHOSEN logo).`,
    `CRITICAL — LOGO ANCHOR: An image of the brand's FINAL, approved logo mark is attached as a reference image. You MUST reuse that EXACT logo (same symbol, lettering, and proportions) in this asset — do NOT redesign, reinterpret, or invent a different mark. Only place/scale/recolor-for-context it appropriately within this new asset.`,
    `Brand Name: "${config.brandName || 'My Brand'}"`,
    config.slogan ? `Brand Slogan: "${config.slogan}"` : '',
    `Industry/Category: "${config.industry || 'General'}"`,
    `Target Audience: ${config.targetAudience}`,
    `Brand Positioning: ${config.positioning}`,
    `Brand Personality: ${config.personality}`,
    `Intended Usage Contexts: ${config.usageContexts}`,
    `Visual Style Preset: ${config.style} (${styleMod})`,
    `Color Scheme: ${config.palette} (${paletteMod})`,
    `Industry Context: ${config.industry} (${industryMod})`,
    `Brand Mood: ${config.mood} (${moodMod})`,
    `Branding Standards: ${LOGO_BRAND_STANDARDS.join(' ')}`,
    `This asset goal: ${spec.note}`,
    `Execution instructions: ${spec.guidance.join(' ')}`,
    `Requirements: Directly output the final designed raster image without any editing UI, window frames, or canvas mock frames. Focus on consistency in colors, style, and typography across the assets. Make text clean and avoid spelling errors.`,
    content ? `Additional context:\n${content}` : ''
  ].filter(Boolean).join('\n');
}
