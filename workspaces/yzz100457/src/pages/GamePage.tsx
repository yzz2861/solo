import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { useLevelStore } from '@/store/levelStore';
import HexMap from '@/components/game/HexMap';
import BoatPanel from '@/components/game/BoatPanel';
import TurnControl from '@/components/game/TurnControl';

export default function GamePage() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const levels = useLevelStore(s => s.levels);
  const loadLevels = useLevelStore(s => s.loadLevels);
  const level = levels.find(l => l.id === levelId);
  const loadLevel = useGameStore(s => s.loadLevel);
  const phase = useGameStore(s => s.phase);

  useEffect(() => {
    loadLevels();
  }, [loadLevels]);

  useEffect(() => {
    if (level) {
      loadLevel(level);
    }
  }, [level, loadLevel]);

  if (!level) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0f2a46 100%)' }}>
        <div className="text-center">
          <p className="text-slate-400 text-lg mb-4">关卡未找到</p>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-md transition-colors">
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0d2137 50%, #0f2a46 100%)' }}>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <HexMap />
          {phase === 'planning' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-lg px-4 py-2 text-xs text-slate-300 pointer-events-none">
              点击地图为选中船只规划路线，确认后点击"执行回合"
            </div>
          )}
          {phase === 'ended' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-green-900/80 backdrop-blur-sm border border-green-600/50 rounded-lg px-4 py-2 text-xs text-green-200 pointer-events-none">
              🎯 活动结束！点击下方"查看结算"查看详细复盘
            </div>
          )}
        </div>
        <BoatPanel />
      </div>
      <TurnControl />
    </div>
  );
}
