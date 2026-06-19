import type {
  SalesRecord,
  WasteRecord,
  OrderPlan,
  DeliveryRecord,
  DailyStats,
  TimeSlotStats,
  CategoryStats,
  StoreStats,
  TimeSlot,
  Store,
  Product,
  Category,
  Weather,
  SlowMovingItem,
  PromotionEffect,
  PromotionType,
  TimeSlotWastePattern,
  WeatherWasteAnalysis,
  StoreTypeAnalysis,
  WasteReasonDetail,
  WasteReason,
  OrderSuggestion,
  SupervisorReportData,
  StockoutRecord,
} from '../types';
import { getWasteReasonLabel, getPromotionTypeLabel } from './formatters';
import { format, subDays } from 'date-fns';

export const calculateDailyStats = (
  sales: SalesRecord[],
  waste: WasteRecord[],
  date: string
): DailyStats => {
  const daySales = sales.filter(s => s.date === date);
  const dayWaste = waste.filter(w => w.date === date);

  const totalSales = daySales.reduce((sum, s) => sum + s.amount, 0);
  const totalWasteQty = dayWaste.reduce((sum, w) => sum + w.quantity, 0);
  const totalSalesQty = daySales.reduce((sum, s) => sum + s.quantity, 0);
  const totalQty = totalSalesQty + totalWasteQty;
  const wasteRate = totalQty > 0 ? totalWasteQty / totalQty : 0;

  const discountSales = daySales.filter(s => s.promotionType !== null);
  const discountContribution = discountSales.length > 0
    ? discountSales.reduce((sum, s) => sum + s.amount, 0) / totalSales
    : 0;

  const stockoutCount = Math.floor(Math.random() * 5);

  return {
    date,
    totalSales,
    totalWaste: totalWasteQty,
    wasteRate,
    stockoutCount,
    discountContribution,
  };
};

export const calculateTimeSlotStats = (
  sales: SalesRecord[],
  waste: WasteRecord[],
  date: string
): TimeSlotStats[] => {
  const slots: TimeSlot[] = ['morning', 'noon', 'afternoon', 'evening', 'night'];

  return slots.map(slot => {
    const slotSales = sales.filter(s => s.date === date && s.timeSlot === slot);
    const slotWaste = waste.filter(w => w.date === date && w.timeSlot === slot);

    const salesQty = slotSales.reduce((sum, s) => sum + s.quantity, 0);
    const wasteQty = slotWaste.reduce((sum, w) => sum + w.quantity, 0);
    const discountQty = slotSales.filter(s => s.promotionType !== null).reduce((sum, s) => sum + s.quantity, 0);
    const totalQty = salesQty + wasteQty;
    const wasteRate = totalQty > 0 ? wasteQty / totalQty : 0;

    return {
      timeSlot: slot,
      salesQty,
      wasteQty,
      discountQty,
      wasteRate,
    };
  });
};

export const calculateCategoryStats = (
  sales: SalesRecord[],
  waste: WasteRecord[],
  products: Product[],
  categories: Category[],
  date: string
): CategoryStats[] => {
  return categories.map(cat => {
    const catProducts = products.filter(p => p.categoryId === cat.id);
    const catProductIds = catProducts.map(p => p.id);

    const catSales = sales.filter(s => s.date === date && catProductIds.includes(s.productId));
    const catWaste = waste.filter(w => w.date === date && catProductIds.includes(w.productId));

    const salesQty = catSales.reduce((sum, s) => sum + s.quantity, 0);
    const wasteQty = catWaste.reduce((sum, w) => sum + w.quantity, 0);
    const totalQty = salesQty + wasteQty;
    const wasteRate = totalQty > 0 ? wasteQty / totalQty : 0;
    const stockoutRate = Math.random() * 0.1;

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      salesQty,
      wasteQty,
      wasteRate,
      stockoutRate,
    };
  });
};

