
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
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  fade?: SimpleFadeOptions;
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
