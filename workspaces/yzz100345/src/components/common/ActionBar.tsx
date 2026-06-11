import React from 'react';
import { Undo2, Redo2, RotateCcw, Lightbulb, Eye, EyeOff, ArrowLeft, ArrowRight } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';

interface ActionBarProps {
  onBack?: () => void;
  onNext?: () => void;
  hasNext?: boolean;
  className?: string;
}

export function ActionBar({ onBack, onNext, hasNext = true, className }: ActionBarProps) {
  const {
    undoMove,
    redoMove,
    resetToInitial,
    setShowLiberties,
    showLiberties,
    currentMoveIndex,
    moveHistory,
    setExplanation,
    currentProblem,
    hideExplanation,
  } = useGameStore();

  const canUndo = currentMoveIndex >= 0;
  const canRedo = currentMoveIndex < moveHistory.length - 1;

  const handleHint = () => {
    if (!currentProblem?.hint) return;
    setExplanation({
      type: 'info',
      title: '💡 提示',
      message: currentProblem.hint,
    });
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button
            onClick={onBack}
            disabled={!onBack}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium',
              'transition-all duration-200',
              onBack
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95'
                : 'bg-gray-50 text-gray-300 cursor-not-allowed'
            )}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">返回</span>
          </button>

          <div className="h-8 w-px bg-gray-200 mx-1" />

          <button
            onClick={undoMove}
            disabled={!canUndo}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium',
              'transition-all duration-200',
              canUndo
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 active:scale-95'
                : 'bg-gray-50 text-gray-300 cursor-not-allowed'
            )}
            title="悔棋"
          >
            <Undo2 className="w-5 h-5" />
            <span className="hidden sm:inline">悔棋</span>
          </button>

          <button
            onClick={redoMove}
            disabled={!canRedo}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium',
              'transition-all duration-200',
              canRedo
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 active:scale-95'
                : 'bg-gray-50 text-gray-300 cursor-not-allowed'
            )}
            title="重做"
          >
            <Redo2 className="w-5 h-5" />
            <span className="hidden sm:inline">重做</span>
          </button>

          <button
            onClick={resetToInitial}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-red-100 text-red-700 hover:bg-red-200 active:scale-95 transition-all duration-200"
            title="重置"
          >
            <RotateCcw className="w-5 h-5" />
            <span className="hidden sm:inline">重置</span>
          </button>

          <div className="h-8 w-px bg-gray-200 mx-1" />

          <button
            onClick={handleHint}
            disabled={!currentProblem?.hint}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium',
              'transition-all duration-200',
              currentProblem?.hint
                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 active:scale-95'
                : 'bg-gray-50 text-gray-300 cursor-not-allowed'
            )}
            title="提示"
          >
            <Lightbulb className="w-5 h-5" />
            <span className="hidden sm:inline">提示</span>
          </button>

          <button
            onClick={() => setShowLiberties(!showLiberties)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium',
              'transition-all duration-200 active:scale-95',
              showLiberties
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
            title={showLiberties ? '隐藏气数' : '显示气数'}
          >
            {showLiberties ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            <span className="hidden sm:inline">{showLiberties ? '隐藏气' : '显示气'}</span>
          </button>

          {onNext && (
            <>
              <div className="h-8 w-px bg-gray-200 mx-1" />
              <button
                onClick={onNext}
                disabled={!hasNext}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-medium',
                  'transition-all duration-200',
                  hasNext
                    ? 'bg-green-100 text-green-700 hover:bg-green-200 active:scale-95'
                    : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                )}
              >
                <span className="hidden sm:inline">下一题</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {moveHistory.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-center gap-1">
              <span className="text-sm text-gray-500 mr-2">步骤：</span>
              <button
                onClick={() => useGameStore.getState().goToMove(-1)}
                className={cn(
                  'w-8 h-8 rounded-full text-xs font-medium transition-all',
                  currentMoveIndex === -1
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                始
              </button>
              {moveHistory.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => useGameStore.getState().goToMove(idx)}
                  className={cn(
                    'w-8 h-8 rounded-full text-xs font-medium transition-all',
                    currentMoveIndex === idx
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
