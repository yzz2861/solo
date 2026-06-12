export interface BridgeModule {
  id: string;
  type: "straight" | "curve" | "platform";
  length: number;
  width: number;
  loadCapacity: number;
  position: [number, number, number];
  rotation: number;
  unit: "m" | "ft";
}

export interface AnchorPoint {
  id: string;
  type: "shore" | "water";
  position: [number, number, number];
  restrictedZone?: { center: [number, number]; radius: number; reason: string };
  ropeLength: number;
}

export interface EnvironmentParams {
  windDirection: number;
  windSpeed: number;
  waveDirection: number;
  waveHeight: number;
  visitorCount: number;
  visitorWeight: number;
}

export interface SafetyWarning {
  type: "tension" | "width" | "angle" | "restricted" | "overload" | "unit_mismatch";
  level: "danger" | "warning";
  message: string;
  relatedIds: string[];
}

export interface Scheme {
  id: string;
  name: string;
  createdAt: string;
  modules: BridgeModule[];
  anchors: AnchorPoint[];
  envParams: EnvironmentParams;
  warnings: SafetyWarning[];
  thumbnail: string;
}
