import { useState } from 'react';
import { AlertOctagon, Filter, Download, CheckCircle2, Gauge, Ruler, Target, FileDown } from 'lucide-react';
import type { RiskItem, LiftPlan } from '@/types';
import type { OperationRisk } from '@/hooks/useRiskEngine';
import RiskCard from '../common/RiskCard';
import { downloadBriefing, buildBriefingHTML } from '@/utils/exportHTML';

interface Props {
  plan: LiftPlan;
  risks: RiskItem[];
  summary: Record<RiskItem['level'], number>;
  operationRisks: OperationRisk[];
  cargoTon: number;
  firstOpSafeRadius: number;
}

export default function RiskPanel({ plan, risks, summary, operationRisks, cargoTon, firstOpSafeRadius }: Props) {
  const [filter, setFilter] = useState<'all' | 'danger' | 'warning' | 'rest'>('all');
  const filtered = risks.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'danger') return r.level === 'danger';
    if (filter === 'warning') return r.level === 'warning';
    return r.level === 'info' || r.level === 'notice';
  });

  const maxR = Math.max(...operationRisks.map(o => o.maxSafeRadius), 0);
  const curR = Math.max(...operationRisks.map(o => o.currentRadius), 0);
  const util = maxR > 0 ? Math.min(100, (curR / maxR) * 100) : 0;

  const ratePct = operationRisks.length > 0
    ? Math.min(100, Math.round(cargoTon / (plan.crane.ratedCapacity || 1) * 100))
    : 0;

  return (
    <section className="panel flex flex-col h-full overflow-hidden">
      <div className="panel-header">
        <h2 className="panel-title">
          <AlertOctagon className="w-4 h-4" /> 风险检测与交底
        </h2>
        <button
          onClick={() => downloadBriefing(plan, operationRisks)}
          className="btn-secondary !py-1 !text-xs"
        >
          <FileDown className="w-3.5 h-3.5" /> 导出交底
        </button>
      </div>

      <div className="p-3 border-b border-dock-700/60 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-dock-950/60 rounded p-2">
            <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
              <Gauge className="w-3 h-3 text-safety-orange" /> 载荷率
            </div>
            <div className="text-xl font-bold font-mono" style={{ color: ratePct > 90 ? '#FF4757' : ratePct > 75 ? '#FFA502' : '#2ED573' }}>
              {ratePct}<span className="text-xs opacity-70 ml-0.5">%</span>
            </div>
            <div className="w-full h-1 rounded-full bg-dock-700 mt-1 overflow-hidden">
              <div className="h-full transition-all" style={{
                width: `${ratePct}%`,
                background: ratePct > 90 ? '#FF4757' : ratePct > 75 ? '#FFA502' : '#2ED573'
              }} />
            </div>
          </div>
          <div className="bg-dock-950/60 rounded p-2">
            <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
              <Ruler className="w-3 h-3 text-safety-blue" /> 安全半径
            </div>
            <div className="text-xl font-bold font-mono text-safety-blue">
              {firstOpSafeRadius.toFixed(1)}<span className="text-xs opacity-70 ml-0.5">m</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              {plan.cargo.weight}{plan.cargo.weightUnit === 'ton' ? 't' : 'kg'} @ {(operationRisks[0]?.risks.length ?? 0) > 0 ? '有风险' : '通过'}
            </div>
          </div>
          <div className="bg-dock-950/60 rounded p-2">
            <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
              <Target className="w-3 h-3 text-safety-yellow" /> 风险数
            </div>
            <div className="text-xl font-bold font-mono flex items-baseline gap-1">
              {summary.danger > 0 && <span className="text-safety-red">{summary.danger}<span className="text-xs">D</span></span>}
              {summary.warning > 0 && <span className="text-safety-yellow">{summary.warning}<span className="text-xs">W</span></span>}
              {(summary.info + summary.notice) > 0 && <span className="text-slate-400 text-sm">{summary.info + summary.notice}<span className="text-xs">I/N</span></span>}
              {risks.length === 0 && <span className="text-safety-green"><CheckCircle2 className="w-5 h-5 inline" />通过</span>}
            </div>
            <div className="w-full h-1 rounded-full bg-dock-700 mt-1 overflow-hidden flex">
              {summary.danger > 0 && <div className="bg-safety-red h-full" style={{ width: `${(summary.danger / Math.max(1, risks.length)) * 100}%` }} />}
              {summary.warning > 0 && <div className="bg-safety-yellow h-full" style={{ width: `${(summary.warning / Math.max(1, risks.length)) * 100}%` }} />}
              {(summary.info + summary.notice) > 0 && <div className="bg-slate-500 h-full" style={{ width: `${((summary.info + summary.notice) / Math.max(1, risks.length)) * 100}%` }} />}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          {(['all', 'danger', 'warning', 'rest'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 rounded border transition ${
                filter === f
                  ? 'border-safety-orange bg-safety-orange/10 text-safety-orange'
                  : 'border-dock-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {f === 'all' ? `全部 (${risks.length})` :
               f === 'danger' ? `危险 ${summary.danger}` :
               f === 'warning' ? `警告 ${summary.warning}` :
               `其他 ${summary.info + summary.notice}`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 py-10">
            <CheckCircle2 className="w-10 h-10 mb-2 text-safety-green/70" />
            <div className="text-sm">此类别下暂无风险项</div>
          </div>
        ) : (
          filtered.map(r => <RiskCard key={r.id} risk={r} />)
        )}
      </div>

      <div className="p-2.5 border-t border-dock-700/60 bg-dock-950/40">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => downloadBriefing(plan, operationRisks)}
            className="btn-secondary w-full justify-center"
          >
            <Download className="w-3.5 h-3.5" /> 导出HTML交底
          </button>
          <button
            onClick={() => {
              const w = window.open('', '_blank');
              if (w) {
                w.document.write(`<title>打印：${plan.planNo}</title>`);
                w.document.write(buildBriefingHTML(plan, operationRisks));
                w.document.close();
                setTimeout(() => w.print(), 800);
              }
            }}
            className="btn-primary w-full justify-center"
          >
            🖨 打印/存PDF
          </button>
        </div>
        <div className="mt-2 text-[11px] text-slate-500 text-center">
          班组长可将风险截图贴入作业票 · 交接班需全员确认同一版本
        </div>
      </div>
    </section>
  );
}
