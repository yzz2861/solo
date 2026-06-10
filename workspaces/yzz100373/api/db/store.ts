import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  Member,
  MemberPackage,
  Worker,
  Order,
  AddonConfig,
} from '../../shared/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');

interface Database {
  members: Member[];
  memberPackages: MemberPackage[];
  workers: Worker[];
  orders: Order[];
  addonConfigs: AddonConfig[];
}

const DB_FILE = path.join(DATA_DIR, 'db.json');

const initialData: Database = {
  workers: [
    { id: 'w1', name: '张师傅', status: 'active' },
    { id: 'w2', name: '李师傅', status: 'active' },
    { id: 'w3', name: '王师傅', status: 'active' },
  ],
  addonConfigs: [
    { id: 'ac1', name: '内饰清洁', defaultPrice: 80 },
    { id: 'ac2', name: '发动机舱清洗', defaultPrice: 50 },
    { id: 'ac3', name: '轮胎上光', defaultPrice: 30 },
    { id: 'ac4', name: '玻璃镀膜', defaultPrice: 100 },
  ],
  members: [
    { id: 'm1', name: '陈先生', phone: '13800138001', plateNumber: '京A12345', createdAt: new Date().toISOString() },
    { id: 'm2', name: '刘女士', phone: '13800138002', plateNumber: '京A1234S', createdAt: new Date().toISOString() },
    { id: 'm3', name: '赵总', phone: '13800138003', plateNumber: '京B88888', createdAt: new Date().toISOString() },
  ],
  memberPackages: [
    { id: 'mp1', memberId: 'm1', packageName: '精洗10次卡', totalTimes: 10, remainingTimes: 7, pricePerTime: 35 },
    { id: 'mp2', memberId: 'm2', packageName: '普洗20次卡', totalTimes: 20, remainingTimes: 1, pricePerTime: 25 },
    { id: 'mp3', memberId: 'm3', packageName: '精洗年卡', totalTimes: 52, remainingTimes: 45, pricePerTime: 30 },
  ],
  orders: [],
};

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadDB(): Database {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return JSON.parse(JSON.stringify(initialData));
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return JSON.parse(JSON.stringify(initialData));
  }
}

function saveDB(db: Database): void {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

export function getDB(): Database {
  return loadDB();
}

export function setDB(db: Database): void {
  saveDB(db);
}

export function genId(prefix: string): string {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}
