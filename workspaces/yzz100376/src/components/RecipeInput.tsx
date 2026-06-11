import { Plus, Trash2, Droplets, Wheat, Info, Sliders } from 'lucide-react';
import { useRecipeStore } from '@/store';
import type { Unit } from '@/types';
import { isWaterContained, roundTo } from '@/utils/calculator';

const unitOptions: Unit[] = ['g', 'kg', '%'];

export function RecipeInput() {
  const recipe = useRecipeStore((s) => s.recipe);
  const updateIngredient = useRecipeStore((s) => s.updateIngredient);
  const addIngredient = useRecipeStore((s) => s.addIngredient);
  const removeIngredient = useRecipeStore((s) => s.removeIngredient);
  const adjustments = useRecipeStore((s) => s.result?.adjustments || []);
  const result = useRecipeStore((s) => s.result);
  const envParams = useRecipeStore((s) => s.envParams);

  const starterWarning = adjustments.find((a) => a.type === 'warning');
  const starterInfo = adjustments.find(
    (a) => a.type === 'info' && a.description.includes('老面比例')
  );

  const starterItem = recipe.find(
    (i) => i.category === 'starter' || isWaterContained(i.name)
  );
  const hasStarterRow = !!starterItem;

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

        {hasStarterRow && result && envParams.starterRatio > 0 && (
          <div className="mb-4 p-3 bg-bakery-water/10 border border-bakery-water/30 rounded-xl flex items-start gap-2 animate-fade-in">
            <Sliders className="w-5 h-5 text-bakery-water flex-shrink-0 mt-0.5" />
            <div className="text-sm text-bakery-brownDark">
              <p className="font-medium">老面重量由「老面比例」控制</p>
              <p className="text-bakery-brown/70 text-xs mt-0.5">
                当前比例 {envParams.starterRatio}% → 老面重 {roundTo(result.finalRecipe.find(i => i.category === 'starter')?.value || 0, 0)}g
                （在下方「环境与参数」中调整比例）
              </p>
            </div>
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
            const isStarter = ing.category === 'starter' || containsWater;
            const isFlour = ing.category === 'flour';
            const flourCount = recipe.filter((i) => i.category === 'flour').length;
            const canRemove = !(isFlour && flourCount <= 1) && !isStarter;
            const isStarterControlled = isStarter && envParams.starterRatio > 0;

            const starterFinalWeight = result?.finalRecipe.find(i => i.category === 'starter')?.value || 0;

            return (
              <div
                key={ing.id}
                className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl transition-all ${
                  isZero
                    ? 'bg-gray-50'
                    : isStarter
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
                </div>

                <div className="col-span-3 relative">
                  <input
                    type="number"
                    value={isStarterControlled ? roundTo(starterFinalWeight, 0) : ing.value}
                    onChange={(e) =>
                      updateIngredient(ing.id, { value: parseFloat(e.target.value) || 0 })
                    }
                    step="0.1"
                    min="0"
                    readOnly={isStarterControlled}
                    className={`w-full px-3 py-2 text-right font-mono font-semibold border rounded-lg focus:ring-2 outline-none transition-all ${
                      isStarterControlled
                        ? 'bg-bakery-water/5 border-bakery-water/30 text-bakery-water cursor-not-allowed'
                        : isZero
                        ? 'bg-white border-bakery-orange/20 text-gray-400 focus:border-bakery-orange focus:ring-bakery-orange/20'
                        : 'bg-white border-bakery-orange/20 text-bakery-brownDark focus:border-bakery-orange focus:ring-bakery-orange/20'
                    }`}
                  />
                  {isStarterControlled && (
                    <span className="absolute -top-2 left-2 px-1.5 py-0.5 bg-bakery-water text-white text-[10px] rounded-full font-medium">
                      比例驱动
                    </span>
                  )}
                </div>

                <div className="col-span-3">
                  <select
                    value={ing.unit}
                    onChange={(e) =>
                      updateIngredient(ing.id, { unit: e.target.value as Unit })
                    }
                    disabled={isStarterControlled}
                    className={`w-full px-2 py-2 border rounded-lg focus:ring-2 outline-none transition-all font-medium cursor-pointer ${
                      isStarterControlled
                        ? 'bg-bakery-water/5 border-bakery-water/30 text-bakery-water/70 cursor-not-allowed'
                        : 'bg-white border-bakery-orange/20 text-bakery-brownDark focus:border-bakery-orange focus:ring-bakery-orange/20'
                    }`}
                  >
                    {unitOptions.map((u) => (
                      <option key={u} value={u}>
                        {u === '%' ? '% (烘焙%)' : u}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 flex justify-end items-center gap-1">
                  {containsWater && (
                    <div className="flex-1 flex flex-col items-center">
                      <input
                        type="number"
                        value={ing.hydrationRatio || envParams.starterHydration}
                        onChange={(e) =>
                          updateIngredient(ing.id, {
                            hydrationRatio: parseFloat(e.target.value) || 65,
                          })
                        }
                        min="0"
                        max="100"
                        className="w-full px-1 py-1 text-[10px] text-center bg-bakery-water/10 border border-bakery-water/30 rounded text-bakery-water font-mono"
                        title="水合率%"
                      />
                      <span className="text-[9px] text-bakery-water/60 mt-0.5">水合率%</span>
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
                    title={
                      canRemove
                        ? '删除'
                        : isStarter
                        ? '老面由环境参数控制'
                        : '至少保留一种面粉'
                    }
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

        <div className="mt-4 space-y-2">
          <div className="p-3 bg-bakery-cream rounded-xl">
            <p className="text-xs text-bakery-brown/70 leading-relaxed">
              💡 <strong>提示：</strong>烘焙百分比以面粉总量为100%基准。
              含水原料（老面/种面/汤种）会自动扣除其中水分，避免重复算水。
            </p>
          </div>
          {hasStarterRow && (
            <div className="p-3 bg-bakery-water/5 border border-bakery-water/20 rounded-xl">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-bakery-water flex-shrink-0 mt-0.5" />
                <p className="text-xs text-bakery-brown/70 leading-relaxed">
                  <strong className="text-bakery-water">老面使用说明：</strong>
                  老面的用量由下方「环境与参数」中的<strong>「老面比例」</strong>滑块控制。
                  系统会自动拆分老面中的面粉和水分，并在主配方中相应扣减，确保总面粉量和总水量准确。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
