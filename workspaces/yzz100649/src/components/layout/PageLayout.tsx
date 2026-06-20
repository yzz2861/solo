import type { ReactNode } from 'react';
import { AppHeader } from './AppHeader';

export function PageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <AppHeader />
      <main className="flex-1 w-full">{children}</main>
      <footer className="border-t border-slate-100 bg-white/60 backdrop-blur-sm">
        <div className="max-w-[1440px] mx-auto px-6 py-5 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} 医学科普稿事实核对系统 · 本系统仅供内容编辑与医生协作审核使用，标注结果由编辑人工确认后生效
        </div>
      </footer>
    </div>
  );
}
