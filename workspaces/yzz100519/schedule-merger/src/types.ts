export type WeekParity = 'all' | 'odd' | 'even';

export interface ScheduleEntry {
  source: string;
  className: string;
  teacherName: string;
  roomName: string;
  courseName: string;
  weekDay: number;
  periodStart: number;
  periodEnd: number;
  weekStart: number;
  weekEnd: number;
  weekParity: WeekParity;
  isConsecutive: boolean;
  note: string;
}

export interface NormalizedEntry extends ScheduleEntry {
  normalizedTeacher: string;
  normalizedRoom: string;
}

export type ConflictType = 'teacher_conflict' | 'room_conflict' | 'class_gap';

export interface Conflict {
  id: string;
  type: ConflictType;
  severity: 'error' | 'warning' | 'info';
  entries: NormalizedEntry[];
  description: string;
  suggestion: string;
}

export interface ConflictReport {
  id: string;
  createdAt: string;
  sources: string[];
  totalEntries: number;
  conflicts: Conflict[];
  summary: {
    teacherConflicts: number;
    roomConflicts: number;
    classGaps: number;
    errors: number;
    warnings: number;
  };
}

export interface Resolution {
  conflictId: string;
  action: 'keep_first' | 'keep_second' | 'keep_both_with_note' | 'reassign_room' | 'reassign_time' | 'manual';
  resolvedBy: string;
  resolvedAt: string;
  note: string;
  newRoom?: string;
  newPeriodStart?: number;
  newPeriodEnd?: number;
  originalEntries: NormalizedEntry[];
  finalEntries: NormalizedEntry[];
}

export interface VersionSnapshot {
  version: string;
  label: string;
  createdAt: string;
  createdBy: string;
  entries: NormalizedEntry[];
  conflicts: Conflict[];
  resolutions: Resolution[];
}

export interface AliasMap {
  teachers: Record<string, string[]>;
  rooms: Record<string, string[]>;
}

export interface ClassTimetableView {
  className: string;
  schedule: {
    weekDay: number;
    periodStart: number;
    periodEnd: number;
    courseName: string;
    teacherName: string;
    roomName: string;
    weekStart: number;
    weekEnd: number;
    weekParity: WeekParity;
  }[];
}
