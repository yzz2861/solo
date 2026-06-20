import React, { useState } from 'react';
import { Plus, Trash2, RefreshCw, Calculator, Target, Scale } from 'lucide-react';
import { useCalculatorStore } from '@/store/useCalculatorStore';

export const FormulaPanel: React.FC = () => {
  const {
    ingredients,
    standards,
    selectedStandardIndex,
    currentFormula,
    setSelectedStandard,
    updateFormula,
    updateFormulaItem,
    addFormulaItem,
    removeFormulaItem,
    replaceFormulaItem,
    calculate,
  } = useCalculatorStore();

  const [selectedToReplace, setSelectedToReplace] = useState<string | null>(null);

  const totalRatio = currentFormula.items.reduce((sum, item) => sum + item.ratio, 0);
  const ratioDiff = 100 - totalRatio;

  const availableIngredients = ingredients.filter(
    (i) => !currentFormula.items.some((fi) => fi.ingredientId === i.id)
  );

  const handleReplace = (oldId: string, newId: string) => {
    replaceFormulaItem(oldId, newId);
    setSelectedToReplace(null);
  };

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-wheat-green" />
          <h2 className="text-xl font-bold text-gray-800">配方设置</h2>
        </div>
        <button
          className="btn btn-primary"
          onClick={calculate}
        >
          <Calculator className="w-4 h-4" />
          开始计算
        </button>
      </div>

      <div className="card-body space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">养殖对象</label>
            <select
              className="input"
              value={selectedStandardIndex}
              onChange={(e) => setSelectedStandard(Number(e.target.value))}
            >
              {standards.map((s, i) => (
                <option key={i} value={i}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">日耗量 (公斤/天)</label>
            <input
              type="number"
              className="input"
              value={currentFormula.dailyConsumption}
              onChange={(e) =>
                updateFormula({ dailyConsumption: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="label">目标出料量 (公斤)</label>
            <input
              type="number"
              className="input"
              value={currentFormula.targetOutput}
              onChange={(e) =>
                updateFormula({ targetOutput: Number(e.target.value) })
              }
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-soil-brown" />
              <span className="font-medium text-gray-700">原料配比</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`font-mono font-bold ${
                  Math.abs(ratioDiff) < 0.1
                    ? 'text-success-green'
                    : 'text-warning-red'
                }`}
              >
                合计: {totalRatio.toFixed(1)}%
                {Math.abs(ratioDiff) >= 0.1 &&
                  ` (${ratioDiff > 0 ? '还差' : '超出'}${Math.abs(ratioDiff).toFixed(1)}%)`}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {currentFormula.items.map((item) => {
              const ingredient = ingredients.find(
                (i) => i.id === item.ingredientId
              );
              if (!ingredient) return null;

              const quantity = (
                currentFormula.targetOutput *
                (item.ratio / 100)
              ).toFixed(2);

              return (
                <div
                  key={item.ingredientId}
                  className="flex items-center gap-3 p-3 bg-field rounded-lg animate-fade-in"
                >
                  <span className="text-2xl">{ingredient.emoji}</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">
                      {ingredient.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      用量: {quantity} 公斤 | 库存: {ingredient.inventory} 公斤
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="80"
                      step="0.5"
                      value={item.ratio}
                      onChange={(e) =>
                        updateFormulaItem(
                          item.ingredientId,
                          Number(e.target.value)
                        )
                      }
                      className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-wheat-green"
                    />
                    <div className="w-20">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        className="input input-sm text-right font-mono"
                        value={item.ratio}
                        onChange={(e) =>
                          updateFormulaItem(
                            item.ingredientId,
                            Number(e.target.value)
                          )
                        }
                      />
                    </div>
                    <span className="text-gray-500">%</span>
                    <button
                      className="btn btn-ghost p-1"
                      onClick={() =>
                        setSelectedToReplace(
                          selectedToReplace === item.ingredientId
                            ? null
                            : item.ingredientId
                        )
                      }
                      title="替换原料"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      className="btn btn-ghost p-1 text-warning-red"
                      onClick={() => removeFormulaItem(item.ingredientId)}
                      title="移除原料"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {selectedToReplace && availableIngredients.length > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 animate-fade-in">
                <div className="text-sm text-blue-800 mb-2">
                  🔄 选择替换原料：
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableIngredients.map((ing) => (
                    <button
                      key={ing.id}
                      className="btn btn-outline btn-sm"
                      onClick={() => handleReplace(selectedToReplace, ing.id)}
                    >
                      {ing.emoji} {ing.name}
                    </button>
                  ))}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setSelectedToReplace(null)}
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

            {availableIngredients.length > 0 && !selectedToReplace && (
              <div className="relative">
                <button
                  className="btn btn-outline w-full justify-center"
                  onClick={() => addFormulaItem(availableIngredients[0].id)}
                >
                  <Plus className="w-4 h-4" />
                  添加原料到配方
                </button>
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 hidden group-hover:block">
                  {availableIngredients.map((ing) => (
                    <button
                      key={ing.id}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                      onClick={() => addFormulaItem(ing.id)}
                    >
                      <span>{ing.emoji}</span>
                      <span>{ing.name}</span>
                      <span className="text-sm text-gray-400 ml-auto">
                        库存: {ing.inventory}kg
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-cream rounded-lg border border-soil-brown/20">
          <div className="text-sm text-soil-brown">
            📝 营养标准要求：粗蛋白≥{standards[selectedStandardIndex]?.minCrudeProtein}% | 
            代谢能≥{standards[selectedStandardIndex]?.minMetabolizableEnergy} MJ/kg | 
            钙{standards[selectedStandardIndex]?.minCalcium}-{standards[selectedStandardIndex]?.maxCalcium}% | 
            磷≥{standards[selectedStandardIndex]?.minPhosphorus}% | 
            赖氨酸≥{standards[selectedStandardIndex]?.minLysine}%
          </div>
        </div>
      </div>
    </div>
  );
};
