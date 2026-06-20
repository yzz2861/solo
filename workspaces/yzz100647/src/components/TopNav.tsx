import { NavLink, useNavigate } from 'react-router-dom';
import { FileUp, History, Plus, HelpCircle, FileText, Sparkles } from 'lucide-react';
import { useComplaintStore } from '@/store/complaintStore';

export default function TopNav() {
  const navigate = useNavigate();
  const createNew = useComplaintStore((s) => s.createNewComplaint);

  const handleNew = () => {
    createNew();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 gradient-brand shadow-card">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <h1 className="text-[17px] font-bold text-white tracking-wide">投诉附件自动命名系统</h1>
            <p className="text-[11px] text-brand-100/85">Complaint Attachment Rater · 智能识别 · 一键标准化</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white/20 text-white shadow-inner'
                  : 'text-brand-50 hover:bg-white/10'
              }`
            }
          >
            <FileUp className="h-4 w-4" />
            主工作台
          </NavLink>
          <NavLink
            to="/history"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white/20 text-white shadow-inner'
                  : 'text-brand-50 hover:bg-white/10'
              }`
            }
          >
            <History className="h-4 w-4" />
            历史记录
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={handleNew}
            className="group inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-amber-400 to-amber-500 px-3.5 py-2 text-sm font-semibold text-amber-950 shadow-card transition-all hover:shadow-lift hover:from-amber-300 active:translate-y-[1px]"
          >
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
            新建投诉单
          </button>
          <button className="hidden sm:inline-flex items-center justify-center rounded-lg p-2 text-brand-50 hover:bg-white/10 transition-colors" title="使用帮助">
            <HelpCircle className="h-4.5 w-4.5" />
          </button>
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-white/12 px-2.5 py-1.5 text-[11px] text-brand-50">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            v1.0
          </div>
        </div>
      </div>
    </header>
  );
}
