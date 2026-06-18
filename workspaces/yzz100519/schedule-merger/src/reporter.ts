import * as fs from 'fs';
import * as path from 'path';
import { ConflictReport, Conflict } from './types';

const SEVERITY_ICONS: Record<string, string> = {
  error: '✖',
  warning: '⚠',
  info: 'ℹ',
};

const TYPE_LABELS: Record<string, string> = {
  teacher_conflict: '教师冲突',
  room_conflict: '教室冲突',
  class_gap: '班级空洞',
};

function formatConflict(c: Conflict, index: number): string {
  const icon = SEVERITY_ICONS[c.severity] || '?';
  const typeLabel = TYPE_LABELS[c.type] || c.type;
  return `\n${index + 1}. [${icon} ${c.severity.toUpperCase()}] ${c.id} - ${typeLabel}\n${c.description}\n建议: ${c.suggestion}\n`;
}

export function reportToMarkdown(report: ConflictReport): string {
  const lines: string[] = [];

  lines.push('# 课表冲突检测报告');
  lines.push('');
  lines.push(`- 报告ID: ${report.id}`);
  lines.push(`- 生成时间: ${new Date(report.createdAt).toLocaleString('zh-CN')}`);
  lines.push(`- 数据来源: ${report.sources.join(', ')}`);
  lines.push(`- 总条目数: ${report.totalEntries}`);
  lines.push('');

  lines.push('## 摘要');
  lines.push('');
  lines.push(`| 类型 | 数量 |`);
  lines.push(`|------|------|`);
  lines.push(`| 教师冲突 | ${report.summary.teacherConflicts} |`);
  lines.push(`| 教室冲突 | ${report.summary.roomConflicts} |`);
  lines.push(`| 班级空洞 | ${report.summary.classGaps} |`);
  lines.push(`| 🔴 错误 | ${report.summary.errors} |`);
  lines.push(`| 🟡 警告 | ${report.summary.warnings} |`);
  lines.push('');

  if (report.conflicts.length === 0) {
    lines.push('**🎉 未发现任何冲突，课表安排合理！**');
    lines.push('');
    return lines.join('\n');
  }

  const byType = new Map<string, Conflict[]>();
  for (const c of report.conflicts) {
    if (!byType.has(c.type)) byType.set(c.type, []);
    byType.get(c.type)!.push(c);
  }

  for (const [type, conflicts] of byType) {
    const label = TYPE_LABELS[type] || type;
    lines.push(`## ${label} (${conflicts.length}项)`);
    lines.push('');
    for (let i = 0; i < conflicts.length; i++) {
      lines.push(formatConflict(conflicts[i], i));
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function reportToConsole(report: ConflictReport): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('═══════════════════════════════════════');
  lines.push('       课表冲突检测报告');
  lines.push('═══════════════════════════════════════');
  lines.push(`报告ID: ${report.id}`);
  lines.push(`时间:   ${new Date(report.createdAt).toLocaleString('zh-CN')}`);
  lines.push(`来源:   ${report.sources.join(', ')}`);
  lines.push(`条目:   ${report.totalEntries} 条`);
  lines.push('───────────────────────────────────────');
  lines.push(`  教师冲突: ${report.summary.teacherConflicts}`);
  lines.push(`  教室冲突: ${report.summary.roomConflicts}`);
  lines.push(`  班级空洞: ${report.summary.classGaps}`);
  lines.push(`  错误: ${report.summary.errors}  警告: ${report.summary.warnings}`);
  lines.push('───────────────────────────────────────');

  if (report.conflicts.length === 0) {
    lines.push('  🎉 未发现任何冲突，课表安排合理！');
  } else {
    for (let i = 0; i < report.conflicts.length; i++) {
      lines.push(formatConflict(report.conflicts[i], i));
    }
  }

  lines.push('═══════════════════════════════════════');
  lines.push('');
  return lines.join('\n');
}

export function exportReport(report: ConflictReport, outputDir: string): { mdPath: string; jsonPath: string } {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  const mdPath = path.join(outputDir, `conflict-report-${timestamp}.md`);
  const jsonPath = path.join(outputDir, `conflict-report-${timestamp}.json`);

  fs.writeFileSync(mdPath, reportToMarkdown(report), 'utf-8');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');

  return { mdPath, jsonPath };
}
