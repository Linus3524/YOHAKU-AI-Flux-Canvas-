# Codex Migration Report Round 3

日期：2026-07-09

## 執行摘要

依 `docs/codex-migration-plan-round3.md` 執行第三輪巨檔拆分。本輪只搬移兩個主檔在主元件 `export` 之前的 module-level 子元件、helper 與常數；`ImageEditModal` 與 `SemanticEditorView` 的主元件函式本體未拆分、未重寫行為。

未 commit，未 push。

## 搬移清單

### ImageEditModal

- `useDebounce`、`drawEllipseFromDrag` → `src/components/ImageEditModal/helpers.ts`
- `defaultAdjustments`、`BRUSH_SIZES`、`MASK_COLOR`、`MIN_ZOOM`、`MAX_ZOOM`、`MAX_REFERENCE_IMAGES`、`removeModelOptions`、`EditIcons` → `src/components/ImageEditModal/constants.tsx`
- `AdjustmentSlider` → `src/components/ImageEditModal/AdjustmentSlider.tsx`
- `CollapsibleSection` → `src/components/ImageEditModal/CollapsibleSection.tsx`

備註：`constants` 使用 `.tsx`，因為 `EditIcons` 內含 JSX。

### SemanticEditor

- `BBoxOverlay` → `src/components/SemanticEditor/BBoxOverlay.tsx`
- `RefImagePreview` → `src/components/SemanticEditor/RefImagePreview.tsx`
- `Ic` → `src/components/SemanticEditor/icons.tsx`
- `PillToolbar` → `src/components/SemanticEditor/PillToolbar.tsx`
- `FloatingPromptBox` → `src/components/SemanticEditor/FloatingPromptBox.tsx`

備註：`icons` 使用 `.tsx`，因為 icon 集內含 JSX。

## 新增檔案

- `src/components/ImageEditModal/helpers.ts`
- `src/components/ImageEditModal/constants.tsx`
- `src/components/ImageEditModal/AdjustmentSlider.tsx`
- `src/components/ImageEditModal/CollapsibleSection.tsx`
- `src/components/SemanticEditor/BBoxOverlay.tsx`
- `src/components/SemanticEditor/RefImagePreview.tsx`
- `src/components/SemanticEditor/icons.tsx`
- `src/components/SemanticEditor/PillToolbar.tsx`
- `src/components/SemanticEditor/FloatingPromptBox.tsx`
- `docs/codex-migration-report-round3.md`

## 行數前後對照

| 檔案 | Round 3 前 | Round 3 後 | 減少 |
|---|---:|---:|---:|
| `src/components/ImageEditModal.tsx` | 2476 | 2323 | 153 |
| `src/components/SemanticEditor/SemanticEditorView.tsx` | 2276 | 1818 | 458 |

## 跳過項目

無。第 2、3 節列出的頂部子元件、helper、常數皆為 module-level 定義，未發現直接讀取主元件閉包 state 的情況；需要主元件資料的部分皆已透過 props 或函式參數傳入。

## 驗證紀錄

- `npm run lint`：常數/helper 搬移後通過
- `npm run lint`：`AdjustmentSlider` 搬移後通過
- `npm run lint`：`CollapsibleSection` 搬移後通過
- `npm run lint`：`BBoxOverlay` 搬移後通過
- `npm run lint`：`RefImagePreview` 搬移後通過
- `npm run lint`：`Ic` 搬移後通過
- `npm run lint`：`PillToolbar` 搬移後通過
- `npm run lint`：`FloatingPromptBox` 搬移後通過
- `npm run build`：通過

Build 備註：Vite 仍輸出既有的 `onnxruntime-web` eval、大 chunk、以及部分 dynamic import 與 static import 混用警告；本次搬移未引入 build error。
