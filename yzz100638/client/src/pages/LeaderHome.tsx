import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, Users, FileText, AlertTriangle, CheckCircle,
  Target, BookOpen, ArrowRight, TrendingDown,
} from 'lucide-react';
import { leaderApi, caseApi } from '../api/client';
import type { Stats, LeaderboardItem, Case } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { cn, formatDate } from '../utils';

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280',
  confirmed: '#10b981',
  'reshoot-pending': '#f59e0b',
  'reshoot-completed': '#3b82f6',
};

export default function LeaderHome() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [recentCases, setRecentCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, leaderboardRes, casesRes, lowConfRes] = await Promise.all([
        leaderApi.getStats(),
        leaderApi.getLeaderboard(),
        caseApi.list(),
        leaderApi.getLowConfidenceCases({ limit: 5 }),
      ]);
      setStats(statsRes.data);
      setLeaderboard(leaderboardRes.data);
      setRecentCases(casesRes.data.slice(0, 5));
    } catch (error) {
      console.error('Failed to load leader data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const statusData = stats?.statusCounts
    ? Object.entries(stats.statusCounts).map(([name, value]) => ({
        name: name === 'draft' ? '草稿' :
              name === 'confirmed' ? '已确认' :
              name === 'reshoot-pending' ? '待补拍' : '补拍完成',
        value,
      }))
    : [];

  const confidenceData = [
    { name: '高置信', value: stats?.highConfidenceCount || 0, color: '#10b981' },
    { name: '低置信', value: stats?.lowConfidenceCount || 0, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">组长工作台</h2>
        <p className="text-primary-100">
          团队数据概览与低置信案件管理
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label="总案件数"
          value={stats?.totalCases || 0}
          color="bg-primary-500"
        />
        <StatCard
          icon={CheckCircle}
          label="高置信案件"
          value={stats?.highConfidenceCount || 0}
          color="bg-success-500"
        />
        <StatCard
          icon={AlertTriangle}
          label="低置信案件"
          value={stats?.lowConfidenceCount || 0}
          color="bg-danger-500"
          onClick={() => navigate('/leader/low-confidence')}
        />
        <StatCard
          icon={TrendingUp}
          label="平均置信度"
          value={`${Math.round((stats?.avgConfidence || 0) * 100)}%`}
          color="bg-accent-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">案件状态分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[Object.keys(stats?.statusCounts || {})[index]]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confidence Distribution */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">置信度分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={confidenceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {confidenceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Lower Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-accent-500" />
              查勘员排行
            </h3>
            <button
              onClick={() => navigate('/leader/low-confidence')}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              查看更多
            </button>
          </div>
          <div className="space-y-3">
            {leaderboard.slice(0, 5).map((item, index) => (
              <div key={item.userId} className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                  index === 0 ? 'bg-yellow-100 text-yellow-600' :
                  index === 1 ? 'bg-gray-100 text-gray-600' :
                  'bg-orange-100 text-orange-600'
                )}>
                  {index + 1}
                </div>
                <span className="text-2xl">{item.avatar}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 text-sm truncate">
                    {item.userName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.totalCases} 件
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-primary-600 text-sm">
                    {Math.round(item.avgConfidence * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Cases */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-500" />
              最近案件
            </h3>
            <button
              onClick={() => navigate('/cases')}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              查看全部 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {recentCases.map((caseItem, index) => (
              <motion.div
                key={caseItem.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(`/cases/${caseItem.id}`)}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-800">{caseItem.plateNumber}</span>
                    {caseItem.confidenceScore < 0.7 && (
                      <span className="px-1.5 py-0.5 bg-danger-100 text-danger-600 rounded text-xs font-medium">
                        低置信
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {caseItem.originalDescription}
                  </p>
                </div>
                <div className="text-right">
                  <div className={cn(
                    'font-semibold',
                    caseItem.confidenceScore >= 0.7 ? 'text-success-600' :
                    caseItem.confidenceScore >= 0.5 ? 'text-warning-600' : 'text-danger-600'
                  )}>
                    {Math.round(caseItem.confidenceScore * 100)}%
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatDate(caseItem.createdAt)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/leader/low-confidence')}
          className="flex items-center gap-4 p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
        >
          <div className="w-14 h-14 bg-danger-100 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-danger-600" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold text-gray-800">低置信案件抽查</div>
            <div className="text-sm text-gray-500">抽查低置信案件，生成培训案例</div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-300" />
        </button>

        <button
          onClick={() => navigate('/training')}
          className="flex items-center gap-4 p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
        >
          <div className="w-14 h-14 bg-accent-100 rounded-xl flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-accent-600" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold text-gray-800">培训中心</div>
            <div className="text-sm text-gray-500">管理培训案例，提升查勘员技能</div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-300" />
        </button>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={cn(
        "bg-white rounded-xl border border-gray-100 shadow-sm p-5",
        onClick && "cursor-pointer hover:shadow-md transition-all"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", color)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-800">{value}</div>
          <div className="text-sm text-gray-500">{label}</div>
        </div>
      </div>
    </motion.div>
  );
}
