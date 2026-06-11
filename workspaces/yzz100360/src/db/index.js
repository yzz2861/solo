const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'sterilization.db');
const db = new sqlite3.Database(dbPath);

class Database {
  constructor(db) {
    this.db = db;
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  exec(sql) {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  prepare(sql) {
    const stmt = this.db.prepare(sql);
    return {
      run: (...params) => new Promise((resolve, reject) => {
        stmt.run(...params, function (err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      }),
      get: (...params) => new Promise((resolve, reject) => {
        stmt.get(...params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      }),
      all: (...params) => new Promise((resolve, reject) => {
        stmt.all(...params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      }),
      finalize: () => new Promise((resolve, reject) => {
        stmt.finalize((err) => {
          if (err) reject(err);
          else resolve();
        });
      }),
    };
  }
}

const database = new Database(db);

module.exports = database;
