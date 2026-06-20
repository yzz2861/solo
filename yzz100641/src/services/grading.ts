import { 
  GradingResult, 
  GradingLevel, 
  TriggeredSentence, 
  HelpRequest 
} from '@/types';
import { GRADING_RULES, MIN_CONTENT_LENGTH, REVIEW_KEYWORDS } from '@/config/rules';
import { splitSentences, containsAny, generateId } from '@/utils/text';

export interface GradingEngineResult {
  result: GradingResult;
  request: HelpRequest;
}

export function gradeText(content: string): GradingResult {
  const now = new Date().toISOString();
  const triggeredSentences: TriggeredSentence[] = [];
  const triggeredRules: string[] = [];
  const levelWeights: Record<GradingLevel, number> = {
    emergency: 0,
    psychology: 0,
    headteacher: 0,
    general: 0,
    review: 0,
  };
  
  const normalizedContent = content.trim();
  
  if (normalizedContent.length < MIN_CONTENT_LENGTH) {
    return {
      level: 'review',
      confidence: 80,
      triggeredSentences: [],
      triggeredRules: ['content-too-short'],
      gradedAt: now,
      gradingEngine: 'v1.0-rule-based',
    };
  }
  
  const sentences = splitSentences(normalizedContent);
  
  for (const rule of GRADING_RULES) {
    if (!rule.enabled) continue;
    
    for (const sentence of sentences) {
      if (containsAny(sentence.text, rule.keywords)) {
        levelWeights[rule.level] += rule.weight;
        
        const exists = triggeredSentences.some(
          s => s.startIndex === sentence.start && s.endIndex === sentence.end
        );
        
        if (!exists) {
          triggeredSentences.push({
            text: sentence.text,
            startIndex: sentence.start,
            endIndex: sentence.end,
            ruleId: rule.id,
            ruleName: rule.name,
          });
        }
        
        if (!triggeredRules.includes(rule.id)) {
          triggeredRules.push(rule.id);
        }
      }
    }
  }
  
  let hasEmergencyKeyword = false;
  for (const sentence of sentences) {
    if (containsAny(sentence.text, REVIEW_KEYWORDS.emergency)) {
      hasEmergencyKeyword = true;
      break;
    }
  }
  
  if (hasEmergencyKeyword && levelWeights.emergency === 0) {
    for (const rule of GRADING_RULES.filter(r => r.level === 'emergency')) {
      for (const sentence of sentences) {
        if (containsAny(sentence.text, rule.keywords)) {
          levelWeights.emergency += rule.weight;
          break;
        }
      }
    }
  }
  
  const sortedLevels = (Object.entries(levelWeights) as [GradingLevel, number][])
    .sort((a, b) => b[1] - a[1]);
  
  const [topLevel, topWeight] = sortedLevels[0];
  const [, secondWeight] = sortedLevels[1];
  
  let finalLevel: GradingLevel;
  let confidence: number;
  
  if (topWeight === 0) {
    finalLevel = 'general';
    confidence = 60;
  } else {
    finalLevel = topLevel;
    const totalWeight = topWeight + secondWeight;
    confidence = totalWeight > 0 ? Math.round((topWeight / totalWeight) * 100) : 80;
    confidence = Math.min(95, Math.max(50, confidence));
  }
  
  const isTooShort = normalizedContent.length < MIN_CONTENT_LENGTH + 10;
  if (isTooShort && finalLevel !== 'emergency') {
    finalLevel = 'review';
    if (!triggeredRules.includes('content-too-short')) {
      triggeredRules.push('content-too-short');
    }
  }
  
  return {
    level: finalLevel,
    confidence,
    triggeredSentences,
    triggeredRules,
    gradedAt: now,
    gradingEngine: 'v1.0-rule-based',
  };
}

export function gradeRequest(request: HelpRequest): GradingEngineResult {
  const result = gradeText(request.content);
  
  const updatedRequest: HelpRequest = {
    ...request,
    status: 'graded',
    gradingResult: result,
    updatedAt: new Date().toISOString(),
  };
  
  return {
    result,
    request: updatedRequest,
  };
}

export function createHelpRequest(
  content: string,
  source: 'manual' | 'batch' | 'file',
  submitTime?: string
): HelpRequest {
  const now = new Date().toISOString();
  
  return {
    id: generateId(),
    content: content.trim(),
    submitTime: submitTime || now,
    source,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
}

export function batchGradeRequests(requests: HelpRequest[]): GradingEngineResult[] {
  return requests.map(request => gradeRequest(request));
}
