import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  BarChart3,
  MapPin,
  TrendingDown,
  AlertTriangle,
  Target,
  Download,
  Settings,
} from 'lucide-react';
import { useBlockStore } from '../../store/blockStore';
import { useStatsStore } from '../../store/statsStore';
import { OBSTACLE_TYPE_LABELS } from '../../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['#F5A623', '#2C5F6B', '#4CAF50', '#E53935', '#9C27B0', '#FF9800', '#2196F3'];

export default function TeacherStatsPage() {
  const navigate = useNavigate();
  const { blocks } = useBlockStore();
  const { sessions, userStats, getWeakTypes, getSessionsByBlock } = useStatsStore();
  const [sortBy, setSortBy] = useState<'errorRate' | 'playCount' | 'missRate'>('errorRate');

  const weakTypes = getWeakTypes();

  const blockStatsData = useMemo(() => {
    return blocks
      .map((block) => {
        const blockSessions = getSessionsByBlock(block.id);
        const totalSessions = blockSessions.length;

        if (totalSessions === 0) {
          return {
            id: block.id,
            name: block.name,
            playCount: 0,
            avgAccuracy: 0,
            avgMissRate: 0,
            avgFalsePositiveRate: 0,
            totalObstacles: block.obstacles.filter((o) => !o.isFalsePositive).length,
          };
        }

        const avgAccuracy =
          blockSessions.reduce((sum, s) => sum + s.accuracy, 0) / totalSessions;
        const avgMissRate =
          blockSessions.reduce(
            (sum, s) => sum + s.missedCount / Math.max(1, s.totalObstacles),
            0
          ) / totalSessions;
        const avgFalsePositiveRate =
          blockSessions.reduce((sum, s) => sum + s.falsePositiveCount, 0) / totalSessions;

        return {
          id: block.id,
          name: block.name,
          playCount: totalSessions,
          avgAccuracy,
          avgMissRate,
          avgFalsePositiveRate,
          errorRate: 1 - avgAccuracy,
          totalObstacles: block.obstacles.filter((o) => !o.isFalsePositive).length,
        };
      })
      .sort((a, b) => {
        if (sortBy === 'errorRate') return b.errorRate - a.errorRate;
        if (sortBy === 'missRate') return b.avgMissRate - a.avgMissRate;
        return b.playCount - a.playCount;
      });
  }, [blocks, sessions, sortBy, getSessionsByBlock]);

  const segmentData = useMemo(() => {
    const allSegments: { blockId: string; blockName: string; segmentId: string; segmentName: string; errorCount: number; totalCount: number; errorRate: number }[] = [];

    blocks.forEach((block) => {
      if (!block.segments) return;

      const segmentStats: Record<string, { errors: number; total: number }> = {};
      block.segments.forEach((seg) => {
        segmentStats[seg.id] = { errors: 0, total: 0 };
      });

      const blockSessions = getSessionsByBlock(block.id);
      blockSessions.forEach((session) => {
        session.clickRecords.forEach((record) => {
          const obstacle = block.obstacles.find((o) => o.id === record.obstacleId);
          if (obstacle?.segmentId && segmentStats[obstacle.segmentId]) {
            segmentStats[obstacle.segmentId].total += 1;
            if (!record.isCorrect) {
              segmentStats[obstacle.segmentId].errors += 1;
            }
          }
        });
      });

      block.segments.forEach((seg) => {
        const stat = segmentStats[seg.id];
        if (stat.total > 0) {
          allSegments.push({
            blockId: block.id,
            blockName: block.name,
            segmentId: seg.id,
            segmentName: seg.name,
            errorCount: stat.errors,
            totalCount: stat.total,
            errorRate: stat.errors / stat.total,
          });
        }
      });
    });

    return allSegments.sort((a, b) => b.errorRate - a.errorRate).slice(0, 10);
  }, [blocks, getSessionsByBlock]);

  const pieData = useMemo(() => {
    return weakTypes.slice(0, 6).map((wt) => ({
      name: OBSTACLE_TYPE_LABELS[wt.type as keyof typeof OBSTACLE_TYPE_LABELS] || wt.type,
      value: Math.round(wt.errorRate * 100),
    }));
  }, [weakTypes]);

  const totalTrainings = sessions.length;
  const avgAccuracy = userStats.averageAccuracy;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft size={22} />
            </button>
            <div>
              <h1 className="font-semibold text-lg text-gray-800">统计分析</h1>
              <p className="text-xs text-gray-500">按街区和路段统计错漏情况</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/teacher/blocks')}
              className="btn btn-ghost text-sm"
            >
              <Settings size={16} />
              街区管理
            </button>
            <button className="btn btn-outline text-sm">
              <Download size={16} />
              导出数据
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 card-shadow">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
              <Target size={16} />
              总训练次数
            </div>
            <div className="text-3xl font-bold text-gray-800">{totalTrainings}</div>
          </div>
          <div className="bg-white rounded-xl p-4 card-shadow">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
              <BarChart3 size={16} />
              平均正确率
            </div>
            <div className="text-3xl font-bold text-green-600">
              {totalTrainings > 0 ? `${Math.round(avgAccuracy * 100)}%` : '—'}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 card-shadow">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
              <MapPin size={16} />
              街区数量
            </div>
            <div className="text-3xl font-bold text-primary-600">{blocks.length}</div>
          </div>
          <div className="bg-white rounded-xl p-4 card-shadow">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
              <TrendingDown size={16} />
              薄弱类型
            </div>
            <div className="text-xl font-bold text-orange-500">
              {weakTypes.length > 0
                ? OBSTACLE_TYPE_LABELS[weakTypes[0].type as keyof typeof OBSTACLE_TYPE_LABELS] || weakTypes[0].type
                : '—'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 card-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <MapPin size={18} className="text-primary-500" />
                各街区错漏率
              </h3>
              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => setSortBy('errorRate')}
                  className={`px-3 py-1 rounded-full ${
                    sortBy === 'errorRate'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  按错误率
                </button>
                <button
                  onClick={() => setSortBy('missRate')}
                  className={`px-3 py-1 rounded-full ${
                    sortBy === 'missRate'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  按漏检率
                </button>
                <button
                  onClick={() => setSortBy('playCount')}
                  className={`px-3 py-1 rounded-full ${
                    sortBy === 'playCount'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  按练习次数
                </button>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={blockStatsData.map((b) => ({
                    name: b.name,
                    错误率: Math.round(b.errorRate * 100),
                    漏检率: Math.round(b.avgMissRate * 100),
                    误报率: Math.round(b.avgFalsePositiveRate * 10),
                  }))}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="错误率" fill="#E53935" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="漏检率" fill="#FF9800" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="误报率" fill="#2196F3" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 card-shadow">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              薄弱类型分布
            </h3>
            {pieData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                暂无数据
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-2 space-y-1">
              {weakTypes.slice(0, 4).map((wt, index) => (
                <div key={wt.type} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-gray-600">
                      {OBSTACLE_TYPE_LABELS[wt.type as keyof typeof OBSTACLE_TYPE_LABELS] ||
                        wt.type}
                    </span>
                  </div>
                  <span className="font-medium text-gray-800">
                    {Math.round(wt.errorRate * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 card-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <TrendingDown size={18} className="text-red-500" />
              薄弱路段排名
            </h3>
            <span className="text-sm text-gray-500">
              建议下次实地巡查从这些路段开始
            </span>
          </div>

          {segmentData.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <AlertTriangle size={40} className="mx-auto mb-3 opacity-50" />
              <p>多训练几次后会显示薄弱路段分析</p>
            </div>
          ) : (
            <div className="space-y-3">
              {segmentData.map((seg, index) => (
                <div
                  key={`${seg.blockId}-${seg.segmentId}`}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                      index === 0
                        ? 'bg-red-500'
                        : index === 1
                        ? 'bg-orange-500'
                        : index === 2
                        ? 'bg-yellow-500'
                        : 'bg-gray-400'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{seg.segmentName}</span>
                      <span className="text-xs text-gray-400">· {seg.blockName}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span>错误 {seg.errorCount} 次</span>
                      <span>共 {seg.totalCount} 次练习</span>
                    </div>
                  </div>
                  <div className="w-32">
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${seg.errorRate * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-lg font-bold text-red-500 w-16 text-right">
                    {Math.round(seg.errorRate * 100)}%
                  </div>
                  <button
                    className="btn btn-ghost text-sm py-1 px-3"
                    onClick={() => navigate(`/game/${seg.blockId}`)}
                  >
                    强化训练
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 bg-white rounded-2xl p-5 card-shadow">
          <h3 className="font-semibold text-gray-800 mb-4">街区详细数据</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="py-3 px-2 font-medium">街区名称</th>
                  <th className="py-3 px-2 font-medium">练习次数</th>
                  <th className="py-3 px-2 font-medium">平均正确率</th>
                  <th className="py-3 px-2 font-medium">平均漏检率</th>
                  <th className="py-3 px-2 font-medium">平均误报数</th>
                  <th className="py-3 px-2 font-medium">最佳得分</th>
                  <th className="py-3 px-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {blockStatsData.map((block) => (
                  <tr
                    key={block.id}
                    className="border-b border-gray-50 hover:bg-gray-50"
                  >
                    <td className="py-3 px-2 font-medium text-gray-800">
                      {block.name}
                    </td>
                    <td className="py-3 px-2 text-gray-600">{block.playCount}</td>
                    <td className="py-3 px-2">
                      <span
                        className={`font-medium ${
                          block.avgAccuracy >= 0.8
                            ? 'text-green-600'
                            : block.avgAccuracy >= 0.6
                            ? 'text-yellow-600'
                            : 'text-red-500'
                        }`}
                      >
                        {block.playCount > 0
                          ? `${Math.round(block.avgAccuracy * 100)}%`
                          : '—'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-orange-500">
                      {block.playCount > 0
                        ? `${Math.round(block.avgMissRate * 100)}%`
                        : '—'}
                    </td>
                    <td className="py-3 px-2 text-blue-500">
                      {block.playCount > 0 ? block.avgFalsePositiveRate.toFixed(1) : '—'}
                    </td>
                    <td className="py-3 px-2 font-medium text-primary-600">
                      {userStats.blockStats[block.id]?.bestScore || '—'}
                    </td>
                    <td className="py-3 px-2">
                      <button
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        onClick={() => navigate(`/game/${block.id}`)}
                      >
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
