// 設計大師 — 網頁 UI「佈局密度策略」庫
// 與 styles/、designs/ 同一套疊加邏輯：作為獨立的指令區塊插入 prompt，
// 只管「留白/資訊密度/版面結構」，不碰色彩與字體，故與品牌規格書/藝術風格不衝突。
// 內容改寫自 MuseUI（MIT）的 layouts skill。

import sparseMd from './sparse.md?raw';
import balancedMd from './balanced.md?raw';
import denseMd from './dense.md?raw';
import heroCentricMd from './hero-centric.md?raw';
import cardGridMd from './card-grid.md?raw';
import sidebarNavMd from './sidebar-nav.md?raw';
import timelineFlowMd from './timeline-flow.md?raw';
import splitScreenMd from './split-screen.md?raw';

export interface LayoutDensityTemplate {
  id: string;
  name: string;
  name_zh: string;
  category: 'Density' | 'Structure' | 'Flow';
  desc: string;
  content: string;
}

export const LAYOUT_DENSITY_TEMPLATES: LayoutDensityTemplate[] = [
  {
    id: 'sparse',
    name: 'Sparse',
    name_zh: '極簡留白',
    category: 'Density',
    desc: '單焦點、大量留白，每屏 3-5 個元素',
    content: sparseMd,
  },
  {
    id: 'balanced',
    name: 'Balanced',
    name_zh: '均衡網格',
    category: 'Density',
    desc: '經典網格、舒適間距，每屏 6-10 個元素',
    content: balancedMd,
  },
  {
    id: 'dense',
    name: 'Dense',
    name_zh: '高密度看板',
    category: 'Density',
    desc: '儀表盤式高密度，每屏 15-25 個元素',
    content: denseMd,
  },
  {
    id: 'hero-centric',
    name: 'Hero Centric',
    name_zh: '大圖主視覺',
    category: 'Structure',
    desc: '大圖佔據 50-70% 版面，適合行銷頁',
    content: heroCentricMd,
  },
  {
    id: 'card-grid',
    name: 'Card Grid',
    name_zh: '卡片網格',
    category: 'Structure',
    desc: '模組化卡片網格，每行 2-4 張',
    content: cardGridMd,
  },
  {
    id: 'sidebar-nav',
    name: 'Sidebar Nav',
    name_zh: '側邊導覽',
    category: 'Structure',
    desc: '常駐側邊欄樹狀導覽＋主內容區，適合工具型應用',
    content: sidebarNavMd,
  },
  {
    id: 'timeline-flow',
    name: 'Timeline Flow',
    name_zh: '時間軸流程',
    category: 'Flow',
    desc: '步驟導向時間軸，適合導引與引導流程',
    content: timelineFlowMd,
  },
  {
    id: 'split-screen',
    name: 'Split Screen',
    name_zh: '左右分屏',
    category: 'Structure',
    desc: '雙區分屏，用於對比展示或圖文配對',
    content: splitScreenMd,
  },
];
