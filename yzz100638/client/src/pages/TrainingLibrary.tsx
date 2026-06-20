import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, BookOpen, Plus, Search, Filter, Trash2,
  Edit3, AlertCircle, Check, X, Clock, Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { leaderApi } from '../api/client';
import type { TrainingCase } from '../types';
import { cn, formatDateTime, formatDate } from '../utils';

const CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'time', label: '时间模糊' },
  { key: 'location', label: '地点模糊' },
  { key: 'direction', label: '方向模糊' },
  { key: 'parts', label: '部位模糊' },
  { key: 'multi-vehicle', label: '多车事故' },
  { key: 'conflict', label: '描述冲突' },
  { key: 'liability', label: '责任不明' },
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];

export default function TrainingLibrary() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [cases, setCases] = useState<TrainingCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    sourcePlateNumber: '',
    bad: '',
    good: '',
    explanation: '',
    improvements: [] as string[],
    newImprovement: '',
    category: 'time' as CategoryKey,
    confidenceImprovement: 0.3,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    setLoading(true);
    try {
      const response = await leaderApi.getTrainingCases();
      setCases(response.data);
    } catch (error) {
      console.error('Failed to load training cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = cases.filter(c => {
    const matchesSearch = searchQuery === '' ||
      c.sourcePlateNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.example?.bad.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.example?.good.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const addImprovement = () => {
    if (formData.newImprovement.trim()) {
      setFormData(prev => ({
        ...prev,
        improvements: [...prev.improvements, prev.newImprovement.trim()],
        newImprovement: '',
      }));
    }
  };

  const removeImprovement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      improvements: prev.improvements.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.bad || !formData.good || formData.improvements.length === 0 || !user) return;

    setSubmitting(true);
    try {
      await leaderApi.createTrainingCase({
        sourcePlateNumber: formData.sourcePlateNumber,
        example: {
          bad: formData.bad,
          good: formData.good,
          explanation: formData.explanation,
        },
        improvements: formData.improvements,
        confidenceImprovement: formData.confidenceImprovement,
        category: formData.category,
        createdBy: user.id,
      });
      setShowAddModal(false);
      resetForm();
      loadCases();
    } catch (error) {
      console.error('Failed to create training case:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      sourcePlateNumber: '',
      bad: '',
      good: '',
      explanation: '',
      improvements: [],
      newImprovement: '',
      category: 'time',
      confidenceImprovement: 0.3,
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await leaderApi.deleteTrainingCase(id);
      setDeleteConfirm(null);
      loadCases();
    } catch (error) {
      console.error('Failed to delete training case:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/training')}
          className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          返回培训中心
        </button>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          新增培训案例
        </button>
      </div>

      {/* Title */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-8 h-8" />
          <h2 className="text-2xl font-bold">培训案例库</h2>
        </div>
        <p className="text-indigo-100">
          管理所有培训案例，添加自定义案例，规范查勘员描述写法
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索车牌号、描述内容..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-primary-500 focus:ring-0 outline-none"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          {CATEGORIES.slice(0, 5).map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                activeCategory === cat.key
                  ? "bg-primary-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="总案例数" value={cases.length} icon={BookOpen} color="bg-primary-500" />
        <StatCard label="待学习" value={cases.filter(c => !c.isCompleted).length} icon={Clock} color="bg-orange-500" />
        <StatCard label="已完成" value={cases.filter(c => c.isCompleted).length} icon={Check} color="bg-success-500" />
        <StatCard
          label="平均提升"
          value={`+${cases.length > 0 ? Math.round(cases.reduce((s, c) => s + (c.confidenceImprovement || 0), 0) / cases.length * 100) : 0}%`}
          icon={Sparkles}
          color="bg-accent-500"
        />
      </div>

      {/* Case List */}
      {filteredCases.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">暂无培训案例</h3>
          <p className="text-gray-500 mb-4">点击右上角按钮添加新的培训案例</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            新增案例
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCases.map((trainingCase, index) => (
            <motion.div
              key={trainingCase.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      trainingCase.isCompleted ? "bg-success-100" : "bg-primary-100"
                    )}>
                      {trainingCase.isCompleted ? (
                        <Check className="w-5 h-5 text-success-600" />
                      ) : (
                        <BookOpen className="w-5 h-5 text-primary-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">
                        {trainingCase.sourcePlateNumber || '自定义案例'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDateTime(trainingCase.createdAt)}
                        {trainingCase.confidenceImprovement && (
                          <span className="ml-2 text-success-600 font-medium">
                            +{Math.round(trainingCase.confidenceImprovement * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                    {trainingCase.category && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                        {CATEGORIES.find(c => c.key === trainingCase.category)?.label || trainingCase.category}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-danger-50 rounded-lg border border-danger-100">
                      <div className="text-xs text-danger-600 font-medium mb-1">❌ 反面示例</div>
                      <p className="text-sm text-gray-700 line-clamp-2">{trainingCase.example?.bad}</p>
                    </div>
                    <div className="p-3 bg-success-50 rounded-lg border border-success-100">
                      <div className="text-xs text-success-600 font-medium mb-1">✅ 正面示例</div>
                      <p className="text-sm text-gray-700 line-clamp-2">{trainingCase.example?.good}</p>
                    </div>
                  </div>

                  {trainingCase.improvements && trainingCase.improvements.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {trainingCase.improvements.slice(0, 4).map((imp, i) => (
                        <span key={i} className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs">
                          {imp}
                        </span>
                      ))}
                      {trainingCase.improvements.length > 4 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          +{trainingCase.improvements.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => navigate(`/training/${trainingCase.id}`)}
                    className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                  {deleteConfirm === trainingCase.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(trainingCase.id)}
                        className="p-2 bg-danger-500 text-white rounded-lg hover:bg-danger-600"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(trainingCase.id)}
                      className="p-2 text-gray-500 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">新增培训案例</h3>
                <button
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Plate Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  车牌号（选填）
                </label>
                <input
                  type="text"
                  value={formData.sourcePlateNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, sourcePlateNumber: e.target.value }))}
                  placeholder="例如：京A12345"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-0 outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  案例分类
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.slice(1).map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => setFormData(prev => ({ ...prev, category: cat.key }))}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm transition-all",
                        formData.category === cat.key
                          ? "bg-primary-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bad Example */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-danger-600">
                  ❌ 反面示例（必填）
                </label>
                <textarea
                  value={formData.bad}
                  onChange={(e) => setFormData(prev => ({ ...prev, bad: e.target.value }))}
                  rows={3}
                  placeholder="输入不规范的原始描述..."
                  className="w-full px-4 py-3 border-2 border-danger-200 rounded-xl focus:border-danger-500 focus:ring-0 outline-none resize-none bg-danger-50"
                />
              </div>

              {/* Good Example */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-success-600">
                  ✅ 正面示例（必填）
                </label>
                <textarea
                  value={formData.good}
                  onChange={(e) => setFormData(prev => ({ ...prev, good: e.target.value }))}
                  rows={4}
                  placeholder="输入规范的标准描述..."
                  className="w-full px-4 py-3 border-2 border-success-200 rounded-xl focus:border-success-500 focus:ring-0 outline-none resize-none bg-success-50"
                />
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  示例说明
                </label>
                <textarea
                  value={formData.explanation}
                  onChange={(e) => setFormData(prev => ({ ...prev, explanation: e.target.value }))}
                  rows={3}
                  placeholder="解释为什么正面示例更好..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-0 outline-none resize-none"
                />
              </div>

              {/* Improvements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  改进要点（至少1条）
                </label>
                <div className="space-y-2 mb-3">
                  {formData.improvements.map((imp, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-primary-50 rounded-lg">
                      <Check className="w-4 h-4 text-primary-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700 flex-1">{imp}</span>
                      <button
                        onClick={() => removeImprovement(i)}
                        className="p-1 text-gray-400 hover:text-danger-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.newImprovement}
                    onChange={(e) => setFormData(prev => ({ ...prev, newImprovement: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImprovement())}
                    placeholder="添加改进要点..."
                    className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0 outline-none text-sm"
                  />
                  <button
                    onClick={addImprovement}
                    className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
                  >
                    添加
                  </button>
                </div>
              </div>

              {/* Confidence Improvement */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  置信度提升：{Math.round(formData.confidenceImprovement * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.6"
                  step="0.05"
                  value={formData.confidenceImprovement}
                  onChange={(e) => setFormData(prev => ({ ...prev, confidenceImprovement: parseFloat(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="flex-1 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !formData.bad || !formData.good || formData.improvements.length === 0}
                className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    创建中...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    创建案例
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-xl font-bold text-gray-800">{value}</div>
          <div className="text-xs text-gray-500">{label}</div>
        </div>
      </div>
    </div>
  );
}
