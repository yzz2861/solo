import { getDB, setDB, genId } from '../db/store';
import type {
  Order,
  WashStep,
  OrderStatus,
  Addon,
  CreateOrderRequest,
  AddAddonRequest,
  CancelOrderRequest,
} from '../../shared/types';
import { deductPackageTimes, refundPackageTimes, getMemberById } from './memberService';
import { isSameDay } from '../utils/date';

function getNextQueueNumber(db: ReturnType<typeof getDB>): number {
  const today = new Date();
  const todayOrders = db.orders.filter(o => isSameDay(o.createdAt, today));
  if (todayOrders.length === 0) return 1;
  return Math.max(...todayOrders.map(o => o.queueNumber)) + 1;
}

export function getOrders(date?: Date, status?: OrderStatus): Order[] {
  const db = getDB();
  let orders = db.orders;
  if (date) {
    orders = orders.filter(o => isSameDay(o.createdAt, date));
  }
  if (status) {
    orders = orders.filter(o => o.status === status);
  }
  return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getOrderById(id: string): Order | null {
  const db = getDB();
  return db.orders.find(o => o.id === id) || null;
}

export function createOrder(req: CreateOrderRequest): Order | { error: string } {
  const db = getDB();
  let packageDeducted = 0;
  let packageName: string | undefined;
  let memberName: string | undefined;
  let cashAmount = req.cashAmount;

  if (req.payType === 'member' && req.packageId) {
    const member = getMemberById(req.memberId!);
    if (!member) return { error: '会员不存在' };
    const pkg = member.packages.find(p => p.id === req.packageId);
    if (!pkg) return { error: '套餐不存在' };
    if (pkg.remainingTimes <= 0) return { error: '套餐已用完，无法核销' };
    const result = deductPackageTimes(req.packageId, 1);
    if (!result) return { error: '扣次失败' };
    packageDeducted = 1;
    packageName = pkg.packageName;
    memberName = member.name;
    cashAmount = pkg.pricePerTime;
  }

  let workerName: string | undefined;
  if (req.workerId) {
    const worker = db.workers.find(w => w.id === req.workerId);
    if (worker) workerName = worker.name;
  }

  const order: Order = {
    id: genId('o'),
    queueNumber: getNextQueueNumber(db),
    plateNumber: req.plateNumber.toUpperCase(),
    memberId: req.memberId,
    memberName,
    packageId: req.packageId,
    packageName,
    packageDeducted,
    payType: req.payType,
    cashAmount,
    workerId: req.workerId,
    workerName,
    currentStep: req.workerId ? 'rinsing' : 'queued',
    status: req.workerId ? 'washing' : 'queued',
    addons: [],
    createdAt: new Date().toISOString(),
  };

  db.orders.push(order);
  setDB(db);
  return order;
}

export function updateOrder(
  id: string,
  data: { workerId?: string; currentStep?: WashStep; status?: OrderStatus }
): Order | null {
  const db = getDB();
  const order = db.orders.find(o => o.id === id);
  if (!order) return null;

  if (data.workerId !== undefined) {
    order.workerId = data.workerId;
    const worker = db.workers.find(w => w.id === data.workerId);
    order.workerName = worker?.name;
    if (data.workerId && order.status === 'queued') {
      order.status = 'washing';
      order.currentStep = 'rinsing';
    }
  }

  if (data.currentStep) {
    order.currentStep = data.currentStep;
    if (data.currentStep === 'done') {
      order.status = 'done';
      order.completedAt = new Date().toISOString();
    }
  }

  if (data.status) {
    order.status = data.status;
    if (data.status === 'done') {
      order.currentStep = 'done';
      order.completedAt = new Date().toISOString();
    }
  }

  setDB(db);
  return order;
}

export function addAddon(orderId: string, req: AddAddonRequest): Addon | null {
  const db = getDB();
  const order = db.orders.find(o => o.id === orderId);
  if (!order) return null;

  const addon: Addon = {
    id: genId('a'),
    orderId,
    name: req.name,
    price: req.price,
    originalPrice: req.originalPrice,
    priceAdjustReason: req.priceAdjustReason,
    paid: false,
    createdAt: new Date().toISOString(),
  };

  order.addons.push(addon);
  if (order.currentStep !== 'done' && order.currentStep !== 'addon') {
    order.currentStep = 'addon';
  }
  setDB(db);
  return addon;
}

export function markAddonPaid(orderId: string, addonId: string): Addon | null {
  const db = getDB();
  const order = db.orders.find(o => o.id === orderId);
  if (!order) return null;
  const addon = order.addons.find(a => a.id === addonId);
  if (!addon) return null;
  addon.paid = true;
  setDB(db);
  return addon;
}

export function hasUnpaidAddons(orderId: string): boolean {
  const order = getOrderById(orderId);
  if (!order) return false;
  return order.addons.some(a => !a.paid);
}

export function cancelOrder(id: string, req: CancelOrderRequest): Order | null {
  const db = getDB();
  const order = db.orders.find(o => o.id === id);
  if (!order) return null;

  order.status = 'cancelled';
  order.cancelledAt = new Date().toISOString();
  order.cancelReason = req.cancelReason;
  order.cancelledBy = req.cancelledBy;

  if (order.payType === 'member' && order.packageId && order.packageDeducted > 0) {
    refundPackageTimes(order.packageId, order.packageDeducted);
  }

  setDB(db);
  return order;
}
