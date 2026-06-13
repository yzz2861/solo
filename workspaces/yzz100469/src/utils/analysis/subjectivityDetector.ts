import type { Annotation } from '@/types';
import { generateId, isProtectedContent, getParagraphOffsets } from './textProcessor';

const SUBJECTIVE_PHRASES = [
  { phrase: '感觉不错', type: '主观感受，缺少具体行为描述' },
  { phrase: '挺好的', type: '模糊评价，缺少细节支撑' },
  { phrase: '不太稳', type: '主观判断，无具体事例' },
  { phrase: '一般', type: '模糊评价，缺少量化标准' },
  { phrase: '还行', type: '模糊评价，缺少细节' },
  { phrase: '还可以', type: '模糊评价，缺少具体说明' },
  { phrase: '能力强', type: '结论先行，无具体行为证据' },
  { phrase: '技术好', type: '结论先行，缺少项目细节' },
  { phrase: '技术不错', type: '结论先行，缺少项目细节' },
  { phrase: '沟通不错', type: '结论先行，缺少沟通场景描述' },
  { phrase: '沟通还行', type: '结论先行，缺少沟通场景描述' },
  { phrase: '有潜力', type: '主观预判，缺少事实依据' },
  { phrase: '挺有东西', type: '模糊评价，缺少具体说明' },
  { phrase: '挺扎实', type: '模糊评价，缺少具体表现' },
  { phrase: '基础扎实', type: '结论先行，缺少考查细节' },
  { phrase: '表达不太好', type: '主观判断，无具体表现' },
  { phrase: '表达不清', type: '主观判断，无具体场景' },
  { phrase: '说不清楚', type: '主观判断，缺少具体事例' },
  { phrase: '广度一般', type: '结论先行，缺少具体维度' },
  { phrase: '深度还行', type: '模糊评价，缺少技术深度描述' },
  { phrase: '不太符合', type: '主观判断，缺少差距说明' },
  { phrase: '不太合适', type: '主观判断，缺少匹配度分析' },
  { phrase: '不太适合', type: '主观判断，缺少匹配度分析' },
];

const ABSOLUTE_PHRASES = [
  { phrase: '肯定不行', type: '绝对化否定，缺少具体理由' },
  { phrase: '绝对适合', type: '绝对化肯定，缺少风险分析' },
  { phrase: '完全不匹配', type: '绝对化否定，缺少差距分析' },
  { phrase: '基础太差', type: '绝对化否定，缺少具体表现' },
  { phrase: '太差了', type: '绝对化否定，缺少事实支撑' },
  { phrase: '能力不行', type: '绝对化判断，缺少具体表现' },
  { phrase: '不行', type: '绝对化判断，缺少具体说明' },
];

export function detectSubjectivity(content: string, paragraphs: string[]): Annotation[] {
  const annotations: Annotation[] = [];
  const paraOffsets = getParagraphOffsets(content, paragraphs);

  paragraphs.forEach((para, paraIdx) => {
    if (paraOffsets[paraIdx]) {
      const paraOffset = paraOffsets[paraIdx].start;

      [...SUBJECTIVE_PHRASES, ...ABSOLUTE_PHRASES].forEach(({ phrase, type }) => {
        const regex = new RegExp(
          `[^。！？；,.\\n]{0,8}${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^。！？；,.\\n]{0,8}`,
          'g'
        );
        let match;
        while ((match = regex.exec(para)) !== null) {
          const matchedText = match[0].trim();
          if (matchedText.length >= 2 && matchedText.length <= 50 && !isProtectedContent(matchedText, para)) {
            annotations.push({
              id: generateId('ann'),
              type: 'no_evidence',
              text: matchedText,
              start: paraOffset + match.index,
              end: paraOffset + match.index + matchedText.length,
              paragraphIndex: paraIdx,
              reason: `${type}，缺少STAR行为证据`,
              suggestion: `建议补充具体行为事例：情境(S)-任务(T)-行动(A)-结果(R)，或追问具体表现`,
              isManual: false,
              createdAt: Date.now(),
            });
          }
        }
      });

      if (para.length > 5 && para.length < 60 && !/[0-9]/.test(para)) {
        const isShortSentence = /^(整体|总体|总的|个人觉得|我觉得|感觉|认为)/.test(para);
        const hasEvidence = /完成|设计|实现|优化|带领|负责|主导|解决|重构|迁移|部署/.test(para);
        if (isShortSentence && !hasEvidence && !isProtectedContent(para, para)) {
          annotations.push({
            id: generateId('ann'),
            type: 'no_evidence',
            text: para,
            start: paraOffset,
            end: paraOffset + para.length,
            paragraphIndex: paraIdx,
            reason: '整句为评价性表述，缺少具体行为证据',
            suggestion: '建议将此评价拆解为：候选人做了什么事 -> 怎么做的 -> 结果如何',
            isManual: false,
            createdAt: Date.now(),
          });
        }
      }
    }
  });

  return deduplicateAnnotations(annotations);
}

function deduplicateAnnotations(annotations: Annotation[]): Annotation[] {
  const seen = new Set<string>();
  return annotations.filter(ann => {
    const key = `${ann.paragraphIndex}-${ann.start}-${ann.end}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
