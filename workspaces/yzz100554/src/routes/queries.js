const express = require('express');
const moment = require('moment');
const { run, get, all } = require('../config/database');
const { authenticate, requireBoss, requireBossOrClerk } = require('../middleware/auth');
const { round2, formatDate } = require('../utils/helpers');

const router = express.Router();

router.get('/farmer/:farmerId/ledger', authenticate, requireBoss, async (req, res) => {
  const { farmerId } = req.params;
  const { season_id, start_date, end_date } = req.query;
  
  const farmer = await get('SELECT * FROM farmers WHERE id = ?', [farmerId]);
  if (!farmer) {
    return res.status(404).json({ message: '农户不存在' });
  }
  
  let orderWhere = 'so.farmer_id = ? AND so.status != ?';
  let orderParams = [farmerId, 'voided'];
  
  if (season_id) {
    orderWhere += ' AND so.season_id = ?';
    orderParams.push(parseInt(season_id));
  }
  
  if (start_date) {
    orderWhere += ' AND so.sale_date >= ?';
    orderParams.push(start_date);
  }
  
  if (end_date) {
    orderWhere += ' AND so.sale_date <= ?';
    orderParams.push(end_date);
  }
  
  const orders = await all(`
    SELECT so.*, s.name as season_name, s.due_date as season_due_date,
           u.name as creator_name, su.name as settler_name
    FROM sales_orders so
    LEFT JOIN seasons s ON so.season_id = s.id
    LEFT JOIN users u ON so.created_by = u.id
    LEFT JOIN users su ON so.settled_by = su.id
    WHERE ${orderWhere}
    ORDER BY so.sale_date DESC
  `, orderParams);
  
  const orderIds = orders.map(o => o.id);
  
  let orderItems = [];
  let repayments = [];
  let returns = [];
  
  if (orderIds.length > 0) {
    const placeholders = orderIds.map(() => '?').join(',');
    
    orderItems = await all(`
      SELECT soi.*, p.name as product_name, p.category as product_category, p.unit as product_unit
      FROM sales_order_items soi
      LEFT JOIN products p ON soi.product_id = p.id
      WHERE soi.sales_order_id IN (${placeholders})
      ORDER BY soi.sales_order_id, soi.id
    `, orderIds);
    
    repayments = await all(`
      SELECT r.*, u.name as creator_name
      FROM repayments r
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.farmer_id = ?
      ORDER BY r.repayment_date DESC, r.created_at DESC
    `, [farmerId]);
    
    returns = await all(`
      SELECT rt.*, p.name as product_name, u.name as creator_name
      FROM returns rt
      LEFT JOIN sales_orders so ON rt.sales_order_id = so.id
      LEFT JOIN products p ON rt.product_id = p.id
      LEFT JOIN users u ON rt.created_by = u.id
      WHERE so.farmer_id = ?
      ORDER BY rt.return_date DESC, rt.created_at DESC
    `, [farmerId]);
  }
  
  const ordersWithDetails = orders.map(order => ({
    ...order,
    items: orderItems.filter(item => item.sales_order_id === order.id),
    repayments: repayments.filter(r => r.sales_order_id === order.id),
    returns: returns.filter(r => r.sales_order_id === order.id)
  }));
  
  const totals = {
    total_orders: orders.length,
    pending_orders: orders.filter(o => o.status === 'pending').length,
    settled_orders: orders.filter(o => o.status === 'settled').length,
    total_amount: round2(orders.reduce((sum, o) => sum + o.total_amount, 0)),
    total_paid: round2(orders.reduce((sum, o) => sum + o.paid_amount, 0)),
    total_returned: round2(orders.reduce((sum, o) => sum + o.returned_amount, 0)),
    total_balance: round2(orders.reduce((sum, o) => sum + o.balance, 0))
  };
  
  res.json({
    data: {
      farmer,
      orders: ordersWithDetails,
      repayments,
      returns,
      totals
    }
  });
});

