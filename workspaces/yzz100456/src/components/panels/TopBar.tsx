import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Anchor, Save, FileDown, Camera, Wind, RefreshCw, ListChecks, Users, Lock, Unlock, ChevronDown, CheckCircle2, AlertOctagon, FileText, FolderKanban } from 'lucide-react';
import { usePlanStore } from '@/hooks/usePlanStore';
import { useScreenshot } from '@/hooks/useScreenshot';

export default function TopBar() {
  const navigate = useNavigate();
  const plan = usePlanStore(s => s.currentPlan);
  const savePlan = usePlanStore(s => s.saveCurrentPlan);
  const newPlan = usePlanStore(s => s.newPlan);
  const { capture, downloadAsFile, copyToClipboard } = useScreenshot();
  const [saving, setSaving] = useState(false);
  const [shotMsg, setShotMsg] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);

  const summary = plan.risks.reduce((acc, r) => {
    acc[r.level] = (acc[r.level] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const doSave = async () => {
    setSaving(true);
    capture();
    await savePlan();
    setTimeout(() => setSaving(false), 600);
  };

  const windLevel = plan.windSpeed < 8 ? 'ok' : plan.windSpeed < 10.8 ? 'warn' : 'danger';

  return (
    <header className="h-14 flex items-center px-4 bg-dock-900/95 backdrop-blur-md border-b border-dock-700/60 relative z-30 shadow-panel">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-safety-orange to-safety-red flex items-center justify-center shadow-lg">
          <Anchor className="w-5 h-5 text-dock-950" />
        </div>
        <div>
          <div className="text-[15px] font-bold text-white leading-tight tracking-wide">码头吊车半径预演</div>
          <div className="text-[11px] text-slate-400 font-mono leading-tight">{plan.planNo} · V{plan.version}{plan.locked && ' · 已锁定'}</div>
        </div>
      </div>

      <div className="ml-6 flex items-center gap-3 text-xs">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
          windLevel === 'ok' ? 'bg-safety-green/15 text-safety-green' :
          windLevel === 'warn' ? 'bg-safety-yellow/15 text-safety-yellow' :
          'bg-safety-red/15 text-safety-red animate-pulse-slow'
        }`}>
          <Wind className="w-3.5 h-3.5" />
          <span className="font-mono font-semibold">{plan.windSpeed.toFixed(1)}m/s</span>
          <span className="text-[10px] opacity-70">
            {windLevel === 'ok' ? '5级以下' : windLevel === 'warn' ? '5-6级' : '>6级'}
          </span>
        </div>

        {(summary.danger || summary.warning) && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-dock-800/80 border border-dock-700">
            {summary.danger ? <span className="flex items-center gap-1 text-safety-red"><AlertOctagon className="w-3.5 h-3.5" /><b className="font-mono">{summary.danger}</b></span> : null}
            {summary.warning ? <span className="flex items-center gap-1 text-safety-yellow"><AlertOctagon className="w-3.5 h-3.5" /><b className="font-mono">{summary.warning}</b></span> : null}
            {summary.info ? <span className="flex items-center gap-1 text-safety-blue"><FileText className="w-3.5 h-3.5" /><b className="font-mono">{summary.info}</b></span> : null}
            {!summary.danger && !summary.warning && summary.notice ? <span className="text-slate-400">{summary.notice} 说明</span> : null}
            {Object.values(summary).every(v => !v) && <span className="text-safety-green flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />全部通过</span>}
          </div>
        )}
      </div>

      <div className="flex-1" />

      <div className="relative">
        <button
          onClick={() => setMenu(v => !v)}
          className="btn-secondary mr-2"
        >
          <FolderKanban className="w-4 h-4" /> 方案菜单
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${menu ? 'rotate-180' : ''}`} />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
            <div className="absolute right-0 top-full mt-1 z-50 panel w-52 py-1 shadow-2xl">
              <button onClick={() => { setMenu(false); navigate('/plans'); }} className="w-full px-3 py-2 text-left text-sm hover:bg-dock-700/60 flex items-center gap-2"><FolderKanban className="w-4 h-4 text-safety-blue" />方案列表</button>
              <button onClick={() => { setMenu(false); navigate(`/lifts/${plan.id}`); }} className="w-full px-3 py-2 text-left text-sm hover:bg-dock-700/60 flex items-center gap-2"><ListChecks className="w-4 h-4 text-safety-yellow" />吊次复查</button>
              <button onClick={() => { setMenu(false); navigate(`/handover/${plan.id}`); }} className="w-full px-3 py-2 text-left text-sm hover:bg-dock-700/60 flex items-center gap-2"><Users className="w-4 h-4 text-safety-green" />交接班确认</button>
              <button onClick={() => { setMenu(false); navigate(`/preview/${plan.id}`); }} className="w-full px-3 py-2 text-left text-sm hover:bg-dock-700/60 flex items-center gap-2"><FileText className="w-4 h-4 text-slate-300" />只读预览</button>
              <div className="border-t border-dock-700/60 my-1" />
              <button onClick={() => { if (confirm('确认清空当前方案？（未保存的修改将丢失）')) { newPlan(); setMenu(false); } }} className="w-full px-3 py-2 text-left text-sm hover:bg-dock-700/60 flex items-center gap-2 text-safety-orange"><RefreshCw className="w-4 h-4" />新建方案</button>
            </div>
          </>
        )}
      </div>

      <button
        onClick={async () => {
          capture();
          const ok = await copyToClipboard();
          setShotMsg(ok ? '✓ 已复制到剪贴板，可直接粘贴作业票' : '请手动右键保存');
          setTimeout(() => setShotMsg(null), 2500);
        }}
        className="btn-secondary mr-2"
      >
        <Camera className="w-4 h-4" /> 风险截图
      </button>

      <button onClick={() => { downloadAsFile(`作业票-${plan.planNo}.png`); }} className="btn-secondary mr-2">
        <FileDown className="w-4 h-4" /> 下载PNG
      </button>

      <button
        onClick={doSave}
        disabled={saving || plan.locked}
        className="btn-primary animate-glow shadow-lg"
      >
        <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
        {plan.locked ? (<><Lock className="w-3.5 h-3.5" />已锁定</>) : saving ? '保存中…' : '保存方案并导出'}
      </button>

      {shotMsg && (
        <div className="absolute right-48 top-14 px-3 py-1.5 rounded bg-safety-green/90 text-dock-950 text-xs font-semibold shadow-xl animate-bounce z-50">
          {shotMsg}
        </div>
      )}
    </header>
  );
}
