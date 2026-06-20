import { Settings } from 'lucide-react';
import type { VehicleParams, WeightUnit, LengthUnit, LoadStandard } from '@/types';
import { convertWeight, convertLength } from '@/utils/units';

interface VehicleFormProps {
  params: VehicleParams;
  standards: LoadStandard[];
  selectedStandardId: string;
  weightUnit: WeightUnit;
  lengthUnit: LengthUnit;
  onParamsChange: (params: Partial<VehicleParams>) => void;
  onStandardChange: (standardId: string) => void;
  onWeightUnitChange: (unit: WeightUnit) => void;
  onLengthUnitChange: (unit: LengthUnit) => void;
}

export default function VehicleForm({
  params,
  standards,
  selectedStandardId,
  weightUnit,
  lengthUnit,
  onParamsChange,
  onStandardChange,
  onWeightUnitChange,
  onLengthUnitChange,
}: VehicleFormProps) {
  const displayWheelbase = convertLength(params.wheelbase, 'mm', lengthUnit);
  const displayEmptyFront = convertWeight(params.emptyFrontAxle, 'kg', weightUnit);
  const displayEmptyRear = convertWeight(params.emptyRearAxle, 'kg', weightUnit);
  const displayCarriage = convertLength(params.carriageLength, 'mm', lengthUnit);
  const displayOffset = convertLength(params.carriageOffset || 0, 'mm', lengthUnit);

  const handleNumberChange = (key: keyof VehicleParams, value: string, isWeight: boolean) => {
    const num = parseFloat(value) || 0;
    const converted = isWeight ? convertWeight(num, weightUnit, 'kg') : convertLength(num, lengthUnit, 'mm');
    onParamsChange({ [key]: converted });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <Settings size={18} className="text-gray-600" />
        <h3 className="font-semibold text-gray-800">车辆参数</h3>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">限载标准</label>
          <select
            value={selectedStandardId}
            onChange={(e) => onStandardChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {standards.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              轴距 ({lengthUnit})
            </label>
            <input
              type="number"
              value={displayWheelbase}
              onChange={(e) => handleNumberChange('wheelbase', e.target.value, false)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              车厢长 ({lengthUnit})
            </label>
            <input
              type="number"
              value={displayCarriage}
              onChange={(e) => handleNumberChange('carriageLength', e.target.value, false)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              空车前轴 ({weightUnit === 'ton' ? '吨' : 'kg'})
            </label>
            <input
              type="number"
              value={displayEmptyFront}
              onChange={(e) => handleNumberChange('emptyFrontAxle', e.target.value, true)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              空车后轴 ({weightUnit === 'ton' ? '吨' : 'kg'})
            </label>
            <input
              type="number"
              value={displayEmptyRear}
              onChange={(e) => handleNumberChange('emptyRearAxle', e.target.value, true)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">
              前轴距车厢前端 ({lengthUnit})
            </label>
            <input
              type="number"
              value={displayOffset}
              onChange={(e) => handleNumberChange('carriageOffset', e.target.value, false)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <div className="flex-1">
            <span className="text-xs text-gray-500 block mb-1">重量单位</span>
            <div className="flex gap-1">
              {(['kg', 'ton'] as WeightUnit[]).map((u) => (
                <button
                  key={u}
                  onClick={() => onWeightUnitChange(u)}
                  className={`flex-1 py-1.5 text-xs rounded-md transition-colors ${
                    weightUnit === u
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {u === 'ton' ? '吨' : 'kg'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <span className="text-xs text-gray-500 block mb-1">长度单位</span>
            <div className="flex gap-1">
              {(['mm', 'cm', 'm'] as LengthUnit[]).map((u) => (
                <button
                  key={u}
                  onClick={() => onLengthUnitChange(u)}
                  className={`flex-1 py-1.5 text-xs rounded-md transition-colors ${
                    lengthUnit === u
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
