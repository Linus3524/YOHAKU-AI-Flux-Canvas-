// ============================================================
// 設計大師 — 貼圖 Skill
// 結構化選項 → 組裝成精準的貼圖生成 prompt。
// 內容（content）來自便利貼文字；此模組只負責「怎麼呈現」。
// 改寫自 MuseUI（MIT）的 sticker-design skill。
// ============================================================

export interface SkillOption {
  id: string;
  name: string;      // 英文標籤
  name_zh: string;   // 中文顯示名
  desc: string;      // 簡短說明
  promptModifier: string;
}

export interface StickerSkillConfig {
  style: string;
  shape: string;
  theme: string;
  size: string;
  background: string;
}

export const STICKER_DEFAULT_CONFIG: StickerSkillConfig = {
  style: 'flat',
  shape: 'custom',
  theme: 'character',
  size: 'medium',
  background: 'transparent',
};

// ── 風格 ──────────────────────────────────────────────────────
export const STICKER_STYLES: SkillOption[] = [
  {
    id: 'flat', name: 'Flat Illustration', name_zh: '扁平插畫', desc: '極簡扁平、粗白邊',
    promptModifier:
      'Style: Minimalist flat illustration with thick white die-cut borders (3-5px), clean vector-like aesthetic, solid color fills with no gradients, simple geometric shapes, modern and approachable. The sticker should have a distinct thick white outline separating it from the background.',
  },
  {
    id: 'chibi', name: 'Chibi / Kawaii', name_zh: 'Q版萌系', desc: '大頭萌系、可愛',
    promptModifier:
      'Style: Chibi / Kawaii aesthetic with oversized head (1:2 head-to-body ratio), large expressive sparkling eyes, tiny nose and mouth, rounded soft features, pastel or vibrant color palette, cute and approachable character design. Include blush marks and small star/sparkle decorations.',
  },
  {
    id: 'puffy-3d', name: 'Puffy 3D', name_zh: '立體膨脹', desc: '3D膨膨、果凍光澤',
    promptModifier:
      'Style: 3D puffy sticker with soft inflated appearance, glossy epoxy dome highlights, rounded edges with soft shadows underneath, tactile plastic/resin feel, subtle inner glow, premium collectible quality. The design should look like it has physical depth and dimension.',
  },
  {
    id: 'enamel-pin', name: 'Enamel Pin', name_zh: '琺瑯別針', desc: '金屬描邊、珠寶感',
    promptModifier:
      'Style: Hard enamel pin aesthetic with raised metallic gold/silver outlines, glossy smooth color fills, jewelry-like polished finish, small clutch back visible, collectible pin design. Colors should be vibrant and separated by clean metal lines.',
  },
  {
    id: 'chrome-badge', name: 'Chrome Badge', name_zh: '鍍鉻徽章', desc: '鏡面金屬、未來感',
    promptModifier:
      'Style: Chrome metallic badge with mirror-like reflective surface, embossed 3D details, futuristic automotive finish, soft gradient reflections, premium quality feel.',
  },
  {
    id: 'die-cut', name: 'Die-Cut Vinyl', name_zh: '模切貼紙', desc: '粗黑邊、街頭塗鴉',
    promptModifier:
      'Style: Classic die-cut vinyl sticker with bold black outlines (2-3px), street art and graffiti influence, vibrant saturated colors, slightly weathered texture, urban culture aesthetic.',
  },
  {
    id: 'vintage', name: 'Vintage Retro', name_zh: '復古懷舊', desc: '做舊紋理、復古色',
    promptModifier:
      'Style: Vintage retro sticker with distressed worn edges, faded retro color palette (mustard, teal, burnt orange), subtle paper texture, halftone dot patterns, aged and nostalgic feel, like a well-loved travel souvenir from the 1970s-80s.',
  },
];

