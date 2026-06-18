import type { BorrowRecord, RecordStatus } from '@/types';
import { mockPoints } from './mockPoints';

const POINT_IDS = mockPoints.map((p) => p.id);
const ACTIVE_POINT_IDS = mockPoints.filter((p) => p.status === 'active').map((p) => p.id);
const TEMP_REMOVED_POINT_ID = 'pt-subway-002';

function generatePhones(count: number): string[] {
  const prefixes = ['138', '139', '150', '151', '152', '158', '159', '186', '187', '188', '136', '137', '156', '189'];
  const set: Set<string> = new Set();
  while (set.size < count) {
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const rest = String(Math.floor(10000000 + Math.random() * 89999999));
    const phone = p + rest;
    const masked = phone.slice(0, 3) + '****' + phone.slice(7);
    set.add(masked);
  }
  return Array.from(set);
}

const USER_PHONES = generatePhones(200);

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function fmtDateTime(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function fmtId(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(6, '0')}`;
}

const TOTAL_RECORDS = 1500;
const RETURNED_COUNT = 1170;
const CROSS_POINT_RETURNED_COUNT = 140;
const BORROWING_COUNT = 120;
const OVERDUE_COUNT = 210;
const SCAN_FAIL_COUNT = 30;
const DUPLICATE_BORROW_GROUPS = 10;
const TEMP_REMOVED_ASSOC_COUNT = 25;

const today = new Date(2026, 5, 18);
today.setHours(23, 59, 59, 999);

function randomDateInRange(startDaysAgo: number, endDaysAgo: number, startHour: number = 6, endHour: number = 22): Date {
  const daysAgo = Math.floor(Math.random() * (endDaysAgo - startDaysAgo + 1)) + startDaysAgo;
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgo);
  const hour = Math.floor(Math.random() * (endHour - startHour + 1)) + startHour;
  const minute = Math.floor(Math.random() * 60);
  const second = Math.floor(Math.random() * 60);
  d.setHours(hour, minute, second, 0);
  return d;
}

function addHours(d: Date, hours: number): Date {
  const nd = new Date(d);
  nd.setTime(nd.getTime() + hours * 3600 * 1000);
  return nd;
}

function addDays(d: Date, days: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + days);
  return nd;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const records: BorrowRecord[] = [];
const usedUmbrellaIdsForDuplicate: Set<string> = new Set();
const duplicateBorrowBaseIds: string[] = [];
for (let i = 0; i < DUPLICATE_BORROW_GROUPS; i++) {
  duplicateBorrowBaseIds.push(fmtId('umb', 900 + i));
}

const scanFailIndices: Set<number> = new Set();
while (scanFailIndices.size < SCAN_FAIL_COUNT) {
  scanFailIndices.add(Math.floor(Math.random() * TOTAL_RECORDS));
}

const tempRemovedAssocIndices: Set<number> = new Set();
while (tempRemovedAssocIndices.size < TEMP_REMOVED_ASSOC_COUNT) {
  tempRemovedAssocIndices.add(Math.floor(Math.random() * TOTAL_RECORDS));
}

function buildRecord(
  idx: number,
  status: RecordStatus,
  borrowPointId: string,
  returnPointId: string | null,
  borrowTime: Date,
  returnTime: Date | null,
  crossPoint: boolean,
  umbrellaId: string,
  scanFail: number,
): BorrowRecord {
  const phoneIdx = Math.floor(Math.random() * USER_PHONES.length);
  return {
    id: fmtId('rec', idx + 1),
    umbrellaId,
    userId: fmtId('usr', phoneIdx + 1),
    userPhone: USER_PHONES[phoneIdx],
    borrowPointId,
    returnPointId,
    borrowTime,
    returnTime,
    status,
    scanFailCount: scanFail,
    crossPointReturn: crossPoint,
  };
}

let globalRecIdx = 0;

const usedDuplicateGroups: Set<string> = new Set();

while (globalRecIdx < TOTAL_RECORDS) {
  const isDuplicateBase = duplicateBorrowBaseIds.length > 0 && !usedDuplicateGroups.has(duplicateBorrowBaseIds[usedDuplicateGroups.size]) && usedDuplicateGroups.size < DUPLICATE_BORROW_GROUPS;

  if (isDuplicateBase) {
    const baseUmbId = duplicateBorrowBaseIds[usedDuplicateGroups.size];
    usedDuplicateGroups.add(baseUmbId);

    const baseBorrowTime = randomDateInRange(2, 12);
    const pointId = randomChoice(ACTIVE_POINT_IDS);
    const baseScanFail = scanFailIndices.has(globalRecIdx) ? 1 + Math.floor(Math.random() * 3) : 0;
    if (baseScanFail > 0) scanFailIndices.delete(globalRecIdx);

    const r1 = buildRecord(
      globalRecIdx,
      'returned',
      pointId,
      randomChoice(ACTIVE_POINT_IDS),
      baseBorrowTime,
      addHours(baseBorrowTime, 0.5 + Math.random() * 2),
      Math.random() < 0.2,
      baseUmbId,
      baseScanFail,
    );
    records.push(r1);
    globalRecIdx++;

    if (globalRecIdx < TOTAL_RECORDS) {
      const t2 = new Date(baseBorrowTime);
      t2.setTime(t2.getTime() + (2 + Math.floor(Math.random() * 8)) * 60 * 1000);
      const r2ScanFail = scanFailIndices.has(globalRecIdx) ? 1 + Math.floor(Math.random() * 3) : 0;
      if (r2ScanFail > 0) scanFailIndices.delete(globalRecIdx);

      const r2 = buildRecord(
        globalRecIdx,
        Math.random() < 0.6 ? 'returned' : 'overdue',
        pointId,
        Math.random() < 0.7 ? pointId : randomChoice(ACTIVE_POINT_IDS),
        t2,
        Math.random() < 0.6 ? addHours(t2, 1 + Math.random() * 4) : null,
        Math.random() < 0.2,
        baseUmbId,
        r2ScanFail,
      );
      if (r2.status === 'overdue') {
        r2.returnTime = null;
      }
      records.push(r2);
      globalRecIdx++;
    }
    continue;
  }

  const scanFail = scanFailIndices.has(globalRecIdx) ? 1 + Math.floor(Math.random() * 3) : 0;
  if (scanFail > 0) scanFailIndices.delete(globalRecIdx);

  const isTempRemovedAssoc = tempRemovedAssocIndices.has(globalRecIdx);
  if (isTempRemovedAssoc) tempRemovedAssocIndices.delete(globalRecIdx);

  let status: RecordStatus;
  let borrowPointId: string;
  let returnPointId: string | null;
  let borrowTime: Date;
  let returnTime: Date | null;
  let crossPoint = false;

  const bucketCutoff1 = RETURNED_COUNT;
  const bucketCutoff2 = RETURNED_COUNT + BORROWING_COUNT;

  if (globalRecIdx < bucketCutoff1) {
    status = 'returned';
    const crossPointCutoff = Math.floor(RETURNED_COUNT * (1 - CROSS_POINT_RETURNED_COUNT / RETURNED_COUNT));
    crossPoint = globalRecIdx >= crossPointCutoff;

    borrowTime = randomDateInRange(1, 13);
    returnTime = addHours(borrowTime, 0.3 + Math.random() * 8);

    if (isTempRemovedAssoc) {
      borrowPointId = TEMP_REMOVED_POINT_ID;
      returnPointId = crossPoint ? randomChoice(ACTIVE_POINT_IDS) : TEMP_REMOVED_POINT_ID;
    } else {
      borrowPointId = randomChoice(ACTIVE_POINT_IDS);
      returnPointId = crossPoint ? randomChoice(ACTIVE_POINT_IDS.filter((p) => p !== borrowPointId)) : borrowPointId;
    }
  } else if (globalRecIdx < bucketCutoff2) {
    status = 'borrowing';
    borrowTime = randomDateInRange(0, 2, 8, 20);
    returnTime = null;
    borrowPointId = isTempRemovedAssoc ? TEMP_REMOVED_POINT_ID : randomChoice(ACTIVE_POINT_IDS);
    returnPointId = null;
  } else {
    status = 'overdue';
    const overdueDays = 1 + Math.floor(Math.random() * 30);
    borrowTime = addDays(randomDateInRange(overdueDays + 1, overdueDays + 10, 7, 21), -overdueDays);
    returnTime = null;
    borrowPointId = isTempRemovedAssoc ? TEMP_REMOVED_POINT_ID : randomChoice(ACTIVE_POINT_IDS);
    returnPointId = null;
  }

  const umbrellaId = fmtId('umb', 100 + Math.floor(Math.random() * 800));

  records.push(
    buildRecord(
      globalRecIdx,
      status,
      borrowPointId,
      returnPointId,
      borrowTime,
      returnTime,
      crossPoint,
      umbrellaId,
      scanFail,
    ),
  );
  globalRecIdx++;
}

export const mockRecords: BorrowRecord[] = records;
export const mockUserPhones: string[] = USER_PHONES;
