import { NavLink, useNavigate } from 'react-router-dom';
import {
  ClipboardList, Search, LayoutDashboard, LogOut, PlusCircle,
  Smartphone, ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export default function Sidebar() {
  const { currentUser, logout } = useAuthStore();
  const nav = useNavigate();
  const isManager = currentUser?.role === 'manager';

  const linkCls = (act: boolean) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
      act ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    }`;

  return (
    <aside className="w-64 shrink-0 h-screen bg-white border-r border-slate-100 flex flex-col sticky top-0">
      <div className="px-5 py-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-soft text-white">
            <Smartphone size={22} />
          </div>
          <div>
            <div className="font-black text-slate-800 leading-tight">回收估价台</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Phone Recycle Desk</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <NavLink to="/register" className={({ isActive }) => linkCls(isActive)}>
          <PlusCircle size={18} />
          <span>新建回收单</span>
        </NavLink>
        <NavLink to="/list" className={({ isActive }) => linkCls(isActive)}>
          <ClipboardList size={18} />
          <span>回收列表</span>
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => linkCls(isActive)}>
          <Search size={18} />
          <span>序列号查询</span>
        </NavLink>
        {isManager && (
          <NavLink to="/dashboard" className={({ isActive }) => linkCls(isActive)}>
            <LayoutDashboard size={18} />
            <span>店长工作台</span>
          </NavLink>
        )}
      </nav>

      <div className="p-3 border-t border-slate-100 space-y-2">
        <div className="px-4 py-3 rounded-xl bg-slate-50">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
              isManager ? 'bg-warn-500' : 'bg-brand-500'
            }`}>
              {currentUser?.name?.[0] ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-800 truncate">{currentUser?.name}</div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <ShieldCheck size={11} />
                {isManager ? '店长' : '店员'} · {currentUser?.code}
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => { logout(); nav('/login'); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-danger-600 transition-all"
        >
          <LogOut size={18} />
          <span>切换账号</span>
        </button>
      </div>
    </aside>
  );
}
