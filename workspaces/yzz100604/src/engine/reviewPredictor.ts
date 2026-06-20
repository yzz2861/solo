import type { RiskLevel } from './types';
import { REVIEW_TIME_RANGES } from './thresholds';

export const predictReviewTime = (
  level: RiskLevel,
  windMs: number,
  precipWeight: number,
  score: number,
): number => {
  const [min, max] = REVIEW_TIME_RANGES[level];
  const range = max - min;

  let modifier = 0;

  if (windMs >= 10) modifier -= range * 0.3;
  else if (windMs >= 6) modifier -= range * 0.15;

  if (precipWeight >= 18) modifier -= range * 0.3;
  else if (precipWeight >= 10) modifier -= range * 0.15;

  const scoreRatio = score / 100;
  const baseTime = max - scoreRatio * range;

  return Math.max(min, Math.round(baseTime + modifier));
};
