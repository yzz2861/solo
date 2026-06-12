export const STORAGE_KEYS = {
  STAFF_LIST: 'dessert_train_staff_list',
  RECORDS_PREFIX: 'dessert_train_records_',
  STATS_PREFIX: 'dessert_train_stats_',
  MANAGER_PASSWORD: 'dessert_train_manager_password',
  CURRENT_STAFF: 'dessert_train_current_staff',
  SCENARIO_CACHE: 'dessert_train_scenario_cache_',
};

export const DEFAULT_MANAGER_PASSWORD = 'admin123';

export const SCENARIO_TYPE_LABELS: Record<string, string> = {
  basic: '基础场景',
  stacking: '优惠叠加',
  special: '特殊场景',
  complex: '复杂场景',
};

export const SCENARIO_TYPE_COLORS: Record<string, string> = {
  basic: 'bg-matcha-100 text-matcha-700',
  stacking: 'bg-peach-100 text-peach-700',
  special: 'bg-primary-100 text-primary-700',
  complex: 'bg-caramel-100 text-caramel-700',
};

export const COUPON_TYPE_COLORS: Record<string, string> = {
  full_reduction: 'bg-peach-50 border-peach-300 text-peach-700',
  discount: 'bg-matcha-50 border-matcha-300 text-matcha-700',
  points: 'bg-blue-50 border-blue-300 text-blue-700',
};

export const INPUT_LABELS: Record<string, string> = {
  finalTotal: '应收金额',
  changeAmount: '找零金额',
  refundAmount: '退款金额',
};

export const SCENARIO_TYPE_WEIGHTS: Record<string, number> = {
  basic: 40,
  stacking: 20,
  special: 30,
  complex: 10,
};

export const POINTS_RATE = 100;
