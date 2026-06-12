import { Play, RotateCcw, Clock, BarChart3 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import type { GamePhase } from '@/types/game';

const PHASE_LABELS: Record<GamePhase, string> = {
  planning: '规划阶段',
  executing: '执行中',
  current: '洋流阶段',
  checking: '检查中',
  ended: '已结束',
};

const PHASE_COLORS: Record<GamePhase, string> = {
  planning: 'bg-blue-500/80 text-blue-100',
  executing: 'bg-amber-500/80 text-amber-100',
  current: 'bg-cyan-500/80 text-cyan-100',
  checking: 'bg-purple-500/80 text-purple-100',
  ended: 'bg-slate-500/80 text-slate-100',
};

export default function TurnControl() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const currentTurn = useGameStore(s => s.currentTurn);
  const totalTurns = useGameStore(s => s.totalTurns);
  const phase = useGameStore(s => s.phase);
  const turnRecords = useGameStore(s => s.turnRecords);
  const confirmPlanning = useGameStore(s => s.confirmPlanning);
  const resetGame = useGameStore(s => s.resetGame);

  const canExecute = phase === 'planning';
  const phaseLabel = PHASE_LABELS[phase];
  const phaseColor = PHASE_COLORS[phase];

  return (
    <div className="h-14 bg-slate-900/90 border-t border-slate-700/50 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-slate-400" />
          <span className="text-sm text-slate-300">
            回合 <span className="font-semibold text-white">{currentTurn}</span> / {totalTurns}
          </span>
        </div>

        <div className="w-px h-6 bg-slate-700" />

        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${phaseColor}`}>
          {phaseLabel}
        </span>

        <div className="w-px h-6 bg-slate-700" />

        <span className="text-xs text-slate-400">
          历史记录: <span className="text-slate-300">{turnRecords.length}</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        {phase === 'ended' && (
          <button
            onClick={() => navigate(`/result/${levelId}`)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/40 transition-all"
          >
            <BarChart3 size={14} />
            查看结算
          </button>
        )}

        {phase !== 'ended' && (
          <button
            onClick={confirmPlanning}
            disabled={!canExecute}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              canExecute
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Play size={14} />
            执行回合
          </button>
        )}

        <button
          onClick={resetGame}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all"
        >
          <RotateCcw size={14} />
          重置
        </button>
      </div>
    </div>
  );
}
