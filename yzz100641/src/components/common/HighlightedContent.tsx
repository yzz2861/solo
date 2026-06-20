import React, { useState } from 'react';
import { TriggeredSentence, GradingRule } from '@/types';
import { GRADING_RULES } from '@/config/rules';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';

interface HighlightedContentProps {
  content: string;
  triggeredSentences: TriggeredSentence[];
  className?: string;
}

const levelColors: Record<string, string> = {
  emergency: 'bg-red-200/60 border-red-400 hover:bg-red-200',
  psychology: 'bg-orange-200/60 border-orange-400 hover:bg-orange-200',
  headteacher: 'bg-yellow-200/60 border-yellow-400 hover:bg-yellow-200',
  general: 'bg-green-200/60 border-green-400 hover:bg-green-200',
  review: 'bg-gray-200/60 border-gray-400 hover:bg-gray-200',
};

export function HighlightedContent({ content, triggeredSentences, className }: HighlightedContentProps) {
  const [hoveredSentence, setHoveredSentence] = useState<TriggeredSentence | null>(null);
  
  const ruleMap = new Map<string, GradingRule>(GRADING_RULES.map(r => [r.id, r]));
  
  const renderContent = () => {
    if (triggeredSentences.length === 0) {
      return <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">{content}</p>;
    }
    
    const sortedSentences = [...triggeredSentences].sort((a, b) => a.startIndex - b.startIndex);
    
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    for (let i = 0; i < sortedSentences.length; i++) {
      const sentence = sortedSentences[i];
      const rule = ruleMap.get(sentence.ruleId);
      const level = rule?.level || 'general';
      
      if (sentence.startIndex > lastIndex) {
        parts.push(
          <span key={`text-${i}`} className="text-gray-700">
            {content.slice(lastIndex, sentence.startIndex)}
          </span>
        );
      }
      
      parts.push(
        <mark
          key={`highlight-${i}`}
          className={cn(
            'relative cursor-pointer border-b-2 rounded px-0.5 transition-colors duration-200',
            levelColors[level]
          )}
          onMouseEnter={() => setHoveredSentence(sentence)}
          onMouseLeave={() => setHoveredSentence(null)}
        >
          {content.slice(sentence.startIndex, sentence.endIndex)}
        </mark>
      );
      
      lastIndex = sentence.endIndex;
    }
    
    if (lastIndex < content.length) {
      parts.push(
        <span key="text-last" className="text-gray-700">
          {content.slice(lastIndex)}
        </span>
      );
    }
    
    return <p className="whitespace-pre-wrap leading-relaxed">{parts}</p>;
  };
  
  const hoveredRule = hoveredSentence ? ruleMap.get(hoveredSentence.ruleId) : null;
  
  return (
    <div className={cn('relative', className)}>
      <div className="text-gray-700">
        {renderContent()}
      </div>
      
      {hoveredSentence && hoveredRule && (
        <div className="absolute z-20 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-xl max-w-xs pointer-events-none transform -translate-y-full -translate-x-1/2 left-1/2 mt-2">
          <div className="flex items-center gap-2 mb-1">
            <Info className="w-4 h-4" />
            <span className="font-medium">触发规则：{hoveredRule.name}</span>
          </div>
          <p className="text-gray-300 text-xs">
            匹配关键词：{hoveredRule.keywords.slice(0, 5).join('、')}
            {hoveredRule.keywords.length > 5 ? '...' : ''}
          </p>
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
        </div>
      )}
    </div>
  );
}

export default HighlightedContent;
