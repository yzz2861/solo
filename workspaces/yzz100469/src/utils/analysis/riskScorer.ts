import type { Annotation } from '@/types';

export function calculateRiskScore(annotations: Annotation[]): number {
  let score = 0;

  const biasCount = annotations.filter(a => a.type === 'bias').length;
  const noEvidenceCount = annotations.filter(a => a.type === 'no_evidence').length;
  const evidenceCount = annotations.filter(a => a.type === 'evidence').length;

  score += biasCount * 15;

  score += noEvidenceCount * 4;

  if (evidenceCount === 0 && noEvidenceCount > 0) {
    score += 15;
  } else {
    const ratio = evidenceCount / (evidenceCount + noEvidenceCount + 0.01);
    if (ratio < 0.3) score += 10;
    else if (ratio < 0.5) score += 5;
  }

  if (biasCount > 0) score += 10;

  return Math.min(100, Math.round(score));
}

export function getRiskLevel(score: number): 'low' | 'medium' | 'high' {
  if (score < 25) return 'low';
  if (score < 55) return 'medium';
  return 'high';
}

export function getRiskLabel(level: 'low' | 'medium' | 'high'): string {
  const map = { low: '低风险', medium: '中风险', high: '高风险' };
  return map[level];
}

export function getRiskColor(level: 'low' | 'medium' | 'high'): string {
  const map = {
    low: 'bg-evidence text-evidence-dark',
    medium: 'bg-noevidence text-noevidence-dark',
    high: 'bg-bias text-white',
  };
  return map[level];
}
