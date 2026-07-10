import { useCallback, type MutableRefObject } from 'react';
import { analyzeImagePrompt } from '../utils/ImageAnalysisService';
import { downloadImageAsBase64 } from '../utils/atlasImage';
import { cacheImage } from '../utils/imageCache';
import { birefnetRemoveBg } from '../utils/geminiLayer';
import { gptLayerSegment, type MagicLayerOptions } from '../utils/gptLayerSplit';
import type { LayerResult } from '../utils/falImage';
import { detectTextBlocks } from '../utils/ocrService';
import { splitStickerCollectionDetailed } from '../utils/imageProcessing';
import { drawTextOnCanvas } from '../utils/textCanvas';
import { captureTextElementAsImage } from '../utils/svgCapture';
import type { CanvasElement, ImageElement, NoteElement, TextElement } from '../types';

type ElementSetter = (
  updater: CanvasElement[] | ((prev: CanvasElement[]) => CanvasElement[]),
  options?: { addToHistory?: boolean }
) => void;

export const useAppAiActions = ({
  elements,
  selectedElementIds,
  setElements,
  showToast,
  setShowKeyModal,
  setIsGenerating,
  setGeneratingElementIds,
  setGeneratingLabels,
  pauseAutoSave,
  resumeAutoSave,
  effectiveApiKey,
  atlasApiKey,
  falApiKey,
  imageModel,
  generationModel,
  zIndexCounter,
  originalMergeLayers,
}: {
  elements: CanvasElement[];
  selectedElementIds: string[];
  setElements: ElementSetter;
  showToast: (msg: string) => void;
  setShowKeyModal: (open: boolean) => void;
  setIsGenerating: (value: boolean) => void;
  setGeneratingElementIds: (ids: string[]) => void;
  setGeneratingLabels: (labels: Record<string, string>) => void;
  pauseAutoSave: () => void;
  resumeAutoSave: () => void;
  effectiveApiKey: string | null;
  atlasApiKey: string | null;
  falApiKey: string | null;
  imageModel: string;
  generationModel: string;
  zIndexCounter: MutableRefObject<number>;
  originalMergeLayers: () => void | Promise<void>;
}) => {
  // --- BiRefNet v2 去背 ---
  const handleBiRefNetRemoveBackground = useCallback(async (model: string = 'Matting') => {
      if (!falApiKey) { showToast('需要 fal.ai API Key，請在設定中輸入'); setShowKeyModal(true); return; }
      const targets = elements.filter(el => selectedElementIds.includes(el.id) && el.type === 'image') as ImageElement[];
      if (targets.length === 0) return;
      setIsGenerating(true);
      setGeneratingElementIds(targets.map(el => el.id));
      showToast(`🔍 BiRefNet v2 去背中（${model}）...`);
      try {
          for (const el of targets) {
              const result = await birefnetRemoveBg(el.src, falApiKey, model as any);
              setElements(prev => prev.map(e => e.id === el.id ? { ...e, src: result } : e));
              if (result.startsWith('data:')) cacheImage(el.id, result);
          }
          showToast('✅ BiRefNet 去背完成！');
      } catch (e: any) {
          showToast(`❌ BiRefNet 去背失敗：${e.message?.slice(0, 60) || '未知錯誤'}`);
      } finally {
          setIsGenerating(false);
          setGeneratingElementIds([]);
      }
  }, [falApiKey, elements, selectedElementIds, setElements, showToast, setShowKeyModal, setIsGenerating, setGeneratingElementIds]);


  // --- 魔法分層：語意提取 + 背景補圖（GPT Image 2 優先；無 Atlas Key 降級 Gemini）---
  const handleMagicLayer = useCallback(async (elementId: string, options: MagicLayerOptions) => {
      const el = elements.find(e => e.id === elementId && e.type === 'image') as ImageElement | undefined;
      if (!el) return;

      const selectedModel = options.model || (generationModel === 'seedream-v5-pro' ? 'seedream-v5-pro' : atlasApiKey ? 'gpt-image-2' : 'gemini');
      if (selectedModel !== 'gemini' && !atlasApiKey) {
          showToast('⚠️ 此分層模型需要 Atlas Cloud Key');
          setShowKeyModal(true);
          return;
      }
      if (!effectiveApiKey) {
          showToast('⚠️ 此分層模型需要 Gemini API Key 進行物件分析');
          setShowKeyModal(true);
          return;
      }
      const plan = options.plan;
      if (!plan) {
          showToast('⚠️ 找不到已確認的分層規劃，請重新分析');
          return;
      }
      setIsGenerating(true);
      const modeLabel = selectedModel === 'seedream-v5-pro' ? '即夢 Seedream 5.0 Pro' : selectedModel === 'gpt-image-2' ? 'GPT Image 2' : 'Gemini';
      showToast(`✨ 魔法分層啟動中（${modeLabel}）...`);

      const taskIds = [...(options.includeBackground ? ['background'] : []), ...plan.layers.map(layer => layer.id)];
      const batchId = Date.now();
      const placeholderIds = new Map(taskIds.map((taskId, index) => [taskId, `${el.id}_magic_${batchId}_${index}`]));
      const taskIndex = new Map(taskIds.map((taskId, index) => [taskId, index]));
      const layerAreaLeft = options.autoArrange ? el.position.x + el.width / 2 + 30 : el.position.x - el.width / 2;
      const layerAreaTop = el.position.y - el.height / 2;
      const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
      const placeholders: ImageElement[] = taskIds.map((taskId, index) => ({
          ...el,
          id: placeholderIds.get(taskId)!,
          src: transparentPixel,
          position: {
              x: layerAreaLeft + (index % 3) * Math.max(120, el.width * 0.34) + Math.max(100, el.width * 0.3) / 2,
              y: layerAreaTop + Math.floor(index / 3) * Math.max(100, el.height * 0.34) + Math.max(80, el.height * 0.3) / 2,
          },
          width: Math.max(100, el.width * 0.3),
          height: Math.max(80, el.height * 0.3),
          zIndex: el.zIndex + index + 1,
          name: taskId === 'background' ? '背景處理中' : `${plan.layers.find(layer => layer.id === taskId)?.label || '圖層'}處理中`,
          isLocked: true,
      }));
      pauseAutoSave();
      setElements(prev => [...prev, ...placeholders]);
      setGeneratingElementIds([elementId, ...placeholderIds.values()]);
      setGeneratingLabels(Object.fromEntries(placeholders.map((placeholder, index) => [placeholder.id, `等待中 0/${taskIds.length} · ${index + 1}`])));

      let completed = 0;
      let failed = 0;
      const createLayerElement = (taskId: string, layer: LayerResult): ImageElement => {
          const index = taskIndex.get(taskId) ?? 0;
          const isBackground = !!layer.isBackground;
          const bboxX = layer.bbox?.x ?? layer.cropRatioX;
          const bboxY = layer.bbox?.y ?? layer.cropRatioY;
          const bboxRatioW = layer.bboxW ?? layer.cropRatioW;
          const bboxRatioH = layer.bboxH ?? layer.cropRatioH;
          const unionLeft = Math.max(0, Math.min(bboxX, layer.cropRatioX));
          const unionTop = Math.max(0, Math.min(bboxY, layer.cropRatioY));
          const unionRight = Math.min(1, Math.max(bboxX + bboxRatioW, layer.cropRatioX + layer.cropRatioW));
          const unionBottom = Math.min(1, Math.max(bboxY + bboxRatioH, layer.cropRatioY + layer.cropRatioH));
          const naturalRatio = layer.pixelWidth && layer.pixelHeight ? layer.pixelWidth / layer.pixelHeight : layer.cropRatioH > 0 ? layer.cropRatioW / layer.cropRatioH : 1;
          const bboxW = Math.max(1, (unionRight - unionLeft) * el.width);
          const bboxH = Math.max(1, (unionBottom - unionTop) * el.height);
          let width = isBackground ? el.width : Math.round(layer.cropRatioW * el.width);
          let height = isBackground ? el.height : Math.round(width / naturalRatio);
          if (!isBackground && options.preservePosition) {
              width = bboxW;
              height = width / naturalRatio;
              if (height > bboxH) { height = bboxH; width = height * naturalRatio; }
          }
          const gridColumn = index % 3;
          const gridRow = Math.floor(index / 3);
          const x = isBackground ? layerAreaLeft + el.width / 2 : options.preservePosition ? layerAreaLeft + unionLeft * el.width + bboxW / 2 : layerAreaLeft + gridColumn * (el.width * 0.38) + width / 2;
          const y = isBackground ? (options.autoArrange ? el.position.y : layerAreaTop + el.height / 2) : options.preservePosition ? layerAreaTop + unionTop * el.height + bboxH / 2 : layerAreaTop + gridRow * (el.height * 0.38) + height / 2;
          return { ...el, id: placeholderIds.get(taskId)!, src: layer.base64, position: { x, y }, width, height, zIndex: el.zIndex + index + 1, name: layer.name ? (layer.category ? `[${layer.category}] ${layer.name}` : layer.name) : `圖層 ${index + 1}`, isLocked: false };
      };

      try {
          const layers = await gptLayerSegment(
              el.src,
              effectiveApiKey,
              selectedModel === 'gemini' ? undefined : atlasApiKey || undefined,
              falApiKey || undefined,
              (msg) => showToast(msg),
              imageModel,
              selectedModel === 'seedream-v5-pro' ? 'seedream-v5-pro' : 'gpt-image-2',
              options,
              {
                  onLayerComplete: (taskId, layer) => {
                      completed += 1;
                      const completedElement = createLayerElement(taskId, layer);
                      setElements(prev => prev.map(item => item.id === completedElement.id ? completedElement : item), { addToHistory: false });
                      if (completedElement.src.startsWith('data:')) cacheImage(completedElement.id, completedElement.src);
                      setGeneratingElementIds([elementId, ...[...placeholderIds.values()].filter(id => id !== completedElement.id)]);
                      setGeneratingLabels(Object.fromEntries([...placeholderIds.values()].filter(id => id !== completedElement.id).map(id => [id, `已完成 ${completed}/${taskIds.length}`])));
                  },
                  onLayerFailed: (taskId) => {
                      failed += 1;
                      const placeholderId = placeholderIds.get(taskId);
                      if (placeholderId) setElements(prev => prev.filter(item => item.id !== placeholderId), { addToHistory: false });
                  },
              },
          );
          if (layers.length === 0) throw new Error('未收到任何圖層');
          const objectCount = layers.filter(l => !l.isBackground).length;
          const hasBg = layers.some(l => l.isBackground);
          showToast(`✅ 魔法分層完成！${objectCount} 個物件圖層${hasBg ? ' + 補全背景' : ''}${failed ? `，${failed} 層失敗` : ''}`);
      } catch (e: any) {
          setElements(prev => prev.filter(item => ![...placeholderIds.values()].includes(item.id) || item.type !== 'image' || item.src !== transparentPixel), { addToHistory: false });
          showToast(`❌ 魔法分層失敗：${e.message?.slice(0, 60) || '未知錯誤'}`);
      } finally {
          resumeAutoSave();
          setIsGenerating(false);
          setGeneratingElementIds([]);
          setGeneratingLabels({});
      }
  }, [atlasApiKey, effectiveApiKey, falApiKey, imageModel, generationModel, elements, setElements, showToast, setShowKeyModal, setIsGenerating, setGeneratingElementIds, setGeneratingLabels, pauseAutoSave, resumeAutoSave]);

  // --- OCR 文字辨識轉換 ---
  const handleOCRConvert = useCallback(async (elementId: string) => {
      const el = elements.find(e => e.id === elementId && e.type === 'image') as ImageElement | undefined;
      if (!el) return;

      setIsGenerating(true);
      setGeneratingElementIds([elementId]);
      showToast('🔍 正在辨識文字...');

      try {
          const blocks = await detectTextBlocks(el.src, effectiveApiKey || '');
          if (blocks.length === 0) { showToast('未偵測到文字'); return; }

          const newTextElements: TextElement[] = blocks.map((block, i) => {
              // 以圖片在畫布的實際像素換算 TextElement 的 position / width / height / fontSize
              const imgLeft   = el.position.x - el.width  / 2;
              const imgTop    = el.position.y - el.height / 2;

              const blockW    = block.bbox.w * el.width;
              const blockH    = block.bbox.h * el.height;
              const blockX    = imgLeft + block.bbox.x * el.width  + blockW / 2;
              const blockY    = imgTop  + block.bbox.y * el.height + blockH / 2;

              // fontSize：區塊高度 / 行數 × 0.78（預留行距）
              const fontSize  = Math.round((blockH / block.lines) * 0.78);

              return {
                  id: `ocr_${Date.now()}_${i}`,
                  type: 'text' as const,
                  text: block.text,
                  position: { x: blockX, y: blockY },
                  width:  blockW,
                  height: blockH,
                  rotation: 0,
                  zIndex: el.zIndex + i + 1,
                  isVisible: true,
                  isLocked: false,
                  name: `文字 ${i + 1}`,
                  groupId: null,
                  fontFamily: '"Noto Sans TC", sans-serif',
                  fontSize: Math.max(8, Math.min(fontSize, 200)),
                  color: block.colorHex,
                  align: block.align,
                  letterSpacing: 0,
                  lineHeight: 1.3,
                  isBold: block.isBold,
                  isItalic: block.isItalic,
                  isUnderline: false,
                  isWidthLocked: true,
              };
          });

          setElements(prev => [...prev, ...newTextElements]);
          showToast(`✅ 辨識完成！新增 ${blocks.length} 個文字物件`);
      } catch (e: any) {
          showToast(`❌ 文字辨識失敗：${e.message?.slice(0, 60) || '未知錯誤'}`);
      } finally {
          setIsGenerating(false);
          setGeneratingElementIds([]);
      }
  }, [effectiveApiKey, elements, setElements, showToast, setIsGenerating, setGeneratingElementIds]);

  // --- 貼紙套組一鍵切分 ---
  const handleSplitSticker = useCallback(async (elementId: string) => {
      const el = elements.find(e => e.id === elementId && e.type === 'image') as ImageElement | undefined;
      if (!el) return;

      const input = window.prompt(
          "請輸入此大圖中所含的貼圖或圖示數量（例如：3, 4, 5, 9 等），以進行精準長寬比與網格切分。\n\n若不確定請留空進行「自動偵測」：",
          ""
      );
      if (input === null) return; // 使用者按取消

      let expectedCount: number | undefined = undefined;
      if (input.trim()) {
          const parsed = parseInt(input.trim(), 10);
          if (!isNaN(parsed) && parsed > 0) {
              expectedCount = parsed;
          }
      }

      setIsGenerating(true);
      setGeneratingElementIds([elementId]);
      showToast('🪄 正在自動切分貼圖，請稍候...');

      try {
          // 下載圖片為 base64（若為 URL）
          let src = el.src;
          if (!src.startsWith('data:')) {
              src = await downloadImageAsBase64(src);
              if (!src.startsWith('data:')) {
                  showToast('⚠️ 無法讀取貼紙圖片');
                  return;
              }
          }

          // 呼叫 StickerCraft 演算法做一鍵切分
          const result = await splitStickerCollectionDetailed(src, { expectedCount });

          // 快速防呆二次確認：若透明像素比例低於 5%，通常代表此為複雜背景的一般相片，進行二次詢問
          if (result.transparentRatio !== undefined && result.transparentRatio < 0.05 && result.pieces.length > 0) {
              const confirm = window.confirm(
                  "⚠️ 偵測到此圖片可能是一般相片（無透明背景或單一純底背景）。\n\n一鍵拆分貼圖功能主要為貼紙套組設計，強行切分只會以均分網格（如四宮格/九宮格）方式裁切。\n\n您確定要繼續執行拆分嗎？"
              );
              if (!confirm) {
                  return;
              }
          }

          if (result.pieces.length === 0) {
              showToast('⚠️ 未偵測到任何獨立貼紙碎片');
              return;
          }

          const pieces = result.pieces;
          const maxZ = elements.length > 0 ? Math.max(...elements.map(e => e.zIndex)) : 0;

          // 規劃切分後的貼圖擺放位置（依 3 列網格排列於原圖右側）
          const cols = 3;
          const gap = 20;
          const startX = el.position.x + el.width / 2 + 50;
          const startY = el.position.y - el.height / 2;

          const newEls: ImageElement[] = pieces.map((piece, idx) => {
              const row = Math.floor(idx / cols);
              const col = idx % cols;
              const boxWidth = piece.box.maxX - piece.box.minX + 1;
              const boxHeight = piece.box.maxY - piece.box.minY + 1;
              const MAX_DIM = 180;
              
              let w = boxWidth;
              let h = boxHeight;
              if (w > MAX_DIM || h > MAX_DIM) {
                  if (w > h) { h = (h / w) * MAX_DIM; w = MAX_DIM; }
                  else { w = (w / h) * MAX_DIM; h = MAX_DIM; }
              }

              // 新貼圖中心點座標
              const x = startX + col * (MAX_DIM + gap) + w / 2;
              const y = startY + row * (MAX_DIM + gap) + h / 2;
              const newId = `split_piece_${Date.now()}_${idx}`;

              return {
                  id: newId,
                  type: 'image' as const,
                  src: piece.dataUrl,
                  name: `${el.name} (拆分 ${idx + 1})`,
                  position: { x, y },
                  width: w,
                  height: h,
                  rotation: 0,
                  zIndex: maxZ + 1 + idx,
                  isVisible: true,
                  isLocked: false,
                  groupId: null,
              };
          });

          // 置入畫布
          setElements(prev => [...prev, ...newEls]);
          // 緩存至 IndexedDB 確保存檔完整
          newEls.forEach(item => {
              if (item.src.startsWith('data:')) {
                  cacheImage(item.id, item.src);
              }
          });

          showToast(`✅ 拆分完成！成功新增 ${pieces.length} 張獨立去背貼圖`);
      } catch (e: any) {
          showToast(`❌ 拆分失敗：${e.message?.slice(0, 60) || '未知錯誤'}`);
      } finally {
          setIsGenerating(false);
          setGeneratingElementIds([]);
      }
  }, [elements, setElements, showToast, setIsGenerating, setGeneratingElementIds]);

  // --- NEW: Independent Handler for Image Analysis ---
  const handleExtractPrompt = useCallback(async (elementId: string) => {
      const element = elements.find(el => el.id === elementId) as ImageElement;
      if (!element || element.type !== 'image') return;

      if (!effectiveApiKey) {
          setShowKeyModal(true);
          showToast("請先設定 API Key");
          return;
      }

      setIsGenerating(true);
      setGeneratingElementIds([elementId]); // Show badge on the target image
      showToast("🔍 正在進行圖片逆向分析...");

      try {
          const result = await analyzeImagePrompt(element.src, effectiveApiKey);
          
          // Calculate positions
          // Right of the image for English note
          const enPos = { 
              x: element.position.x + element.width / 2 + 20 + 140, // 140 is half note width
              y: element.position.y - 60 
          };
          
          // Below English note for Chinese note
          const zhPos = {
              x: enPos.x,
              y: enPos.y + 370 // 350 height + 20 gap
          };

          const newNotes: CanvasElement[] = [];

          // Add Yellow Note (EN)
          zIndexCounter.current += 1;
          const enNote: NoteElement = {
              id: `${Date.now()}-note-en`,
              type: 'note',
              position: enPos,
              width: 300,
              height: 350,
              rotation: 0,
              content: result.en,
              color: 'bg-[#FFFDE7]', // Yellow-ish
              textAlign: 'left',
              zIndex: zIndexCounter.current,
              isVisible: true,
              isLocked: false,
              name: 'Prompt (EN)',
              groupId: null
          };
          newNotes.push(enNote);

          // Add Green Note (ZH)
          zIndexCounter.current += 1;
          const zhNote: NoteElement = {
              id: `${Date.now()}-note-zh`,
              type: 'note',
              position: zhPos,
              width: 300,
              height: 350,
              rotation: 0,
              content: result.zh,
              color: 'bg-[#E8F5E9]', // Green-ish
              textAlign: 'left',
              zIndex: zIndexCounter.current,
              isVisible: true,
              isLocked: false,
              name: 'Prompt (ZH)',
              groupId: null
          };
          newNotes.push(zhNote);

          // Batch update to ensure both are added
          setElements(prev => [...prev, ...newNotes]);

          showToast("提示詞提取完成！已建立中英對照便利貼 ✨");

      } catch (error) {
          console.error("Deep Extract Failed:", error);
          showToast("分析失敗，請檢查 API Key 權限或網絡連線");
      } finally {
          setIsGenerating(false);
          setGeneratingElementIds([]);
      }
  }, [elements, effectiveApiKey, setElements, showToast, zIndexCounter, setShowKeyModal, setGeneratingElementIds, setIsGenerating]);

  // --- RASTERIZE TEXT OVERRIDE (Fix: Uses Correct Dimensions with High DPI Scaling) ---
  const handleRasterizeTextOverride = useCallback(async (id: string) => {
      const element = elements.find(el => el.id === id) as TextElement;
      if (!element || element.type !== 'text') return;

      try {
          const scale = 3;
          const isCurved = Math.abs((element as any).curveStrength || 0) > 0.1;

          const shadowOverflow = element.shadowBlur
              ? Math.ceil(element.shadowBlur + 4)
              : 0;
          const glowOverflow = element.glowBlur
              ? Math.ceil(element.glowBlur)
              : 0;
          const strokeOverflow = Math.ceil((element.strokeWidth || 0) / 2);
          const effectPadding = Math.max(shadowOverflow, glowOverflow, strokeOverflow, 0);

          const canvasWidth  = element.width  + effectPadding * 2;
          const canvasHeight = element.height + effectPadding * 2;

          let newSrc: string;

          if (isCurved) {
              // 彎曲文字：直接捕捉 DOM 中的 SVG，確保像素完全吻合螢幕顯示
              // （canvas 重繪可能因字符寬度測量誤差導致弧心偏移）
              newSrc = await captureTextElementAsImage(
                  element.id,
                  element.width,
                  element.height,
                  effectPadding,
                  scale,
                  (element.backgroundColor && element.backgroundColor !== 'transparent')
                      ? element.backgroundColor
                      : undefined,
                  element.fontFamily,
                  element.text
              );
          } else {
              const offCanvas = document.createElement('canvas');
              offCanvas.width  = canvasWidth  * scale;
              offCanvas.height = canvasHeight * scale;
              const offCtx = offCanvas.getContext('2d')!;
              offCtx.scale(scale, scale);
              await document.fonts.ready;
              drawTextOnCanvas(offCtx, element, effectPadding, effectPadding);
              newSrc = offCanvas.toDataURL('image/png');
          }

          const newImage: ImageElement = {
              id: element.id,
              type: 'image',
              src: newSrc,
              position: {
                  x: element.position.x,
                  y: element.position.y,
              },
              width:    canvasWidth,
              height:   canvasHeight,
              rotation: element.rotation,
              zIndex:   element.zIndex,
              isVisible: element.isVisible,
              isLocked:  element.isLocked,
              name:     `${element.name} (Image)`,
              groupId:  element.groupId
          };

          setElements(prev => prev.map(el => el.id === id ? newImage : el));
          showToast("文字已轉換為圖片，效果完整保留 ✨");

      } catch (e) {
          console.error("Rasterize failed", e);
          showToast("文字轉換圖片失敗");
      }
  }, [elements, setElements, showToast]);

  const handleMergeLayersOverride = useCallback(async () => {
      await originalMergeLayers();
  }, [originalMergeLayers]);

  return {
    handleBiRefNetRemoveBackground,
    handleMagicLayer,
    handleOCRConvert,
    handleSplitSticker,
    handleExtractPrompt,
    handleRasterizeTextOverride,
    handleMergeLayersOverride,
  };
};
