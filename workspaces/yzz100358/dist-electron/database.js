import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
let db = null;
export function getDatabasePath() {
    const userDataPath = app.getPath('userData');
    const dbDir = path.join(userDataPath, 'data');
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    return path.join(dbDir, 'tattoo-studio.db');
}
export function getImagesPath() {
    const userDataPath = app.getPath('userData');
    const imagesDir = path.join(userDataPath, 'images');
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }
    return imagesDir;
}
export function initDatabase() {
    if (db)
        return db;
    const dbPath = getDatabasePath();
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    createTables(db);
    seedInitialData(db);
    return db;
}
function createTables(db) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS artists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      specialty TEXT,
      avatar_path TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      wechat_id TEXT,
      birthday DATE,
      allergies TEXT,
      contraindications TEXT,
      is_sensitive_skin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS body_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      is_sensitive INTEGER DEFAULT 0,
      diagram_path TEXT
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      artist_id INTEGER NOT NULL,
      body_part_id INTEGER,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      estimated_duration INTEGER,
      status TEXT DEFAULT 'pending_deposit',
      internal_notes TEXT,
      client_notes TEXT,
      is_sensitive_area INTEGER DEFAULT 0,
      revision_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (artist_id) REFERENCES artists(id),
      FOREIGN KEY (body_part_id) REFERENCES body_parts(id)
    );

    CREATE TABLE IF NOT EXISTS tattoo_designs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      booking_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      current_version INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS design_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      design_id INTEGER NOT NULL,
      version_number INTEGER NOT NULL,
      image_path TEXT NOT NULL,
      feedback TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (design_id) REFERENCES tattoo_designs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      screenshot_path TEXT,
      paid_at DATETIME,
      payment_method TEXT,
      notes TEXT,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_artist_time ON bookings(artist_id, start_time);
    CREATE INDEX IF NOT EXISTS idx_bookings_client ON bookings(client_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(DATE(start_time));
  `);
}
function seedInitialData(db) {
    const bodyParts = [
        { id: 1, name: '上臂', category: '上肢', is_sensitive: 0 },
        { id: 2, name: '小臂', category: '上肢', is_sensitive: 0 },
        { id: 3, name: '大臂内侧', category: '上肢', is_sensitive: 1 },
        { id: 4, name: '大腿', category: '下肢', is_sensitive: 0 },
        { id: 5, name: '小腿', category: '下肢', is_sensitive: 0 },
        { id: 6, name: '脚踝', category: '下肢', is_sensitive: 0 },
        { id: 7, name: '后背', category: '躯干', is_sensitive: 0 },
        { id: 8, name: '前胸', category: '躯干', is_sensitive: 1 },
        { id: 9, name: '侧腰', category: '躯干', is_sensitive: 0 },
        { id: 10, name: '颈部', category: '头颈', is_sensitive: 1 },
        { id: 11, name: '手腕', category: '上肢', is_sensitive: 0 },
        { id: 12, name: '肋骨', category: '躯干', is_sensitive: 1 },
    ];
    const insertBodyPart = db.prepare(`
    INSERT OR IGNORE INTO body_parts (id, name, category, is_sensitive)
    VALUES (@id, @name, @category, @is_sensitive)
  `);
    const transaction = db.transaction(() => {
        for (const part of bodyParts) {
            insertBodyPart.run(part);
        }
    });
    transaction();
    const artists = [
        { id: 1, name: '阿龙', specialty: '传统日式、黑灰写实' },
        { id: 2, name: '小雨', specialty: '小清新、彩色水彩' },
        { id: 3, name: '老王', specialty: 'Old School、黑臂' },
    ];
    const insertArtist = db.prepare(`
    INSERT OR IGNORE INTO artists (id, name, specialty)
    VALUES (@id, @name, @specialty)
  `);
    const artistTransaction = db.transaction(() => {
        for (const artist of artists) {
            insertArtist.run(artist);
        }
    });
    artistTransaction();
}
export function getDb() {
    if (!db) {
        return initDatabase();
    }
    return db;
}
export default { initDatabase, getDb, getDatabasePath, getImagesPath };
