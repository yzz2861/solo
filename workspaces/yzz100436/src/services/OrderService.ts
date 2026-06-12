import { In } from 'typeorm';
import { getRepository } from '../config/database';
import { Order, OrderStatus } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Product } from '../entities/Product';
import { User } from '../entities/User';
import { Community } from '../entities/Community';
import { Cutoff, CutoffStatus } from '../entities/Cutoff';
import { CreateOrderRequest, UpdateOrderItemRequest, PaginationParams, PaginationResult } from '../types/api';

export class OrderService {
  static async createOrder(data: CreateOrderRequest): Promise<Order> {
    const orderRepo = getRepository(Order);
    const orderItemRepo = getRepository(OrderItem);
    const productRepo = getRepository(Product);
    const userRepo = getRepository(User);
    const communityRepo = getRepository(Community);
    const cutoffRepo = getRepository(Cutoff);

    const user = await userRepo.findOne({ where: { id: data.userId } });
    if (!user) throw new Error('用户不存在');

    const community = await communityRepo.findOne({ where: { id: data.communityId } });
    if (!community) throw new Error('小区不存在');

    const cutoff = await cutoffRepo.findOne({ where: { id: data.cutoffId } });
    if (!cutoff) throw new Error('截单批次不存在');
    if (cutoff.status !== 'active') throw new Error('截单批次已关闭，无法下单');

    const productIds = data.items.map(item => item.productId);
    const products = await productRepo.find({ where: { id: In(productIds) } });
    const productMap = new Map(products.map(p => [p.id, p]));

    const orderNo = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;

    let totalAmount = 0;
    const orderItems: OrderItem[] = [];

    for (const item of data.items) {
      const product = productMap.get(item.productId);
      if (!product) throw new Error(`商品不存在: ${item.productId}`);
      if (product.status !== 'active') throw new Error(`商品已下架: ${product.name}`);
      if (item.quantity <= 0) throw new Error(`商品数量必须大于0: ${product.name}`);

      const amount = product.price * item.quantity;
      totalAmount += amount;

      const orderItem = new OrderItem();
      orderItem.productId = item.productId;
      orderItem.quantity = item.quantity;
      orderItem.price = product.price;
      orderItem.amount = amount;
      orderItem.status = 'normal';
      orderItems.push(orderItem);
    }

    const order = new Order();
    order.orderNo = orderNo;
    order.userId = data.userId;
    order.communityId = data.communityId;
    order.cutoffId = data.cutoffId;
    order.status = 'confirmed';
    order.totalAmount = totalAmount;
    order.refundAmount = 0;
    order.remark = data.remark;
    order.items = orderItems;

    return await orderRepo.save(order);
  }

  static async updateOrderItem(
    orderId: string,
    orderItemId: string,
    data: UpdateOrderItemRequest,
    userRole: string
  ): Promise<OrderItem> {
    const orderRepo = getRepository(Order);
    const orderItemRepo = getRepository(OrderItem);
    const productRepo = getRepository(Product);

    const order = await orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new Error('订单不存在');

    if (order.status === 'cutoff' && userRole === 'customer') {
      throw new Error('截单后普通用户不能修改商品数量');
    }

    const orderItem = await orderItemRepo.findOne({
      where: { id: orderItemId, orderId }
    });
    if (!orderItem) throw new Error('订单项不存在');

    if (orderItem.status === 'refunded' || orderItem.status === 'substituted') {
      throw new Error('该商品已退款或已替换，无法修改');
    }

    if (data.quantity <= 0) throw new Error('商品数量必须大于0');

    const product = await productRepo.findOne({ where: { id: orderItem.productId } });
    if (!product) throw new Error('商品不存在');

    orderItem.quantity = data.quantity;
    orderItem.amount = product.price * data.quantity;

    await orderItemRepo.save(orderItem);
    await this.recalculateOrderTotal(orderId);

    return orderItem;
  }

  static async recalculateOrderTotal(orderId: string): Promise<void> {
    const orderRepo = getRepository(Order);
    const orderItemRepo = getRepository(OrderItem);

    const items = await orderItemRepo.find({ where: { orderId } });
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    await orderRepo.update(orderId, {
      totalAmount,
      updatedAt: new Date()
    });
  }

  static async getOrderDetail(orderId: string): Promise<Order | null> {
    const orderRepo = getRepository(Order);
    return await orderRepo.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product', 'user', 'community', 'substitutions', 'refunds']
    });
  }

  static async getOrdersByCutoff(cutoffId: string, params: PaginationParams): Promise<PaginationResult<Order>> {
    const orderRepo = getRepository(Order);
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const [items, total] = await orderRepo.findAndCount({
      where: { cutoffId },
      relations: ['items', 'items.product', 'user', 'community'],
      order: { createdAt: 'DESC' },
      skip,
      take: pageSize
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  static async getOrdersByCommunity(cutoffId: string, communityId: string): Promise<Order[]> {
    const orderRepo = getRepository(Order);
    return await orderRepo.find({
      where: { cutoffId, communityId },
      relations: ['items', 'items.product', 'user'],
      order: { createdAt: 'ASC' }
    });
  }
}
