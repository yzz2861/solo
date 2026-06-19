import { CircleDot } from 'lucide-react';
import type { PlantSlot, HealthLevel } from '@/types';
import { PLANT_EMOJI } from '@/data/plants';
import { getHealthLevel } from '@/utils/gameEngine';

interface PlantCardProps {
  plant: PlantSlot;
  onClick: () => void;
}

const healthLabels: Record<HealthLevel, string> = {
  healthy: '健康',
  good: '良好',
  fair: '不佳',
  wilted: '萎蔫',
  dying: '濒死',
};

function healthBarColor(level: HealthLevel): string {
  switch (level) {
    case 'healthy':
      return 'bg-green-500';
    case 'good':
      return 'bg-green-400';
    case 'fair':
      return 'bg-yellow-400';
    case 'wilted':
      return 'bg-orange-400';
    case 'dying':
      return 'bg-red-500';
  }
}

function healthTextColor(level: HealthLevel): string {
  switch (level) {
    case 'healthy':
      return 'text-green-600';
    case 'good':
      return 'text-green-500';
    case 'fair':
      return 'text-yellow-600';
    case 'wilted':
      return 'text-orange-500';
    case 'dying':
      return 'text-red-600';
  }
}

export default function PlantCard({ plant, onClick }: PlantCardProps) {
  const level = getHealthLevel(plant.health);
  const emoji = PLANT_EMOJI[plant.plantType];

  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl bg-white p-4 text-left shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
    >
      <div className="flex items-start gap-3">
        <span className="text-4xl leading-none">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="truncate text-base font-semibold text-stone-800">{plant.customName}</h3>
            {plant.hasDrainHole && (
              <CircleDot size={14} className="shrink-0 text-stone-400" />
            )}
          </div>

          <div className="mt-2 space-y-1.5">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-500">健康</span>
                <span className={`font-medium ${healthTextColor(level)}`}>
                  {healthLabels[level]}
                </span>
              </div>
              <div className="mt-0.5 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  className={`h-full rounded-full transition-all ${healthBarColor(level)}`}
                  style={{ width: `${plant.health}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-500">水分</span>
                <span className="font-medium text-blue-500">{Math.round(plant.soilMoisture)}%</span>
              </div>
              <div className="mt-0.5 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-300 to-blue-500 transition-all"
                  style={{ width: `${plant.soilMoisture}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-2 text-xs text-stone-400">
            {plant.daysSinceWater === 0
              ? '今天已浇水'
              : `已 ${plant.daysSinceWater} 天未浇水`}
          </div>
        </div>
      </div>
    </button>
  );
}
