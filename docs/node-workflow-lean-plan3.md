# 節點工作流 精簡路線 #3 — 圖形執行引擎（Executor）企劃書

> 前情：#1（子空間 UI 殼）、#2（處理節點 + 面板 + 離鏈）已完成。節點目前**只能設定、不會跑**。
> **本份 #3 = 讓節點鏈真的執行**：按「執行」→ 依拓撲順序跑 → 出圖 → 結果回貼 Output 節點與大畫布方框。**#3 完成 = 節點工作流真的可用（精簡路線終點）。**
> 這是整個系列最複雜、最需要設計拍板的一輪。**先過企劃，再實作。**
> 日期：2026-07-09

---

## 0. 硬性規則
1. 正本在 `src/` 底下，禁根目錄新檔；`@` alias 指根目錄別誤用（相對路徑 import）。
2. 每步 `npm run lint` 零錯誤才繼續；不 commit / 不 push。
3. **執行引擎是純 TS，不碰 React**：放 `src/components/NodeWorkflow/executor/`（或 `src/ai/nodeGraphExecutor.ts`），只吃 graph + 參數、回傳結果，UI 狀態由呼叫端處理。
4. **重用既有 pipeline，不要重寫 AI 邏輯**：去背/生圖/風格一律呼叫 `src/ai/pipelines/*` 現成函式。
5. **中間結果不進存檔**（#1 埋的雷）：節點產出的中間圖存**記憶體快取**，只有「最終輸出」寫進 `NodeGroupElement.outputSrc` 持久化。graph JSON 只存拓撲 + 節點參數，不存 base64 中間圖。

## 1. MVP 範圍（安全優先，分兩階段）

### 階段 A：先把「一條線」跑通（不需 API key，最好驗證）
先只支援**線性鏈**（每個節點最多一個上游圖輸入），並優先接**本機去背**（`runLocalRmbgPipeline`，免 key、免額度）：
- 目標鏈：`Input(圖) → RemoveBg(本機) → Output`。按執行 → Output 節點顯示去背後的透明圖 + 大畫布方框同步顯示。
- 這條先通，代表執行引擎的骨架（拓撲、傳遞、狀態、回貼）正確。

### 階段 B：接上需要 key 的節點
- `imageGen` → `geminiGenerateImage`（組 parts：上游圖 inlineData + prompt text）或 `atlasBatch`（依 model 分流）。
- `style` → `styleTransfer.ts` 的 `generatePresetStyleAssets` / `generateStyledImage`（把 #2 StyleNode 的 styleKey 對應到實際風格 prompt）。
- 需要的 API key（`apiKey`/`atlasApiKey`）由 App 傳入執行器（比照 useAI 的 engine 組法）。

**不做（延後）**：多輸入節點合成、並行執行（先序列跑）、可折疊 Batch 節點。這些等 MVP 穩了再加。

## 2. 執行引擎設計（`nodeGraphExecutor.ts`）

### 2-1. 資料流
- 輸入：`NodeGraphData`（nodes + edges）+ 一組 `engine`（api keys、model 設定）+ callbacks（onNodeStatus、onProgress）。
- 拓撲排序：從 `input` 節點出發，沿 edges 走到 `output`。偵測環路 → 報錯中止。
- 逐節點執行：
  - 取上游節點的**輸出圖**（input 節點的輸出 = 它的 `data.src`；其他節點的輸出 = 執行結果）。
  - 依 `node.kind` 呼叫對應 pipeline，產出新圖。
  - 把結果放進「本回合結果 map」`Map<nodeId, string>` 供下游取用。
- 最終：`output` 節點的上游結果 = 整條鏈的輸出 → 回傳。

### 2-2. 快取（Graph Caching，省 API 錢）
- 每個節點算一個 **hash = SHA-256(上游輸入圖的簽名 + 本節點 kind + params)**。
  - 「上游輸入圖的簽名」用上游的 hash（鏈式），避免對整張 base64 算 hash 太慢；input 節點的簽名可用 src 長度+前綴的輕量指紋，或首次對 src 算一次 hash 後快取。
- 記憶體快取 `Map<hash, resultSrc>`：hash 命中 → 直接用快取，**跳過該節點的 pipeline 呼叫**。
- 效果：只改了 Output 前一個節點的 prompt，前面的去背不重跑。
- 快取存活範圍：**同一次子空間開啟期間**（記憶體）；關閉子空間即釋放。不持久化。

### 2-3. 狀態回報
- 執行器透過 callback 回報每個節點的狀態：`idle | running | done | error`（+ 錯誤訊息）。
- 存進 nodeGraphStore（新增 `nodeStatus: Record<nodeId, Status>` 或塞進 node.data.runtime，**但 runtime 狀態不進 exportGraph 存檔**）。

## 3. UI 接線（本輪最小必要，完整美化留給之後的 UI 打磨輪）
- **執行按鈕**：子空間工具列加「▶ 執行」。點了呼叫執行器，跑完把最終圖寫回 Output 節點 `data.src` + 更新 `NodeGroupElement.outputSrc`（大畫布方框顯示成果）。
- **節點狀態視覺（最小版）**：running 時節點邊框變色 / 顯示小 spinner；error 顯示紅框 + tooltip。**精緻的進度條/發光效果留給 UI 打磨輪**，本輪只求看得出「在跑/成功/失敗」。
- API key 缺失：沿用現有 `showToast` 提示（比照 useAI 的 key 檢查）。

## 4. 需要你拍板的設計決策（實作前）
1. **執行器放哪**：`src/components/NodeWorkflow/executor/nodeGraphExecutor.ts`（跟節點放一起）vs `src/ai/nodeGraphExecutor.ts`（跟 AI pipeline 放一起）。我傾向前者（它是節點專屬邏輯）。
2. **快取要不要做進 MVP**：做進去（省 API，但多一層複雜度）vs 先不做、每次全跑（簡單，但改一個字全部重跑燒 API）。我傾向**階段 A 先不做快取**、階段 B 再加。
3. **階段 A 先接哪個節點**：本機去背（免 key、最好測）vs 直接上生圖（要 key、但更有感）。我傾向**先本機去背**把骨架跑通。

## 5. 執行順序（實作時）
1. 執行器骨架（拓撲 + 序列執行 + 結果 map）+ 接本機去背 → lint
2. 執行按鈕 + 狀態回報 + 回貼 Output/大畫布 → lint → **實測階段 A：Input→RemoveBg→Output 跑通**
3. 接 imageGen / style（階段 B）→ lint → 實測
4. （決策 2 若要）加快取 → lint
5. `npm run build` + 端到端實測（preview 記得 resize desktop）
6. 產出 `docs/node-workflow-lean-report3.md`

## 6. Claude 複查/自查清單
- [ ] 執行器是純 TS、重用既有 pipeline，沒重寫 AI 邏輯
- [ ] 中間結果只在記憶體，沒寫進 graph JSON / 存檔（#1 的雷沒踩）
- [ ] 最終 outputSrc 有回貼大畫布方框且能持久化
- [ ] 環路偵測、缺 key、pipeline 失敗都有處理，不會整個 crash
- [ ] runtime 狀態不進 exportGraph
- [ ] lint + build 過；desktop 下 console 無錯誤
- [ ] 未 commit / 未 push
