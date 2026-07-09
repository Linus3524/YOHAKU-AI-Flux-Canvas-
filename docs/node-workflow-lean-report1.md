# Node Workflow Lean Report 1

日期：2026-07-09

## 目前完成度

目前節點工作流約為 35-40% 可用度。

已可用：
- 大畫布可建立 `node_group` 方框。
- 可雙擊進入全螢幕節點子空間。
- 節點位置、連線與 graph 拓撲可保存回 `NodeGroupElement.graph`。
- 目前工作區已具備 input / removeBg / imageGen / style / output 節點雛形，以及執行器雛形。
- 去背鏈路已有結果回寫到 `NodeGroupElement.outputSrc` 的路徑。
- 本次補上「匯入畫布」按鈕，可把已有 `outputSrc` 明確新增回大畫布圖片元素。

仍不完整：
- 還不是完整節點工作流產品；多分支、錯誤恢復、節點結果持久化、執行快取與批次流程仍不足。
- 節點中間結果目前仍應視為 runtime-only。#3 繼續做時，中間結果不可直接塞入 `graph` JSON，需另走 IDB payload。
- 「拖曳離鏈」已有雛形，但落點仍簡化為畫布中央，還不是精準拖回游標位置。

## 本次新增/修改重點

- `src/types.ts`
  - 擴充 `CanvasElement` union，加入 `NodeGroupElement`。
  - `ElementType` 加入 `node_group`。

- `src/components/NodeWorkflow/types.ts`
  - 定義 `NodeGraphData`、`GraphNode`、`GraphEdge`。
  - 保留 `output` kind 以相容舊 graph / output 節點。

- `src/store/nodeGraphStore.ts`
  - 管理目前開啟的節點圖拓撲與 runtime 狀態。

- `src/App.tsx`
  - 新增 `activeNodeGroupId` focus-mode。
  - 新增右鍵建立節點工作流。
  - 新增 node workflow output 回寫。
  - 新增「匯入畫布」流程：把 `NodeGroupElement.outputSrc` 新增成大畫布 image。

- `src/components/NodeWorkflow/NodeWorkflowOverlay.tsx`
  - 全螢幕子空間 overlay。
  - 右上角新增「匯入畫布」按鈕；沒有 output 時 disabled。

- `src/components/NodeWorkflow/NodeWorkflowCanvas.tsx`
  - React Flow 畫布殼。
  - 移除 MiniMap / Controls，減少框中框。
  - 限制 `maxZoom={1}`，避免 fitView 把節點放成巨框。
  - 工具列改成較輕量的 pill。

- `src/components/NodeWorkflow/nodes/OutputNode.tsx`
  - 新增輕量 output 節點，避免舊 graph 掉回 React Flow 內建肥厚 output 節點。

- `src/components/NodeWorkflow/nodes/*`
  - 縮薄節點卡片、去掉多餘分隔線與內框，降低框中框感。

## Types / Switch 補齊

- `useCanvas.addElement` 支援 `node_group` 命名。
- `useCanvas` 複製分支支援 `node_group`。
- `TransformableElement` 支援 `node_group` 方框渲染與雙擊進入。
- `LayerPanel` 支援 `node_group` 圖示與顏色。

## 自測結果

已執行：
- `npm run lint`：通過。
- `npm run build`：通過。
- dev server：`http://127.0.0.1:5175/` 可開啟。
- 貼入測試圖片後，右鍵圖片可建立節點工作流。
- 大畫布出現 `node_group` 方框，圖層面板顯示 Node Workflow。
- 雙擊 `node_group` 可進入子空間。
- 子空間顯示 input / output 節點。
- React Flow MiniMap / Controls 已移除。
- 「匯入畫布」按鈕存在；在沒有 output 時為 disabled。

未完整實測：
- 本次沒有重新跑完整本機去背模型端到端，因模型下載/本機 ONNX 狀態依環境而定。
- 未實測有 output 後點擊「匯入畫布」的完整視覺結果；程式路徑已補，會從 `NodeGroupElement.outputSrc` 新增 image 到 node group 旁。

## Build 備註

`npm run build` 通過，但 Vite 仍輸出既有警告：
- `onnxruntime-web` eval warning。
- 部分 dynamic import / static import 混用警告。
- 大 chunk size warning。

## 未 commit / 未 push

本次未 commit，未 push。
