import type { DryingRecord } from '@/types';

const STORAGE_KEY = 'drying_records';

export function getAllRecords(): DryingRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('读取烘干记录失败:', e);
  }
  return [];
}

export function saveRecord(record: DryingRecord): void {
  const records = getAllRecords();
  records.unshift(record);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('保存烘干记录失败:', e);
  }
}

export function deleteRecord(id: string): void {
  const records = getAllRecords().filter((r) => r.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('删除烘干记录失败:', e);
  }
}

export function getRecordsByMaterial(materialName: string): DryingRecord[] {
  const records = getAllRecords();
  if (!materialName) return records;
  return records.filter((r) =>
    r.params.materialName.toLowerCase().includes(materialName.toLowerCase())
  );
}

export function getMaterialList(): string[] {
  const records = getAllRecords();
  const materials = new Set(records.map((r) => r.params.materialName).filter(Boolean));
  return Array.from(materials);
}

export function generateRecordId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function formatDate(dateStr?: string): string {
  const date = dateStr ? new Date(dateStr) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
