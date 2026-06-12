import React, { useState } from 'react';
import { Layers, BarChart3, PieChart } from 'lucide-react';
import { Topic, Answer } from '../../types';
import TopicCard from './TopicCard';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Select from '../common/Select';
import Checkbox from '../common/Checkbox';
import EmptyState from '../common/EmptyState';
import { useProjectStore } from '../../store/useProjectStore';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface TopicListProps {
  topics: Topic[];
  answers: Answer[];
  className?: string;
}

const TopicList: React.FC<TopicListProps> = ({ topics, answers, className = '' }) => {
  const { mergeTopics, splitTopic } = useProjectStore();
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [selectedSourceTopic, setSelectedSourceTopic] = useState<string | null>(null);
  const [selectedTargetTopic, setSelectedTargetTopic] = useState<string>('');
  const [selectedAnswersForSplit, setSelectedAnswersForSplit] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'chart'>('grid');

  const handleMerge = (sourceTopicId: string) => {
    setSelectedSourceTopic(sourceTopicId);
    setSelectedTargetTopic('');
    setMergeModalOpen(true);
  };

  const confirmMerge = () => {
    if (selectedSourceTopic && selectedTargetTopic) {
      mergeTopics(selectedSourceTopic, selectedTargetTopic);
      setMergeModalOpen(false);
      setSelectedSourceTopic(null);
      setSelectedTargetTopic('');
    }
  };

  const handleSplit = (topicId: string) => {
    setSelectedSourceTopic(topicId);
    setSelectedAnswersForSplit([]);
    setSplitModalOpen(true);
  };

  const confirmSplit = () => {
    if (selectedSourceTopic && selectedAnswersForSplit.length > 0) {
      splitTopic(selectedSourceTopic, selectedAnswersForSplit);
      setSplitModalOpen(false);
      setSelectedSourceTopic(null);
      setSelectedAnswersForSplit([]);
    }
  };

  const toggleAnswerForSplit = (answerId: string) => {
    setSelectedAnswersForSplit((prev) =>
      prev.includes(answerId)
        ? prev.filter((id) => id !== answerId)
        : [...prev, answerId]
    );
  };

  const sourceTopic = topics.find((t) => t.id === selectedSourceTopic);
  const topicAnswers = selectedSourceTopic
    ? answers.filter((a) => a.topicId === selectedSourceTopic)
    : [];

  const COLORS = [
    '#0EA5E9',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#EC4899',
    '#06B6D4',
    '#84CC16',
    '#F97316',
    '#6366F1',
  ];

  const chartData = topics.slice(0, 10).map((topic, index) => ({
    name: topic.customName || topic.name,
    value: topic.answerCount,
    color: COLORS[index % COLORS.length],
  }));

  if (topics.length === 0) {
    return (
      <EmptyState
        icon={<Layers className="w-12 h-12 text-neutral-400" />}
        title="暂无主题"
        description="请先导入数据并运行聚类分析，系统将自动为您归并主题"
      />
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-neutral-500" />
          <h2 className="text-lg font-semibold text-neutral-900 font-serif">
            主题列表
          </h2>
          <span className="text-sm text-neutral-500">({topics.length} 个主题)</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'ghost'}
            size="sm"
            icon={<Layers className="w-4 h-4" />}
            onClick={() => setViewMode('grid')}
          >
            卡片视图
          </Button>
          <Button
            variant={viewMode === 'chart' ? 'primary' : 'ghost'}
            size="sm"
            icon={<PieChart className="w-4 h-4" />}
            onClick={() => setViewMode('chart')}
          >
            图表视图
          </Button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topics.map((topic) => {
            const topicAnswers = answers.filter((a) => a.topicId === topic.id);
            return (
              <TopicCard
                key={topic.id}
                topic={topic}
                answers={topicAnswers}
                onMerge={() => handleMerge(topic.id)}
                onSplit={() => handleSplit(topic.id)}
              />
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value} 条`, '回答数']}
                />
                <Legend />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <Modal
        isOpen={mergeModalOpen}
        onClose={() => setMergeModalOpen(false)}
        title="合并主题"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setMergeModalOpen(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={confirmMerge}
              disabled={!selectedTargetTopic}
            >
              确认合并
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            将 <span className="font-semibold text-primary-600">{sourceTopic?.customName || sourceTopic?.name}</span>{' '}
            合并到以下主题：
          </p>
          <Select
            label="目标主题"
            value={selectedTargetTopic}
            onChange={(e) => setSelectedTargetTopic(e.target.value)}
            options={topics
              .filter((t) => t.id !== selectedSourceTopic)
              .map((t) => ({
                value: t.id,
                label: `${t.customName || t.name} (${t.answerCount} 条)`,
              }))}
            placeholder="请选择目标主题"
          />
          <p className="text-xs text-neutral-500 bg-neutral-50 p-3 rounded-lg">
            合并后，源主题的所有回答将移动到目标主题，源主题将被删除。
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={splitModalOpen}
        onClose={() => setSplitModalOpen(false)}
        title="拆分主题"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSplitModalOpen(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={confirmSplit}
              disabled={selectedAnswersForSplit.length === 0}
            >
              确认拆分 ({selectedAnswersForSplit.length} 条)
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            从 <span className="font-semibold text-primary-600">{sourceTopic?.customName || sourceTopic?.name}</span>{' '}
            中选择要拆分出去的回答：
          </p>
          <div className="max-h-80 overflow-y-auto space-y-2 scrollbar-thin">
            {topicAnswers.map((answer) => (
              <div
                key={answer.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors"
              >
                <Checkbox
                  checked={selectedAnswersForSplit.includes(answer.id)}
                  onChange={() => toggleAnswerForSplit(answer.id)}
                />
                <p className="text-sm text-neutral-700 leading-relaxed flex-1">
                  {answer.originalText}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-50 p-3 rounded-lg">
            选中的回答将被移动到一个新主题中。
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default TopicList;
