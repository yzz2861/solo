import { useMemo } from 'react';
import { useDataStore } from '../store/useDataStore';
import { useFilterStore } from '../store/useFilterStore';
import { aggregateSalesData, calculateKPIs } from '../utils/calculation';
import { SalesAnalysis, MealType, Order } from '../types';

export const useSalesData = () => {
  const { orders, wardCounts, isLoading } = useDataStore();
  const { dateRange, selectedWards, selectedMealTypes, searchQuery } = useFilterStore();
  
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const inDateRange = order.orderDate >= dateRange.start && order.orderDate <= dateRange.end;
      const inWard = selectedWards.length === 0 || selectedWards.includes(order.wardId);
      const inMealType = selectedMealTypes.length === 0 || selectedMealTypes.includes(order.mealType);
      const matchesSearch = !searchQuery || 
        order.patientName.includes(searchQuery) ||
        order.wardName.includes(searchQuery) ||
        order.mealName.includes(searchQuery);
      
      return inDateRange && inWard && inMealType && matchesSearch;
    });
  }, [orders, dateRange, selectedWards, selectedMealTypes, searchQuery]);
  
  const filteredWardCounts = useMemo(() => {
    return wardCounts.filter(wc => {
      const inDateRange = wc.reportDate >= dateRange.start && wc.reportDate <= dateRange.end;
      const inWard = selectedWards.length === 0 || selectedWards.includes(wc.wardId);
      return inDateRange && inWard;
    });
  }, [wardCounts, dateRange, selectedWards]);
  
  const salesData: SalesAnalysis[] = useMemo(() => {
    return aggregateSalesData(filteredOrders, filteredWardCounts);
  }, [filteredOrders, filteredWardCounts]);
  
  const kpis = useMemo(() => {
    return calculateKPIs(salesData);
  }, [salesData]);
  
  const trendData = useMemo(() => {
    const grouped: Record<string, Record<MealType, number>> = {};
    salesData.forEach(d => {
      if (!grouped[d.date]) {
        grouped[d.date] = { breakfast: 0, lunch: 0, dinner: 0, supper: 0 };
      }
      grouped[d.date][d.mealType] += d.netSales;
    });
    
    return Object.entries(grouped)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [salesData]);
  
  const wardComparisonData = useMemo(() => {
    const grouped: Record<string, { wardId: string; wardName: string; total: number; refunds: number; variance: number }> = {};
    salesData.forEach(d => {
      if (!grouped[d.wardId]) {
        grouped[d.wardId] = { wardId: d.wardId, wardName: d.wardName, total: 0, refunds: 0, variance: 0 };
      }
      grouped[d.wardId].total += d.netSales;
      grouped[d.wardId].refunds += d.refundCount;
      grouped[d.wardId].variance += d.variance;
    });
    
    return Object.values(grouped)
      .sort((a, b) => b.total - a.total);
  }, [salesData]);
  
  const mealTypeData = useMemo(() => {
    const grouped: Record<string, { name: string; value: number }> = {};
    const labels: Record<MealType, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', supper: '夜宵' };
    
    salesData.forEach(d => {
      if (!grouped[d.mealType]) {
        grouped[d.mealType] = { name: labels[d.mealType], value: 0 };
      }
      grouped[d.mealType].value += d.netSales;
    });
    
    return Object.values(grouped);
  }, [salesData]);
  
  const anomalyOrders = useMemo(() => {
    return filteredOrders.filter(o => 
      o.flags.isDuplicate || 
      o.flags.isCrossMidnight || 
      o.flags.isHoliday ||
      o.status === 'refunded'
    );
  }, [filteredOrders]);
  
  return {
    isLoading,
    salesData,
    kpis,
    trendData,
    wardComparisonData,
    mealTypeData,
    salesByDate: trendData,
    salesByWard: wardComparisonData,
    salesByMealType: mealTypeData,
    filteredOrders,
    filteredWardCounts,
    anomalyOrders
  };
};
