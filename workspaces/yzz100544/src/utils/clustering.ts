import type { Theme, Feedback, FeedbackThemeRelation, SeverityLevel } from '@/types';

export const DEFAULT_THEMES: Theme[] = [
  {
    id: 'concept',
    name: '概念理解',
    color: '#ef4444',
    description: '学生对核心概念、定义、定理理解不清晰或存在混淆',
    keywords: ['概念不清', '不理解', '不懂', '混淆', '分不清', '什么是', '定义', '含义', '不太明白', '搞不懂', '概念模糊', '怎么理解', '到底是啥'],
    weight: 1.2,
    isCustom: false,
  },
  {
    id: 'formula',
    name: '公式套用',
    color: '#f59e0b',
    description: '公式记错、套错、代入错误或不知道如何使用公式',
    keywords: ['公式错', '套错', '用错公式', '代入', '计算错误', '推导', '公式记错', '公式怎么用', '公式记不住', '算错', '计算不对', '公式变形'],
    weight: 1.2,
    isCustom: false,
  },
  {
    id: 'step',
    name: '步骤遗漏',
    color: '#8b5cf6',
    description: '解题过程缺少步骤、跳步、中间推导过程不清晰',
    keywords: ['步骤', '漏了', '缺少', '跳过', '过程', '中间步骤', '怎么来的', '不知道从哪下手', '跳步', '过程不详细', '步骤省略', '中间怎么来'],
    weight: 1.0,
    isCustom: false,
  },
  {
    id: 'tool',
    name: '工具使用',
    color: '#06b6d4',
    description: '软件、编程工具、实验仪器使用问题，环境配置问题',
    keywords: ['软件', '工具', '不会用', '报错', '安装', '环境', 'Matlab', 'Python', 'Excel', 'SPSS', '代码出错', 'bug', '运行不出来', '编译', 'debug', '配置'],
    weight: 1.1,
    isCustom: false,
  },
  {
    id: 'ambiguity',
    name: '题目歧义',
    color: '#10b981',
    description: '题目表述不清楚、有歧义、看不懂问题在问什么',
    keywords: ['题目不清楚', '看不懂题', '歧义', '表述不清', '什么意思', '题目有问题', '看不懂问题', '题目说啥', '题目不明确', '问什么', '条件不清'],
    weight: 1.1,
    isCustom: false,
  },
  {
    id: 'difficulty',
    name: '难度过大',
    color: '#ec4899',
    description: '作业/题目难度超出预期、超纲、做不完',
    keywords: ['太难', '不会做', '做不出来', '超出范围', '超纲', '难度大', '做不完', '太难了', '完全不会', '无从下手', '太难懂'],
    weight: 1.0,
    isCustom: false,
  },
];

const SEVERE_KEYWORDS = ['完全不会', '全班都不懂', '所有人都错', '大部分都错', '都不会', '全军覆没', '没人会', '绝大多数', '基本都错', '普遍反映'];

export interface ClassifyResult {
  themeId: string;
  score: number;
  matchedKeywords: string[];
}

export function multiLabelClassify(
  text: string,
  themes: Theme[] = DEFAULT_THEMES,
  threshold: number = 0.25
): ClassifyResult[] {
  const results: ClassifyResult[] = [];

  for (const theme of themes) {
    let matchCount = 0;
    const matched: string[] = [];

    for (const kw of theme.keywords) {
      if (text.includes(kw)) {
        matchCount++;
        matched.push(kw);
      }
    }

    const effectiveKeywords = Math.max(theme.keywords.length * 0.4, 2);
    const score = (matchCount * theme.weight) / effectiveKeywords;

    if (score >= threshold && matched.length > 0) {
      results.push({ themeId: theme.id, score, matchedKeywords: matched });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

export function determineSeverity(
  text: string,
  classifyResults: ClassifyResult[],
  themeCounts?: Map<string, number>
): { severity: SeverityLevel; isSevere: boolean } {
  const hasSevereKeyword = SEVERE_KEYWORDS.some(kw => text.includes(kw));

  if (classifyResults.length >= 3 || hasSevereKeyword) {
    return { severity: 'critical', isSevere: true };
  }

  if (classifyResults.length === 2 ||
    classifyResults.some(r => ['concept', 'formula'].includes(r.themeId) && r.score >= 0.6)) {
    return { severity: 'important', isSevere: false };
  }

  if (themeCounts) {
    for (const r of classifyResults) {
      const count = themeCounts.get(r.themeId) ?? 0;
      if (count <= 2 && (r.score >= 0.4 || hasSevereKeyword)) {
        return { severity: 'rare-critical', isSevere: true };
      }
    }
  }

  return { severity: 'normal', isSevere: false };
}

export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function buildThemeRelations(
  feedback: Feedback,
  themes: Theme[] = DEFAULT_THEMES
): FeedbackThemeRelation[] {
  const results = multiLabelClassify(feedback.content, themes);
  return results.map(r => ({
    feedbackId: feedback.id,
    themeId: r.themeId,
    matchScore: r.score,
    matchedKeywords: r.matchedKeywords,
    manuallyAdjusted: false,
  }));
}
