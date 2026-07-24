// 設計大師 Skills 統一對接與註冊中心
import { StickerSkillConfig, STICKER_DEFAULT_CONFIG, STICKER_OPTION_GROUPS, buildStickerPrompt } from './sticker';
import { CoverImageSkillConfig, COVER_DEFAULT_CONFIG, COVER_OPTION_GROUPS, buildCoverImagePrompt } from './coverImage';
import { LogoSkillConfig, LOGO_DEFAULT_CONFIG, LOGO_OPTION_GROUPS, buildLogoPrompt } from './logo';
import { InfographicSkillConfig, INFOGRAPHIC_DEFAULT_CONFIG, INFOGRAPHIC_OPTION_GROUPS, buildInfographicPrompt } from './infographic';
import { SocialCardSkillConfig, SOCIAL_DEFAULT_CONFIG, SOCIAL_OPTION_GROUPS, buildSocialCardPrompt } from './socialCard';
import { ArticleIllustratorSkillConfig, ILLUSTRATOR_DEFAULT_CONFIG, ILLUSTRATOR_OPTION_GROUPS, buildArticleIllustratorPrompt } from './articleIllustrator';
import { ComicSkillConfig, COMIC_DEFAULT_CONFIG, COMIC_OPTION_GROUPS, buildComicPrompt } from './comic';
import { SlideDeckSkillConfig, SLIDE_DEFAULT_CONFIG, SLIDE_OPTION_GROUPS, buildSlideDeckPrompt } from './slideDeck';
import { UiWebpageSkillConfig, UI_WEBPAGE_DEFAULT_CONFIG, UI_WEBPAGE_OPTION_GROUPS, buildUiWebpagePrompt } from './uiWebpage';
import { IconSkillConfig, ICON_DEFAULT_CONFIG, ICON_OPTION_GROUPS, buildIconPrompt } from './icon';
import { STYLE_PRESETS } from '../utils/helpers';
import { VISUAL_STYLE_TEMPLATES } from './styles';
import { DESIGN_MD_TEMPLATES } from './designs';
import { LAYOUT_DENSITY_TEMPLATES } from './layouts';

export const SKILL_STYLE_KEYS: Record<SkillType, string> = {
  sticker: 'style',
  cover: 'rendering',
  logo: 'style',
  icon: 'style',
  infographic: 'style',
  social: 'style',
  illustrator: 'style',
  comic: 'art',
  slide: 'preset',
  uiWebpage: 'brand',
};

// 第二層獨立疊加：視覺風格（氛圍/質感/色彩情緒），與品牌規格書分開注入
export const SKILL_VISUAL_KEYS: Partial<Record<SkillType, string>> = {
  uiWebpage: 'visualStyle',
};

// 第三層獨立疊加：只管版面結構/留白密度，與色彩字體、視覺氛圍分開注入、互不衝突
export const SKILL_LAYOUT_KEYS: Partial<Record<SkillType, string>> = {
  uiWebpage: 'layout',
};

export type SkillType =
  | 'sticker'
  | 'cover'
  | 'logo'
  | 'icon'
  | 'infographic'
  | 'social'
  | 'illustrator'
  | 'comic'
  | 'slide'
  | 'uiWebpage';

export interface SkillMetadata {
  id: SkillType;
  name: string;
  name_zh: string;
  desc: string;
  defaultConfig: any;
  optionGroups: any[];
}

