import React from 'react';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { NutritionResult } from '@/types';
import { useCalculatorStore } from '@/store/useCalculatorStore';

interface NutritionGaugeProps {
  result: NutritionResult;
}

export const NutritionGauge: React.FC<NutritionGaugeProps> = ({ result }) => {
  const { ingredients, currentFormula } = useCalculatorStore();

  const nutrients = [
    {
      key: 'crudeProtein',
      label: '粗蛋白',
      value: result.crudeProtein,
      icon: '🥩',
      color: 'from-green-400 to-green-600',
    },
    {
      key: 'metabolizableEnergy',
      label: '代谢能',
      value: result.metabolizableEnergy,
      icon: '⚡',
      color: 'from-yellow-400 to-orange-500',
    },
    {
      key: 'calcium',
      label: '钙',
      value: result.calcium,
      icon: '🦴',
      color: 'from-blue-400 to-blue-600',
    },
    {
      key: 'phosphorus',
      label: '磷',
      value: result.phosphorus,
      icon: '💎',
      color: 'from-purple-400 to-purple-600',
    },
    {
      key: 'lysine',
      label: '赖氨酸',
      value: result.lysine,
      icon: '🧬',
      color: 'from-pink-400 to-pink-600',
    },
  ] as const;

  const getProgressPercent = (value: any) => {
    if ('target' in value) {
      const min = value.target * 0.8;
      const max = value.target * 1.2;
      return Math.min(100, Math.max(0, ((value.actual - min) / (max - min)) * 100));
    } else {
      const min = value.min * 0.8;
      const max = value.max * 1.2;
      return Math.min(100, Math.max(0, ((value.actual - min) / (max - min)) * 100));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <TrendingUp className="w-4 h-4 text-success-green" />;
      case 'warn':
        return <Minus className="w-4 h-4 text-caution-orange" />;
      case 'fail':
        return <TrendingDown className="w-4 h-4 text-warning-red" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pass':
        return '达标';
      case 'warn':
        return '偏低';
      case 'fail':
        return '不足';
      default:
        return '';
    }
  };

  const topContributors = React.useMemo(() => {
    const contributions: { name: string; emoji: string; value: number; nutrient: string }[] = [];

    currentFormula.items.forEach(item => {
      const ingredient = ingredients.find(i => i.id === item.ingredientId);
      if (!ingredient) return;

      const ratioDecimal = item.ratio / 100;
      contributions.push({
        name: ingredient.name,
        emoji: ingredient.emoji,
        value: ratioDecimal * ingredient.crudeProtein,
        nutrient: '粗蛋白',
      });
    });

    return contributions
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
  }, [currentFormula.items, ingredients]);

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-wheat-green" />
          <h2 className="text-xl font-bold text-gray-800">营养指标分析</h2>
        </div>
        <div className="text-sm text-gray-500">
          基于 {currentFormula.targetOutput} 公斤配料
        </div>
      </div>

      <div className="card-body space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {nutrients.map((nutrient) => {
            const progress = getProgressPercent(nutrient.value);
            const isCalcium = nutrient.key === 'calcium';
            const target = isCalcium
              ? `${nutrient.value.min}-${nutrient.value.max}`
              : `≥${nutrient.value.target}`;

            return (
              <div
                key={nutrient.key}
                className={`p-4 rounded-xl border-2 transition-all ${
                  nutrient.value.status === 'fail'
                    ? 'border-warning-red/30 bg-red-50'
                    : nutrient.value.status === 'warn'
                    ? 'border-caution-orange/30 bg-orange-50'
                    : 'border-success-green/30 bg-green-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{nutrient.icon}</span>
                  {getStatusIcon(nutrient.value.status)}
                </div>
                <div className="font-bold text-gray-800 mb-1">{nutrient.label}</div>
                <div className="font-mono text-2xl font-bold mb-1">
                  {nutrient.value.actual}
                  <span className="text-sm text-gray-500 ml-1">{nutrient.value.unit}</span>
                </div>
                <div className="text-xs text-gray-500 mb-3">目标: {target}</div>
                <div className="progress-bar">
                  <div
                    className={`progress-fill ${nutrient.value.status} bg-gradient-to-r ${nutrient.color}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-2 text-right text-xs">
                  <span className={`status-badge ${nutrient.value.status}`}>
                    {getStatusText(nutrient.value.status)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-gradient-to-r from-field to-white rounded-xl">
          <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
            📊 粗蛋白主要贡献原料
          </h3>
          <div className="space-y-2">
            {topContributors.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center gap-3 p-2 bg-white rounded-lg"
              >
                <span className="w-6 h-6 flex items-center justify-center bg-wheat-green text-white rounded-full text-sm font-bold">
                  {index + 1}
                </span>
                <span className="text-xl">{item.emoji}</span>
                <span className="flex-1 font-medium">{item.name}</span>
                <span className="font-mono text-wheat-green font-bold">
                  +{item.value.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
          <div className="text-sm text-amber-800">
            💡 <strong>单位说明：</strong>
            百分比(%)表示每100克饲料中的含量；克/公斤(g/kg)表示每1000克饲料中的含量。
            1% = 10 g/kg。
          </div>
        </div>
      </div>
    </div>
  );
};
