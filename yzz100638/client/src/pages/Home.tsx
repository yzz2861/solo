import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  PlusCircle,
  Camera,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  Target,
  ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { caseApi, leaderApi } from '../api/client';
import type { Case, Stats, LeaderboardItem } from '../types';
import {
  cn,
  formatDate,
  getConfidenceColor,
  getConfidenceLabel,
  getStatusLabel,
  getStatusColor,
} from '../utils';

export default function Home() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [recentCases, setRecentCases] = useState<Case[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [casesRes, statsRes, leaderboardRes] = await Promise.all([
        caseApi.list({ surveyorId: user.id }),
        leaderApi.getStats(),
        leaderApi.getLeaderboard(),
      ]);
      setRecentCases(casesRes.data.slice(0, 5));
      setStats(statsRes.data);
      setLeaderboard(leaderboardRes.data.slice(0, 3));
    } catch (error) {
      console.error('Failed to load home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      icon: PlusCircle,
      label: '新建案件',
      description: '导入描述，智能补全',
      color: 'bg-primary-500',
      to: '/cases/new',
    },
    {
      icon: FileText,
      label: '我的案件',
      description: '查看历史案件记录',
      color: 'bg-accent-500',
      to: '/cases',
    },
    {
      icon: Camera,
      label: '补拍回填',
      description: '处理待补拍任务',
      color: 'bg-success-500',
      to: '/reshoot',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              您好，{user?.name} 👋
            </h2>
            <p className="text-primary-100">
              {user?.role === 'leader' ? '今天有新的低置信案件等待您的抽查。' : '今天的查勘任务加油！规范描述，降低退回率。'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{formatDate(new Date())}</div>
            <div className="text-primary-200 text-sm">今日</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickActions.map((action, index) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => navigate(action.to)}
            className="flex items-center gap-4 p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group text-left"
          >
            <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center', action.color)}>
              <action.icon className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-800 flex items-center gap-2">
                {action.label}
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
              </div>
              <div className="text-sm text-gray-500">{action.description}</div>
            </div>
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={FileText}
              label="总案件数"
              value={stats?.totalCases || 0}
              color="text-primary-600"
              bgColor="bg-primary-50"
            />
            <StatCard
              icon={CheckCircle}
              label="高置信"
              value={stats?.highConfidenceCount || 0}
              color="text-success-600"
              bgColor="bg-success-50"
            />
            <StatCard
              icon={AlertTriangle}
              label="低置信"
              value={stats?.lowConfidenceCount || 0}
              color="text-danger-600"
              bgColor="bg-danger-50"
            />
            <StatCard
              icon={TrendingUp}
              label="平均置信"
              value={`${Math.round((stats?.avgConfidence || 0) * 100)}%`}
              color="text-accent-600"
              bgColor="bg-accent-50"
            />
          </div>

          {/* Recent Cases */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">最近案件</h3>
              <button
                onClick={() => navigate('/cases')}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                查看全部 <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {recentCases.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>暂无案件记录</p>
                <button
                  onClick={() => navigate('/cases/new')}
                  className="mt-3 text-primary-600 hover:text-primary-700 text-sm"
                >
                  创建第一个案件 →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCases.map((caseItem, index) => (
                  <motion.div
                    key={caseItem.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => navigate(`/cases/${caseItem.id}`)}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-800 truncate">
                          {caseItem.plateNumber}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          getStatusColor(caseItem.status)
                        )}>
                          {getStatusLabel(caseItem.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {caseItem.originalDescription}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={cn('font-semibold', getConfidenceColor(caseItem.confidenceScore))}>
                        {Math.round(caseItem.confidenceScore * 100)}%
                      </div>
                      <div className="text-xs text-gray-400">
                        {getConfidenceLabel(caseItem.confidenceScore)}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Leaderboard */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-accent-500" />
              <h3 className="font-semibold text-gray-800">查勘员排行</h3>
            </div>
            {leaderboard.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-sm">
                暂无排行数据
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((item, index) => (
                  <motion.div
                    key={item.userId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
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
                        {item.totalCases} 件 · 高置信 {item.highConfidenceCases} 件
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-primary-600 text-sm">
                        {Math.round(item.avgConfidence * 100)}%
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="bg-gradient-to-br from-accent-50 to-orange-50 rounded-xl border border-accent-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-accent-500" />
              <h3 className="font-semibold text-gray-800">查勘小贴士</h3>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-accent-500 mt-0.5">•</span>
                现场记录要包含时间、地点、方向、部位四要素
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent-500 mt-0.5">•</span>
                照片备注详细说明拍摄角度和部位
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent-500 mt-0.5">•</span>
                多车事故需明确每辆车的行驶方向
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  bgColor: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
    >
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', bgColor)}>
        <Icon className={cn('w-5 h-5', color)} />
      </div>
      <div className="text-2xl font-bold text-gray-800 mb-1">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </motion.div>
  );
}
