const { openDb, initDatabase, DB_PATH } = require('./init');
const fs = require('fs');

let _db = null;
let _initPromise = null;

async function getDB() {
  if (_db) return _db;
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    if (fs.existsSync(DB_PATH) && fs.statSync(DB_PATH).size > 0) {
      _db = await openDb();
    } else {
      _db = await initDatabase();
    }
    return _db;
  })();
  return _initPromise;
}

async function ready() {
  return getDB();
}

function reset() {
  if (_db) {
    try { _db.save(); } catch(e) {}
    try { _db.close(); } catch(e) {}
    _db = null;
  }
  _initPromise = null;
}

function saveSync() {
  if (_db) _db.save();
}

setInterval(() => {
  if (_db) _db.save();
}, 5000);

process.on('exit', saveSync);
process.on('SIGTERM', () => { saveSync(); process.exit(0); });
process.on('SIGINT', () => { saveSync(); process.exit(0); });

module.exports = { getDB, ready, reset, saveSync, DB_PATH };
