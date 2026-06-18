import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';
import * as XLSX from 'xlsx';
import { ScheduleEntry, WeekParity } from './types';

function parseWeekParity(raw: string): WeekParity {
  const t = raw.trim();
  if (/单/.test(t)) return 'odd';
  if (/双/.test(t)) return 'even';
  return 'all';
}

function parseWeekRange(raw: string): { start: number; end: number; parity: WeekParity } {
  const t = raw.trim();
  let parity: WeekParity = 'all';
  if (/单/.test(t)) parity = 'odd';
  else if (/双/.test(t)) parity = 'even';

  const digits = t.match(/\d+/g);
  if (!digits || digits.length === 0) return { start: 1, end: 16, parity };

  const nums = digits.map(Number);
  if (nums.length === 1) return { start: nums[0], end: nums[0], parity };
  return { start: Math.min(...nums), end: Math.max(...nums), parity };
}

function parsePeriodRange(raw: string): { start: number; end: number } {
  const t = raw.trim();
  const digits = t.match(/\d+/g);
  if (!digits || digits.length === 0) return { start: 1, end: 2 };

  const nums = digits.map(Number);
  if (nums.length === 1) return { start: nums[0], end: nums[0] };
  return { start: Math.min(...nums), end: Math.max(...nums) };
}

function parseWeekDay(raw: string): number {
  const t = raw.trim();
  const dayMap: Record<string, number> = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7, '天': 7,
    'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 7,
  };
  for (const [key, val] of Object.entries(dayMap)) {
    if (t.includes(key)) return val;
  }
  const n = parseInt(t, 10);
  if (n >= 1 && n <= 7) return n;
  return 1;
}

const COLUMN_MAPS: Record<string, Record<string, string[]>> = {
  class_schedule: {
    className: ['班级', '班', 'class', 'className'],
    courseName: ['课程', '科目', '课', 'course', 'subject'],
    teacherName: ['教师', '老师', '授课教师', 'teacher'],
    roomName: ['教室', '上课地点', 'room', 'classroom'],
    weekDay: ['星期', '周几', '星期几', 'weekday', 'day'],
    period: ['节次', '节', '第几节', 'period'],
    week: ['周次', '周', 'weeks', 'week'],
    note: ['备注', '说明', 'note', 'remark'],
  },
  teacher_schedule: {
    teacherName: ['教师', '老师', '姓名', 'teacher'],
    className: ['班级', '班', 'class'],
    courseName: ['课程', '科目', 'course'],
    roomName: ['教室', '地点', 'room'],
    weekDay: ['星期', '周几', 'weekday'],
    period: ['节次', '节', 'period'],
    week: ['周次', '周', 'weeks'],
    note: ['备注', '说明', 'note'],
  },
  room_schedule: {
    roomName: ['教室', '地点', 'room', 'classroom'],
    className: ['班级', '班', 'class'],
    courseName: ['课程', '科目', 'course'],
    teacherName: ['教师', '老师', 'teacher'],
    weekDay: ['星期', '周几', 'weekday'],
    period: ['节次', '节', 'period'],
    week: ['周次', '周', 'weeks'],
    note: ['备注', '说明', 'note'],
  },
};

function mapColumns(headers: string[], scheduleType: string): Record<string, number> {
  const colMap = COLUMN_MAPS[scheduleType] || COLUMN_MAPS.class_schedule;
  const result: Record<string, number> = {};

  for (const [field, keywords] of Object.entries(colMap)) {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i].trim();
      for (const kw of keywords) {
        if (h.toLowerCase().includes(kw.toLowerCase())) {
          result[field] = i;
          break;
        }
      }
      if (result[field] !== undefined) break;
    }
  }

  return result;
}

function rowToEntry(row: string[], colMap: Record<string, number>, source: string, defaultClass?: string): ScheduleEntry {
  const g = (field: string): string => {
    const idx = colMap[field];
    return idx !== undefined && row[idx] ? String(row[idx]).trim() : '';
  };

  const className = g('className') || defaultClass || '';
  const week = parseWeekRange(g('week'));
  const period = parsePeriodRange(g('period'));

  return {
    source,
    className,
    teacherName: g('teacherName'),
    roomName: g('roomName'),
    courseName: g('courseName'),
    weekDay: parseWeekDay(g('weekDay')),
    periodStart: period.start,
    periodEnd: period.end,
    weekStart: week.start,
    weekEnd: week.end,
    weekParity: week.parity,
    isConsecutive: period.end > period.start,
    note: g('note'),
  };
}

async function readCsv(filePath: string): Promise<string[][]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  return new Promise((resolve, reject) => {
    parse(content, { relax_column_count: true, skip_empty_lines: true }, (err, records) => {
      if (err) reject(err);
      else resolve(records as string[][]);
    });
  });
}

function readXlsx(filePath: string): string[][] {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
  return data.map(row => row.map(cell => String(cell ?? '')));
}

export async function readSchedule(
  filePath: string,
  scheduleType: string,
  defaultClass?: string
): Promise<ScheduleEntry[]> {
  const ext = path.extname(filePath).toLowerCase();
  let rows: string[][];

  if (ext === '.csv') {
    rows = await readCsv(filePath);
  } else if (ext === '.xlsx' || ext === '.xls') {
    rows = readXlsx(filePath);
  } else {
    throw new Error(`不支持的文件格式: ${ext}，请使用 .csv 或 .xlsx`);
  }

  if (rows.length < 2) return [];

  const headers = rows[0];
  const colMap = mapColumns(headers, scheduleType);
  const source = path.basename(filePath);
  const entries: ScheduleEntry[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every(c => !c.trim())) continue;

    const entry = rowToEntry(row, colMap, source, defaultClass);
    if (entry.courseName || entry.teacherName || entry.roomName) {
      entries.push(entry);
    }
  }

  return entries;
}

export async function readMultipleSchedules(
  files: { path: string; type: string; defaultClass?: string }[]
): Promise<ScheduleEntry[]> {
  const allEntries: ScheduleEntry[] = [];
  for (const f of files) {
    const entries = await readSchedule(f.path, f.type, f.defaultClass);
    allEntries.push(...entries);
  }
  return allEntries;
}
