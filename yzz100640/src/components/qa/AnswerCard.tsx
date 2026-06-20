import React, { useState } from 'react';
import { Sprout, CheckCircle, XCircle } from 'lucide-react';
import { useQAStore } from '@/stores/useQAStore';
import ConfidenceBar from '@/components/ConfidenceBar';
import WarningBanner from '@/components/qa/WarningBanner';
import SourceReference from '@/components/qa/SourceReference';
import { CROP_LIBRARY } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface AnswerCardProps {
  className?: string;
}

function getConditionChipClass(condition: string): string {
  const cropNames = CROP_LIBRARY.map((c) => c.name);
  if (cropNames.some((n) => condition.includes(n))) {
    return 'chip-harvest';
  }
  if (condition.includes('月')) {
    return 'chip-sky';
  }
  if (condition.includes('省') || condition.includes('市') || condition.includes('区')) {
    return 'chip-soil';
  }
  return 'chip-default';
}

export default function AnswerCard({ className }: AnswerCardProps) {
  const { currentRecord, isLoading, markAdoption } = useQAStore();
  const [showNote, setShowNote] = useState(false);
  const [noteValue, setNoteValue] = useState('');

  if (isLoading) {
    return (
      <div className={cn('card p-5 animate-pulse', className)}>
        <div className="h-8 bg-leaf-100 w-1/3 rounded mb-3" />
        <div className="h-4 bg-leaf-100 w-full rounded mb-2" />
        <div className="h-4 bg-leaf-100 w-full rounded mb-2" />
        <div className="h-4 bg-leaf-100 w-2/3 rounded mb-2" />
      </div>
    );
  }

  if (currentRecord === null) {
    return (
      <div className={cn('card p-10 flex flex-col items-center justify-center text-center', className)}>
        <Sprout className="w-16 h-16 text-leaf-300 mb-4" />
        <p className="text-leaf-500">输入问题后，这里会显示回答...</p>
      </div>
    );
  }

  const {
    id,
    answer,
    confidence,
    applicableConditions,
    needsManualJudgment,
    judgmentReasons,
    sources,
    adopted,
  } = currentRecord;

  const isAdopted = adopted === true;
  const isRejected = adopted === false;
  const hasVoted = adopted !== null;

  const handleAdopt = () => {
    void markAdoption(id, true);
  };

  const handleRejectClick = () => {
    setShowNote(true);
  };

  const handleSubmitNote = () => {
    void markAdoption(id, false, noteValue);
    setShowNote(false);
  };

  return (
    <div className={cn('card p-6 animate-fade-in-up', className)}>
      <div className="border-l-4 border-leaf-500 pl-4 py-1 mb-5">
        <p className="text-xl font-medium text-leaf-900 leading-relaxed whitespace-pre-wrap">
          {answer}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-5 items-center">
        <ConfidenceBar value={confidence} />
        {applicableConditions.map((condition, index) => (
          <span key={index} className={getConditionChipClass(condition)}>
            {condition}
          </span>
        ))}
      </div>

      {needsManualJudgment && <WarningBanner reasons={judgmentReasons} />}

      <div className="border-t pt-4 mt-4">
        <p className="text-sm font-medium text-leaf-700 mb-2">📚 来源段落</p>
        <div className="mt-2">
          {sources.map((source, index) => (
            <SourceReference
              key={`${source.materialId}-${index}`}
              source={source}
              delay={index * 0.05}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-leaf-100">
        <p className="text-sm font-medium text-leaf-700 mb-3">请对回答进行评价：</p>
        <div className="flex gap-3">
          <button
            type="button"
            className={cn(
              'btn-primary',
              isAdopted && '!bg-leaf-400 !opacity-70 !cursor-default'
            )}
            disabled={hasVoted}
            onClick={handleAdopt}
          >
            <CheckCircle className="w-5 h-5" />
            <span>采纳</span>
            {isAdopted && <CheckCircle className="w-4 h-4 -ml-1" />}
          </button>
          <button
            type="button"
            className={cn(
              'btn-secondary',
              isRejected && '!bg-gray-100 !opacity-70 !cursor-default !text-gray-500'
            )}
            disabled={hasVoted}
            onClick={handleRejectClick}
          >
            <XCircle className="w-5 h-5" />
            <span>不采纳</span>
          </button>
        </div>

        {(showNote || isRejected) && (
          <div className="mt-4 space-y-3">
            <textarea
              className="textarea"
              rows={3}
              placeholder="请说明原因"
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              disabled={isRejected}
            />
            {!isRejected && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="btn-danger text-sm !px-4 !py-2"
                  onClick={handleSubmitNote}
                >
                  提交备注
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
