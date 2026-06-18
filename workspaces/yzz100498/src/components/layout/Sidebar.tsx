import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BarChart3, 
  ChefHat, 
  TrendingUp, 
  UtensilsCrossed, 
  FileUp, 
  Settings as SettingsIcon 
} from 'lucide-react';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import { cn } from '../../lib/utils';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { access } = useRoleAccess();
  
  const menuItems = [
    { path: '/', label: '综合驾驶舱', icon: LayoutDashboard, permission: 'canViewDashboard' },
    { path: '/sales', label: '销量分析', icon: BarChart3, permission: 'canViewSalesAnalysis' },
    { path: '/preparation', label: '备餐建议', icon: ChefHat, permission: 'canViewPreparation' },
    { path: '/forecast', label: '预测分析', icon: TrendingUp, permission: 'canViewForecast' },
    { path: '/special-meals', label: '特殊餐管理', icon: UtensilsCrossed, permission: 'canViewSpecialMeals' },
    { path: '/data-import', label: '数据导入', icon: FileUp, permission: 'canViewDataImport' },
    { path: '/settings', label: '系统设置', icon: SettingsIcon, permission: 'canViewSettings' },
  ] as const;
  
  const visibleItems = menuItems.filter(item => 
    access[item.permission as keyof typeof access]
  );
  
  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 min-h-[calc(100vh-4rem)] p-4">
      <nav className="space-y-1">
        {visibleItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                isActive 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">今日日期</h4>
        <p className="text-lg font-bold text-blue-900">2026年6月18日</p>
        <p className="text-xs text-blue-600 mt-1">星期四</p>
        <div className="mt-3 pt-3 border-t border-blue-200">
          <p className="text-xs text-blue-600">
            🎉 今日医院周年庆，影响因子 0.9
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
