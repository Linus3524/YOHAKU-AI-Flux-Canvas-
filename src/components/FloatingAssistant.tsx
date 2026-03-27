
import React, { useState, useRef, useEffect } from 'react';

// --- 1. 功能說明資料庫 (Data Source) ---
const FEATURE_DOCS = [
  {
    category: "1. 核心畫布操作 (Core Canvas)",
    items: [
      { title: "無限畫布", desc: "提供無限的創作空間，不被畫布邊界限制。可自由拖曳 (Pan) 與縮放 (Zoom)。" },
      { title: "選取工具", desc: "點擊單一物件選取，或拖曳框選多個物件。支援 Shift 加選/減選。" },
      { title: "抓手工具", desc: "啟用後，拖曳滑鼠即可平移畫布，避免誤觸物件 (快捷鍵: 按住空白鍵)。" },
      { title: "縮放控制", desc: "透過右下角按鈕或滑鼠滾輪 (Ctrl/Cmd + 滾輪) 放大縮小，支援「適合畫面」。" }
    ]
  },
  {
    category: "2. 工作區域 (Artboard)",
    items: [
      { title: "建立工作區域", desc: "在畫布上建立固定尺寸的設計框，適合製作有明確邊界的作品（如海報、貼文）。從工具列新增，或右鍵選擇「加入工作區域」。" },
      { title: "預設尺寸", desc: "內建 A4、A3、Instagram 方形、16:9 橫版、9:16 直版等多種常用尺寸，也可自訂寬高。" },
      { title: "命名與管理", desc: "點擊工作區域可開啟設定面板，自訂名稱、調整尺寸，方便多個工作區域同時作業。" },
      { title: "匯出工作區域", desc: "在設定面板點擊「匯出」，或右鍵選擇「匯出此工作區域」，將框內所有物件（含效果）合成為高清圖片輸出。" }
    ]
  },
  {
    category: "3. 創作工具 (Creation Tools)",
    items: [
      { title: "便利貼", desc: "快速記錄想法或作為 AI 生成的提示詞來源。" },
      { title: "文字工具", desc: "支援橫書/直書切換、曲線文字、行距/字距調整。進階效果包含：邊框（顏色/粗細）、背景色、文字陰影（顏色/模糊）、光暈效果（顏色/強度）。右鍵可「轉換為圖片」並自動套用 3x 高清解析度。" },
      { title: "手繪工具", desc: "自由繪製草圖，具有筆刷與橡皮擦功能，支援透明背景繪圖。" },
      { title: "線條/箭頭", desc: "連接物件，支援直線、單向/雙向箭頭、圓點端點，可自訂虛線與顏色。右鍵可「轉換為圖片」。" },
      { title: "形狀工具", desc: "繪製幾何圖形 (矩形、圓形、多邊形、星形等)，支援鎖定長寬比與高清轉換。" },
      { title: "畫框工具", desc: "創建特定比例 (如 16:9) 的虛線框，搭配便利貼可直接生成圖片填入。" }
    ]
  },
  {
    category: "4. AI 生成 (Generative AI)",
    items: [
      { title: "一鍵生成圖片", desc: "框選圖片、手繪或便利貼，AI 根據內容生成高品質圖片。" },
      { title: "圖片逆向分析", desc: "右鍵點擊圖片選擇「提取提示詞」，AI 將分析畫面風格與文字，生成中英對照的詠唱咒語。" },
      { title: "Magic Style 風格庫", desc: "內建 36+ 種藝術風格 (如：賽博龐克、水彩、浮世繪)，一鍵套用至選取圖片。" },
      { title: "風格複製 (Magic Copy)", desc: "AI 分析來源圖片的紋理或藝術筆觸，並「貼上」到目標圖片，實現風格遷移。" },
      { title: "擴展圖片 (Outpainting)", desc: "拖曳外框定義擴展區域，AI 會無縫填補空白處 (支援自動發想提示詞)。" },
      { title: "智慧去背", desc: "自動分析主體，去除背景並修復邊緣細節 (Edge Repair)。" },
      { title: "影像調和", desc: "選取多張圖片，AI 會調整光影與色調，使其融合為一張自然的圖片 (支援 2K 高清)。" },
      { title: "視角轉換", desc: "改變圖片的拍攝角度 (如俯視、仰視、側視)。" },
      { title: "智能放大", desc: "支援 2x 或 4x 放大，針對透明圖片會智慧處理背景，保持邊緣清晰。" }
    ]
  },
  {
    category: "5. 圖片編輯 (Image Editing)",
    items: [
      { title: "局部重繪", desc: "使用筆刷塗抹遮罩，輸入提示詞來替換物件 (如：換衣服) 或移除物件。" },
      { title: "基礎/進階調整", desc: "亮度、對比、飽和度、色溫、亮部、陰影、銳化。" },
      { title: "圖片裁剪", desc: "非破壞性裁剪，可自由調整裁切範圍與角度。" },
      { title: "混合模式", desc: "圖片物件支援多種混合模式（正常、色彩增值、濾色、覆蓋、柔光、差異化等），在右側外觀面板中設定。" },
      { title: "淡出工具", desc: "為圖片邊緣套用方向性淡出效果，支援上/下/左/右/放射狀五種方向，可調整邊緣柔和度，在右側外觀面板中設定。" },
      { title: "圖片陰影效果", desc: "為圖片物件獨立設定投影，可調整陰影顏色、模糊強度、X/Y 偏移。效果會跟隨圖片像素形狀（去背圖尤其自然），下載、合併圖層與匯出工作區域時均保留。" },
      { title: "下載圖片", desc: "右鍵點擊圖片選擇「下載圖片」，套用陰影與淡出效果後以原始解析度輸出，所見即所得。" }
    ]
  },
  {
    category: "6. 圖層管理 (Layer Management)",
    items: [
      { title: "圖層面板", desc: "支援拖曳排序、隱藏/顯示、鎖定/解鎖、重新命名、刪除。" },
      { title: "群組/解散", desc: "將多個物件綁定在一起移動或操作 (Ctrl + G)。" },
      { title: "合併圖層", desc: "將選取的多個物件「壓平」為一張 PNG 圖片，自動裁切透明邊界，使用 3x 高清渲染，並保留陰影、淡出等視覺效果。" }
    ]
  },
  {
    category: "7. 系統功能 (System)",
    items: [
      { title: "轉換為圖片 (Rasterize)", desc: "對文字、形狀、箭頭右鍵選擇「轉換為圖片」。系統採用 3 倍超取樣 (Super-Sampling)，確保在大螢幕上清晰銳利。" },
      { title: "復原/重做", desc: "完整的歷史記錄支援，包含繪圖步驟與物件操作。" },
      { title: "匯出/匯入", desc: "支援將畫布匯出為 JSON 備份，或匯入還原工作區。" }
    ]
  },
  {
    category: "8. 常用快捷鍵 (Shortcuts)",
    items: [
      { title: "Space (按住)", desc: "切換為抓手工具 (Hand Tool)，拖曳平移畫布。" },
      { title: "Ctrl + Z / Ctrl + Y", desc: "復原 (Undo) / 重做 (Redo)。" },
      { title: "Ctrl + D", desc: "複製選取的物件 (Duplicate)。" },
      { title: "Ctrl + G", desc: "建立群組 (Group)。" },
      { title: "Ctrl + Shift + G", desc: "解散群組 (Ungroup)。" },
      { title: "Delete / Backspace", desc: "刪除選取的物件。" },
      { title: "Alt + 拖曳", desc: "按住 Alt (Mac: Option) 並拖曳物件，即可就地複製一份，支援多選同時複製。" },
      { title: "Shift + 拖曳", desc: "等比例縮放圖片，或多選/減選物件。" },
      { title: "Ctrl + 滾輪", desc: "縮放畫布 (Zoom)。" }
    ]
  }
];

