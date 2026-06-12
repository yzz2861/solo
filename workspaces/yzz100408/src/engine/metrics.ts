import { ChargingOrder, QueueRecord, HourlyMetric, GunFault, ShiftRecommendation, ElectricityPrice, PriceType } from '@/types';
import { formatDate, getHourOfDay, getHoursArray, ensureDate, getDateTimestamp } from '@/utils/date';

export const computeHourlyMetrics = (
  orders: ChargingOrder[],
  queueRecords: QueueRecord[],
  faults: GunFault[],
  prices: ElectricityPrice[],
  targetDate: string,
  gunIds: string[]
): HourlyMetric[] => {
  const hours = getHoursArray();
  const metrics: HourlyMetric[] = [];
  const dayOrders = orders.filter(o => formatDate(o.queueStartTime) === targetDate);
  const dayQueue = queueRecords.filter(q => formatDate(q.timestamp) === targetDate);
  const dayFaults = faults.filter(f => formatDate(f.faultStartTime) === targetDate);

  for (const hour of hours) {
    for (const gunId of gunIds) {
      const hourOrders = dayOrders.filter(o =>
        getHourOfDay(o.queueStartTime) === hour && o.gunId === gunId
      );

      const waitTimes = hourOrders.map(o => o.waitMinutes).filter(w => w > 0);
      const avgWait = waitTimes.length > 0
        ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
        : 0;
      const maxWait = waitTimes.length > 0 ? Math.max(...waitTimes) : 0;

      let chargingMinutes = 0;
      for (const o of hourOrders) {
        const cs = ensureDate(o.chargeStartTime);
        const startOfHour = new Date(cs);
        startOfHour.setMinutes(0, 0, 0);
        const endOfHourTs = startOfHour.getTime() + 3600000;
        const overlapStartTs = Math.max(getDateTimestamp(o.chargeStartTime), startOfHour.getTime());
        const overlapEndTs = Math.min(getDateTimestamp(o.chargeEndTime), endOfHourTs);
        chargingMinutes += Math.max(0, (overlapEndTs - overlapStartTs) / 60000);
      }

      let faultMinutes = 0;
      for (const f of dayFaults) {
        if (f.gunId !== gunId) continue;
        const fs = ensureDate(f.faultStartTime);
        const startOfHour = new Date(fs);
        startOfHour.setHours(hour, 0, 0, 0);
        const endOfHourTs = startOfHour.getTime() + 3600000;
        const overlapStartTs = Math.max(getDateTimestamp(f.faultStartTime), startOfHour.getTime());
        const overlapEndTs = Math.min(getDateTimestamp(f.faultEndTime), endOfHourTs);
        faultMinutes += Math.max(0, (overlapEndTs - overlapStartTs) / 60000);
      }

      const hourQueues = dayQueue.filter(q =>
        getHourOfDay(q.timestamp) === hour && (!q.gunId || q.gunId === gunId)
      );
      const queueLengthAvg = hourQueues.length > 0
        ? hourQueues.reduce((a, b) => a + b.queueLength, 0) / hourQueues.length
        : 0;

      let priceType: PriceType | undefined;
      for (const p of prices) {
        if (hour >= p.startHour && hour < p.endHour) {
          priceType = p.priceType;
          break;
        }
      }

      const idleMinutes = Math.max(0, 60 - chargingMinutes - faultMinutes);
      metrics.push({
        date: targetDate,
        hour,
        gunId,
        avgWaitMinutes: +avgWait.toFixed(1),
        maxWaitMinutes: maxWait,
        orderCount: hourOrders.length,
        queueLengthAvg: +queueLengthAvg.toFixed(1),
        utilizationRate: +Math.min(1, (chargingMinutes + faultMinutes) / 60).toFixed(3),
        idleMinutes: +idleMinutes.toFixed(1),
        chargingMinutes: +chargingMinutes.toFixed(1),
        faultMinutes: +faultMinutes.toFixed(1),
        priceType,
      });
    }
  }
  return metrics;
};