export const SKILL_LIST: SkillMetadata[] = [
  {
    id: 'sticker',
    name: 'LINE Sticker',
    name_zh: 'LINE 貼圖',
    desc: '專為 LINE 貼圖設計：隨形白邊、自動去背透明、可一鍵生成整套（2~20 張）',
    defaultConfig: STICKER_DEFAULT_CONFIG,
    optionGroups: STICKER_OPTION_GROUPS,
  },
  {
    id: 'cover',
    name: 'Cover Image',
    name_zh: '精緻封面',
    desc: '適合部落格、簡報或社群的首圖封面',
    defaultConfig: COVER_DEFAULT_CONFIG,
    optionGroups: COVER_OPTION_GROUPS,
  },
  {
    id: 'logo',
    name: 'Logo Design',
    name_zh: '標誌設計',
    desc: '品牌標準字、徽章與商標設計',
    defaultConfig: LOGO_DEFAULT_CONFIG,
    optionGroups: LOGO_OPTION_GROUPS,
  },
  {
    id: 'icon',
    name: 'Icon Design',
    name_zh: '圖示設計',
    desc: '極簡、扁平、3D等各式圖示，支援單張與自訂張數套組生成',
    defaultConfig: ICON_DEFAULT_CONFIG,
    optionGroups: ICON_OPTION_GROUPS,
  },
  {
    id: 'infographic',
    name: 'Infographic',
    name_zh: '資訊圖表',
    desc: '將繁雜內容整理為便當網格、流程圖、對比圖等',
    defaultConfig: INFOGRAPHIC_DEFAULT_CONFIG,
    optionGroups: INFOGRAPHIC_OPTION_GROUPS,
  },
  {
    id: 'social',
    name: 'Social Card',
    name_zh: '社群圖卡',
    desc: '適合 Instagram、Threads、Facebook 或小紅書的排版圖卡',
    defaultConfig: SOCIAL_DEFAULT_CONFIG,
    optionGroups: SOCIAL_OPTION_GROUPS,
  },
  {
    id: 'illustrator',
    name: 'Article Illustrator',
    name_zh: '文章插畫',
    desc: '為文章主要章節生成風格一致的概念插圖',
    defaultConfig: ILLUSTRATOR_DEFAULT_CONFIG,
    optionGroups: ILLUSTRATOR_OPTION_GROUPS,
  },
  {
    id: 'comic',
    name: 'Knowledge Comic',
    name_zh: '知識漫畫',
    desc: '用多格漫畫分鏡來講解故事或教育知識點',
    defaultConfig: COMIC_DEFAULT_CONFIG,
    optionGroups: COMIC_OPTION_GROUPS,
  },
  {
    id: 'slide',
    name: 'Slide Deck',
    name_zh: '簡報投影片',
    desc: '生成排版完整、適合社群分享的單頁簡報',
    defaultConfig: SLIDE_DEFAULT_CONFIG,
    optionGroups: SLIDE_OPTION_GROUPS,
  },
  {
    id: 'uiWebpage',
    name: 'UI Webpage',
    name_zh: '網頁 UI',
    desc: '網頁設計、SaaS 介面、Landing Page 等 UI 版面設計',
    defaultConfig: UI_WEBPAGE_DEFAULT_CONFIG,
    optionGroups: UI_WEBPAGE_OPTION_GROUPS,
  },
];

