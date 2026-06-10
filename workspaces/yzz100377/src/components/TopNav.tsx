import { useState } from 'react';
import {
  Save,
  FolderOpen,
  Download,
  Presentation,
  Grid3X3,
  CircleDot,
  TriangleAlert,
  Ruler,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { useSceneStore } from '@/store/useSceneStore';
import { cn } from '@/lib/utils';
import type { Unit } from '@/types/scene';

interface TopNavProps {
  className?: string;
  onOpenSchemes: () => void;
  onOpenExport: () => void;
  onToggleBriefing: () => void;
}

export function TopNav({ className, onOpenSchemes, onOpenExport, onToggleBriefing }: TopNavProps) {
  const { displaySettings, setDisplaySetting, isBriefingMode } = useSceneStore();
  const [showSettings, setShowSettings] = useState(false);

  const units: { value: Unit; label: string }[] = [
    { value: 'm', label: '米 (m)' },
    { value: 'cm', label: '厘米 (cm)' },
    { value: 'mm', label: '毫米 (mm)' },
  ];

  const ToggleButton = ({
    icon: Icon,
    label,
    active,
    onClick,
  }: {
    icon: React.ElementType;
    label: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all',
        active
          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50',
      )}
      title={label}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2.5 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <span className="text-white font-bold text-sm">叉</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100">叉车窄道演练场</h1>
            <p className="text-xs text-slate-500">Forklift Narrow Aisle Simulator</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <ToggleButton
            icon={Grid3X3}
            label="网格"
            active={displaySettings.showGrid}
            onClick={() => setDisplaySetting('showGrid', !displaySettings.showGrid)}
          />
          <ToggleButton
            icon={CircleDot}
            label="转弯半径"
            active={displaySettings.showTurnRadius}
            onClick={() =>
              setDisplaySetting('showTurnRadius', !displaySettings.showTurnRadius)
            }
          />
          <ToggleButton
            icon={TriangleAlert}
            label="碰撞区"
            active={displaySettings.showCollisionZones}
            onClick={() =>
              setDisplaySetting('showCollisionZones', !displaySettings.showCollisionZones)
            }
          />
          <ToggleButton
            icon={Ruler}
            label="测量"
            active={displaySettings.showMeasurements}
            onClick={() =>
              setDisplaySetting('showMeasurements', !displaySettings.showMeasurements)
            }
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800/50 transition-colors border border-slate-700/50"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{units.find((u) => u.value === displaySettings.unit)?.label}</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showSettings && (
            <div className="absolute top-full right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50 min-w-[120px]">
              {units.map((u) => (
                <button
                  key={u.value}
                  onClick={() => {
                    setDisplaySetting('unit', u.value);
                    setShowSettings(false);
                  }}
                  className={cn(
                    'w-full px-3 py-2 text-left text-xs transition-colors',
                    displaySettings.unit === u.value
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'text-slate-300 hover:bg-slate-800',
                  )}
                >
                  {u.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-slate-700/50" />

        <button
          onClick={onOpenSchemes}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-200 bg-slate-800/50 hover:bg-slate-700/50 transition-colors border border-slate-700/50"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">方案</span>
        </button>

        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-200 bg-slate-800/50 hover:bg-slate-700/50 transition-colors border border-slate-700/50"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">导出</span>
        </button>

        <button
          onClick={onToggleBriefing}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all border',
            isBriefingMode
              ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/30'
              : 'text-orange-400 bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20',
          )}
        >
          <Presentation className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">班前会</span>
        </button>
      </div>
    </div>
  );
}
