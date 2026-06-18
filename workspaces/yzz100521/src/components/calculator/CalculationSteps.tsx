import React, { useState } from 'react';
import { Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { useRecipeStore } from '../../store/useRecipeStore';
import { useUIStore } from '../../store/useUIStore';
import type { CalculationStep } from '../../engine';

const CalculationSteps: React.FC = () => {
  const { currentResult } = useRecipeStore();
  const { expandedSections, toggleSection } = useUIStore();
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});

  if (!currentResult) return null;

  const toggleStep = (index: number) => {
    setExpandedSteps(prev => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const isOpen = expandedSections['calculation-steps'] ?? false;

  const formatValue = (value: number, unit?: string) => {
    if (unit === '%') return `${value.toFixed(2)}%`;
    if (unit === '°C') return `${value.toFixed(2)}°C`;
    if (unit === 'g') return `${value.toFixed(2)}g`;
    if (unit === 'kg') return `${value.toFixed(4)}kg`;
    if (unit === 'mol/kg') return `${value.toFixed(4)} mol/kg`;
    return value.toFixed(4);
  };

  const renderVariables = (variables: Record<string, number | string | boolean>) => {
    return Object.entries(variables).map(([key, value]) => (
      <div key={key} className="flex justify-between text-xs py-1 border-b border-cream-100 last:border-0">
        <span className="text-chocolate-500 font-mono">{key}</span>
        <span className="text-chocolate-700 font-mono font-medium">
          {typeof value === 'number' ? value.toFixed(4) : value.toString()}
        </span>
      </div>
    ));
  };

  return (
    <div className="card animate-fade-in-up opacity-0 animate-stagger-3">
      <button
        type="button"
        onClick={() => toggleSection('calculation-steps')}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Calculator size={20} className="text-icecream-pink" />
          <h3 className="font-bold text-chocolate-700">计算过程</h3>
          <span className="badge bg-cream-100 text-chocolate-500 text-xs">
            {currentResult.calculationSteps.length} 步
          </span>
        </div>
        <span className="text-chocolate-500 transition-transform duration-300">
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </span>
      </button>

      <div
        className={`transition-all duration-300 overflow-hidden ${
          isOpen ? 'max-h-[5000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin pr-2">
          {currentResult.calculationSteps.map((step: CalculationStep, index: number) => {
            const isStepOpen = expandedSteps[index] ?? false;
            return (
              <div
                key={index}
                className="border border-cream-200 rounded-xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleStep(index)}
                  className="w-full flex items-center justify-between p-3 bg-cream-50 hover:bg-cream-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="w-7 h-7 flex items-center justify-center rounded-full bg-icecream-pink text-white text-xs font-bold shrink-0">
                      {index + 1}
                    </span>
                    <span className="font-medium text-chocolate-700 text-sm flex-1">
                      {step.name}
                    </span>
                    <span className="font-bold text-icecream-pinkDark font-mono text-sm">
                      {formatValue(step.result, step.unit)}
                    </span>
                  </div>
                  <span className="text-chocolate-400 ml-2">
                    {isStepOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>

                <div
                  className={`transition-all duration-300 overflow-hidden ${
                    isStepOpen ? 'max-h-[500px]' : 'max-h-0'
                  }`}
                >
                  <div className="p-3 bg-white border-t border-cream-100">
                    <div className="mb-3 p-3 bg-cream-50 rounded-lg font-mono text-sm">
                      <span className="text-chocolate-500">公式：</span>
                      <code className="text-chocolate-700">{step.formula}</code>
                    </div>
                    <div className="text-xs">
                      <span className="text-chocolate-500 block mb-2 font-medium">变量值：</span>
                      <div className="space-y-1">
                        {renderVariables(step.variables)}
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-cream-100 flex justify-between items-center">
                      <span className="text-xs text-chocolate-500">计算结果：</span>
                      <span className="font-bold text-icecream-pinkDark font-mono">
                        {formatValue(step.result, step.unit)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalculationSteps;
