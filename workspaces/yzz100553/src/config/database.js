const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'study_room.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('数据库连接成功');
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA foreign_keys = ON');
  }
});

db.get = promisify(db.get).bind(db);
db.all = promisify(db.all).bind(db);
db.exec = promisify(db.exec).bind(db);

const originalRun = db.run.bind(db);
db.run = function(sql, ...params) {
  return new Promise((resolve, reject) => {
    const callback = function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    };
    if (params.length === 0) {
      originalRun(sql, callback);
    } else {
      originalRun(sql, ...params, callback);
    }
  });
};

module.exports = db;
