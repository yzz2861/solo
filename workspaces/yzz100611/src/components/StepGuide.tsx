import { FlaskConical, Droplets, CheckCircle, Ruler, ThermometerSun } from 'lucide-react';
import type { CalculationResult } from '@/types';
import { formatVolume, formatEc } from '@/utils/unitConverter';

interface StepGuideProps {
  result: CalculationResult;
}

export default function StepGuide({ result }: StepGuideProps) {
  if (result.actionType === 'no_action') {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <CheckCircle className="text-green-500" size={22} />
          操作指导
        </h3>
        <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
          <CheckCircle size={40} className="text-green-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-green-800">当前EC值已达标</p>
            <p className="text-sm text-green-600">无需添加母液或清水，继续观察即可</p>
          </div>
        </div>
      </div>
    );
  }

  const isAddStock = result.actionType === 'add_stock';

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        {isAddStock ? <FlaskConical className="text-green-600" size={22} /> : <Droplets className="text-blue-500" size={22} />}
        操作步骤
      </h3>

      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-sm">
            1
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-800">测量当前EC值</p>
            <p className="text-sm text-gray-500 mt-1">
              用EC计测量水箱中的营养液，确认当前EC值准确
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-sm">
            2
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-800">
              准备{isAddStock ? '母液' : '清水'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              用量筒量取
              <span className="font-semibold text-green-600 mx-1">
                {isAddStock
                  ? formatVolume(result.stockAmount, result.stockAmountUnit, 2)
                  : formatVolume(result.waterAmount, result.waterAmountUnit, 2)}
              </span>
              的{isAddStock ? '母液' : '清水'}
            </p>
            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Ruler size={16} className="text-gray-400" />
                <span className="text-gray-600">
                  约等于 {isAddStock
                    ? formatVolume(result.stockAmount * 1000, 'mL', 0)
                    : formatVolume(result.waterAmount * 1000, 'mL', 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-sm">
            3
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-800">缓慢加入并搅拌</p>
            <p className="text-sm text-gray-500 mt-1">
              将{isAddStock ? '母液' : '清水'}缓慢倒入水箱，同时搅拌或开启循环泵
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-sm">
            4
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-800">再次测量确认</p>
            <p className="text-sm text-gray-500 mt-1">
              等待溶液充分混合后，再次测量EC值，目标为
              <span className="font-semibold text-green-600 mx-1">
                {formatEc(result.finalEc, result.finalEcUnit, 2)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm">
            ✓
          </div>
          <div className="flex-1">
            <p className="font-medium text-green-700">完成</p>
            <p className="text-sm text-green-600 mt-1">
              记录本次操作，方便后续跟踪调整趋势
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex items-start gap-3">
          <ThermometerSun size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">温馨提示</p>
            <p className="text-sm text-amber-700 mt-1">
              建议每次调整后等待10-15分钟再测量，确保溶液充分混合。温度会影响EC读数，尽量在相同温度下测量。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
