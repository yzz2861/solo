import { Layers, Eye, EyeOff, MapPin, AlertTriangle, Route, Building2, Thermometer } from 'lucide-react';
import { useSceneStore } from '@/store/useSceneStore';
import { cn } from '@/utils/cn';

const layerConfig = [
  {
    key: 'showForbiddenZones',
    label: '禁区',
    icon: Building2,
    color: 'text-danger',
  },
  {
    key: 'showTrajectories',
    label: '轨迹',
    icon: Route,
    color: 'text-primary',
  },
  {
    key: 'showAlarms',
    label: '告警',
    icon: AlertTriangle,
    color: 'text-warning',
  },
  {
    key: 'showCheckpoints',
    label: '检查点',
    icon: MapPin,
    color: 'text-success',
  },
  {
    key: 'showHeatmap',
    label: '热力图',
    icon: Thermometer,
    color: 'text-danger',
  },
];

export function LayerControl() {
  const {
    showForbiddenZones,
    showTrajectories,
    showAlarms,
    showHeatmap,
    showCheckpoints,
    actions: {
      toggleForbiddenZones,
      toggleTrajectories,
      toggleAlarms,
      toggleHeatmap,
      toggleCheckpoints,
    },
  } = useSceneStore();

  const stateMap: Record<string, boolean> = {
    showForbiddenZones,
    showTrajectories,
    showAlarms,
    showCheckpoints,
    showHeatmap,
  };

  const toggleMap: Record<string, () => void> = {
    showForbiddenZones: toggleForbiddenZones,
    showTrajectories: toggleTrajectories,
    showAlarms: toggleAlarms,
    showCheckpoints: toggleCheckpoints,
    showHeatmap: toggleHeatmap,
  };

  return (
    <div className="panel p-3">
      <div className="flex items-center gap-2 mb-3">
        <Layers size={16} className="text-primary" />
        <h3 className="font-display font-semibold text-sm text-white">图层控制</h3>
      </div>

      <div className="space-y-2">
        {layerConfig.map((layer) => {
          const Icon = layer.icon;
          const isVisible = stateMap[layer.key];
          const toggle = toggleMap[layer.key];

          return (
            <button
              key={layer.key}
              onClick={toggle}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded transition-all text-left",
                isVisible
                  ? "bg-primary/10 text-white"
                  : "bg-transparent text-white/40 hover:bg-white/5 hover:text-white/70"
              )}
            >
              {isVisible ? (
                <Eye size={14} className={layer.color} />
              ) : (
                <EyeOff size={14} className="text-white/30" />
              )}
              <Icon size={14} className={cn(isVisible && layer.color)} />
              <span className="text-sm">{layer.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
