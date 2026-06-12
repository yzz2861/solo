import { useMemo } from 'react';
import { useAnalysisStore } from '@/store';
import { computeWaitDistribution } from '@/engine/metrics';
import { getHourOfDay, getDateMinutes, formatMinutes, formatDateTime, formatHourLabel } from '@/utils/date';
import { formatKwh, getPriceTypeLabel, formatVehicleModel } from '@/utils/format';
import MultiDimensionFilter from '@/components/filters/MultiDimensionFilter';
import WaitDistributionChart from '@/components/charts/WaitDistributionChart';
import { Car, Clock, Zap, AlertCircle, ArrowRightLeft } from 'lucide-react';

export default function AnalysisPage() {
  const { orders, faults, filters, hourlyMetrics } = useAnalysisStore();

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (filters.selectedGuns.length > 0 && !filters.selectedGuns.includes(o.gunId)) return false;
      if (filters.selectedPriceTypes.length > 0 && !filters.selectedPriceTypes.includes(o.pricePeriod as any)) return false;
      if (filters.selectedVehicleModels.length > 0 && !filters.selectedVehicleModels.includes(o.vehicleModel)) return false;
      const h = getHourOfDay(o.queueStartTime);
      if (h < filters.hourRange[0] || h >= filters.hourRange[1]) return false;
      return true;
    });
  }, [orders, filters]);

  const distribution = useMemo(() => computeWaitDistribution(filteredOrders), [filteredOrders]);

  const stats = useMemo(() => {
    if (filteredOrders.length === 0) return { avg: 0, max: 0, totalKwh: 0, avgCharge: 0 };
    const waits = filteredOrders.map(o => o.waitMinutes);
    const charges = filteredOrders.map(o => o.chargeMinutes);
    return {
      avg: Math.round(waits.reduce((a, b) => a + b, 0) / waits.length),
      max: Math.max(...waits),
      totalKwh: filteredOrders.reduce((a, b) => a + b.chargeKwh, 0),
      avgCharge: Math.round(charges.reduce((a, b) => a + b, 0) / charges.length),
    };
  }, [filteredOrders]);

  const vehicleBreakdown = useMemo(() => {
    const map: Record<string, { count: number; avgWait: number }> = {};
    for (const o of filteredOrders) {
      if (!map[o.vehicleModel]) map[o.vehicleModel] = { count: 0, avgWait: 0 };
      map[o.vehicleModel].count++;
      map[o.vehicleModel].avgWait += o.waitMinutes;
    }
    return Object.entries(map)
      .map(([model, v]) => ({ model, count: v.count, avgWait: Math.round(v.avgWait / v.count) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filteredOrders]);

  const gunBreakdown = useMemo(() => {
    return filters.selectedGuns.length > 0 ? filters.selectedGuns : Array.from(new Set(filteredOrders.map(o => o.gunId)));
  }, [filteredOrders, filters.selectedGuns]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-slate">多维钻取分析</h1>
        <p className="text-sm text-neutral-slate-dark mt-1 font-mono">按时段、车型、枪位组合筛选，精准定位拥堵原因</p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-1">
          <MultiDimensionFilter />
        </div>

        <div className="col-span-3 space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[
              { icon: Car, label: '筛选订单', value: `${filteredOrders.length} 笔` },
              { icon: Clock, label: '平均等待', value: formatMinutes(stats.avg) },
              { icon: Zap, label: '充电总量', value: formatKwh(stats.totalKwh) },
              { icon: ArrowRightLeft, label: '平均充电', value: formatMinutes(stats.avgCharge) },
            ].map((s, i) => (
              <div key={i} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value mt-2 text-electric-green">{s.value}</div>
                  </div>
                  <div className="w-8 h-8 rounded-sm bg-white/5 flex items-center justify-center">
                    <s.icon className="w-4 h-4 text-neutral-slate-dark" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <h2 className="section-title mb-4">等待时长分布</h2>
            <WaitDistributionChart distribution={distribution} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <h2 className="section-title mb-4">车型维度</h2>
              <div className="space-y-2">
                {vehicleBreakdown.map(v => (
                  <div key={v.model} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                    <Car className="w-4 h-4 text-neutral-slate-dark shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-neutral-slate truncate">{formatVehicleModel(v.model)}</div>
                      <div className="text-[10px] font-mono text-neutral-slate-dark">{v.count} 笔订单</div>
                    </div>
                    <div className="text-sm font-mono text-warning-orange">{formatMinutes(v.avgWait)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="section-title mb-4">枪位利用率</h2>
              <div className="space-y-2">
                {gunBreakdown.map(g => {
                  const gunMetrics = hourlyMetrics.filter(m => m.gunId === g);
                  const avgUtil = gunMetrics.length > 0
                    ? gunMetrics.reduce((a, b) => a + b.utilizationRate, 0) / gunMetrics.length
                    : 0;
                  const maxWait = gunMetrics.length > 0 ? Math.max(...gunMetrics.map(m => m.maxWaitMinutes)) : 0;
                  return (
                    <div key={g} className="py-2 border-b border-white/5 last:border-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-mono text-neutral-slate">{g}</span>
                        <span className="text-[10px] font-mono text-neutral-slate-dark">
                          最长等 {formatMinutes(maxWait)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-sm overflow-hidden">
                        <div
                          className="h-full rounded-sm bg-electric-green/70 transition-all"
                          style={{ width: `${(avgUtil * 100).toFixed(0)}%` }}
                        />
                      </div>
                      <div className="text-[10px] font-mono text-neutral-slate-dark mt-1">
                        利用率 {(avgUtil * 100).toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">订单明细</h2>
              <span className="chip">显示前 20 条 / 共 {filteredOrders.length} 条</span>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">订单号</th>
                    <th className="table-header">枪位</th>
                    <th className="table-header">车牌号</th>
                    <th className="table-header">车型</th>
                    <th className="table-header">排队开始</th>
                    <th className="table-header">等待</th>
                    <th className="table-header">充电时长</th>
                    <th className="table-header">充电量</th>
                    <th className="table-header">电价时段</th>
                    <th className="table-header">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.slice(0, 20).map(o => (
                    <tr key={o.orderId} className="hover:bg-white/[0.02] transition-colors">
                      <td className="table-cell font-mono text-electric-green">{o.orderId}</td>
                      <td className="table-cell font-mono">{o.gunId}</td>
                      <td className="table-cell font-mono">{o.vehiclePlate}</td>
                      <td className="table-cell">{formatVehicleModel(o.vehicleModel)}</td>
                      <td className="table-cell font-mono text-neutral-slate-dark">{formatDateTime(o.queueStartTime)}</td>
                      <td className={`table-cell font-mono ${o.waitMinutes > 30 ? 'text-warning-orange' : 'text-neutral-slate'}`}>
                        {formatMinutes(o.waitMinutes)}
                      </td>
                      <td className="table-cell font-mono">{formatMinutes(o.chargeMinutes)}</td>
                      <td className="table-cell font-mono">{formatKwh(o.chargeKwh)}</td>
                      <td className="table-cell">
                        <span className="chip text-[10px]">{getPriceTypeLabel(o.pricePeriod || '')}</span>
                      </td>
                      <td className="table-cell">
                        <div className="flex gap-1">
                          {o.crossDay && <span className="chip text-[10px] text-warning-yellow border-warning-yellow/30">跨天</span>}
                          {o.leftEarly && <span className="chip text-[10px] text-warning-orange border-warning-orange/30"><AlertCircle className="w-2.5 h-2.5 mr-0.5" />提前离开</span>}
                          {o.affectedByFault && <span className="chip text-[10px] text-warning-orange border-warning-orange/30">受故障影响</span>}
                          {!o.crossDay && !o.leftEarly && !o.affectedByFault && <span className="chip chip-active text-[10px]">正常</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredOrders.some(o => getDateMinutes(o.queueStartTime) <= 5 || getDateMinutes(o.queueStartTime) >= 55) && (
              <div className="mt-3 text-[11px] font-mono text-neutral-slate-dark">
                * 峰谷边界前后 5 分钟内的订单已自动归入主体电价时段
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
