const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'charging.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db;

const saveDB = (sqljsDb) => {
  try {
    const data = sqljsDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (e) {
    console.error('保存数据库失败:', e);
  }
};

const getOne = (sqljsDb, sql, params = []) => {
  const stmt = sqljsDb.prepare(sql);
  stmt.bind(params);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
};

const getAll = (sqljsDb, sql, params = []) => {
  const stmt = sqljsDb.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
};

const runWithInfo = (sqljsDb, sql, params = []) => {
  const stmt = sqljsDb.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
  const lastId = sqljsDb.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0];
  const changes = sqljsDb.exec('SELECT changes() as cnt')[0]?.values[0][0];
  return { lastInsertRowid: lastId, changes: changes };
};

class Statement {
  constructor(sql, database) {
    this.sql = sql;
    this.database = database;
  }

  run(...params) {
    const result = runWithInfo(this.database.db, this.sql, params);
    if (!this.database.inTransaction) {
      saveDB(this.database.db);
    }
    return result;
  }

  get(...params) {
    return getOne(this.database.db, this.sql, params);
  }

  all(...params) {
    return getAll(this.database.db, this.sql, params);
  }
}

class Database {
  constructor(sqljsDb) {
    this.db = sqljsDb;
    this.inTransaction = false;
  }

  prepare(sql) {
    return new Statement(sql, this);
  }

  exec(sql) {
    const result = this.db.exec(sql);
    if (!this.inTransaction) {
      saveDB(this.db);
    }
    return result;
  }

  pragma(_sql) {
  }

  transaction(fn) {
    const self = this;
    return function (...args) {
      const wasInTransaction = self.inTransaction;
      try {
        if (!wasInTransaction) {
          self.db.exec('BEGIN TRANSACTION');
          self.inTransaction = true;
        }
        const result = fn.apply(self, args);
        if (!wasInTransaction) {
          self.db.exec('COMMIT');
          self.inTransaction = false;
          saveDB(self.db);
        }
        return result;
      } catch (e) {
        if (!wasInTransaction && self.inTransaction) {
          try { self.db.exec('ROLLBACK'); } catch (_) {}
          self.inTransaction = false;
        }
        throw e;
      }
    };
  }
}

const loadDB = async () => {
  const SQL = await initSqlJs();

  let sqljsDb;
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    sqljsDb = new SQL.Database(buffer);
  } else {
    sqljsDb = new SQL.Database();
  }

  sqljsDb.exec('PRAGMA foreign_keys = ON');

  db = new Database(sqljsDb);
  initDB(db);
  saveDB(sqljsDb);

  return db;
};

const initDB = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS charging_piles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pile_no TEXT UNIQUE NOT NULL,
      location TEXT NOT NULL,
      pile_type TEXT NOT NULL,
      batch_no TEXT,
      status TEXT NOT NULL DEFAULT 'available',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS repairers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS operators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fault_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      pile_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      reporter TEXT NOT NULL,
      reporter_phone TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      repairer_id INTEGER,
      repair_result TEXT,
      repair_photo TEXT,
      repair_at TEXT,
      reviewer_id INTEGER,
      review_comment TEXT,
      review_at TEXT,
      is_overdue INTEGER DEFAULT 0,
      merged_to_order_id INTEGER,
      deadline TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (pile_id) REFERENCES charging_piles(id),
      FOREIGN KEY (repairer_id) REFERENCES repairers(id),
      FOREIGN KEY (merged_to_order_id) REFERENCES fault_orders(id)
    );

    CREATE TABLE IF NOT EXISTS order_timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      operator TEXT NOT NULL,
      detail TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES fault_orders(id)
    );

    CREATE INDEX IF NOT EXISTS idx_fault_orders_pile ON fault_orders(pile_id);
    CREATE INDEX IF NOT EXISTS idx_fault_orders_status ON fault_orders(status);
    CREATE INDEX IF NOT EXISTS idx_fault_orders_created ON fault_orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_timeline_order ON order_timeline(order_id);
  `);
};

module.exports = { loadDB, getDB: () => db };
