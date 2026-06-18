import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Camera, Eye, Activity, Map, Cpu, Clock } from "lucide-react";
import { useSceneStore } from "@/store/useSceneStore";
import { useScenarioStore } from "@/store/useScenarioStore";
import { cn } from "@/lib/utils";

export function StatusBar() {
  const [fps, setFps] = useState(60);
  const [currentTime, setCurrentTime] = useState(new Date());
  const cameraMode = useSceneStore((state) => state.cameraMode);
  const nodes = useSceneStore((state) => state.nodes);
  const edges = useSceneStore((state) => state.edges);
  const visibility = useSceneStore((state) => state.visibility);
  const calculatedRoute = useScenarioStore((state) => state.calculatedRoute);
  const accidentType = useScenarioStore((state) => state.accidentType);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const measureFps = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
      animationId = requestAnimationFrame(measureFps);
    };

    animationId = requestAnimationFrame(measureFps);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("zh-CN", { hour12: false });
  };

  const getAccidentTypeLabel = () => {
    const labels: Record<string, string> = {
      fire: "火灾",
      flood: "水灾",
      collapse: "塌方",
      gas: "瓦斯",
    };
    return labels[accidentType] || "未知";
  };

  const statusItems = [
    {
      icon: <Clock size={14} />,
      label: "系统时间",
      value: formatTime(currentTime),
      color: "tech-cyan",
    },
    {
      icon: <Camera size={14} />,
      label: "视角模式",
      value: cameraMode === "thirdPerson" ? "第三人称" : "第一人称",
      color: "safety-green",
    },
    {
      icon: <Eye size={14} />,
      label: "FPS",
      value: `${fps}`,
      color: fps >= 50 ? "safety-green" : fps >= 30 ? "warning-orange" : "alert-red",
    },
    {
      icon: <Map size={14} />,
      label: "节点/边数",
      value: `${nodes.length} / ${edges.length}`,
      color: "tech-cyan",
    },
    {
      icon: <Activity size={14} />,
      label: "事故类型",
      value: getAccidentTypeLabel(),
      color: "warning-orange",
    },
    {
      icon: <Cpu size={14} />,
      label: "路线状态",
      value: calculatedRoute ? "已计算" : "未计算",
      color: calculatedRoute ? "safety-green" : "gray",
    },
  ];

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
      className="h-10 bg-mine-blue-dark/90 backdrop-blur-sm border-t border-tech-cyan/30 flex items-center px-4"
    >
      <div className="flex items-center gap-6 flex-1">
        {statusItems.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="flex items-center gap-2"
          >
            <span className={cn(`text-${item.color}`)}>{item.icon}</span>
            <span className="text-xs text-gray-400">{item.label}:</span>
            <span
              className={cn(
                "text-xs font-mono font-medium",
                `text-${item.color}`
              )}
            >
              {item.value}
            </span>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              visibility.walls ? "bg-tech-cyan" : "bg-gray-600"
            )}
          />
          <span className="text-xs text-gray-500">巷道</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              visibility.route ? "bg-safety-green" : "bg-gray-600"
            )}
          />
          <span className="text-xs text-gray-500">路线</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              visibility.facilities ? "bg-warning-orange" : "bg-gray-600"
            )}
          />
          <span className="text-xs text-gray-500">设施</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              visibility.personnel ? "bg-alert-red" : "bg-gray-600"
            )}
          />
          <span className="text-xs text-gray-500">人员</span>
        </div>
      </div>

      <div className="ml-4 pl-4 border-l border-metal-gray/30">
        <span className="text-xs text-gray-600 font-mono">
          矿洞应急路线推演系统 v1.0
        </span>
      </div>
    </motion.div>
  );
}
