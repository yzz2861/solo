import type { TransferOrder, StoreInventory, TransferOrder as TO, ValidationError } from '@/types';

export function validateTransfer(
  order: TransferOrder,
  inventories: StoreInventory[],
  existingOrders: TransferOrder[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const item of order.items) {
    const inv = inventories.find(
      (i) => i.storeId === order.fromStoreId && i.skuId === item.skuId
    );
    if (!inv) {
      errors.push({
        field: `item-${item.skuId}`,
        message: `SKU ${item.skuId} 在调出门店无库存记录`,
        level: 'error',
      });
      continue;
    }

    const totalOut = item.quantities.sample + item.quantities.gift + item.quantities.trial + item.quantities.damaged;
    if (totalOut === 0) {
      errors.push({
        field: `item-${item.skuId}`,
        message: '所有数量均为0，请确认是否需要调拨',
        level: 'warning',
      });
    }

    if (item.quantities.sample > inv.quantities.sample) {
      errors.push({
        field: `item-${item.skuId}-sample`,
        message: `样品库存不足：现有${inv.quantities.sample}，调出${item.quantities.sample}`,
        level: 'error',
      });
    }
    if (item.quantities.gift > inv.quantities.gift) {
      errors.push({
        field: `item-${item.skuId}-gift`,
        message: `赠品库存不足：现有${inv.quantities.gift}，调出${item.quantities.gift}`,
        level: 'error',
      });
    }
    if (item.quantities.trial > inv.quantities.trial) {
      errors.push({
        field: `item-${item.skuId}-trial`,
        message: `试用装库存不足：现有${inv.quantities.trial}，调出${item.quantities.trial}`,
        level: 'error',
      });
    }
    if (item.quantities.damaged > inv.quantities.damaged) {
      errors.push({
        field: `item-${item.skuId}-damaged`,
        message: `残损品库存不足：现有${inv.quantities.damaged}，调出${item.quantities.damaged}`,
        level: 'error',
      });
    }

    if (item.quantities.damaged > 0 && order.toStoreId) {
      errors.push({
        field: `item-${item.skuId}-damaged`,
        message: '残损品不可调拨至其他门店作为可售品',
        level: 'error',
      });
    }

    const recentOrders = existingOrders.filter(
      (o) =>
        o.id !== order.id &&
        o.fromStoreId === order.fromStoreId &&
        o.status !== 'cancelled' &&
        o.items.some((i) => i.skuId === item.skuId) &&
        Math.abs(new Date(o.createdAt).getTime() - new Date(order.createdAt).getTime()) <
          24 * 60 * 60 * 1000
    );
    if (recentOrders.length > 0) {
      errors.push({
        field: `item-${item.skuId}`,
        message: `该SKU 24小时内已有${recentOrders.length}次调拨，请确认是否重复`,
        level: 'warning',
      });
    }
  }

  if (!order.operator) {
    errors.push({
      field: 'operator',
      message: '请填写调出经手人',
      level: 'error',
    });
  }
  if (!order.receiver) {
    errors.push({
      field: 'receiver',
      message: '请填写调入经手人',
      level: 'error',
    });
  }

  return errors;
}
