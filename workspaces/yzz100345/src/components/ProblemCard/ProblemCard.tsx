import React from 'react';
import { CheckCircle, Circle, Star, ChevronRight } from 'lucide-react';
import type { Problem, ProblemProgress } from '@/types';
import { problemTypeLabels } from '@/types';
import { cn } from '@/lib/utils';

interface ProblemCardProps {
  problem: Problem;
  progress?: ProblemProgress;
  onClick: () => void;
  className?: string;
}

export function ProblemCard({ problem, progress, onClick, className }: ProblemCardProps) {
  const isCompleted = progress?.completed || false;
  const isMastered = progress?.mastered || false;
  const attemptCount = progress?.attempts.length || 0;
  const lastAttempt = progress?.lastAttempt;

  const getDifficultyStars = () => {
    return Array.from({ length: 3 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          'w-4 h-4',
          i < problem.difficulty ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        )}
      />
    ));
  };

  const getTypeColor = () => {
    switch (problem.type) {
      case 'capture':
        return 'bg-red-100 text-red-700';
      case 'atari':
        return 'bg-orange-100 text-orange-700';
      case 'escape':
        return 'bg-green-100 text-green-700';
      case 'forbidden':
        return 'bg-purple-100 text-purple-700';
      case 'double-atari':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = () => {
    if (isMastered) {
      return <CheckCircle className="w-6 h-6 text-green-500" />;
    }
    if (isCompleted) {
      return <CheckCircle className="w-6 h-6 text-yellow-500" />;
    }
    return <Circle className="w-6 h-6 text-gray-300" />;
  };

  return (
    <div
      className={cn(
        'relative bg-white rounded-xl shadow-md overflow-hidden cursor-pointer',
        'transition-all duration-300 hover:shadow-xl hover:-translate-y-1',
        'border-2 border-transparent hover:border-amber-300',
        isCompleted && !isMastered && 'border-yellow-300',
        isMastered && 'border-green-400',
        className
      )}
      onClick={onClick}
    >
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background: `linear-gradient(90deg, ${
            isMastered ? '#22c55e' : isCompleted ? '#eab308' : '#d4a574'
          } 0%, ${isMastered ? '#16a34a' : isCompleted ? '#ca8a04' : '#c4956a'} 100%)`,
        }}
      />

      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <div>
              <h3 className="font-bold text-gray-800">{problem.title}</h3>
              <div className="flex items-center gap-1 mt-1">
                {getDifficultyStars()}
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>

        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {problem.description}
        </p>

        <div className="flex items-center justify-between">
          <span
            className={cn(
              'px-2 py-1 rounded-full text-xs font-medium',
              getTypeColor()
            )}
          >
            {problemTypeLabels[problem.type]}
          </span>

          {attemptCount > 0 && (
            <span className="text-xs text-gray-500">
              已尝试 {attemptCount} 次
            </span>
          )}
        </div>

        {lastAttempt && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-400">
              上次练习：{new Date(lastAttempt).toLocaleDateString('zh-CN')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
