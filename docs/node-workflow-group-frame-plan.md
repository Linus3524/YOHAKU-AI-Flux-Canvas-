# 節點工作流 — 節點框組 (Group Frame) 實作企劃書（交付 Codex / Claude 複查）

> 來源：節點工作流優化企劃書「階段三 P2」的 3.2 節點框組。P0（對齊/小地圖/連線驗證/具名 Handle）、P1（流動動畫/計時/雙擊搜尋）、P2 的 Undo/Redo + 複製貼上皆已完成。**本份只做「節點框組」這一項。**
> 採**方案 B：視覺框 + 幾何判定**（不走 React Flow parentId 巢狀，風險低很多）。
> 執行者：Codex (GPT)。完成後 Claude 複查。

---

## 0. 硬性護欄（切勿違反）
1. **不破壞 measured 尺寸同步**：React Flow 自管 `nodes`/`edges`（`useNodesState`/`useEdgesState`），store 只做鏡像（`syncGraph`）。不要改成從 store 重建 nodes。
2. **中間執行結果只存 runtime 的 `nodeResults`/`nodeBatchResults`**，**切勿寫入 `exportGraph()`**。group 節點本身沒有執行結果。
3. **不破壞現有 15 個節點功能**：group 是**新增**一種節點，純加法，不得改動既有節點的行為。
4. 正本一律在 `src/` 底下；`@` alias 指專案根目錄，新檔用相對路徑 import。
5. 每步 `npm run lint`（`tsc --noEmit`）零錯誤才繼續；不 commit / 不 push。

## 1. 現況關鍵檔案（動手前先讀）
- `src/components/NodeWorkflow/types.ts`：`NodeKind` 型別 union、各節點 params 型別。
- `src/components/NodeWorkflow/nodeRegistry.tsx`：`NODE_REGISTRY`（每個 kind 的 `component/label/addable/category/needsUpstream/input/output`）、`nodeTypes`、`ADDABLE_NODES`、`nodeRequiresUpstream`。`NodeIoType = 'none'|'image'|'text'|'imageOrText'|'imageBatch'`。
- `src/components/NodeWorkflow/NodeWorkflowCanvas.tsx`：`<ReactFlow>` 主體、`toFlowNode/toGraphNode`、`addNode`、`isValidConnection`、`handleNodeDragStart/Stop`、`onNodesChange`。
- `src/components/NodeWorkflow/executor/nodeGraphExecutor.ts`：`executeGraph`、`topoSort`、`terminalNodeIds`、`nodeRunners[node.kind]`、`nodeRequiresUpstream(node.kind)` 檢查（第 906 行附近）。
- `src/store/nodeGraphStore.ts`：runtime 狀態槽。

## 2. 設計（方案 B）
一個半透明有色矩形「框」，是一種 `kind: 'group'` 的節點：
- 有可編輯**名稱**與**底色**，可**縮放**（React Flow 內建 `<NodeResizer>`）。
- **不參與運算**：沒有 Handle、不可連線、執行器完全略過。
- **渲染在其他節點下層**（zIndex 低），框體 `pointer-events` 不擋上層節點的操作（只有標題列/縮放把手可互動）。
- **群組移動**：拖動框時，把「中心落在框範圍內」的其他節點以相同位移一起移動（拖曳開始時鎖定成員，過程套用 delta）。

## 3. 任務拆解（依序，每步 lint）

### 3-1. 型別與 registry
- `types.ts`：`NodeKind` 加 `'group'`；新增 `GroupParams { label?: string; color?: string; width?: number; height?: number }`。
- `nodeRegistry.tsx`：加 `group` entry —— `addable: true`、`category`（建議新增一類 `'layout'` 或歸到既有分類；若加新 category 記得補 `NODE_CATEGORY_ORDER`/`NODE_CATEGORY_LABELS`）、`needsUpstream: false`、`input: 'none'`、`output: 'none'`。
- lint：NodeKind 擴充會讓 `satisfies Record<NodeKind, ...>`、`toFlowNode/toGraphNode`、executor 的 `nodeRunners` 對照噴錯，逐一補齊（見 3-3、3-4）。

