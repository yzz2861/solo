import { Plus, Trash2, Droplets, Wheat } from 'lucide-react';
import { useRecipeStore } from '@/store';
import type { Unit } from '@/types';
import { isWaterContained } from '@/utils/calculator';

const unitOptions: Unit[] = ['g', 'kg', '%'];

export function RecipeInput() {
  const recipe = useRecipeStore((s) => s.recipe);
  const updateIngredient = useRecipeStore((s) => s.updateIngredient);
  const addIngredient = useRecipeStore((s) => s.addIngredient);
  const removeIngredient = useRecipeStore((s) => s.removeIngredient);
  const adjustments = useRecipeStore((s) => s.result?.adjustments || []);

  const starterWarning = adjustments.find((a) => a.type === 'warning');

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-bakery-orange/20 overflow-hidden">
      <div className="bg-gradient-to-r from-bakery-brown to-bakery-brownLight px-6 py-4">
        <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2">
          <Wheat className="w-5 h-5" />
          基础配方
        </h2>
        <p className="text-bakery-cream/80 text-sm mt-1">
          支持克(g)、公斤(kg)、烘焙百分比(%)混写
        </p>
      </div>

      <div className="p-5">
        {starterWarning && (
          <div className="mb-4 p-3 bg-bakery-orange/10 border border-bakery-orange/30 rounded-xl flex items-start gap-2 animate-fade-in">
            <Droplets className="w-5 h-5 text-bakery-orange flex-shrink-0 mt-0.5" />
            <p className="text-sm text-bakery-brownDark">{starterWarning.description}</p>
          </div>
        )}

        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 px-2 py-2 text-xs font-medium text-bakery-brown/60">
            <div className="col-span-4">原料名称</div>
            <div className="col-span-3 text-right">用量</div>
            <div className="col-span-3">单位</div>
            <div className="col-span-2"></div>
          </div>

          {recipe.map((ing, idx) => {
            const isZero = ing.value === 0;
            const containsWater = isWaterContained(ing.name);
            const isFlour = ing.category === 'flour';
            const flourCount = recipe.filter((i) => i.category === 'flour').length;
            const canRemove = !(isFlour && flourCount <= 1);

            return (
              <div
                key={ing.id}
                className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl transition-all ${
                  isZero
                    ? 'bg-gray-50'
                    : containsWater
                    ? 'bg-bakery-waterLight/10 border border-bakery-water/20'
                    : 'bg-bakery-cream/50 hover:bg-bakery-cream'
                }`}
              >
                <div className="col-span-4 relative">
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => updateIngredient(ing.id, { name: e.target.value })}
                    className={`w-full px-3 py-2 bg-transparent border-b-2 border-transparent focus:border-bakery-orange outline-none transition-colors font-medium ${
                      isZero ? 'text-gray-400' : 'text-bakery-brownDark'
                    }`}
                    placeholder="原料名"
                  />
                  {containsWater && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-bakery-water rounded-full flex items-center justify-center">
                      <Droplets className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                  {isZero && (
                    <span className="absolute bottom-full left-0 mb-1 px-2 py-0.5 bg-gray-500 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      此项为0
                    </span>
                  )}
                </div>

                <div className="col-span-3">
                  <input
                    type="number"
                    value={ing.value}
                    onChange={(e) =>
                      updateIngredient(ing.id, { value: parseFloat(e.target.value) || 0 })
                    }
                    step="0.1"
                    min="0"
                    className={`w-full px-3 py-2 text-right font-mono font-semibold bg-white border border-bakery-orange/20 rounded-lg focus:border-bakery-orange focus:ring-2 focus:ring-bakery-orange/20 outline-none transition-all ${
                      isZero ? 'text-gray-400' : 'text-bakery-brownDark'
                    }`}
                  />
                </div>

                <div className="col-span-3">
                  <select
                    value={ing.unit}
                    onChange={(e) =>
                      updateIngredient(ing.id, { unit: e.target.value as Unit })
                    }
                    className="w-full px-2 py-2 bg-white border border-bakery-orange/20 rounded-lg focus:border-bakery-orange focus:ring-2 focus:ring-bakery-orange/20 outline-none transition-all text-bakery-brownDark font-medium cursor-pointer"
                  >
                    {unitOptions.map((u) => (
                      <option key={u} value={u}>
                        {u === '%' ? '% (烘焙%)' : u}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 flex justify-end">
                  {containsWater && (
                    <div className="flex-1 mr-2">
                      <input
                        type="number"
                        value={ing.hydrationRatio || 65}
                        onChange={(e) =>
                          updateIngredient(ing.id, {
                            hydrationRatio: parseFloat(e.target.value) || 65,
                          })
                        }
                        min="0"
                        max="100"
                        className="w-full px-2 py-1 text-xs text-center bg-bakery-water/10 border border-bakery-water/30 rounded text-bakery-water"
                        title="含水量%"
                      />
                    </div>
                  )}
                  <button
                    onClick={() => removeIngredient(ing.id)}
                    disabled={!canRemove}
                    className={`p-2 rounded-lg transition-all ${
                      canRemove
                        ? 'text-bakery-orange hover:bg-bakery-orange/10 hover:text-bakery-brown'
                        : 'text-gray-300 cursor-not-allowed'
                    }`}
                    title={canRemove ? '删除' : '至少保留一种面粉'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={addIngredient}
          className="mt-4 w-full py-3 border-2 border-dashed border-bakery-orange/30 rounded-xl text-bakery-orange hover:border-bakery-orange hover:bg-bakery-orange/5 transition-all flex items-center justify-center gap-2 font-medium"
        >
          <Plus className="w-4 h-4" />
          添加原料
        </button>

        <div className="mt-4 p-3 bg-bakery-cream rounded-xl">
          <p className="text-xs text-bakery-brown/70 leading-relaxed">
            💡 <strong>提示：</strong>烘焙百分比以面粉总量为100%基准。
            含水原料（老面/种面/汤种）会自动扣除其中水分，避免重复算水。
            数字旁<span className="inline-flex items-center justify-center w-4 h-4 bg-bakery-water rounded-full"><Droplets className="w-2.5 h-2.5 text-white" /></span>标记表示已识别为预含水原料。
          </p>
        </div>
      </div>
    </div>
  );
}
