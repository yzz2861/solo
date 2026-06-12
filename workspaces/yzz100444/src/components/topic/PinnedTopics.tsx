import React from 'react';
import { Pin, AlertTriangle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Topic, Answer } from '../../types';
import Card from '../common/Card';
import Badge from '../common/Badge';

interface PinnedTopicsProps {
  topics: Topic[];
  answers: Answer[];
  className?: string;
}

const PinnedTopics: React.FC<PinnedTopicsProps> = ({ topics, answers, className = '' }) => {
  const navigate = useNavigate();

  const pinnedTopics = topics.filter((t) => t.isPinned || t.isRisk);

  if (pinnedTopics.length === 0) {
    return null;
  }

  return (
    <div className={`mb-8 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Pin className="w-5 h-5 text-primary-600" />
        <h2 className="text-lg font-semibold text-neutral-900 font-serif">
          重要关注
        </h2>
        <Badge variant="warning" size="sm">
          {pinnedTopics.length} 个
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pinnedTopics.map((topic) => {
          const topicAnswers = answers.filter((a) => a.topicId === topic.id);
          const representativeAnswers = topicAnswers.filter((a) =>
            topic.representativeAnswerIds.includes(a.id)
          );

          const displayName = topic.customName || topic.name;

          return (
            <Card
              key={topic.id}
              variant={topic.isRisk ? 'risk' : 'pinned'}
              className="p-5 cursor-pointer hover:shadow-lg transition-all"
              onClick={() => navigate(`/topic/${topic.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="text-base font-semibold text-neutral-900 font-serif truncate">
                    {displayName}
                  </h3>
                  {topic.isRisk && (
                    <AlertTriangle className="w-4 h-4 text-warning-600 flex-shrink-0 animate-[pulse-slow_2s_ease-in-out_infinite]" />
                  )}
                  {topic.isPinned && !topic.isRisk && (
                    <Pin className="w-4 h-4 text-primary-600 flex-shrink-0" />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <Badge variant={topic.isRisk ? 'danger' : 'primary'} size="sm">
                  {topic.answerCount} 条回答
                </Badge>
                <Badge variant="default" size="sm">
                  {topic.percentage.toFixed(1)}%
                </Badge>
                {topic.isRisk && (
                  <Badge variant="warning" size="sm">
                    风险等级 {topic.riskScore}
                  </Badge>
                )}
              </div>

              {topic.riskReason && (
                <div className="mb-3 p-2 bg-warning-50 rounded-lg border border-warning-200">
                  <p className="text-xs text-warning-700">
                    <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                    {topic.riskReason}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {representativeAnswers.length > 0 ? (
                  representativeAnswers.slice(0, 2).map((answer) => (
                    <div
                      key={answer.id}
                      className={`pl-3 border-l-2 py-1 ${
                        topic.isRisk
                          ? 'border-warning-400'
                          : 'border-primary-400'
                      }`}
                    >
                      <p className="text-sm text-neutral-700 leading-relaxed line-clamp-2">
                        "{answer.originalText}"
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-neutral-500 italic">暂无代表回答</p>
                )}
              </div>

              <div className="flex items-center justify-end mt-4 pt-3 border-t border-neutral-100">
                <span className="text-xs text-primary-600 flex items-center gap-1">
                  查看详情
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PinnedTopics;
