import { SimpleFadeOptions } from '../types';

export function generateSimpleMaskCSS(options: SimpleFadeOptions): string {
  if (!options || options.direction === 'none') {
    return '';
  }

  const { direction, intensity } = options;

  // 使用多個顏色節點來模擬平滑/非線性漸層，讓邊緣淡出更柔和
  const linearStops = `transparent 0%, rgba(0,0,0, 0.05) ${intensity * 0.25}%, rgba(0,0,0, 0.2) ${intensity * 0.5}%, rgba(0,0,0, 0.5) ${intensity * 0.75}%, black ${intensity}%`;
  const radialStops = `black ${100 - intensity}%, rgba(0,0,0, 0.5) ${100 - intensity * 0.75}%, rgba(0,0,0, 0.2) ${100 - intensity * 0.5}%, rgba(0,0,0, 0.05) ${100 - intensity * 0.25}%, transparent 100%`;

  switch (direction) {
    case 'top':
      return `linear-gradient(to bottom, ${linearStops})`;
    case 'bottom':
      return `linear-gradient(to top, ${linearStops})`;
    case 'left':
      return `linear-gradient(to right, ${linearStops})`;
    case 'right':
      return `linear-gradient(to left, ${linearStops})`;
    case 'radial':
      return `radial-gradient(closest-side, ${radialStops})`;
    default:
      return '';
  }
}
