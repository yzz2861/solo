import type { BorrowRecord, ReturnRecord, WaiverApplication } from '@/types';

export interface ParsedCSVResult {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCSV(text: string): ParsedCSVResult {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] ?? '').trim();
    });
    rows.push(row);
  }

  return { headers, rows };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function mapBorrowRows(rows: Record<string, string>[]): BorrowRecord[] {
  return rows
    .filter((r) => r.borrowId || r['借阅单号'])
    .map((r) => ({
      borrowId: r.borrowId ?? r['借阅单号'] ?? '',
      borrower: r.borrower ?? r['借阅人'] ?? '',
      borrowerId: r.borrowerId ?? r['借阅人学号'] ?? r['学号'] ?? '',
      bookTitle: r.bookTitle ?? r['书名'] ?? '',
      bookIsbn: r.bookIsbn ?? r['ISBN'] ?? '',
      borrowDate: r.borrowDate ?? r['借出日期'] ?? '',
      dueDate: r.dueDate ?? r['应还日期'] ?? '',
      dailyFine: Number(r.dailyFine ?? r['日罚金'] ?? 0.5),
      maxFine: Number(r.maxFine ?? r['最高罚金'] ?? 50),
    }));
}

export function parseReturnJSON(text: string): ReturnRecord[] {
  try {
    const data = JSON.parse(text);
    const list = Array.isArray(data) ? data : data.records ?? data.data ?? [];
    const batchId = data.batchId ?? ('BATCH_RET_' + Date.now());
    const source = data.source ?? '还书补录系统';
    return list.map((r: any) => ({
      borrowId: r.borrowId ?? r['借阅单号'] ?? '',
      returnDate: r.returnDate ?? r['归还日期'] ?? '',
      returnType: (r.returnType ?? r['归还类型'] ?? 'supplement') === 'normal' ? 'normal' : 'supplement',
      source: r.source ?? source,
      batchId: r.batchId ?? batchId,
    }));
  } catch (e) {
    throw new Error('还书 JSON 解析失败：' + (e as Error).message);
  }
}

export function parseWaiverJSON(text: string): WaiverApplication[] {
  try {
    const data = JSON.parse(text);
    const list = Array.isArray(data) ? data : data.records ?? data.data ?? [];
    const batchId = data.batchId ?? ('BATCH_WV_' + Date.now());
    const source = data.source ?? '减免申请系统';
    return list.map((r: any) => ({
      applicationId: r.applicationId ?? r['申请单号'] ?? ('WV_' + Math.random().toString(36).slice(2, 10)),
      borrowId: r.borrowId ?? r['借阅单号'] ?? '',
      applicant: r.applicant ?? r['申请人'] ?? '',
      applicantId: r.applicantId ?? r['申请人学号'] ?? r['学号'] ?? '',
      waiverAmount: Number(r.waiverAmount ?? r['申请减免金额'] ?? r['减免金额'] ?? 0),
      reason: r.reason ?? r['减免原因'] ?? '',
      applyDate: r.applyDate ?? r['申请日期'] ?? new Date().toISOString().slice(0, 10),
      source: r.source ?? source,
      batchId: r.batchId ?? batchId,
    }));
  } catch (e) {
    throw new Error('减免 JSON 解析失败：' + (e as Error).message);
  }
}

export async function computeFileHash(text: string): Promise<string> {
  try {
    const buf = new TextEncoder().encode(text);
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    return 'hash_' + Math.abs(hash).toString(36);
  }
}

export function generateBatchId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}
