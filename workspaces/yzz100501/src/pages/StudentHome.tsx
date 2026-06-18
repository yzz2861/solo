import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  Flame,
  Wine,
  Beaker,
  Plus,
  Star,
  ArrowLeft,
  Zap,
} from 'lucide-react';
import useGameStore from '@/stores/useGameStore';
import useLevelStore from '@/stores/useLevelStore';
import type { Level } from '@/types';

const categoryConfig: Record<
  Level['category'],
  { icon: React.ElementType; borderColor: string; bgColor: string }
> = {
  'acid-base': {
    icon: FlaskConical,
    borderColor: 'border-green-500',
    bgColor: 'bg-green-500/10',
  },
  'alcohol-lamp': {
    icon: Flame,
    borderColor: 'border-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  glassware: {
    icon: Wine,
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  general: {
    icon: Beaker,
    borderColor: 'border-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  custom: {
    icon: Plus,
    borderColor: 'border-gray-400',
    bgColor: 'bg-gray-400/10',
  },
};

function DifficultyStars({ difficulty }: { difficulty: 1 | 2 | 3 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          size={14}
          className={
            i <= difficulty
              ? 'fill-orange-400 text-orange-400'
              : 'fill-transparent text-gray-600'
          }
        />
      ))}
    </div>
  );
}

export default function StudentHome() {
  const navigate = useNavigate();
  const user = useGameStore((s) => s.user);
  const { levels, loadLevels } = useLevelStore();

  useEffect(() => {
    if (!user) {
      navigate('/login?role=student', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    loadLevels();
  }, [loadLevels]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0D3B2E] text-white">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="rounded-full bg-white/10 p-2 transition hover:bg-white/20"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold">
              选择实验关卡
            </h1>
            <p className="mt-1 text-white/60">
              你好，{user.name}！选择一个关卡开始学习吧
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {levels.map((level) => {
            const config = categoryConfig[level.category];
            const Icon = config.icon;

            return (
              <div
                key={level.id}
                className={`group cursor-pointer rounded-xl border-2 ${config.borderColor} ${config.bgColor} p-5 transition hover:scale-[1.02] hover:shadow-lg`}
                onClick={() => navigate(`/student/play/${level.id}`)}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.bgColor}`}
                  >
                    <Icon size={22} className="text-white" />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/student/quiz/${level.id}`);
                    }}
                    className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs transition hover:bg-white/20"
                  >
                    <Zap size={12} />
                    快速测验
                  </button>
                </div>

                <h2 className="mb-1 text-lg font-semibold">{level.title}</h2>
                <p className="mb-3 line-clamp-2 text-sm text-white/60">
                  {level.description}
                </p>

                <div className="flex items-center justify-between">
                  <DifficultyStars difficulty={level.difficulty} />
                  <span className="text-xs text-white/40">
                    {level.steps.length} 步
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {levels.length === 0 && (
          <div className="py-16 text-center text-white/40">
            暂无可用关卡
          </div>
        )}
      </div>
    </div>
  );
}
