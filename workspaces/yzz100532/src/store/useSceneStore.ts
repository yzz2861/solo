import { create } from 'zustand';
import type {
  TunnelNode,
  TunnelEdge,
  Facility,
  Route,
  RouteWarning,
} from '../types';
import {
  mockTunnelNodes,
  mockTunnelEdges,
  mockFacilities,
} from '../data/mock/tunnelData';

export type CameraMode = 'thirdPerson' | 'firstPerson';

export interface VisibilityState {
  walls: boolean;
  route: boolean;
  facilities: boolean;
  personnel: boolean;
}

export interface SceneState {
  cameraMode: CameraMode;
  selectedFacility: Facility | null;
  isAnimating: boolean;
  animationProgress: number;
  nodes: TunnelNode[];
  edges: TunnelEdge[];
  facilities: Facility[];
  route: Route | null;
  visibility: VisibilityState;
  personnelPosition: { x: number; y: number; z: number } | null;
}

export interface SceneActions {
  getNodeById: (id: string) => TunnelNode | undefined;
  getEdgeById: (id: string) => TunnelEdge | undefined;
  getFacilityById: (id: string) => Facility | undefined;
  getWarningForEdge: (edgeId: string) => RouteWarning | undefined;
  setRoute: (route: Route | null) => void;
  setNodesAndEdges: (nodes: TunnelNode[], edges: TunnelEdge[]) => void;
  setFacilities: (facilities: Facility[]) => void;
  setPersonnelPosition: (pos: { x: number; y: number; z: number } | null) => void;
  toggleVisibility: (key: string) => void;
  selectFacility: (facility: Facility | null) => void;
  setCameraMode: (mode: CameraMode) => void;
  startAnimation: () => void;
  stopAnimation: () => void;
  setAnimationProgress: (progress: number) => void;
}

export type SceneStore = SceneState & SceneActions;

const defaultVisibility: VisibilityState = {
  walls: true,
  route: true,
  facilities: true,
  personnel: true,
};

export const useSceneStore = create<SceneStore>((set, get) => ({
  cameraMode: 'thirdPerson',
  selectedFacility: null,
  isAnimating: false,
  animationProgress: 0,
  nodes: mockTunnelNodes,
  edges: mockTunnelEdges,
  facilities: mockFacilities,
  route: null,
  visibility: defaultVisibility,
  personnelPosition: null,

  getNodeById: (id: string) => {
    return get().nodes.find((node) => node.id === id);
  },

  getEdgeById: (id: string) => {
    return get().edges.find((edge) => edge.id === id);
  },

  getFacilityById: (id: string) => {
    return get().facilities.find((facility) => facility.id === id);
  },

  getWarningForEdge: (edgeId: string) => {
    const route = get().route;
    if (!route?.warnings) return undefined;
    return route.warnings.find((w) => w.edgeId === edgeId);
  },

  setRoute: (route: Route | null) =>
    set(() => ({
      route,
    })),

  setNodesAndEdges: (nodes: TunnelNode[], edges: TunnelEdge[]) =>
    set(() => ({
      nodes,
      edges,
    })),

  setFacilities: (facilities: Facility[]) =>
    set(() => ({
      facilities,
    })),

  setPersonnelPosition: (pos: { x: number; y: number; z: number } | null) =>
    set(() => ({
      personnelPosition: pos,
    })),

  toggleVisibility: (key: keyof VisibilityState) =>
    set((state) => ({
      visibility: {
        ...state.visibility,
        [key]: !state.visibility[key],
      },
    })),

  selectFacility: (facility: Facility | null) =>
    set(() => ({
      selectedFacility: facility,
    })),

  setCameraMode: (mode: CameraMode) =>
    set(() => ({
      cameraMode: mode,
    })),

  startAnimation: () =>
    set(() => ({
      isAnimating: true,
      animationProgress: 0,
    })),

  stopAnimation: () =>
    set(() => ({
      isAnimating: false,
    })),

  setAnimationProgress: (progress: number) =>
    set(() => ({
      animationProgress: Math.max(0, Math.min(1, progress)),
    })),
}));

export default useSceneStore;
