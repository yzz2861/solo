import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, '..', 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

interface DB {
  customers: any[]
  vehicles: any[]
  test_rides: any[]
  feedbacks: any[]
  vehicle_issues: any[]
  seq: { [key: string]: number }
}

const defaultDB: DB = {
  customers: [
    { id: 1, name: '张三', phone: '13800001001', id_card: '110101199001011234', tags: '通勤代步', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, name: '李四', phone: '13800001002', id_card: '110101199202022345', tags: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, name: '王五', phone: '13800001003', id_card: '', tags: '运动骑行', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 4, name: '赵六', phone: '13800001004', id_card: '', tags: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 5, name: '孙七', phone: '13800001005', id_card: '110101199505055678', tags: '长续航', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ],
  vehicles: [
    { id: 1, model: '小牛 N1', frame_number: 'NF20240001', battery_level: 85, status: 'available', notes: '白色', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, model: '小牛 M1', frame_number: 'NF20240002', battery_level: 92, status: 'available', notes: '黑色', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, model: '九号 C90', frame_number: 'JH20240001', battery_level: 45, status: 'available', notes: '银灰', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 4, model: '九号 A40', frame_number: 'JH20240002', battery_level: 15, status: 'low_battery', notes: '蓝色', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 5, model: '雅迪 G5', frame_number: 'YD20240001', battery_level: 78, status: 'available', notes: '红色', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 6, model: '雅迪 T9', frame_number: 'YD20240002', battery_level: 100, status: 'available', notes: '白色', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 7, model: '爱玛 A500', frame_number: 'AM20240001', battery_level: 60, status: 'available', notes: '绿色', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 8, model: '爱玛 酷迅', frame_number: 'AM20240002', battery_level: 10, status: 'low_battery', notes: '橙色', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 9, model: '台铃 超能', frame_number: 'TL20240001', battery_level: 88, status: 'available', notes: '蓝色', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 10, model: '绿源 S30', frame_number: 'LY20240001', battery_level: 72, status: 'available', notes: '白色', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ],
  test_rides: [],
  feedbacks: [],
  vehicle_issues: [],
  seq: { customers: 5, vehicles: 10, test_rides: 0, feedbacks: 0, vehicle_issues: 0 },
}

let db: DB = defaultDB

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8')
      db = JSON.parse(raw)
    } else {
      db = JSON.parse(JSON.stringify(defaultDB))
      saveDB()
    }
  } catch (e) {
    db = JSON.parse(JSON.stringify(defaultDB))
  }
}

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8')
  } catch (e) {
    console.error('save db error', e)
  }
}

loadDB()

function nextId(table: keyof DB['seq']): number {
  db.seq[table] = (db.seq[table] || 0) + 1
  saveDB()
  return db.seq[table]
}

export interface RunResult {
  lastInsertRowid: number
  changes: number
}

export class Table<T extends { id: number }> {
  name: keyof DB

  constructor(name: keyof DB) {
    this.name = name
  }

  all(filter?: (row: T) => boolean): T[] {
    const list = (db[this.name] as T[]).slice()
    return filter ? list.filter(filter) : list
  }

  get(id: number): T | undefined {
    return (db[this.name] as T[]).find((r) => r.id === id)
  }

  findOne(predicate: (row: T) => boolean): T | undefined {
    return (db[this.name] as T[]).find(predicate)
  }

  insert(data: Omit<T, 'id' | 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string }): RunResult {
    const list = db[this.name] as any[]
    const id = nextId(this.name as any)
    const now = new Date().toISOString()
    const row: any = { ...data, id, created_at: data.created_at || now, updated_at: data.updated_at || now }
    list.push(row)
    saveDB()
    return { lastInsertRowid: id, changes: 1 }
  }

  update(id: number, data: Partial<T>): RunResult {
    const list = db[this.name] as any[]
    const idx = list.findIndex((r) => r.id === id)
    if (idx === -1) return { lastInsertRowid: 0, changes: 0 }
    list[idx] = { ...list[idx], ...data, updated_at: new Date().toISOString() }
    saveDB()
    return { lastInsertRowid: id, changes: 1 }
  }

  remove(id: number): RunResult {
    const list = db[this.name] as any[]
    const idx = list.findIndex((r) => r.id === id)
    if (idx === -1) return { lastInsertRowid: 0, changes: 0 }
    list.splice(idx, 1)
    saveDB()
    return { lastInsertRowid: id, changes: 1 }
  }

  count(predicate?: (row: T) => boolean): number {
    const list = db[this.name] as T[]
    return predicate ? list.filter(predicate).length : list.length
  }

  transaction(fn: () => void) {
    fn()
    saveDB()
  }
}

export const tables = {
  customers: new Table<any>('customers'),
  vehicles: new Table<any>('vehicles'),
  test_rides: new Table<any>('test_rides'),
  feedbacks: new Table<any>('feedbacks'),
  vehicle_issues: new Table<any>('vehicle_issues'),
}

export default db
