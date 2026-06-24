import claudeMd from './claude.md?raw';
import cohereMd from './cohere.md?raw';
import elevenlabsMd from './elevenlabs.md?raw';
import minimaxMd from './minimax.md?raw';
import mistral_aiMd from './mistral-ai.md?raw';
import ollamaMd from './ollama.md?raw';
import opencode_aiMd from './opencode-ai.md?raw';
import replicateMd from './replicate.md?raw';
import runwaymlMd from './runwayml.md?raw';
import together_aiMd from './together-ai.md?raw';
import voltagentMd from './voltagent.md?raw';
import x_aiMd from './x-ai.md?raw';
import cursorMd from './cursor.md?raw';
import expoMd from './expo.md?raw';
import linear_appMd from './linear-app.md?raw';
import lovableMd from './lovable.md?raw';
import mintlifyMd from './mintlify.md?raw';
import posthogMd from './posthog.md?raw';
import raycastMd from './raycast.md?raw';
import resendMd from './resend.md?raw';
import sentryMd from './sentry.md?raw';
import supabaseMd from './supabase.md?raw';
import vercelMd from './vercel.md?raw';
import warpMd from './warp.md?raw';
import zapierMd from './zapier.md?raw';
import clickhouseMd from './clickhouse.md?raw';
import composioMd from './composio.md?raw';
import hashicorpMd from './hashicorp.md?raw';
import mongodbMd from './mongodb.md?raw';
import sanityMd from './sanity.md?raw';
import stripeMd from './stripe.md?raw';
import airtableMd from './airtable.md?raw';
import calMd from './cal.md?raw';
import clayMd from './clay.md?raw';
import figmaMd from './figma.md?raw';
import framerMd from './framer.md?raw';
import intercomMd from './intercom.md?raw';
import miroMd from './miro.md?raw';
import notionMd from './notion.md?raw';
import pinterestMd from './pinterest.md?raw';
import webflowMd from './webflow.md?raw';
import binanceMd from './binance.md?raw';
import coinbaseMd from './coinbase.md?raw';
import krakenMd from './kraken.md?raw';
import revolutMd from './revolut.md?raw';
import wiseMd from './wise.md?raw';
import airbnbMd from './airbnb.md?raw';
import appleMd from './apple.md?raw';
import bmwMd from './bmw.md?raw';
import ferrariMd from './ferrari.md?raw';
import ibmMd from './ibm.md?raw';
import metaMd from './meta.md?raw';
import lamborghiniMd from './lamborghini.md?raw';
import nikeMd from './nike.md?raw';
import nvidiaMd from './nvidia.md?raw';
import renaultMd from './renault.md?raw';
import shopifyMd from './shopify.md?raw';
import spacexMd from './spacex.md?raw';
import teslaMd from './tesla.md?raw';
import spotifyMd from './spotify.md?raw';
import uberMd from './uber.md?raw';
import superhumanMd from './superhuman.md?raw';
import bugattiMd from './bugatti.md?raw';
import playstationMd from './playstation.md?raw';
import thevergeMd from './theverge.md?raw';
import wiredMd from './wired.md?raw';
import mastercardMd from './mastercard.md?raw';
import vodafoneMd from './vodafone.md?raw';
import starbucksMd from './starbucks.md?raw';

export interface DesignMdTemplate {
    id: string;
    name: string;
    name_zh: string;
    category: 'Tech' | 'Finance' | 'Creative' | 'Minimal' | 'Bold' | 'Custom';
    description: string;
    description_zh: string;
    content: string;
}

