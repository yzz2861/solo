import { Order, SalesAnalysis, WardCount, MealType } from '../types';

export const calculateWeightedAverage = (values: number[], weights: number[]): number => {
  if (values.length === 0 || weights.length === 0) return 0;
  
  const actualWeights = weights.slice(0, values.length);
  const weightSum = actualWeights.reduce((a, b) => a + b, 0);
  const normalizedWeights = actualWeights.map(w => w / weightSum);
  
  return values.reduce((sum, value, index) => sum + value * normalizedWeights[index], 0);
};

export const calculateStandardDeviation = (values: number[]): number => {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1);
  
  return Math.sqrt(variance);
};

export const calculateConfidence = (historicalData: SalesAnalysis[]): number => {
  if (historicalData.length < 3) return 50;
  
  const variances = historicalData.map(d => Math.abs(d.varianceRate));
  const avgVariance = variances.reduce((a, b) => a + b, 0) / variances.length;
  
  const confidence = Math.max(30, Math.min(95, 100 - avgVariance * 2));
  return Math.round(confidence);
};

export const aggregateSalesData = (
  orders: Order[],
  wardCounts: WardCount[]
): SalesAnalysis[] => {
  const grouped: Record<string, {
    orders: Order[];
    refunds: Order[];
    wardCount?: WardCount;
  }> = {};
  
  orders.forEach(order => {
    const key = `${order.orderDate}-${order.wardId}-${order.mealType}`;
    if (!grouped[key]) {
      grouped[key] = { orders: [], refunds: [] };
    }
    
    if (order.status === 'refunded') {
      grouped[key].refunds.push(order);
    } else {
      grouped[key].orders.push(order);
    }
  });
  
  wardCounts.forEach(wc => {
    const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'supper'];
    mealTypes.forEach(mt => {
      const key = `${wc.reportDate}-${wc.wardId}-${mt}`;
      if (!grouped[key]) {
        grouped[key] = { orders: [], refunds: [] };
      }
      grouped[key].wardCount = wc;
    });
  });
  
  return Object.entries(grouped).map(([key, data]) => {
    const [date, wardId, mealType] = key.split('-');
    const orderCount = data.orders.reduce((sum, o) => sum + o.quantity, 0);
    const refundCount = data.refunds.reduce((sum, o) => sum + o.quantity, 0);
    const netSales = orderCount - refundCount;
    const wardReportedCount = data.wardCount?.companionCount || 0;
    const variance = netSales - wardReportedCount;
    const varianceRate = wardReportedCount > 0 
      ? Math.round((variance / wardReportedCount) * 100) 
      : 0;
    
    return {
      date,
      wardId,
      wardName: data.wardCount?.wardName || '未知病区',
      mealType: mealType as MealType,
      orderCount,
      refundCount,
      netSales,
      wardReportedCount,
      variance,
      varianceRate,
      orders: [...data.orders, ...data.refunds]
    };
  }).sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    if (a.wardId !== b.wardId) return a.wardId.localeCompare(b.wardId);
    return 0;
  });
};

export const calculateTotalSales = (salesData: SalesAnalysis[]): number => {
  return salesData.reduce((sum, d) => sum + d.netSales, 0);
};

export const calculateRefundRate = (salesData: SalesAnalysis[]): number => {
  const totalOrders = salesData.reduce((sum, d) => sum + d.orderCount, 0);
  const totalRefunds = salesData.reduce((sum, d) => sum + d.refundCount, 0);
  
  if (totalOrders === 0) return 0;
  return Math.round((totalRefunds / totalOrders) * 100 * 10) / 10;
};

export const calculateWasteRate = (salesData: SalesAnalysis[]): number => {
  const positiveVariances = salesData
    .filter(d => d.variance > 0)
    .reduce((sum, d) => sum + d.variance, 0);
  const totalSales = calculateTotalSales(salesData);
  
  if (totalSales === 0) return 0;
  return Math.round((positiveVariances / totalSales) * 100 * 10) / 10;
};

export const calculateShortageCount = (salesData: SalesAnalysis[]): number => {
  return salesData.filter(d => d.variance < -5).length;
};

export const calculateKPIs = (salesData: SalesAnalysis[]) => {
  const totalOrders = salesData.reduce((sum, d) => sum + d.orderCount, 0);
  const totalRefunds = salesData.reduce((sum, d) => sum + d.refundCount, 0);
  const netSales = totalOrders - totalRefunds;
  const refundRate = totalOrders > 0 ? Math.round((totalRefunds / totalOrders) * 100 * 10) / 10 : 0;
  
  const totalWardCount = salesData.reduce((sum, d) => sum + d.wardReportedCount, 0) / Math.max(1, new Set(salesData.map(d => d.date)).size);
  const avgPreparationVariance = salesData.length > 0 
    ? Math.abs(salesData.reduce((sum, d) => sum + d.variance, 0)) / salesData.length
    : 0;
  
  const dateList = Array.from(new Set(salesData.map(d => d.date)));
  const today = dateList.length > 0 ? dateList[dateList.length - 1] : '';
  const todaySales = salesData
    .filter(d => d.date === today)
    .reduce((sum, d) => sum + d.netSales, 0);
  const tomorrowForecast = Math.round(todaySales * 1.06);
  
  const pendingSpecialMeals = 12;
  const wardsPendingReport = 3;
  const tomorrowChanges = 28;
  
  return {
    totalOrders: netSales,
    refundRate,
    totalWardCount: Math.round(totalWardCount / 4),
    tomorrowForecast,
    pendingSpecialMeals,
    avgPreparationVariance,
    wardsPendingReport,
    tomorrowChanges
  };
};
