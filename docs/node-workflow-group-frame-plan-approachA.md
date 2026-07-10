# 節點工作流 — 節點框組 (Group Frame) 實作企劃書【方案 A：React Flow 原生 parentId】

> 這是節點框組的**方案 A**（正統巢狀，對標 ComfyUI/Figma 群組）。與 `docs/node-workflow-group-frame-plan.md`（方案 B：視覺框 + 幾何判定）**二選一**，不要同時做。
> 方案 A 更嚴謹（框內成員關係是真的父子綁定），但**侵入性與風險高於 B**：座標系從絕對變相對、要處理重新掛載(reparenting)與節點陣列排序，較容易動到 measured 同步。**若求穩、快速上線，選 B；若要正統巢狀分組，選 A。**
> 執行者：Codex (GPT)。完成後 Claude 複查。

---

## 0. 硬性護欄（切勿違反）
1. **不破壞 measured 尺寸同步**：React Flow 自管 `nodes`/`edges`，store 只鏡像（`syncGraph`）。方案 A 特別容易踩這條——reparenting 改 `position`/`parentId` 時務必透過 `setNodes`，且保留節點的 `measured`。
2. **中間執行結果只存 runtime 的 `nodeResults`/`nodeBatchResults`**，切勿寫入 `exportGraph()`。
3. **不破壞現有 15 個節點功能**：group 是新增節點；但方案 A 會讓「子節點位置變相對」，務必確認既有節點在**沒有 parent 時行為完全不變**（parentId 為空 → 位置仍是絕對）。
4. 正本在 `src/`；`@` alias 指專案根目錄；每步 `npm run lint` 零錯誤；不 commit / 不 push。

## 1. 方案 A 與 B 的差異（先懂再動）
| 面向 | 方案 B（視覺框） | 方案 A（parentId 巢狀） |
| :-- | :-- | :-- |
| 成員關係 | 拖曳當下幾何判定 | 真父子綁定（`parentId`） |
| 子節點座標 | 維持絕對座標 | **變成相對父框的座標** |
| 群組移動 | 自己算 delta 套用 | **React Flow 內建自動帶動子節點** |
| 進出框 | 無狀態 | 需 **reparenting**（設/解 parentId + 座標換算） |
| 節點陣列 | 無限制 | **父節點必須排在子節點之前** |
| 風險 | 低 | 中高（座標系 + 排序 + measured） |

## 2. React Flow v12 關鍵機制（實作依據）
- 節點設 `parentId` 後，其 `position` 是**相對父節點**的座標；React Flow 會自動把子節點畫在父節點內、父節點移動時子節點跟著動。
- 可選 `extent: 'parent'` 把子節點限制在父框內（建議先不加，避免拖曳體驗受限）。
- **陣列排序限制**：帶 `parentId` 的子節點，在 `nodes` 陣列中**必須排在其父節點之後**，否則 React Flow 會警告/渲染異常。
- group 用 `<NodeResizer>` 縮放；框身 `pointer-events` 需讓子節點可互動。

## 3. 現況關鍵檔案（動手前先讀）
同方案 B：`types.ts`、`nodeRegistry.tsx`、`NodeWorkflowCanvas.tsx`（`toFlowNode/toGraphNode`、`addNode`、`isValidConnection`、`handleNodeDragStart/Stop`、底部拖出區 `handleNodeDragStop`）、`executor/nodeGraphExecutor.ts`、`store/nodeGraphStore.ts`。

## 4. 任務拆解（依序，每步 lint）

### 4-1. 型別與 registry
- `types.ts`：`NodeKind` 加 `'group'`；`GroupParams { label?; color?; width?; height? }`。
- **`GraphNode` 加 `parentId?: string`**（持久化要存父子關係）。
- `nodeRegistry.tsx`：加 `group` entry（`addable: true`、`needsUpstream: false`、`input: 'none'`、`output: 'none'`、category 建議新增 `'layout'` 並補 `NODE_CATEGORY_ORDER/LABELS`）。

### 4-2. GroupNode 元件（`src/components/NodeWorkflow/nodes/GroupNode.tsx`）
- 半透明有色框、可改名（雙擊寫回 `data.params.label`）、可改色、`<NodeResizer>` 縮放（尺寸寫回 params）。
- **不放 `<Handle>`**（不可連線）；框身 `pointer-events` 不擋子節點；掛 `NodeDeleteButton`，不放 `NodeResultPreview`。

