import React from 'react';
import { getMaterialLabel } from '../logic/packingEvaluation';
import type { Level } from '../types';

interface Props {
  levels: Level[];
  progress: Record<string, { completed: boolean; bestScore: number; retryCount: number }>;
  onSelectLevel: (level: Level) => void;
  onBack?: () => void;
  title?: string;
}

const difficultyColors = {
  easy: 'bg-green-100 text-green-700 border-green-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  hard: 'bg-red-100 text-red-700 border-red-200',
};

const difficultyLabels = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

const materialColors = {
  pottery: 'from-amber-500 to-orange-600',
  wood: 'from-green-600 to-emerald-700',
  metal: 'from-gray-500 to-slate-700',
};

export const LevelSelect: React.FC<Props> = ({
  levels,
  progress,
  onSelectLevel,
  onBack,
  title = '选择关卡',
}) => {
  return (
    <div className="min-h-screen bg-bg-cream py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          {onBack && (
            <button
              onClick={onBack}
              className="text-primary hover:text-primary-dark mb-4 flex items-center gap-2"
            >
              <span>←</span>
              <span>返回首页</span>
            </button>
          )}
          <h1 className="text-3xl font-bold text-text-dark mb-2">{title}</h1>
          <p className="text-text-muted">共 {levels.length} 个关卡</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {levels.map((level) => {
            const prog = progress[level.id];
            return (
              <div
                key={level.id}
                onClick={() => onSelectLevel(level)}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer border border-border-light overflow-hidden group"
              >
                <div className={`h-32 bg-gradient-to-br ${materialColors[level.artifact.material]} flex items-center justify-center relative`}>
                  <div className="text-white text-4xl font-bold opacity-20">
                    {level.artifact.material === 'pottery' ? '🏺' : level.artifact.material === 'wood' ? '🪵' : '⚙️'}
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className={`text-xs px-2 py-1 rounded-full border ${difficultyColors[level.difficulty]}`}>
                      {difficultyLabels[level.difficulty]}
                    </span>
                  </div>
                  {prog?.completed && (
                    <div className="absolute top-3 left-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      ✓ 已完成
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg text-text-dark">{level.name}</h3>
                  </div>
                  <p className="text-sm text-text-muted mb-3 line-clamp-2">
                    {level.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs bg-bg-wood text-primary px-2 py-1 rounded">
                      {getMaterialLabel(level.artifact.material)}
                    </span>
                    {prog ? (
                      <div className="text-xs text-text-muted">
                        <span>最高分: {prog.bestScore}</span>
                        {prog.retryCount > 0 && (
                          <span className="ml-2">重试: {prog.retryCount}次</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-text-muted">未尝试</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
