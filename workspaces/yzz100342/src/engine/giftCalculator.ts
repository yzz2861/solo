import type { GiftRule, CartItem, TrialResult, RuleHitDetail, GiftResult } from '@/types';

const EPSILON = 0.001;

export function calculateTotals(cart: CartItem[], couponAmount: number) {
  const originalTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const nonBundleTotal = cart
    .filter((i) => !i.isBundle)
    .reduce((sum, item) => sum + item.price * item.quantity, 0);
  const finalTotal = Math.max(0, originalTotal - couponAmount);
  const finalNonBundleTotal = Math.max(0, nonBundleTotal - couponAmount);
  return { originalTotal, nonBundleTotal, couponAmount, finalTotal, finalNonBundleTotal };
}

export function runTrial(
  rules: GiftRule[],
  cart: CartItem[],
  couponAmount: number,
  orderNumber: number,
): TrialResult {
  const totals = calculateTotals(cart, couponAmount);
  const { originalTotal, nonBundleTotal, finalTotal, finalNonBundleTotal } = totals;

  const sortedRules = [...rules]
    .filter((r) => r.enabled)
    .sort((a, b) => b.priority - a.priority);

  const ruleDetails: RuleHitDetail[] = [];
  const giftMap = new Map<string, GiftResult & { stockDeducted: number }>();
  const warnings: string[] = [];
  const usedStockPerGift = new Map<string, number>();

  for (const rule of sortedRules) {
    let hit = false;
    let reason = '';
    let isBoundary = false;
    let boundaryType: RuleHitDetail['boundaryType'];

    if (rule.type === 'threshold') {
      const threshold = rule.thresholdAmount ?? 0;
      const useCoupon = rule.useCoupon ?? false;
      const excludeBundle = rule.excludeBundle ?? false;

      const compareAmount = excludeBundle
        ? useCoupon
          ? finalNonBundleTotal
          : nonBundleTotal
        : useCoupon
          ? finalTotal
          : originalTotal;

      hit = compareAmount >= threshold - EPSILON;

      if (excludeBundle) {
        const amountWithoutExclude = useCoupon ? finalTotal : originalTotal;
        if (amountWithoutExclude >= threshold - EPSILON && compareAmount < threshold - EPSILON) {
          boundaryType = 'bundle_excluded';
          isBoundary = true;
          warnings.push(
            `⚠️ 规则「${rule.name}」：含套装金额达标（¥${amountWithoutExclude.toFixed(2)}），但排除套装后仅 ¥${compareAmount.toFixed(2)}，不满足满 ¥${threshold} 条件`,
          );
        }
      }

      if (useCoupon) {
        const amountBeforeCoupon = excludeBundle ? nonBundleTotal : originalTotal;
        if (amountBeforeCoupon >= threshold - EPSILON && compareAmount < threshold - EPSILON) {
          boundaryType = 'coupon_failed';
          isBoundary = true;
          warnings.push(
            `⚠️ 规则「${rule.name}」：券前金额 ¥${amountBeforeCoupon.toFixed(2)} 达标，但券后 ¥${compareAmount.toFixed(2)} < ¥${threshold}，不满足条件`,
          );
        }
      }

      if (hit) {
        if (Math.abs(compareAmount - threshold) < EPSILON) {
          boundaryType = 'exact';
          isBoundary = true;
          warnings.push(
            `⚠️ 规则「${rule.name}」：金额刚好卡线（¥${compareAmount.toFixed(2)} = ¥${threshold}），少一分钱都将失去赠品`,
          );
        }
        const amountLabel = excludeBundle ? (useCoupon ? '券后非套装金额' : '非套装金额') : useCoupon ? '券后金额' : '订单金额';
        reason = `${amountLabel} ¥${compareAmount.toFixed(2)} ≥ ¥${threshold}，满足条件`;
      } else {
        const amountLabel = excludeBundle ? (useCoupon ? '券后非套装金额' : '非套装金额') : useCoupon ? '券后金额' : '订单金额';
        reason = `${amountLabel} ¥${compareAmount.toFixed(2)} < ¥${threshold}，未达到门槛`;
      }
    } else if (rule.type === 'limit_first') {
      const limit = rule.limitCount ?? 0;
      hit = orderNumber > 0 && orderNumber <= limit;
      if (hit) {
        reason = `当前是第 ${orderNumber} 单，在前 ${limit} 单范围内`;
        if (orderNumber === limit) {
          isBoundary = true;
          warnings.push(`⚠️ 规则「${rule.name}」：刚好是第 ${limit} 单（最后一单限量）`);
        }
      } else {
        reason = orderNumber <= 0
          ? '未设置模拟订单号'
          : `当前是第 ${orderNumber} 单，已超过前 ${limit} 单限量`;
        if (orderNumber === limit + 1) {
          isBoundary = true;
          warnings.push(`⚠️ 规则「${rule.name}」：第 ${orderNumber} 单刚好多出限量 1 单`);
        }
      }
    }

    ruleDetails.push({
      ruleId: rule.id,
      ruleName: rule.name,
      hit,
      reason,
      isBoundary,
      boundaryType,
    });

    if (hit) {
      const existing = giftMap.get(rule.giftId);
      const usedStock = usedStockPerGift.get(rule.giftId) ?? 0;
      const remainingBefore = rule.giftStock - usedStock;
      const willGive = Math.min(rule.giftPerOrder, Math.max(0, remainingBefore));

      if (remainingBefore <= 0) {
        warnings.push(`⚠️ 赠品「${rule.giftName}」库存已耗尽，规则「${rule.name}」无法发放`);
      } else if (willGive < rule.giftPerOrder) {
        warnings.push(
          `⚠️ 赠品「${rule.giftName}」库存不足，规则「${rule.name}」仅能发放 ${willGive}/${rule.giftPerOrder} 件`,
        );
      }

      if (existing) {
        existing.quantity += willGive;
        existing.hitRules.push(rule.id);
        existing.isMultiHit = existing.hitRules.length > 1;
        existing.stockDeducted += willGive;
        existing.remainingStock = existing.initialStock - existing.stockDeducted;
        if (remainingBefore <= willGive) {
          existing.stockOut = true;
        }
      } else {
        giftMap.set(rule.giftId, {
          giftId: rule.giftId,
          giftName: rule.giftName,
          quantity: willGive,
          remainingStock: rule.giftStock - usedStock - willGive,
          initialStock: rule.giftStock,
          hitRules: [rule.id],
          isMultiHit: false,
          willRecall: rule.type === 'threshold',
          stockOut: remainingBefore <= 0,
          stockDeducted: willGive,
        });
      }
      usedStockPerGift.set(rule.giftId, usedStock + willGive);
    }
  }

  const gifts = Array.from(giftMap.values()).map((g) => {
    const { stockDeducted, ...rest } = g;
    if (g.isMultiHit) {
      const hitRuleNames = ruleDetails
        .filter((d) => g.hitRules.includes(d.ruleId))
        .map((d) => d.ruleName)
        .join('、');
      warnings.push(`🎯 赠品「${g.giftName}」被多条规则同时命中：${hitRuleNames}`);
    }
    return rest;
  });

  return {
    originalTotal,
    nonBundleTotal,
    couponAmount,
    finalTotal,
    finalNonBundleTotal,
    ruleDetails,
    gifts,
    warnings,
  };
}
