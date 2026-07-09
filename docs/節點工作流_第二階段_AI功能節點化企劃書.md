# 節點工作流 第二階段：AI 功能全面節點化 企劃書

> 交付對象：Codex
> 撰寫日期：2026-07-10
> 前置：第一階段（`docs/節點工作流_執行企劃書.md`）已完成，另雲端去背、動作節點成品拖出已由 Linus 補上。

---

## 0. 這個階段的目標（務必先理解，否則會做偏）

節點工作流的**產品定位**：讓使用者針對「某一張圖」進入一個專注的子空間作業。

**核心原則**：
> App 主畫布上原本就有的**每一個 AI 功能**，在節點模式裡都應該能用。
> 差別**只在於呈現與操作方式**——主畫布是「選圖 → 點按鈕 → 跳 modal → 出結果」；
> 節點模式是「把功能當成一個節點，連上輸入 → 執行 → 結果顯示在節點上、可再串下一步」。

**不是**要新發明 AI 能力，而是把既有 pipeline **包裝成節點**。所有 AI 邏輯一律呼叫 `src/ai/pipelines/*` 與 `src/utils/*` 既有函式，**嚴禁重寫模型呼叫**。

現況：節點模式只有 5 種節點（input / output / removeBg / imageGen / style），只覆蓋約 1/3 的 AI 功能。本階段把其餘功能補成節點。

---

## 1. 節點總藍圖

下表是完整的節點清單。標 ✅ 的已存在，標 🆕 的是本階段要新增。

| 節點 kind | 顯示名 | 輸入 | 輸出 | 接的既有函式 | 狀態 |
|---|---|---|---|---|---|
| `input` | 輸入（圖/便利貼） | — | 圖 或 文字 | — | ✅ |
| `output` | 結果輸出 | 圖/文字 | 展示 | — | ✅ |
| `removeBg` | 去背 | 圖 | 圖 | `runLocalRmbgPipeline` / `birefnetRemoveBg` | ✅ |
| `imageGen` | 生成圖片 | 文字+圖(多) | 圖 | `geminiGenerateImage` / `atlasBatch` | ✅ |
| `style` | 預設風格轉換 | 圖 | 圖 | `buildPresetStylePrompt`+`generateStyledImage` | ✅ |
| `upscale` | 放大 | 圖 | 圖 | `runLocalUpscalePipeline` | 🆕 T11 |
| `layerSplit` | 圖層分離 | 圖 | 多圖 | `geminiLayerSegment` | ✅ 已完成（Batch 示範） |
| `outpaint` | 外擴延伸 | 圖 | 圖 | `generateOutpaintingPrompt`+生圖 | 🆕 T13 |
| `analyze` | 圖片分析 | 圖 | 文字 | `analyzeImageStyleFull` | 🆕 T14 |
| `promptOptimize` | 提示詞優化 | 文字 | 文字 | `optimizePromptWithAI` | 🆕 T15 |
| `copyStyle` | 拷貝風格 | 圖(參考風格)+圖(內容) | 圖 | `analyzeCopiedStyle`+`generateCopiedStyleAssets` | 🆕 T16 |
| `brandKit` | 品牌識別 | 圖(logo) | 多圖 | `runLogoBrandKitPipeline` | 🆕 T17（評估） |
| `crossPlatform` | 跨平台適配 | 圖 | 多圖 | `runCrossPlatformPipeline` | 🆕 T18（評估） |
| `productMarketing` | 商品行銷圖 | 圖 | 多圖 | `runProductMarketingPipeline` | 🆕 T19（評估） |

**分批策略**：T11–T16 是「單圖進、單圖或文字出」的乾淨節點，優先做。T17–T19 產出「多圖／整組資產」，與節點模式「單一結果流」的模型衝突，**先評估呈現方式再做**（見第 4 節）。

---

## 2. 每個新節點的規格

> 動手前，Codex 一律先去 `grep` 該函式簽名、讀懂參數與回傳型別，再寫節點。以下只給對接點與注意事項。

