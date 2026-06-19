import type { Store, Category, Product, Weather, WasteRecord, SalesRecord, OrderPlan, DeliveryRecord, DiscountPromotion, TimeSlot } from '../types';
import { format, subDays, addDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const today = new Date();
const todayStr = format(today, 'yyyy-MM-dd');
const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd');

export const stores: Store[] = [
  { id: 's001', name: '中心广场店', type: 'office', address: '市中心广场东路88号' },
  { id: 's002', name: '阳光花园店', type: 'community', address: '阳光花园小区北门' },
  { id: 's003', name: '大学城店', type: 'school', address: '大学城商业街12号' },
  { id: 's004', name: '火车站店', type: 'station', address: '火车站候车厅B1层' },
  { id: 's005', name: '科技园店', type: 'office', address: '科技园A座一楼' },
  { id: 's006', name: '幸福里店', type: 'community', address: '幸福里社区服务中心旁' },
];

export const categories: Category[] = [
  { id: 'c001', name: '便当饭类' },
  { id: 'c002', name: '寿司饭团' },
  { id: 'c003', name: '三明治汉堡' },
  { id: 'c004', name: '沙拉轻食' },
  { id: 'c005', name: '面类' },
  { id: 'c006', name: '关东煮' },
];

export const products: Product[] = [
  { id: 'p001', name: '照烧鸡排饭', categoryId: 'c001', price: 15.8, unit: '份' },
  { id: 'p002', name: '番茄牛腩饭', categoryId: 'c001', price: 18.8, unit: '份' },
  { id: 'p003', name: '麻婆豆腐饭', categoryId: 'c001', price: 12.8, unit: '份' },
  { id: 'p004', name: '咖喱猪排饭', categoryId: 'c001', price: 16.8, unit: '份' },
  { id: 'p005', name: '三文鱼寿司', categoryId: 'c002', price: 12.5, unit: '盒' },
  { id: 'p006', name: '金枪鱼饭团', categoryId: 'c002', price: 6.5, unit: '个' },
  { id: 'p007', name: '海苔饭团', categoryId: 'c002', price: 5.5, unit: '个' },
  { id: 'p008', name: '鸡蛋三明治', categoryId: 'c003', price: 8.5, unit: '个' },
  { id: 'p009', name: '火腿芝士三明治', categoryId: 'c003', price: 10.5, unit: '个' },
  { id: 'p010', name: '牛肉汉堡', categoryId: 'c003', price: 12.8, unit: '个' },
  { id: 'p011', name: '蔬菜沙拉', categoryId: 'c004', price: 9.8, unit: '盒' },
  { id: 'p012', name: '鸡胸肉沙拉', categoryId: 'c004', price: 15.8, unit: '盒' },
  { id: 'p013', name: '担担面', categoryId: 'c005', price: 14.8, unit: '份' },
  { id: 'p014', name: '红烧牛肉面', categoryId: 'c005', price: 18.8, unit: '份' },
  { id: 'p015', name: '乌冬面', categoryId: 'c005', price: 13.8, unit: '份' },
  { id: 'p016', name: '关东煮组合', categoryId: 'c006', price: 12.0, unit: '份' },
  { id: 'p017', name: '萝卜', categoryId: 'c006', price: 3.5, unit: '块' },
  { id: 'p018', name: '鸡蛋', categoryId: 'c006', price: 3.0, unit: '个' },
];

const weatherTypes: Weather['type'][] = ['sunny', 'sunny', 'cloudy', 'cloudy', 'rainy', 'hot', 'cold'];

export const generateWeatherData = (days: number = 14): Weather[] => {
  const data: Weather[] = [];
  for (let i = 0; i < days; i++) {
    const date = format(subDays(today, i), 'yyyy-MM-dd');
    const type = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
    let baseTemp = 25;
    if (type === 'hot') baseTemp = 35;
    if (type === 'cold') baseTemp = 5;
    if (type === 'rainy') baseTemp = 18;
    data.push({
      date,
      city: '本市',
      type,
      temperature: baseTemp + Math.floor(Math.random() * 5) - 2,
    });
  }
  return data;
};

export const weatherData: Weather[] = generateWeatherData(14);

const timeSlots: TimeSlot[] = ['morning', 'noon', 'afternoon', 'evening', 'night'];

const timeSlotLabels: Record<TimeSlot, string> = {
  morning: '早餐',
  noon: '午餐',
  afternoon: '下午茶',
  evening: '晚餐',
  night: '夜宵',
};

const storeTypeMultipliers: Record<string, Record<TimeSlot, number>> = {
  office: { morning: 0.8, noon: 1.5, afternoon: 0.6, evening: 1.2, night: 0.3 },
  community: { morning: 1.0, noon: 0.9, afternoon: 0.7, evening: 1.3, night: 0.8 },
  school: { morning: 1.2, noon: 1.3, afternoon: 0.8, evening: 1.4, night: 1.0 },
  station: { morning: 1.0, noon: 1.1, afternoon: 1.2, evening: 1.3, night: 0.9 },
};

export const generateSalesData = (storeId: string, storeType: string, days: number = 14): SalesRecord[] => {
  const records: SalesRecord[] = [];
  const multipliers = storeTypeMultipliers[storeType] || storeTypeMultipliers.community;

  for (let d = 0; d < days; d++) {
    const date = format(subDays(today, d), 'yyyy-MM-dd');
    const weather = weatherData.find(w => w.date === date);
    let weatherFactor = 1;
    if (weather?.type === 'rainy') weatherFactor = 0.7;
    if (weather?.type === 'hot') weatherFactor = 0.85;
    if (weather?.type === 'cold') weatherFactor = 0.9;
    const isWeekend = subDays(today, d).getDay() === 0 || subDays(today, d).getDay() === 6;
    const weekendFactor = storeType === 'office' ? 0.5 : storeType === 'school' ? 0.4 : 1.2;

    products.forEach((product, pIdx) => {
      const baseQty = 20 + Math.floor(Math.random() * 30) + (pIdx < 4 ? 20 : 0);

      timeSlots.forEach(slot => {
        const slotMultiplier = multipliers[slot];
        const qty = Math.floor(baseQty * slotMultiplier * weatherFactor * (isWeekend ? weekendFactor : 1) * (0.8 + Math.random() * 0.4));
        if (qty > 0) {
          let promotionType: SalesRecord['promotionType'] = null;
          let effectivePrice = product.price;

          if (slot === 'evening' && Math.random() > 0.5) {
            promotionType = 'timeDiscount';
            effectivePrice = product.price * 0.7;
          }
          if (product.categoryId === 'c002' && Math.random() > 0.8) {
            promotionType = 'buyOneGetOne';
            effectivePrice = product.price * 0.6;
          }
          if (Math.random() > 0.95) {
            promotionType = 'groupBuy';
            effectivePrice = product.price * 0.65;
          }

          records.push({
            id: `sale-${storeId}-${date}-${product.id}-${slot}`,
            storeId,
            productId: product.id,
            date,
            timeSlot: slot,
            quantity: qty,
            amount: parseFloat((qty * effectivePrice).toFixed(2)),
            promotionType,
          });
        }
      });
    });
  }

  return records;
};

export const generateWasteData = (storeId: string, storeType: string, days: number = 14): WasteRecord[] => {
  const records: WasteRecord[] = [];
  const multipliers = storeTypeMultipliers[storeType] || storeTypeMultipliers.community;

  for (let d = 0; d < days; d++) {
    const date = format(subDays(today, d), 'yyyy-MM-dd');
    const isWeekend = subDays(today, d).getDay() === 0 || subDays(today, d).getDay() === 6;
    const weekendFactor = storeType === 'office' ? 1.8 : storeType === 'school' ? 2.0 : 1.0;

    products.forEach((product, pIdx) => {
      const baseWaste = 3 + Math.floor(Math.random() * 8) + (pIdx >= 10 ? 2 : 0);

      timeSlots.forEach(slot => {
        const slotMultiplier = slot === 'night' ? 2.5 : slot === 'evening' ? 1.8 : 0.5;
        const qty = Math.floor(baseWaste * slotMultiplier * multipliers[slot] * (isWeekend ? weekendFactor : 1) * (0.7 + Math.random() * 0.6));
        if (qty > 0) {
          const reasons: WasteRecord['reason'][] = ['expired', 'expired', 'poorQuality', 'customerReturn', 'systemReturn', 'unknown'];
          const reason = reasons[Math.floor(Math.random() * reasons.length)];
          const isSystemReturn = reason === 'systemReturn';

          records.push({
            id: `waste-${storeId}-${date}-${product.id}-${slot}`,
            storeId,
            productId: product.id,
            date,
            timeSlot: slot,
            quantity: qty,
            reason,
            photoUrls: reason !== 'unknown' && Math.random() > 0.3 ? [`/images/waste-${product.id}-${d}.jpg`] : [],
            isSystemReturn,
            remark: isSystemReturn ? '系统自动退货：临期商品' : undefined,
          });
        }
      });
    });
  }

  return records;
};

export const generateOrderPlans = (storeId: string): OrderPlan[] => {
  const plans: OrderPlan[] = [];

  products.forEach(product => {
    const baseQty = 25 + Math.floor(Math.random() * 30);
    plans.push({
      id: `order-${storeId}-${tomorrowStr}-${product.id}`,
      storeId,
      productId: product.id,
      date: tomorrowStr,
      suggestedQty: baseQty,
      adjustedQty: null,
      isConfirmed: false,
    });
  });

  return plans;
};

export const generateDeliveryRecords = (storeId: string, days: number = 14): DeliveryRecord[] => {
  const records: DeliveryRecord[] = [];

  for (let d = 0; d < days; d++) {
    const date = format(subDays(today, d), 'yyyy-MM-dd');
    products.forEach(product => {
      const baseQty = 30 + Math.floor(Math.random() * 20);
      records.push({
        id: `delivery-${storeId}-${date}-${product.id}`,
        storeId,
        productId: product.id,
        date,
        deliveredQty: baseQty,
      });
    });
  }

  return records;
};

export const promotions: DiscountPromotion[] = [
  {
    id: 'promo001',
    name: '晚市折扣',
    type: 'timeDiscount',
    timeSlot: 'evening',
    discountRate: 0.7,
    startDate: format(subDays(today, 30), 'yyyy-MM-dd'),
    endDate: format(addDays(today, 30), 'yyyy-MM-dd'),
  },
  {
    id: 'promo002',
    name: '寿司买一赠一',
    type: 'buyOneGetOne',
    timeSlot: 'afternoon',
    discountRate: 0.5,
    startDate: format(subDays(today, 7), 'yyyy-MM-dd'),
    endDate: format(addDays(today, 7), 'yyyy-MM-dd'),
  },
  {
    id: 'promo003',
    name: '周三团购日',
    type: 'groupBuy',
    timeSlot: 'noon',
    discountRate: 0.65,
    startDate: format(subDays(today, 14), 'yyyy-MM-dd'),
    endDate: format(addDays(today, 14), 'yyyy-MM-dd'),
  },
];

export const allSalesData: Record<string, SalesRecord[]> = {};
export const allWasteData: Record<string, WasteRecord[]> = {};
export const allOrderPlans: Record<string, OrderPlan[]> = {};
export const allDeliveryData: Record<string, DeliveryRecord[]> = {};

stores.forEach(store => {
  allSalesData[store.id] = generateSalesData(store.id, store.type, 14);
  allWasteData[store.id] = generateWasteData(store.id, store.type, 14);
  allOrderPlans[store.id] = generateOrderPlans(store.id);
  allDeliveryData[store.id] = generateDeliveryRecords(store.id, 14);
});

export const getTimeSlotLabel = (slot: TimeSlot): string => timeSlotLabels[slot];
