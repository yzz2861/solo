import type { CropStage } from '../../shared/types';
import { CROP_STAGE_LABELS } from '../../shared/types';
import { Sprout, Flower2, Apple, Citrus, Cherry } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
  value: CropStage;
  onChange: (v: CropStage) => void;
}

const STAGES: Array<{
  key: Exclude<CropStage, null>;
  icon: typeof Sprout;
  gradient: string;
  duration: string;
}> = [
  {
    key: 'seedling',
    icon: Sprout,
    gradient: 'from-greenhouse-100 to-greenhouse-50',
    duration: '播后20天',
  },
  {
    key: 'flowering',
    icon: Flower2,
    gradient: 'from-pink-50 to-greenhouse-50',
    duration: '20~40天',
  },
  {
    key: 'fruit_set',
    icon: Apple,
    gradient: 'from-yellow-50 to-greenhouse-50',
    duration: '40~55天',
  },
  {
    key: 'fruit_expansion',
    icon: Citrus,
    gradient: 'from-orange-50 to-yellow-50',
    duration: '55~85天',
  },
  {
    key: 'mature',
    icon: Cherry,
    gradient: 'from-red-50 to-orange-50',
    duration: '85天+',
  },
];

const CropStageTimeline = ({ value, onChange }: Props) => {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-greenhouse-800">作物生长阶段</p>
        <span
          className={clsx('text-xs', {
            'text-warning-600': !value,
            'text-greenhouse-500': value,
          })}
        >
          {value
            ? `已选：${CROP_STAGE_LABELS[value]}`
            : '未选择，将保守估算×1.15'}
        </span>
      </div>

      <div className="relative">
        <div
          className={clsx(
            'hidden sm:block absolute left-[10%] right-[10%] top-14 h-1 rounded-full',
            value ? 'bg-greenhouse-200' : 'bg-greenhouse-100'
          )}
        />
        <div className="grid grid-cols-5 gap-1 sm:gap-2 relative">
          {STAGES.map((s, idx) => {
            const Icon = s.icon;
            const selected = value === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => onChange(selected ? null : s.key)}
                className={clsx(
                  'relative flex flex-col items-center gap-2 p-2 sm:p-3 rounded-2xl transition-all duration-300',
                  selected
                    ? `bg-gradient-to-br ${s.gradient} border-2 border-greenhouse-500 shadow-card -translate-y-0.5`
                    : 'bg-greenhouse-50/60 border border-greenhouse-100 hover:bg-greenhouse-50 hover:border-greenhouse-300'
                )}
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div
                  className={clsx(
                    'w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center',
                    selected
                      ? 'bg-greenhouse-600 text-white shadow-soft'
                      : 'bg-white text-greenhouse-600 border border-greenhouse-100'
                  )}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="text-center leading-tight space-y-0.5 min-w-0">
                  <p
                    className={clsx(
                      'text-xs sm:text-sm font-semibold truncate',
                      selected ? 'text-greenhouse-800' : 'text-greenhouse-700'
                    )}
                  >
                    {CROP_STAGE_LABELS[s.key]}
                  </p>
                  <p className="text-[10px] sm:text-xs text-greenhouse-500 hidden sm:block">
                    {s.duration}
                  </p>
                </div>
                {selected && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-greenhouse-600 text-white flex items-center justify-center text-xs shadow-soft">
                    ✓
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CropStageTimeline;
