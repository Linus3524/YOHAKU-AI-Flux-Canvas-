// 設計大師 — 網頁 UI Skill
import { SkillOption } from './sticker';

export interface UiWebpageSkillConfig {
  type: string;
  brand: string;
  visualStyle: string;
  layout: string;
  platform: string;
  resolution: string;
}

export const UI_WEBPAGE_DEFAULT_CONFIG: UiWebpageSkillConfig = {
  type: 'landing-page',
  brand: '',         // 三層皆選填，預設未選擇（留空則不注入對應指令，交由 AI 自由決定）
  visualStyle: '',
  layout: '',
  platform: 'pc',
  resolution: 'desktop-hd',
};

export const UI_TYPES: SkillOption[] = [
  { id: 'landing-page', name: 'Landing Page', name_zh: '首頁 Landing Page', desc: '品牌宣傳、產品介紹首頁排版', promptModifier: 'Landing page interface design. Complete web viewport showing headline, navigation bar, hero CTA buttons, and feature section. Clean structure.' },
  { id: 'dashboard', name: 'Dashboard', name_zh: '後台控制台 Dashboard', desc: '資料看板、SaaS 後台管理介面', promptModifier: 'SaaS dashboard console interface. Displays metric charts, sidebar navigation, data grid tables, filter search boxes, and user avatar headers.' },
  { id: 'hero-section', name: 'Hero Section', name_zh: '主視覺區 Hero Section', desc: '網頁頂部主視覺排版', promptModifier: 'Webpage hero section. Massive typography headline, subtext, primary CTA buttons, and organic gradient background graphic.' },
  { id: 'pricing-table', name: 'Pricing Table', name_zh: '定價方案 Pricing Table', desc: '產品收費方案、功能對比圖卡', promptModifier: 'Product pricing plan columns. Shows 3 subscription tiers side-by-side: Free, Pro (highlighted), and Enterprise. List of checkmarks for features, price text, and action buttons.' },
  { id: 'contact-form', name: 'Contact Form', name_zh: '聯絡表單 Contact Form', desc: '輸入欄位、對齊排版的聯絡頁面', promptModifier: 'Clean contact form interface. Input fields for Name, Email, Message, with placeholder text, focus states, and a submit button.' },
  { id: 'mobile-app', name: 'Mobile App', name_zh: '行動應用 UI Mobile App', desc: '手機 App 介面、行動端縱向排版', promptModifier: 'Mobile phone application screen layout. Vertical container, bottom navigation tabs, card feed, and circular user avatars.' },
  { id: 'portfolio', name: 'Portfolio', name_zh: '個人作品集 Portfolio', desc: '設計作品展示、卡片網格排版', promptModifier: 'Design portfolio webpage. Grid layout displaying thumbnail cards, filter tags (Web, App, Branding), and typography titles.' },
];

// ── 平台 ──────────────────────────────────────────────────────
export interface UiPlatform {
  id: string;
  name: string;
  name_zh: string;
  iconName: string; // Google Material Symbol name
}

export const UI_PLATFORMS: UiPlatform[] = [
  { id: 'mobile', name: 'Mobile', name_zh: '手機', iconName: 'smartphone' },
  { id: 'tablet', name: 'Tablet', name_zh: '平板', iconName: 'tablet_mac' },
  { id: 'pc', name: 'Desktop', name_zh: '桌面端', iconName: 'desktop_windows' },
  { id: 'browser', name: 'Browser', name_zh: '瀏覽器', iconName: 'language' },
];

// ── 解析度預設 ────────────────────────────────────────────────
export interface UiResolution {
  id: string;
  name: string;
  name_zh: string;
  width: number;
  height: number;
  platform: string;
}

