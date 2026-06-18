import type { Feedback, FeedbackSource, Theme, Improvement, Course, ThemeWithStats } from '@/types';
import { generateId, determineSeverity, multiLabelClassify, DEFAULT_THEMES } from './clustering';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

export interface ParsedLine {
  content: string;
  source: FeedbackSource;
  author?: string;
  homework?: string;
}

export function parsePlainText(text: string): ParsedLine[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const result: ParsedLine[] = [];
  let currentSource: FeedbackSource = 'student';

  for (const line of lines) {
    if (line.startsWith('#') || line.startsWith('//')) {
      const lower = line.toLowerCase();
      if (lower.includes('学生') || lower.includes('student')) {
        currentSource = 'student';
      } else if (lower.includes('助教') || lower.includes('ta')) {
        currentSource = 'ta';
      } else if (lower.includes('错题') || lower.includes('wrong')) {
        currentSource = 'wrong_answer';
      }
      continue;
    }

    let content = line;
    let source = currentSource;

    const prefixMatch = line.match(/^(S|TA|W|学生|助教|错题)\s*[:：\-]\s*(.+)/i);
    if (prefixMatch) {
      const prefix = prefixMatch[1].toUpperCase();
      content = prefixMatch[2].trim();
      if (prefix === 'S' || prefix === '学生') source = 'student';
      else if (prefix === 'TA' || prefix === '助教') source = 'ta';
      else if (prefix === 'W' || prefix === '错题') source = 'wrong_answer';
    }

    if (content) {
      result.push({ content, source });
    }
  }

  return result;
}

export function parseCSV(text: string): ParsedLine[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const result: ParsedLine[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCSVLine(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = (cells[idx] || '').trim(); });

    if (!obj.content) continue;

    let source: FeedbackSource = 'student';
    const s = (obj.source || '').toLowerCase();
    if (s.includes('ta') || s.includes('助教')) source = 'ta';
    else if (s.includes('wrong') || s.includes('错题')) source = 'wrong_answer';

    result.push({
      content: obj.content,
      source,
      author: obj.author,
      homework: obj.homework,
    });
  }

  return result;
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
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

export function parsedLinesToFeedback(lines: ParsedLine[], defaultHomework?: string): Feedback[] {
  return lines.map(line => {
    const classifyResults = multiLabelClassify(line.content);
    const { severity, isSevere } = determineSeverity(line.content, classifyResults);

    return {
      id: generateId('fb'),
      source: line.source,
      content: line.content,
      author: line.author,
      homework: line.homework || defaultHomework,
      createdAt: new Date(),
      tags: [],
      severity,
      isSevere,
    };
  });
}

export function exportMarkdownChecklist(
  improvements: Improvement[],
  themes: Theme[],
  courses: Course[],
  themeStats: ThemeWithStats[],
  totalFeedback: number
): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const criticalCount = themeStats.reduce((sum, t) => sum + t.criticalCount, 0);

  let md = `# 教学改进清单\n\n`;
  md += `> 生成日期：${dateStr}\n\n`;

  md += `## 📊 总体概况\n\n`;
  md += `- **共收集反馈**：${totalFeedback} 条\n`;
  md += `- **识别主题**：${themeStats.length} 个\n`;
  md += `- **严重问题**：${criticalCount} 条\n`;
  md += `- **改进点数量**：${improvements.length} 个\n\n`;

  md += `## 🎯 核心改进点（按优先级）\n\n`;

  const priorityOrder = ['high', 'medium', 'low'] as const;
  const priorityLabel: Record<string, string> = { high: '🔴 P0', medium: '🟠 P1', low: '🟡 P2' };

  for (const prio of priorityOrder) {
    const items = improvements.filter(i => i.priority === prio);
    if (items.length === 0) continue;

    for (const imp of items) {
      const relatedThemes = imp.relatedThemeIds
        .map(id => themes.find(t => t.id === id)?.name)
        .filter(Boolean)
        .join('、');

      const course = courses.find(c => c.id === imp.courseId);
      const courseStr = course ? `第${course.courseNumber}节课（${formatDate(course.scheduledAt)}）` : '未分配';

      md += `### ${priorityLabel[prio]} - ${imp.title}\n\n`;
      if (relatedThemes) md += `- **关联主题**：${relatedThemes}\n`;
      if (imp.estimatedMinutes) md += `- **建议课时**：${imp.estimatedMinutes} 分钟\n`;
      if (imp.owner) md += `- **责任人**：${imp.owner}\n`;
      md += `- **分配到**：${courseStr}\n\n`;

      if (imp.description) {
        md += `**说明**：${imp.description}\n\n`;
      }

      if (imp.representativeQuotes.length > 0) {
        md += `**代表原话**：\n`;
        for (const q of imp.representativeQuotes.slice(0, 5)) {
          md += `> ${q}\n\n`;
        }
      }
      md += `---\n\n`;
    }
  }

  md += `## 📅 下节课分配表\n\n`;
  md += `| 课程 | 改进点 | 优先级 | 责任人 | 状态 |\n`;
  md += `|------|--------|--------|--------|------|\n`;

  const sortedCourses = [...courses].sort((a, b) => a.courseNumber - b.courseNumber);
  for (const course of sortedCourses) {
    const courseImps = improvements.filter(i => i.courseId === course.id);
    if (courseImps.length === 0) {
      md += `| 第${course.courseNumber}节 ${course.name} | - | - | - | - |\n`;
      continue;
    }
    for (const imp of courseImps) {
      const statusMap: Record<string, string> = { todo: '待办', doing: '进行中', done: '已完成' };
      md += `| 第${course.courseNumber}节 ${course.name} | ${imp.title} | ${priorityLabel[imp.priority]} | ${imp.owner || '-'} | ${statusMap[imp.status]} |\n`;
    }
  }

  return md;
}

export function exportExcelChecklist(
  improvements: Improvement[],
  themes: Theme[],
  courses: Course[]
) {
  const priorityMap: Record<string, string> = { high: 'P0 高', medium: 'P1 中', low: 'P2 低' };
  const statusMap: Record<string, string> = { todo: '待办', doing: '进行中', done: '已完成' };

  const data = improvements.map(imp => ({
    '优先级': priorityMap[imp.priority],
    '改进点标题': imp.title,
    '详细描述': imp.description,
    '关联主题': imp.relatedThemeIds.map(id => themes.find(t => t.id === id)?.name).filter(Boolean).join('、'),
    '代表原话': imp.representativeQuotes.join(' | '),
    '建议课时(分钟)': imp.estimatedMinutes || '',
    '分配课程': (() => {
      const c = courses.find(c => c.id === imp.courseId);
      return c ? `第${c.courseNumber}节 ${c.name} (${formatDate(c.scheduledAt)})` : '未分配';
    })(),
    '责任人': imp.owner || '',
    '状态': statusMap[imp.status],
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 10 }, { wch: 30 }, { wch: 50 }, { wch: 20 },
    { wch: 60 }, { wch: 14 }, { wch: 35 }, { wch: 12 }, { wch: 10 }
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '改进清单');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([buf], { type: 'application/octet-stream' });
}

export function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  saveAs(blob, filename);
}

export function downloadBlob(blob: Blob, filename: string) {
  saveAs(blob, filename);
}

export function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDateTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${formatDate(date)} ${h}:${min}`;
}

export { DEFAULT_THEMES };
