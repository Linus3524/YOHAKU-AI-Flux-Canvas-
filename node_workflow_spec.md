# YOHAKU AI 畫布 - 「局部封裝節點工作流與影片生成」開發規格與實作計劃書

本文件旨在整理並規劃《余白 AI 繪圖畫布 (YOHAKU)》之全新核心功能——**「局部封裝節點工作流 (Node-Based Workflow Group)」** 與 **「AI 影片生成與對話式修改 (Image-to-Video / Video-Edit API)」**。

本計劃遵循**「不肥大化原有主檔案、保持代碼高度模組化與可插拔性」**的原則，並對標當前最前沿的 AI 設計介面（如 Figma、Miro 與 ComfyUI 的結合體）。此文件可作為後續交給 Claude 或其他 AI 助手進行程式碼撰寫與系統開發的完整作業指導書（PRD & Tech Spec）。

---

## 一、 設計哲學：漸進式 UI (Progressive UI)

> 💡 **「無限白板是藝術家的直覺創作桌，局部節點是藝術家的自動化後台。」**

我們不希望像 ComfyUI 或 WebUI 那樣一打開就是鋪天蓋地、令人窒息的線路與節點，這會破壞 YOHAKU 像 Miro/Figma 般的優雅簡潔。因此我們採用 **「局部封裝」** 邏輯：

1. **白板視角（大畫布）**：使用者看到的是乾淨的白板，上面有文字、圖片、便利貼。
2. **加工廠視角（子空間）**：使用者可以對圖片或便利貼點擊右鍵「建立節點工作流」，該物件會轉化為一個特殊的 `NodeGroupElement`（群組方框）。**雙擊雙擊點進去**，畫面會 Zoom-in 放大展開，進入專屬的「子工作區」。在這裡，所有的處理流程（去背、生圖、外擴、轉影片）均以節點連線形式呈現。
3. **成果輸出**：節點鏈的最終輸出端會直接同步渲染回大畫布上的群組方框中。

---

## 二、 核心功能需求與設計規格

### 1. 局部封裝的「節點工作流群組 (Node Group Object)」
* **封裝性**：子工作區擁有獨立的座標系與畫布，使用者可以在裡面自由擺放節點、拖曳連線。
* **拖曳離鏈（Detach）**：如果使用者在子空間中，將某個生成出來的結果節點（如：去背完的圖片）**用滑鼠拖出群組的 Bounding Box 外界**，該節點會自動「脫離工作流」，並直接新增為大畫布上的獨立一般元素（`CanvasElement`），不再受節點關係約束。

### 2. 創新設計：可折疊大節點 (Collapsible Batch Nodes)
* **痛點**：像「魔法分層」或「一鍵拆貼圖」這類功能，一次會拆分出 5~10 張去背圖片，如果每個圖片都生成一個大節點並拉滿連線，子畫布會瞬間雜亂不堪。
* **解決方案**：設計 **「可折疊的 Batch 大節點」**。該節點的輸出端在點擊後可以「摺疊/展開」。展開時顯示網格狀的多個子圖縮圖；摺疊時收納為單一節點，並只引出一條總資料線。當這條總線連到下一個節點（如：批次去背）時，會並行處理所有子圖。

### 3. 多任務並行與執行快取 (Parallel Execution & Graph Caching)
* **並行任務**：在節點工作流模式下，多個無相依關係的任務（例如：同時用不同 Prompt 跑 4 張圖）應能同時進行，各自顯示進度條。
* **圖形快取 (Graph Caching)**：
  * 當使用者點擊「執行」時，執行器（Executor）會檢查節點的輸入參數與來源是否改變。
  * 如果節點 1（輸入圖片）與節點 2（去背）沒有變更，僅修改了節點 3（提示詞），則執行器會**直接使用快取結果**，跳過節點 1 和 2 的運算，這能**為使用者省下大筆的雲端 API 消耗**。

### 4. 影片生成與對話式修改 API 介接
* **新增影片元件**：在大畫布引入 `<video>` 元件，支援播放/暫停、時間軸滑動、以及「定格某一影格導出為圖片（Poster Frame Export）」。
* **接入 Atlas 影片模型**：串接**即夢 (Jimeng/Seedream)**、**可靈 (Kling)** 或 **Wan** 等影片生成模型。
* **Gemini Omni 整合**：利用 Gemini 進行「影片的對話式修改」（例如：選中影片，輸入提示詞「讓背景下起雪來」，直接透過 API 修改原影片內容）。

---

## 三、 開源參考專案 (Open-Source References)

在實作前端節點 UI 與後端執行器時，請參考以下優秀的開源專案設計：

