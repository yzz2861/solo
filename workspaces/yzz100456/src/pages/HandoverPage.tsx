import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, CheckCircle2, Clock, Lock, Unlock, FileText, Shield, UserCog, HardHat, CircleCheck, Eye, Download } from 'lucide-react';
import { usePlanStore } from '@/hooks/usePlanStore';
import { DEFAULT_CREW } from '@/utils/mockData';
import type { CrewMember } from '@/types';
import { buildBriefingHTML } from '@/utils/exportHTML';
import { useRiskEngine } from '@/hooks/useRiskEngine';

function Avatar({ name, role, size = 44 }: { name: string; role: string; size?: number }) {
  const colors = [
    'from-safety-orange to-safety-red',
    'from-safety-blue to-indigo-500',
    'from-safety-green to-emerald-500',
    'from-safety-yellow to-amber-600',
    'from-purple-500 to-fuchsia-500',
    'from-cyan-500 to-teal-500',
  ];
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const bg = colors[hash % colors.length];
  const initial = name.slice(0, 1);
  return (
    <div
      className={`rounded-full bg-gradient-to-br ${bg} flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initial}
    </div>
  );
}

function CrewRow({
  member, confirmed, confirmTime, onConfirm, disabled,
}: {
  member: CrewMember;
  confirmed: boolean;
  confirmTime?: string;
  onConfirm: () => void;
  disabled: boolean;
}) {
  const [isNew, setIsNew] = useState(false);

  const handleClick = () => {
    if (disabled || confirmed) return;
    setIsNew(true);
    onConfirm();
  };

  const roleIcon = (r: string) => {
    if (r.includes('安全')) return <Shield className="w-3.5 h-3.5" />;
    if (r.includes('班组') || r.includes('长')) return <UserCog className="w-3.5 h-3.5" />;
    if (r.includes('司机')) return <HardHat className="w-3.5 h-3.5" />;
    return <Users className="w-3.5 h-3.5" />;
  };

  return (
    <div
      onClick={handleClick}
      className={`p-3.5 rounded-xl flex items-center gap-3.5 border transition-all ${
        confirmed
          ? 'bg-safety-green/6 border-safety-green/35'
          : disabled
            ? 'bg-dock-800/40 border-dock-700/60 opacity-60'
            : 'bg-dock-800/60 border-dock-600 cursor-pointer hover:border-safety-orange/50 hover:bg-dock-800 group'
      }`}
    >
      <div className="relative">
        <Avatar name={member.userName} role={member.role} />
        {confirmed && (
          <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-safety-green flex items-center justify-center border-2 border-dock-900 ${isNew ? 'animate-bounce' : ''}`}>
            <CircleCheck className="w-3.5 h-3.5 text-dock-950" strokeWidth={3} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">{member.userName}</span>
          <span className="px-2 py-0.5 rounded-full bg-dock-700/70 text-[10px] text-slate-300 inline-flex items-center gap-1">
            {roleIcon(member.role)}
            {member.role}
          </span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
          ID: {member.userId}
          {confirmed && confirmTime && (
            <> · <Clock className="w-3 h-3 inline text-slate-500" /> {confirmTime}</>
          )}
        </div>
      </div>

      {confirmed ? (
        <span className="px-3 py-1.5 rounded-lg bg-safety-green/15 text-safety-green text-xs font-semibold inline-flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />已确认
        </span>
      ) : disabled ? (
        <span className="px-3 py-1.5 rounded-lg bg-dock-700/50 text-slate-500 text-xs">已锁定</span>
      ) : (
        <button
          className="px-3 py-1.5 rounded-lg btn-primary text-xs font-semibold inline-flex items-center gap-1 group-hover:scale-105 transition"
        >
          <Eye className="w-3.5 h-3.5" />我已阅读
        </button>
      )}
    </div>
  );
}

