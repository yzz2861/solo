import { motion } from "framer-motion";
import {
  Layers,
  Route,
  DoorOpen,
  Droplets,
  Shield,
  Users,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { HudPanel } from "@/components/ui/HudPanel";
import { useSceneStore } from "@/store/useSceneStore";
import { cn } from "@/lib/utils";

interface LayerItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
}

export function FacilityPanel() {
  const visibility = useSceneStore((state) => state.visibility);
  const toggleVisibility = useSceneStore((state) => state.toggleVisibility);

  const layers: LayerItem[] = [
    {
      key: "walls",
      label: "巷道",
      icon: <Layers size={18} />,
      enabled: visibility.walls,
    },
    {
      key: "route",
      label: "路线",
      icon: <Route size={18} />,
      enabled: visibility.route,
    },
    {
      key: "facilities",
      label: "设施",
      icon: <DoorOpen size={18} />,
      enabled: visibility.facilities,
    },
    {
      key: "personnel",
      label: "人员",
      icon: <Users size={18} />,
      enabled: visibility.personnel,
    },
  ];

  const facilityLayers: LayerItem[] = [
    {
      key: "door",
      label: "风门",
      icon: <DoorOpen size={16} />,
      enabled: true,
    },
    {
      key: "water",
      label: "积水点",
      icon: <Droplets size={16} />,
      enabled: true,
    },
    {
      key: "shelter",
      label: "避险硐室",
      icon: <Shield size={16} />,
      enabled: true,
    },
  ];

  const handleToggle = (key: string) => {
    toggleVisibility(key as keyof typeof visibility);
  };

  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-64 flex-shrink-0"
    >
      <HudPanel title="设施标注" accentColor="cyan" className="h-full">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs text-gray-400 font-orbitron uppercase tracking-wider">
              显示图层
            </p>
            <div className="space-y-1">
              {layers.map((layer) => (
                <motion.div
                  key={layer.key}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className={cn(
                    "flex items-center justify-between p-2 rounded",
                    "hover:bg-tech-cyan/10 transition-colors cursor-pointer",
                    "border border-transparent hover:border-tech-cyan/30"
                  )}
                  onClick={() => handleToggle(layer.key)}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "transition-colors",
                        layer.enabled
                          ? "text-tech-cyan"
                          : "text-gray-500"
                      )}
                    >
                      {layer.icon}
                    </span>
                    <span
                      className={cn(
                        "text-sm transition-colors",
                        layer.enabled
                          ? "text-white"
                          : "text-gray-500"
                      )}
                    >
                      {layer.label}
                    </span>
                  </div>
                  {layer.enabled ? (
                    <ToggleRight
                      size={20}
                      className="text-tech-cyan"
                    />
                  ) : (
                    <ToggleLeft
                      size={20}
                      className="text-gray-500"
                    />
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          <div className="border-t border-metal-gray/30 pt-4">
            <p className="text-xs text-gray-400 font-orbitron uppercase tracking-wider mb-2">
              设施类型
            </p>
            <div className="space-y-1">
              {facilityLayers.map((layer, index) => (
                <motion.div
                  key={layer.key}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-3 p-2 rounded opacity-50 cursor-not-allowed"
                >
                  <span className="text-gray-500">
                    {layer.icon}
                  </span>
                  <span className="text-sm text-gray-500">
                    {layer.label}
                  </span>
                </motion.div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              设施类型筛选功能开发中...
            </p>
          </div>

          <div className="border-t border-metal-gray/30 pt-4">
            <p className="text-xs text-gray-400 font-orbitron uppercase tracking-wider mb-2">
              统计信息
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-mine-blue-dark/50 rounded border border-tech-cyan/20">
                <p className="text-lg font-bold font-orbitron text-tech-cyan">
                  12
                </p>
                <p className="text-xs text-gray-400">节点数量</p>
              </div>
              <div className="p-2 bg-mine-blue-dark/50 rounded border border-tech-cyan/20">
                <p className="text-lg font-bold font-orbitron text-tech-cyan">
                  18
                </p>
                <p className="text-xs text-gray-400">巷道数量</p>
              </div>
              <div className="p-2 bg-mine-blue-dark/50 rounded border border-warning-orange/20">
                <p className="text-lg font-bold font-orbitron text-warning-orange">
                  12
                </p>
                <p className="text-xs text-gray-400">设施数量</p>
              </div>
              <div className="p-2 bg-mine-blue-dark/50 rounded border border-safety-green/20">
                <p className="text-lg font-bold font-orbitron text-safety-green">
                  2
                </p>
                <p className="text-xs text-gray-400">避险硐室</p>
              </div>
            </div>
          </div>
        </div>
      </HudPanel>
    </motion.div>
  );
}
