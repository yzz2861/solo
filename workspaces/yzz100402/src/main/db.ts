import initSqlJs from 'sql.js';
import type { Database, SqlJsStatic } from 'sql.js';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;
let dbPath: string = '';
let saveTimer: NodeJS.Timeout | null = null;

async function init(): Promise<SqlJsStatic> {
  if (SQL) return SQL;
  const wasmPath = path.join(
    app.isPackaged
      ? path.join(process.resourcesPath, 'sql.js')
      : path.join(__dirname, '../../node_modules/sql.js/dist')
  );
  const wasmFile = path.join(wasmPath, 'sql-wasm.wasm');
  SQL = await initSqlJs({
    locateFile: () => wasmFile,
  });
  return SQL;
}

export async function getDb(): Promise<Database> {
  if (db) return db;
  const sql = await init();
  const userData = app.getPath('userData');
  const dbDir = path.join(userData, 'clinic-queue');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  dbPath = path.join(dbDir, 'queue.db');
  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    db = new sql.Database(buf);
  } else {
    db = new sql.Database();
  }
  initSchema(db!);
  seedData(db!);
  scheduleSave();
  return db!;
}

function scheduleSave() {
  if (saveTimer) clearInterval(saveTimer);
  saveTimer = setInterval(() => saveToDisk(), 5000);
}

export function saveToDisk() {
  if (!db || !dbPath) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    const tmpPath = dbPath + '.tmp';
    fs.writeFileSync(tmpPath, buffer);
    fs.renameSync(tmpPath, dbPath);
  } catch (e) {
    console.error('Failed to save db:', e);
  }
}

function initSchema(d: Database) {
  d.run(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      id_card TEXT,
      age INTEGER,
      gender TEXT CHECK(gender IN ('男','女')),
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
    CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
    CREATE INDEX IF NOT EXISTS idx_patients_id_card ON patients(id_card);

    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      department_id INTEGER NOT NULL,
      title TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      queue_number TEXT NOT NULL,
      patient_id INTEGER NOT NULL,
      department_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      is_urgent INTEGER NOT NULL DEFAULT 0,
      urgent_reason TEXT,
      is_follow_up INTEGER NOT NULL DEFAULT 0,
      follow_up_note TEXT,
      status TEXT NOT NULL DEFAULT 'waiting',
      check_in_time TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      called_time TEXT,
      called_count INTEGER NOT NULL DEFAULT 0,
      recover_position REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_queue_patient ON queue(patient_id);
    CREATE INDEX IF NOT EXISTS idx_queue_doctor ON queue(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_queue_status ON queue(status);

    CREATE TABLE IF NOT EXISTS call_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      queue_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      from_doctor_id INTEGER,
      to_doctor_id INTEGER,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

function seedData(d: Database) {
  const count = d.exec('SELECT COUNT(*) as c FROM departments');
  if (count.length === 0 || count[0].values[0][0] === 0) {
    const deps: Array<[string, Array<[string, string]>]> = [
      ['内科', [['张伟', '主任医师'], ['李娜', '副主任医师']]],
      ['外科', [['王强', '主任医师'], ['赵敏', '主治医师']]],
      ['儿科', [['陈静', '副主任医师']]],
      ['妇科', [['刘洋', '主治医师']]],
      ['中医科', [['孙磊', '主任医师']]],
    ];
    for (const [depName, docs] of deps) {
      d.run('INSERT INTO departments (name) VALUES (?)', [depName]);
      const rowIdRes = d.exec('SELECT last_insert_rowid() AS id');
      const depId = rowIdRes[0].values[0][0] as number;
      for (const [docName, title] of docs) {
        d.run('INSERT INTO doctors (name, department_id, title) VALUES (?, ?, ?)', [
          docName,
          depId,
          title,
        ]);
      }
    }
  }
}

export function run(db: Database, sql: string, params: unknown[] = []): { lastInsertRowid: number; changes: number } {
  const stmt = db.prepare(sql);
  stmt.bind(params as any[]);
  stmt.step();
  const lastId = (db.exec('SELECT last_insert_rowid() AS id')[0]?.values?.[0]?.[0] as number) || 0;
  const changes = (db.exec('SELECT changes() AS c')[0]?.values?.[0]?.[0] as number) || 0;
  stmt.free();
  return { lastInsertRowid: lastId, changes };
}

export function getOne<T = any>(db: Database, sql: string, params: unknown[] = []): T | null {
  const stmt = db.prepare(sql);
  stmt.bind(params as any[]);
  let result: T | null = null;
  if (stmt.step()) {
    result = stmt.getAsObject() as T;
  }
  stmt.free();
  return result;
}

export function getAll<T = any>(db: Database, sql: string, params: unknown[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params as any[]);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}
