export type RuleType = 'threshold' | 'limit_first';

export interface GiftRule {
  id: string;
  name: string;
  type: RuleType;
  priority: number;
  thresholdAmount?: number;
  useCoupon?: boolean;
  excludeBundle?: boolean;
  limitCount?: number;
  giftId: string;
  giftName: string;
  giftStock: number;
  giftPerOrder: number;
  enabled: boolean;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  isBundle: boolean;
}

export interface Solution {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  rules: GiftRule[];
  cart: CartItem[];
  couponAmount: number;
  orderNumber: number;
}

export interface GiftResult {
  giftId: string;
  giftName: string;
  quantity: number;
  remainingStock: number;
  initialStock: number;
  hitRules: string[];
  isMultiHit: boolean;
  willRecall: boolean;
  stockOut: boolean;
}

export interface RuleHitDetail {
  ruleId: string;
  ruleName: string;
  hit: boolean;
  reason: string;
  isBoundary: boolean;
  boundaryType?: 'exact' | 'coupon_failed' | 'bundle_excluded';
}

export interface TrialResult {
  originalTotal: number;
  nonBundleTotal: number;
  couponAmount: number;
  finalTotal: number;
  finalNonBundleTotal: number;
  ruleDetails: RuleHitDetail[];
  gifts: GiftResult[];
  warnings: string[];
}
