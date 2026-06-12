import { Clock, Target, XCircle, Lightbulb, Pause, Play, ArrowLeft } from 'lucide-react';
import { formatTime } from '../../utils/score';

interface GameHeaderProps {
  blockName: string;
  timeRemaining: number;
  timeLimit: number;
  foundCount: number;
  totalCount: number;
  falsePositiveCount: number;
  score: number;
  isPaused: boolean;
  onBack: () => void;
  onPause: () => void;
  onResume: () => void;
  onHint: () => void;
  hintsUsed: number;
  maxHints: number;
}

export default function GameHeader({
  blockName,
  timeRemaining,
  timeLimit,
  foundCount,
  totalCount,
  falsePositiveCount,
  score,
  isPaused,
  onBack,
  onPause,
  onResume,
  onHint,
  hintsUsed,
  maxHints,
}: GameHeaderProps) {
  const timePercentage = (timeRemaining / timeLimit) * 100;
  const isLowTime = timeRemaining < 30;

  return (
    <div className="bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-semibold text-gray-800 text-lg">{blockName}</h1>
              <p className="text-sm text-gray-500">盲道障碍巡查赛</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Clock className={isLowTime ? 'text-red-500' : 'text-gray-500'} size={18} />
              <span className={`font-mono text-lg font-semibold ${
                isLowTime ? 'text-red-500 animate-pulse' : 'text-gray-800'
              }`}>
                {formatTime(timeRemaining)}
              </span>
            </div>

            <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  isLowTime ? 'bg-red-500' : timePercentage < 50 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${timePercentage}%` }}
              />
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5 text-green-600">
                <Target size={16} />
                <span className="font-medium">{foundCount}</span>
                <span className="text-gray-400">/</span>
                <span className="text-gray-500">{totalCount}</span>
              </div>
              <div className="flex items-center gap-1.5 text-red-500">
                <XCircle size={16} />
                <span className="font-medium">{falsePositiveCount}</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-gray-500">得分</div>
              <div className="text-xl font-bold text-primary-600 count-up">{score}</div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={onHint}
                disabled={hintsUsed >= maxHints}
                className="w-9 h-9 flex items-center justify-center text-amber-500 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed relative"
                title={`提示 (${hintsUsed}/${maxHints})`}
              >
                <Lightbulb size={20} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {maxHints - hintsUsed}
                </span>
              </button>
              <button
                onClick={isPaused ? onResume : onPause}
                className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {isPaused ? <Play size={20} /> : <Pause size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
