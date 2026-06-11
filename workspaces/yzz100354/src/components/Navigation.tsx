import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Beaker, Upload, List, BarChart3, Database, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/import', label: '数据导入', icon: Upload },
  { path: '/batches', label: '批次管理', icon: List },
  { path: '/report', label: '风险报告', icon: BarChart3 },
  { path: '/knowledge', label: '知识库', icon: Database },
];

export const Navigation: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="bg-gradient-to-r from-amber-900 to-brand-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
              <Beaker className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold">发酵温控分析</h1>
              <p className="text-xs text-amber-200">Fermentation Temperature Control</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-white/20 text-white shadow-inner'
                      : 'text-amber-100 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
