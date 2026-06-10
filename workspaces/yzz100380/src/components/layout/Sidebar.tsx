import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Music,
  FileText,
  CalendarCheck,
  Calendar,
  Megaphone,
  Download,
  User,
  ChevronLeft,
  ChevronRight,
  Music2,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: '总览', icon: LayoutDashboard },
  { path: '/members', label: '成员管理', icon: Users },
  { path: '/sections', label: '声部管理', icon: Music2 },
  { path: '/sheets', label: '曲谱管理', icon: FileText },
  { path: '/practice', label: '练习进度', icon: Music },
  { path: '/attendance', label: '出勤记录', icon: CalendarCheck },
  { path: '/performances', label: '演出曲目', icon: Megaphone },
  { path: '/export', label: '排练单导出', icon: Download },
  { path: '/member-view', label: '成员视图', icon: User },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, viewMode, setViewMode } = useAppStore();

  return (
    <aside
      className={cn(
        'h-screen bg-wood-800 text-wood-100 flex flex-col transition-all duration-300 shadow-wood-lg',
        sidebarCollapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className="p-4 border-b border-wood-700 flex items-center justify-between">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gold-400 rounded-lg flex items-center justify-center">
              <Music className="w-5 h-5 text-wood-800" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-gold-300 text-sm leading-tight">口琴社</h1>
              <p className="text-xs text-wood-300">曲谱练习柜</p>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="w-full flex justify-center">
            <div className="w-8 h-8 bg-gold-400 rounded-lg flex items-center justify-center">
              <Music className="w-5 h-5 text-wood-800" />
            </div>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1 rounded hover:bg-wood-700 transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    'hover:bg-wood-700/50 hover:text-gold-300',
                    isActive
                      ? 'bg-wood-700 text-gold-400 shadow-inner-wood'
                      : 'text-wood-200',
                    sidebarCollapsed && 'justify-center px-2'
                  )
                }
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {!sidebarCollapsed && (
        <div className="p-4 border-t border-wood-700">
          <div className="text-xs text-wood-400 mb-2">视图模式</div>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('leader')}
              className={cn(
                'flex-1 px-2 py-1.5 text-xs rounded transition-colors',
                viewMode === 'leader'
                  ? 'bg-gold-500 text-wood-900 font-medium'
                  : 'bg-wood-700 text-wood-200 hover:bg-wood-600'
              )}
            >
              社长
            </button>
            <button
              onClick={() => setViewMode('member')}
              className={cn(
                'flex-1 px-2 py-1.5 text-xs rounded transition-colors',
                viewMode === 'member'
                  ? 'bg-gold-500 text-wood-900 font-medium'
                  : 'bg-wood-700 text-wood-200 hover:bg-wood-600'
              )}
            >
              成员
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
