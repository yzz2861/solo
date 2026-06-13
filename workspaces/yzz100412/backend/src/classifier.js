const { RiskLevel } = require('./constants');
const keywords = require('./keywords');
const { findAllMatches, mergeOverlappingRanges } = require('./utils');

class MessageClassifier {
  constructor() {
    this.HIGH_CONFIDENCE_THRESHOLD = 0.75;
    this.MEDIUM_CONFIDENCE_THRESHOLD = 0.5;
    this.LOW_CONFIDENCE_THRESHOLD = 0.25;
  }

  extractQuotedContent(text) {
    const quoted = [];
    keywords.quotePatterns.forEach(pattern => {
      const regex = new RegExp(pattern.source, pattern.flags || 'g');
      let match;
      while ((match = regex.exec(text)) !== null) {
        quoted.push({
          start: match.index,
          end: match.index + match[0].length,
          content: match[0]
        });
      }
    });
    return mergeOverlappingRanges(quoted);
  }

  isPositionQuoted(pos, quotedRanges) {
    return quotedRanges.some(range => pos >= range.start && pos < range.end);
  }

  filterQuotedMatches(matches, quotedRanges) {
    if (quotedRanges.length === 0) return matches;
    return matches.filter(m => !this.isPositionQuoted(m.start, quotedRanges));
  }

  checkSarcasm(text) {
    let sarcasmWeight = 0;
    const patternsFound = [];
    
    keywords.sarcasmPatterns.forEach(({ pattern, weight }) => {
      if (pattern.test(text)) {
        sarcasmWeight += weight;
        patternsFound.push({ pattern: pattern.source, weight });
      }
    });

    return { weight: sarcasmWeight, patterns: patternsFound };
  }

  matchCategory(text, quotedRanges, categoryConfig, categoryName, shortWordMinLength = 2) {
    const allMatches = [];
    let score = 0;

    if (categoryConfig.high) {
      categoryConfig.high.forEach(kw => {
        const matches = findAllMatches(text, kw);
        const filtered = this.filterQuotedMatches(matches, quotedRanges);
        if (filtered.length > 0) {
          const isShortWord = kw.length <= shortWordMinLength;
          score += (isShortWord ? 0.2 : 0.4) * filtered.length;
          filtered.forEach(m => {
            allMatches.push({ ...m, severity: 'high', category: categoryName });
          });
        }
      });
    }

    if (categoryConfig.medium) {
      categoryConfig.medium.forEach(kw => {
        const matches = findAllMatches(text, kw);
        const filtered = this.filterQuotedMatches(matches, quotedRanges);
        if (filtered.length > 0) {
          const isShortWord = kw.length <= shortWordMinLength;
          score += (isShortWord ? 0.08 : 0.2) * filtered.length;
          filtered.forEach(m => {
            allMatches.push({ ...m, severity: 'medium', category: categoryName });
          });
        }
      });
    }

    if (categoryConfig.keywords) {
      categoryConfig.keywords.forEach(kw => {
        const matches = findAllMatches(text, kw);
        const filtered = this.filterQuotedMatches(matches, quotedRanges);
        if (filtered.length > 0) {
          score += 0.15 * filtered.length;
          filtered.forEach(m => {
            allMatches.push({ ...m, severity: 'normal', category: categoryName });
          });
        }
      });
    }

    return { score: Math.min(score, 1.0), matches: allMatches };
  }

  matchDialectSwear(text, quotedRanges) {
    const allMatches = [];
    let score = 0;
    const dialects = Object.keys(keywords.dialectSwear);

    dialects.forEach(dialect => {
      keywords.dialectSwear[dialect].forEach(kw => {
        const matches = findAllMatches(text, kw);
        const filtered = this.filterQuotedMatches(matches, quotedRanges);
        if (filtered.length > 0) {
          score += 0.3 * filtered.length;
          filtered.forEach(m => {
            allMatches.push({ ...m, severity: 'high', category: 'dialect', dialect });
          });
        }
      });
    });

    return { score: Math.min(score, 1.0), matches: allMatches };
  }

  analyzeMessageContext(message, userMessageHistory) {
    let contextBonus = 0;
    const contextInfo = [];

    if (userMessageHistory && userMessageHistory.length > 0) {
      const recentMessages = userMessageHistory.slice(-5);
      const aggressiveCount = recentMessages.filter(m => {
        if (!m.classification) return false;
        return [RiskLevel.PERSONAL_ATTACK, RiskLevel.OFFLINE_THREAT].includes(m.classification.riskLevel);
      }).length;

      if (aggressiveCount >= 3) {
        contextBonus += 0.15;
        contextInfo.push(`用户最近${recentMessages.length}条消息中有${aggressiveCount}条攻击/威胁类消息，情绪升级模式`);
      }

      if (recentMessages.length >= 3) {
        const timeSpan = recentMessages[recentMessages.length - 1].timestamp - recentMessages[0].timestamp;
        if (timeSpan < 5 * 60 * 1000) {
          contextBonus += 0.1;
          contextInfo.push(`短时间（${Math.round(timeSpan / 1000)}秒）内连续发送${recentMessages.length}条消息`);
        }
      }
    }

    return { contextBonus, contextInfo };
  }

