# 節點工作流 精簡路線 #1 — 子空間 UI 殼 + 資料模型（交付 Codex / Claude 複查）

> 精簡路線目標：不做影片,先把「能用的節點工作流」做出來（#1 UI 殼 → #2 節點 → #3 執行引擎）。
> **本份 #1 只做**：`NodeGroupElement` 型別 + 右鍵「建立節點工作流」+ 雙擊進子空間的全螢幕 Overlay + React Flow 空畫布殼。
> **本份不做**：自訂節點型別（#2）、拖曳離鏈（#2）、執行引擎/快取（#3）、影片（之後增量）。
> 這是綠地功能 + 引入新 UI 庫,比純搬遷謹慎,每步要能自測。
> 執行者：Codex (GPT)。完成後 Claude 複查。日期：2026-07-09

---

## 0. 硬性規則

1. 正本一律在 `src/` 底下,**嚴禁根目錄新增檔案**。
2. **`@` alias 指向專案根目錄不是 `src/`**,新檔一律相對路徑 import。
3. 每完成一步跑 `npm run lint`（`tsc --noEmit`）,零錯誤才繼續。
4. **不要 commit、不要 push**。
5. `AGENTS.md` 已存在,動手前先讀。
6. 擴充 `CanvasElement` union 後,靠 `npm run lint` 抓出所有缺 `node_group` case 的 switch,一個都不能漏；node_group 在大畫布上先渲染成一個占位方框即可。

## 1. 已確認的架構落點（照現有 pattern 接,不要另起爐灶）

- **進子空間 = 沿用現有 focus-mode 模式**：App.tsx 現在用 `editingImage`/`editingDrawing` state 觸發 `isFocusMode`（[App.tsx:562](../src/App.tsx)）→ 渲染全螢幕編輯 overlay（ImageEditModal）。**節點子空間套同一套**：新增 `activeNodeGroupId` state,非 null 時渲染 `NodeWorkflowOverlay`,並比照 `isFocusMode` 一起納入（進節點空間時大畫布同樣進入 focus 狀態、暫停互動）。
- **右鍵選單 = `actions` 物件加 callback**：ContextMenu 的 props 是一包 `actions: { startImageEdit, startOutpainting, ... }`（[ContextMenu.tsx:18](../src/components/ContextMenu.tsx)）。新增一個 `createNodeWorkflow: (elementId: string) => void`,照 `startImageEdit` 的模式接線。
- **大畫布渲染分派**：`TransformableElement.tsx` 用 `element.type === 'x'` 條件式分派（不是 switch）。加 node_group 分支,**比照現有寫法,不動其他分支**。
- **addElement union**：`useCanvas.ts:305` 是手寫 `Omit<A,...> | Omit<B,...>`,加上 `NodeGroupElement` 那一項。

## 2. 依賴

```bash
npm i @xyflow/react zustand
```
- `@xyflow/react` = React Flow v12（支援 React 19,不要裝舊套件名 `reactflow`）。
- `zustand` = 節點圖狀態機,獨立於全域 canvas 狀態（spec 明示）。

## 3. 任務拆解（依序,每步 lint）

### 3-1. `src/types.ts` 擴充
- `ElementType`（第 7 行）加 `'node_group'`。
- 新增 `NodeGroupElement extends BaseElement`：
  ```ts
  export interface NodeGroupElement extends BaseElement {
    type: 'node_group';
    graph: NodeGraphData;      // 節點圖拓撲（型別見 3-2,從 NodeWorkflow/types import）
    outputSrc?: string;        // 節點鏈最終輸出（#3 才會寫入；#1 先 undefined）
    seedElementId?: string;    // 由哪個原始元素轉來的（來源追溯用）
  }
  ```
- 加進 `CanvasElement` union（第 135 行）→ lint → 逐一補所有噴錯的 switch/分支的 node_group case。

### 3-2. `src/components/NodeWorkflow/types.ts`（新檔）— 節點圖資料結構
- 定義純資料型別（不含執行邏輯,執行是 #3）：
  ```ts
  export type NodeKind = 'input' | 'output';   // #1 先只有這兩種；#2 再擴充 removeBg/imageGen/style
  export interface GraphNode {
    id: string;
    kind: NodeKind;
    position: { x: number; y: number };   // React Flow 座標
    data: {
      label?: string;
      src?: string;        // input 節點承載來源圖 base64/URL
      params?: Record<string, unknown>;
    };
  }
  export interface GraphEdge { id: string; source: string; target: string; }
  export interface NodeGraphData { nodes: GraphNode[]; edges: GraphEdge[]; }
  ```
- **注意持久化風險**：`GraphNode.data.src` 若是大 base64,會隨 NodeGroupElement 的 `graph` 灌進存檔 meta JSON、繞過現有 payload 抽取。**本份 #1 先不處理節點中間結果的持久化**（#1 的 input 節點 src 就是來源圖,量體與原圖同級,可接受）；但在 report 裡明確標註「#3 實作執行引擎時,節點產出的中間結果不可存進 graph JSON,要另走 IDB payload」。