export const calculateStoreStats = (
  store: Store,
  sales: SalesRecord[],
  waste: WasteRecord[],
  date: string
): StoreStats => {
  const storeSales = sales.filter(s => s.storeId === store.id);
  const storeWaste = waste.filter(w => w.storeId === store.id);

  const todayStats = calculateDailyStats(storeSales, storeWaste, date);
  const yesterday = format(subDays(new Date(date), 1), 'yyyy-MM-dd');
  const yesterdayStats = calculateDailyStats(storeSales, storeWaste, yesterday);

  const wasteRateChange = yesterdayStats.wasteRate > 0
    ? (todayStats.wasteRate - yesterdayStats.wasteRate) / yesterdayStats.wasteRate
    : 0;

  const last7Days = Array.from({ length: 7 }, (_, i) =>
    format(subDays(new Date(date), i), 'yyyy-MM-dd')
  );

  const avgWasteRate = last7Days.reduce((sum, d) => {
    const stats = calculateDailyStats(storeSales, storeWaste, d);
    return sum + stats.wasteRate;
  }, 0) / 7;

  return {
    storeId: store.id,
    storeName: store.name,
    storeType: store.type,
    wasteRate: todayStats.wasteRate,
    wasteRateChange,
    totalSales: todayStats.totalSales,
    avgWasteRate,
  };
};

export const calculateTrendData = (
  sales: SalesRecord[],
  waste: WasteRecord[],
  days: number = 7
): { dates: string[]; wasteRates: number[]; salesAmounts: number[] } => {
  const dates: string[] = [];
  const wasteRates: number[] = [];
  const salesAmounts: number[] = [];

  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = format(subDays(today, i), 'yyyy-MM-dd');
    const stats = calculateDailyStats(sales, waste, date);
    dates.push(date);
    wasteRates.push(stats.wasteRate);
    salesAmounts.push(stats.totalSales);
  }

  return { dates, wasteRates, salesAmounts };
};

export const calculateWeatherWasteCorrelation = (
  stores: Store[],
  sales: Record<string, SalesRecord[]>,
  waste: Record<string, WasteRecord[]>,
  weather: Weather[],
  date: string
): Array<{ weatherType: string; avgWasteRate: number; storeCount: number }> => {
  const weatherMap = new Map<string, { total: number; count: number }>();

  stores.forEach(store => {
    const dayWeather = weather.find(w => w.date === date);
    if (!dayWeather) return;

    const storeStats = calculateStoreStats(store, sales[store.id] || [], waste[store.id] || [], date);

    const existing = weatherMap.get(dayWeather.type) || { total: 0, count: 0 };
    weatherMap.set(dayWeather.type, {
      total: existing.total + storeStats.wasteRate,
      count: existing.count + 1,
    });
  });

  const result: Array<{ weatherType: string; avgWasteRate: number; storeCount: number }> = [];
  weatherMap.forEach((value, key) => {
    result.push({
      weatherType: key,
      avgWasteRate: value.total / value.count,
      storeCount: value.count,
    });
  });

  return result;
};

export const calculateStoreTypeComparison = (
  stores: Store[],
  sales: Record<string, SalesRecord[]>,
  waste: Record<string, WasteRecord[]>,
  date: string
): Array<{ storeType: string; avgWasteRate: number; storeCount: number; avgSales: number }> => {
  const typeMap = new Map<string, { totalWaste: number; totalSales: number; count: number }>();

  stores.forEach(store => {
    const storeStats = calculateStoreStats(store, sales[store.id] || [], waste[store.id] || [], date);

    const existing = typeMap.get(store.type) || { totalWaste: 0, totalSales: 0, count: 0 };
    typeMap.set(store.type, {
      totalWaste: existing.totalWaste + storeStats.wasteRate,
      totalSales: existing.totalSales + storeStats.totalSales,
      count: existing.count + 1,
    });
  });

  const result: Array<{ storeType: string; avgWasteRate: number; storeCount: number; avgSales: number }> = [];
  typeMap.forEach((value, key) => {
    result.push({
      storeType: key,
      avgWasteRate: value.totalWaste / value.count,
      storeCount: value.count,
      avgSales: value.totalSales / value.count,
    });
  });

  return result;
};

