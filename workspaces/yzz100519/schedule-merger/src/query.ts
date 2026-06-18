import * as fs from 'fs';
import * as path from 'path';
import { NormalizedEntry, VersionSnapshot, Resolution } from './types';
import { listVersions, loadSnapshot } from './version';

export function queryClassSchedule(
  baseDir: string,
  className: string
): { found: boolean; version?: string; snapshot?: VersionSnapshot; message: string } {
  const versions = listVersions(baseDir);
  if (versions.length === 0) {
    return { found: false, message: '暂无版本数据，请先运行冲突检测' };
  }

  const latest = versions[versions.length - 1];
  const classEntries = latest.entries.filter(e => e.className === className);

  if (classEntries.length === 0) {
    return { found: false, version: latest.version, message: `在 v${latest.version} 中未找到班级 "${className}" 的课表` };
  }

  return {
    found: true,
    version: latest.version,
    snapshot: latest,
    message: `找到班级 "${className}" 在 v${latest.version} 中的课表，共 ${classEntries.length} 条记录`,
  };
}

export function queryConflictHistory(
  baseDir: string,
  conflictId: string
): { found: boolean; versions: VersionSnapshot[]; message: string } {
  const versions = listVersions(baseDir);
  const matching: VersionSnapshot[] = [];

  for (const v of versions) {
    const hasConflict = v.conflicts.some(c => c.id === conflictId);
    const hasResolution = v.resolutions.some(r => r.conflictId === conflictId);
    if (hasConflict || hasResolution) {
      matching.push(v);
    }
  }

  if (matching.length === 0) {
    return { found: false, versions: [], message: `未找到冲突 ${conflictId} 的历史记录` };
  }

  return {
    found: true,
    versions: matching,
    message: `找到冲突 ${conflictId} 在 ${matching.length} 个版本中的记录`,
  };
}

export function showVersionDiff(
  baseDir: string,
  fromVersion: string,
  toVersion: string
): string {
  const fromSnap = loadSnapshot(baseDir, fromVersion);
  const toSnap = loadSnapshot(baseDir, toVersion);

  if (!fromSnap) return `版本 v${fromVersion} 不存在`;
  if (!toSnap) return `版本 v${toVersion} 不存在`;

  const lines: string[] = [];
  lines.push('');
  lines.push(`版本对比: v${fromVersion} → v${toVersion}`);
  lines.push('───────────────────────────────────────');

  lines.push(`v${fromVersion}: ${fromSnap.label} (${fromSnap.createdBy} 于 ${new Date(fromSnap.createdAt).toLocaleString('zh-CN')})`);
  lines.push(`  条目: ${fromSnap.entries.length}, 冲突: ${fromSnap.conflicts.length}, 解决: ${fromSnap.resolutions.length}`);

  lines.push(`v${toVersion}: ${toSnap.label} (${toSnap.createdBy} 于 ${new Date(toSnap.createdAt).toLocaleString('zh-CN')})`);
  lines.push(`  条目: ${toSnap.entries.length}, 冲突: ${toSnap.conflicts.length}, 解决: ${toSnap.resolutions.length}`);

  const fromEntryKeys = new Set(fromSnap.entries.map(e => `${e.className}|${e.courseName}|${e.weekDay}|${e.periodStart}|${e.weekStart}`));
  const toEntryKeys = new Set(toSnap.entries.map(e => `${e.className}|${e.courseName}|${e.weekDay}|${e.periodStart}|${e.weekStart}`));

  const added = toSnap.entries.filter(e =>
    !fromEntryKeys.has(`${e.className}|${e.courseName}|${e.weekDay}|${e.periodStart}|${e.weekStart}`)
  );
  const removed = fromSnap.entries.filter(e =>
    !toEntryKeys.has(`${e.className}|${e.courseName}|${e.weekDay}|${e.periodStart}|${e.weekStart}`)
  );

  if (added.length > 0) {
    lines.push('');
    lines.push(`新增条目 (${added.length}):`);
    for (const e of added.slice(0, 10)) {
      lines.push(`  + ${e.className} ${e.courseName} 星期${e.weekDay} 第${e.periodStart}节 ${e.normalizedTeacher} ${e.normalizedRoom}`);
    }
    if (added.length > 10) lines.push(`  ... 还有 ${added.length - 10} 条`);
  }

  if (removed.length > 0) {
    lines.push('');
    lines.push(`移除条目 (${removed.length}):`);
    for (const e of removed.slice(0, 10)) {
      lines.push(`  - ${e.className} ${e.courseName} 星期${e.weekDay} 第${e.periodStart}节 ${e.normalizedTeacher} ${e.normalizedRoom}`);
    }
    if (removed.length > 10) lines.push(`  ... 还有 ${removed.length - 10} 条`);
  }

  const resolvedInTo = toSnap.resolutions.filter(r =>
    !fromSnap.resolutions.some(fr => fr.conflictId === r.conflictId)
  );
  if (resolvedInTo.length > 0) {
    lines.push('');
    lines.push(`新增解决记录 (${resolvedInTo.length}):`);
    for (const r of resolvedInTo) {
      lines.push(`  ✓ ${r.conflictId}: ${r.action} by ${r.resolvedBy} - ${r.note}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

export function listAllClasses(baseDir: string): string[] {
  const versions = listVersions(baseDir);
  if (versions.length === 0) return [];

  const latest = versions[versions.length - 1];
  const classes = new Set(latest.entries.map(e => e.className));
  return Array.from(classes).sort();
}
