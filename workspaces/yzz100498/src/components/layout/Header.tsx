import React from 'react';
import { Bell, Settings, User, ChevronDown } from 'lucide-react';
import { useUserStore } from '../../store/useUserStore';
import { useAlerts } from '../../hooks/useAlerts';
import { ROLE_LABELS, UserRole } from '../../types';
import { cn } from '../../lib/utils';

const Header: React.FC = () => {
  const { currentUser, switchRole } = useUserStore();
  const { unreadCount } = useAlerts();
  const [showRoleMenu, setShowRoleMenu] = React.useState(false);
  
  const roles: UserRole[] = ['logistics', 'canteen_manager', 'nurse_station', 'purchaser', 'nurse'];
  
  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">医</span>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-800">医院陪护餐销量分析系统</h1>
          <p className="text-xs text-gray-500">数据驱动 · 智能备餐 · 减少浪费</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <User className="w-4 h-4" />
            <span className="text-sm font-medium">{currentUser ? ROLE_LABELS[currentUser.role] : '未登录'}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          
          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <div className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wider">切换角色</div>
              {roles.map(role => (
                <button
                  key={role}
                  onClick={() => {
                    switchRole(role);
                    setShowRoleMenu(false);
                  }}
                  className={cn(
                    'w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors',
                    currentUser?.role === role ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  )}
                >
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
        
        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Header;
