import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Edit2, Trash2, MapPin, Settings, BarChart3, RotateCcw } from 'lucide-react';
import { useBlockStore } from '../../store/blockStore';
import { useStatsStore } from '../../store/statsStore';
import { OBSTACLE_TYPE_LABELS } from '../../types';

export default function TeacherBlocksPage() {
  const navigate = useNavigate();
  const { blocks, deleteBlock, resetToDefault } = useBlockStore();
  const { clearStats, userStats } = useStatsStore();
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  const handleReset = () => {
    if (confirm('确定要重置所有街区和统计数据吗？此操作不可撤销。')) {
      resetToDefault();
      clearStats();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft size={22} />
            </button>
            <div>
              <h1 className="font-semibold text-lg text-gray-800">街区管理</h1>
              <p className="text-xs text-gray-500">配置训练街区和障碍点</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/teacher/stats')}
              className="btn btn-ghost text-sm"
            >
              <BarChart3 size={16} />
              统计分析
            </button>
            <button onClick={handleReset} className="btn btn-outline text-sm">
              <RotateCcw size={16} />
              重置数据
            </button>
            <button className="btn btn-primary text-sm">
              <Plus size={16} />
              新建街区
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid gap-4">
          {blocks.map((block) => {
            const realObstacleCount = block.obstacles.filter((o) => !o.isFalsePositive).length;
            const falsePositiveCount = block.obstacles.filter((o) => o.isFalsePositive).length;
            const stat = userStats.blockStats[block.id];

            return (
              <div
                key={block.id}
                className="bg-white rounded-xl p-5 card-shadow hover:card-shadow-hover transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-primary-300 to-primary-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 text-lg">
                        {block.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{block.description}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                          真实障碍 {realObstacleCount} 个
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                          干扰项 {falsePositiveCount} 个
                        </span>
                        <span>难度 {'★'.repeat(block.difficulty)}</span>
                        <span>限时 {Math.floor(block.timeLimit / 60)} 分钟</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn-ghost text-sm px-3 py-1.5"
                      onClick={() => navigate(`/game/${block.id}`)}
                    >
                      预览
                    </button>
                    <button className="btn btn-outline text-sm px-3 py-1.5">
                      <Edit2 size={14} />
                      编辑
                    </button>
                    <button
                      className="btn text-sm px-3 py-1.5 text-red-500 hover:bg-red-50"
                      onClick={() => setShowConfirm(block.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {stat && (
                  <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-gray-400">训练次数</div>
                      <div className="text-lg font-semibold text-gray-700">
                        {stat.playCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">最佳得分</div>
                      <div className="text-lg font-semibold text-primary-600">
                        {stat.bestScore}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">最佳正确率</div>
                      <div className="text-lg font-semibold text-green-600">
                        {Math.round(stat.bestAccuracy * 100)}%
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-xs text-gray-400 mb-2">障碍类型分布</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(
                      block.obstacles.reduce((acc, o) => {
                        acc[o.type] = (acc[o.type] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([type, count]) => (
                      <span
                        key={type}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                      >
                        {OBSTACLE_TYPE_LABELS[type as keyof typeof OBSTACLE_TYPE_LABELS] || type}{' '}
                        × {count}
                      </span>
                    ))}
                  </div>
                </div>

                {showConfirm === block.id && (
                  <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-700 mb-3">
                      确定要删除「{block.name}」吗？相关训练记录也会受到影响。
                    </p>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-danger text-sm px-3 py-1.5"
                        onClick={() => {
                          deleteBlock(block.id);
                          setShowConfirm(null);
                        }}
                      >
                        确认删除
                      </button>
                      <button
                        className="btn btn-ghost text-sm px-3 py-1.5"
                        onClick={() => setShowConfirm(null)}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {blocks.length === 0 && (
          <div className="text-center py-16">
            <Settings size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">还没有街区配置</p>
            <button className="btn btn-primary">
              <Plus size={16} />
              创建第一个街区
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
