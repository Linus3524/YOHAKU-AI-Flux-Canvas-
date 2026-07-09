import React, { useState } from 'react';

export const CollapsibleSection: React.FC<{
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="py-4 border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between mb-4 cursor-pointer group"
      >
        <h3 className="text-[11px] font-bold text-gray-400 tracking-widest uppercase">{title}</h3>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`text-gray-400 group-hover:text-gray-600 transition-transform duration-200 ${open ? '' : 'rotate-180'}`}
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
      {open && <div className="space-y-4">{children}</div>}
    </div>
  );
};
