import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Target, TrendingUp, Award, ChevronRight,
  Sparkles, AlertCircle, CheckCircle2, Lightbulb,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { leaderApi, caseApi } from '../api/client';
import type { TrainingCase, Stats } from '../types';
import { cn, formatDate } from '../utils';

const STATUSES = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '进行中' },
  { key: 'completed', label: '已完成' },
] as const;

type FilterStatus = typeof STATUSES[number]['key'];

export default function TrainingCenter() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [cases, setCases] = useState<TrainingCase[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [casesRes, statsRes] = await Promise.all([
        leaderApi.getTrainingCases(),
        leaderApi.getStats(),
      ]);
      setCases(casesRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to load training data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = cases.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'active') return !c.isCompleted;
    return c.isCompleted;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const activeCount = cases.filter(c => !c.isCompleted).length;
  const completedCount = cases.filter(c => c.isCompleted).length;
  const avgConfidenceImprovement = cases.length > 0
    ? Math.round(cases.reduce((sum, c) => sum + (c.confidenceImprovement || 0), 0) / cases.length * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(user?.role === 'leader' ? '/leader' : '/')}
          className="text-gray-600 hover:text-gray-800"
        >
          返回首页
        </button>
        {user?.role === 'leader' && (
          <button
            onClick={() => navigate('/leader/low-confidence')}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors"
          >
            <AlertCircle className="w-5 h-5" />
            低置信案件
          </button>
        )}
      </div>

      {/* Title Banner */}
      <div className="bg-gradient-to-r from-accent-500 to-orange-500 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-8 h-8" />
          <h2 className="text-2xl font-bold">培训中心</h2>
        </div>
        <p className="text-accent-100">
          学习规范事故描述写法，提升查勘技能，降低案件退回率
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-accent-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{activeCount}</div>
              <div className="text-sm text-gray-500">待学习案例</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
              <Award className="w-6 h-6 text-success-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{completedCount}</div>
              <div className="text-sm text-gray-500">已完成学习</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">+{avgConfidenceImprovement}%</div>
              <div className="text-sm text-gray-500">平均置信度提升</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tips Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
            <Lightbulb className="w-6 h-6 text-yellow-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800 mb-2">规范事故描述写作要点</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-success-500 mt-0.5 flex-shrink-0" />
                <span>明确事故时间：精确到分钟，如"2024年1月15日14时30分"</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-success-500 mt-0.5 flex-shrink-0" />
                <span>明确事故地点：道路名称+具体位置，如"中关村大街与海淀路交叉口"</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-success-500 mt-0.5 flex-shrink-0" />
                <span>明确行驶方向：我方和对方车辆的行驶方向，如"我方由南向北直行"</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-success-500 mt-0.5 flex-shrink-0" />
                <span>明确损失部位：具体到部件，如"右前保险杠、右前大灯"</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-success-500 mt-0.5 flex-shrink-0" />
                <span>明确事故类型：追尾、变道、左转、逆行、闯红灯等</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-success-500 mt-0.5 flex-shrink-0" />
                <span>明确责任判断：有事实依据，如"对方变道未让行，全责"</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 flex gap-1.5">
        {STATUSES.map(status => (
          <button
            key={status.key}
            onClick={() => setFilter(status.key)}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
              filter === status.key
                ? "bg-primary-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            {status.label}
            <span className="ml-1 text-xs opacity-75">
              ({status.key === 'all' ? cases.length :
                status.key === 'active' ? activeCount : completedCount})
            </span>
          </button>
        ))}
      </div>

      {/* Case Library Button */}
      {user?.role === 'leader' && (
        <button
          onClick={() => navigate('/training/library')}
          className="w-full p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-primary-600" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-800">培训案例库</div>
              <div className="text-sm text-gray-500">管理所有培训案例，添加自定义案例</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      )}

      {/* Training Case List */}
      {filteredCases.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            {filter === 'active' ? '暂无待学习案例' :
             filter === 'completed' ? '暂无已完成案例' : '暂无培训案例'}
          </h3>
          <p className="text-gray-500">
            {filter === 'active' ? '所有案例都已学习完成！' :
             '组长会将低置信案件转换为培训案例'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCases.map((trainingCase, index) => (
            <motion.div
              key={trainingCase.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/training/${trainingCase.id}`)}
              className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    trainingCase.isCompleted
                      ? "bg-success-100"
                      : "bg-accent-100"
                  )}>
                    {trainingCase.isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-success-600" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-accent-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">
                      {trainingCase.sourcePlateNumber || '培训案例'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(trainingCase.createdAt)}
                    </div>
                  </div>
                </div>
                {trainingCase.confidenceImprovement && (
                  <div className="text-right">
                    <div className="text-lg font-bold text-success-600">
                      +{Math.round(trainingCase.confidenceImprovement * 100)}%
                    </div>
                    <div className="text-xs text-gray-400">置信度提升</div>
                  </div>
                )}
              </div>

              {/* Bad vs Good Preview */}
              <div className="space-y-2">
                <div className="p-3 bg-danger-50 rounded-lg border border-danger-100">
                  <div className="text-xs text-danger-600 font-medium mb-1">❌ 反面示例</div>
                  <p className="text-sm text-gray-700 line-clamp-2">{trainingCase.example?.bad}</p>
                </div>
                <div className="p-3 bg-success-50 rounded-lg border border-success-100">
                  <div className="text-xs text-success-600 font-medium mb-1">✅ 正面示例</div>
                  <p className="text-sm text-gray-700 line-clamp-2">{trainingCase.example?.good}</p>
                </div>
              </div>

              {/* Improvements */}
              {trainingCase.improvements && trainingCase.improvements.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {trainingCase.improvements.slice(0, 3).map((imp, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded-full text-xs"
                    >
                      {imp}
                    </span>
                  ))}
                  {trainingCase.improvements.length > 3 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                      +{trainingCase.improvements.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Status Badge */}
              <div className="mt-4 flex items-center justify-between">
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium",
                  trainingCase.isCompleted
                    ? "bg-success-100 text-success-700"
                    : "bg-accent-100 text-accent-700"
                )}>
                  {trainingCase.isCompleted ? '已完成学习' : '待学习'}
                </span>
                <div className="flex items-center gap-1 text-primary-600 text-sm">
                  学习详情 <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
