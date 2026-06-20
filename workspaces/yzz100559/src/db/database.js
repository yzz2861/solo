const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'parking.db');
const db = new sqlite3.Database(dbPath);

class DatabaseWrapper {
  constructor(db) {
    this.db = db;
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  exec(sql) {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  prepare(sql) {
    const stmt = this.db.prepare(sql);
    return {
      run: (...params) => {
        return new Promise((resolve, reject) => {
          stmt.run(...params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
          });
        });
      },
      get: (...params) => {
        return new Promise((resolve, reject) => {
          stmt.get(...params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
      },
      all: (...params) => {
        return new Promise((resolve, reject) => {
          stmt.all(...params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
      },
      finalize: () => {
        return new Promise((resolve, reject) => {
          stmt.finalize((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    };
  }

  serialize(callback) {
    this.db.serialize(callback);
  }
}

const dbWrapper = new DatabaseWrapper(db);

async function initDatabase() {
  await dbWrapper.exec(`
    CREATE TABLE IF NOT EXISTS car_owners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_no TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      company TEXT,
      floor TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS monthly_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_no TEXT UNIQUE NOT NULL,
      owner_id INTEGER NOT NULL,
      plate_number TEXT NOT NULL,
      card_type TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'active',
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      original_end_date DATE,
      monthly_fee REAL NOT NULL DEFAULT 300,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES car_owners(id)
    );

    CREATE TABLE IF NOT EXISTS extension_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_no TEXT UNIQUE NOT NULL,
      card_id INTEGER NOT NULL,
      owner_id INTEGER NOT NULL,
      reason_type TEXT NOT NULL,
      reason_detail TEXT,
      extension_days INTEGER NOT NULL,
      extension_source TEXT NOT NULL DEFAULT 'manual',
      status TEXT NOT NULL DEFAULT 'pending',
      original_end_date DATE NOT NULL,
      new_end_date DATE NOT NULL,
      fee_amount REAL NOT NULL DEFAULT 0,
      fee_calc_detail TEXT,
      operator TEXT,
      merged_from TEXT,
      parent_application_no TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (card_id) REFERENCES monthly_cards(id),
      FOREIGN KEY (owner_id) REFERENCES car_owners(id)
    );

    CREATE TABLE IF NOT EXISTS plate_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      change_no TEXT UNIQUE NOT NULL,
      card_id INTEGER NOT NULL,
      owner_id INTEGER NOT NULL,
      old_plate TEXT NOT NULL,
      new_plate TEXT NOT NULL,
      reason TEXT,
      operator TEXT,
      effective_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (card_id) REFERENCES monthly_cards(id),
      FOREIGN KEY (owner_id) REFERENCES car_owners(id)
    );

    CREATE TABLE IF NOT EXISTS fee_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_no TEXT UNIQUE NOT NULL,
      card_id INTEGER NOT NULL,
      owner_id INTEGER NOT NULL,
      transaction_type TEXT NOT NULL,
      amount REAL NOT NULL,
      direction TEXT NOT NULL,
      related_type TEXT,
      related_no TEXT,
      calc_detail TEXT,
      operator TEXT,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (card_id) REFERENCES monthly_cards(id),
      FOREIGN KEY (owner_id) REFERENCES car_owners(id)
    );

    CREATE TABLE IF NOT EXISTS refund_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      refund_no TEXT UNIQUE NOT NULL,
      card_id INTEGER NOT NULL,
      owner_id INTEGER NOT NULL,
      refund_days INTEGER NOT NULL,
      refund_amount REAL NOT NULL,
      reason TEXT,
      original_end_date DATE,
      new_end_date DATE,
      operator TEXT,
      status TEXT NOT NULL DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (card_id) REFERENCES monthly_cards(id),
      FOREIGN KEY (owner_id) REFERENCES car_owners(id)
    );

    CREATE TABLE IF NOT EXISTS manual_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      adjustment_no TEXT UNIQUE NOT NULL,
      card_id INTEGER NOT NULL,
      owner_id INTEGER NOT NULL,
      adjust_type TEXT NOT NULL,
      adjust_days INTEGER,
      adjust_amount REAL,
      old_end_date DATE,
      new_end_date DATE,
      reason TEXT NOT NULL,
      operator TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (card_id) REFERENCES monthly_cards(id),
      FOREIGN KEY (owner_id) REFERENCES car_owners(id)
    );
  `);

  try {
    await dbWrapper.run('CREATE INDEX IF NOT EXISTS idx_monthly_cards_plate ON monthly_cards(plate_number)');
    await dbWrapper.run('CREATE INDEX IF NOT EXISTS idx_monthly_cards_status ON monthly_cards(status)');
    await dbWrapper.run('CREATE INDEX IF NOT EXISTS idx_extension_card ON extension_applications(card_id)');
    await dbWrapper.run('CREATE INDEX IF NOT EXISTS idx_extension_status ON extension_applications(status)');
    await dbWrapper.run('CREATE INDEX IF NOT EXISTS idx_fee_card ON fee_transactions(card_id)');
    await dbWrapper.run('CREATE INDEX IF NOT EXISTS idx_fee_type ON fee_transactions(transaction_type)');
    await dbWrapper.run('CREATE INDEX IF NOT EXISTS idx_plate_change_card ON plate_changes(card_id)');
  } catch (e) {
    console.warn('索引创建可能已存在', e.message);
  }
}

module.exports = { db: dbWrapper, initDatabase };
