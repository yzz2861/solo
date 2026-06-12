import type { CartItem, Coupon } from '@/types';
import { roundToCents } from './formatters';
import { RuleExplainer } from './ruleExplainer';

export class AmountCalculator {
  static calculateOriginalTotal(cartItems: CartItem[]): number {
    return roundToCents(cartItems.reduce((sum, item) => sum + item.subtotal, 0));
  }

  static applyCoupons(
    total: number,
    coupons: Coupon[],
  ): { discountedTotal: number; explanations: string[] } {
    let currentTotal = total;
    const explanations: string[] = [];
    const nonStackableCoupons = coupons.filter(c => !c.isStackable && c.type !== 'points');
    const stackableCoupons = coupons.filter(c => c.isStackable && c.type !== 'points');
    const pointsCoupons = coupons.filter(c => c.type === 'points');

    if (nonStackableCoupons.length > 0) {
      let bestSaving = 0;
      let bestCoupon = nonStackableCoupons[0];
      let bestDiscounted = currentTotal;

      for (const coupon of nonStackableCoupons) {
        const result = this.applySingleCoupon(currentTotal, coupon);
        const saving = currentTotal - result.discountedTotal;
        if (saving > bestSaving) {
          bestSaving = saving;
          bestCoupon = coupon;
          bestDiscounted = result.discountedTotal;
        }
      }

      currentTotal = bestDiscounted;
      explanations.push(this.getCouponExplanation(bestCoupon, total, currentTotal));
    }

    const sortedStackable = [...stackableCoupons].sort((a, b) => {
      if (a.type === 'full_reduction' && b.type === 'full_reduction') {
        return (b.discountValue || 0) - (a.discountValue || 0);
      }
      if (a.type === 'full_reduction') return -1;
      if (b.type === 'full_reduction') return 1;
      return 0;
    });

    for (const coupon of sortedStackable) {
      const beforeDiscount = currentTotal;
      const result = this.applySingleCoupon(currentTotal, coupon);
      currentTotal = result.discountedTotal;
      if (beforeDiscount > currentTotal) {
        explanations.push(this.getCouponExplanation(coupon, beforeDiscount, currentTotal));
      }
    }

    if (pointsCoupons.length > 0) {
      explanations.push('会员积分将在最后抵扣');
    }

    if (coupons.length > 1) {
      explanations.unshift(RuleExplainer.explainStacking(coupons));
    }

    return { discountedTotal: roundToCents(currentTotal), explanations };
  }

  private static applySingleCoupon(total: number, coupon: Coupon): { discountedTotal: number } {
    let discounted = total;

    switch (coupon.type) {
      case 'full_reduction':
        if (coupon.condition && total >= coupon.condition) {
          discounted = total - (coupon.discountValue || 0);
        }
        break;
      case 'discount':
        discounted = total * (coupon.discountValue || 1);
        break;
      case 'points':
        break;
    }

    return { discountedTotal: roundToCents(Math.max(0, discounted)) };
  }

  private static getCouponExplanation(coupon: Coupon, before: number, after: number): string {
    const saving = before - after;
    if (coupon.type === 'full_reduction') {
      return RuleExplainer.explainFullReduction(coupon, saving);
    }
    if (coupon.type === 'discount') {
      return RuleExplainer.explainDiscount(coupon, before, after);
    }
    return '';
  }

  static calculatePointsDeduction(
    total: number,
    memberPoints: number,
    pointsRate: number,
  ): { deduction: number; usedPoints: number; explanation: string } {
    const maxDeduction = Math.floor(memberPoints / pointsRate);
    const deduction = roundToCents(Math.min(maxDeduction, total));
    const usedPoints = Math.floor(deduction * pointsRate);

    return {
      deduction,
      usedPoints,
      explanation: RuleExplainer.explainPointsDeduction(usedPoints, deduction, pointsRate),
    };
  }

  static calculateFinalTotal(
    originalTotal: number,
    discountTotal: number,
    pointsDeduction: number,
  ): number {
    return roundToCents(Math.max(0, discountTotal - pointsDeduction));
  }

  static calculateChange(finalTotal: number, amountPaid: number): number {
    if (amountPaid < finalTotal) {
      return 0;
    }
    return roundToCents(amountPaid - finalTotal);
  }

  static calculateRefund(
    originalItems: CartItem[],
    refundItems: CartItem[],
    appliedCoupons: Coupon[],
    originalFinalTotal: number,
  ): { refundAmount: number; explanation: string } {
    const originalTotal = this.calculateOriginalTotal(originalItems);
    const refundOriginalTotal = this.calculateOriginalTotal(refundItems);

    if (originalTotal === 0) {
      return { refundAmount: 0, explanation: '原订单金额为0' };
    }

    const totalDiscount = originalTotal - originalFinalTotal;
    const refundRatio = refundOriginalTotal / originalTotal;
    const refundDiscountShare = roundToCents(totalDiscount * refundRatio);
    const refundAmount = roundToCents(refundOriginalTotal - refundDiscountShare);

    return {
      refundAmount: Math.max(0, refundAmount),
      explanation: RuleExplainer.explainPartialRefund(refundItems, Math.max(0, refundAmount)),
    };
  }

  static handleExchange(
    cartItems: CartItem[],
    exchangeItems: { from: CartItem; to: CartItem }[],
  ): { newCartItems: CartItem[]; explanation: string } {
    let newItems = [...cartItems];

    for (const exchange of exchangeItems) {
      const fromIndex = newItems.findIndex(
        item => item.product.id === exchange.from.product.id && item.quantity === exchange.from.quantity
      );
      if (fromIndex >= 0) {
        newItems[fromIndex] = exchange.to;
      } else {
        newItems = newItems.filter(item => item.product.id !== exchange.from.product.id);
        newItems.push(exchange.to);
      }
    }

    newItems = newItems.map(item => ({
      ...item,
      subtotal: roundToCents(item.product.price * item.quantity),
    }));

    return {
      newCartItems: newItems,
      explanation: RuleExplainer.explainExchange(exchangeItems),
    };
  }

  static verifyAnswer(
    userValue: number | undefined,
    correctValue: number,
    tolerance: number = 0.01,
  ): boolean {
    if (userValue === undefined) return false;
    return Math.abs(userValue - correctValue) <= tolerance;
  }
}
