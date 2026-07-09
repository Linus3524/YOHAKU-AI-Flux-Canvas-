type StylePreset = {
  id: string;
  label: string;
  name: string;
};

const STYLE_CATEGORIES = [
  { label: '🖌 繪畫與插畫',       ids: ['Minimalist','Watercolor','Oil Painting','Sketch','Impressionism','Chinese Ink Wash','Concept Watercolor','Transparent Wash','Fine Pencil Tech','Storybook Pencil','Industrial Marker'] },
  { label: '✏️ 動漫與漫畫',       ids: ['Comic Book','Japanese Anime','Manga Ink','Chibi','Webtoon','Mecha','Retro Cel Anime','Radiant Shinkai','Soft KyoAni','City Pop Graphic','Copic Manga'] },
  { label: '📷 攝影與底片',       ids: ['Noir','Sepia Old','Lomo','Cinematic HDR'] },
  { label: '💻 數位與現代藝術',   ids: ['Cyberpunk','Pop Art','Neon','Pixel Art','Glassmorphism','Glitch Effect','Vaporwave','Flat Design'] },
  { label: '🎨 特殊材質與色彩',   ids: ['Matte Pastel','Gothic','Grunge','Japanese Ukiyo-e','Duotone','Paper Cutout','Vivid High','Muted Earth','Blueprint','Risograph'] },
  { label: '🌸 次文化少女暗黑',   ids: ['Coquette','Jelly Candy','Y2K McBling','Decora Pop','Vamp Romantic','Weirdcore','Analog Horror','Pastel Goth','Whimsigothic','Alien Core','Fairy Grunge','Glacier Blue','Naïve Art','Fractured Glass'] },
  { label: '🔥 新世代潮流',       ids: ['Neubrutalism','Claymorphism','Acid Graphics','Xerox Lo-Fi','Frutiger Aero','Groovy Retro','Spatial UI','Fish-eye Lens','Woodcut Print','Thermal Heat','Neo-Bauhaus','Sticker Collage','Biophilic','Maximalism'] },
  { label: '🎉 節慶限定',         ids: ['Lunar New Year','Japanese Matsuri','Sakura Ohanami','Mid-Autumn Moon','Cozy Christmas','Spooky Halloween','Valentine Romance','Japanese Shogatsu','Easter Pastel','Retro Ghost Fest'] },
  { label: '🏛 歷史與宗教',       ids: ['Showa Retro','Byzantine Mosaic','Soviet Constructivism','Taisho Roman','Sacred Stained Glass','Imperial Propaganda'] },
  { label: '🔬 稀有與新趨勢',     ids: ['Glass Block','Brute Force','Bronze Age','Obsidian Black','Prompt Playground','Cyber Hacker','Reality Warp','Trinket Curation','Aerochrome','Modern Kintsugi','Solarpunk','Lunarpunk','Cassette Futurism','Gorpcore Topo','Dark Academia','Rococo Opulence','Explorecore','Subspace Wireframe','Botanical Plate','Acid Fade'] },
  { label: '📸 經典數位相機與CCD', ids: ['Canon IXUS CCD','Canon A620 CCD','Nikon S200 CCD','Leica CCD','CCD Negative Film','DV Camcorder','Polaroid Instant Film','Fujifilm Superia','Kodak Portra 400','135mm Analog Film'] },
  { label: '🔭 光學硬體與AI氛圍', ids: ['Fuji Direct Flash','Telephoto Compression','DSLR 50mm','Commercial Portrait','DJI Pocket Vlog','Golden Hour Backlight','Blue Hour Twilight','Japanese Airy High Key','Ocean Cool Tone','German Lens Muted Green','Ricoh GR Street','Ricoh Positive Film','Fujifilm X-T','Hasselblad Medium Format','Olympus Zuiko Blue','Fujifilm FinePix Retro','Canon High End Compact','Apple iPhone XS HDR','Polaroid Digital Print','Olympus XZ1 CCD','Fujifilm Panorama','Olympus Film SLR'] },
];

export const StyleLibraryPanel = ({
  stylePresets,
  position,
  isDragging,
  selectedElementIds,
  onStartDrag,
  onClose,
  onApplyStyle,
}: {
  stylePresets: StylePreset[];
  position: { x: number; y: number };
  isDragging: boolean;
  selectedElementIds: string[];
  onStartDrag: (e: MouseEvent<HTMLDivElement>) => void;
  onClose: () => void;
  onApplyStyle: (targetIds: string[], styleLabel: string) => void;
}) => {
  const styleById = Object.fromEntries(stylePresets.map(s => [s.id, s]));

  return (
    <div
      className="fixed z-50 bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-white/50 w-[440px] h-[560px] flex flex-col overflow-hidden"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`px-4 py-3 border-b border-black/5 flex justify-between items-center bg-white/50 flex-shrink-0 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={onStartDrag}
      >
        <h3 className="font-bold text-[#1D1D1F]">Magic Style 藝術風格庫 <span className="text-xs font-normal text-[#86868B] ml-1">{stylePresets.length} 種</span></h3>
        <button onMouseDown={(e) => e.stopPropagation()} onClick={onClose} className="text-[#86868B] hover:text-[#1D1D1F] text-lg leading-none">&times;</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {STYLE_CATEGORIES.map(cat => (
          <div key={cat.label}>
            {/* 分類標題 */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold text-[#86868B] tracking-wide uppercase whitespace-nowrap">{cat.label}</span>
              <div className="flex-1 h-px bg-black/6" />
            </div>
            {/* 風格格子 */}
            <div className="grid grid-cols-2 gap-2">
              {cat.ids.map(id => {
                const style = styleById[id];
                if (!style) return null;
                return (
                  <button
                    key={style.id}
                    onClick={() => onApplyStyle(selectedElementIds, style.label)}
                    disabled={selectedElementIds.length === 0}
                    className="group flex flex-col gap-0.5 px-3 py-2.5 rounded-xl border border-black/5 hover:bg-black hover:border-black transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="text-[10px] font-semibold text-[#86868B] group-hover:text-white/60 leading-tight">{style.label}</span>
                    <span className="text-[13px] font-bold text-[#1D1D1F] group-hover:text-white leading-tight">{style.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-black/5 bg-gray-50 text-xs text-[#86868B] flex-shrink-0">
        {selectedElementIds.length > 0 ? `已選取 ${selectedElementIds.length} 個物件` : '請先選取圖片以應用風格'}
      </div>
    </div>
  );
};
import type { MouseEvent } from 'react';
