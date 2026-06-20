import { useState, useEffect } from 'react';8
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, BookOpen, CheckCircle2, AlertCircle, Lightbulb,
  MessageSquare, Clock, Check, X,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { leaderApi } from '../api/client';
import type { TrainingCase } from '../types';
import { cn, formatDateTime } from '../utils';

export default function TrainingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [trainingCase, setTrainingCase] = useState<TrainingCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [learnerNotes, setLearnerNotes] = useState('');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, boolean | null>>({});
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const QUIZ_QUESTIONS = [
    {
      question: '事故描述必须包含哪些基本要素？',
      options: ['时间、地点、方向、部位、类型、责任', '只有时间和地点', '只有部位和责任'],
      correctIndex: 0,
    },
    {
      question: '以下哪个是最规范的时间描述？',
      options: ['昨天下午', '2024年1月15日14时30分', '大概2点多'],
      correctIndex: 1,
    },
    {
      question: '方位词"前面"模糊的原因是？',
      options: ['没有说明相对哪个方向', '太具体了', '不够口语化'],
      correctIndex: 0,
    },
  ];

  useEffect(() => {
    if (id) {
      loadCase();
    }
  }, [id]);

  const loadCase = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await leaderApi.getTrainingCases();
      const found = response.data.find(c => c.id === id);
      setTrainingCase(found || null);
    } catch (error) {
      console.error('Failed to load training case:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizSelect = (questionIndex: number, answerIndex: number) => {
    if (quizSubmitted) return;
    setQuizAnswers({
      ...quizAnswers,
      [questionIndex]: answerIndex === QUIZ_QUESTIONS[questionIndex].correctIndex,
    });
  };

  const getCorrectCount = () => {
    return Object.values(quizAnswers).filter(v => v === true).length;
  };

  const handleMarkComplete = async () => {
    if (!id || !user) return;
    setSubmitting(true);
    try {
      await leaderApi.markTrainingComplete(id, {
        learnerId: user.id,
        learnerNotes,
        quizScore: getCorrectCount() / QUIZ_QUESTIONS.length,
      });
      setTrainingCase(prev => prev ? { ...prev, isCompleted: true, completedAt: new Date().toISOString() } : null);
    } catch (error) {
      console.error('Failed to mark complete:', error);
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

  if (!trainingCase) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">培训案例不存在</h3>
        <button
          onClick={() => navigate('/training')}
          className="text-primary-600 hover:text-primary-700"
        >
          返回培训中心
        </button>
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
        {trainingCase.isCompleted && (
          <span className="px-3 py-1.5 bg-success-100 text-success-700 rounded-full text-sm font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            已完成学习
          </span>
        )}
      </div>

      {/* Title */}
      <div className="bg-gradient-to-r from-accent-500 to-orange-500 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-8 h-8" />
          <h2 className="text-2xl font-bold">培训案例详情</h2>
        </div>
        <p className="text-accent-100">
          {trainingCase.sourcePlateNumber || '培训案例'} · {formatDateTime(trainingCase.createdAt)}
        </p>
        {trainingCase.confidenceImprovement && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-semibold">置信度提升 +{Math.round(trainingCase.confidenceImprovement * 100)}%</span>
          </div>
        )}
      </div>

      {/* Example Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bad Example */}
        <div className="bg-white rounded-xl border-2 border-danger-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-danger-100 rounded-lg flex items-center justify-center">
              <X className="w-5 h-5 text-danger-600" />
            </div>
            <div>
              <h3 className="font-semibold text-danger-700">反面示例</h3>
              <p className="text-xs text-danger-500">查勘员原始描述</p>
            </div>
          </div>
          <div className="p-4 bg-danger-50 rounded-xl border border-danger-100">
            <p className="text-gray-700 leading-relaxed">{trainingCase.example?.bad}</p>
          </div>
          {trainingCase.trainerNotes && (
            <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-100">
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-medium text-orange-700 mb-1">组长批注</div>
                  <p className="text-sm text-gray-700">{trainingCase.trainerNotes}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Good Example */}
        <div className="bg-white rounded-xl border-2 border-success-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
              <Check className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <h3 className="font-semibold text-success-700">正面示例</h3>
              <p className="text-xs text-success-500">规范标准描述</p>
            </div>
          </div>
          <div className="p-4 bg-success-50 rounded-xl border border-success-100">
            <p className="text-gray-700 leading-relaxed">{trainingCase.example?.good}</p>
          </div>
          {trainingCase.example?.explanation && (
            <div className="mt-4 p-3 bg-primary-50 rounded-lg border border-primary-100">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-medium text-primary-700 mb-1">示例说明</div>
                  <p className="text-sm text-gray-700">{trainingCase.example.explanation}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Improvements */}
      {trainingCase.improvements && trainingCase.improvements.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            改进要点
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {trainingCase.improvements.map((imp, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-4 bg-primary-50 rounded-xl border border-primary-100"
              >
                <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white font-bold text-xs">{index + 1}</span>
                </div>
                <p className="text-gray-700">{imp}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Quiz Section */}
      {!trainingCase.isCompleted && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowQuiz(!showQuiz)}
            className="w-full p-5 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-800">知识测验</h3>
                <p className="text-sm text-gray-500">测试你对规范描述的理解</p>
              </div>
            </div>
            <ArrowLeft className={cn("w-5 h-5 text-gray-400 transition-transform", !showQuiz && "rotate-180")} />
          </button>

          {showQuiz && (
            <div className="p-5 border-t border-gray-100 space-y-5">
              {QUIZ_QUESTIONS.map((q, qIndex) => (
                <div key={qIndex} className="space-y-3">
                  <div className="font-medium text-gray-800">
                    {qIndex + 1}. {q.question}
                  </div>
                  <div className="space-y-2">
                    {q.options.map((option, oIndex) => {
                      const isSelected = quizAnswers[qIndex] !== undefined;
                      const isCorrect = oIndex === q.correctIndex;
                      const userSelected = isSelected && quizAnswers[qIndex] === (isCorrect ? true : false);

                      return (
                        <button
                          key={oIndex}
                          onClick={() => handleQuizSelect(qIndex, oIndex)}
                          className={cn(
                            "w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3",
                            quizSubmitted
                              ? isCorrect
                                ? "bg-success-50 border-success-300"
                                : userSelected
                                  ? "bg-danger-50 border-danger-300"
                                  : "bg-gray-50 border-gray-200"
                              : isSelected
                                ? userSelected
                                  ? "bg-success-50 border-success-300"
                                  : "bg-danger-50 border-danger-300"
                                : "bg-white border-gray-200 hover:border-primary-300 hover:bg-primary-50"
                          )}
                        >
                          <div className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                            quizSubmitted
                              ? isCorrect
                                ? "border-success-500 bg-success-500"
                                : userSelected
                                  ? "border-danger-500 bg-danger-500"
                                  : "border-gray-300"
                              : isSelected
                                ? userSelected
                                  ? "border-success-500 bg-success-500"
                                  : "border-danger-500 bg-danger-500"
                                : "border-gray-300"
                          )}>
                            {(quizSubmitted || isSelected) && (
                              userSelected ? (
                                <Check className="w-4 h-4 text-white" />
                              ) : quizSubmitted && isCorrect ? (
                                <Check className="w-4 h-4 text-white" />
                              ) : (
                                <X className="w-4 h-4 text-white" />
                              )
                            )}
                          </div>
                          <span className={cn(
                            "text-sm",
                            quizSubmitted && isCorrect ? "text-success-700 font-medium" :
                            quizSubmitted && userSelected ? "text-danger-700" : "text-gray-700"
                          )}>
                            {option}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {Object.keys(quizAnswers).length === QUIZ_QUESTIONS.length && !quizSubmitted && (
                <button
                  onClick={() => setQuizSubmitted(true)}
                  className="w-full py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium"
                >
                  提交测验
                </button>
              )}

              {quizSubmitted && (
                <div className={cn(
                  "p-4 rounded-xl text-center",
                  getCorrectCount() === QUIZ_QUESTIONS.length
                    ? "bg-success-50 border border-success-200"
                    : "bg-warning-50 border border-warning-200"
                )}>
                  <div className="text-lg font-bold text-gray-800 mb-1">
                    得分：{getCorrectCount()} / {QUIZ_QUESTIONS.length}
                  </div>
                  <p className="text-sm text-gray-600">
                    {getCorrectCount() === QUIZ_QUESTIONS.length
                      ? "太棒了！你完全掌握了规范描述的要点！"
                      : "继续学习，争取全部答对！"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Learner Notes */}
      {!trainingCase.isCompleted && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary-500" />
            学习笔记
          </h3>
          <textarea
            value={learnerNotes}
            onChange={(e) => setLearnerNotes(e.target.value)}
            rows={4}
            placeholder="记录你的学习心得..."
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-0 outline-none resize-none"
          />
        </div>
      )}

      {/* Complete Button */}
      {!trainingCase.isCompleted && user?.role !== 'leader' && (
        <button
          onClick={handleMarkComplete}
          disabled={submitting || quizSubmitted && getCorrectCount() < QUIZ_QUESTIONS.length}
          className={cn(
            "w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all",
            submitting || (quizSubmitted && getCorrectCount() < QUIZ_QUESTIONS.length)
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-gradient-to-r from-success-500 to-success-600 text-white hover:from-success-600 hover:to-success-700 shadow-lg shadow-success-500/30"
          )}
        >
          {submitting ? (
            <>
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
              提交中...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-6 h-6" />
              标记为已完成学习
            </>
          )}
        </button>
      )}

      {/* Completed Info */}
      {trainingCase.isCompleted && trainingCase.completedAt && (
        <div className="bg-success-50 rounded-xl border border-success-200 p-5 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-success-500" />
          <div className="text-lg font-semibold text-success-700 mb-1">学习已完成</div>
          <div className="text-sm text-success-600 flex items-center justify-center gap-1.5">
            <Clock className="w-4 h-4" />
            完成时间：{formatDateTime(trainingCase.completedAt)}
          </div>
          {trainingCase.learnerNotes && (
            <div className="mt-4 p-3 bg-white rounded-lg text-left">
              <div className="text-xs text-gray-500 mb-1">你的学习笔记</div>
              <p className="text-gray-700">{trainingCase.learnerNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