### 3-2. GroupNode 元件（`src/components/NodeWorkflow/nodes/GroupNode.tsx`）
- 半透明有色矩形，左上角**名稱**（雙擊可編輯，寫回 `data.params.label`）、一個底色選擇（幾個預設色）。
- 用 `<NodeResizer minWidth={160} minHeight={120}>`（from `@xyflow/react`）支援縮放，尺寸寫回 `data.params.width/height`。
- **不要放任何 `<Handle>`**（不可連線）。
- 外層容器 `pointer-events: none`，只有標題列 / resize 把手 `pointer-events: auto`，避免擋住疊在框上面的節點。
- 比照其他節點掛 `NodeDeleteButton`（可刪除）。**不要**放 `NodeResultPreview`（它沒有結果）。

### 3-3. Canvas 整合（`NodeWorkflowCanvas.tsx`）
- **zIndex 下層**：`toFlowNode` 對 `group` 給低 zIndex（或在渲染時設 group 節點 `zIndex: -1`），確保框在其他節點下方。
- **加節點不自動連線**：`addNode` 目前會在有選中節點時自動連一條 edge。group 的 `input/output` 皆 `none`，**加 group 時不可自動連線**（判斷 `NODE_REGISTRY[kind].output === 'none'` 或 `kind === 'group'` 就跳過連線）。
- **群組移動**：
  - `handleNodeDragStart`：若拖的是 group，計算「中心落在該框 bounding box 內」的其他非 group 節點，記錄成員 id 與各自起始位置（存 ref）。
  - `onNodeDrag`（拖曳過程）：若拖的是 group，對成員套用與 group 相同的位移（用 React Flow 提供的 drag 事件 position 差值）。
  - `handleNodeDragStop`：清除成員暫存。
  - 注意：成員移動要透過 `setNodes` 更新位置，**不要**繞過 React Flow 狀態。
- `isValidConnection`：現有邏輯已用 `ioCompatible`，group 的 I/O 是 `none` → 已會被擋（`none` 目標拒絕、`none` 來源對任何目標不相容）。**確認**加了 group 後這行為正確、不需額外改。

### 3-4. 執行器整合（`nodeGraphExecutor.ts`）
- **group 完全略過**：在 `executeGraph` 的主迴圈中，遇到 `node.kind === 'group'` 直接 `continue`（不設 status、不進 `nodeRunners`）。
- 確認 `topoSort` / `terminalNodeIds` 不會因為 group（無 edge）而誤判最終輸出。group 沒有連線，理論上是孤立節點；確保它**不會**被當成 terminal 而污染 `outputSrc`（可在 terminal 收集時排除 `kind === 'group'`）。
- `nodeRunners` 不需要 group 的 runner（因為前面已 `continue`）；若型別要求補齊，給一個 throw「group 不執行」的佔位並確保永遠走不到。

### 3-5. 持久化
- group 節點透過既有 `toGraphNode` → `syncGraph`/`exportGraph` 正常存回 `NodeGroupElement.graph`（它就是普通節點，帶 position + params）。**確認** `data.params` 的 label/color/width/height 有被 `toGraphNode` 保留（現有 toGraphNode 會保留 `...restData` 與 label，params 在 data 內應自動帶上）。

## 4. 自測（寫進報告）
1. 從工具列加一個「框組」節點 → 出現半透明框、可改名、可改色、可縮放。
2. 把框移到覆蓋「去背 + 放大」兩個節點上 → 拖動框 → 兩個節點**跟著一起移動**；拖動框外的節點不受影響。
3. 框**不可連線**（拉線拉不到它、它也拉不出線）。
4. 按執行 → 框**不被當節點執行**（不轉圈、不報錯、不產生結果），其餘節點正常執行、最終輸出正確。
5. 疊在框上面的節點**仍可正常點選/改參數**（框沒擋住互動）。
6. 關閉子空間 → 重新進入 → 框（名稱/色/大小/位置）**還在**。
7. `npm run lint` + `npm run build` 全過；desktop 下 console 無錯誤（preview 若在 offscreen 分頁量到 0 高度導致節點不顯示，先 resize desktop 再測）。
8. 產出 `docs/node-workflow-group-frame-report.md`。

## 5. Claude 複查清單
- [ ] group 純加法，15 個既有節點功能一行未改
- [ ] 執行器確實略過 group（不執行、不污染 outputSrc）
- [ ] group 不可連線、不自動連線
- [ ] 群組移動透過 setNodes（沒繞過 React Flow 狀態 / 沒破壞 measured 同步）
- [ ] 框體 pointer-events 不擋上層節點互動
- [ ] group 存回 graph 且不夾帶任何執行結果（護欄二）
- [ ] `@` alias 無誤用；lint + build 全過；未 commit / 未 push
