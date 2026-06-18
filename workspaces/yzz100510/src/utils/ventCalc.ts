import {
  volumeToM3,
  lengthToM,
  diameterToM,
  m3hToCfm,
  FILTER_RESISTANCE_MAP,
} from "./unitConv";
import type { FilterType, VolumeUnit, LengthUnit, DiameterUnit } from "./unitConv";

export interface VentInput {
  roomVolume: number;
  roomVolumeUnit: VolumeUnit;
  airChangeRate: number;
  ductLength: number;
  ductLengthUnit: LengthUnit;
  ductDiameter: number;
  ductDiameterUnit: DiameterUnit;
  elbowCount: number;
  filterType: FilterType;
  filterResistance: number | null;
  noiseLimit: number;
  odorSource: string;
}

export interface VentResult {
  airflowM3h: number;
  airflowCFM: number;
  totalPressure: number;
  ductFrictionLoss: number;
  elbowLoss: number;
  filterLoss: number;
  filterLossIsEstimated: boolean;
  noiseCompliant: boolean;
  airChangeWarning: "none" | "yellow" | "red";
  recommendedAirflowRange: { min: number; max: number };
  recommendedPressureRange: { min: number; max: number };
  ductVelocity: number;
  dynamicPressure: number;
}

const AIR_DENSITY = 1.2;
const FRICTION_FACTOR = 0.025;
const ELBOW_COEFFICIENT = 0.5;

function estimateNoiseLevel(airflowM3h: number): number {
  return 50 + 15 * Math.log10(Math.max(airflowM3h, 1) / 1000);
}

export function calculateVent(input: VentInput): VentResult {
  const V = volumeToM3(input.roomVolume, input.roomVolumeUnit);
  const L = lengthToM(input.ductLength, input.ductLengthUnit);
  const D = diameterToM(input.ductDiameter, input.ductDiameterUnit);

  const airflowM3h = V * input.airChangeRate;
  const airflowCFM = m3hToCfm(airflowM3h);

  const area = Math.PI * (D / 2) ** 2;
  const velocity = airflowM3h / (3600 * Math.max(area, 1e-6));
  const dynamicPressure = 0.5 * AIR_DENSITY * velocity ** 2;

  const ductFrictionLoss = FRICTION_FACTOR * (L / Math.max(D, 1e-6)) * dynamicPressure;
  const elbowLoss = input.elbowCount * ELBOW_COEFFICIENT * dynamicPressure;

  const filterInfo = FILTER_RESISTANCE_MAP[input.filterType];
  let filterLoss: number;
  let filterLossIsEstimated: boolean;

  if (input.filterType === "custom") {
    filterLoss = input.filterResistance ?? 0;
    filterLossIsEstimated = false;
  } else {
    filterLoss = filterInfo.value;
    filterLossIsEstimated = filterInfo.isEstimated;
  }

  const totalPressure = ductFrictionLoss + elbowLoss + filterLoss;

  const estimatedNoise = estimateNoiseLevel(airflowM3h);
  const noiseCompliant = estimatedNoise <= input.noiseLimit;

  let airChangeWarning: "none" | "yellow" | "red" = "none";
  if (input.airChangeRate < 3) {
    airChangeWarning = "red";
  } else if (input.airChangeRate < 6) {
    airChangeWarning = "yellow";
  }

  const recommendedAirflowRange = {
    min: airflowM3h,
    max: airflowM3h * 1.2,
  };

  const recommendedPressureRange = {
    min: totalPressure * 1.1,
    max: totalPressure * 1.3,
  };

  return {
    airflowM3h,
    airflowCFM,
    totalPressure,
    ductFrictionLoss,
    elbowLoss,
    filterLoss,
    filterLossIsEstimated,
    noiseCompliant,
    airChangeWarning,
    recommendedAirflowRange,
    recommendedPressureRange,
    ductVelocity: velocity,
    dynamicPressure,
  };
}