export const calculateSuggestedOrderQty = (
  productId: string,
  sales: SalesRecord[],
  waste: WasteRecord[],
  weather: Weather[],
  tomorrowWeather?: Weather
): number => {
  const productSales = sales.filter(s => s.productId === productId);
  const productWaste = waste.filter(w => w.productId === productId);

  const last7Days = Array.from({ length: 7 }, (_, i) =>
    format(subDays(new Date(), i + 1), 'yyyy-MM-dd')
  );

  let totalQty = 0;
  let daysWithData = 0;

  last7Days.forEach(date => {
    const daySales = productSales.filter(s => s.date === date).reduce((sum, s) => sum + s.quantity, 0);
    const dayWaste = productWaste.filter(w => w.date === date).reduce((sum, w) => sum + w.quantity, 0);

    if (daySales + dayWaste > 0) {
      totalQty += daySales + dayWaste;
      daysWithData++;
    }
  });

  const avgQty = daysWithData > 0 ? totalQty / daysWithData : 20;

  let weatherFactor = 1;
  if (tomorrowWeather) {
    if (tomorrowWeather.type === 'rainy') weatherFactor = 0.8;
    if (tomorrowWeather.type === 'hot') weatherFactor = 0.9;
    if (tomorrowWeather.type === 'cold') weatherFactor = 1.1;
    if (tomorrowWeather.type === 'sunny') weatherFactor = 1.05;
  }

  const wasteRate = avgQty > 0
    ? productWaste.slice(0, 7).reduce((sum, w) => sum + w.quantity, 0) / (avgQty * 7)
    : 0.1;

  const wasteAdjustment = 1 - wasteRate * 0.3;

  return Math.round(avgQty * weatherFactor * wasteAdjustment);
};

export const calculateSlowMovingItems = (
  sales: SalesRecord[],
  waste: WasteRecord[],
  products: Product[],
  categories: Category[],
  days: number = 7
): SlowMovingItem[] => {
  const dateRange = Array.from({ length: days }, (_, i) =>
    format(subDays(new Date(), i + 1), 'yyyy-MM-dd')
  );

  const items: SlowMovingItem[] = products.map(product => {
    const productSales = sales.filter(s => s.productId === product.id && dateRange.includes(s.date));
    const productWaste = waste.filter(w => w.productId === product.id && dateRange.includes(w.date));

    const totalSales = productSales.reduce((sum, s) => sum + s.quantity, 0);
    const totalWaste = productWaste.reduce((sum, w) => sum + w.quantity, 0);
    const avgDailySales = totalSales / days;
    const avgDailyWaste = totalWaste / days;
    const totalQty = totalSales + totalWaste;
    const wasteRate = totalQty > 0 ? totalWaste / totalQty : 0;

    const stockTurnoverDays = avgDailySales > 0 ? (totalSales / days) / avgDailySales : 999;

    const category = categories.find(c => c.id === product.categoryId);

    return {
      productId: product.id,
      productName: product.name,
      categoryId: product.categoryId,
      categoryName: category?.name || '',
      avgDailySales,
      avgDailyWaste,
      wasteRate,
      stockTurnoverDays,
    };
  });

  return items.sort((a, b) => b.wasteRate - a.wasteRate);
};

export const calculatePromotionEffect = (
  sales: SalesRecord[],
  waste: WasteRecord[],
  products: Product[],
  days: number = 7
): PromotionEffect[] => {
  const dateRange = Array.from({ length: days }, (_, i) =>
    format(subDays(new Date(), i + 1), 'yyyy-MM-dd')
  );

  const promotionTypes: PromotionType[] = ['buyOneGetOne', 'timeDiscount', 'groupBuy'];

  return promotionTypes.map(type => {
    const promoSales = sales.filter(s => s.promotionType === type && dateRange.includes(s.date));
    const totalSalesQty = promoSales.reduce((sum, s) => sum + s.quantity, 0);
    const totalSalesAmount = promoSales.reduce((sum, s) => sum + s.amount, 0);

    const normalSales = sales.filter(s => s.promotionType === null && dateRange.includes(s.date));
    const avgNormalPrice = normalSales.length > 0
      ? normalSales.reduce((sum, s) => sum + s.amount) / normalSales.reduce((sum, s) => sum + s.quantity, 0)
      : 10;

    const estimatedWasteReduction = totalSalesQty * 0.3;
    const wasteReductionValue = estimatedWasteReduction * avgNormalPrice;
    const profitImpact = totalSalesAmount - wasteReductionValue;
    const effectiveness = wasteReductionValue > 0 ? totalSalesAmount / wasteReductionValue : 0;

    const promotionNames: Record<string, string> = {
      buyOneGetOne: '买一赠一',
      timeDiscount: '时段折扣',
      groupBuy: '临时团购',
    };

    return {
      promotionType: type,
      promotionName: promotionNames[type as string] || '',
      totalSalesQty,
      totalSalesAmount,
      wasteReduction: estimatedWasteReduction,
      profitImpact,
      effectiveness,
    };
  });
};

