// ============================================================
// 設計大師 — 貼圖 Skill
// 結構化選項 → 組裝成精準的貼圖生成 prompt。
// 內容（content）來自便利貼文字；此模組只負責「怎麼呈現」。
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
  aspect: string;
  layoutMode: 'single' | 'threeViews' | 'collection';
  stickerCollectionCount: number;
  collectionItemPrompts: string[];
  useStickerBorder: boolean;
  useFacialFeatures: boolean;
  textEnabled: boolean;
  textContent: string;
  textFont: string;
  textBorder: boolean;
}

export const STICKER_DEFAULT_CONFIG: StickerSkillConfig = {
  style: 'flat',
  shape: 'custom',          // 固定隨形貼紙（die-cut 隨外輪廓）
  theme: 'character',
  size: 'medium',           // 不再使用（實體尺寸已移除）
  background: 'transparent', // 固定：生成乾淨純色底 → 自動去背 → 透明
  aspect: '1:1',            // LINE 貼圖近似比例（370×320 ≈ 接近方形）；高解析輸出
  layoutMode: 'single',
  stickerCollectionCount: 8, // LINE 一套最小 8 張
  collectionItemPrompts: [],
  useStickerBorder: true,
  useFacialFeatures: true,
  textEnabled: false,
  textContent: '',
  textFont: 'Fredoka, sans-serif',
  textBorder: true,
};

