import { useMemo, useState } from 'react';
import {
  Printer,
  Download,
  BarChart3,
  FileText,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAppStore } from '@/store';
import {
  todayISO,
  formatDateFull,
  formatTimeRange,
  downloadCSV,
  openPrintWindow,
  addDays,
  formatDate,
} from '@/utils';

export default function Reports() {
  const species = useAppStore((s) => s.species);
  const feeds = useAppStore((s) => s.feeds);
  const keepers = useAppStore((s) => s.keepers);
  const guides = useAppStore((s) => s.guides);
  const exhibits = useAppStore((s) => s.exhibits);
  const sessions = useAppStore((s) => s.feedingSessions);

  const [reportDate, setReportDate] = useState(todayISO());

  const spMap = useMemo(() => Object.fromEntries(species.map((s) => [s.id, s])), [species]);
  const fdMap = useMemo(() => Object.fromEntries(feeds.map((f) => [f.id, f])), [feeds]);
  const kpMap = useMemo(() => Object.fromEntries(keepers.map((k) => [k.id, k])), [keepers]);
  const gdMap = useMemo(() => Object.fromEntries(guides.map((g) => [g.id, g])), [guides]);
  const exMap = useMemo(() => Object.fromEntries(exhibits.map((e) => [e.id, e])), [exhibits]);

  const daySessions = useMemo(
    () =>
      sessions
        .filter((s) => s.date === reportDate && s.status !== 'cancelled')
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [sessions, reportDate],
  );

  const visitorVisible = useMemo(
    () => daySessions.filter((s) => s.isVisitorVisible),
    [daySessions],
  );

  const weekData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(todayISO(), -6 + i));
    const bySpecies: Record<string, Record<string, number>> = {};
    for (const d of days) {
      for (const sp of species) {
        bySpecies[sp.id] = bySpecies[sp.id] || {};
        bySpecies[sp.id][d] = 0;
      }
    }
    for (const s of sessions) {
      if (s.status === 'cancelled') continue;
      if (bySpecies[s.speciesId] && bySpecies[s.speciesId][s.date] !== undefined) {
        bySpecies[s.speciesId][s.date] += s.feedAmountGrams;
      }
    }
    return days.map((d) => {
      const row: any = { date: formatDate(d) };
      for (const sp of species) {
        row[sp.name] = bySpecies[sp.id][d];
      }
      return row;
    });
  }, [sessions, species]);

  const handlePrintFeedingList = () => {
    const byExhibit: Record<string, typeof daySessions> = {};
    for (const s of daySessions) {
      (byExhibit[s.exhibitId] = byExhibit[s.exhibitId] || []).push(s);
    }
    let body = `<h1>早班投喂清单</h1>
      <div class="meta">日期：${formatDateFull(reportDate)} · 共 ${daySessions.length} 场</div>`;
    for (const exId of Object.keys(byExhibit)) {
      body += `<h2>${exMap[exId]?.name || exId}</h2>
        <table>
          <thead><tr><th>时间</th><th>物种</th><th>饲料</th><th>用量</th><th>饲养员</th><th>讲解员</th><th>游客可见</th></tr></thead>
          <tbody>`;
      for (const s of byExhibit[exId]) {
        const sp = spMap[s.speciesId];
        const fd = fdMap[s.feedId];
        body += `<tr>
          <td>${formatTimeRange(s.startTime, s.endTime)}</td>
          <td>${sp?.emoji || ''} ${sp?.name || ''}</td>
          <td>${fd?.name || ''}</td>
          <td>${s.feedAmountGrams}${fd?.unit || 'g'}</td>
          <td>${kpMap[s.keeperId]?.name || ''}</td>
          <td>${gdMap[s.guideId || '']?.name || '-'}</td>
          <td>${s.isVisitorVisible ? '是' : '否'}</td>
        </tr>`;
      }
      body += '</tbody></table>';
    }
    if (daySessions.length === 0) body += '<p>当日暂无投喂安排。</p>';
    openPrintWindow(`投喂清单-${reportDate}`, body);
  };

  const handleExportGuideCSV = () => {
    const rows: (string | number)[][] = [
      ['日期', '时间', '展区', '物种', '饲料', '投喂量', '饲养员', '讲解员', '游客可见', '状态', '备注（海报场次引用）'],
    ];
    for (const s of visitorVisible) {
      const sp = spMap[s.speciesId];
      const fd = fdMap[s.feedId];
      rows.push([
        s.date,
        formatTimeRange(s.startTime, s.endTime),
        exMap[s.exhibitId]?.name || '',
        `${sp?.emoji || ''} ${sp?.name || ''}`,
        fd?.name || '',
        `${s.feedAmountGrams}${fd?.unit || 'g'}`,
        kpMap[s.keeperId]?.name || '',
        gdMap[s.guideId || '']?.name || '',
        '是',
        s.status === 'completed' ? '已完成' : '已排期',
        `${exMap[s.exhibitId]?.name || ''} ${s.startTime} ${sp?.name || ''}喂食讲解`,
      ]);
    }
    downloadCSV(`讲解安排-${reportDate}.csv`, rows);
  };

  const handleExportAllSessionsCSV = () => {
    const rows: (string | number)[][] = [
      ['日期', '时间', '展区', '物种', '饲料', '投喂量', '饲养员', '讲解员', '游客可见', '状态'],
    ];
    for (const s of daySessions) {
      const sp = spMap[s.speciesId];
      const fd = fdMap[s.feedId];
      rows.push([
        s.date,
        formatTimeRange(s.startTime, s.endTime),
        exMap[s.exhibitId]?.name || '',
        `${sp?.emoji || ''} ${sp?.name || ''}`,
        fd?.name || '',
        `${s.feedAmountGrams}${fd?.unit || 'g'}`,
        kpMap[s.keeperId]?.name || '',
        gdMap[s.guideId || '']?.name || '-',
        s.isVisitorVisible ? '是' : '否',
        s.status === 'completed' ? '已完成' : s.status === 'cancelled' ? '已取消' : '已排期',
      ]);
    }
    downloadCSV(`当日排班-${reportDate}.csv`, rows);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-ocean-900">报表输出</h2>
          <p className="text-sm text-ocean-600 mt-1">打印投喂清单、导出讲解安排、查看一周投喂量趋势</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-ocean-500" />
          <label className="label !mb-0">报表日期</label>
          <input
            type="date"
            className="input !w-auto"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-ocean-100 text-ocean-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="section-title text-base">早班投喂清单</div>
              <div className="text-xs text-ocean-500">打印当日所有投喂安排</div>
            </div>
          </div>
          <div className="text-3xl font-display text-ocean-900 my-3">{daySessions.length}</div>
          <p className="text-xs text-ocean-500 mb-3">当日投喂场次 · 按展区分组</p>
          <button className="btn-primary w-full" onClick={handlePrintFeedingList}>
            <Printer className="w-4 h-4" /> 打印投喂清单
          </button>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-aqua-100 text-aqua-700 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="section-title text-base">当日讲解安排</div>
              <div className="text-xs text-ocean-500">导出游客可见场次（海报引用）</div>
            </div>
          </div>
          <div className="text-3xl font-display text-ocean-900 my-3">{visitorVisible.length}</div>
          <p className="text-xs text-ocean-500 mb-3">游客可见场次 · 含海报引用文案</p>
          <button className="btn-secondary w-full" onClick={handleExportGuideCSV}>
            <Download className="w-4 h-4" /> 导出讲解 CSV
          </button>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-coral-100 text-coral-700 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="section-title text-base">当日全量排班</div>
              <div className="text-xs text-ocean-500">导出当日全部场次（含后台）</div>
            </div>
          </div>
          <div className="text-3xl font-display text-ocean-900 my-3">{daySessions.length}</div>
          <p className="text-xs text-ocean-500 mb-3">含后台操作场次</p>
          <button className="btn-secondary w-full" onClick={handleExportAllSessionsCSV}>
            <Download className="w-4 h-4" /> 导出全量 CSV
          </button>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-ocean-600" />
            <h3 className="section-title">近 7 天投喂量统计（按物种）</h3>
          </div>
          <span className="text-xs text-ocean-500">饲养主管视图 · 单位：克</span>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#334155' }} stroke="#cbd5e1" />
              <YAxis tick={{ fontSize: 12, fill: '#334155' }} stroke="#cbd5e1" />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(10,37,64,0.08)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {species.map((sp, i) => {
                const palette = ['#2DD4BF', '#2d8eff', '#FF6B4A', '#f59e0b', '#8b5cf6', '#0A2540'];
                return (
                  <Bar
                    key={sp.id}
                    dataKey={sp.name}
                    stackId="a"
                    fill={palette[i % palette.length]}
                    radius={[4, 4, 0, 0]}
                  />
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="section-title mb-4">当日讲解安排（海报引用预览）</h3>
        {visitorVisible.length === 0 ? (
          <div className="text-sm text-ocean-500 py-8 text-center">当日无游客可见场次</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {visitorVisible.map((s) => {
              const sp = spMap[s.speciesId];
              const ex = exMap[s.exhibitId];
              const gd = gdMap[s.guideId || ''];
              const kp = kpMap[s.keeperId];
              return (
                <div
                  key={s.id}
                  className="p-4 rounded-xl border border-ocean-100 bg-gradient-to-br from-ocean-50/60 to-white"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{sp?.emoji}</div>
                    <div className="flex-1">
                      <div className="font-display text-lg text-ocean-900">{sp?.name}喂食讲解</div>
                      <div className="text-xs text-ocean-500">{ex?.name} · 讲解员 {gd?.name || '待安排'}</div>
                    </div>
                    <span className="badge-success">{formatTimeRange(s.startTime, s.endTime)}</span>
                  </div>
                  <div className="mt-3 p-3 rounded-lg bg-white border border-ocean-100 text-xs text-ocean-700">
                    📢 海报引用文案：<span className="font-medium text-ocean-900">
                      「{s.date} {s.startTime} {ex?.name} · {sp?.name}喂食秀」与饲养员 {kp?.name} 一起探索海洋奥秘
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
