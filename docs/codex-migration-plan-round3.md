# 巨檔拆分規劃書 第三輪（交付 Codex 執行 / Claude 複查）

> 前兩輪已完成並 commit：App.tsx 2801→1840、useAI.ts 1970→1672。
> 本輪目標：兩個目前最肥的檔案 **`ImageEditModal.tsx`（2476）** 與 **`SemanticEditorView.tsx`（2276，感知物件編輯）**。
> **策略：只抽「module-level 子元件與 helper/常數」——這是零 state 糾纏、最安全的搬遷。兩個檔的巨大主元件本體（幾十個 useState 那坨）本輪一律不動。**
> 安全優先、不過分拆。做不順的子元件就跳過，不要硬抽。
> 執行者：Codex (GPT)。完成後由 Claude 複查。
> 日期：2026-07-09

---

## 0. 執行前必讀（與前兩輪相同）

1. **純搬遷（refactor-move），不改行為**。整段剪貼，不要順手改寫/精簡/重命名。
2. 正本一律在 `src/` 底下，**嚴禁根目錄新增檔案**。
3. **`@` alias 指向專案根目錄不是 `src/`**。新檔一律相對路徑 import。
4. 每抽完一個子元件就跑 `npm run lint`（`tsc --noEmit`），**零錯誤才進下一個**。
5. **不要 commit、不要 push**。
6. `AGENTS.md` 已存在，動手前先讀專案慣例。
7. **本輪的鐵律**：只搬「檔案頂部、在主元件 `export` 之前定義的」module-level 子元件、helper 函式、常數。**凡是定義在主元件 `{ ... }` 內部、會讀到主元件 useState/ref 的東西,一律不准動。** 判斷標準:那個東西如果只吃自己的 props / 參數、不碰主元件的閉包 state,就能搬;否則跳過。

## 1. 本輪目標與現況（2026-07-09，第二輪後）

| 檔案 | 行數 | 本輪處理 |
|---|---|---|
| `src/components/ImageEditModal.tsx` | 2476 | 抽頂部子元件 + helper + 常數 |
| `src/components/SemanticEditor/SemanticEditorView.tsx` | 2276 | 抽頂部子元件（已有 `LayerListPanel` 拆分前例） |

兩個檔的主元件本體（`ImageEditModal`（188 起）/ `SemanticEditorView`（510 起））**本輪都不進去動**。

## 2. 任務一：`ImageEditModal.tsx`（2476）

在主元件 `export const ImageEditModal`（第 188 行）**之前**,有這些 module-level 定義,逐一評估是否 self-contained（只吃 props/參數）後搬出:

| 目標（行號） | 去處 | 備註 |
|---|---|---|
| `AdjustmentSlider`（94-133，`React.FC`） | `src/components/ImageEditModal/AdjustmentSlider.tsx` | 純表現元件,應可直接搬 |
| `CollapsibleSection`（134-164，`React.FC`） | `src/components/ImageEditModal/CollapsibleSection.tsx` | 純表現元件 |
| `useDebounce`（15-48）、`drawEllipseFromDrag`（165-181） | `src/components/ImageEditModal/helpers.ts` | 純函式 |
| `defaultAdjustments`（69）、`BRUSH_SIZES`（81）、`MASK_COLOR`（82）、`MIN_ZOOM`/`MAX_ZOOM`（83-84）、`MAX_REFERENCE_IMAGES`（49）、`removeModelOptions`（182-187）、`EditIcons`（86-93） | `src/components/ImageEditModal/constants.ts` | 常數與 icon 集 |

- 搬完後 `ImageEditModal.tsx` 頂部改為從新檔 import。
- **注意 `EditIcons`**:若它被主元件內部多處 inline 使用,搬到 constants 後只要改 import 即可,但先 grep 確認它不是被主元件的某個 state 動態組出來的。
- 預估減 ~200 行（2476 → ~2280）。**這樣就夠,主元件本體不要碰。**

## 3. 任務二：`SemanticEditorView.tsx`（2276）

在主元件 `export function SemanticEditorView`（第 510 行）**之前**,有這些 module-level 子元件,逐一評估後搬出到 `src/components/SemanticEditor/` 下:

| 目標（行號） | 去處 | 備註 |
|---|---|---|
| `FloatingPromptBox`（141-368，~227 行） | `src/components/SemanticEditor/FloatingPromptBox.tsx` | **最大一塊**,若 self-contained 貢獻最多 |
| `PillToolbar`（369-485，~117 行） | `src/components/SemanticEditor/PillToolbar.tsx` | |
| `RefImagePreview`（83-140） | `src/components/SemanticEditor/RefImagePreview.tsx` | |
| `BBoxOverlay`（42-82） | `src/components/SemanticEditor/BBoxOverlay.tsx` | |
| `Ic`（16-41，icon 集） | `src/components/SemanticEditor/icons.ts` | 若 `FloatingPromptBox` 等也用到,一起 import |

- 這裡已有 `LayerListPanel.tsx` 的拆分前例（前面幾輪抽的），沿用同樣的 sibling-file 模式。
- **關鍵檢查**:`FloatingPromptBox` / `PillToolbar` 這幾個雖然定義在 module level,但可能透過 props 吃了很多主元件傳下來的 callback。這沒關係——只要它們**不是直接讀 `SemanticEditorView` 內部的閉包變數**（而是全部走 props），就能搬。搬的時候把它們的 props interface 一併帶走。
- 預估減 ~450 行（2276 → ~1820）。主元件 `SemanticEditorView` 本體(510 起那 1700 多行)本輪不碰。

## 4. 執行順序

1. 任務一 ImageEditModal:先搬常數/helper（最安全）→ lint → 再搬 `AdjustmentSlider` → lint → `CollapsibleSection` → lint
2. 任務二 SemanticEditorView:`BBoxOverlay` → lint → `RefImagePreview` → lint → `PillToolbar` → lint → `FloatingPromptBox` → lint
3. `npm run build` 最終確認
4. 產出 `docs/codex-migration-report-round3.md`:每筆搬移、新增檔清單、兩檔行數前後對照、跳過項目與原因（哪些子元件因為讀了主元件 state 而無法搬,要列出來）

## 5. Claude 複查清單

- [ ] 兩檔主元件本體（`ImageEditModal` / `SemanticEditorView` 的 `{...}` 內部）一行未動,只有頂部定義被移走 + import 改寫
- [ ] 被搬的子元件都是走 props,沒有偷偷把主元件 state 一起搬出去造成行為改變
- [ ] 新檔無 `@` alias 誤用；根目錄無新增檔；新檔都在正確子目錄
- [ ] `npm run lint` + `npm run build` 全過
- [ ] dev server 無 console 錯誤；開啟圖片編輯 Modal 與感知編輯器兩個畫面能正常渲染（我會實測）
- [ ] 未 commit / 未 push
