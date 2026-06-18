const express = require('express');
const cors = require('cors');
const dayjs = require('dayjs');
const db = require('./db');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

function getConfig() {
  return db.prepare('SELECT * FROM activity_config WHERE id = 1').get();
}

function releaseExpiredLocks() {
  const config = getConfig();
  const expireTime = dayjs().subtract(config.lock_expire_hours, 'hour').format();
  
  const expired = db.prepare(`
    SELECT t.id as textbook_id, o.id as order_id 
    FROM textbooks t
    LEFT JOIN orders o ON o.textbook_id = t.id AND o.status = 'pending'
    WHERE t.status = 'locked' AND t.locked_at < ?
  `).all(expireTime);

  const now = dayjs().format();

  expired.forEach(item => {
    if (item.order_id) {
      db.prepare("UPDATE orders SET status = 'expired', updated_at = ? WHERE id = ?")
        .run(now, item.order_id);
    }
    db.prepare("UPDATE textbooks SET status = 'on_shelf', locked_by = NULL, locked_at = NULL, updated_at = ? WHERE id = ?")
      .run(now, item.textbook_id);
  });

  return expired.length;
}

function releaseExpiredPickups() {
  const config = getConfig();
  const expireTime = dayjs().subtract(config.pickup_expire_hours, 'hour').format();

  const expiredOrders = db.prepare(`
    SELECT o.id as order_id, o.textbook_id
    FROM orders o
    WHERE o.status = 'pending' AND o.created_at < ?
  `).all(expireTime);

  const now = dayjs().format();

  expiredOrders.forEach(order => {
    db.prepare("UPDATE orders SET status = 'pickup_expired', updated_at = ? WHERE id = ?")
      .run(now, order.order_id);
    db.prepare("UPDATE textbooks SET status = 'on_shelf', locked_by = NULL, locked_at = NULL, updated_at = ? WHERE id = ?")
      .run(now, order.textbook_id);
  });

  return expiredOrders.length;
}

app.use((req, res, next) => {
  try {
    releaseExpiredLocks();
    releaseExpiredPickups();
  } catch (e) {
    console.error('Release expired error:', e);
  }
  next();
});

app.get('/api/config', (req, res) => {
  res.json(getConfig());
});

app.put('/api/config', (req, res) => {
  const { activity_name, lock_expire_hours, pickup_expire_hours, pickup_location, status } = req.body;
  const now = dayjs().format();
  db.prepare(`
    UPDATE activity_config 
    SET activity_name = ?, lock_expire_hours = ?, pickup_expire_hours = ?, pickup_location = ?, status = ?
    WHERE id = 1
  `).run(activity_name, lock_expire_hours, pickup_expire_hours, pickup_location, status);
  res.json(getConfig());
});

app.get('/api/courses', (req, res) => {
  const courses = db.prepare('SELECT * FROM courses ORDER BY name').all();
  res.json(courses);
});

app.post('/api/courses', (req, res) => {
  const { name } = req.body;
  const now = dayjs().format();
  try {
    const result = db.prepare('INSERT INTO courses (name, created_at) VALUES (?, ?)').run(name, now);
    res.json({ id: result.lastInsertRowid, name, created_at: now });
  } catch (e) {
    res.status(400).json({ error: '课程已存在' });
  }
});

app.get('/api/sellers', (req, res) => {
  const sellers = db.prepare('SELECT * FROM sellers ORDER BY created_at DESC').all();
  res.json(sellers);
});

app.post('/api/sellers', (req, res) => {
  const { name, phone, student_id } = req.body;
  const now = dayjs().format();
  const result = db.prepare('INSERT INTO sellers (name, phone, student_id, created_at) VALUES (?, ?, ?, ?)')
    .run(name, phone || '', student_id || '', now);
  res.json({ id: result.lastInsertRowid, name, phone, student_id, created_at: now });
});

