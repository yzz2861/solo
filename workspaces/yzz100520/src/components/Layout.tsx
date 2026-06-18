import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Droplets, Upload, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  path: string;
  icon: typeof Droplets;
}

const navItems: NavItem[] = [
  { label: '漏损总览', path: '/', icon: Droplets },
  { label: '数据导入', path: '/import', icon: Upload },
  { label: '设置', path: '/settings', icon: Settings },
];

const pageTitles: Record<string, string> = {
  '/': '漏损总览',
  '/import': '数据导入',
  '/settings': '设置',
};

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState(location.pathname);

  const currentPath = Object.keys(pageTitles).includes(location.pathname)
    ? location.pathname
    : '/';
  const pageTitle = pageTitles[currentPath] || '漏损总览';

  const handleNavClick = (path: string) => {
    setActiveNav(path);
    navigate(path);
  };

  return (
    <div className="flex h-screen w-full bg-ocean-50">
      <aside className="w-60 bg-ocean-700 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-ocean-600">
          <Droplets className="w-7 h-7 text-white mr-2" />
          <span className="text-white text-lg font-semibold">校园用水监测</span>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.path || location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  'w-full flex items-center px-6 py-3 text-left transition-colors',
                  isActive
                    ? 'bg-ocean-800 text-white border-r-2 border-aqua-400'
                    : 'text-ocean-100 hover:bg-ocean-600 hover:text-white'
                )}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-ocean-100 flex items-center justify-between px-6 shadow-sm">
          <h1 className="text-xl font-semibold text-ocean-800">{pageTitle}</h1>
          <div className="flex items-center">
            <span className="px-3 py-1.5 bg-ocean-50 text-ocean-700 text-sm rounded-md font-medium">
              后勤管理
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
