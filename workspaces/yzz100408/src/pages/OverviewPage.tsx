import { useMemo } from 'react';
import { useAnalysisStore } from '@/store';
import { getTopPeakHours } from '@/engine/metrics';
import WaitHeatmap from '@/components/charts/WaitHeatmap';
import QueueLineChart from '@/components/charts/QueueLineChart';
import UtilizationStackedBar from '@/components/charts/UtilizationStackedBar';
import { Clock, Users, Zap, AlertTriangle } from 'lucide-react';
import { formatMinutes } from '@/utils/date';
import { formatNumber, formatPercent } from '@/utils/format';

export default function OverviewPage() {
  const {
    hourlyMetrics, aggregatedMetrics, queueRecords, prices,
    gunIds, orders, attribution, faults, filters,
  } = useAnalysisStore();

  const topPeaks = useMemo(() => getTopPeakHours(aggregatedMetrics, 3), [aggregatedMetrics]);

  const stats = useMemo(() => {
    const valid = aggregatedMetrics.filter(m => m.orderCount > 0);
    const totalOrders = valid.reduce((a, b) => a + b.orderCount, 0);
    const avgWait = valid.length > 0
      ? valid.reduce((a, b) => a + b.avgWaitMinutes * b.orderCount, 0) / Math.max(1, totalOrders)
      : 0;
    const maxWait = valid.length > 0 ? Math.max(...valid.map(m => m.maxWaitMinutes)) : 0;
    const avgUtil = valid.length > 0
      ? valid.reduce((a, b) => a + b.utilizationRate, 0) / valid.length
      : 0;
    return { totalOrders, avgWait, maxWait, avgUtil };
  }, [aggregatedMetrics]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-slate">排队峰谷总览</h1>
          <p className="text-sm text-neutral-slate-dark mt-1 font-mono">
            {filters.selectedDate} · 节假日充电运行分析
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip">全站 {gunIds.length} 枪位</span>
          <span className="chip chip-active">实时分析</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: Clock, label: '平均等待', value: formatMinutes(Math.round(stats.avgWait)), accent: 'electric-green' },
          { icon: AlertTriangle, label: '最长等待', value: formatMinutes(stats.maxWait), accent: 'warning-orange' },
          { icon: Zap, label: '平均利用率', value: formatPercent(stats.avgUtil), accent: 'warning-yellow' },
          { icon: Users, label: '处理订单', value: formatNumber(stats.totalOrders, 0) + ' 笔', accent: 'electric-green' },
        ].map((s, i) => (
          <div key={i} className="card-accent" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="stat-label">{s.label}</div>
                <div className={`stat-value mt-2 text-${s.accent}`}>{s.value}</div>
              </div>
              <div className={`w-9 h-9 rounded-sm bg-${s.accent}/10 flex items-center justify-center`}>
                <s.icon className={`w-4.5 h-4.5 text-${s.accent}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">排队车辆数变化</h2>
          <div className="flex items-center gap-3">
            {attribution && (
              <span className="chip text-warning-orange">
                故障影响 {attribution.faultImpact.totalAffectedOrders} 笔订单
              </span>
            )}
            <span className="chip">{faults.length} 起设备故障</span>
          </div>
        </div>
        <QueueLineChart
          queueRecords={queueRecords}
          prices={prices}
          targetDate={filters.selectedDate}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 card">
          <h2 className="section-title mb-4">等待时长热力图（枪位 × 小时）</h2>
          <WaitHeatmap metrics={hourlyMetrics} gunIds={gunIds} />
        </div>

        <div className="card card-warning">
          <h2 className="section-title mb-4">
            <AlertTriangle className="w-4 h-4 text-warning-orange" />
            最堵 TOP 3 时段
          </h2>
          <div className="space-y-3">
            {topPeaks.map((m, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-sm bg-warning-orange/20 text-warning-orange text-xs font-mono flex items-center justify-center font-semibold">
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-sm font-mono text-neutral-slate">{m.hour}:00 — {m.hour + 1}:00</div>
                    <div className="text-[10px] font-mono text-neutral-slate-dark">{m.orderCount} 笔订单</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-warning-orange font-semibold">
                    {formatMinutes(Math.round(m.avgWaitMinutes))}
                  </div>
                  <div className="text-[10px] font-mono text-neutral-slate-dark">
                    平均排队 {m.queueLengthAvg.toFixed(0)} 辆
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="divider" />

          <div className="text-[11px] text-neutral-slate-dark leading-relaxed">
            <p className="mb-2">💡 <strong className="text-neutral-slate">提示</strong></p>
            <p>节假日 {topPeaks[0]?.hour || 10}:00 前后为全站最拥堵时段，建议提前排班并准备分流预案。</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title mb-4">枪位利用率（空闲 / 充电 / 故障）</h2>
        <UtilizationStackedBar metrics={hourlyMetrics} gunIds={gunIds} />
        {orders.filter(o => o.crossDay).length > 0 && (
          <div className="mt-4 text-[11px] font-mono text-neutral-slate-dark">
            * 已处理 {orders.filter(o => o.crossDay).length} 笔跨天订单，按时间比例拆分至对应日期
          </div>
        )}
        {orders.filter(o => o.leftEarly).length > 0 && (
          <div className="text-[11px] font-mono text-warning-orange mt-1">
            ⚠ 检测到 {orders.filter(o => o.leftEarly).length} 笔车辆提前离开，可能与等待过久有关
          </div>
        )}
      </div>
    </div>
  );
}