export const calculateTimeSlotWastePatterns = (
  stores: Store[],
  sales: Record<string, SalesRecord[]>,
  waste: Record<string, WasteRecord[]>,
  days: number = 7
): TimeSlotWastePattern[] => {
  const slots: TimeSlot[] = ['morning', 'noon', 'afternoon', 'evening', 'night'];
  const patterns: TimeSlotWastePattern[] = [];
  const dateRange = Array.from({ length: days }, (_, i) =>
    format(subDays(new Date(), i + 1), 'yyyy-MM-dd')
  );

  stores.forEach(store => {
    const storeSales = sales[store.id] || [];
    const storeWaste = waste[store.id] || [];

    slots.forEach(slot => {
      const slotWaste = storeWaste.filter(w => w.timeSlot === slot && dateRange.includes(w.date));
      const slotSales = storeSales.filter(s => s.timeSlot === slot && dateRange.includes(s.date));

      const totalWasteQty = slotWaste.reduce((sum, w) => sum + w.quantity, 0);
      const totalSalesQty = slotSales.reduce((sum, s) => sum + s.quantity, 0);
      const avgWasteQty = totalWasteQty / days;
      const totalQty = totalSalesQty + totalWasteQty;
      const wasteRate = totalQty > 0 ? totalWasteQty / totalQty : 0;

      const firstHalf = dateRange.slice(0, Math.floor(days / 2));
      const secondHalf = dateRange.slice(Math.floor(days / 2));
      const firstHalfWaste = slotWaste.filter(w => firstHalf.includes(w.date)).reduce((sum, w) => sum + w.quantity, 0);
      const secondHalfWaste = slotWaste.filter(w => secondHalf.includes(w.date)).reduce((sum, w) => sum + w.quantity, 0);

      const changeRate = firstHalfWaste > 0 ? (secondHalfWaste - firstHalfWaste) / firstHalfWaste : 0;
      let trend: 'rising' | 'falling' | 'stable' = 'stable';
      if (changeRate > 0.1) trend = 'rising';
      else if (changeRate < -0.1) trend = 'falling';

      const daysWithWaste = slotWaste.filter((w, i, arr) =>
        arr.findIndex(x => x.date === w.date) === i
      ).length;
      const frequency = daysWithWaste / days;

      patterns.push({
        timeSlot: slot,
        storeId: store.id,
        storeName: store.name,
        avgWasteQty,
        wasteRate,
        frequency,
        trend,
      });
    });
  });

  return patterns.sort((a, b) => b.wasteRate - a.wasteRate);
};

