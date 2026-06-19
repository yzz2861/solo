const express = require('express');
const moment = require('moment');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');
const { run, get, all } = require('../config/database');
const { authenticate, requireBoss } = require('../middleware/auth');
const { getMonthRange, round2, isOverdue } = require('../utils/helpers');

const router = express.Router();

const ensureExportDir = () => {
  const exportDir = path.resolve('./exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  return exportDir;
};

router.get('/outstanding', authenticate, requireBoss, async (req, res) => {
  const { season_id, village, as_of } = req.query;
  const asOfDate = as_of || moment().format('YYYY-MM-DD');
  
  let whereClause = 'so.status = ? AND so.balance > 0';
  let params = ['pending'];
  
  if (season_id) {
    whereClause += ' AND so.season_id = ?';
    params.push(parseInt(season_id));
  }
  
  if (village) {
    whereClause += ' AND f.village LIKE ?';
    params.push(`%${village}%`);
  }
  
  const orders = await all(`
    SELECT so.*, f.name as farmer_name, f.phone as farmer_phone, 
           f.village, f.address,
           s.name as season_name, s.due_date as season_due_date,
           s.crop_type,
           u.name as creator_name
    FROM sales_orders so
    LEFT JOIN farmers f ON so.farmer_id = f.id
    LEFT JOIN seasons s ON so.season_id = s.id
    LEFT JOIN users u ON so.created_by = u.id
    WHERE ${whereClause}
    ORDER BY f.village, f.name, so.sale_date
  `, params);
  
  const ordersWithOverdue = orders.map(order => ({
    ...order,
    is_overdue: order.season_due_date ? isOverdue(order.season_due_date) : false,
    due_date: order.season_due_date,
    days_overdue: order.season_due_date ? moment(asOfDate).diff(moment(order.season_due_date), 'days') : 0
  }));
  
  const summary = {
    as_of_date: asOfDate,
    total_orders: ordersWithOverdue.length,
    total_balance: round2(ordersWithOverdue.reduce((sum, o) => sum + o.balance, 0)),
    total_amount: round2(ordersWithOverdue.reduce((sum, o) => sum + o.total_amount, 0)),
    total_paid: round2(ordersWithOverdue.reduce((sum, o) => sum + o.paid_amount, 0)),
    total_returned: round2(ordersWithOverdue.reduce((sum, o) => sum + o.returned_amount, 0)),
    overdue_orders: ordersWithOverdue.filter(o => o.is_overdue).length,
    overdue_amount: round2(ordersWithOverdue.filter(o => o.is_overdue).reduce((sum, o) => sum + o.balance, 0))
  };
  
  const byVillageParams = ['pending'];
  if (season_id) byVillageParams.push(parseInt(season_id));
  
  const byVillage = await all(`
    SELECT f.village, 
           COUNT(*) as order_count,
           SUM(so.balance) as total_balance
    FROM sales_orders so
    LEFT JOIN farmers f ON so.farmer_id = f.id
    WHERE so.status = ? AND so.balance > 0
    ${season_id ? 'AND so.season_id = ?' : ''}
    GROUP BY f.village
    ORDER BY f.village
  `, byVillageParams);
  
  const byFarmerParams = ['pending'];
  if (season_id) byFarmerParams.push(parseInt(season_id));
  
  const byFarmer = await all(`
    SELECT f.id, f.name, f.phone, f.village,
           COUNT(*) as order_count,
           SUM(so.balance) as total_balance,
           SUM(so.total_amount) as total_amount
    FROM sales_orders so
    LEFT JOIN farmers f ON so.farmer_id = f.id
    WHERE so.status = ? AND so.balance > 0
    ${season_id ? 'AND so.season_id = ?' : ''}
    GROUP BY f.id, f.name, f.phone, f.village
    ORDER BY total_balance DESC
  `, byFarmerParams);
  
  res.json({
    data: ordersWithOverdue,
    summary,
    by_village: byVillage.map(v => ({
      village: v.village || '未分组',
      order_count: v.order_count,
      total_balance: round2(v.total_balance)
    })),
    by_farmer: byFarmer.map(f => ({
      ...f,
      total_balance: round2(f.total_balance),
      total_amount: round2(f.total_amount)
    }))
  });
});

router.get('/overdue', authenticate, requireBoss, async (req, res) => {
  const { season_id, village, as_of } = req.query;
  const asOfDate = as_of || moment().format('YYYY-MM-DD');
  
  let whereClause = `so.status = ? AND so.balance > 0 AND s.due_date < ?`;
  let params = ['pending', asOfDate];
  
  if (season_id) {
    whereClause += ' AND so.season_id = ?';
    params.push(parseInt(season_id));
  }
  
  if (village) {
    whereClause += ' AND f.village LIKE ?';
    params.push(`%${village}%`);
  }
  
  const orders = await all(`
    SELECT so.*, f.name as farmer_name, f.phone as farmer_phone, 
           f.village, f.address,
           s.name as season_name, s.due_date as season_due_date,
           s.crop_type,
           u.name as creator_name
    FROM sales_orders so
    LEFT JOIN farmers f ON so.farmer_id = f.id
    LEFT JOIN seasons s ON so.season_id = s.id
    LEFT JOIN users u ON so.created_by = u.id
    WHERE ${whereClause}
    ORDER BY s.due_date, f.name
  `, params);
  
  const ordersWithDetails = orders.map(order => ({
    ...order,
    days_overdue: moment(asOfDate).diff(moment(order.season_due_date), 'days'),
    overdue_level: (() => {
      const days = moment(asOfDate).diff(moment(order.season_due_date), 'days');
      if (days >= 90) return '严重逾期';
      if (days >= 60) return '中度逾期';
      if (days >= 30) return '轻度逾期';
      return '已逾期';
    })()
  }));
  
  const summary = {
    as_of_date: asOfDate,
    total_overdue_orders: ordersWithDetails.length,
    total_overdue_amount: round2(ordersWithDetails.reduce((sum, o) => sum + o.balance, 0)),
    by_level: {
      severe: ordersWithDetails.filter(o => o.days_overdue >= 90).length,
      severe_amount: round2(ordersWithDetails.filter(o => o.days_overdue >= 90).reduce((sum, o) => sum + o.balance, 0)),
      moderate: ordersWithDetails.filter(o => o.days_overdue >= 60 && o.days_overdue < 90).length,
      moderate_amount: round2(ordersWithDetails.filter(o => o.days_overdue >= 60 && o.days_overdue < 90).reduce((sum, o) => sum + o.balance, 0)),
      mild: ordersWithDetails.filter(o => o.days_overdue >= 30 && o.days_overdue < 60).length,
      mild_amount: round2(ordersWithDetails.filter(o => o.days_overdue >= 30 && o.days_overdue < 60).reduce((sum, o) => sum + o.balance, 0)),
      recent: ordersWithDetails.filter(o => o.days_overdue < 30).length,
      recent_amount: round2(ordersWithDetails.filter(o => o.days_overdue < 30).reduce((sum, o) => sum + o.balance, 0))
    }
  };
  
  res.json({
    data: ordersWithDetails,
    summary
  });
});

router.get('/settled', authenticate, requireBoss, async (req, res) => {
  const { year, month, season_id, farmer_id } = req.query;
  
  let whereClause = 'so.status = ?';
  let params = ['settled'];
  
  if (year && month) {
    const { start, end } = getMonthRange(parseInt(year), parseInt(month));
    whereClause += ' AND so.settled_at BETWEEN ? AND ?';
    params.push(start, end);
  }
  
  if (season_id) {
    whereClause += ' AND so.season_id = ?';
    params.push(parseInt(season_id));
  }
  
  if (farmer_id) {
    whereClause += ' AND so.farmer_id = ?';
    params.push(parseInt(farmer_id));
  }
  
  const orders = await all(`
    SELECT so.*, f.name as farmer_name, f.phone as farmer_phone,
           f.village,
           s.name as season_name, s.crop_type,
           u.name as creator_name, su.name as settler_name
    FROM sales_orders so
    LEFT JOIN farmers f ON so.farmer_id = f.id
    LEFT JOIN seasons s ON so.season_id = s.id
    LEFT JOIN users u ON so.created_by = u.id
    LEFT JOIN users su ON so.settled_by = su.id
    WHERE ${whereClause}
    ORDER BY so.settled_at DESC
  `, params);
  
  const summary = {
    total_settled: orders.length,
    total_amount: round2(orders.reduce((sum, o) => sum + o.total_amount, 0)),
    total_paid: round2(orders.reduce((sum, o) => sum + o.paid_amount, 0)),
    total_returned: round2(orders.reduce((sum, o) => sum + o.returned_amount, 0)),
    average_settle_days: round2(
      orders.reduce((sum, o) => {
        const days = moment(o.settled_at).diff(moment(o.sale_date), 'days');
        return sum + days;
      }, 0) / (orders.length || 1)
    )
  };
  
  res.json({
    data: orders,
    summary
  });
});

router.get('/export/outstanding', authenticate, requireBoss, async (req, res) => {
  const { season_id, village, format = 'csv' } = req.query;
  const exportDir = ensureExportDir();
  
  let whereClause = 'so.status = ? AND so.balance > 0';
  let params = ['pending'];
  
  if (season_id) {
    whereClause += ' AND so.season_id = ?';
    params.push(parseInt(season_id));
  }
  
  if (village) {
    whereClause += ' AND f.village LIKE ?';
    params.push(`%${village}%`);
  }
  
  const orders = await all(`
    SELECT so.order_no, so.sale_date, so.total_amount, so.paid_amount, 
           so.returned_amount, so.balance, so.remark,
           f.name as farmer_name, f.phone as farmer_phone, f.village, f.address,
           s.name as season_name, s.due_date as due_date, s.crop_type,
           u.name as creator_name
    FROM sales_orders so
    LEFT JOIN farmers f ON so.farmer_id = f.id
    LEFT JOIN seasons s ON so.season_id = s.id
    LEFT JOIN users u ON so.created_by = u.id
    WHERE ${whereClause}
    ORDER BY f.village, f.name, so.sale_date
  `, params);
  
  const asOfDate = moment().format('YYYY-MM-DD');
  const exportData = orders.map((o, idx) => ({
    序号: idx + 1,
    行政村: o.village || '',
    农户姓名: o.farmer_name,
    联系电话: o.farmer_phone || '',
    住址: o.address || '',
    作物季: o.season_name,
    作物类型: o.crop_type,
    单据编号: o.order_no,
    赊销日期: o.sale_date,
    到期日期: o.due_date || '',
    是否逾期: o.due_date && moment(o.due_date).isBefore(asOfDate) ? '是' : '否',
    逾期天数: o.due_date ? Math.max(0, moment(asOfDate).diff(moment(o.due_date), 'days')) : 0,
    赊销金额: o.total_amount,
    已还金额: o.paid_amount,
    退货金额: o.returned_amount,
    欠款金额: o.balance,
    备注: o.remark || '',
    经办人: o.creator_name
  }));
  
  const filename = `欠款明细表_${asOfDate}.csv`;
  const filepath = path.join(exportDir, filename);
  
  const csvWriter = createCsvWriter({
    path: filepath,
    header: Object.keys(exportData[0] || {}).map(key => ({ id: key, title: key }))
  });
  
  csvWriter.writeRecords(exportData)
    .then(() => {
      const totalBalance = round2(orders.reduce((sum, o) => sum + o.balance, 0));
      res.json({
        message: '欠款明细表导出成功',
        filename,
        filepath,
        download_url: `/api/reports/download/${filename}`,
        summary: {
          as_of_date: asOfDate,
          total_count: orders.length,
          total_balance: totalBalance
        }
      });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: '导出失败', error: err.message });
    });
});

