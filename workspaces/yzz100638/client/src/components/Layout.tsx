import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  FileText,
  PlusCircle,
  Camera,
  BarChart3,
  BookOpen,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { cn, getConfidenceLabel } from '../utils';

interface SidebarItem {
  to: string;
  icon: React.ElementType;
  label: string;
  roles: string[];
  badge?: number;
}

interface NavItemContentProps {
  item: SidebarItem;
  collapsed: boolean;
  pathname: string;
}

function NavItemContent({ item, collapsed, pathname }: NavItemContentProps) {
  const isActive = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
  const Icon = item.icon;
  
  return (
    <>
      <Icon className={cn(
        "w-5 h-5 flex-shrink-0",
        isActive && "text-accent-400"
      )} />
      <AnimatePresence mode="wait">
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="text-sm font-medium whitespace-nowrap"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
      {item.badge && (
        <span className={cn(
          "ml-auto bg-accent-500 text-white text-xs font-bold px-2 py-0.5 rounded-full",
          collapsed && "absolute top-1 right-1"
        )}>
          {item.badge}
        </span>
      )}
    </>
  );
}

export default function Layout({ children }: { children?: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const surveyorNavItems: SidebarItem[] = [
    { to: '/', icon: Home, label: '首页', roles: ['surveyor', 'leader'] },
    { to: '/cases', icon: FileText, label: '我的案件', roles: ['surveyor', 'leader'] },
    { to: '/cases/new', icon: PlusCircle, label: '新建案件', roles: ['surveyor'] },
    { to: '/reshoot', icon: Camera, label: '补拍回填', roles: ['surveyor'] },
  ];

  const leaderNavItems: SidebarItem[] = [
    { to: '/leader', icon: BarChart3, label: '组长首页', roles: ['leader'] },
    { to: '/leader/low-confidence', icon: AlertTriangle, label: '低置信抽查', roles: ['leader'] },
    { to: '/training', icon: BookOpen, label: '培训中心', roles: ['leader'] },
    { to: '/training/library', icon: Users, label: '案例库', roles: ['leader'] },
  ];

  const navItems = user?.role === 'leader'
    ? [...surveyorNavItems, ...leaderNavItems]
    : surveyorNavItems;

  const filteredItems = navItems.filter(item =>
    user && item.roles.includes(user.role)
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 256 }}
        className="bg-primary-800 text-white flex flex-col shadow-xl relative z-10"
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-primary-700">
          <div className={cn(
            "flex items-center",
            collapsed ? "justify-center w-full" : "gap-3"
          )}>
            <div className="w-10 h-10 bg-accent-500 rounded-xl flex items-center justify-center font-bold text-lg">
              保
            </div>
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-col"
                >
                  <span className="font-semibold text-lg">车险查勘</span>
                  <span className="text-xs text-primary-200">智能补全系统</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {filteredItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative cursor-pointer",
                collapsed && "justify-center",
                isActive
                  ? "bg-primary-600 text-white shadow-md"
                  : "text-primary-100 hover:bg-primary-700 hover:text-white"
              )}
            >
              <NavItemContent
                item={item}
                collapsed={collapsed}
                pathname={location.pathname}
              />
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="h-12 flex items-center justify-center border-t border-primary-700 text-primary-200 hover:text-white hover:bg-primary-700 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
          <div>
            <h1 className="text-lg font-semibold text-gray-800">
              {getPageTitle(location.pathname, user?.role)}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-gray-800">{user.name}</div>
                  <div className="text-xs text-gray-500">
                    {user.role === 'leader' ? '查勘组长' : '查勘员'}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
              title="退出登录"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children || <Outlet />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function getPageTitle(pathname: string, role?: string): string {
  const titles: Record<string, string> = {
    '/': '首页概览',
    '/cases': '我的案件',
    '/cases/new': '新建案件',
    '/reshoot': '补拍回填',
    '/leader': '组长首页',
    '/leader/low-confidence': '低置信案件抽查',
    '/training': '培训中心',
    '/training/library': '培训案例库',
  };

  if (pathname.startsWith('/cases/') && pathname !== '/cases/new') {
    return '案件详情';
  }
  if (pathname.startsWith('/reshoot/')) {
    return '补拍详情';
  }
  if (pathname.startsWith('/training/') && pathname !== '/training/library') {
    return '培训详情';
  }

  return titles[pathname] || '车险查勘系统';
}
