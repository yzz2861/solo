import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Map,
  TrendingUp,
  Table,
  AlertTriangle,
  Droplets,
  CloudRain,
  Filter,
  Search,
  ArrowRight,
  BarChart3,
  Activity,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from 'recharts';
import { useWellStore } from '@/store/useWellStore';
import {
  MergedRecord,
  RISK_LABEL,
  RiskLevel,
  INDICATOR_LABEL,
  INDICATOR_UNIT,
} from '@/types/well';
import { clsx } from 'clsx';

const RISK_COLOR_HEX: Record<RiskLevel, string> = {
  STOP: '#E8505B',
  RETEST: '#F4A259',
  OBSERVE: '#4CAF82',
};

const RISK_BG: Record<RiskLevel, string> = {
  STOP: 'bg-danger-500/15 border-danger-500/30 hover:bg-danger-500/25',
  RETEST: 'bg-warn-500/15 border-warn-500/30 hover:bg-warn-500/25',
  OBSERVE: 'bg-safe-500/15 border-safe-500/30 hover:bg-safe-500/25',
};

export default function OverviewPage() {
  const navigate = useNavigate();
  const {
    villages,
    mergedRecords,
    mergeStats,
    thresholds,
    getLatestPerWell,
    getVillageRiskCounts,
    getAdviceForRecord,
    updateCustomAdvice,
    hydrateFromStorage,
  } = useWellStore();

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  const [villageFilter, setVillageFilter] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | ''>('');
  const [search, setSearch] = useState('');

  const latestPerWell = useMemo(() => getLatestPerWell(villageFilter), [
    getLatestPerWell,
    villageFilter,
  ]);

  const filteredLatest = latestPerWell.filter((r) => {
    const matchRisk = !riskFilter || r.riskLevel === riskFilter;
    const matchSearch =
      !search ||
      r.wellCommonName.toLowerCase().includes(search.toLowerCase()) ||
      r.villageName.includes(search);
    return matchRisk && matchSearch;
  });

  const villageRiskList = useMemo(
    () =>
      villages.map((v) => ({
        village: v,
        counts: getVillageRiskCounts(v.id),
      })),
    [villages, getVillageRiskCounts],
  );

  const pieData = mergeStats
    ? [
        { name: RISK_LABEL.STOP, value: mergeStats.stopCount, color: RISK_COLOR_HEX.STOP },
        { name: RISK_LABEL.RETEST, value: mergeStats.retestCount, color: RISK_COLOR_HEX.RETEST },
        { name: RISK_LABEL.OBSERVE, value: mergeStats.observeCount, color: RISK_COLOR_HEX.OBSERVE },
      ]
    : [];

  type TrendRow = { date: string; STOP: number; RETEST: number; OBSERVE: number; 硝酸盐超标: number; 浊度超标: number; 菌落超标: number };
  const trendData = useMemo(() => {
    const byDate: Record<string, TrendRow> = {};
    mergedRecords.forEach((r) => {
      const d = r.sampleDate;
      if (!byDate[d]) {
        byDate[d] = { date: d, STOP: 0, RETEST: 0, OBSERVE: 0, 硝酸盐超标: 0, 浊度超标: 0, 菌落超标: 0 };
      }
      const o = byDate[d];
      o[r.riskLevel]++;
      if (r.exceeds.nitrate) o['硝酸盐超标']++;
      if (r.exceeds.turbidity) o['浊度超标']++;
      if (r.exceeds.coliform) o['菌落超标']++;
    });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [mergedRecords]);

  type AvgRow = { date: string; 硝酸盐: number; 浊度: number; 菌落: number; count: number };
  const indicatorTrend = useMemo(() => {
    const byDate: Record<string, AvgRow> = {};
    mergedRecords.forEach((r) => {
      if (r.missingLab) return;
      const d = r.sampleDate;
      if (!byDate[d]) {
        byDate[d] = { date: d, 硝酸盐: 0, 浊度: 0, 菌落: 0, count: 0 };
      }
      const o = byDate[d];
      o.硝酸盐 += isNaN(r.nitrateMgL) ? 0 : r.nitrateMgL;
      o.浊度 += isNaN(r.turbidityNtu) ? 0 : r.turbidityNtu;
      o.菌落 += isNaN(r.coliformCfu) ? 0 : r.coliformCfu / 10;
      o.count++;
    });
    return Object.values(byDate)
      .map((d: AvgRow) => ({
        date: d.date,
        硝酸盐: d.count ? +(d.硝酸盐 / d.count).toFixed(2) : 0,
        浊度: d.count ? +(d.浊度 / d.count).toFixed(2) : 0,
        菌落: d.count ? +(d.菌落 / d.count).toFixed(1) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [mergedRecords]);

  if (!mergeStats || mergedRecords.length === 0) {
    return (
      <div className="max-w-3xl mx-auto card text-center py-16 fade-in">
        <BarChart3 className="w-16 h-16 text-primary-200 mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-bold text-primary-700 mb-2">
          暂无合并数据
        </h2>
        <p className="text-primary-500 mb-6">
          请先在数据导入页上传化验、采样和反馈记录并执行合并分析
        </p>
        <button onClick={() => navigate('/')} className="btn-primary">
          前往数据导入页
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl font-black text-primary-800 tracking-tight flex items-center gap-3">
            <Map className="w-8 h-8 text-primary-500" />
            卫生院总览
          </h1>
          <p className="text-primary-600 mt-1.5 text-sm">
            各村水井风险分布、指标趋势与详细记录
          </p>
        </div>
        <button
          onClick={() => navigate('/village/all')}
          className="btn-warn shadow-lg shadow-warn-500/20"
        >
          查看村干部报告视图
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 stagger-children">
        {[
          { label: '覆盖水井', value: mergeStats.totalWells, sub: '口井', icon: <Droplets className="w-4 h-4" />, color: 'primary' },
          { label: '需停用', value: mergeStats.stopCount, sub: '立即排查', icon: <AlertTriangle className="w-4 h-4" />, color: 'danger' },
          { label: '需复检', value: mergeStats.retestCount, sub: '二次化验', icon: <Activity className="w-4 h-4" />, color: 'warn' },
          { label: '安全观察', value: mergeStats.observeCount, sub: '可正常饮用', icon: <TrendingUp className="w-4 h-4" />, color: 'safe' },
        ].map((s) => (
          <div
            key={s.label}
            className={clsx(
              'card-sm border',
              s.color === 'primary' && 'border-primary-200 bg-gradient-to-br from-primary-50 to-white',
              s.color === 'danger' && 'border-danger-200 bg-gradient-to-br from-danger-400/10 to-white',
              s.color === 'warn' && 'border-warn-200 bg-gradient-to-br from-warn-400/10 to-white',
              s.color === 'safe' && 'border-safe-200 bg-gradient-to-br from-safe-400/10 to-white',
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-primary-600">{s.label}</span>
              <span
                className={clsx(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  s.color === 'primary' && 'bg-primary-500 text-white',
                  s.color === 'danger' && 'bg-danger-500 text-white',
                  s.color === 'warn' && 'bg-warn-500 text-white',
                  s.color === 'safe' && 'bg-safe-500 text-white',
                )}
              >
                {s.icon}
              </span>
            </div>
            <div className="flex items-end gap-2">
              <div
                className={clsx(
                  'text-3xl font-black font-serif',
                  s.color === 'primary' && 'text-primary-700',
                  s.color === 'danger' && 'text-danger-600',
                  s.color === 'warn' && 'text-warn-600',
                  s.color === 'safe' && 'text-safe-600',
                )}
              >
                {s.value}
              </div>
              <div className="text-xs text-primary-500 pb-1.5">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card lg:col-span-2">
          <h3 className="section-title mb-4">
            <Map className="w-5 h-5 text-primary-500" />
            各村风险分布
          </h3>
          <div className="relative aspect-[16/9] bg-gradient-to-br from-primary-50/60 via-safe-400/5 to-paper rounded-xl overflow-hidden border border-primary-100">
            <div className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 20% 30%, #1E4E5F 2px, transparent 2px), radial-gradient(circle at 70% 60%, #1E4E5F 1px, transparent 1px), radial-gradient(circle at 45% 85%, #1E4E5F 1.5px, transparent 1.5px)',
                backgroundSize: '50px 50px, 40px 40px, 60px 60px',
              }}
            />
            {villageRiskList.map(({ village, counts }) => {
              const x = village.positionX ?? 30 + Math.random() * 40;
              const y = village.positionY ?? 20 + Math.random() * 60;
              const total = counts.STOP + counts.RETEST + counts.OBSERVE;
              const dominant: RiskLevel = counts.STOP > 0 ? 'STOP' : counts.RETEST > 0 ? 'RETEST' : 'OBSERVE';
              const size = 44 + Math.min(total, 8) * 6;
              return (
                <button
                  key={village.id}
                  onClick={() => setVillageFilter(village.id === villageFilter ? '' : village.id)}
                  className={clsx(
                    'absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-300 flex items-center justify-center shadow-lg',
                    RISK_BG[dominant],
                    villageFilter === village.id && 'ring-4 ring-primary-400/40 scale-110',
                  )}
                  style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
                >
                  <div className="text-center leading-tight px-1">
                    <div className="text-[11px] font-bold text-primary-800 whitespace-nowrap">
                      {village.name}
                    </div>
                    <div className="text-[10px] font-mono mt-0.5 text-primary-600">
                      {counts.STOP > 0 && (
                        <span className="text-danger-600 font-bold">{counts.STOP}停 </span>
                      )}
                      {counts.RETEST > 0 && (
                        <span className="text-warn-600 font-bold">{counts.RETEST}复 </span>
                      )}
                      {counts.OBSERVE > 0 && (
                        <span className="text-safe-600 font-bold">{counts.OBSERVE}安</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            <div className="absolute bottom-3 right-3 flex items-center gap-3 text-[11px] bg-white/80 backdrop-blur px-3 py-1.5 rounded-full shadow-card border border-primary-100">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-danger-500" /> 停用
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-warn-500" /> 复检
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-safe-500" /> 安全
              </span>
            </div>
          </div>
          <p className="text-xs text-primary-500 mt-3">
            点击村块可筛选下方表格，圆圈颜色代表最高风险等级
          </p>
        </div>

        <div className="card">
          <h3 className="section-title mb-4">
            <BarChart3 className="w-5 h-5 text-primary-500" />
            风险占比
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={4}
                strokeWidth={0}
              >
                {pieData.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {pieData.map((p) => (
              <div key={p.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.name}
                </span>
                <span className="font-bold font-serif">
                  {p.value}
                  <span className="text-xs text-primary-400 font-normal ml-1">
                    ({mergeStats ? Math.round((p.value / (mergeStats.totalRecords || 1)) * 100) : 0}%)
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="section-title mb-4">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            日均指标变化（均值）
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={indicatorTrend} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#E6EEF2" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#95A5A6" fontSize={11} />
              <YAxis stroke="#95A5A6" fontSize={11} />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #D9EAF0',
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={thresholds.nitrateStop / 1} stroke="#E8505B" strokeDasharray="4 2" label={{ value: '硝酸盐限值', fill: '#E8505B', fontSize: 10 }} />
              <Line type="monotone" dataKey="硝酸盐" stroke="#3C8AA3" strokeWidth={2.5} dot={{ fill: '#3C8AA3', r: 3 }} name="硝酸盐 (mg/L)" />
              <Line type="monotone" dataKey="浊度" stroke="#F4A259" strokeWidth={2.5} dot={{ fill: '#F4A259', r: 3 }} name="浊度 (NTU)" />
              <Line type="monotone" dataKey="菌落" stroke="#4CAF82" strokeWidth={2.5} dot={{ fill: '#4CAF82', r: 3 }} name="菌落/10 (CFU/mL)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="section-title mb-4">
            <Activity className="w-5 h-5 text-primary-500" />
            每日风险与超标数
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={trendData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#E6EEF2" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#95A5A6" fontSize={11} />
              <YAxis stroke="#95A5A6" fontSize={11} />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #D9EAF0',
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="硝酸盐超标" fill="#3C8AA3" radius={[4, 4, 0, 0]} />
              <Bar dataKey="浊度超标" fill="#F4A259" radius={[4, 4, 0, 0]} />
              <Bar dataKey="菌落超标" fill="#4CAF82" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-primary-100 flex flex-wrap items-center gap-3 justify-between bg-gradient-to-r from-primary-50 to-white">
          <h3 className="font-serif font-bold text-primary-800 text-lg flex items-center gap-2">
            <Table className="w-5 h-5 text-primary-500" />
            井况明细（最新一次检测）
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索井名/村"
                className="input pl-9 w-44 !py-1.5"
              />
            </div>
            <select
              value={villageFilter}
              onChange={(e) => setVillageFilter(e.target.value)}
              className="input w-36 !py-1.5"
            >
              <option value="">全部村</option>
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <div className="flex items-center bg-primary-50 rounded-md p-0.5 border border-primary-100">
              {(['', 'STOP', 'RETEST', 'OBSERVE'] as const).map((r) => (
                <button
                  key={r || 'all'}
                  onClick={() => setRiskFilter(r)}
                  className={clsx(
                    'px-3 py-1 rounded text-xs font-medium transition-colors',
                    riskFilter === r
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-primary-500 hover:text-primary-700',
                  )}
                >
                  {r ? RISK_LABEL[r] : '全部'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full min-w-[900px]">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="table-header">村</th>
                <th className="table-header">井俗称</th>
                <th className="table-header">检测日期</th>
                <th className="table-header">硝酸盐 (mg/L)</th>
                <th className="table-header">浊度 (NTU)</th>
                <th className="table-header">菌落 (CFU/mL)</th>
                <th className="table-header">标记</th>
                <th className="table-header">风险</th>
                <th className="table-header w-40">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredLatest.length === 0 && (
                <tr>
                  <td colSpan={9} className="table-cell text-center py-12 text-primary-400">
                    无符合条件的记录
                  </td>
                </tr>
              )}
              {filteredLatest.map((r) => (
                <RecordRow
                  key={r.id}
                  record={r}
                  thresholds={thresholds}
                  onOpenDetail={(id) => navigate(`/well/${id}`)}
                  onAdvice={(text) => updateCustomAdvice(r.id, text)}
                  getAdvice={getAdviceForRecord}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface RowProps {
  record: MergedRecord;
  thresholds: ReturnType<typeof useWellStore.getState>['thresholds'];
  onOpenDetail: (id: string) => void;
  onAdvice: (text: string) => void;
  getAdvice: (r: MergedRecord) => ReturnType<typeof useWellStore.getState>['getAdviceForRecord'] extends (r: MergedRecord) => infer R ? R : never;
}

function RecordRow({ record, thresholds, onOpenDetail, onAdvice, getAdvice }: RowProps) {
  const [showAdvice, setShowAdvice] = useState(false);
  const [adviceText, setAdviceText] = useState('');
  const cellVal = (v: number, lim: number, bound: number) => {
    if (isNaN(v)) return { text: '—', cls: '' };
    const cls = v >= lim ? 'text-danger-600 font-bold' : v >= bound ? 'text-warn-600 font-semibold' : 'text-ink';
    return { text: v.toFixed(2), cls };
  };
  const n = cellVal(record.nitrateMgL, thresholds.nitrateStop, thresholds.nitrateRetest);
  const t = cellVal(record.turbidityNtu, thresholds.turbidityStop, thresholds.turbidityRetest);
  const c = cellVal(record.coliformCfu, thresholds.coliformStop, thresholds.coliformRetest);

  return (
    <tr className="hover:bg-primary-50/40 transition-colors group">
      <td className="table-cell">
        <span className="badge badge-primary">{record.villageName}</span>
      </td>
      <td className="table-cell font-medium text-primary-800">
        {record.wellCommonName}
        <div className="text-[10px] text-primary-400 font-mono mt-0.5">
          {record.sample?.photoNo}
        </div>
      </td>
      <td className="table-cell font-mono text-xs text-primary-600">
        {record.sampleDate}
      </td>
      <td className={clsx('table-cell font-mono', n.cls)}>{n.text}</td>
      <td className={clsx('table-cell font-mono', t.cls)}>{t.text}</td>
      <td className={clsx('table-cell font-mono', c.cls)}>{c.text}</td>
      <td className="table-cell">
        <div className="flex flex-wrap gap-1">
          {record.postRain && (
            <span className="badge bg-primary-100 text-primary-600" title="雨后补采">
              <CloudRain className="w-3 h-3" /> 雨
            </span>
          )}
          {record.hasOdorFeedback && (
            <span className="badge bg-warn-400/15 text-warn-600" title="有异味反馈">
              异味
            </span>
          )}
          {record.missingSample && (
            <span className="badge bg-danger-400/10 text-danger-600">缺采样</span>
          )}
          {record.missingLab && (
            <span className="badge bg-danger-400/10 text-danger-600">缺化验</span>
          )}
          {record.sample?.note && (
            <span className="badge bg-primary-50 text-primary-500" title={record.sample.note}>
              备注
            </span>
          )}
        </div>
      </td>
      <td className="table-cell">
        <span
          className={clsx(
            'badge font-semibold',
            record.riskLevel === 'STOP' && 'badge-danger',
            record.riskLevel === 'RETEST' && 'badge-warn',
            record.riskLevel === 'OBSERVE' && 'badge-safe',
          )}
        >
          {RISK_LABEL[record.riskLevel]}
        </span>
      </td>
      <td className="table-cell">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenDetail(record.wellId)}
            className="text-primary-500 hover:text-primary-700 text-sm font-medium"
          >
            详情
          </button>
          <button
            onClick={() => {
              setAdviceText(record.customAdvice || getAdvice(record).finalText);
              setShowAdvice(true);
            }}
            className="text-warn-500 hover:text-warn-700 text-sm font-medium"
          >
            建议
          </button>
        </div>
        {showAdvice && (
          <div className="mt-2 p-3 rounded-md border border-warn-300 bg-warn-400/5 space-y-2">
            <textarea
              value={adviceText}
              onChange={(e) => setAdviceText(e.target.value)}
              rows={3}
              className="input text-sm"
              placeholder="编辑针对该井的个性化复检/停用建议"
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setShowAdvice(false)}
                className="text-xs text-primary-500 hover:text-primary-700"
              >
                取消
              </button>
              <button
                onClick={() => {
                  onAdvice(adviceText);
                  setShowAdvice(false);
                }}
                className="btn-warn !py-1 !px-3 text-xs"
              >
                保存建议
              </button>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}
