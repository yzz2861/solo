import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  UserGroupIcon,
  BriefcaseIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';

const navItems = [
  { path: '/', label: '仪表盘', icon: HomeIcon },
  { path: '/import', label: '聊天导入', icon: ArrowUpTrayIcon },
  { path: '/commitments', label: '承诺列表', icon: DocumentTextIcon },
  { path: '/approvals', label: '审批工作台', icon: CheckCircleIcon },
  { path: '/summary/customers', label: '客户汇总', icon: UserGroupIcon },
  { path: '/summary/opportunities', label: '机会汇总', icon: BriefcaseIcon },
  { path: '/delivery', label: '交付对接', icon: TruckIcon },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-primary-900 to-primary-800 text-white shadow-xl z-50">
      <div className="p-6 border-b border-primary-700">
        <h1 className="text-xl font-bold tracking-wide">
          <span className="text-2xl mr-2">📝</span>
          承诺提取系统
        </h1>
        <p className="text-primary-300 text-sm mt-1">客户聊天承诺管理</p>
      </div>

      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'text-primary-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-primary-700">
        <div className="bg-primary-800/50 rounded-lg p-3">
          <p className="text-xs text-primary-300">使用提示</p>
          <p className="text-xs text-primary-400 mt-1">
            导入聊天记录后系统将自动提取承诺，经主管审批后生效
          </p>
        </div>
      </div>
    </aside>
  );
}