export const calculateWeatherWasteAnalysis = (
  stores: Store[],
  sales: Record<string, SalesRecord[]>,
  waste: Record<string, WasteRecord[]>,
  weather: Weather[],
  days: number = 14
): WeatherWasteAnalysis[] => {
  const dateRange = Array.from({ length: days }, (_, i) =>
    format(subDays(new Date(), i + 1), 'yyyy-MM-dd')
  );

  const weatherMap = new Map<string, { totalWasteRate: number; totalSales: number; count: number }>();
  let overallAvgWasteRate = 0;
  let overallCount = 0;

  stores.forEach(store => {
    const storeSales = sales[store.id] || [];
    const storeWaste = waste[store.id] || [];

    dateRange.forEach(date => {
      const dayWeather = weather.find(w => w.date === date);
      if (!dayWeather) return;

      const daySales = storeSales.filter(s => s.date === date);
      const dayWaste = storeWaste.filter(w => w.date === date);

      const salesQty = daySales.reduce((sum, s) => sum + s.quantity, 0);
      const wasteQty = dayWaste.reduce((sum, w) => sum + w.quantity, 0);
      const totalQty = salesQty + wasteQty;
      const wasteRate = totalQty > 0 ? wasteQty / totalQty : 0;
      const salesAmount = daySales.reduce((sum, s) => sum + s.amount, 0);

      const existing = weatherMap.get(dayWeather.type) || { totalWasteRate: 0, totalSales: 0, count: 0 };
      weatherMap.set(dayWeather.type, {
        totalWasteRate: existing.totalWasteRate + wasteRate,
        totalSales: existing.totalSales + salesAmount,
        count: existing.count + 1,
      });

      overallAvgWasteRate += wasteRate;
      overallCount++;
    });
  });

  const avgWasteRate = overallCount > 0 ? overallAvgWasteRate / overallCount : 0;

  const result: WeatherWasteAnalysis[] = [];
  weatherMap.forEach((value, key) => {
    result.push({
      weatherType: key as any,
      avgWasteRate: value.count > 0 ? value.totalWasteRate / value.count : 0,
      avgSalesAmount: value.count > 0 ? value.totalSales / value.count : 0,
      storeCount: Math.ceil(value.count / days),
      comparedToNormal: avgWasteRate > 0
        ? ((value.totalWasteRate / value.count) - avgWasteRate) / avgWasteRate
        : 0,
    });
  });

  return result.sort((a, b) => b.avgWasteRate - a.avgWasteRate);
};

export const calculateStoreTypeAnalysis = (
  stores: Store[],
  sales: Record<string, SalesRecord[]>,
  waste: Record<string, WasteRecord[]>,
  days: number = 7
): StoreTypeAnalysis[] => {
  const typeMap = new Map<string, {
    stores: Store[];
    totalWasteRate: number;
    totalSales: number;
    count: number;
    slotData: Record<TimeSlot, { wasteRate: number; count: number }>;
  }>();

  const slots: TimeSlot[] = ['morning', 'noon', 'afternoon', 'evening', 'night'];
  const dateRange = Array.from({ length: days }, (_, i) =>
    format(subDays(new Date(), i + 1), 'yyyy-MM-dd')
  );

  stores.forEach(store => {
    const storeSales = sales[store.id] || [];
    const storeWaste = waste[store.id] || [];

    const existing = typeMap.get(store.type) || {
      stores: [] as Store[],
      totalWasteRate: 0,
      totalSales: 0,
      count: 0,
      slotData: slots.reduce((acc, slot) => {
        acc[slot] = { wasteRate: 0, count: 0 };
        return acc;
      }, {} as Record<TimeSlot, { wasteRate: number; count: number }>),
    };

    existing.stores.push(store);

    dateRange.forEach(date => {
      const daySales = storeSales.filter(s => s.date === date);
      const dayWaste = storeWaste.filter(w => w.date === date);

      const salesQty = daySales.reduce((sum, s) => sum + s.quantity, 0);
      const wasteQty = dayWaste.reduce((sum, w) => sum + w.quantity, 0);
      const totalQty = salesQty + wasteQty;
      const wasteRate = totalQty > 0 ? wasteQty / totalQty : 0;
      const salesAmount = daySales.reduce((sum, s) => sum + s.amount, 0);

      existing.totalWasteRate += wasteRate;
      existing.totalSales += salesAmount;
      existing.count++;

      slots.forEach(slot => {
        const slotSales = daySales.filter(s => s.timeSlot === slot);
        const slotWaste = dayWaste.filter(w => w.timeSlot === slot);
        const slotSalesQty = slotSales.reduce((sum, s) => sum + s.quantity, 0);
        const slotWasteQty = slotWaste.reduce((sum, w) => sum + w.quantity, 0);
        const slotTotal = slotSalesQty + slotWasteQty;
        const slotWasteRate = slotTotal > 0 ? slotWasteQty / slotTotal : 0;

        existing.slotData[slot].wasteRate += slotWasteRate;
        existing.slotData[slot].count++;
      });
    });

    typeMap.set(store.type, existing);
  });

  const result: StoreTypeAnalysis[] = [];
  typeMap.forEach((value, key) => {
    const avgWasteRate = value.count > 0 ? value.totalWasteRate / value.count : 0;
    const avgSales = value.count > 0 ? value.totalSales / value.count : 0;

    let bestSlot: TimeSlot = 'morning';
    let worstSlot: TimeSlot = 'morning';
    let minWasteRate = Infinity;
    let maxWasteRate = -Infinity;

    slots.forEach(slot => {
      const slotAvg = value.slotData[slot].count > 0
        ? value.slotData[slot].wasteRate / value.slotData[slot].count
        : 0;
      if (slotAvg < minWasteRate) {
        minWasteRate = slotAvg;
        bestSlot = slot;
      }
      if (slotAvg > maxWasteRate) {
        maxWasteRate = slotAvg;
        worstSlot = slot;
      }
    });

    result.push({
      storeType: key as any,
      storeCount: value.stores.length,
      avgWasteRate,
      avgSalesAmount: avgSales,
      avgStockoutRate: 0.05 + Math.random() * 0.05,
      bestTimeSlot: bestSlot,
      worstTimeSlot: worstSlot,
    });
  });

  return result;
};

