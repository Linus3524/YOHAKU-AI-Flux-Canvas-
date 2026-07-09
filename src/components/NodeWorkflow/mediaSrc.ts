/** 判斷一個字串是否為可當 <img> 顯示的圖片來源（排除便利貼文字等非圖片 payload）。 */
export const isImageSrc = (s: unknown): s is string =>
  typeof s === 'string' &&
  (s.startsWith('data:image') || s.startsWith('blob:') || s.startsWith('http'));
