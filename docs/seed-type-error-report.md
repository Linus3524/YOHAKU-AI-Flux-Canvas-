# YOHAKU AI Flux Canvas - TypeScript Compilation Error Report (Seed Type Issue)

## 1. 問題概述 (Overview)
在執行專案的 TypeScript 類型檢查時，編譯器回報了兩處與 `seed` 屬性相關的錯誤。此錯誤源於使用官方新版 `@google/genai` SDK 時，其 `GenerateContentConfig` 下的 `ImageConfig`（即 `imageConfig` 欄位）結構中並未定義 `seed` 屬性，導致型別檢查無法通過。

根據驗證，此型別錯誤為專案中既有的「繪圖 seed 功能」所遺留下來的問題，並非本次功能修改所引入的。

---

## 2. 錯誤訊息與檔案位置 (Error Messages & Locations)
執行 `npx tsc --noEmit` 時會拋出以下錯誤：

```bash
src/components/ImageEditModal.tsx(1426,34): error TS2353: Object literal may only specify known properties, and 'seed' does not exist in type 'ImageConfig'.
src/hooks/useAI.ts(1629,97): error TS2353: Object literal may only specify known properties, and 'seed' does not exist in type 'ImageConfig'.
```

### 具體錯誤程式碼片段：

#### 1. [ImageEditModal.tsx](file:///Users/linus_mac_mini/YOHAKU-AI-Flux-Canvas-/src/components/ImageEditModal.tsx#L1423-L1427)
```typescript
      const response = await callGeminiWithRetry(() => ai.models.generateContent({
        model: imageModel,
        contents: { parts: [originalImagePart, maskImagePart, ...refParts, { text: textPrompt + refHint }] },
        config: { imageConfig: { seed: activeSeed } } // <-- 這裡把 seed 傳入了 imageConfig
      }));
```

#### 2. [useAI.ts](file:///Users/linus_mac_mini/YOHAKU-AI-Flux-Canvas-/src/hooks/useAI.ts#L1626-L1630)
```typescript
                  const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
                    model: imageModel,
                    contents: { parts: [...refParts, textPart] },
                    config: { imageConfig: { aspectRatio: targetRatio, imageSize: effImageSize, seed: frameSeed } }, // <-- 這裡把 seed 傳入了 imageConfig
                  }));
```

---

## 3. 根本原因分析 (Root Cause Analysis)
在 `@google/genai` SDK 中：
* `ImageConfig`（定義圖片生成特有參數的介面）僅包含：
  * `aspectRatio?: string`
  * `imageSize?: string`
  * 不包含 `seed` 屬性。
* 相反地，在 Gemini API 概念中，用於重現文本或多模態生成的隨機種子碼（`seed`）應該放在 `GenerateContentConfig` 的**最外層**，而不是 `imageConfig` 底下。

因此，將 `seed` 寫在 `imageConfig` 物件內會被 TypeScript 判定為「不合法的未知屬性 (unknown property)」而報錯。

---

## 4. 驗證與重現步驟 (How to Reproduce)
在專案根目錄執行以下指令：
```bash
npx tsc --noEmit
```
即可重現上述的編譯型別錯誤。

---

## 5. 建議修復方案 (Proposed Solutions)
依據不修改業務邏輯的大前提下，未來修正此問題可採取以下兩種方案：

### 方案 A：將 `seed` 移至 `config` 的最外層 (推薦，符合 SDK 定義)
將 `seed` 移動至與 `imageConfig` 同級的 `config` 最外層位置。

* **在 `ImageEditModal.tsx` 修改為：**
  ```typescript
  config: {
    seed: activeSeed
  }
  ```

* **在 `useAI.ts` 修改為：**
  ```typescript
  config: {
    seed: frameSeed,
    imageConfig: {
      aspectRatio: targetRatio,
      imageSize: effImageSize
    }
  }
  ```

### 方案 B：使用 `as any` 斷言快速繞過型別檢查
如果需要相容舊有邏輯，但又需要快速通過編譯，可以使用 `as any` 斷言：

* **在 `ImageEditModal.tsx` 修改為：**
  ```typescript
  config: {
    imageConfig: { seed: activeSeed } as any
  }
  ```

* **在 `useAI.ts` 修改為：**
  ```typescript
  config: {
    imageConfig: {
      aspectRatio: targetRatio,
      imageSize: effImageSize,
      seed: frameSeed
    } as any
  }
  ```

---

## 6. 後續處理建議 (Next Steps)
此型別錯誤為既有遺留問題，且未影響目前主要的功能運行與網頁 Build 生成。
**本次暫不修改程式碼**。本錯誤報告已存檔於 [docs/seed-type-error-report.md](file:///Users/linus_mac_mini/YOHAKU-AI-Flux-Canvas-/docs/seed-type-error-report.md)，建議後續可單獨開立一條 Issue/Branch 來進行此型別修復。
