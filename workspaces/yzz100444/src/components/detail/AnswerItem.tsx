import React, { useState } from 'react';
import { AlertTriangle, Copy, Smile, Edit3, MoveRight, CheckCircle2, XCircle } from 'lucide-react';
import { Answer, Topic } from '../../types';
import { useProjectStore } from '../../store/useProjectStore';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Select from '../common/Select';

interface AnswerItemProps {
  answer: Answer;
  topics: Topic[];
  showMove?: boolean;
  className?: string;
}

const AnswerItem: React.FC<AnswerItemProps> = ({ answer, topics, showMove = true, className = '' }) => {
  const { moveAnswer } = useProjectStore();
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetTopicId, setTargetTopicId] = useState('');

  const handleMove = () => {
    if (targetTopicId) {
      moveAnswer(answer.id, targetTopicId);
      setShowMoveModal(false);
      setTargetTopicId('');
    }
  };

  const currentTopic = topics.find((t) => t.id === answer.topicId);

  return (
    <>
      <div className={`bg-white rounded-lg border border-neutral-200 p-4 hover:shadow-sm transition-shadow ${className}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-neutral-800 leading-relaxed break-words">
              {answer.originalText}
            </p>
            {answer.cleanedText !== answer.originalText && (
              <p className="text-xs text-neutral-500 mt-2 italic bg-neutral-50 p-2 rounded">
                清洗后：{answer.cleanedText}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {answer.isDuplicate && (
                <Badge variant="default" size="sm">
                  <Copy className="w-3 h-3 mr-1" />
                  重复内容
                </Badge>
              )}
              {answer.hasEmoji && (
                <Badge variant="default" size="sm">
                  <Smile className="w-3 h-3 mr-1" />
                  含表情
                </Badge>
              )}
              {answer.hasTypo && (
                <Badge variant="warning" size="sm">
                  <Edit3 className="w-3 h-3 mr-1" />
                  已纠错
                </Badge>
              )}
              {answer.matchedRiskKeywords.length > 0 && (
                <Badge variant={answer.riskScore >= 3 ? 'danger' : 'warning'} size="sm">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  风险关键词：{answer.matchedRiskKeywords.join('、')}
                </Badge>
              )}
              {answer.sentiment !== 0 && (
                <Badge variant={answer.sentiment > 0 ? 'success' : 'danger'} size="sm">
                  {answer.sentiment > 0 ? (
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                  ) : (
                    <XCircle className="w-3 h-3 mr-1" />
                  )}
                  {answer.sentiment > 0 ? '正面情感' : '负面情感'}
                </Badge>
              )}
              {currentTopic && (
                <Badge variant="primary" size="sm">
                  所属主题：{currentTopic.customName || currentTopic.name}
                </Badge>
              )}
            </div>
          </div>
          {showMove && (
            <Button
              variant="ghost"
              size="sm"
              icon={<MoveRight className="w-4 h-4" />}
              onClick={() => {
                setTargetTopicId('');
                setShowMoveModal(true);
              }}
              className="flex-shrink-0"
            />
          )}
        </div>
      </div>

      <Modal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        title="移动回答"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowMoveModal(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleMove} disabled={!targetTopicId}>
              确认移动
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-neutral-50 rounded-lg">
            <p className="text-sm text-neutral-700 line-clamp-3">{answer.originalText}</p>
          </div>
          <Select
            label="目标主题"
            value={targetTopicId}
            onChange={(e) => setTargetTopicId(e.target.value)}
            options={topics
              .filter((t) => t.id !== answer.topicId)
              .map((t) => ({
                value: t.id,
                label: `${t.customName || t.name} (${t.answerCount} 条)`,
              }))}
            placeholder="请选择目标主题"
          />
          <p className="text-xs text-neutral-500">
            移动后，该回答将从当前主题移动到目标主题。
          </p>
        </div>
      </Modal>
    </>
  );
};

export default AnswerItem;