app.get('/api/textbooks', (req, res) => {
  const { status, course_id, keyword, seller_id } = req.query;
  
  let sql = `
    SELECT t.*, c.name as course_name, s.name as seller_name, s.phone as seller_phone, s.student_id as seller_student_id
    FROM textbooks t
    LEFT JOIN courses c ON c.id = t.course_id
    LEFT JOIN sellers s ON s.id = t.seller_id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    sql += ' AND t.status = ?';
    params.push(status);
  }
  if (course_id) {
    sql += ' AND t.course_id = ?';
    params.push(course_id);
  }
  if (seller_id) {
    sql += ' AND t.seller_id = ?';
    params.push(seller_id);
  }
  if (keyword) {
    sql += ' AND (t.title LIKE ? OR t.edition LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  sql += ' ORDER BY t.updated_at DESC';

  const textbooks = db.prepare(sql).all(...params);
  res.json(textbooks);
});

app.get('/api/textbooks/stats', (req, res) => {
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'on_shelf' THEN 1 ELSE 0 END) as on_shelf,
      SUM(CASE WHEN status = 'locked' THEN 1 ELSE 0 END) as locked,
      SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold,
      SUM(CASE WHEN status = 'picked_up' THEN 1 ELSE 0 END) as picked_up,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
      SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as refunded
    FROM textbooks
  `).get();
  
  stats.total = stats.total || 0;
  stats.on_shelf = stats.on_shelf || 0;
  stats.locked = stats.locked || 0;
  stats.sold = stats.sold || 0;
  stats.picked_up = stats.picked_up || 0;
  stats.cancelled = stats.cancelled || 0;
  stats.refunded = stats.refunded || 0;
  
  res.json(stats);
});

app.get('/api/textbooks/:id', (req, res) => {
  const textbook = db.prepare(`
    SELECT t.*, c.name as course_name, s.name as seller_name, s.phone as seller_phone
    FROM textbooks t
    LEFT JOIN courses c ON c.id = t.course_id
    LEFT JOIN sellers s ON s.id = t.seller_id
    WHERE t.id = ?
  `).get(req.params.id);
  
  if (!textbook) {
    return res.status(404).json({ error: '教材不存在' });
  }
  res.json(textbook);
});

app.post('/api/textbooks', (req, res) => {
  const { title, course_id, edition, condition, price, seller_id, version_note, trade_in_value } = req.body;
  const now = dayjs().format();

  if (!title || !price || !seller_id) {
    return res.status(400).json({ error: '请填写必填信息' });
  }

  const result = db.prepare(`
    INSERT INTO textbooks (title, course_id, edition, condition, price, seller_id, status, version_note, trade_in_value, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'on_shelf', ?, ?, ?, ?)
  `).run(title, course_id || null, edition || '', condition || 'good', price, seller_id, version_note || '', trade_in_value || 0, now, now);

  const textbook = db.prepare('SELECT * FROM textbooks WHERE id = ?').get(result.lastInsertRowid);
  res.json(textbook);
});

app.put('/api/textbooks/:id', (req, res) => {
  const { title, course_id, edition, condition, price, version_note, trade_in_value } = req.body;
  const now = dayjs().format();

  const existing = db.prepare('SELECT * FROM textbooks WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: '教材不存在' });
  }

  db.prepare(`
    UPDATE textbooks 
    SET title = ?, course_id = ?, edition = ?, condition = ?, price = ?, version_note = ?, trade_in_value = ?, updated_at = ?
    WHERE id = ?
  `).run(title, course_id || null, edition || '', condition || 'good', price, version_note || '', trade_in_value || 0, now, req.params.id);

  const textbook = db.prepare('SELECT * FROM textbooks WHERE id = ?').get(req.params.id);
  res.json(textbook);
});

app.post('/api/textbooks/:id/lock', (req, res) => {
  const { buyer_name, buyer_phone, buyer_student_id } = req.body;
  const now = dayjs().format();
  const textbookId = req.params.id;

  const textbook = db.prepare('SELECT * FROM textbooks WHERE id = ?').get(textbookId);
  if (!textbook) {
    return res.status(404).json({ error: '教材不存在' });
  }
  if (textbook.status !== 'on_shelf') {
    return res.status(400).json({ error: '该教材已被预订或已售出' });
  }

  try {
    db.prepare("UPDATE textbooks SET status = 'locked', locked_by = ?, locked_at = ?, updated_at = ? WHERE id = ? AND status = 'on_shelf'")
      .run(buyer_name, now, now, textbookId);

    const updated = db.prepare('SELECT * FROM textbooks WHERE id = ?').get(textbookId);
    if (updated.status !== 'locked') {
      return res.status(400).json({ error: '该教材已被其他人预订' });
    }

    const pickupCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orderResult = db.prepare(`
      INSERT INTO orders (textbook_id, buyer_name, buyer_phone, buyer_student_id, version_confirmed, pickup_code, status, actual_price, trade_in_used, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, 'pending', ?, 0, ?, ?)
    `).run(textbookId, buyer_name, buyer_phone || '', buyer_student_id || '', pickupCode, textbook.price, now, now);

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderResult.lastInsertRowid);
    res.json({ success: true, order, textbook: updated });
  } catch (e) {
    console.error('Lock error:', e);
    res.status(500).json({ error: '锁定失败，请重试' });
  }
});

