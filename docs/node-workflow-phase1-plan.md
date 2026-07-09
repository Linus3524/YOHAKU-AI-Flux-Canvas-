# 節點工作流 Phase 1 企劃書（影片元件與資料模型）— 交付 Codex / Claude 複查

> 來源：`node_workflow_spec.md`（節點式工作流 + 影片生成 PRD）。
> **本企劃只做 Phase 1**：型別擴充 + VideoElement + 影片播放元件 + 影片持久化。Phase 2–4（React Flow 子空間、影片生成 API、執行引擎）**本輪完全不做**。
> 這是綠地功能開發,不是純搬遷 —— 比前三輪重構謹慎,每步都要能自測。
> 執行者：Codex (GPT)。完成後由 Claude 複查。
> 日期：2026-07-09

---

## 0. 硬性規則

1. 正本一律在 `src/` 底下,**嚴禁根目錄新增檔案**。
2. **`@` alias 指向專案根目錄不是 `src/`**,新檔一律相對路徑 import。
3. 每完成一個步驟跑 `npm run lint`（`tsc --noEmit`）,**零錯誤才繼續**。
4. **不要 commit、不要 push**。
5. `AGENTS.md` 已存在,動手前先讀專案慣例（尤其死碼提醒與驗證方式）。
6. 擴充 `CanvasElement` union 後,**所有 exhaustive switch/型別分支都要補上 video case**,靠 `npm run lint` 抓出所有需要補的地方,一個都不能漏。

## 1. 已拍板的關鍵決策（不可改,改了 Phase 2+ 要翻掉重做）

- **影片儲存 = IDB Blob key**：影片以真正的 `Blob` 存進 IndexedDB（用現成的 `idb-keyval`,已是專案依賴）,`VideoElement.src` 執行期是 `objectURL`（或遠端 https URL）,持久化時把 Blob 存進 IDB、meta 只留 key 標記,載入時 `URL.createObjectURL` 還原。**絕對不要把影片存成 base64 data URL**（會撐爆 IDB / 記憶體）。
- **本輪影片來源 = 手動拖入/上傳影片檔**,不接任何生成 API（生成是 Phase 3）。這樣 Phase 1 能完整自測:拖入 .mp4 → 渲染播放 → 重整頁面 → 影片仍在。
- **objectURL 生命週期**：建立的 objectURL 在元素刪除 / 元件卸載時必須 `URL.revokeObjectURL` 釋放,避免記憶體洩漏。

## 2. 任務拆解（依序做,每步 lint）

### 2-1. `src/types.ts` 擴充
- `ElementType`（第 7 行）加 `'video'`。
- 新增 `VideoElement extends BaseElement`,比照 `ImageElement`（第 32 行）的結構:
  ```ts
  export interface VideoElement extends BaseElement {
    type: 'video';
    src: string;              // 執行期：objectURL 或遠端 https URL
    posterSrc?: string;       // 封面影格（base64 或 objectURL,可選）
    metadata?: {
      seed?: number;
      model?: string;
      prompt?: string;
      aspectRatio?: string;
      duration?: number;      // 秒
    };
    muted?: boolean;
    loop?: boolean;
  }
  ```
- 把 `VideoElement` 加進 `CanvasElement` union（第 135 行）。
- **本輪先不加 `node_group`**（那是 Phase 2 的事,提早加會多出一堆用不到的空 case,違反漸進原則）。

### 2-2. `src/utils/videoBlobStore.ts`（新檔）
- 薄封裝 `idb-keyval`,提供:
  - `saveVideoBlob(elementId: string, blob: Blob): Promise<void>` — 存到 key `yohaku_video:${elementId}`
  - `loadVideoObjectURL(elementId: string): Promise<string | null>` — 取 Blob → `createObjectURL`,查無回 null
  - `deleteVideoBlob(elementId: string): Promise<void>`
- 禁止 `any`,完整型別。

### 2-3. `src/utils/canvasPersistence.ts` 擴充（影片專用分支）
現有機制（見檔案）只處理 `data:` 開頭的 `src`/`referenceImages`,把它們抽到 IDB 存「字串」。影片要另走 Blob 分支,**不要混進現有的 `isBigData` 字串路徑**:

