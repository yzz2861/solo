import { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, Phone, Clock, ArrowRight, Info } from 'lucide-react';
import type { Obstacle, UserAnswer, UrgencyLevel, ContactDepartment, ObstacleType } from '../../types';
import { OBSTACLE_TYPE_LABELS, URGENCY_LABELS, DEPARTMENT_LABELS, SPECIAL_CASE_LABELS } from '../../types';

interface JudgmentPanelProps {
  obstacle: Obstacle | null;
  onClose: () => void;
  onSubmit: (answer: UserAnswer) => void;
  showResult?: boolean;
  isCorrect?: boolean;
  correctAnswer?: {
    canBypass: boolean;
    urgency: UrgencyLevel;
    contactDept: ContactDepartment;
  };
  scoreChange?: number;
}

export default function JudgmentPanel({
  obstacle,
  onClose,
  onSubmit,
  showResult = false,
  isCorrect = false,
  correctAnswer,
  scoreChange = 0,
}: JudgmentPanelProps) {
  const [answer, setAnswer] = useState<UserAnswer>({
    canBypass: null,
    urgency: null,
    contactDept: null,
  });

  useEffect(() => {
    setAnswer({ canBypass: null, urgency: null, contactDept: null });
  }, [obstacle?.id]);

  if (!obstacle) return null;

  const canSubmit = answer.canBypass !== null || answer.urgency !== null || answer.contactDept !== null;

  const handleSubmit = () => {
    onSubmit(answer);
  };

  const isFalsePositive = obstacle.isFalsePositive;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 md:bottom-4 md:left-1/2 md:-translate-x-1/2 md:w-[640px] md:max-w-[90vw]">
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl border border-gray-100 panel-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              showResult
                ? isCorrect
                  ? 'bg-green-100 text-green-600'
                  : 'bg-red-100 text-red-600'
                : 'bg-primary-100 text-primary-600'
            }`}>
              {showResult ? (
                isCorrect ? <Check size={20} /> : <X size={20} />
              ) : (
                <AlertTriangle size={20} />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">
                {OBSTACLE_TYPE_LABELS[obstacle.type as ObstacleType] || obstacle.type}
              </h3>
              <p className="text-sm text-gray-500">
                {isFalsePositive ? '疑似障碍 · 请判断是否真的影响通行' : '发现障碍 · 请完成三项判定'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {isFalsePositive && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
              <Info size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                这个物体看起来像障碍，但请仔细判断：它是否真的阻挡了盲道？是否影响视障人士通行？
                如果你认为<strong>不是障碍</strong>，请直接点"确认不是障碍"。
              </p>
            </div>
          )}

          {obstacle.specialCase && showResult && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-3">
              <Info size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800 mb-1">
                  {SPECIAL_CASE_LABELS[obstacle.specialCase]}
                </p>
                <p className="text-sm text-blue-700">{obstacle.specialExplanation}</p>
              </div>
            </div>
          )}

          {!isFalsePositive && (
            <>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <ArrowRight size={14} className="text-primary-500" />
                  能否绕行？
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className={`px-4 py-2.5 rounded-lg border-2 transition-all font-medium ${
                      answer.canBypass === true
                        ? 'border-success bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    } ${showResult && correctAnswer?.canBypass === true ? 'border-success bg-green-100' : ''}`}
                    onClick={() => !showResult && setAnswer((a) => ({ ...a, canBypass: true }))}
                    disabled={showResult}
                  >
                    可以绕行
                  </button>
                  <button
                    className={`px-4 py-2.5 rounded-lg border-2 transition-all font-medium ${
                      answer.canBypass === false
                        ? 'border-danger bg-red-50 text-red-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    } ${showResult && correctAnswer?.canBypass === false ? 'border-danger bg-red-100' : ''}`}
                    onClick={() => !showResult && setAnswer((a) => ({ ...a, canBypass: false }))}
                    disabled={showResult}
                  >
                    无法绕行
                  </button>
                </div>
                {showResult && correctAnswer && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    正确答案：{correctAnswer.canBypass ? '可以绕行' : '无法绕行'}
                    {obstacle.explanation && ` — ${obstacle.explanation}`}
                  </p>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Clock size={14} className="text-primary-500" />
                  紧急程度
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {(['low', 'medium', 'high', 'emergency'] as UrgencyLevel[]).map((level) => {
                    const colors: Record<UrgencyLevel, string> = {
                      low: 'border-green-400 bg-green-50 text-green-700',
                      medium: 'border-yellow-400 bg-yellow-50 text-yellow-700',
                      high: 'border-orange-400 bg-orange-50 text-orange-700',
                      emergency: 'border-red-500 bg-red-100 text-red-700',
                    };
                    const isSelected = answer.urgency === level;
                    const isCorrectAnswer = correctAnswer?.urgency === level;

                    return (
                      <button
                        key={level}
                        className={`px-2 py-2.5 rounded-lg border-2 transition-all text-sm font-medium ${
                          isSelected
                            ? colors[level]
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        } ${showResult && isCorrectAnswer ? 'ring-2 ring-offset-1 ring-green-500' : ''}`}
                        onClick={() => !showResult && setAnswer((a) => ({ ...a, urgency: level }))}
                        disabled={showResult}
                      >
                        {URGENCY_LABELS[level]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Phone size={14} className="text-primary-500" />
                  联系哪个部门？
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {(['traffic_police', 'city_management', 'construction_dept', 'transportation', 'utility_company', 'community'] as ContactDepartment[]).map((dept) => {
                    const isSelected = answer.contactDept === dept;
                    const isCorrectAnswer = correctAnswer?.contactDept === dept;

                    return (
                      <button
                        key={dept}
                        className={`px-2 py-2 rounded-lg border-2 transition-all text-xs font-medium ${
                          isSelected
                            ? 'border-secondary-400 bg-secondary-50 text-secondary-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        } ${showResult && isCorrectAnswer ? 'ring-2 ring-offset-1 ring-green-500' : ''}`}
                        onClick={() => !showResult && setAnswer((a) => ({ ...a, contactDept: dept }))}
                        disabled={showResult}
                      >
                        {DEPARTMENT_LABELS[dept]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {showResult && obstacle.explanation && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-700">{obstacle.explanation}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
          {showResult ? (
            <>
              <div className={`text-lg font-bold ${
                isCorrect ? 'text-green-600' : 'text-red-500'
              }`}>
                {scoreChange > 0 ? `+${scoreChange} 分` : `${scoreChange} 分`}
              </div>
              <button onClick={onClose} className="btn btn-primary min-w-[120px]">
                继续巡查
              </button>
            </>
          ) : (
            <>
              {isFalsePositive ? (
                <button
                  onClick={() => {
                    setAnswer({ canBypass: null, urgency: null, contactDept: null });
                    onSubmit({ canBypass: null, urgency: null, contactDept: null });
                  }}
                  className="btn btn-success min-w-[140px]"
                >
                  确认不是障碍
                </button>
              ) : (
                <div className="text-sm text-gray-500">
                  完成判定后提交
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={onClose} className="btn btn-ghost">
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit && !isFalsePositive}
                  className="btn btn-primary min-w-[100px]"
                >
                  提交
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
