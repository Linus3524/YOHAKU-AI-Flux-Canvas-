# YOHAKU AI Flux Canvas — 開發須知

React + TypeScript + Vite 的無限畫布 AI 影像創作工具。畫布元件、AI 生成（Gemini / Atlas / fal.ai）、本機 ONNX（放大 / LaMa 去物）。

## ⚠️ 程式碼真偽：先確認哪個檔案才是「活的」再動手

這個 repo 有**新舊兩套同名檔案並存**，改錯地方改了不會生效（已踩過坑）：

- **進入點鏈**：`index.html` → `/index.tsx` → `import App from './src/App'`。
- **唯一正本是 `src/` 底下的東西**：`src/App.tsx`、`src/components/*`、`src/hooks/*`、`src/utils/*`。
- **根目錄的 `App.tsx`、`components/`、`types.ts`、`useHistoryState.ts` 是舊版殘留（死碼）**，沒有被 `src/` 引用，改它們完全沒效果。
- 同一個檔案內也可能有**死碼陣列**：例如 `src/components/FloatingAssistant.tsx` 的 `FEATURE_DOCS`（從未被 `.map` 渲染）；功能指南實際畫面用的是 JSX 內嵌的 `t`/`d` 陣列。改文案要改後者。
- **動手前的習慣**：用 grep 確認目標符號/字串「真正被 import 或 render 的那一份」，再編輯。

## 指令

- `npm run dev` — 開發伺服器（Vite，本機預設 5175）。
- `npm run lint` — 型別檢查（`tsc --noEmit`）。每次改完跑這個當基本驗證。
- `npm run build` — 正式建置。

## 在 preview 裡驗證本專案（canvas 很難測，這套省時）

畫布元素**不在 a11y tree**，無法用 selector 點到；多選/面板要用程式驅動：

- **加元素**：找工具列按鈕點，例如 `[...document.querySelectorAll('button')].find(b => b.textContent.includes('note_stack_add')).click()`。
- **框選多物件**：對 `div.w-full.h-full.overflow-hidden.relative` 派發 `mousedown → mousemove → mousemove → mouseup`（帶 `clientX/Y`），**每步之間要 `await sleep(~60ms)`**，否則 React state 還沒更新、marquee 抓不到。
- **功能助手面板**：左上角可拖曳 FAB（圓鈕）以 `onClick` 開啟（`.click()` 可用）；左側 nav 用文字選分頁。
- 模型相關（放大 / 去物 / 生成）需 API key 或本機 ONNX，常無法端到端跑完；此時以「`npm run lint` 通過 + dev server 無 console/build 錯誤 + curl dev server 確認改動已送出」為驗證底線，並如實向使用者說明哪部分沒實測。

## 提交與部署

push 到 `main` 會**自動觸發 Vercel production 部署**（git integration，不需 `vercel --prod`）。commit / push 前先讓使用者確認。
