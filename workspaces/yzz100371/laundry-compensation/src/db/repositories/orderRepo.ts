import { getStore, persist } from '../init';
import { CareOrder, OrderStatus } from '../../types';

export class OrderRepo {
  create(order: CareOrder): CareOrder {
    const store = getStore();
    store.orders.set(order.id, order);
    persist();
    return order;
  }

  findById(id: string): CareOrder | undefined {
    return getStore().orders.get(id);
  }

  findByStoreId(storeId: string): CareOrder[] {
    return Array.from(getStore().orders.values())
      .filter(o => o.storeId === storeId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  updateStatus(id: string, status: OrderStatus, pickedUpAt: string | null): void {
    const store = getStore();
    const order = store.orders.get(id);
    if (!order) return;
    order.status = status;
    order.pickedUpAt = pickedUpAt;
    order.updatedAt = new Date().toISOString();
    store.orders.set(id, order);
    persist();
  }
}
