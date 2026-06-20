const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/catering.db');
let SQL = null;

function ensureDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function getSqlEngine() {
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: file => path.join(path.dirname(require.resolve('sql.js')), file)
    });
  }
  return SQL;
}

class Statement {
  constructor(db, stmt) {
    this._db = db;
    this._stmt = stmt;
  }

  _bind(params) {
    if (params === undefined || params === null) return;
    if (Array.isArray(params)) {
      this._stmt.bind(params);
    } else if (typeof params === 'object') {
      const arr = [];
      const names = this._stmt.getSQL().match(/\?|\$[\w]+|@[\w]+|:\w+/g) || [];
      let idx = 0;
      for (const key of Object.keys(params)) {
        arr.push(params[key]);
      }
      this._stmt.bind(arr);
    }
  }

  run(...args) {
    this._stmt.reset();
    if (args.length > 0) {
      if (args.length === 1 && Array.isArray(args[0])) {
        this._stmt.bind(args[0]);
      } else if (args.length === 1 && typeof args[0] === 'object') {
        const arr = Object.values(args[0]);
        this._stmt.bind(arr);
      } else {
        this._stmt.bind(args);
      }
    }
    try {
      while (this._stmt.step()) {}
    } catch (e) {}
    const info = this._db._db.exec('SELECT last_insert_rowid() as id, changes() as changes')[0];
    const row = info?.values?.[0] || [0, 0];
    return { lastInsertRowid: row[0], changes: row[1] };
  }

  get(...args) {
    this._stmt.reset();
    if (args.length > 0) {
      if (args.length === 1 && Array.isArray(args[0])) {
        this._stmt.bind(args[0]);
      } else if (args.length === 1 && typeof args[0] === 'object') {
        this._stmt.bind(Object.values(args[0]));
      } else {
        this._stmt.bind(args);
      }
    }
    const cols = this._stmt.getColumnNames();
    if (this._stmt.step()) {
      const row = this._stmt.getAsObject();
      return row;
    }
    return undefined;
  }

  all(...args) {
    this._stmt.reset();
    if (args.length > 0) {
      if (args.length === 1 && Array.isArray(args[0])) {
        this._stmt.bind(args[0]);
      } else if (args.length === 1 && typeof args[0] === 'object') {
        this._stmt.bind(Object.values(args[0]));
      } else {
        this._stmt.bind(args);
      }
    }
    const results = [];
    while (this._stmt.step()) {
      results.push(this._stmt.getAsObject());
    }
    return results;
  }

  free() {
    try { this._stmt.free(); } catch(e) {}
  }
}

class Database {
  constructor(db) {
    this._db = db;
    this._dirty = false;
  }

  pragma(sql) {
    this._db.run('PRAGMA ' + sql);
    return [];
  }

