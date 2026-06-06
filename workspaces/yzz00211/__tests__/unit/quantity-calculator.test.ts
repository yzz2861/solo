import {
  calculateSummary,
  validateQuantityConsistency,
  validateAllQuantityConsistencies,
} from '../../src/domain/rules';
import {
  createMockApplicationItem,
  createMockApplication,
} from '../fixtures/test-fixtures';

describe('QuantityCalculator', () => {
  describe('calculateSummary', () => {
    it('应该正确计算汇总数量和金额', () => {
      const item1 = createMockApplicationItem({
        id: 'item-1',
        quantity: 10,
        unitPrice: 20,
        remainingQuantity: 6,
        usedQuantity: 4,
      });
      const item2 = createMockApplicationItem({
        id: 'item-2',
        quantity: 20,
        unitPrice: 30,
        remainingQuantity: 12,
        usedQuantity: 8,
      });

      const application = createMockApplication([item1, item2]);
      const summary = calculateSummary(application);

      expect(summary.totalItemCount).toBe(2);
      expect(summary.totalQuantity).toBe(30);
      expect(summary.totalValue).toBe(10 * 20 + 20 * 30);
      expect(summary.totalRemainingQuantity).toBe(18);
      expect(summary.totalUsedQuantity).toBe(12);
    });

    it('应该正确统计高风险药品数量', () => {
      const normalItem = createMockApplicationItem({ id: 'normal' });
      const highRiskItem = createMockApplicationItem({
        id: 'high-risk',
        drug: { ...normalItem.drug, isHighRisk: true },
      });

      const application = createMockApplication([normalItem, highRiskItem]);
      const summary = calculateSummary(application);

      expect(summary.highRiskItemCount).toBe(1);
    });

    it('应该按药品分类统计数量', () => {
      const item1 = createMockApplicationItem({ id: 'item-1' });
      const item2 = createMockApplicationItem({
        id: 'item-2',
        drug: { ...item1.drug, category: 'psychotropic_first' as any },
      });
      const item3 = createMockApplicationItem({
        id: 'item-3',
        drug: { ...item1.drug, category: 'psychotropic_second' as any },
      });

      const application = createMockApplication([item1, item2, item3]);
      const summary = calculateSummary(application);

      expect(summary.drugCategoryCount['narcotic']).toBe(1);
      expect(summary.drugCategoryCount['psychotropic_first']).toBe(1);
      expect(summary.drugCategoryCount['psychotropic_second']).toBe(1);
    });

    it('空明细列表时汇总应为零', () => {
      const application = createMockApplication([]);
      const summary = calculateSummary(application);

      expect(summary.totalItemCount).toBe(0);
      expect(summary.totalQuantity).toBe(0);
      expect(summary.totalValue).toBe(0);
      expect(summary.totalRemainingQuantity).toBe(0);
      expect(summary.totalUsedQuantity).toBe(0);
      expect(summary.highRiskItemCount).toBe(0);
    });

    it('明细合计应该与汇总数量一致', () => {
      const items = [
        createMockApplicationItem({ id: '1', quantity: 5, remainingQuantity: 3, usedQuantity: 2 }),
        createMockApplicationItem({ id: '2', quantity: 10, remainingQuantity: 6, usedQuantity: 4 }),
        createMockApplicationItem({ id: '3', quantity: 15, remainingQuantity: 9, usedQuantity: 6 }),
      ];

      const application = createMockApplication(items);
      const summary = calculateSummary(application);

      const calcQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
      const calcRemaining = items.reduce((sum, i) => sum + i.remainingQuantity, 0);
      const calcUsed = items.reduce((sum, i) => sum + i.usedQuantity, 0);

      expect(summary.totalQuantity).toBe(calcQuantity);
      expect(summary.totalRemainingQuantity).toBe(calcRemaining);
      expect(summary.totalUsedQuantity).toBe(calcUsed);
    });
  });

  describe('validateQuantityConsistency', () => {
    it('数量 = 剩余 + 使用 时应返回 true', () => {
      const item = createMockApplicationItem({
        quantity: 10,
        remainingQuantity: 6,
        usedQuantity: 4,
      });
      expect(validateQuantityConsistency(item)).toBe(true);
    });

    it('数量 ≠ 剩余 + 使用 时应返回 false', () => {
      const item = createMockApplicationItem({
        quantity: 10,
        remainingQuantity: 5,
        usedQuantity: 4,
      });
      expect(validateQuantityConsistency(item)).toBe(false);
    });

    it('零数量时应返回 true', () => {
      const item = createMockApplicationItem({
        quantity: 0,
        remainingQuantity: 0,
        usedQuantity: 0,
      });
      expect(validateQuantityConsistency(item)).toBe(true);
    });
  });

  describe('validateAllQuantityConsistencies', () => {
    it('所有明细都一致时应返回 valid=true', () => {
      const items = [
        createMockApplicationItem({ id: '1', quantity: 10, remainingQuantity: 6, usedQuantity: 4 }),
        createMockApplicationItem({ id: '2', quantity: 20, remainingQuantity: 12, usedQuantity: 8 }),
      ];
      const application = createMockApplication(items);
      const result = validateAllQuantityConsistencies(application);

      expect(result.valid).toBe(true);
      expect(result.invalidItems).toEqual([]);
    });

    it('存在不一致明细时应返回 invalidItems 列表', () => {
      const items = [
        createMockApplicationItem({ id: 'good', quantity: 10, remainingQuantity: 6, usedQuantity: 4 }),
        createMockApplicationItem({ id: 'bad', quantity: 10, remainingQuantity: 5, usedQuantity: 3 }),
      ];
      const application = createMockApplication(items);
      const result = validateAllQuantityConsistencies(application);

      expect(result.valid).toBe(false);
      expect(result.invalidItems).toContain('bad');
      expect(result.invalidItems).not.toContain('good');
    });
  });
});
