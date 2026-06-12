import { NavLink } from 'react-router-dom';
import {
  Map,
  Database,
  AlertTriangle,
  FileText,
  History,
  Settings,
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: '热力图总览', icon: Map },
  { path: '/data', label: '数据管理', icon: Database },
  { path: '/anomaly', label: '异常分析', icon: AlertTriangle },
  { path: '/reports', label: '报告导出', icon: FileText },
  { path: '/history', label: '历史回看', icon: History },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-navy-900 text-white flex flex-col h-full">
      <div className="p-6 border-b border-navy-700">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Map className="w-7 h-7 text-primary-400" />
          <span className="gradient-text">公厕保洁热力图</span>
        </h1>
        <p className="text-xs text-navy-400 mt-1">城市公厕智能管理系统</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/30'
                    : 'text-navy-300 hover:bg-navy-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-navy-700">
        <button className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-navy-300 hover:bg-navy-800 hover:text-white transition-all">
          <Settings className="w-5 h-5" />
          <span className="font-medium">系统设置</span>
        </button>
      </div>

      <div className="p-4 border-t border-navy-700">
        <div className="bg-navy-800 rounded-lg p-3">
          <p className="text-xs text-navy-400 mb-2">今日概况</p>
          <div className="flex justify-between text-sm">
            <span className="text-navy-300">在线设备</span>
            <span className="text-green-400 font-semibold">45/48</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-navy-300">异常点位</span>
            <span className="text-orange-400 font-semibold">7</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