app.post('/api/textbooks/:id/release', (req, res) => {
  const now = dayjs().format();
  const textbookId = req.params.id;

  const textbook = db.prepare('SELECT * FROM textbooks WHERE id = ?').get(textbookId);
  if (!textbook) {
    return res.status(404).json({ error: '教材不存在' });
  }

  try {
    db.prepare("UPDATE textbooks SET status = 'on_shelf', locked_by = NULL, locked_at = NULL, updated_at = ? WHERE id = ?")
      .run(now, textbookId);
    db.prepare("UPDATE orders SET status = 'cancelled', updated_at = ? WHERE textbook_id = ? AND status = 'pending'")
      .run(now, textbookId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: '释放失败' });
  }
});

app.post('/api/textbooks/:id/confirm-pickup', (req, res) => {
  const { version_confirmed, trade_in_textbook_id, trade_in_value } = req.body;
  const now = dayjs().format();
  const textbookId = req.params.id;

  const textbook = db.prepare('SELECT * FROM textbooks WHERE id = ?').get(textbookId);
  if (!textbook) {
    return res.status(404).json({ error: '教材不存在' });
  }
  if (textbook.status !== 'locked') {
    return res.status(400).json({ error: '该教材状态不正确' });
  }

  const order = db.prepare("SELECT * FROM orders WHERE textbook_id = ? AND status = 'pending'").get(textbookId);
  if (!order) {
    return res.status(400).json({ error: '未找到对应的预订订单' });
  }

  try {
    let actualPrice = textbook.price;
    if (trade_in_textbook_id && trade_in_value) {
      actualPrice = textbook.price - trade_in_value;
      db.prepare("UPDATE textbooks SET status = 'sold', updated_at = ? WHERE id = ?")
        .run(now, trade_in_textbook_id);
    }

    db.prepare("UPDATE textbooks SET status = 'picked_up', picked_up_at = ?, updated_at = ? WHERE id = ?")
      .run(now, now, textbookId);

    db.prepare(`
      UPDATE orders 
      SET status = 'completed', version_confirmed = ?, actual_price = ?, trade_in_used = ?, trade_in_textbook_id = ?, updated_at = ?
      WHERE id = ?
    `).run(version_confirmed ? 1 : 0, actualPrice, trade_in_textbook_id ? 1 : 0, trade_in_textbook_id || null, now, order.id);

    res.json({ success: true });
  } catch (e) {
    console.error('Pickup confirm error:', e);
    res.status(500).json({ error: '确认失败' });
  }
});

app.post('/api/textbooks/:id/cancel', (req, res) => {
  const now = dayjs().format();
  const textbookId = req.params.id;

  const textbook = db.prepare('SELECT * FROM textbooks WHERE id = ?').get(textbookId);
  if (!textbook) {
    return res.status(404).json({ error: '教材不存在' });
  }

  try {
    db.prepare("UPDATE textbooks SET status = 'cancelled', updated_at = ? WHERE id = ?")
      .run(now, textbookId);
    db.prepare("UPDATE orders SET status = 'cancelled', updated_at = ? WHERE textbook_id = ? AND status IN ('pending', 'pickup_expired')")
      .run(now, textbookId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: '取消失败' });
  }
});

