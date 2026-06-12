import fs from 'node:fs';
import path from 'node:path';
import type {
  Equipment,
  Rental,
  RentalItem,
  DamageClaim,
  CreateRentalPayload,
  ReturnRentalItemPayload,
  AppStats,
} from '../../shared/types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface Database {
  equipment: Equipment[];
  rentals: Rental[];
  rentalItems: RentalItem[];
  claims: DamageClaim[];
  seq: { equipment: number; rental: number; rentalItem: number; claim: number };
}

const DEFAULT_DB: Database = {
  equipment: [
    { id: 1, name: 'MSR Hubba NX 单人帐篷', category: 'tent', model: 'Hubba NX 1P', status: 'available', accessories: ['地钉×8', '防风绳×4', '防潮内帐', '收纳袋'], deposit: 500, dailyRate: 60, lastCleanedAt: '2026-06-10T09:00:00.000Z', createdAt: '2026-01-15T00:00:00.000Z' },
    { id: 2, name: 'NatureHike 云尚2 双人帐篷', category: 'tent', model: 'CloudUp 2', status: 'available', accessories: ['地钉×10', '防风绳×6', '帐杆×2', '收纳袋'], deposit: 400, dailyRate: 45, lastCleanedAt: '2026-06-08T14:30:00.000Z', createdAt: '2026-02-01T00:00:00.000Z' },
    { id: 3, name: 'Big Agnes 铜马刺 HV UL3', category: 'tent', model: 'Copper Spur HV UL3', status: 'available', accessories: ['地钉×12', '防风绳×6', '帐杆×2', '脚印地布', '收纳袋'], deposit: 800, dailyRate: 95, lastCleanedAt: '2026-06-05T10:00:00.000Z', createdAt: '2026-01-20T00:00:00.000Z' },
    { id: 4, name: 'MSR PocketRocket 2 炉头', category: 'stove', model: 'PocketRocket 2', status: 'available', accessories: ['收纳盒', '点火器'], deposit: 150, dailyRate: 20, lastCleanedAt: '2026-06-09T11:00:00.000Z', createdAt: '2026-01-10T00:00:00.000Z' },
    { id: 5, name: 'Jetboil Flash 一体式炉具', category: 'stove', model: 'Flash 1.0L', status: 'available', accessories: ['炉体', '1L锅', '锅盖', '支架', '收纳袋'], deposit: 250, dailyRate: 30, lastCleanedAt: '2026-06-07T16:00:00.000Z', createdAt: '2026-01-12T00:00:00.000Z' },
    { id: 6, name: 'Trangia 27 风暴炉', category: 'stove', model: 'Trangia 27-2 UL', status: 'available', accessories: ['2个小锅', '1个煎锅', '防风罩', '酒精炉头', '收纳袋'], deposit: 350, dailyRate: 40, lastCleanedAt: '2026-06-11T08:30:00.000Z', createdAt: '2026-02-05T00:00:00.000Z' },
    { id: 7, name: 'Black Ice G700 鹅绒睡袋', category: 'sleeping_bag', model: 'G700 -10℃', status: 'available', accessories: ['压缩袋', '收纳袋'], deposit: 400, dailyRate: 45, lastCleanedAt: '2026-06-06T13:00:00.000Z', createdAt: '2026-01-08T00:00:00.000Z' },
    { id: 8, name: '天石 鹅绒睡袋 -5℃', category: 'sleeping_bag', model: 'HWT -5℃', status: 'available', accessories: ['压缩袋', '收纳袋'], deposit: 300, dailyRate: 35, lastCleanedAt: '2026-06-04T15:00:00.000Z', createdAt: '2026-01-22T00:00:00.000Z' },
    { id: 9, name: 'Sea to Summit Spark -9℃', category: 'sleeping_bag', model: 'Spark SPII -9℃', status: 'available', accessories: ['压缩袋', '收纳袋'], deposit: 600, dailyRate: 70, lastCleanedAt: '2026-06-10T07:30:00.000Z', createdAt: '2026-02-10T00:00:00.000Z' },
    { id: 10, name: 'Therm-a-Rest 防潮垫', category: 'mat', model: 'NeoAir XLite', status: 'available', accessories: ['充气袋', '修补包', '收纳袋'], deposit: 300, dailyRate: 30, lastCleanedAt: '2026-06-09T12:00:00.000Z', createdAt: '2026-01-18T00:00:00.000Z' },
    { id: 11, name: 'Exped DownMat 7', category: 'mat', model: 'DownMat 7 MW', status: 'available', accessories: ['充气泵', '修补包', '收纳袋'], deposit: 400, dailyRate: 40, lastCleanedAt: '2026-06-08T09:00:00.000Z', createdAt: '2026-01-25T00:00:00.000Z' },
    { id: 12, name: 'Osprey Atmos AG 65L', category: 'backpack', model: 'Atmos AG 65', status: 'available', accessories: ['防雨罩', '腰带', '胸带'], deposit: 400, dailyRate: 45, lastCleanedAt: '2026-06-07T14:00:00.000Z', createdAt: '2026-02-08T00:00:00.000Z' },
  ],
  rentals: [
    {
      id: 1001,
      renterName: '张伟',
      renterPhone: '13800138001',
      renterIdCard: '310101199001011234',
      deposit: 900,
      startDate: '2026-06-12',
      endDate: '2026-06-14',
      actualReturnDate: null,
      status: 'active',
      items: [],
      createdAt: '2026-06-12T09:30:00.000Z',
      notes: '周末去莫干山露营',
    },
    {
      id: 1002,
      renterName: '李娜',
      renterPhone: '13900139002',
      renterIdCard: '310101199205052345',
      deposit: 1150,
      startDate: '2026-06-13',
      endDate: '2026-06-15',
      actualReturnDate: null,
      status: 'active',
      items: [],
      createdAt: '2026-06-13T10:15:00.000Z',
    },
  ],
  rentalItems: [
    { id: 1, rentalId: 1001, equipmentId: 2, accessoriesChecked: ['地钉×10', '防风绳×6', '帐杆×2', '收纳袋'], returned: false },
    { id: 2, rentalId: 1001, equipmentId: 4, accessoriesChecked: ['收纳盒', '点火器'], returned: false },
    { id: 3, rentalId: 1001, equipmentId: 7, accessoriesChecked: ['压缩袋', '收纳袋'], returned: false },
    { id: 4, rentalId: 1002, equipmentId: 3, accessoriesChecked: ['地钉×12', '防风绳×6', '帐杆×2', '脚印地布', '收纳袋'], returned: false },
    { id: 5, rentalId: 1002, equipmentId: 5, accessoriesChecked: ['炉体', '1L锅', '锅盖', '支架', '收纳袋'], returned: false },
    { id: 6, rentalId: 1002, equipmentId: 9, accessoriesChecked: ['压缩袋', '收纳袋'], returned: false },
    { id: 7, rentalId: 1002, equipmentId: 10, accessoriesChecked: ['充气袋', '修补包', '收纳袋'], returned: false },
  ],
  claims: [],
  seq: { equipment: 12, rental: 1002, rentalItem: 7, claim: 0 },
};

function ensureDbFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2));
  }
}

function readDb(): Database {
  ensureDbFile();
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  return JSON.parse(raw) as Database;
}

function writeDb(db: Database): void {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function attachEquipmentRelations(db: Database): void {
  for (const item of db.rentalItems) {
    item.equipment = db.equipment.find((e) => e.id === item.equipmentId);
  }
  for (const rental of db.rentals) {
    rental.items = db.rentalItems.filter((i) => i.rentalId === rental.id);
  }
  for (const claim of db.claims) {
    claim.equipment = db.equipment.find((e) => e.id === claim.equipmentId);
    const r = db.rentals.find((x) => x.id === claim.rentalId);
    if (r) {
      claim.rental = { renterName: r.renterName, renterPhone: r.renterPhone };
    }
  }
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export function listEquipment(
  filters?: { status?: string; category?: string }
): Equipment[] {
  const db = readDb();
  let list = db.equipment;
  if (filters?.status) list = list.filter((e) => e.status === filters.status);
  if (filters?.category) list = list.filter((e) => e.category === filters.category);
  return clone(list);
}

export function getEquipment(id: number): Equipment | undefined {
  const db = readDb();
  const eq = db.equipment.find((e) => e.id === id);
  return eq ? clone(eq) : undefined;
}

export function listRentals(filters?: { status?: string }): Rental[] {
  const db = readDb();
  attachEquipmentRelations(db);
  let list = db.rentals;
  if (filters?.status) list = list.filter((r) => r.status === filters.status);
  return clone(list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
}

export function getRental(id: number): Rental | undefined {
  const db = readDb();
  attachEquipmentRelations(db);
  const r = db.rentals.find((x) => x.id === id);
  return r ? clone(r) : undefined;
}

export function listActiveRentals(): Rental[] {
  const db = readDb();
  attachEquipmentRelations(db);
  return clone(db.rentals.filter((r) => r.status === 'active'));
}

export function createRental(payload: CreateRentalPayload): Rental {
  const db = readDb();
  db.seq.rental += 1;
  const rentalId = db.seq.rental;

  const now = new Date().toISOString();
  const rental: Rental = {
    id: rentalId,
    renterName: payload.renterName,
    renterPhone: payload.renterPhone,
    renterIdCard: payload.renterIdCard,
    deposit: payload.deposit,
    startDate: payload.startDate,
    endDate: payload.endDate,
    actualReturnDate: null,
    status: 'active',
    items: [],
    createdAt: now,
    notes: payload.notes,
  };

  for (const it of payload.items) {
    db.seq.rentalItem += 1;
    const item: RentalItem = {
      id: db.seq.rentalItem,
      rentalId,
      equipmentId: it.equipmentId,
      accessoriesChecked: it.accessoriesChecked,
      returned: false,
    };
    db.rentalItems.push(item);
    const eq = db.equipment.find((e) => e.id === it.equipmentId);
    if (eq) eq.status = 'rented';
  }

  db.rentals.push(rental);
  writeDb(db);
  return getRental(rentalId)!;
}

export function returnRentalItem(
  itemId: number,
  payload: ReturnRentalItemPayload
): { item: RentalItem; claim?: DamageClaim; alreadyReturned: boolean } {
  const db = readDb();
  const item = db.rentalItems.find((i) => i.id === itemId);
  if (!item) throw new Error('Rental item not found');

  if (item.returned) {
    attachEquipmentRelations(db);
    return { item: clone(item), alreadyReturned: true };
  }

  const now = new Date().toISOString();
  item.returned = true;
  item.returnedAt = now;
  item.returnCondition = payload.returnCondition;
  item.missingAccessories = payload.missingAccessories || [];
  item.damageNotes = payload.damageNotes;

  if (payload.returnCondition === 'damaged' || (payload.missingAccessories && payload.missingAccessories.length > 0)) {
    item.cleaningStatus = 'pending';
  } else if (payload.returnCondition === 'needs_cleaning') {
    item.cleaningStatus = 'pending';
  } else {
    item.cleaningStatus = 'done';
    item.cleanedAt = now;
  }

  let claim: DamageClaim | undefined;
  if (payload.damageAmount && payload.damageAmount > 0 && payload.damageNotes) {
    db.seq.claim += 1;
    claim = {
      id: db.seq.claim,
      rentalId: item.rentalId,
      rentalItemId: item.id,
      equipmentId: item.equipmentId,
      description: payload.damageNotes,
      amount: payload.damageAmount,
      status: 'pending',
      createdAt: now,
    };
    db.claims.push(claim);
  }

  const eq = db.equipment.find((e) => e.id === item.equipmentId);
  if (eq) {
    eq.status = item.cleaningStatus === 'done' ? 'available' : 'cleaning';
  }

  const rental = db.rentals.find((r) => r.id === item.rentalId);
  if (rental) {
    const items = db.rentalItems.filter((i) => i.rentalId === rental.id);
    if (items.every((i) => i.returned)) {
      rental.status = 'returned';
      rental.actualReturnDate = now;
    }
  }

  writeDb(db);
  attachEquipmentRelations(db);
  return { item: clone(item), claim: claim ? clone(claim) : undefined, alreadyReturned: false };
}

export function setCleaningStatus(
  itemId: number,
  status: 'in_progress' | 'done'
): RentalItem {
  const db = readDb();
  const item = db.rentalItems.find((i) => i.id === itemId);
  if (!item) throw new Error('Rental item not found');
  item.cleaningStatus = status;
  if (status === 'done') {
    item.cleanedAt = new Date().toISOString();
    const eq = db.equipment.find((e) => e.id === item.equipmentId);
    if (eq && eq.status === 'cleaning') {
      eq.status = 'available';
      eq.lastCleanedAt = item.cleanedAt;
    }
  }
  writeDb(db);
  attachEquipmentRelations(db);
  return clone(item);
}

export function listPendingCleaning(): RentalItem[] {
  const db = readDb();
  attachEquipmentRelations(db);
  const list = db.rentalItems
    .filter((i) => i.returned && i.cleaningStatus !== 'done')
    .sort((a, b) => (a.returnedAt! > b.returnedAt! ? 1 : -1));
  return clone(list);
}

export function listClaims(filters?: { status?: string }): DamageClaim[] {
  const db = readDb();
  attachEquipmentRelations(db);
  let list = db.claims;
  if (filters?.status) list = list.filter((c) => c.status === filters.status);
  return clone(list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
}

export function resolveClaim(
  id: number,
  decision: 'approved' | 'rejected',
  approver: string
): DamageClaim {
  const db = readDb();
  const claim = db.claims.find((c) => c.id === id);
  if (!claim) throw new Error('Claim not found');
  claim.status = decision;
  claim.approvedBy = approver;
  claim.approvedAt = new Date().toISOString();

  const rental = db.rentals.find((r) => r.id === claim.rentalId);
  if (rental && decision === 'approved') {
    const items = db.rentalItems.filter((i) => i.rentalId === rental.id);
    const allApproved = db.claims
      .filter((c) => c.rentalId === rental.id)
      .every((c) => c.status !== 'pending');
    if (allApproved && items.every((i) => i.returned && i.cleaningStatus === 'done')) {
      rental.status = 'settled';
    }
  }

  writeDb(db);
  attachEquipmentRelations(db);
  return clone(claim);
}

export function getStats(): AppStats {
  const db = readDb();
  const today = new Date().toISOString().slice(0, 10);
  const todayRented = db.rentals.filter((r) => r.createdAt.slice(0, 10) === today).length;
  const todayReturned = db.rentalItems.filter(
    (i) => i.returned && i.returnedAt && i.returnedAt.slice(0, 10) === today
  ).length;
  const pendingCleaning = db.rentalItems.filter(
    (i) => i.returned && i.cleaningStatus !== 'done'
  ).length;
  const pendingClaims = db.claims.filter((c) => c.status === 'pending').length;
  const availableEquipment = db.equipment.filter((e) => e.status === 'available').length;
  return { todayRented, todayReturned, pendingCleaning, pendingClaims, availableEquipment };
}

export interface ReportRow {
  [key: string]: string | number;
}

export function depositReport(start: string, end: string): ReportRow[] {
  const db = readDb();
  return db.rentals
    .filter((r) => r.createdAt.slice(0, 10) >= start && r.createdAt.slice(0, 10) <= end)
    .map((r) => ({
      租单号: r.id,
      租客: r.renterName,
      电话: r.renterPhone,
      押金: r.deposit,
      租期: `${r.startDate} ~ ${r.endDate}`,
      状态: r.status,
      登记时间: r.createdAt,
    }));
}

export function claimReport(status?: string): ReportRow[] {
  const db = readDb();
  attachEquipmentRelations(db);
  let list = db.claims;
  if (status) list = list.filter((c) => c.status === status);
  return list.map((c) => ({
    赔损单号: c.id,
    装备: c.equipment?.name || '',
    租客: c.rental?.renterName || '',
    电话: c.rental?.renterPhone || '',
    描述: c.description,
    金额: c.amount,
    状态: c.status,
    审批人: c.approvedBy || '',
    审批时间: c.approvedAt || '',
    提交时间: c.createdAt,
  }));
}

export function availabilityReport(start: string): ReportRow[] {
  const db = readDb();
  attachEquipmentRelations(db);
  const weekEnd = new Date(start);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const rentedIds = new Set<number>();
  for (const r of db.rentals) {
    if (r.status !== 'settled' && r.endDate >= start && r.startDate <= weekEndStr) {
      for (const it of db.rentalItems.filter((i) => i.rentalId === r.id)) {
        if (!it.returned) rentedIds.add(it.equipmentId);
      }
    }
  }

  return db.equipment
    .filter((e) => e.status !== 'retired' && !rentedIds.has(e.id))
    .map((e) => ({
      编号: e.id,
      名称: e.name,
      类别: e.category,
      型号: e.model,
      押金: e.deposit,
      日租价: e.dailyRate,
      当前状态: e.status,
      上次清洁: e.lastCleanedAt || '',
    }));
}
