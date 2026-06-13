import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSignageStore } from '@/store/signageStore';
import {
  ArrowLeft, Package, CheckSquare, HardHat, MapPin, Save, RefreshCw, ChevronRight,
  AlertTriangle, CheckCircle2, Ruler, PackageCheck, Clock, Upload,
} from 'lucide-react';
import { SIGN_TEMPLATES, FLOOR_LIST, type ConstructionStatus, type Sign } from '@/types';

const STATUS_FLOW: { k: ConstructionStatus; label: string; icon: any; cls: string }[] = [
  { k: 'pending', label: '未领料', icon: Package, cls: 'status-pending' },
  { k: 'picked', label: '已领料', icon: PackageCheck, cls: 'status-picked' },
  { k: 'installed', label: '已安装', icon: CheckSquare, cls: 'status-installed' },
  { k: 'verified', label: '已验收', icon: CheckCircle2, cls: 'status-verified' },
];

export default function Construction() {
  const params = useParams();
  const navigate = useNavigate();
  const schemeId = params.schemeId!;
  const { schemes, updateConstructionRecord, warnings, init } = useSignageStore();
  const [filter, setFilter] = useState<number | 'all'>('all');
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => { if (Object.keys(schemes).length === 0) init(); }, [schemes, init]);
  const scheme = schemes[schemeId];
  if (!scheme) return <div className="p-10">加载中...</div>;

  const records = scheme.constructionRecords;
  const warnSignIds = useMemo(() => new Set(warnings.map((w) => w.signId)), [warnings]);

  const allSigns: { floor: number; sign: Sign }[] = [];
  FLOOR_LIST.forEach((f) => {
    (scheme.signs[f] || []).forEach((s: Sign) => allSigns.push({ floor: f, sign: s }));
  });
  const filtered = filter === 'all' ? allSigns : allSigns.filter((x) => x.floor === filter);

  const summary = useMemo(() => {
    const c: Record<ConstructionStatus, number> = { pending: 0, picked: 0, installed: 0, verified: 0 };
    allSigns.forEach(({ sign }) => { c[records[sign.id]?.status || 'pending']++; });
    return c;
  }, [allSigns, records]);

  const statsByFloor = useMemo(() => {
    const map = new Map<number, { total: number; done: number; picked: number }>();
    allSigns.forEach(({ floor, sign }) => {
      const prev = map.get(floor) || { total: 0, done: 0, picked: 0 };
      prev.total++;
      const st = records[sign.id]?.status || 'pending';
      if (st === 'installed' || st === 'verified') prev.done++;
      if (st === 'picked') prev.picked++;
      map.set(floor, prev);
    });
    return map;
  }, [allSigns, records]);

  const saveAll = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  };

  return (
    <div className="min-h-screen bg-surface-2">
      <div className="bg-white border-b border-surface-3/60 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/editor/${schemeId}`)} className="app-btn-ghost !px-2"><ArrowLeft className="w-4 h-4" /></button>
            <div>
              <div className="font-semibold text-surface-strong flex items-center gap-2">
                <HardHat className="w-4 h-4 text-accent-400" />施工回填面板
              </div>
              <div className="text-xs text-surface-muted">{scheme.name} · 共 {allSigns.length} 项安装任务</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-surface-2 rounded-lg p-1">
              <button onClick={() => setFilter('all')} className={`nav-tab !py-1 !text-xs ${filter === 'all' ? 'nav-tab-active' : ''}`}>全部</button>
              {FLOOR_LIST.map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`nav-tab !py-1 !text-xs !px-2.5 ${filter === f ? 'nav-tab-active' : ''}`}>{f}F</button>
              ))}
            </div>
            <div className="h-6 w-px bg-surface-3 mx-1" />
            <button onClick={saveAll} className="app-btn-primary">
              <Save className="w-4 h-4" />保存进度
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {STATUS_FLOW.map((s) => {
            const Icon = s.icon;
            const count = summary[s.k];
            const pct = allSigns.length ? Math.round(count / allSigns.length * 100) : 0;
            return (
              <div key={s.k} className="app-card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-lg status-badge ${s.cls} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-surface-strong leading-none">{count}</div>
                    <div className="text-xs text-surface-muted mt-1">{s.label} ({pct}%)</div>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <div className={`h-full rounded-full ${s.k === 'verified' ? 'bg-success-500' : s.k === 'installed' ? 'bg-warning-500' : s.k === 'picked' ? 'bg-info-500' : 'bg-surface-4'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-1 space-y-3">
            {FLOOR_LIST.map((f) => {
              const st = statsByFloor.get(f) || { total: 0, done: 0, picked: 0 };
              const pct = st.total ? Math.round(st.done / st.total * 100) : 0;
              return (
                <div key={f} onClick={() => setFilter(f)}
                  className={`app-card p-4 cursor-pointer transition hover:shadow-card ${filter === f ? 'ring-2 ring-brand-400 ring-offset-1' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-lg text-surface-strong">{f}F</div>
                    <ChevronRight className="w-4 h-4 text-surface-muted" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-surface-muted mb-2">
                    <span>共 {st.total}</span>
                    <span>·</span>
                    <span className="text-warning-600">安装 {st.done}</span>
                    <span>·</span>
                    <span className="text-info-600">领料 {st.picked}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2 overflow-hidden flex">
                    <div className="h-full bg-warning-500" style={{ width: `${pct}%` }} />
                    <div className="h-full bg-success-500" style={{ width: `${st.done === st.total && st.total > 0 ? '100%' : '0%'}` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-3 app-card overflow-hidden">
            <div className="px-4 py-3 bg-surface/60 border-b border-surface-3/60 flex items-center gap-2 text-xs font-semibold text-surface-muted">
              <Ruler className="w-4 h-4" />安装任务列表
              <span className="ml-auto">{filtered.length} 项</span>
            </div>
            <div className="divide-y divide-surface-3 max-h-[calc(100vh-330px)] overflow-y-auto">
              {filtered.map(({ floor, sign }) => {
                const rec: any = records[sign.id] || { status: 'pending' as ConstructionStatus };
                const tpl = SIGN_TEMPLATES[sign.type];
                const curIdx = STATUS_FLOW.findIndex((s) => s.k === (rec.status || 'pending'));
                const CurStatusIcon = STATUS_FLOW[curIdx].icon;
                const installed = rec.installedPosition;
                const hasWarn = warnSignIds.has(sign.id);
                const dx = installed ? Math.abs(installed.x - sign.position.x) : 0;
                const dy = installed ? Math.abs(installed.y - sign.position.y) : 0;
                const dz = installed ? Math.abs(installed.z - sign.position.z) : 0;
                const deviation = Math.max(dx, dy, dz);
                return (
                  <div key={sign.id} className="p-4 hover:bg-surface/40 transition">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-lg shrink-0 flex items-center justify-center text-white shadow-sm" style={{ background: tpl.color }}>
                        <span className="font-bold">{tpl.label[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-surface-strong">{sign.name}</span>
                          <span className="app-chip bg-brand-50 text-brand-700 border-brand-200 text-[11px]">{floor}F · {sign.zone}</span>
                          <span className="app-chip bg-surface-2 text-surface-text border-surface-3 text-[11px]">{tpl.label}</span>
                          {hasWarn && (
                            <span className="app-chip warn-error text-[11px]">
                              <AlertTriangle className="w-3 h-3" />含设计风险
                            </span>
                          )}
                          <span className={`ml-auto status-badge ${STATUS_FLOW[curIdx].cls}`}>
                            <CurStatusIcon className="w-3 h-3" />{STATUS_FLOW[curIdx].label}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <div className="bg-surface rounded-lg p-2.5 text-xs border border-surface-3">
                            <div className="text-[10px] text-surface-muted font-medium mb-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />设计位置
                            </div>
                            <div className="font-mono text-surface-text">
                              X {sign.position.x.toFixed(2)} · Y {sign.position.y.toFixed(2)} · Z {sign.position.z.toFixed(2)}
                            </div>
                          </div>
                          <div className={`rounded-lg p-2.5 text-xs border ${deviation > 0.1 ? 'bg-danger-500/10 border-danger-500/30' : installed ? 'bg-success-500/5 border-success-500/30' : 'bg-surface border-surface-3'}`}>
                            <div className="text-[10px] text-surface-muted font-medium mb-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />实际安装位置
                              {deviation > 0.1 && <span className="ml-auto text-danger-600 font-semibold">偏差 {(deviation * 100).toFixed(0)}cm</span>}
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {(['x', 'y', 'z'] as const).map((axis) => (
                                <div key={axis} className="flex items-center gap-1">
                                  <span className="uppercase font-bold text-[10px] text-surface-muted w-3">{axis}</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={installed ? installed[axis].toFixed(2) : ''}
                                    placeholder="0.00"
                                    onChange={(e) => {
                                      const v = Number(e.target.value);
                                      const cur = installed || { x: sign.position.x, y: sign.position.y, z: sign.position.z };
                                      updateConstructionRecord(schemeId, sign.id, {
                                        installedPosition: { ...cur, [axis]: isNaN(v) ? 0 : v },
                                        status: 'installed',
                                        installedAt: Date.now(),
                                      });
                                    }}
                                    className="flex-1 px-1.5 py-0.5 text-xs rounded border border-surface-3 bg-white font-mono focus:outline-none focus:ring-1 focus:ring-brand-400"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {STATUS_FLOW.map((s, i) => {
                            const Icon = s.icon;
                            const active = i <= curIdx;
                            const next = i === curIdx + 1;
                            return (
                              <button
                                key={s.k}
                                onClick={() => updateConstructionRecord(schemeId, sign.id, {
                                  status: s.k,
                                  ...(s.k === 'picked' ? { pickedAt: Date.now() } : {}),
                                  ...(s.k === 'installed' ? { installedAt: Date.now() } : {}),
                                })}
                                disabled={!active && !next}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border transition ${
                                  active ? `${s.cls}` :
                                  next ? 'bg-white text-brand-600 border-brand-300 hover:bg-brand-50' :
                                  'bg-surface text-surface-muted border-surface-3 cursor-not-allowed opacity-50'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />{s.label}
                              </button>
                            );
                          })}
                          <span className="ml-auto text-[11px] text-surface-muted flex items-center gap-3">
                            {rec.pickedAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(rec.pickedAt).toLocaleDateString('zh-CN')} 领料</span>}
                            {rec.installedAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(rec.installedAt).toLocaleDateString('zh-CN')} 安装</span>}
                            <button className="text-brand-600 hover:text-brand-700 inline-flex items-center gap-1">
                              <Upload className="w-3.5 h-3.5" />照片
                            </button>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {savedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 app-card px-5 py-3 shadow-card-lg flex items-center gap-2 z-50 animate-pulse-soft">
          <RefreshCw className="w-4 h-4 text-success-600" />
          <span className="text-sm font-medium text-success-700">施工进度已保存</span>
        </div>
      )}
    </div>
  );
}
