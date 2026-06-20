import React from 'react';
import { Plus, Trash2, Calculator, Copy, Check } from 'lucide-react';
import { useCalculatorStore } from '@/store/useCalculatorStore';
import { comparePlans } from '@/engine/comparison';
import { CalculationResult } from '@/types';

export const PlanComparison: React.FC = () => {
  const {
    ingredients,
    comparisonPlans,
    currentResult,
    addComparisonPlan,
    removeComparisonPlan,
    calculateComparisonPlan,
    updateComparisonPlan,
  } = useCalculatorStore();

  const allResults: (CalculationResult | null)[] = [
    currentResult,
    ...comparisonPlans.map((p) => p.result),
  ];

  const { bestPlanIndex, comparison } = comparePlans(allResults);

  const planNames = ['当前方案', ...comparisonPlans.map((p) => p.name)];

  const handleCopyCurrent = (planId: string) => {
    const { currentFormula } = useCalculatorStore.getState();
    updateComparisonPlan(planId, {
      formula: {
        ...currentFormula,
        id: `formula-${planId}`,
        name: `${planNames[comparisonPlans.findIndex(p => p.id === planId) + 1]}配方`,
      },
    });
    setTimeout(() => calculateComparisonPlan(planId), 100);
  };

  if (comparisonPlans.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-8">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-bold text-gray-700 mb-2">添加对比方案</h3>
          <p className="text-gray-500 mb-4">
            最多可以添加3套替代方案，对比不同配方的营养、库存和成本
          </p>
          <button className="btn btn-primary" onClick={addComparisonPlan}>
            <Plus className="w-4 h-4" />
            添加对比方案
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚖️</span>
          <h2 className="text-xl font-bold text-gray-800">方案对比分析</h2>
        </div>
        {comparisonPlans.length < 3 && (
          <button className="btn btn-outline btn-sm" onClick={addComparisonPlan}>
            <Plus className="w-4 h-4" />
            添加方案
          </button>
        )}
      </div>

      <div className="card-body space-y-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">指标</th>
                <th
                  className={`text-center py-3 px-4 font-medium ${
                    bestPlanIndex === 0 ? 'text-wheat-green' : 'text-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    {planNames[0]}
                    {bestPlanIndex === 0 && (
                      <span className="status-badge pass">最优</span>
                    )}
                  </div>
                </th>
                {comparisonPlans.map((plan, idx) => (
                  <th
                    key={plan.id}
                    className={`text-center py-3 px-4 font-medium ${
                      bestPlanIndex === idx + 1 ? 'text-wheat-green' : 'text-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="text"
                        className="input input-sm text-center w-24"
                        value={plan.name}
                        onChange={(e) =>
                          updateComparisonPlan(plan.id, { name: e.target.value })
                        }
                      />
                      {bestPlanIndex === idx + 1 && (
                        <span className="status-badge pass">最优</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={`border-b border-gray-100 ${
                    row.metric === '综合评分' ? 'bg-field/50' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-medium text-gray-700">{row.metric}</td>
                  {row.values.map((val, colIdx) => (
                    <td
                      key={colIdx}
                      className={`text-center py-3 px-4 font-mono ${
                        colIdx === row.bestIndex && row.bestIndex >= 0
                          ? 'text-wheat-green font-bold'
                          : 'text-gray-600'
                      } ${colIdx === bestPlanIndex ? 'bg-green-50/50' : ''}`}
                    >
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {comparisonPlans.map((plan, idx) => (
            <div
              key={plan.id}
              className={`p-4 rounded-xl border-2 ${
                bestPlanIndex === idx + 1
                  ? 'border-wheat-green highlight-best'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">{plan.name}</h3>
                <div className="flex gap-1">
                  <button
                    className="btn btn-ghost p-1"
                    onClick={() => handleCopyCurrent(plan.id)}
                    title="复制当前配方"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    className="btn btn-ghost p-1 text-warning-red"
                    onClick={() => removeComparisonPlan(plan.id)}
                    title="删除方案"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {plan.formula.items.map((item) => {
                  const ingredient = ingredients.find(
                    (i) => i.id === item.ingredientId
                  );
                  if (!ingredient) return null;

                  return (
                    <div
                      key={item.ingredientId}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span>{ingredient.emoji}</span>
                      <span className="flex-1">{ingredient.name}</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        className="input input-sm w-16 text-right"
                        value={item.ratio}
                        onChange={(e) => {
                          const newItems = plan.formula.items.map((i) =>
                            i.ingredientId === item.ingredientId
                              ? { ...i, ratio: Number(e.target.value) }
                              : i
                          );
                          updateComparisonPlan(plan.id, {
                            formula: { ...plan.formula, items: newItems },
                          });
                        }}
                      />
                      <span className="text-gray-500">%</span>
                    </div>
                  );
                })}
              </div>

              <button
                className="btn btn-primary w-full"
                onClick={() => calculateComparisonPlan(plan.id)}
              >
                <Calculator className="w-4 h-4" />
                计算此方案
              </button>

              {plan.result && (
                <div className="mt-4 p-3 bg-field rounded-lg">
                  <div className="text-sm text-gray-600">
                    <div className="flex justify-between mb-1">
                      <span>综合评分</span>
                      <span className="font-bold text-wheat-green">{plan.result.score}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span>成本</span>
                      <span className="font-mono">{plan.result.costPerKg}元/kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>可用天数</span>
                      <span className="font-mono">{plan.result.availableDays}天</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {bestPlanIndex >= 0 && (
          <div className="p-4 bg-green-50 rounded-xl border border-green-200">
            <div className="flex items-center gap-2 text-green-800">
              <Check className="w-5 h-5" />
              <span className="font-medium">
                推荐选择 <strong>{planNames[bestPlanIndex]}</strong>，
                在营养达标、库存消耗和成本控制方面综合表现最佳。
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
