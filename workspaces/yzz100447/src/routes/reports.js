const express = require('express');
const db = require('../db/database');
const { success, error: resError } = require('../utils/response');
const { getCustomerDepositBalance } = require('../utils/deposit');

const router = express.Router();

router.get('/customer-history/:customerId', (req, res) => {
  const customerId = req.params.customerId;

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
  if (!customer) {
    return resError(res, '客户不存在', 404, 404);
  }

  const deliveryOrders = db.prepare(`
    SELECT do.*,
           cy.cylinder_no, cy.specification,
           dp.name as delivery_person_name
    FROM delivery_orders do
    LEFT JOIN cylinders cy ON do.cylinder_id = cy.id
    LEFT JOIN delivery_persons dp ON do.delivery_person_id = dp.id
    WHERE do.customer_id = ?
    ORDER BY do.created_at DESC
  `).all(customerId);

  const returnOrders = db.prepare(`
    SELECT ro.*,
           cy.cylinder_no, cy.specification,
           do.order_no
    FROM return_orders ro
    LEFT JOIN cylinders cy ON ro.cylinder_id = cy.id
    LEFT JOIN delivery_orders do ON ro.delivery_order_id = do.id
    WHERE ro.customer_id = ?
    ORDER BY ro.created_at DESC
  `).all(customerId);

  const inspections = db.prepare(`
    SELECT i.*,
           cy.cylinder_no
    FROM inspections i
    LEFT JOIN cylinders cy ON i.cylinder_id = cy.id
    WHERE i.customer_id = ?
    ORDER BY i.inspection_date DESC
  `).all(customerId);

  const currentCylinders = db.prepare(`
    SELECT cy.*
    FROM cylinders cy
    WHERE cy.current_customer_id = ?
    ORDER BY cy.id DESC
  `).all(customerId);

  const depositBalance = getCustomerDepositBalance(customerId);

  success(res, {
    customer,
    deposit_balance: depositBalance,
    current_cylinders: currentCylinders,
    delivery_orders: deliveryOrders,
    return_orders: returnOrders,
    inspections: inspections
  });
});

router.get('/today-route/:deliveryPersonId', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const deliveryPersonId = req.params.deliveryPersonId;
  const routeDate = req.query.date || today;

  const dp = db.prepare('SELECT * FROM delivery_persons WHERE id = ?').get(deliveryPersonId);
  if (!dp) {
    return resError(res, '配送员不存在', 404, 404);
  }

  const pendingDeliveries = db.prepare(`
    SELECT do.*,
           c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
           cy.cylinder_no, cy.specification
    FROM delivery_orders do
    LEFT JOIN customers c ON do.customer_id = c.id
    LEFT JOIN cylinders cy ON do.cylinder_id = cy.id
    WHERE do.delivery_person_id = ?
      AND date(do.route_date) = date(?)
      AND do.status = 'pending'
    ORDER BY do.created_at ASC
  `).all(deliveryPersonId, routeDate);

  const deliveredToday = db.prepare(`
    SELECT do.*,
           c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
           cy.cylinder_no, cy.specification
    FROM delivery_orders do
    LEFT JOIN customers c ON do.customer_id = c.id
    LEFT JOIN cylinders cy ON do.cylinder_id = cy.id
    WHERE do.delivery_person_id = ?
      AND date(do.delivery_time) = date(?)
      AND do.status = 'delivered'
    ORDER BY do.delivery_time DESC
  `).all(deliveryPersonId, routeDate);

  const pendingReturns = db.prepare(`
    SELECT ro.*,
           c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
           cy.cylinder_no, cy.specification,
           do.order_no, do.deposit_amount, do.delivery_time
    FROM return_orders ro
    LEFT JOIN customers c ON ro.customer_id = c.id
    LEFT JOIN cylinders cy ON ro.cylinder_id = cy.id
    LEFT JOIN delivery_orders do ON ro.delivery_order_id = do.id
    WHERE do.delivery_person_id = ?
      AND ro.status = 'pending'
    ORDER BY ro.created_at ASC
  `).all(deliveryPersonId);

  success(res, {
    date: routeDate,
    delivery_person: dp,
    pending_deliveries: pendingDeliveries,
    delivered_today: deliveredToday,
    pending_returns: pendingReturns,
    stats: {
      pending_delivery_count: pendingDeliveries.length,
      delivered_count: deliveredToday.length,
      pending_return_count: pendingReturns.length
    }
  });
});

