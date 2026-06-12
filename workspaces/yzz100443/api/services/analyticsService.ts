import { all } from '../database/db.js';
import { createObjectCsvWriter } from 'csv-writer';
import { FRAUD_TYPE_LABELS, type FraudType, type FraudTypeStats, type AgeGroupStats } from '../../shared/types.js';

export async function getFraudTypeStats(): Promise<FraudTypeStats[]> {
  const rows = await all<{
    fraud_type: FraudType;
    total_answers: number;
    incorrect_answers: number;
  }>(
    `SELECT 
       ar.fraud_type,
       COUNT(*) as total_answers,
       SUM(CASE WHEN ar.is_correct = 0 THEN 1 ELSE 0 END) as incorrect_answers
     FROM answer_records ar
     GROUP BY ar.fraud_type
     ORDER BY incorrect_answers DESC`
  );

  return rows.map(row => ({
    fraudType: row.fraud_type,
    label: FRAUD_TYPE_LABELS[row.fraud_type] || row.fraud_type,
    totalAnswers: row.total_answers,
    incorrectAnswers: row.incorrect_answers,
    fraudRate: row.total_answers > 0 ? Math.round((row.incorrect_answers / row.total_answers) * 100) : 0,
  }));
}

export async function getAgeGroupStats(): Promise<AgeGroupStats[]> {
  const rows = await all<{
    age_group: string;
    total_answers: number;
    incorrect_answers: number;
  }>(
    `SELECT 
       ar.age_group,
       COUNT(*) as total_answers,
       SUM(CASE WHEN ar.is_correct = 0 THEN 1 ELSE 0 END) as incorrect_answers
     FROM answer_records ar
     WHERE ar.age_group IS NOT NULL
     GROUP BY ar.age_group
     ORDER BY ar.age_group`
  );

  const result: AgeGroupStats[] = [];

  for (const row of rows) {
    const fraudTypeRows = await all<{
      fraud_type: FraudType;
      total: number;
      incorrect: number;
    }>(
      `SELECT 
         fraud_type,
         COUNT(*) as total,
         SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as incorrect
       FROM answer_records
       WHERE age_group = ?
       GROUP BY fraud_type
       ORDER BY incorrect DESC
       LIMIT 3`,
      [row.age_group]
    );

    result.push({
      ageGroup: row.age_group,
      totalAnswers: row.total_answers,
      incorrectAnswers: row.incorrect_answers,
      fraudRate: row.total_answers > 0 ? Math.round((row.incorrect_answers / row.total_answers) * 100) : 0,
      topFraudTypes: fraudTypeRows.map(r => ({
        fraudType: r.fraud_type,
        rate: r.total > 0 ? Math.round((r.incorrect / r.total) * 100) : 0,
      })),
    });
  }

  return result;
}

export async function getTrendStats(days: number = 30): Promise<{
  date: string;
  totalAnswers: number;
  correctRate: number;
}[]> {
  const rows = await all<{
    date: string;
    total_answers: number;
    correct_answers: number;
  }>(
    `SELECT 
       DATE(created_at) as date,
       COUNT(*) as total_answers,
       SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct_answers
     FROM answer_records
     WHERE created_at >= DATE('now', ?)
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
    [`-${days} days`]
  );

  return rows.map(row => ({
    date: row.date,
    totalAnswers: row.total_answers,
    correctRate: row.total_answers > 0 ? Math.round((row.correct_answers / row.total_answers) * 100) : 0,
  }));
}

export async function getOverviewStats(): Promise<{
  totalElderly: number;
  totalAnswers: number;
  averageCorrectRate: number;
  focusElderly: number;
}> {
  const elderlyRow = await all<{ count: number; focus: number }>(
    'SELECT COUNT(*) as count, SUM(CASE WHEN is_focus = 1 THEN 1 ELSE 0 END) as focus FROM elderly'
  );

  const answersRow = await all<{ total: number; correct: number }>(
    'SELECT COUNT(*) as total, SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct FROM answer_records'
  );

  const totalElderly = elderlyRow[0]?.count || 0;
  const focusElderly = elderlyRow[0]?.focus || 0;
  const totalAnswers = answersRow[0]?.total || 0;
  const correctAnswers = answersRow[0]?.correct || 0;
  const averageCorrectRate = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

  return {
    totalElderly,
    totalAnswers,
    averageCorrectRate,
    focusElderly,
  };
}

export async function exportDataToCsv(filePath: string): Promise<string> {
  const records = await all<{
    id: number;
    elderly_name: string;
    age: number | null;
    age_group: string | null;
    case_title: string;
    fraud_type: string;
    is_correct: number;
    selected_option: string;
    created_at: string;
  }>(
    `SELECT 
       ar.id,
       e.name as elderly_name,
       e.age,
       ar.age_group,
       c.title as case_title,
       ar.fraud_type,
       ar.is_correct,
       ar.selected_option,
       ar.created_at
     FROM answer_records ar
     JOIN elderly e ON ar.elderly_id = e.id
     JOIN cases c ON ar.case_id = c.id
     ORDER BY ar.created_at DESC`
  );

  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: 'id', title: '记录ID' },
      { id: 'elderly_name', title: '老人姓名' },
      { id: 'age', title: '年龄' },
      { id: 'age_group', title: '年龄段' },
      { id: 'case_title', title: '案例名称' },
      { id: 'fraud_type', title: '诈骗类型' },
      { id: 'is_correct', title: '是否正确' },
      { id: 'selected_option', title: '选择选项' },
      { id: 'created_at', title: '答题时间' },
    ],
  });

  const processedRecords = records.map(r => ({
    ...r,
    is_correct: r.is_correct === 1 ? '正确' : '错误',
    fraud_type: FRAUD_TYPE_LABELS[r.fraud_type as FraudType] || r.fraud_type,
  }));

  await csvWriter.writeRecords(processedRecords);
  return filePath;
}

export async function getMostVulnerableCases(limit: number = 10): Promise<{
  caseId: number;
  caseTitle: string;
  fraudType: FraudType;
  fraudTypeLabel: string;
  totalAnswers: number;
  incorrectAnswers: number;
  fraudRate: number;
}[]> {
  const rows = await all<{
    case_id: number;
    case_title: string;
    fraud_type: FraudType;
    total_answers: number;
    incorrect_answers: number;
  }>(
    `SELECT 
       ar.case_id,
       c.title as case_title,
       ar.fraud_type,
       COUNT(*) as total_answers,
       SUM(CASE WHEN ar.is_correct = 0 THEN 1 ELSE 0 END) as incorrect_answers
     FROM answer_records ar
     JOIN cases c ON ar.case_id = c.id
     GROUP BY ar.case_id, c.title, ar.fraud_type
     HAVING total_answers >= 3
     ORDER BY incorrect_answers DESC
     LIMIT ?`,
    [limit]
  );

  return rows.map(row => ({
    caseId: row.case_id,
    caseTitle: row.case_title,
    fraudType: row.fraud_type,
    fraudTypeLabel: FRAUD_TYPE_LABELS[row.fraud_type] || row.fraud_type,
    totalAnswers: row.total_answers,
    incorrectAnswers: row.incorrect_answers,
    fraudRate: row.total_answers > 0 ? Math.round((row.incorrect_answers / row.total_answers) * 100) : 0,
  }));
}
