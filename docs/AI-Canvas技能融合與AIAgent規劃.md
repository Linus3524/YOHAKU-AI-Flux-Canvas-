# AI-Canvas 技能融合 與 AI Agent 規劃

> 這是一份**規劃／交接文件**,給之後(可能換另一台電腦)的自己看。
> 只涵蓋兩件事:(1) 把 AI-Canvas 的 6 個業務技能借鑑進「設計大師」;(2) 在本軟體加入 AI Agent 的可行性。
> 撰寫時間:2026-06-29。本軟體 = YOHAKU AI Flux Canvas(純前端 React+Vite,無後端)。

---

## 背景與兩個專案的關鍵差異

- **AI-Canvas**(`/Users/user/AI-Canvas`,MIT 授權):是 **Codex 外掛 + MCP + Node.js 後端**。
  - 6 個業務技能的「規格知識」寫在後端 `packages/canvas-app/src/server.ts`(它建出每張子圖的 `job.prompt`);
  - 真正「執行」靠 Codex(LLM agent)讀 `skills/auto-ai-canvas-skill-mode/SKILL.md` 指示去跑。
- **YOHAKU(本軟體)**:純前端,瀏覽器直接打 Gemini / Atlas / fal,**沒有後端、沒有 agent**。

**結論:不能「搬程式」,只能把每個技能的規格／提示詞知識,用前端 prompt builder 重寫。**
能複用的是「知識」(各平台尺寸、安全區、組圖配方、合規規則),不是程式碼。

YOHAKU 現有 10 個技能(`src/skills/index.ts` 的 `SKILL_LIST`):
`sticker, cover, logo, icon, infographic, social, illustrator, comic, slide, uiWebpage`。

---

## 一、6 個技能 × YOHAKU 對應 × 建議

| AI-Canvas Skill | 核心內容 + 可複用知識 | YOHAKU 現有對應 | 建議 | 優先 |
|---|---|---|---|---|
| **小红书封面** 3:4 | 直出帶標題版式封面;**安全區 8% 邊距**、標題版式 | `social`(已支援小紅書版型)、`cover` | **參考→合併進 `social`**(加小紅書預設 + 8% 安全區)。**不新增技能** | 中 |
| **YouTube 封面图** 16:9 | 高識別縮圖;**大字對比、避開右下時長標籤、防遮擋** | `cover`(已有 16:9)、`social` | **參考→合併進 `cover`**(加 YouTube 預設 + 大字/防遮擋)。**不新增技能** | 中 |
| **一键跨平台适配** | 1 張圖 → 多平台比例重構 + **各平台 safe area** + 智能擴圖 | **無** | **✅ 新增獨立技能 `crossPlatform`** | **高(試點首選)** |
| **产品营销组图** | 主圖/場景/賣點/細節 + **電商合規規則** | **無** | **新增 `productMarketing`,但須先解決「同產品一致性」** | 低(後段) |
| **Logo 与品牌** | 一次出主 Logo + 備用 + 色板 + 視覺板 + App 圖示 + Mockup | `logo`(單個)、`icon` | **升級現有 `logo`**:加「品牌視覺套件」開關(多圖)。**不新增技能** | 中 |
| **营销宣传册** | 三折頁外/內頁 + 實體 Mockup + 推廣圖;**折線安全區** | `infographic`/`slide`(無折頁/Mockup) | **新增 `brochure`** | 低 |

### 兩塊「不分技能、都該抽出來」的共用知識
1. **各平台安全區 prompt 片語**(來源 `server.ts` 約 1750–1826):
   - 小紅書 3:4 → 四周至少 8% 安全邊距
   - Instagram feed 4:5 → 中央安全區,四周 8% 邊距
   - IG Story/Reels 9:16 → 頂部約 14%、底部約 20% 不放關鍵文字/Logo/CTA
   - 公眾號 2.35:1 → 主體標題置中,左右避開
   - Twitter 5:2 → 中間 80% 區
   - LinkedIn 1:1 → 中心 80% 區
   - 用途:注入**任何**輸出比例,降低「文字被裁切」(本專案長期痛點)。
2. **電商合規規則**(來源 `server.ts` 約 1915–1965,Amazon 等):
   - 主圖必須白底、產品完整、**不疊標題/Logo/促銷角標/價格/評分/水印**;
   - 附圖避免 "best-selling/top-rated"、保修、價格、QR、聯絡方式、競品比較;
   - 配方:主圖(白底)/ 使用場景圖 / 核心賣點圖(可少量嵌字)/ 細節材質圖 / 對比價值圖。
   - 用途:做 `productMarketing` 的必要前提。

### AI-Canvas 各技能的 brief 欄位(做表單時參考,來源 `canvas-app/src/App.tsx`)
- 跨平台適配:`發布目標、要適配的平台(複選)、必須保留(主體/臉/產品輪廓/色調)、背景策略、文字策略`
- 產品組圖:`平台、產品名稱、目標用戶、核心賣點、品牌語氣、出圖數`
- Logo 與品牌:`品牌名、行業、目標受眾、定位/差異點、品牌人格、Logo 風格、使用場景`
- 營銷宣傳冊:`版型(三折頁/服務冊/產品冊)、活動名、品牌名、目標受眾、核心訊息、優惠、CTA、視覺語氣`

