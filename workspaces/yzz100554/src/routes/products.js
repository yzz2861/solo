const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, requireBossOrClerk, requireBoss } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const { category, is_active, name } = req.query;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  
  if (category) {
    whereClause += ' AND category = ?';
    params.push(category);
  }
  
  if (is_active !== undefined) {
    whereClause += ' AND is_active = ?';
    params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
  }
  
  if (name) {
    whereClause += ' AND name LIKE ?';
    params.push(`%${name}%`);
  }
  
  const products = db.prepare(`
    SELECT * FROM products
    ${whereClause}
    ORDER BY category, name
  `).all(...params);
  
  res.json({ data: products });
});

router.get('/categories', authenticate, (req, res) => {
  const categories = db.prepare(`
    SELECT DISTINCT category FROM products ORDER BY category
  `).all().map(p => p.category);
  
  res.json({ data: categories });
});

router.get('/:id', authenticate, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  
  if (!product) {
    return res.status(404).json({ message: '商品不存在' });
  }
  
  res.json({ data: product });
});

router.post('/',
  authenticate,
  requireBoss,
  [
    body('name').notEmpty().withMessage('商品名称不能为空'),
    body('category').notEmpty().withMessage('商品分类不能为空'),
    body('unit').notEmpty().withMessage('计量单位不能为空'),
    body('price').isFloat({ min: 0 }).withMessage('价格必须大于等于0')
  ],
  auditLog('create', 'products'),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, category, unit, price, specification } = req.body;

    const stmt = db.prepare(`
      INSERT INTO products (name, category, unit, price, specification)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(name, category, unit, parseFloat(price), specification);
    
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    
    res.status(201).json({
      message: '商品创建成功',
      data: product
    });
  }
);

router.put('/:id',
  authenticate,
  requireBoss,
  [
    body('name').notEmpty().withMessage('商品名称不能为空'),
    body('category').notEmpty().withMessage('商品分类不能为空'),
    body('unit').notEmpty().withMessage('计量单位不能为空'),
    body('price').isFloat({ min: 0 }).withMessage('价格必须大于等于0')
  ],
  auditLog('update', 'products'),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) {
      return res.status(404).json({ message: '商品不存在' });
    }

    const { name, category, unit, price, specification, is_active } = req.body;

    db.prepare(`
      UPDATE products 
      SET name = ?, category = ?, unit = ?, price = ?, specification = ?, is_active = ?
      WHERE id = ?
    `).run(name, category, unit, parseFloat(price), specification, is_active ?? 1, req.params.id);

    const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    
    res.json({
      message: '商品更新成功',
      data: updatedProduct
    });
  }
);

router.delete('/:id', authenticate, requireBoss, auditLog('delete', 'products'), (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    return res.status(404).json({ message: '商品不存在' });
  }

  const hasOrders = db.prepare('SELECT COUNT(*) as count FROM sales_order_items WHERE product_id = ?').get(req.params.id);
  if (hasOrders.count > 0) {
    return res.status(400).json({ message: '该商品存在关联订单，无法删除' });
  }

  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  
  res.json({ message: '商品删除成功' });
});

module.exports = router;
