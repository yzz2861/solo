import { Clock, Bed, Users, Ambulance, Cloud, Moon, Sun, Users2 } from 'lucide-react';
import type { Resources, Scenario } from '../types';
import { formatTime, getScenarioLabel } from '../utils/scoring';

interface StatusBarProps {
  elapsedTime: number;
  timeLimit?: number;
  resources: Resources;
  scenario: Scenario;
  casualtyCount: number;
}

export default function StatusBar({
  elapsedTime,
  timeLimit,
  resources,
  scenario,
  casualtyCount,
}: StatusBarProps) {
  const remainingTime = timeLimit ? timeLimit - elapsedTime : null;
  const timeWarning = timeLimit && remainingTime !== null && remainingTime < 60;
  
  const scenarioIcon = {
    daytime: Sun,
    night: Moon,
    rainy: Cloud,
    crowded: Users2,
  };
  
  const ScenarioIcon = scenarioIcon[scenario] || Sun;
  
  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Clock className={timeWarning ? 'text-red-400 animate-pulse' : 'text-cyan-400'} size={20} />
            <span className={timeWarning ? 'text-red-400 font-bold' : 'text-white font-medium'}>
              {formatTime(elapsedTime)}
              {timeLimit && (
                <span className="text-gray-400 text-sm ml-1">
                  / {formatTime(timeLimit)}
                </span>
              )}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <ScenarioIcon className="text-amber-400" size={20} />
            <span className="text-sm">{getScenarioLabel(scenario)}场景</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="text-emerald-400" size={20} />
            <span className="text-sm">{casualtyCount} 名伤员</span>
          </div>
        </div>
        
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 bg-slate-600/50 px-3 py-1.5 rounded-lg">
            <Bed className="text-orange-300" size={18} />
            <span className="text-sm font-medium">担架: {resources.stretchers}</span>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-600/50 px-3 py-1.5 rounded-lg">
            <Users className="text-blue-300" size={18} />
            <span className="text-sm font-medium">医护: {resources.medics}</span>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-600/50 px-3 py-1.5 rounded-lg">
            <Ambulance className="text-red-300" size={18} />
            <span className="text-sm font-medium">救护车: {resources.ambulances}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
