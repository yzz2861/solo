import React from 'react';
import { X, TrendingUp, TrendingDown, Minus, DollarSign, Package } from 'lucide-react';
import { ReplacementImpact } from '@/types';
import { useCalculatorStore } from '@/store/useCalculatorStore';

interface ReplaceImpactModalProps {
  impact: ReplacementImpact;
  onClose: () => void;
}

export const ReplaceImpactModal: React.FC<ReplaceImpactModalProps> = ({
  impact,
  onClose,
}) => {
  const getImpactIcon = (impactType: string) => {
    switch (impactType) {
      case 'increase':
        return <TrendingUp className="w-4 h-4 text-success-green" />;
      case 'decrease':
        return <TrendingDown className="w-4 h-4 text-warning-red" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getImpactBg = (impactType: string) => {
    switch (impactType) {
      case 'increase':
        return 'bg-green-50 border-green-200';
      case 'decrease':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-fade-in">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔄</span>
            <h2 className="text-xl font-bold text-gray-800">原料替换影响分析</h2>
          </div>
          <button
            className="btn btn-ghost p-1"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="card-body space-y-6">
          <div className="flex items-center justify-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
            <div className="text-center">
              <div className="text-3xl mb-1">🫘</div>
              <div className="font-bold text-gray-800">{impact.original}</div>
            </div>
            <div className="text-3xl text-wheat-green">→</div>
            <div className="text-center">
              <div className="text-3xl mb-1">🌾</div>
              <div className="font-bold text-gray-800">{impact.replacement}</div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
              📊 营养变化影响
            </h3>
            <div className="space-y-2">
              {impact.nutritionChanges.map((change, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${getImpactBg(change.impact)}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-800">{change.nutrient}</span>
                    {getImpactIcon(change.impact)}
                  </div>
                  <div className="font-mono text-sm">
                    {change.before.toFixed(2)} → {change.after.toFixed(2)}
                    <span className={`ml-2 ${
                      change.impact === 'increase' ? 'text-success-green' :
                      change.impact === 'decrease' ? 'text-warning-red' : 'text-gray-500'
                    }`}>
                      ({change.impact === 'increase' ? '+' : ''}{(change.after - change.before).toFixed(2)})
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {change.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border ${
              impact.costChange > 0 ? 'bg-red-50 border-red-200' :
              impact.costChange < 0 ? 'bg-green-50 border-green-200' :
              'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className={`w-5 h-5 ${
                  impact.costChange > 0 ? 'text-warning-red' :
                  impact.costChange < 0 ? 'text-success-green' : 'text-gray-500'
                }`} />
                <span className="font-medium text-gray-700">成本变化</span>
              </div>
              <div className={`font-mono text-2xl font-bold ${
                impact.costChange > 0 ? 'text-warning-red' :
                impact.costChange < 0 ? 'text-success-green' : 'text-gray-500'
              }`}>
                {impact.costChange > 0 ? '+' : ''}{impact.costChange.toFixed(2)}
                <span className="text-sm font-normal ml-1">元/kg</span>
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {impact.costChange > 0 ? '成本增加' :
                 impact.costChange < 0 ? '成本降低' : '成本不变'}
              </div>
            </div>

            <div className={`p-4 rounded-xl border ${
              impact.inventoryChange > 0 ? 'bg-amber-50 border-amber-200' :
              impact.inventoryChange < 0 ? 'bg-blue-50 border-blue-200' :
              'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Package className={`w-5 h-5 ${
                  impact.inventoryChange > 0 ? 'text-amber-600' :
                  impact.inventoryChange < 0 ? 'text-blue-600' : 'text-gray-500'
                }`} />
                <span className="font-medium text-gray-700">库存消耗变化</span>
              </div>
              <div className={`font-mono text-2xl font-bold ${
                impact.inventoryChange > 0 ? 'text-amber-600' :
                impact.inventoryChange < 0 ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {impact.inventoryChange > 0 ? '+' : ''}{impact.inventoryChange.toFixed(2)}
                <span className="text-sm font-normal ml-1">公斤</span>
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {impact.inventoryChange > 0 ? '消耗增加' :
                 impact.inventoryChange < 0 ? '消耗减少' : '消耗不变'}
              </div>
            </div>
          </div>

          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div className="text-sm text-amber-800">
              ⚠️ <strong>注意：</strong>
              以上为理论计算值，实际使用时请根据动物反应逐步调整配方比例，
              避免突然更换原料导致应激反应。建议过渡期为3-5天。
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button className="btn btn-ghost" onClick={onClose}>
              关闭
            </button>
            <button className="btn btn-primary" onClick={onClose}>
              确认替换
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
