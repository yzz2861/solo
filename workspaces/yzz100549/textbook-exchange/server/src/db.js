const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');

const dbPath = path.join(__dirname, '..', 'data', 'textbook.db');
let db = null;

async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS sellers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      student_id TEXT,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS textbooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      course_id INTEGER,
      edition TEXT,
      condition TEXT NOT NULL DEFAULT 'good',
      price REAL NOT NULL,
      seller_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'on_shelf',
      version_note TEXT,
      trade_in_value REAL DEFAULT 0,
      locked_by TEXT,
      locked_at TEXT,
      picked_up_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      textbook_id INTEGER NOT NULL,
      buyer_name TEXT NOT NULL,
      buyer_phone TEXT,
      buyer_student_id TEXT,
      version_confirmed INTEGER DEFAULT 0,
      pickup_code TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      actual_price REAL NOT NULL,
      trade_in_used INTEGER DEFAULT 0,
      trade_in_textbook_id INTEGER,
      remark TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_id INTEGER NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      textbook_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      settled_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS activity_config (
      id INTEGER PRIMARY KEY,
      activity_name TEXT NOT NULL DEFAULT '二手教材置换活动',
      lock_expire_hours INTEGER NOT NULL DEFAULT 24,
      pickup_expire_hours INTEGER NOT NULL DEFAULT 48,
      pickup_location TEXT,
      status TEXT NOT NULL DEFAULT 'active'
    );
  `);

  const configCount = db.exec('SELECT COUNT(*) as cnt FROM activity_config')[0]?.values[0][0] || 0;
  if (configCount === 0) {
    const now = dayjs().format();
    db.run(`
      INSERT INTO activity_config (id, activity_name, lock_expire_hours, pickup_expire_hours, pickup_location, status)
      VALUES (1, '二手教材置换活动', 24, 48, '学生会办公室', 'active')
    `);
  }

  const courseCount = db.exec('SELECT COUNT(*) as cnt FROM courses')[0]?.values[0][0] || 0;
  if (courseCount === 0) {
    const now = dayjs().format();
    ['高等数学', '大学英语', '线性代数', '计算机基础', '物理', '化学'].forEach(name => {
      db.run('INSERT INTO courses (name, created_at) VALUES (?, ?)', [name, now]);
    });
  }

  saveDb();
}

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(dbPath, buffer);
}

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  
  const results = [];
  const columns = stmt.getColumnNames();
  
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(row);
  }
  
  stmt.free();
  return results;
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
  
  const lastId = db.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0] || 0;
  const changes = db.exec('SELECT changes() as cnt')[0]?.values[0][0] || 0;
  
  return { lastInsertRowid: lastId, changes: changes };
}

function get(sql, params = []) {
  const results = query(sql, params);
  return results[0] || null;
}

function all(sql, params = []) {
  return query(sql, params);
}

function prepare(sql) {
  return {
    run: function(...args) {
      const result = run(sql, args);
      return result;
    },
    get: function(...args) {
      return get(sql, args);
    },
    all: function(...args) {
      return all(sql, args);
    },
  };
}

function transaction(fn) {
  db.run('BEGIN TRANSACTION');
  try {
    const result = fn();
    db.run('COMMIT');
    saveDb();
    return result;
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
}

module.exports = {
  initDb,
  prepare,
  run,
  get,
  all,
  query,
  transaction,
  saveDb,
};
