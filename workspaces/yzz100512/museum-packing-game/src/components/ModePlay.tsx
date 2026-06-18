import React, { useState } from 'react';
import type { Level, PackingChoice, PackingResult } from '../types';
import { PackingPractice } from './PackingPractice';
import { getMaterialLabel, getDistanceLabel } from '../logic/packingEvaluation';

interface Props {
  levels: Level[];
  mode: 'confirm' | 'exam';
  onBack: () => void;
  onComplete: (level: Level, result: PackingResult, choice: PackingChoice) => void;
}

export const ModePlay: React.FC<Props> = ({ levels, mode, onBack, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [results, setResults] = useState<{ levelId: string; score: number; isCorrect: boolean }[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  const filteredLevels = mode === 'confirm'
    ? levels.filter(l => l.difficulty === 'easy' || l.difficulty === 'medium').slice(0, 5)
    : levels.filter(l => l.difficulty === 'medium' || l.difficulty === 'hard');



  const handleStart = () => {
    setSelectedLevel(filteredLevels[0]);
    setCurrentIndex(0);
    setResults([]);
    setShowSummary(false);
  };

  const handleLevelComplete = (result: PackingResult, choice: PackingChoice) => {
    if (!selectedLevel) return;

    onComplete(selectedLevel, result, choice);

    const newResults = [...results, {
      levelId: selectedLevel.id,
      score: result.score,
      isCorrect: result.isCorrect,
    }];
    setResults(newResults);

    if (currentIndex < filteredLevels.length - 1) {
      setTimeout(() => {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        setSelectedLevel(filteredLevels[nextIndex]);
      }, 1500);
    } else {
      setTimeout(() => {
        setShowSummary(true);
      }, 1500);
    }
  };

  if (selectedLevel && !showSummary) {
    return (
      <div>
        <PackingPractice
          level={selectedLevel}
          mode={mode === 'exam' ? 'exam' : 'practice'}
          onBack={() => setSelectedLevel(null)}
          onComplete={handleLevelComplete}
        />
        <div className="fixed top-4 right-4 bg-white px-4 py-2 rounded-lg shadow-md text-sm">
          第 {currentIndex + 1} / {filteredLevels.length} 题
        </div>
      </div>
    );
  }

  if (showSummary) {
    const correctCount = results.filter(r => r.isCorrect).length;
    const avgScore = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
      : 0;
    const passed = correctCount >= Math.ceil(results.length * 0.8);

    return (
      <div className="min-h-screen bg-bg-cream py-8 px-4 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{passed ? '🎉' : '💪'}</div>
            <h2 className="text-2xl font-bold text-text-dark mb-2">
              {mode === 'confirm' ? '正式打包确认' : '外借运输冲刺'}
              结果
            </h2>
            <p className="text-text-muted">
              {passed ? '恭喜通过！你已经掌握了基本打包技能。' : '还需要多加练习，继续加油！'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{results.length}</div>
              <div className="text-sm text-text-muted">总题数</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{correctCount}</div>
              <div className="text-sm text-text-muted">正确</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{avgScore}</div>
              <div className="text-sm text-text-muted">平均分</div>
            </div>
          </div>

          <div className="space-y-2 mb-8 max-h-64 overflow-y-auto">
            {results.map((r, i) => {
              const level = filteredLevels.find(l => l.id === r.levelId);
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    r.isCorrect ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <div>
                    <span className="font-medium text-text-dark">
                      {level?.name || `第${i + 1}题`}
                    </span>
                    {level && (
                      <span className="text-xs text-text-muted ml-2">
                        {getMaterialLabel(level.artifact.material)}
                      </span>
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    r.isCorrect ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {r.score}分
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex gap-4">
            <button
              onClick={onBack}
              className="flex-1 py-3 border-2 border-border-light text-text-dark rounded-lg font-medium hover:bg-gray-50"
            >
              返回首页
            </button>
            <button
              onClick={handleStart}
              className="flex-1 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark"
            >
              再来一次
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-cream py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <button onClick={onBack} className="text-primary hover:text-primary-dark mb-6 flex items-center gap-2">
          <span>←</span>
          <span>返回首页</span>
        </button>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">
              {mode === 'confirm' ? '✅' : '🚚'}
            </div>
            <h2 className="text-2xl font-bold text-text-dark mb-2">
              {mode === 'confirm' ? '正式打包前确认' : '外借运输前冲刺'}
            </h2>
            <p className="text-text-muted">
              {mode === 'confirm'
                ? '检验你对基本打包技能的掌握程度，80分以上为通过。'
                : '重点练习长途运输和高难度文物的打包技巧。'}
            </p>
          </div>

          <div className="bg-bg-cream rounded-lg p-5 mb-6">
            <h3 className="font-semibold text-text-dark mb-3">本次练习包含：</h3>
            <div className="space-y-2">
              {filteredLevels.map(level => (
                <div
                  key={level.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-text-dark">{level.name}</span>
                  <div className="flex gap-2">
                    <span className="text-xs bg-bg-wood text-primary px-2 py-0.5 rounded">
                      {getMaterialLabel(level.artifact.material)}
                    </span>
                    <span className="text-xs bg-gray-100 text-text-muted px-2 py-0.5 rounded">
                      {getDistanceLabel(level.transportDistance)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-text-muted mt-4">
              共 {filteredLevels.length} 道题
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-blue-800 mb-1">规则说明</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 每题独立评分，80分以上为合格</li>
              <li>• 正确率达到80%以上算整体通过</li>
              <li>• 可以重复练习，每次记录最高分</li>
            </ul>
          </div>

          <button
            onClick={handleStart}
            className="w-full py-4 bg-primary text-white rounded-lg font-semibold text-lg hover:bg-primary-dark transition-colors"
          >
            开始{mode === 'confirm' ? '确认测试' : '冲刺练习'}
          </button>
        </div>
      </div>
    </div>
  );
};
