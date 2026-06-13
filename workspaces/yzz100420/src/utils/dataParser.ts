import Papa from 'papaparse';
import type {
  TemperaturePoint,
  TemperatureUnit,
  FiringPlan,
  PlanSegment,
  SpecialEvent,
  WorkBatch,
  StudentWork,
  GlazeRecipe,
  SegmentType,
  ColorDeviation,
} from '../types';
import { detectTemperatureUnit, generateId } from './curveCalc';

export interface ParsedResult {
  points: TemperaturePoint[];
  unit: TemperatureUnit;
  warnings: string[];
  info: {
    totalPoints: number;
    validPoints: number;
    timeSpanHours: number;
    minTemp: number;
    maxTemp: number;
    avgIntervalMinutes: number;
  };
}

const TIME_PATTERNS = [
  /^timestamp|time|时间|时刻|时间戳$/i,
];

const TEMP_PATTERNS = [
  /^temp(erature)?|温度|摄氏度|华氏度|℃|℉|°c|°f$/i,
];

const UNIT_PATTERN_C = /℃|°c|摄氏度|celsius/i;
const UNIT_PATTERN_F = /℉|°f|华氏度|fahrenheit/i;

const isTimeColumn = (header: string): boolean => TIME_PATTERNS.some((p) => p.test(header.trim()));
const isTempColumn = (header: string): boolean => TEMP_PATTERNS.some((p) => p.test(header.trim()));

const parseDateTime = (value: string | number): number | null => {
  if (typeof value === 'number') {
    if (value > 1e12) return value;
    if (value > 1e9) return value * 1000;
    return null;
  }

  const str = String(value).trim();
  if (!str) return null;

  const num = Number(str);
  if (!isNaN(num)) {
    if (num > 1e12) return num;
    if (num > 1e9) return num * 1000;
  }

  const formats = [
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/,
    /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/,
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/,
    /^(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2})?:?(\d{2})?时?(\d{2})?分?$/,
  ];

  for (const regex of formats) {
    const m = str.match(regex);
    if (m) {
      let year: string | undefined, month: string | undefined, day: string | undefined;
      let hour: string | undefined = '0', minute: string | undefined = '0', second: string | undefined = '0';
      if (regex === formats[0]) {
        [, year, month, day, hour, minute, second] = m as RegExpMatchArray;
      } else if (regex === formats[1]) {
        [, month, day, year, hour, minute, second] = m as RegExpMatchArray;
      } else if (regex === formats[2]) {
        [, month, day, year, hour, minute, second] = m as RegExpMatchArray;
        if (year && year.length === 2) year = '20' + year;
      } else {
        [, year, month, day, hour, minute, second] = m as RegExpMatchArray;
      }
      const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour || 0),
        Number(minute || 0),
        Number(second || 0),
      );
      const ts = date.getTime();
      if (!isNaN(ts)) return ts;
    }
  }

  const timeOnly = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (timeOnly) {
    const now = new Date();
    now.setHours(Number(timeOnly[1]), Number(timeOnly[2]), Number(timeOnly[3] || 0), 0);
    return now.getTime();
  }

  const parsed = Date.parse(str);
  return isNaN(parsed) ? null : parsed;
};

export const parseKilnCSV = async (file: File): Promise<ParsedResult> => {
  const warnings: string[] = [];
  const text = await file.text();

  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const data = results.data as Record<string, any>[];
        const headers = results.meta.fields || [];

        if (!data || data.length === 0) {
          reject(new Error('CSV 文件为空或解析失败'));
          return;
        }

        let timeCol: string | null = null;
        let tempCol: string | null = null;

        for (const h of headers) {
          if (!timeCol && isTimeColumn(h)) timeCol = h;
          if (!tempCol && isTempColumn(h)) tempCol = h;
        }

        if (!timeCol || !tempCol) {
          warnings.push('未能自动识别列，请确保包含时间戳和温度列');
          timeCol = headers[0];
          tempCol = headers[1];
        }

        let detectedUnit: TemperatureUnit = 'C';
        if (UNIT_PATTERN_C.test(tempCol)) detectedUnit = 'C';
        if (UNIT_PATTERN_F.test(tempCol)) detectedUnit = 'F';

        const rawTemps: number[] = [];
        const points: TemperaturePoint[] = [];
        let lastTs: number | null = null;

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const ts = parseDateTime(row[timeCol!]);
          const tempVal = Number(row[tempCol!]);

          if (ts === null) {
            warnings.push(`第 ${i + 2} 行时间格式无法解析，已跳过`);
            continue;
          }

          if (isNaN(tempVal)) {
            warnings.push(`第 ${i + 2} 行温度数据无效，已跳过`);
            continue;
          }

          if (lastTs !== null && ts <= lastTs) {
            warnings.push(`第 ${i + 2} 行时间倒序，已跳过`);
            continue;
          }

          rawTemps.push(tempVal);
          lastTs = ts;
          points.push({
            timestamp: ts,
            temperature: tempVal,
            unit: detectedUnit,
            isValid: true,
          });
        }

        if (points.length < 10) {
          reject(new Error(`有效数据点不足（仅 ${points.length} 个），至少需要 10 个点`));
          return;
        }

        const initialUnit: TemperatureUnit = detectedUnit;
        if (initialUnit === 'C' && rawTemps.length > 0) {
          const autoUnit = detectTemperatureUnit(rawTemps);
          if (autoUnit !== initialUnit) {
            detectedUnit = autoUnit;
            const unitLabel = (detectedUnit as TemperatureUnit) === 'C' ? '℃' : '℉';
            warnings.push(`根据温度值范围自动判断单位为：${unitLabel}`);
            for (const p of points) p.unit = detectedUnit;
          }
        }

        const totalSpan = points[points.length - 1].timestamp - points[0].timestamp;
        const timeSpanHours = totalSpan / 3_600_000;
        const avgIntervalMinutes = (totalSpan / points.length) / 60_000;

        resolve({
          points,
          unit: detectedUnit,
          warnings,
          info: {
            totalPoints: data.length,
            validPoints: points.length,
            timeSpanHours: Math.round(timeSpanHours * 100) / 100,
            minTemp: Math.min(...rawTemps),
            maxTemp: Math.max(...rawTemps),
            avgIntervalMinutes: Math.round(avgIntervalMinutes * 10) / 10,
          },
        });
      },
      error: (err) => reject(err),
    });
  });
};

