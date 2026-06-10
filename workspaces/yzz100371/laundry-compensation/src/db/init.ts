import fs from 'fs';
import path from 'path';
import {
  CareOrder,
  InspectionNote,
  CompensationClaim,
  ClaimReview,
  ClaimSupplement,
  TimelineEvent,
} from '../types';

const DATA_PATH = path.join(__dirname, '../../data');

interface DataStore {
  orders: Map<string, CareOrder>;
  notes: Map<string, InspectionNote>;
  claims: Map<string, CompensationClaim>;
  reviews: Map<string, ClaimReview>;
  supplements: Map<string, ClaimSupplement>;
  timelineEvents: Map<string, TimelineEvent>;
}

let store: DataStore;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_PATH)) {
    fs.mkdirSync(DATA_PATH, { recursive: true });
  }
}

function loadMap<T>(filename: string): Map<string, T> {
  const filePath = path.join(DATA_PATH, filename);
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const arr = JSON.parse(raw) as T[];
    return new Map(arr.map(item => [(item as any).id, item]));
  }
  return new Map();
}

function saveMap<T>(map: Map<string, T>, filename: string): void {
  ensureDataDir();
  const filePath = path.join(DATA_PATH, filename);
  const arr = Array.from(map.values());
  fs.writeFileSync(filePath, JSON.stringify(arr, null, 2), 'utf-8');
}

export function getStore(): DataStore {
  if (!store) {
    store = {
      orders: loadMap<CareOrder>('orders.json'),
      notes: loadMap<InspectionNote>('notes.json'),
      claims: loadMap<CompensationClaim>('claims.json'),
      reviews: loadMap<ClaimReview>('reviews.json'),
      supplements: loadMap<ClaimSupplement>('supplements.json'),
      timelineEvents: loadMap<TimelineEvent>('timeline.json'),
    };
  }
  return store;
}

export function persist(): void {
  const s = getStore();
  saveMap(s.orders, 'orders.json');
  saveMap(s.claims, 'claims.json');
  saveMap(s.reviews, 'reviews.json');
  saveMap(s.notes, 'notes.json');
  saveMap(s.supplements, 'supplements.json');
  saveMap(s.timelineEvents, 'timeline.json');
}
