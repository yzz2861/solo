import { useMemo } from 'react';
import { useAnalysisStore } from '@/store';
import { detectAnomalies } from '@/engine/attribution';
import { getTopPeakHours } from '@/engine/metrics';
import { FileBarChart, AlertTriangle, TrendingUp, MapPin, DollarSign, Users, CheckCircle2 } from 'lucide-react';
import { formatMinutes, formatHourLabel } from '@/utils/date';
import { formatNumber, formatPercent } from '@/utils/format';

export default function ReportPage() {
  const {
    aggregatedMetrics, attribution, faults, orders, filters,
    hourlyMetrics, prices, gunIds,
  } = useAnalysisStore();

  const anomalies = useMemo(() => {
    if (!attribution) return [];
    return detectAnomalies(aggregatedMetrics, attribution, faults);
  }, [aggregatedMetrics, attribution, faults]);

  const topPeaks = useMemo(() => getTopPeakHours(aggregatedMetrics, 3), [aggregatedMetrics]);

  const summaryStats = useMemo(() => {
    const totalOrders = orders.length;
    const crossDayOrders = orders.filter(o => o.crossDay).length;
    const leftEarlyOrders = orders.filter(o => o.leftEarly).length;
    const affectedByFault = orders.filter(o => o.affectedByFault).length;
    const avgWait = aggregatedMetrics.length > 0
      ? aggregatedMetrics.reduce((a, b) => a + b.avgWaitMinutes * b.orderCount, 0)
        / Math.max(1, aggregatedMetrics.reduce((a, b) => a + b.orderCount, 0))
      : 0;
    const maxWait = aggregatedMetrics.length > 0
      ? Math.max(...aggregatedMetrics.map(m => m.maxWaitMinutes))
      : 0;
    const avgUtil = aggregatedMetrics.length > 0
      ? aggregatedMetrics.reduce((a, b) => a + b.utilizationRate, 0) / aggregatedMetrics.length
      : 0;
    return { totalOrders, crossDayOrders, leftEarlyOrders, affectedByFault, avgWait, maxWait, avgUtil };
  }, [orders, aggregatedMetrics]);

  const diversionSuggestion = useMemo(() => {
    const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
    const faultImpact = attribution?.faultImpact.totalExtraWaitMinutes || 0;
    if (criticalCount >= 3 || faultImpact > 800) {
      return {
        needDiversion: true,
        level: '紧急',
        target: '距离 5km 的「京沪高速青县服务区站」',
        estimatedBenefit: '减少本站排队 35-45%，缩短平均等待约 20 分钟',
        cost: '预计引导 40-60 辆车，发放抵扣券成本约 ¥800-1200',
      };
    }
    if (criticalCount >= 1 || faultImpact > 300) {
      return {
        needDiversion: true,
        level: '建议',
        target: '距离 8km 的「京台高速沧州服务区站」',
        estimatedBenefit: '减少本站排队 20-30%，缩短平均等待约 12 分钟',
        cost: '预计引导 20-30 辆车，发放抵扣券成本约 ¥400-600',
      };
    }
    return {
      needDiversion: false,
      level: '无需',
      target: '',
      estimatedBenefit: '当前拥堵在正常范围内，无需分流',
      cost: '',
    };
  }, [anomalies, attribution]);

  const causeLabel: Record<string, string> = {
    fault: '设备故障为主',
    price: '价格因素驱动',
    traffic: '自然车流高峰',
    mixed: '故障+价格叠加',
  };

  if (!attribution) return null;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-slate">运营分析报告</h1>
          <p className="text-sm text-neutral-slate-dark mt-1 font-mono">
            {filters.selectedDate} · 节假日充电站运营决策报告
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FileBarChart className="w-4 h-4 text-electric-green" />
          <span className="chip chip-active">运营经理视图</span>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-4">
        {[
          { icon: Users, label: '订单总数', value: `${summaryStats.totalOrders}` },
          { icon: AlertTriangle, label: '平均等待', value: formatMinutes(Math.round(summaryStats.avgWait)), accent: true },
          { icon: TrendingUp, label: '最长等待', value: formatMinutes(summaryStats.maxWait), warn: true },
          { icon: DollarSign, label: '平均利用率', value: formatPercent(summaryStats.avgUtil) },
          { icon: FileBarChart, label: '异常时段', value: `${anomalies.length}` },
          { icon: CheckCircle2, label: '数据质量', value: summaryStats.crossDayOrders + summaryStats.leftEarlyOrders > 10 ? '待复核' : '良好' },
        ].map((s, i) => (
          <div key={i} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="stat-label">{s.label}</div>
                <div className={`stat-value mt-2 text-lg ${s.warn ? 'text-warning-orange' : s.accent ? 'text-warning-yellow' : 'text-electric-green'}`}>
                  {s.value}
                </div>
              </div>
              <div className="w-8 h-8 rounded-sm bg-white/5 flex items-center justify-center">
                <s.icon className="w-4 h-4 text-neutral-slate-dark" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 card">
          <h2 className="section-title mb-4">
            <AlertTriangle className="w-4 h-4" />
            异常拥堵时段分析
          </h2>
          {anomalies.length > 0 ? (
            <div className="space-y-3">
              {anomalies.map((a, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-sm border ${
                    a.severity === 'critical'
                      ? 'bg-warning-orange/10 border-warning-orange/30'
                      : 'bg-warning-yellow/10 border-warning-yellow/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`chip ${a.severity === 'critical' ? 'text-warning-orange border-warning-orange/40 bg-warning-orange/10' : 'text-warning-yellow border-warning-yellow/40 bg-warning-yellow/10'} font-semibold`}>
                        {a.severity === 'critical' ? '严重拥堵' : '中度拥堵'}
                      </span>
                      <span className="text-sm font-mono text-neutral-slate">
                        {formatHourLabel(a.startHour)} — {formatHourLabel(a.endHour)}
                      </span>
                    </div>
                    <span className="chip text-[10px]">{causeLabel[a.likelyCause]}</span>
                  </div>
                  <p className="text-xs text-neutral-slate">{a.description}</p>
                  <div className="mt-2 text-[11px] text-neutral-slate-dark">
                    可能原因：
                    {a.likelyCause === 'fault' && ' 该时段设备故障导致枪位减少，建议加强高峰前设备巡检。'}
                    {a.likelyCause === 'price' && ' 与峰段电价时段高度重合，可考虑调整促销时段。'}
                    {a.likelyCause === 'traffic' && ' 节假日自然车流高峰，属预期范围。'}
                    {a.likelyCause === 'mixed' && ' 设备故障与峰段价格叠加，建议双管齐下优化。'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-neutral-slate-dark">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-electric-green/50" />
              <p>当日无异常拥堵时段</p>
            </div>
          )}
        </div>

        <div className={`card ${diversionSuggestion.needDiversion ? 'card-warning' : 'card-accent'}`}>
          <h2 className="section-title mb-4">
            <MapPin className="w-4 h-4" />
            临时分流建议
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="stat-label">是否需要分流</span>
              <span className={`chip ${diversionSuggestion.needDiversion ? 'text-warning-orange border-warning-orange/40 bg-warning-orange/10' : 'chip-active'} font-semibold`}>
                {diversionSuggestion.level}
              </span>
            </div>

            {diversionSuggestion.target && (
              <div>
                <div className="stat-label mb-1">建议引导至</div>
                <div className="text-sm text-neutral-slate">{diversionSuggestion.target}</div>
              </div>
            )}

            <div>
              <div className="stat-label mb-1">预估收益</div>
              <div className="text-sm text-electric-green leading-relaxed">{diversionSuggestion.estimatedBenefit}</div>
            </div>

            {diversionSuggestion.cost && (
              <div>
                <div className="stat-label mb-1">成本估算</div>
                <div className="text-sm text-neutral-slate-dark">{diversionSuggestion.cost}</div>
              </div>
            )}

            <div className="divider" />
            <div className="text-[11px] text-neutral-slate-dark leading-relaxed">
              💡 分流决策需结合邻站实时负载，以上为基于历史数据的建议值。
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <h2 className="section-title mb-4">峰谷 TOP 3 时段</h2>
          <div className="space-y-2">
            {topPeaks.map((m, i) => (
              <div key={i} className="flex items-center justify-between py-3 px-4 bg-white/[0.03] rounded-sm border-l-2 border-warning-orange">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-sm bg-warning-orange/20 text-warning-orange text-sm font-mono flex items-center justify-center font-semibold">
                    #{i + 1}
                  </span>
                  <div>
                    <div className="text-sm font-mono text-neutral-slate">{formatHourLabel(m.hour)} — {formatHourLabel(m.hour + 1)}</div>
                    <div className="text-[10px] font-mono text-neutral-slate-dark">
                      {m.orderCount} 单 · 利用率 {formatPercent(m.utilizationRate)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-warning-orange font-semibold">
                    等 {formatMinutes(Math.round(m.avgWaitMinutes))}
                  </div>
                  <div className="text-[10px] font-mono text-neutral-slate-dark">
                    峰值 {m.queueLengthAvg.toFixed(0)} 辆
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="section-title mb-4">关键指标摘要</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-sm text-neutral-slate-dark">全站订单数</span>
              <span className="font-mono text-neutral-slate">{summaryStats.totalOrders} 笔</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-sm text-neutral-slate-dark">跨天订单</span>
              <span className="font-mono text-neutral-slate">{summaryStats.crossDayOrders} 笔（已按比例拆分）</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-sm text-neutral-slate-dark">提前离开</span>
              <span className={`font-mono ${summaryStats.leftEarlyOrders > 10 ? 'text-warning-orange' : 'text-neutral-slate'}`}>
                {summaryStats.leftEarlyOrders} 笔
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-sm text-neutral-slate-dark">故障影响订单</span>
              <span className={`font-mono ${summaryStats.affectedByFault > 20 ? 'text-warning-orange' : 'text-neutral-slate'}`}>
                {summaryStats.affectedByFault} 笔 / 额外等待 {formatMinutes(attribution.faultImpact.totalExtraWaitMinutes)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-sm text-neutral-slate-dark">设备故障数</span>
              <span className="font-mono text-neutral-slate">{faults.length} 起 / 涉及 {attribution.faultImpact.affectedGuns.length} 枪位</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-sm text-neutral-slate-dark">峰段订单变化率</span>
              <span className={`font-mono ${attribution.priceImpact.orderChangeRate.peak >= 0 ? 'text-warning-orange' : 'text-electric-green'}`}>
                {attribution.priceImpact.orderChangeRate.peak >= 0 ? '+' : ''}{formatPercent(attribution.priceImpact.orderChangeRate.peak)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-neutral-slate-dark">平均电价时段订单</span>
              <span className="font-mono text-neutral-slate">
                峰 {attribution.priceImpact.peakHourOrders} · 谷 {attribution.priceImpact.valleyHourOrders}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title mb-4">
          <FileBarChart className="w-4 h-4" />
          运营建议与后续行动
        </h2>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="stat-label text-warning-orange mb-2">设备运维</div>
            <ul className="space-y-1.5 text-xs text-neutral-slate leading-relaxed">
              <li>• {attribution.faultImpact.affectedGuns.length > 0
                ? `${attribution.faultImpact.affectedGuns.join('、')} 号枪位加强巡检`
                : '设备运行良好，维持现有巡检频率'}</li>
              <li>• 高峰前 1 小时完成全部枪位自检</li>
              <li>• 节假日备齐常用模块备件</li>
            </ul>
          </div>
          <div>
            <div className="stat-label text-warning-yellow mb-2">排班优化</div>
            <ul className="space-y-1.5 text-xs text-neutral-slate leading-relaxed">
              <li>• {topPeaks[0] ? `${topPeaks[0].hour - 1 >= 0 ? topPeaks[0].hour - 1 : 0}:00 前全员到岗` : '按常规排班'}</li>
              <li>• 谷段保留 1 人值守，其余轮休</li>
              <li>• 建立邻站人员紧急支援机制</li>
            </ul>
          </div>
          <div>
            <div className="stat-label text-electric-green mb-2">价格策略</div>
            <ul className="space-y-1.5 text-xs text-neutral-slate leading-relaxed">
              <li>• 峰段订单溢价 {formatPercent(attribution.priceImpact.orderChangeRate.peak)}，价格影响{attribution.priceImpact.orderChangeRate.peak > 0.3 ? '显著' : '适中'}</li>
              <li>• 可评估在 {prices.find(p => p.priceType === 'valley')?.startHour}:00 前后推出微促销</li>
              <li>• 关注谷段利用率提升空间</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
