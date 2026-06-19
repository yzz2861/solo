const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve('./data/agricultural_credit.db');
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const Database = require('better-sqlite3');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('boss', 'clerk')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE farmers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  id_card TEXT UNIQUE,
  address TEXT,
  village TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE seasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  crop_type TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  due_date DATE,
  is_active INTEGER DEFAULT 1,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  specification TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sales_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT UNIQUE NOT NULL,
  farmer_id INTEGER NOT NULL REFERENCES farmers(id),
  season_id INTEGER NOT NULL REFERENCES seasons(id),
  total_amount REAL NOT NULL DEFAULT 0,
  paid_amount REAL NOT NULL DEFAULT 0,
  returned_amount REAL NOT NULL DEFAULT 0,
  balance REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'settled', 'voided')),
  remark TEXT,
  sale_date DATE NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  settled_at DATETIME,
  settled_by INTEGER REFERENCES users(id)
);

CREATE TABLE sales_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sales_order_id INTEGER NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  amount REAL NOT NULL,
  returned_quantity REAL DEFAULT 0,
  remark TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE repayments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repayment_no TEXT UNIQUE NOT NULL,
  farmer_id INTEGER NOT NULL REFERENCES farmers(id),
  sales_order_id INTEGER REFERENCES sales_orders(id),
  amount REAL NOT NULL,
  repayment_date DATE NOT NULL,
  payment_method TEXT,
  remark TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(farmer_id, amount, repayment_date, created_by)
);

CREATE TABLE returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  return_no TEXT UNIQUE NOT NULL,
  sales_order_id INTEGER NOT NULL REFERENCES sales_orders(id),
  sales_order_item_id INTEGER NOT NULL REFERENCES sales_order_items(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  amount REAL NOT NULL,
  return_date DATE NOT NULL,
  reason TEXT,
  remark TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id INTEGER,
  old_values TEXT,
  new_values TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sales_orders_farmer ON sales_orders(farmer_id);
CREATE INDEX idx_sales_orders_season ON sales_orders(season_id);
CREATE INDEX idx_sales_orders_status ON sales_orders(status);
CREATE INDEX idx_sales_orders_date ON sales_orders(sale_date);
CREATE INDEX idx_repayments_farmer ON repayments(farmer_id);
CREATE INDEX idx_repayments_date ON repayments(repayment_date);
CREATE INDEX idx_returns_order ON returns(sales_order_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
`);

const hashedBossPassword = bcrypt.hashSync('boss123456', 10);
const hashedClerkPassword = bcrypt.hashSync('clerk123456', 10);

const insertUser = db.prepare(`
  INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)
`);

insertUser.run('boss', hashedBossPassword, '张老板', 'boss');
insertUser.run('clerk', hashedClerkPassword, '李店员', 'clerk');

const insertProduct = db.prepare(`
  INSERT INTO products (name, category, unit, price, specification) VALUES (?, ?, ?, ?, ?)
`);

const products = [
  ['杂交水稻种子', '种子', '公斤', 60, '5kg/袋'],
  ['玉米种子', '种子', '公斤', 45, '2kg/袋'],
  ['复合肥(15-15-15)', '肥料', '袋', 180, '40kg/袋'],
  ['尿素', '肥料', '袋', 120, '40kg/袋'],
  ['钾肥', '肥料', '袋', 200, '25kg/袋'],
  ['草甘膦除草剂', '农药', '瓶', 45, '1L/瓶'],
  ['杀虫剂', '农药', '瓶', 80, '500ml/瓶'],
  ['水稻专用肥', '肥料', '袋', 195, '40kg/袋']
];

products.forEach(p => insertProduct.run(...p));

const insertSeason = db.prepare(`
  INSERT INTO seasons (name, year, crop_type, start_date, end_date, due_date, created_by)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

insertSeason.run('2026年早稻', 2026, '水稻', '2026-03-01', '2026-07-15', '2026-08-30', 1);
insertSeason.run('2026年晚稻', 2026, '水稻', '2026-07-10', '2026-11-15', '2026-12-30', 1);
insertSeason.run('2026年玉米', 2026, '玉米', '2026-04-01', '2026-08-20', '2026-09-30', 1);

const insertFarmer = db.prepare(`
  INSERT INTO farmers (name, phone, id_card, address, village, created_by)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const farmers = [
  ['王大春', '13800138001', '440101198001010001', '幸福村1组', '幸福村', 1],
  ['李秋收', '13800138002', '440101198102020002', '幸福村2组', '幸福村', 1],
  ['张丰收', '13800138003', '440101198203030003', '富裕村1组', '富裕村', 1],
  ['刘满仓', '13800138004', '440101198304040004', '富裕村2组', '富裕村', 1],
  ['陈稻花', '13800138005', '440101198405050005', '丰收村1组', '丰收村', 1]
];

farmers.forEach(f => insertFarmer.run(...f));

console.log('数据库初始化完成！');
console.log('默认账号：');
console.log('  老板: boss / boss123456');
console.log('  店员: clerk / clerk123456');

db.close();