### 3-3. `src/store/nodeGraphStore.ts`（新檔,Zustand）
- 管理**當前開啟的**節點圖狀態（不是全部 NodeGroup 的,只有正在編輯的那一個）：
  - state：`nodes`, `edges`
  - actions：`loadGraph(data)`, `addNode`, `updateNodePosition`, `connectEdge`, `removeNode`, `exportGraph(): NodeGraphData`
- 開 Overlay 時 `loadGraph(nodeGroup.graph)`,關閉時把 `exportGraph()` 寫回該 NodeGroupElement 的 `graph`（透過 useCanvas 的 updateElement）。
- 完整型別,禁 `any`。

### 3-4. `createNodeWorkflow` 行為（右鍵建立）
- 在 App.tsx 實作 `handleCreateNodeWorkflow(elementId)`：
  - 找到來源元素（image 或 note）。
  - 新增一個 `NodeGroupElement`（放在來源元素位置附近或原地覆蓋,依 spec「該物件轉化為群組方框」→ 可先做成**新增一個 node_group 方框、來源元素的內容成為 graph 裡的 input 節點**；來源元素是否刪除先保留、標 TODO,不強求）。
  - graph 初始：一個 `input` 節點（承載來源圖/文字）+ 一個空的 `output` 節點。
- ContextMenu 對 image/note 顯示「建立節點工作流」選項,接到這個 handler。

### 3-5. `NodeWorkflowOverlay.tsx` + `NodeWorkflowCanvas.tsx`（新檔）
- `NodeWorkflowOverlay.tsx`：全螢幕 overlay,`animate-fade-in`（專案已有此動畫）淡入,右上角關閉鈕（關閉 = 寫回 graph + `setActiveNodeGroupId(null)`）。比照 ImageEditModal 的 fixed inset-0 殼。
- `NodeWorkflowCanvas.tsx`：掛 `<ReactFlow>`（from `@xyflow/react`,記得 import 它的 CSS `@xyflow/react/dist/style.css`）,節點/連線綁到 nodeGraphStore,支援拖曳節點、拉線。**節點外觀 #1 先用 React Flow 預設樣式即可**（YOHAKU 磨砂玻璃風格留 #2）。
- App.tsx 在 focus-mode 區塊渲染：`{activeNodeGroupId && <NodeWorkflowOverlay .../>}`。

### 3-6. 大畫布上的 node_group 方框 + 雙擊進入
- `TransformableElement.tsx` 加 `element.type === 'node_group'` 分支：渲染一個方框,顯示 `outputSrc`（有的話）或占位標籤「節點工作流」+ 節點數。
- 雙擊該方框 → `setActiveNodeGroupId(element.id)` 進子空間。找現有雙擊落點（grep `onDoubleClick`/`dblclick`,image 雙擊開編輯的那條）比照接線。

## 4. 執行順序與自測

1. 3-1 types → lint（補完所有 node_group switch case）
2. 3-2 graph types → lint
3. 3-3 zustand store → lint
4. 依賴 `npm i @xyflow/react zustand`
5. 3-4 createNodeWorkflow + ContextMenu → lint
6. 3-5 Overlay + Canvas → lint
7. 3-6 大畫布方框 + 雙擊 → lint
8. `npm run build`
9. **自測（寫進報告）**：dev server → 對一張圖右鍵「建立節點工作流」→ 畫布出現 node_group 方框 → 雙擊 → 全螢幕子空間淡入,看到 input/output 節點 → 拖動節點、拉一條連線 → 關閉 → 重新雙擊進入,**確認剛才的節點位置/連線還在**（證明 graph 有寫回 + 持久化）。
10. 產出 `docs/node-workflow-lean-report1.md`：新增/修改檔清單、types 補了哪些 switch、自測結果、標註「節點中間結果持久化留給 #3」、其他未完成或有疑慮處。

## 5. Claude 複查清單

- [ ] `CanvasElement` union 擴充後所有 switch/持久化分支補齊 node_group,無 `as any` 逃逸
- [ ] 進子空間確實沿用 focus-mode pattern,沒有另造一套互動狀態；大畫布在子空間開啟時正確暫停互動
- [ ] 關閉子空間有把 graph 寫回 NodeGroupElement,重進節點位置/連線保留（自測第 9 步）
- [ ] React Flow CSS 有正確 import（否則畫布會壞掉但 lint 不會抓到）
- [ ] 現有 image/note/其他元素的渲染與右鍵行為一行未受影響
- [ ] 沒有提前做 #2/#3 的東西（自訂節點型別、離鏈、執行引擎都不該出現）
- [ ] `@` alias 無誤用；根目錄無新檔；`npm run lint` + `build` 全過；dev server 無 console 錯誤
- [ ] 未 commit / 未 push
