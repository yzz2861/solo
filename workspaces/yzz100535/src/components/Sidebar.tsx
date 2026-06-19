import { NavLink } from 'react-router-dom';
import {
  Home,
  Users,
  Upload,
  Eye,
  Trophy,
  Download,
  Camera,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  eventId: string | undefined;
}

const baseNavItems = [
  { label: '首页', icon: Home, to: '/' },
];

const eventNavItems = [
  { label: '评委管理', icon: Users, to: (id: string) => `/event/${id}` },
  { label: '作品导入', icon: Upload, to: (id: string) => `/event/${id}?tab=import` },
  { label: '现场评片', icon: Eye, to: (id: string) => `/event/${id}/review` },
  { label: '揭晓排名', icon: Trophy, to: (id: string) => `/event/${id}/reveal` },
  { label: '导出中心', icon: Download, to: (id: string) => `/event/${id}/export` },
];

export default function Sidebar({ isOpen, onToggle, eventId }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-screen flex-col bg-dark-600 transition-[width] duration-300 ease-in-out',
        isOpen ? 'w-60' : 'w-16',
      )}
    >
      <div className="flex h-14 items-center gap-2 px-4">
        <Camera className="h-6 w-6 shrink-0 text-gold-500" />
        {isOpen && (
          <span className="font-display text-lg font-bold text-gold-500 whitespace-nowrap">
            评片台
          </span>
        )}
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-2">
        {baseNavItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-l-2 border-gold-500 bg-gold-500/10 text-gold-500'
                  : 'text-dark-200 hover:bg-dark-400',
                !isOpen && 'justify-center px-0',
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {isOpen && <span>{item.label}</span>}
          </NavLink>
        ))}

        {eventId && isOpen && (
          <div className="pt-4">
            <div className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-dark-300">
              当前赛事
            </div>
            {eventNavItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to(eventId)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-l-2 border-gold-500 bg-gold-500/10 text-gold-500'
                      : 'text-dark-200 hover:bg-dark-400',
                  )
                }
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      <button
        onClick={onToggle}
        className="flex h-10 items-center justify-center text-dark-200 transition-colors hover:text-dark-50"
      >
        {isOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
      </button>
    </aside>
  );
}
