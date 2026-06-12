import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { seedCases } from './seedCases.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '../../data/fraud_game.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS elderly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL,
      phone_last4 VARCHAR(4) NOT NULL,
      age INTEGER,
      community VARCHAR(200),
      is_focus BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, phone_last4)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL CHECK(role IN ('police', 'social_worker')),
      name VARCHAR(100) NOT NULL,
      community VARCHAR(200),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title VARCHAR(200) NOT NULL,
      fraud_type VARCHAR(50) NOT NULL,
      description TEXT,
      dialogues JSON NOT NULL,
      options JSON NOT NULL,
      warning_points JSON,
      difficulty INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES admin(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS game_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      elderly_id INTEGER NOT NULL,
      current_case_id INTEGER,
      current_dialogue_index INTEGER DEFAULT 0,
      consecutive_correct INTEGER DEFAULT 0,
      current_difficulty INTEGER DEFAULT 1,
      last_play_time DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (elderly_id) REFERENCES elderly(id),
      FOREIGN KEY (current_case_id) REFERENCES cases(id),
      UNIQUE(elderly_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS answer_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      elderly_id INTEGER NOT NULL,
      case_id INTEGER NOT NULL,
      dialogue_index INTEGER NOT NULL,
      is_correct BOOLEAN NOT NULL,
      selected_option TEXT NOT NULL,
      age_group VARCHAR(20),
      fraud_type VARCHAR(50),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (elderly_id) REFERENCES elderly(id),
      FOREIGN KEY (case_id) REFERENCES cases(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS follow_up_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      elderly_id INTEGER NOT NULL,
      social_worker_id INTEGER NOT NULL,
      notes TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (elderly_id) REFERENCES elderly(id),
      FOREIGN KEY (social_worker_id) REFERENCES admin(id)
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_answer_elderly ON answer_records(elderly_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_answer_case ON answer_records(case_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_answer_age ON answer_records(age_group)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_cases_sort ON cases(sort_order)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_follow_elderly ON follow_up_records(elderly_id)`);

  db.get('SELECT COUNT(*) as count FROM admin', [], (err, row: { count: number }) => {
    if (err) {
      console.error('Error checking admin table:', err);
      return;
    }
    if (row.count === 0) {
      const salt = bcrypt.genSaltSync(10);
      const policeHash = bcrypt.hashSync('123456', salt);
      const socialHash = bcrypt.hashSync('123456', salt);

      db.run(
        `INSERT INTO admin (username, password_hash, role, name, community) VALUES (?, ?, ?, ?, ?)`,
        ['police', policeHash, 'police', '王警官', '朝阳社区'],
        (err) => {
          if (err) console.error('Error inserting police admin:', err);
          else console.log('Police admin created: police / 123456');
        }
      );

      db.run(
        `INSERT INTO admin (username, password_hash, role, name, community) VALUES (?, ?, ?, ?, ?)`,
        ['social', socialHash, 'social_worker', '李社工', '朝阳社区'],
        (err) => {
          if (err) console.error('Error inserting social worker:', err);
          else console.log('Social worker created: social / 123456');
        }
      );
    }
  });

  db.get('SELECT COUNT(*) as count FROM cases', [], (err, row: { count: number }) => {
    if (err) {
      console.error('Error checking cases table:', err);
      return;
    }
    if (row.count === 0) {
      console.log('Inserting seed cases...');
      seedCases.forEach((caseData, index) => {
        db.run(
          `INSERT INTO cases (title, fraud_type, description, dialogues, options, warning_points, difficulty, sort_order, created_by) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            caseData.title,
            caseData.fraudType,
            caseData.description,
            JSON.stringify(caseData.dialogues),
            JSON.stringify(caseData.options),
            JSON.stringify(caseData.warningPoints),
            caseData.difficulty,
            caseData.sortOrder,
            1,
          ],
          function (err) {
            if (err) {
              console.error(`Error inserting case ${index + 1}:`, err);
            } else {
              console.log(`Case ${index + 1} inserted: ${caseData.title}`);
            }
          }
        );
      });
    }
  });

  console.log('Database initialization complete');
});

export default db;
