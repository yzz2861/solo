const initSqlJs = require('sql.js')
const path = require('path')
const fs = require('fs')

let db = null
let SQL = null
let userDataPath = null

function setUserDataPath(p) {
  userDataPath = p
}

function getDbPath() {
  const basePath = userDataPath || (
    process.env.NODE_ENV === 'development'
      ? process.cwd()
      : path.dirname(process.execPath)
  )
  const dbDir = path.join(basePath, 'data')
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
  return path.join(dbDir, 'canteen_tickets.db')
}

function getWasmPath() {
  try {
    const sqlJsDist = path.dirname(require.resolve('sql.js'))
    const wasmPath = path.join(sqlJsDist, 'sql-wasm.wasm')
    if (fs.existsSync(wasmPath)) return wasmPath
  } catch (e) {}
  return path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
}

function saveToDisk() {
  if (!db) return
  try {
    const dbPath = getDbPath()
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
  } catch (e) {
    console.error('保存数据库失败:', e)
  }
}

function autoSave() {
  setInterval(saveToDisk, 5000)
}

function prepare(sql) {
  const stmt = {
    sql,
    run: function (...params) {
      const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params
      try {
        db.run(sql, flatParams)
        saveToDisk()
        const info = {
          lastInsertRowid: db.exec('SELECT last_insert_rowid() as id')[0]?.values?.[0]?.[0] || 0,
          changes: db.getRowsModified ? db.getRowsModified() : 0
        }
        return info
      } catch (e) {
        console.error('SQL Error:', sql, params, e.message)
        throw e
      }
    },
    get: function (...params) {
      const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params
      try {
        const results = db.exec(sql, flatParams)
        if (!results || results.length === 0 || results[0].values.length === 0) {
          return undefined
        }
        const columns = results[0].columns
        const values = results[0].values[0]
        const row = {}
        columns.forEach((col, i) => { row[col] = values[i] })
        return row
      } catch (e) {
        console.error('SQL Error:', sql, params, e.message)
        throw e
      }
    },
    all: function (...params) {
      const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params
      try {
        const results = db.exec(sql, flatParams)
        if (!results || results.length === 0) {
          return []
        }
        const columns = results[0].columns
        return results[0].values.map(values => {
          const row = {}
          columns.forEach((col, i) => { row[col] = values[i] })
          return row
        })
      } catch (e) {
        console.error('SQL Error:', sql, params, e.message)
        throw e
      }
    }
  }
  return stmt
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS elderly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      id_card TEXT UNIQUE,
      phone TEXT,
      address TEXT,
      age INTEGER,
      gender TEXT CHECK(gender IN ('男', '女')),
      contact_person TEXT,
      contact_phone TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ticket_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      meal_type TEXT CHECK(meal_type IN ('早餐', '午餐', '晚餐', '通用')) NOT NULL DEFAULT '通用',
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subsidies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      elderly_id INTEGER NOT NULL,
      ticket_type_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      used_quantity INTEGER DEFAULT 0,
      valid_from TEXT NOT NULL,
      valid_to TEXT NOT NULL,
      subsidy_type TEXT CHECK(subsidy_type IN ('民政补贴', '其他')) DEFAULT '民政补贴',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      elderly_id INTEGER NOT NULL,
      ticket_type_id INTEGER NOT NULL,
      transaction_type TEXT CHECK(transaction_type IN ('purchase', 'redeem', 'refund')) NOT NULL,
      payment_type TEXT CHECK(payment_type IN ('cash', 'subsidy', 'credit', 'free')) NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_amount REAL NOT NULL,
      meal_type TEXT,
      meal_date TEXT,
      operator TEXT,
      handler_name TEXT,
      subsidy_id INTEGER,
      related_transaction_id INTEGER,
      status TEXT CHECK(status IN ('active', 'redeemed', 'refunded', 'cancelled')) DEFAULT 'active',
      redeem_time TEXT,
      refund_reason TEXT,
      refund_time TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS credit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      elderly_id INTEGER NOT NULL,
      transaction_id INTEGER,
      credit_type TEXT CHECK(credit_type IN ('borrow', 'repay')) NOT NULL,
      amount REAL NOT NULL,
      balance REAL NOT NULL,
      operator TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_elderly_name ON elderly(name);
    CREATE INDEX IF NOT EXISTS idx_transactions_elderly ON transactions(elderly_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(created_at);
    CREATE INDEX IF NOT EXISTS idx_subsidies_elderly ON subsidies(elderly_id);
    CREATE INDEX IF NOT EXISTS idx_credit_elderly ON credit(elderly_id);
  `)
}

function seedInitialData() {
  const result = prepare('SELECT COUNT(*) as count FROM settings WHERE key = ?').get('credit_limit')
  if (!result || result.count === 0) {
    prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('credit_limit', '200')
  }

  const ticketCount = prepare('SELECT COUNT(*) as count FROM ticket_types').get()
  if (!ticketCount || ticketCount.count === 0) {
    prepare('INSERT INTO ticket_types (name, price, meal_type, description) VALUES (?, ?, ?, ?)').run('早餐票', 5, '早餐', '早餐专用')
    prepare('INSERT INTO ticket_types (name, price, meal_type, description) VALUES (?, ?, ?, ?)').run('午餐票', 10, '午餐', '午餐专用')
    prepare('INSERT INTO ticket_types (name, price, meal_type, description) VALUES (?, ?, ?, ?)').run('晚餐票', 10, '晚餐', '晚餐专用')
    prepare('INSERT INTO ticket_types (name, price, meal_type, description) VALUES (?, ?, ?, ?)').run('通用餐票', 10, '通用', '任意餐次通用')
  }
}

async function initDatabase() {
  const wasmPath = getWasmPath()
  console.log('[数据库] WASM 路径:', wasmPath)
  SQL = await initSqlJs({
    locateFile: file => {
      if (file === 'sql-wasm.wasm') return wasmPath
      return file
    }
  })
  const dbPath = getDbPath()
  console.log('[数据库] 数据库路径:', dbPath)

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  createTables()
  seedInitialData()
  saveToDisk()
  autoSave()

  return {
    prepare,
    exec: (sql) => {
      db.exec(sql)
      saveToDisk()
    },
    pragma: () => {},
    transaction: (fn) => {
      return (...args) => {
        db.exec('BEGIN TRANSACTION')
        try {
          const result = fn(...args)
          db.exec('COMMIT')
          saveToDisk()
          return result
        } catch (e) {
          db.exec('ROLLBACK')
          throw e
        }
      }
    },
    close: () => {
      saveToDisk()
      db.close()
    }
  }
}

function getDb() {
  if (!db) {
    throw new Error('数据库未初始化')
  }
  return {
    prepare,
    exec: (sql) => {
      db.exec(sql)
      saveToDisk()
    },
    pragma: () => {},
    transaction: (fn) => {
      return (...args) => {
        db.exec('BEGIN TRANSACTION')
        try {
          const result = fn(...args)
          db.exec('COMMIT')
          saveToDisk()
          return result
        } catch (e) {
          db.exec('ROLLBACK')
          throw e
        }
      }
    }
  }
}

module.exports = {
  initDatabase,
  getDb,
  getDbPath,
  setUserDataPath
}
