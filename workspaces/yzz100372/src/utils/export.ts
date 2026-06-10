import { CuppingRecord } from '@/types';
import { calculateAverageScore, generateSaleSuggestion } from './validation';

export const exportToCSV = (records: CuppingRecord[]): string => {
  const headers = [
    '批次',
    '产区',
    '处理法',
    '杯测人',
    '杯测日期',
    '香气',
    '酸质',
    '甜感',
    '醇厚度',
    '平衡感',
    '整体评分',
    '平均分',
    '缺陷',
    '缺陷数量',
    '风味描述',
    '磨豆机',
    '水温',
    '是否上架',
    '是否复测',
    '上架建议',
  ];

  const rows = records.map((record) => {
    const avgScore = calculateAverageScore(record.scores).toFixed(2);
    return [
      record.batch,
      record.origin,
      record.process,
      record.cupper,
      record.cuppingDate,
      record.scores.aroma,
      record.scores.acidity,
      record.scores.sweetness,
      record.scores.body,
      record.scores.balance,
      record.scores.overall,
      avgScore,
      record.defects.join('、'),
      record.defects.length,
      record.flavorNotes.replace(/\n/g, ' '),
      record.brewParams.grinder,
      record.brewParams.waterTemp,
      record.status.isOnSale ? '是' : '否',
      record.status.isRetest ? '是' : '否',
      generateSaleSuggestion(record),
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => {
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ),
  ].join('\n');

  return '\uFEFF' + csvContent;
};

export const downloadCSV = (records: CuppingRecord[], filename?: string): void => {
  const csvContent = exportToCSV(records);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  link.download = filename || `杯测记录_${dateStr}.csv`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const generateSummaryReport = (records: CuppingRecord[]): string => {
  const batchMap = new Map<string, CuppingRecord[]>();
  
  records.forEach((record) => {
    if (!batchMap.has(record.batch)) {
      batchMap.set(record.batch, []);
    }
    batchMap.get(record.batch)!.push(record);
  });

  let report = '咖啡豆杯测摘要报告\n';
  report += '='.repeat(60) + '\n\n';
  report += `报告生成时间: ${new Date().toLocaleString('zh-CN')}\n`;
  report += `总记录数: ${records.length}\n`;
  report += `总批次数: ${batchMap.size}\n\n`;

  report += '批次汇总:\n';
  report += '-'.repeat(60) + '\n';

  const batchSummaries: {
    batch: string;
    origin: string;
    process: string;
    avgScore: number;
    defectCount: number;
    recordCount: number;
    suggestion: string;
    onSale: boolean;
  }[] = [];

  batchMap.forEach((batchRecords, batch) => {
    const avgOverall = batchRecords.reduce((sum, r) => sum + r.scores.overall, 0) / batchRecords.length;
    const allDefects = new Set(batchRecords.flatMap((r) => r.defects));
    const firstRecord = batchRecords[0];

    const suggestion = avgOverall >= 8.0 && allDefects.size <= 2
      ? '推荐上架'
      : avgOverall >= 7.0 && allDefects.size <= 3
        ? '观察期'
        : '暂缓上架';

    batchSummaries.push({
      batch,
      origin: firstRecord.origin,
      process: firstRecord.process,
      avgScore: avgOverall,
      defectCount: allDefects.size,
      recordCount: batchRecords.length,
      suggestion,
      onSale: firstRecord.status.isOnSale,
    });
  });

  batchSummaries.sort((a, b) => b.avgScore - a.avgScore);

  batchSummaries.forEach((summary) => {
    const statusFlag = summary.suggestion === '暂缓上架' ? '⚠️ ' : '';
    report += `${statusFlag}批次: ${summary.batch}\n`;
    report += `  产区: ${summary.origin} | 处理法: ${summary.process}\n`;
    report += `  平均评分: ${summary.avgScore.toFixed(2)} / 10\n`;
    report += `  缺陷种类: ${summary.defectCount} 种 | 杯测次数: ${summary.recordCount} 次\n`;
    report += `  当前状态: ${summary.onSale ? '已上架' : '未上架'} | 建议: ${summary.suggestion}\n`;
    report += '\n';
  });

  report += '\n暂缓上架批次明细:\n';
  report += '-'.repeat(60) + '\n';
  
  const heldBatches = batchSummaries.filter((b) => b.suggestion === '暂缓上架');
  if (heldBatches.length === 0) {
    report += '暂无\n';
  } else {
    heldBatches.forEach((batch) => {
      report += `• ${batch.batch} - ${batch.origin} (${batch.avgScore.toFixed(2)}分)\n`;
    });
  }

  return report;
};

export const downloadSummary = (records: CuppingRecord[], filename?: string): void => {
  const content = generateSummaryReport(records);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  link.download = filename || `杯测摘要报告_${dateStr}.txt`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
