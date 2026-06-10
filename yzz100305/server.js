const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const cors = require('cors');
const path = require('path');
const { Readable } = require('stream');
const {
  initDB,
  computeFileHash,
  checkBatchExists,
  createBatch,
  insertOrders,
  insertReplacements,
  insertRefunds,
  getAggregatedOrders,
  getOrderByNo,
  updateReview,
  getBatches,
  getStatistics,
  getAllOrdersForExport,
  ensureReview
} = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.memoryStorage();
const upload = multer({ storage });

initDB();

function parseCSV(buffer) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer.toString('utf-8'));
    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

app.post('/api/import/orders', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' });
    }
    const fileHash = computeFileHash(req.file.buffer);
    const existing = checkBatchExists('order', fileHash);
    if (existing) {
      return res.json({
        success: false,
        message: `该文件已导入过（批次 #${existing.id}，${existing.record_count} 条记录），请勿重复导入`,
        duplicate: true,
        batch: existing
      });
    }

    const rows = await parseCSV(req.file.buffer);
    const orders = rows.map(row => {
      const get = (keys) => {
        for (const k of keys) {
          if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
        }
        return '';
      };
      return {
        order_no: get(['order_no', '订单号', '订单编号']),
        product_name: get(['product_name', '商品名称', '商品', '品名']),
        quantity: parseFloat(get(['quantity', '数量', '购买数量'])) || 0,
        price: parseFloat(get(['price', '单价', '价格'])) || 0,
        amount: parseFloat(get(['amount', '金额', '总价', '实付金额'])) || 0,
        order_date: get(['order_date', '下单时间', '下单日期', '日期'])
      };
    }).filter(o => o.order_no);

    const batchId = createBatch('order', fileHash, req.file.originalname, orders.length);
    insertOrders(orders, batchId);

    orders.forEach(o => ensureReview(o.order_no));

    res.json({
      success: true,
      message: `成功导入 ${orders.length} 条订单`,
      count: orders.length,
      batchId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/import/replacements', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' });
    }
    const fileHash = computeFileHash(req.file.buffer);
    const existing = checkBatchExists('replacement', fileHash);
    if (existing) {
      return res.json({
        success: false,
        message: `该文件已导入过（批次 #${existing.id}，${existing.record_count} 条记录），请勿重复导入`,
        duplicate: true,
        batch: existing
      });
    }

    let data;
    try {
      data = JSON.parse(req.file.buffer.toString('utf-8'));
    } catch (e) {
      return res.status(400).json({ error: 'JSON 格式解析失败: ' + e.message });
    }

    const list = Array.isArray(data) ? data : (data.list || data.data || []);
    const replacements = list.map(item => {
      const originalAmount = (item.original_price || 0) * (item.quantity || 0);
      const replacedAmount = (item.replaced_price || 0) * (item.quantity || 0);
      const amountDiff = item.amount_diff !== undefined ? item.amount_diff : (replacedAmount - originalAmount);
      return {
        order_no: item.order_no || item.订单号 || '',
        original_product: item.original_product || item.原商品 || '',
        replaced_product: item.replaced_product || item.替换商品 || '',
        quantity: parseFloat(item.quantity || item.数量) || 0,
        original_price: parseFloat(item.original_price || item.原单价) || 0,
        replaced_price: parseFloat(item.replaced_price || item.替换单价) || 0,
        original_amount: parseFloat(item.original_amount) || originalAmount,
        replaced_amount: parseFloat(item.replaced_amount) || replacedAmount,
        amount_diff: parseFloat(amountDiff) || 0,
        replace_date: item.replace_date || item.替换日期 || item.替换时间 || ''
      };
    }).filter(r => r.order_no);

    const batchId = createBatch('replacement', fileHash, req.file.originalname, replacements.length);
    insertReplacements(replacements, batchId);

    replacements.forEach(r => ensureReview(r.order_no));

    res.json({
      success: true,
      message: `成功导入 ${replacements.length} 条替换记录`,
      count: replacements.length,
      batchId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/import/refunds', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' });
    }
    const fileHash = computeFileHash(req.file.buffer);
    const existing = checkBatchExists('refund', fileHash);
    if (existing) {
      return res.json({
        success: false,
        message: `该文件已导入过（批次 #${existing.id}，${existing.record_count} 条记录），请勿重复导入`,
        duplicate: true,
        batch: existing
      });
    }

    const rows = await parseCSV(req.file.buffer);
    const refunds = rows.map(row => {
      const get = (keys) => {
        for (const k of keys) {
          if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
        }
        return '';
      };
      return {
        order_no: get(['order_no', '订单号', '订单编号']),
        refund_amount: parseFloat(get(['refund_amount', '退款金额', '金额', '退款额'])) || 0,
        refund_date: get(['refund_date', '退款日期', '退款时间', '日期']),
        refund_reason: get(['refund_reason', '退款原因', '原因', '备注'])
      };
    }).filter(r => r.order_no);

    const batchId = createBatch('refund', fileHash, req.file.originalname, refunds.length);
    insertRefunds(refunds, batchId);

    refunds.forEach(r => ensureReview(r.order_no));

    res.json({
      success: true,
      message: `成功导入 ${refunds.length} 条退款记录`,
      count: refunds.length,
      batchId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', (req, res) => {
  try {
    const filters = {
      status: req.query.status || '',
      keyword: req.query.keyword || '',
      page: parseInt(req.query.page) || 1,
      pageSize: parseInt(req.query.pageSize) || 20
    };
    const result = getAggregatedOrders(filters);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:orderNo', (req, res) => {
  try {
    const order = getOrderByNo(req.params.orderNo);
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:orderNo/review', (req, res) => {
  try {
    const result = updateReview(req.params.orderNo, req.body);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/batches', (req, res) => {
  try {
    const batches = getBatches();
    res.json(batches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/statistics', (req, res) => {
  try {
    const stats = getStatistics();
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/export', (req, res) => {
  try {
    const filters = {
      status: req.query.status || '',
      keyword: req.query.keyword || ''
    };
    const data = getAllOrdersForExport(filters);

    const headers = [
      '订单号', '商品名称', '数量', '单价', '订单金额', '下单日期',
      '原商品', '替换商品', '替换数量', '原单价', '替换单价', '原金额', '替换后金额', '金额差异', '替换日期',
      '退款金额', '退款日期', '退款原因',
      '复核状态', '复核意见', '最终处理状态', '是否手工改判',
      '金额是否不平', '是否退款晚到'
    ];

    const statusMap = {
      pending: '待复核',
      reviewed: '已复核'
    };
    const finalMap = {
      normal: '正常',
      unbalanced: '金额不平',
      late_refund: '退款晚到',
      manual: '手工改判',
      other: '其他'
    };

    const rows = data.map(item => [
      item.order_no,
      item.product_name,
      item.quantity,
      item.price,
      item.order_amount,
      item.order_date,
      item.original_product || '',
      item.replaced_product || '',
      item.rep_quantity || '',
      item.original_price || '',
      item.replaced_price || '',
      item.original_amount || '',
      item.replaced_amount || '',
      item.amount_diff || 0,
      item.replace_date || '',
      item.refund_amount || '',
      item.refund_date || '',
      item.refund_reason || '',
      statusMap[item.review_status] || item.review_status,
      item.review_comment || '',
      finalMap[item.final_status] || item.final_status,
      item.manual_adjustment ? '是' : '否',
      item.is_amount_unbalanced,
      item.is_late_refund
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => {
        const str = String(cell ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      }).join(','))
      .join('\n');

    const bom = '\uFEFF';
    const fileName = `缺货替换对账报告_${new Date().toISOString().slice(0,10)}.csv`;
    const encodedName = encodeURIComponent(fileName);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`);
    res.send(bom + csvContent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`缺货替换对账系统已启动: http://localhost:${PORT}`);
});
