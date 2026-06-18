import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, ChevronLeft, RotateCcw } from 'lucide-react';
import useLevelStore from '@/stores/useLevelStore';
import useGameStore from '@/stores/useGameStore';
import useStatsStore from '@/stores/useStatsStore';
import { generateId } from '@/utils/id';
import type { QuizAnswer, Step, Choice } from '@/types';

const TIMER_SECONDS = 15;
const CIRCLE_RADIUS = 40;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

function getTimerColor(remaining: number, total: number): string {
  const ratio = remaining / total;
  if (ratio > 0.6) return '#2ECC71';
  if (ratio > 0.3) return '#F1C40F';
  return '#FF6B35';
}

export default function Quiz() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();

  const user = useGameStore((s) => s.user);
  const { levels, loadLevels } = useLevelStore();
  const saveQuizSession = useStatsStore((s) => s.saveQuizSession);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [quizDone, setQuizDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const level = levels.find((l) => l.id === levelId);
  const steps: Step[] = level?.steps ?? [];
  const currentStep = steps[currentIndex] ?? null;

  useEffect(() => {
    if (!user) {
      navigate('/login?role=student', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    loadLevels();
  }, [loadLevels]);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (advanceRef.current) {
      clearTimeout(advanceRef.current);
      advanceRef.current = null;
    }
  }, []);

  const advanceToNext = useCallback(() => {
    setShowFeedback(false);
    setSelectedChoiceId(null);

    if (currentIndex + 1 >= steps.length) {
      setQuizDone(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setTimeLeft(TIMER_SECONDS);
    }
  }, [currentIndex, steps.length]);

  const handleAnswer = useCallback(
    (choice: Choice) => {
      if (showFeedback || quizDone) return;
      clearTimers();

      const answer: QuizAnswer = {
        questionIndex: currentIndex,
        selectedChoiceId: choice.id,
        isCorrect: choice.isCorrect,
      };

      setSelectedChoiceId(choice.id);
      setAnswers((prev) => [...prev, answer]);
      setShowFeedback(true);

      advanceRef.current = setTimeout(advanceToNext, 1500);
    },
    [showFeedback, quizDone, clearTimers, currentIndex, advanceToNext],
  );

  const handleTimeout = useCallback(() => {
    if (showFeedback || quizDone) return;

    const answer: QuizAnswer = {
      questionIndex: currentIndex,
      selectedChoiceId: '',
      isCorrect: false,
    };

    setAnswers((prev) => [...prev, answer]);
    setShowFeedback(true);
    setSelectedChoiceId(null);

    advanceRef.current = setTimeout(advanceToNext, 1500);
  }, [showFeedback, quizDone, currentIndex, advanceToNext]);

  useEffect(() => {
    if (quizDone || showFeedback || !currentStep) return;

    setTimeLeft(TIMER_SECONDS);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentIndex, quizDone, showFeedback, currentStep, handleTimeout]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const handleSaveSession = () => {
    if (!user || !level) return;
    const score = answers.filter((a) => a.isCorrect).length;

    saveQuizSession({
      id: generateId(),
      studentName: user.name,
      className: user.className ?? '',
      levelId: level.id,
      score,
      totalQuestions: steps.length,
      quizAnswers: answers,
      completedAt: Date.now(),
    });
  };

  const handleRestart = () => {
    clearTimers();
    setCurrentIndex(0);
    setAnswers([]);
    setSelectedChoiceId(null);
    setShowFeedback(false);
    setQuizDone(false);
    setTimeLeft(TIMER_SECONDS);
  };

  if (!level || steps.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0D3B2E] text-white/40">
        加载中...
      </div>
    );
  }

  const score = answers.filter((a) => a.isCorrect).length;

  if (quizDone) {
    handleSaveSession();

    return (
      <div className="min-h-screen bg-[#0D3B2E] text-white">
        <div className="mx-auto max-w-lg px-4 py-12">
          <div className="rounded-2xl bg-white/5 p-8 text-center">
            <div className="mb-2 text-5xl font-bold">
              {score} / {steps.length}
            </div>
            <p className="mb-6 text-white/60">题正确</p>

            {answers.some((a) => !a.isCorrect) && (
              <div className="mb-6 text-left">
                <h3 className="mb-3 text-sm font-semibold text-white/40">
                  错误题目
                </h3>
                <div className="space-y-3">
                  {answers.map((ans, idx) => {
                    if (ans.isCorrect) return null;
                    const step = steps[ans.questionIndex];
                    const correctChoice = step?.choices.find(
                      (c) => c.isCorrect,
                    );
                    return (
                      <div
                        key={idx}
                        className="rounded-lg bg-orange-500/10 px-4 py-3 text-sm"
                      >
                        <p className="mb-1 font-medium text-orange-400">
                          第 {ans.questionIndex + 1} 题
                        </p>
                        <p className="mb-1 text-white/60">
                          {step?.scene.slice(0, 60)}...
                        </p>
                        {correctChoice && (
                          <p className="text-[#2ECC71]">
                            正确答案：{correctChoice.text}
                          </p>
                        )}
                        {correctChoice?.feedback && (
                          <p className="mt-1 text-white/50 text-xs">
                            {correctChoice.feedback}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/student')}
                className="rounded-xl bg-[#2ECC71] px-6 py-3 font-semibold transition hover:bg-[#2ECC71]/80"
              >
                返回关卡
              </button>
              <button
                onClick={handleRestart}
                className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-6 py-3 font-semibold transition hover:bg-white/20"
              >
                <RotateCcw size={16} />
                重新测验
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const timerColor = getTimerColor(timeLeft, TIMER_SECONDS);
  const dashOffset =
    CIRCLE_CIRCUMFERENCE * (1 - timeLeft / TIMER_SECONDS);

  return (
    <div className="min-h-screen bg-[#0D3B2E] text-white">
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => {
              clearTimers();
              navigate('/student');
            }}
            className="rounded-full bg-white/10 p-2 transition hover:bg-white/20"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="font-display text-lg font-bold">
            {level.title} - 快速测验
          </h1>
        </div>

        <div className="mb-6 flex items-center justify-center gap-2">
          {steps.map((_, idx) => {
            const answer = answers[idx];
            const isCurrent = idx === currentIndex;

            let cls =
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ';
            if (answer && answer.isCorrect) {
              cls += 'bg-[#2ECC71] text-white';
            } else if (answer && !answer.isCorrect) {
              cls += 'bg-[#FF6B35] text-white';
            } else if (isCurrent) {
              cls += 'ring-2 ring-white/60 bg-transparent text-white';
            } else {
              cls += 'bg-white/10 text-white/30';
            }

            return (
              <div key={idx} className={cls}>
                {idx + 1}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl bg-white/5 p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-white/40">
              第 {currentIndex + 1} 题 / 共 {steps.length} 题
            </span>
            <div className="relative flex h-14 w-14 items-center justify-center">
              <svg className="h-14 w-14 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={CIRCLE_RADIUS}
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="6"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={CIRCLE_RADIUS}
                  fill="none"
                  stroke={timerColor}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={CIRCLE_CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <span className="absolute flex items-center gap-0.5 text-sm font-bold">
                <Clock size={12} />
                {timeLeft}
              </span>
            </div>
          </div>

          <p className="mb-8 text-lg leading-relaxed text-white/90">
            {currentStep!.scene}
          </p>

          <div className="space-y-3">
            {currentStep!.choices.map((choice) => {
              const isSelected = selectedChoiceId === choice.id;
              const isCorrectChoice = choice.isCorrect;

              let btnClass =
                'w-full rounded-xl border-2 px-5 py-4 text-left text-sm font-medium transition ';

              if (showFeedback && isSelected && isCorrectChoice) {
                btnClass +=
                  'border-[#2ECC71] bg-[#2ECC71]/15 text-[#2ECC71]';
              } else if (showFeedback && isSelected && !isCorrectChoice) {
                btnClass +=
                  'border-[#FF6B35] bg-[#FF6B35]/15 text-[#FF6B35]';
              } else if (showFeedback && !isSelected && isCorrectChoice) {
                btnClass +=
                  'border-[#2ECC71]/40 bg-[#2ECC71]/5 text-white/60';
              } else if (showFeedback) {
                btnClass += 'border-white/10 text-white/30';
              } else {
                btnClass +=
                  'border-white/30 hover:border-white/50 hover:bg-white/5 text-white/80';
              }

              return (
                <button
                  key={choice.id}
                  onClick={() => handleAnswer(choice)}
                  disabled={showFeedback}
                  className={btnClass}
                >
                  <div className="flex items-center gap-2">
                    {showFeedback && isSelected && isCorrectChoice && (
                      <CheckCircle size={16} className="shrink-0" />
                    )}
                    {showFeedback && isSelected && !isCorrectChoice && (
                      <XCircle size={16} className="shrink-0" />
                    )}
                    <span>{choice.text}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {showFeedback && (
          <div className="mt-4 rounded-xl bg-white/5 p-4">
            {(() => {
              const lastAnswer = answers[answers.length - 1];
              if (!lastAnswer) return null;

              if (lastAnswer.isCorrect) {
                return (
                  <div className="flex items-center gap-2 text-[#2ECC71]">
                    <CheckCircle size={18} />
                    <span className="font-medium">回答正确！</span>
                  </div>
                );
              }

              const step = steps[lastAnswer.questionIndex];
              const correctChoice = step?.choices.find(
                (c) => c.isCorrect,
              );

              return (
                <div>
                  <div className="mb-2 flex items-center gap-2 text-[#FF6B35]">
                    <XCircle size={18} />
                    <span className="font-medium">回答错误</span>
                  </div>
                  {correctChoice && (
                    <>
                      <p className="mb-1 text-sm text-white/60">
                        {correctChoice.feedback}
                      </p>
                      <div className="rounded-lg bg-black/20 p-3">
                        <p className="mb-1 text-xs font-semibold text-white/40">
                          正确做法
                        </p>
                        <p className="text-sm text-white/80">
                          {correctChoice.correctAction}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
