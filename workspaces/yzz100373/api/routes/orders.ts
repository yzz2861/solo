import { Router } from 'express';
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  addAddon,
  markAddonPaid,
  hasUnpaidAddons,
  cancelOrder,
} from '../services/orderService';
import type { CreateOrderRequest, AddAddonRequest, CancelOrderRequest, OrderStatus } from '../../shared/types';

const router = Router();

router.get('/', (req, res) => {
  const dateStr = typeof req.query.date as string | undefined;
  const status = typeof req.query.status as OrderStatus | undefined;
  const date = dateStr ? new Date(dateStr) : undefined;
  res.json(getOrders(date, status));
});

router.get('/:id', (req, res) => {
  const order = getOrderById(req.params.id);
  if (!order) {
    res.status(404).json({ error: '订单不存在' });
    return;
  }
  res.json(order);
});

router.post('/', (req, res) => {
  const body = req.body as CreateOrderRequest;
  if (!body.plateNumber || !body.payType) {
    res.status(400).json({ error: '缺少必要信息：车牌号和支付方式' });
    return;
  }
  if (body.payType === 'member' && (!body.memberId || !body.packageId)) {
    res.status(400).json({ error: '会员支付需指定会员和套餐' });
    return;
  }
  if (body.payType === 'cash' && !body.cashAmount) {
    res.status(400).json({ error: '现金支付需指定金额' });
    return;
  }
  const result = createOrder(body);
  if ('error' in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.status(201).json(result);
});

router.patch('/:id', (req, res) => {
  const order = updateOrder(req.params.id, req.body);
  if (!order) {
    res.status(404).json({ error: '订单不存在' });
    return;
  }
  res.json(order);
});

router.post('/:id/addons', (req, res) => {
  const body = req.body as AddAddonRequest;
  if (!body.name || body.price === undefined || body.originalPrice === undefined) {
    res.status(400).json({ error: '加项信息不全' });
    return;
  }
  const addon = addAddon(req.params.id, body);
  if (!addon) {
    res.status(404).json({ error: '订单不存在' });
    return;
  }
  res.status(201).json(addon);
});

router.patch('/:id/addons/:addonId/paid', (req, res) => {
  const addon = markAddonPaid(req.params.id, req.params.addonId);
  if (!addon) {
    res.status(404).json({ error: '订单或加项不存在' });
    return;
  }
  res.json(addon);
});

router.get('/:id/unpaid-check', (req, res) => {
  res.json({ hasUnpaid: hasUnpaidAddons(req.params.id) });
});

router.post('/:id/cancel', (req, res) => {
  const body = req.body as CancelOrderRequest;
  if (!body.cancelReason || !body.cancelledBy) {
    res.status(400).json({ error: '撤销原因和操作人必填' });
    return;
  }
  const order = cancelOrder(req.params.id, body);
  if (!order) {
    res.status(404).json({ error: '订单不存在' });
    return;
  }
  res.json(order);
});

export default router;
