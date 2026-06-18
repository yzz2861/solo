import type { TrainingRecord, Student } from '../types';
import { getLevelShortLabel, getDifficultyLabel, getScenarioLabel, formatTime } from './scoring';

export function exportToCSV(content: string, filename: string): void {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportPersonalRecords(records: TrainingRecord[], studentName: string): void {
  const headers = [
    '训练日期',
    '学员姓名',
    '案例名称',
    '难度',
    '场景',
    '用时(秒)',
    '总分',
    '正确率(%)',
    '红色正确数',
    '黄色正确数',
    '绿色正确数',
    '黑色正确数',
    '错题数',
  ];
  
  const rows = records.map(record => {
    const correctByLevel = { red: 0, yellow: 0, green: 0, black: 0 };
    record.mistakes.forEach(m => {
      if (m.correctLevel === m.studentLevel) {
        correctByLevel[m.correctLevel]++;
      }
    });
    
    return [
      new Date(record.endTime).toLocaleString('zh-CN'),
      record.studentName,
      record.caseName,
      getDifficultyLabel(record.difficulty),
      getScenarioLabel(record.scenario),
      record.duration,
      record.score,
      record.accuracy,
      record.levelAccuracy.red,
      record.levelAccuracy.yellow,
      record.levelAccuracy.green,
      record.levelAccuracy.black,
      record.mistakes.length,
    ].map(v => `"${v}"`).join(',');
  });
  
  const csvContent = [headers.join(','), ...rows].join('\n');
  const filename = `${studentName}_训练记录_${new Date().toISOString().split('T')[0]}.csv`;
  exportToCSV(csvContent, filename);
}

export function exportClassSummary(students: Student[], allRecords: TrainingRecord[]): void {
  const headers = [
    '学员姓名',
    '班级',
    '训练次数',
    '平均得分',
    '最高得分',
    '最低得分',
    '最近训练日期',
    '平均正确率(%)',
  ];
  
  const rows = students.map(student => {
    const studentRecords = allRecords.filter(r => r.studentName === student.name);
    const scores = studentRecords.map(r => r.score);
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    const avgAccuracy = studentRecords.length > 0
      ? Math.round(studentRecords.reduce((sum, r) => sum + r.accuracy, 0) / studentRecords.length)
      : 0;
    
    return [
      student.name,
      student.className || '-',
      student.trainingCount,
      student.averageScore,
      maxScore,
      minScore,
      student.lastTrainingTime ? new Date(student.lastTrainingTime).toLocaleDateString('zh-CN') : '-',
      avgAccuracy,
    ].map(v => `"${v}"`).join(',');
  });
  
  const csvContent = [headers.join(','), ...rows].join('\n');
  const filename = `班级训练汇总_${new Date().toISOString().split('T')[0]}.csv`;
  exportToCSV(csvContent, filename);
}

export function exportMistakeDetail(record: TrainingRecord): void {
  const headers = [
    '伤员姓名',
    '正确等级',
    '学员判断',
    '正确排序',
    '学员排序',
    '错误类型',
    '误判体征',
    '正确解释',
  ];
  
  const mistakeTypeLabels: Record<string, string> = {
    level: '等级错误',
    priority: '排序错误',
    both: '等级和排序均错误',
  };
  
  const rows = record.mistakes.map(mistake => {
    return [
      mistake.casualtyName,
      getLevelShortLabel(mistake.correctLevel),
      getLevelShortLabel(mistake.studentLevel),
      mistake.correctPriority,
      mistake.studentPriority,
      mistakeTypeLabels[mistake.mistakeType],
      mistake.misjudgedVitals.join('、'),
      mistake.explanation,
    ].map(v => `"${v}"`).join(',');
  });
  
  const summary = [
    `"案例：${record.caseName},`,
    `"学员：${record.studentName},`,
    `"得分：${record.score},`,
    `"用时：${formatTime(record.duration)},`,
    '',
  ].join('\n');
  
  const csvContent = summary + [headers.join(','), ...rows].join('\n');
  const filename = `${record.studentName}_错题详情_${new Date().toISOString().split('T')[0]}.csv`;
  exportToCSV(csvContent, filename);
}