router.get('/export/overdue', authenticate, requireBoss, async (req, res) => {
  const { season_id, village } = req.query;
  const exportDir = ensureExportDir();
  const asOfDate = moment().format('YYYY-MM-DD');
  
  let whereClause = `so.status = ? AND so.balance > 0 AND s.due_date < ?`;
  let params = ['pending', asOfDate];
  
  if (season_id) {
    whereClause += ' AND so.season_id = ?';
    params.push(parseInt(season_id));
  }
  
  if (village) {
    whereClause += ' AND f.village LIKE ?';
    params.push(`%${village}%`);
  }
  
  const orders = await all(`
    SELECT so.order_no, so.sale_date, so.total_amount, so.paid_amount, 
           so.returned_amount, so.balance, so.remark,
           f.name as farmer_name, f.phone as farmer_phone, f.village, f.address,
           s.name as season_name, s.due_date as due_date, s.crop_type,
           u.name as creator_name
    FROM sales_orders so
    LEFT JOIN farmers f ON so.farmer_id = f.id
    LEFT JOIN seasons s ON so.season_id = s.id
    LEFT JOIN users u ON so.created_by = u.id
    WHERE ${whereClause}
    ORDER BY s.due_date, f.name
  `, params);
  
  const exportData = orders.map((o, idx) => {
    const daysOverdue = moment(asOfDate).diff(moment(o.due_date), 'days');
    let level = '已逾期';
    if (daysOverdue >= 90) level = '严重逾期';
    else if (daysOverdue >= 60) level = '中度逾期';
    else if (daysOverdue >= 30) level = '轻度逾期';
    
    return {
      序号: idx + 1,
      行政村: o.village || '',
      农户姓名: o.farmer_name,
      联系电话: o.farmer_phone || '',
      住址: o.address || '',
      作物季: o.season_name,
      作物类型: o.crop_type,
      单据编号: o.order_no,
      赊销日期: o.sale_date,
      到期日期: o.due_date,
      逾期天数: daysOverdue,
      逾期等级: level,
      赊销金额: o.total_amount,
      已还金额: o.paid_amount,
      退货金额: o.returned_amount,
      欠款金额: o.balance,
      备注: o.remark || '',
      经办人: o.creator_name
    };
  });
  
  const filename = `逾期明细表_${asOfDate}.csv`;
  const filepath = path.join(exportDir, filename);
  
  const csvWriter = createCsvWriter({
    path: filepath,
    header: Object.keys(exportData[0] || {}).map(key => ({ id: key, title: key }))
  });
  
  csvWriter.writeRecords(exportData)
    .then(() => {
      const totalBalance = round2(orders.reduce((sum, o) => sum + o.balance, 0));
      res.json({
        message: '逾期明细表导出成功',
        filename,
        filepath,
        download_url: `/api/reports/download/${filename}`,
        summary: {
          as_of_date: asOfDate,
          total_count: orders.length,
          total_overdue_amount: totalBalance
        }
      });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: '导出失败', error: err.message });
    });
});

