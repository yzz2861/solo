import type { RecycleOrder, FullCheck, RecycleStatus } from '../types';

export function ulid(): string {
  return (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));
}

export const emptyCheck: FullCheck = {
  screen: { scratch: 'pending', crack: 'pending', display: 'pending' },
  battery: { health: 100, bulge: 'pending' },
  water: { indicator: 'pending' },
  account: { idLoggedOut: 'pending' },
};

export function emptyOrder(params: {
  createdBy: string;
  createdByRole: 'staff' | 'manager';
}): RecycleOrder {
  const now = Date.now();
  return {
    id: ulid(),
    serialNumber: '',
    imei: '',
    brand: '',
    model: '',
    storage: '128GB',
    color: '黑色',
    appearanceRating: 'A',
    photos: [],
    checkResult: JSON.parse(JSON.stringify(emptyCheck)),
    privacyWiped: false,
    initialPrice: 0,
    finalPrice: null,
    priceHistory: [],
    status: 'pending_in',
    createdAt: now,
    updatedAt: now,
    createdBy: params.createdBy,
    createdByRole: params.createdByRole,
    logs: [
      {
        id: ulid(),
        timestamp: now,
        action: '创建回收单',
        operator: params.createdBy,
        operatorRole: params.createdByRole,
      },
    ],
  };
}

export function isCheckCompleted(check: FullCheck): boolean {
  return (
    check.screen.scratch !== 'pending' &&
    check.screen.crack !== 'pending' &&
    check.screen.display !== 'pending' &&
    check.battery.bulge !== 'pending' &&
    check.water.indicator !== 'pending' &&
    check.account.idLoggedOut !== 'pending'
  );
}

export function getFailReasons(check: FullCheck): string[] {
  const reasons: string[] = [];
  if (check.screen.scratch === 'fail') reasons.push('屏幕：存在明显划痕');
  if (check.screen.crack === 'fail') reasons.push('屏幕：玻璃碎裂');
  if (check.screen.display === 'fail') reasons.push('屏幕：显示异常/坏点');
  if (check.battery.bulge === 'fail') reasons.push('电池：存在鼓包风险');
  if (check.battery.health < 80) reasons.push(`电池：健康度仅 ${check.battery.health}%`);
  if (check.water.indicator === 'fail') reasons.push('进水：试纸变色，疑似进水');
  if (check.account.idLoggedOut === 'fail') reasons.push('账号锁：Apple ID / 账号未退出');
  return reasons;
}

export type TransitionResult = { ok: true } | { ok: false; reason: string };

export function canTransition(
  from: RecycleStatus,
  to: RecycleStatus,
  order: RecycleOrder
): TransitionResult {
  if (from === 'pending_in' && to === 'in_stock') {
    if (order.checkResult.account.idLoggedOut !== 'pass')
      return { ok: false, reason: '❌ 请先让顾客退出 Apple ID / 账号锁' };
    if (!order.privacyWiped) return { ok: false, reason: '⚠️ 请确认已完成隐私数据清除' };
    return { ok: true };
  }
  if (from === 'in_stock' && to === 'on_shelf') {
    if (!order.privacyWiped) return { ok: false, reason: '⚠️ 隐私清除未确认，不能上架' };
    return { ok: true };
  }
  if (to === 'bargain_fail') {
    if (from !== 'pending_in') return { ok: false, reason: '已入库/上架订单无法标记议价失败' };
    return { ok: true };
  }
  if (to === 'returned') {
    if (!['in_stock', 'on_shelf'].includes(from)) return { ok: false, reason: '当前状态不可退回' };
    return { ok: true };
  }
  return { ok: false, reason: `不允许的状态变更：${from} → ${to}` };
}