router.get('/pending-returns-by-route/:deliveryPersonId', (req, res) => {
  const deliveryPersonId = req.params.deliveryPersonId;

  const dp = db.prepare('SELECT * FROM delivery_persons WHERE id = ?').get(deliveryPersonId);
  if (!dp) {
    return resError(res, '配送员不存在', 404, 404);
  }

  const pendingReturns = db.prepare(`
    SELECT ro.*,
           c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
           cy.cylinder_no, cy.specification,
           do.order_no, do.deposit_amount, do.delivery_time, do.route_date
    FROM return_orders ro
    LEFT JOIN customers c ON ro.customer_id = c.id
    LEFT JOIN cylinders cy ON ro.cylinder_id = cy.id
    LEFT JOIN delivery_orders do ON ro.delivery_order_id = do.id
    WHERE do.delivery_person_id = ?
      AND ro.status = 'pending'
    ORDER BY do.route_date ASC, ro.created_at ASC
  `).all(deliveryPersonId);

  const customerCylindersToReturn = db.prepare(`
    SELECT cy.*,
           c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
           do.id as delivery_order_id, do.order_no, do.deposit_amount, do.delivery_time,
           do.route_date, do.delivery_person_id, dp.name as delivery_person_name
    FROM cylinders cy
    LEFT JOIN customers c ON cy.current_customer_id = c.id
    LEFT JOIN delivery_orders do ON do.cylinder_id = cy.id AND do.status = 'delivered'
    LEFT JOIN delivery_persons dp ON do.delivery_person_id = dp.id
    WHERE cy.status = 'in_use'
      AND do.delivery_person_id = ?
      AND NOT EXISTS (
        SELECT 1 FROM return_orders ro
        WHERE ro.delivery_order_id = do.id AND ro.status != 'cancelled'
      )
    ORDER BY do.route_date ASC, do.delivery_time ASC
  `).all(deliveryPersonId);

  success(res, {
    delivery_person: dp,
    pending_return_orders: pendingReturns,
    customer_cylinders_to_return: customerCylindersToReturn,
    total_count: customerCylindersToReturn.length
  });
});

router.get('/overdue-cylinders', (req, res) => {
  const { days = 30, page = 1, pageSize = 50 } = req.query;
  const offset = (page - 1) * pageSize;

  const total = db.prepare(`
    SELECT COUNT(*) as count
    FROM cylinders cy
    JOIN delivery_orders do ON do.cylinder_id = cy.id AND do.status = 'delivered'
    LEFT JOIN return_orders ro ON ro.delivery_order_id = do.id
    WHERE cy.status = 'in_use'
      AND ro.id IS NULL
      AND julianday('now') - julianday(do.delivery_time) > ?
  `).get(Number(days)).count;

  const list = db.prepare(`
    SELECT cy.*,
           c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
           do.id as delivery_order_id, do.order_no, do.deposit_amount, do.delivery_time,
           julianday('now') - julianday(do.delivery_time) as days_overdue,
           dp.name as delivery_person_name, dp.employee_no
    FROM cylinders cy
    JOIN delivery_orders do ON do.cylinder_id = cy.id AND do.status = 'delivered'
    LEFT JOIN return_orders ro ON ro.delivery_order_id = do.id
    LEFT JOIN customers c ON cy.current_customer_id = c.id
    LEFT JOIN delivery_persons dp ON do.delivery_person_id = dp.id
    WHERE cy.status = 'in_use'
      AND ro.id IS NULL
      AND julianday('now') - julianday(do.delivery_time) > ?
    ORDER BY days_overdue DESC
    LIMIT ? OFFSET ?
  `).all(Number(days), Number(pageSize), offset);

  success(res, {
    list,
    total,
    page: Number(page),
    pageSize: Number(pageSize),
    days_threshold: Number(days)
  });
});