1. **[React Flow](https://github.com/xyflow/xyflow) (首選節點 UI 庫)**：
   * 完美的 React 整合度，極佳的縮放（Zoom）、平移（Pan）與連線效能。
   * 支援 Custom Node（自訂節點），非常適合用來繪製 YOHAKU 帶縮圖與播放器的特殊節點。
2. **[LiteGraph.js](https://github.com/jagenjo/litegraph.js)**：
   * 適合參考其 2D Canvas 渲染節點的極致效能，以及純 TypeScript/JavaScript 的圖形執行器（Graph Executor）邏輯。
3. **[ComfyUI](https://github.com/comfyanonymous/ComfyUI)**：
   * 學習其後端 JSON 保存圖形結構（Graph Topology）的方式。
   * 學習其非同步 API 排隊（Prompt Queue）與快取（Link Caching）的生命週期設計。

---

## 四、 系統架構與檔案目錄拆分 (Architecture)

為了維持代碼的乾淨，所有節點功能均應放置於獨立的模組中，嚴禁直接堆疊於現有的 `App.tsx` 或 `useAI.ts`。

```text
src/
├── components/
│   ├── NodeWorkflow/
│   │   ├── NodeWorkflowOverlay.tsx       # 雙擊進入子空間的 Fullscreen Overlay
│   │   ├── NodeWorkflowCanvas.tsx        # React Flow 畫布主體
│   │   ├── customNodes/                  # 自訂節點組
│   │   │   ├── InputNode.tsx             # 來源節點 (圖片/文字/便利貼)
│   │   │   ├── ImageGenNode.tsx          # 生成圖片節點
│   │   │   ├── RemoveBgNode.tsx          # 智能去背節點
│   │   │   ├── VideoGenNode.tsx          # 圖片轉影片/文生影片節點
│   │   │   └── OutputNode.tsx            # 輸出節點 (包含摺疊與回貼大畫布按鈕)
│   │   └── customEdges/                  # 自訂連線樣式
│   └── TransformableElement.tsx          # 【修改】新增對 VideoElement 的渲染支援
├── hooks/
│   └── useNodeGraph.ts                   # 管理節點圖（Graph）狀態的自訂 Hook
├── store/
│   └── nodeGraphStore.ts                 # Zustand 節點狀態機，獨立於全域 Canvas 狀態
├── utils/
│   ├── atlasVideo.ts                     # Atlas 影片生成 API (即夢、Wan)
│   ├── geminiOmniVideo.ts                # Gemini Omni 影片修改 API
│   └── nodeGraphExecutor.ts              # 圖形遍歷與快取執行引擎 (純 TS)
└── types.ts                              # 【修改】擴充 'video' 與 'node_group' 元件定義
```

---

## 五、 四階段實作路徑 (Roadmap)

### 🚀 Phase 1: 基礎資料模型擴充與影片元件導入
1. **`types.ts` 擴充**：
   * 新增 `'video'` 到 `ElementType`。
   * 定義 `VideoElement` 結構，包含 `src` (影片 URL/Blob), `metadata` (seed, model, prompt, aspect ratio, duration)。
   * 新增 `'node_group'` 到 `ElementType`，定義 `NodeGroupElement`，包含其 `graph` (JSON 格式的節點連線關係) 以及當前輸出圖片/影片連結。
2. **`TransformableElement.tsx` 擴充**：
   * 實作 `case 'video'`，渲染 HTML5 `<video>`，外層套用現有的 `Transformable` 旋轉與縮放控制器。
   * 新增微型播放控制列（Play/Pause、時間軸、靜音鍵、以及「定格匯出」按鈕）。

### ⚙️ Phase 2: 子空間編輯器與 React Flow 整合
1. **建立 Overlay**：實作 `NodeWorkflowOverlay.tsx`。當使用者在 `NodeGroupElement` 雙擊時，該 Overlay 以動畫淡入，暫停大畫布的 React 重新渲染（減少 CPU/GPU 負擔）。
2. **節點繪製**：整合 React Flow，開發自訂的 YOHAKU 風格節點，並在 CSS 上套用磨砂玻璃（Glassmorphism）與霓虹發光邊框。
3. **離鏈拖曳檢測**：實作 `onNodeDragStop`。如果偵測到某個結果節點被移出 Overlay 邊界，觸發離鏈邏輯，利用 `useCanvas` 的 `addElement` 將其新增為大畫布的獨立 `ImageElement` 或 `VideoElement`。

### 🔌 Phase 3: 影片 API 與圖形執行引擎 (Executor) 實作
1. **API 對接**：
   * 寫入 `atlasVideo.ts`，介接即夢和 Wan 影片 API。
   * 寫入 `geminiOmniVideo.ts`，使用 Google GenAI SDK 的影片指令修改功能。
2. **快取執行引擎 (`nodeGraphExecutor.ts`)**：
   * 實作拓撲排序（Topological Sort），由輸入節點開始，依序遞迴執行非同步任務。
   * 實作節點雜湊值比對（SHA-256 對比 Input + Params），如果雜湊值與上次執行完全相同，直接從 cache 讀取 Base64/Blob，跳過 API 請求。

### 🛡️ Phase 4: 前端資源與顯存優化 (GPU / Memory Guard)
1. **低解析度預覽**：子畫布連線中的影片預覽，限制解碼解析度在 `512px` 內。只有在大畫布播放或下載導出時，才載入高畫質版本。
2. **記憶體生命週期綁定**：
   * 在 `workerIdleReaper.ts`（YOHAKU 閒置回收器）中新增 node mode 生命週期監聽。
   * 當使用者關閉子畫布 Overlay 時，主動呼叫垃圾回收，釋放子畫布的 React Flow DOM 樹與未使用的 Blob 記憶體。

---

請優先以 **Phase 1 ( types.ts 擴充與 Video 播放元件導入 )** 以及 **Zustand 狀態設計 (`nodeGraphStore.ts`)** 開始進行第一步的代碼架構與介面編寫！
