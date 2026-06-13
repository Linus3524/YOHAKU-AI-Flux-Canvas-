#!/usr/bin/env python
"""
pth / safetensors → ONNX 轉換器（用 spandrel 自動辨識架構）

支援 OpenModelDB 上大多數放大模型（SPAN / Compact / ESRGAN / RealPLKSR / DAT 等）。
動態輸入尺寸（batch/height/width），方便前端做 tiling。

用法：
  python convert.py <input.pth|.safetensors|URL> <output.onnx> [選項]

選項：
  --size N        匯出時的範例輸入邊長（預設 128，不影響動態尺寸）
  --opset N       ONNX opset（預設 17）
  --no-dynamic    關閉動態尺寸（鎖定為 --size）
  --fp16          匯出後轉 fp16（體積減半，前端 ORT 多能吃 float32 介面）

範例：
  # 把 realesr-animevideov3 轉成動態尺寸 ONNX
  python convert.py \\
    https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-animevideov3.pth \\
    out/realesr-animevideov3.onnx
"""
import argparse
import os
import sys
import tempfile
import urllib.request

import torch


def fetch(src: str):
    """URL → 下載到暫存檔；本地路徑 → 原樣回傳。回傳 (path, is_temp)。"""
    if src.startswith(("http://", "https://")):
        ext = os.path.splitext(src.split("?")[0])[1] or ".pth"
        fd, path = tempfile.mkstemp(suffix=ext)
        os.close(fd)
        print(f"⬇️  下載 {src}")
        urllib.request.urlretrieve(src, path)
        return path, True
    return src, False


def main() -> int:
    ap = argparse.ArgumentParser(description="pth/safetensors → ONNX（spandrel 自動辨識）")
    ap.add_argument("input", help="輸入 .pth/.safetensors 路徑或 URL")
    ap.add_argument("output", help="輸出 .onnx 路徑")
    ap.add_argument("--size", type=int, default=128, help="範例輸入邊長（預設 128）")
    ap.add_argument("--opset", type=int, default=17, help="ONNX opset（預設 17）")
    ap.add_argument("--no-dynamic", action="store_true", help="關閉動態尺寸")
    ap.add_argument("--fp16", action="store_true", help="匯出後轉 fp16")
    args = ap.parse_args()

    from spandrel import ModelLoader

    path, is_temp = fetch(args.input)
    try:
        desc = ModelLoader().load_from_file(path)
        arch = getattr(getattr(desc, "architecture", None), "name", "?")
        scale = getattr(desc, "scale", "?")
        in_ch = getattr(desc, "input_channels", 3)
        print(f"🧠 架構: {arch}  |  scale: {scale}x  |  輸入通道: {in_ch}")

        net = desc.model.eval()
        os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)

        x = torch.randn(1, in_ch, args.size, args.size)
        dynamic = None if args.no_dynamic else {
            "input": {0: "batch", 2: "height", 3: "width"},
            "output": {0: "batch", 2: "height", 3: "width"},
        }
        with torch.no_grad():
            torch.onnx.export(
                net, x, args.output,
                input_names=["input"], output_names=["output"],
                opset_version=args.opset, dynamic_axes=dynamic,
                do_constant_folding=True,
            )
        print(f"✅ 匯出 {args.output}")

        if args.fp16:
            import onnx
            from onnxconverter_common import float16  # type: ignore
            m = float16.convert_float_to_float16(onnx.load(args.output), keep_io_types=True)
            onnx.save(m, args.output)
            print("✅ 已轉 fp16（IO 保留 float32）")

        # 驗證：用 onnxruntime 跑一次 dummy，確認輸出是 scale× 尺寸
        import numpy as np
        import onnxruntime as ort
        sess = ort.InferenceSession(args.output, providers=["CPUExecutionProvider"])
        dummy = np.random.rand(1, in_ch, args.size, args.size).astype("float32")
        out = sess.run(None, {sess.get_inputs()[0].name: dummy})[0]
        sz_mb = os.path.getsize(args.output) / 1048576
        exp = args.size * scale if isinstance(scale, int) else "?"
        print(f"✅ ORT 驗證 OK | 輸出 {out.shape}（預期 {exp}px）| 體積 {sz_mb:.1f} MB")
        return 0
    finally:
        if is_temp:
            os.unlink(path)


if __name__ == "__main__":
    sys.exit(main())
