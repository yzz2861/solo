import type { IrrigationWindow } from '../../shared/types';
import { Sun, Sunset, CloudRain, AlertCircle } from 'lucide-react';

interface Props {
  windows: IrrigationWindow[];
  temperature?: number;
}

const hourTemp = (baseTemp: number, hour: number) => {
  return (
    baseTemp -
    6 * Math.sin(((hour + 4) / 24) * Math.PI * 2) * 0.7 +
    7 * Math.max(0, Math.sin(((hour - 6) / 14) * Math.PI))
  );
};

const heatColor = (t: number) => {
  if (t < 18) return '#D4E6F1';
  if (t < 24) return '#DDEEDB';
  if (t < 28) return '#FAE67A';
  if (t < 32) return '#F5B041';
  return '#E74C3C';
};

const TimelineHeatmap = ({ windows, temperature = 25 }: Props) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const inWindow = (h: number) => {
    return windows.find(
      (w) => w.startHour >= 0 && h >= w.startHour && h <= w.endHour
    );
  };

  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-lg font-bold text-greenhouse-800 flex items-center gap-2">
          <CloudRain className="w-5 h-5 text-water-500" />
          今日最佳灌溉时段
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-water-500"></span>首选
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-water-300"></span>补充
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ background: '#E74C3C' }}></span>高温
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <div className="grid grid-cols-12 sm:grid-cols-24 gap-0.5">
            {hours.map((h) => {
              const t = hourTemp(temperature, h);
              const win = inWindow(h);
              const marker =
                h === 0 ||
                h === 6 ||
                h === 12 ||
                h === 18 ||
                (h % 3 === 0 && windows.length > 0);
              return (
                <div key={h} className="relative group">
                  <div
                    className={`h-12 sm:h-14 rounded-md transition-all cursor-pointer relative ${
                      win?.priority === 'primary'
                        ? 'ring-2 ring-water-500 ring-offset-1'
                        : win?.priority === 'secondary'
                        ? 'ring-2 ring-water-300 ring-offset-1'
                        : ''
                    }`}
                    style={{
                      background: win
                        ? win.priority === 'primary'
                          ? `linear-gradient(180deg, #2980B9 0%, ${heatColor(t)} 100%)`
                          : `linear-gradient(180deg, #85C1E9 0%, ${heatColor(t)} 100%)`
                        : heatColor(t),
                    }}
                  />
                  {marker && (
                    <div className="text-center text-[10px] sm:text-xs text-greenhouse-600 mt-1 font-mono tabular-nums">
                      {String(h).padStart(2, '0')}
                    </div>
                  )}

                  <div className="pointer-events-none absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-ink text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-card">
                    {String(h).padStart(2, '0')}:00 · 约 {t.toFixed(1)}℃
                    {win && ` · ${win.priority === 'primary' ? '首选' : '补充'}窗口`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center text-[10px] sm:text-xs text-greenhouse-500 justify-between pt-2">
          <div className="flex items-center gap-1">
            <Sun className="w-3 h-3 text-yellow-500" />
            <span>日出 06:00</span>
          </div>
          <div className="text-greenhouse-400">
            温度曲线模拟（基准 {temperature.toFixed(0)}℃）
          </div>
          <div className="flex items-center gap-1">
            <Sunset className="w-3 h-3 text-orange-500" />
            <span>日落 19:30</span>
          </div>
        </div>

        {windows.length > 0 && windows[0].startHour >= 0 && (
          <div className="grid gap-2 sm:grid-cols-2 mt-3">
            {windows.map((w, i) =>
              w.startHour < 0 ? (
                <div
                  key={i}
                  className="col-span-full p-3 rounded-xl bg-greenhouse-50 border border-greenhouse-100 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-greenhouse-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-greenhouse-800">{w.reason}</p>
                </div>
              ) : (
                <div
                  key={i}
                  className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                    w.priority === 'primary'
                      ? 'bg-water-50 border-water-100'
                      : 'bg-warning-50 border-warning-100'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                      w.priority === 'primary'
                        ? 'bg-water-gradient text-white'
                        : 'bg-warning-500 text-white'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-ink flex items-center gap-2">
                      {String(w.startHour).padStart(2, '0')}:00
                      {w.startHour !== w.endHour && (
                        <>~ {String(w.endHour).padStart(2, '0')}:00</>
                      )}
                      <span
                        className={`text-xs font-normal px-1.5 py-0.5 rounded-md ${
                          w.priority === 'primary'
                            ? 'bg-water-100 text-water-600'
                            : 'bg-warning-100 text-warning-600'
                        }`}
                      >
                        {w.priority === 'primary' ? '首选时段' : '补充时段'}
                      </span>
                    </p>
                    <p className="text-xs text-greenhouse-700 mt-1 leading-relaxed">
                      {w.reason}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineHeatmap;
