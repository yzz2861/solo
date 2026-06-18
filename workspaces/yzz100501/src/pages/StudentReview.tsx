import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  CheckCircle,
  XCircle,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import useStatsStore from '@/stores/useStatsStore';
import useLevelStore from '@/stores/useLevelStore';
import type { StudentSession, Answer } from '@/types';

const CIRCLE_RADIUS = 50;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

function ScoreRing({ score, total }: { score: number; total: number }) {
  const ratio = total > 0 ? score / total : 0;
  const offset = CIRCLE_CIRCUMFERENCE * (1 - ratio);
  const color = ratio >= 0.8 ? '#2ECC71' : ratio >= 0.5 ? '#F1C40F' : '#FF6B35';

  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={CIRCLE_RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
        />
        <circle
          cx="60"
          cy="60"
          r={CIRCLE_RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCLE_CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold">{score}/{total}</div>
        <div className="text-xs text-white/50">正确</div>
      </div>
    </div>
  );
}

function ScreenshotModal({
  dataUrl,
  onClose,
}: {
  dataUrl: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[85vh] max-w-3xl overflow-auto rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={dataUrl}
          alt="错误截图"
          className="rounded-xl"
        />
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white transition hover:bg-black/80"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function StepCard({
  answer,
  onScreenshotClick,
}: {
  answer: Answer;
  onScreenshotClick: (dataUrl: string) => void;
}) {
  return (
    <div className="rounded-xl bg-white/5 p-4">
      <div className="mb-3 flex items-start gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            answer.isCorrect
              ? 'bg-[#2ECC71] text-white'
              : 'bg-[#FF6B35] text-white'
          }`}
        >
          {answer.stepOrder}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            {answer.isCorrect ? (
              <CheckCircle size={16} className="text-[#2ECC71]" />
            ) : (
              <XCircle size={16} className="text-[#FF6B35]" />
            )}
            <span className="text-sm font-medium text-white/80">
              第 {answer.stepOrder} 步
            </span>
          </div>
          <p className="mb-2 line-clamp-2 text-sm text-white/50">
            {answer.feedback?.slice(0, 80)}
            {answer.feedback && answer.feedback.length > 80 ? '...' : ''}
          </p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-white/40">你的选择：</span>
            <span
              className={
                answer.isCorrect
                  ? 'text-[#2ECC71]'
                  : 'text-[#FF6B35]'
              }
            >
              {answer.choiceText}
            </span>
          </div>
        </div>
      </div>

      {!answer.isCorrect && (
        <div className="ml-11 space-y-2">
          <div className="flex items-start gap-2 rounded-lg bg-[#FF6B35]/10 p-3">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[#FF6B35]" />
            <div>
              <p className="mb-1 text-xs font-semibold text-white/40">
                错误反馈
              </p>
              <p className="text-sm text-white/70">{answer.feedback}</p>
            </div>
          </div>
          <div className="rounded-lg bg-[#2ECC71]/10 p-3">
            <p className="mb-1 text-xs font-semibold text-white/40">
              正确做法
            </p>
            <p className="text-sm text-white/70">{answer.correctAction}</p>
          </div>
          {answer.screenshotDataUrl && (
            <button
              onClick={() => onScreenshotClick(answer.screenshotDataUrl!)}
              className="flex items-center gap-2 rounded-lg bg-white/5 p-2 text-sm text-white/60 transition hover:bg-white/10 hover:text-white/80"
            >
              <Eye size={14} />
              查看错误截图
              <img
                src={answer.screenshotDataUrl}
                alt="缩略图"
                className="ml-auto h-10 w-16 rounded object-cover"
              />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function StudentReview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const sessions = useStatsStore((s) => s.sessions);
  const loadSessions = useStatsStore((s) => s.loadSessions);
  const { levels, loadLevels } = useLevelStore();

  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
    loadLevels();
  }, [loadSessions, loadLevels]);

  const session: StudentSession | undefined = sessions.find(
    (s) => s.id === sessionId,
  );

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0D3B2E] text-white">
        <p className="text-lg text-white/60">未找到记录</p>
        <button
          onClick={() => navigate('/student')}
          className="flex items-center gap-2 rounded-xl bg-white/10 px-6 py-3 font-semibold transition hover:bg-white/20"
        >
          <ChevronLeft size={18} />
          返回
        </button>
      </div>
    );
  }

  const level = levels.find((l) => l.id === session.levelId);
  const score = session.answers.filter((a) => a.isCorrect).length;
  const total = session.totalSteps;

  const completedDate = new Date(session.completedAt);
  const dateStr = completedDate.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-[#0D3B2E] text-white">
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate('/student')}
            className="rounded-full bg-white/10 p-2 transition hover:bg-white/20"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="font-display text-lg font-bold">
            实验回顾
          </h1>
        </div>

        <div className="mb-6 rounded-2xl bg-white/5 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">
                {level?.title ?? '未知关卡'}
              </h2>
              <p className="mt-1 text-sm text-white/40">
                {session.studentName} · {dateStr}
              </p>
            </div>
            <ScoreRing score={score} total={total} />
          </div>
        </div>

        <h3 className="mb-3 text-sm font-semibold text-white/40">
          答题详情
        </h3>
        <div className="space-y-3">
          {session.answers.map((answer) => (
            <StepCard
              key={answer.stepOrder}
              answer={answer}
              onScreenshotClick={(url) => setScreenshotUrl(url)}
            />
          ))}
        </div>

        <div className="mt-8">
          <button
            onClick={() => navigate('/student')}
            className="w-full rounded-xl bg-white/10 px-6 py-3 font-semibold transition hover:bg-white/20"
          >
            返回关卡
          </button>
        </div>
      </div>

      {screenshotUrl && (
        <ScreenshotModal
          dataUrl={screenshotUrl}
          onClose={() => setScreenshotUrl(null)}
        />
      )}
    </div>
  );
}
