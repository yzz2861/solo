import type {
  InventoryRecord,
  DiscountRecord,
  SalesRecord,
  LossRecord,
  DiscountPerformance,
  CategoryAnalysis,
  StoreAnalysis,
  ClearanceTimelineItem,
  DataQualityIssue,
} from '../types';
import { daysBetween, addDays, isSameDay, detectDateFormat } from './dateUtils';

export function analyzeDiscountPerformance(
  inventory: InventoryRecord[],
  discounts: DiscountRecord[],
  sales: SalesRecord[],
  losses: LossRecord[]
): DiscountPerformance[] {
  const results: DiscountPerformance[] = [];

  discounts.forEach((discount) => {
    const inv = inventory.find(
      (i) => i.sku === discount.sku && i.storeId === discount.storeId
    );
    if (!inv) return;

    const salesDuringDiscount = sales.filter(
      (s) =>
        s.sku === discount.sku &&
        s.storeId === discount.storeId &&
        s.saleDate >= discount.discountStartDate &&
        s.saleDate <= discount.discountEndDate
    );

    const soldQty = salesDuringDiscount.reduce((sum, s) => sum + s.quantity, 0);

    const lossesAfterDiscount = losses.filter(
      (l) =>
        l.sku === discount.sku &&
        l.storeId === discount.storeId &&
        l.lossDate >= discount.discountStartDate
    );

    const lostQty = lossesAfterDiscount.reduce((sum, l) => sum + l.quantity, 0);

    const initialStock = inv.quantity + soldQty + lostQty;
    const remaining = Math.max(0, initialStock - soldQty - lostQty);
    const sellThrough = initialStock > 0 ? soldQty / initialStock : 0;
    const lossRate = initialStock > 0 ? lostQty / initialStock : 0;

    const daysBeforeExpiry = daysBetween(discount.discountStartDate, inv.expiryDate);
    const daysToClear = soldQty > 0
      ? daysBetween(discount.discountStartDate, salesDuringDiscount[salesDuringDiscount.length - 1].saleDate)
      : daysBetween(discount.discountStartDate, discount.discountEndDate);

    results.push({
      sku: discount.sku,
      productName: discount.productName,
      category: discount.category,
      storeId: discount.storeId,
      storeName: discount.storeName,
      discountStartDate: discount.discountStartDate,
      discountRate: discount.discountRate,
      initialStock,
      soldDuringDiscount: soldQty,
      remainingAfterDiscount: remaining,
      lostQuantity: lostQty,
      sellThroughRate: sellThrough,
      lossRate,
      daysBeforeExpiryAtDiscount: daysBeforeExpiry,
      daysToClear,
      shelfLocation: discount.shelfLocationAtDiscount || inv.shelfLocation,
      notes: discount.notes,
    });
  });

  return results;
}

