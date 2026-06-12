import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Anchor, Plus, FolderOpen, Trash2, FileDown, ListChecks, Users, FileText, Calendar, Wind, Truck, Package, AlertOctagon, CheckCircle2, Search } from 'lucide-react';
import { usePlanStore } from '@/hooks/usePlanStore';
import type { LiftPlan } from '@/types';
import { downloadBriefing, buildBriefingHTML } from '@/utils/exportHTML';
import { useRiskEngine } from '@/hooks/useRiskEngine';

function PlanCard({ plan, onOpen, onDelete, onExport, onReview, onHandover, onPreview }: {
  plan: LiftPlan;
  onOpen: () => void;
  onDelete: () => void;
  onExport: () => void;
  onReview: () => void;
  onHandover: () => void;
  onPreview: () => void;
}) {
  const { summary, operationRisks } = useRiskEngine(
    plan.crane, plan.cargo, plan.zones, plan.operations, plan.windSpeed
  );

  const totalRisks = summary.danger + summary.warning + summary.info + summary.notice;
  const reviewedCount = plan.operations.filter(o => o.reviewed).length;

  return (
    <div className="panel overflow-hidden group hover:border-safety-orange/50 transition-all">
      <div
        onClick={onOpen}
        className="cursor-pointer"
      >
        <div className="relative h-40 bg-gradient-to-br from-dock-800 to-dock-950 overflow-hidden">
          {plan.screenshot ? (
            <img src={plan.screenshot} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Anchor className="w-16 h-16 text-dock-600/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-dock-950 via-dock-950/40 to-transparent" />
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {plan.locked && (
              <span className="px-2 py-0.5 rounded bg-safety-red/90 text-[10px] text-dock-950 font-bold">已锁定</span>
            )}
            {summary.danger > 0 && (
              <span className="px-2 py-0.5 rounded bg-safety-red/80 text-[10px] text-white font-semibold flex items-center gap-1">
                <AlertOctagon className="w-3 h-3" /> {summary.danger} 危险
              </span>
            )}
            {summary.danger === 0 && summary.warning > 0 && (
              <span className="px-2 py-0.5 rounded bg-safety-yellow/80 text-[10px] text-dock-950 font-semibold">
                {summary.warning} 警告
              </span>
            )}
            {totalRisks === 0 && (
              <span className="px-2 py-0.5 rounded bg-safety-green/80 text-[10px] text-dock-950 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> 通过
              </span>
            )}
          </div>
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-dock-900/90 border border-dock-700 text-[10px] text-slate-300 font-mono">
            V{plan.version}
          </div>
          <div className="absolute bottom-2 left-3 right-3">
            <div className="text-sm font-bold text-white truncate">{plan.name}</div>
            <div className="text-[11px] text-slate-400 font-mono">{plan.planNo}</div>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-2 border-t border-dock-700/50">
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-1 text-slate-400">
            <Truck className="w-3 h-3 text-safety-orange" />
            <span className="truncate">{plan.crane.brand} {plan.crane.model}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <Package className="w-3 h-3 text-safety-blue" />
            <span className="truncate">{plan.cargo.weight}{plan.cargo.weightUnit === 'ton' ? 't' : 'kg'}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <ListChecks className="w-3 h-3 text-safety-yellow" />
            <span>{reviewedCount}/{plan.operations.length} 吊次复查</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <Wind className="w-3 h-3" />
            <span>{plan.windSpeed.toFixed(1)}m/s</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-slate-500 border-t border-dock-700/40 pt-2">
          <Calendar className="w-3 h-3" />
          {plan.createTime} · {plan.createUser}
        </div>

        <div className="grid grid-cols-3 gap-1 pt-1">
          <button
            onClick={(e) => { e.stopPropagation(); onReview(); }}
            className="px-2 py-1.5 rounded text-[11px] bg-dock-800 hover:bg-safety-yellow/15 hover:text-safety-yellow border border-dock-700 hover:border-safety-yellow/40 transition-all flex items-center justify-center gap-1"
          >
            <ListChecks className="w-3 h-3" />复查
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onHandover(); }}
            className="px-2 py-1.5 rounded text-[11px] bg-dock-800 hover:bg-safety-green/15 hover:text-safety-green border border-dock-700 hover:border-safety-green/40 transition-all flex items-center justify-center gap-1"
          >
            <Users className="w-3 h-3" />交接班
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(); }}
            className="px-2 py-1.5 rounded text-[11px] bg-dock-800 hover:bg-safety-blue/15 hover:text-safety-blue border border-dock-700 hover:border-safety-blue/40 transition-all flex items-center justify-center gap-1"
          >
            <FileText className="w-3 h-3" />预览
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="col-span-1 px-2 py-1.5 rounded text-[11px] btn-secondary justify-center"
          >
            <FolderOpen className="w-3 h-3" />打开
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onExport(); }}
            className="col-span-1 px-2 py-1.5 rounded text-[11px] bg-dock-800 hover:bg-dock-700 border border-dock-700 text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1"
          >
            <FileDown className="w-3 h-3" />交底
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`确认删除方案「${plan.name}」？此操作不可恢复。`)) onDelete();
            }}
            className="col-span-1 px-2 py-1.5 rounded text-[11px] bg-dock-800 hover:bg-safety-red/15 hover:text-safety-red border border-dock-700 hover:border-safety-red/40 transition-all flex items-center justify-center gap-1"
          >
            <Trash2 className="w-3 h-3" />删除
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PlanList() {
  const navigate = useNavigate();
  const plans = usePlanStore(s => s.plans);
  const loadPlansFromDB = usePlanStore(s => s.loadPlansFromDB);
  const loadPlan = usePlanStore(s => s.loadPlan);
  const deletePlan = usePlanStore(s => s.deletePlan);
  const newPlan = usePlanStore(s => s.newPlan);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'hasDanger' | 'locked' | 'unreviewed'>('all');

  useEffect(() => {
    loadPlansFromDB();
  }, [loadPlansFromDB]);

  const filtered = plans.filter(p => {
    const matchSearch = !search || p.name.includes(search) || p.planNo.toLowerCase().includes(search.toLowerCase());
    let matchFilter = true;
    if (filter === 'hasDanger') matchFilter = p.risks.some(r => r.level === 'danger');
    else if (filter === 'locked') matchFilter = p.locked;
    else if (filter === 'unreviewed') matchFilter = p.operations.some(o => !o.reviewed);
    return matchSearch && matchFilter;
  });

  const openAndGo = async (id: string) => {
    await loadPlan(id);
    navigate('/');
  };

  const goReview = async (id: string) => {
    await loadPlan(id);
    navigate(`/lifts/${id}`);
  };

  const goHandover = async (id: string) => {
    await loadPlan(id);
    navigate(`/handover/${id}`);
  };

  const goPreview = async (id: string) => {
    await loadPlan(id);
    navigate(`/preview/${id}`);
  };

  const exportPlan = async (p: LiftPlan) => {
    await loadPlan(p.id);
    const currentPlan = usePlanStore.getState().currentPlan;
    const { operationRisks } = useRiskEngine(
      currentPlan.crane, currentPlan.cargo, currentPlan.zones, currentPlan.operations, currentPlan.windSpeed
    );
    downloadBriefing(currentPlan, operationRisks);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-dock-950 overflow-hidden">
      <header className="h-14 flex items-center px-6 bg-dock-900/95 backdrop-blur-md border-b border-dock-700/60 shadow-panel">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="w-9 h-9 rounded-lg bg-gradient-to-br from-safety-orange to-safety-red flex items-center justify-center shadow-lg hover:scale-105 transition">
            <Anchor className="w-5 h-5 text-dock-950" />
          </button>
          <div>
            <div className="text-[15px] font-bold text-white">方案管理</div>
            <div className="text-[11px] text-slate-400">共 {plans.length} 个方案 · 本地 IndexedDB 存储</div>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索方案名/编号…"
              className="input-field pl-8 w-64"
            />
          </div>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as any)}
            className="input-field w-36 text-sm"
          >
            <option value="all">全部方案</option>
            <option value="hasDanger">含危险项</option>
            <option value="unreviewed">待复查</option>
            <option value="locked">已锁定</option>
          </select>
          <button
            onClick={() => { newPlan(); navigate('/'); }}
            className="btn-primary animate-glow shadow-lg"
          >
            <Plus className="w-4 h-4" /> 新建方案
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 py-20">
            <div className="w-20 h-20 rounded-2xl bg-dock-800/80 flex items-center justify-center mb-4">
              <FolderOpen className="w-10 h-10 text-dock-600" />
            </div>
            <div className="text-lg mb-1">{plans.length === 0 ? '还没有保存的方案' : '没有匹配的方案'}</div>
            <div className="text-sm text-slate-600 mb-4">{plans.length === 0 ? '返回主页保存第一个方案吧' : '试试调整筛选条件'}</div>
            {plans.length === 0 && (
              <button onClick={() => navigate('/')} className="btn-secondary">
                <Anchor className="w-4 h-4" /> 返回主页
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(p => (
              <PlanCard
                key={p.id}
                plan={p}
                onOpen={() => openAndGo(p.id)}
                onDelete={() => deletePlan(p.id)}
                onExport={() => exportPlan(p)}
                onReview={() => goReview(p.id)}
                onHandover={() => goHandover(p.id)}
                onPreview={() => goPreview(p.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
