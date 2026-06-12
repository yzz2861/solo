import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type {
  BilliardTable, OrderSession, OrderItem, TableTransfer, PauseRecord,
  Product, Member, Package, Checkout, RevocationLog, Operator
} from '@/types';

const DB_NAME = 'billiard-manager';
const DB_VERSION = 1;

const STORES = {
  TABLES: 'tables',
  SESSIONS: 'order_sessions',
  ITEMS: 'order_items',
  TRANSFERS: 'table_transfers',
  PAUSES: 'pause_records',
  PRODUCTS: 'products',
  MEMBERS: 'members',
  PACKAGES: 'packages',
  CHECKOUTS: 'checkouts',
  REVOCATIONS: 'revocation_logs',
  OPERATORS: 'operators',
} as const;

interface BilliardDB extends DBSchema {
  tables:          { key: string; value: BilliardTable;  indexes: { 'by-status': string } };
  order_sessions:  { key: string; value: OrderSession;   indexes: { 'by-table': string; 'by-checkout': string } };
  order_items:     { key: string; value: OrderItem;      indexes: { 'by-session': string } };
  table_transfers: { key: string; value: TableTransfer;  indexes: { 'by-session': string } };
  pause_records:   { key: string; value: PauseRecord;    indexes: { 'by-session': string } };
  products:        { key: string; value: Product };
  members:         { key: string; value: Member };
  packages:        { key: string; value: Package };
  checkouts:       { key: string; value: Checkout;       indexes: { 'by-time': string; 'by-session': string } };
  revocation_logs: { key: string; value: RevocationLog;  indexes: { 'by-time': string } };
  operators:       { key: string; value: Operator };
}

let dbInstance: IDBPDatabase<BilliardDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<BilliardDB>> {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB<BilliardDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORES.TABLES)) {
        const s = db.createObjectStore(STORES.TABLES, { keyPath: 'id' });
        s.createIndex('by-status', 'status');
      }
      if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
        const s = db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' });
        s.createIndex('by-table', 'table_id');
      }
      if (!db.objectStoreNames.contains(STORES.ITEMS)) {
        const s = db.createObjectStore(STORES.ITEMS, { keyPath: 'id' });
        s.createIndex('by-session', 'session_id');
      }
      if (!db.objectStoreNames.contains(STORES.TRANSFERS)) {
        const s = db.createObjectStore(STORES.TRANSFERS, { keyPath: 'id' });
        s.createIndex('by-session', 'session_id');
      }
      if (!db.objectStoreNames.contains(STORES.PAUSES)) {
        const s = db.createObjectStore(STORES.PAUSES, { keyPath: 'id' });
        s.createIndex('by-session', 'session_id');
      }
      if (!db.objectStoreNames.contains(STORES.PRODUCTS)) db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.MEMBERS))  db.createObjectStore(STORES.MEMBERS,  { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.PACKAGES)) db.createObjectStore(STORES.PACKAGES, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.CHECKOUTS)) {
        const s = db.createObjectStore(STORES.CHECKOUTS, { keyPath: 'id' });
        s.createIndex('by-time', 'checkout_time');
        s.createIndex('by-session', 'session_id');
      }
      if (!db.objectStoreNames.contains(STORES.REVOCATIONS)) {
        const s = db.createObjectStore(STORES.REVOCATIONS, { keyPath: 'id' });
        s.createIndex('by-time', 'revocation_time');
      }
      if (!db.objectStoreNames.contains(STORES.OPERATORS)) db.createObjectStore(STORES.OPERATORS, { keyPath: 'id' });
    },
  });
  return dbInstance;
}

export { STORES };
