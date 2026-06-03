
import type { ShapeElement, ArrowHeadType, TextElement, ArrowElement, SimpleFadeOptions } from '../types';

// Updated Color Palette - Pastel Tones (Light Bg, Dark Text)
export const COLORS = [
  { name: '白', bg: 'bg-[#FFFFFF]', text: 'text-[#1D1D1F]' },
  { name: '淺灰', bg: 'bg-[#F5F5F7]', text: 'text-[#1D1D1F]' },
  { name: '淺藍', bg: 'bg-[#E3F2FD]', text: 'text-[#1D1D1F]' },
  { name: '淺紫', bg: 'bg-[#F3E5F5]', text: 'text-[#1D1D1F]' },
  { name: '淺紅', bg: 'bg-[#FFEBEE]', text: 'text-[#1D1D1F]' },
  { name: '淺橘', bg: 'bg-[#FFF3E0]', text: 'text-[#1D1D1F]' },
  { name: '淺黃', bg: 'bg-[#FFFDE7]', text: 'text-[#1D1D1F]' },
  { name: '淺綠', bg: 'bg-[#E8F5E9]', text: 'text-[#1D1D1F]' },
  { name: '透明', bg: 'bg-transparent', text: 'text-[#1D1D1F]' },
];

// 36+ Magic Style Presets (Restored Full List)
export const STYLE_PRESETS = [

  // ── 繪畫與插畫 ──────────────────────────────────────────────
  {
    id: 'Minimalist', name: '極簡主義', label: 'Minimalist',
    prompt: 'Transform into minimalist style: reduce to essential shapes only, maximum white space, flat colors with no gradients, clean geometric forms, remove all unnecessary detail, Swiss design influence.'
  },
  {
    id: 'Watercolor', name: '水彩暈染', label: 'Watercolor Bleed',
    prompt: 'Transform into expressive watercolor painting: soft wet-on-wet color bleeding at edges, visible paper texture, translucent layered washes, organic brushstrokes, colors bleed and merge naturally, white paper showing through highlights.'
  },
  {
    id: 'Oil Painting', name: '古典油畫質感', label: 'Classical Oil Painting',
    prompt: 'Transform into classical oil painting: thick impasto brushstrokes with visible texture, rich saturated colors, dramatic chiaroscuro lighting, Renaissance or Baroque influence, painterly edges with soft blending in shadows.'
  },
  {
    id: 'Sketch', name: '素描線條', label: 'Pencil Sketch Lines',
    prompt: 'Transform into pencil sketch: hand-drawn graphite lines, cross-hatching for shadows, loose gestural strokes, white paper background, varying line weight from thin to bold, minimal color — monochromatic gray tones only.'
  },
  {
    id: 'Impressionism', name: '印象派', label: 'Impressionism',
    prompt: 'Transform into Impressionist painting: short visible dabs and strokes of pure color, light and atmosphere over precise detail, Monet or Renoir influence, colors placed side by side rather than blended, vibrating optical color mixing effect.'
  },
  {
    id: 'Chinese Ink Wash', name: '中國水墨', label: 'Chinese Ink Wash (Shan Shui)',
    prompt: 'Transform into traditional Chinese ink wash painting (水墨畫): black ink gradients from deep to pale, rice paper texture, empty negative space as composition element, expressive calligraphic brushstrokes, mist and atmosphere, Shan Shui landscape style.'
  },

  // ── 動漫與漫畫 ──────────────────────────────────────────────
  {
    id: 'Comic Book', name: '美式漫畫', label: 'American Comic Book Style',
    prompt: 'Transform into American comic book style: bold black ink outlines, Ben-Day dots halftone shading, flat primary colors, dynamic action lines, Marvel or DC Comics influence, high contrast cel-shading.'
  },
  {
    id: 'Japanese Anime', name: '日系動漫', label: 'Japanese Anime Style',
    prompt: 'Transform into Japanese anime illustration style: clean vector-like outlines, cel-shaded flat colors with sharp highlight spots, large expressive eyes if characters present, pastel color palette, Studio Ghibli or modern anime aesthetic.'
  },
  {
    id: 'Manga Ink', name: '漫畫墨線', label: 'Manga Ink Lineart',
    prompt: 'Transform into black and white manga style: precise ink linework, screen tone dot patterns for shading, high contrast black and white only, speed lines for motion, dramatic shadow shapes, Shonen manga aesthetic.'
  },
  {
    id: 'Chibi', name: 'Q版娃娃', label: 'Chibi Super Deformed',
    prompt: 'Transform into chibi super-deformed style: extremely large head (50% of body), tiny stubby limbs, oversized cute eyes, round simplified body shapes, bright saturated pastel colors, exaggerated cute expressions.'
  },
  {
    id: 'Webtoon', name: '韓系條漫', label: 'Webtoon Style',
    prompt: 'Transform into Korean webtoon style: clean modern line art, soft pastel color palette, subtle gradient shading, contemporary fashion and character design, LINE Webtoon aesthetic, slightly realistic proportions with large eyes.'
  },
  {
    id: 'Mecha', name: '機甲鋼彈', label: 'Mecha Gundam Aesthetic',
    prompt: 'Transform into Gundam mecha illustration style: hard surface mechanical armor panels, technical linework with panel lines and rivets, metallic color schemes (gray, white, red, blue), sharp angular geometric forms, Sunrise anime mecha design influence.'
  },

  // ── 攝影與底片 ──────────────────────────────────────────────
  {
    id: 'Vintage 1950s', name: '復古底片', label: 'Vintage 1950s Film Stock',
    prompt: 'Transform into 1950s vintage film photography: faded desaturated colors, warm yellow-orange film grain, slight vignette, Kodachrome color palette, retro mid-century aesthetic, soft lens halation on bright areas.'
  },
  {
    id: 'Polaroid', name: '拍立得', label: 'Polaroid Overtone',
    prompt: 'Transform into Polaroid instant photo aesthetic: slightly overexposed bright center, cool blue-green color shift in shadows, soft focus edges, slight color bleed and chemical imperfections, warm whites, vintage snapshot feel.'
  },
  {
    id: 'Noir', name: '黑白電影', label: 'Film Noir Photography',
    prompt: 'Transform into Film Noir black and white photography: extreme high contrast, deep crushed blacks, bright harsh highlights, dramatic side lighting with strong shadows, 1940s detective movie aesthetic, no color at all — pure monochrome.'
  },
  {
    id: 'Sepia Old', name: '懷舊泛黃', label: 'Vintage Sepia',
    prompt: 'Transform into antique sepia photograph: warm brown monochrome tones, aged paper yellowing, heavy film grain and scratches, vignette darkening at corners, 1900s Victorian era photography aesthetic, faded and slightly overexposed.'
  },
  {
    id: 'Lomo', name: 'Lomo暗角', label: 'Lomo Photography Vignette',
    prompt: 'Transform into Lomography film style: extreme dark vignette at all corners, oversaturated vivid colors, slight lens distortion, cross-processed color shifts (cyan in shadows, yellow in highlights), accidental light leaks, raw unfiltered film energy.'
  },
  {
    id: 'Cinematic HDR', name: '電影質感', label: 'Cinematic HDR',
    prompt: 'Transform into cinematic HDR film grade: teal shadows and orange highlights (Hollywood blockbuster color grade), anamorphic lens flares, shallow depth of field blur, film grain, widescreen cinematic crop feel, dramatic contrast with lifted blacks.'
  },

  // ── 數位與現代藝術 ──────────────────────────────────────────
  {
    id: 'Cyberpunk', name: '賽博龐克', label: 'Cyberpunk',
    prompt: 'Transform into Cyberpunk aesthetic: neon pink, cyan and purple lighting, rain-slicked reflective surfaces, high-tech low-life urban atmosphere, holographic overlays, dark dystopian mood, Blade Runner and Ghost in the Shell influence.'
  },
  {
    id: 'Pop Art', name: '普普藝術', label: 'Pop Art Screenprint',
    prompt: 'Transform into Pop Art style: bold flat primary colors (red, yellow, blue, black), Ben-Day dot printing texture, thick black outlines, Andy Warhol or Roy Lichtenstein influence, graphic and commercial aesthetic, halftone dot patterns.'
  },
  {
    id: 'Neon', name: '霓虹光感', label: 'Neon',
    prompt: 'Transform into neon glow aesthetic: glowing neon light effects in pink, cyan and electric blue, dark background with luminous color blooms, neon sign light bleed, 80s nightclub atmosphere, electric glow halos around all edges.'
  },
  {
    id: 'Pixel Art', name: '像素風', label: 'Pixel Art 8-bit / 16-bit',
    prompt: 'Transform into retro pixel art: visible large square pixels, limited 16-32 color palette, no anti-aliasing, 8-bit or 16-bit video game aesthetic, chunky pixelated forms, NES or SNES era game sprite style.'
  },
  {
    id: 'Glassmorphism', name: '毛玻璃', label: 'Glassmorphism UI',
    prompt: 'Transform into glassmorphism UI aesthetic: frosted glass translucent panels, backdrop blur effect, subtle white border highlights, soft pastel gradient backgrounds visible through glass, clean modern tech product design aesthetic.'
  },
  {
    id: 'Glitch Effect', name: '故障藝術', label: 'Glitch Effect Artifacts',
    prompt: 'Transform into digital glitch art: RGB color channel separation (chromatic aberration), horizontal scan line displacement, pixel sorting artifacts, corrupted data visual noise, VHS tracking errors, cyberpunk digital decay aesthetic.'
  },
  {
    id: 'Vaporwave', name: '蒸氣波', label: 'Vaporwave',
    prompt: 'Transform into Vaporwave aesthetic: pink and purple pastel palette, retro 80s-90s nostalgia, Greek marble statues, palm trees, sunset gradients, synthwave grid lines, Windows 95 pixel fonts influence, dreamy lo-fi atmosphere.'
  },
  {
    id: 'Flat Design', name: '扁平化', label: 'Flat Design Minimal',
    prompt: 'Transform into flat design illustration: zero shadows or gradients, bold geometric shapes, limited flat color palette, clean vector graphic aesthetic, modern app icon style, Material Design or iOS icon influence.'
  },

  // ── 特殊材質與色彩 ─────────────────────────────────────────
  {
    id: 'Matte Pastel', name: '柔霧粉彩', label: 'Matte Pastel',
    prompt: 'Transform into soft matte pastel aesthetic: desaturated dusty pastel colors (blush pink, sage green, lavender, cream), no glossy highlights, soft diffused lighting, gentle and calming mood, modern Korean or Japanese lifestyle photography feel.'
  },
  {
    id: 'Gothic', name: '哥德暗黑', label: 'Gothic Noir',
    prompt: 'Transform into Gothic dark art: deep blacks and dark purples, dramatic candlelight or moonlight, Victorian architectural elements, intricate ornamental details, dark romantic atmosphere, medieval cathedral aesthetic, ominous and mysterious mood.'
  },
  {
    id: 'Grunge', name: '髒髒搖滾', label: 'Grunge Texture',
    prompt: 'Transform into grunge aesthetic: distressed textures, rough torn edges, splattered ink and paint, washed-out desaturated colors, worn and degraded surfaces, 90s alternative rock DIY visual culture, raw and unpolished energy.'
  },
  {
    id: 'Japanese Ukiyo-e', name: '浮世繪', label: 'Japanese Ukiyo-e',
    prompt: 'Transform into Japanese Ukiyo-e woodblock print: flat areas of solid color with precise outlines, traditional Japanese color palette (indigo, vermillion, gold), stylized wave and cloud patterns, Hokusai or Hiroshige influence, visible woodgrain texture.'
  },
  {
    id: 'Duotone', name: '雙色調', label: 'Duotone Blue & Pink',
    prompt: 'Transform into duotone color treatment: replace all shadows with deep electric blue (#0a0a8e) and all highlights with hot pink (#ff2d9b), high contrast graphic design aesthetic, Spotify-style duotone poster effect, all midtones blend between the two colors.'
  },
  {
    id: 'Paper Cutout', name: '剪紙陰影', label: 'Paper Cutout Layered',
    prompt: 'Transform into paper cutout collage art: layered flat paper shapes with visible drop shadows between layers, craft paper texture, precise cut edges, shadow depth suggesting physical paper layers, matisse or kara walker inspired silhouette style.'
  },
  {
    id: 'Vivid High', name: '高飽和鮮豔', label: 'Vivid High Saturation',
    prompt: 'Transform into hyper-vivid oversaturated style: push all colors to maximum saturation, electric and neon-bright hues, high contrast, almost unreal color intensity, HDR-overdone aesthetic, ultra-punchy colors that pop aggressively.'
  },
  {
    id: 'Muted Earth', name: '大地色系', label: 'Muted Earth Tones',
    prompt: 'Transform into muted earth tone palette: terracotta, warm sand, olive green, burnt sienna, raw umber, dusty rose — all desaturated warm neutrals, natural organic aesthetic, Scandinavian or Japanese wabi-sabi interior design feel.'
  },
  {
    id: 'Blueprint', name: '藍圖工程', label: 'Blueprint Cyanotype',
    prompt: 'Transform into architectural blueprint technical drawing: white or cyan linework on deep Prussian blue background, precise technical annotation lines, measurement indicators, engineering drafting aesthetic, isometric or orthographic projection feel.'
  },
  {
    id: 'Risograph', name: '孔版印刷', label: 'Risograph Print Overlay',
    prompt: 'Transform into Risograph print aesthetic: limited 2-3 color ink layers with visible misregistration offset, grainy halftone dot texture, slightly translucent ink overlap creating new mixed colors, zine and indie print culture, fluorescent ink colors (fluo pink, teal, yellow).'
  },

  // ── 節慶限定 ────────────────────────────────────────────────
  {
    id: 'Lunar New Year', name: '台式新春喜慶', label: 'Lunar New Year Traditional Red',
    prompt: 'Transform into modern Lunar New Year celebration: rich crimson and imperial gold foil accents, traditional intricate paper-cutting patterns, dynamic festive typography energy, elegant Chinese ink flourishes, red lanterns and firecracker bursts, auspicious joyful atmosphere.'
  },
  {
    id: 'Japanese Matsuri', name: '日系夏日祭典', label: 'Japanese Matsuri Festivities',
    prompt: 'Transform into traditional Japanese summer festival (夏祭り): deep indigo night sky illuminated by glowing warm paper lanterns (chochin), vibrant festival food stall colors, exploding fireworks bokeh in background, uchiwa fan and yukata textile motifs, lively summer night atmosphere.'
  },
  {
    id: 'Sakura Ohanami', name: '浪漫櫻花祭', label: 'Sakura Ohanami Cherry Blossom',
    prompt: 'Transform into airy Japanese cherry blossom festival (お花見): soft pastel pink sakura petals drifting in gentle breeze, golden hour spring sunlight filtering through blossoms, minimalist clean composition, romantic spring Tokyo vibe, delicate petal bokeh background.'
  },
  {
    id: 'Mid-Autumn Moon', name: '中秋明月夜', label: 'Mid-Autumn Moonlit',
    prompt: 'Transform into mystical Mid-Autumn festival: giant luminous golden full moon dominating composition, deep midnight blue star-filled sky, delicate jade rabbit and osmanthus silhouettes, glowing traditional lanterns reflecting on water, elegant ethereal mooncake festival atmosphere.'
  },
  {
    id: 'Cozy Christmas', name: '北歐聖誕冬景', label: 'Cozy Christmas Hygge',
    prompt: 'Transform into cozy Nordic Christmas aesthetic: rich pine green and velvet crimson color palette, warm glowing golden fairy lights bokeh, soft fluffy falling snowflakes, rustic dark wood and knit textures, warm hygge candlelight holiday mood, Scandinavian winter comfort.'
  },
  {
    id: 'Spooky Halloween', name: '萬聖搞怪霓虹', label: 'Spooky Halloween Neon',
    prompt: 'Transform into playful Halloween horror: neon pumpkin orange and toxic acid green, deep dark purple night sky, glowing carved jack-o-lantern expressions, subtle cobweb and bat overlays, high contrast spooky party vibe, fun-scary not terrifying mood.'
  },
  {
    id: 'Valentine Romance', name: '西洋浪漫情人', label: 'Valentine Romance',
    prompt: 'Transform into luxurious Valentine\'s Day romance: saturated ruby red and soft blush pink gradient, rich warm candlelight glow, elegant rose petal textures scattered across surface, romantic soft-focus bokeh blur, velvet and satin material feel, intimate and passionate mood.'
  },
  {
    id: 'Japanese Shogatsu', name: '日系和風正月', label: 'Japanese Shogatsu Elegance',
    prompt: 'Transform into sacred Japanese New Year (正月): auspicious red and white Kohaku color scheme, elegant gold pine, bamboo and plum blossom (松竹梅) accents, minimalist modern Shinto torii gate aesthetic, crisp clean winter holiday atmosphere, celebratory fresh start energy.'
  },
  {
    id: 'Easter Pastel', name: '復活節粉彩', label: 'Easter Pastel Egg',
    prompt: 'Transform into playful Easter holiday: soft pastel marshmallow colors (mint green, baby blue, lemon yellow, lilac), cute hidden Easter egg patterns, whimsical spring floral and bunny accents, cheerful bright spring morning aesthetic, gentle and joyful mood.'
  },
  {
    id: 'Retro Ghost Fest', name: '台式復古中元', label: 'Taiwanese Retro Ghost Fest',
    prompt: '將圖片轉換為1980年代台灣中元普渡的復古視覺風格：農曆七月夜市巷弄中溫暖的紅色紙燈籠光暈、燃燒金紙的火焰光影、供桌上的香火煙霧繚繞、野台戲的老舊木製舞台背板、褪色的台灣老街底片顆粒感，主色調為琥珀黃與廟宇紅，充滿台灣本土民俗儀式氛圍。'
  },

  // ── 次文化少女暗黑美學 ────────────────────────────────────────
  {
    id: 'Coquette', name: '芭蕾少女風', label: 'Coquette',
    prompt: 'Transform into coquette balletcore aesthetic: soft pastel pink and cream tones, delicate silk ribbons and bows, pearl overlays, vintage lace textures, romantic and nostalgic feminine mood, tulle layers, soft backlighting halo.'
  },
  {
    id: 'Jelly Candy', name: '軟萌果凍感', label: 'Jelly Candy',
    prompt: 'Transform into 2026 jelly candy aesthetic: semi-translucent glossy textures, high-shine rubberized surfaces, vibrant gummy candy colors (cherry red, lemon yellow, grape purple), dewy highlights, playful squishy forms, liquid jelly blush color palette.'
  },
  {
    id: 'Y2K McBling', name: '千禧閃粉辣妹', label: 'Y2K McBling',
    prompt: 'Transform into early 2000s Y2K McBling aesthetic: rhinestone glitter sparkle effects, hot pink and chrome silver metallic color palette, bedazzled gemstone texturing, cyber-fairy butterfly wings, glossy high-contrast pop culture vibes, Paris Hilton era maximalism.'
  },
  {
    id: 'Decora Pop', name: '原宿超載可愛', label: 'Decora Pop',
    prompt: 'Transform into Harajuku Decora pop style: colorful plastic hair clips and accessories overloading every surface, chaotic rainbow color scheme, layered cute sticker bomb textures, maximalist toy and candy aesthetic, hyper-energetic playful kawaii overload.'
  },
  {
    id: 'Vamp Romantic', name: '暗黑吸血浪漫', label: 'Vamp Romantic',
    prompt: 'Transform into 2026 Vamp Romantic aesthetic: deep crimson and crushed black velvet tones, Carmilla gothic influence, dramatic candlelit shadows on stone walls, lace chokers and pearl jewelry, dark romantic elegance with seductive mysterious undertones.'
  },
  {
    id: 'Weirdcore', name: '怪誕夢境流', label: 'Weirdcore',
    prompt: 'Transform into surreal Weirdcore aesthetic: low-res flash photography textures, liminal empty spaces, uncanny dreamlike juxtapositions, pixelated eyes or floating clouds, nostalgic yet deeply unsettling subculture mood, wrong lighting and odd angles.'
  },
  {
    id: 'Analog Horror', name: '類比恐怖影帶', label: 'Analog Horror',
    prompt: 'Transform into analog horror style: 1980s VHS tracking distortion bands, CRT monitor screen glare and curvature, low-fidelity muted color leaks, eerie public emergency broadcast typography, grainy psychological suspense atmosphere, corrupted signal decay.'
  },
  {
    id: 'Pastel Goth', name: '軟萌暗黑風', label: 'Pastel Goth',
    prompt: 'Transform into Pastel Goth creepy-cute aesthetic: soft lavender, mint and baby pink colors mixed with black skulls and inverted crosses, kawaii gothic illustration, cute-but-dark contrast, pastel rainbow paired with occult symbols.'
  },
  {
    id: 'Whimsigothic', name: '空靈巫術風', label: 'Whimsigothic',
    prompt: 'Transform into Whimsigothic aesthetic: celestial sun, moon and star motifs, dark witchy mystical elements, velvet and brocade fabric textures, deep jewel tones (emerald, sapphire, amethyst), candles and crystals, mystical bohemian vibe.'
  },
  {
    id: 'Alien Core', name: '外星靈動科幻', label: 'Alien Core',
    prompt: 'Transform into Extra Celestial Alien Core aesthetic: opalescent iridescent surface sheen, soft dewy bioluminescent glow, futuristic extraterrestrial organic structures, icy metallic chrome accents, translucent membrane textures, ethereal sci-fi otherworldly mood.'
  },
  {
    id: 'Fairy Grunge', name: '微光廢土仙子', label: 'Fairy Grunge',
    prompt: 'Transform into Fairy Grunge subculture style: earthy muted tones (moss green, muddy brown, slate gray), distressed raw frayed edge textures, ethereal translucent fairy wings layered over heavy grunge grain and paint splatters, contradiction of delicate and dirty.'
  },
  {
    id: 'Glacier Blue', name: '極地冰霜冷調', label: 'Glacier Blue',
    prompt: 'Transform into Glacier Cool Blue aesthetic: frosted icy surface textures, sharp crystal and ice refraction patterns, strictly monochromatic pale ice blue and absolute white color palette, stark frozen glacier atmosphere, clean metallic shimmer highlights, no warmth at all.'
  },
  {
    id: 'Naïve Art', name: '原生稚拙藝術', label: 'Naïve Art',
    prompt: 'Transform into Naïve art painting style: intentional imperfections and wobbly unsteady lines, deceptively simple loose scratchy marks, awkward character proportions with flat perspective, raw childlike authenticity, crayon or tempera paint texture, rejecting digital polish entirely.'
  },
  {
    id: 'Fractured Glass', name: '碎裂玻璃稜鏡', label: 'Fractured Glass',
    prompt: 'Transform into fractured glass refraction effect: layered broken glass shards at multiple angles, sharp prism-like light splitting into rainbow spectra, dynamic lens flare rainbow streaks, geometric glass cutting plane overlays, futuristic tension and high visual depth.'
  },

  // ── 新世代潮流 ──────────────────────────────────────────────
  {
    id: 'Neubrutalism', name: '新野獸派', label: 'Neubrutalism',
    prompt: 'Transform into Neubrutalism graphic design: thick black outlines (#000000), high-contrast stark drop shadows offset to bottom-right, flat vibrant pastel backgrounds with zero gradients, bold oversized typography elements, asymmetric raw layouts, anti-design web aesthetic.'
  },
  {
    id: 'Claymorphism', name: '黏土玩具', label: 'Claymorphism',
    prompt: 'Transform into claymorphism 3D illustration: soft inflated rounded 3D shapes as if sculpted from clay, matte clay surface texture, subtle inner shadows for depth illusion, glossy plastic toy highlights on rounded edges, playful cheerful character or object proportions, pastel color palette.'
  },
  {
    id: 'Acid Graphics', name: '酸性液態金屬', label: 'Acid Graphics',
    prompt: 'Transform into Acid Graphics design: liquid chrome and metallic textures, psychedelic iridescent mercury-like reflections, swirling silver and oil-slick color waves, high-tech tribal vector overlays, dark underground club flyer aesthetic, hypnotic metallic distortion.'
  },
  {
    id: 'Xerox Lo-Fi', name: '影印機殘留', label: 'Xerox Lo-Fi',
    prompt: 'Transform into high-contrast vintage photocopy aesthetic: rough toner grain texture, blown-out crushed blacks, faint horizontal scan lines, trailing toner dust artifacts, low-fidelity zine print look, strictly monochromatic black and white, raw underground DIY feel.'
  },
  {
    id: 'Frutiger Aero', name: '千禧泡泡未來', label: 'Frutiger Aero',
    prompt: 'Transform into Frutiger Aero aesthetic from the late 2000s: glossy glass spheres and water droplets, vibrant green and sky blue aurora gradients, shiny reflective plastics, organic nature-meets-technology design, soft glowing light blooms, tech-optimism nostalgia from 2004–2012 Windows Vista era.'
  },
  {
    id: 'Groovy Retro', name: '70年代迷幻', label: 'Groovy Retro',
    prompt: 'Transform into 70s psychedelic groovy art: melting and swirling organic shapes, warm retro color palette (mustard yellow, burnt orange, avocado green, harvest gold), wavy fluid flowing lines, concentric rainbow halos, hippie counterculture poster aesthetic, peace-era typography feel.'
  },
  {
    id: 'Spatial UI', name: '空間UI透鏡', label: 'Spatial UI',
    prompt: 'Transform into Apple Vision Pro spatial UI aesthetic: realistic volumetric frosted glass panels with refraction, dynamic pass-through environment shadows cast on surfaces, subtle outer glow emissions, deep multi-layered interface depth, ultra-clean white and translucent materials, serene futuristic calm.'
  },
  {
    id: 'Fish-eye Lens', name: '街頭魚眼視角', label: 'Fish-eye Lens',
    prompt: 'Transform into extreme fish-eye lens photography: circular ultra-wide angle barrel distortion, dramatically stretched outer edges, heavy chromatic aberration fringing at borders, raw grainy film texture, 90s underground skateboard and streetwear documentary look.'
  },
  {
    id: 'Woodcut Print', name: '粗獷木刻版畫', label: 'Woodcut Print',
    prompt: 'Transform into traditional linocut woodblock print: coarse hand-carved textures with visible gouge marks, raw blocky ink applications, deliberate imperfect edges, high contrast black ink on cream paper, distressed worn look, expressionist German woodcut or folk art influence.'
  },
  {
    id: 'Thermal Heat', name: '熱顯像感應', label: 'Thermal Heat',
    prompt: 'Transform into infrared thermal imaging camera style: vibrant heat-mapped gradient spectrum (white and yellow for hottest areas, orange-red for mid heat, deep blue and purple for coldest areas), no photographic textures — pure thermal color data, high contrast trippy scientific look.'
  },
  {
    id: 'Neo-Bauhaus', name: '包浩斯數據', label: 'Neo-Bauhaus',
    prompt: 'Transform into strict Bauhaus infographic design: rigid geometric grid alignment, clean primary colors (red, yellow, blue, black) on muted warm beige background, utilitarian sans-serif layout, circles squares and triangles as core compositional elements, 1920s Dessau school aesthetic.'
  },
  {
    id: 'Sticker Collage', name: '貼紙標籤拼貼', label: 'Sticker Collage',
    prompt: 'Transform into die-cut sticker collage: overlapping layers of stickers with thick white outer border around each element, mix of glossy and matte sticker surface textures, soft drop shadows between overlapping layers, playful chaotic arrangement, colorful and energetic scrapbook aesthetic.'
  },
  {
    id: 'Biophilic', name: '光影侘寂自然', label: 'Biophilic',
    prompt: 'Transform into biophilic minimalism aesthetic: organic leaf and branch shadows projected softly onto raw concrete, linen or rice paper walls, soft diffused natural side-daylight, earthy organic textures, quiet contemplative wabi-sabi atmosphere, muted neutral palette with one organic accent.'
  },
  {
    id: 'Maximalism', name: '極大主義混亂', label: 'Maximalism',
    prompt: 'Transform into maximalist visual overload art: dense collage of overlapping text layers, mixed media patterns clashing, conflicting textures stacked together, kaleidoscopic color combinations, chaotic high-energy composition leaving no empty space, anti-minimalism sensory overload, every surface covered.'
  },

  // ── 歷史與宗教 ──────────────────────────────────────────────
  {
    id: 'Showa Retro', name: '日式昭和復古', label: 'Showa Retro',
    prompt: 'Transform into 1960s Japanese Showa retro style: warm nostalgic color grading with faded yellows and warm reds, hand-drawn vintage signage and shop awning look, faded printed ink textures on aged paper, cozy mid-century neighborhood shotengai shop aesthetic.'
  },
  {
    id: 'Byzantine Mosaic', name: '拜占庭馬賽克', label: 'Byzantine Mosaic',
    prompt: 'Transform into sacred Byzantine mosaic art: intricate tiling patterns made of tiny gold leaf and colored stone tesserae, flat religious icon style with no perspective, majestic golden background glow, divine historical texture, Hagia Sophia or Ravenna basilica influence.'
  },
  {
    id: 'Soviet Constructivism', name: '蘇聯構成主義', label: 'Soviet Constructivism',
    prompt: 'Transform into Soviet Constructivism propaganda poster: bold geometric shapes with stark diagonal layouts, limited striking color palette (crimson red, deep black, cream white), aggressive political avant-garde graphic design, El Lissitzky and Rodchenko influence, typographic dynamism.'
  },
  {
    id: 'Taisho Roman', name: '大正浪漫', label: 'Taisho Roman',
    prompt: 'Transform into Japanese Taisho Roman aesthetic (1912–1926): early 20th-century fusion of Eastern and Western culture, stained glass motifs, vintage kimono geometric patterns blended with European Art Nouveau flourishes, nostalgic romantic elegance, soft sepia tones.'
  },
  {
    id: 'Sacred Stained Glass', name: '宗教彩繪玻璃', label: 'Sacred Stained Glass',
    prompt: 'Transform into Gothic cathedral stained glass window: translucent vibrant jewel-colored glass panels (ruby red, cobalt blue, emerald green), thick black lead line outlines separating each section, divine light rays streaming through, luminous backlit religious art style.'
  },
  {
    id: 'Imperial Propaganda', name: '日式戰爭海報', label: 'Imperial Propaganda',
    prompt: 'Transform into wartime Japanese propaganda poster art: distressed coarse paper texture, bold dynamic Kanji typography with rising sun rays motif, vintage militaristic hand-painted ink wash aesthetic, high contrast red and black palette, 1940s Imperial Japan visual language.'
  },

  // ── 稀有與新趨勢 ────────────────────────────────────────────
  {
    id: 'Glass Block', name: '玻璃棱鏡畸變', label: 'Glass Block',
    prompt: 'Transform into Glass Block privacy glass architectural trend: heavy vertical ribbing refractive textures, translucent barrier distortions, imagery refracted and smeared beneath fluted architectural glass panels, multi-layered depth and frosted obscuring effect.'
  },
  {
    id: 'Brute Force', name: '熟成粗獷主義', label: 'Brute Force',
    prompt: 'Transform into mature Brute Force raw layout style: naked grid structures, deadpan raw composition, heavy stacked black-and-white sans-serif typography, zero decoration or ornamentation, brutally honest anti-aesthetic, pure functional information architecture.'
  },
  {
    id: 'Bronze Age', name: '青銅器時代', label: 'Bronze Age',
    prompt: 'Transform into Bronze Age metalwork aesthetic: weathered metallic warm bronze tones, heavy green mineral verdigris patina textures, ancient ceremonial vessel surface patterns, deeply textured hammered metal appearance, simultaneously ancient and futuristic artisanal feel.'
  },
  {
    id: 'Obsidian Black', name: '黑曜石奢華', label: 'Obsidian Black',
    prompt: 'Transform into Obsidian luxury dark aesthetic: deep glossy liquid jet-black background, ultra-sharp contrast between matte and mirror-sheen black coatings, volcanic glass surface texture, mysterious premium dark aura, minimal light reflections cutting through deep darkness.'
  },
  {
    id: 'Prompt Playground', name: '提示詞遊樂場', label: 'Prompt Playground',
    prompt: 'Transform into Prompt Playground tech-art style: retro UI structural elements, accidental spreadsheet grid backdrops, code snippet and terminal overlays integrated into art composition, toggles and dropdown window motifs, lo-fi tech-empowerment creative energy.'
  },
  {
    id: 'Cyber Hacker', name: '電子世界駭客風', label: 'Cyber Hacker',
    prompt: 'Transform into terminal hacker aesthetic: cascading neon green code rain falling vertically, glowing monospace typography, terminal command-line prompt layout, digital glitch scan artifacts, matrix-style grid overlay, deep absolute black cyber void background.'
  },
  {
    id: 'Reality Warp', name: '現實扭曲流', label: 'Reality Warp',
    prompt: 'Transform into 2026 Reality Warp subculture: editorial layouts smashed with surreal digital distortion elements, liminal empty spaces, uncanny reality filters, dreamy psychological juxtapositions, detached cool tone color grading, familiar made deeply strange.'
  },
  {
    id: 'Trinket Curation', name: '標本物件陳列', label: 'Trinket Curation',
    prompt: 'Transform into Trinket Curation flat-lay aesthetic: everyday symbolic small objects (vintage coins, old keys, crystals, stamps) arranged in neat museum-style geometric shadow boxes, clean scrapbook flat-lay composition, soft directional studio lighting on each object.'
  },
  {
    id: 'Aerochrome', name: '紅外線底片', label: 'Aerochrome',
    prompt: 'Transform into Kodak Aerochrome infrared photography: surreal color-swapped landscape where foliage and vegetation turn into hyper-vivid crimson and electric magenta, high-contrast deep dark teal and near-black skies, dreamlike alien natural world.'
  },
  {
    id: 'Modern Kintsugi', name: '現代金繕美學', label: 'Modern Kintsugi',
    prompt: 'Transform into minimalist Kintsugi art: deep matte charcoal or black backdrop, fractured gold joinery lines running organically and elegantly across broken elements, wabi-sabi philosophy of beautiful imperfection, refined broken geometry repaired with liquid gold.'
  },
  {
    id: 'Solarpunk', name: '日光永續未來', label: 'Solarpunk',
    prompt: 'Transform into Solarpunk eco-optimism aesthetic: organic Art Nouveau architectural curves wrapped around modern solar panels, lush hydroponic vertical garden greenery, warm brass and copper accents, stained glass filtering warm sunlight, hopeful sustainable future utopia.'
  },
  {
    id: 'Lunarpunk', name: '月光螢光生態', label: 'Lunarpunk',
    prompt: 'Transform into Lunarpunk night ecology aesthetic: deep spiritual indigo and cold silver color scheme, glowing bioluminescent mushrooms and moss, ethereal moonlight rays through forest canopy, mystical organic technology, magic and science coexisting at night.'
  },
  {
    id: 'Cassette Futurism', name: '卡帶未來主義', label: 'Cassette Futurism',
    prompt: 'Transform into 80s Cassette Futurism aesthetic: clunky beige and gray plastic personal computer hardware textures, green phosphor CRT monitor screen scanlines, physical clicky mechanical keyboard buttons, analog magnetic tape data drive aesthetic, retrofuturistic optimism.'
  },
  {
    id: 'Gorpcore Topo', name: '機能戶外等高線', label: 'Gorpcore Topo',
    prompt: 'Transform into Gorpcore technical outdoor topographic style: clean vector topographic elevation contour line maps, alpine GPS coordinate data overlays, tactical military grid lines, earthy neutral trail tones (khaki, sage green, safety orange), functional outdoor gear aesthetic.'
  },
  {
    id: 'Dark Academia', name: '暗黑學院古典', label: 'Dark Academia',
    prompt: 'Transform into Dark Academia lifestyle aesthetic: old heavy leather-bound book textures, antique cursive calligraphy ink sketches on yellowed paper, candlelit dark mahogany library tables, moody classical university atmosphere, ivy league collegiate mystery.'
  },
  {
    id: 'Rococo Opulence', name: '洛可可金奢', label: 'Rococo Opulence',
    prompt: 'Transform into 18th-century Rococo extravagance: intricate asymmetric gold scrollwork gilding, pastel marble dust and plaster texture, cherub and ornate floral motifs, extreme classical palace luxury, Versailles Hall of Mirrors opulence, powdery soft color palette.'
  },
  {
    id: 'Explorecore', name: '探索核心', label: 'Explorecore',
    prompt: 'Transform into Explorecore independent publishing aesthetic: clean Substack or zine-style editorial layout, beautifully simple graphic arrangements, elegant classic serif typography, generous generous whitespace breathing room, slow thoughtful media calm intelligence.'
  },
  {
    id: 'Subspace Wireframe', name: '次空間向量網格', label: 'Subspace Wireframe',
    prompt: 'Transform into 90s virtual reality subspace wireframe: glowing neon electric blue or cyan vector wireframe grid lines extending infinitely into absolute pitch-black void, retro CGI cyber void space, Tron or early VR simulation aesthetic.'
  },
  {
    id: 'Botanical Plate', name: '19世紀植物圖鑑', label: 'Botanical Plate',
    prompt: 'Transform into 19th-century scientific botanical illustration plate: hand-colored copperplate engraving with fine line details, aged ivory parchment paper texture, precise botanical specimen study with Latin taxonomy calligraphy labels, natural history museum archive aesthetic.'
  },
  {
    id: 'Acid Fade', name: '酸性漸層融化', label: 'Acid Fade',
    prompt: 'Transform into Acid Fade psychedelic design: trippy liquefied heatwave color blur, smooth seamless transitions of vibrating pure saturated color gradients melting into each other, playful optimistic psychedelic optical smear effect, no hard edges anywhere.'
  },

  // ── 手繪與動漫特化 ──────────────────────────────────────────
  {
    id: 'Concept Watercolor', name: '原畫水彩風', label: 'Concept Art Watercolor',
    prompt: 'Transform into light novel concept art watercolor: delicate fine-line ink work, translucent washed layers of pale indigo and amber, airy atmospheric background, soft bleeding edges, ethereal fluid character design aesthetic.'
  },
  {
    id: 'Transparent Wash', name: '透明水彩風', label: 'Transparent Wash',
    prompt: 'Transform into traditional Japanese transparent watercolor (透明水彩): clear layered washes, pigment pooling naturally at edge outlines, visible cold-press paper grain texture, luminous wet-on-wet gradients, pure luminosity.'
  },
  {
    id: 'Retro Cel Anime', name: '90年代賽璐璐片', label: 'Retro 1990s Cel Anime',
    prompt: 'Transform into 1990s retro anime cel sheet style: sharp physical hand-inked outlines, solid flat cel-shading with exactly one layer of hard shadow, slight dust and acetate sheet reflection artifacts, vintage VHS scan grade color.'
  },
  {
    id: 'Radiant Shinkai', name: '極致光影動漫', label: 'Radiant Shinkai Lens Flare',
    prompt: 'Transform into radiant cinematic anime: hyper-detailed cumulonimbus clouds, intense golden hour rim lighting, dramatic lens flares, vibrant deep blue and blazing orange color science, Makoto Shinkai Your Name influence.'
  },
  {
    id: 'Soft KyoAni', name: '輕柔日常動漫', label: 'Soft KyoAni Aesthetic',
    prompt: 'Transform into slice-of-life soft focus moe anime: delicate feather-light line art, soft chromatic aberration glow, highly detailed hair strand highlights, gentle emotional ambient lighting, Kyoto Animation K-On influence.'
  },
  {
    id: 'City Pop Graphic', name: '時髦City Pop插畫', label: 'City Pop Graphic Retro',
    prompt: 'Transform into retro-modern City Pop anime illustration: sharp geometric outlines, flat neon-pastel color blocks, 1980s Tokyo fashion aesthetic, stark graphic contrast, clean minimalist layout, Hisashi Eguchi manga cover style.'
  },
  {
    id: 'Fine Pencil Tech', name: '細膩色鉛筆', label: 'Fine Colored Pencil',
    prompt: 'Transform into detailed colored pencil illustration: visible wax pigment texture on heavy sketch paper, intricate layered cross-hatching for shadows, soft feathered blending transitions, sharp defined edges mixed with pencil dust grain.'
  },
  {
    id: 'Storybook Pencil', name: '童話繪本色鉛筆', label: 'Storybook Pencil Illustration',
    prompt: 'Transform into whimsical storybook colored pencil illustration: light loose sketchy outlines, deliberate whitespace, gentle cross-hatch shading, cozy childhood fairy tale picture book aesthetic, warm textured watercolor paper surface.'
  },
  {
    id: 'Copic Manga', name: 'Copics麥克筆漫畫', label: 'Copic Marker Manga',
    prompt: 'Transform into professional Copic marker manga illustration: alcohol marker smooth gradient blending, visible marker overlap streaks, sharp technical multi-liner ink outlines, vibrant hand-colored Shonen Jump magazine cover style.'
  },
  {
    id: 'Industrial Marker', name: '工程速寫麥克筆', label: 'Industrial Marker Sketch',
    prompt: 'Transform into dynamic architectural sketch marker rendering: rapid directional marker strokes, raw bleeding ink edges, high-contrast black and cool gray shadow blocks, sharp white gel pen edge highlights, raw industrial design concept sketch aesthetic.'
  },
];

