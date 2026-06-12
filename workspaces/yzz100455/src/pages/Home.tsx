import { useState } from 'react';
import { Save, GitCompare, Menu, X } from 'lucide-react';
import { usePlanStore } from '@/store';
import ParamsForm from '@/components/calculator/ParamsForm';
import ResultCard from '@/components/calculator/ResultCard';
import ReportView from '@/components/calculator/ReportView';
import WarningBubble from '@/components/calculator/WarningBubble';
import SavePlanModal from '@/components/plans/SavePlanModal';
import PlanList from '@/components/plans/PlanList';
import { Link } from 'react-router-dom';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { plans } = usePlanStore();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-lg border-b border-slate-200/50">
        <div className="container max-w-7xl h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ice-400 to-ice-600 flex items-center justify-center shadow-md shadow-ice-500/20">
                <span className="text-white text-lg">❄️</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800 leading-tight">
                  空调冷负荷粗算器
                </h1>
                <p className="text-xs text-slate-500 hidden sm:block">
                  快速估算，科学选型
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary text-sm flex items-center gap-1.5"
            >
              <Save size={16} />
              <span className="hidden sm:inline">保存方案</span>
              <span className="sm:hidden">保存</span>
            </button>
            <Link
              to="/compare"
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <GitCompare size={16} />
              <span className="hidden sm:inline">方案对比</span>
              <span className="sm:hidden">对比</span>
              {plans.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 text-xs bg-ice-100 text-ice-700 rounded-full">
                  {plans.length}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl py-6 lg:py-8">
        <div className="flex gap-6">
          <aside
            className={`fixed lg:static inset-y-0 left-0 z-30 w-72 bg-white/90 backdrop-blur-lg lg:bg-transparent lg:backdrop-blur-none border-r lg:border-r-0 border-slate-200 pt-20 lg:pt-0 p-4 lg:p-0 transform transition-transform duration-300 lg:transform-none ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}
          >
            <div className="card p-5">
              <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <span className="text-lg">📁</span>
                我的方案
              </h2>
              <PlanList onApply={() => setIsSidebarOpen(false)} />
            </div>
          </aside>

          {isSidebarOpen && (
            <div
              className="fixed inset-0 z-20 bg-black/30 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          <div className="flex-1 min-w-0">
            <div className="mb-5">
              <WarningBubble />
            </div>

            <div className="grid lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2">
                <div className="card p-6">
                  <h2 className="text-xl font-bold text-slate-800 mb-6">参数设置</h2>
                  <ParamsForm />
                </div>
              </div>

              <div className="lg:col-span-3 space-y-6">
                <div className="card p-6">
                  <h2 className="text-xl font-bold text-slate-800 mb-4">计算结果</h2>
                  <ResultCard />
                </div>

                <div className="card p-6">
                  <ReportView />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SavePlanModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
