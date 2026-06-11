import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();
  const dbPath = path.resolve(__dirname, '..', 'data.db');

  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
    const migrationPath = path.resolve(__dirname, '..', 'migrations', '001_init.sql');
    const migration = fs.readFileSync(migrationPath, 'utf-8');
    db.run(migration);
    saveDb();
  }

  return db;
}

export function saveDb(): void {
  if (!db) return;
  const dbPath = path.resolve(__dirname, '..', 'data.db');
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

export function run(sql: string, params: any[] = []): void {
  if (!db) throw new Error('DB not initialized');
  db.run(sql, params);
  saveDb();
}

export function query<T = any>(sql: string, params: any[] = []): T[] {
  if (!db) throw new Error('DB not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const results = query<T>(sql, params);
  return results.length ? results[0] : null;
}
