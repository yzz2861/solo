import type { WeddingCarOrder, OrderFlower, FlowerItem, Florist, Alert, AlertType } from '@/types';
import { diffMinutes } from './dateUtils';
import { uid } from './dateUtils';

export interface ValidateResult {
  errors: { field: string; message: string }[];
  warnings: { field: string; message: string }[];
}

export const validatePlateNumber = (plate: string): string | null => {
  if (!plate) return '车牌号不能为空';
  const reg = /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][·\.]?[A-Z0-9]{4,6}$/;
  if (!reg.test(plate.toUpperCase())) return '车牌格式不正确';
  return null;
};

export const checkPlateDuplicate = (
  orderId: string | undefined,
  date: string,
  plate: string,
  orders: WeddingCarOrder[]
): boolean => {
  return orders.some(o =>
    o.id !== orderId &&
    o.date === date &&
    o.plateNumber.toUpperCase() === plate.toUpperCase()
  );
};

export const checkFloristTimeConflict = (
  orderId: string | undefined,
  date: string,
  floristId: string | null,
  arrivalTime: string,
  orders: WeddingCarOrder[],
  thresholdMin: number = 60
): WeddingCarOrder[] => {
  if (!floristId) return [];
  return orders.filter(o =>
    o.id !== orderId &&
    o.date === date &&
    o.floristId === floristId &&
    Math.abs(diffMinutes(o.arrivalTime, arrivalTime)) < thresholdMin
  );
};

export const checkFlowerShortage = (
  orderFlowers: OrderFlower[],
  flowerCatalog: FlowerItem[],
  existingConsumption: { flowerId: string; quantity: number }[] = []
): { flowerId: string; name: string; needed: number; available: number }[] => {
  const result: { flowerId: string; name: string; needed: number; available: number }[] = [];
  const totalNeeded = new Map<string, number>();
  orderFlowers.forEach(of => totalNeeded.set(of.flowerId, of.quantity));
  existingConsumption.forEach(ec => {
    totalNeeded.set(ec.flowerId, (totalNeeded.get(ec.flowerId) || 0) + ec.quantity);
  });
  flowerCatalog.forEach(f => {
    const need = totalNeeded.get(f.id) || 0;
    if (need > f.stock) {
      result.push({ flowerId: f.id, name: f.name, needed: need, available: f.stock });
    }
  });
  return result;
};

export const computeOrderCost = (orderFlowers: OrderFlower[], flowerCatalog: FlowerItem[]): number => {
  return orderFlowers.reduce((sum, of) => {
    const f = flowerCatalog.find(ff => ff.id === of.flowerId);
    return sum + (f ? f.price * of.quantity : 0);
  }, 0);
};

export interface GenerateAlertsInput {
  orders: WeddingCarOrder[];
  flowers: FlowerItem[];
  florists: Florist[];
  today: string;
}

export const generateAlerts = (input: GenerateAlertsInput): Alert[] => {
  const { orders, flowers, today } = input;
  const todayOrders = orders.filter(o => o.date === today);
  const alerts: Alert[] = [];
  const seen = new Set<string>();

  // 1. 车牌重复
  const plateMap = new Map<string, WeddingCarOrder[]>();
  todayOrders.forEach(o => {
    const key = o.plateNumber.toUpperCase();
    const list = plateMap.get(key) || [];
    list.push(o);
    plateMap.set(key, list);
  });
  plateMap.forEach((list, plate) => {
    if (list.length > 1) {
      const key = `dup-${plate}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.forEach(o => {
          alerts.push({
            id: uid(),
            type: 'plate_duplicate',
            orderId: o.id,
            message: `⚠️ 车牌 ${plate} 重复录入（共${list.length}单）`,
            timestamp: Date.now(),
            resolved: false,
          });
        });
      }
    }
  });

  // 2. 扎花师时间重叠
  const byFlorist = new Map<string, WeddingCarOrder[]>();
  todayOrders.forEach(o => {
    if (!o.floristId) return;
    const list = byFlorist.get(o.floristId) || [];
    list.push(o);
    byFlorist.set(o.floristId, list);
  });
  byFlorist.forEach(list => {
    list.sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime));
    for (let i = 0; i < list.length - 1; i++) {
      const a = list[i], b = list[i + 1];
      if (Math.abs(diffMinutes(a.arrivalTime, b.arrivalTime)) < 60 &&
          a.status !== 'delivered' && b.status !== 'delivered') {
        const key = `tc-${a.floristId}-${a.id}-${b.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          alerts.push({
            id: uid(),
            type: 'time_conflict',
            orderId: b.id,
            message: `⏰ 扎花师时间冲突：${a.arrivalTime} ${a.coupleName} 与 ${b.arrivalTime} ${b.coupleName} 间隔不足60分钟`,
            timestamp: Date.now(),
            resolved: false,
          });
        }
      }
    }
  });

  // 3. 花材库存不足（按当日未交车订单总量评估）
  const consumedPerFlower = new Map<string, number>();
  todayOrders
    .filter(o => o.status !== 'delivered')
    .forEach(o => o.flowers.forEach(of => {
      consumedPerFlower.set(of.flowerId, (consumedPerFlower.get(of.flowerId) || 0) + of.quantity);
    }));
  consumedPerFlower.forEach((need, fid) => {
    const f = flowers.find(x => x.id === fid);
    if (!f) return;
    if (f.stock < f.safeStock || need > f.stock) {
      alerts.push({
        id: uid(),
        type: 'low_stock',
        message: `🌸 花材库存告警：${f.name} 当前${f.stock}${f.unit}，今日需${need}${f.unit}，安全库存${f.safeStock}${f.unit}`,
        timestamp: Date.now(),
        resolved: false,
      });
    }
  });

  // 4. 司机早到：driverArrivedTime 已设置但 status != delivered
  todayOrders
    .filter(o => o.driverArrivedTime && o.status !== 'delivered')
    .forEach(o => {
      alerts.push({
        id: uid(),
        type: 'driver_early',
        orderId: o.id,
        message: `🚗 司机已到店（${o.driverArrivedTime}）但 ${o.plateNumber} 还未完成扎花！`,
        timestamp: Date.now(),
        resolved: false,
      });
    });

  return alerts;
};

export const alertTypeLabel: Record<AlertType, string> = {
  low_stock: '库存不足',
  time_conflict: '时间冲突',
  driver_early: '司机早到',
  plate_duplicate: '车牌重复',
};

export const alertTypeColor: Record<AlertType, string> = {
  low_stock: 'tag-warning',
  time_conflict: 'tag-warning',
  driver_early: 'tag-danger',
  plate_duplicate: 'tag-danger',
};
