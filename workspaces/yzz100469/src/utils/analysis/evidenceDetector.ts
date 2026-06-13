import type { Annotation } from '@/types';
import { generateId, isProtectedContent, getParagraphOffsets } from './textProcessor';

const ACTION_VERBS = [
  '完成', '设计', '实现', '开发', '搭建', '优化', '改进', '重构', '带领', '负责',
  '主导', '推动', '组织', '协调', '解决', '攻克', '处理', '上线', '部署', '迁移',
  '架构', '制定', '编写', '调研', '分析', '定位', '修复', '构建', '创建', '建立',
];

const QUANTITY_PATTERN = /\d+(?:\.\d+)?(?:%|倍|个|人|万|千|天|月|年|小时|分钟|ms|MB|GB|QPS|TPS|次|条|项)/i;
const TIME_PATTERN = /\d+(?:个)?(?:天|周|月|季度|年)/;
const PERCENT_PATTERN = /\d+(?:\.\d+)?%/;

const QUOTED_SENTENCE_REGEX = /[""「」『』]([^""「」『』]{5,200})[""「」『』]/g;

export function detectEvidence(content: string, paragraphs: string[]): Annotation[] {
  const annotations: Annotation[] = [];
  const paraOffsets = getParagraphOffsets(content, paragraphs);

  paragraphs.forEach((para, paraIdx) => {
    if (paraOffsets[paraIdx]) {
      const paraOffset = paraOffsets[paraIdx].start;

      for (const verb of ACTION_VERBS) {
        const regex = new RegExp(`[^。！？；,.\\n]{0,20}${verb}[^。！？；,.\\n]{0,50}`, 'g');
        let match;
        while ((match = regex.exec(para)) !== null) {
          const matchedText = match[0].trim();
          if (matchedText.length >= 8 && !isProtectedContent(matchedText, para)) {
            const hasQuantity = QUANTITY_PATTERN.test(matchedText) ||
              TIME_PATTERN.test(matchedText) ||
              PERCENT_PATTERN.test(matchedText);
            if (hasQuantity) {
              annotations.push({
                id: generateId('ann'),
                type: 'evidence',
                text: matchedText,
                start: paraOffset + match.index,
                end: paraOffset + match.index + matchedText.length,
                paragraphIndex: paraIdx,
                reason: `包含行为动词"${verb}"和量化数据，符合STAR行为证据标准`,
                suggestion: '建议保留，作为候选人能力的有效支撑',
                isManual: false,
                createdAt: Date.now(),
              });
            }
          }
        }
      }

      let quoteMatch;
      QUOTED_SENTENCE_REGEX.lastIndex = 0;
      while ((quoteMatch = QUOTED_SENTENCE_REGEX.exec(para)) !== null) {
        const quotedText = quoteMatch[1];
        if (quotedText.length >= 10) {
          const hasAction = ACTION_VERBS.some(v => quotedText.includes(v));
          const hasQuantity = QUANTITY_PATTERN.test(quotedText);
          if (hasAction && hasQuantity) {
            const fullMatch = quoteMatch[0];
            annotations.push({
              id: generateId('ann'),
              type: 'evidence',
              text: fullMatch,
              start: paraOffset + quoteMatch.index,
              end: paraOffset + quoteMatch.index + fullMatch.length,
              paragraphIndex: paraIdx,
              reason: '候选人原话包含具体行为和量化结果',
              suggestion: '这是有力的行为证据，建议保留',
              isManual: false,
              createdAt: Date.now(),
            });
          }
        }
      }
    }
  });

  return mergeOverlapping(annotations);
}

function mergeOverlapping(annotations: Annotation[]): Annotation[] {
  if (annotations.length <= 1) return annotations;

  const sorted = [...annotations].sort((a, b) => a.start - b.start);
  const merged: Annotation[] = [];

  for (const ann of sorted) {
    const last = merged[merged.length - 1];
    if (last && ann.start < last.end) {
      if (ann.end - ann.start > last.end - last.start) {
        merged[merged.length - 1] = ann;
      }
    } else {
      merged.push(ann);
    }
  }

  return merged;
}