// ── 形狀 ──────────────────────────────────────────────────────
export const STICKER_SHAPES: SkillOption[] = [
  { id: 'custom', name: 'Custom', name_zh: '隨形輪廓', desc: '沿設計外輪廓',
    promptModifier: 'Shape: Die-cut following the natural contour of the design element with 2-3mm white border margin.' },
  { id: 'circle', name: 'Circle', name_zh: '圓形', desc: '正圓',
    promptModifier: 'Shape: Perfect circle format, design centered within circular boundary, content may extend slightly beyond for dynamic effect.' },
  { id: 'square', name: 'Square', name_zh: '方形', desc: '直角方形',
    promptModifier: 'Shape: Clean square format with sharp corners, design fills the square area efficiently.' },
  { id: 'rounded', name: 'Rounded', name_zh: '圓角矩形', desc: '柔和圓角',
    promptModifier: 'Shape: Rounded rectangle with 8-12px corner radius, friendly and modern appearance.' },
  { id: 'star', name: 'Star', name_zh: '星形', desc: '星星造型',
    promptModifier: 'Shape: Star-shaped format, design adapted to fit within star boundaries, eye-catching and special.' },
  { id: 'heart', name: 'Heart', name_zh: '心形', desc: '愛心造型',
    promptModifier: 'Shape: Heart-shaped format, design centered within heart boundaries, romantic and affectionate.' },
];

// ── 主題 ──────────────────────────────────────────────────────
export const STICKER_THEMES: SkillOption[] = [
  { id: 'character', name: 'Character', name_zh: '角色', desc: '有個性的角色',
    promptModifier: 'Theme: Character-focused design. The sticker features a distinct character with personality, expression, and recognizable features.' },
  { id: 'emoji', name: 'Emoji', name_zh: '表情符號', desc: '情緒反應',
    promptModifier: 'Theme: Emoji/expression design. Focus on conveying a specific emotion or reaction through facial expression and body language.' },
  { id: 'text-quote', name: 'Text / Quote', name_zh: '文字語錄', desc: '以字為主',
    promptModifier: 'Theme: Typography-focused design. Bold text, quotes, slogans, or words as the primary visual element with decorative supporting graphics.' },
  { id: 'object', name: 'Object', name_zh: '物件', desc: '日常物品',
    promptModifier: 'Theme: Object/item design. A specific everyday object, tool, or item rendered in an appealing and stylized way.' },
  { id: 'animal', name: 'Animal', name_zh: '動物', desc: '萌系動物',
    promptModifier: 'Theme: Animal design. A cute, stylized, or anthropomorphized animal as the main subject.' },
  { id: 'food', name: 'Food', name_zh: '食物', desc: '可愛食物',
    promptModifier: 'Theme: Food design. Appetizing food illustration or cute food character (kawaii food with faces).' },
  { id: 'nature', name: 'Nature', name_zh: '自然', desc: '花草星月',
    promptModifier: 'Theme: Nature design. Plants, flowers, celestial elements (moon, stars, clouds), or other natural motifs.' },
];

// ── 尺寸 / 格式 ───────────────────────────────────────────────
export const STICKER_SIZES: SkillOption[] = [
  { id: 'small', name: 'Small', name_zh: '小型', desc: '2.5-5cm，細節精簡',
    promptModifier: 'Size: Small sticker (1-2 inches / 2.5-5cm). Compact design with clear readability at small scale, minimal fine details.' },
  { id: 'medium', name: 'Medium', name_zh: '中型', desc: '5-7.5cm，標準',
    promptModifier: 'Size: Medium sticker (2-3 inches / 5-7.5cm). Standard size with balanced detail level, suitable for most applications.' },
  { id: 'large', name: 'Large', name_zh: '大型', desc: '7.5-10cm，細節豐富',
    promptModifier: 'Size: Large sticker (3-4 inches / 7.5-10cm). Statement size with rich details, suitable for prominent display.' },
  { id: 'sheet', name: 'Sticker Sheet', name_zh: '貼紙集合', desc: '6-12 張成套',
    promptModifier: 'Format: Sticker sheet with multiple related stickers arranged aesthetically on a single page.' },
];

