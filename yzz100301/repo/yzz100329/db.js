const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let db = null;
const dbPath = path.join(__dirname, 'data', 'inspection.db');

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

async function initDB() {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS poles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pole_no TEXT UNIQUE NOT NULL,
      location TEXT,
      road_name TEXT,
      light_type TEXT,
      power_watt INTEGER,
      install_date TEXT,
      status TEXT DEFAULT '正常',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inspections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inspection_no TEXT UNIQUE NOT NULL,
      pole_no TEXT NOT NULL,
      inspect_date TEXT NOT NULL,
      inspector TEXT,
      fault_type TEXT,
      fault_description TEXT,
      fault_level TEXT DEFAULT '一般',
      import_batch TEXT,
      status TEXT DEFAULT '待派单',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dispatches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dispatch_no TEXT UNIQUE NOT NULL,
      inspection_id INTEGER NOT NULL,
      pole_no TEXT NOT NULL,
      dispatch_date TEXT NOT NULL,
      dispatcher TEXT,
      repair_team TEXT,
      deadline TEXT,
      import_batch TEXT,
      status TEXT DEFAULT '待完工',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      completion_no TEXT UNIQUE NOT NULL,
      dispatch_id INTEGER,
      pole_no TEXT NOT NULL,
      complete_date TEXT NOT NULL,
      repairer TEXT,
      repair_content TEXT,
      parts_used TEXT,
      work_hours REAL,
      import_batch TEXT,
      status TEXT DEFAULT '待复核',
      review_opinion TEXT,
      reviewer TEXT,
      review_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS import_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_no TEXT UNIQUE NOT NULL,
      data_type TEXT NOT NULL,
      file_name TEXT,
      record_count INTEGER DEFAULT 0,
      import_time TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_inspections_pole ON inspections(pole_no);
    CREATE INDEX IF NOT EXISTS idx_dispatches_pole ON dispatches(pole_no);
    CREATE INDEX IF NOT EXISTS idx_dispatches_inspection ON dispatches(inspection_id);
    CREATE INDEX IF NOT EXISTS idx_completions_pole ON completions(pole_no);
    CREATE INDEX IF NOT EXISTS idx_completions_dispatch ON completions(dispatch_id);
  `);

  saveDB();
}

function prepare(sql) {
  const stmt = db.prepare(sql);

  return {
    run: function(...params) {
      stmt.bind(params);
      stmt.step();
      stmt.reset();
      const changes = db.getRowsModified();
      saveDB();
      return { changes };
    },
    get: function(...params) {
      stmt.bind(params);
      let result = null;
      if (stmt.step()) {
        result = stmt.getAsObject();
      }
      stmt.reset();
      return result;
    },
    all: function(...params) {
      stmt.bind(params);
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.reset();
      return results;
    },
    free: function() {
      stmt.free();
    }
  };
}

function exec(sql, params = []) {
  if (params.length === 0) {
    db.run(sql);
  } else {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
  }
  saveDB();
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

function transaction(fn) {
  db.run('BEGIN TRANSACTION');
  try {
    fn();
    db.run('COMMIT');
    saveDB();
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
}

module.exports = {
  init: initDB,
  prepare,
  exec,
  query: queryAll,
  queryOne,
  transaction,
  save: saveDB
};
