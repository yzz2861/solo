import { NormalizedEntry, Conflict, ConflictReport, WeekParity } from './types';

let conflictCounter = 0;

function nextId(): string {
  conflictCounter++;
  return `CONFLICT-${String(conflictCounter).padStart(4, '0')}`;
}

export function resetConflictCounter(): void {
  conflictCounter = 0;
}

function weeksOverlap(
  aStart: number, aEnd: number, aParity: WeekParity,
  bStart: number, bEnd: number, bParity: WeekParity
): boolean {
  const overlapStart = Math.max(aStart, bStart);
  const overlapEnd = Math.min(aEnd, bEnd);
  if (overlapStart > overlapEnd) return false;

  if (aParity === 'all' && bParity === 'all') return true;
  if (aParity === 'all' || bParity === 'all') {
    const parity = aParity === 'all' ? bParity : aParity;
    for (let w = overlapStart; w <= overlapEnd; w++) {
      if (parity === 'odd' && w % 2 === 1) return true;
      if (parity === 'even' && w % 2 === 0) return true;
    }
    return false;
  }

  return aParity === bParity;
}

function periodsOverlap(a: NormalizedEntry, b: NormalizedEntry): boolean {
  if (a.weekDay !== b.weekDay) return false;
  const pOverlap = a.periodStart <= b.periodEnd && b.periodStart <= a.periodEnd;
  if (!pOverlap) return false;
  return weeksOverlap(a.weekStart, a.weekEnd, a.weekParity, b.weekStart, b.weekEnd, b.weekParity);
}

function isSameSession(a: NormalizedEntry, b: NormalizedEntry): boolean {
  return a.className === b.className
    && a.courseName === b.courseName
    && a.normalizedTeacher === b.normalizedTeacher
    && a.weekDay === b.weekDay
    && a.periodStart === b.periodStart
    && a.periodEnd === b.periodEnd
    && a.weekStart === b.weekStart
    && a.weekEnd === b.weekEnd
    && a.weekParity === b.weekParity;
}

export function deduplicateEntries(entries: NormalizedEntry[]): NormalizedEntry[] {
  const deduped: NormalizedEntry[] = [];
  const seen = new Map<string, NormalizedEntry>();

  for (const e of entries) {
    const key = `${e.className}|${e.courseName}|${e.normalizedTeacher}|${e.normalizedRoom}|${e.weekDay}|${e.periodStart}|${e.periodEnd}|${e.weekStart}|${e.weekEnd}|${e.weekParity}`;
    if (!seen.has(key)) {
      seen.set(key, { ...e });
      deduped.push(seen.get(key)!);
    } else {
      const existing = seen.get(key)!;
      if (e.note && !existing.note) {
        existing.note = e.note;
      }
      if (e.source !== existing.source) {
        existing.source = `${existing.source};${e.source}`;
      }
    }
  }

  return deduped;
}

function describeWeekParity(parity: WeekParity): string {
  if (parity === 'odd') return '单周';
  if (parity === 'even') return '双周';
  return '全周';
}

function describeEntry(e: NormalizedEntry): string {
  const wp = describeWeekParity(e.weekParity);
  const period = e.periodStart === e.periodEnd
    ? `第${e.periodStart}节`
    : `第${e.periodStart}-${e.periodEnd}节`;
  const week = e.weekStart === e.weekEnd
    ? `第${e.weekStart}周`
    : `第${e.weekStart}-${e.weekEnd}周`;
  const consecutive = e.isConsecutive ? '[连堂]' : '';
  const note = e.note ? `(${e.note})` : '';
  const sources = e.source.includes(';') ? `[多源: ${e.source}]` : `[来源:${e.source}]`;
  return `${e.className} ${e.courseName} / ${e.normalizedTeacher} / ${e.normalizedRoom} / 星期${e.weekDay} ${week}${wp} ${period}${consecutive}${note} ${sources}`;
}

