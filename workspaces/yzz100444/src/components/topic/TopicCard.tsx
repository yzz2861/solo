import React, { useState } from 'react';
import {
  Pin,
  PinOff,
  AlertTriangle,
  ChevronRight,
  Edit3,
  Trash2,
  Merge,
  Split,
  Users,
  Hash,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Topic, Answer } from '../../types';
import { useProjectStore } from '../../store/useProjectStore';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Input from '../common/Input';

interface TopicCardProps {
  topic: Topic;
  answers: Answer[];
  onMerge?: () => void;
  onSplit?: () => void;
  className?: string;
}

const TopicCard: React.FC<TopicCardProps> = ({
  topic,
  answers,
  onMerge,
  onSplit,
  className = '',
}) => {
  const navigate = useNavigate();
  const { toggleTopicPin, updateTopicName, moveAnswer } = useProjectStore();
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newName, setNewName] = useState(topic.customName || topic.name);
  const [showActions, setShowActions] = useState(false);

  const representativeAnswers = answers.filter((a) =>
    topic.representativeAnswerIds.includes(a.id)
  );

  const displayName = topic.customName || topic.name;

  const getCardVariant = () => {
    if (topic.isPinned) return 'pinned';
    if (topic.isRisk) return 'risk';
    return 'default';
  };

  const handleRename = () => {
    if (newName.trim()) {
      updateTopicName(topic.id, newName.trim());
      setShowRenameModal(false);
    }
  };

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTopicPin(topic.id);
  };

  const handleClick = () => {
    navigate(`/topic/${topic.id}`);
  };

  const getSentimentBadge = () => {
    if (topic.sentimentScore > 0.2) {
      return <Badge variant="success" size="sm">正面</Badge>;
    } else if (topic.sentimentScore < -0.2) {
      return <Badge variant="danger" size="sm">负面</Badge>;
    }
    return <Badge variant="default" size="sm">中性</Badge>;
  };

  return (
    <>
      <Card
        variant={getCardVariant()}
        className={`p-5 ${className}`}
        onClick={handleClick}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-base font-semibold text-neutral-900 font-serif truncate">
              {displayName}
            </h3>
            {topic.isPinned && (
              <Pin className="w-4 h-4 text-primary-600 flex-shrink-0" />
            )}
            {topic.isRisk && (
              <AlertTriangle className="w-4 h-4 text-warning-600 flex-shrink-0" />
            )}
          </div>

          {showActions && (
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <Button
                variant="ghost"
                size="sm"
                icon={topic.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                onClick={handlePin}
                className="px-2 py-1"
              />
              <Button
                variant="ghost"
                size="sm"
                icon={<Edit3 className="w-3.5 h-3.5" />}
                onClick={(e) => {
                  e.stopPropagation();
                  setNewName(displayName);
                  setShowRenameModal(true);
                }}
                className="px-2 py-1"
              />
              {onMerge && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Merge className="w-3.5 h-3.5" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMerge();
                  }}
                  className="px-2 py-1"
                />
              )}
              {onSplit && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Split className="w-3.5 h-3.5" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSplit();
                  }}
                  className="px-2 py-1"
                />
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1.5 text-sm text-neutral-500">
            <Users className="w-4 h-4" />
            <span>{topic.answerCount} 条</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-neutral-500">
            <Hash className="w-4 h-4" />
            <span>{topic.percentage.toFixed(1)}%</span>
          </div>
          {getSentimentBadge()}
          {topic.isRisk && (
            <Badge variant="warning" size="sm">
              风险 {topic.riskScore}
            </Badge>
          )}
        </div>

        {topic.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {topic.keywords.slice(0, 5).map((keyword, index) => (
              <Badge key={index} variant="default" size="sm">
                {keyword}
              </Badge>
            ))}
          </div>
        )}

        <div className="space-y-2">
          {representativeAnswers.length > 0 ? (
            representativeAnswers.slice(0, 2).map((answer) => (
              <div
                key={answer.id}
                className="pl-3 border-l-2 border-primary-200 py-1"
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

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-100">
          <span className="text-xs text-neutral-500">
            {topic.isRisk && topic.riskReason
              ? `风险原因：${topic.riskReason}`
              : `共 ${answers.length} 条回答`}
          </span>
          <ChevronRight className="w-4 h-4 text-neutral-400" />
        </div>
      </Card>

      <Modal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        title="重命名主题"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowRenameModal(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleRename}>
              确认
            </Button>
          </>
        }
      >
        <Input
          label="主题名称"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="请输入新的主题名称"
          autoFocus
        />
      </Modal>
    </>
  );
};

export default TopicCard;