router.get('/export/settled', authenticate, requireBoss, async (req, res) => {
  const { year, month, season_id } = req.query;
  const exportDir = ensureExportDir();
  const asOfDate = moment().format('YYYY-MM-DD');
  
  let whereClause = 'so.status = ?';
  let params = ['settled'];
  
  if (year && month) {
    const { start, end } = getMonthRange(parseInt(year), parseInt(month));
    whereClause += ' AND so.settled_at BETWEEN ? AND ?';
    params.push(start, end);
  }
  
  if (season_id) {
    whereClause += ' AND so.season_id = ?';
    params.push(parseInt(season_id));
  }
  
  const orders = await all(`
    SELECT so.order_no, so.sale_date, so.settled_at,
           so.total_amount, so.paid_amount, so.returned_amount, so.balance, so.remark,
           f.name as farmer_name, f.phone as farmer_phone, f.village,
           s.name as season_name, s.crop_type,
           u.name as creator_name, su.name as settler_name
    FROM sales_orders so
    LEFT JOIN farmers f ON so.farmer_id = f.id
    LEFT JOIN seasons s ON so.season_id = s.id
    LEFT JOIN users u ON so.created_by = u.id
    LEFT JOIN users su ON so.settled_by = su.id
    WHERE ${whereClause}
    ORDER BY so.settled_at DESC
  `, params);
  
  const exportData = orders.map((o, idx) => {
    const settleDays = moment(o.settled_at).diff(moment(o.sale_date), 'days');
    return {
      序号: idx + 1,
      行政村: o.village || '',
      农户姓名: o.farmer_name,
      联系电话: o.farmer_phone || '',
      作物季: o.season_name,
      作物类型: o.crop_type,
      单据编号: o.order_no,
      赊销日期: o.sale_date,
      结清日期: o.settled_at,
      回款天数: settleDays,
      赊销金额: o.total_amount,
      已还金额: o.paid_amount,
      退货金额: o.returned_amount,
      最终余额: o.balance,
      核销人: o.settler_name,
      备注: o.remark || '',
      经办人: o.creator_name
    };
  });
  
  const period = year && month ? `${year}年${month}月` : '全部';
  const filename = `已核销明细表_${period}_${asOfDate}.csv`;
  const filepath = path.join(exportDir, filename);
  
  const csvWriter = createCsvWriter({
    path: filepath,
    header: Object.keys(exportData[0] || {}).map(key => ({ id: key, title: key }))
  });
  
  csvWriter.writeRecords(exportData)
    .then(() => {
      const totalAmount = round2(orders.reduce((sum, o) => sum + o.total_amount, 0));
      res.json({
        message: '已核销明细表导出成功',
        filename,
        filepath,
        download_url: `/api/reports/download/${filename}`,
        summary: {
          period,
          as_of_date: asOfDate,
          total_count: orders.length,
          total_amount: totalAmount
        }
      });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: '导出失败', error: err.message });
    });
});

