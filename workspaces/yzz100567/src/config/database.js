const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, '../../data/training.db');

let dbInstance = null;

function getDb() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      return resolve(dbInstance);
    }

    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    dbInstance = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        dbInstance = null;
        return reject(err);
      }

      dbInstance.run('PRAGMA foreign_keys = ON');
      resolve(dbInstance);
    });
  });
}

function closeDb() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      dbInstance.close((err) => {
        dbInstance = null;
        if (err) reject(err);
        else resolve();
      });
    } else {
      resolve();
    }
  });
}

async function run(sql, params = []) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

async function get(sql, params = []) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

async function all(sql, params = []) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

async function exec(sql) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function prepareRun(stmt, params = []) {
  return new Promise((resolve, reject) => {
    stmt.run(params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

module.exports = {
  getDb,
  closeDb,
  DB_PATH,
  run,
  get,
  all,
  exec,
  prepareRun
};