// ── 字型視覺 Prompt 對照表 ──────────────────────────────────────
const FONT_STYLE_MAP: Record<string, string> = {
  'Fredoka, sans-serif': 'friendly, rounded, bubble-style sans-serif font, thick and clean curves',
  'Bangers, cursive': 'bold comic book style font, explosive action-bubble lettering, thick outline, high energy',
  'Pacifico, cursive': 'elegant handwriting script font, flowing cursive letters, brush stroke style',
  'Orbitron, sans-serif': 'futuristic geometric tech font, sci-fi mechanical style, sharp lines',
  'Yomogi, cursive': 'Japanese kawaii handwriting style font, cute hand-drawn marker lettering, friendly and neat Japanese script aesthetic',
  'Abril Fatface, cursive': 'elegant high-contrast serif fashion font, bold stems with thin serifs, classy editorial style'
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
      'Style: Hard enamel pin aesthetic with raised metallic gold/silver outlines, glossy smooth color fills, jewelry-like polished finish, small collectible pin design. Colors should be vibrant and separated by clean metal lines.',
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

export const STICKER_ASPECTS: SkillOption[] = [
  { id: '1:1', name: '1:1', name_zh: '正方形 (1:1)', desc: '貼紙與圖章最常見比例', promptModifier: 'aspect ratio 1:1' },
  { id: '3:4', name: '3:4', name_zh: '直向 (3:4)', desc: '適合直立貼紙設計', promptModifier: 'aspect ratio 3:4' },
  { id: '4:3', name: '4:3', name_zh: '橫向 (4:3)', desc: '適合橫向貼紙設計', promptModifier: 'aspect ratio 4:3' },
  { id: '9:16', name: '9:16', name_zh: '直向 (9:16)', desc: '極窄垂直貼紙設計', promptModifier: 'aspect ratio 9:16' },
  { id: '16:9', name: '16:9', name_zh: '橫向 (16:9)', desc: '極寬橫向貼紙設計', promptModifier: 'aspect ratio 16:9' },
];

// LINE 貼圖專用：只保留風格與主題；形狀固定隨形、背景固定去背白底、
// 比例固定 LINE 規格（皆在預設值與 prompt 內鎖定，不開放使用者選）
export const STICKER_OPTION_GROUPS: { key: keyof StickerSkillConfig; label: string; options: SkillOption[] }[] = [
  { key: 'style', label: '風格', options: STICKER_STYLES },
  { key: 'theme', label: '主題', options: STICKER_THEMES },
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
  const isSheet = config.layoutMode === 'collection';
  const isThreeViews = config.layoutMode === 'threeViews';
  const subject = (content || '').trim() || 'A cute, eye-catching design suitable for sticker merchandise';
  const aspectMod = STICKER_ASPECTS.find(o => o.id === config.aspect)?.promptModifier ?? 'aspect ratio 1:1';

  // Build the text instructions
  let textInstruction = "";
  const fontStyleDescription = FONT_STYLE_MAP[config.textFont] || `${config.textFont} font style`;
  if (config.textEnabled && config.textContent?.trim()) {
    const borderText = config.textBorder ? "with a thick white outline/border" : "without an outline";
    textInstruction = `Important: The image MUST include the text "${config.textContent.trim()}" written prominently in a ${fontStyleDescription}. Text style: ${borderText}.`;
  } else if (config.textEnabled) {
    const borderText = config.textBorder ? "with a thick white outline/border" : "without an outline";
    textInstruction = `Important: Include short, relevant sticker text chosen by you. The text should fit the subject and be written prominently in a ${fontStyleDescription}. Text style: ${borderText}.`;
  } else {
    textInstruction = "Strictly NO text, NO letters, NO numbers, and NO typography in the image. The image must be purely visual.";
  }

  // Build Facial Feature Instruction
  let faceInstruction = "";
  if (config.useFacialFeatures) {
    faceInstruction = "Facial features (eyes, mouth, expressions) are permitted and encouraged to convey character/emotion.";
  } else {
    faceInstruction = "STRICTLY NO FACES. Do NOT generate any facial features (eyes, nose, mouth). The subject must be faceless, shown from behind, or obscured. If the subject is an object, do not anthropomorphize it with a face.";
  }

  // Build View/Border/Composition Instruction
  let viewInstruction = "";
  if (isSheet) {
    const itemCount = Math.max(2, Math.min(20, config.stickerCollectionCount || 8));
    const items = (config.collectionItemPrompts || []).filter(Boolean);
    
    viewInstruction = `Sticker Collection Sheet: Generate exactly ${itemCount} distinct small stickers on one single canvas. They must feel like one coherent series with a unified character language, consistent color palette, matching line weight, and related poses/expressions/objects. Arrange the stickers in a clean grid or loose sticker-sheet layout with generous spacing between each mini sticker, no overlap, and no cropped edges. Each mini sticker should be complete and individually usable.`;
    
    if (items.length > 0) {
      viewInstruction += ` The mini stickers must follow this exact subject list, one mini sticker per item, in reading order: ${items.map((item, index) => `${index + 1}. ${item}`).join("; ")}. Do not omit listed items.`;
      if (items.length < itemCount) {
        viewInstruction += ` Add ${itemCount - items.length} additional related mini stickers to reach the requested count.`;
      }
    }
    
    if (config.useStickerBorder) {
      viewInstruction += " Give every mini sticker its own die-cut white border/outline.";
    } else {
      viewInstruction += " Keep every mini sticker borderless with no white outline.";
    }
  } else if (isThreeViews) {
    viewInstruction = "Character Reference Sheet: Generate a formal three-view orthographic drawing (Three Divisions/Three Views). The image must display the SUBJECT from three distinct angles: Front View, Side View, and Back View. Arrange them horizontally in a clean, professional layout. Maintain consistent character details, proportions, and style across all views.";
    if (!config.useStickerBorder) {
      viewInstruction += " Do not add white sticker outlines around the characters.";
    }
  } else {
    // Single sticker logic
    viewInstruction = "sticker design, high quality vector graphics, centered composition";
    if (config.useStickerBorder) {
      viewInstruction += `, die-cut sticker with a thick white border/outline surrounding the subject`;
    } else {
      viewInstruction += `, borderless, strictly NO white outline, NO die-cut border, edge-to-edge design`;
    }
  }

  return `
You are a professional LINE messaging sticker designer. Create a ${isSheet ? 'LINE sticker set sheet' : isThreeViews ? 'three-view character reference sheet' : 'single LINE die-cut sticker'} following EVERY specification precisely. Output must be HIGH RESOLUTION, crisp and clean at large scale (the user will downscale later).

1. SUBJECT & CONTENT
${subject}

2. ART STYLE (MANDATORY)
${modOf(STICKER_STYLES, config.style)}
${borderInstruction(config.style)}

3. SHAPE & COMPOSITION
${modOf(STICKER_SHAPES, config.shape)}
${viewInstruction}

4. THEME DIRECTION
${modOf(STICKER_THEMES, config.theme)}

5. FORMAT (LINE STICKER)
Design as a digital LINE messaging sticker. Each individual sticker should fit a near-square / slightly landscape proportion (LINE official ~370x320). Render at high resolution with rich crisp detail; do NOT output a small or low-resolution image.

6. BACKGROUND TREATMENT
${modOf(STICKER_BACKGROUNDS, config.background)}

7. ASPECT RATIO
${aspectMod}

8. DETAILS & TEXT CONFIG
${faceInstruction}
${textInstruction}

9. UNIVERSAL REQUIREMENTS (STRICT)
- Self-contained design with a clear focal point, centered with generous margin.
- Clean, crisp, die-cuttable edges; high contrast against the background for easy isolation.
- Vibrant, well-separated colors; consistent top-left lighting; print-ready detail.

10. NEGATIVE CONSTRAINTS (DO NOT INCLUDE)
- NO complex scene backgrounds (landscapes, rooms, environments).
- NO photographic realistic human faces (stylized/illustrated only).
- NO text overlapping the main subject (unless specified in TEXT CONFIG above); NO watermarks or signatures.
- NO floating drop shadows; NO blurry edges or anti-aliasing artifacts.
`.trim();
}
