import { getHeatColor, getHeatLabel } from '../../utils/heatmap';

export default function HeatLegend() {
  const levels: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-md p-4">
      <h3 className="text-sm font-semibold text-navy-700 mb-3">热力等级</h3>
      <div className="flex items-center gap-2">
        {levels.map((level) => (
          <div key={level} className="flex flex-col items-center">
            <div
              className="w-8 h-8 rounded-full border-2 border-white shadow-md"
              style={{ backgroundColor: getHeatColor(level) }}
            />
            <span className="text-xs text-navy-500 mt-1">
              {getHeatLabel(level)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-navy-100">
        <p className="text-xs text-navy-500">
          综合客流、保洁频次、投诉数计算
        </p>
      </div>
    </div>
  );
}