app.post('/api/textbooks/:id/refund', (req, res) => {
  const { reason } = req.body;
  const now = dayjs().format();
  const textbookId = req.params.id;

  const textbook = db.prepare('SELECT * FROM textbooks WHERE id = ?').get(textbookId);
  if (!textbook) {
    return res.status(404).json({ error: '教材不存在' });
  }

  try {
    db.prepare("UPDATE textbooks SET status = 'refunded', updated_at = ? WHERE id = ?")
      .run(now, textbookId);
    db.prepare("UPDATE orders SET status = 'refunded', remark = ?, updated_at = ? WHERE textbook_id = ? AND status = 'completed'")
      .run(reason || '', now, textbookId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: '退款失败' });
  }
});

app.get('/api/orders', (req, res) => {
  const { status, textbook_id, buyer_name } = req.query;
  
  let sql = `
    SELECT o.*, t.title as textbook_title, t.edition as textbook_edition, t.price as textbook_price, c.name as course_name,
           s.name as seller_name, s.phone as seller_phone
    FROM orders o
    JOIN textbooks t ON t.id = o.textbook_id
    LEFT JOIN courses c ON c.id = t.course_id
    LEFT JOIN sellers s ON s.id = t.seller_id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    sql += ' AND o.status = ?';
    params.push(status);
  }
  if (textbook_id) {
    sql += ' AND o.textbook_id = ?';
    params.push(textbook_id);
  }
  if (buyer_name) {
    sql += ' AND o.buyer_name LIKE ?';
    params.push(`%${buyer_name}%`);
  }

  sql += ' ORDER BY o.created_at DESC';

  const orders = db.prepare(sql).all(...params);
  res.json(orders);
});

app.get('/api/orders/:id', (req, res) => {
  const order = db.prepare(`
    SELECT o.*, t.title as textbook_title, t.edition as textbook_edition, t.condition as textbook_condition,
           t.price as textbook_price, t.version_note, c.name as course_name,
           s.name as seller_name, s.phone as seller_phone
    FROM orders o
    JOIN textbooks t ON t.id = o.textbook_id
    LEFT JOIN courses c ON c.id = t.course_id
    LEFT JOIN sellers s ON s.id = t.seller_id
    WHERE o.id = ?
  `).get(req.params.id);

  if (!order) {
    return res.status(404).json({ error: '订单不存在' });
  }
  res.json(order);
});

app.get('/api/settlement/sellers', (req, res) => {
  const settlements = db.prepare(`
    SELECT 
      s.id as seller_id,
      s.name as seller_name,
      s.phone as seller_phone,
      s.student_id,
      COUNT(t.id) as total_books,
      SUM(CASE WHEN t.status = 'picked_up' THEN 1 ELSE 0 END) as sold_books,
      SUM(CASE WHEN t.status = 'picked_up' THEN t.price ELSE 0 END) as total_amount,
      SUM(CASE WHEN t.status = 'on_shelf' THEN 1 ELSE 0 END) as on_shelf_books,
      SUM(CASE WHEN t.status = 'locked' THEN 1 ELSE 0 END) as locked_books,
      SUM(CASE WHEN t.status IN ('cancelled', 'refunded') THEN 1 ELSE 0 END) as cancelled_books
    FROM sellers s
    LEFT JOIN textbooks t ON t.seller_id = s.id
    GROUP BY s.id
    ORDER BY total_amount DESC
  `).all();

  settlements.forEach(s => {
    s.total_books = s.total_books || 0;
    s.sold_books = s.sold_books || 0;
    s.total_amount = s.total_amount || 0;
    s.on_shelf_books = s.on_shelf_books || 0;
    s.locked_books = s.locked_books || 0;
    s.cancelled_books = s.cancelled_books || 0;
  });

  res.json(settlements);
});

app.get('/api/settlement/sellers/:sellerId', (req, res) => {
  const sellerId = req.params.sellerId;
  
  const seller = db.prepare('SELECT * FROM sellers WHERE id = ?').get(sellerId);
  if (!seller) {
    return res.status(404).json({ error: '卖家不存在' });
  }

  const textbooks = db.prepare(`
    SELECT t.*, c.name as course_name
    FROM textbooks t
    LEFT JOIN courses c ON c.id = t.course_id
    WHERE t.seller_id = ?
    ORDER BY t.created_at DESC
  `).all(sellerId);

  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_books,
      SUM(CASE WHEN status = 'picked_up' THEN 1 ELSE 0 END) as sold_books,
      SUM(CASE WHEN status = 'picked_up' THEN price ELSE 0 END) as total_amount,
      SUM(CASE WHEN status = 'on_shelf' THEN 1 ELSE 0 END) as on_shelf_books
    FROM textbooks
    WHERE seller_id = ?
  `).get(sellerId);

  stats.total_books = stats.total_books || 0;
  stats.sold_books = stats.sold_books || 0;
  stats.total_amount = stats.total_amount || 0;
  stats.on_shelf_books = stats.on_shelf_books || 0;

  res.json({ seller, textbooks, stats });
});

