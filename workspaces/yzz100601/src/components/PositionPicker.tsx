import { PositionZone, POSITION_ZONES, POSITION_LABELS } from '@/types';

export default function PositionPicker({
  value,
  onChange,
  zoneWeights,
}: {
  value: PositionZone;
  onChange: (z: PositionZone) => void;
  zoneWeights?: Record<PositionZone, number>;
}) {
  const maxZone = zoneWeights
    ? Math.max(...POSITION_ZONES.map((z) => zoneWeights[z]), 0.01)
    : 0;

  const cellBg = (z: PositionZone) => {
    if (!zoneWeights) {
      return value === z
        ? 'bg-blue-600 text-white shadow-md border-blue-700'
        : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200';
    }
    const intensity = Math.min(zoneWeights[z] / maxZone, 1);
    if (value === z) {
      return 'ring-2 ring-blue-600 ring-offset-1 bg-blue-500 text-white border-blue-600';
    }
    const green = Math.round(241 - intensity * 200);
    const red = Math.round(34 + intensity * 200);
    return {
      style: { backgroundColor: `rgb(${red},${green},70)`, color: intensity > 0.5 ? '#fff' : '#1f2937' },
      className: 'border-slate-300 hover:opacity-90',
    };
  };

  return (
    <div className="inline-block">
      <div className="text-[11px] text-slate-500 mb-1.5 uppercase tracking-wider font-medium">摆放位置（九宫格）</div>
      <div className="border-2 border-slate-300 rounded-lg p-1.5 bg-gradient-to-br from-slate-50 to-slate-100 shadow-inner">
        <div className="grid grid-cols-3 gap-1.5 w-[180px]">
          {POSITION_ZONES.map((z) => {
            const bg = cellBg(z);
            const isObj = typeof bg === 'object' && 'style' in bg;
            return (
              <button
                key={z}
                type="button"
                onClick={() => onChange(z)}
                style={isObj ? bg.style : undefined}
                className={`relative aspect-square rounded-md border text-[10px] font-semibold transition-all flex flex-col items-center justify-center ${
                  isObj ? bg.className : bg
                }`}
              >
                <span>{POSITION_LABELS[z]}</span>
                {zoneWeights && maxZone > 0 && (
                  <span className="text-[9px] opacity-80 font-mono mt-0.5">
                    {zoneWeights[z].toFixed(1)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {zoneWeights && (
        <div className="mt-1.5 text-[10px] text-slate-500 flex items-center gap-2">
          <span>轻</span>
          <div className="flex-1 h-1.5 rounded-full bg-gradient-to-r from-emerald-400 via-yellow-400 to-rose-500" />
          <span>重</span>
          <span className="ml-1 text-slate-400">中心×1.3/四角×0.9</span>
        </div>
      )}
    </div>
  );
}
