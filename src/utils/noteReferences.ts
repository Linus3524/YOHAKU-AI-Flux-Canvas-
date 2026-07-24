import type { NoteReferenceMode, NoteReferenceRole } from '../types';

export const NOTE_REFERENCE_LIMIT = 8;

export const NOTE_REFERENCE_ROLE_OPTIONS: ReadonlyArray<{
  id: NoteReferenceRole;
  label: string;
  instruction: string;
}> = [
  { id: 'subject', label: '人物／角色', instruction: 'subject identity, face, body features, and recognizable appearance' },
  { id: 'outfit', label: '服裝／產品', instruction: 'clothing, accessories, product shape, materials, and product details' },
  { id: 'pose', label: '姿勢／構圖', instruction: 'pose, camera angle, framing, spatial layout, and composition' },
  { id: 'style', label: '風格／材質', instruction: 'visual style, rendering, texture, materials, and artistic treatment' },
  { id: 'background', label: '背景／環境', instruction: 'background, environment, scenery, and surrounding spatial context' },
  { id: 'lighting', label: '光線／色彩', instruction: 'lighting direction, color palette, contrast, and atmosphere' },
];

export interface NoteReferencePromptEntry {
  mode: NoteReferenceMode;
  roles: NoteReferenceRole[];
  isPrimary: boolean;
}

const roleInstruction = (roles: NoteReferenceRole[]): string =>
  roles
    .map(role => NOTE_REFERENCE_ROLE_OPTIONS.find(option => option.id === role)?.instruction)
    .filter((value): value is string => !!value)
    .join('; ');

/**
 * 依實際送入模型的圖片順序建立參考規則。
 * startImageIndex 是這批便利貼參考圖在完整 images/parts 陣列中的 1-based 起始編號。
 */
export function buildNoteReferencePrompt(
  entries: NoteReferencePromptEntry[],
  startImageIndex = 1,
): string {
  if (entries.length === 0) return '';

  const hasDirected = entries.some(entry => entry.mode === 'directed');
  if (!hasDirected) {
    const endImageIndex = startImageIndex + entries.length - 1;
    const range = entries.length === 1
      ? `IMAGE ${startImageIndex}`
      : `IMAGES ${startImageIndex}–${endImageIndex}`;
    return `[REFERENCE MODE: FREE BLEND]
Treat ${range} as a shared visual moodboard. Synthesize their useful subject, style, material, color, composition, and atmosphere cues into one coherent new result according to the user's prompt.
Do not create a collage, split-screen, contact sheet, or literal copy of any single reference. Resolve conflicts naturally and keep the final image visually unified.`;
  }

  const rules = entries.map((entry, index) => {
    const imageNumber = startImageIndex + index;
    if (entry.mode !== 'directed') {
      return `- IMAGE ${imageNumber}: supporting free-blend reference; use only cues that do not conflict with the directed references or user prompt.`;
    }
    const use = roleInstruction(entry.roles);
    const primary = entry.isPrimary ? ' PRIMARY REFERENCE.' : '';
    return `- IMAGE ${imageNumber}:${primary} Use only for ${use || 'the visually relevant details explicitly requested by the user'}. Do not copy unrelated content from this image.`;
  });

  return `[REFERENCE MODE: DIRECTED]
The user has assigned explicit purposes to the attached references. The written user prompt remains authoritative.
${rules.join('\n')}
Do not infer unassigned roles, do not mix unrelated subjects, and do not copy reference backgrounds, text, logos, or layouts unless their assigned role explicitly requires it. Produce one coherent image, never a collage.`;
}
