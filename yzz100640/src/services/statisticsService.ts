import type { QARecord, StatisticsData } from '@/types';
import { getStorage } from '@/utils/storage';

function isSameYearMonth(isoString: string, year: number, month: number): boolean {
  const date = new Date(isoString);
  return date.getFullYear() === year && date.getMonth() === month - 1;
}

function mergeSimilarQuestions(records: QARecord[]): Array<{ question: string; count: number }> {
  const groups: Array<{ prefix: string; question: string; count: number }> = [];
  for (const record of records) {
    const q = record.question;
    const prefix = q.length >= 6 ? q.slice(0, 6) : q;
    let matched = false;
    for (const group of groups) {
      if (prefix === group.prefix || q.startsWith(group.question.slice(0, Math.min(6, group.question.length))) || group.question.startsWith(q.slice(0, Math.min(6, q.length)))) {
        group.count += 1;
        if (q.length < group.question.length) {
          group.question = q;
          group.prefix = prefix;
        }
        matched = true;
        break;
      }
    }
    if (!matched) {
      groups.push({ prefix, question: q, count: 1 });
    }
  }
  return groups
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((g) => ({ question: g.question, count: g.count }));
}

export const StatisticsService = {
  async getMonthlyData(year: number, month: number): Promise<StatisticsData> {
    const allHistory = getStorage<QARecord[]>('qa_history', []);
    const records = allHistory.filter((r) => isSameYearMonth(r.createdAt, year, month));

    const totalQA = records.length;

    const adoptedTrue = records.filter((r) => r.adopted === true).length;
    const adoptedFalse = records.filter((r) => r.adopted === false).length;
    const adoptionBase = adoptedTrue + adoptedFalse;
    const adoptionRate = adoptionBase > 0 ? adoptedTrue / adoptionBase : 0;

    const manualJudgmentCount = records.filter((r) => r.needsManualJudgment === true).length;

    const topQuestions = mergeSimilarQuestions(records);

    const categoryMap = new Map<string, number>();
    for (const r of records) {
      if (r.sources.length > 0) {
        const category = r.sources[0].sourceType;
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      }
    }
    const categoryDistribution = Array.from(categoryMap.entries()).map(([category, count]) => ({
      category,
      count,
    }));

    const uncoveredMap = new Map<string, { question: string; note?: string; count: number }>();
    for (const r of records) {
      if (r.needsManualJudgment === true || r.adopted === false) {
        const existing = uncoveredMap.get(r.question);
        if (existing) {
          existing.count += 1;
          if (r.adoptionNote && !existing.note) {
            existing.note = r.adoptionNote;
          }
        } else {
          uncoveredMap.set(r.question, {
            question: r.question,
            note: r.adoptionNote,
            count: 1,
          });
        }
      }
    }
    const uncoveredQuestions = Array.from(uncoveredMap.values())
      .sort((a, b) => b.count - a.count);

    return {
      totalQA,
      adoptionRate,
      manualJudgmentCount,
      topQuestions,
      categoryDistribution,
      uncoveredQuestions,
    };
  },

  async exportReport(year: number, month: number): Promise<Blob> {
    const data = await this.getMonthlyData(year, month);

    const lines: string[] = [];
    lines.push(`农技问答月度报告 - ${year}年${month}月`);
    lines.push('');
    lines.push('总体统计');
    lines.push(`总问答数,${data.totalQA}`);
    lines.push(`采纳率,${(data.adoptionRate * 100).toFixed(2)}%`);
    lines.push(`需人工判断数,${data.manualJudgmentCount}`);
    lines.push('');
    lines.push('高频问题TOP10');
    lines.push('排名,问题,次数');
    data.topQuestions.forEach((item, index) => {
      lines.push(`${index + 1},"${item.question.replace(/"/g, '""')}",${item.count}`);
    });
    lines.push('');
    lines.push('分类分布');
    lines.push('分类,数量');
    data.categoryDistribution.forEach((item) => {
      lines.push(`"${item.category}",${item.count}`);
    });
    lines.push('');
    lines.push('未覆盖问题');
    lines.push('问题,备注,次数');
    data.uncoveredQuestions.forEach((item) => {
      const note = item.note ? item.note.replace(/"/g, '""') : '';
      lines.push(`"${item.question.replace(/"/g, '""')}","${note}",${item.count}`);
    });

    const csvContent = '\uFEFF' + lines.join('\r\n');
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  },
};
