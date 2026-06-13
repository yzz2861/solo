import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Pause, Play, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useTouchBrush } from '@/hooks/useTouchBrush';
import ToothModel from '@/components/ToothModel';
import PressureMeter from '@/components/PressureMeter';
import TimerDisplay from '@/components/TimerDisplay';
import FeedbackBubbles from '@/components/FeedbackBubble';
import { REGION_ORDER, REGION_NAMES, REGION_TIPS } from '@/types';
import { formatTime } from '@/utils/dateUtils';

const PracticePage: React.FC = () => {
  const navigate = useNavigate();
  const toothAreaRef = useRef<HTMLDivElement>(null);
  
  const { targetDuration, difficulty, soundEnabled } = useSettingsStore();
  
  const [resultData, setResultData] = useState<any>(null);

  const handleGameComplete = useCallback((result: any) => {
    setResultData(result);
    setTimeout(() => {
      navigate('/result', { state: result });
    }, 1500);
  }, [navigate]);

  const game = useGameLogic({
    targetDuration,
    difficulty,
    onComplete: handleGameComplete,
  });

  const touchBrush = useTouchBrush({
    elementRef: toothAreaRef as React.RefObject<HTMLElement>,
    onBrushMove: (pos, pressure) => {
      game.handleBrushMove(pos, pressure);
    },
  });

  const toggleSound = useSettingsStore((state) => state.toggleSound);

  const currentRegionData = game.regions[game.currentRegion];

  useEffect(() => {
    if (game.gamePhase === 'completed') {
      // 游戏结束，保存记录的逻辑在 useGameLogic 的 onComplete 中处理
    }
  }, [game.gamePhase]);

  const handleBack = () => {
    if (game.isPlaying && !game.isPaused) {
      game.pauseGame();
    }
    if (confirm('确定要退出练习吗？')) {
      navigate('/');
    } else {
      if (game.isPaused) {
        game.resumeGame();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-mint-100 via-white to-sky2-100 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-sm shadow-sm">
        <button
          onClick={handleBack}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        
        <div className="text-center">
          <div className="text-sm text-gray-500">
            第 {game.currentRegionIndex + 1} / {REGION_ORDER.length} 面
          </div>
          <div className="font-bold text-mint-600">
            {REGION_NAMES[game.currentRegion]}
          </div>
        </div>
        
        <button
          onClick={toggleSound}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          {soundEnabled ? (
            <Volume2 className="w-6 h-6 text-gray-600" />
          ) : (
            <VolumeX className="w-6 h-6 text-gray-400" />
          )}
        </button>
      </div>

      <div className="px-4 py-2">
        <div className="flex gap-1">
          {REGION_ORDER.map((region, index) => {
            const regionData = game.regions[region];
            const isActive = index === game.currentRegionIndex;
            const isCompleted = regionData.completed;
            
            return (
              <div
                key={region}
                className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                  isCompleted
                    ? 'bg-mint-500'
                    : isActive
                    ? 'bg-mint-300'
                    : 'bg-gray-200'
                }`}
              />
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 py-4">
        <div className="w-full max-w-md flex justify-between items-start mb-4">
          <PressureMeter
            pressure={touchBrush.pressure}
            pressureLevel={touchBrush.pressureLevel}
            vertical
          />
          
          <div className="flex-1 flex flex-col items-center">
            <TimerDisplay
              currentTime={game.totalTime}
              targetTime={targetDuration}
              size="lg"
            />
            
            <div className="mt-2 text-sm text-gray-500">
              本面: {formatTime(game.regionTime)} / {formatTime(game.targetPerRegion)}
            </div>
          </div>
          
          <div className="w-6" />
        </div>

        <div
          ref={toothAreaRef}
          className="relative w-full max-w-md aspect-square bg-white rounded-3xl shadow-inner overflow-hidden cursor-crosshair select-none"
          style={{ touchAction: 'none' }}
        >
          {game.gamePhase === 'countdown' && (
            <div className="absolute inset-0 bg-mint-500/90 flex items-center justify-center z-20">
              <div className="text-8xl font-bold text-white animate-bounce">
                {game.countdown}
              </div>
            </div>
          )}

          {game.gamePhase === 'completed' && (
            <div className="absolute inset-0 bg-mint-500/90 flex flex-col items-center justify-center z-20 animate-fade-in">
              <div className="text-4xl font-bold text-white mb-2">完成啦！</div>
              <div className="text-xl text-white/90">正在计算得分...</div>
            </div>
          )}

          <ToothModel
            region={game.currentRegion}
            cleanliness={currentRegionData.cleanliness}
            cleanedCells={currentRegionData.cleanedCells}
            gridCols={game.gridSize.cols}
            gridRows={game.gridSize.rows}
            brushPosition={touchBrush.brushPosition}
            isActive={game.gamePhase === 'playing' && !game.isPaused}
          />

          {game.isPaused && game.gamePhase === 'playing' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
              <div className="text-3xl font-bold text-white">已暂停</div>
            </div>
          )}

          <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none z-10">
            <FeedbackBubbles feedbacks={game.feedbacks.map(f => ({
              id: f.id,
              type: f.type as 'success' | 'warning' | 'info',
              message: f.message,
              timestamp: f.timestamp,
            }))} />
          </div>
        </div>

        <div className="w-full max-w-md mt-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-md">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-sunshine-100 rounded-full flex items-center justify-center flex-shrink-0">
                💡
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {REGION_TIPS[game.currentRegion]}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  用手指在牙齿上来回滑动，就像在刷牙一样～
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-6 pt-2 bg-white/80 backdrop-blur-sm">
        <div className="max-w-md mx-auto flex items-center justify-center gap-4">
          {game.gamePhase === 'idle' && (
            <button
              onClick={game.startGame}
              className="px-8 py-4 bg-gradient-to-r from-mint-500 to-mint-400 text-white text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200"
            >
              开始刷牙
            </button>
          )}

          {game.gamePhase === 'playing' && (
            <>
              <button
                onClick={game.isPaused ? game.resumeGame : game.pauseGame}
                className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                {game.isPaused ? (
                  <Play className="w-6 h-6 text-gray-700" />
                ) : (
                  <Pause className="w-6 h-6 text-gray-700" />
                )}
              </button>

              <button
                onClick={game.nextRegion}
                className="flex-1 py-3 bg-mint-500 text-white font-bold rounded-2xl shadow-md hover:bg-mint-600 active:bg-mint-700 transition-colors flex items-center justify-center gap-2"
              >
                下一面
                <SkipForward className="w-5 h-5" />
              </button>

              <button
                onClick={game.endGame}
                className="w-14 h-14 rounded-full bg-coral-100 flex items-center justify-center hover:bg-coral-200 transition-colors"
              >
                <span className="text-coral-600 text-sm font-medium">结束</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PracticePage;
