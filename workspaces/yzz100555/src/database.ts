import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let dbInstance: Database.Database | null = null;

export function getDb(dbPath?: string): Database.Database {
  if (dbInstance) return dbInstance;

  const resolvedPath = dbPath || process.env.DB_PATH || path.join(process.cwd(), 'data', 'freeze-service.db');
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initSchema(db);
  dbInstance = db;
  return db;
}

export function resetDbForTest(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_phone TEXT,
      class_teacher_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS course_packages (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      name TEXT NOT NULL,
      total_lessons INTEGER NOT NULL,
      remaining_lessons INTEGER NOT NULL,
      purchase_date TEXT NOT NULL,
      expire_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (course_id) REFERENCES courses(id)
    );

    CREATE TABLE IF NOT EXISTS freeze_records (
      id TEXT PRIMARY KEY,
      package_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      freeze_date TEXT NOT NULL,
      unfreeze_date TEXT,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'frozen',
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      unfreeze_reason TEXT,
      unfrozen_by TEXT,
      unfrozen_at TEXT,
      FOREIGN KEY (package_id) REFERENCES course_packages(id),
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS consumption_records (
      id TEXT PRIMARY KEY,
      package_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      schedule_id TEXT NOT NULL,
      lesson_date TEXT NOT NULL,
      lessons_consumed INTEGER NOT NULL DEFAULT 1,
      teacher_id TEXT,
      status TEXT NOT NULL DEFAULT 'consumed',
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(schedule_id, package_id)
    );

    CREATE TABLE IF NOT EXISTS balance_ledger (
      id TEXT PRIMARY KEY,
      package_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      change_type TEXT NOT NULL,
      change_amount INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      ref_record_id TEXT,
      ref_record_type TEXT,
      description TEXT NOT NULL,
      operator TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exception_adjustments (
      id TEXT PRIMARY KEY,
      package_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      adjustment INTEGER NOT NULL,
      reason TEXT NOT NULL,
      approved_by TEXT NOT NULL,
      ledger_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_cp_student ON course_packages(student_id);
    CREATE INDEX IF NOT EXISTS idx_fr_package ON freeze_records(package_id);
    CREATE INDEX IF NOT EXISTS idx_fr_student ON freeze_records(student_id);
    CREATE INDEX IF NOT EXISTS idx_fr_dates ON freeze_records(freeze_date, unfreeze_date);
    CREATE INDEX IF NOT EXISTS idx_cr_package ON consumption_records(package_id);
    CREATE INDEX IF NOT EXISTS idx_cr_student ON consumption_records(student_id);
    CREATE INDEX IF NOT EXISTS idx_cr_schedule ON consumption_records(schedule_id);
    CREATE INDEX IF NOT EXISTS idx_bl_package ON balance_ledger(package_id);
    CREATE INDEX IF NOT EXISTS idx_bl_student ON balance_ledger(student_id);
    CREATE INDEX IF NOT EXISTS idx_bl_created ON balance_ledger(created_at);
  `);
}