app.get('/api/settlement/courses', (req, res) => {
  const courses = db.prepare(`
    SELECT 
      c.id as course_id,
      c.name as course_name,
      COUNT(t.id) as total_books,
      SUM(CASE WHEN t.status = 'picked_up' THEN 1 ELSE 0 END) as sold_books,
      SUM(CASE WHEN t.status = 'picked_up' THEN o.actual_price ELSE 0 END) as total_sales,
      SUM(CASE WHEN t.status = 'on_shelf' THEN 1 ELSE 0 END) as on_shelf_books,
      SUM(CASE WHEN t.status = 'locked' THEN 1 ELSE 0 END) as locked_books
    FROM courses c
    LEFT JOIN textbooks t ON t.course_id = c.id
    LEFT JOIN orders o ON o.textbook_id = t.id AND o.status = 'completed'
    GROUP BY c.id
    ORDER BY sold_books DESC
  `).all();

  courses.forEach(c => {
    c.total_books = c.total_books || 0;
    c.sold_books = c.sold_books || 0;
    c.total_sales = c.total_sales || 0;
    c.on_shelf_books = c.on_shelf_books || 0;
    c.locked_books = c.locked_books || 0;
  });

  res.json(courses);
});

app.get('/api/settlement/stuck-textbooks', (req, res) => {
  const config = getConfig();
  const stuckTime = dayjs().subtract(config.pickup_expire_hours * 2, 'hour').format();

  const stuck = db.prepare(`
    SELECT t.*, c.name as course_name, s.name as seller_name, s.phone as seller_phone,
           o.buyer_name, o.buyer_phone, o.status as order_status, o.created_at as order_created_at
    FROM textbooks t
    LEFT JOIN courses c ON c.id = t.course_id
    LEFT JOIN sellers s ON s.id = t.seller_id
    LEFT JOIN orders o ON o.textbook_id = t.id AND o.status IN ('pending', 'pickup_expired')
    WHERE t.status IN ('locked', 'on_shelf') 
      AND t.created_at < ?
    ORDER BY t.created_at ASC
  `).all(stuckTime);

  res.json(stuck);
});

