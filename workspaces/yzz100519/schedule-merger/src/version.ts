import * as fs from 'fs';
import * as path from 'path';
import { VersionSnapshot, Resolution, NormalizedEntry, Conflict } from './types';

const VERSIONS_DIR = 'versions';

export function getVersionsDir(baseDir: string): string {
  return path.join(baseDir, VERSIONS_DIR);
}

export function saveSnapshot(
  baseDir: string,
  snapshot: VersionSnapshot
): string {
  const vDir = getVersionsDir(baseDir);
  if (!fs.existsSync(vDir)) {
    fs.mkdirSync(vDir, { recursive: true });
  }

  const filePath = path.join(vDir, `v${snapshot.version}.json`);
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
  return filePath;
}

export function loadSnapshot(baseDir: string, version: string): VersionSnapshot | null {
  const filePath = path.join(getVersionsDir(baseDir), `v${version}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as VersionSnapshot;
}

export function listVersions(baseDir: string): VersionSnapshot[] {
  const vDir = getVersionsDir(baseDir);
  if (!fs.existsSync(vDir)) return [];

  return fs.readdirSync(vDir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const content = fs.readFileSync(path.join(vDir, f), 'utf-8');
      return JSON.parse(content) as VersionSnapshot;
    })
    .sort((a, b) => a.version.localeCompare(b.version));
}

export function getNextVersion(baseDir: string): string {
  const versions = listVersions(baseDir);
  if (versions.length === 0) return '1.0';
  const last = versions[versions.length - 1];
  const parts = last.version.split('.');
  const minor = parseInt(parts[1] || '0', 10) + 1;
  return `${parts[0]}.${minor}`;
}

export function resolveConflict(
  conflict: Conflict,
  action: Resolution['action'],
  resolvedBy: string,
  note: string,
  entries: NormalizedEntry[],
  newRoom?: string,
  newPeriodStart?: number,
  newPeriodEnd?: number
): Resolution {
  let finalEntries: NormalizedEntry[];

  switch (action) {
    case 'keep_first':
      finalEntries = [entries[0]];
      break;
    case 'keep_second':
      finalEntries = [entries[1]];
      break;
    case 'keep_both_with_note':
      finalEntries = entries.map(e => ({ ...e, note: `${e.note}; [保留双课] ${note}`.trim() }));
      break;
    case 'reassign_room': {
      const targetRoom = newRoom || note;
      finalEntries = entries.map((e, i) => {
        if (i !== 1) return e;
        return {
          ...e,
          roomName: targetRoom,
          normalizedRoom: targetRoom,
          note: `${e.note}; [更换教室→${targetRoom}] ${note}`.trim(),
        };
      });
      break;
    }
    case 'reassign_time': {
      const original = entries[1];
      const duration = original.periodEnd - original.periodStart;
      const ps = newPeriodStart ?? original.periodStart;
      const pe = newPeriodEnd ?? (ps + duration);
      finalEntries = entries.map((e, i) => {
        if (i !== 1) return e;
        return {
          ...e,
          periodStart: ps,
          periodEnd: pe,
          isConsecutive: pe > ps,
          note: `${e.note}; [调整时间→第${ps}-${pe}节] ${note}`.trim(),
        };
      });
      break;
    }
    case 'manual':
      finalEntries = entries;
      break;
    default:
      finalEntries = entries;
  }

  const result: Resolution = {
    conflictId: conflict.id,
    action,
    resolvedBy,
    resolvedAt: new Date().toISOString(),
    note,
    finalEntries,
  };
  if (action === 'reassign_room' && newRoom) result.newRoom = newRoom;
  if (action === 'reassign_time') {
    if (newPeriodStart !== undefined) result.newPeriodStart = newPeriodStart;
    if (newPeriodEnd !== undefined) result.newPeriodEnd = newPeriodEnd;
  }
  return result;
}

export function createBeforeSnapshot(
  baseDir: string,
  entries: NormalizedEntry[],
  conflicts: Conflict[],
  createdBy: string,
  label: string
): VersionSnapshot {
  const version = getNextVersion(baseDir);
  const snapshot: VersionSnapshot = {
    version,
    label: label || `冲突检测前 v${version}`,
    createdAt: new Date().toISOString(),
    createdBy,
    entries,
    conflicts,
    resolutions: [],
  };
  saveSnapshot(baseDir, snapshot);
  return snapshot;
}

export function createAfterSnapshot(
  baseDir: string,
  entries: NormalizedEntry[],
  conflicts: Conflict[],
  resolutions: Resolution[],
  createdBy: string,
  label: string,
  beforeVersion: string
): VersionSnapshot {
  const version = getNextVersion(baseDir);
  const snapshot: VersionSnapshot = {
    version,
    label: label || `冲突解决后 v${version} (基于 v${beforeVersion})`,
    createdAt: new Date().toISOString(),
    createdBy,
    entries,
    conflicts,
    resolutions,
  };
  saveSnapshot(baseDir, snapshot);
  return snapshot;
}
