import type { MutableRefObject } from 'react';

export const GeneratedResultsModal = ({
  generatedImages,
  generatedImagesMetadata,
  logoBgProcessedRef,
  onClose,
  onAddToCanvas,
  onDownload,
}: {
  generatedImages: string[];
  generatedImagesMetadata?: { prompt?: string }[] | null;
  logoBgProcessedRef: MutableRefObject<string[] | null>;
  onClose: () => void;
  onAddToCanvas: (imageUrl: string) => void;
  onDownload: (imageUrl: string) => void;
}) => (
  <div
    className="fixed inset-0 z-[2000] flex items-center justify-center p-6"
    style={{ background: 'rgba(240,240,245,0.82)', backdropFilter: 'blur(12px)' }}
  >
    <div
      className="relative flex flex-col"
      style={{
        background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 32px 64px -16px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.08)',
        borderRadius: '24px',
        padding: '2rem',
        width: '100%',
        maxWidth: generatedImages.length === 1 ? 'min(80vw, 640px)' : '820px',
        maxHeight: '90vh',
        animation: 'resultModalPop 0.35s cubic-bezier(0.16,1,0.3,1) forwards',
      }}
      onClick={e => e.stopPropagation()}
    >
      <style>{`
        @keyframes resultModalPop {
          from { opacity: 0; transform: scale(0.95) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        .result-img-card .card-action-overlay { opacity: 0; }
        .result-img-card:hover .card-action-overlay { opacity: 1; }
        .result-img-card .card-action-btns { opacity: 0; transform: translateY(12px); transition: opacity 0.25s ease, transform 0.25s ease; }
        .result-img-card:hover .card-action-btns { opacity: 1; transform: translateY(0); }
        .result-close-btn { transition: background 0.2s ease, transform 0.25s ease; }
        .result-close-btn:hover { transform: rotate(90deg); background: #e5e5ea !important; }
      `}</style>

      {/* 標題列 */}
      <div className="flex items-start justify-between mb-5 pr-10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-[#1D1D1F] tracking-tight">生成結果</h2>
            <span className="text-[10px] font-normal text-[#86868B] border border-black/10 px-1.5 py-px rounded">{generatedImages.length} 張</span>
          </div>
          <p className="text-[11px] text-[#86868B] mt-0.5">選擇要加入畫布或下載的圖片</p>
        </div>
      </div>

      {/* 關閉按鈕 */}
      <button
        onClick={onClose}
        className="result-close-btn absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] border border-black/8"
        style={{ background: '#F5F5F7' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      {/* 圖片區域 */}
      <div className={`overflow-y-auto ${generatedImages.length > 1 ? 'grid grid-cols-2 gap-4 items-start' : ''}`}>
        {generatedImages.map((imgSrc, index) => {
          // 透明背景 Logo 已去背 → 用棋盤格底呈現透明區域
          const isTransparentResult = logoBgProcessedRef.current === generatedImages
            && (generatedImagesMetadata?.[index]?.prompt || '').includes('BACKGROUND: transparent');
          return (
          <div
            key={index}
            className="result-img-card relative overflow-hidden bg-[#F0F0F0]"
            style={{
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              borderRadius: '12px',
              ...(isTransparentResult ? {
                backgroundImage: 'linear-gradient(45deg, #e2e2e6 25%, transparent 25%), linear-gradient(-45deg, #e2e2e6 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e2e6 75%), linear-gradient(-45deg, transparent 75%, #e2e2e6 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
                backgroundColor: '#ffffff',
              } : {}),
            }}
          >
            <img
              src={imgSrc}
              alt={`Generated ${index + 1}`}
              className="w-full block"
              style={{ height: 'auto', maxHeight: generatedImages.length === 1 ? '62vh' : '45vh', objectFit: 'contain', display: 'block' }}
              referrerPolicy="no-referrer"
            />
            {/* 懸停漸層遮罩 */}
            <div
              className="card-action-overlay absolute inset-0 flex flex-col justify-end p-4"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)', transition: 'opacity 0.3s ease' }}
            >
              <div className="card-action-btns flex flex-col gap-2">
                <button
                  onClick={() => onAddToCanvas(imgSrc)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-white text-black hover:bg-gray-100 active:scale-[0.98] transition-all"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  新增至畫布
                </button>
                <button
                  onClick={() => onDownload(imgSrc)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white active:scale-[0.98] transition-all"
                  style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(4px)' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  下載
                </button>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* 底部提示 */}
      <p className="text-center text-[11px] text-[#AEAEB2] mt-5">點擊視窗外部區域可關閉</p>
    </div>
  </div>
);
