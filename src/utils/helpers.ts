
import type { ShapeElement, ArrowHeadType, TextElement, ArrowElement } from '../types';

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
];

// 36+ Magic Style Presets (Restored Full List)
export const STYLE_PRESETS = [

  // ── 繪畫與插畫 ──────────────────────────────────────────────
  {
    id: 'Minimalist', name: '極簡', label: 'Minimalist',
    prompt: 'Transform into minimalist style: reduce to essential shapes only, maximum white space, flat colors with no gradients, clean geometric forms, remove all unnecessary detail, Swiss design influence.'
  },
  {
    id: 'Watercolor', name: '水彩暈染', label: 'Watercolor',
    prompt: 'Transform into expressive watercolor painting: soft wet-on-wet color bleeding at edges, visible paper texture, translucent layered washes, organic brushstrokes, colors bleed and merge naturally, white paper showing through highlights.'
  },
  {
    id: 'Oil Painting', name: '油畫質感', label: 'Oil Painting',
    prompt: 'Transform into classical oil painting: thick impasto brushstrokes with visible texture, rich saturated colors, dramatic chiaroscuro lighting, Renaissance or Baroque influence, painterly edges with soft blending in shadows.'
  },
  {
    id: 'Sketch', name: '素描線條', label: 'Sketch',
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
    id: 'Comic Book', name: '美式漫畫', label: 'Comic Book',
    prompt: 'Transform into American comic book style: bold black ink outlines, Ben-Day dots halftone shading, flat primary colors, dynamic action lines, Marvel or DC Comics influence, high contrast cel-shading.'
  },
  {
    id: 'Japanese Anime', name: '日系動漫', label: 'Japanese Anime',
    prompt: 'Transform into Japanese anime illustration style: clean vector-like outlines, cel-shaded flat colors with sharp highlight spots, large expressive eyes if characters present, pastel color palette, Studio Ghibli or modern anime aesthetic.'
  },
  {
    id: 'Manga Ink', name: '漫畫墨線', label: 'Manga Ink',
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
    id: 'Mecha', name: '機甲鋼彈', label: 'Mecha Gundam Style',
    prompt: 'Transform into Gundam mecha illustration style: hard surface mechanical armor panels, technical linework with panel lines and rivets, metallic color schemes (gray, white, red, blue), sharp angular geometric forms, Sunrise anime mecha design influence.'
  },

  // ── 攝影與底片 ──────────────────────────────────────────────
  {
    id: 'Vintage 1950s', name: '復古底片', label: 'Vintage 1950s',
    prompt: 'Transform into 1950s vintage film photography: faded desaturated colors, warm yellow-orange film grain, slight vignette, Kodachrome color palette, retro mid-century aesthetic, soft lens halation on bright areas.'
  },
  {
    id: 'Polaroid', name: '拍立得', label: 'Polaroid',
    prompt: 'Transform into Polaroid instant photo aesthetic: slightly overexposed bright center, cool blue-green color shift in shadows, soft focus edges, slight color bleed and chemical imperfections, warm whites, vintage snapshot feel.'
  },
  {
    id: 'Noir', name: '黑白電影', label: 'Noir',
    prompt: 'Transform into Film Noir black and white photography: extreme high contrast, deep crushed blacks, bright harsh highlights, dramatic side lighting with strong shadows, 1940s detective movie aesthetic, no color at all — pure monochrome.'
  },
  {
    id: 'Sepia Old', name: '懷舊泛黃', label: 'Sepia Old',
    prompt: 'Transform into antique sepia photograph: warm brown monochrome tones, aged paper yellowing, heavy film grain and scratches, vignette darkening at corners, 1900s Victorian era photography aesthetic, faded and slightly overexposed.'
  },
  {
    id: 'Lomo', name: 'Lomo暗角', label: 'Lomo Photography',
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
    id: 'Pop Art', name: '普普風', label: 'Pop Art',
    prompt: 'Transform into Pop Art style: bold flat primary colors (red, yellow, blue, black), Ben-Day dot printing texture, thick black outlines, Andy Warhol or Roy Lichtenstein influence, graphic and commercial aesthetic, halftone dot patterns.'
  },
  {
    id: 'Neon', name: '霓虹光感', label: 'Neon',
    prompt: 'Transform into neon glow aesthetic: glowing neon light effects in pink, cyan and electric blue, dark background with luminous color blooms, neon sign light bleed, 80s nightclub atmosphere, electric glow halos around all edges.'
  },
  {
    id: 'Pixel Art', name: '像素風', label: 'Pixel Art',
    prompt: 'Transform into retro pixel art: visible large square pixels, limited 16-32 color palette, no anti-aliasing, 8-bit or 16-bit video game aesthetic, chunky pixelated forms, NES or SNES era game sprite style.'
  },
  {
    id: 'Glassmorphism', name: '毛玻璃', label: 'Glassmorphism',
    prompt: 'Transform into glassmorphism UI aesthetic: frosted glass translucent panels, backdrop blur effect, subtle white border highlights, soft pastel gradient backgrounds visible through glass, clean modern tech product design aesthetic.'
  },
  {
    id: 'Glitch Effect', name: '故障藝術', label: 'Glitch Effect',
    prompt: 'Transform into digital glitch art: RGB color channel separation (chromatic aberration), horizontal scan line displacement, pixel sorting artifacts, corrupted data visual noise, VHS tracking errors, cyberpunk digital decay aesthetic.'
  },
  {
    id: 'Vaporwave', name: '蒸氣波', label: 'Vaporwave',
    prompt: 'Transform into Vaporwave aesthetic: pink and purple pastel palette, retro 80s-90s nostalgia, Greek marble statues, palm trees, sunset gradients, synthwave grid lines, Windows 95 pixel fonts influence, dreamy lo-fi atmosphere.'
  },
  {
    id: 'Flat Design', name: '扁平化', label: 'Flat Design',
    prompt: 'Transform into flat design illustration: zero shadows or gradients, bold geometric shapes, limited flat color palette, clean vector graphic aesthetic, modern app icon style, Material Design or iOS icon influence.'
  },

  // ── 特殊材質與色彩 ─────────────────────────────────────────
  {
    id: 'Matte Pastel', name: '柔霧粉彩', label: 'Matte Pastel',
    prompt: 'Transform into soft matte pastel aesthetic: desaturated dusty pastel colors (blush pink, sage green, lavender, cream), no glossy highlights, soft diffused lighting, gentle and calming mood, modern Korean or Japanese lifestyle photography feel.'
  },
  {
    id: 'Gothic', name: '哥德暗黑', label: 'Gothic',
    prompt: 'Transform into Gothic dark art: deep blacks and dark purples, dramatic candlelight or moonlight, Victorian architectural elements, intricate ornamental details, dark romantic atmosphere, medieval cathedral aesthetic, ominous and mysterious mood.'
  },
  {
    id: 'Grunge', name: '髒髒搖滾', label: 'Grunge',
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
    id: 'Paper Cutout', name: '剪紙陰影', label: 'Paper Cutout',
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
    id: 'Blueprint', name: '藍圖工程', label: 'Blueprint',
    prompt: 'Transform into architectural blueprint technical drawing: white or cyan linework on deep Prussian blue background, precise technical annotation lines, measurement indicators, engineering drafting aesthetic, isometric or orthographic projection feel.'
  },
  {
    id: 'Risograph', name: '孔版印刷', label: 'Risograph',
    prompt: 'Transform into Risograph print aesthetic: limited 2-3 color ink layers with visible misregistration offset, grainy halftone dot texture, slightly translucent ink overlap creating new mixed colors, zine and indie print culture, fluorescent ink colors (fluo pink, teal, yellow).'
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
    if (element.letterSpacing) {
        // @ts-ignore
        ctx.letterSpacing = `${element.letterSpacing}em`;
    }

    const curveStrength = element.curveStrength || 0;
    const isVertical = element.writingMode === 'vertical';
    const lineHeightPx = element.fontSize * element.lineHeight;

    const infiniteConstraint = 100000;
    const { lines } = wrapTextCanvas(ctx, element.text, infiniteConstraint, lineHeightPx, isVertical, element.fontSize, element.letterSpacing || 0);
    
    let blockLength = 0; 
    let blockThickness = 0;
    
    if (isVertical) {
        const spacingPx = (element.letterSpacing || 0) * element.fontSize;
        blockLength = lines.reduce((max, line) => {
             const chars = line.split('');
             const totalH = chars.reduce((sum, char) => sum + (isCJK(char) ? element.fontSize : ctx.measureText(char).width), 0) + Math.max(0, chars.length - 1) * spacingPx;
             return Math.max(max, totalH);
        }, 0);
        blockThickness = lines.length * lineHeightPx;
    } else {
        blockLength = lines.reduce((max, line) => {
             const m = ctx.measureText(line);
             return Math.max(max, m.width);
        }, 0);
        blockThickness = lines.length * lineHeightPx;
    }
    
    let finalWidth = 0;
    let finalHeight = 0;

    if (Math.abs(curveStrength) > 0.1) {
        const radius = 10000 / Math.abs(curveStrength);
        const arcLength = blockLength;
        const theta = arcLength / radius;
        const sagitta = radius * (1 - Math.cos(theta / 2));
        const chord = 2 * radius * Math.sin(theta / 2);
        const rotationBuffer = element.fontSize * 0.8;

        if (isVertical) {
            finalWidth = blockThickness + sagitta + effectPadding * 2 + rotationBuffer;
            finalHeight = chord + effectPadding * 2 + rotationBuffer;
        } else {
            finalWidth = chord + effectPadding * 2 + rotationBuffer;
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
    const sections = text.split('\n');
    let lines: string[] = [];
    
    if (isVertical) {
        const spacingPx = letterSpacing * fontSize;
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
            for (let i = 0; i < words.length; i++) {
                const char = words[i];
                const testLine = currentLine + char;
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;
                if (maxDimension < 10000 && testWidth > maxDimension && i > 0) {
                    lines.push(currentLine);
                    currentLine = char;
                } else {
                    currentLine = testLine;
                }
            }
            lines.push(currentLine);
        });
        return { lines, height: lines.length * lineHeight };
    }
}

export async function callGeminiWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try { return await fn(); } catch (error: any) {
        if (retries > 0 && (error.status === 503 || error.code === 503 || (error.message && error.message.includes('503')))) {
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
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
};

export const createShapeDataUrl = (element: ShapeElement): Promise<string> => {
    return new Promise((resolve) => {
        const padding = 0;
        const width = element.width;
        const height = element.height;

        const scale = 3; 
        
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(''); return; }

        ctx.scale(scale, scale); 
        ctx.translate(padding, padding);

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
