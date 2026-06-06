import {
  HandoverApplication,
  ApplicationSummary,
  ApplicationItem,
} from '../objects';

export function calculateSummary(application: HandoverApplication): ApplicationSummary {
  const items = application.items;
  const totalItemCount = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalRemainingQuantity = items.reduce((sum, item) => sum + item.remainingQuantity, 0);
  const totalUsedQuantity = items.reduce((sum, item) => sum + item.usedQuantity, 0);
  const highRiskItemCount = items.filter((item) => item.drug.isHighRisk).length;

  const drugCategoryCount: Record<string, number> = {};
  items.forEach((item) => {
    const category = item.drug.category;
    drugCategoryCount[category] = (drugCategoryCount[category] || 0) + 1;
  });

  return {
    totalItemCount,
    totalQuantity,
    totalValue,
    totalRemainingQuantity,
    totalUsedQuantity,
    highRiskItemCount,
    drugCategoryCount,
  };
}

export function validateQuantityConsistency(item: ApplicationItem): boolean {
  return Math.abs(item.quantity - item.remainingQuantity - item.usedQuantity) < 0.001;
}

export function validateAllQuantityConsistencies(application: HandoverApplication): {
  valid: boolean;
  invalidItems: string[];
} {
  const invalidItems: string[] = [];
  application.items.forEach((item) => {
    if (!validateQuantityConsistency(item)) {
      invalidItems.push(item.id);
    }
  });
  return {
    valid: invalidItems.length === 0,
    invalidItems,
  };
}

export function getItemsByCategory(application: HandoverApplication, category: string): ApplicationItem[] {
  return application.items.filter((item) => item.drug.category === category);
}

export function getHighRiskItems(application: HandoverApplication): ApplicationItem[] {
  return application.items.filter((item) => item.drug.isHighRisk);
}
