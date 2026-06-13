const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DB_DIR, 'court_reservation.db');

let dbInstance = null;
let SQL = null;

async function initSql() {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  return SQL;
}

function ensureDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

async function getDb() {
  if (dbInstance) {
    return {
      prepare,
      run,
      exec,
      pragma() {},
      close: closeDb
    };
  }

  const Sql = await initSql();
  ensureDir();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    dbInstance = new Sql.Database(fileBuffer);
  } else {
    dbInstance = new Sql.Database();
  }

  return {
    prepare,
    run,
    exec,
    pragma() {},
    close: closeDb
  };
}

function saveDb() {
  if (!dbInstance) return;
  ensureDir();
  const data = dbInstance.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

const SAVE_INTERVAL = 5000;
let saveTimer = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try { saveDb(); } catch (e) { console.error('自动保存失败:', e.message); }
  }, SAVE_INTERVAL);
}

function closeDb() {
  if (dbInstance) {
    try { saveDb(); } catch (e) {}
    dbInstance.close();
    dbInstance = null;
  }
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
}

function run(sql, params = []) {
  if (!dbInstance) throw new Error('数据库未初始化');
  const stmt = dbInstance.prepare(sql);
  stmt.bind(params);
  let result;
  try {
    result = stmt.step();
    while (stmt.step()) {}
  } catch (e) {
    if (!e.message.includes('done')) {
      throw e;
    }
  }
  stmt.free();
  scheduleSave();
  return {
    lastInsertRowid: dbInstance.exec('SELECT last_insert_rowid() as id')[0]?.values?.[0]?.[0],
    changes: dbInstance.getRowsModified()
  };
}

function prepare(sql) {
  if (!dbInstance) throw new Error('数据库未初始化');
  const stmt = dbInstance.prepare(sql);

  return {
    run(...params) {
      const p = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
      stmt.reset();
      stmt.bind(p);
      try {
        while (stmt.step()) {}
      } catch (e) {
        if (!e.message.includes('done')) throw e;
      }
      scheduleSave();
      return {
        lastInsertRowid: dbInstance.exec('SELECT last_insert_rowid() as id')[0]?.values?.[0]?.[0],
        changes: dbInstance.getRowsModified()
      };
    },
    get(...params) {
      const p = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
      stmt.reset();
      stmt.bind(p);
      try {
        const hasRow = stmt.step();
        if (hasRow) {
          const row = stmt.getAsObject();
          try { while (stmt.step()) {} } catch (e) {}
          return _camelCaseKeys(row);
        }
        return undefined;
      } catch (e) {
        if (e.message.includes('done')) return undefined;
        throw e;
      }
    },
    all(...params) {
      const p = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
      stmt.reset();
      stmt.bind(p);
      const results = [];
      try {
        while (stmt.step()) {
          results.push(_camelCaseKeys(stmt.getAsObject()));
        }
      } catch (e) {
        if (!e.message.includes('done')) throw e;
      }
      return results;
    },
    free() {
      try { stmt.free(); } catch (e) {}
    }
  };
}

function _camelCaseKeys(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(_camelCaseKeys);
  const result = {};
  for (const key of Object.keys(obj)) {
    result[key] = obj[key];
  }
  return result;
}

function exec(sql) {
  if (!dbInstance) throw new Error('数据库未初始化');
  const results = dbInstance.exec(sql);
  scheduleSave();
  return results;
}

async function initDb() {
  await getDb();

  const txStatements = [
    `CREATE TABLE IF NOT EXISTS cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_number TEXT UNIQUE NOT NULL,
      case_name TEXT NOT NULL,
      case_type TEXT NOT NULL,
      presiding_judge TEXT,
      sensitive_remark TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS courtrooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      location TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS seat_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT UNIQUE NOT NULL,
      description TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS hearings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id INTEGER NOT NULL,
      courtroom_id INTEGER NOT NULL,
      hearing_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      change_reason TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS hearing_seats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hearing_id INTEGER NOT NULL,
      seat_type_id INTEGER NOT NULL,
      total_seats INTEGER NOT NULL DEFAULT 0,
      reserved_seats INTEGER NOT NULL DEFAULT 0,
      UNIQUE(hearing_id, seat_type_id)
    )`,
    `CREATE TABLE IF NOT EXISTS applicants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_card TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      organization TEXT,
      applicant_type TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hearing_id INTEGER NOT NULL,
      applicant_id INTEGER NOT NULL,
      seat_type_id INTEGER NOT NULL,
      apply_source TEXT NOT NULL,
      review_status TEXT NOT NULL DEFAULT 'pending',
      review_reason TEXT,
      reviewer TEXT,
      reviewed_at TEXT,
      verification_status TEXT NOT NULL DEFAULT 'unverified',
      verified_at TEXT,
      merged_to_id INTEGER,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_reservations_hearing ON reservations(hearing_id)`,
    `CREATE INDEX IF NOT EXISTS idx_reservations_applicant ON reservations(applicant_id)`,
    `CREATE INDEX IF NOT EXISTS idx_hearings_date ON hearings(hearing_date)`,
    `CREATE INDEX IF NOT EXISTS idx_hearings_status ON hearings(status)`
  ];

  for (const s of txStatements) {
    try { exec(s); } catch (e) { console.warn('SQL警告:', e.message, s.slice(0,60)); }
  }

  const seatTypeCount = prepare('SELECT COUNT(*) as cnt FROM seat_types').get();
  if (!seatTypeCount || seatTypeCount.cnt === 0) {
    const insertSeatType = prepare(
      'INSERT INTO seat_types (code, name, description) VALUES (?, ?, ?)'
    );
    insertSeatType.run('PUBLIC', '群众', '群众公开旁听席位');
    insertSeatType.run('MEDIA', '媒体', '新闻媒体记者席位');
    insertSeatType.run('INTERNAL', '内部', '法院内部人员席位');
  }

  const courtroomCount = prepare('SELECT COUNT(*) as cnt FROM courtrooms').get();
  if (!courtroomCount || courtroomCount.cnt === 0) {
    const insertCourtroom = prepare(
      'INSERT INTO courtrooms (name, location) VALUES (?, ?)'
    );
    insertCourtroom.run('第一法庭', 'A区3楼301');
    insertCourtroom.run('第二法庭', 'A区3楼302');
    insertCourtroom.run('第三法庭', 'B区2楼205');
    insertCourtroom.run('少年法庭', 'C区1楼108');
  }

  saveDb();
  return { prepare, run, exec, getDb, closeDb, saveDb };
}

process.on('SIGTERM', () => { closeDb(); process.exit(0); });
process.on('SIGINT', () => { closeDb(); process.exit(0); });
process.on('beforeExit', () => { try { saveDb(); } catch (e) {} });

module.exports = {
  getDb,
  closeDb,
  initDb,
  prepare,
  run,
  exec,
  saveDb,
  DB_PATH
};
