import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sparkles, Shuffle, ListTodo } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import CartList from '@/components/scenario/CartList';
import CouponList from '@/components/scenario/CouponList';
import PaymentInfo from '@/components/scenario/PaymentInfo';
import SpecialEventBadge from '@/components/scenario/SpecialEventBadge';
import AmountInput from '@/components/scenario/AmountInput';
import FeedbackModal from '@/components/scenario/FeedbackModal';
import { useAppStore } from '@/store/useAppStore';
import { SCENARIO_TYPE_COLORS } from '@/utils/constants';
import type { RequiredInput } from '@/types';

export default function Practice() {
  const { staffId } = useParams<{ staffId: string }>();
  const navigate = useNavigate();
  const {
    currentStaff,
    currentScenario,
    generateNewScenario,
    submitAnswer,
    getUnpassedScenarios,
    selectStaff,
    loadRecords,
    loadStaffList,
  } = useAppStore();

  const [userInputs, setUserInputs] = useState<Record<string, number | undefined>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState<{
    isCorrect: boolean;
    wrongFields: string[];
    explanations: string[];
  } | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [showUnpassedList, setShowUnpassedList] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  useEffect(() => {
    if (staffId) {
      loadStaffList();
      selectStaff(staffId);
      loadRecords(staffId);
      generateNewScenario(staffId);
    }
  }, [staffId, loadStaffList, selectStaff, loadRecords, generateNewScenario]);

  useEffect(() => {
    if (currentScenario) {
      const initialInputs: Record<string, number | undefined> = {};
      currentScenario.requiredInputs.forEach((field) => {
        initialInputs[field] = undefined;
      });
      setUserInputs(initialInputs);
      setShowFeedback(false);
      setFeedbackResult(null);
    }
  }, [currentScenario?.id]);

  const handleInputChange = (field: string, value: number | undefined) => {
    setUserInputs((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!currentScenario || !staffId) return;

    const allFilled = currentScenario.requiredInputs.every(
      (field) => userInputs[field] !== undefined
    );
    if (!allFilled) return;

    const result = submitAnswer(staffId, userInputs as {
      finalTotal?: number;
      changeAmount?: number;
      refundAmount?: number;
    });
    setFeedbackResult(result);
    setShowFeedback(true);
  };

  const handleNext = () => {
    setSlideDirection('left');
    setTimeout(() => {
      generateNewScenario(staffId);
      setSlideDirection('right');
      setIsReplaying(false);
    }, 200);
  };

  const handleRetry = () => {
    setShowFeedback(false);
    const initialInputs: Record<string, number | undefined> = {};
    currentScenario?.requiredInputs.forEach((field) => {
      initialInputs[field] = undefined;
    });
    setUserInputs(initialInputs);
  };

  const handleReplayUnpassed = (scenarioId: string) => {
    if (!staffId) return;
    const unpassed = getUnpassedScenarios(staffId);
    const record = unpassed.find((r) => r.scenarioId === scenarioId);
    if (record) {
      setShowUnpassedList(false);
      setIsReplaying(true);
      setSlideDirection('left');
      setTimeout(() => {
        useAppStore.setState({ currentScenario: record.scenario });
        setSlideDirection('right');
      }, 200);
    }
  };

  const unpassedScenarios = staffId ? getUnpassedScenarios(staffId) : [];
  const allFilled = currentScenario?.requiredInputs.every(
    (field) => userInputs[field] !== undefined
  );

  if (!currentScenario) {
    return (
      <Layout title="找零练习">
        <div className="text-center py-12">
          <p className="text-caramel-500">正在生成场景...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`${currentStaff?.name || ''}的练习`}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{currentStaff?.avatar}</span>
            <div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${SCENARIO_TYPE_COLORS[currentScenario.type]}`}>
                {currentScenario.typeLabel}
              </span>
              {isReplaying && (
                <span className="ml-2 text-xs text-caramel-500">
                  (错题复习)
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {unpassedScenarios.length > 0 && (
              <button
                onClick={() => setShowUnpassedList(true)}
                className="flex items-center gap-1 px-3 py-2 bg-peach-100 text-peach-700 rounded-xl text-sm font-medium hover:bg-peach-200 transition-colors"
              >
                <ListTodo className="w-4 h-4" />
                {unpassedScenarios.length}题待复习
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-3 py-2 bg-primary-100 text-primary-700 rounded-xl text-sm font-medium hover:bg-primary-200 transition-colors"
            >
              <Shuffle className="w-4 h-4" />
              换一题
            </button>
          </div>
        </div>

        <div
          className={`space-y-4 transition-transform duration-300 ${
            slideDirection === 'left'
              ? '-translate-x-full opacity-0'
              : slideDirection === 'right'
              ? 'translate-x-0 opacity-100'
              : ''
          }`}
        >
          {currentScenario.specialEvent.type !== 'none' && (
            <SpecialEventBadge event={currentScenario.specialEvent} />
          )}

          <CartList items={currentScenario.cartItems} />

          {currentScenario.coupons.length > 0 && (
            <CouponList coupons={currentScenario.coupons} />
          )}

          <PaymentInfo
            payment={currentScenario.payment}
            memberPoints={currentScenario.memberPoints}
            pointsDeduction={currentScenario.pointsDeduction}
          />

          <div className="bg-white rounded-xl p-5 card-shadow">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary-500" />
              <h3 className="font-bold text-caramel-700">请计算</h3>
            </div>
            <div className="space-y-4">
              {currentScenario.requiredInputs.map((field: RequiredInput, index: number) => (
                <div key={field} style={{ animationDelay: `${index * 100}ms` }}>
                  <AmountInput
                    field={field}
                    value={userInputs[field]}
                    onChange={(val) => handleInputChange(field, val)}
                    error={showFeedback && feedbackResult?.wrongFields.includes(field)}
                    correctValue={currentScenario[field]}
                    showResult={showFeedback}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!allFilled || showFeedback}
              className="w-full mt-6 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold text-lg rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-200 hover:shadow-xl hover:shadow-primary-300 active:scale-[0.98]"
            >
              提交答案
            </button>
          </div>
        </div>
      </div>

      {feedbackResult && (
        <FeedbackModal
          isCorrect={feedbackResult.isCorrect}
          explanations={feedbackResult.explanations}
          onNext={handleNext}
          onRetry={handleRetry}
          show={showFeedback}
        />
      )}

      {showUnpassedList && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto animate-slide-in-up">
            <h3 className="text-xl font-bold text-caramel-800 mb-4">
              待复习的错题 ({unpassedScenarios.length})
            </h3>
            <div className="space-y-3">
              {unpassedScenarios.map((record) => (
                <div
                  key={record.scenarioId}
                  onClick={() => handleReplayUnpassed(record.scenarioId)}
                  className="p-4 bg-peach-50 rounded-xl cursor-pointer hover:bg-peach-100 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${SCENARIO_TYPE_COLORS[record.scenario.type]}`}>
                        {record.scenario.typeLabel}
                      </span>
                      <p className="text-sm text-caramel-700">
                        {record.scenario.cartItems
                          .map((i) => `${i.product.emoji}${i.product.name}`)
                          .join('、')}
                      </p>
                    </div>
                    <span className="text-2xl">
                      {record.scenario.cartItems[0]?.product.emoji}
                    </span>
                  </div>
                  <p className="text-xs text-caramel-500 mt-2">
                    已尝试 {record.attempts} 次
                  </p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowUnpassedList(false)}
              className="w-full mt-4 py-3 bg-caramel-100 text-caramel-700 font-semibold rounded-xl hover:bg-caramel-200 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
