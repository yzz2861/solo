import { Paintbrush, Wind, Trash2, Anchor, ShieldAlert, Ship, Eraser } from 'lucide-react';
import type { TerrainType, GarbageType, HexDirection } from '@/types/game';
import type { EditorTool } from '@/types/level';
import { DIRECTION_LABELS, GARBAGE_LABELS } from '@/types/level';
import { useEditorStore } from '@/store/editorStore';

const TOOLS: { id: EditorTool; icon: React.ReactNode; label: string }[] = [
  { id: 'terrain', icon: <Paintbrush size={18} />, label: '地形' },
  { id: 'current', icon: <Wind size={18} />, label: '洋流' },
  { id: 'garbage', icon: <Trash2 size={18} />, label: '垃圾' },
  { id: 'supply', icon: <Anchor size={18} />, label: '补给点' },
  { id: 'danger', icon: <ShieldAlert size={18} />, label: '危险区' },
  { id: 'boat', icon: <Ship size={18} />, label: '船只' },
  { id: 'eraser', icon: <Eraser size={18} />, label: '橡皮擦' },
];

const TERRAIN_OPTIONS: { value: TerrainType; label: string }[] = [
  { value: 'water', label: '深水' },
  { value: 'shallow', label: '浅水' },
  { value: 'coast', label: '海岸' },
  { value: 'land', label: '陆地' },
];

const DIRECTIONS: HexDirection[] = ['ne', 'e', 'se', 'sw', 'w', 'nw'];
const GARBAGE_TYPES: GarbageType[] = ['floating_plastic', 'shoreline_foam', 'large_debris'];

export default function EditorToolbar() {
  const activeTool = useEditorStore(s => s.activeTool);
  const setActiveTool = useEditorStore(s => s.setActiveTool);
  const terrainBrush = useEditorStore(s => s.terrainBrush);
  const setTerrainBrush = useEditorStore(s => s.setTerrainBrush);
  const currentDirection = useEditorStore(s => s.currentDirection);
  const setCurrentDirection = useEditorStore(s => s.setCurrentDirection);
  const currentStrength = useEditorStore(s => s.currentStrength);
  const setCurrentStrength = useEditorStore(s => s.setCurrentStrength);
  const garbageType = useEditorStore(s => s.garbageType);
  const setGarbageType = useEditorStore(s => s.setGarbageType);
  const garbageAmount = useEditorStore(s => s.garbageAmount);
  const setGarbageAmount = useEditorStore(s => s.setGarbageAmount);
  const dangerReason = useEditorStore(s => s.dangerReason);
  const setDangerReason = useEditorStore(s => s.setDangerReason);
  const boatName = useEditorStore(s => s.boatName);
  const setBoatName = useEditorStore(s => s.setBoatName);
  const boatCapacity = useEditorStore(s => s.boatCapacity);
  const setBoatCapacity = useEditorStore(s => s.setBoatCapacity);

  return (
    <div className="w-56 bg-slate-800 border-r border-slate-700 flex flex-col overflow-y-auto">
      <div className="p-3 border-b border-slate-700">
        <h3 className="text-sm font-bold text-slate-300 mb-2">工具</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {TOOLS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTool(t.id)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTool === t.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 flex-1">
        {activeTool === 'terrain' && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-400 mb-1">地形类型</h4>
            {TERRAIN_OPTIONS.map(o => (
              <label key={o.value} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input type="radio" name="terrain" checked={terrainBrush === o.value} onChange={() => setTerrainBrush(o.value)} className="accent-blue-500" />
                {o.label}
              </label>
            ))}
          </div>
        )}

        {activeTool === 'current' && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 mb-1">方向</h4>
            <div className="grid grid-cols-3 gap-1">
              {DIRECTIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setCurrentDirection(d)}
                  className={`px-1.5 py-1 rounded text-xs ${
                    currentDirection === d ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {DIRECTION_LABELS[d]}
                </button>
              ))}
            </div>
            <h4 className="text-xs font-bold text-slate-400">强度</h4>
            <input type="range" min={1} max={3} value={currentStrength} onChange={e => setCurrentStrength(Number(e.target.value))} className="w-full accent-cyan-500" />
            <span className="text-xs text-slate-400">强度: {currentStrength}</span>
          </div>
        )}

        {activeTool === 'garbage' && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 mb-1">垃圾类型</h4>
            {GARBAGE_TYPES.map(gt => (
              <label key={gt} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input type="radio" name="garbage" checked={garbageType === gt} onChange={() => setGarbageType(gt)} className="accent-green-500" />
                {GARBAGE_LABELS[gt]}
              </label>
            ))}
            <h4 className="text-xs font-bold text-slate-400">数量</h4>
            <input type="number" min={1} max={50} value={garbageAmount} onChange={e => setGarbageAmount(Math.max(1, Number(e.target.value)))} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200" />
          </div>
        )}

        {activeTool === 'supply' && (
          <p className="text-xs text-slate-400">点击地图放置补给点</p>
        )}

        {activeTool === 'danger' && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 mb-1">危险原因</h4>
            <input type="text" value={dangerReason} onChange={e => setDangerReason(e.target.value)} placeholder="输入原因" className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200" />
          </div>
        )}

        {activeTool === 'boat' && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 mb-1">船只名称</h4>
            <input type="text" value={boatName} onChange={e => setBoatName(e.target.value)} placeholder="留空自动命名" className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200" />
            <h4 className="text-xs font-bold text-slate-400">容量</h4>
            <input type="number" min={5} max={50} value={boatCapacity} onChange={e => setBoatCapacity(Math.max(5, Number(e.target.value)))} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200" />
          </div>
        )}

        {activeTool === 'eraser' && (
          <p className="text-xs text-slate-400">点击地图上的元素删除</p>
        )}
      </div>
    </div>
  );
}
