import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Star, Clock, TrendingUp, Trophy, Target, User, GraduationCap, ChevronRight, Zap } from 'lucide-react';
import { useBlockStore } from '../../store/blockStore';
import { useStatsStore } from '../../store/statsStore';
import { storage, STORAGE_KEYS } from '../../utils/storage';
import type { UserRole } from '../../types';

export default function HomePage() {
  const navigate = useNavigate();
  const { blocks } = useBlockStore();
  const { userStats, getBlockStats, getWeakTypes } = useStatsStore();
  const [role, setRole] = useState<UserRole>('volunteer');

  useEffect(() => {
    const savedRole = storage.get<UserRole>(STORAGE_KEYS.ROLE, 'volunteer');
    setRole(savedRole);
  }, []);

  const handleRoleSwitch = (newRole: UserRole) => {
    setRole(newRole);
    storage.set(STORAGE_KEYS.ROLE, newRole);
  };

  const weakTypes = getWeakTypes().slice(0, 3);

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '暂无记录';
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50/50 to-white">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-md">
              <MapPin className="text-white" size={22} />
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-800">盲道障碍巡查赛</h1>
              <p className="text-xs text-gray-500">志愿者培训系统</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
            <button
              onClick={() => handleRoleSwitch('volunteer')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                role === 'volunteer'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <User size={14} />
                志愿者
              </div>
            </button>
            <button
              onClick={() => handleRoleSwitch('teacher')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                role === 'teacher'
                  ? 'bg-white text-secondary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <GraduationCap size={14} />
                带队老师
              </div>
            </button>
          </div>
        </div>
      </header>

      {role === 'teacher' && (
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="bg-secondary-50 border border-secondary-200 rounded-lg px-4 py-2 flex items-center justify-between">
            <span className="text-sm text-secondary-700">
              老师模式：可配置街区、查看统计数据
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/teacher/blocks')}
                className="text-sm text-secondary-600 hover:text-secondary-800 font-medium"
              >
                街区管理 →
              </button>
              <button
                onClick={() => navigate('/teacher/stats')}
                className="text-sm text-secondary-600 hover:text-secondary-800 font-medium"
              >
                统计分析 →
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 card-shadow card-hover">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <Trophy className="text-primary-500" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">总训练次数</p>
                <p className="text-2xl font-bold text-gray-800">{userStats.totalSessions}</p>
              </div>
            </div>
            <div className="text-xs text-gray-400">
              上次训练：{formatDate(userStats.lastPlayedAt)}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 card-shadow card-hover">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Target className="text-green-500" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">平均正确率</p>
                <p className="text-2xl font-bold text-gray-800">
                  {userStats.totalSessions > 0
                    ? `${Math.round(userStats.averageAccuracy * 100)}%`
                    : '—'}
                </p>
              </div>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${userStats.averageAccuracy * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 card-shadow card-hover">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Star className="text-amber-500" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">累计得分</p>
                <p className="text-2xl font-bold text-gray-800">{userStats.totalScore}</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/progress')}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              查看详细进度 <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {weakTypes.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Zap className="text-amber-500" size={20} />
              薄弱类型提示
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {weakTypes.map((wt, index) => (
                <div
                  key={wt.type}
                  className="bg-white rounded-xl p-4 border-l-4 border-amber-400 card-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-800">
                      {(wt.type as string).replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                    <span className="text-sm font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      TOP {index + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>错误率</span>
                    <span className="font-semibold text-amber-600">
                      {Math.round(wt.errorRate * 100)}%
                    </span>
                    <span className="text-gray-300">|</span>
                    <span>{wt.total} 次练习</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <MapPin className="text-primary-500" size={20} />
            选择训练街区
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {blocks.map((block) => {
              const blockStat = getBlockStats(block.id);
              const realObstacleCount = block.obstacles.filter((o) => !o.isFalsePositive).length;

              return (
                <div
                  key={block.id}
                  className="bg-white rounded-2xl overflow-hidden card-shadow card-hover cursor-pointer group"
                  onClick={() => navigate(`/game/${block.id}`)}
                >
                  <div className="h-40 bg-gradient-to-br from-primary-200 to-primary-400 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-30">
                      <svg viewBox="0 0 400 160" className="w-full h-full">
                        <path
                          d="M 0 80 L 400 80"
                          stroke="#F5A623"
                          strokeWidth="20"
                          strokeDasharray="8 16"
                          fill="none"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 200 30 L 200 130"
                          stroke="#F5A623"
                          strokeWidth="20"
                          strokeDasharray="8 16"
                          fill="none"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className="badge badge-primary bg-white/90 text-primary-700">
                        {'★'.repeat(block.difficulty)}
                      </span>
                    </div>
                    {blockStat && blockStat.bestScore > 0 && (
                      <div className="absolute top-3 left-3">
                        <span className="badge bg-green-100 text-green-700 flex items-center gap-1">
                          <Trophy size={12} />
                          {blockStat.bestScore} 分
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <h3 className="font-bold text-lg text-gray-800 mb-1 group-hover:text-primary-600 transition-colors">
                      {block.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                      {block.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                      <span className="flex items-center gap-1">
                        <Target size={12} />
                        {realObstacleCount} 个障碍
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {Math.floor(block.timeLimit / 60)} 分钟
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp size={12} />
                        难度 {block.difficulty}
                      </span>
                    </div>

                    {blockStat && (
                      <div className="pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>已训练 {blockStat.playCount} 次</span>
                          <span>最佳正确率 {Math.round(blockStat.bestAccuracy * 100)}%</span>
                        </div>
                      </div>
                    )}

                    <button className="w-full mt-4 btn btn-outline text-sm py-2">
                      开始训练
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-100 mt-12 py-6 text-center text-sm text-gray-400">
        <p>盲道障碍巡查赛 · 让城市更有温度</p>
      </footer>
    </div>
  );
}
