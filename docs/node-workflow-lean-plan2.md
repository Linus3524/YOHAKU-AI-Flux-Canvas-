# 節點工作流 精簡路線 #2 — 處理節點 + 節點面板 + 拖曳離鏈（交付 Codex / Claude 複查）

> 前情：#1 已完成並 commit（`b568a9b`）：可右鍵建立節點工作流、雙擊進子空間、Input/Output 節點顯示來源內容。
> **本份 #2 做**：新增「處理節點」型別（去背 / 生圖 / 風格）+ 各自的參數設定 UI + 在子空間新增節點的面板 + 拖曳離鏈（把節點拖出變回大畫布元素）。
> **本份不做**：**節點執行**（按「執行」會跑 → 是 #3 的執行引擎）、可折疊 Batch 大節點（複雜,延後）、影片。
> 也就是說 #2 完成後,使用者能**視覺化設計整條 pipeline 並設定每個節點**,但節點還不會真的運算 —— 那是 #3。
> 執行者：Codex (GPT)。完成後 Claude 複查。日期：2026-07-09

---

## 0. 硬性規則

1. 正本一律在 `src/` 底下,**嚴禁根目錄新增檔案**。
2. **`@` alias 指向專案根目錄不是 `src/`**,新檔一律相對路徑 import。
3. 每完成一個節點型別/步驟跑 `npm run lint`,零錯誤才繼續。
4. **不要 commit、不要 push**。`AGENTS.md` 先讀。
5. **不要動執行邏輯**：本輪節點只是「可設定的配置框」,絕對不要接 `src/ai/pipelines/*` 去真的跑運算（那是 #3）。節點型別可以先記錄「將來要呼叫哪個 pipeline」但不呼叫。

## 1. 沿用 #1 的既有架構（別另起爐灶）

- **自訂節點模式**：#1 已建 `src/components/NodeWorkflow/nodes/InputNode.tsx` / `OutputNode.tsx`,並在 `NodeWorkflowCanvas.tsx` 用 module-level `const nodeTypes = { input, output }` 註冊、`toFlowNode` 用 `type: node.kind` 對應。**新節點比照同一套**：加檔案 → 加進 `nodeTypes` → NodeKind 加值即可。
- **狀態**：#1 已改用 React Flow 的 `useNodesState`/`useEdgesState` 當即時狀態,並用 `useEffect` 鏡像回 `nodeGraphStore`（關閉時 `exportGraph()` 存回 NodeGroupElement）。**新增節點也走這套 store**,不要另建狀態。
- **容器**：#1 已修 `absolute inset-0` 容器高度,別改回 `h-full`。

## 2. 任務拆解（依序,每步 lint）

### 2-1. 擴充 NodeKind 與節點參數型別（`src/components/NodeWorkflow/types.ts`）
- `NodeKind` 從 `'input' | 'output'` 擴充為
  `'input' | 'output' | 'removeBg' | 'imageGen' | 'style'`。
- `GraphNode.data.params` 已是 `Record<string, unknown>`,足以承載各節點設定（不用改結構）。但**在型別註解上補清楚每種節點用到的 params 欄位**（用 JSDoc 或獨立的 params 型別),例如：
  - `imageGen`：`{ prompt: string; model: string; aspectRatio?: string }`
  - `style`：`{ styleKey: string }`（對應現有風格預設）
  - `removeBg`：`{ mode: 'local' | 'cloud' }`
- 補完 → lint（NodeKind 擴充會讓 `toFlowNode`/`toGraphNode` 等 exhaustive 判斷噴錯,逐一補齊）。

### 2-2. 三個處理節點元件（`src/components/NodeWorkflow/nodes/`）
每個都比照 InputNode 結構：白底圓角框 + 標題 + 內容區 + Handle（`target` 在左、`source` 在右）。內容區是**參數設定 UI**（本輪只做設定,不觸發運算）：
- `RemoveBgNode.tsx`：一個 local/cloud 的小切換。標題「去背」。
- `ImageGenNode.tsx`：一個 prompt 文字框 + model 下拉（選項可先用現有 `atlasImage.ts` 的模型清單或簡化列舉）。標題「生成圖片」。
- `StyleNode.tsx`：一個風格預設下拉（選項可先接 `src/skills/styles` 的清單,或先給幾個佔位）。標題「風格轉換」。
- 節點參數變更時,寫回該節點的 `data.params`（透過 React Flow 的 node data 更新 → 走 #1 既有的 store 鏡像）。**先確認 #1 是怎麼更新單一節點 data 的**（若沒有現成 helper,在 nodeGraphStore 加一個 `updateNodeData(id, params)` action,比照既有 `updateNodePosition`）。
- 三個都加進 `NodeWorkflowCanvas.tsx` 的 `nodeTypes`。