### T11. `upscale` 放大節點 ⭐ 最先做（最單純）
- **接**：`runLocalUpscalePipeline`（`src/ai/pipelines/localModels.ts:41`）。本機模型，先 `checkLocalModelReady`（比照 removeBg 寫法）。
- **輸入**：單張圖（needsUpstream=true）。**輸出**：放大後的圖。
- **UI**：極簡，可只有標題 + 結果預覽（若函式支援倍率參數再加下拉）。
- **executor**：新增 `case 'upscale'`，仿 `case 'removeBg'`。

### T12. `layerSplit` 圖層分離節點 — ✅ 已由 Linus 完成（作為 Batch 基礎設施的示範）
- **已實作**：接 `geminiLayerSegment`，產出 `LayerResult[]` → 多輸出。
- **多輸出呈現＝可折疊 Batch 節點**（見下方「Batch 基礎設施」）：一個節點裝一組結果，
  折疊成疊圖+數量，可展開；展開後每個項目有獨立輸出接口 `item-N`（可各自接下游）、
  可單獨拖出、可整批匯出。
- 後續其他多輸出節點（T17–T19）**一律沿用這套 Batch 基礎設施**，不要再自創呈現方式。

### 📦 Batch 多輸出基礎設施（已建，供多輸出節點共用）
Codex 做多輸出節點時，直接用既有機制，勿重造：
- `types.ts`：`isMultiOutputKind(kind)` 判定；`GraphEdge.sourceHandle`（邊用 `item-N` 指定接第幾個輸出）。
- `store`：`nodeBatchResults[id]: string[]` + `setNodeBatchResult`。
- `executor`：`emitBatch(id, srcs)` 寫入整組並保留第 0 個為單值代表；`resolveEdgeValue` 依 `sourceHandle` 解析下游取第幾個。
- UI：`nodes/LayerSplitNode.tsx` 是可折疊 Batch 容器的參考實作；`NodeWorkflowContext` 提供 `detachImage` 給節點內項目。
- **新增一個多輸出節點的步驟**：把 kind 加進 `MULTI_OUTPUT_KINDS`、executor 走 `emitBatch`、UI 仿 `LayerSplitNode`（或抽成共用 `<BatchNodeShell>` 更好）。

### T13. `outpaint` 外擴節點
- **接**：`generateOutpaintingPrompt`（`src/ai/pipelines/outpainting.ts:6`）產生提示詞，再走生圖。讀懂它回傳什麼、是否需搭配 `geminiGenerateImage`。
- **輸入**：單圖。**輸出**：外擴後的圖。
- **UI**：方向/比例選擇（依函式參數）。

### T14. `analyze` 圖片分析節點（圖 → 文字）
- **接**：`analyzeImageStyleFull`（`src/ai/pipelines/analysis.ts:39`）。
- **輸入**：單圖。**輸出**：**文字**（分析描述）。這是第一個「圖進文字出」的節點，結果用 `NodeResultPreview` 的文字分支顯示。
- **用途**：可接到 imageGen 當提示詞來源，形成「分析參考圖 → 生成類似風格」的鏈。

### T15. `promptOptimize` 提示詞優化節點（文字 → 文字）
- **接**：`optimizePromptWithAI(userPrompt, geminiApiKey)`（`src/ai/pipelines/analysis.ts:20`）。
- **輸入**：文字（便利貼或上游文字）。**輸出**：優化後文字。
- **UI**：可選內建輸入框（無上游時用自身文字），仿 imageGen 的 prompt 欄。

### T16. `copyStyle` 拷貝風格節點（雙輸入）
- **接**：`analyzeCopiedStyle`（`styleTransfer.ts:99`）分析參考圖風格 → `generateCopiedStyleAssets`（`styleTransfer.ts:151`）套用到內容圖。
- **輸入**：**兩個** —「風格參考圖」+「內容圖」。用第一階段的 `upstreamSrcs` 多輸入機制；需要在節點 UI 或 handle 上區分兩個輸入的角色（例如兩個具名 target handle）。
- **輸出**：套用風格後的圖。
- **註**：這是唯一需要「具名/多角色輸入」的節點，若 handle 區分成本高，首版可約定「第一條入邊=風格、第二條=內容」並在節點 UI 標註。

