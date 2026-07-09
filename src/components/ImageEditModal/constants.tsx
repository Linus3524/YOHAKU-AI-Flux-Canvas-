import { Icon } from '../Icon';

export const MAX_REFERENCE_IMAGES = 3;

export interface ImageAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  highlight: number;
  shadow: number;
  sharpness: number;
}

export const defaultAdjustments: ImageAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  temperature: 0,
  tint: 0,
  highlight: 0,
  shadow: 0,
  sharpness: 0,
};

export const BRUSH_SIZES = [10, 20, 40, 60];
export const MASK_COLOR = 'rgba(255, 59, 48, 0.5)'; // Increased opacity slightly for clearer AI visibility
export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 5;

export const EditIcons = {
    Undo:   () => <Icon name="undo" size={16} />,
    Redo:   () => <Icon name="redo" size={16} />,
    Eye:    () => <Icon name="visibility" size={16} />,
    EyeOff: () => <Icon name="visibility_off" size={16} />,
    Trash:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
};

export const removeModelOptions = [
  { key: 'cloud' as const, label: '雲端模式', desc: '依據頂部 Model 設定' },
  { key: 'lama' as const, label: '本機 LaMa', desc: '背景/紋理填補 (極速)' },
  { key: 'mi_gan' as const, label: '本機 MI-GAN', desc: '人物/五官/結構修復' }
];
