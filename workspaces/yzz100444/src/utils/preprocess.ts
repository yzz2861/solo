import { typoMap } from '@/data/typos';
import type { Answer, ProjectSettings } from '@/types';

const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

const stopWords = new Set([
  '的', '了', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看',
  '好', '自己', '这', '那', '她', '他', '它', '们', '这个', '那个', '什么',
  '但是', '因为', '所以', '虽然', '如果', '就是', '真的', '非常', '特别',
  '比较', '感觉', '觉得', '知道', '看到', '买到', '收到', '使用',
  '还', '还是', '可以', '可能', '应该', '能够', '需要', '以及',
  '在', '也', '都', '还', '要', '会', '就', '才', '却', '又', '只',
]);

export const removeEmojis = (text: string): string => {
  return text.replace(emojiRegex, '');
};

export const correctTypos = (text: string): string => {
  let result = text;
  for (const [wrong, correct] of Object.entries(typoMap)) {
    result = result.replace(new RegExp(wrong, 'g'), correct);
  }
  return result;
};

export const normalizeText = (text: string): string => {
  let result = text;
  result = result.replace(/[，。！？、；：""''（）【】\s]/g, ' ');
  result = result.replace(/[,.!?;:\'\"()\[\]]/g, ' ');
  result = result.replace(/\s+/g, ' ');
  result = result.trim();
  return result;
};

export const extractChineseWords = (text: string): string[] => {
  const chineseRegex = /[\u4e00-\u9fa5]+/g;
  const matches = text.match(chineseRegex);
  if (!matches) return [];
  const words: string[] = [];
  for (const match of matches) {
    for (let i = 0; i < match.length; i++) {
      if (i + 2 <= match.length) {
        words.push(match.slice(i, i + 2));
      }
      if (i + 3 <= match.length) {
        words.push(match.slice(i, i + 3));
      }
    }
  }
  return words.filter(w => w.length >= 2 && !stopWords.has(w));
};

export const filterStopWords = (words: string[]): string[] => {
  return words.filter(w => !stopWords.has(w));
};

export const calculateSimilarity = (text1: string, text2: string): number => {
  const words1 = new Set(extractChineseWords(text1));
  const words2 = new Set(extractChineseWords(text2));
  if (words1.size === 0 && words2.size === 0) return 0;
  if (words1.size === 0 || words2.size === 0) return 0;
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
};

export const preprocessAnswer = (
  text: string,
  settings: ProjectSettings,
  projectId: string,
  index: number
): Omit<Answer, 'topicId' | 'importanceScore' | 'matchedRiskKeywords' | 'sentimentScore'> => {
  const originalText = text;
  let cleanedText = text;
  
  const hasEmoji = emojiRegex.test(text);
  
  let hasTypo = false;
  if (settings.enableTypoCorrection) {
    const corrected = correctTypos(cleanedText);
    if (corrected !== cleanedText) {
      hasTypo = true;
      cleanedText = corrected;
    }
  }
  
  if (settings.enableEmojiRemoval) {
    cleanedText = removeEmojis(cleanedText);
  }
  
  cleanedText = normalizeText(cleanedText);

  return {
    id: `answer-${Date.now()}-${index}`,
    projectId,
    originalText,
    cleanedText,
    isDuplicate: false,
    isPinned: false,
    hasEmoji,
    hasTypo,
    riskScore: 0,
    sentiment: 0,
    rawData: { original: text },
  };
};

export const markDuplicates = (answers: Answer[]): Answer[] => {
  const result = [...answers];
  const duplicateThreshold = 0.95;
  
  for (let i = 0; i < result.length; i++) {
    if (result[i].isDuplicate) continue;
    for (let j = i + 1; j < result.length; j++) {
      if (result[j].isDuplicate) continue;
      const similarity = calculateSimilarity(
        result[i].cleanedText,
        result[j].cleanedText
      );
      if (similarity >= duplicateThreshold) {
        result[j].isDuplicate = true;
        result[j].duplicateOfId = result[i].id;
      }
    }
  }
  
  return result;
};

export const filterShortAnswers = (answers: Answer[], minLength: number): Answer[] => {
  return answers.filter(a => a.cleanedText.length >= minLength);
};
