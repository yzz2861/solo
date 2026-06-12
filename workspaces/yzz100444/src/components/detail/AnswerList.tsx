import React, { useState } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { Answer, Topic } from '../../types';
import AnswerItem from './AnswerItem';
import Input from '../common/Input';
import Select from '../common/Select';
import Checkbox from '../common/Checkbox';
import Button from '../common/Button';
import EmptyState from '../common/EmptyState';

interface AnswerListProps {
  answers: Answer[];
  topics: Topic[];
  showRepresentatives?: boolean;
  className?: string;
}

const AnswerList: React.FC<AnswerListProps> = ({ answers, topics, showRepresentatives = false, className = '' }) => {
  const [searchText, setSearchText] = useState('');
  const [filterTopic, setFilterTopic] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState(false);
  const [filterDuplicate, setFilterDuplicate] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'time' | 'risk' | 'length'>('time');

  const filteredAnswers = React.useMemo(() => {
    let result = [...answers];

    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      result = result.filter(
        (a) =>
          a.originalText.toLowerCase().includes(lowerSearch) ||
          a.cleanedText.toLowerCase().includes(lowerSearch)
      );
    }

    if (filterTopic !== 'all') {
      result = result.filter((a) => a.topicId === filterTopic);
    }

    if (filterRisk) {
      result = result.filter((a) => a.matchedRiskKeywords.length > 0);
    }

    if (filterDuplicate) {
      result = result.filter((a) => a.isDuplicate);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'risk':
          return b.riskScore - a.riskScore;
        case 'length':
          return b.originalText.length - a.originalText.length;
        default:
          return 0;
      }
    });

    return result;
  }, [answers, searchText, filterTopic, filterRisk, filterDuplicate, sortBy]);

  if (answers.length === 0) {
    return (
      <EmptyState
        icon={<Layers className="w-12 h-12 text-neutral-400" />}
        title="暂无回答"
        description="该主题下还没有回答"
      />
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <Input
            placeholder="搜索回答内容..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            icon={<Search className="w-4 h-4 text-neutral-400" />}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            onClick={() => setShowFilters(!showFilters)}
          >
            筛选
          </Button>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            options={[
              { value: 'time', label: '默认排序' },
              { value: 'risk', label: '风险优先' },
              { value: 'length', label: '长度优先' },
            ]}
            className="w-32"
          />
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-center gap-4 mb-4 p-4 bg-white rounded-lg border border-neutral-200">
          <Select
            label="主题"
            value={filterTopic}
            onChange={(e) => setFilterTopic(e.target.value)}
            options={[
              { value: 'all', label: '全部主题' },
              ...topics.map((t) => ({
                value: t.id,
                label: `${t.customName || t.name} (${t.answerCount})`,
              })),
            ]}
            className="w-48"
          />
          <Checkbox
            checked={filterRisk}
            onChange={setFilterRisk}
            label="仅显示风险"
          />
          <Checkbox
            checked={filterDuplicate}
            onChange={setFilterDuplicate}
            label="仅显示重复"
          />
        </div>
      )}

      <div className="mb-3 text-sm text-neutral-500">
        共 {filteredAnswers.length} 条回答
        {filteredAnswers.length !== answers.length && ` (已筛选，总计 ${answers.length} 条)`}
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin pr-2">
        {filteredAnswers.map((answer) => (
          <AnswerItem key={answer.id} answer={answer} topics={topics} />
        ))}
      </div>

      {filteredAnswers.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-neutral-500">没有找到匹配的回答</p>
        </div>
      )}
    </div>
  );
};

export default AnswerList;
