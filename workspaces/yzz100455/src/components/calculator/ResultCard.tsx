import { useCalculatorStore } from '@/store';
import { getLoadPercentage } from '@/utils/coolingLoad';
import { formatWatt } from '@/utils/unitConverter';
import { Thermometer, Users, Monitor, Lightbulb, Building2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ResultCard() {
  const { result, params } = useCalculatorStore();
  const [displayLoad, setDisplayLoad] = useState(result.totalCoolingLoad);
  const percentages = getLoadPercentage(result);

  useEffect(() => {
    const start = displayLoad;
    const end = result.totalCoolingLoad;
    const duration = 400;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayLoad(Math.round(start + (end - start) * eased));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [result.totalCoolingLoad]);

  const loadItems = [
    { key: 'building', label: '建筑围护', value: result.buildingLoad, icon: Building2, color: 'bg-ice-500' },
    { key: 'human', label: '人员散热', value: result.humanLoad, icon: Users, color: 'bg-amber-500' },
    { key: 'equipment', label: '设备发热', value: result.equipmentLoad, icon: Monitor, color: 'bg-violet-500' },
    { key: 'lighting', label: '照明负荷', value: result.lightingLoad, icon: Lightbulb, color: 'bg-yellow-500' },
  ];

  return (
    <div className="space-y-5">
      <div className="text-center pb-4 border-b border-slate-200">
        <div className="text-sm text-slate-500 mb-2">估算冷负荷</div>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-5xl font-bold text-ice-600 font-mono tracking-tight">
            {formatWatt(displayLoad).split(' ')[0]}
          </span>
          <span className="text-xl font-medium text-ice-500">
            {formatWatt(displayLoad).split(' ')[1]}
          </span>
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 bg-ice-50 text-ice-600 rounded-full text-sm">
          <Thermometer size={16} />
          推荐空调：{result.recommendedHP}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-slate-600 mb-3">负荷构成</h4>
        <div className="space-y-3">
          {loadItems.map((item) => {
            const Icon = item.icon;
            const pct = percentages[item.key as keyof typeof percentages];
            return (
              <div key={item.key} className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2 text-slate-700">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    {item.label}
                  </span>
                  <span className="font-mono text-slate-600">
                    {formatWatt(item.value)} ({pct}%)
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500">推荐容量范围</span>
          <span className="font-medium text-slate-700">
            {formatWatt(result.recommendedACMin)} ~ {formatWatt(result.recommendedACMax)}
          </span>
        </div>
        <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden relative">
          <div
            className="absolute h-full bg-gradient-to-r from-ice-300 via-ice-500 to-ice-300 rounded-full"
            style={{
              left: '10%',
              right: '10%',
            }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-ice-600 rounded-full shadow-md"
            style={{ left: '50%', transform: 'translate(-50%, -50%)' }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>偏小</span>
          <span>适中</span>
          <span>偏大</span>
        </div>
      </div>
    </div>
  );
}
