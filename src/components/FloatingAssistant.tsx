
import React, { useState, useRef, useEffect, useCallback } from 'react';

// ─── Feature Guide Data ───────────────────────────────────────────────────────
const FEATURE_DOCS = [
  {
    category: "1. 核心畫布操作 (CORE CANVAS)",
    color: "text-yohaku-text-main",
    items: [
      { title: "無限畫布", desc: "提供無限的創作空間，不被畫布邊界限制。可自由拖曳 (Pan) 與縮放 (Zoom)。" },
      { title: "選取工具", desc: "點擊單一物件選取，或拖曳框選多個物件。支援 Shift 加選/減選。" },
      { title: "抓手工具", desc: "啟用後，拖曳滑鼠即可平移畫布，避免誤觸物件（快捷鍵：按住空白鍵）。" },
      { title: "縮放控制", desc: "透過右下角按鈕或滑鼠滾輪（Ctrl/Cmd + 滾輪）放大縮小，支援「適合畫面」。" }
    ]
  },
  {
    category: "2. 工作區域 (ARTBOARD)",
    color: "text-yohaku-text-main",
    items: [
      { title: "建立工作區域", desc: "在畫布上建立固定尺寸的設計框，適合製作海報、貼文等有明確邊界的作品。" },
      { title: "預設尺寸", desc: "社群媒體（IG/Threads/Facebook）、網頁（1920/1440/手機）、印刷（A4/A5/名片）及自訂。" },
      { title: "命名與管理", desc: "點擊工作區域可開啟設定面板，自訂名稱、調整尺寸，方便多個工作區域同時作業。" },
      { title: "批次匯出", desc: "在圖層面板同時選取 2 個以上工作區域時，可一鍵批次匯出全部為獨立 PNG 檔。" }
    ]
  },
  {
    category: "3. 創作工具 (CREATION TOOLS)",
    color: "text-yohaku-text-main",
    items: [
      { title: "便利貼", desc: "快速記錄想法，支援上傳最多 4 張參考圖（①②③④），AI 生成時同時參考視覺風格。" },
      { title: "文字工具", desc: "橫書/直書/曲線文字，進階效果：邊框、背景色、陰影、光暈。右鍵可轉換為 3x 高清圖片。" },
      { title: "手繪工具", desc: "自由繪製草圖，具有筆刷與橡皮擦功能，支援透明背景繪圖。" },
      { title: "線條/箭頭", desc: "支援直線、單向/雙向箭頭、圓點端點，可自訂虛線樣式與顏色。" },
      { title: "形狀工具", desc: "矩形、圓形、三角、五角、六角、星形、愛心、圓角矩形，支援鎖定長寬比。" },
      { title: "畫框工具", desc: "建立特定比例（如 16:9）的虛線框，搭配便利貼可直接生成圖片填入。" }
    ]
  },
  {
    category: "4. AI 生成 (GENERATIVE AI)",
    color: "text-yohaku-text-main",
    items: [
      { title: "一鍵生成圖片", desc: "框選圖片、手繪或便利貼，AI 根據內容生成高品質圖片。" },
      { title: "圖片逆向分析", desc: "右鍵點擊圖片選「提取提示詞」，AI 生成中英對照的詠唱咒語。" },
      { title: "Magic Style 風格庫", desc: "內建 36+ 種藝術風格（賽博龐克、水彩、浮世繪等），一鍵套用至選取圖片。" },
      { title: "風格複製", desc: "AI 解構色彩、光影、畫風等 10 個維度，提供紋理模式/藝術樣式/手動三種方式貼上。" },
      { title: "擴展圖片", desc: "拖曳外框定義擴展區域，AI 無縫填補空白處（支援自動發想提示詞）。" },
      { title: "智慧去背", desc: "自動分析主體，去除背景並修復邊緣細節（Edge Repair）。" },
      { title: "影像調和", desc: "選取多張圖片，AI 調整光影與色調，融合為一張自然的圖片（支援 2K 高清）。" },
      { title: "視角轉換 & 智能放大", desc: "改變拍攝角度，或進行 2x/4x 智能放大，透明圖片自動處理背景。" }
    ]
  },
  {
    category: "5. 圖片編輯 (IMAGE EDITING)",
    color: "text-yohaku-text-main",
    items: [
      { title: "局部重繪", desc: "使用筆刷塗抹遮罩區域，輸入提示詞替換或移除物件。" },
      { title: "基礎/進階調整", desc: "亮度、對比、飽和度、色溫、亮部、陰影、銳化。" },
      { title: "圖片裁剪", desc: "非破壞性裁剪，可自由調整裁切範圍與旋轉角度。" },
      { title: "混合模式", desc: "支援正常、色彩增值、濾色、覆蓋、柔光等多種混合模式。" },
      { title: "淡出工具", desc: "為圖片套用方向性淡出（上/下/左/右/放射狀），可調整柔和度。" },
      { title: "圖片陰影", desc: "為圖片獨立設定投影（顏色/模糊/X·Y 偏移），跟隨圖片像素形狀。" }
    ]
  },
  {
    category: "6. 圖層管理 (LAYER MGT)",
    color: "text-yohaku-text-main",
    items: [
      { title: "群組 / 解散群組", desc: "將多個物件綁定移動與操作（Ctrl+G / Ctrl+Shift+G）。" },
      { title: "合併圖層", desc: "將選取物件壓平為一張 PNG，使用 3x 高清渲染，保留陰影與淡出效果。" }
    ]
  },
  {
    category: "7. 系統功能 (SYSTEM)",
    color: "text-yohaku-text-main",
    items: [
      { title: "轉換為圖片", desc: "對文字、形狀、箭頭右鍵轉換，採用 3 倍超取樣確保清晰銳利。" },
      { title: "復原/重做 & 匯出匯入", desc: "完整歷史記錄支援，並可將畫布匯出為 JSON 備份或匯入還原。" }
    ]
  },
];

