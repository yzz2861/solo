const { getDb } = require('../config/database');

class BaseDao {
  constructor() {
    this.db = getDb();
  }

  run(sql, params = []) {
    return this.db.prepare(sql).run(...params);
  }

  get(sql, params = []) {
    return this.db.prepare(sql).get(...params);
  }

  all(sql, params = []) {
    return this.db.prepare(sql).all(...params);
  }

  prepare(sql) {
    return this.db.prepare(sql);
  }

  transaction(fn) {
    return this.db.transaction(fn)();
  }
}

module.exports = BaseDao;
