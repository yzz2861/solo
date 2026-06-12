import { riskKeywords, highRiskKeywords } from '@/data/riskKeywords';
import type { Answer, Topic } from '@/types';

const positiveWords = new Set([
  '好', '很好', '非常好', '满意', '很满意', '喜欢', '很喜欢', '推荐', '强烈推荐',
  '不错', '很棒', '超棒', '赞', '好评', '优秀', '出色', '划算', '值得',
  '精致', '精美', '高档', '实惠', '靠谱', '专业', '耐心', '热情',
  '细腻', '顺滑', '很香', '诱人', '满意', '惊喜', '超出预期',
]);

const negativeWords = new Set([
  '差', '很差', '非常差', '不好', '糟糕', '失望', '很失望', '垃圾', '劣质',
  '假货', '欺骗', '虚假', '夸大', '后悔', '差评', '投诉',
  '慢', '太慢', '贵', '太贵', '不值', '复杂', '难用', '不方便',
  '刺鼻', '恶心', '头晕', '过敏', '受伤', '危险', '可怕',
]);

export const detectRiskKeywords = (text: string): string[] => {
  const matched: string[] = [];
  for (const entry of riskKeywords) {
    if (text.includes(entry.keyword)) {
      matched.push(entry.keyword);
    }
  }
  return matched;
};

export const calculateRiskScore = (matchedKeywords: string[], sentiment: number): number => {
  let score = 0;
  for (const keyword of matchedKeywords) {
    const entry = riskKeywords.find(k => k.keyword === keyword);
    if (entry) {
      switch (entry.severity) {
        case 'high':
          score += 3;
          break;
        case 'medium':
          score += 2;
          break;
        case 'low':
          score += 1;
          break;
      }
    }
  }
  if (sentiment < 0) {
    score += 1;
  }
  return score;
};

export const analyzeSentiment = (text: string): number => {
  let positiveScore = 0;
  let negativeScore = 0;
  for (const word of positiveWords) {
    if (text.includes(word)) {
      positiveScore += 1;
    }
  }
  for (const word of negativeWords) {
    if (text.includes(word)) {
      negativeScore += 1;
    }
  }
  if (positiveScore === 0 && negativeScore === 0) return 0;
  return (positiveScore - negativeScore) / (positiveScore + negativeScore);
};

export const detectAnswerRisks = (answers: Answer[]): Answer[] => {
  return answers.map(answer => {
    const matchedKeywords = detectRiskKeywords(answer.cleanedText);
    const sentiment = analyzeSentiment(answer.cleanedText);
    const riskScore = calculateRiskScore(matchedKeywords, sentiment);
    
    return {
      ...answer,
      matchedRiskKeywords,
      sentimentScore: sentiment,
      sentiment: sentiment,
      importanceScore: riskScore,
      riskScore: riskScore,
    };
  });
};

export const detectTopicRisks = (
  topics: Topic[],
  answers: Answer[]
): { topics: Topic[]; answers: Answer[] } => {
  const updatedAnswers = detectAnswerRisks(answers);
  
  const updatedTopics = topics.map(topic => {
    const topicAnswers = updatedAnswers.filter(a => a.topicId === topic.id);
    const riskAnswers = topicAnswers.filter(a => a.matchedRiskKeywords.length > 0);
    
    let maxRiskScore = 0;
    let riskReason = '';
    
    for (const answer of riskAnswers) {
      if (answer.importanceScore > maxRiskScore) {
        maxRiskScore = answer.importanceScore;
        const highRiskMatched = answer.matchedRiskKeywords.filter(k => 
          highRiskKeywords.includes(k)
        );
        if (highRiskMatched.length > 0) {
          riskReason = `包含高风险关键词：${highRiskMatched.join('、')}`;
        }
      }
    }
    
    const avgSentiment = topicAnswers.length > 0
      ? topicAnswers.reduce((sum, a) => sum + a.sentimentScore, 0) / topicAnswers.length
      : 0;
    
    const hasHighRisk = riskAnswers.some(a => 
      a.matchedRiskKeywords.some(k => highRiskKeywords.includes(k))
    );
    const isRisk = hasHighRisk || maxRiskScore >= 3;
    const isPinned = isRisk || maxRiskScore >= 2;
    
    return {
      ...topic,
      isRisk,
      riskScore: maxRiskScore,
      riskReason: riskReason || (maxRiskScore > 0 ? `包含 ${riskAnswers.length} 条风险相关回答` : ''),
      sentimentScore: avgSentiment,
      isPinned,
      updatedAt: new Date(),
    };
  });
  
  return {
    topics: updatedTopics,
    answers: updatedAnswers,
  };
};

export const sortTopicsByImportance = (topics: Topic[]): Topic[] => {
  return [...topics].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    if (a.isRisk && !b.isRisk) return -1;
    if (!a.isRisk && b.isRisk) return 1;
    if (a.riskScore !== b.riskScore) return b.riskScore - a.riskScore;
    return b.answerCount - a.answerCount;
  });
};
