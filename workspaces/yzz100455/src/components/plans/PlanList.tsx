import { usePlanStore, useCalculatorStore } from '@/store';
import { formatWatt } from '@/utils/unitConverter';
import { Trash2, Edit3, GripVertical } from 'lucide-react';
import { USAGE_TYPE_ICONS } from './PlanIcons';

interface PlanListProps {
  onApply?: () => void;
}

export default function PlanList({ onApply }: PlanListProps) {
  const { plans, deletePlan, loadPlan } = usePlanStore();
  const { setParams } = useCalculatorStore();

  const handleApply = (id: string) => {
    const plan = loadPlan(id);
    if (plan) {
      setParams(plan.params);
      onApply?.();
    }
  };

  if (plans.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400">
        <div className="text-4xl mb-3">📋</div>
        <p className="text-sm">还没有保存的方案</p>
        <p className="text-xs mt-1">调整好参数后点击「保存方案」</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {plans.map((plan, index) => {
        const IconComponent = USAGE_TYPE_ICONS[plan.params.usageType];
        return (
          <div
            key={plan.id}
            className="group p-4 bg-white rounded-xl border border-slate-200 hover:border-ice-300 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-ice-100 text-ice-600 flex items-center justify-center">
                <IconComponent size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-slate-800 truncate">{plan.name}</h4>
                  <span className="text-xs text-slate-400">
                    #{index + 1}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                  <span>
                    {plan.params.area} {plan.params.areaUnit === 'sqm' ? '㎡' : 'sqft'}
                  </span>
                  <span>·</span>
                  <span>{plan.params.peopleCount} 人</span>
                  <span>·</span>
                  <span className="text-ice-600 font-mono">
                    {formatWatt(plan.result.totalCoolingLoad)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleApply(plan.id)}
                className="flex-1 py-1.5 text-xs font-medium text-ice-600 bg-ice-50 rounded-lg hover:bg-ice-100 transition-colors flex items-center justify-center gap-1"
              >
                <Edit3 size={14} />
                应用
              </button>
              <button
                onClick={() => deletePlan(plan.id)}
                className="px-3 py-1.5 text-xs font-medium text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
              >
                <Trash2 size={14} />
                删除
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