  exec(sql) {
    const statements = sql.split(/;\s*(?=(?:[^'"]|'[^']*'|"[^"]*")*$)/);
    for (const s of statements) {
      const trimmed = s.trim();
      if (trimmed) {
        this._db.run(trimmed);
        this._dirty = true;
      }
    }
    return [];
  }

  prepare(sql) {
    const stmt = this._db.prepare(sql);
    return new Statement(this, stmt);
  }

  transaction(fn) {
    return (...args) => {
      this._db.run('BEGIN TRANSACTION');
      try {
        const result = fn.apply(this, args);
        this._db.run('COMMIT');
        this._dirty = true;
        return result;
      } catch (e) {
        this._db.run('ROLLBACK');
        throw e;
      }
    };
  }

  close() {
    this.save();
    try { this._db.close(); } catch(e) {}
  }

  save() {
    if (!this._dirty) return;
    ensureDir();
    const data = this._db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    this._dirty = false;
  }
}

async function openDb() {
  ensureDir();
  const SqlEng = await getSqlEngine();
  let db;
  if (fs.existsSync(DB_PATH)) {
    try {
      const buf = fs.readFileSync(DB_PATH);
      db = new SqlEng.Database(new Uint8Array(buf));
    } catch (e) {
      console.warn('数据库文件损坏，重新创建:', e.message);
      db = new SqlEng.Database();
    }
  } else {
    db = new SqlEng.Database();
  }
  return new Database(db);
}

async function initDatabase() {
  const db = await openDb();
  db.pragma('foreign_keys = ON');

  const sql = `
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      address TEXT,
      category TEXT NOT NULL DEFAULT 'general',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('inspector','buyer','finance','chef','supplier','admin')),
      supplier_id INTEGER,
      token TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_no TEXT UNIQUE NOT NULL,
      supplier_id INTEGER NOT NULL,
      order_date TEXT NOT NULL,
      expected_delivery_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','partial_accepted','accepted','closed')),
      total_amount REAL DEFAULT 0,
      buyer_id INTEGER,
      remarks TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (buyer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_id INTEGER NOT NULL,
      material_code TEXT NOT NULL,
      material_name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'vegetable' CHECK(category IN ('vegetable','meat','seasoning','other')),
      unit TEXT NOT NULL,
      unit_price REAL NOT NULL,
      expected_qty REAL NOT NULL,
      accepted_qty REAL DEFAULT 0,
      returned_qty REAL DEFAULT 0,
      replaced_qty REAL DEFAULT 0,
      deduction_qty REAL DEFAULT 0,
      final_qty REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','partial_accepted','accepted','has_returns','closed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_no TEXT UNIQUE NOT NULL,
      po_id INTEGER NOT NULL,
      supplier_id INTEGER NOT NULL,
      delivery_date TEXT NOT NULL,
      delivery_time TEXT NOT NULL,
      inspector_id INTEGER NOT NULL,
      vehicle_no TEXT,
      driver_name TEXT,
      temperature REAL,
      photo_urls TEXT,
      remarks TEXT,
      is_final INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (inspector_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS delivery_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_id INTEGER NOT NULL,
      po_item_id INTEGER NOT NULL,
      material_code TEXT NOT NULL,
      material_name TEXT NOT NULL,
      category TEXT NOT NULL,
      unit TEXT NOT NULL,
      unit_price REAL NOT NULL,
      delivered_qty REAL NOT NULL,
      actual_accepted_qty REAL DEFAULT 0,
      deduction_qty REAL DEFAULT 0,
      deduction_reason TEXT,
      deduction_photo_urls TEXT,
      has_quality_issue INTEGER DEFAULT 0,
      quality_detail TEXT,
      accepted INTEGER NOT NULL DEFAULT 0,
      accepted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
      FOREIGN KEY (po_item_id) REFERENCES purchase_order_items(id)
    );

    CREATE TABLE IF NOT EXISTS returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_no TEXT UNIQUE NOT NULL,
      delivery_id INTEGER NOT NULL,
      supplier_id INTEGER NOT NULL,
      return_date TEXT NOT NULL,
      return_type TEXT NOT NULL CHECK(return_type IN ('quality','quantity','wrong_item','other')),
      total_qty REAL NOT NULL,
      total_value REAL DEFAULT 0,
      photo_urls TEXT,
      reason TEXT,
      handler_id INTEGER NOT NULL,
      supplier_signed INTEGER DEFAULT 0,
      supplier_signature_url TEXT,
      supplier_signed_at TEXT,
      supplier_remark TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','signed','completed','cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (handler_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL,
      delivery_item_id INTEGER NOT NULL,
      deduction_id INTEGER,
      material_code TEXT NOT NULL,
      material_name TEXT NOT NULL,
      unit TEXT NOT NULL,
      unit_price REAL NOT NULL,
      return_qty REAL NOT NULL,
      return_value REAL DEFAULT 0,
      reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
      FOREIGN KEY (delivery_item_id) REFERENCES delivery_items(id),
      FOREIGN KEY (deduction_id) REFERENCES deductions(id)
    );

    CREATE TABLE IF NOT EXISTS deductions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deduction_no TEXT UNIQUE NOT NULL,
      delivery_item_id INTEGER NOT NULL,
      delivery_id INTEGER NOT NULL,
      supplier_id INTEGER NOT NULL,
      po_item_id INTEGER NOT NULL,
      material_code TEXT NOT NULL,
      material_name TEXT NOT NULL,
      category TEXT NOT NULL,
      unit TEXT NOT NULL,
      unit_price REAL NOT NULL,
      expected_qty REAL NOT NULL,
      delivered_qty REAL NOT NULL,
      deduction_qty REAL NOT NULL,
      deduction_value REAL NOT NULL,
      reason TEXT NOT NULL CHECK(reason IN ('rotten','weight_insufficient','damaged','expired','contaminated','wrong_spec','other')),
      description TEXT,
      photo_urls TEXT,
      replaced_qty REAL DEFAULT 0,
      remaining_replace_qty REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending_replace' CHECK(status IN ('pending_replace','partial_replaced','replaced','deducted','resolved')),
      inspector_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (delivery_item_id) REFERENCES delivery_items(id),
      FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (po_item_id) REFERENCES purchase_order_items(id),
      FOREIGN KEY (inspector_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS replacements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      replace_no TEXT UNIQUE NOT NULL,
      original_deduction_id INTEGER NOT NULL,
      delivery_id INTEGER,
      supplier_id INTEGER NOT NULL,
      po_id INTEGER NOT NULL,
      po_item_id INTEGER NOT NULL,
      material_code TEXT NOT NULL,
      material_name TEXT NOT NULL,
      unit TEXT NOT NULL,
      unit_price REAL NOT NULL,
      original_deduction_qty REAL NOT NULL,
      replace_qty REAL NOT NULL,
      remaining_replace_qty REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','partial_delivered','delivered','closed')),
      buyer_id INTEGER,
      follow_up_date TEXT,
      remarks TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (original_deduction_id) REFERENCES deductions(id),
      FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
      FOREIGN KEY (po_item_id) REFERENCES purchase_order_items(id),
      FOREIGN KEY (buyer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS replace_deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      replacement_id INTEGER NOT NULL,
      deduction_id INTEGER NOT NULL,
      delivery_id INTEGER NOT NULL,
      delivery_item_id INTEGER NOT NULL,
      delivered_qty REAL NOT NULL,
      received_qty REAL NOT NULL,
      re_deduction_qty REAL DEFAULT 0,
      re_deduction_id INTEGER,
      inspector_id INTEGER NOT NULL,
      delivered_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (replacement_id) REFERENCES replacements(id),
      FOREIGN KEY (deduction_id) REFERENCES deductions(id),
      FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
      FOREIGN KEY (delivery_item_id) REFERENCES delivery_items(id),
      FOREIGN KEY (re_deduction_id) REFERENCES deductions(id),
      FOREIGN KEY (inspector_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS stock_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_date TEXT NOT NULL,
      material_code TEXT NOT NULL,
      material_name TEXT NOT NULL,
      category TEXT NOT NULL,
      unit TEXT NOT NULL,
      available_qty REAL NOT NULL,
      quality_issue_qty REAL DEFAULT 0,
      in_inspection_qty REAL DEFAULT 0,
      supplier_id INTEGER,
      po_no TEXT,
      batch_no TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS finance_deductions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period TEXT NOT NULL,
      supplier_id INTEGER NOT NULL,
      deduction_id INTEGER NOT NULL,
      material_name TEXT NOT NULL,
      deduction_qty REAL NOT NULL,
      deduction_value REAL NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unsettled' CHECK(status IN ('unsettled','settled','waived')),
      settled_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (deduction_id) REFERENCES deductions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
    CREATE INDEX IF NOT EXISTS idx_po_date ON purchase_orders(order_date);
    CREATE INDEX IF NOT EXISTS idx_deliveries_po ON deliveries(po_id);
    CREATE INDEX IF NOT EXISTS idx_deliveries_supplier ON deliveries(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_deliveries_date ON deliveries(delivery_date);
    CREATE INDEX IF NOT EXISTS idx_deductions_supplier ON deductions(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_deductions_status ON deductions(status);
    CREATE INDEX IF NOT EXISTS idx_deductions_date ON deductions(created_at);
    CREATE INDEX IF NOT EXISTS idx_returns_supplier ON returns(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
    CREATE INDEX IF NOT EXISTS idx_replacements_supplier ON replacements(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_replacements_status ON replacements(status);
    CREATE INDEX IF NOT EXISTS idx_stock_date ON stock_snapshots(snapshot_date);
  `;

  db.exec(sql);
  db.save();
  console.log('✓ 数据库初始化完成');
  return db;
}

module.exports = {
  openDb,
  initDatabase,
  DB_PATH,
  getDb: openDb
};