export const parseKilnJSON = async (file: File): Promise<ParsedResult> => {
  const warnings: string[] = [];
  const text = await file.text();
  const json = JSON.parse(text);

  let rawPoints: { time: any; temp: number }[] = [];

  if (Array.isArray(json)) {
    rawPoints = json.map((r) => ({
      time: r.timestamp || r.time || r.t || r[0],
      temp: Number(r.temperature || r.temp || r.value || r[1]),
    }));
  } else if (json.data && Array.isArray(json.data)) {
    rawPoints = json.data.map((r: any) => ({
      time: r.timestamp || r.time || r[0],
      temp: Number(r.temperature || r.temp || r[1]),
    }));
  } else if (json.logs && Array.isArray(json.logs)) {
    rawPoints = json.logs.map((r: any) => ({
      time: r.timestamp || r.time,
      temp: Number(r.temperature || r.temp),
    }));
  }

  const unit: TemperatureUnit = json.unit === 'F' ? 'F' : 'C';
  const points: TemperaturePoint[] = [];
  const rawTemps: number[] = [];

  for (let i = 0; i < rawPoints.length; i++) {
    const ts = parseDateTime(rawPoints[i].time);
    if (ts === null) {
      warnings.push(`第 ${i + 1} 条记录时间无法解析`);
      continue;
    }
    if (isNaN(rawPoints[i].temp)) {
      warnings.push(`第 ${i + 1} 条记录温度无效`);
      continue;
    }
    rawTemps.push(rawPoints[i].temp);
    points.push({
      timestamp: ts,
      temperature: rawPoints[i].temp,
      unit,
      isValid: true,
    });
  }

  const totalSpan = points[points.length - 1]?.timestamp - points[0]?.timestamp || 0;

  return {
    points,
    unit,
    warnings,
    info: {
      totalPoints: rawPoints.length,
      validPoints: points.length,
      timeSpanHours: Math.round((totalSpan / 3_600_000) * 100) / 100,
      minTemp: Math.min(...rawTemps),
      maxTemp: Math.max(...rawTemps),
      avgIntervalMinutes: Math.round((totalSpan / points.length / 60_000) * 10) / 10,
    },
  };
};

export interface PresetPlan {
  name: string;
  description: string;
  plan: FiringPlan;
}

