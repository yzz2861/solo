export interface Tree {
  id: string;
  code: string;
  species: string;
  height: number;
  crownRadius: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  heightEstimated: boolean;
  healthStatus: "good" | "fair" | "poor";
  crownShape?: "round" | "oval" | "conical" | "irregular";
}

export interface StreetLamp {
  id: string;
  position: [number, number, number];
  intensity: number;
  radius: number;
  height: number;
}

export interface Sign {
  id: string;
  position: [number, number, number];
  type: "direction" | "warning" | "information";
  content: string;
  height: number;
  width: number;
}

export interface Bench {
  id: string;
  position: [number, number, number];
  rotation: number;
  length: number;
}

export interface PowerLine {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  height: number;
  voltage: "low" | "medium" | "high";
}

export interface RoadSegment {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  width: number;
}

export interface PruningBoxState {
  position: [number, number, number];
  size: [number, number, number];
  rotation: [number, number, number];
  visible: boolean;
}

export interface Warning {
  id: string;
  type: "height_incomplete" | "power_line" | "blind_spot" | "excessive_pruning";
  severity: "warning" | "error";
  message: string;
  treeId?: string;
  position?: [number, number, number];
}

export interface PruningScheme {
  id: string;
  name: string;
  treeId: string;
  pruningBox: PruningBoxState;
  clearanceHeight: number;
  lightingCoverage: number;
  landscapeScore: number;
  prunedVolume: number;
  createdAt: Date;
  createdBy: string;
  beforeImage?: string;
  afterImage?: string;
  taskIds: string[];
}

export interface Task {
  id: string;
  schemeId: string;
  treeId: string;
  treeCode: string;
  sideToPrune: string;
  photoRequirements: string;
  pruningBox: PruningBoxState;
  status: "pending" | "in_progress" | "completed" | "needs_review";
  createdAt: Date;
  assignee: string;
  recheckDate: Date;
  actualRecheckDate?: Date;
  isRainReview: boolean;
  photos: Photo[];
}

export interface Photo {
  id: string;
  taskId: string;
  dataUrl: string;
  type: "before" | "after" | "recheck";
  uploadedAt: Date;
  notes?: string;
}

export interface RecheckRecord {
  id: string;
  taskId: string;
  assigneeId: string;
  recheckDate: Date;
  actualDate?: Date;
  passed: boolean;
  notes?: string;
  isRainReview: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "gardener" | "supervisor";
  avatar?: string;
}

export interface CalculationResult {
  clearanceHeight: number;
  lightingCoverage: number;
  landscapeScore: number;
  warnings: Warning[];
}

export type PruningSide = "top" | "bottom" | "left" | "right" | "front" | "back" | "all";
