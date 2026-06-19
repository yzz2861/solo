import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  FileX,
  BarChart3,
  FileText,
  ClipboardList,
  Upload,
  LogOut,
  Store,
  PieChart,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getStoreTypeColor, getStoreTypeLabel } from '../../utils/formatters';

interface SidebarProps {
  role: 'manager' | 'supervisor' | 'staff';
}

const managerLinks = [
  { to: '/manager/dashboard', label: '数据仪表盘', icon: LayoutDashboard },
  { to: '/manager/analytics', label: '报损分析', icon: PieChart },
  { to: '/manager/order', label: '订货建议', icon: ShoppingCart },
  { to: '/manager/waste', label: '报损上报', icon: FileX },
  { to: '/data/import', label: '数据导入', icon: Upload },
];

const supervisorLinks = [
  { to: '/supervisor/dashboard', label: '门店总览', icon: LayoutDashboard },
  { to: '/supervisor/report', label: '督导报告', icon: FileText },
  { to: '/data/import', label: '数据导入', icon: Upload },
];

const staffLinks = [
  { to: '/staff/order', label: '明日订货', icon: ClipboardList },
  { to: '/manager/waste', label: '报损协助', icon: FileX },
  { to: '/data/import', label: '数据导入', icon: Upload },
];

export default function Sidebar({ role }: SidebarProps) {
  const navigate = useNavigate();
  const { state, dispatch, getCurrentStore } = useApp();
  const currentStore = getCurrentStore();

  const links = role === 'manager'
    ? managerLinks
    : role === 'supervisor'
    ? supervisorLinks
    : staffLinks;

  const handleLogout = () => {
    dispatch({ type: 'SET_USER_ROLE', payload: null });
    navigate('/');
  };

  const roleLabels: Record<string, string> = {
    manager: '店长视图',
    supervisor: '督导视图',
    staff: '店员视图',
  };

  return (
    <div className="w-64 bg-dark-800 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-dark-700">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg">鲜食报损图</h1>
            <p className="text-xs text-dark-400">{roleLabels[role]}</p>
          </div>
        </div>
      </div>

      {role !== 'supervisor' && currentStore && (
        <div className="px-4 py-4 border-b border-dark-700">
          <div className="text-xs text-dark-400 mb-1">当前门店</div>
          <div className="font-medium">{currentStore.name}</div>
          <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${getStoreTypeColor(currentStore.type)}`}>
            {getStoreTypeLabel(currentStore.type)}
          </span>
          {role === 'manager' && (
            <select
              value={state.currentStoreId}
              onChange={(e) => dispatch({ type: 'SET_CURRENT_STORE', payload: e.target.value })}
              className="mt-2 w-full bg-dark-700 text-white text-sm rounded-lg px-3 py-2 border border-dark-600 focus:outline-none focus:border-primary-500"
            >
              {state.stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {links.map(link => {
            const Icon = link.icon;
            return (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-primary-500/20 text-primary-400 font-medium'
                        : 'text-dark-300 hover:bg-dark-700 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  {link.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-dark-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-dark-300 hover:bg-dark-700 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          切换角色
        </button>
      </div>
    </div>
  );
}
