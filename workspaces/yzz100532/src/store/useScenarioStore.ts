import { create } from 'zustand';
import type {
  Scenario,
  Route,
  RouteWarning,
  AccidentType,
  TunnelNode,
  TunnelEdge,
} from '../types';
import { aStar } from '../engine/pathfinding/aStar';
import { detectConstraints } from '../engine/constraints/detector';
import { calculateTime } from '../engine/estimation/timeCalculator';
import { db } from '../data/db';

export interface ScenarioState {
  currentScenario: Scenario | null;
  calculatedRoute: Route | null;
  warnings: RouteWarning[];
  accidentType: AccidentType;
  startNodeId: string | null;
  endNodeId: string | null;
  isCalculating: boolean;
}

export interface ScenarioActions {
  setScenario: (scenario: Scenario | null) => void;
  calculateRoute: (
    nodes: TunnelNode[],
    edges: TunnelEdge[],
    startNodeId: string,
    endNodeId: string,
    accidentType: AccidentType
  ) => Promise<void>;
  setAccidentType: (type: AccidentType) => void;
  clearRoute: () => void;
  saveScenario: (scenario: Scenario) => Promise<string>;
}

export type ScenarioStore = ScenarioState & ScenarioActions;

export const useScenarioStore = create<ScenarioStore>((set, get) => ({
  currentScenario: null,
  calculatedRoute: null,
  warnings: [],
  accidentType: 'fire',
  startNodeId: null,
  endNodeId: null,
  isCalculating: false,

  setScenario: (scenario: Scenario | null) =>
    set(() => ({
      currentScenario: scenario,
      accidentType: scenario?.accidentType || 'fire',
      startNodeId: scenario?.startNodeId || null,
      endNodeId: scenario?.endNodeId || null,
    })),

  calculateRoute: async (
    nodes: TunnelNode[],
    edges: TunnelEdge[],
    startNodeId: string,
    endNodeId: string,
    accidentType: AccidentType
  ) => {
    set(() => ({ isCalculating: true }));

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const route = aStar(nodes, edges, startNodeId, endNodeId, accidentType);

      if (route.nodes.length === 0) {
        set(() => ({
          calculatedRoute: null,
          warnings: [],
          isCalculating: false,
          startNodeId,
          endNodeId,
          accidentType,
        }));
        return;
      }

      const routeEdges = edges.filter((edge) => route.edges.includes(edge.id));
      const warnings = detectConstraints(routeEdges, accidentType);
      const estimatedTime = calculateTime({ edges: routeEdges });

      const routeWithTime: Route = {
        ...route,
        estimatedTime,
        warnings,
      };

      set(() => ({
        calculatedRoute: routeWithTime,
        warnings,
        isCalculating: false,
        startNodeId,
        endNodeId,
        accidentType,
      }));
    } catch (error) {
      console.error('Route calculation failed:', error);
      set(() => ({
        isCalculating: false,
        calculatedRoute: null,
        warnings: [],
      }));
    }
  },

  setAccidentType: (type: AccidentType) =>
    set(() => ({
      accidentType: type,
    })),

  clearRoute: () =>
    set(() => ({
      calculatedRoute: null,
      warnings: [],
    })),

  saveScenario: async (scenario: Scenario): Promise<string> => {
    const existing = await db.getScenarioById(scenario.id);
    if (existing) {
      await db.updateScenario(scenario.id, scenario);
      set((state) => ({
        currentScenario:
          state.currentScenario?.id === scenario.id
            ? scenario
            : state.currentScenario,
      }));
      return scenario.id;
    } else {
      const id = await db.addScenario(scenario);
      return id;
    }
  },
}));

export default useScenarioStore;
