import sqlite3 from 'sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import { promisify } from 'util'
import * as uuid from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, '..', '..', 'data', 'app.db')

let dbInstance: sqlite3.Database | null = null

export const getDb = (): sqlite3.Database => {
  if (!dbInstance) {
    dbInstance = new sqlite3.Database(dbPath)
  }
  return dbInstance
}

export const initDb = async (): Promise<void> => {
  const db = getDb()

  const runAsync = promisify(db.run.bind(db))

  await runAsync(`
    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('cs', 'tech', 'admin')),
      phone TEXT NOT NULL
    )
  `)

  await runAsync(`
    CREATE TABLE IF NOT EXISTS work_orders (
      id TEXT PRIMARY KEY,
      source_text TEXT NOT NULL,
      community TEXT,
      building TEXT,
      room_number TEXT,
      problem_type TEXT,
      urgency TEXT CHECK (urgency IN ('low', 'medium', 'high')),
      callback_sentence TEXT,
      is_confirmed BOOLEAN DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'processing', 'completed')),
      assignee_id TEXT REFERENCES staff(id),
      dispatcher_id TEXT REFERENCES staff(id),
      short_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await runAsync(`
    CREATE TABLE IF NOT EXISTS suspicion_tags (
      id TEXT PRIMARY KEY,
      work_order_id TEXT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('unclear', 'multiple', 'nickname', 'date_ambiguous')),
      description TEXT NOT NULL,
      source_text TEXT NOT NULL,
      resolved BOOLEAN DEFAULT 0,
      resolver_note TEXT
    )
  `)

  await runAsync(`
    CREATE TABLE IF NOT EXISTS evidence_sentences (
      id TEXT PRIMARY KEY,
      work_order_id TEXT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
      original TEXT NOT NULL,
      corrected TEXT,
      field TEXT NOT NULL
    )
  `)

  await runAsync(`
    CREATE TABLE IF NOT EXISTS version_entries (
      id TEXT PRIMARY KEY,
      work_order_id TEXT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      editor_id TEXT NOT NULL,
      editor_name TEXT NOT NULL,
      changes_json TEXT NOT NULL,
      note TEXT
    )
  `)

  await runAsync(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON work_orders(status)`)
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON work_orders(assignee_id)`)
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_suspicion_resolved ON suspicion_tags(resolved)`)

  const staffData = [
    { id: 'cs001', name: '王客服', role: 'cs', phone: '13800000001' },
    { id: 'cs002', name: '李客服', role: 'cs', phone: '13800000002' },
    { id: 'tech001', name: '张师傅', role: 'tech', phone: '13900000001' },
    { id: 'tech002', name: '刘师傅', role: 'tech', phone: '13900000002' },
    { id: 'tech003', name: '陈师傅', role: 'tech', phone: '13900000003' },
    { id: 'admin001', name: '赵主管', role: 'admin', phone: '13700000001' },
  ]

  const getAsync = promisify(db.get.bind(db))
  const insertAsync = promisify(db.run.bind(db))

  for (const staff of staffData) {
    const existing = await getAsync('SELECT id FROM staff WHERE id = ?', [staff.id]) as { id: string } | undefined
    if (!existing) {
      await insertAsync(
        'INSERT INTO staff (id, name, role, phone) VALUES (?, ?, ?, ?)',
        [staff.id, staff.name, staff.role, staff.phone]
      )
    }
  }
}

export const runQuery = async <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
  const db = getDb()
  const allAsync = promisify(db.all.bind(db))
  return (await allAsync(sql, params)) as T[]
}

export const runExec = async (sql: string, params: unknown[] = []): Promise<{ lastID: string; changes: number }> => {
  const db = getDb()
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err)
      else resolve({ lastID: String(this.lastID), changes: this.changes })
    })
  })
}

export const getOne = async <T>(sql: string, params: unknown[] = []): Promise<T | null> => {
  const db = getDb()
  const getAsync = promisify(db.get.bind(db))
  const result = await getAsync(sql, params)
  return (result || null) as T | null
}

export { uuid }
