import fs from 'fs';
import path from 'path';
import type { Building, WaterReading, Occupancy, RepairRecord, Holiday } from '../../shared/types';
import { generateMockData } from './mock';

interface DataStore {
  buildings: Building[];
  waterReadings: WaterReading[];
  occupancies: Occupancy[];
  repairs: RepairRecord[];
  holidays: Holiday[];
  nextId: {
    building: number;
    waterReading: number;
    occupancy: number;
    repair: number;
    holiday: number;
  };
}

const DATA_FILE = path.resolve(process.cwd(), 'data.json');

let store: DataStore;

function loadStore(): DataStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw) as DataStore;
    }
  } catch (e) {
    console.error('Failed to load data store:', e);
  }
  return {
    buildings: [],
    waterReadings: [],
    occupancies: [],
    repairs: [],
    holidays: [],
    nextId: { building: 1, waterReading: 1, occupancy: 1, repair: 1, holiday: 1 },
  };
}

export function saveStore() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save data store:', e);
  }
}

export function initStore() {
  store = loadStore();
  if (store.buildings.length === 0) {
    const mock = generateMockData();
    store.buildings = mock.buildings;
    store.waterReadings = mock.waterReadings;
    store.occupancies = mock.occupancies;
    store.repairs = mock.repairs;
    store.holidays = mock.holidays;
    store.nextId = mock.nextId;
    saveStore();
  }
}

export function getBuildings(): Building[] {
  return store.buildings;
}

export function getBuildingById(id: number): Building | undefined {
  return store.buildings.find(b => b.id === id);
}

export function addBuilding(b: Omit<Building, 'id' | 'createdAt'>): Building {
  const building: Building = { ...b, id: store.nextId.building++, createdAt: new Date().toISOString() };
  store.buildings.push(building);
  saveStore();
  return building;
}

export function updateBuilding(id: number, data: Partial<Building>): Building | undefined {
  const idx = store.buildings.findIndex(b => b.id === id);
  if (idx >= 0) {
    store.buildings[idx] = { ...store.buildings[idx], ...data, id };
    saveStore();
    return store.buildings[idx];
  }
  return undefined;
}

export function getWaterReadings(buildingId?: number, startDate?: string, endDate?: string): WaterReading[] {
  let list = store.waterReadings;
  if (buildingId != null) list = list.filter(r => r.buildingId === buildingId);
  if (startDate) list = list.filter(r => r.readingDate >= startDate);
  if (endDate) list = list.filter(r => r.readingDate <= endDate);
  return [...list].sort((a, b) => a.readingDate.localeCompare(b.readingDate) || a.period.localeCompare(b.period));
}

export function addWaterReadings(readings: Omit<WaterReading, 'id' | 'createdAt'>[]): WaterReading[] {
  const created: WaterReading[] = [];
  for (const r of readings) {
    const reading: WaterReading = { ...r, id: store.nextId.waterReading++, createdAt: new Date().toISOString() };
    store.waterReadings.push(reading);
    created.push(reading);
  }
  saveStore();
  return created;
}

export function getOccupancies(buildingId?: number, startDate?: string, endDate?: string): Occupancy[] {
  let list = store.occupancies;
  if (buildingId != null) list = list.filter(o => o.buildingId === buildingId);
  if (startDate) list = list.filter(o => o.date >= startDate);
  if (endDate) list = list.filter(o => o.date <= endDate);
  return [...list].sort((a, b) => a.date.localeCompare(b.date));
}

export function addOccupancies(list: Omit<Occupancy, 'id'>[]): Occupancy[] {
  const created: Occupancy[] = [];
  for (const o of list) {
    const occ: Occupancy = { ...o, id: store.nextId.occupancy++ };
    store.occupancies.push(occ);
    created.push(occ);
  }
  saveStore();
  return created;
}

export function getRepairs(buildingId?: number): RepairRecord[] {
  let list = store.repairs;
  if (buildingId != null) list = list.filter(r => r.buildingId === buildingId);
  return [...list].sort((a, b) => b.reportDate.localeCompare(a.reportDate));
}

export function addRepair(r: Omit<RepairRecord, 'id'>): RepairRecord {
  const rec: RepairRecord = { ...r, id: store.nextId.repair++ };
  store.repairs.push(rec);
  saveStore();
  return rec;
}

export function updateRepair(id: number, data: Partial<RepairRecord>): RepairRecord | undefined {
  const idx = store.repairs.findIndex(r => r.id === id);
  if (idx >= 0) {
    store.repairs[idx] = { ...store.repairs[idx], ...data, id };
    saveStore();
    return store.repairs[idx];
  }
  return undefined;
}

export function addRepairs(list: Omit<RepairRecord, 'id'>[]): RepairRecord[] {
  return list.map(r => addRepair(r));
}

export function getHolidays(): Holiday[] {
  return [...store.holidays].sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function addHoliday(h: Omit<Holiday, 'id'>): Holiday {
  const hol: Holiday = { ...h, id: store.nextId.holiday++ };
  store.holidays.push(hol);
  saveStore();
  return hol;
}

export function deleteHoliday(id: number): boolean {
  const idx = store.holidays.findIndex(h => h.id === id);
  if (idx >= 0) {
    store.holidays.splice(idx, 1);
    saveStore();
    return true;
  }
  return false;
}

export function addHolidays(list: Omit<Holiday, 'id'>[]): Holiday[] {
  return list.map(h => addHoliday(h));
}
