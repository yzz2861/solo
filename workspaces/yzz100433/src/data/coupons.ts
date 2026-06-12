import type { Coupon } from '@/types';

export const COUPON_TEMPLATES: Omit<Coupon, 'id'>[] = [
  {
    type: 'full_reduction',
    name: '满30减5',
    description: '满30元减5元',
    condition: 30,
    discountValue: 5,
    isStackable: true,
  },
  {
    type: 'full_reduction',
    name: '满50减10',
    description: '满50元减10元',
    condition: 50,
    discountValue: 10,
    isStackable: true,
  },
  {
    type: 'full_reduction',
    name: '满80减20',
    description: '满80元减20元',
    condition: 80,
    discountValue: 20,
    isStackable: false,
  },
  {
    type: 'full_reduction',
    name: '满100减25',
    description: '满100元减25元',
    condition: 100,
    discountValue: 25,
    isStackable: false,
  },
  {
    type: 'discount',
    name: '会员9折',
    description: '全场9折优惠',
    discountValue: 0.9,
    isStackable: true,
  },
  {
    type: 'discount',
    name: '会员85折',
    description: '全场85折优惠',
    discountValue: 0.85,
    isStackable: true,
  },
  {
    type: 'discount',
    name: '生日特惠8折',
    description: '生日当月8折',
    discountValue: 0.8,
    isStackable: false,
  },
  {
    type: 'discount',
    name: '新店特惠75折',
    description: '新店开业全场75折',
    discountValue: 0.75,
    isStackable: false,
  },
  {
    type: 'points',
    name: '积分抵扣',
    description: '100积分抵扣1元',
    isStackable: true,
  },
];

export const DAMAGED_COUPON_TEMPLATES: Omit<Coupon, 'id'>[] = [
  {
    type: 'full_reduction',
    name: '满50减10（破损）',
    description: '满50元减10元，但券面破损只能用一半',
    condition: 50,
    discountValue: 5,
    isStackable: true,
    isDamaged: true,
    damageNote: '此券破损，按面额50%使用，原减10元现减5元',
  },
  {
    type: 'discount',
    name: '9折券（破损）',
    description: '9折优惠券破损，只能按95折使用',
    discountValue: 0.95,
    isStackable: true,
    isDamaged: true,
    damageNote: '此券破损，原9折现只能按95折使用',
  },
  {
    type: 'full_reduction',
    name: '满100减25（破损）',
    description: '满100减25破损券，只能减15元',
    condition: 100,
    discountValue: 15,
    isStackable: false,
    isDamaged: true,
    damageNote: '此券严重破损，原减25元现只能减15元',
  },
];

export const generateCouponId = (): string => {
  return `c_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const createCoupon = (template: Omit<Coupon, 'id'>): Coupon => {
  return {
    ...template,
    id: generateCouponId(),
  };
};
