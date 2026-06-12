import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuthStore } from '../../store/useAuthStore';
import { Navigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { RefreshCw } from 'lucide-react';

const TITLES: Record<string, { title: string; desc: string }> = {
  '/register': { title: '回收登记台', desc: '录入机型信息 · 完成检测 · 议价入库' },
  '/list': { title: '回收记录列表', desc: '查看所有回收单 · 筛选搜索 · 详情抽屉' },
  '/search': { title: '序列号查重', desc: '输入序列号即时查询是否有历史回收' },
  '/dashboard': { title: '店长工作台', desc: '数据概览 · 报表导出 · 上架审核' },
};

export default function AppLayout() {
  const loc = useLocation();
  const { currentUser } = useAuthStore();
  if (!currentUser) return <Navigate to="/login" replace />;

  const key = Object.keys(TITLES).find((k) => loc.pathname.startsWith(k)) ?? '/register';
  const meta = TITLES[key];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-20 shrink-0 bg-white/70 backdrop-blur border-b border-slate-100 sticky top-0 z-20">
          <div className="h-full px-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">{meta.title}</h1>
              <p className="text-xs text-slate-500 mt-0.5">{meta.desc}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right leading-tight">
                <div className="text-xs text-slate-400">今日</div>
                <div className="font-mono font-bold text-slate-700 text-sm tabular-nums">
                  {dayjs().format('YYYY / MM / DD')}
                </div>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
                title="刷新页面"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