interface ChatMessage {
    id: string;
    role: 'user' | 'ai';
    text: string;
}

interface FloatingAssistantProps {
  onAskAI?: (prompt: string) => Promise<string>;
  onCreateSticky?: (text: string) => void;
}

export const FloatingAssistant: React.FC<FloatingAssistantProps> = ({ onAskAI, onCreateSticky }) => {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'features' | 'ai'>('features');
  
  // Position
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  
  // Drag refs
  const hasMovedRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const lastEnterRef = useRef(0); // 用於記錄上次按下 Enter 的時間
  
  // Chat State
  const [inputValue, setInputValue] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
      { id: 'welcome', role: 'ai', text: "我是您的創意總監。請輸入模糊的想法，我會為您轉換成精確的 AI 繪圖提示詞。" }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const btnRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
      if (activeTab === 'ai') {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [chatHistory, isThinking, activeTab]);

  // --- Optimized Drag Logic ---
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    setIsDragging(true);
    hasMovedRef.current = false;
    
    offsetRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      
      const startX = e.clientX - offsetRef.current.x;
      const startY = e.clientY - offsetRef.current.y;
      
      const maxX = window.innerWidth - 60;
      const maxY = window.innerHeight - 60;
      const clampedX = Math.min(Math.max(10, startX), maxX);
      const clampedY = Math.min(Math.max(10, startY), maxY);

      setPosition({ x: clampedX, y: clampedY });

      if (Math.abs(clampedX - position.x) > 3 || Math.abs(clampedY - position.y) > 3) {
          hasMovedRef.current = true;
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, position]); 

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasMovedRef.current) {
      setIsOpen(!isOpen);
    }
  };

  // --- AI Logic ---
  const handleSend = async () => {
    if (!inputValue.trim() || isThinking) return;
    
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: inputValue };
    setChatHistory(prev => [...prev, userMsg]);
    setInputValue('');
    setIsThinking(true);

    try {
      let result = "";
      if (onAskAI) {
        result = await onAskAI(userMsg.text);
      } else {
        // Simulated AI Fallback
        await new Promise(resolve => setTimeout(resolve, 1500));
        result = "💡 **模擬回覆**：請確認您已連接 Gemini API 以獲得高品質提示詞。";
      }
      
      const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'ai', text: result };
      setChatHistory(prev => [...prev, aiMsg]);
    } catch (e) {
      const errorMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'ai', text: "抱歉，我現在有點忙碌，請稍後再試。" };
      setChatHistory(prev => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  // 處理 Enter 鍵邏輯：單次 Enter 換行，雙擊 Enter 送出
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          const now = Date.now();
          const diff = now - lastEnterRef.current;
          
          if (diff < 500 && diff > 0) { // 500ms 內連按兩次
              e.preventDefault();
              handleSend();
              lastEnterRef.current = 0; // 重置
          } else {
              lastEnterRef.current = now;
              // 不調用 preventDefault，讓它自然換行
          }
      }
  };

  const handleCreateStickyFromMsg = (text: string) => {
    if (onCreateSticky) {
      onCreateSticky(text);
      setIsOpen(false); 
    }
  };

  return (
    <>
      {/* Floating Button */}
      <div
        ref={btnRef}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        style={{ left: position.x, top: position.y }}
        className={`fixed z-[3000] w-14 h-14 rounded-full bg-[#FFCC00] text-white shadow-[0_8px_30px_rgba(255,204,0,0.4)] border-2 border-white flex items-center justify-center 
        ${isDragging ? 'cursor-grabbing' : 'cursor-grab transition-all duration-300 hover:scale-110'}`}
        title="AI 助手 & 功能指南"
      >
        {isOpen ? (
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        ) : (
           <div className="relative">
               <svg width="26" height="26" viewBox="0 0 24 24" fill="white" stroke="none" className="drop-shadow-sm">
                   <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
               </svg>
           </div>
        )}
      </div>

      {/* Popover Panel */}
      {isOpen && (
        <div
          style={{ 
            left: position.x > window.innerWidth / 2 ? position.x - 340 : position.x + 70, 
            top: position.y > window.innerHeight / 2 ? position.y - 450 : position.y,
            maxHeight: '80vh'
          }}
          className="fixed z-[2999] w-[360px] h-[520px] bg-white/95 backdrop-blur-2xl rounded-3xl shadow-[0_40px_80px_rgba(0,0,0,0.2)] border border-white/50 flex flex-col overflow-hidden animate-fade-in-up origin-top-left ring-1 ring-black/5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header / Tabs */}
          <div className="flex p-1.5 bg-gray-100/50 border-b border-gray-200/50 m-2 rounded-2xl flex-shrink-0">
            <button
              onClick={() => setActiveTab('features')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'features' ? 'bg-white shadow-sm text-[#1D1D1F]' : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'}`}
            >
              📖 功能指南
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'ai' ? 'bg-white shadow-sm text-[#AF52DE]' : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'}`}
            >
              ✨ 靈感顧問
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === 'features' ? (
              <div className="p-4 space-y-6 overflow-y-auto scrollbar-hide h-full">
                {FEATURE_DOCS.map((section, idx) => (
                  <div key={idx} className="space-y-3">
                    <h3 className="text-[11px] font-bold text-[#86868B] uppercase tracking-widest sticky top-0 bg-white/95 backdrop-blur-md py-2 border-b border-gray-100 z-10">
                      {section.category}
                    </h3>
                    <div className="grid gap-3">
                      {section.items.map((item, i) => (
                        <div key={i} className="group bg-gray-50/50 hover:bg-[#F5F5F7] p-3 rounded-xl border border-transparent hover:border-black/5 transition-all">
                          <div className="text-sm font-bold text-[#1D1D1F] mb-1 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-black transition-colors"></span>
                              {item.title}
                          </div>
                          <div className="text-xs text-[#6e6e73] leading-relaxed pl-3.5">
                            {item.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col h-full bg-gradient-to-b from-white to-[#F9F9FB]">
                {/* Chat History */}
                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                  {chatHistory.map((msg) => (
                      <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                          {msg.role === 'ai' && (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#AF52DE] to-[#5856D6] flex items-center justify-center text-white text-xs shadow-lg flex-shrink-0">AI</div>
                          )}
                          <div className={`space-y-2 max-w-[85%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                              <div className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                                  msg.role === 'user' 
                                  ? 'bg-[#1D1D1F] text-white rounded-tr-none' 
                                  : 'bg-white border border-purple-100 text-[#1D1D1F] rounded-tl-none ring-1 ring-purple-500/10'
                              }`}>
                                  {msg.text}
                              </div>
                              {msg.role === 'ai' && onCreateSticky && msg.id !== 'welcome' && (
                                  <button 
                                    onClick={() => handleCreateStickyFromMsg(msg.text)}
                                    className="text-xs font-bold text-[#AF52DE] bg-purple-50 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-1 ml-1"
                                  >
                                      <span>📝 產生為便利貼</span>
                                  </button>
                              )}
                          </div>
                      </div>
                  ))}

                  {isThinking && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#AF52DE] to-[#5856D6] flex items-center justify-center text-white text-xs shadow-lg flex-shrink-0">AI</div>
                        <div className="flex items-center gap-1.5 bg-white border border-purple-50 p-3 rounded-2xl rounded-tl-none shadow-sm">
                            <div className="w-1.5 h-1.5 bg-[#AF52DE] rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                            <div className="w-1.5 h-1.5 bg-[#AF52DE] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            <div className="w-1.5 h-1.5 bg-[#AF52DE] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                        </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input Area (Pill Shape with Textarea) */}
                <div className="p-4 border-t border-gray-100 bg-white flex-shrink-0">
                  <div className="relative flex items-end bg-[#F5F5F7] rounded-2xl shadow-inner border border-gray-100 focus-within:ring-2 focus-within:ring-[#AF52DE]/20 focus-within:bg-white transition-all overflow-hidden">
                    <textarea 
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="輸入想法 (雙擊 Enter 送出，單擊換行)..."
                      className="w-full bg-transparent border-none pl-5 pr-12 py-3.5 text-sm outline-none placeholder:text-gray-400 text-[#1D1D1F] resize-y min-h-[50px] max-h-[150px] leading-relaxed scrollbar-hide"
                      disabled={isThinking}
                      rows={1}
                    />
                    <button 
                      onClick={handleSend}
                      disabled={isThinking || !inputValue.trim()}
                      className={`absolute right-2 bottom-2 p-2 rounded-full transition-all flex items-center justify-center
                        ${!inputValue.trim() 
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                            : 'bg-black text-white hover:bg-gray-800 shadow-md hover:scale-105 active:scale-95'
                        }`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                  </div>
                  <div className="mt-2 text-[9px] text-[#86868B] text-center opacity-60">
                    💡 連按兩次 Enter 鍵可快速送出對話
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