router.get('/farmer/:farmerId/transactions', authenticate, requireBoss, async (req, res) => {
  const { farmerId } = req.params;
  const { start_date, end_date } = req.query;
  
  const farmer = await get('SELECT * FROM farmers WHERE id = ?', [farmerId]);
  if (!farmer) {
    return res.status(404).json({ message: '农户不存在' });
  }
  
  let transactions = [];
  
  let orderWhere = 'so.farmer_id = ? AND so.status != ?';
  let orderParams = [farmerId, 'voided'];
  
  if (start_date) {
    orderWhere += ' AND so.sale_date >= ?';
    orderParams.push(start_date);
  }
  if (end_date) {
    orderWhere += ' AND so.sale_date <= ?';
    orderParams.push(end_date);
  }
  
  const orders = await all(`
    SELECT so.*, s.name as season_name, u.name as creator_name
    FROM sales_orders so
    LEFT JOIN seasons s ON so.season_id = s.id
    LEFT JOIN users u ON so.created_by = u.id
    WHERE ${orderWhere}
  `, orderParams);
  
  orders.forEach(order => {
    transactions.push({
      id: `order_${order.id}`,
      type: 'sale',
      type_name: '赊销',
      date: order.sale_date,
      amount: order.total_amount,
      balance_effect: order.total_amount,
      order_no: order.order_no,
      season_name: order.season_name,
      remark: order.remark,
      created_by: order.creator_name,
      created_at: order.created_at
    });
  });
  
  let repaymentWhere = 'r.farmer_id = ?';
  let repaymentParams = [farmerId];
  
  if (start_date) {
    repaymentWhere += ' AND r.repayment_date >= ?';
    repaymentParams.push(start_date);
  }
  if (end_date) {
    repaymentWhere += ' AND r.repayment_date <= ?';
    repaymentParams.push(end_date);
  }
  
  const repayments = await all(`
    SELECT r.*, so.order_no, u.name as creator_name
    FROM repayments r
    LEFT JOIN sales_orders so ON r.sales_order_id = so.id
    LEFT JOIN users u ON r.created_by = u.id
    WHERE ${repaymentWhere}
  `, repaymentParams);
  
  repayments.forEach(r => {
    transactions.push({
      id: `repayment_${r.id}`,
      type: 'repayment',
      type_name: '还款',
      date: r.repayment_date,
      amount: r.amount,
      balance_effect: -r.amount,
      order_no: r.order_no,
      repayment_no: r.repayment_no,
      payment_method: r.payment_method,
      remark: r.remark,
      created_by: r.creator_name,
      created_at: r.created_at
    });
  });
  
  let returnWhere = 'so.farmer_id = ?';
  let returnParams = [farmerId];
  
  if (start_date) {
    returnWhere += ' AND rt.return_date >= ?';
    returnParams.push(start_date);
  }
  if (end_date) {
    returnWhere += ' AND rt.return_date <= ?';
    returnParams.push(end_date);
  }
  
  const returns = await all(`
    SELECT rt.*, so.order_no, p.name as product_name, u.name as creator_name
    FROM returns rt
    LEFT JOIN sales_orders so ON rt.sales_order_id = so.id
    LEFT JOIN products p ON rt.product_id = p.id
    LEFT JOIN users u ON rt.created_by = u.id
    WHERE ${returnWhere}
  `, returnParams);
  
  returns.forEach(rt => {
    transactions.push({
      id: `return_${rt.id}`,
      type: 'return',
      type_name: '退货',
      date: rt.return_date,
      amount: rt.amount,
      balance_effect: -rt.amount,
      order_no: rt.order_no,
      return_no: rt.return_no,
      product_name: rt.product_name,
      quantity: rt.quantity,
      reason: rt.reason,
      remark: rt.remark,
      created_by: rt.creator_name,
      created_at: rt.created_at
    });
  });
  
  transactions.sort((a, b) => {
    const dateCompare = new Date(b.date) - new Date(a.date);
    if (dateCompare !== 0) return dateCompare;
    return new Date(b.created_at) - new Date(a.created_at);
  });
  
  let runningBalance = 0;
  const transactionsWithBalance = transactions.map(t => {
    runningBalance = round2(runningBalance + t.balance_effect);
    return {
      ...t,
      running_balance: runningBalance
    };
  }).reverse();
  
  res.json({
    data: {
      farmer,
      transactions: transactionsWithBalance.reverse(),
      current_balance: runningBalance
    }
  });
});

router.get('/today/collections', authenticate, requireBossOrClerk, async (req, res) => {
  const todayStr = moment().format('YYYY-MM-DD');
  
  let whereClause = 'r.repayment_date = ?';
  const params = [todayStr];
  
  if (req.user.role === 'clerk') {
    whereClause += ' AND r.created_by = ?';
    params.push(req.user.id);
  }
  
  const repayments = await all(`
    SELECT r.*, f.name as farmer_name, f.phone as farmer_phone,
           so.order_no, u.name as creator_name
    FROM repayments r
    LEFT JOIN farmers f ON r.farmer_id = f.id
    LEFT JOIN sales_orders so ON r.sales_order_id = so.id
    LEFT JOIN users u ON r.created_by = u.id
    WHERE ${whereClause}
    ORDER BY r.created_at DESC
  `, params);
  
  const totalByMethod = await all(`
    SELECT payment_method, COUNT(*) as count, SUM(amount) as total
    FROM repayments r
    WHERE ${whereClause}
    GROUP BY payment_method
    ORDER BY total DESC
  `, params);
  
  const { total_amount } = await get(`
    SELECT COALESCE(SUM(amount), 0) as total_amount FROM repayments r WHERE ${whereClause}
  `, params);
  
  const byCreator = await all(`
    SELECT u.id, u.name, COUNT(*) as count, SUM(r.amount) as total
    FROM repayments r
    LEFT JOIN users u ON r.created_by = u.id
    WHERE ${whereClause}
    GROUP BY u.id, u.name
    ORDER BY total DESC
  `, params);
  
  res.json({
    data: repayments,
    summary: {
      date: todayStr,
      total_count: repayments.length,
      total_amount: round2(total_amount),
      by_payment_method: totalByMethod.map(m => ({
        method: m.payment_method || '未指定',
        count: m.count,
        amount: round2(m.total)
      })),
      by_creator: byCreator.map(c => ({
        creator_id: c.id,
        creator_name: c.name,
        count: c.count,
        amount: round2(c.total)
      }))
    }
  });
});

router.get('/farmer/autocomplete', authenticate, requireBossOrClerk, async (req, res) => {
  const { q, limit = 20 } = req.query;
  
  if (!q || q.length < 1) {
    return res.json({ data: [] });
  }
  
  const farmers = await all(`
    SELECT id, name, phone, village, address
    FROM farmers
    WHERE name LIKE ? OR phone LIKE ? OR village LIKE ?
    ORDER BY name
    LIMIT ?
  `, [`%${q}%`, `%${q}%`, `%${q}%`, parseInt(limit)]);
  
  res.json({ data: farmers });
});

module.exports = router;
