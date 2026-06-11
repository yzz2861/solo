import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { Order, Material, Evidence, AppealSummary, MaterialOrder } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const UPLOADS_DIR = uploadsDir;

interface Database {
  projects: Order[];
  materials: Material[];
  evidence: Evidence[];
  summaries: AppealSummary[];
  materialOrders: Record<string, string[]>;
}

const defaultData: Database = {
  projects: [],
  materials: [],
  evidence: [],
  summaries: [],
  materialOrders: {}
};

const file = path.join(dataDir, 'db.json');
const adapter = new JSONFile<Database>(file);
export const db = new Low<Database>(adapter, defaultData);

export async function initDb() {
  await db.read();
  if (!db.data) {
    db.data = defaultData;
    await db.write();
  }
}
