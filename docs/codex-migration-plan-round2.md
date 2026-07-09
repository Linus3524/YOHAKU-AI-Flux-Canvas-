# 巨檔拆分規劃書 第二輪（交付 Codex 執行 / Claude 複查）

> 第一輪已完成並 commit（`4473ce2`）：App.tsx 從 2801 → 1840，抽出 11 個新檔。
> 本輪目標：把上輪**刻意保守跳過**的 `useAI.ts` 瘦下來，只抽「自成一體、低風險」的特化生成流。
> **安全優先，不過分拆**——寧可少抽幾個、留下有疑慮的，也不要為了湊行數硬拆。
> 執行者：Codex (GPT)。完成後由 Claude 複查。
> 日期：2026-07-09

---

## 0. 執行前必讀（與第一輪相同的硬性規則）

1. **純搬遷（refactor-move），不改行為**。能整段剪貼就整段剪貼，不要順手改寫、精簡、重命名。
2. 正本一律在 `src/` 底下，**嚴禁根目錄新增檔案**。
3. **`@` alias 指向專案根目錄不是 `src/`**。新檔一律相對路徑 import，不要用 `@`。
4. 每抽完一個函式就跑 `npm run lint`（`tsc --noEmit`），**零錯誤才進下一個**。
5. **不要 commit、不要 push**，全部留 working tree。
6. `AGENTS.md` 已存在（第一輪生成），裡面有專案慣例，動手前先讀。

## 1. 本輪目標檔案與現況（2026-07-09，第一輪後）

| 檔案 | 目前行數 | 本輪處理 |
|---|---|---|
| `src/hooks/useAI.ts` | 1970 | **主要目標**，抽自成一體的特化流 |
| `src/components/InfiniteCanvas.tsx` | 1942 | 次要，只做一個低風險小抽（見第 3 節），做不到就跳過 |
| `src/App.tsx` | 1840 | **本輪不動** |
| `src/components/TransformableElement.tsx` | 1778 | **本輪不動**，留待第三輪 |

## 2. 主任務：`src/hooks/useAI.ts`（1970 →目標約 1400，不強求）

`useAI.ts` 目前結構（行號為現況）：共用小工具在頂部（`withAtlasWaitToast` 98、`prepareForGeneration` 123、`restoreTransparencyFn` 129、`createAiClient` 137、`handleAIError` 141），下面是一整排 `handleXxx`。

### ✅ 本輪要抽的（自成一體的「特化生成功能」，彼此獨立、風險低）

搬法統一：抽成 `src/ai/pipelines/` 下的**純函式**（吃明確參數、回傳結果），`useAI.ts` 裡的 `handleXxx` 保留成薄 wrapper（呼叫純函式 → 處理 loading / toast / setElements）。命名風格對齊既有 pipeline 檔。

| 函式（useAI.ts 行號） | 去處 | 說明 |
|---|---|---|
| `handleLogoBrandKit`（1517-1639）+ `handleExtendBrandKit`（1640-1769） | 新增 `src/ai/pipelines/brandKit.ts` | 兩個是同一組品牌工具包功能，一起搬 |
| `handleProductMarketingSet`（1770-結尾） | 新增 `src/ai/pipelines/productMarketing.ts` | 產品行銷組圖，獨立功能 |
| `handleCrossPlatformAdapt`（1417-1516） | 新增 `src/ai/pipelines/crossPlatform.ts`（或併入既有 `generate.ts`，Codex 自行判斷哪個乾淨） | 跨平台尺寸改作，~100 行 |
| `handleCopyStyle`（158-179）/ `handleApplyStyle`（180-273）/ `handlePasteStyle`（274-341） | 併入既有 `src/ai/pipelines/styleTransfer.ts` | 三個都是風格複製/套用，同性質，既有檔已在 |

以上四組抽完，`useAI.ts` 約可減 700 行。**這已經足夠，不用再往下硬抽。**

### ⛔ 本輪明確「不要碰」的（高風險或高耦合，留原地）

- **`handleGenerate`（1001-1416，415 行）**——主生成流，全 hook 最危險，這輪絕對不動。
- `handleHarmonize`（469-649）、`handleOutpaintingGenerate`（664-836）——與共用工具 `prepareForGeneration` / `restoreTransparencyFn` / `withAtlasWaitToast` 深度耦合，抽出來要一起搬工具、風險升高，本輪跳過。
- `handleRemoveBackground` / `handleAIUpscale` / `handleLocalUpscale` / `handleLocalRemoveBackground` / `handleCameraAngle`——留原地，本輪不處理。
- 頂部共用工具（`withAtlasWaitToast` 等）——**不要搬動**，本輪要抽的四組功能若有用到，就從 useAI 傳進純函式當參數，不要複製一份定義出去。

## 3. 次要任務：`src/components/InfiniteCanvas.tsx`（可做可不做）

只做**一個**低風險抽取，做不順就整個跳過、不勉強：

- 若 `handleZoomStep` / `handleFitToScreen` / `handleZoom` 這類**純視圖縮放**邏輯還在 InfiniteCanvas 內且彼此獨立，可抽成 `src/hooks/useCanvasZoom.ts`。
- **滑鼠事件狀態機（`handleMouseDown/Move/Up`、marquee、group resize/rotate）本輪一律不碰**——那是最容易造成框選/拖曳回歸的地方，留待專門一輪。

## 4. 執行順序

1. 主任務 useAI.ts：`brandKit` → lint → `productMarketing` → lint → `crossPlatform` → lint → `styleTransfer 三連` → lint
2. （可選）InfiniteCanvas zoom 抽取 → lint
3. `npm run build` 最終確認
4. 產出 `docs/codex-migration-report-round2.md`：每筆搬移（來源:行範圍 → 目的檔）、新增檔清單、useAI.ts 行數前後對照、跳過項目與原因

## 5. Claude 複查清單

- [ ] `git diff src/hooks/useAI.ts` 是純搬遷，無邏輯改動夾帶
- [ ] 四組特化流抽出後，`handleXxx` wrapper 的參數/回傳/toast 行為與原本一致
- [ ] `handleGenerate` 一行未動（git diff 確認）
- [ ] 共用工具 `withAtlasWaitToast` / `prepareForGeneration` / `restoreTransparencyFn` 沒被複製成多份
- [ ] 新檔無 `@` alias 誤用；根目錄無新增檔
- [ ] `npm run lint` + `npm run build` 全過；dev server 無 console 錯誤
- [ ] 未 commit / 未 push