export function analyzeByCategory(
  performance: DiscountPerformance[],
  losses: LossRecord[]
): CategoryAnalysis[] {
  const categoryMap = new Map<string, {
    totalStock: number;
    totalSold: number;
    totalLost: number;
    totalRevenue: number;
    totalLossCost: number;
    discountRates: number[];
    daysBeforeExpiry: number[];
    clearDays: number[];
    highRisk: Set<string>;
    reasonCount: Map<string, number>;
  }>();

  performance.forEach((p) => {
    if (!categoryMap.has(p.category)) {
      categoryMap.set(p.category, {
        totalStock: 0,
        totalSold: 0,
        totalLost: 0,
        totalRevenue: 0,
        totalLossCost: 0,
        discountRates: [],
        daysBeforeExpiry: [],
        clearDays: [],
        highRisk: new Set(),
        reasonCount: new Map(),
      });
    }

    const cat = categoryMap.get(p.category)!;
    cat.totalStock += p.initialStock;
    cat.totalSold += p.soldDuringDiscount;
    cat.totalLost += p.lostQuantity;
    cat.totalRevenue += p.soldDuringDiscount * p.discountRate;
    cat.discountRates.push(p.discountRate);
    cat.daysBeforeExpiry.push(p.daysBeforeExpiryAtDiscount);
    cat.clearDays.push(p.daysToClear);

    if (p.lossRate > 0.3) {
      cat.highRisk.add(p.productName);
    }
  });

  losses.forEach((l) => {
    const cat = categoryMap.get(l.category);
    if (cat && l.lossReason) {
      const reason = l.lossReason;
      cat.reasonCount.set(reason, (cat.reasonCount.get(reason) || 0) + 1);
    }
  });

  const results: CategoryAnalysis[] = [];
  categoryMap.forEach((data, category) => {
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const commonReasons = Array.from(data.reasonCount.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    results.push({
      category,
      totalStock: data.totalStock,
      totalSold: data.totalSold,
      totalLost: data.totalLost,
      totalRevenue: data.totalRevenue,
      totalLossCost: data.totalLossCost,
      sellThroughRate: data.totalStock > 0 ? data.totalSold / data.totalStock : 0,
      lossRate: data.totalStock > 0 ? data.totalLost / data.totalStock : 0,
      avgDiscountRate: avg(data.discountRates),
      avgDaysBeforeExpiryAtDiscount: avg(data.daysBeforeExpiry),
      avgClearDays: avg(data.clearDays),
      highRiskProducts: Array.from(data.highRisk),
      commonReasons,
    });
  });

  return results.sort((a, b) => b.lossRate - a.lossRate);
}

export function analyzeByStore(
  performance: DiscountPerformance[]
): StoreAnalysis[] {
  const storeMap = new Map<string, {
    storeName: string;
    totalStock: number;
    totalSold: number;
    totalLost: number;
    effectiveness: number[];
    categories: Map<string, { sold: number; lost: number; stock: number }>;
  }>();

  performance.forEach((p) => {
    if (!storeMap.has(p.storeId)) {
      storeMap.set(p.storeId, {
        storeName: p.storeName,
        totalStock: 0,
        totalSold: 0,
        totalLost: 0,
        effectiveness: [],
        categories: new Map(),
      });
    }

    const store = storeMap.get(p.storeId)!;
    store.totalStock += p.initialStock;
    store.totalSold += p.soldDuringDiscount;
    store.totalLost += p.lostQuantity;
    store.effectiveness.push(p.sellThroughRate);

    if (!store.categories.has(p.category)) {
      store.categories.set(p.category, { sold: 0, lost: 0, stock: 0 });
    }
    const cat = store.categories.get(p.category)!;
    cat.sold += p.soldDuringDiscount;
    cat.lost += p.lostQuantity;
    cat.stock += p.initialStock;
  });

  const results: StoreAnalysis[] = [];
  storeMap.forEach((data, storeId) => {
    const categoryBreakdown = Array.from(data.categories.entries()).map(([category, catData]) => ({
      category,
      lossRate: catData.stock > 0 ? catData.lost / catData.stock : 0,
      sellThrough: catData.stock > 0 ? catData.sold / catData.stock : 0,
    }));

    results.push({
      storeId,
      storeName: data.storeName,
      totalStock: data.totalStock,
      totalSold: data.totalSold,
      totalLost: data.totalLost,
      sellThroughRate: data.totalStock > 0 ? data.totalSold / data.totalStock : 0,
      lossRate: data.totalStock > 0 ? data.totalLost / data.totalStock : 0,
      avgDiscountEffectiveness: data.effectiveness.length > 0
        ? data.effectiveness.reduce((a, b) => a + b, 0) / data.effectiveness.length
        : 0,
      categoryBreakdown,
    });
  });

  return results.sort((a, b) => b.lossRate - a.lossRate);
}

export function buildClearanceTimeline(
  sku: string,
  storeId: string,
  inventory: InventoryRecord[],
  discounts: DiscountRecord[],
  sales: SalesRecord[]
): ClearanceTimelineItem[] {
  const inv = inventory.find((i) => i.sku === sku && i.storeId === storeId);
  if (!inv) return [];

  const productDiscounts = discounts.filter(
    (d) => d.sku === sku && d.storeId === storeId
  );

  const productSales = sales.filter(
    (s) => s.sku === sku && s.storeId === storeId
  );

  const timeline: ClearanceTimelineItem[] = [];
  const startDate = inv.inboundDate || addDays(inv.expiryDate, -(inv.shelfLifeDays || 7));
  const endDate = inv.expiryDate;

  let currentStock = inv.quantity + productSales.reduce((sum, s) => sum + s.quantity, 0);
  let cumulativeSold = 0;

  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const daySales = productSales.filter((s) => isSameDay(s.saleDate, currentDate));
    const soldToday = daySales.reduce((sum, s) => sum + s.quantity, 0);

    const activeDiscount = productDiscounts.find(
      (d) => currentDate >= d.discountStartDate && currentDate <= d.discountEndDate
    );

    cumulativeSold += soldToday;
    currentStock -= soldToday;

    timeline.push({
      date: new Date(currentDate),
      stockLevel: Math.max(0, currentStock),
      sold: soldToday,
      cumulativeSold,
      discountApplied: !!activeDiscount,
      discountRate: activeDiscount?.discountRate,
      daysToExpiry: daysBetween(currentDate, endDate),
    });

    currentDate = addDays(currentDate, 1);
  }

  return timeline;
}