- **存檔（`persistCanvasSplit`）**:遇到 `el.type === 'video'` 時,
  - 若 `src` 是 objectURL 或 blob（判斷:非 `http(s):` 開頭的本地來源）,用 `fetch(src).then(r => r.blob())` 取回 Blob,呼叫 `saveVideoBlob(el.id, blob)`,meta 的 `src` 存成新標記 `__IDB_VIDEO__:${el.id}`。
  - 若 `src` 是遠端 `https:` URL（短字串）,原樣保留,不動。
- **載入（`resolveLightElements`）**:遇到 `src` 以 `__IDB_VIDEO__:` 開頭,呼叫 `loadVideoObjectURL(id)` 還原成 objectURL；查無 → 空字串（比照現有 payload 遺失處理,不讓 app 崩潰）。
- **孤兒清理**:元素刪除時對應的 `yohaku_video:` Blob 也要能被清掉（可沿用現有 orphan 清理邏輯的思路,擴充 key prefix 判斷）。

### 2-4. 影片渲染元件
- 新增 `src/components/element-renderers/VideoRenderer.tsx`（新目錄）:
  - 渲染 HTML5 `<video>`,`src` 來自 `VideoElement.src`。
  - 微型控制列:播放/暫停、時間軸 slider、靜音、**「定格匯出」按鈕**（把當前影格畫到 canvas → 產生 base64 → 呼叫 `useCanvas` 的 `addElement` 新增一個 `ImageElement`;此按鈕的 handler 可先接好、實作定格截圖）。
  - objectURL 在 `useEffect` cleanup 裡 `revokeObjectURL`。
- 在 `TransformableElement.tsx` 的渲染分派處加 `video` 分支,外層沿用既有的 Transformable 旋轉/縮放控制器（跟 image 一樣的外框）。**先 grep 確認 TransformableElement 目前是怎麼分派 image/drawing 的**（是 `element.type === 'image'` 條件式,不是 switch）,比照同樣寫法加 video,不要改動 image/其他分支。

### 2-5. 讓影片能被拖入畫布
- 找到現有「拖曳圖片檔進畫布」的落點（grep `DragEvent` / `drop` / `dataTransfer` / `image/` in `src/`,多半在 App.tsx 或 InfiniteCanvas.tsx 的 drop handler）。
- 在該 handler 加:若拖入檔案 `type.startsWith('video/')`,建立 Blob → `saveVideoBlob` → objectURL → `addElement` 一個 `VideoElement`。
- **同時要擴充 `useCanvas.ts:305` 的 `addElement` 手寫 union**,加上 `Omit<VideoElement, ...>` 那一項,否則型別過不了。

## 3. 執行順序與自測

1. 2-1 types → lint（會噴一堆 switch 缺 video case,逐一補完 → lint 綠）
2. 2-2 videoBlobStore → lint
3. 2-3 persistence 分支 → lint
4. 2-4 VideoRenderer + TransformableElement 分派 → lint
5. 2-5 拖入影片 + addElement union → lint
6. `npm run build`
7. **自測腳本（寫進報告）**:啟動 dev server,拖一個 .mp4 進畫布 → 確認渲染+可播放 → 重整頁面 → 確認影片還在（證明 Blob 持久化成功）→ 刪除影片 → 確認 IDB 的 `yohaku_video:` key 被清掉。
8. 產出 `docs/node-workflow-phase1-report.md`:新增/修改檔清單、types union 補了哪些 switch、自測結果、未完成或有疑慮處。

## 4. Claude 複查清單

- [ ] `CanvasElement` union 擴充後,所有 switch/持久化分支都補了 video,無 `as any` 逃逸掉型別
- [ ] 影片**確實走 Blob 存 IDB**,沒有偷懶存成 base64 data URL
- [ ] objectURL 有在元素刪除/卸載時 `revokeObjectURL`（抓記憶體洩漏）
- [ ] 現有 image/drawing 的持久化與渲染路徑**一行未受影響**（video 是新增分支,不是改舊分支）
- [ ] 拖入影片 → 渲染 → 重整仍在 → 刪除清 Blob，四段自測都過
- [ ] `node_group` 沒有被提前加入（本輪範圍外）
- [ ] `@` alias 無誤用；根目錄無新檔；`npm run lint` + `build` 全過
- [ ] 未 commit / 未 push
