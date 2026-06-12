import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Droplets,
  LayoutDashboard,
  Upload,
  MapPin,
  FileText,
  RotateCcw,
  FlaskConical,
  DatabaseZap,
} from 'lucide-react';
import { useWellStore } from '@/store/useWellStore';
import { RISK_LABEL } from '@/types/well';
import { clsx } from 'clsx';

function AppLayout() {
  const navigate = useNavigate();
  const { mergeStats, isMockLoaded, loadMockData, clearAll, hydrateFromStorage } = useWellStore();

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  return (
    <div className="min-h-screen bg-paper flex">
      <aside className="w-60 shrink-0 bg-gradient-to-b from-primary-800 to-primary-900 text-white flex flex-col">
        <div className="px-5 py-5 border-b border-primary-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500 flex items-center justify-center shadow-lg">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold leading-tight">
                乡村井水化验图
              </h1>
              <p className="text-xs text-primary-200 mt-0.5">
                雨季水质监测管理系统
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <div className="text-[11px] uppercase tracking-wider text-primary-300 px-3 mb-2 font-semibold">
            卫生员工作台
          </div>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              clsx('nav-link text-primary-100 hover:bg-primary-700/40 hover:text-white', {
                'nav-link-active': isActive,
              })
            }
          >
            <Upload className="w-4 h-4" />
            数据导入
          </NavLink>
          <NavLink
            to="/mapping"
            className={({ isActive }) =>
              clsx('nav-link text-primary-100 hover:bg-primary-700/40 hover:text-white', {
                'nav-link-active': isActive,
              })
            }
          >
            <MapPin className="w-4 h-4" />
            井名映射
          </NavLink>
          <NavLink
            to="/overview"
            className={({ isActive }) =>
              clsx('nav-link text-primary-100 hover:bg-primary-700/40 hover:text-white', {
                'nav-link-active': isActive,
              })
            }
          >
            <LayoutDashboard className="w-4 h-4" />
            卫生院总览
          </NavLink>

          <div className="text-[11px] uppercase tracking-wider text-primary-300 px-3 mt-6 mb-2 font-semibold">
            报告视图
          </div>
          <NavLink
            to="/village/all"
            className={({ isActive }) =>
              clsx('nav-link text-primary-100 hover:bg-primary-700/40 hover:text-white', {
                'nav-link-active': isActive,
              })
            }
          >
            <FileText className="w-4 h-4" />
            村级报告
          </NavLink>
        </nav>

        <div className="px-4 py-4 border-t border-primary-700/50 space-y-3">
          {mergeStats && (
            <div className="bg-primary-700/30 rounded-lg p-3 space-y-1.5">
              <div className="text-xs text-primary-200 mb-1.5 flex items-center gap-1">
                <DatabaseZap className="w-3.5 h-3.5" />
                合并概况
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="text-danger-400 font-bold">
                    {mergeStats.stopCount}
                  </div>
                  <div className="text-primary-300">
                    {RISK_LABEL.STOP}
                  </div>
                </div>
                <div>
                  <div className="text-warn-400 font-bold">
                    {mergeStats.retestCount}
                  </div>
                  <div className="text-primary-300">
                    {RISK_LABEL.RETEST}
                  </div>
                </div>
                <div>
                  <div className="text-safe-400 font-bold">
                    {mergeStats.observeCount}
                  </div>
                  <div className="text-primary-300">
                    {RISK_LABEL.OBSERVE}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {!isMockLoaded && (
              <button
                onClick={() => {
                  loadMockData();
                  setTimeout(() => navigate('/overview'), 300);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-warn-500/90 hover:bg-warn-500 text-white rounded-md text-sm font-medium transition-colors"
              >
                <FlaskConical className="w-4 h-4" />
                加载演示数据
              </button>
            )}
            {isMockLoaded && (
              <button
                onClick={() => {
                  clearAll();
                  navigate('/');
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary-700/50 hover:bg-primary-700/70 text-primary-100 rounded-md text-sm font-medium transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                清空重新导入
              </button>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 bg-white/80 backdrop-blur border-b border-primary-100 flex items-center px-6 justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2 text-sm text-primary-600">
            <Droplets className="w-4 h-4 text-primary-500" />
            <span>乡镇卫生院 · 水井水质监测中心</span>
            <span className="text-primary-300 mx-2">|</span>
            <span className="text-primary-500 font-medium">
              雨季专项检测
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-primary-500">
              数据截止：
              <span className="text-primary-700 font-medium">
                2026 年 6 月 12 日
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-semibold">
              卫
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AppLayout;
