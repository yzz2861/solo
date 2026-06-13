import type { AnalysisResult, Annotation } from '@/types';
import { splitIntoParagraphs } from './textProcessor';
import { detectEvidence } from './evidenceDetector';
import { detectSubjectivity } from './subjectivityDetector';
import { detectBias, getBiasTypes } from './biasDetector';
import { generateFollowUps } from './followUpGenerator';
import { calculateRiskScore } from './riskScorer';

export function analyzeInterview(content: string, candidateName?: string, position?: string): AnalysisResult {
  const paragraphs = splitIntoParagraphs(content);

  const evidenceAnnotations = detectEvidence(content, paragraphs);
  const subjectivityAnnotations = detectSubjectivity(content, paragraphs);
  const biasAnnotations = detectBias(content, paragraphs);

  const allAnnotations = removeOverlaps([
    ...biasAnnotations,
    ...evidenceAnnotations,
    ...subjectivityAnnotations,
  ]);

  const biasTypes = getBiasTypes(allAnnotations);
  const followUpQuestions = generateFollowUps({
    candidateName,
    position,
    annotations: allAnnotations,
  });
  const riskScore = calculateRiskScore(allAnnotations);

  return {
    annotations: allAnnotations,
    followUpQuestions,
    riskScore,
    biasTypes,
  };
}

function removeOverlaps(annotations: Annotation[]): Annotation[] {
  if (annotations.length === 0) return [];

  const sorted = [...annotations].sort((a, b) => {
    if (a.paragraphIndex !== b.paragraphIndex) return a.paragraphIndex - b.paragraphIndex;
    return a.start - b.start;
  });

  const priority: Record<string, number> = {
    bias: 3,
    evidence: 2,
    no_evidence: 1,
    follow_up: 0,
  };

  const result: Annotation[] = [];
  let lastEnd = -1;
  let lastParaIdx = -1;

  for (const ann of sorted) {
    if (ann.paragraphIndex !== lastParaIdx) {
      lastEnd = -1;
      lastParaIdx = ann.paragraphIndex;
    }

    if (ann.start >= lastEnd) {
      result.push(ann);
      lastEnd = ann.end;
    } else {
      const prev = result[result.length - 1];
      if (prev && priority[ann.type] > priority[prev.type]) {
        result[result.length - 1] = ann;
        lastEnd = ann.end;
      }
    }
  }

  return result;
}

export { splitIntoParagraphs } from './textProcessor';
export { getRiskLevel, getRiskLabel, getRiskColor } from './riskScorer';
