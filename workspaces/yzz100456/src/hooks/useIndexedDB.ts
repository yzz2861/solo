import { openDB, IDBPDatabase } from 'idb';
import type { LiftPlan, HandoverRecord } from '@/types';

const DB_NAME = 'dock-lift-plans-db';
const DB_VERSION = 1;

interface DBLayout {
  plans: {
    key: string;
    value: LiftPlan;
    indexes: { 'by-planNo': string; 'by-createTime': string };
  };
  handovers: {
    key: string;
    value: HandoverRecord;
  };
}

let dbPromise: Promise<IDBPDatabase<DBLayout>> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<DBLayout>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('plans')) {
          const store = db.createObjectStore('plans', { keyPath: 'id' });
          store.createIndex('by-planNo', 'planNo', { unique: true });
          store.createIndex('by-createTime', 'createTime');
        }
        if (!db.objectStoreNames.contains('handovers')) {
          db.createObjectStore('handovers', { keyPath: 'planId' });
        }
      },
    });
  }
  return dbPromise;
};

export const useIndexedDB = () => {
  const savePlan = async (plan: LiftPlan): Promise<void> => {
    const db = await getDB();
    await db.put('plans', plan);
  };

  const getPlan = async (id: string): Promise<LiftPlan | undefined> => {
    const db = await getDB();
    return db.get('plans', id);
  };

  const getAllPlans = async (): Promise<LiftPlan[]> => {
    const db = await getDB();
    const plans = await db.getAll('plans');
    return plans.sort((a, b) => b.createTime.localeCompare(a.createTime));
  };

  const deletePlan = async (id: string): Promise<void> => {
    const db = await getDB();
    await db.delete('plans', id);
  };

  const saveHandover = async (record: HandoverRecord): Promise<void> => {
    const db = await getDB();
    await db.put('handovers', record);
  };

  const getHandover = async (planId: string): Promise<HandoverRecord | undefined> => {
    const db = await getDB();
    return db.get('handovers', planId);
  };

  return {
    savePlan,
    getPlan,
    getAllPlans,
    deletePlan,
    saveHandover,
    getHandover,
  };
};
