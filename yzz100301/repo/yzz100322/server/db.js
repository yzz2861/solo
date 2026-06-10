const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let db = null;
let SQL = null;

const dbPath = path.join(__dirname, '..', 'data', 'audit.db');

async function initDB() {
  if (db) return db;

  SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
    createTables();
    saveDB();
  }

  try {
    db.run('PRAGMA journal_mode = WAL');
  } catch (e) {}
  
  try {
    db.run('PRAGMA foreign_keys = ON');
  } catch (e) {}

  return db;
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservation_no TEXT UNIQUE NOT NULL,
      plate_number TEXT NOT NULL,
      visitor_name TEXT,
      visitor_phone TEXT,
      visit_purpose TEXT,
      visit_date TEXT NOT NULL,
      expected_start TEXT,
      expected_end TEXT,
      host_department TEXT,
      host_name TEXT,
      status TEXT DEFAULT 'active',
      import_batch TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS recognitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plate_number TEXT NOT NULL,
      recognize_time TEXT NOT NULL,
      gate TEXT,
      direction TEXT,
      image_url TEXT,
      confidence REAL,
      import_batch TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS manual_releases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plate_number TEXT,
      reservation_no TEXT,
      release_time TEXT NOT NULL,
      gate TEXT,
      operator TEXT NOT NULL,
      reason TEXT,
      visitor_name TEXT,
      import_batch TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS visit_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservation_id INTEGER,
      recognition_id INTEGER,
      manual_release_id INTEGER,
      reservation_no TEXT,
      plate_number TEXT,
      visitor_name TEXT,
      visit_date TEXT,
      expected_start TEXT,
      expected_end TEXT,
      recognize_time TEXT,
      release_time TEXT,
      release_type TEXT,
      gate TEXT,
      operator TEXT,
      host_department TEXT,
      host_name TEXT,
      visit_purpose TEXT,
      has_reservation INTEGER DEFAULT 0,
      has_recognition INTEGER DEFAULT 0,
      has_manual_release INTEGER DEFAULT 0,
      plate_matched INTEGER DEFAULT 1,
      is_overtime INTEGER DEFAULT 0,
      audit_status TEXT DEFAULT 'pending',
      audit_opinion TEXT,
      audit_time TEXT,
      auditor TEXT,
      import_key TEXT UNIQUE,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS import_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_no TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      file_name TEXT,
      record_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'completed',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_reservations_no ON reservations(reservation_no)');
  db.run('CREATE INDEX IF NOT EXISTS idx_reservations_plate ON reservations(plate_number)');
  db.run('CREATE INDEX IF NOT EXISTS idx_recognitions_plate ON recognitions(plate_number)');
  db.run('CREATE INDEX IF NOT EXISTS idx_recognitions_time ON recognitions(recognize_time)');
  db.run('CREATE INDEX IF NOT EXISTS idx_manual_plate ON manual_releases(plate_number)');
  db.run('CREATE INDEX IF NOT EXISTS idx_manual_time ON manual_releases(release_time)');
  db.run('CREATE INDEX IF NOT EXISTS idx_visit_plate ON visit_records(plate_number)');
  db.run('CREATE INDEX IF NOT EXISTS idx_visit_reservation ON visit_records(reservation_no)');
  db.run('CREATE INDEX IF NOT EXISTS idx_visit_date ON visit_records(visit_date)');
  db.run('CREATE INDEX IF NOT EXISTS idx_visit_audit ON visit_records(audit_status)');
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function prepare(sql) {
  return {
    run: function(...params) {
      const flatParams = params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0])
        ? Object.values(params[0])
        : params.flat();
      
      const stmt = db.prepare(sql);
      stmt.bind(flatParams);
      stmt.step();
      stmt.free();
      
      saveDB();
      
      return {
        changes: db.getRowsModified ? db.getRowsModified() : 1,
        lastInsertRowid: 0
      };
    },
    get: function(...params) {
      const flatParams = params.flat();
      const stmt = db.prepare(sql);
      stmt.bind(flatParams);
      
      let result = undefined;
      if (stmt.step()) {
        result = stmt.getAsObject();
      }
      stmt.free();
      
      return result;
    },
    all: function(...params) {
      const flatParams = params.flat();
      const stmt = db.prepare(sql);
      stmt.bind(flatParams);
      
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      
      return results;
    }
  };
}

function exec(sql) {
  db.run(sql);
  saveDB();
}

module.exports = {
  initDB,
  prepare,
  exec,
  getDB: () => db,
  saveDB
};
