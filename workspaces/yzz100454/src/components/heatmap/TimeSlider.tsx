import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useAppStore } from '../../store';

export default function TimeSlider() {
  const {
    selectedDate,
    selectedHour,
    isPlaying,
    setSelectedDate,
    setSelectedHour,
    setIsPlaying,
  } = useAppStore();

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const handlePrev = () => {
    if (selectedHour > 0) {
      setSelectedHour(selectedHour - 1);
    }
  };

  const handleNext = () => {
    if (selectedHour < 23) {
      setSelectedHour(selectedHour + 1);
    }
  };

  const formatHour = (h: number) => `${String(h).padStart(2, '0')}:00`;

  const isActiveHour = (h: number) => h >= 6 && h <= 22;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-navy-600">
          {selectedDate} {formatHour(selectedHour)}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-lg hover:bg-navy-100 text-navy-500 transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handleNext}
            className="p-1.5 rounded-lg hover:bg-navy-100 text-navy-500 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative">
        <div className="flex gap-1">
          {hours.map((h) => (
            <button
              key={h}
              onClick={() => isActiveHour(h) && setSelectedHour(h)}
              className={`flex-1 h-10 rounded-md text-xs font-medium transition-all ${
                selectedHour === h
                  ? 'bg-primary-500 text-white shadow-md'
                  : isActiveHour(h)
                  ? 'bg-navy-100 text-navy-600 hover:bg-navy-200'
                  : 'bg-navy-50 text-navy-300 cursor-not-allowed'
              }`}
            >
              {String(h).padStart(2, '0')}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <label className="text-xs text-navy-500">日期</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="flex-1 px-3 py-1.5 text-sm border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>
    </div>
  );
}
