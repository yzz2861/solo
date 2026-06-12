import { Between } from 'typeorm';
import { getRepository } from '../config/database';
import { Refund, RefundStatus } from '../entities/Refund';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { CreateRefundRequest, ProcessRefundRequest, RefundExportParams, RefundExportItem } from '../types/api';

export class RefundService {
  static async createRefund(data: CreateRefundRequest): Promise<Refund> {
    const refundRepo = getRepository(Refund);
    const orderRepo = getRepository(Order);
    const orderItemRepo = getRepository(OrderItem);

    const existingRefund = await refundRepo.findOne({
      where: { idempotencyKey: data.idempotencyKey }
    });
    if (existingRefund) {
      return existingRefund;
    }

    const order = await orderRepo.findOne({ where: { id: data.orderId } });
    if (!order) throw new Error('订单不存在');

    if (data.orderItemId) {
      const orderItem = await orderItemRepo.findOne({
        where: { id: data.orderItemId, orderId: data.orderId }
      });
      if (!orderItem) throw new Error('订单项不存在');
      if (orderItem.status === 'refunded') throw new Error('该商品已退款');
    }

    const maxRefundable = order.totalAmount - order.refundAmount;
    if (data.amount > maxRefundable) {
      throw new Error(`退款金额超过可退金额，最多可退${maxRefundable.toFixed(2)}元`);
    }

    if (data.amount <= 0) throw new Error('退款金额必须大于0');

    const refund = new Refund();
    refund.idempotencyKey = data.idempotencyKey;
    refund.orderId = data.orderId;
    refund.orderItemId = data.orderItemId;
    refund.amount = data.amount;
    refund.status = 'pending';
    refund.reason = data.reason;
    refund.remark = data.remark;

    const savedRefund = await refundRepo.save(refund);

    if (data.orderItemId) {
      await orderItemRepo.update(data.orderItemId, { status: 'refunded' });
    }

    return savedRefund;
  }

  static async processRefund(refundId: string, data: ProcessRefundRequest): Promise<Refund> {
    const refundRepo = getRepository(Refund);
    const orderRepo = getRepository(Order);

    const refund = await refundRepo.findOne({ where: { id: refundId } });
    if (!refund) throw new Error('退款记录不存在');

    if (refund.status === 'completed' || refund.status === 'cancelled') {
      throw new Error('退款已完成或已取消，无法修改');
    }

    if (refund.status === 'pending' && data.status === 'approved') {
      refund.status = 'approved';
      refund.processedBy = data.processedBy;
      refund.approvedAt = new Date();
    } else if (refund.status === 'approved' && data.status === 'transferred') {
      refund.status = 'transferred';
      refund.transferMethod = data.transferMethod;
      refund.transferTransactionId = data.transferTransactionId;
      refund.transferredAt = new Date();
    } else if (refund.status === 'transferred' && data.status === 'completed') {
      refund.status = 'completed';
      refund.completedAt = new Date();
      refund.remark = data.remark || refund.remark;

      const order = await orderRepo.findOne({ where: { id: refund.orderId } });
      if (order) {
        order.refundAmount += refund.amount;
        await orderRepo.save(order);
      }
    } else if (data.status === 'cancelled') {
      refund.status = 'cancelled';
      refund.processedBy = data.processedBy;
      refund.remark = data.remark || refund.remark;
    } else {
      throw new Error(`无法从${refund.status}状态转换为${data.status}状态`);
    }

    return await refundRepo.save(refund);
  }

  static async getRefundDetail(refundId: string): Promise<Refund | null> {
    const refundRepo = getRepository(Refund);
    return await refundRepo.findOne({
      where: { id: refundId },
      relations: ['order', 'order.user', 'order.community', 'orderItem', 'orderItem.product', 'processedByUser']
    });
  }

  static async getRefundsByCutoff(cutoffId: string): Promise<Refund[]> {
    const refundRepo = getRepository(Refund);
    return await refundRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.order', 'order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.community', 'community')
      .leftJoinAndSelect('r.orderItem', 'orderItem')
      .leftJoinAndSelect('orderItem.product', 'product')
      .where('order.cutoffId = :cutoffId', { cutoffId })
      .orderBy('r.createdAt', 'DESC')
      .getMany();
  }

  static async exportRefunds(params: RefundExportParams): Promise<RefundExportItem[]> {
    const refundRepo = getRepository(Refund);
    const queryBuilder = refundRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.order', 'order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.community', 'community');

    if (params.cutoffId) {
      queryBuilder.andWhere('order.cutoffId = :cutoffId', { cutoffId: params.cutoffId });
    }
    if (params.status) {
      queryBuilder.andWhere('r.status = :status', { status: params.status });
    }
    if (params.startDate && params.endDate) {
      queryBuilder.andWhere('r.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(params.startDate),
        endDate: new Date(params.endDate)
      });
    }

    const refunds = await queryBuilder.orderBy('r.createdAt', 'ASC').getMany();

    return refunds.map(r => ({
      refundId: r.id,
      orderNo: r.order?.orderNo || '',
      customerName: r.order?.user?.name || '',
      customerPhone: r.order?.user?.phone || '',
      communityName: r.order?.community?.name || '',
      amount: r.amount,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      completedAt: r.completedAt?.toISOString(),
      transferMethod: r.transferMethod,
      transferTransactionId: r.transferTransactionId,
      remark: r.remark
    }));
  }

  static async calculatePriceDifference(orderId: string): Promise<number> {
    const { Substitution } = await import('../entities/Substitution');
    const substitutionRepo = getRepository(Substitution);
    const substitutions = await substitutionRepo.find({
      where: { orderId, customerResponse: 'accepted' as const }
    });
    return substitutions.reduce((sum, s) => sum + s.priceDifference, 0);
  }
}
