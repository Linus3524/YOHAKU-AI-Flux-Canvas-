export const AppTopStatusBar = ({
  isKeyValid,
  imageModel,
  storageStatus,
  onOpenKeyModal,
  onSetImageModel,
}: {
  isKeyValid: boolean;
  imageModel: string;
  storageStatus: string;
  onOpenKeyModal: () => void;
  onSetImageModel: (model: string) => void;
}) => (
  <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[6000]">
  <div className="animate-fade-in-down flex items-center gap-2">
      <button
          onClick={onOpenKeyModal}
          className="group flex items-center gap-2 px-4 py-1.5 bg-black/5 hover:bg-white backdrop-blur-sm rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-lg border border-white/20 transition-all duration-300"
      >
          <div className={`w-2 h-2 rounded-full shadow-sm ${isKeyValid ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50 animate-pulse'}`}></div>
          <span className={`text-[10px] font-bold tracking-wide transition-colors ${isKeyValid ? 'text-gray-500 group-hover:text-[#1D1D1F]' : 'text-red-500'}`}>
              {isKeyValid ? 'API Ready' : 'Setup API'}
          </span>
          {isKeyValid && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-[#1D1D1F] opacity-0 group-hover:opacity-100 transition-all -ml-1"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          )}
      </button>

      {/* Model Toggle */}
      {isKeyValid && (
        <div className="flex items-center bg-black/5 backdrop-blur-sm rounded-full border border-white/20 p-0.5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <button
            onClick={() => onSetImageModel('gemini-3.1-flash-lite-image')}
            className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all duration-200 ${
              imageModel === 'gemini-3.1-flash-lite-image'
                ? 'bg-white text-[#1D1D1F] shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Lite
          </button>
          <button
            onClick={() => onSetImageModel('gemini-3.1-flash-image')}
            className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all duration-200 ${
              imageModel === 'gemini-3.1-flash-image'
                ? 'bg-white text-[#1D1D1F] shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Flash
          </button>
          <button
            onClick={() => onSetImageModel('gemini-3.1-pro-image')}
            className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all duration-200 ${
              imageModel === 'gemini-3.1-pro-image'
                ? 'bg-white text-[#1D1D1F] shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Pro
          </button>
        </div>
      )}

      {/* Auto-Save Status（IndexedDB，無容量上限）*/}
      {storageStatus === 'saving' && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/5 border border-black/8 rounded-full">
              <svg className="animate-spin w-2.5 h-2.5 text-gray-400" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              <span className="text-[10px] font-medium text-gray-400">存檔中</span>
          </div>
      )}
      {storageStatus === 'error' && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full" title="自動存檔失敗，請手動 Ctrl+S 儲存">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-red-500">存檔失敗</span>
          </div>
      )}
  </div>
  </div>
);
