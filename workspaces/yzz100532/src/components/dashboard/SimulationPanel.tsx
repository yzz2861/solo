import { useState } from "react";
import { motion } from "framer-motion";
import {
  Flame,
  Droplets,
  Mountain,
  CloudFog,
  Play,
  Pause,
  RotateCcw,
  Camera,
  Eye,
  ChevronDown,
  MapPin,
  Target,
} from "lucide-react";
import { HudPanel } from "@/components/ui/HudPanel";
import { IndustrialButton } from "@/components/ui/IndustrialButton";
import { useSceneStore } from "@/store/useSceneStore";
import { useScenarioStore } from "@/store/useScenarioStore";
import type { AccidentType } from "@/types";
import { cn } from "@/lib/utils";

interface AccidentOption {
  type: AccidentType;
  label: string;
  icon: React.ReactNode;
  color: string;
}

export function SimulationPanel() {
  const nodes = useSceneStore((state) => state.nodes);
  const cameraMode = useSceneStore((state) => state.cameraMode);
  const setCameraMode = useSceneStore((state) => state.setCameraMode);
  const isAnimating = useSceneStore((state) => state.isAnimating);
  const animationProgress = useSceneStore((state) => state.animationProgress);
  const startAnimation = useSceneStore((state) => state.startAnimation);
  const stopAnimation = useSceneStore((state) => state.stopAnimation);
  const setAnimationProgress = useSceneStore(
    (state) => state.setAnimationProgress
  );
  const setRoute = useSceneStore((state) => state.setRoute);

  const accidentType = useScenarioStore((state) => state.accidentType);
  const startNodeId = useScenarioStore((state) => state.startNodeId);
  const endNodeId = useScenarioStore((state) => state.endNodeId);
  const isCalculating = useScenarioStore((state) => state.isCalculating);
  const calculatedRoute = useScenarioStore((state) => state.calculatedRoute);
  const setAccidentType = useScenarioStore((state) => state.setAccidentType);
  const calculateRoute = useScenarioStore((state) => state.calculateRoute);
  const clearRoute = useScenarioStore((state) => state.clearRoute);

  const edges = useSceneStore((state) => state.edges);

  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const accidentOptions: AccidentOption[] = [
    {
      type: "fire",
      label: "火灾",
      icon: <Flame size={20} />,
      color: "alert-red",
    },
    {
      type: "flood",
      label: "水灾",
      icon: <Droplets size={20} />,
      color: "tech-cyan",
    },
    {
      type: "collapse",
      label: "塌方",
      icon: <Mountain size={20} />,
      color: "warning-orange",
    },
    {
      type: "gas",
      label: "瓦斯",
      icon: <CloudFog size={20} />,
      color: "safety-green",
    },
  ];

  const handleAccidentTypeChange = (type: AccidentType) => {
    setAccidentType(type);
  };

  const handleCalculateRoute = async () => {
    if (!startNodeId || !endNodeId) return;
    await calculateRoute(nodes, edges, startNodeId, endNodeId, accidentType);
  };

  const handleClearRoute = () => {
    clearRoute();
    setRoute(null);
    stopAnimation();
    setAnimationProgress(0);
  };

  const handleToggleAnimation = () => {
    if (isAnimating) {
      stopAnimation();
    } else {
      startAnimation();
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const progress = parseFloat(e.target.value);
    setAnimationProgress(progress);
  };

  const getNodeName = (nodeId: string | null) => {
    if (!nodeId) return "请选择";
    const node = nodes.find((n) => n.id === nodeId);
    return node?.name || nodeId;
  };

  const handleStartSelect = (nodeId: string) => {
    useScenarioStore.setState({ startNodeId: nodeId });
    setStartOpen(false);
  };

  const handleEndSelect = (nodeId: string) => {
    useScenarioStore.setState({ endNodeId: nodeId });
    setEndOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <HudPanel title="事故模拟" accentColor="orange" className="mb-4">
        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-400 font-orbitron uppercase tracking-wider mb-2">
              事故类型
            </p>
            <div className="grid grid-cols-4 gap-2">
              {accidentOptions.map((option) => (
                <motion.button
                  key={option.type}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAccidentTypeChange(option.type)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded",
                    "border transition-all duration-300",
                    accidentType === option.type
                      ? `bg-${option.color}/20 border-${option.color} text-${option.color} shadow-glow-${option.color}`
                      : "bg-mine-blue-dark/50 border-metal-gray/30 text-gray-400 hover:border-metal-gray"
                  )}
                >
                  <span
                    className={cn(
                      accidentType === option.type
                        ? `text-${option.color}`
                        : "text-gray-500"
                    )}
                  >
                    {option.icon}
                  </span>
                  <span className="text-xs font-medium">{option.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <p className="text-xs text-gray-400 font-orbitron uppercase tracking-wider mb-1">
                起点位置
              </p>
              <button
                onClick={() => setStartOpen(!startOpen)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2",
                  "bg-mine-blue-dark/50 border border-metal-gray/30 rounded",
                  "text-sm text-left transition-colors",
                  "hover:border-warning-orange/50 focus:border-warning-orange"
                )}
              >
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-safety-green" />
                  <span className="text-white">{getNodeName(startNodeId)}</span>
                </div>
                <ChevronDown
                  size={16}
                  className={cn(
                    "text-gray-400 transition-transform",
                    startOpen && "rotate-180"
                  )}
                />
              </button>
              {startOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto z-10"
                >
                  <div className="bg-mine-blue-dark border border-warning-orange/30 rounded shadow-lg">
                    {nodes.map((node) => (
                      <button
                        key={node.id}
                        onClick={() => handleStartSelect(node.id)}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm",
                          "hover:bg-warning-orange/10 transition-colors",
                          "border-b border-metal-gray/20 last:border-b-0",
                          startNodeId === node.id &&
                            "bg-warning-orange/10 text-warning-orange"
                        )}
                      >
                        {node.name || node.id}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            <div className="relative">
              <p className="text-xs text-gray-400 font-orbitron uppercase tracking-wider mb-1">
                终点位置
              </p>
              <button
                onClick={() => setEndOpen(!endOpen)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2",
                  "bg-mine-blue-dark/50 border border-metal-gray/30 rounded",
                  "text-sm text-left transition-colors",
                  "hover:border-warning-orange/50 focus:border-warning-orange"
                )}
              >
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-alert-red" />
                  <span className="text-white">{getNodeName(endNodeId)}</span>
                </div>
                <ChevronDown
                  size={16}
                  className={cn(
                    "text-gray-400 transition-transform",
                    endOpen && "rotate-180"
                  )}
                />
              </button>
              {endOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto z-10"
                >
                  <div className="bg-mine-blue-dark border border-warning-orange/30 rounded shadow-lg">
                    {nodes.map((node) => (
                      <button
                        key={node.id}
                        onClick={() => handleEndSelect(node.id)}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm",
                          "hover:bg-warning-orange/10 transition-colors",
                          "border-b border-metal-gray/20 last:border-b-0",
                          endNodeId === node.id &&
                            "bg-warning-orange/10 text-warning-orange"
                        )}
                      >
                        {node.name || node.id}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <IndustrialButton
              variant="warning"
              size="md"
              fullWidth
              onClick={handleCalculateRoute}
              disabled={!startNodeId || !endNodeId || isCalculating}
              className={cn(
                !startNodeId || !endNodeId || isCalculating
                  ? "opacity-50 cursor-not-allowed"
                  : "animate-pulse-glow"
              )}
            >
              {isCalculating ? "计算中..." : "一键推演"}
            </IndustrialButton>
            <IndustrialButton
              variant="default"
              size="md"
              fullWidth
              leftIcon={<RotateCcw size={16} />}
              onClick={handleClearRoute}
              disabled={!calculatedRoute}
            >
              清除路线
            </IndustrialButton>
          </div>
        </div>
      </HudPanel>

      <HudPanel title="动画控制" accentColor="cyan" className="mb-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <IndustrialButton
              variant="primary"
              size="sm"
              onClick={handleToggleAnimation}
              disabled={!calculatedRoute}
              leftIcon={isAnimating ? <Pause size={14} /> : <Play size={14} />}
            >
              {isAnimating ? "暂停" : "播放"}
            </IndustrialButton>
            <div className="flex-1">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={animationProgress}
                onChange={handleProgressChange}
                disabled={!calculatedRoute}
                className="w-full h-2 bg-mine-blue-dark rounded appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-tech-cyan
                  [&::-webkit-slider-thumb]:shadow-glow-cyan
                  [&::-webkit-slider-thumb]:cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #00d4ff 0%, #00d4ff ${
                    animationProgress * 100
                  }%, #1a2d4a ${animationProgress * 100}%, #1a2d4a 100%)`,
                }}
              />
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-400 font-mono">
            <span>进度: {Math.round(animationProgress * 100)}%</span>
            {calculatedRoute?.estimatedTime && (
              <span>
                预计: {Math.floor(calculatedRoute.estimatedTime / 60)}分
                {Math.floor(calculatedRoute.estimatedTime % 60)}秒
              </span>
            )}
          </div>
        </div>
      </HudPanel>

      <HudPanel title="视角模式" accentColor="green">
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setCameraMode("thirdPerson")}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded",
              "border transition-all duration-300",
              cameraMode === "thirdPerson"
                ? "bg-safety-green/20 border-safety-green text-safety-green shadow-glow-green"
                : "bg-mine-blue-dark/50 border-metal-gray/30 text-gray-400 hover:border-safety-green/50"
            )}
          >
            <Camera size={20} />
            <span className="text-xs font-medium">第三人称</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setCameraMode("firstPerson")}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded",
              "border transition-all duration-300",
              cameraMode === "firstPerson"
                ? "bg-safety-green/20 border-safety-green text-safety-green shadow-glow-green"
                : "bg-mine-blue-dark/50 border-metal-gray/30 text-gray-400 hover:border-safety-green/50"
            )}
          >
            <Eye size={20} />
            <span className="text-xs font-medium">第一人称</span>
          </motion.button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          按 V 键快速切换视角模式
        </p>
      </HudPanel>
    </motion.div>
  );
}