---

## 二、與 Gemini 報告不同的判斷(重要,別重蹈)

Gemini 的報告在 `/Users/user/.gemini/antigravity-ide/brain/.../`(fusion_analysis.md / implementation_plan.md / task.md)。方向大致對,但這幾點要修正:

1. **小紅書/YouTube 不該當新技能**:Gemini 把它們列進「精選推薦」新技能,但它自己也承認跟 `social`/`cover` 高度重合 → **直接併入預設**,別讓技能列表膨脹。
2. **產品組圖不能用 `Promise.all` 發獨立 prompt**:那會生出**4 個長相不同的產品**。正解:**先生一張基準圖,再把它當參考圖餵其餘子圖**(YOHAKU 有參考圖繼承系統可用)。這是 Gemini 最大疏漏。
3. **「移植/融合」用詞誤導**:實際是**前端重寫知識**,不是抄 AI-Canvas 後端程式。
4. **低估現有能力**:`useAI.ts` 的 `handleGenerate` 已有 `frame.aspectRatioLabel` 的多框/多比例迴圈,「多規格批次」不是全新工程,可複用。
5. **UI 分組合理**:10→13 技能會讓橫向 segmented control 太擠,加分類 Tab(社群/電商品牌/文件宣傳/創意插畫)是對的。

---

## 三、建議落地順序(分階段,別一次全上)

1. **共用安全區片語**(最小、最快、對所有技能都有益)。
2. **`crossPlatform` 跨平台適配**(最不重複、可複用 frame/擴圖機制,當「多規格批次」試點)。
3. 小紅書/YouTube 預設併入 `social`/`cover`。
4. `logo` 升級「品牌視覺套件」(多圖派發)。
5. `productMarketing`(等同產品一致性方案)→ `brochure`。

涉及的本專案檔案:
- 新增技能:`src/skills/<name>.ts` + 在 `src/skills/index.ts` 註冊(`SKILL_LIST` + `buildSkillPrompt`)。
- UI:`src/components/DesignMasterPanel.tsx`(分類 Tab + 各技能動態表單)。
- 批次多規格派發:`src/hooks/useAI.ts` 的 `handleGenerate`(擴成可吃多子任務、各自比例)。

---

## 四、AI Agent 可行性

**結論:可行,純前端就能做,不用學 AI-Canvas 的後端那套。**

### 為何可行(現有零件)
- LLM 已在手:`@google/genai ^1.46.0`,Gemini **原生支援 function calling(工具呼叫)**。
- 對話入口已有:`handleAskAI`(`src/hooks/useAI.ts`)+ `FloatingAssistant`,目前只拿來問答/優化提示詞。
- 「工具」其實都寫好了:`handleGenerate`、語意編輯、一鍵分割、去背、`addElement` 等都是現成函式。
- 金鑰、API、ONNX 全在前端 → agent loop 直接在瀏覽器跑。

### 做法(純前端 agent loop)
1. 把畫布操作包成一組**工具定義**(function declarations):名稱、用途、參數 schema。
2. 寫 `runAgent(userText, canvasState)`:送「指令 + 工具定義 + 畫布摘要」給 Gemini → 拿回 tool calls → 用 dispatch 表對應到現有 handler 執行 → 結果回餵 Gemini → loop 到完成。
3. UI 顯示 agent 步驟/進度(可複用現有 generating label 機制)。

### 真正要面對的難點
- **工具介面設計**:把現有 handler 整理成乾淨、安全、參數明確的工具(主要工作量)。
- **畫布狀態怎麼給 agent 看**:不能塞 base64 全圖。要做精簡摘要(element id/類型/位置/名稱),要「看圖」時才送縮圖(Gemini 多模態可,但要控 token/成本)。
- **長時間工具**:生圖/編輯數秒~分鐘,loop 要處理 async + 進度。
- **安全護欄**:會刪改元素的工具要**先確認**,並設**迭代上限**(防鬼打牆)。
- **成本/延遲**:每回合 = 1 次 LLM + 可能多次生圖,要讓使用者知道在花錢。

### 分階段(別一步到位全自動)
- **L1 指令列/意圖路由**(最划算先做):一句話 → LLM 選**單一**動作 + 填參數 + 執行。已有 `handleAskAI` + `intentModal` 雛形。
- **L2 多步 agent**:能串多工具(生圖→去背→分割→排版),步驟間回餵畫布狀態。
- **L3 視覺總監**:agent 用 vision 看畫布、自行提案+執行+迭代(即 AI-Canvas Codex 那種)。

### 大腦用誰
先用現有 **Gemini**(金鑰已在)驗證;要更強規劃可接 **Claude(Anthropic API)** 當 orchestration 腦,但要多一把金鑰。

---

## 下一步(回來接手時)
- 技能融合:從**第 1 步(安全區片語)**或**第 2 步(`crossPlatform` 試點)**開始。
- AI Agent:使用者仍在考慮要不要做;若要,從 **L1** 起手最安全。
