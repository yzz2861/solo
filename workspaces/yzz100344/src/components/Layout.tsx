import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Upload, FileBarChart, Database, AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '核心看板', icon: LayoutDashboard },
    { path: '/import', label: '数据导入', icon: Upload },
    { path: '/report', label: '月报导出', icon: FileBarChart },
  ];

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col">
      <header className="bg-gradient-to-r from-primary-800 to-primary-700 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-serif font-semibold tracking-wide">物业投诉响应看板</h1>
                <p className="text-xs text-primary-200 mt-0.5">Property Complaint Response Dashboard</p>
              </div>
            </div>
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                      transition-all duration-200
                      ${isActive 
                        ? 'bg-white text-primary-800 shadow-md' 
                        : 'text-white/80 hover:bg-white/10 hover:text-white'}
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="flex items-center gap-2 text-sm text-primary-200">
              <AlertTriangle className="w-4 h-4 text-accent-300" />
              <span>数据截至: 2026年5月</span>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-6">
        {children}
      </main>
      <footer className="bg-warm-100 border-t border-warm-200 py-4 mt-8">
        <div className="max-w-[1600px] mx-auto px-6 text-center text-xs text-warm-500">
          © 2026 物业管理运营分析系统 · 为月度复盘会提供数据决策支持
        </div>
      </footer>
    </div>
  );
}
