import type { NoteElement, Point } from '../types';

const NOTE_FONT_SIZE = 18;
const NOTE_LINE_HEIGHT = 1.6;
const NOTE_HORIZONTAL_PADDING = 24;
const NOTE_VERTICAL_PADDING = 16;
const NOTE_GALLERY_BOTTOM_PADDING = 121;
const NOTE_MIN_HEIGHT = 140;
const NOTE_MAX_HEIGHT = 1200;

/**
 * 使用固定的 100% 畫布排版基準量測，避免縮放畫布時改變便利貼尺寸。
 */
export const measureAutoNoteHeight = (
  note: Pick<NoteElement, 'content' | 'width' | 'referenceImages'>,
): number => {
  if (typeof document === 'undefined') return NOTE_MIN_HEIGHT;

  const measure = document.createElement('div');
  // 寬度足夠時，右下角即使尚未上傳圖片也會顯示「上傳參考圖」卡片。
  const hasGallery = note.width >= 240;
  const bottomPadding = hasGallery ? NOTE_GALLERY_BOTTOM_PADDING : NOTE_VERTICAL_PADDING;

  Object.assign(measure.style, {
    position: 'fixed',
    left: '-100000px',
    top: '0',
    visibility: 'hidden',
    pointerEvents: 'none',
    boxSizing: 'border-box',
    width: `${Math.max(1, note.width - NOTE_HORIZONTAL_PADDING * 2)}px`,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: `${NOTE_FONT_SIZE}px`,
    fontWeight: '300',
    lineHeight: String(NOTE_LINE_HEIGHT),
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
  });
  // 空內容仍保留一行可點擊、可輸入的高度。
  measure.textContent = note.content || '\u200b';
  document.body.appendChild(measure);
  const textHeight = Math.ceil(measure.getBoundingClientRect().height);
  measure.remove();

  return Math.min(
    NOTE_MAX_HEIGHT,
    Math.max(NOTE_MIN_HEIGHT, NOTE_VERTICAL_PADDING + textHeight + bottomPadding),
  );
};

/**
 * 高度改變時固定便利貼的上邊中心；旋轉後也不會向兩側漂移。
 */
export const positionForTopAnchoredHeight = (
  note: Pick<NoteElement, 'position' | 'height' | 'rotation'>,
  nextHeight: number,
): Point => {
  const localDeltaY = (nextHeight - note.height) / 2;
  const radians = note.rotation * (Math.PI / 180);
  return {
    x: note.position.x - localDeltaY * Math.sin(radians),
    y: note.position.y + localDeltaY * Math.cos(radians),
  };
};

export const resizeNoteToContent = (
  note: NoteElement,
  content = note.content,
): NoteElement => {
  const next = { ...note, content };
  const height = measureAutoNoteHeight(next);
  if (height === note.height && content === note.content) return note;
  return {
    ...next,
    height,
    position: positionForTopAnchoredHeight(note, height),
  };
};