router.get('/download/:filename', authenticate, requireBoss, (req, res) => {
  const exportDir = ensureExportDir();
  const filename = req.params.filename;
  const filepath = path.join(exportDir, filename);
  
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ message: '文件不存在' });
  }
  
  res.download(filepath, filename, (err) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: '下载失败' });
    }
  });
});

router.get('/monthly', authenticate, requireBoss, async (req, res) => {
  const { year, month } = req.query;
  const { start, end } = getMonthRange(parseInt(year), parseInt(month));
  
  const monthSales = await get(`
    SELECT 
      COUNT(*) as order_count,
      SUM(so.total_amount) as total_sales,
      SUM(so.balance) as total_balance
    FROM sales_orders so
    WHERE so.sale_date BETWEEN ? AND ?
  `, [start, end]);
  
  const monthRepayments = await get(`
    SELECT 
      COUNT(*) as repayment_count,
      SUM(amount) as total_repayment
    FROM repayments r
    WHERE r.repayment_date BETWEEN ? AND ?
  `, [start, end]);
  
  const monthReturns = await get(`
    SELECT 
      COUNT(*) as return_count,
      SUM(amount) as total_return
    FROM returns rt
    WHERE rt.return_date BETWEEN ? AND ?
  `, [start, end]);
  
  const outstanding = await get(`
    SELECT 
      COUNT(*) as outstanding_orders,
      SUM(so.balance) as outstanding_balance
    FROM sales_orders so
    WHERE so.status = 'pending' AND so.balance > 0
  `);
  
  const settled = await get(`
    SELECT 
      COUNT(*) as settled_orders,
      SUM(so.total_amount) as settled_amount
    FROM sales_orders so
    WHERE so.status = 'settled' AND so.settled_at BETWEEN ? AND ?
  `, [start, end]);
  
  res.json({
    data: {
      period: `${year}年${month}月`,
      sales: {
        order_count: monthSales.order_count || 0,
        total_sales: round2(monthSales.total_sales || 0)
      },
      repayments: {
        repayment_count: monthRepayments.repayment_count || 0,
        total_repayment: round2(monthRepayments.total_repayment || 0)
      },
      returns: {
        return_count: monthReturns.return_count || 0,
        total_return: round2(monthReturns.total_return || 0)
      },
      outstanding: {
        order_count: outstanding.outstanding_orders || 0,
        total_balance: round2(outstanding.outstanding_balance || 0)
      },
      settled: {
        order_count: settled.settled_orders || 0,
        total_amount: round2(settled.settled_amount || 0)
      }
    }
  });
});

module.exports = router;
