const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'mining.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plate_number TEXT NOT NULL UNIQUE,
      vehicle_type TEXT,
      tare_weight REAL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      id_card TEXT,
      phone TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(name, id_card)
    );

    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_no TEXT NOT NULL,
      plate_number TEXT NOT NULL,
      driver_id INTEGER,
      driver_name TEXT,
      material TEXT,
      origin TEXT,
      destination TEXT,
      status TEXT NOT NULL DEFAULT 'entered',
      entry_time TEXT,
      loading_time TEXT,
      exit_time TEXT,
      review_time TEXT,
      gross_weight REAL,
      tare_weight REAL,
      net_weight REAL,
      gross_from_exit REAL,
      tare_from_entry REAL,
      has_exit_weighbridge INTEGER DEFAULT 0,
      has_entry_weighbridge INTEGER DEFAULT 0,
      entry_source TEXT,
      exit_source TEXT,
      anomaly_types TEXT,
      is_anomaly INTEGER DEFAULT 0,
      review_opinion TEXT,
      reviewed_by TEXT,
      is_review_closed INTEGER DEFAULT 0,
      batch_no TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(plate_number, trip_no)
    );

    CREATE TABLE IF NOT EXISTS entry_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER,
      plate_number TEXT NOT NULL,
      trip_no TEXT NOT NULL,
      driver_name TEXT,
      driver_id_card TEXT,
      driver_phone TEXT,
      entry_time TEXT NOT NULL,
      entry_gate TEXT,
      tare_weight REAL,
      material TEXT,
      origin TEXT,
      destination TEXT,
      source TEXT,
      source_batch_no TEXT,
      raw_data TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (trip_id) REFERENCES trips(id)
    );

    CREATE TABLE IF NOT EXISTS exit_weighbridge (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER,
      plate_number TEXT NOT NULL,
      trip_no TEXT NOT NULL,
      driver_name TEXT,
      exit_time TEXT NOT NULL,
      gross_weight REAL NOT NULL,
      tare_weight REAL,
      net_weight REAL,
      weighbridge_no TEXT,
      operator TEXT,
      source TEXT,
      source_batch_no TEXT,
      raw_data TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (trip_id) REFERENCES trips(id)
    );

    CREATE TABLE IF NOT EXISTS supplementary_weighbridge (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER,
      plate_number TEXT NOT NULL,
      trip_no TEXT NOT NULL,
      weigh_type TEXT NOT NULL,
      weight REAL NOT NULL,
      weigh_time TEXT,
      weighbridge_no TEXT,
      source TEXT,
      raw_data TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (trip_id) REFERENCES trips(id)
    );

    CREATE TABLE IF NOT EXISTS review_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      anomaly_type TEXT,
      opinion TEXT NOT NULL,
      reviewer TEXT,
      is_closed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (trip_id) REFERENCES trips(id)
    );

    CREATE INDEX IF NOT EXISTS idx_trips_plate ON trips(plate_number);
    CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
    CREATE INDEX IF NOT EXISTS idx_trips_anomaly ON trips(is_anomaly);
    CREATE INDEX IF NOT EXISTS idx_entry_trip ON entry_records(trip_id);
    CREATE INDEX IF NOT EXISTS idx_exit_trip ON exit_weighbridge(trip_id);
    CREATE INDEX IF NOT EXISTS idx_entry_plate_trip ON entry_records(plate_number, trip_no);
    CREATE INDEX IF NOT EXISTS idx_exit_plate_trip ON exit_weighbridge(plate_number, trip_no);
  `);
}

module.exports = { db, initDb };
