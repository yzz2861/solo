import { ChargingOrder, GunFault, ElectricityPrice, PriceType } from '@/types';
import { isCrossDay, diffMinutes, getHourOfDay, getDateMinutes, getDateTimestamp, createDateFromParts, formatDate, ensureDate } from '@/utils/date';

export const markCrossDayOrders = (orders: ChargingOrder[]): ChargingOrder[] => {
  return orders.map(order => ({
    ...order,
    crossDay: isCrossDay(order.chargeStartTime, order.chargeEndTime),
  }));
};

export const splitCrossDayOrders = (orders: ChargingOrder[]): ChargingOrder[] => {
  const result: ChargingOrder[] = [];
  for (const order of orders) {
    if (!order.crossDay) {
      result.push(order);
      continue;
    }
    const startDay = formatDate(order.chargeStartTime);
    const endDay = formatDate(order.chargeEndTime);
    const midnightOfStart = createDateFromParts(startDay, 24, 0);

    const day1Minutes = diffMinutes(order.chargeStartTime, midnightOfStart);
    const day2Minutes = diffMinutes(midnightOfStart, order.chargeEndTime);
    const totalMinutes = day1Minutes + day2Minutes || 1;
    const ratio1 = day1Minutes / totalMinutes;
    const ratio2 = day2Minutes / totalMinutes;

    result.push({
      ...order,
      orderId: `${order.orderId}_D1`,
      chargeEndTime: midnightOfStart,
      chargeMinutes: day1Minutes,
      chargeKwh: +(order.chargeKwh * ratio1).toFixed(1),
      crossDay: true,
    });
    result.push({
      ...order,
      orderId: `${order.orderId}_D2`,
      queueStartTime: midnightOfStart,
      chargeStartTime: midnightOfStart,
      waitMinutes: 0,
      chargeMinutes: day2Minutes,
      chargeKwh: +(order.chargeKwh * ratio2).toFixed(1),
      crossDay: true,
    });
    void endDay;
  }
  return result;
};

export const markLeftEarlyOrders = (orders: ChargingOrder[]): ChargingOrder[] => {
  return orders.map(order => {
    const expectedMinutes = 35;
    const actualRatio = order.chargeMinutes / expectedMinutes;
    return {
      ...order,
      leftEarly: order.leftEarly || (actualRatio < 0.5 && order.waitMinutes > 15),
    };
  });
};

export const mergeAdjacentFaults = (faults: GunFault[], gapMinutes: number = 30): GunFault[] => {
  if (faults.length === 0) return [];

  const byGun: Record<string, GunFault[]> = {};
  for (const f of faults) {
    (byGun[f.gunId] ||= []).push(f);
  }

  const result: GunFault[] = [];
  for (const gunId in byGun) {
    const sorted = byGun[gunId].sort((a, b) =>
      getDateTimestamp(a.faultStartTime) - getDateTimestamp(b.faultStartTime)
    );

    let current: GunFault = { ...sorted[0], originalFaultIds: sorted[0].originalFaultIds || [sorted[0].faultId] };

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      const gap = (getDateTimestamp(next.faultStartTime) - getDateTimestamp(current.faultEndTime)) / 60000;

      if (gap <= gapMinutes) {
        const nextEndTs = getDateTimestamp(next.faultEndTime);
        const currentEndTs = getDateTimestamp(current.faultEndTime);
        const laterEnd = nextEndTs > currentEndTs ? next.faultEndTime : current.faultEndTime;
        current = {
          ...current,
          faultEndTime: laterEnd,
          faultDurationMinutes: diffMinutes(current.faultStartTime, laterEnd),
          mergedFromMultiple: true,
          originalFaultIds: [...(current.originalFaultIds || []), next.faultId],
        };
      } else {
        result.push(current);
        current = { ...next, originalFaultIds: next.originalFaultIds || [next.faultId] };
      }
    }
    result.push(current);
  }
  return result;
};

const BOUNDARY_TOLERANCE = 5;

export const snapToPricePeriod = (
  orderTime: Date | string,
  prices: ElectricityPrice[]
): PriceType | undefined => {
  const hour = getHourOfDay(orderTime);
  const minute = getDateMinutes(orderTime);

  for (const price of prices) {
    if (hour >= price.startHour && hour < price.endHour) return price.priceType;

    if (hour === price.endHour && minute <= BOUNDARY_TOLERANCE) return price.priceType;

    if (hour + 1 === price.startHour && minute >= 60 - BOUNDARY_TOLERANCE) return price.priceType;
  }
  return undefined;
};

export const attachPricePeriods = (
  orders: ChargingOrder[],
  prices: ElectricityPrice[]
): ChargingOrder[] => {
  return orders.map(order => ({
    ...order,
    pricePeriod: snapToPricePeriod(order.chargeStartTime, prices),
  }));
};

export const preprocessAll = (
  orders: ChargingOrder[],
  faults: GunFault[],
  prices: ElectricityPrice[]
) => {
  let processedOrders = markCrossDayOrders(orders);
  processedOrders = splitCrossDayOrders(processedOrders);
  processedOrders = markLeftEarlyOrders(processedOrders);
  processedOrders = attachPricePeriods(processedOrders, prices);

  const mergedFaults = mergeAdjacentFaults(faults);

  return { orders: processedOrders, faults: mergedFaults, prices };
};
