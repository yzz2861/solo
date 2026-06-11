import { useSafetyStore } from '../../store/useSafetyStore';
import { Select } from '../ui/Select';
import { DEVICE_TYPE_LABELS } from '../../constants/colors';
import type { DeviceType } from '../../types/devices';

export function RiskFilter() {
  const { filterType, setRiskFilter } = useSafetyStore();

  const options: Array<{ value: DeviceType | 'all'; label: string }> = [
    { value: 'all', label: '全部设备' },
    { value: 'hoistPoint', label: DEVICE_TYPE_LABELS.hoistPoint },
    { value: 'lightRig', label: DEVICE_TYPE_LABELS.lightRig },
    { value: 'speaker', label: DEVICE_TYPE_LABELS.speaker },
    { value: 'stage', label: DEVICE_TYPE_LABELS.stage },
    { value: 'audienceArea', label: DEVICE_TYPE_LABELS.audienceArea },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#94a3b8] flex-shrink-0">按设备类型:</span>
      <Select
        value={filterType}
        onChange={(e) => setRiskFilter(e.target.value as any)}
        className="py-1 text-xs"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
