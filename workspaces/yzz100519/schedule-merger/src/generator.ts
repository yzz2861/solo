import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { NormalizedEntry, ClassTimetableView, Resolution } from './types';

const DAY_NAMES = ['', '一', '二', '三', '四', '五', '六', '日'];

function entryKey(e: NormalizedEntry): string {
  return `${e.className}|${e.courseName}|${e.normalizedTeacher}|${e.normalizedRoom}|${e.weekDay}|${e.periodStart}|${e.periodEnd}|${e.weekStart}|${e.weekEnd}|${e.weekParity}`;
}

export function generateNewSchedule(
  entries: NormalizedEntry[],
  resolutions: Resolution[]
): NormalizedEntry[] {
  const removeKeys = new Set<string>();
  const replaceMap = new Map<string, NormalizedEntry>();

  for (const r of resolutions) {
    if (r.originalEntries.length < 2) continue;

    const origKeyA = entryKey(r.originalEntries[0]);
    const origKeyB = entryKey(r.originalEntries[1]);

    switch (r.action) {
      case 'keep_first':
        removeKeys.add(origKeyB);
        break;
      case 'keep_second':
        removeKeys.add(origKeyA);
        break;
      case 'keep_both_with_note':
        replaceMap.set(origKeyA, r.finalEntries[0]);
        replaceMap.set(origKeyB, r.finalEntries[1]);
        break;
      case 'reassign_room':
      case 'reassign_time':
        replaceMap.set(origKeyA, r.finalEntries[0]);
        replaceMap.set(origKeyB, r.finalEntries[1]);
        break;
      case 'manual':
        break;
    }
  }

  const result: NormalizedEntry[] = [];
  const seenKeys = new Set<string>();

  for (const e of entries) {
    const k = entryKey(e);
    if (removeKeys.has(k)) continue;
    if (seenKeys.has(k)) continue;

    if (replaceMap.has(k)) {
      result.push(replaceMap.get(k)!);
    } else {
      result.push(e);
    }
    seenKeys.add(k);
  }

  for (const r of resolutions) {
    for (const fe of r.finalEntries) {
      const fk = entryKey(fe);
      if (!seenKeys.has(fk)) {
        result.push(fe);
        seenKeys.add(fk);
      }
    }
  }

  return result;
}

export function exportScheduleCSV(
  entries: NormalizedEntry[],
  outputPath: string
): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const header = '班级,课程,教师,教室,星期,节次,周次,单双周,连堂,备注,来源';
  const rows = entries.map(e => {
    const wp = e.weekParity === 'odd' ? '单周' : e.weekParity === 'even' ? '双周' : '全周';
    const period = e.periodStart === e.periodEnd
      ? `第${e.periodStart}节`
      : `第${e.periodStart}-${e.periodEnd}节`;
    const week = e.weekStart === e.weekEnd
      ? `第${e.weekStart}周`
      : `第${e.weekStart}-${e.weekEnd}周`;
    const consec = e.isConsecutive ? '是' : '否';
    return `${e.className},${e.courseName},${e.normalizedTeacher},${e.normalizedRoom},星期${DAY_NAMES[e.weekDay]},${period},${week},${wp},${consec},${e.note},${e.source}`;
  });

  fs.writeFileSync(outputPath, [header, ...rows].join('\n'), 'utf-8');
}

export function exportScheduleXlsx(
  entries: NormalizedEntry[],
  outputPath: string
): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const data = entries.map(e => {
    const wp = e.weekParity === 'odd' ? '单周' : e.weekParity === 'even' ? '双周' : '全周';
    return {
      班级: e.className,
      课程: e.courseName,
      教师: e.normalizedTeacher,
      教室: e.normalizedRoom,
      星期: `星期${DAY_NAMES[e.weekDay]}`,
      节次: e.periodStart === e.periodEnd ? `第${e.periodStart}节` : `第${e.periodStart}-${e.periodEnd}节`,
      周次: e.weekStart === e.weekEnd ? `第${e.weekStart}周` : `第${e.weekStart}-${e.weekEnd}周`,
      单双周: wp,
      连堂: e.isConsecutive ? '是' : '否',
      备注: e.note,
      来源: e.source,
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, '合并课表');
  XLSX.writeFile(wb, outputPath);
}

export function getClassTimetable(
  entries: NormalizedEntry[],
  className: string
): ClassTimetableView {
  const classEntries = entries.filter(e => e.className === className);

  const schedule = classEntries.map(e => ({
    weekDay: e.weekDay,
    periodStart: e.periodStart,
    periodEnd: e.periodEnd,
    courseName: e.courseName,
    teacherName: e.normalizedTeacher,
    roomName: e.normalizedRoom,
    weekStart: e.weekStart,
    weekEnd: e.weekEnd,
    weekParity: e.weekParity,
  }));

  schedule.sort((a, b) => a.weekDay - b.weekDay || a.periodStart - b.periodStart);

  return { className, schedule };
}

export function formatClassTimetable(view: ClassTimetableView): string {
  const lines: string[] = [];
  lines.push('');
  lines.push(`═══════════════════════════════════════`);
  lines.push(`  ${view.className} 课表`);
  lines.push(`═══════════════════════════════════════`);

  const byDay = new Map<number, typeof view.schedule>();
  for (const s of view.schedule) {
    if (!byDay.has(s.weekDay)) byDay.set(s.weekDay, []);
    byDay.get(s.weekDay)!.push(s);
  }

  for (let day = 1; day <= 7; day++) {
    const dayEntries = byDay.get(day);
    if (!dayEntries || dayEntries.length === 0) continue;

    lines.push('');
    lines.push(`  星期${DAY_NAMES[day]}`);
    lines.push('  ─────────────────────────────');

    for (const s of dayEntries) {
      const wp = s.weekParity === 'odd' ? '(单)' : s.weekParity === 'even' ? '(双)' : '';
      const period = s.periodStart === s.periodEnd
        ? `第${s.periodStart}节`
        : `第${s.periodStart}-${s.periodEnd}节`;
      const week = s.weekStart === s.weekEnd
        ? `第${s.weekStart}周`
        : `第${s.weekStart}-${s.weekEnd}周`;
      lines.push(`  ${period} ${wp} ${week}`);
      lines.push(`    ${s.courseName} | ${s.teacherName} | ${s.roomName}`);
    }
  }

  lines.push('');
  lines.push(`═══════════════════════════════════════`);
  lines.push('');
  return lines.join('\n');
}
