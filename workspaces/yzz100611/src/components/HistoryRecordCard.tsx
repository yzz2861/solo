import { Trash2, FlaskConical, Droplets, CheckCircle } from 'lucide-react';
import type { HistoryRecord } from '@/types';
import { formatEc, formatVolume } from '@/utils/unitConverter';
import { getActionLabel } from '@/utils/calculations';
import { formatTime } from '@/utils/storage';

interface HistoryRecordCardProps {
  record: HistoryRecord;
  onDelete: (id: string) => void;
}

export default function HistoryRecordCard({ record, onDelete }: HistoryRecordCardProps) {
  const { input, result } = record;
  const time = formatTime(new Date(record.timestamp));

  const getActionIcon = () => {
    switch (result.actionType) {
      case 'add_stock':
        return <FlaskConical size={18} className="text-green-600" />;
      case 'add_water':
        return <Droplets size={18} className="text-blue-500" />;
      case 'no_action':
        return <CheckCircle size={18} className="text-gray-400" />;
      default:
        return null;
    }
  };

  const getActionBg = () => {
    switch (result.actionType) {
      case 'add_stock':
        return 'bg-green-50 border-green-200';
      case 'add_water':
        return 'bg-blue-50 border-blue-200';
      case 'no_action':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-800">{record.date}</span>
          <span className="text-xs text-gray-500">{time}</span>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-sm ${getActionBg()}`}>
          {getActionIcon()}
          <span className="font-medium">{getActionLabel(result.actionType)}</span>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs mb-1">当前EC</p>
            <p className="font-medium text-gray-800">
              {formatEc(input.currentEc, input.currentEcUnit, 2)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">目标EC</p>
            <p className="font-medium text-gray-800">
              {formatEc(input.targetEc, input.targetEcUnit, 2)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">水箱体积</p>
            <p className="font-medium text-gray-800">
              {formatVolume(input.tankVolume, input.tankVolumeUnit, 1)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">作物阶段</p>
            <p className="font-medium text-gray-800">{input.cropStage}</p>
          </div>
        </div>

        {result.actionType !== 'no_action' && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">调整量：</span>
              <span className="text-sm font-semibold text-green-600">
                {result.actionType === 'add_stock'
                  ? `母液 ${formatVolume(result.stockAmount, result.stockAmountUnit, 2)}`
                  : `清水 ${formatVolume(result.waterAmount, result.waterAmountUnit, 2)}`}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-gray-600">最终EC：</span>
              <span className="text-sm font-semibold text-gray-800">
                {formatEc(result.finalEc, result.finalEcUnit, 2)}
              </span>
            </div>
          </div>
        )}

        {result.warnings.length > 0 && (
          <div className="mt-3 p-2 bg-amber-50 rounded-lg">
            <p className="text-xs text-amber-700">
              ⚠️ {result.warnings.map((w) => w.message).join('；')}
            </p>
          </div>
        )}
      </div>

      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex justify-end">
        <button
          onClick={() => onDelete(record.id)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={16} />
          删除
        </button>
      </div>
    </div>
  );
}
