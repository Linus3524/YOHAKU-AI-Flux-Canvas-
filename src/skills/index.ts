// 設計大師 Skills 統一對接與註冊中心
import { StickerSkillConfig, STICKER_DEFAULT_CONFIG, STICKER_OPTION_GROUPS, buildStickerPrompt } from './sticker';
import { CoverImageSkillConfig, COVER_DEFAULT_CONFIG, COVER_OPTION_GROUPS, buildCoverImagePrompt } from './coverImage';
import { LogoSkillConfig, LOGO_DEFAULT_CONFIG, LOGO_OPTION_GROUPS, buildLogoPrompt } from './logo';
import { InfographicSkillConfig, INFOGRAPHIC_DEFAULT_CONFIG, INFOGRAPHIC_OPTION_GROUPS, buildInfographicPrompt } from './infographic';
import { SocialCardSkillConfig, SOCIAL_DEFAULT_CONFIG, SOCIAL_OPTION_GROUPS, buildSocialCardPrompt } from './socialCard';
import { ArticleIllustratorSkillConfig, ILLUSTRATOR_DEFAULT_CONFIG, ILLUSTRATOR_OPTION_GROUPS, buildArticleIllustratorPrompt } from './articleIllustrator';
import { ComicSkillConfig, COMIC_DEFAULT_CONFIG, COMIC_OPTION_GROUPS, buildComicPrompt } from './comic';
import { SlideDeckSkillConfig, SLIDE_DEFAULT_CONFIG, SLIDE_OPTION_GROUPS, buildSlideDeckPrompt } from './slideDeck';

export type SkillType =
  | 'sticker'
  | 'cover'
  | 'logo'
  | 'infographic'
  | 'social'
  | 'illustrator'
  | 'comic'
  | 'slide';

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
    name: 'Sticker Design',
    name_zh: '模切貼圖',
    desc: '自動生成帶白邊與透明底的印刷質感貼圖',
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
];

export function buildSkillPrompt(type: SkillType, content: string, config: any): string {
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
    default:
      throw new Error(`Unsupported skill type: ${type}`);
  }

  return `${basePrompt}\n\nIMPORTANT LANGUAGE REQUIREMENT:\nIf this design contains any rendered text, labels, titles, sub-headings, paragraphs, bullet points or speech bubbles inside the image, you MUST write them in the SAME language as the provided content (e.g. if the user's content is in Traditional Chinese, use Traditional Chinese; if it is in English, use English; if it is in Japanese, use Japanese). Do not translate the user's text into another language, and do not use generic English text or English placeholders unless the user's content is in English.`.trim();
}
