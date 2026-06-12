import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Waves, Play, Edit, Trash2 } from 'lucide-react';
import { useLevelStore } from '@/store/levelStore';
import { useEditorStore } from '@/store/editorStore';
import { GARBAGE_LABELS } from '@/types/level';

export default function Home() {
  const navigate = useNavigate();
  const levels = useLevelStore(s => s.levels);
  const loadLevels = useLevelStore(s => s.loadLevels);
  const deleteLevel = useLevelStore(s => s.deleteLevel);
  const loadLevel = useEditorStore(s => s.loadLevel);

  useEffect(() => {
    loadLevels();
  }, [loadLevels]);

  const handlePlay = (levelId: string) => {
    navigate(`/game/${levelId}`);
  };

  const handleEdit = (levelId: string) => {
    const level = levels.find(l => l.id === levelId);
    if (level) {
      loadLevel(level);
      navigate(`/editor/${levelId}`);
    }
  };

  const handleNewLevel = () => {
    navigate('/editor');
  };

  const handleDelete = (levelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteLevel(levelId);
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d2137 40%, #0f2a46 100%)' }}>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <header className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Waves size={40} className="text-cyan-400" />
            <h1 className="text-4xl font-bold text-white" style={{ fontFamily: '"ZCOOL QingKe HuangYou", sans-serif' }}>
              海洋垃圾打捞策略
            </h1>
          </div>
          <p className="text-slate-400 text-base max-w-xl mx-auto leading-relaxed">
            在模拟海湾中规划打捞路线，预判潮流推移，合理分配船只容量。活动前演练一次，实战少走弯路。
          </p>
        </header>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-200">选择关卡</h2>
          <button
            onClick={handleNewLevel}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-cyan-900/30"
          >
            <Edit size={16} />
            创建新关卡
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {levels.map(level => {
            const garbageTypes = [...new Set(level.garbage.map(g => g.type))];
            const totalGarbage = level.garbage.reduce((sum, g) => sum + g.amount, 0);
            return (
              <div
                key={level.id}
                className="bg-slate-800/70 border border-slate-700/50 rounded-xl p-5 hover:border-cyan-500/40 transition-all group cursor-pointer"
                onClick={() => handlePlay(level.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {level.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{level.description}</p>
                  </div>
                  {level.isPreset && (
                    <span className="text-xs bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                      预设
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                  <span>{level.boats.length} 艘船</span>
                  <span>{level.totalTurns} 回合</span>
                  <span>{totalGarbage} 单位垃圾</span>
                  <span>{level.dangerZones.length} 危险区</span>
                </div>

                {garbageTypes.length > 0 && (
                  <div className="flex items-center gap-1.5 mb-4">
                    {garbageTypes.map(gt => (
                      <span key={gt} className="text-xs bg-slate-700/80 text-slate-300 px-2 py-0.5 rounded">
                        {GARBAGE_LABELS[gt as keyof typeof GARBAGE_LABELS]}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePlay(level.id); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-md transition-colors"
                  >
                    <Play size={12} />开始游戏
                  </button>
                  {!level.isPreset && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(level.id); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-md transition-colors"
                      >
                        <Edit size={12} />编辑
                      </button>
                      <button
                        onClick={(e) => handleDelete(level.id, e)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-red-900/50 text-slate-400 hover:text-red-300 text-xs font-medium rounded-md transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {levels.length === 0 && (
          <div className="text-center text-slate-500 py-16">
            <Waves size={48} className="mx-auto mb-4 opacity-30" />
            <p>暂无关卡，点击上方按钮创建新关卡</p>
          </div>
        )}
      </div>
    </div>
  );
}
