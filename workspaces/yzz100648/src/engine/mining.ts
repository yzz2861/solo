import type { Risk, RiskCategory, Severity, DownweightReason, Response } from '@/types';
import { RISK_KEYWORDS, DOWNWEIGHT_KEYWORDS, SPECIFICITY_KEYWORDS, IMPACT_SCOPE_KEYWORDS } from './keywords';

function containsKeyword(text: string, keywords: string[]): boolean {
  return keywords.some(kw => text.includes(kw));
}

function checkDownweight(text: string): { isDownweighted: boolean; reason?: DownweightReason } {
  const reasons: DownweightReason[] = ['joke', 'news_quote', 'copy_paste', 'irrelevant'];

  for (const reason of reasons) {
    if (reason === 'copy_paste') continue;
    const keywords = DOWNWEIGHT_KEYWORDS[reason];
    if (containsKeyword(text, keywords)) {
      return { isDownweighted: true, reason };
    }
  }

  return { isDownweighted: false };
}

function detectDuplicate(text: string, existingTexts: string[]): boolean {
  for (const existing of existingTexts) {
    if (text === existing) return true;
    const shorter = text.length < existing.length ? text : existing;
    const longer = text.length < existing.length ? existing : text;
    if (longer.includes(shorter) && shorter.length / longer.length > 0.8) {
      return true;
    }
  }
  return false;
}

function calculateSeverity(
  text: string,
  category: RiskCategory,
  isDownweighted: boolean
): Severity {
  let score = 0;

  const categoryWeights: Record<RiskCategory, number> = {
    safety: 4,
    payment: 3.5,
    privacy: 3,
    compliance: 3,
    vulnerable: 2.5,
  };
  score += categoryWeights[category];

  const matchedSpecificity = SPECIFICITY_KEYWORDS.filter(kw => text.includes(kw)).length;
  score += Math.min(matchedSpecificity * 0.3, 1.5);

  const matchedImpact = IMPACT_SCOPE_KEYWORDS.filter(kw => text.includes(kw)).length;
  score += Math.min(matchedImpact * 0.5, 1.5);

  if (isDownweighted) score -= 1;

  if (score >= 6) return 'critical';
  if (score >= 4.5) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

function inferImpactScope(text: string, category: RiskCategory): string {
  const scopes: string[] = [];
  if (text.includes('所有') || text.includes('全部') || text.includes('每个')) {
    scopes.push('全量用户');
  }
  if (category === 'vulnerable' || text.includes('小孩') || text.includes('老人') || text.includes('未成年')) {
    scopes.push('弱势群体');
  }
  if (text.includes('付费') || text.includes('扣费') || text.includes('续费')) {
    scopes.push('付费用户');
  }
  if (scopes.length === 0) scopes.push('部分用户');
  return scopes.join('、');
}

export function mineRisks(
  responses: Response[],
  categories: RiskCategory[],
  existingQuotes: string[] = []
): Risk[] {
  const risks: Risk[] = [];
  const allQuotes = [...existingQuotes];

  for (const response of responses) {
    const text = response.content;
    if (!text || text.trim().length < 4) continue;

    for (const category of categories) {
      const keywords = RISK_KEYWORDS[category];
      if (!containsKeyword(text, keywords)) continue;

      const isDuplicate = detectDuplicate(text, allQuotes);

      let downweightResult = checkDownweight(text);
      if (isDuplicate) {
        downweightResult = { isDownweighted: true, reason: 'copy_paste' };
      }

      const severity = calculateSeverity(text, category, downweightResult.isDownweighted);
      const impactScope = inferImpactScope(text, category);

      const risk: Risk = {
        id: `risk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        projectId: response.projectId,
        responseId: response.id,
        originalQuote: text,
        riskCategory: category,
        severity,
        impactScope,
        isDownweighted: downweightResult.isDownweighted,
        downweightReason: downweightResult.reason,
        status: 'pending',
        createdAt: Date.now(),
      };

      risks.push(risk);
      allQuotes.push(text);
    }
  }

  return risks.sort((a, b) => {
    const severityOrder: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}
