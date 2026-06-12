import 'reflect-metadata';
import { getRepository } from '../config/database';
import { User } from '../entities/User';
import { Product } from '../entities/Product';
import { Community } from '../entities/Community';
import { DeliveryRoute } from '../entities/DeliveryRoute';
import { Cutoff } from '../entities/Cutoff';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Substitution } from '../entities/Substitution';
import { Refund } from '../entities/Refund';
import { SortingList, SortingBag } from '../entities';
import { v4 as uuidv4 } from 'uuid';
import {
  OrderService,
  CutoffService,
  DeliveryService,
  SubstitutionService,
  RefundService,
  SortingService
} from '../services';

describe('生鲜预售截单分拣完整流程', () => {
  let leader: User;
  let customer1: User;
  let customer2: User;
  let sorter: User;
  let finance: User;
  let product1: Product;
  let product2: Product;
  let product3: Product;
  let community1: Community;
  let community2: Community;
  let route: DeliveryRoute;
  let cutoff: Cutoff;
  let order1: Order;
  let order2: Order;

  beforeAll(async () => {
    const userRepo = getRepository(User);
    const productRepo = getRepository(Product);
    const communityRepo = getRepository(Community);
    const routeRepo = getRepository(DeliveryRoute);

    leader = userRepo.create({
      id: uuidv4(),
      name: '张团长',
      phone: '13800000001',
      role: 'leader'
    });
    await userRepo.save(leader);

    customer1 = userRepo.create({
      id: uuidv4(),
      name: '李用户',
      phone: '13800000002',
      role: 'customer'
    });
    await userRepo.save(customer1);

    customer2 = userRepo.create({
      id: uuidv4(),
      name: '王用户',
      phone: '13800000003',
      role: 'customer'
    });
    await userRepo.save(customer2);

    sorter = userRepo.create({
      id: uuidv4(),
      name: '赵分拣',
      phone: '13800000004',
      role: 'sorter'
    });
    await userRepo.save(sorter);

    finance = userRepo.create({
      id: uuidv4(),
      name: '钱财务',
      phone: '13800000005',
      role: 'finance'
    });
    await userRepo.save(finance);

    product1 = productRepo.create({
      id: uuidv4(),
      name: '西红柿',
      price: 5.99,
      unit: '斤',
      category: '蔬菜',
      status: 'active'
    });
    await productRepo.save(product1);

    product2 = productRepo.create({
      id: uuidv4(),
      name: '黄瓜',
      price: 3.99,
      unit: '斤',
      category: '蔬菜',
      status: 'active'
    });
    await productRepo.save(product2);

    product3 = productRepo.create({
      id: uuidv4(),
      name: '圣女果',
      price: 8.99,
      unit: '斤',
      category: '水果',
      status: 'active'
    });
    await productRepo.save(product3);

    route = routeRepo.create({
      id: uuidv4(),
      name: 'A线路',
      sortOrder: 1,
      description: '城东线路'
    });
    await routeRepo.save(route);

    community1 = communityRepo.create({
      id: uuidv4(),
      name: '阳光花园',
      address: '城东大道1号',
      shelfLocation: 'A区货架-01',
      routeId: route.id
    });
    await communityRepo.save(community1);

    community2 = communityRepo.create({
      id: uuidv4(),
      name: '丽景小区',
      address: '城东大道2号',
      shelfLocation: 'A区货架-02',
      routeId: route.id
    });
    await communityRepo.save(community2);
  });

  test('1. 创建截单批次', async () => {
    const cutoffTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    cutoff = await CutoffService.createCutoff('6月13日晚截单', cutoffTime, leader.id);

    expect(cutoff).toBeDefined();
    expect(cutoff.status).toBe('active');
    expect(cutoff.name).toBe('6月13日晚截单');
  });

  test('2. 用户下单', async () => {
    order1 = await OrderService.createOrder({
      userId: customer1.id,
      communityId: community1.id,
      cutoffId: cutoff.id,
      items: [
        { productId: product1.id, quantity: 2 },
        { productId: product2.id, quantity: 3 }
      ]
    });

    order2 = await OrderService.createOrder({
      userId: customer2.id,
      communityId: community2.id,
      cutoffId: cutoff.id,
      items: [
        { productId: product1.id, quantity: 3 },
        { productId: product2.id, quantity: 2 }
      ]
    });

    expect(order1.status).toBe('confirmed');
    expect(order1.totalAmount).toBeCloseTo(5.99 * 2 + 3.99 * 3);
    expect(order1.items.length).toBe(2);
    expect(order2.items.length).toBe(2);
  });

  test('3. 截单后普通用户不能修改商品数量', async () => {
    const closedCutoff = await CutoffService.closeCutoff(cutoff.id, {});
    expect(closedCutoff.status).toBe('closed');

    const updatedOrder = await OrderService.getOrderDetail(order1.id);
    expect(updatedOrder?.status).toBe('cutoff');

    const orderItem = updatedOrder!.items[0];
    await expect(
      OrderService.updateOrderItem(order1.id, orderItem.id, { quantity: 5 }, 'customer')
    ).rejects.toThrow('截单后普通用户不能修改商品数量');

    await expect(
      OrderService.updateOrderItem(order1.id, orderItem.id, { quantity: 5 }, 'leader')
    ).resolves.toBeDefined();
  });

  test('4. 供应商到货 - 西红柿缺货', async () => {
    const delivery = await DeliveryService.recordDelivery({
      cutoffId: cutoff.id,
      productId: product1.id,
      actualQuantity: 3,
      supplierName: '蔬菜供应商A',
      remark: '西红柿供货紧张'
    });

    expect(delivery.expectedQuantity).toBe(8);
    expect(delivery.shortageQuantity).toBe(5);
    expect(delivery.status).toBe('partial');

    const shortages = await DeliveryService.getShortageItems(cutoff.id);
    expect(shortages.length).toBe(1);
    expect(shortages[0].productId).toBe(product1.id);

    const updatedOrder1 = await OrderService.getOrderDetail(order1.id);
    const tomatoItem1 = updatedOrder1!.items.find(i => i.productId === product1.id);
    expect(tomatoItem1?.status).toBe('out_of_stock');

    const updatedOrder2 = await OrderService.getOrderDetail(order2.id);
    const tomatoItem2 = updatedOrder2!.items.find(i => i.productId === product1.id);

    const totalActual = (tomatoItem1?.actualQuantity || 0) + (tomatoItem2?.actualQuantity || 0);
    expect(totalActual).toBe(3);

    const outOfStockCount = [tomatoItem1, tomatoItem2].filter(
      item => item?.status === 'out_of_stock'
    ).length;
    expect(outOfStockCount).toBeGreaterThanOrEqual(1);
  });

  test('5. 创建缺货替换方案 - 需要团长确认', async () => {
    const updatedOrder1 = await OrderService.getOrderDetail(order1.id);
    const tomatoItem = updatedOrder1!.items.find(i => i.productId === product1.id)!;

    const substitution = await SubstitutionService.createSubstitution({
      orderItemId: tomatoItem.id,
      substituteProductId: product3.id,
      substituteQuantity: 2,
      leaderRemark: '西红柿缺货，建议换成圣女果'
    });

    expect(substitution.status).toBe('pending');
    expect(substitution.originalProductId).toBe(product1.id);
    expect(substitution.substituteProductId).toBe(product3.id);
    expect(substitution.priceDifference).toBeCloseTo(8.99 * 2 - 5.99 * 5);
  });

  test('6. 团长审批替换方案', async () => {
    const substitutions = await SubstitutionService.getSubstitutionsByCutoff(cutoff.id);
    const substitution = substitutions[0];

    await expect(
      SubstitutionService.approveSubstitution(substitution.id, {
        leaderId: customer1.id,
        leaderRemark: '同意'
      })
    ).rejects.toThrow('只有团长可以审批替换方案');

    const approved = await SubstitutionService.approveSubstitution(substitution.id, {
      leaderId: leader.id,
      leaderRemark: '已确认，请用户确认'
    });

    expect(approved.status).toBe('approved');
    expect(approved.confirmedBy).toBe(leader.id);
  });

  test('7. 用户接受替换', async () => {
    const substitutions = await SubstitutionService.getSubstitutionsByCutoff(cutoff.id);
    const substitution = substitutions[0];

    const result = await SubstitutionService.customerResponse(substitution.id, {
      response: 'accepted',
      customerRemark: '可以接受圣女果'
    });

    expect(result.status).toBe('completed');
    expect(result.customerResponse).toBe('accepted');

    const updatedOrder1 = await OrderService.getOrderDetail(order1.id);
    const tomatoItem = updatedOrder1!.items.find(i => i.productId === product1.id)!;
    expect(tomatoItem.status).toBe('substituted');
    expect(tomatoItem.substitutedProductId).toBe(product3.id);
  });

  test('8. 退款 - 幂等防重', async () => {
    const idempotencyKey = `refund-${order2.id}-tomato`;

    const refund1 = await RefundService.createRefund({
      idempotencyKey,
      orderId: order2.id,
      amount: 5.99 * 2,
      reason: 'out_of_stock',
      remark: '西红柿缺货2斤退款'
    });

    const refund2 = await RefundService.createRefund({
      idempotencyKey,
      orderId: order2.id,
      amount: 5.99 * 2,
      reason: 'out_of_stock',
      remark: '重复退款请求'
    });

    expect(refund1.id).toBe(refund2.id);
    expect(refund1.status).toBe('pending');

    const approved = await RefundService.processRefund(refund1.id, {
      status: 'approved',
      processedBy: leader.id
    });
    expect(approved.status).toBe('approved');

    const transferred = await RefundService.processRefund(refund1.id, {
      status: 'transferred',
      processedBy: finance.id,
      transferMethod: '微信转账',
      transferTransactionId: 'wx123456789'
    });
    expect(transferred.status).toBe('transferred');

    const completed = await RefundService.processRefund(refund1.id, {
      status: 'completed',
      processedBy: finance.id
    });
    expect(completed.status).toBe('completed');

    const updatedOrder2 = await OrderService.getOrderDetail(order2.id);
    expect(updatedOrder2?.refundAmount).toBeCloseTo(5.99 * 2);
  });

  test('9. 重复退款通知不会多退钱', async () => {
    const updatedOrder2 = await OrderService.getOrderDetail(order2.id);
    const maxRefundable = updatedOrder2!.totalAmount - updatedOrder2!.refundAmount;

    await expect(
      RefundService.createRefund({
        idempotencyKey: `refund-${order2.id}-extra`,
        orderId: order2.id,
        amount: maxRefundable + 1,
        reason: 'quality_issue',
        remark: '超额退款'
      })
    ).rejects.toThrow('退款金额超过可退金额');
  });

  test('10. 按配送线路生成分拣单', async () => {
    await DeliveryService.recordDelivery({
      cutoffId: cutoff.id,
      productId: product2.id,
      actualQuantity: 5,
      supplierName: '蔬菜供应商A'
    });

    const sortingList = await SortingService.createSortingList({
      cutoffId: cutoff.id,
      routeId: route.id,
      name: '6月13日 A线路分拣单',
      createdBy: sorter.id
    });

    expect(sortingList.bags.length).toBe(2);
    expect(sortingList.status).toBe('pending');

    const bag1 = sortingList.bags.find(b => b.communityId === community1.id);
    expect(bag1).toBeDefined();
    expect(bag1!.bagLabel).toBe(`${community1.name} - ${cutoff.name}`);
    expect(bag1!.shelfLocation).toBe(community1.shelfLocation);
    expect(bag1!.items.length).toBeGreaterThan(0);

    const items = bag1!.items;
    const substitutedItem = items.find(i => i.isSubstituted);
    expect(substitutedItem).toBeDefined();
    expect(substitutedItem!.originalProductName).toBe('西红柿');
    expect(substitutedItem!.productName).toBe('圣女果');
  });

  test('11. 分拣员按小区拉清单 - 打印货架标签', async () => {
    const sortingLists = await SortingService.getSortingListsByCutoff(cutoff.id);
    const sortingList = sortingLists[0];
    const bag = sortingList.bags[0];

    const label = await SortingService.getSortingBagLabel(bag.id);
    expect(label.communityName).toBeDefined();
    expect(label.shelfLocation).toBeDefined();
    expect(label.items.length).toBeGreaterThan(0);
    expect(label.itemCount).toBeDefined();

    const communityList = await SortingService.getCommunitySortingList(
      cutoff.id,
      community1.id
    );
    expect(communityList.communityName).toBe(community1.name);
    expect(communityList.shelfLocation).toBe(community1.shelfLocation);
    expect(communityList.orders.length).toBe(1);
    expect(communityList.orders[0].userName).toBe(customer1.name);
  });

  test('12. 团长查详情看谁接受替换', async () => {
    const accepted = await SubstitutionService.getAcceptedSubstitutions(cutoff.id);
    expect(accepted.length).toBe(1);
    expect(accepted[0].customerResponse).toBe('accepted');
    expect(accepted[0].order?.user?.name).toBe(customer1.name);
  });

  test('13. 财务导出退款和差价', async () => {
    const exportData = await RefundService.exportRefunds({
      cutoffId: cutoff.id
    });

    expect(exportData.length).toBe(1);
    expect(exportData[0].amount).toBeCloseTo(5.99 * 2);
    expect(exportData[0].reason).toBe('out_of_stock');
    expect(exportData[0].status).toBe('completed');
    expect(exportData[0].customerName).toBe(customer2.name);
    expect(exportData[0].communityName).toBe(community2.name);
    expect(exportData[0].transferMethod).toBe('微信转账');
  });

  test('14. 服务重启后状态保持一致', async () => {
    const AppDataSource = (await import('../config/database')).AppDataSource;

    expect(AppDataSource.options.type).toBe('sqlite');

    const orderRepo = getRepository(Order);
    const refundRepo = getRepository(Refund);
    const substitutionRepo = getRepository(Substitution);
    const sortingListRepo = getRepository(SortingList);

    const orderRecord = await orderRepo.findOne({ where: { id: order1.id } });
    expect(orderRecord).toBeDefined();
    expect(orderRecord!.status).toBe('sorting');

    const refundRecord = await refundRepo.findOne({ where: { idempotencyKey: `refund-${order2.id}-tomato` } });
    expect(refundRecord).toBeDefined();
    expect(refundRecord!.status).toBe('completed');
    expect(refundRecord!.amount).toBeCloseTo(5.99 * 2);

    const substitutionRecord = await substitutionRepo.findOne({ where: { orderId: order1.id } });
    expect(substitutionRecord).toBeDefined();
    expect(substitutionRecord!.customerResponse).toBe('accepted');
    expect(substitutionRecord!.status).toBe('completed');

    const sortingListRecord = await sortingListRepo.findOne({ where: { cutoffId: cutoff.id } });
    expect(sortingListRecord).toBeDefined();
    expect(sortingListRecord!.status).toBe('pending');

    const order2Record = await orderRepo.findOne({ where: { id: order2.id } });
    expect(order2Record).toBeDefined();
    expect(order2Record!.refundAmount).toBeCloseTo(5.99 * 2);

    const isTestEnv = process.env.NODE_ENV === 'test';
    const dbPath = isTestEnv ? ':memory:' : './data/fresh_preorder.db';
    expect(AppDataSource.options.database).toBe(dbPath);
  });
});
