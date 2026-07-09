import React, { useState } from 'react';

// --- API Key Modal Component ---
export const ApiKeyModal = ({
    geminiKey: initialGeminiKey,
    onSubmit,
    onClose,
    atlasKey: initialAtlasKey,
    onSubmitAtlas,
    falKey: initialFalKey,
    onSubmitFal,
}: {
    geminiKey?: string;
    onSubmit: (key: string) => void;
    onClose: () => void;
    atlasKey?: string;
    onSubmitAtlas?: (key: string) => void;
    falKey?: string;
    onSubmitFal?: (key: string) => void;
}) => {
    const [key, setKey] = useState(initialGeminiKey || '');
    const [atlasKey, setAtlasKey] = useState(initialAtlasKey || '');
    const [falKey, setFalKey] = useState(initialFalKey || '');

    return (
        <div className="fixed inset-0 z-[8000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full border border-white/20 relative overflow-hidden">
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-[#1D1D1F] hover:bg-gray-100 rounded-full transition-all z-20"
                    title="暫時略過 (稍後可點擊上方紅燈設定)"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                {/* Decorative blobs */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-200 rounded-full blur-3xl opacity-30 pointer-events-none"></div>
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-200 rounded-full blur-3xl opacity-30 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-gradient-to-tr from-[#AF52DE] to-[#5856D6] rounded-2xl flex items-center justify-center mb-6 shadow-lg transform -rotate-3">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-[#1D1D1F] mb-2">Welcome to YOHAKU</h2>
                    <p className="text-[#86868B] text-sm mb-6 leading-relaxed">
                        這是一個使用 Gemini 3 Pro 的 AI 無限畫布。
                        <br/>
                        為了啟用 AI 功能，請輸入您的 Gemini API Key。
                    </p>

                    <div className="w-full space-y-3">
                        {/* Gemini Key */}
                        <div>
                            <p className="text-[11px] font-medium text-gray-500 mb-1 text-left">Gemini API Key（必填）</p>
                            <input
                                type="password"
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                                placeholder="AIza..."
                                className="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all text-sm"
                                autoFocus
                            />
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
                                className="text-[10px] text-[#007AFF] hover:underline mt-1 inline-block">
                                沒有 Gemini Key？點此免費獲取 →
                            </a>
                        </div>

                        {/* Atlas Key */}
                        <div>
                            <p className="text-[11px] font-medium text-gray-500 mb-1 text-left">Atlas Cloud Key（選填・GPT Image 2 / 即夢生圖用）</p>
                            <input
                                type="password"
                                value={atlasKey}
                                onChange={(e) => setAtlasKey(e.target.value)}
                                placeholder="apikey-..."
                                className="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                            />
                            <a href="https://www.atlascloud.ai?ref=3G2WHU" target="_blank" rel="noopener noreferrer"
                                className="text-[10px] text-[#007AFF] hover:underline mt-1 inline-block">
                                沒有 Atlas Key？點此取得 →
                            </a>
                        </div>

                        {/* fal.ai Key */}
                        <div>
                            <p className="text-[11px] font-medium text-gray-500 mb-1 text-left">fal.ai Key（選填・BiRefNet 去背用）</p>
                            <input
                                type="password"
                                value={falKey}
                                onChange={(e) => setFalKey(e.target.value)}
                                placeholder="fal_..."
                                className="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all text-sm"
                            />
                            <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noopener noreferrer"
                                className="text-[10px] text-[#007AFF] hover:underline mt-1 inline-block">
                                沒有 fal.ai Key？點此取得 →
                            </a>
                        </div>

                        <button
                            onClick={() => {
                                if (key) onSubmit(key);
                                if (atlasKey && onSubmitAtlas) onSubmitAtlas(atlasKey);
                                if (falKey && onSubmitFal) onSubmitFal(falKey);
                                if (key || atlasKey || falKey) onClose();
                            }}
                            disabled={!key && !atlasKey && !falKey}
                            className="w-full py-3 bg-black text-white font-bold rounded-xl shadow-lg shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            儲存設定
                        </button>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 w-full">
                        <p className="text-[10px] text-gray-400">
                            您的 Key 僅儲存於本地瀏覽器，不會上傳至伺服器。
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