export const calculateWasteReasonDetails = (
  waste: WasteRecord[],
  products: Product[],
  date: string
): WasteReasonDetail[] => {
  const reasons: WasteReason[] = ['expired', 'poorQuality', 'customerReturn', 'systemReturn', 'unknown'];
  const dayWaste = waste.filter(w => w.date === date);
  const totalQty = dayWaste.reduce((sum, w) => sum + w.quantity, 0);

  const descriptions: Record<WasteReason, string> = {
    expired: '商品超过保质期，无法继续销售。建议优化订货量，加快周转。',
    poorQuality: '商品品相不佳（如变形、变色等），影响销售。建议检查运输和陈列方式。',
    customerReturn: '顾客退回的商品，多因口味不合或质量问题。建议关注商品品质。',
    systemReturn: '系统自动发起的退货，通常因临期预警。不计入门店考核，需配合复核。',
    unknown: '报损原因未填写。建议尽量明确原因，便于后续分析改进。',
  };

  const attentionReasons: WasteReason[] = ['unknown', 'expired'];

  return reasons.map(reason => {
    const reasonWaste = dayWaste.filter(w => w.reason === reason);
    const quantity = reasonWaste.reduce((sum, w) => sum + w.quantity, 0);

    let amount = 0;
    reasonWaste.forEach(w => {
      const product = products.find(p => p.id === w.productId);
      if (product) amount += product.price * w.quantity;
    });

    const percentage = totalQty > 0 ? quantity / totalQty : 0;

    return {
      reason,
      reasonLabel: getWasteReasonLabel(reason),
      quantity,
      amount,
      percentage,
      description: descriptions[reason],
      needsAttention: attentionReasons.includes(reason),
    };
  });
};