// ── 背景 ──────────────────────────────────────────────────────
export const STICKER_BACKGROUNDS: SkillOption[] = [
  { id: 'transparent', name: 'Transparent', name_zh: '透明背景', desc: '生成後自動去背',
    promptModifier: 'Background: A single flat solid-color background (plain, evenly lit, no scenery, no gradients, no patterns, no texture) with strong contrast against the subject, so the subject can be cleanly cut out. The subject must be fully inside the frame with generous margin and crisp edges. Do NOT render a checkerboard or fake-transparency pattern.' },
  { id: 'white', name: 'White', name_zh: '白色背景', desc: '商品攝影感',
    promptModifier: 'Background: Clean solid white background, product photography style, soft shadow underneath the sticker.' },
  { id: 'colored', name: 'Colored', name_zh: '彩色背景', desc: '配合主色調',
    promptModifier: 'Background: Solid colored background that complements the sticker color palette, harmonious and intentional color choice.' },
  { id: 'pattern', name: 'Patterned', name_zh: '圖案背景', desc: '裝飾性圖樣',
    promptModifier: 'Background: Decorative pattern background (dots, stripes, or subtle geometric pattern) for presentation purposes, not part of the sticker itself.' },
];

export const STICKER_OPTION_GROUPS: { key: keyof StickerSkillConfig; label: string; options: SkillOption[] }[] = [
  { key: 'style', label: '風格', options: STICKER_STYLES },
  { key: 'theme', label: '主題', options: STICKER_THEMES },
  { key: 'shape', label: '形狀', options: STICKER_SHAPES },
  { key: 'size', label: '尺寸', options: STICKER_SIZES },
  { key: 'background', label: '背景', options: STICKER_BACKGROUNDS },
];

// ── 組裝 prompt ───────────────────────────────────────────────
function modOf(arr: SkillOption[], id: string): string {
  return arr.find(o => o.id === id)?.promptModifier ?? '';
}

function borderInstruction(style: string): string {
  const m: Record<string, string> = {
    flat: 'BORDER: Thick white die-cut border (4-6px), clean and even all around. The border must be solid white, no gaps.',
    chibi: 'BORDER: Soft white border (3-4px) with rounded edges. Optional tiny sparkles or stars floating just outside the border.',
    'puffy-3d': 'BORDER: Soft rounded "inflated" edge with subtle highlight along the top rim. No sharp corners — everything should look soft and squishy.',
    'enamel-pin': 'BORDER: Raised metallic gold or silver outline (2-3px), polished and reflective, like jewelry.',
    'chrome-badge': 'BORDER: Mirror-like chrome edge with gradient reflections. Embossed beveled rim.',
    'die-cut': 'BORDER: Bold black outline (2-3px) around the entire design, hand-drawn and energetic street-art feel.',
    vintage: 'BORDER: Slightly irregular worn edge with subtle distress marks. Optional thin cream/off-white border (2px) with slight fading.',
  };
  return m[style] ?? m.flat;
}

export function buildStickerPrompt(content: string, config: StickerSkillConfig): string {
  const isSheet = config.size === 'sheet';
  const subject = (content || '').trim() || 'A cute, eye-catching design suitable for sticker merchandise';

  return `
You are a professional sticker designer. Create a ${isSheet ? 'sticker sheet' : 'single die-cut sticker'} following EVERY specification precisely.

1. SUBJECT & CONTENT
${subject}

2. ART STYLE (MANDATORY)
${modOf(STICKER_STYLES, config.style)}
${borderInstruction(config.style)}

3. SHAPE & COMPOSITION
${modOf(STICKER_SHAPES, config.shape)}

4. THEME DIRECTION
${modOf(STICKER_THEMES, config.theme)}

5. SIZE / FORMAT
${modOf(STICKER_SIZES, config.size)}
${isSheet ? 'Include 6-12 individual stickers in a clean uniform grid (equal 20-30px gaps), all sharing the EXACT same art style and palette, varying poses/expressions, with subtle dashed cut lines between them. Do NOT overlap or resize stickers.' : ''}

6. BACKGROUND TREATMENT
${modOf(STICKER_BACKGROUNDS, config.background)}

7. UNIVERSAL REQUIREMENTS (STRICT)
- Self-contained design with a clear focal point, centered with generous margin.
- Clean, crisp, die-cuttable edges; high contrast against the background for easy isolation.
- Vibrant, well-separated colors; consistent top-left lighting; print-ready detail.

8. NEGATIVE CONSTRAINTS (DO NOT INCLUDE)
- NO complex scene backgrounds (landscapes, rooms, environments).
- NO photographic realistic human faces (stylized/illustrated only).
- NO text overlapping the main subject; NO watermarks or signatures.
- NO floating drop shadows; NO blurry edges or anti-aliasing artifacts.
`.trim();
}
