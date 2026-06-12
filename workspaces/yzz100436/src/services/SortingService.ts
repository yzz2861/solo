import { In } from 'typeorm';
import { getRepository } from '../config/database';
import { SortingList } from '../entities/SortingList';
import { SortingBag } from '../entities/SortingBag';
import { Cutoff } from '../entities/Cutoff';
import { DeliveryRoute } from '../entities/DeliveryRoute';
import { Community } from '../entities/Community';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Product } from '../entities/Product';
import { User } from '../entities/User';
import { CreateSortingListRequest, UpdateSortingBagRequest } from '../types/api';

interface BagItem {
  orderItemId: string;
  orderId: string;
  orderNo: string;
  userId: string;
  userName: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  isSubstituted: boolean;
  originalProductName?: string;
}

export class SortingService {
  static async createSortingList(data: CreateSortingListRequest): Promise<SortingList> {
    const sortingListRepo = getRepository(SortingList);
    const cutoffRepo = getRepository(Cutoff);
    const routeRepo = getRepository(DeliveryRoute);
    const communityRepo = getRepository(Community);
    const orderRepo = getRepository(Order);
    const orderItemRepo = getRepository(OrderItem);
    const productRepo = getRepository(Product);
    const userRepo = getRepository(User);

    const cutoff = await cutoffRepo.findOne({ where: { id: data.cutoffId } });
    if (!cutoff) throw new Error('截单批次不存在');
    if (cutoff.status !== 'closed' && cutoff.status !== 'delivering') {
      throw new Error('截单批次未关闭，无法生成分拣单');
    }

    const orderQueryBuilder = orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.community', 'community')
      .leftJoinAndSelect('order.user', 'user')
      .where('order.cutoffId = :cutoffId', { cutoffId: data.cutoffId })
      .andWhere('order.status IN (:...statuses)', { statuses: ['cutoff', 'sorting', 'delivered'] });

    if (data.routeId) {
      const route = await routeRepo.findOne({
        where: { id: data.routeId },
        relations: ['communities']
      });
      if (!route) throw new Error('配送线路不存在');
      const communityIds = route.communities.map((c: Community) => c.id);
      orderQueryBuilder.andWhere('order.communityId IN (:...communityIds)', { communityIds });
    }

    const orders = await orderQueryBuilder.getMany();
    if (orders.length === 0) throw new Error('没有可分拣的订单');

    const orderIds = orders.map(o => o.id);
    const orderItems = await orderItemRepo.find({
      where: { orderId: In(orderIds), status: In(['normal', 'substituted']) },
      relations: ['product']
    });

    const substitutedProductIds = orderItems
      .filter(i => i.status === 'substituted' && i.substitutedProductId)
      .map(i => i.substitutedProductId!);
    const substitutedProducts = substitutedProductIds.length > 0
      ? await productRepo.find({ where: { id: In(substitutedProductIds) } })
      : [];
    const substitutedProductMap = new Map(substitutedProducts.map(p => [p.id, p]));

    const orderMap = new Map(orders.map(o => [o.id, o]));

    const communityGroups = new Map<string, { community: Community; items: BagItem[] }>();

    for (const item of orderItems) {
      const order = orderMap.get(item.orderId);
      if (!order || !order.community) continue;

      const community = order.community;
      if (!communityGroups.has(community.id)) {
        communityGroups.set(community.id, { community, items: [] });
      }

      let productName = item.product?.name || '未知商品';
      let unit = item.product?.unit || '';
      let quantity = item.actualQuantity ?? item.quantity;
      let isSubstituted = false;
      let originalProductName: string | undefined;

      if (item.status === 'substituted' && item.substitutedProductId) {
        const substitutedProduct = substitutedProductMap.get(item.substitutedProductId);
        if (substitutedProduct) {
          originalProductName = productName;
          productName = substitutedProduct.name;
          unit = substitutedProduct.unit;
          quantity = item.substitutedQuantity ?? quantity;
          isSubstituted = true;
        }
      }

      const bagItem: BagItem = {
        orderItemId: item.id,
        orderId: item.orderId,
        orderNo: order.orderNo,
        userId: order.userId,
        userName: order.user?.name || '未知用户',
        productId: isSubstituted && item.substitutedProductId ? item.substitutedProductId : item.productId,
        productName,
        quantity,
        unit,
        isSubstituted,
        originalProductName
      };

      communityGroups.get(community.id)!.items.push(bagItem);
    }

    const sortingList = new SortingList();
    sortingList.name = data.name;
    sortingList.cutoffId = data.cutoffId;
    sortingList.routeId = data.routeId;
    sortingList.createdBy = data.createdBy;
    sortingList.status = 'pending';
    sortingList.remark = data.remark;
    sortingList.bags = [];

    for (const [communityId, group] of communityGroups) {
      const bag = new SortingBag();
      bag.communityId = communityId;
      bag.bagLabel = `${group.community.name} - ${cutoff.name}`;
      bag.shelfLocation = group.community.shelfLocation;
      bag.status = 'pending';
      bag.items = group.items;
      sortingList.bags.push(bag);
    }

    await orderRepo.update(
      { id: In(orderIds), status: 'cutoff' },
      { status: 'sorting', updatedAt: new Date() }
    );

    return await sortingListRepo.save(sortingList);
  }

