import Dexie from 'dexie';

const db = new Dexie('PaintCabinetDB');

db.version(1).stores({
  materials: '++id, name, type, color, unit, unitPrice, stock, minStock, specs, createdAt, updatedAt',
  courses: '++id, name, schedule, notes, createdAt',
  students: '++id, name, courseId, createdAt',
  dispensingRecords: '++id, courseId, studentId, materialId, quantity, isGift, note, createdAt',
  inventoryAdjustments: '++id, materialId, oldStock, newStock, reason, createdAt',
  colorAliases: '++id, alias, canonicalColor'
});

export default db;
