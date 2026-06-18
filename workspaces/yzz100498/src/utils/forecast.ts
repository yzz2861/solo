import { SalesAnalysis, WardCount, Holiday, PreparationSuggestion, ForecastData, MealType, RiskLevel, IngredientDemand, Meal } from '../types';
import { calculateWeightedAverage, calculateStandardDeviation, calculateConfidence } from './calculation';
import { assessWasteRisk, assessShortageRisk, generateAdjustmentReason } from './riskAssessment';
import { getDayOfWeek, getWeekDayFactor } from './dateUtils';

export const calculatePreparationSuggestion = (
  historicalData: SalesAnalysis[],
  wardCount: WardCount,
  holiday: Holiday | null,
  mealType: MealType
): PreparationSuggestion => {
  const weights = [0.05, 0.1, 0.15, 0.25, 0.45];
  const netSales = historicalData.map(d => d.netSales);
  const weightedAvg = calculateWeightedAverage(netSales, weights);
  
  const historicalAverageCompanion = historicalData.reduce((sum, d) => sum + d.wardReportedCount, 0) / historicalData.length || 1;
  const wardFactor = wardCount.companionCount / historicalAverageCompanion;
  const holidayFactor = holiday ? holiday.impactFactor : 1.0;
  const mealTypeFactor = mealType === 'supper' ? 0.85 : 1.0;
  
  const suggestedQuantity = Math.round(
    weightedAvg * wardFactor * holidayFactor * mealTypeFactor
  );
  
  const wasteRisk = assessWasteRisk(suggestedQuantity, historicalData);
  const shortageRisk = assessShortageRisk(suggestedQuantity, wardCount);
  
  return {
    date: wardCount.reportDate,
    mealType,
    wardId: wardCount.wardId,
    wardName: wardCount.wardName,
    suggestedQuantity: Math.max(0, suggestedQuantity),
    historicalAverage: Math.round(weightedAvg),
    wardReported: wardCount.companionCount,
    wardCount: wardCount.companionCount,
    safetyStock: Math.round(suggestedQuantity * 0.1),
    adjustmentReason: generateAdjustmentReason(wardFactor, holidayFactor),
    wasteRisk,
    shortageRisk,
    confidence: calculateConfidence(historicalData)
  };
};

export const forecastTomorrowSales = (
  historicalData: SalesAnalysis[],
  wardCount: WardCount,
  tomorrow: string,
  mealType: MealType,
  holiday: Holiday | null
): ForecastData => {
  const alpha = 0.3;
  const historicalTrend = historicalData.map(d => d.netSales);
  
  let forecast = historicalTrend[0] || 0;
  for (let i = 1; i < historicalTrend.length; i++) {
    forecast = alpha * historicalTrend[i] + (1 - alpha) * forecast;
  }
  
  const dayOfWeek = getDayOfWeek(tomorrow);
  const weekFactor = getWeekDayFactor(dayOfWeek);
  const holidayFactor = holiday ? holiday.impactFactor : 1.0;
  
  const finalForecast = Math.round(forecast * weekFactor * holidayFactor);
  
  const stdDev = calculateStandardDeviation(historicalTrend);
  const marginOfError = stdDev * 1.96;
  
  const todayData = historicalData[historicalData.length - 1];
  const lastWeekData = historicalData[historicalData.length - 8];
  
  const lower = Math.max(0, finalForecast - marginOfError);
  const upper = finalForecast + marginOfError;
  const forecastQty = Math.max(0, finalForecast);
  
  return {
    date: tomorrow,
    wardId: wardCount.wardId,
    wardName: wardCount.wardName,
    mealType,
    forecastQuantity: forecastQty,
    predictedQuantity: forecastQty,
    historicalTrend: historicalTrend.slice(-7),
    lowerBound: lower,
    upperBound: upper,
    confidenceInterval: { lower, upper },
    changeFromToday: finalForecast - (todayData?.netSales || finalForecast),
    changeFromLastWeek: finalForecast - (lastWeekData?.netSales || finalForecast),
    holidayImpact: holiday ? holidayFactor : 1.0
  };
};

export const calculateIngredientDemand = (
  forecastData: ForecastData[],
  meals: Meal[],
  currentStocks: Record<string, number> = {}
): IngredientDemand[] => {
  const ingredientMap: Record<string, { total: number; unit: string }> = {};
  
  forecastData.forEach(fd => {
    const meal = meals.find(m => m.type === fd.mealType && !m.isSpecial);
    if (!meal) return;
    
    const quantityPerMeal = 0.1;
    meal.ingredients.forEach(ingredient => {
      if (!ingredientMap[ingredient]) {
        ingredientMap[ingredient] = { total: 0, unit: 'kg' };
      }
      ingredientMap[ingredient].total += fd.predictedQuantity * quantityPerMeal;
    });
  });
  
  const mealTypeList: MealType[] = ['breakfast', 'lunch', 'dinner', 'supper'];
  return Object.entries(ingredientMap).map(([name, data], i) => {
    const currentStock = currentStocks[name] || 0;
    const requiredQuantity = Math.round(data.total * 10) / 10;
    const needToPurchase = Math.max(0, Math.round((requiredQuantity - currentStock) * 10) / 10);
    const forecastUsage = requiredQuantity;
    const historicalUsage = Math.round(forecastUsage * 0.9);
    const safetyStock = Math.round(forecastUsage * 0.15);
    const suggestedPurchase = needToPurchase;
    const shortage = Math.max(0, requiredQuantity - currentStock);
    
    let priority: 'high' | 'medium' | 'low' = 'medium';
    if (needToPurchase > requiredQuantity * 0.5) priority = 'high';
    else if (needToPurchase === 0) priority = 'low';
    
    return {
      ingredientId: `ing-${String(i + 1).padStart(3, '0')}`,
      ingredientName: name,
      mealType: mealTypeList[i % 4],
      unit: data.unit,
      historicalUsage,
      forecastUsage,
      safetyStock,
      suggestedPurchase,
      currentStock,
      shortage,
      name,
      requiredQuantity,
      needToPurchase,
      priority
    };
  }).sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
};

export const calculateForecastKPIs = (salesData: SalesAnalysis[]) => {
  const totalSales = salesData.reduce((sum, d) => sum + d.netSales, 0);
  const totalOrders = salesData.reduce((sum, d) => sum + d.orderCount, 0);
  const totalRefunds = salesData.reduce((sum, d) => sum + d.refundCount, 0);
  const refundRate = totalOrders > 0 ? Math.round((totalRefunds / totalOrders) * 100 * 10) / 10 : 0;
  
  const positiveVariances = salesData
    .filter(d => d.variance > 0)
    .reduce((sum, d) => sum + d.variance, 0);
  const wasteRate = totalSales > 0 ? Math.round((positiveVariances / totalSales) * 100 * 10) / 10 : 0;
  
  const shortageCount = salesData.filter(d => d.variance < -5).length;
  const avgDailySales = salesData.length > 0 
    ? Math.round(totalSales / (salesData.length / 32)) 
    : 0;
  
  return {
    totalSales,
    totalOrders,
    totalRefunds,
    refundRate,
    wasteRate,
    shortageCount,
    avgDailySales
  };
};
