import type { CanvasElement } from '../types';

export const ClearStorageConfirmModal = ({
  onExportBackup,
  onClear,
  onClose,
}: {
  onExportBackup: () => void;
  onClear: () => void;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-[7000] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-gray-100 p-6 w-80 flex flex-col gap-4">
          <div>
              <p className="text-[15px] font-bold text-[#1D1D1F] mb-1">確定清除存檔？</p>
              <p className="text-xs text-[#6e6e73] leading-relaxed">清除後畫布將重置為空白，此操作無法復原。建議先匯出 JSON 備份，再執行清除。</p>
          </div>
          <div className="flex gap-2">
              <button
                  onClick={onExportBackup}
                  className="flex-1 py-2 text-xs font-bold bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
              >先匯出備份</button>
              <button
                  onClick={onClear}
                  className="flex-1 py-2 text-xs font-bold bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
              >確定清除</button>
          </div>
          <button
              onClick={onClose}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors text-center"
          >取消</button>
      </div>
  </div>
);

export const GenerationIntentModal = ({
  intentModal,
  intentText,
  onChangeIntentText,
  onClose,
  onSkip,
  onConfirm,
}: {
  intentModal: { elements: CanvasElement[]; count: 1|2|3|4 };
  intentText: string;
  onChangeIntentText: (value: string) => void;
  onClose: () => void;
  onSkip: () => void;
  onConfirm: () => void;
}) => (
  <div className="fixed inset-0 z-[7000] flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
    <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/50 w-[400px] p-6" onClick={e => e.stopPropagation()}>
      <div className="mb-4">
        <h3 className="font-bold text-[#1D1D1F] text-[15px] mb-1">想讓 AI 做什麼？</h3>
        <p className="text-[11px] text-[#86868B] leading-relaxed">圖片已選取，但尚未設定提示詞或風格。<br/>告訴 AI 你的意圖，結果會更精準。</p>
      </div>
      <textarea
        autoFocus
        value={intentText}
        onChange={e => onChangeIntentText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onConfirm();
          }
        }}
        placeholder="例如：轉成油畫風格、把背景換成日落、加強細節品質..."
        className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-gray-700 focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100 resize-none transition-colors"
        rows={3}
      />
      <div className="flex gap-2 mt-4">
        <button
          onClick={onSkip}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors"
        >
          跳過直接生成
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-700 transition-colors"
        >
          確認生成
        </button>
      </div>
      <p className="text-center text-[10px] text-[#86868B] mt-2">按 Enter 快速確認 · Esc 或點空白處取消</p>
    </div>
  </div>
);

export const SaveConfirmModal = ({
  currentFileName,
  onClose,
  onDiscard,
  onProceed,
}: {
  currentFileName: string | null;
  onClose: () => void;
  onDiscard: () => void;
  onProceed: () => void;
}) => (
  <div className="fixed inset-0 z-[7500] flex items-center justify-center bg-black/25 backdrop-blur-sm" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-black/8 w-[360px] p-6" onClick={e => e.stopPropagation()}>
      <div className="mb-5">
        <h3 className="font-semibold text-[#1D1D1F] text-[15px] mb-1">覆蓋存檔</h3>
        <p className="text-[12px] text-[#86868B] leading-relaxed">
          確定要覆蓋桌面的 <span className="font-medium text-[#1D1D1F]">「{currentFileName}」</span>？
          <br />此操作無法復原。
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-black/10 text-[#1D1D1F] text-[13px] font-medium hover:bg-gray-50 transition-colors"
        >取消</button>
        <button
          onClick={onDiscard}
          className="flex-1 py-2.5 rounded-xl border border-black/10 text-[#86868B] text-[13px] font-medium hover:bg-gray-50 transition-colors"
        >中斷連結</button>
        <button
          onClick={onProceed}
          className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-700 transition-colors"
        >存檔</button>
      </div>
    </div>
  </div>
);

export const ImageDropOverlay = () => (
  <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none"
    style={{ background: 'radial-gradient(ellipse at center, rgba(175,82,222,0.08) 0%, rgba(88,86,214,0.06) 40%, rgba(255,255,255,0.55) 100%)', backdropFilter: 'blur(12px)' }}>
    {/* 邊框光暈 */}
    <div className="absolute inset-4 rounded-[2rem] pointer-events-none"
      style={{ border: '1.5px dashed rgba(175,82,222,0.35)', boxShadow: 'inset 0 0 60px rgba(175,82,222,0.06)' }} />
    {/* 中央卡片 */}
    <div className="flex flex-col items-center gap-3 px-11 py-8 rounded-2xl"
      style={{
        background: 'rgba(255,255,255,0.82)',
        boxShadow: '0 24px 64px rgba(88,86,214,0.12), 0 4px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
        border: '1px solid rgba(175,82,222,0.18)',
        backdropFilter: 'blur(20px)',
      }}>
      {/* 圖示 */}
      <div className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #AF52DE 0%, #5856D6 100%)', boxShadow: '0 6px 18px rgba(88,86,214,0.28)' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3" ry="3"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </div>
      <p className="text-[#1D1D1F] font-semibold text-lg tracking-tight leading-tight">釋放以新增圖片</p>
      <p className="text-[#86868B] text-xs tracking-wide">支援 PNG・JPG・WEBP・GIF</p>
    </div>
  </div>
);
