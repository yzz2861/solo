import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, AlertTriangle, Eye, FileText, BookOpen,
  AlertCircle, CheckCircle, Clock, MapPin, Navigation, Shield,
  Sparkles, X, Check,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { leaderApi } from '../api/client';
import type { Case, LowConfidenceFlag } from '../types';
import {
  cn,
  formatDateTime,
  getConfidenceColor,
  getConfidenceLabel,
} from '../utils';

export default function LowConfidenceCases() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [convertModal, setConvertModal] = useState(false);
  const [convertCaseId, setConvertCaseId] = useState<string | null>(null);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [newImprovement, setNewImprovement] = useState('');
  const [trainerNotes, setTrainerNotes] = useState('');
  const [badExample, setBadExample] = useState('');
  const [goodExample, setGoodExample] = useState('');
  const [exampleExplanation, setExampleExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    setLoading(true);
    try {
      const response = await leaderApi.getLowConfidenceCases();
      setCases(response.data);
    } catch (error) {
      console.error('Failed to load low confidence cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const openConvertModal = (caseItem: Case) => {
    setConvertCaseId(caseItem.id);
    setBadExample(caseItem.originalDescription);
    setGoodExample(caseItem.standardDescription);
    setImprovements(caseItem.lowConfidenceFlags.map(f => f.suggestion));
    setExampleExplanation(caseItem.lowConfidenceFlags.map(f => f.message).join('；'));
    setTrainerNotes('');
    setConvertModal(true);
  };

  const addImprovement = () => {
    if (newImprovement.trim()) {
      setImprovements([...improvements, newImprovement.trim()]);
      setNewImprovement('');
    }
  };

  const removeImprovement = (index: number) => {
    setImprovements(improvements.filter((_, i) => i !== index));
  };

  const handleConvertToTraining = async () => {
    if (!convertCaseId || !user) return;

    setSubmitting(true);
    try {
      await leaderApi.convertToTraining(convertCaseId, {
        improvements,
        example: {
          bad: badExample,
          good: goodExample,
          explanation: exampleExplanation,
        },
        trainerNotes,
        createdBy: user.id,
      });
      setConvertModal(false);
      loadCases();
    } catch (error) {
      console.error('Failed to convert to training case:', error);
    } finally {
      setSubmitting(false);
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
          onClick={() => navigate('/leader')}
          className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          返回组长首页
        </button>
        <button
          onClick={() => navigate('/training')}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-500 text-white rounded-xl hover:bg-accent-600 transition-colors"
        >
          <BookOpen className="w-5 h-5" />
          培训中心
        </button>
      </div>

      {/* Title */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="w-8 h-8" />
          <h2 className="text-2xl font-bold">低置信案件抽查</h2>
        </div>
        <p className="text-orange-100">
          共 {cases.length} 个低置信案件待抽查，可转换为培训案例
        </p>
      </div>

      {/* Case List */}
      {cases.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-success-300" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">暂无低置信案件</h3>
          <p className="text-gray-500">所有案件置信度都很高，继续保持！</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cases.map((caseItem, index) => (
            <motion.div
              key={caseItem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Case Header */}
              <div
                className="p-5 cursor-pointer"
                onClick={() => setSelectedCase(selectedCase === caseItem.id ? null : caseItem.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-800 text-lg">
                          {caseItem.plateNumber}
                        </span>
                        <span className={cn(
                          'font-bold',
                          getConfidenceColor(caseItem.confidenceScore)
                        )}>
                          {Math.round(caseItem.confidenceScore * 100)}%
                        </span>
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                          {getConfidenceLabel(caseItem.confidenceScore)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {caseItem.id} · {formatDateTime(caseItem.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/cases/${caseItem.id}`);
                      }}
                      className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openConvertModal(caseItem);
                      }}
                      className="flex items-center gap-1 px-3 py-2 bg-accent-500 text-white text-sm rounded-lg hover:bg-accent-600 transition-colors"
                    >
                      <BookOpen className="w-4 h-4" />
                      转培训案例
                    </button>
                  </div>
                </div>

                {/* Original Description */}
                <p className="mt-3 text-gray-600 bg-gray-50 p-3 rounded-lg text-sm">
                  {caseItem.originalDescription}
                </p>

                {/* Low Confidence Flags Preview */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {caseItem.lowConfidenceFlags.slice(0, 3).map((flag, i) => (
                    <span
                      key={i}
                      className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        flag.severity === 'high' ? "bg-danger-100 text-danger-700" :
                        flag.severity === 'medium' ? "bg-warning-100 text-warning-700" :
                        "bg-gray-100 text-gray-700"
                      )}>
                      {flag.message}
                    </span>
                  ))}
                  {caseItem.lowConfidenceFlags.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                      +{caseItem.lowConfidenceFlags.length - 3} 更多
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {selectedCase === caseItem.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-gray-100"
                  >
                    <div className="p-5 bg-gray-50 space-y-6">
                      {/* Standard Description */}
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary-500" />
                          标准事故经过
                        </h4>
                        <p className="text-gray-700 bg-primary-50 p-3 rounded-xl border border-primary-100 text-sm">
                          {caseItem.standardDescription}
                        </p>
                      </div>

                      {/* Key Info */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <DetailItem icon={Clock} label="事故时间" value={`${caseItem.accidentTime.date || '未提取'} ${caseItem.accidentTime.time || ''}`} isVague={caseItem.accidentTime.isVague} />
                        <DetailItem icon={MapPin} label="事故地点" value={caseItem.accidentLocation.road || '未提取'} isVague={caseItem.accidentLocation.isVague} />
                        <DetailItem icon={Navigation} label="行驶方向" value={`我方: ${caseItem.accidentDirection.ourDirection || '未知'}`} isVague={caseItem.accidentDirection.isVague} />
                        <DetailItem icon={Shield} label="责任判断" value={caseItem.liabilityClue.liability} />
                      </div>

                      {/* Low Confidence Flags Detail */}
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-3">低置信标记详情</h4>
                        <div className="space-y-2">
                          {caseItem.lowConfidenceFlags.map((flag, i) => (
                            <FlagCard key={i} flag={flag} />
                          ))}
                        </div>
                      </div>

                      {/* Vehicle Parts */}
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-3">损失部位</h4>
                        <div className="flex flex-wrap gap-2">
                          {caseItem.vehicleParts.map((part, i) => (
                            <span
                              key={i}
                              className={cn(
                                "px-3 py-1.5 rounded-full text-sm font-medium",
                                part.isEstimated
                                  ? "bg-warning-100 text-warning-700 border border-warning-200"
                                  : "bg-primary-100 text-primary-700 border border-primary-200"
                              )}
                            >
                              {part.zoneName} · {part.name}
                              {part.isEstimated && ' (推测)'}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => navigate(`/cases/${caseItem.id}`)}
                          className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <Eye className="w-5 h-5" />
                          查看完整详情
                        </button>
                        <button
                          onClick={() => openConvertModal(caseItem)}
                          className="flex-1 py-2.5 bg-accent-500 text-white rounded-xl hover:bg-accent-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <BookOpen className="w-5 h-5" />
                          转换为培训案例
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* Convert to Training Modal */}
      {convertModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">转换为培训案例</h3>
                <button
                  onClick={() => setConvertModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Bad Example */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-danger-600">
                  ❌ 反面示例（原始描述）
                </label>
                <textarea
                  value={badExample}
                  onChange={(e) => setBadExample(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-danger-200 rounded-xl focus:border-danger-500 focus:ring-0 outline-none resize-none bg-danger-50"
                />
              </div>

              {/* Good Example */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-success-600">
                  ✅ 正面示例（标准描述）
                </label>
                <textarea
                  value={goodExample}
                  onChange={(e) => setGoodExample(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-success-200 rounded-xl focus:border-success-500 focus:ring-0 outline-none resize-none bg-success-50"
                />
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  示例说明
                </label>
                <textarea
                  value={exampleExplanation}
                  onChange={(e) => setExampleExplanation(e.target.value)}
                  rows={3}
                  placeholder="解释为什么正面示例更好..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-0 outline-none resize-none"
                />
              </div>

              {/* Improvements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  改进要点
                </label>
                <div className="space-y-2 mb-3">
                  {improvements.map((imp, i) => (
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
                    value={newImprovement}
                    onChange={(e) => setNewImprovement(e.target.value)}
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

              {/* Trainer Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  培训备注
                </label>
                <textarea
                  value={trainerNotes}
                  onChange={(e) => setTrainerNotes(e.target.value)}
                  rows={3}
                  placeholder="输入培训备注说明..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-0 outline-none resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setConvertModal(false)}
                className="flex-1 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleConvertToTraining}
                disabled={submitting}
                className="flex-1 py-2.5 bg-accent-500 text-white rounded-xl hover:bg-accent-600 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    转换中...
                  </>
                ) : (
                  <>
                    <BookOpen className="w-5 h-5" />
                    确认转换
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

function DetailItem({
  icon: Icon,
  label,
  value,
  isVague = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  isVague?: boolean;
}) {
  return (
    <div className={cn(
      "p-3 rounded-lg border",
      isVague ? "bg-warning-50 border-warning-200" : "bg-white border-gray-100"
    )}>
      <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="font-medium text-gray-800 text-sm">{value || '-'}</div>
      {isVague && <div className="text-xs text-warning-600 mt-0.5">信息模糊</div>}
    </div>
  );
}

function FlagCard({ flag }: { flag: LowConfidenceFlag }) {
  return (
    <div className={cn(
      "p-3 rounded-lg border",
      flag.severity === 'high' ? "bg-danger-50 border-danger-200" :
      flag.severity === 'medium' ? "bg-warning-50 border-warning-200" :
      "bg-gray-50 border-gray-200"
    )}>
      <div className="flex items-start gap-3">
        <AlertCircle className={cn(
          "w-5 h-5 mt-0.5 flex-shrink-0",
          flag.severity === 'high' ? "text-danger-500" :
          flag.severity === 'medium' ? "text-warning-500" :
          "text-gray-500"
        )} />
        <div>
          <div className="font-medium text-gray-800">{flag.message}</div>
          <div className="text-sm text-gray-600 mt-1">💡 {flag.suggestion}</div>
        </div>
      </div>
    </div>
  );
}
