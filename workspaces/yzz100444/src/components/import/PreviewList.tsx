import React from 'react';
import { Eye, AlertTriangle, Copy, CheckCircle2 } from 'lucide-react';
import { Answer } from '../../types';
import Badge from '../common/Badge';

interface PreviewListProps {
  answers: Answer[];
  maxShow?: number;
  className?: string;
}

const PreviewList: React.FC<PreviewListProps> = ({
  answers,
  maxShow = 10,
  className = '',
}) => {
  const displayAnswers = answers.slice(0, maxShow);
  const hasMore = answers.length > maxShow;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-neutral-500" />
          <h3 className="text-sm font-medium text-neutral-900">数据预览</h3>
          <Badge variant="info" size="sm">
            共 {answers.length} 条
          </Badge>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="divide-y divide-neutral-100 max-h-80 overflow-y-auto scrollbar-thin">
          {displayAnswers.map((answer, index) => (
            <div
              key={answer.id}
              className="p-3 hover:bg-neutral-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-100 text-xs text-neutral-500 flex items-center justify-center font-mono">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-800 leading-relaxed break-words">
                    {answer.originalText}
                  </p>
                  {answer.cleanedText !== answer.originalText && (
                    <p className="text-xs text-neutral-500 mt-1 italic">
                      清洗后：{answer.cleanedText}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {answer.isDuplicate && (
                      <Badge variant="default" size="sm">
                        <Copy className="w-3 h-3 mr-1" />
                        重复
                      </Badge>
                    )}
                    {answer.hasEmoji && (
                      <Badge variant="default" size="sm">
                        含表情
                      </Badge>
                    )}
                    {answer.hasTypo && (
                      <Badge variant="warning" size="sm">
                        已纠错
                      </Badge>
                    )}
                    {answer.riskScore && answer.riskScore > 0 && (
                      <Badge
                        variant={answer.riskScore >= 3 ? 'danger' : 'warning'}
                        size="sm"
                      >
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        风险 {answer.riskScore}
                      </Badge>
                    )}
                    {answer.sentiment !== undefined && answer.sentiment !== 0 && (
                      <Badge
                        variant={answer.sentiment > 0 ? 'success' : 'danger'}
                        size="sm"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {answer.sentiment > 0 ? '正面' : '负面'}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {hasMore && (
          <div className="p-3 bg-neutral-50 border-t border-neutral-100 text-center">
            <p className="text-xs text-neutral-500">
              还有 {answers.length - maxShow} 条回答未显示
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewList;
