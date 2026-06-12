import type { Coupon, CartItem } from '@/types';
import { formatCurrency } from './formatters';

export class RuleExplainer {
  static explainFullReduction(coupon: Coupon, actualSaving: number): string {
    if (coupon.isDamaged && coupon.damageNote) {
      return `${coupon.damageNote}，实际节省${formatCurrency(actualSaving)}`;
    }
    return `使用「${coupon.name}」：${coupon.description}，节省${formatCurrency(actualSaving)}`;
  }

  static explainDiscount(coupon: Coupon, originalTotal: number, discountedTotal: number): string {
    const saving = originalTotal - discountedTotal;
    const discountPercent = ((1 - (coupon.discountValue || 1)) * 100).toFixed(0);
    if (coupon.isDamaged && coupon.damageNote) {
      return `${coupon.damageNote}，${discountPercent}%优惠，节省${formatCurrency(saving)}`;
    }
    return `使用「${coupon.name}」：${discountPercent}%折扣，节省${formatCurrency(saving)}`;
  }

  static explainPointsDeduction(points: number, deduction: number, pointsRate: number): string {
    return `会员积分抵扣：${points}积分（${pointsRate}积分=1元），抵扣${formatCurrency(deduction)}`;
  }

  static explainStacking(coupons: Coupon[]): string {
    const stackable = coupons.filter(c => c.isStackable);
    const nonStackable = coupons.filter(c => !c.isStackable);
    let explanation = '优惠叠加规则：';
    if (nonStackable.length > 0) {
      explanation += `先应用最优的不可叠加券（${nonStackable.map(c => c.name).join('、')}）；`;
    }
    if (stackable.length > 0) {
      explanation += `再依次应用可叠加券（${stackable.map(c => c.name).join('、')}）`;
    }
    return explanation;
  }

  static explainDamagedCoupon(coupon: Coupon): string {
    return `⚠️ 破损券处理：${coupon.damageNote || '此券破损，需按特殊规则处理，请向顾客说明情况'}`;
  }

  static explainExchange(exchangeItems: { from: CartItem; to: CartItem }[]): string {
    const items = exchangeItems.map(e => 
      `${e.from.product.emoji}${e.from.product.name} → ${e.to.product.emoji}${e.to.product.name}`
    ).join('、');
    return `🔄 顾客临时换商品：${items}，需重新计算金额`;
  }

  static explainPartialRefund(refundItems: CartItem[], refundAmount: number): string {
    const items = refundItems.map(i => 
      `${i.product.emoji}${i.product.name} × ${i.quantity}`
    ).join('、');
    return `↩️ 部分退单：${items}，按原价比例分摊已享受的优惠，应退${formatCurrency(refundAmount)}`;
  }

  static explainGroupOrder(): string {
    return '👥 多人拼单：需分别计算每位顾客的商品金额和优惠，分别结算';
  }

  static explainChange(payment: number, total: number, change: number): string {
    return `💰 找零计算：顾客支付${formatCurrency(payment)} - 应收${formatCurrency(total)} = 找零${formatCurrency(change)}`;
  }

  static explainCalculationProcess(
    originalTotal: number,
    discountTotal: number,
    pointsDeduction: number,
    finalTotal: number,
    explanations: string[]
  ): string[] {
    const process: string[] = [];
    process.push(`📊 计算过程：`);
    process.push(`1. 商品原价合计：${formatCurrency(originalTotal)}`);
    explanations.forEach((exp, idx) => {
      process.push(`${idx + 2}. ${exp}`);
    });
    if (pointsDeduction > 0) {
      process.push(`${explanations.length + 2}. 积分抵扣：${formatCurrency(pointsDeduction)}`);
    }
    process.push(`🎉 最终应收：${formatCurrency(originalTotal)} - 优惠${formatCurrency(originalTotal - discountTotal)} - 积分${formatCurrency(pointsDeduction)} = ${formatCurrency(finalTotal)}`);
    return process;
  }
}
