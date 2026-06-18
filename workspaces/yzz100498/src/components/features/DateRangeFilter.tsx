import React from 'react';
import { Calendar } from 'lucide-react';
import { useFilterStore } from '../../store/useFilterStore';
import { formatDate } from '../../utils/dateUtils';
import { format, subDays } from 'date-fns';

const presetRanges = [
  { label: '今天', days: 1 },
  { label: '近7天', days: 7 },
  { label: '近14天', days: 14 },
  { label: '近30天', days: 30 },
];

export const DateRangeFilter: React.FC = () => {
  const { dateRange, setDateRange } = useFilterStore();
  
  const handlePresetClick = (days: number) => {
    const end = format(new Date('2026-06-18'), 'yyyy-MM-dd');
    const start = format(subDays(new Date('2026-06-18'), days - 1), 'yyyy-MM-dd');
    setDateRange(start, end);
  };
  
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        日期范围
      </label>
      <div className="flex items-center gap-2 flex-wrap">
        {presetRanges.map(range => (
          <button
            key={range.days}
            onClick={() => handlePresetClick(range.days)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              dateRange.end === format(new Date('2026-06-18'), 'yyyy-MM-dd') &&
              dateRange.start === format(subDays(new Date('2026-06-18'), range.days - 1), 'yyyy-MM-dd')
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
        <Calendar className="w-4 h-4" />
        <span>
          {formatDate(dateRange.start)} ~ {formatDate(dateRange.end)}
        </span>
      </div>
    </div>
  );
};
