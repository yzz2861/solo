import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  CalendarCheck,
  Car,
  BarChart3,
  Handshake,
  User,
  LogOut,
  Menu,
  X,
  Building2,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/', label: '预约管理', icon: CalendarCheck, roles: ['reception', 'security'] as UserRole[] },
  { path: '/gate', label: '门岗放行', icon: Car, roles: ['reception', 'security'] as UserRole[] },
  { path: '/stats', label: '统计导出', icon: BarChart3, roles: ['reception'] as UserRole[] },
  { path: '/handover', label: '安保交接', icon: Handshake, roles: ['security'] as UserRole[] },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { currentUser, logout, setCurrentUser } = useStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('reception');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      alert('请输入您的姓名');
      return;
    }
    setCurrentUser({ name: userName.trim(), role: userRole });
    setShowLoginModal(false);
    setUserName('');
  };

  const filteredNavItems = navItems.filter((item) =>
    currentUser ? item.roles.includes(currentUser.role) : true
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
                <Building2 size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-primary-700">园区访客车位管理</h1>
                <p className="text-xs text-gray-400 hidden sm:block">Parking Management System</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                      isActive
                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>

            <div className="flex items-center gap-3">
              {currentUser ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-accent-400 to-accent-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                      {currentUser.name.charAt(0)}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-medium text-gray-700">{currentUser.name}</p>
                      <p className="text-xs text-gray-400">
                        {currentUser.role === 'reception' ? '前台行政' : '门岗安保'}
                      </p>
                    </div>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 animate-fade-in-up">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-700">{currentUser.name}</p>
                        <p className="text-xs text-gray-400">
                          {currentUser.role === 'reception' ? '前台行政' : '门岗安保'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut size={16} />
                        退出登录
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  <User size={18} />
                  <span className="hidden sm:inline">选择身份</span>
                </button>
              )}

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white animate-fade-in">
            <nav className="p-4 space-y-2">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-all ${
                      isActive
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {!currentUser && (
        <div className="bg-amber-50 border-b border-amber-200 py-3 text-center">
          <p className="text-sm text-amber-700">
            👋 请先选择您的身份以使用完整功能
          </p>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md animate-fade-in-up">
            <div className="bg-primary-500 text-white p-6 rounded-t-2xl">
              <h2 className="text-xl font-bold">选择身份</h2>
              <p className="text-primary-100 text-sm mt-1">请选择您的角色以继续</p>
            </div>

            <form onSubmit={handleLogin} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  您的姓名 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary-500 transition-colors focus:outline-none"
                    placeholder="请输入您的姓名"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  您的身份 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setUserRole('reception')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      userRole === 'reception'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${
                      userRole === 'reception' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                      <CalendarCheck size={20} />
                    </div>
                    <p className={`font-medium ${userRole === 'reception' ? 'text-primary-700' : 'text-gray-700'}`}>
                      前台行政
                    </p>
                    <p className="text-xs text-gray-400 mt-1">预约登记、统计导出</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUserRole('security')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      userRole === 'security'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${
                      userRole === 'security' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                      <Car size={20} />
                    </div>
                    <p className={`font-medium ${userRole === 'security' ? 'text-primary-700' : 'text-gray-700'}`}>
                      门岗安保
                    </p>
                    <p className="text-xs text-gray-400 mt-1">车辆放行、交接登记</p>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
              >
                进入系统
              </button>
            </form>
          </div>
        </div>
      )}

      {showUserMenu && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  );
}
