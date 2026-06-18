import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardPlus,
  Bike,
  Users,
  FileBarChart,
  Battery,
  Crown,
  User,
} from 'lucide-react';
import { useAppStore } from '@/store/app';

const navItems = [
  { path: '/', label: '试骑看板', icon: LayoutDashboard },
  { path: '/register', label: '试骑登记', icon: ClipboardPlus },
  { path: '/vehicles', label: '车辆管理', icon: Bike },
  { path: '/customers', label: '客户档案', icon: Users },
  { path: '/reports', label: '报表中心', icon: FileBarChart, managerOnly: true },
];

interface Props {
  children: React.ReactNode;
}

export default function Layout({ children }: Props) {
  const location = useLocation();
  const { role, setRole, refreshKey } = useAppStore();
  const visibleItems = navItems.filter((i) => !i.managerOnly || role === 'manager');

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-60 bg-primary-500 text-white flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-primary-600 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent-500 flex items-center justify-center">
            <Battery size={20} />
          </div>
          <div>
            <div className="text-sm font-bold tracking-wide">试骑押金柜</div>
            <div className="text-xs text-primary-200">电动车门店版</div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${active ? 'nav-item-active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.managerOnly && (
                  <Crown size={14} className="ml-auto text-accent-500" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-primary-600 space-y-2">
          <div className="flex items-center gap-2 px-4 py-2 text-xs text-primary-200">
            <User size={14} />
            <span>当前角色</span>
          </div>
          <div className="grid grid-cols-2 gap-1 px-2">
            <button
              onClick={() => setRole('sales')}
              className={`py-1.5 text-xs rounded-md transition ${
                role === 'sales'
                  ? 'bg-white text-primary-500 font-semibold'
                  : 'bg-primary-600 text-primary-100 hover:bg-primary-400'
              }`}
            >
              销售
            </button>
            <button
              onClick={() => setRole('manager')}
              className={`py-1.5 text-xs rounded-md transition ${
                role === 'manager'
                  ? 'bg-white text-primary-500 font-semibold'
                  : 'bg-primary-600 text-primary-100 hover:bg-primary-400'
              }`}
            >
              店长
            </button>
          </div>
        </div>
      </aside>

      <main key={refreshKey} className="flex-1 overflow-auto">
        <div className="p-6 max-w-[1600px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
