export interface BasicImageAdjustments { brightness: number; contrast: number; saturation: number; temperature: number }

export function applyImageAdjustments(src: string, values: BasicImageAdjustments): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: values.temperature !== 0 });
      if (!ctx) return reject(new Error('無法建立圖片處理畫布'));
      ctx.filter = `brightness(${values.brightness}%) contrast(${values.contrast}%) saturate(${values.saturation}%)`;
      ctx.drawImage(image, 0, 0); ctx.filter = 'none';
      if (values.temperature !== 0) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const amount = values.temperature / 100;
        for (let i = 0; i < imageData.data.length; i += 4) {
          if (imageData.data[i + 3] === 0) continue;
          imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + 48 * amount));
          imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] - 48 * amount));
        }
        ctx.putImageData(imageData, 0, 0);
      }
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = () => reject(new Error('無法讀取調色圖片'));
    image.src = src;
  });
}