export const PRESET_PLANS: PresetPlan[] = [
  {
    name: '标准中温釉烧 (1240℃)',
    description: '陶艺工作室常用的中温氧化釉烧曲线，适合日用瓷和艺术陶',
    plan: {
      id: generateId(),
      name: '标准中温釉烧 (1240℃)',
      unit: 'C',
      description: '标准氧化釉烧曲线，约16小时完成',
      segments: [
        { id: generateId(), type: 'heating', startTime: 0, startTemp: 25, endTime: 2, endTemp: 200, rate: 87.5, name: '低温脱水段' },
        { id: generateId(), type: 'heating', startTime: 2, startTemp: 200, endTime: 6, endTemp: 600, rate: 100, name: '中温预热段' },
        { id: generateId(), type: 'heating', startTime: 6, startTemp: 600, endTime: 10, endTemp: 1000, rate: 100, name: '高温升温段' },
        { id: generateId(), type: 'heating', startTime: 10, startTemp: 1000, endTime: 12, endTemp: 1240, rate: 120, name: '釉烧末段' },
        { id: generateId(), type: 'holding', startTime: 12, startTemp: 1240, endTime: 13.5, endTemp: 1240, rate: 0, tolerance: 5, name: '高温保温' },
        { id: generateId(), type: 'cooling', startTime: 13.5, startTemp: 1240, endTime: 16, endTemp: 900, rate: -136, name: '急冷段' },
        { id: generateId(), type: 'cooling', startTime: 16, startTemp: 900, endTime: 20, endTemp: 500, rate: -100, name: '缓冷段' },
        { id: generateId(), type: 'cooling', startTime: 20, startTemp: 500, endTime: 26, endTemp: 80, rate: -70, name: '炉冷至出窑' },
      ],
    },
  },
  {
    name: '低温素烧 (1000℃)',
    description: '坯体素烧曲线，适合在釉烧前进行',
    plan: {
      id: generateId(),
      name: '低温素烧 (1000℃)',
      unit: 'C',
      description: '标准素烧曲线，约12小时',
      segments: [
        { id: generateId(), type: 'heating', startTime: 0, startTemp: 25, endTime: 3, endTemp: 150, rate: 42, name: '慢速脱水' },
        { id: generateId(), type: 'heating', startTime: 3, startTemp: 150, endTime: 7, endTemp: 600, rate: 113, name: '氧化分解段' },
        { id: generateId(), type: 'heating', startTime: 7, startTemp: 600, endTime: 9, endTemp: 1000, rate: 200, name: '快速升温' },
        { id: generateId(), type: 'holding', startTime: 9, startTemp: 1000, endTime: 10, endTemp: 1000, rate: 0, tolerance: 5, name: '高温保温' },
        { id: generateId(), type: 'cooling', startTime: 10, startTemp: 1000, endTime: 18, endTemp: 80, rate: -115, name: '自然冷却' },
      ],
    },
  },
  {
    name: '高温还原烧 (1300℃)',
    description: '柴窑和气窑的高温还原烧曲线',
    plan: {
      id: generateId(),
      name: '高温还原烧 (1300℃)',
      unit: 'C',
      description: '高温还原气氛烧成，适合瓷器',
      segments: [
        { id: generateId(), type: 'heating', startTime: 0, startTemp: 25, endTime: 4, endTemp: 300, rate: 69, name: '氧化预热' },
        { id: generateId(), type: 'heating', startTime: 4, startTemp: 300, endTime: 8, endTemp: 900, rate: 150, name: '快速升温' },
        { id: generateId(), type: 'heating', startTime: 8, startTemp: 900, endTime: 10, endTemp: 1050, rate: 75, name: '强还原开始' },
        { id: generateId(), type: 'heating', startTime: 10, startTemp: 1050, endTime: 13, endTemp: 1250, rate: 67, name: '弱还原升温' },
        { id: generateId(), type: 'heating', startTime: 13, startTemp: 1250, endTime: 14, endTemp: 1300, rate: 50, name: '升温至火度' },
        { id: generateId(), type: 'holding', startTime: 14, startTemp: 1300, endTime: 15.5, endTemp: 1300, rate: 0, tolerance: 5, name: '高温保温' },
        { id: generateId(), type: 'cooling', startTime: 15.5, startTemp: 1300, endTime: 24, endTemp: 100, rate: -52, name: '控制冷却' },
      ],
    },
  },
];
        { id: generateId(), type: 'heating', startTime: 0, startTemp: 25, endTime: 4, endTemp: 300, rate: 69, name: '氧化预热' },
        { id: generateId(), type: 'heating', startTime: 4, startTemp: 300, endTime: 8, endTemp: 900, rate: 150, name: '快速升温' },
        { id: generateId(), type: 'heating', startTime: 8, startTemp: 900, endTime: 10, endTemp: 1050, rate: 75, name: '强还原开始' },
        { id: generateId(), type: 'heating', startTime: 10, startTemp: 1050, endTime: 13, endTemp: 1250, rate: 67, name: '弱还原升温' },
        { id: generateId(), type: 'heating', startTime: 13, startTemp: 1250, endTime: 14, endTemp: 1300, rate: 50, name: '升温至火度' },
        { id: generateId(), type: 'holding', startTime: 14, startTemp: 1300, endTime: 15.5, endTemp: 1300, rate: 0, tolerance: 5, name: '高温保温' },
        { id: generateId(), type: 'cooling', startTime: 15.5, startTemp: 1300, endTime: 24, endTemp: 100, rate: -52, name: '控制冷却' },
      ],
    },
  },
];
        { id: generateId(), type: 'heating', startTime: 4, startTemp: 300, endTime: 8, endTemp: 900, rate: 150, name: '快速升温' },
        { id: generateId(), type: 'heating', startTime: 8, startTemp: 900, endTime: 10, endTemp: 1050, rate: 75, name: '强还原开始' },
        { id: generateId(), type: 'heating', startTime: 10, startTemp: 1050, endTime: 13, endTemp: 1250, rate: 67, name: '弱还原升温' },
        { id: generateId(), type: 'heating', startTime: 13, startTemp: 1250, endTime: 14, endTemp: 1300, rate: 50, name: '升温至火度' },
        { id: generateId(), type: 'holding', startTime: 14, startTemp: 1300, endTime: 15.5, endTemp: 1300, rate: 0, tolerance: 5, name: '高温保温' },
        { id: generateId(), type: 'cooling', startTime: 15.5, startTemp: 1300, endTime: 24, endTemp: 100, rate: -52, name: '控制冷却' },
      ],
    },
  },
];
