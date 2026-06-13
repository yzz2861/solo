import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSignageStore } from '@/store/signageStore';
import {
  ArrowLeft, Sparkles, ShieldCheck, Brush, Siren, MapPin, AlertTriangle, Eye,
  Camera, CheckCircle2, AlertCircle, Lightbulb, ChevronDown, ChevronRight,
} from 'lucide-react';
import { FLOOR_LIST, SIGN_TEMPLATES, type Sign, type ComplianceWarning } from '@/types';

export default function Inspection() {
  const params = useParams();
  const navigate = useNavigate();
  const schemeId = params.schemeId!;
  const { schemes, warnings, init } = useSignageStore();
  const [tab, setTab] = useState<'cleaning' | 'security' | 'accessible'>('cleaning');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => { if (Object.keys(schemes).length === 0) init(); }, [schemes, init]);
  const scheme = schemes[schemeId];
  if (!scheme) return <div className="p-10">加载中...</div>;

  const warnMap = useMemo(() => {
    const m = new Map<string, ComplianceWarning[]>();
    warnings.forEach((w) => {
      if (!m.has(w.signId)) m.set(w.signId, []);
      m.get(w.signId)!.push(w);
    });
    return m;
  }, [warnings]);

  const allSigns: { floor: number; sign: Sign }[] = [];
  FLOOR_LIST.forEach((f) => (scheme.signs[f] || []).forEach((s: Sign) => allSigns.push({ floor: f, sign: s })));

  const cleaningNotes = [
    { icon: Brush, title: '亚克力标牌护理', level: 'info', content: '使用中性清洁剂（如洗洁精稀释液）搭配超细纤维布，禁止使用酒精、丙酮等有机溶剂，避免亚克力表面龟裂失光。建议每周擦拭 1 次。' },
    { icon: Sparkles, title: '金属标牌保养', level: 'info', content: '不锈钢/铝合金标牌使用专用金属光亮剂，去除指纹与水痕后立即用干布抛光，避免长期水渍留下腐蚀斑点。' },
    { icon: Camera, title: '高处作业安全', level: 'error', content: '安装高度 ≥ 2.2m 的标牌（如电梯厅牌、方向指引牌）擦拭时必须使用人字梯并系安全绳，严禁单脚踩梯或垫物攀爬；二人配合作业，一人扶梯。' },
    { icon: Lightbulb, title: '立式牌底座除尘', level: 'warning', content: '立式导视牌底座周围易积灰及杂物，每日巡检时用干布擦拭；发现底座松动立即报修物业工程部。' },
    { icon: AlertTriangle, title: '带自发光标牌', level: 'warning', content: '发光标牌表面勿用腐蚀性液体，发现灯条不亮或闪烁及时登记报修，避免夜间视觉引导失效。' },
  ];

  const securityNotes = [
    { icon: ShieldCheck, title: '消防栓距离检查', level: 'error', content: '重点巡检所有消防栓前方 0.5m 范围内是否有标牌/杂物遮挡，确保应急取用无阻碍。遮挡物立即移除并登记。' },
    { icon: Siren, title: '应急逃生方向牌', level: 'error', content: '走廊方向指示牌、安全出口牌、应急照明标牌需纳入夜班重点巡检清单；发现损坏、缺失 30 分钟内报备。' },
    { icon: Eye, title: '夜间反光条检查', level: 'warning', content: '立式导视牌底部、电梯厅边缘标牌应贴有反光条；夜间用手电筒测试反光效果，失效立即更换。' },
    { icon: AlertCircle, title: '监控盲区提示', level: 'warning', content: '以下标牌位于监控盲区（楼层拐角、电梯间背面），需加强人工巡查，防止人为损坏、贴小广告或恶意覆盖：' },
    { icon: MapPin, title: '无障碍标识保护', level: 'warning', content: '轮椅通道、无障碍卫生间旁的蓝色标识牌应重点保护，发现移位立即恢复原位（底部 ≥ 0.9m，顶部 ≤ 2.5m）。' },
  ];

  const accessibleHighlights = allSigns.filter(({ sign }) =>
    sign.type === 'accessible' || warnMap.get(sign.id)?.some((w) => w.category === 'accessible_path')
  );
  const blindZoneSigns = allSigns.filter(({ sign }) =>
    warnMap.get(sign.id)?.some((w) => w.category === 'corner_view' || w.category === 'occlusion')
  );
  const fireRiskSigns = allSigns.filter(({ sign }) =>
    warnMap.get(sign.id)?.some((w) => w.category === 'fire_hydrant')
  );

  const toggle = (k: string) => setExpanded((s) => ({ ...s, [k]: !s[k] }));

  return (
    <div className="min-h-screen bg-surface-2">
      <div className="bg-white border-b border-surface-3/60 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/editor/${schemeId}`)} className="app-btn-ghost !px-2"><ArrowLeft className="w-4 h-4" /></button>
            <div>
              <div className="font-semibold text-surface-strong flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-info-500" />保洁 / 安保巡检注意点
              </div>
              <div className="text-xs text-surface-muted">{scheme.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-surface-2 rounded-lg p-1">
            {([
              { k: 'cleaning', lbl: '保洁注意', icon: Brush },
              { k: 'security', lbl: '安保注意', icon: Siren },
              { k: 'accessible', lbl: '无障碍', icon: Eye },
            ] as const).map(({ k, lbl, icon: Icon }) => (
              <button key={k} onClick={() => setTab(k)}
                className={`nav-tab flex items-center gap-1.5 ${tab === k ? 'nav-tab-active' : ''}`}>
                <Icon className="w-3.5 h-3.5" />{lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {tab === 'cleaning' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KpiCard icon={<Brush className="w-5 h-5" />} color="from-brand-500 to-brand-700" label="标牌总数" value={allSigns.length} sub="需定期擦拭" />
              <KpiCard icon={<Camera className="w-5 h-5" />} color="from-warning-500 to-warning-700" label="高处标牌" value={allSigns.filter((x) => x.sign.position.y >= 2.2).length} sub="≥ 2.2m 需登高作业" />
              <KpiCard icon={<Sparkles className="w-5 h-5" />} color="from-info-500 to-info-700" label="亚克力材质" value={allSigns.filter((x) => x.sign.material === 'acrylic').length} sub="禁用酒精擦拭" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cleaningNotes.map((n, i) => (
                <NoteCard key={i} icon={n.icon} title={n.title} level={n.level as any} content={n.content} />
              ))}
            </div>
          </div>
        )}

        {tab === 'security' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <KpiCard icon={<Siren className="w-5 h-5" />} color="from-danger-500 to-danger-700" label="消防栓风险" value={fireRiskSigns.length} sub="需立即整改" />
              <KpiCard icon={<Eye className="w-5 h-5" />} color="from-warning-500 to-warning-700" label="监控盲区" value={blindZoneSigns.length} sub="转角/遮挡" />
              <KpiCard icon={<MapPin className="w-5 h-5" />} color="from-info-500 to-info-700" label="无障碍标识" value={accessibleHighlights.length} sub="需重点保护" />
              <KpiCard icon={<ShieldCheck className="w-5 h-5" />} color="from-success-500 to-success-700" label="应急标牌" value={allSigns.filter((x) => x.sign.type === 'directional' || x.sign.type === 'elevator_hall').length} sub="方向/电梯" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {securityNotes.map((n, i) => (
                <NoteCard key={i} icon={n.icon} title={n.title} level={n.level as any} content={n.content}
                  extra={i === 3 && blindZoneSigns.length > 0 ? blindZoneSigns.slice(0, 10).map((b) => (
                    <div key={b.sign.id} className="text-[11px] text-surface-muted mt-1.5 px-2 py-1 rounded bg-white/50 border border-surface-3/60">
                      • {b.floor}F · {b.sign.zone} · {b.sign.name} ({SIGN_TEMPLATES[b.sign.type].label})
                    </div>
                  )) : null}
                />
              ))}
            </div>
            {fireRiskSigns.length > 0 && (
              <div className="app-card p-5 border-danger-500/40 !bg-danger-500/5">
                <div className="panel-title mb-3 text-danger-600">
                  <AlertTriangle className="w-4 h-4" />消防栓附近标牌清单（需立即移位）
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {fireRiskSigns.map(({ floor, sign }) => {
                    const ws = warnMap.get(sign.id)?.filter((w) => w.category === 'fire_hydrant') || [];
                    return (
                      <div key={sign.id} className="border border-danger-500/30 rounded-lg p-3 bg-white/70">
                        <div className="flex items-start justify-between mb-1">
                          <div className="font-medium text-sm text-danger-700">{sign.name}</div>
                          <span className="text-[11px] app-chip bg-danger-500/10 text-danger-600 border-danger-500/30">{floor}F</span>
                        </div>
                        <div className="text-[11px] text-surface-muted">{sign.zone} · {SIGN_TEMPLATES[sign.type].label}</div>
                        {ws.map((w, i) => <div key={i} className="text-[11px] text-danger-600 mt-1">⚠ {w.message}</div>)}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'accessible' && (
          <div className="space-y-4">
            <div className="app-card p-5 bg-info-500/5 border-info-500/30">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-11 h-11 rounded-xl bg-info-500 text-white flex items-center justify-center"><Eye className="w-6 h-6" /></div>
                <div>
                  <div className="font-semibold text-surface-strong">无障碍合规巡检要点</div>
                  <div className="text-xs text-surface-muted">参照 GB 50763-2012《无障碍设计规范》</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mt-3">
                {[
                  { t: '标识底部 ≥ 0.9m', d: '轮椅乘坐者视线下限' },
                  { t: '标识顶部 ≤ 2.5m', d: '轮椅乘坐者视线上限' },
                  { t: '通道宽度 ≥ 0.9m', d: '无障碍通道净宽' },
                ].map((x, i) => (
                  <div key={i} className="bg-white rounded-lg p-3 border border-info-500/20">
                    <div className="font-semibold text-info-600 mb-0.5">{x.t}</div>
                    <div className="text-surface-muted text-[11px]">{x.d}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="app-card p-0 overflow-hidden">
              <div className="px-5 py-3 bg-white border-b border-surface-3/60 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-600" />
                <span className="font-semibold text-sm text-surface-strong">楼层无障碍标牌与通道清单</span>
              </div>
              <div className="divide-y divide-surface-3">
                {FLOOR_LIST.map((f) => {
                  const paths = scheme.floors[f]?.accessiblePaths || [];
                  const signs = accessibleHighlights.filter((x) => x.floor === f);
                  if (paths.length === 0 && signs.length === 0) return null;
                  const key = `floor-${f}`;
                  const isOpen = expanded[key] ?? true;
                  return (
                    <div key={f}>
                      <button onClick={() => toggle(key)} className="w-full px-5 py-3 flex items-center gap-3 hover:bg-surface/50 text-left">
                        <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center font-bold">{f}F</div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-surface-strong">{scheme.floors[f]?.name || `${f}楼`}</div>
                          <div className="text-[11px] text-surface-muted">
                            {paths.length} 条无障碍通道 · {signs.length} 个相关标牌
                          </div>
                        </div>
                        {isOpen ? <ChevronDown className="w-4 h-4 text-surface-muted" /> : <ChevronRight className="w-4 h-4 text-surface-muted" />}
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4 pl-17 space-y-3 ml-12">
                          {paths.map((p, i) => (
                            <div key={i} className="bg-info-500/5 rounded-lg p-3 border border-info-500/20">
                              <div className="text-xs font-semibold text-info-600 mb-1">🛤 无障碍通道 #{i + 1}（宽度 {p.width}m）</div>
                              <div className="text-[11px] text-surface-muted font-mono">
                                起止点 ({p.points[0]?.x.toFixed(1)}, {p.points[0]?.z.toFixed(1)}) → ({p.points[p.points.length - 1]?.x.toFixed(1)}, {p.points[p.points.length - 1]?.z.toFixed(1)})
                              </div>
                            </div>
                          ))}
                          {signs.map(({ sign }) => {
                            const ws = warnMap.get(sign.id)?.filter((w) => w.category === 'accessible_path' || w.category === 'height') || [];
                            return (
                              <div key={sign.id} className={`rounded-lg p-3 border ${ws.length ? 'bg-warning-500/10 border-warning-500/30' : 'bg-white border-surface-3'}`}>
                                <div className="flex items-start justify-between mb-1">
                                  <div className="text-sm font-medium text-surface-strong">{sign.name}</div>
                                  <div className="flex gap-1">
                                    <span className="text-[11px] app-chip bg-info-500/10 text-info-600 border-info-500/30">{SIGN_TEMPLATES[sign.type].label}</span>
                                    <span className="text-[11px] app-chip bg-surface-2 text-surface-text border-surface-3">{sign.zone}</span>
                                  </div>
                                </div>
                                <div className="text-[11px] text-surface-muted font-mono mb-1">
                                  安装位置: Y {sign.position.y.toFixed(2)}m (底) ~ {(sign.position.y + sign.height).toFixed(2)}m (顶)
                                </div>
                                {ws.length > 0 && ws.map((w, i) => (
                                  <div key={i} className={`text-[11px] mt-0.5 ${w.level === 'error' ? 'text-danger-600' : 'text-warning-600'}`}>
                                    ⚠ [{w.level === 'error' ? '严重' : '警告'}] {w.message}
                                  </div>
                                ))}
                                {ws.length === 0 && (
                                  <div className="text-[11px] text-success-600 flex items-center gap-1 mt-1">
                                    <CheckCircle2 className="w-3 h-3" />高度合规（0.9m ~ 2.5m）
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: number; sub: string; color: string }) {
  return (
    <div className="app-card p-4 flex items-center gap-3">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} text-white flex items-center justify-center shadow-sm`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold text-surface-strong leading-none">{value}</div>
        <div className="text-xs text-surface-muted mt-1">{label}</div>
        <div className="text-[10px] text-surface-muted mt-0.5">{sub}</div>
      </div>
    </div>
  );
}

function NoteCard({ icon: Icon, title, level, content, extra }: { icon: any; title: string; level: 'error' | 'warning' | 'info'; content: string; extra?: React.ReactNode }) {
  const cls = level === 'error' ? 'from-danger-500 to-danger-700' : level === 'warning' ? 'from-warning-500 to-warning-700' : 'from-brand-500 to-brand-700';
  const badge = level === 'error' ? 'warn-error' : level === 'warning' ? 'warn-warning' : 'warn-info';
  const badgeTxt = level === 'error' ? '高风险' : level === 'warning' ? '注意' : '提示';
  return (
    <div className="app-card p-5 hover:shadow-card transition">
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cls} text-white flex items-center justify-center shadow-sm shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-semibold text-surface-strong">{title}</div>
            <span className={`app-chip border text-[10px] ${badge}`}>{badgeTxt}</span>
          </div>
        </div>
      </div>
      <p className="text-sm text-surface-text leading-relaxed pl-14">{content}</p>
      {extra && <div className="pl-14 mt-2">{extra}</div>}
    </div>
  );
}
