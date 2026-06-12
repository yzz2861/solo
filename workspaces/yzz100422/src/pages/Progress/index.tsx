import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trophy, Target, TrendingUp, Calendar, Clock, BarChart2 } from 'lucide-react';
import { useStatsStore } from '../../store/statsStore';
import { useBlockStore } from '../../store/blockStore';
import { OBSTACLE_TYPE_LABELS } from '../../types';
import { calculateGrade, formatTime } from '../../utils/score';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function ProgressPage() {
  const navigate = useNavigate();
  const { userStats, sessions, getWeakTypes, getSessionsByBlock } = useStatsStore();
  const { blocks } = useBlockStore();
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const weakTypes = getWeakTypes();

  const chartData = sessions
    .slice()
    .sort((a, b) => a.endTime - b.endTime)
    .slice(-10)
    .map((s, i) => ({
      name: `第${i + 1}次`,
      得分: s.score,
      正确率: Math.round(s.accuracy * 100),
    }));

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const selectedSessions = selectedBlockId
    ? getSessionsByBlock(selectedBlockId)
    : sessions.slice().sort((a, b) => b.endTime - a.endTime);

  const recentSessions = sessions
    .slice()
    .sort((a, b) => b.endTime - a.endTime)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="font-semibold text-lg text-gray-800">个人训练进度</h1>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 card-shadow">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
              <Trophy size={16} />
              总训练次数
            </div>
            <div className="text-3xl font-bold text-gray-800">
              {userStats.totalSessions}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 card-shadow">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
              <Target size={16} />
              平均正确率
            </div>
            <div className="text-3xl font-bold text-green-600">
              {userStats.totalSessions > 0
                ? `${Math.round(userStats.averageAccuracy * 100)}%`
                : '—'}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 card-shadow">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
              <BarChart2 size={16} />
              累计得分
            </div>
            <div className="text-3xl font-bold text-primary-600">
              {userStats.totalScore}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 card-shadow">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
              <Calendar size={16} />
              最近训练
            </div>
            <div className="text-xl font-bold text-gray-800">
              {userStats.lastPlayedAt
                ? formatDate(userStats.lastPlayedAt).split(' ')[0]
                : '暂无'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-5 card-shadow">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-primary-500" />
                训练趋势
              </h3>
              {chartData.length < 2 ? (
                <div className="h-64 flex items-center justify-center text-gray-400">
                  至少完成 2 次训练后显示趋势图
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="得分"
                        stroke="#F5A623"
                        strokeWidth={2}
                        dot={{ fill: '#F5A623', r: 4 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="正确率"
                        stroke="#4CAF50"
                        strokeWidth={2}
                        dot={{ fill: '#4CAF50', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-5 card-shadow">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Clock size={18} className="text-primary-500" />
                最近训练记录
              </h3>
              <div className="space-y-2">
                {recentSessions.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    暂无训练记录
                  </div>
                ) : (
                  recentSessions.map((session) => {
                    const block = blocks.find((b) => b.id === session.blockId);
                    const grade = calculateGrade(session.accuracy);
                    const gradeColors: Record<string, string> = {
                      S: 'text-yellow-500 bg-yellow-50',
                      A: 'text-green-500 bg-green-50',
                      B: 'text-blue-500 bg-blue-50',
                      C: 'text-orange-500 bg-orange-50',
                      D: 'text-red-500 bg-red-50',
                    };

                    return (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => navigate(`/result/${session.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${gradeColors[grade]}`}>
                            {grade}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">
                              {block?.name || '未知街区'}
                            </div>
                            <div className="text-xs text-gray-400">
                              {formatDate(session.endTime)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-primary-600">
                            {session.score} 分
                          </div>
                          <div className="text-xs text-gray-400">
                            正确率 {Math.round(session.accuracy * 100)}%
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 card-shadow">
              <h3 className="font-semibold text-gray-800 mb-4">薄弱类型分析</h3>
              {weakTypes.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">
                  多训练几次来分析薄弱类型
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={weakTypes.slice(0, 6).map((wt) => ({
                        name: OBSTACLE_TYPE_LABELS[wt.type as keyof typeof OBSTACLE_TYPE_LABELS] || wt.type,
                        错误率: Math.round(wt.errorRate * 100),
                      }))}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={80}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip />
                      <Bar dataKey="错误率" fill="#FF9800" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-5 card-shadow">
              <h3 className="font-semibold text-gray-800 mb-4">各街区表现</h3>
              <div className="space-y-3">
                {blocks.map((block) => {
                  const stat = userStats.blockStats[block.id];
                  return (
                    <div
                      key={block.id}
                      className={`p-3 rounded-xl cursor-pointer transition-colors ${
                        selectedBlockId === block.id
                          ? 'bg-primary-50 border border-primary-200'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() =>
                        setSelectedBlockId(selectedBlockId === block.id ? null : block.id)
                      }
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-800 text-sm">
                          {block.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {stat?.playCount || 0} 次
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${(stat?.bestAccuracy || 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-green-600 font-medium">
                          {stat ? `${Math.round(stat.bestAccuracy * 100)}%` : '—'}
                        </span>
                      </div>
                      {stat && (
                        <div className="text-xs text-gray-400 mt-1">
                          最佳 {stat.bestScore} 分
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
