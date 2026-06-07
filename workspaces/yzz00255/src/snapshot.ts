import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { SnapshotRecord, HotlineRecord } from './types';

export function loadSnapshot(snapshotPath: string): SnapshotRecord[] {
  const absolutePath = path.resolve(snapshotPath);

  if (!fs.existsSync(absolutePath)) {
    return [];
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  if (content.trim() === '') {
    return [];
  }

  try {
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    return records.map((r: any) => ({
      id: r.id || '',
      category: r.category || undefined,
      department: r.department || undefined,
      status: r.status as any || undefined,
      snapshotTime: r.snapshotTime || new Date().toISOString(),
    }));
  } catch (e) {
    throw new Error(`快照文件解析失败: ${e instanceof Error ? e.message : '未知错误'}`);
  }
}

export function findSnapshotRecord(
  recordId: string,
  snapshots: SnapshotRecord[]
): SnapshotRecord | undefined {
  return snapshots.find((s) => s.id === recordId);
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateOf?: string;
  duplicateFields: string[];
}

export function checkDuplicate(
  record: HotlineRecord,
  checkFields: string[],
  processedRecords: HotlineRecord[],
  snapshots: SnapshotRecord[]
): DuplicateCheckResult {
  for (const processed of processedRecords) {
    const matchedFields: string[] = [];

    for (const field of checkFields) {
      const recordValue = String(record[field] || '').trim();
      const processedValue = String(processed[field] || '').trim();

      if (recordValue && processedValue && recordValue === processedValue) {
        matchedFields.push(field);
      }
    }

    if (matchedFields.length > 0 && matchedFields.length === checkFields.length) {
      return {
        isDuplicate: true,
        duplicateOf: processed.id,
        duplicateFields: matchedFields,
      };
    }
  }

  for (const snap of snapshots) {
    const snapRecord = snap as any;
    const matchedFields: string[] = [];

    for (const field of checkFields) {
      const recordValue = String(record[field] || '').trim();
      const snapValue = String(snapRecord[field] || '').trim();

      if (recordValue && snapValue && recordValue === snapValue) {
        matchedFields.push(field);
      }
    }

    if (matchedFields.length > 0 && matchedFields.length === checkFields.length) {
      return {
        isDuplicate: true,
        duplicateOf: snap.id,
        duplicateFields: matchedFields,
      };
    }
  }

  return {
    isDuplicate: false,
    duplicateFields: [],
  };
}

export function buildDuplicateKey(
  record: HotlineRecord,
  checkFields: string[]
): string {
  return checkFields
    .map((f) => String(record[f] || '').trim().toLowerCase())
    .join('|||');
}
