const Database = require('better-sqlite3');
const config = require('../config');
const fs = require('fs');
const path = require('path');

let db;

function initDB() {
  const dataDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createTables();
  createIndexes();

  return db;
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS samples (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      brand TEXT,
      description TEXT,
      value REAL NOT NULL,
      insurance_amount REAL NOT NULL,
      insurance_expiry_date TEXT,
      status TEXT DEFAULT 'in_stock',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      client TEXT,
      shoot_date TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS borrow_records (
      id TEXT PRIMARY KEY,
      sample_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      borrower_name TEXT NOT NULL,
      borrower_role TEXT NOT NULL,
      borrower_contact TEXT,
      planned_out_date TEXT NOT NULL,
      planned_return_date TEXT NOT NULL,
      actual_out_date TEXT,
      actual_return_date TEXT,
      status TEXT DEFAULT 'pending',
      out_verified_by TEXT,
      return_verified_by TEXT,
      has_defect INTEGER DEFAULT 0,
      defect_description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sample_id) REFERENCES samples(id),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      borrow_record_id TEXT NOT NULL,
      photo_type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT,
      uploaded_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (borrow_record_id) REFERENCES borrow_records(id)
    );

    CREATE TABLE IF NOT EXISTS liability_confirmations (
      id TEXT PRIMARY KEY,
      borrow_record_id TEXT NOT NULL,
      confirmer_name TEXT NOT NULL,
      confirmer_role TEXT NOT NULL,
      confirmed_at TEXT DEFAULT (datetime('now')),
      signature TEXT,
      FOREIGN KEY (borrow_record_id) REFERENCES borrow_records(id)
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      related_id TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
)
  `);
}

function createIndexes() {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_samples_status ON samples(status);
    CREATE INDEX IF NOT EXISTS idx_borrow_sample ON borrow_records(sample_id);
    CREATE INDEX IF NOT EXISTS idx_borrow_project ON borrow_records(project_id);
    CREATE INDEX IF NOT EXISTS idx_borrow_status ON borrow_records(status);
    CREATE INDEX IF NOT EXISTS idx_borrow_return_date ON borrow_records(planned_return_date);
    CREATE INDEX IF NOT EXISTS idx_photos_record ON photos(borrow_record_id);
    CREATE INDEX IF NOT EXISTS idx_liability_record ON liability_confirmations(borrow_record_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_read ON reminders(is_read);
    CREATE INDEX IF NOT EXISTS idx_samples_insurance_expiry ON samples(insurance_expiry_date);
  `);
}

function getDB() {
  if (!db) {
    initDB();
  }
  return db;
}

module.exports = { initDB, getDB };
