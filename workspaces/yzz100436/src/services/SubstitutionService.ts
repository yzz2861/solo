import { getRepository } from '../config/database';
import { Substitution, SubstitutionStatus, CustomerResponse } from '../entities/Substitution';
import { OrderItem } from '../entities/OrderItem';
import { Product } from '../entities/Product';
import { User } from '../entities/User';
import { CreateSubstitutionRequest, ApproveSubstitutionRequest, CustomerSubstitutionResponse } from '../types/api';

export class SubstitutionService {
  static async createSubstitution(data: CreateSubstitutionRequest): Promise<Substitution> {
    const substitutionRepo = getRepository(Substitution);
    const orderItemRepo = getRepository(OrderItem);
    const productRepo = getRepository(Product);

    const orderItem = await orderItemRepo.findOne({
      where: { id: data.orderItemId },
      relations: ['product', 'order']
    });
    if (!orderItem) throw new Error('订单项不存在');
    if (orderItem.status !== 'out_of_stock' && orderItem.status !== 'normal') {
      throw new Error('该商品状态不支持替换');
    }

    const originalProduct = orderItem.product;
    const substituteProduct = await productRepo.findOne({ where: { id: data.substituteProductId } });
    if (!substituteProduct) throw new Error('替换商品不存在');

    const originalPrice = originalProduct.price;
    const substitutePrice = substituteProduct.price;
    const priceDifference = (substitutePrice * data.substituteQuantity) - (originalPrice * orderItem.quantity);

    const substitution = new Substitution();
    substitution.orderId = orderItem.orderId;
    substitution.orderItemId = data.orderItemId;
    substitution.originalProductId = originalProduct.id;
    substitution.substituteProductId = data.substituteProductId;
    substitution.originalQuantity = orderItem.quantity;
    substitution.substituteQuantity = data.substituteQuantity;
    substitution.originalPrice = originalPrice;
    substitution.substitutePrice = substitutePrice;
    substitution.priceDifference = priceDifference;
    substitution.status = 'pending';
    substitution.customerResponse = 'pending';
    substitution.leaderRemark = data.leaderRemark;

    orderItem.status = 'out_of_stock';
    await orderItemRepo.save(orderItem);

    return await substitutionRepo.save(substitution);
  }

  static async approveSubstitution(
    substitutionId: string,
    data: ApproveSubstitutionRequest
  ): Promise<Substitution> {
    const substitutionRepo = getRepository(Substitution);
    const userRepo = getRepository(User);

    const substitution = await substitutionRepo.findOne({ where: { id: substitutionId } });
    if (!substitution) throw new Error('替换方案不存在');
    if (substitution.status !== 'pending') throw new Error('替换方案已处理');

    const leader = await userRepo.findOne({ where: { id: data.leaderId } });
    if (!leader) throw new Error('团长不存在');
    if (leader.role !== 'leader') throw new Error('只有团长可以审批替换方案');

    substitution.status = 'approved';
    substitution.confirmedBy = data.leaderId;
    substitution.leaderRemark = data.leaderRemark || substitution.leaderRemark;
    substitution.leaderConfirmedAt = new Date();

    return await substitutionRepo.save(substitution);
  }

  static async customerResponse(
    substitutionId: string,
    data: CustomerSubstitutionResponse
  ): Promise<Substitution> {
    const substitutionRepo = getRepository(Substitution);
    const orderItemRepo = getRepository(OrderItem);

    const substitution = await substitutionRepo.findOne({ where: { id: substitutionId } });
    if (!substitution) throw new Error('替换方案不存在');
    if (substitution.status !== 'approved') throw new Error('替换方案未通过团长审批');
    if (substitution.customerResponse !== 'pending') throw new Error('用户已回复');

    substitution.customerResponse = data.response;
    substitution.customerRemark = data.customerRemark;
    substitution.customerRespondedAt = new Date();

    if (data.response === 'accepted') {
      substitution.status = 'completed';

      const orderItem = await orderItemRepo.findOne({ where: { id: substitution.orderItemId } });
      if (orderItem) {
        orderItem.status = 'substituted';
        orderItem.substitutedProductId = substitution.substituteProductId;
        orderItem.substitutedQuantity = substitution.substituteQuantity;
        orderItem.actualQuantity = substitution.substituteQuantity;
        await orderItemRepo.save(orderItem);
      }
    } else {
      substitution.status = 'rejected';
    }

    return await substitutionRepo.save(substitution);
  }

  static async getSubstitutionDetail(substitutionId: string): Promise<Substitution | null> {
    const substitutionRepo = getRepository(Substitution);
    return await substitutionRepo.findOne({
      where: { id: substitutionId },
      relations: ['originalProduct', 'substituteProduct', 'order', 'order.user', 'confirmedByUser']
    });
  }

  static async getSubstitutionsByCutoff(cutoffId: string): Promise<Substitution[]> {
    const substitutionRepo = getRepository(Substitution);
    return await substitutionRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.originalProduct', 'originalProduct')
      .leftJoinAndSelect('s.substituteProduct', 'substituteProduct')
      .leftJoinAndSelect('s.order', 'order')
      .leftJoinAndSelect('order.user', 'user')
      .where('order.cutoffId = :cutoffId', { cutoffId })
      .orderBy('s.createdAt', 'DESC')
      .getMany();
  }

  static async getAcceptedSubstitutions(cutoffId: string): Promise<Substitution[]> {
    const substitutionRepo = getRepository(Substitution);
    return await substitutionRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.originalProduct', 'originalProduct')
      .leftJoinAndSelect('s.substituteProduct', 'substituteProduct')
      .leftJoinAndSelect('s.order', 'order')
      .leftJoinAndSelect('order.user', 'user')
      .where('order.cutoffId = :cutoffId', { cutoffId })
      .andWhere('s.customerResponse = :response', { response: 'accepted' })
      .orderBy('s.createdAt', 'ASC')
      .getMany();
  }
}
