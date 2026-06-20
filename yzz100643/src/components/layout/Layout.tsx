import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  FileDigit, 
  AlertTriangle, 
  SearchCheck, 
  Download,
  Archive
} from 'lucide-react';
import StampBadge from '../ui/StampBadge';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', icon: Home, label: '项目首页' },
  { path: '/workspace', icon: FileDigit, label: '校对工作台' },
  { path: '/quality', icon: AlertTriangle, label: '质量检测' },
  { path: '/inspection', icon: SearchCheck, label: '抽检管理' },
  { path: '/export', icon: Download, label: '目录导出' }
];

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  
  return (
    <div className="min-h-screen bg-archive-50 flex">
      <aside className="w-60 bg-white border-r border-archive-100 flex flex-col">
        <div className="p-6 border-b border-archive-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-archive-950 rounded-lg flex items-center justify-center">
              <Archive className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-archive-900 text-base">
                档案OCR校对
              </h1>
              <p className="text-xs text-archive-500">数字化助手</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path));
              
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-all duration-200
                      ${isActive 
                        ? 'bg-archive-950 text-white shadow-md' 
                        : 'text-archive-600 hover:bg-archive-50 hover:text-archive-900'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-archive-100">
          <div className="bg-archive-50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <StampBadge status="approved" size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-archive-500 mb-1">当前状态</p>
                <p className="text-sm font-medium text-archive-800">系统运行正常</p>
                <p className="text-xs text-archive-500 mt-1">数据本地加密存储</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
      
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-archive-100 flex items-center justify-between px-6 shrink-0">
          <div>
            <h2 className="font-serif text-lg font-semibold text-archive-900">
              {navItems.find(n => location.pathname === n.path || 
                (n.path !== '/' && location.pathname.startsWith(n.path)))?.label || '档案OCR校对系统'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-archive-700">档案管理员</p>
              <p className="text-xs text-archive-500">本地登录</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-archive-200 flex items-center justify-center">
              <span className="font-serif font-medium text-archive-700">档</span>
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
