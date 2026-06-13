import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSignageStore } from '@/store/signageStore';
import { exportPDF, exportExcel, exportJSON, countStats, getSignsByFloorZone } from '@/utils/exportTools';
import { captureCurrentCanvas } from '@/components/three/EditorScene';
import {
  ArrowLeft, FileText, FileSpreadsheet, FileJson, Camera, AlertTriangle, CheckCircle2,
  Download, Table, Eye, Sparkles, RefreshCw,
} from 'lucide-react';
import { SIGN_TEMPLATES, FLOOR_LIST, ComplianceWarning } from '@/types';

export default function Export() {
  const params = useParams();
  const navigate = useNavigate();
  const schemeId = params.schemeId!;
  const { schemes, warnings, init } = useSignageStore();
  const [tab, setTab] = useState<'overview' | 'signs' | 'warnings' | 'picking'>('overview');
  const [shots, setShots] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState('');

  useEffect(() => { if (Object.keys(schemes).length === 0) init(); }, [schemes, init]);
  const scheme = schemes[schemeId];
  if (!scheme) return <div className="p-10 text-surface-muted">加载中...</div>;

  const stats = useMemo(() => countStats(scheme, warnings), [scheme, warnings]);
  const grouped = useMemo(() => getSignsByFloorZone(scheme), [scheme]);

  const takeShots = () => {
    const url = captureCurrentCanvas();
    if (url) {
      const id = warnings[0]?.signId || 'overview';
      setShots((s) => ({ ...s, [id]: url }));
    }
  };

  const warnByCategory = useMemo(() => {
    const m = new Map<string, { total: number; error: number; warning: number }>();
    warnings.forEach((w: ComplianceWarning) => {
      const key = w.category;
      const prev = m.get(key) || { total: 0, error: 0, warning: 0 };
      prev.total++;
      if (w.level === 'error') prev.error++;
      else if (w.level === 'warning') prev.warning++;
      m.set(key, prev);
    });
    return m;
  }, [warnings]);

  const doExport = async (type: 'pdf' | 'xlsx' | 'json') => {
    setExporting(type);
    try {
      const data = { scheme, warnings, screenshotDataUrls: shots };
      if (type === 'pdf') await exportPDF(data);
      else if (type === 'xlsx') exportExcel(data);
      else exportJSON(data);
    } finally {
      setTimeout(() => setExporting(''), 600);
    }
  };

  return (
    <div className="min-h-screen bg-surface-2">
      <div className="bg-white border-b border-surface-3/60 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/editor/${schemeId}`)} className="app-btn-ghost !px-2">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="font-semibold text-surface-strong flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-600" />
                安装清单导出
              </div>
              <div className="text-xs text-surface-muted">{scheme.name} · 更新于 {new Date(scheme.updatedAt).toLocaleString('zh-CN')}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={takeShots} className="app-btn-secondary">
              <Camera className="w-4 h-4" />截取当前视角
            </button>
            <div className="h-6 w-px bg-surface-3 mx-1" />
            <button onClick={() => doExport('json')} disabled={!!exporting} className="app-btn-secondary">
              <FileJson className="w-4 h-4" />JSON
              {exporting === 'json' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            </button>
            <button onClick={() => doExport('xlsx')} disabled={!!exporting} className="app-btn-secondary">
              <FileSpreadsheet className="w-4 h-4" />Excel
              {exporting === 'xlsx' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            </button>
            <button onClick={() => doExport('pdf')} disabled={!!exporting} className="app-btn-primary">
              <Download className="w-4 h-4" />导出 PDF
              {exporting === 'pdf' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 flex gap-1 pb-2">
          {([
            { k: 'overview', lbl: '总览', icon: Sparkles },
            { k: 'signs', lbl: '标牌清单', icon: Table },
            { k: 'warnings', lbl: '风险清单', icon: AlertTriangle },
            { k: 'picking', lbl: '领料清单', icon: Eye },
          ] as const).map(({ k, lbl, icon: Icon }) => (
            <button key={k} onClick={() => setTab(k)}
              className={`nav-tab flex items-center gap-1.5 ${tab === k ? 'nav-tab-active' : ''}`}>
              <Icon className="w-3.5 h-3.5" />{lbl}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={<Table className="w-5 h-5" />} color="from-brand-500 to-brand-700" label="标牌总数" value={stats.totalSigns} />
              <StatCard icon={<CheckCircle2 className="w-5 h-5" />} color="from-success-500 to-success-700" label="完全合规" value={stats.totalSigns - stats.warnedSigns} />
              <StatCard icon={<AlertTriangle className="w-5 h-5" />} color="from-warning-500 to-warning-700" label="警告" value={stats.warningCount} />
              <StatCard icon={<AlertTriangle className="w-5 h-5" />} color="from-danger-500 to-danger-700" label="严重违规" value={stats.errorCount} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="app-card p-5 lg:col-span-2">
                <div className="panel-title mb-4">按楼层分布</div>
                <div className="space-y-3">
                  {FLOOR_LIST.map((f) => {
                    const signs = scheme.signs[f] || [];
                    const warns = warnings.filter((w: ComplianceWarning) => signs.some((s) => s.id === w.signId));
                    const pct = signs.length === 0 ? 0 : Math.round((signs.length - new Set(warns.map((w) => w.signId)).size) / signs.length * 100);
                    return (
                      <div key={f}>
                        <div className="flex items-center justify-between mb-1.5 text-xs">
                          <span className="font-semibold text-surface-strong">{f}F</span>
                          <span className="text-surface-muted font-mono">{signs.length} 标牌 · {warns.length} 警告 · 合规 {pct}%</span>
                        </div>
                        <div className="h-3 rounded-full bg-surface-2 overflow-hidden flex">
                          <div className="h-full bg-gradient-to-r from-brand-500 to-brand-600" style={{ width: `${pct}%` }} />
                          {warns.some((w: ComplianceWarning) => w.level === 'error') && (
                            <div className="h-full bg-danger-500" style={{ width: '100%' }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="app-card p-5">
                <div className="panel-title mb-4">违规分类</div>
                <div className="space-y-2.5">
                  {Array.from(warnByCategory.entries()).length === 0 ? (
                    <div className="text-xs text-success-600 p-3 rounded-md bg-success-500/10 text-center border border-success-500/20">
                      ✓ 无违规项，状态良好
                    </div>
                  ) : (
                    Array.from(warnByCategory.entries()).map(([cat, v]) => (
                      <div key={cat} className="flex items-center gap-3">
                        <div className="w-24 text-xs text-surface-text truncate">
                          {({ height: '高度', orientation: '朝向', fire_hydrant: '消防栓', occlusion: '遮挡', corner_view: '转角', accessible_path: '无障碍' } as any)[cat] || cat}
                        </div>
                        <div className="flex-1 flex gap-1">
                          <div className="h-2 rounded-full bg-danger-500" style={{ width: `${v.error * 10}%`, minWidth: v.error ? '4px' : 0 }} />
                          <div className="h-2 rounded-full bg-warning-500" style={{ width: `${v.warning * 10}%`, minWidth: v.warning ? '4px' : 0 }} />
                        </div>
                        <div className="font-mono text-xs text-surface-muted w-10 text-right">{v.total}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {Object.keys(shots).length > 0 && (
              <div className="app-card p-5">
                <div className="panel-title mb-3">
                  <Camera className="w-4 h-4 text-brand-600" />风险截图 ({Object.keys(shots).length})
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(shots).map(([id, url]) => (
                    <div key={id} className="rounded-lg overflow-hidden border border-surface-3 bg-surface">
                      <img src={url} className="w-full h-32 object-cover" />
                      <div className="px-2.5 py-1.5 text-[11px] text-surface-muted truncate">{id}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'signs' && (
          <div className="app-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-brand-600 text-white text-xs">
                <tr>
                  <th className="text-left px-4 py-3 font-medium w-20">编号</th>
                  <th className="text-left px-4 py-3 font-medium">楼层/区域</th>
                  <th className="text-left px-4 py-3 font-medium">类型</th>
                  <th className="text-left px-4 py-3 font-medium">名称</th>
                  <th className="text-left px-4 py-3 font-medium w-40">设计位置 (m)</th>
                  <th className="text-left px-4 py-3 font-medium w-28">尺寸</th>
                  <th className="text-left px-4 py-3 font-medium w-20">风险</th>
                  <th className="text-left px-4 py-3 font-medium w-24">施工状态</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map((g) => g.signs.map((s, idx) => {
                  const tpl = SIGN_TEMPLATES[s.type];
                  const sw = warnings.filter((w: ComplianceWarning) => w.signId === s.id);
                  const rec = scheme.constructionRecords[s.id];
                  const statusLabel: Record<string, string> = { pending: '未领料', picked: '已领料', installed: '已安装', verified: '已验收' };
                  return (
                    <tr key={s.id} className="border-t border-surface-3 hover:bg-surface/60">
                      <td className="px-4 py-2.5 font-mono text-xs text-brand-600">{g.floor}-{String(idx + 1).padStart(3, '0')}</td>
                      <td className="px-4 py-2.5">{g.floor}F / {s.zone}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm" style={{ background: tpl.color }} />
                          {tpl.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">{s.name}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-surface-muted">
                        {s.position.x.toFixed(1)}, {s.position.y.toFixed(1)}, {s.position.z.toFixed(1)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs">{s.width}×{s.height}</td>
                      <td className="px-4 py-2.5">
                        {sw.length === 0 ? (
                          <span className="app-chip bg-success-500/10 text-success-600 border-success-500/30">✓ 通过</span>
                        ) : sw.some((w: ComplianceWarning) => w.level === 'error') ? (
                          <span className="app-chip warn-error">{sw.length}严</span>
                        ) : (
                          <span className="app-chip warn-warning">{sw.length}警</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`status-badge status-${rec?.status || 'pending'}`}>{statusLabel[rec?.status || 'pending']}</span>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'warnings' && (
          <div className="app-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-accent-400 text-white text-xs">
                <tr>
                  <th className="text-left px-4 py-3 font-medium w-16">#</th>
                  <th className="text-left px-4 py-3 font-medium w-24">等级</th>
                  <th className="text-left px-4 py-3 font-medium w-32">类别</th>
                  <th className="text-left px-4 py-3 font-medium w-36">标牌ID</th>
                  <th className="text-left px-4 py-3 font-medium">问题描述</th>
                  <th className="text-left px-4 py-3 font-medium">整改建议</th>
                  <th className="text-left px-4 py-3 font-medium w-28">当前值/阈值</th>
                </tr>
              </thead>
              <tbody>
                {warnings.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-surface-muted">暂无合规问题</td></tr>
                ) : warnings.map((w: ComplianceWarning, i) => (
                  <tr key={w.id} className={`border-t border-surface-3 ${w.level === 'error' ? 'bg-danger-500/5' : ''}`}>
                    <td className="px-4 py-2.5 text-surface-muted font-mono">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <span className={`app-chip border ${w.level === 'error' ? 'warn-error' : w.level === 'warning' ? 'warn-warning' : 'warn-info'}`}>
                        {w.level === 'error' ? '严重' : w.level === 'warning' ? '警告' : '提示'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {({ height: '高度', orientation: '朝向', fire_hydrant: '消防栓', occlusion: '遮挡', corner_view: '转角视距', accessible_path: '无障碍' } as any)[w.category] || w.category}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-brand-600">{w.signId}</td>
                    <td className="px-4 py-2.5">{w.message}</td>
                    <td className="px-4 py-2.5 text-surface-muted">{w.suggestion}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {w.value !== undefined && w.threshold !== undefined ? `${w.value.toFixed(2)} / ${w.threshold}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'picking' && (
          <div className="app-card p-5">
            <div className="panel-title mb-4">按楼层·区域·类型·材质 领料汇总</div>
            <PickingList scheme={scheme} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="app-card p-4 flex items-center gap-3">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} text-white flex items-center justify-center shadow-sm`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold text-surface-strong leading-none">{value}</div>
        <div className="text-xs text-surface-muted mt-1">{label}</div>
      </div>
    </div>
  );
}

function PickingList({ scheme }: { scheme: any }) {
  const pick: Record<string, { floor: number; zone: string; type: string; material: string; count: number }> = {};
  FLOOR_LIST.forEach((f) => {
    (scheme.signs[f] || []).forEach((s: any) => {
      const k = `${f}|${s.zone}|${s.type}|${s.material}`;
      if (!pick[k]) pick[k] = { floor: f, zone: s.zone, type: s.type, material: s.material, count: 0 };
      pick[k].count++;
    });
  });
  const list = Object.values(pick).sort((a, b) => a.floor - b.floor || a.zone.localeCompare(b.zone));
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {list.map((it, i) => {
        const tpl = SIGN_TEMPLATES[it.type as keyof typeof SIGN_TEMPLATES];
        const matMap: Record<string, string> = { acrylic: '亚克力', metal: '金属', pvc: 'PVC' };
        return (
          <div key={i} className="border border-surface-3 rounded-xl p-4 bg-surface/40 hover:bg-white hover:shadow-card transition">
            <div className="flex items-start gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-white shadow-sm" style={{ background: tpl.color }}>
                <span className="font-bold">{tpl.label[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[11px] app-chip bg-brand-50 text-brand-700 border-brand-200">{it.floor}F</span>
                  <span className="text-[11px] app-chip bg-info-500/10 text-info-600 border-info-500/30">{it.zone}</span>
                </div>
                <div className="font-semibold text-sm text-surface-strong">{tpl.label}</div>
                <div className="text-[11px] text-surface-muted">材质: {matMap[it.material]} · {tpl.defaultWidth}×{tpl.defaultHeight}m</div>
              </div>
              <div className="text-2xl font-bold text-brand-700 font-mono">×{it.count}</div>
            </div>
            <div className="text-xs text-surface-muted bg-white rounded-md px-2.5 py-1.5 border border-surface-3">
              需领料 <span className="font-semibold text-brand-700">{it.count}</span> 块
            </div>
          </div>
        );
      })}
    </div>
  );
}
