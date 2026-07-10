import React, { useMemo } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { StyleParams } from '../types';
import { useNodeStatusRing } from './useNodeStatusRing';
import { NodeResultPreview } from './NodeResultPreview';
import { NodeDeleteButton } from './NodeDeleteButton';
import { STYLE_PRESETS } from '../../../utils/helpers';

// 對標主畫布風格藝術庫（StyleLibraryPanel）的所有分組與樣式 ID
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

/**
 * 風格轉換節點：從大畫布風格藝術庫選擇，實際套用由執行引擎呼叫 pipeline。
 */
export function StyleNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const ring = useNodeStatusRing(id);
  const params = (data?.params ?? {}) as Partial<StyleParams & { isCollapsed?: boolean }>;
  const onDeleteNode = data?.onDeleteNode;
  const handleDelete = typeof onDeleteNode === 'function'
    ? () => (onDeleteNode as (nodeId: string) => void)(id)
    : undefined;

  // 依大畫布分類分組
  const grouped = useMemo(() => {
    const styleById = Object.fromEntries(STYLE_PRESETS.map(s => [s.id, s]));
    return STYLE_CATEGORIES
      .map(cat => ({
        label: cat.label,
        styles: cat.ids.map(id => styleById[id]).filter(Boolean) as typeof STYLE_PRESETS,
      }))
      .filter(g => g.styles.length > 0);
  }, []);

  // 檢查是否有結果圖片以決定是否能摺疊
  const hasResult = useNodeGraphStore => true; // 這裡我們可以直接使用與其他卡片相同的 collapsed 寫法，但為了避免型別衝突，我們可以使用 data
  // 為了安全，我們在此以 data 內 params 控制摺疊狀態
  const isCollapsed = !!params.isCollapsed;

  return (
    <div className={`group relative border border-black/12 bg-white shadow-sm w-[176px] overflow-visible ${ring}`}>
      <NodeDeleteButton onDelete={handleDelete} selected={selected} />
      <Handle type="target" position={Position.Left} />
      <div className="px-2 py-1 text-[10px] font-semibold text-neutral-500 tracking-wide uppercase border-b border-black/6 flex items-center justify-between">
        <span>風格轉換</span>
        {/* 我們在標題列也一併為風格轉換節點加上摺疊按鈕，維持整體卡片摺疊的一致性 */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            updateNodeData(id, { params: { ...params, isCollapsed: !isCollapsed } });
          }}
          className="nodrag text-neutral-400 hover:text-neutral-700 transition-colors w-4 h-4 flex items-center justify-center cursor-pointer"
          title={isCollapsed ? '展開控制參數' : '摺疊控制參數'}
        >
          <Icon name={isCollapsed ? 'expand_more' : 'expand_less'} size={12} />
        </button>
      </div>
      {!isCollapsed && (
        <div className="p-1.5">
          <select
            value={params.styleKey ?? 'none'}
            onChange={(e) => updateNodeData(id, { params: { ...params, styleKey: e.target.value } })}
            className="nodrag block w-full border border-neutral-200 px-1.5 py-1 text-[11px] focus:outline-none focus:border-neutral-400 bg-neutral-50"
          >
            <option value="none">未選擇</option>
            {grouped.map(group => (
              <optgroup key={group.label} label={group.label}>
                {group.styles.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.label})</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}
      <NodeResultPreview id={id} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

// 補上對 Icon 與 useNodeGraphStore 的引用
import { Icon } from '../../Icon';