export const calculateOrderSuggestions = (
  sales: SalesRecord[],
  waste: WasteRecord[],
  products: Product[],
  categories: Category[],
  weather: Weather[],
  tomorrowWeather?: Weather
): OrderSuggestion[] => {
  return products.map(product => {
    const category = categories.find(c => c.id === product.categoryId);
    const suggestedQty = calculateSuggestedOrderQty(product.id, sales, waste, weather, tomorrowWeather);

    const last7Days = Array.from({ length: 7 }, (_, i) =>
      format(subDays(new Date(), i + 1), 'yyyy-MM-dd')
    );
    const productSales = sales.filter(s => s.productId === product.id && last7Days.includes(s.date));
    const productWaste = waste.filter(w => w.productId === product.id && last7Days.includes(w.date));

    const totalSales = productSales.reduce((sum, s) => sum + s.quantity, 0);
    const totalWaste = productWaste.reduce((sum, w) => sum + w.quantity, 0);
    const baseOnHistory = Math.round((totalSales + totalWaste) / 7);

    let weatherAdjustment = 0;
    if (tomorrowWeather) {
      if (tomorrowWeather.type === 'rainy') weatherAdjustment = -Math.round(baseOnHistory * 0.2);
      else if (tomorrowWeather.type === 'hot') weatherAdjustment = -Math.round(baseOnHistory * 0.1);
      else if (tomorrowWeather.type === 'cold') weatherAdjustment = Math.round(baseOnHistory * 0.1);
      else if (tomorrowWeather.type === 'sunny') weatherAdjustment = Math.round(baseOnHistory * 0.05);
    }

    const wasteRate = baseOnHistory > 0 ? totalWaste / (totalSales + totalWaste) : 0;
    const wasteAdjustment = -Math.round(baseOnHistory * wasteRate * 0.3);

    const first3Days = last7Days.slice(0, 3);
    const last3Days = last7Days.slice(4);
    const first3Avg = first3Days.reduce((sum, d) => {
      const daySales = productSales.filter(s => s.date === d).reduce((s2, r) => s2 + r.quantity, 0);
      return sum + daySales;
    }, 0) / 3;
    const last3Avg = last3Days.reduce((sum, d) => {
      const daySales = productSales.filter(s => s.date === d).reduce((s2, r) => s2 + r.quantity, 0);
      return sum + daySales;
    }, 0) / 3;
    const trendAdjustment = first3Avg > 0 ? Math.round((last3Avg - first3Avg) / first3Avg * baseOnHistory * 0.2) : 0;

    let confidence: 'high' | 'medium' | 'low' = 'medium';
    if (totalSales > 100 && wasteRate < 0.1) confidence = 'high';
    else if (totalSales < 30 || wasteRate > 0.25) confidence = 'low';

    const reasons: string[] = [];
    if (baseOnHistory > 0) reasons.push(`基于近7天日均销售 ${baseOnHistory} 件`);
    if (weatherAdjustment !== 0 && tomorrowWeather) {
      reasons.push(`明日${tomorrowWeather.type === 'rainy' ? '降雨' : tomorrowWeather.type === 'hot' ? '高温' : tomorrowWeather.type === 'cold' ? '寒冷' : '晴好'}，${weatherAdjustment > 0 ? '增加' : '减少'}${Math.abs(weatherAdjustment)}件`);
    }
    if (wasteAdjustment !== 0) reasons.push(`报损率${(wasteRate * 100).toFixed(1)}%，优化减少${Math.abs(wasteAdjustment)}件`);
    if (trendAdjustment !== 0) reasons.push(`销售趋势${trendAdjustment > 0 ? '上升' : '下降'}，调整${trendAdjustment > 0 ? '增加' : '减少'}${Math.abs(trendAdjustment)}件`);

    return {
      productId: product.id,
      productName: product.name,
      categoryId: product.categoryId,
      categoryName: category?.name || '',
      suggestedQty,
      adjustedQty: null,
      baseOnHistory,
      weatherAdjustment,
      wasteAdjustment,
      trendAdjustment,
      confidence,
      reasons,
    };
  });
};

