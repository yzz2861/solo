import { Link, useLocation } from 'react-router-dom';
import { BookOpen, LayoutGrid, LineChart, BarChart3, LogIn, LogOut, User } from 'lucide-react';
import { useAppStore } from '@/stores/app';
import { cn } from '@/lib/utils';
import { deriveStudentId } from '@/utils';

const NAV_ITEMS = [
  { path: '/student', label: '学生预约台', icon: BookOpen, role: 'student' as const },
  { path: '/reception', label: '前台工作台', icon: LayoutGrid, role: 'reception' as const },
  { path: '/manager', label: '店长分析台', icon: LineChart, role: 'manager' as const },
  { path: '/owner', label: '老板仪表盘', icon: BarChart3, role: 'owner' as const },
];

const ROLE_LABEL: Record<string, string> = {
  student: '学生用户',
  reception: '前台',
  manager: '店长',
  owner: '老板',
};

export function AppHeader() {
  const location = useLocation();
  const currentUser = useAppStore((s) => s.currentUser);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const resetAll = useAppStore((s) => s.resetAll);

  const activePath = NAV_ITEMS.find((n) => location.pathname.startsWith(n.path))?.path ?? '/';

  const quickLogin = (role: 'student' | 'reception' | 'manager' | 'owner') => {
    const nameMap = { student: '张三', reception: '小林', manager: '王店长', owner: '陈老板' };
    const name = nameMap[role];
    const id = role === 'student' ? deriveStudentId(name) : `demo_${role}`;
    setCurrentUser({
      id,
      name,
      role,
      phone: role === 'student' ? '13800000001' : undefined,
    });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-6">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-ink-700 to-ink-500 text-amber-300 shadow-sm">
            <BookOpen size={20} />
          </div>
          <div>
            <div className="font-display text-lg font-semibold text-ink-800 leading-none">静读空间</div>
            <div className="text-[11px] text-ink-500 mt-1">自习室座位预约台</div>
          </div>
        </Link>

        <nav className="flex items-center gap-1 ml-4">
          <Link
            to="/"
            className={cn(
              'rounded-lg px-3.5 py-2 text-sm font-medium transition',
              activePath === '/' ? 'bg-ink-700 text-white' : 'text-ink-600 hover:bg-ink-50',
            )}
          >
            首页
          </Link>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activePath === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (!currentUser) quickLogin(item.role);
                }}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition',
                  active
                    ? 'bg-ink-700 text-white shadow-sm'
                    : 'text-ink-600 hover:bg-ink-50',
                )}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-1.5 text-sm">
                <User size={16} className="text-ink-500" />
                <span className="font-medium text-ink-700">{currentUser.name}</span>
                <span className="text-ink-400">·</span>
                <span className="text-ink-500">{ROLE_LABEL[currentUser.role]}</span>
              </div>
              <button
                onClick={() => setCurrentUser(null)}
                className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-sm text-ink-600 transition hover:border-ink-300 hover:bg-ink-50"
              >
                <LogOut size={14} />
                登出
              </button>
              <button
                onClick={() => {
                  if (confirm('确认重置所有模拟数据？此操作不可恢复。')) resetAll();
                }}
                className="rounded-lg border border-clay-200 bg-clay-50 px-3 py-1.5 text-sm text-clay-500 transition hover:bg-clay-100"
              >
                重置数据
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink-500">快速登录：</span>
              {(['student', 'reception', 'manager', 'owner'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => quickLogin(r)}
                  className="flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs text-ink-600 transition hover:border-ink-400 hover:bg-ink-50"
                >
                  <LogIn size={12} />
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
