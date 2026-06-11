import Papa from 'papaparse';
import type { TemperatureLog, SugarReading, FeedingRecord, BadRowInfo, ImportFileType } from '../types';
import { SequentialTimeParser } from './timeParser';
import { detectSugarUnit, convertToBrix } from './unitConverter';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

interface ParseResult<T> {
  data: T[];
  badRows: BadRowInfo[];
}

interface ParseOptions {
  fileType?: ImportFileType;
  encoding?: string;
}

function detectFileType(headers: string[]): ImportFileType {
  const lowerHeaders = headers.map(h => h.toLowerCase());
  
  if (lowerHeaders.some(h => h.includes('温度') || h.includes('temperature') || h.includes('temp'))) {
    return 'temperature';
  }
  if (lowerHeaders.some(h => h.includes('糖度') || h.includes('brix') || h.includes('sugar'))) {
    return 'sugar';
  }
  if (lowerHeaders.some(h => h.includes('投料') || h.includes('feeding') || h.includes('feed'))) {
    return 'feeding';
  }
  
  return 'auto';
}

function findColumnIndex(headers: string[], keywords: string[]): number {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  for (const keyword of keywords) {
    const idx = lowerHeaders.findIndex(h => h.includes(keyword.toLowerCase()));
    if (idx !== -1) return idx;
  }
  return -1;
}