export function checkDataQuality(
  inventory: InventoryRecord[],
  discounts: DiscountRecord[],
  _sales: SalesRecord[],
  losses: LossRecord[]
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];

  const formatMap = new Map<string, string[]>();
  inventory.forEach((inv) => {
    const format = detectDateFormat(inv.expiryDateRaw);
    if (!formatMap.has(format)) {
      formatMap.set(format, []);
    }
    formatMap.get(format)!.push(inv.id);
  });

  if (formatMap.size > 1) {
    issues.push({
      type: 'expiry_format',
      description: `效期日期存在 ${formatMap.size} 种不同格式，包括：${Array.from(formatMap.keys()).join('、')}`,
      count: inventory.length,
      affectedRecords: inventory.slice(0, 10).map((i) => i.id),
      severity: 'medium',
    });
  }

  const missingReasons = losses.filter((l) => !l.lossReason);
  if (missingReasons.length > 0) {
    issues.push({
      type: 'missing_loss_reason',
      description: `有 ${missingReasons.length} 条报损记录未填写报损原因，占报损总数的 ${((missingReasons.length / losses.length) * 100).toFixed(1)}%`,
      count: missingReasons.length,
      affectedRecords: missingReasons.slice(0, 10).map((l) => l.id),
      severity: 'high',
    });
  }

  const stackedDiscounts = discounts.filter((d) => d.isStackedWithPromotion);
  if (stackedDiscounts.length > 0) {
    issues.push({
      type: 'buy_get_stack',
      description: `有 ${stackedDiscounts.length} 条折扣记录与其他促销活动叠加，包括买赠、会员折扣等，可能影响折扣效果分析`,
      count: stackedDiscounts.length,
      affectedRecords: stackedDiscounts.slice(0, 10).map((d) => d.id),
      severity: 'medium',
    });
  }

  const sameDayDiscounts = discounts.filter((d) => {
    const inv = inventory.find((i) => i.sku === d.sku && i.storeId === d.storeId);
    if (!inv) return false;
    return daysBetween(d.discountStartDate, inv.expiryDate) <= 0;
  });

  if (sameDayDiscounts.length > 0) {
    issues.push({
      type: 'same_day_discount',
      description: `有 ${sameDayDiscounts.length} 个商品临期当天才上架折扣，清仓时间窗口太短`,
      count: sameDayDiscounts.length,
      affectedRecords: sameDayDiscounts.slice(0, 10).map((d) => d.id),
      severity: 'high',
    });
  }

  const missingShelf = inventory.filter((i) => !i.shelfLocation);
  if (missingShelf.length > 0) {
    issues.push({
      type: 'missing_shelf',
      description: `有 ${missingShelf.length} 条库存记录未填写陈列位置，无法分析位置对销量的影响`,
      count: missingShelf.length,
      affectedRecords: missingShelf.slice(0, 10).map((i) => i.id),
      severity: 'low',
    });
  }

  return issues;
}