### T17–T19. 整組資產節點（brandKit / crossPlatform / productMarketing）
這三個 pipeline 產出**一整組圖**（多尺寸/多平台/多版位），屬多輸出。
**呈現方式已定案：一律用上面的「可折疊 Batch 基礎設施」**（不需再提方案）：
- 把各自的 kind 加進 `MULTI_OUTPUT_KINDS`。
- executor 對應 case 呼叫該 pipeline，取回一組圖 → `emitBatch(id, srcs)`。
- UI 仿 `LayerSplitNode`（建議先把它抽成共用 `<BatchNodeShell>`，三者共用只改標題/參數）。
- 使用者即可對整組資產：折疊/展開、個別接下游、個別拖出、整批匯出。
- 各 pipeline 的參數（品牌色、平台清單、版位等）放節點 UI，比照 imageGen 的參數欄。

---

## 3. 共用工作（做新節點前先鋪好）

### T10a. 型別與註冊集中化
- `types.ts` 的 `NodeKind` union 會膨脹到 13+ 種。同步：
  - 每種節點的 `Params` 介面。
  - `NodeWorkflowCanvas.tsx` 的 `nodeTypes` 註冊、`DEFAULT_LABEL`、工具列 `ADDABLE` 清單。
- 建議把「節點種類 → 元件 / 預設 label / 是否需上游 / I/O 型別」收斂成**單一設定表**（node registry），executor 與 UI 都從它讀，避免每加一種節點要改 5 個地方。**這是本階段第一件事**，能大幅降低後續每個節點的成本。

### T10b. executor 的 kind 分派抽象化
- 目前 `executeGraph` 內一個大 `switch`。隨節點變多，抽成 `nodeRunners: Record<NodeKind, (ctx) => Promise<Result>>` 更好維護。ctx 提供 `inputs: string[]`、`params`、`engine`、`onProgress`。
- 保持既有錯誤隔離 / abort / 多輸入行為不變。

### T10c. 工具列分組
- 節點種類變多後，`ADDABLE` 一排放不下。分組成「輸入 / 影像處理 / 生成 / 分析」下拉或分段，避免工具列爆掉。

---

## 4. 硬性護欄（沿用第一階段，違反會壞既有功能）

1. **不重寫 AI 邏輯**：一律呼叫既有 `src/ai/pipelines/*`、`src/utils/*` 函式。找不到就回報，不要自己實作模型呼叫。
2. **中間結果只留 runtime**：`onNodeResult` 寫進 store 的 `nodeResults`（runtime-only），**絕不可**進 `exportGraph()` 存檔。
3. **不破壞 measured 尺寸同步**：維持「React Flow 自管 nodes/edges、store 只鏡像」，不要改回每次從 store 重建。
4. **engine key 都已就緒**：`geminiApiKey` / `atlasApiKey` / `falApiKey` / `geminiImageModel` 已在 `ExecutorEngine` 且 App 有傳。需要別的 key 先回報。
5. **每個節點做完就 `npm run build` + `npx tsc --noEmit`（node workflow 檔案零錯）**，並手動驗收該節點能執行、結果正確顯示、可拖出。
6. **一節點一 commit**，繁中訊息 `feat(節點工作流): …`。
7. **push 前一定先問 Linus**。

---

## 5. 建議順序

```
先鋪地基： T10a（node registry）→ T10b（runner 抽象）
第一批（乾淨單流）：T11 upscale → T15 promptOptimize → T14 analyze → T13 outpaint → T12 layerSplit
第二批（雙輸入）：  T16 copyStyle
需評估後再做：      T17 / T18 / T19（整組資產）
最後：              T10c 工具列分組
```

T11（upscale）先做是因為它幾乎是 removeBg 的翻版，能順便驗證 T10a/T10b 的抽象是否好用，再往下推。

---

## 6. Definition of Done

- [ ] node registry 建立，加新節點只需動一處設定 + 一個元件（T10a/b）
- [ ] upscale / promptOptimize / analyze / outpaint / layerSplit 五個節點可執行、結果正確、可拖出（T11–T15）
- [ ] copyStyle 雙輸入節點可用（T16）
- [ ] T17–T19 已提評估方案並經 Linus 確認方向
- [ ] 工具列在 13+ 節點下仍好用（T10c）
- [ ] `npm run build` 全綠、`npx tsc --noEmit` node workflow 零錯、既有 5 節點與拖出/匯入/存檔無回歸