router.get('/deposit-discrepancies', (req, res) => {
  const { page = 1, pageSize = 50 } = req.query;
  const offset = (page - 1) * pageSize;

  const customers = db.prepare(`
    SELECT c.*,
           (SELECT COALESCE(SUM(CASE WHEN dl.type IN ('collect', 'adjust_increase') THEN dl.amount ELSE 0 END), 0)
              - COALESCE(SUM(CASE WHEN dl.type IN ('refund', 'adjust_decrease') THEN dl.amount ELSE 0 END), 0)
            FROM deposit_ledger dl WHERE dl.customer_id = c.id) as ledger_balance,
           (SELECT COUNT(*) FROM cylinders cy WHERE cy.current_customer_id = c.id AND cy.status = 'in_use') as in_use_cylinder_count,
           (SELECT COALESCE(SUM(do.deposit_amount), 0)
            FROM cylinders cy
            JOIN delivery_orders do ON do.cylinder_id = cy.id
            WHERE cy.current_customer_id = c.id
              AND cy.status = 'in_use'
              AND do.id = (
                SELECT do2.id FROM delivery_orders do2
                WHERE do2.cylinder_id = cy.id
                  AND do2.status IN ('pending', 'delivered')
                ORDER BY do2.id DESC LIMIT 1
              )) as expected_deposit
    FROM customers c
    ORDER BY c.id
  `).all();

  const discrepancies = customers.map(c => {
    const diff = c.ledger_balance - c.expected_deposit;
    return {
      ...c,
      ledger_balance: c.ledger_balance,
      difference: diff,
      has_discrepancy: Math.abs(diff) > 0.01
    };
  }).filter(c => c.has_discrepancy);

  const total = discrepancies.length;
  const list = discrepancies.slice(offset, offset + Number(pageSize));

  const totalDiscrepancyAmount = discrepancies.reduce((sum, d) => sum + Math.abs(d.difference), 0);

  success(res, {
    list,
    total,
    page: Number(page),
    pageSize: Number(pageSize),
    total_discrepancy_count: total,
    total_discrepancy_amount: totalDiscrepancyAmount
  });
});

router.get('/inspection-issues', (req, res) => {
  const { page = 1, pageSize = 50, status = 'fail' } = req.query;
  const offset = (page - 1) * pageSize;

  let whereSql = 'WHERE i.result = ?';
  let params = [status];

  const total = db.prepare(`
    SELECT COUNT(*) as count
    FROM inspections i
    ${whereSql}
  `).get(...params).count;

  const list = db.prepare(`
    SELECT i.*,
           c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
           c.inspection_status as current_status,
           cy.cylinder_no, cy.specification
    FROM inspections i
    LEFT JOIN customers c ON i.customer_id = c.id
    LEFT JOIN cylinders cy ON i.cylinder_id = cy.id
    ${whereSql}
    ORDER BY i.inspection_date DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);

  const failCustomers = db.prepare(`
    SELECT c.*,
           (SELECT i.issues FROM inspections i
            WHERE i.customer_id = c.id AND i.result = 'fail'
            ORDER BY i.inspection_date DESC LIMIT 1) as latest_issues,
           (SELECT i.inspection_date FROM inspections i
            WHERE i.customer_id = c.id AND i.result = 'fail'
            ORDER BY i.inspection_date DESC LIMIT 1) as latest_fail_date
    FROM customers c
    WHERE c.inspection_status = 'fail'
    ORDER BY c.id
  `).all();

  success(res, {
    list,
    total,
    page: Number(page),
    pageSize: Number(pageSize),
    fail_customers: failCustomers,
    fail_customer_count: failCustomers.length
  });
});

router.get('/overview', (req, res) => {
  const totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
  const totalCylinders = db.prepare('SELECT COUNT(*) as count FROM cylinders').get().count;
  const inUseCylinders = db.prepare("SELECT COUNT(*) as count FROM cylinders WHERE status = 'in_use'").get().count;
  const emptyCylinders = db.prepare("SELECT COUNT(*) as count FROM cylinders WHERE status = 'empty'").get().count;
  const filledCylinders = db.prepare("SELECT COUNT(*) as count FROM cylinders WHERE status = 'filled'").get().count;
  const repairingCylinders = db.prepare("SELECT COUNT(*) as count FROM cylinders WHERE status = 'repairing'").get().count;
  const failCustomersCount = db.prepare("SELECT COUNT(*) as count FROM customers WHERE inspection_status = 'fail'").get().count;

  const totalDeposit = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN type IN ('collect', 'adjust_increase') THEN amount ELSE 0 END), 0) -
           COALESCE(SUM(CASE WHEN type IN ('refund', 'adjust_decrease') THEN amount ELSE 0 END), 0) as total
    FROM deposit_ledger
  `).get().total;

  const today = new Date().toISOString().split('T')[0];
  const todayDeliveries = db.prepare(`
    SELECT COUNT(*) as count FROM delivery_orders
    WHERE date(created_at) = date(?)
  `).get(today).count;

  const todayReturns = db.prepare(`
    SELECT COUNT(*) as count FROM return_orders
    WHERE date(created_at) = date(?)
  `).get(today).count;

  success(res, {
    total_customers: totalCustomers,
    total_cylinders: totalCylinders,
    in_use_cylinders: inUseCylinders,
    empty_cylinders: emptyCylinders,
    filled_cylinders: filledCylinders,
    repairing_cylinders: repairingCylinders,
    fail_customers: failCustomersCount,
    total_deposit_balance: totalDeposit || 0,
    today_deliveries: todayDeliveries,
    today_returns: todayReturns
  });
});

module.exports = router;
