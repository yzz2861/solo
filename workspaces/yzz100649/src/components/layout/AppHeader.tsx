import { Shield, UserCog, Home, FileUp, ListChecks, ClipboardList, FileCheck, ArrowLeft } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAppStore } from '@/store/appStore';
import { Tag } from '@/components/common/Tag';

export function AppHeader() {
  const role = useAppStore((s) => s.role);
  const setRole = useAppStore((s) => s.setRole);
  const loc = useLocation();
  const nav = useNavigate();

  const showBack = !['/', '/editor/import', '/doctor/import'].includes(loc.pathname);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => nav(-1)}
              className="w-9 h-9 -ml-2 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition"
              aria-label="返回"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#3b5f99] flex items-center justify-center text-white shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold text-slate-800">
                医学科普稿事实核对
              </div>
              <div className="text-[11px] text-slate-500">
                Medical Content Review & Compliance
              </div>
            </div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {role === 'editor' ? (
            <>
              <NavItem to="/" icon={<Home className="w-4 h-4" />} label="工作台" exact />
              <NavItem to="/editor/import" icon={<FileUp className="w-4 h-4" />} label="导入稿件" />
            </>
          ) : (
            <>
              <NavItem to="/" icon={<Home className="w-4 h-4" />} label="工作台" exact />
              <NavItem to="/doctor/import" icon={<FileUp className="w-4 h-4" />} label="导入清单" />
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <div className="inline-flex p-0.5 rounded-xl bg-slate-100">
            <button
              onClick={() => setRole('editor')}
              className={clsx(
                'px-3 h-8 rounded-lg text-xs font-medium transition flex items-center gap-1.5',
                role === 'editor'
                  ? 'bg-white text-[#1e3a5f] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <UserCog className="w-3.5 h-3.5" />
              编辑
            </button>
            <button
              onClick={() => setRole('doctor')}
              className={clsx(
                'px-3 h-8 rounded-lg text-xs font-medium transition flex items-center gap-1.5',
                role === 'doctor'
                  ? 'bg-white text-[#1e3a5f] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Shield className="w-3.5 h-3.5" />
              医生
            </button>
          </div>
          <Tag className="bg-[#1e3a5f]/5 text-[#1e3a5f] border border-[#1e3a5f]/10">
            {role === 'editor' ? (
              <>
                <ClipboardList className="w-3 h-3" /> 编辑模式
              </>
            ) : (
              <>
                <FileCheck className="w-3 h-3" /> 审核模式
              </>
            )}
          </Tag>
        </div>
      </div>
    </header>
  );
}

function NavItem({ to, icon, label, exact = false }: { to: string; icon: React.ReactNode; label: string; exact?: boolean }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        clsx(
          'px-3 h-9 rounded-lg text-sm font-medium inline-flex items-center gap-2 transition',
          isActive
            ? 'bg-[#1e3a5f]/10 text-[#1e3a5f]'
            : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