export const DESIGN_MD_TEMPLATES: DesignMdTemplate[] = [
    {
        id: 'claude',
        name: 'Claude — Warm Literary Salon',
        name_zh: 'Claude 人文典雅書香',
        category: 'Tech',
        description: 'A warm parchment canvas with terracotta accents, custom serif typography, and editorial pacing that feels like reading a thoughtful essay rather than scanning a product page.',
        description_zh: '溫慢的羊皮紙質畫布，搭配赤陶色點綴和訂製襯線字體，編輯節奏如同閱讀一篇深思熟慮的文章，而非瀏覽產品頁面。',
        content: claudeMd,
    },
    {
        id: 'cohere',
        name: 'Cohere — Enterprise Command Deck',
        name_zh: 'Cohere 企業後台主控',
        category: 'Tech',
        description: 'A polished white canvas with cloud-like rounded cards, dual-typeface authority, and restrained purple-violet accents that signal serious AI infrastructure.',
        description_zh: '拋光白色畫布，雲狀圓角卡片，雙字體權威感，克製的紫羅蘭點綴彰顯嚴肅的 AI 基礎設施氣質。',
        content: cohereMd,
    },
    {
        id: 'elevenlabs',
        name: 'ElevenLabs — Premium Audio Brochure',
        name_zh: 'ElevenLabs 質感音訊美學',
        category: 'Tech',
        description: 'A near-white canvas where whisper-thin Waldenburg display type and multi-layered micro-shadows create the ethereal elegance of a premium audio product.',
        description_zh: '近白色畫布，輕若耳語的 Waldenburg 展示字體與多層微陰影共同營造出高端音訊產品的空靈優雅。',
        content: elevenlabsMd,
    },
    {
        id: 'minimax',
        name: 'MiniMax — Playful AI Gallery',
        name_zh: 'MiniMax 活潑亮彩藝廊',
        category: 'Tech',
        description: 'A white-space-driven showcase with vibrant gradient product cards, multi-font variety, and pill-shaped geometry that makes AI technology feel approachable.',
        description_zh: '以留白為驅動的展示空間，充滿活力的漸變產品卡片、多字體組合，以及藥丸形幾何讓 AI 技術倍感親切。',
        content: minimaxMd,
    },
    {
        id: 'mistral_ai',
        name: 'Mistral AI — Sun-Drenched Frontier',
        name_zh: 'Mistral AI 暖陽橙黃極簡',
        category: 'Tech',
        description: 'A golden-amber universe flowing from pale cream to burnt orange, with massive billboard headlines and warm-tinted shadows that feel more European luxury brand than tech company.',
        description_zh: '從淡乳白到焦橙色的金色琥珀宇宙，巨幅廣告牌式標題與暖色調陰影，更像歐洲奢侈品牌而非科技公司。',
        content: mistral_aiMd,
    },
    {
        id: 'ollama',
        name: 'Ollama — Radical Minimalism',
        name_zh: 'Ollama 極致極簡暖白',
        category: 'Tech',
        description: 'A pure-white void with zero chromatic color, SF Pro Rounded letterforms, and exclusively pill-shaped geometry — minimalism with warmth, not cold Swiss grids.',
        description_zh: '純白虛空，零彩色，SF Pro Rounded 字形，全藥丸形幾何——溫暖極簡，而非冰冷的瑞士網格。',
        content: ollamaMd,
    },
    {
        id: 'opencode_ai',
        name: 'OpenCode — Terminal-Native Craft',
        name_zh: 'OpenCode 終端機代碼風',
        category: 'Tech',
        description: 'A warm dark canvas with Berkeley Mono as the sole typeface, creating an unapologetic monospace identity where every element reads like code.',
        description_zh: '溫暖的深色畫布，Berkeley Mono 作為唯一字體，打造毫不妥協的等寬字特色，每個元素都像程式碼般閱讀。',
        content: opencode_aiMd,
    },
    {
        id: 'replicate',
        name: 'Replicate — Creative Developer Playground',
        name_zh: 'Replicate 創意開發漸層',
        category: 'Tech',
        description: 'An explosive orange-red-magenta gradient hero, massive display typography, and exclusively pill-shaped geometry that shouts with creative energy.',
        description_zh: '爆炸性的橙紅洋紅漸變英雄區、巨幅展示字體，以及全藥丸形幾何，洋溢著創意能量。',
        content: replicateMd,
    },
    {
        id: 'runwayml',
        name: 'Runway — Cinematic Reel',
        name_zh: 'Runway 暗黑電影劇照',
        category: 'Tech',
        description: 'A dark editorial canvas where full-bleed photography and video are the primary UI elements, with single-font uniformity letting visual content speak louder than text.',
        description_zh: '深色編輯畫布，滿版攝影與影片是主要 UI 元素，單字體統一性讓視覺內容比文字更響亮。',
        content: runwaymlMd,
    },
    {
        id: 'together_ai',
        name: 'Together AI — Pastel Cloud Infrastructure',
        name_zh: 'Together AI 粉彩雲端馬卡龍',
        category: 'Tech',
        description: 'Soft pink-blue-lavender gradients against white canvas, with a deep midnight-blue technical world for research content — enterprise AI that feels light and optimistic.',
        description_zh: '白色畫布上的柔和粉藍薰衣草漸變，搭配深邃午夜藍的技術世界——輕盈樂觀的企業 AI。',
        content: together_aiMd,
    },
    {
        id: 'voltagent',
        name: 'VoltAgent — Deep-Space Command Terminal',
        name_zh: 'VoltAgent 深空翠綠終端',
        category: 'Tech',
        description: 'A carbon-black canvas with warm-neutral grays and an electric emerald-green pulse that glows like a circuit board carrying a signal at 2am.',
        description_zh: '碳黑畫布，暖中性灰，電光翠綠脈衝如凌晨兩點的電路板訊號般閃爍。',
        content: voltagentMd,
    },
    {
        id: 'x_ai',
        name: 'xAI — Brutalist Infrastructure',
        name_zh: 'xAI 粗獷極簡黑白',
        category: 'Tech',
        description: 'An almost-black canvas with GeistMono as display typeface at 320px, sharp architectural edges, and a terminal-inspired aesthetic that signals deep technical credibility.',
        description_zh: '近黑色畫布，GeistMono 作為 320px 展示字體，鋒利建築邊缘，終端靈感美學彰顯深厚技術可信度。',
        content: x_aiMd,
    },
    {
        id: 'cursor',
        name: 'Cursor — Warm Code Editor Elegance',
        name_zh: 'Cursor 暖調代碼編輯',
        category: 'Tech',
        description: 'A warm off-white canvas with CursorGothic display type, a three-font typographic system, and oklab-based organic borders that feel like premium print.',
        description_zh: '溫暖米白畫布，CursorGothic 展示字體，三字體排版系統，基於 oklab 的有機邊框如高級印刷品般質感。',
        content: cursorMd,
    },
    {
        id: 'expo',
        name: 'Expo — React Native Precision',
        name_zh: 'Expo 極黑原生 App',
        category: 'Tech',
        description: 'A dark-themed developer platform with tight letter-spacing, code-centric presentation, and the precision of a native mobile toolkit.',
        description_zh: '深色主題開發者平台，緊密字距，程式碼中心展示，原生行動工具組的精準度。',
        content: expoMd,
    },
    {
        id: 'linear_app',
        name: 'Linear — Dark-Native Precision',
        name_zh: 'Linear 深色極致精準',
        category: 'Tech',
        description: 'A near-black canvas where content emerges from darkness like starlight, with Inter Variable at signature weight 510 and indigo-violet as the sole chromatic accent.',
        description_zh: '近黑色畫布，內容如星光般從黑暗中浮現，Inter Variable 標誌性 510 字重，靛藍紫羅蘭作為唯一彩色點綴。',
        content: linear_appMd,
    },
    {
        id: 'lovable',
        name: 'Lovable — Approachable Craft',
        name_zh: 'Lovable 人文溫潤奶油',
        category: 'Tech',
        description: 'A creamy parchment-toned background with the humanist warmth of Camera Plain Variable, and an opacity-driven depth model where every gray is the same hue at different transparencies.',
        description_zh: '奶油色羊皮紙質感背景，Camera Plain Variable 的人文溫暖，基於透明度的深度模型讓每種灰色都是同一色相的不同透明度。',
        content: lovableMd,
    },
    {
        id: 'mintlify',
        name: 'Mintlify — Documentation Luminescence',
        name_zh: 'Mintlify 亮綠透光文件',
        category: 'Tech',
        description: 'A luminous white canvas with an ethereal green-to-white gradient hero, Inter with tight tracking, and generous card radii that make documentation feel like a premium product.',
        description_zh: '明亮白色畫布，空靈綠白漸變英雄區，Inter 緊湊字距，寬大卡片圓角讓文件體驗如高端產品。',
        content: mintlifyMd,
    },
    {
        id: 'posthog',
        name: 'PostHog — Garden Shed Analytics',
        name_zh: 'PostHog 手繪趣味分析',
        category: 'Tech',
        description: 'A warm sage-tinted cream canvas with hand-drawn hedgehog illustrations, hidden orange hover surprises, and an anti-corporate personality that makes analytics feel human.',
        description_zh: '溫慢鼠尾草色調奶油畫布，手繪刺蝟插畫，隱藏的橙色懸停驚喜，反企業人格讓分析倍感人性化。',
        content: posthogMd,
    },
    {
        id: 'raycast',
        name: 'Raycast — macOS Obsidian Instrument',
        name_zh: 'Raycast 黑曜石精工工具',
        category: 'Tech',
        description: 'A near-black blue-tinted canvas with macOS-native layered shadow system, Raycast Red diagonal stripes, and the precision of a Swiss watch carved from obsidian.',
        description_zh: '近黑藍調畫布，macOS 原生分層陰影系統，Raycast Red 對角條紋，如黑曜石雕刻的瑞士手表般精準。',
        content: raycastMd,
    },
    {
        id: 'resend',
        name: 'Resend — Theatrical Email Gallery',
        name_zh: 'Resend 冷冽水晶郵件',
        category: 'Tech',
        description: 'A pure black canvas with Domaine Display serif heroes, ABC Favorit geometric sections, and icy blue-tinted borders that give every container a cold, crystalline quality.',
        description_zh: '純黑畫布，Domaine Display 襯線英雄區，ABC Favorit 幾何區塊，冰藍調邊框讓每個容器都帶有冷冽水晶質感。',
        content: resendMd,
    },
    {
        id: 'sentry',
        name: 'Sentry — Late-Night Debugging',
        name_zh: 'Sentry 深夜除錯紫橘',
        category: 'Tech',
        description: 'Deep purple-black backgrounds with warm purple tones, a distinctive lime-green accent, and Dammit Sans display font that matches an irreverent brand voice.',
        description_zh: '深字黑色背景，溫暖紫色調，獨特的酸橙綠點綴，Dammit Sans 展示字體匹配不羈的品牌聲音。',
        content: sentryMd,
    },
    {
        id: 'supabase',
        name: 'Supabase — Terminal Elegance',
        name_zh: 'Supabase 深綠漸層資料庫',
        category: 'Tech',
        description: 'A near-black developer platform with emerald-green accents, Circular geometric sans, and a sophisticated HSL-based color token system for translucent layering.',
        description_zh: '近黑色開發者平台，翠綠色點綴，Circular 幾何無襯線，基於 HSL 的復杂色彩令牌系統實現半透明分層。',
        content: supabaseMd,
    },
    {
        id: 'vercel',
        name: 'Vercel — Compiler Aesthetic',
        name_zh: 'Vercel 極簡黑白編譯',
        category: 'Tech',
        description: 'An overwhelmingly white canvas with Geist Sans at extreme negative tracking, Geist Mono for code, and a signature shadow-as-border technique that replaces traditional borders entirely.',
        description_zh: '極致白色畫布，Geist Sans 極端負字距，Geist Mono 程式碼字體，標誌性的陰影即邊框技術完全替代傳統邊框。',
        content: vercelMd,
    },
    {
        id: 'warp',
        name: 'Warp — Campfire Terminal',
        name_zh: 'Warp 暖炭色終端',
        category: 'Tech',
        description: 'A warm near-black canvas with Warm Parchment text, the approachable Matter geometric sans, and nature photography woven between terminal screenshots.',
        description_zh: '溫慢近黑畫布，暖羊皮紙色文字，親切的 Matter 幾何無襯線，自然攝影穿插於終端截圖之間。',
        content: warpMd,
    },
    {
        id: 'zapier',
        name: 'Zapier — Organized Notebook',
        name_zh: 'Zapier 亮橙條理筆記',
        category: 'Tech',
        description: 'A cream-tinted canvas with Degular Display block headlines, GT Alpina serif moments, and a vivid red-orange accent that feels energetic without being aggressive.',
        description_zh: '奶油色調畫布，Degular Display 塊狀標題，GT Alpina 襯線時刻，鮮豔紅橙點綴充滿活力卻不具攻擊性。',
        content: zapierMd,
    },
    {
        id: 'clickhouse',
        name: 'ClickHouse — High-Performance Cockpit',
        name_zh: 'ClickHouse 霓虹黃綠控制台',
        category: 'Tech',
        description: 'A pure black canvas with neon yellow-green accents slashing across CTAs like a highlighter on a dark console, and Inter Black at 96px creating text with physical mass.',
        description_zh: '純黑畫布，霓虹黃綠色點綴如螢光筆劃過暗黑控制台，Inter Black 96px 創造具有物理質感的文字。',
        content: clickhouseMd,
    },
    {
        id: 'composio',
        name: 'Composio — Nocturnal Command Center',
        name_zh: 'Composio 夜間青藍主控',
        category: 'Tech',
        description: 'A pitch-black canvas with barely-visible containment borders, electric cyan gradient glows, and hard-offset brutalist shadows — a high-tech control panel for developers.',
        description_zh: '漆黑畫布，幾乎不可見的容器邊框，電光青色漸變輝光，硬偏移野蠻主義陰影——開發者的科技控制面板。',
        content: composioMd,
    },
    {
        id: 'hashicorp',
        name: 'HashiCorp — Infrastructure Day/Night',
        name_zh: 'HashiCorp 晝夜黑白切換',
        category: 'Tech',
        description: 'A day/night duality design with clean white information sections and dramatic dark product showcases, each product injecting its own chromatic identity into a token-driven system.',
        description_zh: '晝夜二元設計，乾淨的白色資訊區與戲劇化的深色產品展示，每個產品向令牌驅動系統注入自己的色彩身份。',
        content: hashicorpMd,
    },
    {
        id: 'mongodb',
        name: 'MongoDB — Bioluminescent Forest',
        name_zh: 'MongoDB 深綠螢光森林',
        category: 'Tech',
        description: 'Deep teal-black backgrounds with neon green accents that feel alive, MongoDB Value Serif for editorial authority at 96px, and teal-tinted shadows that carry the forest color everywhere.',
        description_zh: '深青黑背景，霓虹綠色點綴充滿生命力，MongoDB Value Serif 襯線在 96px 處彰顯編輯權威，青色調陰影將森林色彩帶向每一處。',
        content: mongodbMd,
    },
    {
        id: 'sanity',
        name: 'Sanity — Structured Content Stage',
        name_zh: 'Sanity 訊號綠藍排版',
        category: 'Tech',
        description: 'A near-black canvas with precision-cut waldenburgNormal headlines at 112px, pure achromatic grays, and neon green and electric blue accents that land like signal lights in a dark control room.',
        description_zh: '近黑色畫布，112px 精密切割 waldenburgNormal 標題，純中性灰色，霓虹綠與電光藍點綴如暗室中的訊號燈般醒目。',
        content: sanityMd,
    },
    {
        id: 'stripe',
        name: 'Stripe — Financial Type Foundry',
        name_zh: 'Stripe 海軍藍極簡金融',
        category: 'Finance',
        description: 'A clean white canvas with deep navy headings, sohne-var at weight 300, and blue-tinted multi-layer shadows that make elevation feel like twilight atmospheric depth.',
        description_zh: '乾淨白色畫布，深海軍藍標題，sohne-var 300 字重，藍調多層陰影讓 elevation 如暮光大氣深度。',
        content: stripeMd,
    },
    {
        id: 'airtable',
        name: 'Airtable — Sophisticated Simplicity',
        name_zh: 'Airtable 清爽表格數據',
        category: 'Creative',
        description: 'A clean white canvas with deep navy text, Airtable Blue accent, and the Swiss-precision Haas font family creating an enterprise-friendly structured data aesthetic.',
        description_zh: '乾淨白色畫布，深海軍藍文字，Airtable Blue 點綴，Haas 字型家族以瑞士精準度打造企業友好的結構化數據美學。',
        content: airtableMd,
    },
    {
        id: 'cal',
        name: 'Cal.com — Monochrome Confidence',
        name_zh: 'Cal.com 純灰無色極簡',
        category: 'Creative',
        description: 'A purely grayscale world where boldness comes from Cal Sans at extreme closeness, 11 shadow definitions creating nuanced depth, and color treated as a foreign substance.',
        description_zh: '純粹灰度世界，Cal Sans 極致緊湊帶來力量感，11 層陰影定義創造微妙深度，色彩被視為外來物質。',
        content: calMd,
    },
    {
        id: 'clay',
        name: 'Clay — Artisanal Data Craft',
        name_zh: 'Clay 燕麥溫潤互動',
        category: 'Creative',
        description: 'A warm cream canvas with oat-toned borders, a vivid flavor-named color palette, and playful hover micro-animations where buttons tilt and jump on interaction.',
        description_zh: '溫慢奶油畫布，燕麥色調邊框，以口味命名的鮮活色彩面板，以及俏皮的懸停微動畫讓按鈕在交互時傾斜跳躍。',
        content: clayMd,
    },
    {
        id: 'figma',
        name: 'Figma — Typographic Precision',
        name_zh: 'Figma 多色設計漸層',
        category: 'Creative',
        description: 'A strictly black-and-white interface chrome with a custom variable font at unusual weight stops, while the hero explodes with vibrant multi-color gradients — a white gallery wall displaying colorful art.',
        description_zh: '嚴格黑白界面外殼，自訂可變字體在不尋常的字重停頓，而英雄區爆發出充滿活力的多色漸變——展示彩色藝術的白牆畫廊。',
        content: figmaMd,
    },
    {
        id: 'framer',
        name: 'Framer — Design Nightclub',
        name_zh: 'Framer 極黑潮流設計',
        category: 'Creative',
        description: 'An absolute black void with GT Walsheim headlines compressed like spring-loaded words, Framer Blue electric throughlines, and the seductive confidence of a tool built by designers for designers.',
        description_zh: '絕對黑色虛空，GT Walsheim 標題如彈簧加載般壓縮，Framer Blue 電光貫穿線，設計師為設計師打造的工具的魅惑自信。',
        content: framerMd,
    },
    {
        id: 'intercom',
        name: 'Intercom — AI-First Helpdesk',
        name_zh: 'Intercom 暖橙精悍客服',
        category: 'Creative',
        description: 'A warm off-white canvas with Fin Orange as singular vibrant accent, ultra-compressed Saans headlines, and sharp 4px geometry that feels industrial yet approachable.',
        description_zh: '溫暖米白色畫布，Fin Orange 作為唯一鮮豔點綴，超壓縮 Saans 標題，4px 鋒利幾何感工業且親切。',
        content: intercomMd,
    },
    {
        id: 'miro',
        name: 'Miro — Visual Thinking Canvas',
        name_zh: 'Miro 珊瑚粉彩思維',
        category: 'Creative',
        description: 'A predominantly white canvas with a distinctive pastel palette — coral, rose, teal, orange — and Roobert PRO Medium creating a collaborative tool-forward geometric voice.',
        description_zh: '以白色為主的畫布，獨特的粉彩調色板——珊瑚、玫瑰、藍綠、橙色——Roobert PRO Medium 打造協作工具導向的幾何聲音。',
        content: miroMd,
    },
    {
        id: 'notion',
        name: 'Notion — Approachable Blank Canvas',
        name_zh: 'Notion 紙質極簡白底',
        category: 'Creative',
        description: 'A pure white canvas with warm yellow-brown undertones, NotionInter with aggressive negative tracking, and ultra-thin whisper borders that create structure without weight.',
        description_zh: '純白色畫布，溫暖黃棕底色，NotionInter 激進負字距，超薄耳語邊框在無需重量的情況下創造結構。',
        content: notionMd,
    },
    {
        id: 'pinterest',
        name: 'Pinterest — Inspiration Lifestyle',
        name_zh: 'Pinterest 暖沙大圓角牆',
        category: 'Creative',
        description: 'A soft warm-white canvas with olive-sand neutrals, Pinterest Red as bold singular accent, and generous border-radius creating a handcrafted, personal atmosphere.',
        description_zh: '柔和暖白色畫布，橄欖沙色中性色，Pinterest Red 作為大膽唯一點綴，寬大圓角營造手工製作的個人氛圍。',
        content: pinterestMd,
    },
    {
        id: 'webflow',
        name: 'Webflow — Design Without Code',
        name_zh: 'Webflow 清爽多色網格',
        category: 'Creative',
        description: 'A clean white canvas with Webflow Blue as primary anchor, a rich secondary palette of purple, pink, green and orange, and conservative 4-8px geometry.',
        description_zh: '乾淨白色畫布，Webflow Blue 作為主錨點，豐富的紫色、粉色、綠色和橙色輔色，保守的 4-8px 幾何。',
        content: webflowMd,
    },
    {
        id: 'binance',
        name: 'Binance.US — Digital Trading Floor',
        name_zh: 'Binance.US 黑金交易所',
        category: 'Finance',
        description: 'A two-tone composition alternating between stark white and deep near-black, with Binance Yellow cutting through like a gold ingot on a steel desk — polished crypto urgency.',
        description_zh: ' stark 白色與深近黑色交替的雙色組合，Binance Yellow 如鋼桌上的金錠般劃破——打磨過的加密緊迫感。',
        content: binanceMd,
    },
    {
        id: 'coinbase',
        name: 'Coinbase — Trustworthy Crypto',
        name_zh: 'Coinbase 信賴寶藍加密',
        category: 'Finance',
        description: 'A clean blue-and-white binary palette with Coinbase Blue as singular brand accent, a comprehensive four-font proprietary family, and financial-grade institutional reliability.',
        description_zh: '乾淨的藍白二元調色板，Coinbase Blue 作為唯一品牌點綴，全面的四字體專有家族，金融級機構可靠性。',
        content: coinbaseMd,
    },
    {
        id: 'kraken',
        name: 'Kraken — Purple Crypto Authority',
        name_zh: 'Kraken 神祕紫加密',
        category: 'Finance',
        description: 'A clean white canvas with Kraken Purple creating a distinctive professional crypto identity, dual-font system, and whisper-level shadows.',
        description_zh: '乾淨白色畫布，Kraken Purple 打造獨特的專業加密身份，雙字體系統，耳語級陰影。',
        content: krakenMd,
    },
    {
        id: 'revolut',
        name: 'Revolut — Stadium-Scale Fintech',
        name_zh: 'Revolut 極簡藥丸金融',
        category: 'Finance',
        description: 'Massive Aeonik Pro headlines at 136px with billboard-scale negative tracking, a comprehensive semantic token system, and pill-everything button geometry — banking for the modern era.',
        description_zh: '136px 巨幅 Aeonik Pro 標題，廣告牌級負字距，全面的語義令牌系統，全藥丸按鈕幾何——現代時代的銀行。',
        content: revolutMd,
    },
    {
        id: 'wise',
        name: 'Wise — Money Without Borders',
        name_zh: 'Wise 酸橙綠無界貨幣',
        category: 'Finance',
        description: 'A warm off-white canvas with Wise Sans at weight 900 and 0.85 line-height creating protest-sign density, and a fresh lime-green accent that feels alive and optimistic.',
        description_zh: '溫暖米白色畫布，Wise Sans 900 字重、0.85 行高創造抗議標語般的密度，清新酸橙綠點綴充滿活力與樂觀。',
        content: wiseMd,
    },
    {
        id: 'airbnb',
        name: 'Airbnb — Travel Magazine',
        name_zh: 'Airbnb 滿版相片旅行',
        category: 'Minimal',
        description: 'A pristine white canvas where full-bleed photography dominates, Rausch coral-pink accents guide every action, and 3D rendered category icons add tactile warmth to the travel experience.',
        description_zh: ' pristine 白色畫布，全出血攝影主導，Rausch 珊瑚粉點綴引導每個動作，3D 渲染分類圖標為旅行體驗增添觸覺溫暖。',
        content: airbnbMd,
    },
    {
        id: 'apple',
        name: 'Apple — Cinematic Product Gallery',
        name_zh: 'Apple 經典蘋果美學',
        category: 'Minimal',
        description: 'Vast expanses of pure black and near-white serve as cinematic backdrops for product photography, with SF Pro\'s optical sizing and a single Apple Blue for interactive precision.',
        description_zh: '純黑與近白的廣闊空間作為產品攝影的電影背景，SF Pro 光學字號和單一的 Apple Blue 實現交互精準度。',
        content: appleMd,
    },
    {
        id: 'bmw',
        name: 'BMW — German Engineering Precision',
        name_zh: 'BMW 德國經典精工',
        category: 'Bold',
        description: 'Dark premium surfaces with BMWTypeNextLatin Light at 60px whispering authority, zero border-radius expressing industrial geometry, and BMW Blue as interactive signal.',
        description_zh: '深色高端表面，BMWTypeNextLatin Light 60px 低語權威，零圓角表達工業幾何，BMW Blue 作為唯一交互訊號。',
        content: bmwMd,
    },
    {
        id: 'ferrari',
        name: 'Ferrari — Digital Editorial',
        name_zh: 'Ferrari 法拉利紅黑電影',
        category: 'Bold',
        description: 'A chiaroscuro rhythm alternating between inky-dark cinematic sections and crisp white editorial panels, with Ferrari Red used with surgical sparseness for maximum brand weight.',
        description_zh: '明暗對比節奏，墨黑電影感區塊與 crisp 白色編輯面板交替，Ferrari Red 以手術般的克製使用以最大化品牌重量。',
        content: ferrariMd,
    },
    {
        id: 'ibm',
        name: 'IBM — Enterprise Engineering Spec',
        name_zh: 'IBM 經典藍白企業',
        category: 'Bold',
        description: 'A stark white canvas with IBM Plex Sans at weight 300 creating airy corporate gravitas, IBM Blue 60 as unwavering accent, and Carbon\'s token-driven component architecture.',
        description_zh: ' stark 白色畫布，IBM Plex Sans 300 字重創造空靈的企業莊重感，IBM Blue 60 堅定不移的點綴，Carbon 令牌驅動組件架構。',
        content: ibmMd,
    },
    {
        id: 'meta',
        name: 'Meta Store — Product Retail Gallery',
        name_zh: 'Meta Store 親切亮藍零售',
        category: 'Bold',
        description: 'A photography-first retail experience with expansive white canvas framing hero product shots, the warm Optimistic typeface, and pill-shaped Meta Blue CTAs.',
        description_zh: '攝影優先的零售體驗，廣闊白色畫布框住英雄產品鏡頭，溫暖的 Optimistic 字體，藥丸形 Meta Blue CTA。',
        content: metaMd,
    },
    {
        id: 'lamborghini',
        name: 'Lamborghini — Nocturnal Motorsport',
        name_zh: 'Lamborghini 奢華闇黑賽車',
        category: 'Bold',
        description: 'A cathedral of true black with LamboType\'s 12-degree angled terminals, Lamborghini Gold as sole accent igniting against the void, and hexagonal motifs echoing brand geometry.',
        description_zh: '真正黑色的殿堂，LamboType 12 度傾斜終端，Lamborghini Gold 作為唯一點綴在虛空中點燃，六邊形圖案呼應品牌幾何。',
        content: lamborghiniMd,
    },
    {
        id: 'nike',
        name: 'Nike — Kinetic Retail Cathedral',
        name_zh: 'Nike 極速黑白動感',
        category: 'Bold',
        description: 'A monochromatic UI that lets product photography be the only color source, with Nike Futura ND at 96px and line-height 0.90 punching through hero imagery like a typographic shockwave.',
        description_zh: '單色 UI 讓產品攝影成為唯一色彩來源，Nike Futura ND 96px、0.90 行高如排版衝擊波般穿透英雄圖像。',
        content: nikeMd,
    },
    {
        id: 'nvidia',
        name: 'NVIDIA — Computational Power',
        name_zh: 'NVIDIA 電光綠極限效能',
        category: 'Bold',
        description: 'A stark black-and-white foundation with NVIDIA\'s signature electric green as pure accent signal, industrial DIN heritage typography, and precision engineering hardware rendered in pixels.',
        description_zh: ' stark 黑白基礎，NVIDIA 標誌性電光綠作為純點綴訊號，工業 DIN 傳承字體，像素中渲染的精密工程硬體。',
        content: nvidiaMd,
    },
    {
        id: 'renault',
        name: 'Renault — Vibrant Digital Showroom',
        name_zh: 'Renault 極光黃綠展示',
        category: 'Bold',
        description: 'A vibrant digital showroom with sweeping aurora gradients, NouvelR\'s 28-degree radical r, and Renault Yellow on sharp zero-radius buttons expressing French automotive elegance.',
        description_zh: '活力數位展廳， sweeping 極光漸變，NouvelR 28 度激進 r，Renault Yellow 在鋒利零圓角按鈕上表達法國汽車優雅。',
        content: renaultMd,
    },
    {
        id: 'shopify',
        name: 'Shopify — Nocturnal Commerce Theatre',
        name_zh: 'Shopify 森林青電商',
        category: 'Bold',
        description: 'A dark-first digital theatre with deep forest-teal undertones, NeueHaasGrotesk at monumental 96px weight 330, and Shopify Neon Green pulsing like bioluminescence against the dark canvas.',
        description_zh: '深色優先的數位劇場，深森林青底色，NeueHaasGrotesk 96px 330 字重，Shopify Neon Green 如生物發光般在暗色畫布上脈動。',
        content: shopifyMd,
    },
    {
        id: 'spacex',
        name: 'SpaceX — Aerospace Film',
        name_zh: 'SpaceX 太空科幻電影',
        category: 'Bold',
        description: 'A full-screen cinematic experience with D-DIN uppercase text stenciled like mission briefing titles, radical minimalism with no cards and no shadows, and photography as the sole visual element.',
        description_zh: '全屏電影體驗，D-DIN 大寫文字如任務簡報標題般模版印刷，激進極簡無卡片無陰影，攝影作為唯一視覺元素。',
        content: spacexMd,
    },
    {
        id: 'tesla',
        name: 'Tesla — Radical Subtraction',
        name_zh: 'Tesla 極致極簡',
        category: 'Bold',
        description: 'A digital showroom where the product is everything and the interface is almost nothing — cinematic car photography, a single Electric Blue CTA, and Universal Sans unifying all surfaces.',
        description_zh: '產品即一切、界面幾乎為零的數位展廳——電影感汽車攝影，單一電光藍 CTA，Universal Sans 統一所有表面。',
        content: teslaMd,
    },
    {
        id: 'spotify',
        name: 'Spotify — Content-First Darkness',
        name_zh: 'Spotify 沉浸闇黑音樂',
        category: 'Minimal',
        description: 'A near-black immersive cocoon where the UI recedes into shadow so music and album art can glow, with Spotify Green as singular functional accent and pill-and-circle geometry.',
        description_zh: '近黑色沉浸式繭房，UI 隱入陰影讓音樂與專輯封面發光，Spotify Green 作為唯一功能點綴，藥丸與圓形幾何。',
        content: spotifyMd,
    },
    {
        id: 'uber',
        name: 'Uber — Confident Transit Map',
        name_zh: 'Uber 俐落黑白地圖',
        category: 'Minimal',
        description: 'A stark black-and-white universe with UberMove geometric sans, pill-shaped everything, and warm human illustrations that inject humanity into monochrome confidence.',
        description_zh: ' stark 黑白宇宙，UberMove 幾何無襯線，全藥丸形狀，溫暖人文插畫為單色自信注入人性。',
        content: uberMd,
    },
    {
        id: 'superhuman',
        name: 'Superhuman — Luxury Envelope',
        name_zh: 'Superhuman 極簡收件箱',
        category: 'Minimal',
        description: 'A predominantly white, immaculately clean canvas with a dramatic twilight purple gradient hero, Super Sans VF at unconventional weight stops, and lavender Mysteria accent.',
        description_zh: '以白色為主、一塵不染的乾淨畫布，戲劇化暮光紫漸變英雄區，Super Sans VF 非常規字重停頓，薰衣草 Mysteria 點綴。',
        content: superhumanMd,
    },
    {
        id: 'bugatti',
        name: 'Bugatti — Feature-Length Car Film',
        name_zh: 'Bugatti 奢華超跑電影',
        category: 'Bold',
        description: 'A cinema-black canvas with Bugatti Display at 288px creating architectural headlines, monochrome-only palette, and pill-shaped transparent CTAs — a black velvet display stand for hypercars.',
        description_zh: '電影黑畫布，Bugatti Display 288px 創造建築級標題，純單色調色板，藥丸形透明 CTA——超跑的黑色天鵝絨展示台。',
        content: bugattiMd,
    },
    {
        id: 'playstation',
        name: 'PlayStation — Consumer Electronics Channel',
        name_zh: 'PlayStation 經典電玩主機',
        category: 'Bold',
        description: 'A vertical channel of near-black hero, paper-white editorial, and cobalt-blue footer, with SST weight 300 whispering quiet authority and a signature 1.2x hover-scale power-on animation.',
        description_zh: '近黑英雄區、紙白編輯區、鈷藍頁腳的垂直頻道，SST 300 字重低語安靜權威，標誌性的 1.2 倍懸停放大開機動畫。',
        content: playstationMd,
    },
    {
        id: 'theverge',
        name: 'The Verge — Developer Club Night',
        name_zh: 'The Verge 螢光開發者社群',
        category: 'Bold',
        description: 'A near-black editorial canvas with acid-mint and ultraviolet hazard-tape accents, massive Manuka display headlines up to 107px, and saturated color-block story tiles arranged in a StoryStream timeline.',
        description_zh: '近黑色編輯畫布，酸薄荷與紫羅蘭危險膠帶點綴，107px 巨幅 Manuka 展示標題，飽和色塊故事卡片按 StoryStream 時間線排列。',
        content: thevergeMd,
    },
    {
        id: 'wired',
        name: 'WIRED — Plugged-In Broadsheet',
        name_zh: 'WIRED 經典科技報紙',
        category: 'Bold',
        description: 'A dense paper-white broadsheet grid held together by typographic weight and hairline rules, with WiredDisplay serif headlines and mono uppercase kickers with wide letter-spacing.',
        description_zh: '密集的紙白大報網格，由排版重量 and 髮絲線規則維繫，WiredDisplay 襯線標題和寬字距等寬大寫眉批。',
        content: wiredMd,
    },
    {
        id: 'mastercard',
        name: 'Mastercard — Orbit and Trajectory',
        name_zh: 'Mastercard 金融軌跡風',
        category: 'Finance',
        description: 'A muted putty-cream canvas where everything that matters is shaped like a stadium, pill, or circle, with circular portraits connected by hand-drawn orange arcs implying constellations of services.',
        description_zh: '柔和膩子奶油畫布，重要元素皆為體育場、藥丸或圓形，圓形肖像由手繪橙色弧線連接，暗示服務星座。',
        content: mastercardMd,
    },
    {
        id: 'vodafone',
        name: 'Vodafone — Broadcast-Scale Telecom',
        name_zh: 'Vodafone 旗艦紅黑電信',
        category: 'Bold',
        description: 'A corporate web system with cinematic dark heroes, monumental 144px uppercase display headlines, and Vodafone Red full-width chapter bands creating a corporate newsroom feeling.',
        description_zh: '企業網路系統，電影感深色英雄區，144px 巨幅大寫展示標題，Vodafone Red 全寬章節帶營造企業新聞編輯室氛圍。',
        content: vodafoneMd,
    },
    {
        id: 'starbucks',
        name: 'Starbucks — Warm Retail Flagship',
        name_zh: 'Starbucks 經典星巴克綠',
        category: 'Bold',
        description: 'A warm cream canvas referencing cafe materials, four calibrated green shades each mapped to surface roles, SoDoSans with tight tracking, and a floating circular Frap CTA as signature depth move.',
        description_zh: '參考咖啡館材質的溫暖奶油畫布，四種校準綠色各映射表面角色，SoDoSans 緊湊字距，浮動圓形 Frap CTA 作為標誌性深度動作。',
        content: starbucksMd,
    }
];

export const getDesignMdList = () =>
    DESIGN_MD_TEMPLATES.map(({ content, ...meta }) => meta);

export const getDesignMdById = (id: string): DesignMdTemplate | undefined =>
    DESIGN_MD_TEMPLATES.find(t => t.id === id);
