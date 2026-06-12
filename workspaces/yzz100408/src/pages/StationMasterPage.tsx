import { useMemo } from 'react';
import { useAnalysisStore } from '@/store';
import { Users, AlertTriangle, Calendar, Clock, UserPlus, Zap } from 'lucide-react';
import { formatMinutes, formatHourLabel, getHourOfDay, getDateMinutes } from '@/utils/date';
import { getPeakLevelLabel, getPeakLevelColor } from '@/utils/format';

export default function StationMasterPage() {
  const { shiftRecommendations, faults, hourlyMetrics, gunIds, filters } = useAnalysisStore();

  const staffStats = useMemo(() => {
    const totalHours = shiftRecommendations.filter(s => s.recommendedStaff > 0).length;
    const totalStaffHours = shiftRecommendations.reduce((a, b) => a + b.recommendedStaff, 0);
    const peakHours = shiftRecommendations.filter(s => s.peakLevel === 'critical' || s.peakLevel === 'high').length;
    const maxStaff = Math.max(...shiftRecommendations.map(s => s.recommendedStaff), 0);
    return { totalHours, totalStaffHours, peakHours, maxStaff };
  }, [shiftRecommendations]);

  const suggestedGuns = useMemo(() => {
    const criticalHours = shiftRecommendations.filter(s => s.peakLevel === 'critical' || s.peakLevel === 'high');
    if (criticalHours.length === 0) return { count: gunIds.length, note: '正常开放全部枪位' };
    return {
      count: gunIds.length,
      note: `${criticalHours[0].hour}:00-${criticalHours[criticalHours.length - 1].hour + 1}:00 确保全部枪位可用`,
    };
  }, [shiftRecommendations, gunIds]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-slate">站长调班视图</h1>
          <p className="text-sm text-neutral-slate-dark mt-1 font-mono">
            {filters.selectedDate} · 排班建议与高峰预警
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-electric-green" />
          <span className="chip chip-active">节假日排班模式</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {[
          { icon: Users, label: '在岗总工时', value: `${staffStats.totalStaffHours} 人·时`, accent: 'electric-green' },
          { icon: UserPlus, label: '高峰人数', value: `${staffStats.maxStaff} 人`, accent: 'warning-orange' },
          { icon: AlertTriangle, label: '高峰/极峰时段', value: `${staffStats.peakHours} 小时`, accent: 'warning-yellow' },
          { icon: Zap, label: '可用枪位', value: `${gunIds.length - faults.length} / ${gunIds.length}`, accent: 'electric-green' },
          { icon: Clock, label: '覆盖时段', value: `${staffStats.totalHours} 小时`, accent: 'neutral-slate' },
        ].map((s, i) => (
          <div key={i} className="card-accent" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="stat-label">{s.label}</div>
                <div className={`stat-value mt-2 text-${s.accent} text-xl`}>{s.value}</div>
              </div>
              <div className={`w-9 h-9 rounded-sm bg-${s.accent}/10 flex items-center justify-center`}>
                <s.icon className={`w-4 h-4 text-${s.accent}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">
              <Calendar className="w-4 h-4" />
              24 小时排班推荐表
            </h2>
            <div className="flex items-center gap-2">
              <span className="chip text-[10px] bg-electric-green/10 text-electric-green border-electric-green/30">低峰</span>
              <span className="chip text-[10px] bg-warning-yellow/10 text-warning-yellow border-warning-yellow/30">平峰</span>
              <span className="chip text-[10px] bg-warning-orange/10 text-warning-orange border-warning-orange/30">高峰</span>
              <span className="chip text-[10px] bg-red-500/10 text-red-400 border-red-500/30">极峰</span>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header w-24">时段</th>
                  <th className="table-header w-28">峰谷等级</th>
                  <th className="table-header w-24">推荐人数</th>
                  <th className="table-header w-28">预估排队</th>
                  <th className="table-header w-28">平均等待</th>
                  <th className="table-header">备注</th>
                </tr>
              </thead>
              <tbody>
                {shiftRecommendations.map((s, i) => {
                  const hasNote = !!s.notes;
                  return (
                    <tr
                      key={i}
                      className={`border-b border-white/5 transition-colors hover:bg-white/[0.02] ${
                        s.peakLevel === 'critical' ? 'bg-warning-orange/[0.04] breathing' : ''
                      }`}
                    >
                      <td className="table-cell font-mono text-neutral-slate">
                        {formatHourLabel(s.hour)} — {formatHourLabel(s.hour + 1)}
                      </td>
                      <td className="table-cell">
                        <span className={`chip ${getPeakLevelColor(s.peakLevel)} text-[10px]`}>
                          {getPeakLevelLabel(s.peakLevel)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1.5">
                          {Array.from({ length: s.recommendedStaff }).map((_, j) => (
                            <div key={j} className="w-2.5 h-5 rounded-sm bg-electric-green/70" />
                          ))}
                          {Array.from({ length: Math.max(0, 4 - s.recommendedStaff) }).map((_, j) => (
                            <div key={`e${j}`} className="w-2.5 h-5 rounded-sm bg-white/10" />
                          ))}
                          <span className="ml-1 text-sm font-mono text-neutral-slate">×{s.recommendedStaff}</span>
                        </div>
                      </td>
                      <td className="table-cell font-mono text-neutral-slate">{s.expectedQueueLength} 辆</td>
                      <td className={`table-cell font-mono ${s.avgWaitMinutes > 30 ? 'text-warning-orange' : 'text-neutral-slate'}`}>
                        {formatMinutes(Math.round(s.avgWaitMinutes))}
                      </td>
                      <td className="table-cell text-xs text-neutral-slate-dark">
                        {s.notes || (hasNote ? s.notes : '—')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card card-warning">
            <h2 className="section-title text-warning-orange mb-4">
              <AlertTriangle className="w-4 h-4" />
              高峰预警时段
            </h2>
            <div className="space-y-2">
              {shiftRecommendations.filter(s => s.peakLevel === 'critical' || s.peakLevel === 'high').map(s => (
                <div key={s.hour} className="flex items-center justify-between py-2 px-3 bg-warning-orange/5 rounded-sm border border-warning-orange/20">
                  <div>
                    <div className="text-sm font-mono text-neutral-slate">
                      {formatHourLabel(s.hour)} — {formatHourLabel(s.hour + 1)}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-slate-dark">
                      预计 {s.expectedQueueLength} 辆排队
                    </div>
                  </div>
                  <span className="text-warning-orange font-mono text-sm font-semibold">
                    {getPeakLevelLabel(s.peakLevel)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="section-title mb-4">
              <Zap className="w-4 h-4" />
              枪位分配建议
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-slate-dark">建议开放枪位</span>
                <span className="text-lg font-mono text-electric-green font-semibold">
                  {suggestedGuns.count} / {gunIds.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {gunIds.map(g => {
                  const hasFault = faults.some(f => f.gunId === g);
                  return (
                    <span
                      key={g}
                      className={`chip ${hasFault ? 'text-warning-orange border-warning-orange/30 bg-warning-orange/10' : 'chip-active'}`}
                    >
                      {g} {hasFault && '⚠'}
                    </span>
                  );
                })}
              </div>
              <div className="divider" />
              <p className="text-[11px] text-neutral-slate-dark leading-relaxed">{suggestedGuns.note}</p>
            </div>
          </div>

          <div className="card card-info">
            <h2 className="section-title text-warning-yellow mb-3">现场操作提示</h2>
            <ul className="space-y-2 text-xs text-neutral-slate leading-relaxed">
              <li>• 高峰时段提前 30 分钟到岗，完成枪位检查</li>
              <li>• 排队超过 15 辆时启动临时引导流程</li>
              <li>• 重点巡视 G03、G05 等故障枪位恢复情况</li>
              <li>• 谷段（0-6点、22-24点）可安排 1 人值班</li>
            </ul>
          </div>
        </div>
      </div>

      {faults.length > 0 && (
        <div className="card card-warning">
          <h2 className="section-title text-warning-orange mb-4">
            <AlertTriangle className="w-4 h-4" />
            今日设备故障记录（影响排班）
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {faults.map(f => (
              <div key={f.faultId} className="p-4 bg-white/[0.03] rounded-sm border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="chip text-warning-orange border-warning-orange/30 font-semibold">{f.gunId}</span>
                  <span className="text-sm text-neutral-slate">{f.faultType}</span>
                </div>
                <div className="text-xs font-mono text-neutral-slate-dark">
                  {formatHourLabel(getHourOfDay(f.faultStartTime))}:{String(getDateMinutes(f.faultStartTime)).padStart(2, '0')}
                  {' → '}
                  {formatHourLabel(getHourOfDay(f.faultEndTime))}:{String(getDateMinutes(f.faultEndTime)).padStart(2, '0')}
                </div>
                <div className="text-[11px] text-warning-orange mt-1">
                  持续 {formatMinutes(f.faultDurationMinutes)}
                  {f.mergedFromMultiple && ' · 合并多次重复故障'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
