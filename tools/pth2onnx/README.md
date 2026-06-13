# pth2onnx — 放大模型轉 ONNX 工具

把 OpenModelDB / GitHub 上只有 `.pth` / `.safetensors` 的放大模型轉成前端可用的 ONNX
（動態輸入尺寸，方便 tiling）。用 [spandrel](https://github.com/chaiNNer-org/spandrel)
自動辨識架構，支援 SPAN / Compact / ESRGAN / RealPLKSR / DAT 等。

## 一次性安裝（已建好 venv，無需重裝）

```bash
python3 -m venv .venv
.venv/bin/python -m pip install torch spandrel onnx onnxruntime
# 需要 --fp16 時再加： onnxconverter-common
```

## 用法

```bash
.venv/bin/python convert.py <輸入.pth|.safetensors|URL> <輸出.onnx> [選項]
```

選項：
- `--size N`：範例輸入邊長（預設 128，不影響動態尺寸）
- `--opset N`：ONNX opset（預設 17）
- `--no-dynamic`：鎖定為固定尺寸
- `--fp16`：匯出後轉 fp16（需 `onnxconverter-common`）

### 範例

```bash
# 動漫專練輕量模型（realesr-animevideov3，Compact）
.venv/bin/python convert.py \
  https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-animevideov3.pth \
  out/realesr-animevideov3.onnx
```

轉好的 `.onnx` 上傳到自己的 HuggingFace repo，再把網址填進
`src/utils/onnxModelCache.ts` 的 `MODEL_CONFIGS` 即可。

> 注意：本資料夾的 `.venv/`、`out/`、模型權重檔都已 gitignore，不會進版控。
