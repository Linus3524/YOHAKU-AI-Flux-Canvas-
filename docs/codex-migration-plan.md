# 巨檔拆分規劃書（交付 Codex 執行 / Claude 複查）

> 範圍更正：`node_workflow_spec.md` 是**另一個新功能**（節點工作流）的 PRD，與本次拆分**無關**，Codex 不需要參考它。
> 本次目標：純粹把現存最肥大的三個檔案拆薄，**不新增功能、不改變任何行為**。
> 執行者：Codex (GPT)。完成後由 Claude 複查並修正。
> 日期：2026-07-09

---

## 0. 執行前必讀的硬性規則（違反即打回）

1. **這是純搬遷（refactor-move），不是重寫**。任何一行邏輯的行為都不能變。能整段剪貼過去就整段剪貼，不要「順手」改寫、精簡、重新命名變數。
2. **正本一律在 `src/` 底下，嚴禁在專案根目錄新增任何檔案**（根目錄只有 `index.tsx`、`vite.config.ts` 合法）。
3. **`@` alias 指向專案根目錄，不是 `src/`**。新檔案之間一律用相對路徑 import，不要用 `@`。
4. 每完成一個檔案的拆分就跑 `npm run lint`（`tsc --noEmit`），**必須零錯誤才能進下一個檔案**。
5. **不要 commit、不要 push**。全部改動留在 working tree。
6. 動任何符號前先 grep 確認「真正被 import 的那一份」，避免動到死碼（例如 `FloatingAssistant.tsx` 的 `FEATURE_DOCS` 陣列從未被渲染，功能指南實際用的是 JSX 內嵌的 `t`/`d` 陣列）。

## 1. 目標檔案與現況（2026-07-09 行數）

上一批拆分已完成：`SemanticEditorView` 抽出 `LayerListPanel`（-611行）、`InfiniteCanvas.tsx` 抽出 `OutpaintingFrame`/`CropManager`、`useAI.ts` 的部分引擎葉子已併入 `src/ai/pipelines/`（第五、六批）。**這次是接續拆分，目標檔案是現在仍最肥大的三個**：

| 檔案 | 目前行數 | 驗收目標（拆完後） |
|---|---|---|
| [src/App.tsx](../src/App.tsx) | 2801 | ≤ 1600 |
| [src/components/InfiniteCanvas.tsx](../src/components/InfiniteCanvas.tsx) | 2125 | ≤ 1400 |
| [src/hooks/useAI.ts](../src/hooks/useAI.ts) | 1981 | ≤ 1200 |

不動 `TransformableElement.tsx`（1778行，排第四，留給下一批）。

## 2. 任務一：`src/App.tsx`（2801 → ≤1600）

`App.tsx` 目前是「一個元件塞了幾十個 useState + handle* callback」。實測結構：

- `ApiKeyModal`（App.tsx:50-176）：**獨立元件，完全可整段搬走**，本來就不依賴 `App` 內部狀態，只吃 props。
  → 移到 `src/components/ApiKeyModal.tsx`，`App.tsx` 改為 import。
- 以下 handler 群組彼此耦合度高（同屬「AI 二次加工功能」，都是 `elementId → 開某個 Modal/Target state`），建議整組抽成一個 hook `useEditorTargets.ts`（放 `src/hooks/`），管理各種 `xxxTarget` state + `handleOpenXxx`：
  - `crossPlatformTarget` / `handleOpenCrossPlatform`（App.tsx:695-702）
  - `brandKitTarget` / `handleOpenBrandKit`（703-710）
  - `productMarketingTarget` / `handleOpenProductMarketing`（711-718）
  - `designMasterTargetId` / `handleOpenDesignMaster`（246-248, 1034-1043）
  - `semanticEditorTarget` 相關（`handleOpenSemanticEditor` / `syncSemanticStateToElement` / `handleCloseSemanticEditor`，366-436）
  - `resizeImageTargetId`（219）
  這一組全部是「打開某個編輯彈窗」的樣板，抽出去對 `App.tsx` 減重最大。