export const generateSupervisorReport = (
  stores: Store[],
  sales: Record<string, SalesRecord[]>,
  waste: Record<string, WasteRecord[]>,
  weather: Weather[],
  days: number = 7
): SupervisorReportData => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const periodEnd = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const periodStart = format(subDays(new Date(), days), 'yyyy-MM-dd');

  const storeStats = stores.map(store =>
    calculateStoreStats(store, sales[store.id] || [], waste[store.id] || [], today)
  );

  const avgWasteRate = storeStats.reduce((sum, s) => sum + s.wasteRate, 0) / storeStats.length;
  const avgWasteRateChange = storeStats.reduce((sum, s) => sum + s.wasteRateChange, 0) / storeStats.length;
  const totalSales = storeStats.reduce((sum, s) => sum + s.totalSales, 0);

  let totalWasteAmount = 0;
  stores.forEach(store => {
    const storeWaste = waste[store.id] || [];
    const dateRange = Array.from({ length: days }, (_, i) =>
      format(subDays(new Date(), i), 'yyyy-MM-dd')
    );
    storeWaste
      .filter(w => dateRange.includes(w.date))
      .forEach(w => {
        const product = (sales[store.id] || []).find(s => s.productId === w.productId);
      });
  });

  const sortedStores = [...storeStats].sort((a, b) => b.wasteRate - a.wasteRate);
  const topProblemStores = sortedStores.slice(0, 3);
  const bestPerformingStores = sortedStores.slice(-3).reverse();

  const wastePatterns = calculateTimeSlotWastePatterns(stores, sales, waste, days);
  const commonPatterns = wastePatterns
    .filter(p => p.frequency > 0.7)
    .slice(0, 10);

  const weatherImpact = calculateWeatherWasteAnalysis(stores, sales, waste, weather, days);
  const storeTypeComparison = calculateStoreTypeAnalysis(stores, sales, waste, days);

  const recommendations: string[] = [];

  if (topProblemStores.length > 0 && topProblemStores[0].wasteRate > 0.15) {
    recommendations.push(`${topProblemStores[0].storeName}报损率偏高，建议重点关注并优化订货策略。`);
  }

  const eveningPatterns = commonPatterns.filter(p => p.timeSlot === 'evening');
  if (eveningPatterns.length >= 2) {
    recommendations.push('多家门店晚间报损频繁，建议加强晚市折扣力度或减少晚市订货量。');
  }

  const rainyWeather = weatherImpact.find(w => w.weatherType === 'rainy');
  if (rainyWeather && rainyWeather.comparedToNormal > 0.1) {
    recommendations.push('雨天报损率明显上升，建议雨天前适度减少订货量。');
  }

  const unknownReasonStores = stores.filter(store => {
    const storeWaste = waste[store.id] || [];
    const unknownWaste = storeWaste.filter(w => w.reason === 'unknown');
    const totalWaste = storeWaste.length;
    return totalWaste > 0 && unknownWaste.length / totalWaste > 0.1;
  });
  if (unknownReasonStores.length > 0) {
    recommendations.push(`${unknownReasonStores.length}家门店报损原因空白较多，建议加强培训，规范报损录入。`);
  }

  if (recommendations.length === 0) {
    recommendations.push('各门店整体表现良好，继续保持当前运营水平。');
  }

  return {
    periodStart,
    periodEnd,
    totalStores: stores.length,
    avgWasteRate,
    wasteRateChange: avgWasteRateChange,
    totalSales,
    totalWasteAmount: totalSales * avgWasteRate,
    topProblemStores,
    bestPerformingStores,
    commonWastePatterns: commonPatterns,
    weatherImpact,
    storeTypeComparison,
    recommendations,
  };
};

export const calculateStockoutAnalysis = (
  sales: SalesRecord[],
  waste: WasteRecord[],
  delivery: DeliveryRecord[],
  products: Product[],
  date: string
): StockoutRecord[] => {
  const stockouts: StockoutRecord[] = [];
  const daySales = sales.filter(s => s.date === date);
  const dayDelivery = delivery.filter(d => d.date === date);

  products.forEach(product => {
    const productSales = daySales.filter(s => s.productId === product.id);
    const productDelivery = dayDelivery.find(d => d.productId === product.id);

    if (productDelivery && productSales.length > 0) {
      const totalSalesQty = productSales.reduce((sum, s) => sum + s.quantity, 0);
      const deliveryQty = productDelivery.deliveredQty;

      const salesPattern = productSales.reduce((acc, s) => {
        acc[s.timeSlot] = (acc[s.timeSlot] || 0) + s.quantity;
        return acc;
      }, {} as Record<string, number>);

      let stockoutQty = 0;
      let stockoutSlot: TimeSlot | null = null;

      const slots: TimeSlot[] = ['morning', 'noon', 'afternoon', 'evening', 'night'];
      let cumulativeSales = 0;
      for (const slot of slots) {
        cumulativeSales += salesPattern[slot] || 0;
        if (cumulativeSales > deliveryQty * 0.9 && !stockoutSlot) {
          stockoutSlot = slot;
          stockoutQty = Math.max(0, cumulativeSales - deliveryQty);
          break;
        }
      }

      if (stockoutQty > 0 && stockoutSlot) {
        stockouts.push({
          id: `stockout-${product.id}-${date}`,
          storeId: daySales[0]?.storeId || '',
          productId: product.id,
          date,
          timeSlot: stockoutSlot,
          estimatedLostQty: stockoutQty,
          estimatedLostAmount: stockoutQty * product.price,
        });
      }
    }
  });

  return stockouts;
};
