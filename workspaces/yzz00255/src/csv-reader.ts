import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { HotlineRecord } from './types';

export interface CsvReadResult {
  records: HotlineRecord[];
  headers: string[];
  rowCount: number;
}

export function readCsv(inputPath: string): CsvReadResult {
  const absolutePath = path.resolve(inputPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`CSV 文件不存在: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');

  if (content.trim() === '') {
    return { records: [], headers: [], rowCount: 0 };
  }

  try {
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as HotlineRecord[];

    const headers = parse(content, {
      columns: false,
      from_line: 1,
      to_line: 1,
    })[0] as string[];

    return {
      records: records.map((r, i) => ({ ...r, __rowNumber: i + 2 } as any)),
      headers: headers || [],
      rowCount: records.length,
    };
  } catch (e) {
    throw new Error(`CSV 解析失败: ${e instanceof Error ? e.message : '未知错误'}`);
  }
}

export function validateRequiredFields(
  record: HotlineRecord,
  requiredFields: string[]
): { valid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const value = record[field];
    if (value === undefined || value === null || String(value).trim() === '') {
      missingFields.push(field);
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}
