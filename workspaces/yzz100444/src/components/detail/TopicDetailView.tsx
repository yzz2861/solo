import React from 'react';
import { ArrowLeft, Pin, AlertTriangle, Users, Hash, BarChart3, Edit3, Merge, Split } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Topic, Answer } from '../../types';
import { useProjectStore } from '../../store/useProjectStore';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';
import AnswerList from './AnswerList';
import EmptyState from '../common/EmptyState';

interface TopicDetailViewProps {
  className?: string;
}

const TopicDetailView: React.FC<TopicDetailViewProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const { topicId } = useParams<{ topicId: string }>();
  const { currentProject, toggleTopicPin } = useProjectStore();

  if (!currentProject) {
    return (
      <EmptyState
        title="未找到项目"
        description="请先导入数据并创建项目"
        action={{ label: '返回首页', onClick: () => navigate('/') }}
      />
    );
  }

  const topic = currentProject.topics.find((t) => t.id === topicId);

  if (!topic) {
    return (
      <EmptyState
        title="未找到主题"
        description="该主题可能已被删除或合并"
        action={{ label: '返回分析页', onClick: () => navigate('/analysis') }}
      />
    );
  }

  const topicAnswers = currentProject.answers.filter((a) => a.topicId === topicId);
  const representativeAnswers = topicAnswers.filter((a) =>
    topic.representativeAnswerIds.includes(a.id)
  );

  const displayName = topic.customName || topic.name;

  const getSentimentText = () => {
    if (topic.sentimentScore > 0.2) return { text: '正面', variant: 'success' as const };
    if (topic.sentimentScore < -0.2) return { text: '负面', variant: 'danger' as const };
    return { text: '中性', variant: 'default' as const };
  };

  const sentiment = getSentimentText();

  return (
    <div className={className}>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/analysis')}>
          返回列表
        </Button>
      </div>

      <Card variant={topic.isRisk ? 'risk' : topic.isPinned ? 'pinned' : 'default'} className="p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <h1 className="text-2xl font-bold text-neutral-900 font-serif">{displayName}</h1>
              {topic.isPinned && <Pin className="w-5 h-5 text-primary-600" />}
              {topic.isRisk && <AlertTriangle className="w-5 h-5 text-warning-600" />}
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex items-center gap-1.5 text-sm text-neutral-600">
                <Users className="w-4 h-4" />
                <span>{topic.answerCount} 条回答</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-neutral-600">
                <Hash className="w-4 h-4" />
                <span>占比 {topic.percentage.toFixed(1)}%</span>
              </div>
              <Badge variant={sentiment.variant} size="sm">
                情感：{sentiment.text}
              </Badge>
              {topic.isRisk && (
                <Badge variant="warning" size="sm">
                  风险等级 {topic.riskScore}
                </Badge>
              )}
            </div>

            {topic.riskReason && (
              <div className="mb-4 p-3 bg-warning-50 rounded-lg border border-warning-200">
                <p className="text-sm text-warning-700">
                  <AlertTriangle className="w-4 h-4 inline mr-1.5" />
                  {topic.riskReason}
                </p>
              </div>
            )}

            {topic.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {topic.keywords.map((keyword, index) => (
                  <Badge key={index} variant="primary" size="md">
                    {keyword}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={topic.isPinned ? 'primary' : 'secondary'}
              size="sm"
              icon={<Pin className="w-4 h-4" />}
              onClick={() => toggleTopicPin(topic.id)}
            >
              {topic.isPinned ? '取消置顶' : '置顶'}
            </Button>
          </div>
        </div>
      </Card>

      {representativeAnswers.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-neutral-900 font-serif">代表原话</h2>
            <Badge variant="primary" size="sm">
              {representativeAnswers.length} 条
            </Badge>
          </div>
          <div className="space-y-3">
            {representativeAnswers.map((answer, index) => (
              <div key={answer.id} className="relative">
                <div className="absolute -left-2 top-0 bottom-0 w-1 bg-primary-500 rounded-full" />
                <div className="pl-4 py-3 bg-primary-50/50 rounded-lg border border-primary-200">
                  <p className="text-sm text-neutral-700 leading-relaxed italic">
                    "{answer.originalText}"
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="primary" size="sm">
                      代表回答 #{index + 1}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-neutral-500" />
          <h2 className="text-lg font-semibold text-neutral-900 font-serif">全部回答</h2>
          <Badge variant="info" size="sm">
            {topicAnswers.length} 条
          </Badge>
        </div>
        <AnswerList answers={topicAnswers} topics={currentProject.topics} showRepresentatives={false} />
      </div>
    </div>
  );
};

export default TopicDetailView;
