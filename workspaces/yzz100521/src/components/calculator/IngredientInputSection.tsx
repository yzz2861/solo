import React from 'react';
import { Milk, Droplets, Candy, Apple, Wine, Sparkles, Target } from 'lucide-react';
import { useRecipeStore } from '../../store/useRecipeStore';
import { SUGAR_CONTENT_LABELS } from '../../engine';
import type { Unit, SugarContentLevel } from '../../engine';
import NumberInputWithUnit from '../ui/NumberInputWithUnit';
import CollapsibleSection from '../ui/CollapsibleSection';

const IngredientInputSection: React.FC = () => {
  const { ingredients, setIngredient, calculate } = useRecipeStore();

  const handleIngredientChange = <K extends keyof typeof ingredients>(
    key: K,
    value: number,
    unit: Unit | 'g' | 'ml'
  ) => {
    setIngredient(key, { amount: value, unit: unit as Unit } as Partial<typeof ingredients[K]>);
    setTimeout(calculate, 50);
  };

  const handleSugarContentChange = (level: SugarContentLevel) => {
    setIngredient('fruitPuree', { sugarContent: level });
    setTimeout(calculate, 50);
  };

  const handleAbvChange = (abv: number) => {
    setIngredient('alcohol', { abv });
    setTimeout(calculate, 50);
  };

  return (
    <div className="space-y-4">
      <CollapsibleSection
        id="ingredients-milk"
        title="牛奶"
        icon={<Milk size={20} />}
      >
        <NumberInputWithUnit
          label="牛奶用量"
          value={ingredients.milk.amount}
          unit={ingredients.milk.unit}
          onChange={(v, u) => handleIngredientChange('milk', v, u)}
          step={10}
          max={5000}
        />
      </CollapsibleSection>

      <CollapsibleSection
        id="ingredients-cream"
        title="奶油"
        icon={<Droplets size={20} />}
      >
        <NumberInputWithUnit
          label="奶油用量"
          value={ingredients.cream.amount}
          unit={ingredients.cream.unit}
          onChange={(v, u) => handleIngredientChange('cream', v, u)}
          step={10}
          max={5000}
        />
      </CollapsibleSection>

      <CollapsibleSection
        id="ingredients-sugar"
        title="糖"
        icon={<Candy size={20} />}
      >
        <NumberInputWithUnit
          label="蔗糖用量"
          value={ingredients.sugar.amount}
          unit={ingredients.sugar.unit}
          onChange={(v, u) => handleIngredientChange('sugar', v, u)}
          step={5}
          max={2000}
        />
      </CollapsibleSection>

      <CollapsibleSection
        id="ingredients-fruit"
        title="果泥"
        icon={<Apple size={20} />}
      >
        <div className="space-y-4">
          <NumberInputWithUnit
            label="果泥用量"
            value={ingredients.fruitPuree.amount}
            unit={ingredients.fruitPuree.unit}
            onChange={(v, u) => handleIngredientChange('fruitPuree', v, u)}
            step={10}
            max={3000}
          />
          <div className="space-y-2">
            <label className="block text-sm font-medium text-chocolate-700">
              果泥含糖量估算
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as SugarContentLevel[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => handleSugarContentChange(level)}
                  className={`p-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    ingredients.fruitPuree.sugarContent === level
                      ? 'bg-icecream-pink text-chocolate-900 shadow-md'
                      : 'bg-cream-100 text-chocolate-600 hover:bg-cream-200'
                  }`}
                >
                  {SUGAR_CONTENT_LABELS[level].label}
                </button>
              ))}
            </div>
            <p className="text-xs text-chocolate-500">
              {SUGAR_CONTENT_LABELS[ingredients.fruitPuree.sugarContent].description}
            </p>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        id="ingredients-alcohol"
        title="酒精"
        icon={<Wine size={20} />}
      >
        <div className="space-y-4">
          <NumberInputWithUnit
            label="酒精用量"
            value={ingredients.alcohol.amount}
            unit={ingredients.alcohol.unit}
            onChange={(v, u) => handleIngredientChange('alcohol', v, u)}
            step={5}
            max={500}
          />
          <div className="space-y-2">
            <label className="block text-sm font-medium text-chocolate-700">
              酒精度数 (ABV %)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="5"
                max="95"
                value={ingredients.alcohol.abv}
                onChange={(e) => handleAbvChange(parseInt(e.target.value))}
                className="flex-1 h-2 bg-cream-200 rounded-full appearance-none cursor-pointer accent-icecream-pink"
              />
              <span className="w-16 text-center font-bold text-chocolate-700">
                {ingredients.alcohol.abv}%
              </span>
            </div>
            <p className="text-xs text-chocolate-500">
              常见：白葡萄酒12%，朗姆酒40%，伏特加40%，白兰地40%
            </p>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        id="ingredients-stabilizer"
        title="稳定剂"
        icon={<Sparkles size={20} />}
      >
        <NumberInputWithUnit
          label="稳定剂用量"
          value={ingredients.stabilizer.amount}
          unit={ingredients.stabilizer.unit}
          onChange={(v, u) => handleIngredientChange('stabilizer', v, u)}
          step={0.1}
          max={20}
        />
        <p className="text-xs text-chocolate-500 mt-2">
          建议用量：0.1-0.5%，常用稳定剂：明胶、刺槐豆胶、瓜尔胶
        </p>
      </CollapsibleSection>

      <CollapsibleSection
        id="ingredients-target"
        title="目标产量"
        icon={<Target size={20} />}
      >
        <NumberInputWithUnit
          label="目标出品量"
          value={ingredients.targetYield.amount}
          unit={ingredients.targetYield.unit}
          onChange={(v, u) => handleIngredientChange('targetYield', v, u)}
          unitOptions={['g', 'ml']}
          step={50}
          max={10000}
        />
      </CollapsibleSection>
    </div>
  );
};

export default IngredientInputSection;
