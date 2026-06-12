import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
  Music, 
  Users, 
  FileText, 
  Calendar, 
  Crown, 
  Wand2, 
  User,
  Bell,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { useCurrentRole, useUnreadAlertsCount, useStore } from '../store/useStore';
import { UserRole } from '../types';

const roleConfig: Record<UserRole, { label: string; icon: typeof Crown; color: string }> = {
  leader: { label: '团长', icon: Crown, color: 'text-burgundy-700 bg-burgundy-100' },
  conductor: { label: '指挥', icon: Wand2, color: 'text-gold-700 bg-gold-100' },
  member: { label: '成员', icon: User, color: 'text-blue-700 bg-blue-100' },
};

const navItems = [
  { path: '/', label: '仪表盘', icon: Music, roles: ['leader', 'conductor', 'member'] },
  { path: '/leave', label: '请假管理', icon: FileText, roles: ['leader', 'conductor', 'member'] },
  { path: '/members', label: '成员管理', icon: Users, roles: ['leader'] },
  { path: '/leader', label: '团长面板', icon: Crown, roles: ['leader'] },
  { path: '/conductor', label: '指挥面板', icon: Wand2, roles: ['conductor'] },
  { path: '/profile', label: '个人中心', icon: User, roles: ['member'] },
];

export const Layout = () => {
  const currentRole = useCurrentRole();
  const unreadCount = useUnreadAlertsCount();
  const setCurrentRole = useStore((state) => state.setCurrentRole);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(currentRole)
  );

  const RoleIcon = roleConfig[currentRole].icon;

  return (
    <div className="min-h-screen bg-pattern">
      {/* 顶部导航 */}
      <header className="no-print sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-burgundy-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-burgundy-700 rounded-xl">
                <Music className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold font-serif text-burgundy-900">
                  社区合唱团
                </h1>
                <p className="text-xs text-charcoal/50">请假管理系统</p>
              </div>
            </div>

            {/* 桌面端导航 */}
            <nav className="hidden md:flex items-center gap-1">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                        isActive
                          ? 'bg-burgundy-700 text-white shadow-md'
                          : 'text-charcoal/70 hover:bg-burgundy-50 hover:text-burgundy-700'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {item.path === '/' && unreadCount > 0 && (
                      <span className="w-5 h-5 flex items-center justify-center bg-red-500 text-white text-xs rounded-full animate-bounce-in">
                        {unreadCount}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* 角色切换 & 移动端菜单 */}
            <div className="flex items-center gap-3">
              {/* 角色切换 */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs text-charcoal/50">角色：</span>
                <div className="flex rounded-xl bg-burgundy-50 p-1">
                  {(Object.keys(roleConfig) as UserRole[]).map((role) => {
                    const config = roleConfig[role];
                    const Icon = config.icon;
                    return (
                      <button
                        key={role}
                        onClick={() => setCurrentRole(role)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                          currentRole === role
                            ? config.color + ' shadow-sm'
                            : 'text-charcoal/50 hover:text-charcoal'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 通知按钮 */}
              <button className="relative p-2 rounded-xl hover:bg-burgundy-50 transition-colors">
                <Bell className="w-5 h-5 text-charcoal/70" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-red-500 text-white text-xs rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* 移动端菜单按钮 */}
              <button
                className="md:hidden p-2 rounded-xl hover:bg-burgundy-50 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-charcoal" />
                ) : (
                  <Menu className="w-5 h-5 text-charcoal" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 移动端导航菜单 */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-burgundy-100 bg-white">
            <div className="px-4 py-3 space-y-1">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-burgundy-700 text-white'
                        : 'text-charcoal/70 hover:bg-burgundy-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
            {/* 移动端角色切换 */}
            <div className="px-4 py-3 border-t border-burgundy-100">
              <p className="text-xs text-charcoal/50 mb-2">切换角色：</p>
              <div className="flex gap-2">
                {(Object.keys(roleConfig) as UserRole[]).map((role) => {
                  const config = roleConfig[role];
                  const Icon = config.icon;
                  return (
                    <button
                      key={role}
                      onClick={() => setCurrentRole(role)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        currentRole === role
                          ? config.color
                          : 'bg-burgundy-50 text-charcoal/50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* 页脚 */}
      <footer className="no-print border-t border-burgundy-100 bg-white/50 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5 text-burgundy-700" />
              <span className="text-sm text-charcoal/60">
                社区合唱团请假管理系统 © {new Date().getFullYear()}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-charcoal/50">
              <span>数据自动保存到本地</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <RoleIcon className="w-3.5 h-3.5" />
                当前角色：{roleConfig[currentRole].label}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
