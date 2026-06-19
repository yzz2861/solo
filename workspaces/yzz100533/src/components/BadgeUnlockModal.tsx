import { Star, Sparkles } from 'lucide-react';
import { PLANT_EMOJI, BADGE_NAMES, BADGE_LEVELS } from '@/data/plants';
import type { PlantType } from '@/types';

interface BadgeUnlockModalProps {
  plantType: PlantType;
  level: number;
  onClose: () => void;
}

export default function BadgeUnlockModal({ plantType, level, onClose }: BadgeUnlockModalProps) {
  const emoji = PLANT_EMOJI[plantType];
  const name = BADGE_NAMES[plantType];
  const levelInfo = BADGE_LEVELS.find(b => b.level === level);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="animate-scale-in relative w-full max-w-xs rounded-3xl bg-gradient-to-b from-amber-50 to-orange-100 p-8 text-center shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Sparkles className="text-amber-400 animate-spin" size={24} />
        </div>

        <div className="mb-4 text-sm font-bold text-amber-600">🎉 恭喜获得新徽章！</div>

        <div className="badge-unlock mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-b from-amber-200 to-amber-400 shadow-lg">
          <span className="text-5xl">{emoji}</span>
        </div>

        <h2 className="mb-1 font-display text-2xl font-bold text-amber-800">{name}</h2>
        <div className="mb-4 flex justify-center gap-1">
          {Array.from({ length: level }).map((_, i) => (
            <Star key={i} size={20} className="text-amber-500 fill-amber-400" />
          ))}
        </div>
        <div className="mb-6 text-amber-600">
          <span className="font-bold">{levelInfo?.name}</span> 级别
        </div>

        <p className="mb-6 text-sm text-amber-700">
          太棒了！你已经掌握了{name.replace('达人', '').replace('能手', '').replace('守护者', '').replace('专家', '')}的养护技巧！
        </p>

        <button
          onClick={onClose}
          className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 py-3 font-bold text-white shadow-lg transition-all hover:shadow-xl active:scale-95"
        >
          太棒了！🌟
        </button>

        <div className="absolute -left-2 top-1/4 text-2xl sparkle" style={{ animationDelay: '0.2s' }}>✨</div>
        <div className="absolute -right-2 top-1/3 text-2xl sparkle" style={{ animationDelay: '0.5s' }}>⭐</div>
        <div className="absolute bottom-1/4 -left-1 text-xl sparkle" style={{ animationDelay: '0.8s' }}>🌟</div>
        <div className="absolute bottom-1/3 -right-1 text-xl sparkle" style={{ animationDelay: '1.1s' }}>💫</div>
      </div>
    </div>
  );
}
