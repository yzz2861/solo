import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Anchor, FileText, Download, Printer, Users, ListChecks, Lock, Package, Truck, Wind, Calendar, User, Shield } from 'lucide-react';
import { usePlanStore } from '@/hooks/usePlanStore';
import { useRiskEngine } from '@/hooks/useRiskEngine';
import SceneCanvas from '@/components/scene/SceneCanvas';
import RiskCard from '@/components/common/RiskCard';
import { downloadBriefing, buildBriefingHTML } from '@/utils/exportHTML';
import RiskPanel from '@/components/panels/RiskPanel';

export default function PlanPreview() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const plan = usePlanStore(s => s.currentPlan);
  const loadPlan = usePlanStore(s => s.loadPlan);
  const [tab, setTab] = useState<'3d' | 'briefing'>('3d');

  const { allRisks, operationRisks, summary, cargoTon, firstOpSafeRadius } = useRiskEngine(
    plan.crane, plan.cargo, plan.zones, plan.operations, plan.windSpeed
  );

  useEffect(() => {
    if (planId) loadPlan(planId);
  }, [planId, loadPlan]);

  const hasDanger = summary.danger > 0;
  const reviewedCount = plan.operations.filter(o => o.reviewed).length;

  return (
    <div className="h-screen w-screen flex flex-col bg-dock-950 overflow-hidden">
      <header className="h-14 flex items-center px-6 bg-dock-900/95 backdrop-blur-md border-b border-dock-700/60 shadow-panel">
        <button onClick={() => navigate('/plans')} className="mr-3 text-slate-400 hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-safety-blue to-indigo-500 flex items-center justify-center shadow-lg">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-[15px] font-bold text-white flex items-center gap-2">
              只读预览
              {plan.locked && (
                <span className="px-2 py-0.5 rounded-full bg-safety-red/15 text-[10px] text-safety-red font-bold inline-flex items-center gap-1">
                  <Lock className="w-3 h-3" />已锁定 V{plan.version}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {plan.planNo} · {plan.name}
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2 mr-4">
          <button
            onClick={() => setTab('3d')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1.5 ${
              tab === '3d'
                ? 'bg-safety-orange/15 text-safety-orange border border-safety-orange/30'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Anchor className="w-3.5 h-3.5" /> 3D 视图
          </button>
          <button
            onClick={() => setTab('briefing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1.5 ${
              tab === 'briefing'
                ? 'bg-safety-orange/15 text-safety-orange border border-safety-orange/30'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> 交底文档
          </button>
        </div>

        <button
          onClick={() => navigate(`/lifts/${plan.id}`)}
          className="btn-secondary mr-2"
        >
          <ListChecks className="w-4 h-4" /> 吊次复查
        </button>
        <button
          onClick={() => navigate(`/handover/${plan.id}`)}
          className="btn-secondary mr-2"
        >
          <Users className="w-4 h-4" /> 交接班
        </button>
        <button
          onClick={() => {
            const w = window.open('', '_blank');
            if (w) {
              w.document.write(`<title>打印：${plan.planNo}</title>`);
              w.document.write(buildBriefingHTML(plan, operationRisks));
              w.document.close();
              setTimeout(() => w.print(), 600);
            }
          }}
          className="btn-secondary mr-2"
        >
          <Printer className="w-4 h-4" /> 打印
        </button>
        <button
          onClick={() => downloadBriefing(plan, operationRisks)}
          className="btn-primary animate-glow"
        >
          <Download className="w-4 h-4" /> 下载交底
        </button>
      </header>

      {tab === '3d' ? (
        <div className="flex-1 min-h-0 flex">
          <aside className="w-80 p-2 overflow-y-auto border-r border-dock-700/60 bg-dock-900/50">
            <div className="space-y-2.5">
              <div className="panel p-3 space-y-2">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                  <Shield className="w-3.5 h-3.5 text-safety-orange" /> 基本信息
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <User className="w-3 h-3" /> {plan.createUser}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Calendar className="w-3 h-3" /> {plan.createTime}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Wind className="w-3 h-3" /> 风速 <b className="text-slate-200 font-mono">{plan.windSpeed.toFixed(1)} m/s</b>
                </div>
              </div>

              <div className="panel p-3 space-y-2">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                  <Truck className="w-3.5 h-3.5 text-safety-orange" /> 吊车
                </h4>
                <div className="text-sm font-bold text-white">{plan.crane.brand} {plan.crane.model}</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-dock-800/50 rounded p-1.5">
                    <div className="text-slate-500">最大臂长</div>
                    <div className="text-slate-200 font-mono font-semibold">{plan.crane.maxArmLength} m</div>
                  </div>
                  <div className="bg-dock-800/50 rounded p-1.5">
                    <div className="text-slate-500">额定起重</div>
                    <div className="text-slate-200 font-mono font-semibold">{plan.crane.ratedCapacity} t</div>
                  </div>
                </div>
              </div>

              <div className="panel p-3 space-y-2">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                  <Package className="w-3.5 h-3.5 text-safety-blue" /> 货物
                </h4>
                <div className="text-sm font-bold text-white">{plan.cargo.name}</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-dock-800/50 rounded p-1.5">
                    <div className="text-slate-500">重量</div>
                    <div className="text-slate-200 font-mono font-semibold">{plan.cargo.weight} {plan.cargo.weightUnit === 'ton' ? 't' : 'kg'}</div>
                  </div>
                  <div className="bg-dock-800/50 rounded p-1.5">
                    <div className="text-slate-500">外形</div>
                    <div className="text-slate-200 font-mono font-semibold truncate">
                      {plan.cargo.length}×{plan.cargo.width}×{(plan.cargo.height ?? 3).toFixed(1)}m
                    </div>
                  </div>
                </div>
              </div>

              <div className="panel p-3 space-y-2">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                  <ListChecks className="w-3.5 h-3.5 text-safety-yellow" /> 吊次
                </h4>
                <div className="text-[11px] text-slate-400">
                  共 <b className="text-slate-200 font-mono">{plan.operations.length}</b> 吊次，
                  已复查 <b className="text-safety-green font-mono">{reviewedCount}</b>
                </div>
                <div className="space-y-1.5 mt-2">
                  {plan.operations.map((op, i) => (
                    <div key={op.id} className="bg-dock-800/40 rounded p-2 border border-dock-700/50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-mono text-slate-200">{op.liftNo}</span>
                        {op.reviewed ? <span className="text-[10px] text-safety-green">✓ 已复查</span> : <span className="text-[10px] text-safety-yellow">待复查</span>}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        臂 {op.armLength}m · {op.startAngle}°→{op.endAngle}°
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <main className="flex-1 relative min-w-0">
            <SceneCanvas
              plan={plan}
              operationRisks={operationRisks}
              activeOperationId={undefined}
              hasDanger={hasDanger}
            />
            <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-dock-900/80 backdrop-blur-md text-[11px] text-slate-300 border border-dock-700/60 pointer-events-none">
              只读预览模式 · 参数不可编辑
            </div>
          </main>

          <aside className="w-96 p-2 border-l border-dock-700/60 bg-dock-900/50 min-h-0">
            <RiskPanel
              plan={plan}
              risks={allRisks}
              summary={summary}
              operationRisks={operationRisks}
              cargoTon={cargoTon}
              firstOpSafeRadius={firstOpSafeRadius}
            />
          </aside>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <iframe
            title="briefing"
            srcDoc={buildBriefingHTML(plan, operationRisks)}
            className="w-full h-full border-0 bg-white"
          />
        </div>
      )}
    </div>
  );
}
