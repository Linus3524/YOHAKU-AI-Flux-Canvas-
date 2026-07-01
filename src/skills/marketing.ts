// 產品行銷組圖 (Product Marketing Sets) Skill 配置與 Prompt 產生器

export interface ProductMarketingBrief {
  productName: string;
  sellingPoints: string;
  targetAudience: string;
  visualTone: string;
  customAssets?: string[];
  lockStyleConsistency?: boolean;
}

export interface ProductMarketingOutputSpec {
  id: string;
  title: string;
  aspectRatio: string;
  ratioValue: number;
  note: string;
  guidance: string[];
}

export interface ProductMarketingPlatformSpec {
  id: string;
  name: string;
  standards: string[];
  recipes: ProductMarketingOutputSpec[];
}

export const PRODUCT_MARKETING_DEFAULT_CONFIG: ProductMarketingBrief = {
  productName: '',
  sellingPoints: '',
  targetAudience: '',
  visualTone: '乾淨專業',
  customAssets: [],
};

export const PRODUCT_MARKETING_PLATFORMS: Record<string, ProductMarketingPlatformSpec> = {
  shopee: {
    id: 'shopee',
    name: '蝦皮購物 (Shopee)',
    standards: [
      '主圖應優先合規，建議以純白底或淡色無干擾背景為主，讓商品佔據畫面中心。',
      '促銷活動圖可加入富有台灣在地電商氛圍的活動標籤或小裝飾（如：現貨快速出貨、免運、限時促銷）。',
      '特色賣點圖與細節保固圖應傳達安心感，如台灣在地客服或商品特徵放大標註。'
    ],
    recipes: [
      {
        id: 'shopee-hero',
        title: '蝦皮合規主圖',
        aspectRatio: '1:1',
        ratioValue: 1.0,
        note: '白底或輕微淡色背景的合規首圖。',
        guidance: [
          'Generate a clean product hero shot for Shopee shop catalog. Use white or extremely light minimalist grey background. Center the product. No overlay text or badges.'
        ]
      },
      {
        id: 'shopee-promo',
        title: '促銷活動主圖',
        aspectRatio: '1:1',
        ratioValue: 1.0,
        note: '結合活動標籤的吸睛首圖。',
        guidance: [
          'Generate a Shopee promotional square visual featuring the product. Integrate clean graphical stickers or banner tags suggesting Taiwanese local ecommerce tags like "Free Shipping" (免運) or "Fast Shipping" (現貨快速出貨). Keep the layout modern and uncluttered.'
        ]
      },
      {
        id: 'shopee-features',
        title: '商品特色賣點圖',
        aspectRatio: '1:1',
        ratioValue: 1.0,
        note: '標註核心功能或特點。',
        guidance: [
          'Design an informative square graphic showing key features of the product. Use clean typographic labels and thin connector lines pointing to key features of the product. Focus on readability.'
        ]
      },
      {
        id: 'shopee-details',
        title: '細節保固圖',
        aspectRatio: '1:1',
        ratioValue: 1.0,
        note: '特寫細節並標註在地保固。',
        guidance: [
          'Generate a close-up detail shot of the product packaging or materials, accompanied by a clean confidence label badge like "Taiwan Warranty" (台灣保固) or "Official Authenticity" (官方正品) styled elegantly.'
        ]
      }
    ]
  },
  line_marketing: {
    id: 'line_marketing',
    name: 'LINE 行銷素材',
    standards: [
      '圖文訊息與圖文選單應保持文字大而清晰、色彩飽和，確保在行動端小螢幕上有極佳的可讀性。',
      '避免邊緣排版過於擁擠，為操作按鈕或文字訊息保留安全空間。'
    ],
    recipes: [
      {
        id: 'line-message',
        title: 'LINE 廣播圖文訊息',
        aspectRatio: '1:1',
        ratioValue: 1.0,
        note: '大圖吸睛、重點突出的發送素材。',
        guidance: [
          'Generate a high-impact square broadcast visual for LINE message channel. Feature the product prominently on one side, leaving balanced space with bold, easily readable typographic title header summarizing the product\'s value. Highly clean layout for small mobile screens.'
        ]
      },
      {
        id: 'line-menu',
        title: 'LINE 圖文選單背景',
        aspectRatio: '16:9',
        ratioValue: 16 / 9,
        note: 'LINE 底部常駐選單背景圖。',
        guidance: [
          'Generate a horizontal background image optimized for a LINE Rich Menu. It should have a clean grid layout feel. Render the product visual integrated smoothly in one corner or partition, while keeping the rest of the canvas clean with harmonious solid color block segments for custom button overlays.'
        ]
      },
      {
        id: 'line-lap',
        title: 'LINE LAP 廣告圖',
        aspectRatio: '1:1',
        ratioValue: 1.0,
        note: 'LINE Today 或列表方圖廣告。',
        guidance: [
          'Generate a square advertising graphic optimized for LINE LAP mobile news feeds. The product should be large and central, set against a bright, modern studio color palette. No cluttered micro text; focus on immediate visual hook.'
        ]
      }
    ]
  },
  amazon_listing: {
    id: 'amazon_listing',
    name: 'Amazon 商品頁 / A+',
    standards: [
      '主圖必須優先合規：乾淨白底、產品完整清晰、不要疊加標題/Logo/促銷角標/價格/評分/水印。',
      '附圖可以講賣點、細節、尺寸、使用場景，但避免「best-selling/top-rated」、保修、價格、二維碼、聯繫方式、競品比較等敏感內容。',
      'A+ 內容適合圖文結合、規格說明、比較表、品牌故事和常見問題，但畫面要避免低解析度和誇張宣傳。'
    ],
    recipes: [
      {
        id: 'main-image',
        title: 'Amazon 主圖',
        aspectRatio: '1:1',
        ratioValue: 1.0,
        note: '白底合規主圖，無疊字無道具，產品完整清晰。',
        guidance: [
          'Generate a clean white background product main listing image (Amazon main image). The product should occupy 80-85% of the frame, centered.',
          'Do NOT add any text, logos, badges, pricing, ratings, hand-drawn elements, or decorative stickers.',
          'Ensure the shape, materials, and colors of the product are extremely clear and the entire outline is visible.'
        ]
      },
      {
        id: 'lifestyle-use',
        title: '使用場景圖',
        aspectRatio: '1:1',
        ratioValue: 1.0,
        note: '展示產品在真實生活/工作場景中的使用方式。',
        guidance: [
          'Generate a realistic lifestyle photo showing the product being used in a real life or work setting appropriate for its purpose.',
          'The product remains the center of focus. The background should be aesthetically pleasing but not distracting.',
          'You may show hands or people interacting with the product naturally, without altering the product\'s core design.'
        ]
      },
      {
        id: 'feature-callouts',
        title: '核心賣點圖',
        aspectRatio: '1:1',
        ratioValue: 1.0,
        note: '用少量嵌入式文案解釋 2-3 個賣點。',
        guidance: [
          'Design an informative graphic/infographic around the core selling points. Integrate short, clean textual callouts directly on the image.',
          'Ensure text is presented as part of a polished poster design, not as editable input boxes or raw UI elements.',
          'Avoid promotional hype, discount tags, or direct comparisons with competitor brands.'
        ]
      },
      {
        id: 'detail-closeup',
        title: '細節 / 材質圖',
        aspectRatio: '1:1',
        ratioValue: 1.0,
        note: '突出結構、材質、工藝或關鍵功能細節。',
        guidance: [
          'Generate a close-up macro-style shot highlighting the fine details, textures, joints, interfaces, or craftsmanship of the product.',
          'You may add simple annotation lines or minimal text tags to point out specific highlights.',
          'Keep the texture looking realistic and credible; avoid messy compositions.'
        ]
      },
      {
        id: 'scale-benefit',
        title: '尺寸 / 對比 / 信任圖',
        aspectRatio: '1:1',
        ratioValue: 1.0,
        note: '幫助用戶理解大小、使用收益或購買理由。',
        guidance: [
          'Provide a visual scale or comparison (e.g., placing the product next to common reference items, or showing a before/after result) to help users grasp dimensions and value.',
          'Ensure layout is clean, logical, and answers common customer doubts.',
          'Avoid unverified claims or aggressive comparative text.'
        ]
      },
      {
        id: 'a-plus-module',
        title: 'A+ 橫幅模組',
        aspectRatio: '16:9',
        ratioValue: 16 / 9,
        note: '適合 A+ 內容的品牌/功能橫幅。',
        guidance: [
          'Generate a horizontal banner section suitable for Amazon A+ detail page modules. Ensure a balanced combination of visuals and short text blocks.',
          'Emphasize brand aesthetic, premium product details, and core benefits appropriate for downward scrolling.',
          'Do NOT include QR codes, contact details, pricing, or temporary discount tags.'
        ]
      }
    ]
  },
  shopify_store: {
    id: 'shopify_store',
    name: 'Shopify / 獨立站商品頁',
    standards: [
      '商品圖組要保持一致的光線、機位、裁切和背景風格，便於在商品頁 and 集合頁瀏覽。',
      '主圖應讓產品成為焦點，附圖補充角度、材質、細節、使用方式和品牌氛圍。',
      '文字可以用於賣點廣告，但不要壓住產品，不要讓整組圖像風格跳躍。'
    ],
    recipes: [
      {
        id: 'gallery-hero',
        title: '獨立站主視覺',
        aspectRatio: '1:1',
        ratioValue: 1.0,
        note: '乾淨商品主視覺，適合商品頁首圖。',
        guidance: [
          'Generate a high-quality product hero shot suited for an e-commerce website gallery first image. Set it against a clean, aesthetic studio backdrop.',
          'Ensure soft, uniform studio lighting and minimal distractions, emphasizing the product\'s form and premium build.',
          'Keep the style clean and professional without overlaying promotional badges.'
        ]
      },
      {
        id: 'angle-detail',
        title: '角度 / 細節圖',
        aspectRatio: '1:1',
        ratioValue: 1.0,
        note: '補充不同角度、材質和關鍵結構。',
        guidance: [
          'Generate a product shot from a different perspective or close-up angle, maintaining the same lighting, color tone, and background theme.',
          'Highlight fine materials, joints, textured finishes, or packaging details.',
          'Maintain visual continuity with the main hero image.'
        ]
      },
      {
        id: 'lifestyle-scene',
        title: '生活方式圖',
        aspectRatio: '4:5',
        ratioValue: 4 / 5,
        note: '展示目標用戶真實使用場景。',
        guidance: [
          'Generate an aesthetic lifestyle photo depicting the product in a real, cozy, or active scene matching the target audience\'s lifestyle.',
          'Make sure the product remains clearly recognizable and naturally integrated into the environment. Avoid cluttered backgrounds.'
        ]
      },
      {
        id: 'benefit-banner',
        title: '賣點橫幅',
        aspectRatio: '16:9',
        ratioValue: 16 / 9,
        note: '適合商品頁模組的圖文賣點橫幅。',
        guidance: [
          'Generate a web-optimized feature banner with a wide crop. It should combine the product visual with clean, modern layout spacing for text overlays.',
          'Include 1-2 lines of clean promotional header text integrated into the design. Avoid looking like a cheap banner ad; make it look like a premium Apple-style product web section.'
        ]
      },
      {
        id: 'use-case-grid',
        title: '搭配 / 包裝圖',
        aspectRatio: '1:1',
        ratioValue: 1.0,
        note: '補充組合搭配、包裝或禮盒展示。',
        guidance: [
          'Generate a product layout displaying the product packaging, gift boxes, or combination sets side-by-side.',
          'Highlight what is included in the box and emphasize the premium look of the packaging.',
          'Maintain consistent lighting and color style.'
        ]
      }
    ]
  },
  meta_ads: {
    id: 'meta_ads',
    name: 'Meta 廣告 (FB/IG)',
    standards: [
      '資訊流單圖優先使用 4:5，方圖 1:1 適合更廣泛版位，Story/Reels 使用 9:16。',
      '廣告圖要快速傳達產品和利益點，可露出品牌，但文字要少、可讀，並避開邊緣安全區。',
      '優先展示真實人物/場景中的產品使用，減少純拼貼和低質促銷模板感。'
    ],
    recipes: [
      {
        id: 'feed-4x5',
        title: 'Meta 資訊流 4:5',
        aspectRatio: '4:5',
        ratioValue: 4 / 5,
        note: '行動資訊流主廣告圖，主體和利益點一眼可見。',
        guidance: [
          'Generate a 4:5 vertical feed ad graphic. The product and key benefit should be instantly recognizable at first glance.',
          'You may include minimal, highly readable typography or key benefit callouts, placed far from the borders (within the safe area).',
          'Make it look like a high-end brand campaign ad, avoiding cluttered layouts.'
        ]
      },
      {
        id: 'square-1x1',
        title: 'Meta 方圖 1:1',
        aspectRatio: '1:1',
        ratioValue: 1.0,
        note: '適配方圖版位和再行銷素材。',
        guidance: [
          'Generate a clean 1:1 square advertisement graphic with the product in sharp focus.',
          'Keep the composition balanced and highly visible even when displayed at smaller sizes on mobile devices.',
          'Include minimal text overlays.'
        ]
      },
      {
        id: 'story-9x16',
        title: 'Story / Reels 9:16',
        aspectRatio: '9:16',
        ratioValue: 9 / 16,
        note: '全螢幕直式廣告圖，避開頂部/底部 UI 遮擋區。',
        guidance: [
          'Generate a full-bleed 9:16 vertical video-style ad asset. Keep the product and key visuals centered vertically.',
          'Leave ample safe space at the very top and very bottom to avoid UI elements (avatar, share buttons, text overlays) on Instagram/Facebook Reels.'
        ]
      },
      {
        id: 'ugc-lifestyle',
        title: 'UGC 生活化圖',
        aspectRatio: '4:5',
        ratioValue: 4 / 5,
        note: '更真實的生活方式廣告方向。',
        guidance: [
          'Generate a natural, user-generated-content (UGC) style photo of the product in action. It should look like a real photo taken by a customer.',
          'Minimize commercial advertising graphics. Make it feel authentic, engaging, and highly relatable to the target audience while showing the product design clearly.'
        ]
      }
    ]
  },
  google_display: {
    id: 'google_display',
    name: 'Google 展示廣告',
    standards: [
      '常用響應式展示廣告圖片比例包括 1.91:1 和 1:1，分別對應推薦尺寸 1200x628、1200x1200。',
      '避免在圖片上疊加太繁雜的文字、Logo 和按鈕；產品或服務應成為焦點，不要做雜亂拼貼。',
      '圖片要高清、自然、不歪斜，保留合理的邊界留白。'
    ],
    recipes: [
      {
        id: 'landscape-191',
        title: 'Google 橫圖 1.91:1',
        aspectRatio: '1.91:1',
        ratioValue: 1.91,
        note: '響應式展示廣告橫圖，產品清楚。',
        guidance: [
          'Generate a 1.91:1 landscape display ad visual. The product should be the absolute visual focus of the layout.',
          'Do NOT overlay any digital buttons, frames, promotion labels, or large paragraph texts. Keep the background clean and natural.'
        ]
      },
      {
        id: 'square-1x1',
        title: 'Google 方圖 1:1',
        aspectRatio: '1:1',
        ratioValue: 1.0,
        note: '響應式展示廣告方圖，適配更多版位。',
        guidance: [
          'Generate a clean 1:1 square display ad visual. The product should be centered and keep a safe margin from the edges.',
          'Let the image serve as the visual hook; do not overlay ad copy text inside the graphic.'
        ]
      },
      {
        id: 'portrait-9x16',
        title: 'Google 豎圖 9:16',
        aspectRatio: '9:16',
        ratioValue: 9 / 16,
        note: '響應式豎版素材，適合行動端展示。',
        guidance: [
          'Generate a clean 9:16 portrait display ad visual. Keep the product scale moderate and well-balanced within the vertical frame.',
          'Ensure organic shadows and light reflections; avoid artificial collages.'
        ]
      }
    ]
  },
  general_ecommerce: {
    id: 'general_ecommerce',
    name: '通用電商套圖',
    standards: [
      '套圖要覆蓋主圖、使用場景、核心賣點、細節材質和信任資訊。',
      '文字只在賣點圖中少量使用，並直接融入圖片設計；主圖和場景圖優先保持乾淨。',
      '整組圖保持統一色調、光線、品牌語氣和產品外觀，避免風格跳躍。'
    ],
    recipes: [
      {
        id: 'clean-hero',
        title: '產品主圖',
        aspectRatio: '1:1',
        ratioValue: 1.0,
        note: '乾淨可信的產品主視覺。',
        guidance: [
          'Generate a clean, high-end product hero shot centered in the frame. The background should be minimal or plain studio-colored to avoid distractions.',
          'No text overlay or sales badges.'
        ]
      },
      {
        id: 'lifestyle',
        title: '生活方式圖',
        aspectRatio: '4:5',
        ratioValue: 4 / 5,
        note: '展示產品在真實目標人群生活中的使用方式。',
        guidance: [
          'Generate a beautiful, aspirational lifestyle shot showcasing the product in a natural context representing target customer habits.',
          'Focus on premium aesthetic, volumetric light, and harmonious colors.'
        ]
      },
      {
        id: 'benefit',
        title: '核心賣點圖',
        aspectRatio: '1:1',
        ratioValue: 1.0,
        note: '用清晰視覺層級表達 1-3 個核心賣點。',
        guidance: [
          'Design an aesthetic feature breakdown graphic. You may integrate small clean typographic bullet points showing key benefits.',
          'Ensure the text fits the overall graphic design style seamlessly.'
        ]
      },
      {
        id: 'detail',
        title: '細節材質圖',
        aspectRatio: '1:1',
        ratioValue: 1.0,
        note: '強化質感、材料、結構和關鍵功能。',
        guidance: [
          'Generate a detailed macro close-up highlighting product textures, premium materials, switches, interfaces, or construction.',
          'Focus on realistic details without blurry spots.'
        ]
      },
      {
        id: 'trust',
        title: '信任 / 購買理由圖',
        aspectRatio: '16:9',
        ratioValue: 16 / 9,
        note: '總結購買理由、適用人群或場景價值。',
        guidance: [
          'Generate a horizontal promotional banner visual summarizing the product\'s unique value proposition or trust factor (e.g., gift scenario, daily routine).',
          'Include clean and highly readable layouts.'
        ]
      }
    ]
  }
};

