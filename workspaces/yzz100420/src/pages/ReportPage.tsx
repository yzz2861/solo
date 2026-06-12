import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  GraduationCap,
  User,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Flame,
  Timer,
  Snowflake,
  Gauge,
  Printer,
  FileJson,
  LineChart,
} from 'lucide-react';
import { useFiringStore } from '../store/firingStore';
import { generatePlainSummary } from '../utils/sampleData';
import SummaryStats from '../components/SummaryStats';
import { formatHours, formatTemp, formatTimestamp, segmentTypeNames, severityColors } from '../utils/curveCalc';
import { cn } from '../lib/utils';
import type { StudentWork } from '../types';

const gradeLabels: Record<string, { label: string; cls: string }> = {
  A: { label: '优秀', cls: 'bg-gradient-to-br from-emerald-400 to-green-600' },
  B: { label: '良好', cls: 'bg-gradient-to-br from-blue-400 to-indigo-500' },
  C: { label: '一般', cls: 'bg-gradient-to-br from-amber-400 to-orange-500' },
  D: { label: '待改进', cls: 'bg-gradient-to-br from-red-500 to-rose-700' },
};

const deviationLabels: Record<StudentWork['colorDeviation'], { label: string; cls: string; icon: string }> = {
  excellent: { label: '极佳', cls: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: '✨' },
  good: { label: '正常', cls: 'bg-blue-100 text-blue-700 border-blue-300', icon: '✅' },
  slight: { label: '微偏', cls: 'bg-amber-100 text-amber-700 border-amber-300', icon: '⚠️' },
  significant: { label: '明显偏差', cls: 'bg-orange-100 text-orange-700 border-orange-300', icon: '🔥' },
  failed: { label: '失败', cls: 'bg-red-100 text-red-700 border-red-300', icon: '❌' },
};

const ReportPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { records, viewMode, setViewMode, setCurrentRecord } = useFiringStore();
  const record = records.find((r) => r.id === id) || records[0];
  const [showStudentDetail, setShowStudentDetail] = useState<StudentWork | null>(null);

  const summary = useMemo(() => (record ? generatePlainSummary(record) : null), [record]);

  useMemo(() => {
    if (record) setCurrentRecord(record.id);
  }, [record, setCurrentRecord]);

  if (!record || !summary) {
    return (
      <div className="p-8 text-center">
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          返回首页
        </button>
      </div>
    );
  }

  const allWorks = record.batches.flatMap((b) => b.works);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            className="btn btn-ghost !p-2 !rounded-lg border border-kiln-200 hover:bg-white"
            onClick={() => navigate(`/analysis/${record.id}`)}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge bg-indigo-100 text-indigo-700 border-indigo-200">
                复盘报告
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-gradient-fire">
              {record.name}
            </h1>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 p-1 rounded-xl bg-kiln-100 border border-kiln-200">
            <button
              onClick={() => setViewMode('teacher')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                viewMode === 'teacher'
                  ? 'bg-white text-fire-700 shadow-sm'
                  : 'text-kiln-600 hover:text-kiln-800',
              )}
            >
              <GraduationCap className="w-4 h-4" />
              老师视图
            </button>
            <button
              onClick={() => setViewMode('student')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                viewMode === 'student'
                  ? 'bg-white text-fire-700 shadow-sm'
                  : 'text-kiln-600 hover:text-kiln-800',
              )}
            >
              <User className="w-4 h-4" />
              学生视图
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-secondary !py-1.5 !px-3 text-xs" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" />
              打印
            </button>
            <button className="btn btn-primary !py-1.5 !px-3 text-xs">
              <Download className="w-3.5 h-3.5" />
              导出报告
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'student' ? (
        <div className="space-y-6 animate-fade-in">
          <SummaryStats record={record} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="card p-6 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-emerald-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 text-white flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold text-emerald-800">做得好的 ✅</h3>
                  <p className="text-xs text-emerald-600">{summary.goodPoints.length} 项亮点</p>
                </div>
              </div>
              <div className="space-y-3">
                {summary.goodPoints.map((p, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/70 border border-emerald-100">
                    <div className="flex items-start gap-2">
                      <span className="text-xl leading-none">{p.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-emerald-800">{p.title}</p>
                        <p className="text-xs text-emerald-700/80 mt-0.5 leading-relaxed">{p.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-amber-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold text-amber-800">需要注意 ⚠️</h3>
                  <p className="text-xs text-amber-600">{summary.warnPoints.length} 项待改进</p>
                </div>
              </div>
              <div className="space-y-3">
                {summary.warnPoints.map((p, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/70 border border-amber-100">
                    <div className="flex items-start gap-2">
                      <span className="text-xl leading-none">{p.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-amber-800">{p.title}</p>
                        <p className="text-xs text-amber-700/80 mt-0.5 leading-relaxed">{p.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {summary.warnPoints.length === 0 && (
                  <div className="p-6 text-center text-amber-700/70">
                    本次烧成控制良好，无明显问题 🎉
                  </div>
                )}
              </div>
            </div>

            <div className="card p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-indigo-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 text-white flex items-center justify-center shadow-md">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold text-indigo-800">下次建议 💡</h3>
                  <p className="text-xs text-indigo-600">{summary.suggestions.length} 条建议</p>
                </div>
              </div>
              <div className="space-y-3">
                {summary.suggestions.map((p, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/70 border border-indigo-100">
                    <div className="flex items-start gap-2">
                      <span className="text-xl leading-none">{p.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-indigo-800">{p.title}</p>
                        <p className="text-xs text-indigo-700/80 mt-0.5 leading-relaxed">{p.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-display font-bold text-kiln-800 mb-4 flex items-center gap-2">
              <Gauge className="w-5 h-5 text-fire-500" />
              各段烧成评价（老师的打比方 👇）
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summary.segmentReviews.map((r) => {
                const Icon = r.type === 'heating' ? Flame : r.type === 'holding' ? Timer : Snowflake;
                const colors = {
                  heating: 'from-fire-50 to-orange-50 border-fire-100',
                  holding: 'from-amber-50 to-yellow-50 border-amber-100',
                  cooling: 'from-blue-50 to-sky-50 border-blue-100',
                };
                return (
                  <div
                    key={r.segmentId}
                    className={cn(
                      'p-4 rounded-2xl border bg-gradient-to-br relative overflow-hidden',
                      colors[r.type],
                    )}
                  >
                    <div className="absolute -right-4 -top-4 opacity-10">
                      <Icon className="w-24 h-24" />
                    </div>
                    <div className="relative flex items-start gap-4">
                      <div className="flex flex-col items-center gap-1">
                        <div className={cn('grade-ring w-11 h-11 text-lg grade-' + r.grade)}>
                          {r.grade}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-kiln-800">{r.segmentName}</span>
                          <span className="text-[10px] font-mono text-kiln-500">{r.keyMetrics}</span>
                        </div>
                        <p className="text-base font-bold font-display text-kiln-900 leading-tight mt-1">
                          "{r.title}"
                        </p>
                        <p className="text-xs text-kiln-600 mt-1.5 leading-relaxed">
                          {r.analogy}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {allWorks.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-display font-bold text-kiln-800 mb-4">你的作品釉色结果 🎨</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {allWorks.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => setShowStudentDetail(w)}
                    className="text-left p-4 rounded-xl bg-gradient-to-br from-white/80 to-clay-50 border border-kiln-100 hover:shadow-card hover:border-clay-300 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-kiln-500 font-medium">{w.studentName || '未署名'}</p>
                        <p className="text-sm font-bold text-kiln-800 truncate group-hover:text-fire-700 transition-colors">
                          {w.workName || '未命名作品'}
                        </p>
                      </div>
                      <span className={cn('badge text-[10px]', deviationLabels[w.colorDeviation].cls)}>
                        {deviationLabels[w.colorDeviation].icon} {deviationLabels[w.colorDeviation].label}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div>
                        <p className="text-[10px] text-kiln-400 uppercase">釉料</p>
                        <p className="text-xs font-medium text-kiln-700">{w.glaze.name || '—'}</p>
                      </div>
                      {w.actualColor && (
                        <div>
                          <p className="text-[10px] text-kiln-400 uppercase">实际釉色</p>
                          <p className="text-xs text-kiln-600 leading-snug line-clamp-2">{w.actualColor}</p>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showStudentDetail && (
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowStudentDetail(null)}
            >
              <div
                className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-5 bg-gradient-to-r from-fire-50 to-amber-50 border-b border-kiln-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-kiln-500 mb-0.5">{showStudentDetail.studentName}</p>
                      <h3 className="text-xl font-display font-bold text-kiln-800">
                        {showStudentDetail.workName}
                      </h3>
                    </div>
                    <span className={cn('badge text-xs', deviationLabels[showStudentDetail.colorDeviation].cls)}>
                      {deviationLabels[showStudentDetail.colorDeviation].icon}{' '}
                      {deviationLabels[showStudentDetail.colorDeviation].label}
                    </span>
                  </div>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scroll-container">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-clay-50 border border-clay-100">
                      <p className="text-[10px] font-semibold text-kiln-500 uppercase">釉料</p>
                      <p className="text-sm font-bold text-kiln-800 mt-0.5">
                        {showStudentDetail.glaze.name}
                      </p>
                      <p className="text-[10px] text-kiln-500 mt-0.5">
                        烧成温度 {showStudentDetail.glaze.firingTemp}℃
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-clay-50 border border-clay-100">
                      <p className="text-[10px] font-semibold text-kiln-500 uppercase">窑位</p>
                      <p className="text-sm font-bold text-kiln-800 mt-0.5">
                        {showStudentDetail.shelfPosition || '—'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                      <p className="text-[10px] font-semibold text-blue-600 uppercase">预期</p>
                      <p className="text-sm text-blue-800 mt-0.5">
                        {showStudentDetail.expectedColor || '—'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-fire-50 border border-fire-100">
                      <p className="text-[10px] font-semibold text-fire-600 uppercase">实际</p>
                      <p className="text-sm text-fire-800 mt-0.5">
                        {showStudentDetail.actualColor || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 via-white to-indigo-50 border border-amber-100">
                    <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5" />
                      老师点评 · 烧成影响分析
                    </p>
                    <p className="text-sm text-kiln-700 leading-relaxed">
                      {showStudentDetail.impactExplanation || '暂无详细点评'}
                    </p>
                  </div>

                  {showStudentDetail.notes && (
                    <div>
                      <p className="text-xs font-semibold text-kiln-600 mb-1">备注</p>
                      <p className="text-sm text-kiln-700">{showStudentDetail.notes}</p>
                    </div>
                  )}
                </div>
                <div className="px-6 py-4 border-t border-kiln-100 flex justify-end gap-2 bg-kiln-50">
                  <button className="btn btn-secondary" onClick={() => setShowStudentDetail(null)}>
                    关闭
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <SummaryStats record={record} />

          <div className="card overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-kiln-800 via-kiln-700 to-fire-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileJson className="w-5 h-5" />
                <h3 className="font-display font-bold">最大偏离点明细（原始数据追溯）</h3>
              </div>
              <span className="badge bg-white/20 border-white/30 text-white">
                {record.maxDeviation.length} 条高偏差记录
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-kiln-50 border-b border-kiln-100 text-[11px] text-kiln-600 uppercase font-semibold">
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">严重程度</th>
                    <th className="px-4 py-3 text-right">烧成时间</th>
                    <th className="px-4 py-3 text-right">绝对时间</th>
                    <th className="px-4 py-3 text-right">实际温度</th>
                    <th className="px-4 py-3 text-right">目标温度</th>
                    <th className="px-4 py-3 text-right">偏差值</th>
                    <th className="px-4 py-3 text-right">偏差率</th>
                  </tr>
                </thead>
                <tbody>
                  {record.maxDeviation.map((d, i) => (
                    <tr key={i} className="border-b border-kiln-50 hover:bg-fire-50/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-kiln-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-3">
                        <span className={`badge text-[10px] ${severityColors[d.severity]}`}>
                          {d.severity === 'high' ? 'HIGH 严重' : d.severity === 'medium' ? 'MED 中度' : 'LOW 轻微'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-fire-700 font-bold">
                        T+{d.timeHours.toFixed(2)}h
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-kiln-600">
                        {formatTimestamp(d.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-fire-700">
                        {formatTemp(d.actualTemp, record.unit)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">
                        {formatTemp(d.targetTemp, record.unit)}
                      </td>
                      <td
                        className={cn(
                          'px-4 py-3 text-right font-mono font-bold',
                          d.difference > 0 ? 'text-red-600' : 'text-blue-600',
                        )}
                      >
                        {d.difference > 0 ? '+' : ''}
                        {d.difference.toFixed(1)}℃
                      </td>
                      <td
                        className={cn(
                          'px-4 py-3 text-right font-mono font-bold',
                          d.percentage > 10 ? 'text-red-600' : d.percentage > 5 ? 'text-amber-600' : 'text-emerald-600',
                        )}
                      >
                        {d.percentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-kiln-100 bg-gradient-to-r from-fire-50 to-amber-50">
                <h3 className="font-display font-bold text-kiln-800 flex items-center gap-2">
                  <LineChart className="w-4 h-4 text-fire-600" />
                  分段参数总表
                </h3>
              </div>
              <div className="overflow-x-auto max-h-[480px] custom-scroll-container">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white shadow-sm z-10">
                    <tr className="bg-kiln-50 border-b border-kiln-100 text-[10.5px] text-kiln-600 uppercase font-semibold">
                      <th className="px-4 py-2.5 text-left">段 #</th>
                      <th className="px-4 py-2.5 text-left">类型</th>
                      <th className="px-4 py-2.5 text-right">评级</th>
                      <th className="px-4 py-2.5 text-right">温度区间</th>
                      <th className="px-4 py-2.5 text-right">时长</th>
                      <th className="px-4 py-2.5 text-right">速率</th>
                      <th className="px-4 py-2.5 text-right">平均偏差</th>
                      <th className="px-4 py-2.5 text-right">最大偏差</th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.segments.map((seg, i) => (
                      <tr key={seg.id} className="border-b border-kiln-50 hover:bg-kiln-50/60 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs text-kiln-500">{i + 1}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={cn(
                              'badge text-[10px]',
                              seg.type === 'heating' && 'bg-fire-100 text-fire-700 border-fire-200',
                              seg.type === 'holding' && 'bg-amber-100 text-amber-700 border-amber-200',
                              seg.type === 'cooling' && 'bg-blue-100 text-blue-700 border-blue-200',
                            )}
                          >
                            {segmentTypeNames[seg.type]}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={cn('inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white grade-' + (seg.grade || 'B'))}>
                            {seg.grade || 'B'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-kiln-700">
                          {seg.startTemp.toFixed(0)} → {seg.endTemp.toFixed(0)}℃
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-kiln-600">
                          {formatHours(seg.durationHours)}
                        </td>
                        <td
                          className={cn(
                            'px-4 py-2.5 text-right font-mono text-xs font-bold',
                            seg.rate > 0 ? 'text-fire-700' : seg.rate < 0 ? 'text-blue-700' : 'text-amber-700',
                          )}
                        >
                          {seg.rate > 0 ? '+' : ''}
                          {seg.rate.toFixed(0)}℃/h
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-kiln-700">
                          ±{seg.avgDeviation.toFixed(1)}℃
                        </td>
                        <td
                          className={cn(
                            'px-4 py-2.5 text-right font-mono text-xs font-bold',
                            Math.abs(seg.maxDeviationValue) > 30 ? 'text-red-600' : 'text-kiln-700',
                          )}
                        >
                          {seg.maxDeviationValue > 0 ? '+' : ''}
                          {seg.maxDeviationValue.toFixed(0)}℃
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-kiln-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                <h3 className="font-display font-bold text-kiln-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-indigo-600" />
                  特殊事件与操作日志
                </h3>
              </div>
              <div className="p-4 space-y-3 max-h-[480px] overflow-y-auto custom-scroll-container">
                {record.events.length === 0 ? (
                  <div className="p-8 text-center text-kiln-400">
                    <p className="text-sm">本次烧成未检测到特殊事件</p>
                  </div>
                ) : (
                  record.events.map((e, i) => (
                    <div
                      key={e.id}
                      className="p-4 rounded-xl border bg-gradient-to-br from-white/80 to-kiln-50/60 border-kiln-100 relative overflow-hidden"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 to-purple-500" />
                      <div className="pl-2">
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {e.type === 'log_gap' && '⚠️'}
                              {e.type === 'overnight' && '🌙'}
                              {e.type === 'lid_open' && '🚪'}
                              {e.type === 'manual_adjust' && '🎛️'}
                              {e.type === 'power_loss' && '⚡'}
                              {e.type === 'other' && '📍'}
                            </span>
                            <span className="text-sm font-bold text-kiln-800">{e.title}</span>
                            <span className="badge bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px]">
                              #{i + 1}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-indigo-600 font-bold">
                            T+{e.timeHours.toFixed(2)}h
                          </span>
                        </div>
                        <p className="text-xs text-kiln-600 font-mono mb-1.5">
                          {formatTimestamp(e.timestamp)}
                          {e.durationMinutes && ` · 持续 ${e.durationMinutes} 分钟`}
                        </p>
                        <p className="text-xs text-kiln-700 leading-relaxed bg-white/60 rounded-lg p-2.5 border border-kiln-50">
                          {e.description}
                        </p>
                        {e.params && (
                          <pre className="mt-2 p-2 rounded-lg bg-kiln-900/90 text-[10.5px] font-mono text-clay-100 overflow-x-auto">
                            {JSON.stringify(e.params, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportPage;