export default function HandoverPage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const plan = usePlanStore(s => s.currentPlan);
  const handover = usePlanStore(s => s.handover);
  const loadPlan = usePlanStore(s => s.loadPlan);
  const loadHandover = usePlanStore(s => s.loadHandover);
  const confirmHandover = usePlanStore(s => s.confirmHandover);
  const lockHandover = usePlanStore(s => s.lockHandover);
  const saveCurrentPlan = usePlanStore(s => s.saveCurrentPlan);
  const [sealVisible, setSealVisible] = useState(false);
  const [planSavedMsg, setPlanSavedMsg] = useState(false);

  const { operationRisks, summary } = useRiskEngine(
    plan.crane, plan.cargo, plan.zones, plan.operations, plan.windSpeed
  );

  useEffect(() => {
    if (planId) {
      loadPlan(planId);
    }
  }, [planId, loadPlan]);

  useEffect(() => {
    if (plan.id) {
      loadHandover(plan.id);
    }
  }, [plan.id, loadHandover]);

  const crew: CrewMember[] = DEFAULT_CREW;

  const confirmMap = new Map(
    (handover?.confirmations ?? []).map(c => [c.userId, c])
  );
  const confirmedCount = handover?.confirmations.length ?? 0;
  const allConfirmed = confirmedCount >= crew.length;
  const locked = handover?.locked ?? plan.locked;

  const handleLock = async () => {
    if (!confirm('确认锁定交接班？锁定后方案版本将固定，不可再修改参数。')) return;
    setSealVisible(true);
    await saveCurrentPlan();
    await lockHandover();
  };

  const handleSave = async () => {
    await saveCurrentPlan();
    setPlanSavedMsg(true);
    setTimeout(() => setPlanSavedMsg(false), 2000);
  };

  const openBriefing = () => {
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<title>交底 · ${plan.planNo}</title>`);
      w.document.write(buildBriefingHTML(plan, operationRisks));
      w.document.close();
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-dock-950 overflow-hidden">
      <header className="h-14 flex items-center px-6 bg-dock-900/95 backdrop-blur-md border-b border-dock-700/60 shadow-panel">
        <button onClick={() => navigate('/')} className="mr-3 text-slate-400 hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="text-[15px] font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-safety-green" />交接班确认
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {plan.planNo} · {plan.name} · V{plan.version}{locked && ' · 已锁定'}
          </div>
        </div>
        <div className="flex-1" />

        <div className="flex items-center gap-3 mr-4">
          <div className="px-3 py-1 rounded-full bg-dock-800 border border-dock-700 text-xs text-slate-300 font-mono">
            确认进度 <b className="text-safety-green">{confirmedCount}</b> / {crew.length}
          </div>
          {summary.danger > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-safety-red/15 text-safety-red text-xs font-semibold">
              ⚠ {summary.danger} 风险待处理
            </span>
          )}
        </div>

        <button onClick={openBriefing} className="btn-secondary mr-2">
          <FileText className="w-4 h-4" /> 查看交底
        </button>
        <button onClick={handleSave} className="btn-secondary mr-2" disabled={locked}>
          <Download className="w-4 h-4" /> {planSavedMsg ? '已保存' : '保存状态'}
        </button>
        <button
          onClick={handleLock}
          disabled={locked || !allConfirmed}
          className={`${locked ? 'btn-secondary' : 'btn-primary animate-glow shadow-lg'} inline-flex items-center gap-1.5`}
        >
          {locked ? (
            <><Lock className="w-4 h-4" /> 已锁定版本</>
          ) : (
            <><Unlock className="w-4 h-4" /> 锁定并结束交接班</>
          )}
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-dock-900 via-dock-950 to-dock-950">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-5 relative">
          {sealVisible && locked && (
            <div className="absolute top-8 right-8 z-30 pointer-events-none select-none animate-[sealStamp_0.6s_ease-out_forwards]">
              <div className="w-36 h-36 rounded-full border-4 border-safety-red/80 text-safety-red/90 flex flex-col items-center justify-center rotate-[-18deg] shadow-[0_0_0_6px_rgba(255,71,87,0.08)] bg-dock-950/60 backdrop-blur-sm">
                <div className="text-[10px] tracking-[0.3em] opacity-70">SEALED · V{plan.version}</div>
                <div className="text-2xl font-black mt-0.5">已锁定</div>
                <div className="text-[10px] mt-1 opacity-70 font-mono">{plan.planNo}</div>
                <div className="h-px w-20 bg-safety-red/30 my-1" />
                <div className="text-[9px] opacity-60">交接班确认专用</div>
              </div>
            </div>
          )}

          <div className="lg:col-span-2 space-y-4">
            <div className="panel p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-safety-green to-emerald-500 flex items-center justify-center shadow-lg">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white">作业人员确认清单</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    每位成员需<strong className="text-safety-orange">点击自己的一行</strong>，表示已阅读并理解本方案同一版本（V{plan.version}）的风险与控制措施。
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {crew.map(m => {
                  const record = confirmMap.get(m.userId);
                  return (
                    <CrewRow
                      key={m.userId}
                      member={m}
                      confirmed={!!record}
                      confirmTime={record?.time}
                      onConfirm={() => confirmHandover(m.userId, m.userName, m.role)}
                      disabled={locked}
                    />
                  );
                })}
              </div>

              <div className="mt-4 p-3 rounded-lg bg-dock-800/40 border border-dock-700/50 text-[11px] text-slate-400 space-y-1">
                <div>
                  <b className="text-slate-200">确认原则：</b>
                  全员确认后由班组长点击右上角「锁定并结束交接班」，锁定后方案进入只读归档状态。
                </div>
                <div>
                  <b className="text-slate-200">版本一致性：</b>
                  交接班锁定的方案版本号 V{plan.version} 与导出的交底文档、作业票截图必须完全一致。
                </div>
              </div>
            </div>

            <div className="panel p-4">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-safety-blue" />方案摘要
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-dock-800/50 rounded-lg p-2.5 border border-dock-700/60">
                  <div className="text-slate-500 text-[10px] mb-0.5">吊车型号</div>
                  <div className="font-mono font-semibold text-slate-100 truncate">{plan.crane.brand} {plan.crane.model}</div>
                </div>
                <div className="bg-dock-800/50 rounded-lg p-2.5 border border-dock-700/60">
                  <div className="text-slate-500 text-[10px] mb-0.5">货物重量</div>
                  <div className="font-mono font-semibold text-slate-100">
                    {plan.cargo.weight} {plan.cargo.weightUnit === 'ton' ? 't' : 'kg'}
                  </div>
                </div>
                <div className="bg-dock-800/50 rounded-lg p-2.5 border border-dock-700/60">
                  <div className="text-slate-500 text-[10px] mb-0.5">吊次数量</div>
                  <div className="font-mono font-semibold text-slate-100">{plan.operations.length} 次</div>
                </div>
                <div className="bg-dock-800/50 rounded-lg p-2.5 border border-dock-700/60">
                  <div className="text-slate-500 text-[10px] mb-0.5">现场风速</div>
                  <div className={`font-mono font-semibold ${
                    plan.windSpeed > 10.8 ? 'text-safety-red' : plan.windSpeed > 8 ? 'text-safety-yellow' : 'text-safety-green'
                  }`}>{plan.windSpeed.toFixed(1)} m/s</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="panel p-4 overflow-hidden">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-2">实时确认进度</div>
              <div className="relative w-full aspect-square max-w-[240px] mx-auto my-2">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(45,58,85,0.6)" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke={allConfirmed ? '#2ED573' : '#FF8A3D'}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(confirmedCount / crew.length) * 251.2} 251.2`}
                    style={{ transition: 'stroke-dasharray 0.6s ease-out, stroke 0.4s' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-4xl font-black text-white">
                    {Math.round((confirmedCount / crew.length) * 100)}%
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {confirmedCount} / {crew.length} 已确认
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 mt-2">
                {crew.map(m => {
                  const ok = confirmMap.has(m.userId);
                  return (
                    <div key={m.userId} className="flex items-center gap-2 text-[11px]">
                      {ok
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-safety-green flex-shrink-0" />
                        : <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />}
                      <span className={ok ? 'text-slate-200' : 'text-slate-500'}>{m.userName}</span>
                      <span className="ml-auto text-slate-500 font-mono text-[10px]">{m.role}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {allConfirmed && !locked && (
              <div className="panel p-4 bg-safety-green/5 border-safety-green/40">
                <div className="flex items-center gap-2 text-safety-green font-bold mb-2">
                  <CheckCircle2 className="w-5 h-5" />全员确认完毕
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  所有作业人员均已阅读并确认 V{plan.version} 版本的吊装方案。请班组长锁定方案版本后开工。
                </p>
                <button onClick={handleLock} className="btn-primary w-full justify-center animate-glow shadow-lg">
                  <Lock className="w-4 h-4" /> 锁定并归档（不可撤销）
                </button>
              </div>
            )}

            {locked && (
              <div className="panel p-4 bg-safety-red/5 border-safety-red/40">
                <div className="flex items-center gap-2 text-safety-red font-bold mb-2">
                  <Lock className="w-5 h-5" />交接班已完成
                </div>
                <p className="text-xs text-slate-400">
                  方案版本 V{plan.version} 已锁定归档，现场可按此方案执行。如需变更，请在主页新建方案。
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes sealStamp {
          0% { opacity: 0; transform: scale(2.2) rotate(-30deg); }
          60% { opacity: 1; transform: scale(0.9) rotate(-15deg); }
          80% { transform: scale(1.05) rotate(-17deg); }
          100% { opacity: 1; transform: scale(1) rotate(-18deg); }
        }
      `}</style>
    </div>
  );
}
