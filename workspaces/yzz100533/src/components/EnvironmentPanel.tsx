import { Sun } from 'lucide-react';
import type { EnvironmentState } from '@/types';
import { SEASON_INFO, WEATHER_INFO } from '@/data/plants';

interface EnvironmentPanelProps {
  environment: EnvironmentState;
}

export default function EnvironmentPanel({ environment }: EnvironmentPanelProps) {
  const seasonInfo = SEASON_INFO[environment.season];
  const weatherInfo = WEATHER_INFO[environment.weather];
  const sunlightPct = Math.round(environment.sunlight * 100);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
      <div className="flex items-center gap-1.5 rounded-lg bg-stone-50 px-3 py-1.5">
        <span className="text-lg">{seasonInfo.icon}</span>
        <span className="text-sm font-medium text-stone-700">{seasonInfo.name}</span>
      </div>

      <div className="flex items-center gap-1.5 rounded-lg bg-stone-50 px-3 py-1.5">
        <span className="text-lg">{weatherInfo.icon}</span>
        <span className="text-sm font-medium text-stone-700">{weatherInfo.name}</span>
      </div>

      <div className="flex items-center gap-1.5 rounded-lg bg-stone-50 px-3 py-1.5">
        <span className="text-sm">🌡️</span>
        <span className="text-sm font-medium text-stone-700">{environment.temperature}°C</span>
      </div>

      <div className="flex items-center gap-1.5 rounded-lg bg-stone-50 px-3 py-1.5">
        <Sun size={16} className={sunlightPct > 60 ? 'text-amber-400' : 'text-stone-400'} />
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full ${
                sunlightPct >= i * 20 ? 'bg-amber-400' : 'bg-stone-200'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
