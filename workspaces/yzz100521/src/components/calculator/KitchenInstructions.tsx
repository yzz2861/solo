import React from 'react';
import { ChefHat } from 'lucide-react';
import { useRecipeStore } from '../../store/useRecipeStore';
import { useUIStore } from '../../store/useUIStore';
import TimelineStep from '../ui/TimelineStep';

const KitchenInstructions: React.FC = () => {
  const { currentResult } = useRecipeStore();
  const { expandedSections, toggleSection } = useUIStore();

  if (!currentResult) return null;

  const isOpen = expandedSections['kitchen-instructions'] ?? true;

  return (
    <div className="card animate-fade-in-up opacity-0 animate-stagger-4">
      <button
        type="button"
        onClick={() => toggleSection('kitchen-instructions')}
        className="w-full flex items-center justify-between mb-4"
      >
        <div className="flex items-center gap-3">
          <ChefHat size={20} className="text-icecream-pink" />
          <h3 className="font-bold text-chocolate-700">后厨操作指引</h3>
          <span className="badge bg-cream-100 text-chocolate-500 text-xs">
            {currentResult.kitchenInstructions.length} 步
          </span>
        </div>
      </button>

      <div
        className={`transition-all duration-300 overflow-hidden ${
          isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-gradient-to-br from-cream-50 to-cream-100 rounded-2xl p-6">
          {currentResult.kitchenInstructions.map((instruction, index) => (
            <TimelineStep
              key={index}
              step={instruction.step}
              title={instruction.title}
              description={instruction.description}
              observationPoint={instruction.observationPoint}
              timing={instruction.timing}
              isActive={index === 0}
            />
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="p-4 bg-cream-50 rounded-xl text-center">
            <div className="text-3xl font-bold text-icecream-pinkDark font-display mb-1">
              {currentResult.freezingPoint.toFixed(1)}°C
            </div>
            <div className="text-xs text-chocolate-500">目标凝固点</div>
          </div>
          <div className="p-4 bg-cream-50 rounded-xl text-center">
            <div className="text-3xl font-bold text-mint-500 font-display mb-1">
              {Math.min(-18, currentResult.freezingPoint - 4).toFixed(0)}°C
            </div>
            <div className="text-xs text-chocolate-500">建议冷冻温度</div>
          </div>
        </div>

        {currentResult.risks.length > 0 && (
          <div className="mt-4 p-4 bg-warning-orange/10 rounded-xl border border-warning-orange/20">
            <h4 className="font-bold text-warning-orange mb-2 flex items-center gap-2">
              ⚠️ 特别注意
            </h4>
            <ul className="space-y-1 text-sm text-chocolate-600">
              {currentResult.risks.map((risk, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-warning-orange">•</span>
                  {risk.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default KitchenInstructions;