export function buildSkillPrompt(type: SkillType, content: string, config: any, referenceImages?: (string | null)[]): string {
  let basePrompt = '';
  switch (type) {
    case 'sticker':
      basePrompt = buildStickerPrompt(content, config as StickerSkillConfig);
      break;
    case 'cover':
      basePrompt = buildCoverImagePrompt(content, config as CoverImageSkillConfig);
      break;
    case 'logo':
      basePrompt = buildLogoPrompt(content, config as LogoSkillConfig);
      break;
    case 'icon':
      basePrompt = buildIconPrompt(content, config as IconSkillConfig);
      break;
    case 'infographic':
      basePrompt = buildInfographicPrompt(content, config as InfographicSkillConfig);
      break;
    case 'social':
      basePrompt = buildSocialCardPrompt(content, config as SocialCardSkillConfig);
      break;
    case 'illustrator':
      basePrompt = buildArticleIllustratorPrompt(content, config as ArticleIllustratorSkillConfig);
      break;
    case 'comic':
      basePrompt = buildComicPrompt(content, config as ComicSkillConfig);
      break;
    case 'slide':
      basePrompt = buildSlideDeckPrompt(content, config as SlideDeckSkillConfig);
      break;
    case 'uiWebpage':
      basePrompt = buildUiWebpagePrompt(content, config as UiWebpageSkillConfig);
      break;
    default:
      throw new Error(`Unsupported skill type: ${type}`);
  }

  const styleKey = SKILL_STYLE_KEYS[type];
  if (styleKey && config && config[styleKey]) {
    const selectedStyleId = config[styleKey];
    if (selectedStyleId === 'ref-style') {
      const refIdx = config.refStyleIndex !== undefined ? config.refStyleIndex : 0;
      const refScope = config.refStyleScope || 'all';
      const circledNums = ['①','②','③','④','⑤','⑥','⑦','⑧'];
      const referenceRule = refScope === 'style-only'
        ? `[MANDATORY REFERENCE RULE - STYLE ONLY]
"Reference Image ${circledNums[refIdx]}" is a STYLE SOURCE ONLY.
Inherit its color palette, line weights, materials, lighting, texture, brushwork, and aesthetic rendering.
DO NOT copy or inherit its subject identity, pose, action, composition, framing, camera angle, spatial layout, text, or object arrangement.
The semantic content, subject, pose, composition, and layout must follow the user's content and the other design settings in this prompt.`
        : `[MANDATORY REFERENCE RULE - STYLE & STRUCTURE INHERITANCE]
Use "Reference Image ${circledNums[refIdx]}" as the primary style and structure source.
Inherit its pose, layout, subject treatment, composition, color choices, line weights, materials, lighting, and aesthetic rendering.
Adapt those characteristics to the user's requested content while keeping the output visually consistent with the selected reference.`;
      basePrompt = `${basePrompt}\n\n============================================================\n${referenceRule}\n============================================================`;
    } else {
      const visualTemplate = VISUAL_STYLE_TEMPLATES.find(t => t.id === selectedStyleId)
        || DESIGN_MD_TEMPLATES.find(t => t.id === selectedStyleId);
        
      if (visualTemplate) {
        basePrompt = `${basePrompt}\n\n============================================================\n[MANDATORY DESIGN SYSTEM SPECIFICATION TO FOLLOW]\nAdhere strictly to this design spec for colors (Hex), typography rules, card/button styles, and layout:\n\n${visualTemplate.content}\n============================================================`;
      } else {
        const customStyle = STYLE_PRESETS.find(p => p.id === selectedStyleId);
        if (customStyle) {
          basePrompt = `${basePrompt}\n\nOVERRIDE VISUAL STYLE / ART DIRECTION:\nApply this visual style preset: ${customStyle.prompt}`;
        }
      }
    }
  }

  // 一般參考圖的自由融合／指定用途規則由生成管線依實際圖片順序附加；
  // 此處只處理使用者在設計大師明確選擇的「維持參考圖風格」設定。

  const visualKey = SKILL_VISUAL_KEYS[type];
  if (visualKey && config && config[visualKey]) {
    const vt = VISUAL_STYLE_TEMPLATES.find(t => t.id === config[visualKey]);
    if (vt) {
      basePrompt = `${basePrompt}\n\n============================================================\n[VISUAL STYLE REFERENCE]\nApply this visual style aesthetic to the overall mood, artistic treatment, texture and color character (this governs AESTHETIC MOOD ONLY — the brand design system and layout structure are governed by their own sections):\n\n${vt.content}\n============================================================`;
    }
  }

  const layoutKey = SKILL_LAYOUT_KEYS[type];
  if (layoutKey && config && config[layoutKey]) {
    const layoutTemplate = LAYOUT_DENSITY_TEMPLATES.find(t => t.id === config[layoutKey]);
    if (layoutTemplate) {
      basePrompt = `${basePrompt}\n\n============================================================\n[LAYOUT DENSITY STRATEGY TO FOLLOW]\nApply this layout density and structural strategy for element spacing, grid, and information hierarchy (this governs SPACING/STRUCTURE ONLY — colors and typography are governed separately above):\n\n${layoutTemplate.content}\n============================================================`;
    }
  }

  return `${basePrompt}\n\nIMPORTANT LANGUAGE REQUIREMENT:\nIf this design contains any rendered text, labels, titles, sub-headings, paragraphs, bullet points or speech bubbles inside the image, you MUST write them in the SAME language as the provided content (e.g. if the user's content is in Traditional Chinese, use Traditional Chinese; if it is in English, use English; if it is in Japanese, use Japanese). Do not translate the user's text into another language, and do not use generic English text or English placeholders unless the user's content is in English.`.trim();
}