### 4-3. toFlowNode / toGraphNode 帶 parentId
- `toFlowNode`：把 `node.parentId` 帶到 React Flow node 的 `parentId`；group 給低 zIndex（在子節點下層）。
- `toGraphNode`：把 `parentId` 寫回 `GraphNode`。
- **陣列排序**：`nodes.map(toFlowNode)` 之後，確保**父節點排在子節點之前**（加一個 stable 排序：group 節點優先、或依 parentId 拓撲排序）。載入 (`toFlowNode` 初始化) 與每次 setNodes 後都要維持此不變式。

### 4-4. Reparenting（進出框）
- `handleNodeDragStop`（非 group 節點）：判斷放開位置是否落在某個 group 框內。
  - 落在框內且原本不屬於它 → 設 `parentId = groupId`，並把 `position` 由**絕對**換算成**相對該框**（減去框的絕對位置）。
  - 拖出原框到框外 → 清 `parentId`，`position` 由相對換回絕對。
  - 用 React Flow 的座標（`node.position` 對子節點是相對、`node.positionAbsolute`/量測輔助可取絕對；v12 可用 internals 或自行以父框位置換算）。
- 維持 4-3 的陣列排序不變式。

### 4-5. 與既有「底部拖出區」的相容（重要）
- 現有 `handleNodeDragStop` 有「拖到畫面底部 → 移出到大畫布」邏輯，讀 `node.data.src` / `nodeResults`。
- 若被拖的是**子節點**，其 `position` 是相對座標——確認底部拖出判定用的是**螢幕座標 `event.clientY`**（現有實作就是），不受相對座標影響即可；但送出的圖 src 不變。**確認這段沒被 reparenting 破壞。**

### 4-6. addNode 不自動連線 group
- 同方案 B：加 group 時（`output === 'none'`）**不自動連線**。

### 4-7. 執行器整合
- 同方案 B：`executeGraph` 主迴圈遇 `kind === 'group'` 直接 `continue`；terminal 收集排除 group；`nodeRunners` 不需 group runner。
- **parentId 不影響執行**：執行只看 edges/kind，不看 position/parentId。確認 topoSort 只依 edges，不受 parentId 影響。

### 4-8. 持久化
- `GraphNode.parentId` 透過 `toGraphNode` → `syncGraph`/`exportGraph` 存回。重開時 `toFlowNode` 還原 parentId + 維持陣列排序 → 父子關係與框內容還原。**不得夾帶執行結果。**

## 5. 自測（寫進報告）
1. 加框組 → 改名/改色/縮放正常。
2. 把「去背」節點拖進框 → 放開後它成為框的子節點；拖動框 → 子節點**自動跟著移動**（React Flow 內建）。
3. 把子節點拖出框 → 解除父子；再拖動框，它**不再跟著移動**。
4. 框不可連線、加框不自動連線。
5. 按執行 → 框不被執行、不污染輸出；框內外節點執行結果正確。
6. 子節點疊在框上仍可點選/改參數。
7. **底部拖出區**：把框內子節點拖到畫面底部 → 仍能移出成大畫布圖片（沒被相對座標破壞）。
8. 關閉子空間 → 重新進入 → 框 + 父子關係 + 位置**還原正確**（重點驗證陣列排序不變式）。
9. `npm run lint` + `npm run build` 全過；desktop 下 console 無 React Flow 警告（特別注意「parent node must be before child」這類排序警告）。
10. 產出 `docs/node-workflow-group-frame-report.md`。

## 6. Claude 複查清單
- [ ] 沒有 parent 的既有節點行為完全不變（位置仍絕對）
- [ ] 父節點在 `nodes` 陣列恆排在子節點之前（無 RF 排序警告）
- [ ] reparenting 的絕對↔相對座標換算正確（拖進拖出位置不跳動）
- [ ] 底部拖出區對子節點仍正常運作
- [ ] 執行器略過 group、topoSort 不受 parentId 影響、不污染 outputSrc
- [ ] parentId 存回 graph 且無執行結果夾帶（護欄二）
- [ ] measured 同步未被破壞（reparenting 走 setNodes、保留 measured）
- [ ] lint + build 全過；未 commit / 未 push
