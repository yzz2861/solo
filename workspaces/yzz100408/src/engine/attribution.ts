import { ChargingOrder, GunFault, AttributionResult, PriceType, HourlyMetric } from '@/types';
import { getHourOfDay, getDateTimestamp } from '@/utils/date';

export const attachFaultImpact = (
  orders: ChargingOrder[],
  faults: GunFault[]
): ChargingOrder[] => {
  return orders.map(order => {
    for (const fault of faults) {
      if (order.gunId !== fault.gunId) continue;
      const queueTime = getDateTimestamp(order.queueStartTime);
      if (queueTime >= getDateTimestamp(fault.faultStartTime) &&
          queueTime <= getDateTimestamp(fault.faultEndTime)) {
        return { ...order, affectedByFault: fault.faultId };
      }
    }
    return order;
  });
};

export const computeFaultAttribution = (
  orders: ChargingOrder[],
  faults: GunFault[],
  hourlyMetrics: HourlyMetric[]
): AttributionResult['faultImpact'] => {
  const byFault: Record<string, { orders: number; extraWait: number }> = {};
  const affectedGuns = new Set<string>();
  let totalAffected = 0;
  let totalExtra = 0;

  const baselineWaitByHourGun: Record<string, number> = {};
  for (const m of hourlyMetrics) {
    if (m.faultMinutes === 0 && m.gunId) {
      const key = `${m.hour}|${m.gunId}`;
      baselineWaitByHourGun[key] = m.avgWaitMinutes;
    }
  }

  const affectedOrders = orders.filter(o => o.affectedByFault);

  for (const order of affectedOrders) {
    const faultId = order.affectedByFault!;
    if (!byFault[faultId]) byFault[faultId] = { orders: 0, extraWait: 0 };

    const key = `${getHourOfDay(order.queueStartTime)}|${order.gunId}`;
    const baseline = baselineWaitByHourGun[key] || 10;
    const extra = Math.max(0, order.waitMinutes - baseline);

    byFault[faultId].orders++;
    byFault[faultId].extraWait += extra;
    totalAffected++;
    totalExtra += extra;
    affectedGuns.add(order.gunId);
  }

  for (const faultId in byFault) {
    byFault[faultId].extraWait = Math.round(byFault[faultId].extraWait);
  }

  return {
    totalAffectedOrders: totalAffected,
    totalExtraWaitMinutes: Math.round(totalExtra),
    affectedGuns: Array.from(affectedGuns),
    byFault,
  };
};

export const computePriceAttribution = (
  orders: ChargingOrder[]
): AttributionResult['priceImpact'] => {
  const byType: Record<string, number> = {};
  let peakHourOrders = 0;
  let valleyHourOrders = 0;
  let promotionOrders = 0;

  for (const o of orders) {
    const type = o.pricePeriod || 'flat';
    byType[type] = (byType[type] || 0) + 1;
    if (type === 'peak') peakHourOrders++;
    if (type === 'valley') valleyHourOrders++;
    if (type === 'promotion') promotionOrders++;
  }

  const total = orders.length || 1;
  const flatCount = byType['flat'] || 0;
  const baseline = flatCount > 0 ? flatCount / (countHoursOfType(orders, 'flat') || 1) : total / 24;

  const orderChangeRate: Record<string, number> = {};
  const types: PriceType[] = ['peak', 'flat', 'valley', 'promotion'];
  for (const t of types) {
    const count = byType[t] || 0;
    const hours = countHoursOfType(orders, t) || 1;
    const avgPerHour = count / hours;
    orderChangeRate[t] = baseline > 0 ? +((avgPerHour - baseline) / baseline).toFixed(3) : 0;
  }

  return {
    peakHourOrders,
    valleyHourOrders,
    promotionOrders,
    orderChangeRate,
  };
};

const countHoursOfType = (orders: ChargingOrder[], type: PriceType): number => {
  const hours = new Set<number>();
  for (const o of orders) {
    if (o.pricePeriod === type) hours.add(getHourOfDay(o.queueStartTime));
  }
  return hours.size;
};

export const computeFullAttribution = (
  orders: ChargingOrder[],
  faults: GunFault[],
  hourlyMetrics: HourlyMetric[]
): AttributionResult => {
  const ordersWithFault = attachFaultImpact(orders, faults);
  return {
    faultImpact: computeFaultAttribution(ordersWithFault, faults, hourlyMetrics),
    priceImpact: computePriceAttribution(ordersWithFault),
  };
};

export interface AnomalyPeriod {
  startHour: number;
  endHour: number;
  severity: 'warning' | 'critical';
  likelyCause: 'fault' | 'price' | 'traffic' | 'mixed';
  description: string;
}

export const detectAnomalies = (
  hourlyMetrics: HourlyMetric[],
  attribution: AttributionResult,
  faults: GunFault[]
): AnomalyPeriod[] => {
  const anomalies: AnomalyPeriod[] = [];
  const faultHours = new Set<number>();

  for (const f of faults) {
    const startH = getHourOfDay(f.faultStartTime);
    const endH = getHourOfDay(f.faultEndTime);
    for (let h = startH; h <= endH; h++) faultHours.add(h);
  }

  for (let i = 0; i < hourlyMetrics.length; i++) {
    const m = hourlyMetrics[i];
    if (m.avgWaitMinutes >= 40) {
      let cause: AnomalyPeriod['likelyCause'] = 'traffic';
      const hasFault = faultHours.has(m.hour);
      const priceType = m.priceType;
      const priceChange = priceType ? attribution.priceImpact.orderChangeRate[priceType] : 0;

      if (hasFault && priceChange > 0.3) cause = 'mixed';
      else if (hasFault) cause = 'fault';
      else if (priceChange > 0.3) cause = 'price';

      anomalies.push({
        startHour: m.hour,
        endHour: m.hour + 1,
        severity: m.avgWaitMinutes >= 55 ? 'critical' : 'warning',
        likelyCause: cause,
        description: `${m.hour}:00-${m.hour + 1}:00 平均等待 ${m.avgWaitMinutes.toFixed(0)}分钟`,
      });
    }
  }

  return mergeAdjacentAnomalies(anomalies);
};

const mergeAdjacentAnomalies = (anomalies: AnomalyPeriod[]): AnomalyPeriod[] => {
  if (anomalies.length <= 1) return anomalies;
  const result: AnomalyPeriod[] = [];
  let current = { ...anomalies[0] };

  for (let i = 1; i < anomalies.length; i++) {
    const next = anomalies[i];
    if (next.startHour === current.endHour) {
      current.endHour = next.endHour;
      current.severity = current.severity === 'critical' || next.severity === 'critical' ? 'critical' : 'warning';
      current.description = `${current.startHour}:00-${current.endHour}:00 连续拥堵时段`;
    } else {
      result.push(current);
      current = { ...next };
    }
  }
  result.push(current);
  return result;
};