- 檔案/儲存相關：`handleSaveFileWithConfirm` / `handleSaveConfirmProceed` / `handleSaveConfirmDiscard` / `saveConfirmOpen`（437-459）+ `showClearConfirm` 邏輯 → 抽成 `useFilePersistence.ts`（放 `src/hooks/`），若專案已有類似檔案（先 grep `canvasPersistence.ts` 是否已涵蓋部分邏輯，避免重複造輪）。
- 較大的單一功能 handler（各自吃飽 60~200 行，可直接原封不動搬到既有的 `src/ai/pipelines/` 對應檔，或新增 pipeline 檔）：
  - `handleBiRefNetRemoveBackground`（532-555）、`handleLocalRemoveBackground` 相關
  - `handleMagicLayer`（556-632）
  - `handleOCRConvert`（633-694）
  - `handleSplitSticker`（719-832）
  - `handleExtractPrompt`（897-984）
  - `handleRasterizeTextOverride`（1044-1118）、`handleMergeLayersOverride`（1119-1122）
  這些若已有邏輯依賴的 API 呼叫在 `src/ai/pipelines/*`，就把「純運算/API 呼叫」部分留在 pipeline 檔，`App.tsx` 只留呼叫 + set state 的薄 wrapper。**如果搬遷會牽動已在 pipeline 裡的函式簽名，先 grep 確認呼叫關係再動**。
- ContextMenu / 交互狀態（`contextMenu` / `handleContextMenu` / `styleLibPos` 相關拖曳邏輯，1123-1230 附近）：可留在 `App.tsx`，不強制搬遷。

**驗收**：`App.tsx` 降到 ≤1600 行；所有被抽出的 handler 行為簽名不變（同名 props 傳入 `InfiniteCanvas` 等子元件不變）；`npm run lint` 過。

## 3. 任務二：`src/components/InfiniteCanvas.tsx`（2125 → ≤1400）

現況：拖曳/縮放/選取的滑鼠事件處理是核心大塊，且已經拆過 Outpainting/Crop。這次抽的是「滑鼠事件狀態機」：

- 建立 `src/hooks/useCanvasPointerEvents.ts`，把以下整組搬過去（這些函式彼此共享同一份拖曳/框選 state，必須整組一起搬，不要拆散）：
  - `handleLiveDrag`（260-309）
  - `handleDragStart` / `handleElementDragEnd`（310-320附近）
  - `handleMouseDown` / `handleMouseMove` / `handleMouseUp`（619-818）
  - `handleMenuMouseDown`（819-853）
  - `handleContextMenu` / `handleElementContextMenu`（854-866）
  - 相關的 `handleKeyDown` / `handleKeyUp`（596-618，鍵盤修飾鍵如 space/shift 常和拖曳狀態機共用旗標，一併搬）
  - hook 對外只回傳 `InfiniteCanvas` 需要綁到 DOM 上的 handler 們 + 必要的暴露 state（如 `isDraggingOnCanvas`、`marqueeRect` 等，先 grep 目前 InfiniteCanvas 內傳給子元件/JSX 用了哪些相關 state 再決定回傳介面）。
- `handleZoomStep`（881-888）/ `handleFitToScreen`（889起）/ `handleAutoPrompt`（867-880）三者性質不同（zoom 和 autoprompt 不相關），**不要**塞進同一個 hook：
  - zoom 相關可併入既有的 view/zoom 邏輯（先 grep `InfiniteCanvas.tsx` 裡是否已有 `useCanvas.ts` 管 zoom/pan，若有就直接搬過去合併，不要新增重複 hook）。
  - `handleAutoPrompt` 若是呼叫 AI API，搬到 `src/ai/pipelines/` 對應檔或新增檔案。

**驗收**：`InfiniteCanvas.tsx` 降到 ≤1400 行；拖曳/框選/縮放行為零變化（尤其注意 `mousedown→mousemove→mouseup` 的框選邏輯是 CLAUDE.md 提到的驗證重點，複查時會實測）；`npm run lint` 過。

## 4. 任務三：`src/hooks/useAI.ts`（1981 → ≤1200）

現況：`useAI` 是單一 hook 塞了近 20 個 `handleXxx = useCallback(...)`。已有 `src/ai/pipelines/`（`generate.ts` / `analysis.ts` / `styleTransfer.ts` / `localModels.ts`）可以承接更多葉子。**命名與風格要對齊既有四檔**。

依現有函式逐一分類搬遷（每個函式都已經是 `useCallback` 包裹的獨立單元，理論上都能抽，只要它不直接依賴 `useAI` 內其他 handler 的閉包）：

