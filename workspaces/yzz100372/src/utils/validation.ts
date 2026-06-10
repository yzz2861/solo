import { CuppingRecord, CuppingScores, ValidationResult, ValidationWarning, ScoreKey } from '@/types';
import { getDefectSuggestion } from './defectDictionary';

const SCORE_MIN = 0;
const SCORE_MAX = 10;
const BATCH_CONFLICT_THRESHOLD = 1.0;

export const validateScores = (scores: CuppingScores): ValidationWarning[] => {
  const warnings: ValidationWarning[] = [];
  const scoreKeys: ScoreKey[] = ['aroma', 'acidity', 'sweetness', 'body', 'balance', 'overall'];

  for (const key of scoreKeys) {
    const value = scores[key];
    if (value < SCORE_MIN || value > SCORE_MAX) {
      warnings.push({
        type: 'score_range',
        severity: 'error',
        message: `「${getScoreLabel(key)}」分数 ${value} 超出范围（${SCORE_MIN}-${SCORE_MAX}分）`,
      });
    }
  }

  return warnings;
};

export const validateDefects = (defects: string[]): ValidationWarning[] => {
  const warnings: ValidationWarning[] = [];

  for (const defect of defects) {
    const suggestion = getDefectSuggestion(defect);
    if (suggestion) {
      warnings.push({
        type: 'defect_spelling',
        severity: 'warning',
        message: `「${defect}」建议使用标准术语「${suggestion}」`,
        suggestions: [suggestion],
        details: defect,
      });
    }
  }

  return warnings;
};

export const validateBatchConsistency = (
  record: CuppingRecord,
  allRecords: CuppingRecord[]
): ValidationWarning[] => {
  const warnings: ValidationWarning[] = [];
  const sameBatchRecords = allRecords.filter(
    (r) => r.batch === record.batch && r.id !== record.id
  );

  if (sameBatchRecords.length === 0) return warnings;

  const otherScores = sameBatchRecords.map((r) => ({
    cupper: r.cupper,
    overall: r.scores.overall,
  }));

  const avgOther = otherScores.reduce((sum, s) => sum + s.overall, 0) / otherScores.length;
  const diff = Math.abs(record.scores.overall - avgOther);

  if (diff > BATCH_CONFLICT_THRESHOLD) {
    warnings.push({
      type: 'batch_conflict',
      severity: 'warning',
      message: `同一批次「${record.batch}」的评分差异较大（你的评分: ${record.scores.overall}，他人平均: ${avgOther.toFixed(1)}）`,
      details: otherScores.map((s) => `${s.cupper}: ${s.overall}分`).join('、'),
    });
  }

  return warnings;
};

export const validateRecord = (
  record: CuppingRecord,
  allRecords: CuppingRecord[]
): ValidationResult => {
  const warnings: ValidationWarning[] = [];

  warnings.push(...validateScores(record.scores));
  warnings.push(...validateDefects(record.defects));
  warnings.push(...validateBatchConsistency(record, allRecords));

  const hasErrors = warnings.some((w) => w.severity === 'error');

  return {
    valid: !hasErrors,
    warnings,
  };
};

const getScoreLabel = (key: ScoreKey): string => {
  const labels: Record<ScoreKey, string> = {
    aroma: '香气',
    acidity: '酸质',
    sweetness: '甜感',
    body: '醇厚度',
    balance: '平衡感',
    overall: '整体评分',
  };
  return labels[key];
};

export const calculateAverageScore = (scores: CuppingScores): number => {
  const values = Object.values(scores);
  return values.reduce((sum, v) => sum + v, 0) / values.length;
};

export const shouldHoldSale = (record: CuppingRecord): boolean => {
  const avgScore = calculateAverageScore(record.scores);
  const hasSeriousDefects = record.defects.some((d) =>
    ['霉味', '发酵味', '泥土味', '橡胶味', '霉臭味', '鱼腥味'].includes(d)
  );
  
  return avgScore < 7.0 || hasSeriousDefects || record.status.isRetest;
};

export const generateSaleSuggestion = (record: CuppingRecord): string => {
  const avgScore = calculateAverageScore(record.scores);
  
  if (record.defects.length === 0 && avgScore >= 8.5) {
    return '推荐上架 - 高品质';
  } else if (avgScore >= 7.5 && record.defects.length <= 1) {
    return '可上架 - 品质良好';
  } else if (avgScore >= 7.0 && !shouldHoldSale(record)) {
    return '观察期 - 可少量测试';
  } else {
    return '暂缓上架 - 建议复测';
  }
};