export function detectTeacherConflicts(entries: NormalizedEntry[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const byTeacher = new Map<string, NormalizedEntry[]>();

  for (const e of entries) {
    if (!e.normalizedTeacher) continue;
    const key = e.normalizedTeacher;
    if (!byTeacher.has(key)) byTeacher.set(key, []);
    byTeacher.get(key)!.push(e);
  }

  for (const [teacher, teacherEntries] of byTeacher) {
    for (let i = 0; i < teacherEntries.length; i++) {
      for (let j = i + 1; j < teacherEntries.length; j++) {
        const a = teacherEntries[i];
        const b = teacherEntries[j];

        if (isSameSession(a, b)) continue;

        if (periodsOverlap(a, b)) {
          const isDifferentClass = a.className !== b.className;
          const isSameClassDifferentCourse = a.className === b.className && a.courseName !== b.courseName;

          if (!isDifferentClass && !isSameClassDifferentCourse) continue;

          const isTempAdjust = a.note.includes('调') || b.note.includes('调') ||
                               a.note.includes('临') || b.note.includes('临');
          const severity = isTempAdjust ? 'warning' : 'error';

          const parityDesc = (a.weekParity !== 'all' || b.weekParity !== 'all')
            ? `\n  ⚠ 涉及单双周: A=${describeWeekParity(a.weekParity)}, B=${describeWeekParity(b.weekParity)}`
            : '';

          conflicts.push({
            id: nextId(),
            type: 'teacher_conflict',
            severity,
            entries: [a, b],
            description: `教师冲突: ${teacher} 在同一时段有多节课\n  A: ${describeEntry(a)}\n  B: ${describeEntry(b)}${parityDesc}`,
            suggestion: isTempAdjust
              ? '涉及临时调课，请核实调课通知是否已确认'
              : a.weekParity !== b.weekParity
                ? '单双周不同，可能实际不冲突，请确认周次安排'
                : '请调整其中一节课的时间或更换教师',
          });
        }
      }
    }
  }

  return conflicts;
}

export function detectRoomConflicts(entries: NormalizedEntry[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const byRoom = new Map<string, NormalizedEntry[]>();

  for (const e of entries) {
    if (!e.normalizedRoom) continue;
    const key = e.normalizedRoom;
    if (!byRoom.has(key)) byRoom.set(key, []);
    byRoom.get(key)!.push(e);
  }

  for (const [room, roomEntries] of byRoom) {
    for (let i = 0; i < roomEntries.length; i++) {
      for (let j = i + 1; j < roomEntries.length; j++) {
        const a = roomEntries[i];
        const b = roomEntries[j];

        if (isSameSession(a, b)) continue;

        if (periodsOverlap(a, b)) {
          const isSameClassSameCourse = a.className === b.className && a.courseName === b.courseName;
          if (isSameClassSameCourse) continue;

          const isSameTeacherDiffClass = a.normalizedTeacher === b.normalizedTeacher && a.className !== b.className;
          if (isSameTeacherDiffClass) continue;

          conflicts.push({
            id: nextId(),
            type: 'room_conflict',
            severity: 'error',
            entries: [a, b],
            description: `教室冲突: ${room} 在同一时段被多个班级占用\n  A: ${describeEntry(a)}\n  B: ${describeEntry(b)}`,
            suggestion: `请为其中一个班级更换教室，或确认是否为连堂合班课`,
          });
        }
      }
    }
  }

  return conflicts;
}

export function detectClassGaps(entries: NormalizedEntry[], maxGap: number = 2): Conflict[] {
  const conflicts: Conflict[] = [];
  const byClass = new Map<string, NormalizedEntry[]>();

  for (const e of entries) {
    if (!e.className) continue;
    if (!byClass.has(e.className)) byClass.set(e.className, []);
    byClass.get(e.className)!.push(e);
  }

  for (const [className, classEntries] of byClass) {
    const uniqueByPeriod = new Map<string, NormalizedEntry>();
    for (const e of classEntries) {
      const key = `${e.weekDay}|${e.periodStart}|${e.periodEnd}|${e.weekStart}|${e.weekEnd}|${e.weekParity}`;
      if (!uniqueByPeriod.has(key)) {
        uniqueByPeriod.set(key, e);
      }
    }

    const uniqueEntries = Array.from(uniqueByPeriod.values());
    const byDay = new Map<number, NormalizedEntry[]>();
    for (const e of uniqueEntries) {
      if (!byDay.has(e.weekDay)) byDay.set(e.weekDay, []);
      byDay.get(e.weekDay)!.push(e);
    }

    for (const [day, dayEntries] of byDay) {
      dayEntries.sort((a, b) => a.periodStart - b.periodStart);

      const deduped: NormalizedEntry[] = [];
      for (const e of dayEntries) {
        const overlaps = deduped.some(d =>
          d.periodStart <= e.periodEnd && e.periodStart <= d.periodEnd
        );
        if (!overlaps) {
          deduped.push(e);
        }
      }

      for (let i = 0; i < deduped.length - 1; i++) {
        const current = deduped[i];
        const next = deduped[i + 1];
        const gap = next.periodStart - current.periodEnd - 1;

        if (gap >= maxGap) {
          conflicts.push({
            id: nextId(),
            type: 'class_gap',
            severity: 'info',
            entries: [current, next],
            description: `班级空洞: ${className} 星期${day} 第${current.periodEnd + 1}-${next.periodStart - 1}节无课（空${gap}节）\n  前课: ${describeEntry(current)}\n  后课: ${describeEntry(next)}`,
            suggestion: `班级存在${gap}节空闲，如有需要可安排自习或其他课程`,
          });
        }
      }
    }
  }

  return conflicts;
}

export interface DetectionResult {
  report: ConflictReport;
  dedupedEntries: NormalizedEntry[];
}

export function detectAllConflicts(entries: NormalizedEntry[]): DetectionResult {
  resetConflictCounter();

  const deduped = deduplicateEntries(entries);

  const teacherConflicts = detectTeacherConflicts(deduped);
  const roomConflicts = detectRoomConflicts(deduped);
  const classGaps = detectClassGaps(deduped);

  const allConflicts = [...teacherConflicts, ...roomConflicts, ...classGaps];

  const errors = allConflicts.filter(c => c.severity === 'error').length;
  const warnings = allConflicts.filter(c => c.severity === 'warning').length;

  const report: ConflictReport = {
    id: `RPT-${Date.now()}`,
    createdAt: new Date().toISOString(),
    sources: [...new Set(entries.map(e => e.source).flatMap(s => s.split(';')))],
    totalEntries: entries.length,
    conflicts: allConflicts,
    summary: {
      teacherConflicts: teacherConflicts.length,
      roomConflicts: roomConflicts.length,
      classGaps: classGaps.length,
      errors,
      warnings,
    },
  };

  return { report, dedupedEntries: deduped };
}
