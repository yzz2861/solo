import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart3, BookOpen, Target, TrendingUp, RotateCcw } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAppStore } from '@/store/useAppStore';
import { ERROR_CATEGORY_LABELS } from '@/types';
import { SCENARIO_TYPE_COLORS } from '@/utils/constants';
import { formatRelativeTime, formatCurrency } from '@/utils/formatters';
import type { ErrorCategory, AnswerRecord } from '@/types';
import { getLocalStorage } from '@/hooks/useLocalStorage';
import { STORAGE_KEYS } from '@/utils/constants';
import type { StaffStats } from '@/types';

const CATEGORY_ORDER: ErrorCategory[] = [
  'full_reduction',
  'discount',
  'points',
  'stacking',
  'exchange',
  'partial_refund',
  'damaged_coupon',
  'group_order',
  'change',
  'basic',
];

const CATEGORY_COLORS: Record<ErrorCategory, string> = {
  full_reduction: 'bg-peach-500',
  discount: 'bg-matcha-500',
  points: 'bg-blue-500',
  stacking: 'bg-purple-500',
  exchange: 'bg-orange-500',
  partial_refund: 'bg-red-500',
  damaged_coupon: 'bg-rose-500',
  group_order: 'bg-indigo-500',
  change: 'bg-teal-500',
  basic: 'bg-caramel-500',
};

export default function Records() {
  const { staffId } = useParams<{ staffId: string }>();
  const navigate = useNavigate();
  const { currentStaff, loadRecords, selectStaff, loadStaffList, replayScenario } = useAppStore();
  const [activeCategory, setActiveCategory] = useState<ErrorCategory | 'all'>('all');
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [stats, setStats] = useState<StaffStats | null>(null);

  useEffect(() => {
    if (staffId) {
      loadStaffList();
      selectStaff(staffId);
      loadRecords(staffId);
      
      const savedRecords = getLocalStorage<AnswerRecord[]>(
        `${STORAGE_KEYS.RECORDS_PREFIX}${staffId}`,
        []
      );
      const savedStats = getLocalStorage<StaffStats>(
        `${STORAGE_KEYS.STATS_PREFIX}${staffId}`,
        null
      );
      setRecords(savedRecords);
      setStats(savedStats);
    }
  }, [staffId, loadStaffList, selectStaff, loadRecords]);

  const filteredRecords = activeCategory === 'all'
    ? records
    : records.filter(r => r.errorType === activeCategory);

  const wrongRecords = records.filter(r => !r.isCorrect);

  const handleReplay = (scenarioId: string) => {
    if (staffId) {
      replayScenario(scenarioId, staffId);
      navigate(`/practice/${staffId}`);
    }
  };

  const getCategoryStats = () => {
    if (!stats) return [];
    return CATEGORY_ORDER.map(cat => ({
      category: cat,
      count: stats.errorByType[cat] || 0,
    })).filter(c => c.count > 0);
  };

  const categoryStats = getCategoryStats();
  const maxCount = Math.max(...categoryStats.map(c => c.count), 1);

  return (
    <Layout title={`${currentStaff?.name || ''}的练习记录`}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="grid grid-cols-3 gap-4 animate-fade-in">
          <div className="bg-white rounded-xl p-4 card-shadow text-center">
            <Target className="w-6 h-6 text-primary-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-caramel-800">
              {stats?.totalPractice || 0}
            </p>
            <p className="text-xs text-caramel-500">总练习次数</p>
          </div>
          <div className="bg-white rounded-xl p-4 card-shadow text-center animate-fade-in delay-100">
            <TrendingUp className="w-6 h-6 text-matcha-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-matcha-600">
              {stats?.accuracy || 0}%
            </p>
            <p className="text-xs text-caramel-500">正确率</p>
          </div>
          <div className="bg-white rounded-xl p-4 card-shadow text-center animate-fade-in delay-200">
            <BookOpen className="w-6 h-6 text-peach-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-peach-600">
              {wrongRecords.length}
            </p>
            <p className="text-xs text-caramel-500">待复习错题</p>
          </div>
        </div>

        {categoryStats.length > 0 && (
          <div className="bg-white rounded-xl p-5 card-shadow animate-fade-in delay-300">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-caramel-500" />
              <h3 className="font-bold text-caramel-700">错误类型分布</h3>
            </div>
            <div className="space-y-3">
              {categoryStats.map(({ category, count }) => (
                <div key={category} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-caramel-700">
                      {ERROR_CATEGORY_LABELS[category]}
                    </span>
                    <span className="font-semibold text-caramel-800">{count}次</span>
                  </div>
                  <div className="h-2 bg-primary-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${CATEGORY_COLORS[category]} rounded-full transition-all duration-500`}
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 animate-fade-in delay-400">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategory === 'all'
                ? 'bg-primary-500 text-white'
                : 'bg-white text-caramel-600 hover:bg-primary-50'
            }`}
          >
            全部 ({records.length})
          </button>
          {CATEGORY_ORDER.filter(cat => 
            stats?.errorByType && stats.errorByType[cat] > 0
          ).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? `${CATEGORY_COLORS[cat]} text-white`
                  : 'bg-white text-caramel-600 hover:bg-primary-50'
              }`}
            >
              {ERROR_CATEGORY_LABELS[cat]} ({stats?.errorByType?.[cat] || 0})
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl card-shadow animate-fade-in">
              <p className="text-caramel-500">暂无练习记录</p>
              <button
                onClick={() => navigate(`/practice/${staffId}`)}
                className="mt-4 px-6 py-2 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
              >
                开始练习
              </button>
            </div>
          ) : (
            filteredRecords
              .sort((a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime())
              .map((record, index) => (
                <div
                  key={`${record.scenarioId}-${index}`}
                  className="bg-white rounded-xl p-4 card-shadow animate-fade-in"
                  style={{ animationDelay: `${index * 50 + 500}ms` }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${SCENARIO_TYPE_COLORS[record.scenario.type]}`}>
                          {record.scenario.typeLabel}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          record.isCorrect 
                            ? 'bg-matcha-100 text-matcha-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {record.isCorrect ? '✓ 正确' : '✗ 错误'}
                        </span>
                        {record.errorType && (
                          <span className="text-xs text-caramel-500">
                            {ERROR_CATEGORY_LABELS[record.errorType]}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-caramel-700 mb-2">
                        {record.scenario.cartItems
                          .map(i => `${i.product.emoji}${i.product.name}×${i.quantity}`)
                          .join('、')}
                      </p>
                      <div className="flex gap-4 text-xs text-caramel-500">
                        <span>应收: {formatCurrency(record.scenario.finalTotal)}</span>
                        {record.scenario.payment.method === 'cash' && (
                          <span>找零: {formatCurrency(record.scenario.changeAmount)}</span>
                        )}
                        {record.scenario.refundAmount > 0 && (
                          <span>退款: {formatCurrency(record.scenario.refundAmount)}</span>
                        )}
                      </div>
                      <p className="text-xs text-caramel-400 mt-2">
                        {formatRelativeTime(record.attemptedAt)} · 已尝试{record.attempts}次
                      </p>
                    </div>
                    {!record.isCorrect && (
                      <button
                        onClick={() => handleReplay(record.scenarioId)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-peach-100 text-peach-700 rounded-lg text-sm font-medium hover:bg-peach-200 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        重做
                      </button>
                    )}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </Layout>
  );
}
