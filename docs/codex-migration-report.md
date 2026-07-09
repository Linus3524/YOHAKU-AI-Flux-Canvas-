# Codex Migration Report

Date: 2026-07-09

## Summary

This pass focused on safe refactor-move extraction with no intended behavior changes. The strict line-count targets from `docs/codex-migration-plan.md` were relaxed during execution per user guidance, so high-risk logic such as `useAI.handleGenerate` and the mixed group resize/rotate mouse state in `InfiniteCanvas.tsx` was intentionally left in place.

No commit or push was performed.

## Moves

### Task 1: `src/App.tsx`

- `src/App.tsx:50-176` -> `src/components/ApiKeyModal.tsx`
  - Moved the inline API key modal component.
- `src/App.tsx:219-436`, `src/App.tsx:695-718`, `src/App.tsx:1034-1043` -> `src/hooks/useEditorTargets.ts`
  - Moved semantic editor target state/helpers, image resize target, design master target state, and cross-platform/brand-kit/product-marketing target open handlers.
- `src/App.tsx:437-459` -> `src/hooks/useFilePersistence.ts`
  - Moved save confirmation state and handlers.
- `src/App.tsx:532-694`, `src/App.tsx:719-832`, `src/App.tsx:897-984`, `src/App.tsx:1044-1122` -> `src/hooks/useAppAiActions.ts`
  - Moved App-level AI action wrappers for BiRefNet removal, magic layer, OCR convert, sticker split, prompt extraction, text rasterize override, and merge override.
- `src/App.tsx` style library JSX -> `src/components/StyleLibraryPanel.tsx`
  - Moved the floating Magic Style library panel.
- `src/App.tsx` generated results modal JSX -> `src/components/GeneratedResultsModal.tsx`
  - Moved the generated image result picker modal.
- `src/App.tsx` clear/save/intent/drop overlay JSX -> `src/components/AppModals.tsx`
  - Moved clear storage confirmation, generation intent modal, save confirmation modal, and image drop overlay.
- `src/App.tsx` top API/model/storage status JSX -> `src/components/AppTopStatusBar.tsx`
  - Moved the top status bar.

### Task 2: `src/components/InfiniteCanvas.tsx`

- `src/components/InfiniteCanvas.tsx:216-396` -> `src/components/CanvasElementsLayer.tsx`
  - Moved `ElementsLayer`, including `handleLiveDrag`, `handleDragStart`, and `handleElementDragEnd`.

The larger `handleMouseMove` / `handleMouseDown` / `handleMouseUp` block remains in `InfiniteCanvas.tsx` because it is intertwined with group resize/rotate refs and live marquee behavior. This was kept in place to avoid a risky behavior change.

### Task 3: `src/hooks/useAI.ts`

- `src/hooks/useAI.ts:146-156` -> `src/ai/pipelines/chat.ts`
  - Moved the AI assistant prompt optimization leaf call into `askAI`.
- `src/hooks/useAI.ts:836-856` -> `src/ai/pipelines/outpainting.ts`
  - Moved outpainting auto-prompt generation into `generateOutpaintingPrompt`.

`handleGenerate` was intentionally skipped in this pass per user guidance because it is the highest-risk function and large enough to deserve a separate review-focused batch.

## New Files

- `src/components/ApiKeyModal.tsx`
- `src/components/AppModals.tsx`
- `src/components/AppTopStatusBar.tsx`
- `src/components/CanvasElementsLayer.tsx`
- `src/components/GeneratedResultsModal.tsx`
- `src/components/StyleLibraryPanel.tsx`
- `src/hooks/useAppAiActions.ts`
- `src/hooks/useEditorTargets.ts`
- `src/hooks/useFilePersistence.ts`
- `src/ai/pipelines/chat.ts`
- `src/ai/pipelines/outpainting.ts`
- `docs/codex-migration-report.md`

## Line Counts

| File | Before | After |
|---|---:|---:|
| `src/App.tsx` | 2801 | 1840 |
| `src/components/InfiniteCanvas.tsx` | 2125 | 1942 |
| `src/hooks/useAI.ts` | 1981 | 1970 |

## Verification

- `npm run lint` passed after each completed extraction step.
- Final `npm run lint` passed.
- Final `npm run build` passed.

Build warnings observed:

- `onnxruntime-web` uses `eval` in its bundled output.
- Some modules are both dynamically and statically imported, so Vite cannot split them into separate chunks.
- Main bundle remains larger than Vite's default chunk size warning threshold.

These warnings were present as build-time warnings only; the build completed successfully.

## Skipped Or Deferred

- `src/App.tsx` was not forced down to <=1600 lines after the target was relaxed. Additional extraction is possible, but further App work would mostly be JSX/data-flow reshaping rather than low-risk handler moves.
- `src/components/InfiniteCanvas.tsx` was not forced down to <=1400 lines. The remaining mouse handlers combine panning, marquee selection, group resize, and group rotation; extracting them safely should be a dedicated pass.
- `src/hooks/useAI.ts` was not forced down to <=1200 lines. `handleGenerate`, brand kit, cross-platform, and product marketing flows were left mostly intact to avoid high-risk logic changes.
- No API-key-dependent generation flows were run end to end.

