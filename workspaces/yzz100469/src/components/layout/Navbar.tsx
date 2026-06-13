import { Link, useLocation } from 'react-router-dom';
import { FileText, Search, BarChart3, ShieldCheck } from 'lucide-react';

const navItems = [
  { to: '/', label: '纪要导入', icon: FileText },
  { to: '/hr-dashboard', label: 'HR抽查', icon: BarChart3 },
];

export function Navbar() {
  const location = useLocation();
  const isAnalyzePage = location.pathname.startsWith('/analyze');
  const isConfirmPage = location.pathname.startsWith('/confirm');
  const showBack = isAnalyzePage || isConfirmPage;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/40 bg-white/60 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            {showBack ? (
              <Link to="/" className="btn-ghost !p-2 -ml-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
              </Link>
            ) : null}
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-700 to-brand-900 text-white shadow-soft">
                <ShieldCheck size={20} strokeWidth={2.2} />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-display text-xl font-semibold text-brand-900 -mt-0.5">
                  面试纪要偏差助手
                </span>
                <span className="text-[11px] text-neutral-500 -mt-0.5">
                  Interview Bias Assistant
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive =
                (item.to === '/' && (location.pathname === '/' || isAnalyzePage || isConfirmPage)) ||
                (item.to !== '/' && location.pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-50 text-brand-800 shadow-soft'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800'
                  }`}
                >
                  <Icon size={16} strokeWidth={2} />
                  {item.label}
                </Link>
              );
            })}
            <div className="ml-2 flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 shadow-soft">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-semibold text-white">
                招
              </div>
              <span className="text-sm font-medium text-neutral-700">招聘负责人</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