app.get('/api/settlement/summary', (req, res) => {
  const summary = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM textbooks) as total_textbooks,
      (SELECT COUNT(*) FROM textbooks WHERE status = 'on_shelf') as on_shelf,
      (SELECT COUNT(*) FROM textbooks WHERE status = 'locked') as locked,
      (SELECT COUNT(*) FROM textbooks WHERE status = 'picked_up') as picked_up,
      (SELECT COUNT(*) FROM textbooks WHERE status IN ('cancelled', 'refunded')) as cancelled,
      (SELECT COUNT(*) FROM sellers) as total_sellers,
      (SELECT COUNT(*) FROM orders) as total_orders,
      (SELECT COUNT(*) FROM orders WHERE status = 'completed') as completed_orders,
      (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
      (SELECT COUNT(*) FROM orders WHERE status IN ('expired', 'pickup_expired')) as expired_orders,
      (SELECT COALESCE(SUM(actual_price), 0) FROM orders WHERE status = 'completed') as total_sales
  `).get();

  res.json(summary);
});

app.get('/api/export/seller-settlement', (req, res) => {
  const data = db.prepare(`
    SELECT 
      s.name as 卖家姓名,
      s.phone as 联系电话,
      s.student_id as 学号,
      COUNT(t.id) as 总教材数,
      SUM(CASE WHEN t.status = 'picked_up' THEN 1 ELSE 0 END) as 已售出数,
      SUM(CASE WHEN t.status = 'picked_up' THEN t.price ELSE 0 END) as 总金额,
      SUM(CASE WHEN t.status = 'on_shelf' THEN 1 ELSE 0 END) as 待售数
    FROM sellers s
    LEFT JOIN textbooks t ON t.seller_id = s.id
    GROUP BY s.id
    ORDER BY 总金额 DESC
  `).all();

  res.json({ data, filename: '卖家结算明细.csv' });
});

app.get('/api/export/pending-pickup', (req, res) => {
  const data = db.prepare(`
    SELECT 
      o.id as 订单号,
      t.title as 教材名称,
      t.edition as 版本,
      c.name as 课程,
      o.buyer_name as 预订人,
      o.buyer_phone as 联系电话,
      o.pickup_code as 取书码,
      t.price as 价格,
      o.created_at as 预订时间
    FROM orders o
    JOIN textbooks t ON t.id = o.textbook_id
    LEFT JOIN courses c ON c.id = t.course_id
    WHERE o.status = 'pending'
    ORDER BY o.created_at ASC
  `).all();

  res.json({ data, filename: '待取书明细.csv' });
});

app.get('/api/export/stuck-textbooks', (req, res) => {
  const config = getConfig();
  const stuckTime = dayjs().subtract(config.pickup_expire_hours * 2, 'hour').format();

  const data = db.prepare(`
    SELECT 
      t.id as 教材ID,
      t.title as 教材名称,
      t.edition as 版本,
      c.name as 课程,
      t.condition as 成色,
      t.price as 价格,
      s.name as 卖家,
      s.phone as 卖家电话,
      t.status as 状态,
      t.created_at as 上架时间,
      CASE WHEN t.status = 'locked' THEN o.buyer_name ELSE NULL END as 预订人,
      CASE WHEN t.status = 'locked' THEN o.buyer_phone ELSE NULL END as 预订人电话
    FROM textbooks t
    LEFT JOIN courses c ON c.id = t.course_id
    LEFT JOIN sellers s ON s.id = t.seller_id
    LEFT JOIN orders o ON o.textbook_id = t.id AND o.status = 'pending'
    WHERE t.status IN ('locked', 'on_shelf') 
      AND t.created_at < ?
    ORDER BY t.created_at ASC
  `).all(stuckTime);

  res.json({ data, filename: '滞留教材明细.csv' });
});

app.get('/api/export/seller/:sellerId', (req, res) => {
  const sellerId = req.params.sellerId;
  const seller = db.prepare('SELECT * FROM sellers WHERE id = ?').get(sellerId);
  
  if (!seller) {
    return res.status(404).json({ error: '卖家不存在' });
  }

  const data = db.prepare(`
    SELECT 
      t.id as 教材ID,
      t.title as 教材名称,
      t.edition as 版本,
      c.name as 课程,
      t.condition as 成色,
      t.price as 定价,
      t.status as 状态,
      t.created_at as 上架时间,
      t.picked_up_at as 取书时间
    FROM textbooks t
    LEFT JOIN courses c ON c.id = t.course_id
    WHERE t.seller_id = ?
    ORDER BY t.created_at DESC
  `).all(sellerId);

  res.json({ 
    data, 
    seller: { name: seller.name, phone: seller.phone },
    filename: `卖家_${seller.name}_明细.csv` 
  });
});

app.post('/api/reminders/expiring-pickups', (req, res) => {
  const config = getConfig();
  const warningTime = dayjs().subtract(config.pickup_expire_hours - 6, 'hour').format();
  const expireTime = dayjs().subtract(config.pickup_expire_hours, 'hour').format();

  const expiring = db.prepare(`
    SELECT o.*, t.title as textbook_title, o.created_at as order_created_at
    FROM orders o
    JOIN textbooks t ON t.id = o.textbook_id
    WHERE o.status = 'pending' AND o.created_at < ? AND o.created_at > ?
    ORDER BY o.created_at ASC
  `).all(warningTime, expireTime);

  res.json({ count: expiring.length, orders: expiring });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: dayjs().format() });
});

async function startServer() {
  await db.initDb();
  app.listen(port, () => {
    console.log(`二手教材置换台后端服务运行在 http://localhost:${port}`);
  });
}

startServer().catch(err => {
  console.error('启动失败:', err);
  process.exit(1);
});
