import * as fs from 'fs';
import { ScheduleEntry, NormalizedEntry, AliasMap } from './types';

const DEFAULT_ALIAS_MAP: AliasMap = {
  teachers: {},
  rooms: {},
};

export function loadAliasMap(aliasPath?: string): AliasMap {
  if (!aliasPath || !fs.existsSync(aliasPath)) return DEFAULT_ALIAS_MAP;
  const content = fs.readFileSync(aliasPath, 'utf-8');
  return JSON.parse(content) as AliasMap;
}

export function resolveAlias(name: string, aliasGroup: Record<string, string[]>): string {
  for (const [canonical, aliases] of Object.entries(aliasGroup)) {
    if (canonical === name) return canonical;
    if (aliases.includes(name)) return canonical;
    for (const alias of aliases) {
      if (name.replace(/\s/g, '') === alias.replace(/\s/g, '')) return canonical;
    }
  }
  return name;
}

function normalizeTeacherName(name: string, aliasMap: AliasMap): string {
  let resolved = resolveAlias(name, aliasMap.teachers);

  resolved = resolved
    .replace(/[老师教师]/g, '')
    .replace(/\s+/g, '')
    .replace(/[（(].*?[）)]/g, '');

  return resolved;
}

function normalizeRoomName(name: string, aliasMap: AliasMap): string {
  let resolved = resolveAlias(name, aliasMap.rooms);

  resolved = resolved
    .replace(/\s+/g, '')
    .replace(/楼/g, '-');

  if (resolved && !resolved.includes('-') && /[0-9]/.test(resolved)) {
    resolved = resolved.replace(/([A-Za-z\u4e00-\u9fa5]+)(\d+)/, '$1-$2');
  }

  return resolved;
}

export function normalizeEntries(entries: ScheduleEntry[], aliasMap: AliasMap): NormalizedEntry[] {
  return entries.map(entry => ({
    ...entry,
    normalizedTeacher: normalizeTeacherName(entry.teacherName, aliasMap),
    normalizedRoom: normalizeRoomName(entry.roomName, aliasMap),
  }));
}

export function buildAliasMapFromEntries(entries: NormalizedEntry[]): AliasMap {
  const teachers: Record<string, string[]> = {};
  const rooms: Record<string, string[]> = {};

  for (const e of entries) {
    const canonicalT = e.normalizedTeacher;
    if (canonicalT) {
      if (!teachers[canonicalT]) teachers[canonicalT] = [];
      if (e.teacherName !== canonicalT && !teachers[canonicalT].includes(e.teacherName)) {
        teachers[canonicalT].push(e.teacherName);
      }
    }

    const canonicalR = e.normalizedRoom;
    if (canonicalR) {
      if (!rooms[canonicalR]) rooms[canonicalR] = [];
      if (e.roomName !== canonicalR && !rooms[canonicalR].includes(e.roomName)) {
        rooms[canonicalR].push(e.roomName);
      }
    }
  }

  return { teachers, rooms };
}
