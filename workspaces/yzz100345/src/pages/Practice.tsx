import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoBoard } from '@/components/GoBoard/GoBoard';
import { ActionBar } from '@/components/common/ActionBar';
import { ExplanationPanel } from '@/components/Explanation/ExplanationPanel';
import { useGameStore } from '@/store/gameStore';
import { useProgressStore } from '@/store/progressStore';
import { getProblemById, problems } from '@/data/problems';
import { problemTypeLabels } from '@/types';
import { ArrowLeft, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Practice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const {
    currentProblem,
    setCurrentProblem,
    resetGame,
    showLiberties,
    explanation,
  } = useGameStore();

  const { getProblemProgress, loadData, isLoaded } = useProgressStore();

  useEffect(() => {
    if (!isLoaded) {
      loadData();
    }
  }, [isLoaded, loadData]);

  useEffect(() => {
    if (!id) return;
    
    const problem = getProblemById(id);
    if (!problem) {
      navigate('/');
      return;
    }

    setCurrentProblem(problem);
    resetGame(problem.boardSize, problem.initialBoard, problem.playerColor);
  }, [id, setCurrentProblem, resetGame, navigate]);

  const progress = id ? getProblemProgress(id) : undefined;
  
  const currentIndex = problems.findIndex(p => p.id === id);
  const hasNext = currentIndex < problems.length - 1;
  const hasPrev = currentIndex > 0;

  const handleNext = () => {
    if (hasNext) {
      navigate(`/practice/${problems[currentIndex + 1].id}`);
    }
  };

  const handlePrev = () => {
    if (hasPrev) {
      navigate(`/practice/${problems[currentIndex - 1].id}`);
    }
  };

  const getDifficultyStars = () => {
    if (!currentProblem) return null;
    return Array.from({ length: 3 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          'w-4 h-4',
          i < currentProblem.difficulty ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        )}
      />
    ));
  };

  if (!currentProblem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">⚫</div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-gray-800">
                    {currentProblem.title}
                  </h1>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      currentProblem.type === 'capture' && 'bg-red-100 text-red-700',
                      currentProblem.type === 'atari' && 'bg-orange-100 text-orange-700',
                      currentProblem.type === 'escape' && 'bg-green-100 text-green-700',
                      currentProblem.type === 'forbidden' && 'bg-purple-100 text-purple-700',
                      currentProblem.type === 'double-atari' && 'bg-blue-100 text-blue-700'
                    )}
                  >
                    {problemTypeLabels[currentProblem.type]}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    {getDifficultyStars()}
                  </div>
                  <span className="text-xs text-gray-500">
                    {currentIndex + 1} / {problems.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasPrev && (
                <button
                  onClick={handlePrev}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  上一题
                </button>
              )}
              {hasNext && (
                <button
                  onClick={handleNext}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors text-sm font-medium"
                >
                  下一题
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <p className="text-lg text-gray-700 text-center">
            <span className="font-bold text-amber-600">题目：</span>
            {currentProblem.description}
          </p>
          <p className="text-sm text-gray-500 text-center mt-2">
            轮到
            <span className={cn(
              'font-bold mx-1',
              currentProblem.playerColor === 'black' ? 'text-gray-900' : 'text-gray-400'
            )}>
              {currentProblem.playerColor === 'black' ? '⚫ 黑棋' : '⚪ 白棋'}
            </span>
            落子
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col items-center gap-6">
            <GoBoard />
            <ActionBar
              onBack={() => navigate('/')}
              onNext={handleNext}
              hasNext={hasNext}
            />
          </div>

          <div className="space-y-4">
            {progress && progress.attempts.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-4">
                <h3 className="font-bold text-gray-800 mb-3">本题记录</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">尝试次数</span>
                    <span className="font-medium">{progress.attempts.length} 次</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">是否正确</span>
                    <span className={cn(
                      'font-medium',
                      progress.completed ? 'text-green-600' : 'text-orange-500'
                    )}>
                      {progress.completed ? '✅ 已通过' : '❌ 未通过'}
                    </span>
                  </div>
                  {progress.lastAttempt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">最后尝试</span>
                      <span className="font-medium">
                        {new Date(progress.lastAttempt).toLocaleString('zh-CN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-lg p-4">
              <h3 className="font-bold text-gray-800 mb-3">气数说明</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">0</div>
                  <span className="text-gray-600">没气，即将被提</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">1</div>
                  <span className="text-gray-600">一口气，被打吃</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center text-white text-xs font-bold">2</div>
                  <span className="text-gray-600">两口气，需要注意</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">3+</div>
                  <span className="text-gray-600">三口气以上，安全</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  💡 小提示：棋子的气就是它上下左右的空位。棋子连在一起会共享气。
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-4">
              <h3 className="font-bold text-gray-800 mb-3">禁入点规则</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  <span className="font-bold text-red-500">🚫 不能自杀：</span>
                  如果下进去你的棋子没有气，也吃不到对方的棋子，就不能下。
                </p>
                <p>
                  <span className="font-bold text-green-500">✅ 可以吃子：</span>
                  虽然下进去没气，但能提到对方的棋子，这不是禁入点。
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <ExplanationPanel />
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>
            气数显示：
            <span className={cn('mx-1', showLiberties ? 'text-green-600' : 'text-gray-400')}>
              {showLiberties ? '开启' : '关闭'}
            </span>
            | 可以点击棋盘交叉点落子
          </p>
        </div>
      </footer>
    </div>
  );
}
