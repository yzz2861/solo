import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { logger } from '../utils/logger';

let db: SqlJsDatabase | null = null;
let dbReady = false;

async function initSqlJsDb(): Promise<SqlJsDatabase> {
  const SQL = await initSqlJs({
    locateFile: (file: string) => {
      const localPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file);
      if (fs.existsSync(localPath)) {
        return localPath;
      }
      return `https://sql.js.org/dist/${file}`;
    }
  });

  const dbDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  let database: SqlJsDatabase;
  if (fs.existsSync(config.dbPath)) {
    const fileBuffer = fs.readFileSync(config.dbPath);
    database = new SQL.Database(fileBuffer);
    logger.info(`Database loaded from ${config.dbPath}`);
  } else {
    database = new SQL.Database();
    logger.info(`New database created`);
  }

  return database;
}

export async function initializeDatabase(): Promise<void> {
  if (dbReady && db) return;
  db = await initSqlJsDb();
  initializeSchema();
  saveDatabase();
  dbReady = true;
  logger.info('Database initialized successfully');
}

export function getDatabase(): SqlJsDatabase {
  if (!db || !dbReady) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export function saveDatabase(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  const dbDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  fs.writeFileSync(config.dbPath, buffer);
}

function run(sql: string, params: any[] = []): { lastInsertRowid: number; changes: number } {
  if (!db) throw new Error('DB not ready');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  const changes = db.getRowsModified();
  stmt.free();
  const lastInsertRowid = (db as any).exec ? 0 : 0;
  const rowIdResult = db.exec('SELECT last_insert_rowid() as id');
  const finalRowId = rowIdResult.length > 0 && rowIdResult[0].values.length > 0
    ? Number(rowIdResult[0].values[0][0])
    : 0;
  return { lastInsertRowid: finalRowId, changes };
}

function getOne<T = any>(sql: string, params: any[] = []): T | null {
  if (!db) throw new Error('DB not ready');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let result: T | null = null;
  if (stmt.step()) {
    result = stmt.getAsObject() as T;
  }
  stmt.free();
  return result;
}

function getAll<T = any>(sql: string, params: any[] = []): T[] {
  if (!db) throw new Error('DB not ready');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

function initializeSchema(): void {
  if (!db) return;

  const statements = [
    `CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      id_card_no TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      contact_person TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('receptionist', 'customer_service', 'supervisor')),
      employee_no TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS report_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_no TEXT NOT NULL UNIQUE,
      patient_id INTEGER NOT NULL,
      patient_name TEXT NOT NULL,
      patient_id_card_no TEXT NOT NULL,
      is_group INTEGER NOT NULL DEFAULT 0,
      company_id INTEGER,
      company_name TEXT,
      status TEXT NOT NULL DEFAULT 'ready' CHECK(status IN ('pending', 'ready', 'picked_up', 'mailed')),
      report_ready_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS authorizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_batch_id INTEGER NOT NULL,
      batch_no TEXT NOT NULL,
      pickup_method TEXT NOT NULL CHECK(pickup_method IN ('self', 'authorized', 'mail')),
      authorized_type TEXT CHECK(authorized_type IN ('family', 'company')),
      authorized_person_name TEXT,
      authorized_person_id_card TEXT,
      authorized_person_phone TEXT,
      authorization_material TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'revoked', 'expired', 'used')),
      created_by INTEGER NOT NULL,
      created_by_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS authorization_revokes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      authorization_id INTEGER NOT NULL,
      revoked_by INTEGER NOT NULL,
      revoked_by_name TEXT NOT NULL,
      reason TEXT NOT NULL,
      revoked_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS pickup_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_batch_id INTEGER NOT NULL,
      batch_no TEXT NOT NULL,
      authorization_id INTEGER,
      pickup_method TEXT NOT NULL CHECK(pickup_method IN ('self', 'authorized', 'mail')),
      pickup_person_name TEXT NOT NULL,
      pickup_person_id_card TEXT NOT NULL,
      picked_up_by INTEGER NOT NULL,
      picked_up_by_name TEXT NOT NULL,
      picked_up_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS mail_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_batch_id INTEGER NOT NULL,
      batch_no TEXT NOT NULL,
      receiver_name TEXT NOT NULL,
      receiver_phone TEXT NOT NULL,
      receiver_address TEXT NOT NULL,
      courier_company TEXT NOT NULL,
      tracking_no TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'shipped', 'delivered', 'returned')),
      mailed_by INTEGER NOT NULL,
      mailed_by_name TEXT NOT NULL,
      mailed_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      delivered_at TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS exception_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_batch_id INTEGER,
      batch_no TEXT,
      attempt_person_name TEXT NOT NULL,
      attempt_person_id_card TEXT NOT NULL,
      attempt_type TEXT NOT NULL,
      intercepted_by INTEGER NOT NULL,
      intercepted_by_name TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_report_batches_patient ON report_batches(patient_id)`,
    `CREATE INDEX IF NOT EXISTS idx_report_batches_status ON report_batches(status)`,
    `CREATE INDEX IF NOT EXISTS idx_report_batches_company ON report_batches(company_id)`,
    `CREATE INDEX IF NOT EXISTS idx_authorizations_report ON authorizations(report_batch_id)`,
    `CREATE INDEX IF NOT EXISTS idx_authorizations_status ON authorizations(status)`,
    `CREATE INDEX IF NOT EXISTS idx_pickup_records_batch ON pickup_records(report_batch_id)`,
    `CREATE INDEX IF NOT EXISTS idx_pickup_records_date ON pickup_records(picked_up_at)`,
    `CREATE INDEX IF NOT EXISTS idx_mail_records_batch ON mail_records(report_batch_id)`,
    `CREATE INDEX IF NOT EXISTS idx_mail_records_status ON mail_records(status)`,
    `CREATE INDEX IF NOT EXISTS idx_exception_logs_date ON exception_logs(created_at)`
  ];

  for (const sql of statements) {
    db.run(sql);
  }

  logger.info('Database schema initialized');
}

export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
    dbReady = false;
    logger.info('Database closed and saved');
  }
}

export const dbHelper = {
  run,
  getOne,
  getAll,
  save: saveDatabase
};
