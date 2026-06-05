
export interface Point {
  x: number;
  y: number;
}

export type ElementType = 'note' | 'image' | 'arrow' | 'drawing' | 'frame' | 'text' | 'shape' | 'artboard';

interface BaseElement {
  id: string;
  position: Point;
  width: number;
  height: number;
  rotation: number; // in degrees
  zIndex: number;
  isVisible: boolean;
  isLocked: boolean;
  name: string;
  groupId: string | null;
  opacity?: number;
  blendMode?: BlendMode; // ✅ 新增
}

export interface NoteElement extends BaseElement {
  type: 'note';
  content: string;
  color: string;
  textAlign?: 'left' | 'center' | 'right';
  referenceImages?: (string | null)[];  // 最多4張參考圖，null = 空槽
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  fade?: SimpleFadeOptions;
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  flipX?: boolean;
  flipY?: boolean;
}

export type ArrowHeadType = 'none' | 'triangle' | 'arrow' | 'circle';

export interface ArrowElement extends BaseElement {
  type: 'arrow';
  start: Point;
  end: Point;
  color: string;
  strokeWidth: number;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  startArrowhead: ArrowHeadType;
  endArrowhead: ArrowHeadType;
}

export interface DrawingElement extends BaseElement {
  type: 'drawing';
  src: string; // base64 data URL
}

export interface FrameElement extends BaseElement {
  type: 'frame';
  aspectRatioLabel: string; // e.g., "16:9"
  aspectRatioValue: number; // e.g., 1.777
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
  letterSpacing: number; // in em
  lineHeight: number;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  
  // New Styling Properties
  strokeColor?: string;
  strokeWidth?: number; // 0-100
  backgroundColor?: string;
  shadowColor?: string;
  shadowBlur?: number;
  glowColor?: string;
  glowBlur?: number;
  
  // Vertical Text Support
  writingMode?: 'horizontal' | 'vertical';
  
  // Curved Text Support
  curveStrength?: number; // -100 to 100
  isWidthLocked?: boolean;
  isHeightLocked?: boolean;
}

export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'pentagon' | 'hexagon' | 'star' | 'heart' | 'rounded_rect';

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: ShapeType;
  fillColor: string; // hex or 'transparent'
  strokeColor: string; // hex
  strokeWidth: number;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
}

// ── 工作區域元素（獨立型別，不影響現有 FrameElement）──
export interface ArtboardElement extends BaseElement {
  type: 'artboard';
  artboardName: string;        // 顯示在左上角的名稱，例如「IG 貼文 1」
  backgroundColor: string;     // 預設 '#ffffff'
  showBorder: boolean;         // 是否顯示外框線，預設 true
  presetName?: string;         // 記錄使用的預設尺寸名稱，例如 'IG Post'
}

export type CanvasElement = NoteElement | ImageElement | ArrowElement | DrawingElement | FrameElement | TextElement | ShapeElement | ArtboardElement;

export interface ContextMenuData {
    x: number;
    y: number;
    worldPoint: Point;
    elementId: string | null;
}

export interface OutpaintingState {
  element: ImageElement;
  frame: {
    position: Point;
    width: number;
    height: number;
  };
}

export type FadeDirection = 'top' | 'bottom' | 'left' | 'right' | 'radial' | 'none';

export interface SimpleFadeOptions {
  direction: FadeDirection;
  intensity: number; // 0-100，控制漸層範圍
}

// ✅ 新增
export type BlendMode =
  | 'normal' | 'multiply' | 'color-burn'
  | 'screen' | 'color-dodge'
  | 'overlay' | 'soft-light' | 'hard-light'
  | 'difference' | 'hue' | 'luminosity';

// ── Semantic Editor（語意分層編輯器）──────────────────────────────────────────

export type SmartLayerCategory = 'SUBJECT' | 'PRODUCT' | 'TEXT' | 'OBJECTS' | 'DECOR' | 'BACKGROUND';

export interface SmartLayerBBox {
  /** 0–1，相對於原圖寬高 */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SmartLayerVersion {
  id: string;
  timestamp: number;
  prompt: string;
  base64: string;
}

export interface SmartLayer {
  id: string;
  name: string;
  category: SmartLayerCategory;
  /** 目前顯示的透明 PNG base64（trimTransparentPixels 後，已去透明邊） */
  base64: string;
  /** 第一次提取的原始版本（復原用） */
  originalBase64: string;
  /** 使用者可編輯的描述（Gemini 自動產生，也可手動改） */
  prompt: string;
  /** 上次 Apply 後的 prompt（用來判斷是否有未套用的修改） */
  appliedPrompt: string;

  /**
   * Gemini 偵測框（0–1，相對原圖）—— UI 用途：BBox 選取框、hover 區域、Prompt 框定位
   * 注意：這是 AI 估計值，邊界偏大，不能用於合成定位
   */
  bbox: SmartLayerBBox;

  /**
   * trimTransparentPixels 後的精確像素位置（0–1，相對原圖）—— 合成定位唯一依據
   * 對應 LayerResult.cropRatioX/Y/W/H
   * background 層：{ x:0, y:0, w:1, h:1 }
   */
  cropRatio: SmartLayerBBox;

  /** trimmed PNG 的真實像素尺寸（用於計算正確縮放比例，避免變形） */
  pixelWidth?: number;
  pixelHeight?: number;

  /** 歷次重生成的快照（最新在最後） */
  history: SmartLayerVersion[];
  isVisible: boolean;
  isLocked: boolean;
  /** 圖層排序（數字越大越上層） */
  zIndex: number;
}

export type SemanticEditorStatus =
  | 'idle'
  | 'analyzing'    // Gemini 分析中
  | 'segmenting'   // SAM2 去背中
  | 'regenerating' // 單層重繪中
  | 'compositing'  // 重新合成中
  | 'exporting';

/** 一個編輯版本（每次 Apply 產生新版本） */
export interface EditorVersion {
  id: string;
  timestamp: number;
  /** 這個版本修改了哪個圖層（顯示用） */
  changedLayerName: string;
  /** 使用的 prompt */
  prompt: string;
  /** 這個版本的完整合成圖 */
  compositeBase64: string;
  /** 這個版本的所有圖層 */
  layers: SmartLayer[];
}

export interface SemanticEditorState {
  /** 最原始上傳的圖片（不可修改，用於 baseline） */
  originalBase64: string;
  /** 目前顯示的合成圖 */
  compositeBase64: string;
  layers: SmartLayer[];
  selectedLayerId: string | null;
  status: SemanticEditorStatus;
  statusMessage: string;
  /** 版本歷史（v0 = 原始，最後一個 = 最新） */
  versions: EditorVersion[];
  /** 目前顯示的版本 index（-1 = 最新） */
  activeVersionIndex: number;
}