export function buildProductMarketingPrompt(
  config: ProductMarketingBrief,
  spec: ProductMarketingOutputSpec,
  index: number,
  total: number,
  sharedStyleAnchor?: string
): string {
  const sellingPointsPrompt = config.sellingPoints
    ? `Core Selling Points to convey: "${config.sellingPoints}"`
    : `Since core selling points are not specified, please automatically analyze the visual features, materials, and potential functions of the product, and design a backdrop or context that complements its natural utility and premium appearance.`;

  const audiencePrompt = config.targetAudience
    ? `Target Customer / Audience: "${config.targetAudience}"`
    : `Since target audience is not specified, please design the scene for general modern consumers, using neutral, elegant, and appealing context backgrounds.`;

  const styleAnchorPrompt = sharedStyleAnchor
    ? `Shared Visual Style Anchor:\n${sharedStyleAnchor}`
    : `Visual Tone & Atmosphere: "${config.visualTone || 'clean, modern, professional'}"`;

  return [
    `Design a professional e-commerce product marketing graphic: "${spec.title}" (Part ${index + 1}/${total} of the set).`,
    `CRITICAL — PRODUCT VISUAL ANCHOR: A high-quality photo of the physical product is attached as a reference image. You MUST extract and preserve this EXACT product (its shape, color, branding logo, textures, and details) in the generated image. Do NOT alter, distort, simplify, or redesign the product itself — place it realistically within the new scene/context.`,
    `Product Name: "${config.productName}"`,
    sellingPointsPrompt,
    audiencePrompt,
    styleAnchorPrompt,
    `This Image Goal: ${spec.note}`,
    `This Image Guidelines: ${spec.guidance.join(' ')}`,
    `Cohesive Set Requirements: Maintain absolute product consistency (same product color, exact features, logo mark placement). Maintain similar studio lighting angle, color palette tones, and overall premium aesthetic across all generated images in the set.`,
    `Output requirements: Directly produce the final designed raster image. Do NOT generate device frames, browser borders, or editing UI elements. If textual labels/callouts are requested, bake them cleanly into the graphic design with high legibility and zero spelling errors. Avoid garbled text.`
  ].filter(Boolean).join('\n');
}