export const aggregateHourlyMetrics = (metrics: HourlyMetric[]): HourlyMetric[] => {
  const byHour: Record<number, HourlyMetric[]> = {};
  for (const m of metrics) {
    (byHour[m.hour] ||= []).push(m);
  }

  return getHoursArray().map(hour => {
    const arr = byHour[hour] || [];
    const orders = arr.reduce((a, b) => a + b.orderCount, 0);
    const totalCharging = arr.reduce((a, b) => a + b.chargingMinutes, 0);
    const totalFault = arr.reduce((a, b) => a + b.faultMinutes, 0);
    const totalIdle = arr.reduce((a, b) => a + b.idleMinutes, 0);
    const waitSum = arr.reduce((a, b) => a + b.avgWaitMinutes * b.orderCount, 0);
    const maxWait = arr.length > 0 ? Math.max(...arr.map(m => m.maxWaitMinutes)) : 0;
    const queueAvg = arr.length > 0 ? arr.reduce((a, b) => a + b.queueLengthAvg, 0) / arr.length : 0;

    return {
      date: arr[0]?.date || '',
      hour,
      avgWaitMinutes: orders > 0 ? +(waitSum / orders).toFixed(1) : 0,
      maxWaitMinutes: maxWait,
      orderCount: orders,
      queueLengthAvg: +queueAvg.toFixed(1),
      utilizationRate: +Math.min(1, (totalCharging + totalFault) / (60 * arr.length || 1)).toFixed(3),
      idleMinutes: +totalIdle.toFixed(1),
      chargingMinutes: +totalCharging.toFixed(1),
      faultMinutes: +totalFault.toFixed(1),
      priceType: arr[0]?.priceType,
    };
  });
};

export const computeShiftRecommendations = (
  aggregatedMetrics: HourlyMetric[]
): ShiftRecommendation[] => {
  return aggregatedMetrics.map(m => {
    let peakLevel: ShiftRecommendation['peakLevel'] = 'low';
    let recommendedStaff = 1;
    let notes = '';

    if (m.avgWaitMinutes >= 45 || m.queueLengthAvg >= 25) {
      peakLevel = 'critical';
      recommendedStaff = 4;
      notes = '极峰时段，建议增派支援人员';
    } else if (m.avgWaitMinutes >= 30 || m.queueLengthAvg >= 15) {
      peakLevel = 'high';
      recommendedStaff = 3;
      notes = '高峰时段，全员在岗';
    } else if (m.avgWaitMinutes >= 10 || m.queueLengthAvg >= 5) {
      peakLevel = 'medium';
      recommendedStaff = 2;
      notes = '平峰时段，正常值守';
    } else if (m.orderCount > 0) {
      peakLevel = 'low';
      recommendedStaff = 1;
    } else {
      peakLevel = 'low';
      recommendedStaff = 0;
      notes = '低谷可安排轮休';
    }

    return {
      hour: m.hour,
      recommendedStaff,
      peakLevel,
      avgWaitMinutes: m.avgWaitMinutes,
      expectedQueueLength: Math.round(m.queueLengthAvg),
      notes,
    };
  });
};

export const getTopPeakHours = (metrics: HourlyMetric[], n: number = 3): HourlyMetric[] => {
  return [...metrics]
    .sort((a, b) => b.avgWaitMinutes - a.avgWaitMinutes)
    .slice(0, n);
};

export const computeWaitDistribution = (orders: ChargingOrder[]): number[] => {
  const buckets = [0, 5, 10, 15, 20, 30, 45, 60, 90, 120];
  const counts = new Array(buckets.length - 1).fill(0);
  for (const o of orders) {
    for (let i = 0; i < buckets.length - 1; i++) {
      if (o.waitMinutes >= buckets[i] && o.waitMinutes < buckets[i + 1]) {
        counts[i]++;
        break;
      }
    }
    if (o.waitMinutes >= buckets[buckets.length - 1]) counts[buckets.length - 2]++;
  }
  return counts;
};
