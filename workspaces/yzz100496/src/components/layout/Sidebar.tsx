import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  FilePlus, 
  List, 
  Bell, 
  Hotel, 
  Download,
  Settings,
  Users
} from 'lucide-react';
import { useStore } from '@/store/useStore';

const menuItems = [
  { path: '/dashboard', label: '工作台', icon: Home },
  { path: '/registration/new', label: '报名登记', icon: FilePlus },
  { path: '/registrations', label: '报名列表', icon: List },
  { path: '/reminders', label: '智能提醒', icon: Bell },
  { path: '/rooming', label: '分房分车', icon: Hotel },
  { path: '/export', label: '数据导出', icon: Download },
  { path: '/settings', label: '系统设置', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();
  const unreadCount = useStore((state) => 
    state.reminders.filter(r => !r.read).length
  );

  return (
    <aside className="w-64 bg-white border-r border-warm-100 h-screen flex flex-col sticky top-0">
      <div className="p-6 border-b border-warm-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white">
            <Users size={20} />
          </div>
          <div>
            <h1 className="font-bold text-warm-800 text-lg">亲子游合同台</h1>
            <p className="text-xs text-warm-500">报名管理系统</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
            (item.path !== '/' && location.pathname.startsWith(item.path));
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                isActive 
                  ? 'bg-primary-50 text-primary-700 font-medium' 
                  : 'text-warm-600 hover:bg-warm-50 hover:text-warm-800'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-primary-500' : 'text-warm-400 group-hover:text-warm-600'} />
              <span>{item.label}</span>
              {item.path === '/reminders' && unreadCount > 0 && (
                <span className="ml-auto bg-danger-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-warm-100">
        <div className="bg-warm-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
              管
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-warm-800 text-sm truncate">管理员</p>
              <p className="text-xs text-warm-500 truncate">admin@travel.com</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
