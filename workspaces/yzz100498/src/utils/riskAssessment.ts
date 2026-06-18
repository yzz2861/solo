import { RiskLevel, SalesAnalysis, WardCount } from '../types';
import { calculateStandardDeviation } from './calculation';

export const assessWasteRisk = (
  suggestedQuantity: number,
  historicalData: SalesAnalysis[]
): RiskLevel => {
  if (historicalData.length === 0) return 'medium';
  
  const netSales = historicalData.map(d => d.netSales);
  const avgSales = netSales.reduce((a, b) => a + b, 0) / netSales.length;
  const stdDev = calculateStandardDeviation(netSales);
  
  const overageRatio = (suggestedQuantity - avgSales) / avgSales;
  const varianceRate = stdDev / avgSales;
  
  if (overageRatio > 0.3 || varianceRate > 0.25) return 'high';
  if (overageRatio > 0.15 || varianceRate > 0.15) return 'medium';
  if (overageRatio > 0.05) return 'low';
  
  return 'low';
};

export const assessShortageRisk = (
  suggestedQuantity: number,
  wardCount: WardCount
): RiskLevel => {
  const expectedDemand = wardCount.companionCount;
  const deficit = expectedDemand - suggestedQuantity;
  const deficitRate = deficit / expectedDemand;
  
  if (deficitRate > 0.15 || wardCount.isLockedDown) return 'high';
  if (deficitRate > 0.08) return 'medium';
  if (deficitRate > 0.03) return 'low';
  
  return 'low';
};

export const generateAdjustmentReason = (
  wardFactor: number,
  holidayFactor: number
): string => {
  const reasons: string[] = [];
  
  if (wardFactor > 1.1) {
    reasons.push(`病区人数增加${Math.round((wardFactor - 1) * 100)}%`);
  } else if (wardFactor < 0.9) {
    reasons.push(`病区人数减少${Math.round((1 - wardFactor) * 100)}%`);
  }
  
  if (holidayFactor !== 1.0) {
    const impact = holidayFactor > 1 ? '增加' : '减少';
    reasons.push(`节假日影响${impact}${Math.round(Math.abs(holidayFactor - 1) * 100)}%`);
  }
  
  if (reasons.length === 0) {
    reasons.push('基于历史数据预测');
  }
  
  return reasons.join('；');
};

export const getRiskColor = (level: RiskLevel): string => {
  const colors: Record<RiskLevel, string> = {
    low: '#4CAF50',
    medium: '#FF9800',
    high: '#F44336',
    critical: '#B71C1C'
  };
  return colors[level];
};

export const getRiskBgColor = (level: RiskLevel): string => {
  const colors: Record<RiskLevel, string> = {
    low: 'bg-green-100',
    medium: 'bg-orange-100',
    high: 'bg-red-100',
    critical: 'bg-red-200'
  };
  return colors[level];
};

export const getRiskTextColor = (level: RiskLevel): string => {
  const colors: Record<RiskLevel, string> = {
    low: 'text-green-700',
    medium: 'text-orange-700',
    high: 'text-red-700',
    critical: 'text-red-800'
  };
  return colors[level];
};
