import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Home, RotateCcw, ArrowLeft } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { useLevelStore } from '@/store/levelStore';
import ReplayPlayer from '@/components/result/ReplayPlayer';
import StatsPanel from '@/components/result/StatsPanel';
import HexMap from '@/components/game/HexMap';
import type { TurnRecord, GameStats } from '@/types/game';

export default function ResultPage() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const levels = useLevelStore(s => s.levels);
  const loadLevels = useLevelStore(s => s.loadLevels);
  const loadLevel = useGameStore(s => s.loadLevel);
  const storeTurnRecords = useGameStore(s => s.turnRecords);
  const storeStats = useGameStore(s => s.stats);
  const storeInitialGarbageCount = useGameStore(s => s.initialGarbageCount);
  const loadResult = useGameStore(s => s.loadResult);

  const level = levels.find(l => l.id === levelId);

  const [localTurnRecords, setLocalTurnRecords] = useState<TurnRecord[]>([]);
  const [localStats, setLocalStats] = useState<GameStats | null>(null);
  const [localInitialCount, setLocalInitialCount] = useState(0);
  const [replayTurnIdx, setReplayTurnIdx] = useState(0);

  useEffect(() => {
    loadLevels();
  }, [loadLevels]);

  useEffect(() => {
    if (level) {
      loadLevel(level);
    }
  }, [level, loadLevel]);

  useEffect(() => {
    if (storeTurnRecords.length > 0 && storeStats) {
      setLocalTurnRecords(storeTurnRecords);
      setLocalStats(storeStats);
      setLocalInitialCount(storeInitialGarbageCount);
      setReplayTurnIdx(Math.max(0, storeTurnRecords.length - 1));
    } else if (levelId) {
      const saved = loadResult(levelId);
      if (saved) {
        setLocalTurnRecords(saved.turnRecords);
        setLocalStats(saved.stats);
        setLocalInitialCount(saved.initialGarbageCount || 0);
        setReplayTurnIdx(Math.max(0, saved.turnRecords.length - 1));
      }
    }
  }, [storeTurnRecords, storeStats, storeInitialGarbageCount, levelId, loadResult]);

  const displayTurnRecords = localTurnRecords.length > 0 ? localTurnRecords : storeTurnRecords;
  const displayStats = localStats || storeStats;
  const displayInitialCount = localInitialCount || storeInitialGarbageCount;

  const currentTurnRecord: TurnRecord | null = displayTurnRecords[replayTurnIdx] || null;

  const handleReplayTurnChange = (idx: number) => {
    setReplayTurnIdx(idx);
  };

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
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d2137 40%, #0f2a46 100%)' }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: '"ZCOOL QingKe HuangYou", sans-serif' }}>
                活动复盘
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                {level.name} — 回顾打捞过程，优化下次行动
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/game/${levelId}`)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <RotateCcw size={14} />重新演练
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              <Home size={14} />返回首页
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden" style={{ height: '420px' }}>
              <HexMap />
            </div>

            <ReplayPlayer turnRecords={displayTurnRecords} onTurnChange={handleReplayTurnChange} />

            {currentTurnRecord && (
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">
                  第 {currentTurnRecord.turn} 回合详情
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <h4 className="text-xs text-slate-400 mb-1.5 font-medium">船只行动</h4>
                    {currentTurnRecord.actions.length === 0 ? (
                      <p className="text-xs text-slate-500">无行动</p>
                    ) : (
                      <div className="space-y-1">
                        {currentTurnRecord.actions.map((action, i) => (
                          <div key={i} className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                            <span className="text-cyan-400 font-medium">{action.boatId}</span>
                            <span className="text-slate-500">→</span>
                            <span>({action.toQ},{action.toR})</span>
                            {action.salvaged > 0 && <span className="text-green-400">+{action.salvaged} 打捞</span>}
                            {action.unloaded > 0 && <span className="text-amber-400">-{action.unloaded} 卸载</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs text-slate-400 mb-1.5 font-medium">潮流推移</h4>
                    {currentTurnRecord.movements.length === 0 ? (
                      <p className="text-xs text-slate-500">无推移</p>
                    ) : (
                      <div className="space-y-1">
                        {currentTurnRecord.movements.map((m, i) => (
                          <div key={i} className="text-xs text-slate-300">
                            ({m.fromQ},{m.fromR}) → ({m.toQ},{m.toR})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <StatsPanel stats={displayStats} initialGarbageCount={displayInitialCount} />

            {displayStats && displayStats.missedAreas.length > 0 && (
              <div className="bg-red-900/30 border border-red-700/40 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-red-300 mb-2">⚠️ 遗漏区域</h3>
                <p className="text-xs text-red-200/70 leading-relaxed">
                  有 <span className="font-semibold text-red-300">{displayStats.missedAreas.length}</span> 处初始垃圾未被清理。
                  建议下次优先覆盖这些区域，或在潮流将其推走前拦截。
                </p>
              </div>
            )}

            {displayStats && displayStats.wastedTrips.length > 0 && (
              <div className="bg-amber-900/30 border border-amber-700/40 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-amber-300 mb-2">↩️ 无效折返</h3>
                <p className="text-xs text-amber-200/70 leading-relaxed">
                  有 <span className="font-semibold text-amber-300">{displayStats.wastedTrips.length}</span> 次空跑行程。
                  可优化路线顺序，减少无打捞/卸载的无效移动。
                </p>
              </div>
            )}

            {displayStats && (
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">🧳 物资建议</h3>
                <div className="space-y-2.5 text-xs text-slate-300">
                  <p className="leading-relaxed">
                    本次活动共回收 <span className="text-green-400 font-semibold text-sm">{displayStats.totalSalvaged}</span> 单位垃圾。
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-slate-700/50 rounded-lg p-2.5 text-center">
                      <div className="text-[10px] text-slate-400 mb-0.5">垃圾袋预估</div>
                      <div className="text-base font-bold text-amber-400">{displayStats.bagEstimate}</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-2.5 text-center">
                      <div className="text-[10px] text-slate-400 mb-0.5">推荐准备</div>
                      <div className="text-base font-bold text-amber-400">{displayStats.bagRecommendation}</div>
                    </div>
                  </div>
                  <p className="text-slate-400 text-[11px] pt-1">
                    * 每袋按 10 单位容量计算，推荐量含 20% 安全余量
                  </p>
                </div>
              </div>
            )}

            {!displayStats && (
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 text-center">
                <p className="text-slate-400 text-sm">暂无比赛结果数据</p>
                <button
                  onClick={() => navigate(`/game/${levelId}`)}
                  className="mt-3 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-md transition-colors"
                >
                  开始游戏
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
