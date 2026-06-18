import React from 'react';
import { Bell, Search, UserCircle2, Menu, RefreshCw, Download } from 'lucide-react';

interface TopbarProps {
  onToggleSidebar?: () => void;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Topbar({ onToggleSidebar, title, subtitle, actions }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 h-20 bg-white/70 backdrop-blur-xl border-b border-brand-100/60 px-8 flex items-center justify-between">
      <div className="flex items-center gap-5">
        <button
          onClick={onToggleSidebar}
          className="w-10 h-10 rounded-xl hover:bg-brand-50 flex items-center justify-center text-brand-500 transition lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-serif text-xl font-semibold text-brand-800 leading-tight animate-fade-in">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-brand-400 mt-0.5 animate-fade-in animate-stagger-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 bg-paper-50 rounded-xl px-3.5 py-2 w-64 border border-brand-100/60">
          <Search className="w-4 h-4 text-brand-400" />
          <input
            type="text"
            placeholder="搜索反馈、主题..."
            className="bg-transparent flex-1 text-sm text-brand-700 placeholder:text-brand-300 outline-none"
          />
          <kbd className="hidden lg:inline-flex text-[10px] text-brand-400 bg-white px-1.5 py-0.5 rounded-md border border-brand-100 font-mono">
            ⌘K
          </kbd>
        </div>

        {actions}

        <button className="w-10 h-10 rounded-xl hover:bg-brand-50 flex items-center justify-center text-brand-500 transition relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 animate-pulse-soft" />
        </button>

        <div className="flex items-center gap-2 pl-2 ml-1 border-l border-brand-100">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center text-white font-medium text-sm">
            王
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-medium text-brand-700 leading-tight">王老师</div>
            <div className="text-[11px] text-brand-400">信号与系统</div>
          </div>
        </div>
      </div>
    </header>
  );
}
