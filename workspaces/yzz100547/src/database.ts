import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import config from './config';

let db: Database | null = null;

/**
 * 获取数据库连接
 */
export async function getDb(): Promise<Database> {
  if (db) {
    return db;
  }

  if (config.dbMode === 'memory') {
    db = await open({
      filename: ':memory:',
      driver: sqlite3.Database,
    });
  } else {
    db = await open({
      filename: config.dbPath,
      driver: sqlite3.Database,
    });
  }

  await db.run('PRAGMA foreign_keys = ON');
  return db;
}

/**
 * 关闭数据库连接
 */
export async function closeDb(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

/**
 * 初始化数据库表结构
 */
export async function initDatabase(): Promise<void> {
  const database = await getDb();

  await database.exec(`
    -- 用户表
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('resident', 'social_worker', 'director')),
      points_balance INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 活动表
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      points_per_person INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active', 'cancelled')) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      cancelled_at DATETIME
    );

    -- 活动参与表
    CREATE TABLE IF NOT EXISTS activity_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      points_awarded INTEGER NOT NULL,
      transaction_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (activity_id) REFERENCES activities(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (transaction_id) REFERENCES points_transactions(id),
      UNIQUE(activity_id, user_id)
    );

    -- 积分流水表
    CREATE TABLE IF NOT EXISTS points_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('award', 'freeze', 'exchange', 'refund', 'revoke')),
      amount INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      related_id INTEGER,
      status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'reversed')) DEFAULT 'pending',
      idempotency_key TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewed_at DATETIME,
      reviewed_by INTEGER,
      review_status TEXT CHECK (review_status IN ('pending', 'approved', 'rejected')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    );

    -- 库存商品表
    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      points_cost INTEGER NOT NULL,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 兑换订单表
    CREATE TABLE IF NOT EXISTS exchange_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      inventory_item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      total_points INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')) DEFAULT 'pending',
      idempotency_key TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewed_at DATETIME,
      reviewed_by INTEGER,
      review_note TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    );

    -- 幂等性键表
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      transaction_type TEXT NOT NULL,
      response_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL
    );

    -- 索引
    CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON points_transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_idempotency_key ON points_transactions(idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_exchange_orders_user_id ON exchange_orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_exchange_orders_idempotency_key ON exchange_orders(idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_exchange_orders_status ON exchange_orders(status);
    CREATE INDEX IF NOT EXISTS idx_activity_participants_activity_id ON activity_participants(activity_id);
    CREATE INDEX IF NOT EXISTS idx_activity_participants_user_id ON activity_participants(user_id);
    CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key ON idempotency_keys(key);
  `);
}

/**
 * 重置数据库（测试用）
 */
export async function resetDatabase(): Promise<void> {
  const database = await getDb();
  await database.exec(`
    DROP TABLE IF EXISTS activity_participants;
    DROP TABLE IF EXISTS exchange_orders;
    DROP TABLE IF EXISTS points_transactions;
    DROP TABLE IF EXISTS inventory_items;
    DROP TABLE IF EXISTS activities;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS idempotency_keys;
  `);
  await initDatabase();
}