export const getRandomPosition = () => ({
  x: Math.floor(Math.random() * 400) - 200,
  y: Math.floor(Math.random() * 400) - 200
});

export const getArrowHeadPath = (x: number, y: number, angleDeg: number, size: number, type: ArrowHeadType): string => {
    if (type === 'none') return '';
    const rad = angleDeg * (Math.PI / 180);
    const rotate = (px: number, py: number) => {
        const nx = px * Math.cos(rad) - py * Math.sin(rad);
        const ny = px * Math.sin(rad) + py * Math.cos(rad);
        return { x: x + nx, y: y + ny };
    };
    if (type === 'triangle') {
        const p1 = rotate(0, 0); const p2 = rotate(-size * 2, -size); const p3 = rotate(-size * 2, size);
        return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} Z`;
    } else if (type === 'arrow') {
        const p1 = rotate(0, 0); const p2 = rotate(-size * 2, -size * 1.2); const p3 = rotate(-size * 2, size * 1.2);
        return `M ${p2.x} ${p2.y} L ${p1.x} ${p1.y} L ${p3.x} ${p3.y}`;
    } else if (type === 'circle') {
        const center = rotate(-size, 0);
        return `M ${center.x} ${center.y} m -${size}, 0 a ${size},${size} 0 1,0 ${size * 2},0 a ${size},${size} 0 1,0 -${size * 2},0`;
    }
    return '';
};

export const trimCanvas = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    let minX = width, minY = height, maxX = 0, maxY = 0;
    let found = false;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const alpha = data[(y * width + x) * 4 + 3];
            if (alpha > 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                found = true;
            }
        }
    }
    if (!found) return null;
    const trimmedWidth = maxX - minX + 1;
    const trimmedHeight = maxY - minY + 1;
    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = trimmedWidth;
    trimmedCanvas.height = trimmedHeight;
    const trimmedCtx = trimmedCanvas.getContext('2d');
    if (!trimmedCtx) return null;
    trimmedCtx.drawImage(canvas, minX, minY, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);
    return { dataUrl: trimmedCanvas.toDataURL('image/png'), x: minX, y: minY, width: trimmedWidth, height: trimmedHeight };
};

export const isCJK = (char: string) => {
    return /[\u4E00-\u9FFF\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEF\u2000-\u206F]/.test(char);
};

export const measureTextVisualBounds = (element: TextElement, ctx: CanvasRenderingContext2D) => {
    const strokeW = element.strokeWidth || 0;
    const shadowB = Math.max(element.shadowBlur || 0, element.glowBlur || 0);
    const effectPadding = 20 + strokeW + shadowB * 1.5; 

    ctx.font = `${element.isItalic ? 'italic' : ''} ${element.isBold ? 'bold' : ''} ${element.fontSize}px ${element.fontFamily}`;
    // Always use 0px — letter spacing is applied manually below for consistent measurement
    // @ts-ignore
    ctx.letterSpacing = '0px';

    const curveStrength = element.curveStrength || 0;
    const isVertical = element.writingMode === 'vertical';
    const lineHeightPx = element.fontSize * element.lineHeight;

    const infiniteConstraint = 100000;
    const { lines } = wrapTextCanvas(ctx, element.text, infiniteConstraint, lineHeightPx, isVertical, element.fontSize, element.letterSpacing || 0);
    
    let blockLength = 0; 
    let blockThickness = 0;
    
    const letterSpacingPx = element.letterSpacing || 0; // stored in px
    if (isVertical) {
        blockLength = lines.reduce((max, line) => {
             const chars = line.split('');
             const totalH = chars.reduce((sum, char) => sum + (isCJK(char) ? element.fontSize : ctx.measureText(char).width), 0) + Math.max(0, chars.length - 1) * letterSpacingPx;
             return Math.max(max, totalH);
        }, 0);
        blockThickness = lines.length * lineHeightPx;
    } else {
        blockLength = lines.reduce((max, line) => {
             const chars = line.split('');
             const charsWidth = chars.reduce((sum, c) => sum + ctx.measureText(c).width, 0);
             const spacingTotal = Math.max(0, chars.length - 1) * letterSpacingPx;
             return Math.max(max, charsWidth + spacingTotal);
        }, 0);
        blockThickness = lines.length * lineHeightPx;
    }
    
    let finalWidth = 0;
    let finalHeight = 0;

    if (Math.abs(curveStrength) > 0.1) {
        // New formula: R = arcLength / (|k/100| * 2π), same as SVG/canvas renderer
        // arcLength = blockLength + letterSpacingPx (nth spacing for wrap-point gap)
        const arcAngle = Math.abs(curveStrength / 100) * 2 * Math.PI;
        const arcLength = blockLength + letterSpacingPx;
        const radius = arcLength / arcAngle;
        const sagitta = radius * (1 - Math.cos(arcAngle / 2));
        // chord = 2R*sin(halfArc) breaks down when arc > π (chord → 0 at full circle).
        // Use actual visual span: for halfArc > π/2, the arc passes through the ±90° points → full diameter.
        const halfArc = arcAngle / 2;
        const xSpan = halfArc <= Math.PI / 2 ? 2 * radius * Math.sin(halfArc) : 2 * radius;
        const rotationBuffer = element.fontSize * 0.8;

        if (isVertical) {
            // Vertical: deflection axis = X (sagitta), main axis = Y (xSpan = arc vertical extent)
            finalWidth = blockThickness + sagitta + effectPadding * 2 + rotationBuffer;
            finalHeight = xSpan + effectPadding * 2 + rotationBuffer;
        } else {
            // Horizontal: main axis = X (xSpan = arc horizontal extent), deflection = Y (sagitta)
            finalWidth = xSpan + effectPadding * 2 + rotationBuffer;
            finalHeight = blockThickness + sagitta + effectPadding * 2 + rotationBuffer;
        }
    } else {
        if (isVertical) {
             finalWidth = blockThickness + effectPadding * 2;
             finalHeight = blockLength + effectPadding * 2;
        } else {
             finalWidth = blockLength + effectPadding * 2;
             finalHeight = blockThickness + effectPadding * 2;
        }
    }

    finalWidth = Math.max(finalWidth, 50);
    finalHeight = Math.max(finalHeight, 50);

    return {
        width: Math.ceil(finalWidth),
        height: Math.ceil(finalHeight)
    };
};

export function wrapTextCanvas(ctx: CanvasRenderingContext2D, text: string, maxDimension: number, lineHeight: number, isVertical: boolean = false, fontSize: number = 16, letterSpacing: number = 0): { lines: string[], height: number } {
    // Ensure ctx.letterSpacing is cleared so measureText returns bare char widths
    // @ts-ignore
    ctx.letterSpacing = '0px';
    const sections = text.split('\n');
    let lines: string[] = [];
    const spacingPx = letterSpacing; // letterSpacing is now in px

    if (isVertical) {
        sections.forEach(section => {
            const chars = section.split('');
            let currentLine = '';
            let currentHeight = 0;
            for (let i = 0; i < chars.length; i++) {
                const char = chars[i];
                const charHeight = isCJK(char) ? fontSize : ctx.measureText(char).width;
                const advance = charHeight + (currentLine.length > 0 ? spacingPx : 0);

                if (maxDimension < 10000 && currentHeight + advance > maxDimension && currentLine.length > 0) {
                    lines.push(currentLine);
                    currentLine = char;
                    currentHeight = charHeight;
                } else {
                    currentLine += char;
                    currentHeight += advance;
                }
            }
            if (currentLine.length > 0) {
                lines.push(currentLine);
            }
        });
        return { lines, height: lines.length * lineHeight };
    } else {
        sections.forEach(section => {
            const words = section.split('');
            let currentLine = '';
            let currentWidth = 0;
            for (let i = 0; i < words.length; i++) {
                const char = words[i];
                const charWidth = ctx.measureText(char).width;
                const addSpacing = currentLine.length > 0 ? spacingPx : 0;
                const newWidth = currentWidth + addSpacing + charWidth;
                if (maxDimension < 10000 && newWidth > maxDimension && i > 0) {
                    lines.push(currentLine);
                    currentLine = char;
                    currentWidth = charWidth;
                } else {
                    currentLine += char;
                    currentWidth = newWidth;
                }
            }
            lines.push(currentLine);
        });
        return { lines, height: lines.length * lineHeight };
    }
}

export async function callGeminiWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try { return await fn(); } catch (error: any) {
        const isRetryable =
            retries > 0 && (
                error.status === 503 || error.code === 503 || (error.message && error.message.includes('503')) ||
                error.status === 429 || error.code === 429 || (error.message && error.message.includes('429')) ||
                error instanceof TypeError
            );
        if (isRetryable) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return callGeminiWithRetry(fn, retries - 1, delay * 2);
        }
        throw error;
    }
}

export const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.referrerPolicy = "no-referrer";
        img.onload = () => resolve(img);
        img.onerror = () => {
            // CORS 失敗時改用無 crossOrigin 模式（可顯示但 canvas export 可能受限）
            const img2 = new Image();
            img2.referrerPolicy = "no-referrer";
            img2.onload = () => resolve(img2);
            img2.onerror = reject;
            img2.src = src;
        };
        img.src = src;
    });
};

export const createShapeDataUrl = (element: ShapeElement): Promise<string> => {
    return new Promise((resolve) => {
        // 與 SVG 渲染的 viewBox 一致：canvas 尺寸加上 strokeWidth，讓 stroke 不被裁切
        const sw = element.strokeWidth || 0;
        const padding = sw / 2 + 1; // 半個 stroke + 1px 安全邊距
        const width = element.width + padding * 2;
        const height = element.height + padding * 2;

        const scale = 3;

        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;

        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(''); return; }

        ctx.scale(scale, scale);
        ctx.translate(padding, padding); // 偏移讓 stroke 不被裁切

        // 強化顏色解析邏輯
        const parseColor = (colorStr: string) => {
            if (!colorStr || colorStr === 'transparent') return 'rgba(0,0,0,0)';
            if (colorStr.startsWith('#')) return colorStr;
            const hexMatch = colorStr.match(/\[(#?[a-fA-F0-9]{3,8})\]/);
            return hexMatch ? hexMatch[1] : colorStr;
        };

        ctx.fillStyle = parseColor(element.fillColor);
        ctx.strokeStyle = parseColor(element.strokeColor);
        ctx.lineWidth = element.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (element.strokeStyle === 'dashed') {
            ctx.setLineDash([element.strokeWidth * 3, element.strokeWidth * 2]);
        } else if (element.strokeStyle === 'dotted') {
            ctx.setLineDash([0, element.strokeWidth * 2]);
        } else {
            ctx.setLineDash([]);
        }

        const w = element.width;
        const h = element.height;

        ctx.beginPath();
        switch (element.shapeType) {
            case 'rectangle': ctx.rect(0, 0, w, h); break;
            case 'rounded_rect': 
                if (ctx.roundRect) ctx.roundRect(0, 0, w, h, 20); 
                else ctx.rect(0, 0, w, h); 
                break;
            case 'circle': ctx.ellipse(w/2, h/2, w/2, h/2, 0, 0, 2 * Math.PI); break;
            case 'triangle':
            case 'pentagon':
            case 'hexagon':
            case 'star': {
                let rawPoints: { x: number; y: number }[] = [];
                if (element.shapeType === 'triangle') {
                    rawPoints = [{ x: w/2, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
                } else if (element.shapeType === 'pentagon') {
                    for (let i = 0; i < 5; i++) {
                        const angle = i * 2 * Math.PI / 5 - Math.PI / 2;
                        rawPoints.push({ x: w/2 + w/2 * Math.cos(angle), y: h/2 + h/2 * Math.sin(angle) });
                    }
                } else if (element.shapeType === 'hexagon') {
                    for (let i = 0; i < 6; i++) {
                        const angle = i * 2 * Math.PI / 6 - Math.PI / 6;
                        rawPoints.push({ x: w/2 + w/2 * Math.cos(angle), y: h/2 + h/2 * Math.sin(angle) });
                    }
                } else if (element.shapeType === 'star') {
                    const outerR = Math.min(w, h) / 2;
                    const innerR = outerR * 0.42;
                    for (let i = 0; i < 10; i++) {
                        const r = i % 2 === 0 ? outerR : innerR;
                        const angle = i * Math.PI / 5 - Math.PI / 2;
                        rawPoints.push({ x: w/2 + r * Math.cos(angle), y: h/2 + r * Math.sin(angle) });
                    }
                }

                const minX = Math.min(...rawPoints.map(p => p.x));
                const maxX = Math.max(...rawPoints.map(p => p.x));
                const minY = Math.min(...rawPoints.map(p => p.y));
                const maxY = Math.max(...rawPoints.map(p => p.y));
                const bw = maxX - minX;
                const bh = maxY - minY;

                rawPoints.forEach((p, i) => {
                    const nx = bw > 0 ? (p.x - minX) / bw * w : w / 2;
                    const ny = bh > 0 ? (p.y - minY) / bh * h : h / 2;
                    if (i === 0) ctx.moveTo(nx, ny); else ctx.lineTo(nx, ny);
                });
                ctx.closePath(); break;
            }
            case 'heart':
                ctx.moveTo(w * 0.5, h * 0.22);
                ctx.bezierCurveTo(w * 0.5, h * 0.16, w * 0.42, h * 0.0, w * 0.25, h * 0.0);
                ctx.bezierCurveTo(w * 0.08, h * 0.0, w * 0.0, h * 0.14, w * 0.0, h * 0.3);
                ctx.bezierCurveTo(w * 0.0, h * 0.52, w * 0.18, h * 0.75, w * 0.5, h * 1.0);
                ctx.bezierCurveTo(w * 0.82, h * 0.75, w * 1.0, h * 0.52, w * 1.0, h * 0.3);
                ctx.bezierCurveTo(w * 1.0, h * 0.14, w * 0.92, h * 0.0, w * 0.75, h * 0.0);
                ctx.bezierCurveTo(w * 0.58, h * 0.0, w * 0.5, h * 0.16, w * 0.5, h * 0.22);
                ctx.closePath(); break;
        }

        if (element.fillColor !== 'transparent') ctx.fill();
        ctx.stroke();

        resolve(canvas.toDataURL('image/png'));
    });
}

export const createArrowDataUrl = (element: ArrowElement): Promise<string> => {
    return new Promise((resolve) => {
        const headSize = (element.strokeWidth || 4) * 3;
        const padding = headSize + 20;
        const width = element.width + padding * 2;
        const height = element.height + padding * 2;

        const scale = 3;

        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(''); return; }

        ctx.scale(scale, scale);
        
        ctx.translate(padding, padding);
        ctx.strokeStyle = element.color;
        ctx.lineWidth = element.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.fillStyle = element.color;

        if (element.strokeStyle === 'dashed') {
            ctx.setLineDash([element.strokeWidth * 3, element.strokeWidth * 2]);
        } else if (element.strokeStyle === 'dotted') {
            ctx.setLineDash([0, element.strokeWidth * 2]);
        } else {
            ctx.setLineDash([]);
        }

        const startX = 0;
        const startY = element.height / 2;
        const endX = element.width;
        const endY = element.height / 2;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        ctx.setLineDash([]);

        if (element.startArrowhead !== 'none') {
            const p = new Path2D(getArrowHeadPath(startX, startY, 180, headSize, element.startArrowhead));
            if (element.startArrowhead !== 'arrow') ctx.fill(p);
            ctx.stroke(p);
        }

        if (element.endArrowhead !== 'none') {
            const p = new Path2D(getArrowHeadPath(endX, endY, 0, headSize, element.endArrowhead));
            if (element.endArrowhead !== 'arrow') ctx.fill(p);
            ctx.stroke(p);
        }

        resolve(canvas.toDataURL('image/png'));
    });
};

export const analyzeDominantColor = (imageSrc: string): Promise<{ hex: string, name: string }> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const MAX_SIZE = 300;
            let width = img.naturalWidth;
            let height = img.naturalHeight;
            if (width > MAX_SIZE || height > MAX_SIZE) {
                const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
                width = Math.floor(width * ratio);
                height = Math.floor(height * ratio);
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve({ hex: '#FF00FF', name: 'MAGENTA' }); return; }
            ctx.drawImage(img, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            let riskMagenta = 0; let riskGreen = 0; let riskBlue = 0;
            const stride = 4 * 10; 
            for (let i = 0; i < data.length; i += stride) {
                const r = data[i]; const g = data[i + 1]; const b = data[i + 2]; const a = data[i + 3];
                if (a < 50) continue; 
                if (r > g + 15 && r > b + 15) riskMagenta++;
                if (g > r + 15 && g > b + 15) riskGreen++;
                if (b > r + 15 && b > g + 15) riskBlue++;
            }
            if (riskBlue <= riskMagenta && riskBlue <= riskGreen) resolve({ hex: '#0000FF', name: 'BLUE' });
            else if (riskGreen <= riskMagenta && riskGreen <= riskBlue) resolve({ hex: '#00FF00', name: 'GREEN' });
            else resolve({ hex: '#FF00FF', name: 'MAGENTA' });
        };
        img.onerror = () => resolve({ hex: '#FF00FF', name: 'MAGENTA' }); 
        img.src = imageSrc;
    });
};

export const hasTransparency = (imageSrc: string): Promise<boolean> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const size = 50; canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(false); return; }
            ctx.drawImage(img, 0, 0, size, size);
            const data = ctx.getImageData(0, 0, size, size).data;
            for (let i = 3; i < data.length; i += 4) { if (data[i] < 250) { resolve(true); return; } }
            resolve(false);
        };
        img.onerror = () => resolve(false);
        img.src = imageSrc;
    });
};

export const processChromaKey = (imageSrc: string, targetHex: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(imageSrc); return; }
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const targetR = parseInt(targetHex.slice(1, 3), 16);
            const targetG = parseInt(targetHex.slice(3, 5), 16);
            const targetB = parseInt(targetHex.slice(5, 7), 16);
            const isGreenTarget = targetG > 200 && targetR < 50 && targetB < 50;
            const isBlueTarget = targetB > 200 && targetR < 50 && targetG < 50;
            const keyThreshold = 95; 
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i]; const g = data[i + 1]; const b = data[i + 2];
                const distance = Math.sqrt(Math.pow(r - targetR, 2) + Math.pow(g - targetG, 2) + Math.pow(b - targetB, 2));
                if (distance < keyThreshold) { data[i + 3] = 0; } 
                else {
                    if (isGreenTarget) { if (g > r && g > b) data[i + 1] = (r + b) / 2; } 
                    else if (isBlueTarget) { if (b > r && b > g) data[i + 2] = (r + g) / 2; } 
                    else { if (r > g && b > g) { data[i] = g; data[i + 2] = g; } }
                }
            }
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (e) => { console.error("Keying failed", e); resolve(imageSrc); };
        img.src = imageSrc;
    });
};

export const restoreOriginalAlpha = async (originalSrc: string, generatedSrc: string): Promise<string> => {
    try {
        const [original, generated] = await Promise.all([loadImage(originalSrc), loadImage(generatedSrc)]);
        const canvas = document.createElement('canvas');
        canvas.width = original.naturalWidth;
        canvas.height = original.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return generatedSrc;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // 1. Draw generated image (Color source)
        ctx.drawImage(generated, 0, 0, canvas.width, canvas.height);
        
        // 2. Composite original image using destination-in to keep only opaque pixels
        ctx.filter = 'blur(0.8px)';
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(original, 0, 0, canvas.width, canvas.height);
        
        ctx.filter = 'none';
        ctx.globalCompositeOperation = 'source-over';
        return canvas.toDataURL('image/png');
    } catch (e) {
        console.error("Failed to restore alpha channel", e);
        return generatedSrc;
    }
};

export const checkCompositionSimilarity = async (src1: string, src2: string): Promise<number> => {
    try {
        const [img1, img2] = await Promise.all([loadImage(src1), loadImage(src2)]);
        const size = 50;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return 1;

        ctx.drawImage(img1, 0, 0, size, size);
        const data1 = ctx.getImageData(0, 0, size, size).data;
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img2, 0, 0, size, size);
        const data2 = ctx.getImageData(0, 0, size, size).data;

        let overlap = 0, total = 0;
        for (let i = 3; i < data1.length; i += 4) {
            const a1 = data1[i] > 128 ? 1 : 0;
            const a2 = data2[i] > 128 ? 1 : 0;
            if (a1 || a2) total++;
            if (a1 && a2) overlap++;
        }
        return total === 0 ? 1 : overlap / total;
    } catch (e) {
        console.error("Failed to check composition similarity", e);
        return 1; // Assume similar on error to fallback to mask
    }
};

export const getClosestAspectRatio = (width: number, height: number): string => {
    const ratio = width / height;
    const supportedRatios = [
      { label: '1:1', value: 1/1 },
      { label: '3:4', value: 3/4 },
      { label: '4:3', value: 4/3 },
      { label: '9:16', value: 9/16 },
      { label: '16:9', value: 16/9 },
    ];
    return supportedRatios.reduce((prev, curr) => 
      Math.abs(curr.value - ratio) < Math.abs(prev.value - ratio) ? curr : prev
    ).label;
};

export const calculateImageDifference = async (src1: string, src2: string): Promise<number> => {
    try {
        const [img1, img2] = await Promise.all([loadImage(src1), loadImage(src2)]);
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return 1; // fallback
        
        ctx.drawImage(img1, 0, 0, size, size);
        const d1 = ctx.getImageData(0, 0, size, size).data;
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img2, 0, 0, size, size);
        const d2 = ctx.getImageData(0, 0, size, size).data;
        
        let totalDiff = 0;
        for (let i = 0; i < d1.length; i += 4) {
            totalDiff += Math.abs(d1[i] - d2[i]) + Math.abs(d1[i+1] - d2[i+1]) + Math.abs(d1[i+2] - d2[i+2]);
        }
        return totalDiff / (size * size * 3 * 255);
    } catch (e) {
        console.error("Failed to calculate image difference", e);
        return 1; // Assume different on error
    }
};

export const detectIfIllustration = async (src: string): Promise<boolean> => {
    try {
        const img = await loadImage(src);
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return false;
        
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        
        const colorSet = new Set<number>();
        for (let i = 0; i < data.length; i += 4) {
            if (data[i+3] === 0) continue; // Ignore transparent pixels
            const r = data[i] >> 4;
            const g = data[i+1] >> 4;
            const b = data[i+2] >> 4;
            colorSet.add((r << 8) | (g << 4) | b);
        }
        
        // If the number of unique quantized colors is relatively low (< 500 out of 4096), it's likely an illustration
        return colorSet.size < 500;
    } catch (e) {
        console.error("Failed to detect illustration", e);
        return false;
    }
};

// ── 圖片元素合成（含陰影、淡出效果） ──────────────────────────────────────────
// 用於下載、匯出時確保效果完整保留（所見即所得）
export async function renderImageElementToDataUrl(params: {
  src: string;
  width: number;
  height: number;
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  fade?: SimpleFadeOptions;
}): Promise<string> {
  const { src, width, height, fade } = params;

  const img = await loadImage(src);

  // 用原始圖片解析度渲染，避免縮圖導致畫質下降
  const renderW = img.naturalWidth || width;
  const renderH = img.naturalHeight || height;
  // 按原圖與元素顯示尺寸的比例縮放陰影參數
  const scale = renderW / width;
  const padding = Math.ceil(100 * scale); // 依比例放大 padding

  const canvas = document.createElement('canvas');
  canvas.width = renderW + padding * 2;
  canvas.height = renderH + padding * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return src;

  ctx.translate(canvas.width / 2, canvas.height / 2);

  // 套用陰影（參數依比例縮放）
  if (params.shadowEnabled) {
    ctx.shadowColor = params.shadowColor ?? 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = (params.shadowBlur ?? 10) * scale;
    ctx.shadowOffsetX = (params.shadowOffsetX ?? 4) * scale;
    ctx.shadowOffsetY = (params.shadowOffsetY ?? 4) * scale;
  }
  ctx.drawImage(img, -renderW / 2, -renderH / 2, renderW, renderH);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // 套用淡出遮罩
  if (fade && fade.direction !== 'none') {
    const { direction, intensity } = fade;
    const w = renderW;
    const h = renderH;
    const x = -w / 2;
    const y = -h / 2;
    let gradient: CanvasGradient | undefined;

    ctx.save();

    if (direction === 'radial') {
      const fadeStart = 1 - intensity / 100;
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.scale(w / 2, h / 2);
      gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      gradient.addColorStop(0, 'black');
      if (fadeStart > 0) gradient.addColorStop(fadeStart, 'black');
      gradient.addColorStop(Math.min(fadeStart + (1 - fadeStart) * 0.25, 1), 'rgba(0,0,0,0.5)');
      gradient.addColorStop(Math.min(fadeStart + (1 - fadeStart) * 0.5, 1), 'rgba(0,0,0,0.2)');
      gradient.addColorStop(Math.min(fadeStart + (1 - fadeStart) * 0.75, 1), 'rgba(0,0,0,0.05)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
    } else {
      const fadeEnd = intensity / 100;
      if (direction === 'top') gradient = ctx.createLinearGradient(0, y, 0, y + h);
      else if (direction === 'bottom') gradient = ctx.createLinearGradient(0, y + h, 0, y);
      else if (direction === 'left') gradient = ctx.createLinearGradient(x, 0, x + w, 0);
      else if (direction === 'right') gradient = ctx.createLinearGradient(x + w, 0, x, 0);

      if (gradient) {
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(fadeEnd * 0.25, 'rgba(0,0,0,0.05)');
        gradient.addColorStop(fadeEnd * 0.5, 'rgba(0,0,0,0.2)');
        gradient.addColorStop(fadeEnd * 0.75, 'rgba(0,0,0,0.5)');
        gradient.addColorStop(fadeEnd, 'black');
        if (fadeEnd < 1) gradient.addColorStop(1, 'black');
        ctx.fillStyle = gradient;
        ctx.globalCompositeOperation = 'destination-in';
        ctx.fillRect(x, y, w, h);
      }
    }

    ctx.restore();
  }

  return canvas.toDataURL('image/png');
}
