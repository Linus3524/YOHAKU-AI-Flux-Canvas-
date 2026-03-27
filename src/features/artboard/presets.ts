export interface ArtboardPreset {
  group: string;
  name: string;
  w: number;
  h: number;
}

export const ARTBOARD_PRESETS: ArtboardPreset[] = [
  // 社群媒體
  { group: '社群媒體', name: 'IG 貼文 1:1',    w: 1080, h: 1080 },
  { group: '社群媒體', name: 'IG 直式 4:5',     w: 1080, h: 1350 },
  { group: '社群媒體', name: 'IG 限時動態',      w: 1080, h: 1920 },
  { group: '社群媒體', name: 'Threads 直式',     w: 1080, h: 1440 },
  { group: '社群媒體', name: 'Facebook 封面',    w: 1640, h: 624  },
  // 網頁
  { group: '網頁',     name: 'Web HD 1920',      w: 1920, h: 1080 },
  { group: '網頁',     name: 'Web 1440',          w: 1440, h: 900  },
  { group: '網頁',     name: '手機 375',           w: 375,  h: 812  },
  // 印刷（300dpi px）
  { group: '印刷',     name: 'A4 直式',           w: 2480, h: 3508 },
  { group: '印刷',     name: 'A4 橫式',           w: 3508, h: 2480 },
  { group: '印刷',     name: 'A5 直式',           w: 1748, h: 2480 },
  { group: '印刷',     name: '名片',              w: 1039, h: 591  },
  // 自訂
  { group: '自訂',     name: '自訂尺寸',           w: 800,  h: 600  },
];

// 依群組分組的工具函數
export const getPresetsByGroup = () => {
  const groups: Record<string, ArtboardPreset[]> = {};
  ARTBOARD_PRESETS.forEach(p => {
    if (!groups[p.group]) groups[p.group] = [];
    groups[p.group].push(p);
  });
  return groups;
};