  static async updateSortingBag(bagId: string, data: UpdateSortingBagRequest): Promise<SortingBag> {
    const bagRepo = getRepository(SortingBag);

    const bag = await bagRepo.findOne({ where: { id: bagId } });
    if (!bag) throw new Error('分拣袋不存在');

    bag.status = data.status;
    bag.remark = data.remark || bag.remark;

    if (data.status === 'packed') {
      bag.packedAt = new Date();
    }

    return await bagRepo.save(bag);
  }

  static async getSortingListDetail(sortingListId: string): Promise<SortingList | null> {
    const sortingListRepo = getRepository(SortingList);
    return await sortingListRepo.findOne({
      where: { id: sortingListId },
      relations: ['bags', 'bags.community', 'cutoff', 'route', 'createdByUser']
    });
  }

  static async getSortingListsByCutoff(cutoffId: string): Promise<SortingList[]> {
    const sortingListRepo = getRepository(SortingList);
    return await sortingListRepo.find({
      where: { cutoffId },
      relations: ['bags', 'route'],
      order: { createdAt: 'DESC' }
    });
  }

  static async getSortingBagLabel(bagId: string): Promise<any> {
    const bagRepo = getRepository(SortingBag);
    const bag = await bagRepo.findOne({
      where: { id: bagId },
      relations: ['community', 'sortingList', 'sortingList.cutoff']
    });
    if (!bag) throw new Error('分拣袋不存在');

    return {
      bagId: bag.id,
      bagLabel: bag.bagLabel,
      communityName: bag.community?.name,
      communityAddress: bag.community?.address,
      shelfLocation: bag.shelfLocation,
      cutoffName: bag.sortingList?.cutoff?.name,
      itemCount: bag.itemCount,
      items: bag.items,
      status: bag.status
    };
  }

  static async completeSortingList(sortingListId: string): Promise<SortingList> {
    const sortingListRepo = getRepository(SortingList);
    const bagRepo = getRepository(SortingBag);

    const sortingList = await sortingListRepo.findOne({
      where: { id: sortingListId },
      relations: ['bags']
    });
    if (!sortingList) throw new Error('分拣单不存在');

    const allBagsPacked = sortingList.bags.every((b: SortingBag) => b.status === 'packed' || b.status === 'delivered');
    if (!allBagsPacked) throw new Error('还有分拣袋未完成打包');

    sortingList.status = 'completed';
    sortingList.completedAt = new Date();

    return await sortingListRepo.save(sortingList);
  }

  static async getCommunitySortingList(cutoffId: string, communityId: string): Promise<any> {
    const orderRepo = getRepository(Order);
    const orderItemRepo = getRepository(OrderItem);
    const productRepo = getRepository(Product);
    const communityRepo = getRepository(Community);

    const community = await communityRepo.findOne({ where: { id: communityId } });
    if (!community) throw new Error('小区不存在');

    const orders = await orderRepo.find({
      where: { cutoffId, communityId, status: In(['cutoff', 'sorting', 'delivered']) },
      relations: ['user']
    });

    const orderIds = orders.map(o => o.id);
    const orderItems = await orderItemRepo.find({
      where: { orderId: In(orderIds), status: In(['normal', 'substituted']) },
      relations: ['product']
    });

    const itemsByOrder = new Map<string, any[]>();
    for (const order of orders) {
      itemsByOrder.set(order.id, []);
    }

    const substitutedProductIds = orderItems
      .filter(i => i.status === 'substituted' && i.substitutedProductId)
      .map(i => i.substitutedProductId!);
    const substitutedProducts = substitutedProductIds.length > 0
      ? await productRepo.find({ where: { id: In(substitutedProductIds) } })
      : [];
    const substitutedProductMap = new Map(substitutedProducts.map(p => [p.id, p]));

    for (const item of orderItems) {
      let productName = item.product?.name || '未知商品';
      let unit = item.product?.unit || '';
      let quantity = item.actualQuantity ?? item.quantity;
      let isSubstituted = false;
      let originalProductName: string | undefined;

      if (item.status === 'substituted' && item.substitutedProductId) {
        const substitutedProduct = substitutedProductMap.get(item.substitutedProductId);
        if (substitutedProduct) {
          originalProductName = productName;
          productName = substitutedProduct.name;
          unit = substitutedProduct.unit;
          quantity = item.substitutedQuantity ?? quantity;
          isSubstituted = true;
        }
      }

      itemsByOrder.get(item.orderId)?.push({
        orderItemId: item.id,
        productName,
        quantity,
        unit,
        isSubstituted,
        originalProductName
      });
    }

    return {
      communityName: community.name,
      shelfLocation: community.shelfLocation,
      orders: orders.map(order => ({
        orderId: order.id,
        orderNo: order.orderNo,
        userName: order.user?.name || '未知用户',
        userPhone: order.user?.phone || '',
        items: itemsByOrder.get(order.id) || []
      }))
    };
  }
}
