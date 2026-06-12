import React from 'react';
import { FileText, BarChart3, Download, Settings, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../common/Button';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', label: '首页', icon: <Home className="w-4 h-4" /> },
    { path: '/analysis', label: '聚类分析', icon: <BarChart3 className="w-4 h-4" /> },
    { path: '/export', label: '导出报告', icon: <Download className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-neutral-900 font-serif">
                问卷开放题归并
              </h1>
              <p className="text-xs text-neutral-500">智能主题聚类分析工具</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.path}
                  variant={isActive ? 'primary' : 'ghost'}
                  size="sm"
                  icon={item.icon}
                  onClick={() => navigate(item.path)}
                >
                  {item.label}
                </Button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={<Settings className="w-4 h-4" />}>
              设置
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
