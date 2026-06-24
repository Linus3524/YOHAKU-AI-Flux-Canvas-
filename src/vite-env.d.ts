/// <reference types="vite/client" />

// 設計大師的品牌／風格說明檔以 `?raw` 形式（純文字字串）載入。
// vite/client 已宣告 `*?raw`，這裡再補上明確的 `*.md?raw` / `*.md` 以防萬一。
declare module '*.md?raw' {
  const content: string;
  export default content;
}

declare module '*.md' {
  const content: string;
  export default content;
}
