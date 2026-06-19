const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, requireBoss } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const { is_active, year } = req.query;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  
  if (is_active !== undefined) {
    whereClause += ' AND is_active = ?';
    params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
  }
  
  if (year) {
    whereClause += ' AND year = ?';
    params.push(parseInt(year));
  }
  
  const seasons = db.prepare(`
    SELECT s.*, u.name as creator_name 
    FROM seasons s
    LEFT JOIN users u ON s.created_by = u.id
    ${whereClause}
    ORDER BY s.year DESC, s.start_date DESC
  `).all(...params);
  
  res.json({ data: seasons });
});

router.get('/:id', authenticate, (req, res) => {
  const season = db.prepare(`
    SELECT s.*, u.name as creator_name 
    FROM seasons s
    LEFT JOIN users u ON s.created_by = u.id
    WHERE s.id = ?
  `).get(req.params.id);
  
  if (!season) {
    return res.status(404).json({ message: '作物季不存在' });
  }
  
  res.json({ data: season });
});

router.post('/',
  authenticate,
  requireBoss,
  [
    body('name').notEmpty().withMessage('名称不能为空'),
    body('year').isInt({ min: 2000, max: 2100 }).withMessage('年份格式不正确'),
    body('crop_type').notEmpty().withMessage('作物类型不能为空'),
    body('start_date').optional().isDate().withMessage('开始日期格式不正确'),
    body('end_date').optional().isDate().withMessage('结束日期格式不正确'),
    body('due_date').optional().isDate().withMessage('到期日期格式不正确')
  ],
  auditLog('create', 'seasons'),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, year, crop_type, start_date, end_date, due_date } = req.body;

    const stmt = db.prepare(`
      INSERT INTO seasons (name, year, crop_type, start_date, end_date, due_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(name, year, crop_type, start_date, end_date, due_date, req.user.id);
    
    const season = db.prepare('SELECT * FROM seasons WHERE id = ?').get(result.lastInsertRowid);
    
    res.status(201).json({
      message: '作物季创建成功',
      data: season
    });
  }
);

router.put('/:id',
  authenticate,
  requireBoss,
  [
    body('name').notEmpty().withMessage('名称不能为空'),
    body('year').isInt({ min: 2000, max: 2100 }).withMessage('年份格式不正确'),
    body('crop_type').notEmpty().withMessage('作物类型不能为空')
  ],
  auditLog('update', 'seasons'),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const season = db.prepare('SELECT * FROM seasons WHERE id = ?').get(req.params.id);
    if (!season) {
      return res.status(404).json({ message: '作物季不存在' });
    }

    const { name, year, crop_type, start_date, end_date, due_date, is_active } = req.body;

    db.prepare(`
      UPDATE seasons 
      SET name = ?, year = ?, crop_type = ?, start_date = ?, end_date = ?, due_date = ?, is_active = ?
      WHERE id = ?
    `).run(name, year, crop_type, start_date, end_date, due_date, is_active ?? 1, req.params.id);

    const updatedSeason = db.prepare('SELECT * FROM seasons WHERE id = ?').get(req.params.id);
    
    res.json({
      message: '作物季更新成功',
      data: updatedSeason
    });
  }
);

router.delete('/:id', authenticate, requireBoss, auditLog('delete', 'seasons'), (req, res) => {
  const season = db.prepare('SELECT * FROM seasons WHERE id = ?').get(req.params.id);
  if (!season) {
    return res.status(404).json({ message: '作物季不存在' });
  }

  const hasOrders = db.prepare('SELECT COUNT(*) as count FROM sales_orders WHERE season_id = ?').get(req.params.id);
  if (hasOrders.count > 0) {
    return res.status(400).json({ message: '该作物季存在关联订单，无法删除' });
  }

  db.prepare('DELETE FROM seasons WHERE id = ?').run(req.params.id);
  
  res.json({ message: '作物季删除成功' });
});

module.exports = router;
