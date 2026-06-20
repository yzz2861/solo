import { ChevronDown } from 'lucide-react';
import { CROP_STAGES, getEcRangeForStage } from '@/data/cropStages';

interface CropStageSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export default function CropStageSelect({ value, onChange }: CropStageSelectProps) {
  const ecRange = getEcRangeForStage(value);
  const stageInfo = CROP_STAGES.find((s) => s.stage === value);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">作物阶段</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-800 bg-white pr-10 cursor-pointer"
        >
          {CROP_STAGES.map((stage) => (
            <option key={stage.stage} value={stage.stage}>
              {stage.stage}
            </option>
          ))}
        </select>
        <ChevronDown
          size={18}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
      </div>
      {ecRange && (
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-green-400"></span>
          参考EC: {ecRange[0]} - {ecRange[1]} mS/cm
        </div>
      )}
      {stageInfo && (
        <p className="text-xs text-gray-400">{stageInfo.description}</p>
      )}
    </div>
  );
}
