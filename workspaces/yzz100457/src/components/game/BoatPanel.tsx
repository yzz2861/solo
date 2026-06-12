import { Ship, Trash2, Gauge, MapPin } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { getBoatEffectiveSpeed } from '@/utils/estimation';
import { findTile } from '@/types/level';

export default function BoatPanel() {
  const boats = useGameStore(s => s.boats);
  const tiles = useGameStore(s => s.tiles);
  const selectedBoatId = useGameStore(s => s.selectedBoatId);
  const selectBoat = useGameStore(s => s.selectBoat);
  const clearRoute = useGameStore(s => s.clearRoute);

  return (
    <div className="w-72 bg-slate-900/90 border-l border-slate-700/50 flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-slate-700/50">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Ship size={16} />
          船队状态
        </h2>
      </div>

      <div className="flex-1 p-3 space-y-3">
        {boats.map(boat => {
          const loadRatio = boat.capacity > 0 ? boat.currentLoad / boat.capacity : 0;
          const barColor = loadRatio >= 0.8 ? 'bg-red-500' : loadRatio >= 0.6 ? 'bg-yellow-400' : 'bg-green-500';
          const tile = findTile(tiles, boat.q, boat.r);
          const isShallow = tile?.terrain === 'shallow';
          const effectiveSpeed = getBoatEffectiveSpeed(boat, isShallow);
          const isSelected = boat.id === selectedBoatId;

          return (
            <div
              key={boat.id}
              onClick={() => selectBoat(boat.id)}
              className={`rounded-lg p-3 cursor-pointer transition-all border ${
                isSelected
                  ? 'bg-slate-700/60 border-slate-500 shadow-lg shadow-slate-900/50'
                  : 'bg-slate-800/40 border-slate-700/30 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: boat.color }} />
                <span className="text-sm font-medium text-slate-200 truncate">{boat.name}</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Trash2 size={12} className="text-slate-400 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                      <span>载量</span>
                      <span>{boat.currentLoad}/{boat.capacity}</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${loadRatio * 100}%` }} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Gauge size={12} className="text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-400">
                    速度: <span className="text-slate-300">{effectiveSpeed}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-400">
                    位置: <span className="text-slate-300">({boat.q}, {boat.r})</span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    航线: <span className="text-slate-300">{Math.max(0, boat.route.length - 1)} 步</span>
                  </span>
                  {boat.route.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); clearRoute(boat.id); }}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors px-1.5 py-0.5 rounded hover:bg-red-900/30"
                    >
                      清除
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {boats.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-8">
            暂无船只
          </div>
        )}
      </div>
    </div>
  );
}
