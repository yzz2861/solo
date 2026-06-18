import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  MapPin,
  AlertTriangle,
  Clock,
  CheckCircle,
  ArrowRight,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mockScenarios, mockTunnelNodes, mockTunnelEdges } from "@/data/mock/tunnelData";
import type { Scenario, TunnelNode, TunnelEdge } from "@/types";
import { useNavigate, useParams } from "react-router-dom";

type DrillState = "ready" | "running" | "paused" | "completed";

interface NodeTimestamp {
  nodeId: string;
  time: number;
  event?: string;
}

export default function Drill() {
  const navigate = useNavigate();
  const { scenarioId } = useParams<{ scenarioId?: string }>();

  const scenario = useMemo(
    () =>
      mockScenarios.find((s) => s.id === scenarioId) ||
      mockScenarios[0],
    [scenarioId]
  );

  const routeNodes = useMemo(() => {
    const nodes: TunnelNode[] = [];
    const startNode = mockTunnelNodes.find((n) => n.id === scenario.startNodeId);
    const endNode = mockTunnelNodes.find((n) => n.id === scenario.endNodeId);
    if (startNode) nodes.push(startNode);

    const midNodes = mockTunnelNodes.filter(
      (n) => n.id !== scenario.startNodeId && n.id !== scenario.endNodeId
    );
    nodes.push(...midNodes.slice(0, 5));

    if (endNode) nodes.push(endNode);
    return nodes;
  }, [scenario]);

  const [drillState, setDrillState] = useState<DrillState>("ready");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
  const [timestamps, setTimestamps] = useState<NodeTimestamp[]>([]);

  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  const currentNode = routeNodes[currentNodeIndex];
  const nextNode = routeNodes[currentNodeIndex + 1];
  const progress = routeNodes.length > 1 ? (currentNodeIndex / (routeNodes.length - 1)) * 100 : 0;

  const warnings = useMemo(() => {
    if (!nextNode) return [];
    return scenario.constraints.filter((c) => {
      const edge = mockTunnelEdges.find((e) => e.id === c.edgeId);
      if (!edge) return false;
      return (
        (edge.from === currentNode?.id && edge.to === nextNode.id) ||
        (edge.to === currentNode?.id && edge.from === nextNode.id)
      );
    });
  }, [scenario, currentNode, nextNode]);

  const updateTimer = useCallback(() => {
    if (drillState === "running") {
      const now = performance.now();
      const elapsed = pausedTimeRef.current + (now - startTimeRef.current);
      setElapsedTime(Math.floor(elapsed / 1000));
      animationFrameRef.current = requestAnimationFrame(updateTimer);
    }
  }, [drillState]);

  useEffect(() => {
    if (drillState === "running") {
      startTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(updateTimer);
    } else if (drillState === "paused") {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drillState, updateTimer]);

  const handleStart = () => {
    if (drillState === "ready") {
      setTimestamps([{ nodeId: routeNodes[0].id, time: 0, event: "演练开始" }]);
    }
    setDrillState("running");
  };

  const handlePause = () => {
    if (drillState === "running") {
      pausedTimeRef.current += performance.now() - startTimeRef.current;
      setDrillState("paused");
    }
  };

  const handleReset = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setDrillState("ready");
    setElapsedTime(0);
    setCurrentNodeIndex(0);
    setTimestamps([]);
    startTimeRef.current = 0;
    pausedTimeRef.current = 0;
  };

  const handleNextNode = () => {
    if (currentNodeIndex < routeNodes.length - 1) {
      const nextIndex = currentNodeIndex + 1;
      setCurrentNodeIndex(nextIndex);

      const newTimestamp: NodeTimestamp = {
        nodeId: routeNodes[nextIndex].id,
        time: elapsedTime,
        event: `到达${routeNodes[nextIndex].name || routeNodes[nextIndex].id}`,
      };
      setTimestamps((prev) => [...prev, newTimestamp]);

      if (nextIndex === routeNodes.length - 1) {
        pausedTimeRef.current += performance.now() - startTimeRef.current;
        setDrillState("completed");
      }
    }
  };

  const handlePrevNode = () => {
    if (currentNodeIndex > 0) {
      setCurrentNodeIndex((prev) => prev - 1);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getDirectionArrow = () => {
    if (!currentNode || !nextNode) return null;

    const dx = nextNode.x - currentNode.x;
    const dy = nextNode.y - currentNode.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > absDy * 2) {
      return dx > 0 ? (
        <ChevronRight size={48} className="text-tech-cyan" />
      ) : (
        <ChevronLeft size={48} className="text-tech-cyan" />
      );
    } else if (absDy > absDx * 2) {
      return dy > 0 ? (
        <ChevronUp size={48} className="text-tech-cyan" />
      ) : (
        <ChevronDown size={48} className="text-tech-cyan" />
      );
    } else if (dx > 0 && dy > 0) {
      return (
        <div className="text-tech-cyan">
          <ChevronRight size={48} />
        </div>
      );
    } else {
      return <ArrowRight size={48} className="text-tech-cyan" />;
    }
  };

  const renderRouteSVG = () => {
    const width = 800;
    const height = 500;
    const padding = 60;

    const xs = mockTunnelNodes.map((n) => n.x);
    const ys = mockTunnelNodes.map((n) => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const scaleX = (width - padding * 2) / (maxX - minX || 1);
    const scaleY = (height - padding * 2) / (maxY - minY || 1);
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (width - (maxX - minX) * scale) / 2 - minX * scale;
    const offsetY = (height - (maxY - minY) * scale) / 2 - minY * scale;

    const toSvgX = (x: number) => x * scale + offsetX;
    const toSvgY = (y: number) => height - (y * scale + offsetY);

    const routeNodeIds = routeNodes.map((n) => n.id);
    const routeEdgeIds: string[] = [];
    for (let i = 0; i < routeNodeIds.length - 1; i++) {
      const edge = mockTunnelEdges.find(
        (e) =>
          (e.from === routeNodeIds[i] && e.to === routeNodeIds[i + 1]) ||
          (e.to === routeNodeIds[i] && e.from === routeNodeIds[i + 1])
      );
      if (edge) routeEdgeIds.push(edge.id);
    }

    const visitedEdgeIds: string[] = [];
    for (let i = 0; i < currentNodeIndex; i++) {
      const edge = mockTunnelEdges.find(
        (e) =>
          (e.from === routeNodeIds[i] && e.to === routeNodeIds[i + 1]) ||
          (e.to === routeNodeIds[i] && e.from === routeNodeIds[i + 1])
      );
      if (edge) visitedEdgeIds.push(edge.id);
    }

    const forbiddenEdgeIds = scenario.constraints
      .filter((c) => c.type === "blocked" || c.type === "closed")
      .map((c) => c.edgeId)
      .filter((id): id is string => id !== undefined);

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <defs>
          <pattern id="drillGrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path
              d="M 30 0 L 0 0 0 30"
              fill="none"
              stroke="rgba(0, 212, 255, 0.1)"
              strokeWidth="1"
            />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="strongGlow">
            <feGaussianBlur stdDeviation="8" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="100%" height="100%" fill="url(#drillGrid)" />

        {mockTunnelEdges.map((edge) => {
          const fromNode = mockTunnelNodes.find((n) => n.id === edge.from);
          const toNode = mockTunnelNodes.find((n) => n.id === edge.to);
          if (!fromNode || !toNode) return null;

          const isRoute = routeEdgeIds.includes(edge.id);
          const isVisited = visitedEdgeIds.includes(edge.id);
          const isForbidden = forbiddenEdgeIds.includes(edge.id);

          let strokeColor = "rgba(107, 114, 128, 0.5)";
          let strokeWidth = 4;
          let strokeDasharray = "";

          if (isForbidden) {
            strokeColor = "#ef4444";
            strokeWidth = 6;
            strokeDasharray = "12 6";
          } else if (isVisited) {
            strokeColor = "#22c55e";
            strokeWidth = 6;
          } else if (isRoute) {
            strokeColor = "#00d4ff";
            strokeWidth = 6;
          }

          return (
            <line
              key={edge.id}
              x1={toSvgX(fromNode.x)}
              y1={toSvgY(fromNode.y)}
              x2={toSvgX(toNode.x)}
              y2={toSvgY(toNode.y)}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
              filter={isRoute && !isForbidden ? "url(#glow)" : undefined}
            />
          );
        })}

        {routeNodes.map((node, index) => {
          const isCurrent = index === currentNodeIndex;
          const isVisited = index < currentNodeIndex;
          const isNext = index === currentNodeIndex + 1;

          let fillColor = "#4b5563";
          let radius = 12;
          let filter = "";

          if (isCurrent) {
            fillColor = "#00d4ff";
            radius = 20;
            filter = "url(#strongGlow)";
          } else if (isVisited) {
            fillColor = "#22c55e";
            radius = 14;
          } else if (isNext) {
            fillColor = "#f97316";
            radius = 16;
            filter = "url(#glow)";
          }

          return (
            <g key={node.id}>
              {isCurrent && (
                <>
                  <circle
                    cx={toSvgX(node.x)}
                    cy={toSvgY(node.y)}
                    r={radius + 15}
                    fill="none"
                    stroke="#00d4ff"
                    strokeWidth="2"
                    opacity="0.5"
                    filter="url(#glow)"
                  >
                    <animate
                      attributeName="r"
                      values={`${radius + 10};${radius + 25};${radius + 10}`}
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.6;0.2;0.6"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </>
              )}
              <circle
                cx={toSvgX(node.x)}
                cy={toSvgY(node.y)}
                r={radius}
                fill={fillColor}
                stroke="#ffffff"
                strokeWidth="3"
                filter={filter}
              />
              {(isCurrent || isNext || index === 0 || index === routeNodes.length - 1) && node.name && (
                <text
                  x={toSvgX(node.x)}
                  y={toSvgY(node.y) - radius - 10}
                  textAnchor="middle"
                  fontSize="14"
                  fill="white"
                  fontWeight="bold"
                  style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}
                >
                  {node.name}
                </text>
              )}
            </g>
          );
        })}

        {currentNode && nextNode && (
          <g>
            <defs>
              <marker
                id="directionArrow"
                markerWidth="12"
                markerHeight="8"
                refX="10"
                refY="4"
                orient="auto"
              >
                <polygon points="0 0, 12 4, 0 8" fill="#00d4ff" filter="url(#glow)" />
              </marker>
            </defs>
            <line
              x1={toSvgX(currentNode.x)}
              y1={toSvgY(currentNode.y)}
              x2={toSvgX(nextNode.x)}
              y2={toSvgY(nextNode.y)}
              stroke="#00d4ff"
              strokeWidth="4"
              strokeDasharray="10 5"
              markerEnd="url(#directionArrow)"
              filter="url(#glow)"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="-30"
                dur="1s"
                repeatCount="indefinite"
              />
            </line>
          </g>
        )}
      </svg>
    );
  };

  return (
    <div className="h-screen w-screen bg-mine-blue-dark text-white overflow-hidden flex flex-col">
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-tech-cyan" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-tech-cyan" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-tech-cyan" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-tech-cyan" />

      <header className="relative z-10 px-6 py-4 border-b border-tech-cyan/30 bg-mine-blue/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-gray-400 hover:text-tech-cyan transition-colors"
          >
            <Home size={24} />
            <span className="text-sm font-medium">返回首页</span>
          </button>

          <div className="text-center">
            <h1 className="text-2xl font-orbitron font-bold text-tech-cyan tracking-wider">
              {scenario.name}
            </h1>
            <p className="text-sm text-gray-400 mt-1">演练模式</p>
          </div>

          <div className="w-32" />
        </div>

        <div className="mt-4 flex items-center justify-center">
          <div className="relative">
            <div
              className={cn(
                "text-7xl font-orbitron font-bold tracking-widest",
                drillState === "completed"
                  ? "text-safety-green"
                  : drillState === "running"
                  ? "text-tech-cyan"
                  : "text-gray-300"
              )}
              style={{ textShadow: drillState === "running" ? "0 0 30px rgba(0, 212, 255, 0.5)" : "none" }}
            >
              {formatTime(elapsedTime)}
            </div>
            {drillState === "running" && (
              <div className="absolute -top-2 -right-4">
                <span className="w-3 h-3 bg-safety-green rounded-full animate-pulse inline-block" />
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-4">
          {drillState === "ready" && (
            <button
              onClick={handleStart}
              className="group relative px-12 py-4 bg-gradient-to-b from-safety-green to-safety-green-dark border-2 border-safety-green text-white text-xl font-orbitron font-bold rounded-lg shadow-lg hover:shadow-glow-green transition-all hover:scale-105 active:scale-95"
            >
              <Play size={28} className="inline mr-3" />
              开始演练
            </button>
          )}

          {drillState === "running" && (
            <button
              onClick={handlePause}
              className="group relative px-10 py-4 bg-gradient-to-b from-warning-orange to-warning-orange-dark border-2 border-warning-orange text-white text-xl font-orbitron font-bold rounded-lg shadow-lg hover:shadow-glow-orange transition-all hover:scale-105 active:scale-95"
            >
              <Pause size={28} className="inline mr-3" />
              暂停
            </button>
          )}

          {drillState === "paused" && (
            <>
              <button
                onClick={handleStart}
                className="group relative px-10 py-4 bg-gradient-to-b from-safety-green to-safety-green-dark border-2 border-safety-green text-white text-xl font-orbitron font-bold rounded-lg shadow-lg hover:shadow-glow-green transition-all hover:scale-105 active:scale-95"
              >
                <Play size={28} className="inline mr-3" />
                继续
              </button>
              <button
                onClick={handleReset}
                className="group relative px-8 py-4 bg-gradient-to-b from-metal-gray to-metal-gray-dark border-2 border-metal-gray-light text-white text-lg font-orbitron font-bold rounded-lg shadow-lg hover:border-tech-cyan hover:shadow-glow-cyan transition-all hover:scale-105 active:scale-95"
              >
                <RotateCcw size={24} className="inline mr-2" />
                重置
              </button>
            </>
          )}

          {drillState === "completed" && (
            <button
              onClick={handleReset}
              className="group relative px-10 py-4 bg-gradient-to-b from-tech-cyan-dark to-tech-cyan-dark border-2 border-tech-cyan text-white text-xl font-orbitron font-bold rounded-lg shadow-lg hover:shadow-glow-cyan transition-all hover:scale-105 active:scale-95"
            >
              <RotateCcw size={28} className="inline mr-3" />
              重新开始
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-6 flex flex-col">
          <div className="flex-1 bg-mine-blue/50 rounded-xl border border-tech-cyan/20 overflow-hidden relative">
            <div className="absolute inset-0 grid-bg opacity-30" />

            <div className="relative h-full flex items-center justify-center p-8">
              {renderRouteSVG()}
            </div>

            <div className="absolute top-4 left-4 flex gap-4">
              <div className="flex items-center gap-2 bg-mine-blue-dark/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-tech-cyan/20">
                <div className="w-4 h-4 rounded-full bg-safety-green" />
                <span className="text-sm text-gray-300">已完成</span>
              </div>
              <div className="flex items-center gap-2 bg-mine-blue-dark/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-tech-cyan/20">
                <div className="w-4 h-4 rounded-full bg-tech-cyan animate-pulse" />
                <span className="text-sm text-gray-300">当前位置</span>
              </div>
              <div className="flex items-center gap-2 bg-mine-blue-dark/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-tech-cyan/20">
                <div className="w-4 h-4 rounded-full bg-warning-orange" />
                <span className="text-sm text-gray-300">下一目标</span>
              </div>
            </div>
          </div>
        </div>

        <aside className="w-96 border-l border-tech-cyan/20 bg-mine-blue/50 flex flex-col">
          <div className="p-6 border-b border-tech-cyan/20">
            <h3 className="text-lg font-orbitron font-semibold text-tech-cyan mb-4">
              <MapPin size={20} className="inline mr-2" />
              当前位置
            </h3>
            <div className="hud-border p-4 rounded-lg">
              <div className="corner-tr" />
              <div className="corner-bl" />
              <div className="text-2xl font-bold text-white">
                {currentNode?.name || currentNode?.id}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                第 {currentNodeIndex + 1} / {routeNodes.length} 个节点
              </div>
            </div>
          </div>

          {nextNode && drillState !== "completed" && (
            <div className="p-6 border-b border-tech-cyan/20">
              <h3 className="text-lg font-orbitron font-semibold text-warning-orange mb-4">
                <ChevronRight size={20} className="inline mr-2" />
                下一目标
              </h3>
              <div className="hud-border p-4 rounded-lg border-warning-orange/30">
                <div className="corner-tr border-warning-orange/50" />
                <div className="corner-bl border-warning-orange/50" />
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-warning-orange/20 flex items-center justify-center border-2 border-warning-orange/50">
                    {getDirectionArrow()}
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white">{nextNode.name || nextNode.id}</div>
                    <div className="text-sm text-gray-400">继续前进</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {warnings.length > 0 && drillState !== "completed" && (
            <div className="p-6 border-b border-tech-cyan/20">
              <h3 className="text-lg font-orbitron font-semibold text-alert-red mb-4">
                <AlertTriangle size={20} className="inline mr-2" />
                预警信息
              </h3>
              <div className="space-y-3">
                {warnings.map((warning) => (
                  <div
                    key={warning.id}
                    className="bg-alert-red/10 border border-alert-red/30 rounded-lg p-4"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={20} className="text-alert-red shrink-0 mt-0.5" />
                      <div>
                        <div className="text-alert-red font-semibold">注意</div>
                        <div className="text-sm text-gray-300 mt-1">{warning.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {drillState === "completed" && (
            <div className="p-6 border-b border-tech-cyan/20">
              <div className="hud-border p-6 rounded-lg border-safety-green/30 text-center">
                <div className="corner-tr border-safety-green/50" />
                <div className="corner-bl border-safety-green/50" />
                <CheckCircle size={64} className="mx-auto text-safety-green mb-4" />
                <div className="text-2xl font-orbitron font-bold text-safety-green">
                  演练完成！
                </div>
                <div className="text-gray-400 mt-2">
                  总用时：{formatTime(elapsedTime)}
                </div>
                <div className="text-gray-400">
                  途经节点：{routeNodes.length} 个
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto p-6">
            <h3 className="text-lg font-orbitron font-semibold text-tech-cyan mb-4">
              <Clock size={20} className="inline mr-2" />
              时间记录
            </h3>
            <div className="space-y-2">
              {timestamps.map((ts, index) => {
                const node = mockTunnelNodes.find((n) => n.id === ts.nodeId);
                return (
                  <motion.div
                    key={`${ts.nodeId}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 bg-mine-blue-dark/50 rounded-lg p-3 border border-tech-cyan/10"
                  >
                    <div
                      className={cn(
                        "w-3 h-3 rounded-full shrink-0",
                        index === 0
                          ? "bg-safety-green"
                          : index === timestamps.length - 1
                          ? "bg-tech-cyan"
                          : "bg-metal-gray"
                      )}
                    />
                    <div className="flex-1">
                      <div className="text-white font-medium">
                        {node?.name || ts.nodeId}
                      </div>
                      <div className="text-xs text-gray-500">{ts.event}</div>
                    </div>
                    <div className="text-tech-cyan font-mono font-bold">
                      {formatTime(ts.time)}
                    </div>
                  </motion.div>
                );
              })}
              {timestamps.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  点击"开始演练"开始记录
                </div>
              )}
            </div>
          </div>
        </aside>
      </main>

      <footer className="relative z-10 px-6 py-4 border-t border-tech-cyan/30 bg-mine-blue/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">完成进度</span>
            <span className="text-tech-cyan font-orbitron font-bold">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="text-gray-400 text-sm">
            已用节点数：
            <span className="text-white font-bold">{currentNodeIndex + 1}</span>
            {" / "}
            <span className="text-white">{routeNodes.length}</span>
          </div>
        </div>

        <div className="relative h-4 bg-mine-blue-dark rounded-full overflow-hidden border border-tech-cyan/30">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-safety-green via-tech-cyan to-tech-cyan-light"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-px w-full bg-white/10" />
          </div>
        </div>

        <div className="mt-4 flex justify-center gap-6">
          <button
            onClick={handlePrevNode}
            disabled={currentNodeIndex === 0 || drillState === "completed"}
            className={cn(
              "px-8 py-3 rounded-lg font-orbitron font-bold text-lg transition-all",
              "border-2 flex items-center gap-2",
              currentNodeIndex === 0 || drillState === "completed"
                ? "border-metal-gray bg-mine-blue-dark text-gray-600 cursor-not-allowed"
                : "border-metal-gray-light bg-metal-gray text-white hover:border-tech-cyan hover:shadow-glow-cyan"
            )}
          >
            <ChevronLeft size={24} />
            上一节点
          </button>

          <button
            onClick={handleNextNode}
            disabled={currentNodeIndex >= routeNodes.length - 1 || drillState !== "running"}
            className={cn(
              "px-10 py-3 rounded-lg font-orbitron font-bold text-lg transition-all",
              "border-2 flex items-center gap-2",
              currentNodeIndex >= routeNodes.length - 1 || drillState !== "running"
                ? "border-metal-gray bg-mine-blue-dark text-gray-600 cursor-not-allowed"
                : "border-safety-green bg-gradient-to-b from-safety-green to-safety-green-dark text-white hover:shadow-glow-green hover:scale-105 active:scale-95"
            )}
          >
            下一节点
            <ChevronRight size={24} />
          </button>
        </div>
      </footer>
    </div>
  );
}
