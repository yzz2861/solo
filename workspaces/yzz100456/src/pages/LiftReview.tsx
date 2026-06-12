import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ListChecks, CheckCircle2, Circle, ChevronDown, ChevronRight, Gauge, Navigation, MapPin, AlertOctagon, CheckSquare, Square, Clock, Users } from 'lucide-react';
import { usePlanStore } from '@/hooks/usePlanStore';
import { useRiskEngine } from '@/hooks/useRiskEngine';
import type { LiftOperation } from '@/types';
import RiskCard from '@/components/common/RiskCard';

const REVIEW_CHECKLIST = [
  '核对吊车型号与支腿位置与方案一致',
  '确认支腿垫木/钢板规格与铺设范围',
  '确认起吊点吊具、吊索额定载荷',
  '检查落吊点承载能力与垫木布置',
  '确认回转范围内临时清场到位',
  '确认通道口监护人员到位',
  '核对风速低于方案限值（12m/s停工）',
  '试吊：离地 200~300mm 停留 3~5min 检查制动',
];

function OperationCard({
  op, index, active, setActive, risks, onToggleReviewed,
}: {
  op: LiftOperation;
  index: number;
  active: boolean;
  setActive: () => void;
  risks: ReturnType<typeof useRiskEngine>['operationRisks'][number]['risks'];
  onToggleReviewed: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [checks, setChecks] = useState<boolean[]>(() =>
    REVIEW_CHECKLIST.map(() => false)
  );
  const allChecked = checks.every(Boolean);
  const dangerCount = risks.filter(r => r.level === 'danger').length;
  const warningCount = risks.filter(r => r.level === 'warning').length;

  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  useEffect(() => {
    if (allChecked && !op.reviewed) onToggleReviewed();
    else if (!allChecked && op.reviewed) onToggleReviewed();
  }, [allChecked]); // eslint-disable-line

  return (
    <div className={`panel overflow-hidden transition-all ${active ? 'ring-2 ring-safety-orange/60' : ''}`}>
      <button
        onClick={() => { setActive(); setOpen(v => !v); }}
        className="w-full p-3 flex items-center gap-3 text-left hover:bg-dock-700/30 transition-colors"
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${
          op.reviewed
            ? 'bg-safety-green/15 border-safety-green/50 text-safety-green'
            : dangerCount > 0
              ? 'bg-safety-red/15 border-safety-red/50 text-safety-red animate-pulse-slow'
              : 'bg-dock-800 border-dock-700 text-slate-400'
        }`}>
          {op.reviewed
            ? <CheckCircle2 className="w-5 h-5" />
            : dangerCount > 0
              ? <AlertOctagon className="w-5 h-5" />
              : <Clock className="w-5 h-5" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">吊次 {op.liftNo}</span>
            <span className="text-[10px] text-slate-500 font-mono">#{index + 1}</span>
            {dangerCount > 0 && <span className="risk-danger">{dangerCount} 危险</span>}
            {warningCount > 0 && <span className="risk-warning">{warningCount} 警告</span>}
            {op.reviewed && <span className="risk-green">已复查</span>}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5 font-mono">
            <span className="flex items-center gap-1"><Gauge className="w-3 h-3" />{op.armLength}m</span>
            <span className="flex items-center gap-1"><Navigation className="w-3 h-3" />{op.startAngle}°~{op.endAngle}°</span>
          </div>
        </div>

        {open ? <ChevronDown className="w-5 h-5 text-slate-500 flex-shrink-0" /> : <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0" />}
      </button>

      {open && (
        <div className="p-3 pt-0 border-t border-dock-700/50 space-y-3 bg-dock-950/40">
          <div className="grid grid-cols-2 gap-2.5 pt-3">
            <div className="bg-dock-800/60 rounded p-2.5 border border-dock-700/60">
              <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3 text-safety-orange" />起吊点</div>
              <div className="text-sm font-mono text-white">
                ({op.liftPoint[0].toFixed(1)}, {op.liftPoint[2].toFixed(1)}, {op.liftPoint[1].toFixed(1)})
              </div>
            </div>
            <div className="bg-dock-800/60 rounded p-2.5 border border-dock-700/60">
              <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3 text-safety-green" />落吊点</div>
              <div className="text-sm font-mono text-white">
                ({op.dropPoint[0].toFixed(1)}, {op.dropPoint[2].toFixed(1)}, {op.dropPoint[1].toFixed(1)})
              </div>
            </div>
          </div>

          {risks.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5 text-safety-orange" />
                本吊次关联风险项（{risks.length}）
              </div>
              {risks.map(r => <RiskCard key={r.id} risk={r} compact />)}
            </div>
          )}

          <div className="pt-1 border-t border-dock-700/50">
            <div className="text-[11px] text-slate-400 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5 text-safety-yellow" />
                开工前复查清单 · {checks.filter(Boolean).length}/{REVIEW_CHECKLIST.length}
              </span>
              {op.reviewTime && (
                <span className="text-[10px] text-slate-500 font-mono">{op.reviewTime}</span>
              )}
            </div>
            <div className="space-y-1.5">
              {REVIEW_CHECKLIST.map((item, i) => (
                <label
                  key={i}
                  className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-all text-sm ${
                    checks[i]
                      ? 'bg-safety-green/8 border border-safety-green/25 text-slate-200'
                      : 'bg-dock-800/40 border border-dock-700/50 text-slate-300 hover:border-dock-600'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setChecks(c => c.map((v, j) => j === i ? !v : v))}
                    className="mt-0.5 flex-shrink-0"
                  >
                    {checks[i]
                      ? <CheckSquare className="w-4 h-4 text-safety-green" />
                      : <Square className="w-4 h-4 text-slate-500" />}
                  </button>
                  <span className="flex-1">{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LiftReview() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const plan = usePlanStore(s => s.currentPlan);
  const loadPlan = usePlanStore(s => s.loadPlan);
  const updateOperation = usePlanStore(s => s.updateOperation);
  const saveCurrentPlan = usePlanStore(s => s.saveCurrentPlan);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);

  const { operationRisks, summary, cargoTon } = useRiskEngine(
    plan.crane, plan.cargo, plan.zones, plan.operations, plan.windSpeed
  );

  useEffect(() => {
    if (planId) loadPlan(planId);
  }, [planId, loadPlan]);

  useEffect(() => {
    if (!activeId && plan.operations.length > 0) {
      setActiveId(plan.operations[0].id);
    }
  }, [plan.operations, activeId]);

  const toggleReviewed = (opId: string) => {
    const op = plan.operations.find(o => o.id === opId);
    updateOperation(opId, {
      reviewed: !(op?.reviewed),
      reviewTime: !(op?.reviewed)
        ? new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
        : undefined,
    });
  };

  const allReviewed = plan.operations.every(o => o.reviewed);

  const handleSave = async () => {
    await saveCurrentPlan();
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-dock-950 overflow-hidden">
      <header className="h-14 flex items-center px-6 bg-dock-900/95 backdrop-blur-md border-b border-dock-700/60 shadow-panel">
        <button onClick={() => navigate('/')} className="mr-3 text-slate-400 hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="text-[15px] font-bold text-white flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-safety-yellow" />吊次复查
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {plan.planNo} · {plan.name} · V{plan.version}
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-3 mr-4 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-safety-red/10 text-safety-red">
            <AlertOctagon className="w-3.5 h-3.5" />{summary.danger}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-safety-yellow/10 text-safety-yellow">
            <AlertOctagon className="w-3.5 h-3.5" />{summary.warning}
          </div>
          <div className="px-2.5 py-1 rounded-full bg-dock-800 border border-dock-700">
            货物 <b className="text-slate-200 font-mono">{cargoTon.toFixed(1)}t</b>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-dock-800 border border-dock-700">
            {plan.operations.filter(o => o.reviewed).length}/{plan.operations.length} 已复查
          </div>
        </div>
        <button
          onClick={() => navigate(`/handover/${plan.id}`)}
          className="btn-secondary mr-2"
          disabled={!allReviewed}
        >
          <Users className="w-4 h-4" /> 下一步交接班
        </button>
        <button onClick={handleSave} className="btn-primary animate-glow">
          {savedMsg ? '✓ 已保存复查状态' : '保存复查结果'}
        </button>
      </header>

      <div className="flex-1 min-h-0 flex">
        <div className="w-72 p-3 border-r border-dock-700/60 overflow-y-auto">
          <div className="text-[11px] text-slate-500 mb-2 uppercase tracking-wider">时间轴 · 吊次顺序</div>
          <div className="relative">
            {plan.operations.map((op, i) => (
              <div key={op.id} className="relative flex items-start gap-2.5 pb-4 last:pb-0">
                {i < plan.operations.length - 1 && (
                  <div className="absolute left-[13px] top-7 w-0.5 h-full bg-dock-700/70" />
                )}
                <button
                  onClick={() => setActiveId(op.id)}
                  className={`z-10 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                    activeId === op.id
                      ? 'bg-safety-orange border-safety-orange shadow-[0_0_0_4px_rgba(255,138,61,0.15)] scale-110'
                      : op.reviewed
                        ? 'bg-safety-green border-safety-green/60'
                        : 'bg-dock-800 border-dock-600 hover:border-dock-500'
                  }`}
                >
                  {op.reviewed
                    ? <CheckCircle2 className="w-4 h-4 text-dock-950" />
                    : <Circle className={`w-3 h-3 ${activeId === op.id ? 'text-dock-950' : 'text-slate-500'}`} />}
                </button>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className={`text-sm font-semibold truncate ${activeId === op.id ? 'text-safety-orange' : 'text-slate-200'}`}>
                    {op.liftNo}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">
                    {op.armLength}m · {op.startAngle}°→{op.endAngle}°
                  </div>
                  {!op.reviewed && (
                    <div className="text-[10px] text-safety-yellow mt-0.5">待复查</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {allReviewed && (
            <div className="mt-4 p-3 rounded-lg bg-safety-green/8 border border-safety-green/30">
              <div className="flex items-center gap-2 text-safety-green font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5" /> 全部吊次复查完成
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                可进入交接班页面确认全员阅读同一版本方案
              </div>
            </div>
          )}
        </div>

        <main className="flex-1 overflow-y-auto p-6 bg-dock-900/30">
          <div className="max-w-3xl mx-auto space-y-3">
            {plan.operations.map((op, i) => (
              <OperationCard
                key={op.id}
                op={op}
                index={i}
                active={op.id === activeId}
                setActive={() => setActiveId(op.id)}
                risks={operationRisks[i]?.risks ?? []}
                onToggleReviewed={() => toggleReviewed(op.id)}
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
