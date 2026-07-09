# Codex Migration Report Round 2

Date: 2026-07-09

## Summary

This round focused only on the four specialized flows listed in section 2 of `docs/codex-migration-plan-round2.md`. High-risk shared generation logic was left in place. No commit or push was performed.

## Moves

### Brand Kit

- `src/hooks/useAI.ts:1517-1769` -> `src/ai/pipelines/brandKit.ts`
  - Extracted the generation loops for `handleLogoBrandKit` and `handleExtendBrandKit`.
  - `useAI.ts` keeps the wrapper responsibilities: locating source elements, API-key gate, loading state, final toast, `setElements`, and image cache writes.

### Product Marketing

- `src/hooks/useAI.ts:1770-1970` -> `src/ai/pipelines/productMarketing.ts`
  - Extracted product marketing asset selection, optional style-anchor analysis, prompt generation, and per-asset generation loop.
  - `useAI.ts` keeps wrapper responsibilities: locating source element, API-key gate, loading state, final toast, `setElements`, and cache writes.

### Cross Platform

- `src/hooks/useAI.ts:1417-1516` -> `src/ai/pipelines/crossPlatform.ts`
  - Extracted platform spec resolution, source image preparation, per-platform generation, and result sizing.
  - `useAI.ts` keeps wrapper responsibilities: source validation, model/API gate, loading state, final toast, `setElements`, and cache writes.

### Style Transfer Three-Pack

- `src/hooks/useAI.ts:158-341` -> `src/ai/pipelines/styleTransfer.ts`
  - Added helper functions for copied-style analysis, copied-style prompt construction, preset-style prompt construction, and the copied/preset style generation loops.
  - `useAI.ts` keeps wrapper responsibilities: copied-style state, target lookup, loading state, toast behavior, and current-canvas anchoring when adding generated style assets.

## New Files

- `src/ai/pipelines/brandKit.ts`
- `src/ai/pipelines/productMarketing.ts`
- `src/ai/pipelines/crossPlatform.ts`
- `docs/codex-migration-report-round2.md`

## Modified Files

- `src/hooks/useAI.ts`
- `src/ai/pipelines/styleTransfer.ts`

## Line Counts

| File | Before | After |
|---|---:|---:|
| `src/hooks/useAI.ts` | 1970 | 1672 |

## Verification

- `npm run lint` passed after extracting `brandKit`.
- `npm run lint` passed after extracting `productMarketing`.
- `npm run lint` passed after extracting `crossPlatform`.
- `npm run lint` passed after extracting the style transfer three-pack.
- Final `npm run build` passed.

Build warnings observed:

- `onnxruntime-web` uses `eval` in its bundled output.
- Some modules are both dynamically and statically imported, so Vite cannot split them into separate chunks.
- Main bundle remains larger than Vite's default chunk size warning threshold.

These were build-time warnings only; the build completed successfully.

## Skipped Or Deferred

- `handleGenerate` was not touched.
- `handleHarmonize`, `handleOutpaintingGenerate`, `handleRemoveBackground`, `handleAIUpscale`, `handleLocalUpscale`, `handleLocalRemoveBackground`, and `handleCameraAngle` were not touched.
- Top-level shared helpers in `useAI.ts` (`withAtlasWaitToast`, `prepareForGeneration`, `restoreTransparencyFn`, `createAiClient`, `handleAIError`) were not moved or duplicated.
- Optional `InfiniteCanvas.tsx` zoom extraction was skipped because the user requested only the four section-2 specialized flows.
- No API-key-dependent generation flows were run end to end.