const SHORTCUTS = [
  { key: 'Space', label: '抓手工具' },
  { key: 'Ctrl+Z/Y', label: '復原/重做' },
  { key: 'Ctrl + D', label: '複製' },
  { key: 'Ctrl + G', label: '群組/解散' },
  { key: 'Alt + 拖曳', label: '就地複製' },
  { key: 'Shift+拖曳', label: '等比縮放' },
  { key: 'Ctrl+滾輪', label: '縮放畫布' },
  { key: 'Delete', label: '刪除物件' },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type Section = 'about' | 'features' | 'guide' | 'consultant' | 'security' | 'legal';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

interface FloatingAssistantProps {
  onAskAI?: (prompt: string) => Promise<string>;
  onCreateSticky?: (text: string) => void;
}

// ─── Nav Items ────────────────────────────────────────────────────────────────
const NAV_ITEMS: { id: Section; label: string; icon: React.ReactNode; purple?: boolean }[] = [
  {
    id: 'about',
    label: '關於 YOHAKU',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  },
  {
    id: 'features',
    label: '核心特色',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
  },
  {
    id: 'guide',
    label: '功能指南',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
  },
  {
    id: 'consultant',
    label: '靈感顧問',
    purple: true,
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
  },
  {
    id: 'security',
    label: '安全性與費用',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  },
  {
    id: 'legal',
    label: '服務條款',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export const FloatingAssistant: React.FC<FloatingAssistantProps> = ({ onAskAI, onCreateSticky }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('about');
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const hasMovedRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const contentRef = useRef<HTMLDivElement>(null);

  // Chat State
  const [inputValue, setInputValue] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'ai', text: '我是您的創意顧問。請輸入模糊的想法，我會為您轉換成精確的 AI 繪圖提示詞。' }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastEnterRef = useRef(0);

  // Scroll chat to bottom
  useEffect(() => {
    if (activeSection === 'consultant') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isThinking, activeSection]);

  // Scroll content to top on section change
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [activeSection]);

  // Drag
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    hasMovedRef.current = false;
    offsetRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = Math.min(Math.max(10, e.clientX - offsetRef.current.x), window.innerWidth - 60);
      const y = Math.min(Math.max(10, e.clientY - offsetRef.current.y), window.innerHeight - 60);
      setPosition({ x, y });
      if (Math.abs(x - position.x) > 3 || Math.abs(y - position.y) > 3) hasMovedRef.current = true;
    };
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isDragging, position]);

  const handleFabClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasMovedRef.current) setIsOpen(v => !v);
  };

  // Panel position
  const panelW = Math.min(900, window.innerWidth - 48);
  const panelH = Math.min(680, window.innerHeight - 80);
  const panelLeft = position.x > window.innerWidth / 2 ? Math.max(8, position.x - panelW - 12) : position.x + 70;
  const panelTop = position.y > window.innerHeight / 2 ? Math.max(8, position.y - panelH) : position.y;

  // AI Chat
  const handleSend = async () => {
    if (!inputValue.trim() || isThinking) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: inputValue };
    setChatHistory(prev => [...prev, userMsg]);
    setInputValue('');
    setIsThinking(true);
    try {
      const result = onAskAI ? await onAskAI(userMsg.text) : '💡 請確認已連接 Gemini API 以獲得高品質提示詞。';
      setChatHistory(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: result }]);
    } catch {
      setChatHistory(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: '抱歉，我現在有點忙碌，請稍後再試。' }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const now = Date.now();
      if (now - lastEnterRef.current < 500) { e.preventDefault(); handleSend(); lastEnterRef.current = 0; }
      else lastEnterRef.current = now;
    }
  };

  const handleCreateSticky = (text: string) => {
    if (onCreateSticky) { onCreateSticky(text); setIsOpen(false); }
  };

  return (
    <>
      {/* ── FAB ─────────────────────────────────────────────────────────────── */}
      <div
        onMouseDown={handleMouseDown}
        onClick={handleFabClick}
        style={{ left: position.x, top: position.y }}
        className={`fixed z-[3000] w-14 h-14 rounded-full bg-white/70 backdrop-blur-xl flex items-center justify-center
          shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_0_0_1px_rgba(255,255,255,0.6)]
          ${isDragging ? 'cursor-grabbing' : 'cursor-grab transition-all duration-500 hover:scale-110 hover:bg-white active:scale-95'}`}
        title="YOHAKU 功能助手"
      >
        {/* Lightning icon */}
        <svg className={`w-5 h-5 text-gray-700 absolute transition-all duration-500 ${isOpen ? 'opacity-0 scale-50 rotate-90' : 'opacity-100 scale-100'}`}
          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        {/* X icon */}
        <svg className={`w-5 h-5 text-gray-700 absolute transition-all duration-500 ${isOpen ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-90'}`}
          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>

      {/* ── Panel ───────────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          style={{ left: panelLeft, top: panelTop, width: panelW, height: panelH }}
          className="fixed z-[2999] flex bg-white/85 backdrop-blur-xl border border-white/30 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] rounded-2xl overflow-hidden animate-fade-in-up origin-bottom"
          onClick={e => e.stopPropagation()}
        >
          {/* ── Sidebar ─────────────────────────────────────────────────────── */}
          <div className="w-52 flex-shrink-0 border-r border-gray-200 bg-white/50 flex flex-col p-5">
            {/* Logo */}
            <div className="mb-6">
              <img src="/yohaku-logo.png" alt="YOHAKU AI Flux Canvas" className="w-full h-auto opacity-90" />
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-0.5 overflow-y-auto">
              {NAV_ITEMS.map((item, idx) => (
                <React.Fragment key={item.id}>
                  {item.id === 'security' && <div className="my-2 border-t border-yohaku-border-light" />}
                  <button
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-[12px] font-medium transition-all flex items-center gap-2.5
                      ${activeSection === item.id
                        ? item.purple
                          ? 'bg-purple-50 text-purple-700 font-bold border-r-[3px] border-purple-500 rounded-r-none'
                          : 'bg-black/5 text-yohaku-text-main font-bold border-r-[3px] border-gray-800 rounded-r-none'
                        : item.purple
                          ? 'text-purple-600 hover:bg-purple-50'
                          : 'text-yohaku-text-muted hover:bg-gray-100 hover:text-yohaku-text-main'
                      }`}
                  >
                    <span className={activeSection === item.id && item.purple ? 'text-purple-600' : 'text-yohaku-text-muted'}>{item.icon}</span>
                    {item.label}
                    {item.purple && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />}
                  </button>
                </React.Fragment>
              ))}
            </nav>

            {/* Social Links */}
            <div className="mt-4 flex items-center gap-3 px-1">
              <a href="https://www.instagram.com/linus3524/" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-pink-500 transition-all hover:scale-110" title="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a href="https://www.threads.com/@linus3524" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-black transition-all hover:scale-110" title="Threads">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>
              </a>
              <a href="https://www.facebook.com/r352410/" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-blue-600 transition-all hover:scale-110" title="Facebook">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="mailto:r352410@gmail.com" className="text-gray-300 hover:text-red-500 transition-all hover:scale-110" title="Email">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </a>
            </div>

            {/* Copyright */}
            <div className="pt-3 border-t border-yohaku-border-light text-[9px] text-yohaku-text-muted leading-relaxed mt-2">
              <p>© 2026 LINUS Nice Day Japan (CHANG CHIN WEI) @linus3524 All Rights Reserved.</p>
              <p className="mt-0.5">Based on Nano Banana Infinite Canvas by @prompt_case</p>
            </div>
          </div>

          {/* ── Content Area ─────────────────────────────────────────────────── */}
          <div ref={contentRef} className="flex-1 overflow-y-auto bg-white/30" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d1d1 transparent' }}>

            {/* ABOUT */}
            {activeSection === 'about' && (
              <div className="p-8">
                <span className="inline-block px-3 py-1 bg-black text-white text-[9px] tracking-widest rounded mb-4 uppercase">Introduction</span>
                <h2 className="text-2xl font-bold text-yohaku-text-main mb-4 leading-snug" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                  余白に、創造を。<br />餘白，是靈感的原野。
                </h2>
                <p className="text-gray-600 leading-loose tracking-wide mb-6 text-[13px]">
                  哈囉大家，我是 <span className="font-bold text-black border-b border-gray-400">Linus</span>。一位旅居日本的台灣平面設計師，同時也是一位不動產仲介。
                </p>
                <p className="italic text-gray-600 leading-loose tracking-wide mb-6 text-sm border-l-2 border-gray-200 pl-4">
                  「YOHAKU」取自日語中的「余白（よはく）」。無限畫布就像靈感的原野，無論你如何填滿、如何創作，這裡永遠為創意無限的人留白。
                </p>
                <p className="text-gray-600 leading-loose tracking-wide mb-4 text-[13px]">
                  這個軟體源自 @prompt_case 的 Nano Banana Infinite Canvas。我以其為基礎，運用 Gemini 最新模型進行了徹底的重製與功能擴充。希望 YOHAKU 能陪你從靈感到作品一氣呵成。
                </p>
                <p className="text-gray-600 leading-loose tracking-wide mb-8 text-[13px]">
                  YOHAKU 的定位並非取代主流軟體（如 Adobe、Figma 或 Canva），而是在原有工作流上為設計師「如虎添翼」，也讓行銷人員、社群編輯等非設計背景的使用者輕鬆上手。
                </p>
                <div className="pt-2 text-center">
                  <p className="text-[15px] tracking-wider text-yohaku-text-main font-bold">盡情享受這片餘白（YOHAKU），把你的想像力填進去吧！✨</p>
                </div>
              </div>
            )}

            {/* FEATURES */}
            {activeSection === 'features' && (
              <div className="p-8">
                <h2 className="text-2xl font-bold text-yohaku-text-main mb-6" style={{ fontFamily: "'Noto Serif JP', serif" }}>五大核心特色</h2>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { color: 'bg-indigo-50 text-indigo-600', emoji: '✨', title: 'Gemini AI 全程輔助', desc: '懸浮「靈感助手」隨時待命，從提示詞優化到 AI 生圖，所有過程都在畫布上直接完成。' },
                    { color: 'bg-amber-50 text-amber-600', emoji: '📐', title: '專業工作區域系統', desc: '建立多個獨立設計版面，內建 IG、A4、名片等預設尺寸，一鍵同時匯出多個工作區域。' },
                    { color: 'bg-emerald-50 text-emerald-600', emoji: '📸', title: '設計師級影像處理', desc: '風格複製、圖片調和、AI 去背、高畫質放大、外擴繪圖、局部重繪，Moodboard 製作效率倍增。' },
                    { color: 'bg-rose-50 text-rose-600', emoji: '📝', title: '便利貼即是 AI 指令', desc: '便利貼不只是記事，更是生圖的起點。支援上傳最多 4 張參考圖，想法直接轉化為視覺素材。' },
                    { color: 'bg-blue-50 text-blue-600', emoji: '🖋️', title: '完整排版工具', desc: '多字體、彎曲文字、精細行距字距、邊框陰影光暈，讓文字排版也能設計到底。' },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-xl bg-white/60 border border-yohaku-border-light shadow-sm hover:shadow-md transition-shadow">
                      <div className={`w-10 h-10 flex-shrink-0 ${item.color} rounded-lg flex items-center justify-center text-xl`}>{item.emoji}</div>
                      <div>
                        <h3 className="font-bold text-yohaku-text-main mb-1 text-sm">{item.title}</h3>
                        <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* GUIDE */}
            {activeSection === 'guide' && (
              <div className="p-8">
                <h2 className="text-2xl font-bold text-yohaku-text-main mb-2" style={{ fontFamily: "'Noto Serif JP', serif" }}>功能指南</h2>
                <p className="text-sm text-yohaku-text-muted mb-8">所有功能的完整說明</p>
                <div className="space-y-6">
                  {FEATURE_DOCS.map((section, idx) => (
                    <div key={idx} className="bg-white/80 rounded-xl p-6 border border-yohaku-border-light shadow-sm">
                      <h3 className="text-[11px] font-bold text-yohaku-text-muted tracking-widest mb-4 uppercase">{section.category}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {section.items.map((item, i) => (
                          <div key={i}>
                            <h4 className={`font-bold text-sm mb-1 ${section.color}`}>{item.title}</h4>
                            <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {/* Shortcuts */}
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 shadow-sm">
                    <h3 className="text-[11px] font-bold text-yohaku-text-muted tracking-widest mb-4 uppercase">8. 常用快捷鍵 (SHORTCUTS)</h3>
                    <div className="grid grid-cols-4 gap-3 text-center">
                      {SHORTCUTS.map((s, i) => (
                        <div key={i}>
                          <div className="bg-white border border-gray-200 rounded py-1.5 font-mono text-[10px] text-yohaku-text-main mb-1">{s.key}</div>
                          <span className="text-[9px] text-yohaku-text-muted">{s.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CONSULTANT */}
            {activeSection === 'consultant' && (
              <div className="flex flex-col h-full p-8">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-yohaku-text-main" style={{ fontFamily: "'Noto Serif JP', serif" }}>靈感顧問</h2>
                  <p className="text-xs text-purple-600 font-medium flex items-center gap-1 mt-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse inline-block" /> AI 隨時待命
                  </p>
                </div>
                <div className="flex-1 bg-white/60 rounded-2xl p-6 border border-white shadow-inner overflow-y-auto mb-4 flex flex-col gap-4 min-h-0">
                  {chatHistory.map(msg => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                      {msg.role === 'ai' && (
                        <div className="w-9 h-9 rounded-full bg-purple-600 flex-shrink-0 flex items-center justify-center text-white font-bold text-xs shadow-md">AI</div>
                      )}
                      <div className={`space-y-2 max-w-[85%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                        <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm
                          ${msg.role === 'user'
                            ? 'bg-gray-900 text-white rounded-tr-sm'
                            : 'bg-white border border-purple-100 text-yohaku-text-main rounded-tl-sm'}`}>
                          {msg.text}
                        </div>
                        {msg.role === 'ai' && onCreateSticky && msg.id !== 'welcome' && (
                          <button onClick={() => handleCreateSticky(msg.text)}
                            className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-1 ml-1">
                            📝 產生為便利貼
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {isThinking && (
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-600 flex-shrink-0 flex items-center justify-center text-white font-bold text-xs shadow-md">AI</div>
                      <div className="flex items-center gap-1.5 bg-white border border-purple-50 p-3 rounded-2xl rounded-tl-sm shadow-sm">
                        {[0, 0.2, 0.4].map((d, i) => <div key={i} className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />)}
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="relative bg-white rounded-2xl border border-gray-200 shadow-sm flex items-end focus-within:ring-2 focus-within:ring-purple-200 transition-all overflow-hidden">
                  <textarea
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="輸入想法（雙擊 Enter 送出，單擊換行）..."
                    className="w-full bg-transparent border-none py-3 pl-4 pr-12 text-sm text-gray-700 focus:outline-none resize-none min-h-[50px] max-h-[120px] leading-relaxed"
                    disabled={isThinking}
                    rows={2}
                  />
                  <button onClick={handleSend} disabled={isThinking || !inputValue.trim()}
                    className={`absolute bottom-2.5 right-2.5 w-8 h-8 rounded-xl flex items-center justify-center transition-all
                      ${inputValue.trim() ? 'bg-gray-900 text-white hover:bg-gray-700 shadow-md' : 'bg-gray-100 text-gray-600 cursor-not-allowed'}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>
                </div>
                <p className="text-center text-[9px] text-yohaku-text-muted mt-2">連按兩次 Enter 可快速送出</p>
              </div>
            )}

            {/* SECURITY */}
            {activeSection === 'security' && (
              <div className="p-8">
                <h2 className="text-2xl font-bold text-yohaku-text-main mb-6" style={{ fontFamily: "'Noto Serif JP', serif" }}>安全性與費用</h2>
                <div className="space-y-5">
                  <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-6">
                    <h3 className="text-blue-900 font-bold mb-3 flex items-center gap-2 text-sm">🔒 安全性說明</h3>
                    <ul className="text-sm text-blue-800 space-y-2 opacity-80">
                      <li>・ <span className="font-bold">在地化存儲：</span>API 金鑰僅儲存於個人瀏覽器 LocalStorage，不會傳送至開發者伺服器。</li>
                      <li>・ <span className="font-bold">持久化設定：</span>關閉頁面後設定仍保留（無痕模式除外）。</li>
                      <li>・ <span className="font-bold">用戶責任：</span>請妥善保管 API 金鑰，切勿洩漏給他人。</li>
                    </ul>
                  </div>
                  <div className="bg-white/80 border border-yohaku-border-light rounded-xl p-6 shadow-sm">
                    <h3 className="text-yohaku-text-main font-bold mb-4 text-sm">💰 關於 API 使用費用</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-3 border-b border-yohaku-border-light">
                        <span className="text-sm font-medium">軟體授權</span>
                        <span className="text-sm text-emerald-600 font-bold">YOHAKU 完全免費</span>
                      </div>
                      <div className="pb-3 border-b border-yohaku-border-light">
                        <span className="text-sm font-medium block mb-1">第三方計費</span>
                        <ul className="text-xs text-gray-600 space-y-1">
                          <li>・ <span className="font-bold">Gemini API：</span>費用由您的 Google 帳號直接扣款，依 Google 官方政策計費。</li>
                          <li>・ <span className="font-bold">Atlas Cloud API：</span>費用由您的 Atlas Cloud 帳號扣款，依使用模型與次數計費。</li>
                        </ul>
                      </div>

                      {/* Gemini 模型 */}
                      <div className="pb-3 border-b border-yohaku-border-light">
                        <span className="text-sm font-bold text-yohaku-text-main block mb-2">🔵 Gemini 生圖模型（需 Gemini API Key）</span>
                        <ul className="text-xs text-gray-600 space-y-2 leading-relaxed mb-3">
                          <li>・ <span className="font-bold text-gray-600">gemini-3.1-flash-lite-preview</span>：提示詞生成、圖片分析。免費額度高（約 2,000 次/日）。</li>
                          <li>・ <span className="font-bold text-gray-600">生圖模型</span>：可在頂部狀態欄切換 Flash / Pro，依需求選擇。需付費使用。</li>
                        </ul>
                        <span className="text-xs font-bold text-yohaku-text-main block mb-2">Gemini 生圖模型比較：</span>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[10px] text-gray-600 border-collapse">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-1.5 pr-3 font-medium text-yohaku-text-muted w-1/3">維度</th>
                                <th className="text-left py-1.5 pr-3 font-medium text-yohaku-text-main">Nano Banana 2 (Flash)</th>
                                <th className="text-left py-1.5 font-medium text-yohaku-text-main">Nano Banana Pro</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {[
                                ['底層架構', 'gemini-3.1-flash-image-preview', 'gemini-3-pro-image-preview'],
                                ['生成速度', '4–6 秒', '8–12 秒'],
                                ['輸出解析度', '512 / 1K / 2K / 4K', '1K / 2K / 4K'],
                                ['文字渲染', '短句・標籤準確', '長句・複雜排版精準'],
                                ['提示詞理解', '視覺直覺・大眾描述', '精確參數（焦距・材質）'],
                              ].map(([dim, flash, pro]) => (
                                <tr key={dim}>
                                  <td className="py-1.5 pr-3 text-yohaku-text-muted">{dim}</td>
                                  <td className="py-1.5 pr-3 text-gray-600">{flash}</td>
                                  <td className="py-1.5 text-gray-600">{pro}</td>
                                </tr>
                              ))}
                              <tr>
                                <td className="py-1.5 pr-3 text-yohaku-text-muted align-top">物件連續性</td>
                                <td className="py-1.5 pr-3 text-gray-600 align-top">每次獨立生成<br/>跨圖角色外觀易跑掉</td>
                                <td className="py-1.5 text-gray-600 align-top">鎖定角色視覺特徵<br/>跨圖外觀一致・最多 14 物件</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Atlas Cloud 模型 */}
                      <div>
                        <span className="text-sm font-bold text-yohaku-text-main block mb-2">🟠 Atlas Cloud 生圖模型（需 Atlas Cloud Key）</span>
                        <p className="text-xs text-gray-500 mb-3">由 Atlas Cloud 代理的多家頂級生圖模型，於生成設定面板中選擇，純文字轉圖片，一次輸出 2 張結果。</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[10px] text-gray-600 border-collapse">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-1.5 pr-2 font-medium text-yohaku-text-muted" style={{width:'22%'}}>模型</th>
                                <th className="text-left py-1.5 pr-2 font-medium text-yohaku-text-main" style={{width:'18%'}}>開發商</th>
                                <th className="text-left py-1.5 font-medium text-yohaku-text-main">特色與適用場景</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              <tr>
                                <td className="py-2 pr-2 font-bold text-gray-700 align-top">GPT Image 2</td>
                                <td className="py-2 pr-2 text-gray-500 align-top">OpenAI</td>
                                <td className="py-2 text-gray-600 align-top">指令跟隨能力最強，精細文字可精確入畫，適合需要精確排版、產品圖、廣告素材的場景。</td>
                              </tr>
                              <tr>
                                <td className="py-2 pr-2 font-bold text-gray-700 align-top">即夢 Seedream v4.5</td>
                                <td className="py-2 pr-2 text-gray-500 align-top">ByteDance</td>
                                <td className="py-2 text-gray-600 align-top">速度快、亞洲美學強項，擅長東方風格插圖與人物生成，中文提示詞理解佳。<span className="font-bold text-gray-700">生成中文標準字（設計師字型、特色標題字）表現突出</span>，適合需要在圖片中嵌入正確中文字的設計場景。</td>
                              </tr>
                              <tr>
                                <td className="py-2 pr-2 font-bold text-gray-700 align-top">即夢 Seedream v5 Lite</td>
                                <td className="py-2 pr-2 text-gray-500 align-top">ByteDance</td>
                                <td className="py-2 text-gray-600 align-top">v4.5 升級版，畫面細節更豐富、構圖更穩定，文字渲染提升，兼顧速度與品質。</td>
                              </tr>
                              <tr>
                                <td className="py-2 pr-2 font-bold text-gray-700 align-top">Flux Dev</td>
                                <td className="py-2 pr-2 text-gray-500 align-top">Black Forest Labs</td>
                                <td className="py-2 text-gray-600 align-top">藝術風格強烈、色彩層次豐富，適合創意插圖、概念設計與風格化視覺作品。</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="p-3 bg-rose-50 rounded-lg text-xs text-rose-600 border border-rose-100">
                        <b>溫馨提示：</b>建議至 Google Cloud Console 設定預算警示（Gemini），並定期於 Atlas Cloud 後台確認餘額，以精確掌控使用成本。
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                    <h3 className="text-yohaku-text-main font-bold mb-3 text-sm">🌐 運作環境</h3>
                    <ul className="text-sm text-gray-600 space-y-2">
                      <li>・ <span className="font-bold text-yohaku-text-main">推薦瀏覽器：</span>Chrome、Edge、Safari（請更新至最新版本）。</li>
                      <li>・ <span className="font-bold text-yohaku-text-main">支援裝置：</span>最佳體驗建議使用電腦或平板電腦。</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* LEGAL */}
            {activeSection === 'legal' && (
              <div className="p-8">
                <h2 className="text-2xl font-bold text-yohaku-text-main mb-6" style={{ fontFamily: "'Noto Serif JP', serif" }}>服務條款 & 免責聲明</h2>
                <div className="space-y-5 bg-white/80 p-6 rounded-xl border border-yohaku-border-light shadow-sm">
                  <div>
                    <h3 className="font-bold text-yohaku-text-main text-sm mb-1">1. 關於服務提供</h3>
                    <p className="leading-relaxed text-gray-600 text-xs">本軟體以「現狀（As-Is）」提供，開發者不保證服務之絕對準確性或特定目的之適用性，並保留隨時變更、中斷或終止服務之權利。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-yohaku-text-main text-sm mb-1">2. 費用責任與損害賠償免責</h3>
                    <p className="leading-relaxed text-gray-600 text-xs mb-2">所有因 API 使用產生之費用均由用戶自行負擔。開發者對任何非預期扣款、超額費用或計費糾紛概不負賠償責任。</p>
                    <p className="leading-relaxed text-gray-600 text-xs">對於因使用本軟體導致之數據丟失、業務中斷或 API 費用損失，開發者不負賠償責任。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-yohaku-text-main text-sm mb-2">3. 數據與隱私保護</h3>
                    <ul className="space-y-1.5 text-gray-600 text-xs">
                      <li>・ <span className="font-bold text-gray-600">影像處理：</span>上傳之影像將發送至 Google 伺服器，遵循 Google AI Studio 條款。請勿上傳機密資訊。</li>
                      <li>・ <span className="font-bold text-gray-600">版權責任：</span>用戶應確保上傳圖片擁有合法使用權，侵權糾紛由用戶自負法律責任。</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-yohaku-text-main text-sm mb-2">4. 智慧財產權</h3>
                    <ul className="space-y-1.5 text-gray-600 text-xs">
                      <li>・ <span className="font-bold text-gray-600">本軟體主權：</span>YOHAKU 之程式碼邏輯、UI 設計及品牌版權歸開發者 LINUS Nice Day Japan (CHANG CHIN WEI) @linus3524 所有。</li>
                      <li>・ <span className="font-bold text-gray-600">開源致敬：</span>本軟體衍生自 @prompt_case 之 Nano Banana Infinite Canvas，並獲授權重製發佈。</li>
                      <li>・ <span className="font-bold text-gray-600">生成內容：</span>AI 生成內容之權利歸屬依各國法律及 Google 條款判定，商用前請諮詢法律意見。</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-yohaku-text-main text-sm mb-1">5. 禁止事項</h3>
                    <p className="leading-relaxed text-gray-600 text-xs">嚴禁利用本軟體進行違法、色情、歧視或侵害他人權利之行為，禁止對本軟體進行惡意逆向工程或系統攻擊。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-yohaku-text-main text-sm mb-1">6. 準據法與管轄權</h3>
                    <p className="leading-relaxed text-gray-600 text-xs">本條款之解釋與適用，以日本國法律為準。因本服務產生之爭議，雙方合意以東京地方裁判所為第一審專屬合意管轄法院。</p>
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
