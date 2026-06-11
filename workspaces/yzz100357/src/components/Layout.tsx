import { Link, useParams, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { 
  Home, 
  Upload, 
  Search, 
  FileText, 
  Download, 
  ArrowLeft,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { cn } from '../lib/utils';
import { STATUS_LABELS } from '../../shared/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function Layout() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentProject } = useAppStore();

  const navItems = projectId ? [
    { path: `/project/${projectId}/import`, label: '材料导入', icon: Upload, key: 'import' },
    { path: `/project/${projectId}/analyze`, label: '智能识别', icon: Search, key: 'analyze' },
    { path: `/project/${projectId}/summary`, label: '申诉摘要', icon: FileText, key: 'summary' },
    { path: `/project/${projectId}/export`, label: '材料导出', icon: Download, key: 'export' },
  ] : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-100 text-slate-700';
      case 'analyzing': return 'bg-blue-100 text-blue-700';
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'exported': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const isDeadlineNear = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffHours = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours < 24;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        <div className="p-6 border-b border-slate-100">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-700 to-primary-900 flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg text-primary-900">差评申诉助手</h1>
              <p className="text-xs text-slate-500">商家维权利器</p>
            </div>
          </Link>
        </div>

        {currentProject && (
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary-700 mb-3 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              返回项目列表
            </button>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800 truncate">
                订单：{currentProject.orderNo}
              </p>
              <p className="text-xs text-slate-500 truncate">
                客户：{currentProject.customerName}
              </p>
              <div className="flex items-center gap-2">
                <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getStatusColor(currentProject.status))}>
                  {STATUS_LABELS[currentProject.status]}
                </span>
              </div>
              <div className={cn(
                'flex items-center gap-1.5 text-xs p-2 rounded',
                isDeadlineNear(currentProject.appealDeadline) ? 'bg-red-50 text-red-600 animate-pulse-soft' : 'text-slate-500'
              )}>
                <Clock className="w-3 h-3" />
                <span>
                  截止：{format(new Date(currentProject.appealDeadline), 'MM-dd HH:mm', { locale: zhCN })}
                </span>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            <li>
              <Link
                to="/"
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  'hover:bg-slate-100 text-slate-700',
                  !projectId && 'bg-primary-50 text-primary-700'
                )}
              >
                <Home className="w-4 h-4" />
                项目列表
              </Link>
            </li>
            {navItems.map((item) => (
              <li key={item.key}>
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    location.pathname.includes(item.key)
                      ? 'bg-primary-50 text-primary-700'
                      : 'hover:bg-slate-100 text-slate-700'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="text-xs text-slate-400 text-center">
            v1.0.0 · 本地数据存储
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="min-h-screen">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