export async function parseCSVFile<T>(
  file: File,
  options: ParseOptions = {}
): Promise<{ data: any[]; badRows: BadRowInfo[]; fileType: ImportFileType }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: options.encoding || 'UTF-8',
      complete: (results) => {
        const data = results.data as Record<string, any>[];
        const headers = results.meta.fields || [];
        const fileType = options.fileType === 'auto' || !options.fileType
          ? detectFileType(headers)
          : options.fileType;
        
        let parsedData: any[] = [];
        const badRows: BadRowInfo[] = [];
        
        if (fileType === 'temperature') {
          const tempResult = parseTemperatureData(data, headers);
          parsedData = tempResult.data;
          badRows.push(...tempResult.badRows);
        } else if (fileType === 'sugar') {
          const sugarResult = parseSugarData(data, headers);
          parsedData = sugarResult.data;
          badRows.push(...sugarResult.badRows);
        } else if (fileType === 'feeding') {
          const feedingResult = parseFeedingData(data, headers);
          parsedData = feedingResult.data;
          badRows.push(...feedingResult.badRows);
        } else {
          parsedData = data;
        }
        
        resolve({ data: parsedData, badRows, fileType });
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

function parseTemperatureData(
  rows: Record<string, any>[],
  headers: string[]
): ParseResult<TemperatureLog> {
  const data: TemperatureLog[] = [];
  const badRows: BadRowInfo[] = [];
  
  const tankNoIdx = findColumnIndex(headers, ['缸号', '罐号', 'tank', 'tankno', 'tank_no']);
  const timeIdx = findColumnIndex(headers, ['时间', '日期', 'date', 'time', 'timestamp', 'datetime']);
  const tempIdx = findColumnIndex(headers, ['温度', 'temperature', 'temp', 't']);
  
  const timeParser = new SequentialTimeParser();
  
  rows.forEach((row, index) => {
    try {
      const values = Object.values(row).map(v => String(v));
      const rawTime = values[timeIdx] || row[headers[timeIdx]] || '';
      const rawTemp = values[tempIdx] || row[headers[tempIdx]] || '';
      const tankNo = tankNoIdx >= 0 ? (values[tankNoIdx] || row[headers[tankNoIdx]]) : undefined;
      
      let timestamp: Date;
      try {
        timestamp = timeParser.parse(rawTime);
      } catch (e) {
        throw new Error(`时间格式无法解析: ${rawTime}`);
      }
      
      const temperature = parseFloat(String(rawTemp).replace(/[^0-9.-]/g, ''));
      if (isNaN(temperature) || temperature < -20 || temperature > 100) {
        throw new Error(`温度值无效: ${rawTemp}`);
      }
      
      data.push({
        id: generateId(),
        timestamp,
        temperature,
        isBadRow: false,
        rawValue: Object.values(row).join(','),
        tankNo: tankNo ? String(tankNo) : undefined,
      });
    } catch (error) {
      badRows.push({
        type: 'temperature',
        row: index + 2,
        reason: error instanceof Error ? error.message : '未知错误',
        rawData: Object.values(row).join(','),
      });
    }
  });
  
  return { data, badRows };
}

function parseSugarData(
  rows: Record<string, any>[],
  headers: string[]
): ParseResult<SugarReading> {
  const data: SugarReading[] = [];
  const badRows: BadRowInfo[] = [];
  
  const tankNoIdx = findColumnIndex(headers, ['缸号', '罐号', 'tank', 'tankno', 'tank_no']);
  const timeIdx = findColumnIndex(headers, ['时间', '日期', 'date', 'time', 'timestamp', 'datetime']);
  const sugarIdx = findColumnIndex(headers, ['糖度', 'brix', 'sugar', '浓度']);
  const unitIdx = findColumnIndex(headers, ['单位', 'unit', '类型']);
  
  const timeParser = new SequentialTimeParser();
  
  rows.forEach((row, index) => {
    try {
      const values = Object.values(row).map(v => String(v));
      const rawTime = values[timeIdx] || row[headers[timeIdx]] || '';
      const rawSugar = values[sugarIdx] || row[headers[sugarIdx]] || '';
      const rawUnit = unitIdx >= 0 ? (values[unitIdx] || row[headers[unitIdx]]) : 'Brix';
      const tankNo = tankNoIdx >= 0 ? (values[tankNoIdx] || row[headers[tankNoIdx]]) : undefined;
      
      let timestamp: Date;
      try {
        timestamp = timeParser.parse(rawTime);
      } catch (e) {
        throw new Error(`时间格式无法解析: ${rawTime}`);
      }
      
      const sugarValue = parseFloat(String(rawSugar).replace(/[^0-9.-]/g, ''));
      if (isNaN(sugarValue) || sugarValue < 0 || sugarValue > 100) {
        throw new Error(`糖度值无效: ${rawSugar}`);
      }
      
      const unit = detectSugarUnit(String(rawUnit));
      const brix = convertToBrix(sugarValue, unit);
      
      data.push({
        id: generateId(),
        timestamp,
        brix,
        originalUnit: unit,
        originalValue: String(rawSugar),
        isBadRow: false,
        rawValue: Object.values(row).join(','),
        tankNo: tankNo ? String(tankNo) : undefined,
      });
    } catch (error) {
      badRows.push({
        type: 'sugar',
        row: index + 2,
        reason: error instanceof Error ? error.message : '未知错误',
        rawData: Object.values(row).join(','),
      });
    }
  });
  
  return { data, badRows };
}

function parseFeedingData(
  rows: Record<string, any>[],
  headers: string[]
): ParseResult<FeedingRecord> {
  const data: FeedingRecord[] = [];
  const badRows: BadRowInfo[] = [];
  
  const tankNoIdx = findColumnIndex(headers, ['缸号', '罐号', 'tank', 'tankno', 'tank_no']);
  const timeIdx = findColumnIndex(headers, ['时间', '日期', 'date', 'time', 'timestamp', 'datetime']);
  const typeIdx = findColumnIndex(headers, ['类型', '投料类型', 'type', 'material', '原料']);
  const amountIdx = findColumnIndex(headers, ['数量', '投料量', 'amount', 'weight', '重量']);
  const unitIdx = findColumnIndex(headers, ['单位', 'unit', '计量单位']);
  
  const timeParser = new SequentialTimeParser();
  
  rows.forEach((row, index) => {
    try {
      const values = Object.values(row).map(v => String(v));
      const rawTime = values[timeIdx] || row[headers[timeIdx]] || '';
      const rawType = values[typeIdx] || row[headers[typeIdx]] || '';
      const rawAmount = values[amountIdx] || row[headers[amountIdx]] || '';
      const rawUnit = unitIdx >= 0 ? (values[unitIdx] || row[headers[unitIdx]]) : 'kg';
      const tankNo = tankNoIdx >= 0 ? (values[tankNoIdx] || row[headers[tankNoIdx]]) : undefined;
      
      let timestamp: Date;
      try {
        timestamp = timeParser.parse(rawTime);
      } catch (e) {
        throw new Error(`时间格式无法解析: ${rawTime}`);
      }
      
      const amount = parseFloat(String(rawAmount).replace(/[^0-9.-]/g, ''));
      if (isNaN(amount) || amount < 0) {
        throw new Error(`投料量无效: ${rawAmount}`);
      }
      
      if (!rawType.trim()) {
        throw new Error('投料类型不能为空');
      }
      
      const feedType = String(rawType).trim();
      data.push({
        id: generateId(),
        timestamp,
        type: feedType,
        feedType,
        amount,
        unit: String(rawUnit).trim(),
        notes: '',
        isBadRow: false,
        rawValue: Object.values(row).join(','),
        tankNo: tankNo ? String(tankNo) : undefined,
      });
    } catch (error) {
      badRows.push({
        type: 'feeding',
        row: index + 2,
        reason: error instanceof Error ? error.message : '未知错误',
        rawData: Object.values(row).join(','),
      });
    }
  });
  
  return { data, badRows };
}

export function generateSampleCSV(type: 'temperature' | 'sugar' | 'feeding'): { content: string; filename: string } {
  if (type === 'temperature') {
    return {
      filename: '温度日志示例.csv',
      content: '缸号,时间,温度\n' +
        '1号,2024-01-15 08:00,26.5\n' +
        '1号,2024-01-15 08:01,26.6\n' +
        '1号,2024-01-15 08:02,26.7\n' +
        '1号,23:00,28.0\n' +
        '1号,23:00-次日01:00,28.5\n' +
        '1号,01:30,29.0\n'
    };
  } else if (type === 'sugar') {
    return {
      filename: '糖度记录示例.csv',
      content: '缸号,时间,糖度,单位\n' +
        '1号,2024-01-15 08:00,18.5,Brix\n' +
        '1号,2024-01-15 20:00,17.2,Brix\n' +
        '1号,2024-01-16 08:00,15.8,°Bx\n' +
        '1号,2024-01-16 20:00,14.5,%\n' +
        '1号,2024-01-17 08:00,10.2,Brix\n'
    };
  } else {
    return {
      filename: '投料记录示例.csv',
      content: '缸号,时间,投料类型,投料量,单位\n' +
        '1号,2024-01-15 10:00,白砂糖,50,kg\n' +
        '1号,2024-01-16 10:00,酵母,0.5,kg\n' +
        '1号,2024-01-17 10:00,营养盐,0.2,kg\n'
    };
  }
}
