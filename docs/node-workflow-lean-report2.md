# 節點工作流 精簡路線 #2 — 執行報告（Claude 親自實作）

日期：2026-07-09。執行者：Claude（非 Codex，因使用者有額度直接請 Claude 做）。未 commit / 未 push。

## 新增檔案
- `src/components/NodeWorkflow/nodes/ImageGenNode.tsx` — 生圖節點（prompt + model + ratio 設定）
- `src/components/NodeWorkflow/nodes/RemoveBgNode.tsx` — 去背節點（本機/雲端切換）
- `src/components/NodeWorkflow/nodes/StyleNode.tsx` — 風格節點（風格預設下拉）

## 修改檔案
- `src/components/NodeWorkflow/types.ts` — NodeKind 加 `removeBg|imageGen|style`；新增 RemoveBgParams/ImageGenParams/StyleParams 型別
- `src/store/nodeGraphStore.ts` — 新增 `updateNodeData(id, params)` action
- `src/components/NodeWorkflow/NodeWorkflowCanvas.tsx` — 註冊 3 個新 nodeTypes；`DEFAULT_LABEL` 表；節點面板（Panel，＋去背/＋生圖/＋風格）；離鏈（onNodeDragStop + 底部拖出區）
- `src/components/NodeWorkflow/NodeWorkflowOverlay.tsx` — 傳遞 `onDetachImage` prop
- `src/App.tsx` — `handleDetachNodeImage`（離鏈 → addElement 到畫布中央）+ 接到 Overlay

## 界線（本輪嚴守，未越界到 #3）
- 三個處理節點**只做設定 UI**，`data.params` 記錄設定但**完全沒有呼叫 `src/ai/pipelines/*` 執行運算**。按執行沒反應是正確的，執行引擎是 #3。
- 未做：可折疊 Batch 大節點、影片節點、精準離鏈落點座標（離鏈簡化為落在畫布中央）。

## 節點參數更新機制
沿用 #1 架構：節點用 React Flow v12 的 `useReactFlow().updateNodeData(id, {params})` 更新 → 進 React Flow 即時狀態（useNodesState）→ 由 #1 既有的 useEffect 鏡像回 nodeGraphStore → 關閉時 exportGraph() 存回 NodeGroupElement。

## 驗證（Claude 實測，preview desktop）
- `npm run lint`：EXIT 0 ✓
- `npm run build`：EXIT 0 ✓
- dev server 無 console 錯誤 ✓
- **端到端實測通過**：
  - 右鍵圖 → 建立 → 雙擊進子空間 ✓
  - 節點面板「＋去背/＋生圖/＋風格」都渲染 ✓
  - 點面板加節點 → 畫布出現對應節點（實測加到 4 個：input/output/imageGen/removeBg）✓
  - 生圖節點 prompt 打字「一隻貓咪」→ 內容保留 ✓
  - 去背節點本機/雲端切換鈕在 ✓
  - **Round-trip：關閉子空間 → 方框標籤更新為「4 nodes」→ 重新雙擊進入 → 4 節點都在、prompt「一隻貓咪」保留** ✓（驗證 store 鏡像 + 存回）

## 未能自動驗證（需人工確認一次）
- **拖曳離鏈**：邏輯與接線已完成並編譯通過（onNodeDragStop → 落點在底部 90px 拖出區 + 節點有 src → onDetachImage → App.addElement 到畫布中央）。但 React Flow 的 d3-drag 對合成 pointer 事件驅動不了，無法用程式模擬拖曳手勢。**請手動測**：進子空間 → 把 Input 圖片節點拖到畫面底部（會浮現藍色「拖到這裡 → 移出到畫布」提示區）放開 → 確認大畫布多一張獨立圖片 + 出現「已將…移出到畫布」toast。

## 已知小瑕疵（可接受，非 bug）
- 用面板連續加節點時，新節點生成位置相近會略微重疊（各偏移 24px），可手動拖開。日後可改用滑鼠位置放置。