export const UI_RESOLUTIONS: UiResolution[] = [
  // 手機（直向）
  { id: 'mobile-sm', name: 'Mobile Small (iPhone SE)', name_zh: '小螢幕手機 (375×667)', width: 375, height: 667, platform: 'mobile' },
  { id: 'mobile-md', name: 'Mobile Medium (iOS Standard)', name_zh: '標準手機 (390×844)', width: 390, height: 844, platform: 'mobile' },
  { id: 'mobile-lg', name: 'Mobile Large (Pro Max)', name_zh: '大螢幕手機 (430×932)', width: 430, height: 932, platform: 'mobile' },
  { id: 'mobile-android', name: 'Android Standard', name_zh: 'Android 標準 (360×800)', width: 360, height: 800, platform: 'mobile' },
  // 手機（橫向）
  { id: 'mobile-land-sm', name: 'Mobile Landscape (Small)', name_zh: '手機橫向螢幕 (667×375)', width: 667, height: 375, platform: 'mobile' },
  { id: 'mobile-land-md', name: 'Mobile Landscape (Std)', name_zh: '手機橫向螢幕 (844×390)', width: 844, height: 390, platform: 'mobile' },

  // 平板（直向）
  { id: 'tablet-sm', name: 'Tablet Small (iPad Mini)', name_zh: '小螢幕平板 (744×1133)', width: 744, height: 1133, platform: 'tablet' },
  { id: 'tablet-md', name: 'Tablet Medium (iPad Air)', name_zh: '標準平板 (820×1180)', width: 820, height: 1180, platform: 'tablet' },
  { id: 'tablet-lg', name: 'Tablet Large (iPad Pro)', name_zh: '大螢幕平板 (1024×1366)', width: 1024, height: 1366, platform: 'tablet' },
  // 平板（橫向）
  { id: 'tablet-land-sm', name: 'Tablet Landscape (Small)', name_zh: '平板橫向螢幕 (1133×744)', width: 1133, height: 744, platform: 'tablet' },
  { id: 'tablet-land-md', name: 'Tablet Landscape (Std)', name_zh: '平板橫向螢幕 (1180×820)', width: 1180, height: 820, platform: 'tablet' },
  { id: 'tablet-land-lg', name: 'Tablet Landscape (Pro)', name_zh: '平板橫向螢幕 (1366×1024)', width: 1366, height: 1024, platform: 'tablet' },

  // 桌面端
  { id: 'laptop-sm', name: 'Laptop (13")', name_zh: '筆電 13" (1280×800)', width: 1280, height: 800, platform: 'pc' },
  { id: 'laptop-md', name: 'Laptop (15")', name_zh: '筆電 15" (1440×900)', width: 1440, height: 900, platform: 'pc' },
  { id: 'desktop-hd', name: 'Desktop HD', name_zh: '桌面顯示器 (1920×1080)', width: 1920, height: 1080, platform: 'pc' },
  { id: 'desktop-2k', name: 'Desktop 2K', name_zh: '2K 顯示器 (2560×1440)', width: 2560, height: 1440, platform: 'pc' },

  // 瀏覽器
  { id: 'browser-hd', name: 'Browser Window HD', name_zh: '瀏覽器視窗 HD (1280×720)', width: 1280, height: 720, platform: 'browser' },
  { id: 'browser-full', name: 'Browser Full', name_zh: '瀏覽器全螢幕 (1440×900)', width: 1440, height: 900, platform: 'browser' },
];

/** 根據解析度的寬高推算最接近的 aspect ratio 字串 */
export function resolveAspectFromResolution(resId: string): string {
  const res = UI_RESOLUTIONS.find(r => r.id === resId);
  if (!res) return '16:9';
  const ratio = res.width / res.height;
  if (Math.abs(ratio - 16 / 9) < 0.08) return '16:9';
  if (Math.abs(ratio - 4 / 3) < 0.08) return '4:3';
  if (Math.abs(ratio - 1) < 0.08) return '1:1';
  if (Math.abs(ratio - 3 / 4) < 0.08) return '3:4';
  if (Math.abs(ratio - 9 / 16) < 0.08) return '9:16';
  // Fallback: pick closest
  if (ratio > 1.3) return '16:9';
  if (ratio > 0.9) return '4:3';
  if (ratio > 0.65) return '3:4';
  return '9:16';
}

export const UI_WEBPAGE_OPTION_GROUPS = [
  { key: 'type' as const, label: '介面類型', options: UI_TYPES },
  { key: 'brand' as const, label: '品牌規格書', options: [] as SkillOption[] },
  { key: 'visualStyle' as const, label: '視覺風格', options: [] as SkillOption[] },
  { key: 'layout' as const, label: '佈局密度策略', options: [] as SkillOption[] },
  // platform & resolution are rendered as custom UI, not standard option grids
];

export function buildUiWebpagePrompt(content: string, config: UiWebpageSkillConfig): string {
  const typeMod = UI_TYPES.find(o => o.id === config.type)?.promptModifier ?? '';

  // Resolve platform & resolution for prompt injection
  const platform = UI_PLATFORMS.find(p => p.id === config.platform);
  const resolution = UI_RESOLUTIONS.find(r => r.id === config.resolution);
  const platformDesc = platform ? `${platform.name} (${platform.name_zh})` : 'Desktop';
  const resolutionDesc = resolution ? `${resolution.width}×${resolution.height} pixels` : '1920×1080 pixels';
  const aspectRatio = resolveAspectFromResolution(config.resolution);

  return `
Create a professional user interface (UI) design screenshot.

UI TYPE: ${config.type}
${typeMod}

TARGET PLATFORM: ${platformDesc}
VIEWPORT RESOLUTION: ${resolutionDesc}
ASPECT RATIO: ${aspectRatio}

DESIGN PRINCIPLES:
- Flat layout, crisp details, high fidelity mockup
- Perfect alignment, clean spacing, and modern grid
- NO physical devices (laptops, phones, tablets) unless requested; show only the UI viewport itself
- Correct typographic hierarchy and readable placeholder text
- Design must feel native to the target platform (${platformDesc})

CONTENT / BRAND TOPIC:
${content}
  `.trim();
}
