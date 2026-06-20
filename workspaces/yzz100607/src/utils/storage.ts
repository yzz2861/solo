import type { CalculationRecord } from '@/types';

const STORAGE_KEY = 'drainage-calculation-records';

export function loadRecords(): CalculationRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load records:', e);
  }
  return [];
}

export function saveRecords(records: CalculationRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save records:', e);
  }
}

export function addRecord(record: CalculationRecord): CalculationRecord[] {
  const records = loadRecords();
  records.unshift(record);
  if (records.length > 50) {
    records.pop();
  }
  saveRecords(records);
  return records;
}

export function updateRecord(record: CalculationRecord): CalculationRecord[] {
  const records = loadRecords();
  const index = records.findIndex((r) => r.id === record.id);
  if (index !== -1) {
    records[index] = {
      ...record,
      updatedAt: new Date().toISOString(),
    };
    saveRecords(records);
  }
  return records;
}

export function deleteRecord(id: string): CalculationRecord[] {
  const records = loadRecords().filter((r) => r.id !== id);
  saveRecords(records);
  return records;
}

export function getRecordById(id: string): CalculationRecord | undefined {
  const records = loadRecords();
  return records.find((r) => r.id === id);
}

export function generateRecordId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `DR-${timestamp}-${random}`.toUpperCase();
}
