import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  FileText,
  CheckSquare,
  Stethoscope,
  History,
  LogOut,
  Menu,
  X,
  Heart,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useSmsStore } from '../store/smsStore';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { currentUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { getStatistics } = useSmsStore();
  const stats = getStatistics();

  const nurseNavItems = [
    { path: '/nurse/import', label: '数据导入', icon: Upload, badge: null },
    { path: '/nurse/analysis', label: '智能分析', icon: FileText, badge: stats.total },
    { path: '/nurse/review', label: '审核确认', icon: CheckSquare, badge: stats.pending },
  ];

  const doctorNavItems = [
    { path: '/doctor/workspace', label: '待处理清单', icon: Stethoscope, badge: stats.confirmed },
    { path: '/doctor/history', label: '历史记录', icon: History, badge: null },
  ];

  const navItems = currentUser?.role === 'nurse' ? nurseNavItems : doctorNavItems;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="bg-white border-r border-slate-200 flex flex-col shadow-sm"
          >
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-slate-800 text-base">随访摘要系统</h1>
                  <p className="text-xs text-slate-500">医患短信智能管理</p>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-b border-slate-100">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">当前登录</p>
                <p className="font-medium text-slate-800 text-sm">{currentUser?.name}</p>
                <p className="text-xs text-blue-600">
                  {currentUser?.role === 'nurse' ? '护士' : '医生'} · {currentUser?.department}
                </p>
              </div>
            </div>

            <nav className="flex-1 p-3 overflow-y-auto">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider px-3 mb-2">
                功能导航
              </p>
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon
                      size={18}
                      className={isActive ? 'text-blue-600' : 'text-slate-400'}
                    />
                    <span className="flex-1 text-sm">{item.label}</span>
                    {item.badge !== null && item.badge > 0 && (
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          item.label === '审核确认' && stats.pending > 5
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            <div className="p-3 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all"
              >
                <LogOut size={18} />
                <span className="text-sm">退出登录</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div>
              <h2 className="font-semibold text-slate-800">
                {navItems.find((n) => n.path === location.pathname)?.label || '概览'}
              </h2>
              <p className="text-xs text-slate-500">
                {new Date().toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {stats.adverseReactions > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg animate-pulse">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm text-red-700 font-medium">
                  {stats.adverseReactions} 例疑似不良反应待处理
                </span>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};