  classify(message, userMessageHistory = []) {
    const text = message.content || '';
    const quotedRanges = this.extractQuotedContent(text);
    const sarcasm = this.checkSarcasm(text);
    const context = this.analyzeMessageContext(message, userMessageHistory);

    const selfHarm = this.matchCategory(text, quotedRanges, keywords.selfHarm, 'selfHarm');
    const offlineThreat = this.matchCategory(text, quotedRanges, keywords.offlineThreat, 'offlineThreat');
    const personalAttack = this.matchCategory(text, quotedRanges, keywords.personalAttack, 'personalAttack');
    const dialectSwear = this.matchDialectSwear(text, quotedRanges);
    const customerService = this.matchCategory(text, quotedRanges, keywords.customerService, 'customerService');
    const normalComplaint = this.matchCategory(text, quotedRanges, keywords.normalComplaint, 'normalComplaint');

    const attackScore = personalAttack.score + dialectSwear.score;

    const selfHarmFinal = selfHarm.score + context.contextBonus + sarcasm.weight * 0.5;
    const threatFinal = offlineThreat.score * 1.5 + context.contextBonus + attackScore * 0.3;
    const attackFinal = attackScore + context.contextBonus + Math.max(0, sarcasm.weight);
    const csFinal = customerService.score;
    const complaintFinal = normalComplaint.score;

    const scores = {
      [RiskLevel.SELF_HARM]: Math.min(selfHarmFinal, 1.0),
      [RiskLevel.OFFLINE_THREAT]: Math.min(threatFinal, 1.0),
      [RiskLevel.PERSONAL_ATTACK]: Math.min(attackFinal, 1.0),
      [RiskLevel.CUSTOMER_SERVICE]: Math.min(csFinal, 1.0),
      [RiskLevel.NORMAL_COMPLAINT]: Math.min(complaintFinal, 1.0)
    };

    const allTriggerMatches = [
      ...selfHarm.matches,
      ...offlineThreat.matches,
      ...personalAttack.matches,
      ...dialectSwear.matches,
      ...customerService.matches,
      ...normalComplaint.matches
    ];

    const mergedTriggers = mergeOverlappingRanges(allTriggerMatches);

    const sortedScores = Object.entries(scores)
      .map(([level, score]) => ({ level, score }))
      .sort((a, b) => b.score - a.score);

    let finalRiskLevel;
    let confidence = 0;
    let requiresReview = false;

    const topScore = sortedScores[0];
    const secondScore = sortedScores[1];

    if (topScore.score >= this.HIGH_CONFIDENCE_THRESHOLD) {
      finalRiskLevel = topScore.level;
      confidence = topScore.score;
    } else if (topScore.score >= this.MEDIUM_CONFIDENCE_THRESHOLD) {
      if (secondScore.score > topScore.score * 0.7) {
        requiresReview = true;
        finalRiskLevel = RiskLevel.REVIEW_REQUIRED;
        confidence = topScore.score;
      } else {
        finalRiskLevel = topScore.level;
        confidence = topScore.score;
      }
    } else if (topScore.score >= this.LOW_CONFIDENCE_THRESHOLD) {
      requiresReview = true;
      finalRiskLevel = RiskLevel.REVIEW_REQUIRED;
      confidence = topScore.score;
    } else {
      finalRiskLevel = RiskLevel.NORMAL_COMPLAINT;
      confidence = 1.0 - Math.min(...Object.values(scores));
    }

    if (sarcasm.patterns.length > 0 && finalRiskLevel !== RiskLevel.SELF_HARM) {
      confidence = Math.max(0.25, confidence - 0.15);
      if (!requiresReview) {
        requiresReview = true;
      }
      if (finalRiskLevel === RiskLevel.NORMAL_COMPLAINT || finalRiskLevel === RiskLevel.CUSTOMER_SERVICE) {
        finalRiskLevel = RiskLevel.REVIEW_REQUIRED;
      }
    }

    if (quotedRanges.length > 0 && mergedTriggers.length === 0) {
      if (text.length > 0 && quotedRanges[0].end - quotedRanges[0].start > text.length * 0.5) {
        confidence = Math.max(0.25, confidence - 0.1);
        if (confidence < this.MEDIUM_CONFIDENCE_THRESHOLD && !requiresReview) {
          requiresReview = true;
          finalRiskLevel = RiskLevel.REVIEW_REQUIRED;
        }
      }
    }

    return {
      riskLevel: finalRiskLevel,
      confidence: parseFloat(confidence.toFixed(3)),
      requiresReview,
      scores: Object.fromEntries(
        Object.entries(scores).map(([k, v]) => [k, parseFloat(v.toFixed(3))])
      ),
      triggers: mergedTriggers.map(t => ({
        start: t.start,
        end: t.end,
        text: text.slice(t.start, t.end),
        severity: t.severity,
        category: t.category,
        keywords: t.keywords || [t.keyword]
      })),
      analysis: {
        sarcasm: {
          detected: sarcasm.patterns.length > 0,
          weight: sarcasm.weight,
          patterns: sarcasm.patterns
        },
        quotedContent: quotedRanges.map(q => ({
          start: q.start,
          end: q.end,
          text: text.slice(q.start, q.end)
        })),
        context: {
          bonus: context.contextBonus,
          info: context.contextInfo
        },
        dialectDetected: dialectSwear.matches.length > 0
      }
    };
  }

  classifyBatch(messages) {
    const userHistory = {};
    const results = [];

    const sortedMessages = [...messages].sort((a, b) => {
      if (a.userId !== b.userId) return a.userId.localeCompare(b.userId);
      return a.timestamp - b.timestamp;
    });

    sortedMessages.forEach(msg => {
      const history = userHistory[msg.userId] || [];
      const classification = this.classify(msg, history);
      const result = { ...msg, classification };
      userHistory[msg.userId] = [...history, result];
      results.push(result);
    });

    return results.sort((a, b) => a.timestamp - b.timestamp);
  }
}

module.exports = MessageClassifier;
