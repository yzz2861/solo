import { Calculator, Info } from 'lucide-react';
import type { CalculationResult } from '@/types';

interface CalculationProcessProps {
  result: CalculationResult;
}

export default function CalculationProcess({ result }: CalculationProcessProps) {
  if (result.calculationSteps.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Calculator className="text-green-600" size={22} />
          计算过程
        </h3>
        <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
          请先输入有效参数并计算
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Calculator className="text-green-600" size={22} />
        计算过程
      </h3>

      <div className="space-y-4">
        {result.calculationSteps.map((step, index) => (
          <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <p className="font-medium text-gray-700 text-sm">{step.description}</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm whitespace-pre-wrap">
                {step.formula}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">结果：</span>
                <span className="text-sm font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  {step.result}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800">计算公式说明</p>
            <div className="text-sm text-blue-700 mt-2 space-y-1">
              <p>• 提高EC（加母液）：V母液 = (EC目标 - EC当前) × V总液 / (EC母液 - EC目标)</p>
              <p>• 降低EC（加清水）：V清水 = (EC当前 - EC目标) × V总液 / EC目标</p>
              <p>• 单位换算：1 mS/cm = 1000 μS/cm，1 L = 1000 mL</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
