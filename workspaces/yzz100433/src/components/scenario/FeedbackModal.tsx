import { CheckCircle, XCircle, BookOpen, ArrowRight, RotateCcw } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

interface FeedbackModalProps {
  isCorrect: boolean;
  explanations: string[];
  onNext: () => void;
  onRetry?: () => void;
  show?: boolean;
}

export default function FeedbackModal({
  isCorrect,
  explanations,
  onNext,
  onRetry,
  show = true,
}: FeedbackModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div
        className={`bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto animate-bounce-soft ${
          isCorrect ? 'shadow-2xl shadow-matcha-500/20' : 'shadow-2xl shadow-red-500/20'
        }`}
      >
        <div className="text-center mb-6">
          {isCorrect ? (
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-matcha-100 mb-4 animate-celebrate">
              <CheckCircle className="w-12 h-12 text-matcha-500" />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-4">
              <XCircle className="w-12 h-12 text-red-500 animate-shake" />
            </div>
          )}
          <h2
            className={`text-2xl font-bold ${
              isCorrect ? 'text-matcha-600' : 'text-red-600'
            }`}
          >
            {isCorrect ? '🎉 太棒了！' : '😅 再想想哦'}
          </h2>
          <p className="text-caramel-600 mt-2">
            {isCorrect
              ? '计算完全正确，继续保持！'
              : '没关系，看看规则解释就懂了~'}
          </p>
        </div>

        {explanations.length > 0 && (
          <div className="bg-primary-50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-5 h-5 text-primary-500" />
              <h3 className="font-bold text-caramel-700">规则解释</h3>
            </div>
            <div className="space-y-2">
              {explanations.map((exp, idx) => (
                <p
                  key={idx}
                  className="text-sm text-caramel-700 animate-fade-in"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  {exp}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {!isCorrect && onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-peach-100 text-peach-700 font-semibold rounded-xl hover:bg-peach-200 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              再试一次
            </button>
          )}
          <button
            onClick={onNext}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-semibold rounded-xl transition-colors ${
              isCorrect
                ? 'bg-matcha-500 text-white hover:bg-matcha-600'
                : 'bg-primary-500 text-white hover:bg-primary-600'
            }`}
          >
            {isCorrect ? '下一题' : '跳过'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
