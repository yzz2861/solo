import { Droplets, FlaskConical, CheckCircle } from 'lucide-react';
import type { CalculationResult } from '@/types';
import { formatVolume, formatEc } from '@/utils/unitConverter';
import { getActionLabel } from '@/utils/calculations';

interface ResultCardProps {
  result: CalculationResult;
}

export default function ResultCard({ result }: ResultCardProps) {
  const getIcon = () => {
    switch (result.actionType) {
      case 'add_stock':
        return <FlaskConical size={32} className="text-green-600" />;
      case 'add_water':
        return <Droplets size={32} className="text-blue-500" />;
      case 'no_action':
        return <CheckCircle size={32} className="text-green-500" />;
      default:
        return null;
    }
  };

  const getBgGradient = () => {
    switch (result.actionType) {
      case 'add_stock':
        return 'from-green-500 to-emerald-600';
      case 'add_water':
        return 'from-blue-500 to-cyan-500';
      case 'no_action':
        return 'from-gray-400 to-gray-500';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  const getMainValue = () => {
    switch (result.actionType) {
      case 'add_stock':
        return formatVolume(result.stockAmount, result.stockAmountUnit, 2);
      case 'add_water':
        return formatVolume(result.waterAmount, result.waterAmountUnit, 2);
      case 'no_action':
        return '0';
      default:
        return '0';
    }
  };

  const getLabel = () => {
    switch (result.actionType) {
      case 'add_stock':
        return '需加母液量';
      case 'add_water':
        return '需加清水量';
      case 'no_action':
        return '无需调整';
      default:
        return '';
    }
  };

  return (
    <div className={`rounded-2xl bg-gradient-to-br ${getBgGradient()} p-6 text-white shadow-lg`}>
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
          {getIcon()}
        </div>
        <div>
          <p className="text-white/80 text-sm font-medium">{getActionLabel(result.actionType)}</p>
          <p className="text-3xl font-bold">{getMainValue()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
        <div>
          <p className="text-white/70 text-xs">最终EC值</p>
          <p className="text-lg font-semibold">{formatEc(result.finalEc, result.finalEcUnit, 2)}</p>
        </div>
        <div>
          <p className="text-white/70 text-xs">{getLabel()}</p>
          <p className="text-lg font-semibold">{getMainValue()}</p>
        </div>
      </div>
    </div>
  );
}
