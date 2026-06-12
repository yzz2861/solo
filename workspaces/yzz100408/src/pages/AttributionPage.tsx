import { useMemo } from 'react';
import { useAnalysisStore } from '@/store';
import AttributionCompareChart from '@/components/charts/AttributionCompareChart';
import { AlertTriangle, TrendingUp, DollarSign, Clock, GitCompare, Activity } from 'lucide-react';
import { formatMinutes, formatDateTime } from '@/utils/date';
import { formatNumber, getPriceTypeLabel, formatPercent } from '@/utils/format';

export default function AttributionPage() {
  const {
    attribution, faults, prices, aggregatedMetrics, orders,
  } = useAnalysisStore();

  const faultOrdersByGun = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of orders) {
      if (o.affectedByFault) {
        map[o.gunId] = (map[o.gunId] || 0) + 1;
      }
    }
    return map;
  }, [orders]);

  if (!attribution) return null;

  const priceTypeStats = [
    { type: 'peak' as const, label: '峰段', orders: attribution.priceImpact.peakHourOrders },
    { type: 'valley' as const, label: '谷段', orders: attribution.priceImpact.valleyHourOrders },
    { type: 'promotion' as const, label: '促销', orders: attribution.priceImpact.promotionOrders },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-slate">故障与价格归因</h1>
          <p className="text-sm text-neutral-slate-dark mt-1 font-mono">
            分别呈现设备故障和电价因素影响，避免混淆归因
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-electric-green" />
          <span className="chip chip-active">并排对比视图</span>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title mb-4">
          <Activity className="w-4 h-4" />
          时间轴对比：等待时长 + 故障时段 + 电价背景
        </h2>
        <AttributionCompareChart
          aggregatedMetrics={aggregatedMetrics}
          faults={faults}
          prices={prices}
        />
        <div className="mt-4 p-3 bg-electric-blue-light/40 rounded-sm border border-white/5">
          <p className="text-xs text-neutral-slate leading-relaxed">
            <strong className="text-electric-green">图例说明：</strong>
            绿色柱状为各小时平均等待时长，橙色区域为设备故障时段，底色为电价时段（深橙=峰段、浅黄=平段、浅绿=谷段）。
            可直观对比故障/价格与拥堵的时间对应关系。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card card-warning">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title text-warning-orange">
              <AlertTriangle className="w-4 h-4" />
              设备故障影响
            </h2>
            <span className="chip text-warning-orange border-warning-orange/30 bg-warning-orange/10">
              {faults.length} 起故障
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="stat-label">受影响订单</div>
              <div className="stat-value mt-1 text-warning-orange">
                {attribution.faultImpact.totalAffectedOrders}
              </div>
            </div>
            <div>
              <div className="stat-label">额外等待累计</div>
              <div className="stat-value mt-1 text-warning-orange">
                {formatMinutes(attribution.faultImpact.totalExtraWaitMinutes)}
              </div>
            </div>
          </div>

          <div className="divider" />

          <h3 className="text-xs font-mono text-neutral-slate-dark uppercase tracking-wider mb-3">故障明细</h3>
          <div className="space-y-3">
            {faults.map(f => {
              const impact = attribution.faultImpact.byFault[f.faultId];
              return (
                <div key={f.faultId} className="p-3 bg-white/[0.03] rounded-sm border border-white/5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="chip text-warning-orange border-warning-orange/30 font-semibold">
                        {f.gunId}
                      </span>
                      <span className="text-sm text-neutral-slate">{f.faultType}</span>
                      {f.mergedFromMultiple && (
                        <span className="chip text-[10px] text-warning-yellow border-warning-yellow/30">
                          合并 {f.originalFaultIds?.length || 0} 次
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-neutral-slate-dark">
                      {formatMinutes(f.faultDurationMinutes)}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-neutral-slate-dark mb-2">
                    {formatDateTime(f.faultStartTime)} → {formatDateTime(f.faultEndTime)}
                  </div>
                  {impact && (
                    <div className="flex items-center gap-4 text-[11px] font-mono">
                      <span className="text-neutral-slate-dark">
                        影响 <span className="text-warning-orange">{impact.orders}</span> 单
                      </span>
                      <span className="text-neutral-slate-dark">
                        额外等待 <span className="text-warning-orange">{formatMinutes(impact.extraWait)}</span>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {attribution.faultImpact.affectedGuns.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5 text-[11px] text-neutral-slate-dark">
              <p>📌 涉及枪位：<span className="text-neutral-slate font-mono">{attribution.faultImpact.affectedGuns.join('、')}</span></p>
              <p className="mt-1">* 额外等待时长 = 实际等待 - 同时段同枪无故障时的历史平均等待</p>
              <p>* 相邻 30 分钟内的重复故障已自动合并</p>
            </div>
          )}
        </div>

        <div className="card card-info">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title text-warning-yellow">
              <DollarSign className="w-4 h-4" />
              电价时段影响
            </h2>
            <span className="chip text-warning-yellow border-warning-yellow/30 bg-warning-yellow/10">
              {prices.length} 个时段
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {priceTypeStats.map(s => {
              const rate = attribution.priceImpact.orderChangeRate[s.type] || 0;
              return (
                <div key={s.type} className="p-3 bg-white/[0.03] rounded-sm border border-white/5 text-center">
                  <div className="text-[10px] font-mono text-neutral-slate-dark uppercase">{s.label}</div>
                  <div className="stat-value mt-1 text-sm text-electric-green">{s.orders}</div>
                  <div className="text-[10px] font-mono mt-0.5">
                    {rate >= 0 ? (
                      <span className="text-warning-orange flex items-center justify-center gap-0.5">
                        <TrendingUp className="w-3 h-3" />+{(rate * 100).toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-electric-green">{(rate * 100).toFixed(0)}%</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="divider" />

          <h3 className="text-xs font-mono text-neutral-slate-dark uppercase tracking-wider mb-3">电价时段配置</h3>
          <div className="space-y-2">
            {prices.map(p => (
              <div key={p.periodId} className="flex items-center justify-between py-2 px-3 bg-white/[0.03] rounded-sm">
                <div className="flex items-center gap-3">
                  <span className={`chip ${p.priceType === 'peak' ? 'text-warning-orange border-warning-orange/30' : p.priceType === 'valley' ? 'text-electric-green border-electric-green/30' : p.priceType === 'promotion' ? 'text-purple-400 border-purple-400/30' : ''}`}>
                    {getPriceTypeLabel(p.priceType)}
                  </span>
                  <span className="text-sm font-mono text-neutral-slate">
                    {p.startHour.toString().padStart(2, '0')}:00 — {p.endHour.toString().padStart(2, '0')}:00
                  </span>
                </div>
                <span className="text-sm font-mono text-electric-green">¥{p.pricePerKwh.toFixed(2)}/kWh</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="text-[11px] text-neutral-slate-dark leading-relaxed">
              <p><Clock className="w-3 h-3 inline mr-1" />峰段时段订单变化率相对平段基准：</p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {Object.entries(attribution.priceImpact.orderChangeRate).map(([type, rate]) => (
                  <span key={type} className="chip">
                    {getPriceTypeLabel(type)}: <span className={rate >= 0 ? 'text-warning-orange ml-1' : 'text-electric-green ml-1'}>
                      {rate >= 0 ? '+' : ''}{formatPercent(rate, 0)}
                    </span>
                  </span>
                ))}
              </div>
              <p className="mt-2">* 变化率 = (该时段平均每小时订单数 - 平段基准) / 平段基准</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">归因对比总结</h2>
          <span className="chip chip-active">结论</span>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="stat-label">故障贡献</div>
            <div className="mt-2 text-sm leading-relaxed text-neutral-slate">
              {attribution.faultImpact.totalAffectedOrders > 0 ? (
                <>设备故障影响了 <strong className="text-warning-orange">{attribution.faultImpact.totalAffectedOrders}</strong> 笔订单，
                造成额外等待 <strong className="text-warning-orange">{formatMinutes(attribution.faultImpact.totalExtraWaitMinutes)}</strong>。
                主要集中在 <strong className="text-neutral-slate">{attribution.faultImpact.affectedGuns.join('、')}</strong> 号枪位。</>
              ) : '当日无设备故障影响。'}
            </div>
          </div>
          <div>
            <div className="stat-label">价格贡献</div>
            <div className="mt-2 text-sm leading-relaxed text-neutral-slate">
              峰段时段订单较平段基准
              <strong className={attribution.priceImpact.orderChangeRate.peak >= 0 ? 'text-warning-orange' : 'text-electric-green'}>
                {' '}{attribution.priceImpact.orderChangeRate.peak >= 0 ? '+' : ''}{formatPercent(attribution.priceImpact.orderChangeRate.peak, 0)}
              </strong>，
              谷段订单变化
              <strong className={attribution.priceImpact.orderChangeRate.valley >= 0 ? 'text-warning-orange' : 'text-electric-green'}>
                {' '}{attribution.priceImpact.orderChangeRate.valley >= 0 ? '+' : ''}{formatPercent(attribution.priceImpact.orderChangeRate.valley, 0)}
              </strong>。
            </div>
          </div>
          <div>
            <div className="stat-label">综合判断</div>
            <div className="mt-2 text-sm leading-relaxed text-neutral-slate">
              {attribution.faultImpact.totalExtraWaitMinutes > 500 ? (
                <strong className="text-warning-orange">设备故障是主要拥堵原因</strong>
              ) : attribution.priceImpact.orderChangeRate.peak > 0.3 ? (
                <strong className="text-warning-yellow">峰段价格驱动 + 自然车流叠加</strong>
              ) : (
                <strong className="text-electric-green">节假日自然车流高峰为主</strong>
              )}
              ，建议重点关注故障枪位的维护与高峰时段排班。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
