import { useMemo } from 'react';
import { useDataStore } from '../store/useDataStore';
import { useFilterStore } from '../store/useFilterStore';
import { calculatePreparationSuggestion } from '../utils/forecast';
import { aggregateSalesData } from '../utils/calculation';
import { PreparationSuggestion, MealType, RiskLevel } from '../types';

export const usePreparation = () => {
  const { orders, wardCounts, holidays, isLoading } = useDataStore();
  const { selectedWards, selectedMealTypes } = useFilterStore();
  
  const preparationSuggestions: PreparationSuggestion[] = useMemo(() => {
    const results: PreparationSuggestion[] = [];
    const mealTypes: MealType[] = selectedMealTypes.length > 0 
      ? selectedMealTypes 
      : ['breakfast', 'lunch', 'dinner', 'supper'];
    
    const latestWardCounts = wardCounts
      .filter(wc => wc.reportDate === '2026-06-18')
      .filter(wc => selectedWards.length === 0 || selectedWards.includes(wc.wardId));
    
    const allSalesData = aggregateSalesData(orders, wardCounts);
    
    latestWardCounts.forEach(wc => {
      const holiday = holidays.find(h => h.date === wc.reportDate) || null;
      
      mealTypes.forEach(mt => {
        const historicalSales = allSalesData
          .filter(d => d.wardId === wc.wardId && d.mealType === mt)
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-5);
        
        if (historicalSales.length > 0) {
          const baseSuggestion = calculatePreparationSuggestion(historicalSales, wc, holiday, mt);
          const suggestion: PreparationSuggestion = {
            ...baseSuggestion,
            wardCount: wc.companionCount,
            safetyStock: Math.round(baseSuggestion.suggestedQuantity * 0.1),
          };
          results.push(suggestion);
        }
      });
    });
    
    return results.sort((a, b) => {
      const riskOrder: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      const aMaxRisk = Math.max(riskOrder[a.wasteRisk], riskOrder[a.shortageRisk]);
      const bMaxRisk = Math.max(riskOrder[b.wasteRisk], riskOrder[b.shortageRisk]);
      return aMaxRisk - bMaxRisk;
    });
  }, [orders, wardCounts, holidays, selectedWards, selectedMealTypes]);
  
  const suggestionsByWard = useMemo(() => {
    const grouped: Record<string, PreparationSuggestion[]> = {};
    preparationSuggestions.forEach(ps => {
      if (!grouped[ps.wardId]) {
        grouped[ps.wardId] = [];
      }
      grouped[ps.wardId].push(ps);
    });
    return grouped;
  }, [preparationSuggestions]);
  
  const riskMatrixData = useMemo(() => preparationSuggestions, [preparationSuggestions]);
  
  const riskSummary = useMemo(() => {
    const lowRisk = new Set<string>();
    const mediumRisk = new Set<string>();
    const highRisk = new Set<string>();
    
    preparationSuggestions.forEach(ps => {
      const maxRisk = Math.max(
        ps.wasteRisk === 'low' ? 0 : ps.wasteRisk === 'medium' ? 1 : 2,
        ps.shortageRisk === 'low' ? 0 : ps.shortageRisk === 'medium' ? 1 : 2
      );
      if (maxRisk >= 2) highRisk.add(ps.wardId);
      else if (maxRisk === 1) mediumRisk.add(ps.wardId);
      else lowRisk.add(ps.wardId);
    });
    
    return {
      totalSuggestion: preparationSuggestions.reduce((sum, ps) => sum + ps.suggestedQuantity, 0),
      lowRisk: lowRisk.size,
      mediumRisk: mediumRisk.size,
      highRisk: highRisk.size
    };
  }, [preparationSuggestions]);
  
  const mealTypeSummary = useMemo(() => {
    const grouped: Record<string, any> = {};
    const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'supper'];
    
    mealTypes.forEach(mt => {
      const items = preparationSuggestions.filter(ps => ps.mealType === mt);
      grouped[mt] = {
        suggested: items.reduce((sum, ps) => sum + ps.suggestedQuantity, 0),
        estimatedWaste: Math.round(items.reduce((sum, ps) => sum + ps.suggestedQuantity, 0) * 0.05),
        shortageRisk: items.some(ps => ps.shortageRisk === 'high') ? '高' : items.some(ps => ps.shortageRisk === 'medium') ? '中' : '低',
        trend: Math.round((Math.random() - 0.3) * 20)
      };
    });
    
    return grouped;
  }, [preparationSuggestions]);
  
  const riskMatrix = useMemo(() => {
    const matrix = {
      low: { waste: 0, shortage: 0 },
      medium: { waste: 0, shortage: 0 },
      high: { waste: 0, shortage: 0 },
      critical: { waste: 0, shortage: 0 }
    };
    
    preparationSuggestions.forEach(ps => {
      matrix[ps.wasteRisk].waste++;
      matrix[ps.shortageRisk].shortage++;
    });
    
    return matrix;
  }, [preparationSuggestions]);
  
  const totalSuggested = useMemo(() => {
    return preparationSuggestions.reduce((sum, ps) => sum + ps.suggestedQuantity, 0);
  }, [preparationSuggestions]);
  
  const totalWardReported = useMemo(() => {
    const uniqueWards = new Set(preparationSuggestions.map(ps => ps.wardId));
    return wardCounts
      .filter(wc => wc.reportDate === '2026-06-18' && uniqueWards.has(wc.wardId))
      .reduce((sum, wc) => sum + wc.companionCount, 0);
  }, [preparationSuggestions, wardCounts]);
  
  const highRiskCount = useMemo(() => {
    return preparationSuggestions.filter(ps => 
      ps.wasteRisk === 'high' || 
      ps.wasteRisk === 'critical' || 
      ps.shortageRisk === 'high' || 
      ps.shortageRisk === 'critical'
    ).length;
  }, [preparationSuggestions]);
  
  return {
    isLoading,
    preparationSuggestions,
    suggestionsByWard,
    riskMatrixData,
    riskSummary,
    mealTypeSummary,
    riskMatrix,
    totalSuggested,
    totalWardReported,
    highRiskCount
  };
};
