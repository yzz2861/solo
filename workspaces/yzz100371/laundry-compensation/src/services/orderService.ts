import { v4 as uuidv4 } from 'uuid';
import { OrderRepo } from '../db/repositories/orderRepo';
import { TimelineRepo } from '../db/repositories/timelineRepo';
import { CareOrder, OrderStatus, CreateOrderInput, TimelineEventType } from '../types';
import { OrderAlreadyPickedUpError, OrderNotFoundError, InvalidStatusTransitionError } from '../utils/errors';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.Received]: [OrderStatus.Washing],
  [OrderStatus.Washing]: [OrderStatus.Done],
  [OrderStatus.Done]: [OrderStatus.PickedUp],
  [OrderStatus.PickedUp]: [],
};

export class OrderService {
  constructor(
    private orderRepo: OrderRepo,
    private timelineRepo: TimelineRepo,
  ) {}

  createOrder(input: CreateOrderInput, actorId: string): CareOrder {
    const now = new Date().toISOString();
    const order: CareOrder = {
      id: uuidv4(),
      storeId: input.storeId,
      customerId: input.customerId,
      customerName: input.customerName,
      status: OrderStatus.Received,
      receiptPhotos: JSON.stringify(input.receiptPhotos),
      receivedAt: now,
      pickedUpAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const saved = this.orderRepo.create(order);

    this.timelineRepo.create({
      id: uuidv4(),
      orderId: order.id,
      eventType: TimelineEventType.OrderCreated,
      actorId,
      detail: `门店 ${input.storeId} 创建洗护订单，客户: ${input.customerName}`,
      createdAt: now,
    });

    return saved;
  }

  getOrder(id: string): CareOrder {
    const order = this.orderRepo.findById(id);
    if (!order) throw new OrderNotFoundError(id);
    return order;
  }

  getOrdersByStore(storeId: string): CareOrder[] {
    return this.orderRepo.findByStoreId(storeId);
  }

  updateOrderStatus(id: string, newStatus: OrderStatus, actorId: string): CareOrder {
    const order = this.orderRepo.findById(id);
    if (!order) throw new OrderNotFoundError(id);

    if (order.status === OrderStatus.PickedUp) {
      throw new OrderAlreadyPickedUpError(id);
    }

    const allowed = VALID_TRANSITIONS[order.status];
    if (!allowed.includes(newStatus)) {
      throw new InvalidStatusTransitionError(order.status, newStatus);
    }

    const pickedUpAt = newStatus === OrderStatus.PickedUp ? new Date().toISOString() : null;
    this.orderRepo.updateStatus(id, newStatus, pickedUpAt);

    this.timelineRepo.create({
      id: uuidv4(),
      orderId: id,
      eventType: TimelineEventType.OrderStatusChanged,
      actorId,
      detail: `订单状态从 ${order.status} 变更为 ${newStatus}`,
      createdAt: new Date().toISOString(),
    });

    return this.orderRepo.findById(id)!;
  }

  assertNotPickedUp(orderId: string): void {
    const order = this.orderRepo.findById(orderId);
    if (order && order.status === OrderStatus.PickedUp) {
      throw new OrderAlreadyPickedUpError(orderId);
    }
  }
}
