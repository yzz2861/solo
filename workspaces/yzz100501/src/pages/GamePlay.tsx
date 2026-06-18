import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import useGameStore from '@/stores/useGameStore';
import useLevelStore from '@/stores/useLevelStore';
import useStatsStore from '@/stores/useStatsStore';
import { captureElement } from '@/utils/screenshot';
import { generateId } from '@/utils/id';
import type { Choice } from '@/types';

export default function GamePlay() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const sceneCardRef = useRef<HTMLDivElement>(null);
  const [answered, setAnswered] = useState(false);

  const user = useGameStore((s) => s.user);
  const currentLevel = useGameStore((s) => s.currentLevel);
  const currentStepIndex = useGameStore((s) => s.currentStepIndex);
  const answers = useGameStore((s) => s.answers);
  const isShowingFeedback = useGameStore((s) => s.isShowingFeedback);
  const lastChoice = useGameStore((s) => s.lastChoice);
  const gameCompleted = useGameStore((s) => s.gameCompleted);
  const startLevel = useGameStore((s) => s.startLevel);
  const makeChoice = useGameStore((s) => s.makeChoice);
  const nextStep = useGameStore((s) => s.nextStep);
  const resetGame = useGameStore((s) => s.resetGame);
  const getCurrentStep = useGameStore((s) => s.getCurrentStep);

  const { levels, loadLevels } = useLevelStore();
  const saveSession = useStatsStore((s) => s.saveSession);

  useEffect(() => {
    if (!user) {
      navigate('/login?role=student', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    loadLevels();
  }, [loadLevels]);

  useEffect(() => {
    if (!levelId || levels.length === 0) return;
    const level = levels.find((l) => l.id === levelId);
    if (level) {
      startLevel(level);
    }
  }, [levelId, levels, startLevel]);

  useEffect(() => {
    setAnswered(false);
  }, [currentStepIndex]);

  const currentStep = getCurrentStep();

  const handleChoice = async (choice: Choice) => {
    if (answered || isShowingFeedback) return;
    setAnswered(true);

    let screenshotDataUrl: string | undefined;

    if (!choice.isCorrect && sceneCardRef.current) {
      screenshotDataUrl = await captureElement(sceneCardRef.current);
    }

    makeChoice(choice, currentStep!.order);

    if (!choice.isCorrect && screenshotDataUrl) {
      const store = useGameStore.getState();
      const updatedAnswers = [...store.answers];
      const lastAnswer = updatedAnswers[updatedAnswers.length - 1];
      if (lastAnswer) {
        updatedAnswers[updatedAnswers.length - 1] = {
          ...lastAnswer,
          screenshotDataUrl,
        };
      }
      useGameStore.setState({ answers: updatedAnswers });
    }
  };

  const handleNextStep = () => {
    nextStep();
    setAnswered(false);
  };

  const handleSaveSession = () => {
    if (!user || !currentLevel) return;
    const finalAnswers = useGameStore.getState().answers;
    const sessionId = generateId();
    const score = finalAnswers.filter((a) => a.isCorrect).length;

    saveSession({
      id: sessionId,
      studentName: user.name,
      className: user.className ?? '',
      levelId: currentLevel.id,
      score,
      totalSteps: currentLevel.steps.length,
      answers: finalAnswers,
      completedAt: Date.now(),
    });

    return sessionId;
  };

  if (!currentLevel) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0D3B2E] text-white/40">
        加载中...
      </div>
    );
  }

  const totalSteps = currentLevel.steps.length;

  if (gameCompleted) {
    const score = answers.filter((a) => a.isCorrect).length;
    const errors = answers.filter((a) => !a.isCorrect);

    const handleReview = () => {
      const sessionId = handleSaveSession();
      resetGame();
      navigate(`/student/review/${sessionId}`);
    };

    const handleBack = () => {
      handleSaveSession();
      resetGame();
      navigate('/student');
    };

    return (
      <div className="min-h-screen bg-[#0D3B2E] text-white">
        <div className="mx-auto max-w-lg px-4 py-12">
          <div className="rounded-2xl bg-white/5 p-8 text-center">
            <div className="mb-4 text-5xl font-bold">
              {score} / {totalSteps}
            </div>
            <p className="mb-6 text-white/60">步正确</p>

            {errors.length > 0 && (
              <div className="mb-6 text-left">
                <h3 className="mb-3 text-sm font-semibold text-white/40">
                  错误列表
                </h3>
                <div className="space-y-2">
                  {errors.map((err) => (
                    <div
                      key={err.stepOrder}
                      className="rounded-lg bg-orange-500/10 px-4 py-3 text-sm"
                    >
                      <span className="font-medium text-orange-400">
                        第 {err.stepOrder} 步
                      </span>
                      <span className="ml-2 text-white/60">
                        {err.choiceText}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={handleReview}
                className="rounded-xl bg-[#2ECC71] px-6 py-3 font-semibold transition hover:bg-[#2ECC71]/80"
              >
                查看回顾
              </button>
              <button
                onClick={handleBack}
                className="rounded-xl bg-white/10 px-6 py-3 font-semibold transition hover:bg-white/20"
              >
                返回关卡
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentStep) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0D3B2E] text-white/40">
        加载中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D3B2E] text-white">
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => {
              resetGame();
              navigate('/student');
            }}
            className="rounded-full bg-white/10 p-2 transition hover:bg-white/20"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display text-lg font-bold">
            {currentLevel.title}
          </h1>
        </div>

        <div className="mb-6 flex items-center justify-center gap-2">
          {currentLevel.steps.map((step, idx) => {
            const answer = answers.find((a) => a.stepOrder === step.order);
            const isCurrent = idx === currentStepIndex;

            let className = 'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ';
            if (answer && answer.isCorrect) {
              className += 'bg-[#2ECC71] text-white';
            } else if (answer && !answer.isCorrect) {
              className += 'bg-[#FF6B35] text-white';
            } else if (isCurrent) {
              className += 'ring-2 ring-white/60 bg-transparent text-white';
            } else {
              className += 'bg-white/10 text-white/30';
            }

            return (
              <div key={step.order} className={className}>
                {step.order}
              </div>
            );
          })}
        </div>

        <div
          ref={sceneCardRef}
          id="scene-card"
          className="rounded-2xl bg-white/5 p-6"
        >
          <div className="mb-4 text-center text-sm text-white/40">
            第 {currentStep.order} 步 / 共 {totalSteps} 步
          </div>

          <p className="mb-8 text-lg leading-relaxed text-white/90">
            {currentStep.scene}
          </p>

          <div className="space-y-3">
            {currentStep.choices.map((choice) => {
              const isSelected = lastChoice?.id === choice.id;
              const showCorrectStyle = answered && isSelected && choice.isCorrect;
              const showIncorrectStyle = answered && isSelected && !choice.isCorrect;
              const revealStyle = answered && !isSelected && choice.isCorrect;

              let btnClass =
                'w-full rounded-xl border-2 px-5 py-4 text-left text-sm font-medium transition ';

              if (showCorrectStyle) {
                btnClass +=
                  'border-[#2ECC71] bg-[#2ECC71]/10 text-[#2ECC71]';
              } else if (showIncorrectStyle) {
                btnClass +=
                  'border-[#FF6B35] bg-[#FF6B35]/10 text-[#FF6B35]';
              } else if (revealStyle) {
                btnClass +=
                  'border-[#2ECC71]/40 bg-[#2ECC71]/5 text-white/60';
              } else {
                btnClass +=
                  'border-white/30 hover:border-white/50 hover:bg-white/5 text-white/80';
              }

              return (
                <button
                  key={choice.id}
                  onClick={() => handleChoice(choice)}
                  disabled={answered}
                  className={btnClass}
                >
                  {choice.text}
                </button>
              );
            })}
          </div>
        </div>

        {isShowingFeedback && lastChoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div
              className={`w-full max-w-sm rounded-2xl p-6 ${
                lastChoice.isCorrect
                  ? 'bg-[#2ECC71]'
                  : 'bg-[#FF6B35]'
              }`}
            >
              <div className="mb-4 flex items-center gap-3">
                {lastChoice.isCorrect ? (
                  <CheckCircle size={28} className="text-white" />
                ) : (
                  <AlertTriangle size={28} className="text-white" />
                )}
                <h3 className="text-lg font-bold text-white">
                  {lastChoice.isCorrect ? '回答正确！' : '回答错误'}
                </h3>
              </div>

              <p className="mb-4 text-sm leading-relaxed text-white/90">
                {lastChoice.feedback}
              </p>

              {!lastChoice.isCorrect && (
                <div className="mb-4 rounded-lg bg-black/20 p-3">
                  <p className="mb-1 text-xs font-semibold text-white/60">
                    正确做法
                  </p>
                  <p className="text-sm leading-relaxed text-white/90">
                    {lastChoice.correctAction}
                  </p>
                </div>
              )}

              <button
                onClick={handleNextStep}
                className="w-full rounded-xl bg-white/20 py-3 font-semibold text-white transition hover:bg-white/30"
              >
                继续
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