| 函式（useAI.ts 行號） | 建議去處 |
|---|---|
| `handleAskAI`（146-156） | `src/ai/pipelines/generate.ts` 或新增 `chat.ts` |
| `handleCopyStyle` / `handleApplyStyle` / `handlePasteStyle`（157-340） | `src/ai/pipelines/styleTransfer.ts`（同性質功能，已有此檔） |
| `handleCameraAngle`（341-437） | `styleTransfer.ts` 或 `generate.ts`，視其呼叫的是哪套 API 決定 |
| `handleRemoveBackground` / `handleLocalRemoveBackground`（438-467, 979-1011） | `src/ai/pipelines/localModels.ts`（本機 ONNX/BiRefNet 類，已有此檔） |
| `handleHarmonize`（468-648） | `src/ai/pipelines/generate.ts` |
| `handleStartOutpainting` / `handleOutpaintingGenerate` / `handleAutoPromptGenerate`（649-856） | 新增 `src/ai/pipelines/outpainting.ts`（量體夠大，值得獨立一檔） |
| `handleAIUpscale` / `handleLocalUpscale`（857-978） | `src/ai/pipelines/localModels.ts`（本機放大）+ 雲端放大部分視 API 分流到 `generate.ts` |
| `handleGenerate`（1012-1427，**全 hook 最大單一函式，416行**） | 新增 `src/ai/pipelines/mainGenerate.ts`。**這是重點大魚**，抽出後對 `useAI.ts` 減重貢獻最大，但也最容易夾帶邏輯改動風險，抽的時候要逐段核對原始碼一字不漏搬過去 |
| `handleCrossPlatformAdapt`（1428-1527） | `src/ai/pipelines/generate.ts` 或新增 `crossPlatform.ts` |
| `handleLogoBrandKit` / `handleExtendBrandKit`（1528-1780） | 新增 `src/ai/pipelines/brandKit.ts` |
| `handleProductMarketingSet`（1781起） | 新增 `src/ai/pipelines/productMarketing.ts` |

**搬遷方式**：每個 pipeline 函式改成「吃明確參數、回傳結果」的純函式（不再是閉包在 `useAI` 內部直接讀寫 `elements`/`setElements`），`useAI.ts` 裡的 `handleXxx` 保留成薄 wrapper：呼叫 pipeline 函式 → 处理 loading/toast/setElements。**這一步是本次拆分中"改寫程度"最高的地方，务必确保搬完後行为與原本完全一致**（尤其是 `withAtlasWaitToast` / `prepareForGeneration` / `restoreTransparencyFn` 這幾個共用的小工具函式，多個 handler 都在用，搬遷時要決定它們去哪裡並統一 import，不要重複定義）。

**驗收**：`useAI.ts` 降到 ≤1200 行；`handleGenerate` 等大函式搬遷後跑一次實際生成流程確認行為不變（若無 API key 可跑，至少確認 lint + 型別正確、函式簽名一致）；`npm run lint` 過。

## 5. 執行順序

1. 任務一（App.tsx）→ lint
2. 任務二（InfiniteCanvas.tsx）→ lint
3. 任務三（useAI.ts）→ lint（最後做，因為風險最高、牽動最廣）
4. 全部完成後 `npm run build` 做最終確認
5. 產出 `docs/codex-migration-report.md`：列出每筆搬移（來源檔:行範圍 → 目的檔）、新增檔案清單、三個目標檔案的行數前後對照、跳過/未完成項目與原因

## 6. Claude 複查清單

- [ ] 根目錄無新增檔案；無人 import 根目錄舊檔
- [ ] `git diff` 中的搬遷是純搬遷（無邏輯改動夾帶），尤其重點檢查 `handleGenerate` 抽出後的版本
- [ ] 新檔 import 路徑無誤用 `@` alias
- [ ] `npm run lint` 與 `npm run build` 全過；dev server 起得來、console 無新錯誤
- [ ] 三個檔案行數目標達成（App.tsx ≤1600、InfiniteCanvas.tsx ≤1400、useAI.ts ≤1200）
- [ ] 框選/拖曳/縮放（InfiniteCanvas 抽出的滑鼠事件狀態機）用 preview 實測一次沒有回歸
- [ ] 未 commit / 未 push