### 2-3. 節點面板（在子空間新增節點）
- 在 `NodeWorkflowOverlay` 或 Canvas 內加一個小面板（例如左上角一排按鈕：「+ 去背」「+ 生圖」「+ 風格」）。
- 點按鈕 → 在畫布中央附近 `addNode`（nodeGraphStore 已有 `addNode` action）一個對應 kind 的新節點,初始 params 給預設值。
- 用 React Flow 的 `useReactFlow().screenToFlowPosition` 或簡化為固定偏移放置,避免新節點都疊在同一點。

### 2-4. 拖曳離鏈（Detach）
- **目標**：把子空間裡「帶有圖片的節點」（本輪主要是 Input 節點,#3 後也含 Output/處理結果）拖出 Overlay 邊界 → 該圖片新增為大畫布上的獨立 `ImageElement`。
- **接線**：`NodeWorkflowOverlay` 新增 prop `onDetachImage: (src: string, name?: string) => void`；App 端把它接到現有的 `addElement`/`addImagesToCanvas`（App.tsx:168 已有 `addElement`）。
- **偵測**：在 `NodeWorkflowCanvas` 用 React Flow 的 `onNodeDragStop`。若放開時該節點的螢幕座標**落在 Overlay 畫布區域之外**（或落在一個明顯的「拖出區」),且該節點 `data.src` 有值 → 呼叫 `onDetachImage(src)`。
- **座標簡化（本輪允許）**：離鏈後的元素**放在大畫布視窗中央**即可（用 App 現有的 `getCenterOfViewport`,`addElement` 呼叫端已在用）。**不要求**精準還原到滑鼠放開的世界座標——精準落點是日後打磨,本輪別為它引入複雜的座標轉換。
- 離鏈後該節點是否從子空間移除,可先**保留**（標 TODO）,不強求同步刪除,避免動到 graph 一致性。

### 2-5. （可選,時間夠再做）節點刪除
- 若 React Flow 預設的節點刪除（選取 + Backspace）沒接上 store,補一下 `removeNode`（store 已有此 action）。做不順就跳過,寫進報告。

## 3. 明確不做（越界就是錯）
- **節點執行 / 按「執行」跑運算** → #3。本輪節點純設定,不接 pipeline。
- **可折疊 Batch 大節點**（一次 5–10 張的摺疊節點）→ 複雜度高,延後獨立一輪。
- **影片節點** → 之後增量。
- **精準離鏈落點座標轉換** → 打磨階段。

## 4. 執行順序與自測
1. 2-1 NodeKind + params 型別 → lint
2. 2-2 三個節點元件（一個一個做,各自 lint）
3. 2-3 節點面板 → lint
4. 2-4 離鏈 → lint
5. （可選）2-5 刪除 → lint
6. `npm run build`
7. **自測（寫進報告）**：進子空間 → 用面板加一個「生圖」節點 → 在它的 prompt 框打字 → 關閉再進來確認**節點與 prompt 內容還在**（走 store 鏇像 + 存回）→ 把 Input 圖片節點拖出 Overlay → 確認大畫布多了一張獨立圖片。
   - ⚠️ preview 若在 offscreen 分頁量到 0 高度導致 React Flow 節點不顯示,先 `preview_resize desktop` 再測（#1 踩過這個環境假象）。
8. 產出 `docs/node-workflow-lean-report2.md`：新增/修改檔、NodeKind 補了哪些分支、自測結果、跳過或有疑慮處。

## 5. Claude 複查清單
- [ ] 三個處理節點**只做設定 UI,沒有偷接 `src/ai/pipelines/*` 執行運算**（#3 的界線沒被越過）
- [ ] NodeKind 擴充後所有 switch/對應表補齊,無 `as any` 逃逸
- [ ] 新節點沿用 #1 的 `nodeTypes` 註冊 + store 鏡像,沒另造狀態；`useNodesState`/`absolute inset-0` 沒被改壞
- [ ] 節點參數變更有寫回 `data.params` 並能 round-trip（關閉再開還在）
- [ ] 離鏈確實呼叫 App 的 addElement、圖片出現在大畫布；沒為精準座標引入過度複雜轉換
- [ ] 沒做越界項（執行引擎、Batch 節點、影片）
- [ ] `@` alias 無誤用;根目錄無新檔;`npm run lint` + `build` 全過;dev server（resize desktop 後）無 console 錯誤
- [ ] 未 commit / 未 push
