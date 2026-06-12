const db = require('./database');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL,
    inspection_status TEXT DEFAULT 'pending',
    inspection_date TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS delivery_persons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    employee_no TEXT NOT NULL UNIQUE,
    phone TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS cylinders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cylinder_no TEXT NOT NULL UNIQUE,
    specification TEXT NOT NULL,
    status TEXT DEFAULT 'empty',
    current_customer_id INTEGER,
    last_inspection_date TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (current_customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS delivery_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT NOT NULL UNIQUE,
    delivery_person_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    cylinder_id INTEGER NOT NULL,
    deposit_amount REAL NOT NULL DEFAULT 0,
    delivery_time TEXT,
    status TEXT DEFAULT 'pending',
    route_date TEXT,
    remark TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (delivery_person_id) REFERENCES delivery_persons(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (cylinder_id) REFERENCES cylinders(id)
  );

  CREATE TABLE IF NOT EXISTS return_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    delivery_order_id INTEGER NOT NULL UNIQUE,
    cylinder_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    return_time TEXT,
    deposit_refund REAL NOT NULL DEFAULT 0,
    cylinder_condition TEXT,
    status TEXT DEFAULT 'pending',
    remark TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (delivery_order_id) REFERENCES delivery_orders(id),
    FOREIGN KEY (cylinder_id) REFERENCES cylinders(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS inspections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    cylinder_id INTEGER,
    inspector TEXT,
    result TEXT NOT NULL,
    issues TEXT,
    inspection_date TEXT DEFAULT (datetime('now', 'localtime')),
    next_inspection_date TEXT,
    remark TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (cylinder_id) REFERENCES cylinders(id)
  );

  CREATE TABLE IF NOT EXISTS repairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cylinder_id INTEGER NOT NULL,
    issue TEXT NOT NULL,
    repair_person TEXT,
    cost REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    start_date TEXT DEFAULT (datetime('now', 'localtime')),
    end_date TEXT,
    remark TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (cylinder_id) REFERENCES cylinders(id)
  );

  CREATE TABLE IF NOT EXISTS deposit_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    delivery_order_id INTEGER,
    return_order_id INTEGER,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    balance REAL NOT NULL,
    remark TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (delivery_order_id) REFERENCES delivery_orders(id),
    FOREIGN KEY (return_order_id) REFERENCES return_orders(id)
  );

  CREATE INDEX IF NOT EXISTS idx_delivery_orders_customer ON delivery_orders(customer_id);
  CREATE INDEX IF NOT EXISTS idx_delivery_orders_delivery_person ON delivery_orders(delivery_person_id);
  CREATE INDEX IF NOT EXISTS idx_delivery_orders_route_date ON delivery_orders(route_date);
  CREATE INDEX IF NOT EXISTS idx_return_orders_customer ON return_orders(customer_id);
  CREATE INDEX IF NOT EXISTS idx_return_orders_cylinder ON return_orders(cylinder_id);
  CREATE INDEX IF NOT EXISTS idx_inspections_customer ON inspections(customer_id);
  CREATE INDEX IF NOT EXISTS idx_deposit_ledger_customer ON deposit_ledger(customer_id);
  CREATE INDEX IF NOT EXISTS idx_cylinders_customer ON cylinders(current_customer_id);
`);

const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
if (customerCount === 0) {
  const insertCustomer = db.prepare(`
    INSERT INTO customers (name, phone, address, inspection_status)
    VALUES (?, ?, ?, ?)
  `);
  const customers = [
    ['张三', '13800000001', '阳光花园1栋101', 'pass'],
    ['李四', '13800000002', '阳光花园2栋202', 'pass'],
    ['王五', '13800000003', '幸福小区3栋303', 'fail'],
    ['赵六', '13800000004', '幸福小区4栋404', 'pending'],
  ];
  customers.forEach(c => insertCustomer.run(...c));

  const insertDp = db.prepare(`
    INSERT INTO delivery_persons (name, employee_no, phone)
    VALUES (?, ?, ?)
  `);
  const dps = [
    ['刘配送', 'DP001', '13900000001'],
    ['陈配送', 'DP002', '13900000002'],
  ];
  dps.forEach(d => insertDp.run(...d));

  const insertCylinder = db.prepare(`
    INSERT INTO cylinders (cylinder_no, specification, status)
    VALUES (?, ?, ?)
  `);
  const cylinders = [
    ['GAS0001', '15kg', 'filled'],
    ['GAS0002', '15kg', 'filled'],
    ['GAS0003', '15kg', 'empty'],
    ['GAS0004', '5kg', 'filled'],
    ['GAS0005', '15kg', 'empty'],
    ['GAS0006', '15kg', 'filled'],
  ];
  cylinders.forEach(c => insertCylinder.run(...c));

  console.log('种子数据插入完成');
}

console.log('数据库初始化完成');
