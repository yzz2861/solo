import { In } from 'typeorm';
import { getRepository } from '../config/database';
import { SupplierDelivery } from '../entities/SupplierDelivery';
import { Cutoff } from '../entities/Cutoff';
import { Product } from '../entities/Product';
import { OrderItem } from '../entities/OrderItem';
import { CreateDeliveryRequest } from '../types/api';

export class DeliveryService {
  static async recordDelivery(data: CreateDeliveryRequest): Promise<SupplierDelivery> {
    const deliveryRepo = getRepository(SupplierDelivery);
    const cutoffRepo = getRepository(Cutoff);
    const productRepo = getRepository(Product);
    const orderItemRepo = getRepository(OrderItem);

    const cutoff = await cutoffRepo.findOne({ where: { id: data.cutoffId } });
    if (!cutoff) throw new Error('截单批次不存在');
    if (cutoff.status !== 'closed') throw new Error('截单批次未关闭，无法录入到货');

    const product = await productRepo.findOne({ where: { id: data.productId } });
    if (!product) throw new Error('商品不存在');

    const orderItems = await orderItemRepo.find({
      where: {
        order: { cutoffId: data.cutoffId },
        productId: data.productId,
        status: In(['normal', 'out_of_stock'])
      }
    });

    const expectedQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const shortageQuantity = Math.max(0, expectedQuantity - data.actualQuantity);

    const delivery = new SupplierDelivery();
    delivery.cutoffId = data.cutoffId;
    delivery.productId = data.productId;
    delivery.expectedQuantity = expectedQuantity;
    delivery.actualQuantity = data.actualQuantity;
    delivery.shortageQuantity = shortageQuantity;
    delivery.status = data.actualQuantity >= expectedQuantity ? 'completed' : 'partial';
    delivery.supplierName = data.supplierName;
    delivery.remark = data.remark;
    delivery.confirmedAt = new Date();

    if (shortageQuantity > 0) {
      await this.markOrderItemsOutOfStock(data.cutoffId, data.productId, orderItems, data.actualQuantity);
    }

    return await deliveryRepo.save(delivery);
  }

  private static async markOrderItemsOutOfStock(
    cutoffId: string,
    productId: string,
    orderItems: OrderItem[],
    actualQuantity: number
  ): Promise<void> {
    const orderItemRepo = getRepository(OrderItem);

    let remainingQuantity = actualQuantity;

    for (const item of orderItems) {
      if (remainingQuantity <= 0) {
        item.status = 'out_of_stock';
        item.actualQuantity = 0;
      } else if (remainingQuantity >= item.quantity) {
        item.actualQuantity = item.quantity;
        remainingQuantity -= item.quantity;
      } else {
        item.status = 'out_of_stock';
        item.actualQuantity = remainingQuantity;
        item.remark = `缺货${(item.quantity - remainingQuantity).toFixed(2)}${item.product?.unit || ''}`;
        remainingQuantity = 0;
      }
      await orderItemRepo.save(item);
    }
  }

  static async getDeliveriesByCutoff(cutoffId: string): Promise<SupplierDelivery[]> {
    const deliveryRepo = getRepository(SupplierDelivery);
    return await deliveryRepo.find({
      where: { cutoffId },
      relations: ['product'],
      order: { createdAt: 'DESC' }
    });
  }

  static async getShortageItems(cutoffId: string): Promise<SupplierDelivery[]> {
    const deliveryRepo = getRepository(SupplierDelivery);
    return await deliveryRepo
      .createQueryBuilder('delivery')
      .leftJoinAndSelect('delivery.product', 'product')
      .where('delivery.cutoffId = :cutoffId', { cutoffId })
      .andWhere('delivery.shortageQuantity > 0')
      .getMany();
  }
}
