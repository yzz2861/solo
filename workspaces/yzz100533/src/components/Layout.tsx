import { useLocation, useNavigate } from 'react-router-dom';
import { Flower2, BookOpen, BarChart3, GraduationCap } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';

const tabs = [
  { key: '/', label: '花园', icon: Flower2 },
  { key: '/guide', label: '图鉴', icon: BookOpen },
  { key: '/report', label: '报告', icon: BarChart3 },
  { key: '/teacher', label: '老师', icon: GraduationCap },
] as const;

const hideNavPaths = ['/plant'];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const playerName = useGameStore((s) => s.playerName);
  const currentDay = useGameStore((s) => s.currentDay);

  const shouldHideNav = hideNavPaths.some((p) => location.pathname.startsWith(p));

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">{children}</main>

      {!shouldHideNav && playerName && (
        <nav className="bottom-nav-safe fixed bottom-0 left-0 right-0 z-40 border-t border-[#4A7C59]/10 bg-white/95 backdrop-blur-lg">
          <div className="mx-auto flex max-w-2xl">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = location.pathname === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => navigate(tab.key)}
                  className={`group relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs transition-all duration-200 ${
                    isActive ? 'text-[#4A7C59]' : 'text-stone-400 hover:text-[#6BA37A]'
                  }`}
                >
                  {isActive && (
                    <span className="absolute -top-px left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-full bg-[#4A7C59]" />
                  )}
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}
                  />
                  <span className={isActive ? 'font-bold' : 'font-medium'}>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
