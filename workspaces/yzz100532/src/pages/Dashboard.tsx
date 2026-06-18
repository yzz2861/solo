import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FacilityPanel } from "@/components/dashboard/FacilityPanel";
import { SimulationPanel } from "@/components/dashboard/SimulationPanel";
import { RouteInfoPanel } from "@/components/dashboard/RouteInfoPanel";
import { StatusBar } from "@/components/dashboard/StatusBar";
import TunnelScene from "@/components/3d/TunnelScene";
import { useSceneStore } from "@/store/useSceneStore";
import { useScenarioStore } from "@/store/useScenarioStore";
import { db } from "@/data/db";
import type { Scenario } from "@/types";

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const setRoute = useSceneStore((state) => state.setRoute);
  const nodes = useSceneStore((state) => state.nodes);
  const edges = useSceneStore((state) => state.edges);
  const calculatedRoute = useScenarioStore((state) => state.calculatedRoute);
  const setScenario = useScenarioStore((state) => state.setScenario);
  const calculateRoute = useScenarioStore((state) => state.calculateRoute);
  const [loadedScenario, setLoadedScenario] = useState<Scenario | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const scenarioId = searchParams.get("scenarioId");
    if (scenarioId && !loadedScenario) {
      loadScenario(scenarioId);
    }
  }, [searchParams, loadedScenario]);

  const loadScenario = async (scenarioId: string) => {
    setIsLoading(true);
    try {
      const scenario = await db.getScenarioById(scenarioId);
      if (scenario) {
        setLoadedScenario(scenario);
        setScenario(scenario);
      }
    } catch (error) {
      console.error("加载方案失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (loadedScenario && nodes.length > 0 && edges.length > 0 && !calculatedRoute) {
      calculateRoute(
        nodes,
        edges,
        loadedScenario.startNodeId,
        loadedScenario.endNodeId,
        loadedScenario.accidentType
      );
    }
  }, [loadedScenario, nodes, edges, calculatedRoute, calculateRoute]);

  useEffect(() => {
    setRoute(calculatedRoute);
  }, [calculatedRoute, setRoute]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-screen w-screen flex flex-col bg-mine-blue overflow-hidden"
    >
      <div className="flex-1 flex overflow-hidden">
        <div className="p-3 pl-4 flex-shrink-0">
          <FacilityPanel />
        </div>

        <div className="flex-1 relative">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="absolute inset-3 rounded border border-tech-cyan/30 overflow-hidden shadow-inner-glow"
          >
            <TunnelScene />

            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="px-6 py-2 bg-mine-blue-dark/80 backdrop-blur-sm border border-tech-cyan/50 rounded"
              >
                <h1 className="font-orbitron text-lg font-bold text-tech-cyan tracking-wider">
                  矿洞应急路线推演系统
                </h1>
              </motion.div>
            </div>

            <div className="absolute top-4 right-4 z-10">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.7, type: "spring" }}
                className="w-3 h-3 rounded-full bg-safety-green animate-pulse shadow-glow-green"
              />
            </div>

            <div className="absolute top-4 left-4 z-10">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.7, type: "spring" }}
                className="w-3 h-3 rounded-full bg-tech-cyan animate-pulse shadow-glow-cyan"
              />
            </div>

            <div className="absolute bottom-4 left-4 z-10">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8, type: "spring" }}
                className="w-3 h-3 rounded-full bg-warning-orange animate-pulse shadow-glow-orange"
              />
            </div>

            <div className="absolute bottom-4 right-4 z-10">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8, type: "spring" }}
                className="w-3 h-3 rounded-full bg-alert-red animate-pulse shadow-glow-red"
              />
            </div>
          </motion.div>
        </div>

        <div className="p-3 pr-4 flex-shrink-0 w-72 overflow-y-auto">
          <div className="space-y-0">
            <SimulationPanel />
            <RouteInfoPanel />
          </div>
        </div>
      </div>

      <StatusBar />
    </motion.div>
  );
}
