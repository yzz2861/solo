import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, BarChart3, GraduationCap, RefreshCw, User, Settings } from 'lucide-react';
import { ProblemCard } from '@/components/ProblemCard/ProblemCard';
import { problems } from '@/data/problems';
import { useProgressStore } from '@/store/progressStore';
import { problemTypeLabels } from '@/types';
import type { ProblemType } from '@/types';
import { cn } from '@/lib/utils';

export default function Home() {
  const navigate = useNavigate();
  const {
    progress,
    gameMode,
    setGameMode,
    studentName,
    setStudentName,
    getProgressStats,
    isLoaded,
    loadData,
    clearAllProgress,
  } = useProgressStore();

  const [filterType, setFilterType] = React.useState<ProblemType | 'all'>('all');
  const [showSettings, setShowSettings] = React.useState(false);

  useEffect(() => {
    if (!isLoaded) {
      loadData();
    }
  }, [isLoaded, loadData]);

  const stats = getProgressStats();

  const filteredProblems = filterType === 'all'
    ? problems
    : problems.filter(p => p.type === filterType);

  const typeFilters: { value: ProblemType | 'all'; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'capture', label: problemTypeLabels['capture'] },
    { value: 'atari', label: problemTypeLabels['atari'] },
    { value: 'escape', label: problemTypeLabels['escape'] },
    { value: 'forbidden', label: problemTypeLabels['forbidden'] },
    { value: 'double-atari', label: problemTypeLabels['double-atari'] },
  ];

  const handleProblemClick = (problemId: string) => {
    navigate(`/practice/${problemId}`);
  };

  const handleClearProgress = () => {
    if (window.confirm('确定要清除所有练习进度吗？此操作不可撤销。')) {
      clearAllProgress();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                <span className="text-2xl">⚫</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">围棋吃子练习</h1>
                <p className="text-sm text-gray-500">启蒙课 · 快乐学围棋</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
              
              <button
                onClick={() => navigate('/teacher')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
                  gameMode === 'teacher'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                <BarChart3 className="w-5 h-5" />
                <span className="hidden sm:inline">老师视图</span>
              </button>

              <button
                onClick={() => setGameMode(gameMode === 'student' ? 'teacher' : 'student')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
                  gameMode === 'student'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                <GraduationCap className="w-5 h-5" />
                <span className="hidden sm:inline">
                  {gameMode === 'student' ? '学生模式' : '切换学生'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {showSettings && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-white rounded-xl shadow-lg p-6 animate-in slide-in-from-top duration-300">
            <h3 className="text-lg font-bold text-gray-800 mb-4">设置</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  学生姓名
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="请输入学生姓名"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleClearProgress}
                  className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  清除所有进度
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-5 border-t-4 border-amber-500">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">总题数</p>
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-5 border-t-4 border-green-500">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">已完成</p>
                <p className="text-2xl font-bold text-gray-800">
                  {stats.completed} / {stats.total}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-5 border-t-4 border-blue-500">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">正确率</p>
                <p className="text-2xl font-bold text-gray-800">{stats.accuracy}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-5 border-t-4 border-red-500">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <User className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">错误次数</p>
                <p className="text-2xl font-bold text-gray-800">{stats.errorCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="mb-2 flex justify-between text-sm text-gray-600">
            <span>学习进度</span>
            <span>{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</span>
          </div>
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {typeFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setFilterType(filter.value)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                filterType === filter.value
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-amber-50'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProblems.map((problem) => (
            <ProblemCard
              key={problem.id}
              problem={problem}
              progress={progress[problem.id]}
              onClick={() => handleProblemClick(problem.id)}
            />
          ))}
        </div>

        {filteredProblems.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-gray-500">这个分类暂时没有题目</p>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>围棋吃子练习 · 让学习更有趣</p>
          <p className="mt-1">💡 提示：每道题都有气数显示，帮助理解"没气"和"不能下"的区别</p>
        </div>
      </footer>
    </div>
  );
}
