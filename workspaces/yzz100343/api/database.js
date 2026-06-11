import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

let db = null;

export async function getDb() {
  if (db) return db;
  
  db = await open({
    filename: './data/inspection.db',
    driver: sqlite3.Database,
  });
  
  await initTables();
  return db;
}

async function initTables() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS hazards (
      id TEXT PRIMARY KEY,
      boxNumber TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT NOT NULL,
      photoUrl TEXT,
      team TEXT NOT NULL,
      deadline TEXT NOT NULL,
      status TEXT NOT NULL,
      rejectCount INTEGER DEFAULT 0,
      isOverdue INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      createdBy TEXT NOT NULL
    )
  `);
  
  await db.run(`
    CREATE TABLE IF NOT EXISTS rectifications (
      id TEXT PRIMARY KEY,
      hazardId TEXT NOT NULL,
      description TEXT NOT NULL,
      photoUrl TEXT,
      submittedAt TEXT NOT NULL,
      submittedBy TEXT NOT NULL,
      FOREIGN KEY (hazardId) REFERENCES hazards(id) ON DELETE CASCADE
    )
  `);
  
  await db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      hazardId TEXT NOT NULL,
      passed INTEGER NOT NULL,
      comment TEXT NOT NULL,
      reviewedAt TEXT NOT NULL,
      reviewedBy TEXT NOT NULL,
      FOREIGN KEY (hazardId) REFERENCES hazards(id) ON DELETE CASCADE
    )
  `);
  
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_hazards_status ON hazards(status)
  `);
  
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_hazards_team ON hazards(team)
  `);
  
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_rectifications_hazardId ON rectifications(hazardId)
  `);
  
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_reviews_hazardId ON reviews(hazardId)
  `);
}

export async function closeDb() {
  if (db) {
    await db.close();
    db = null;
  }
}
