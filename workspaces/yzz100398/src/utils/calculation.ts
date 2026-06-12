import type {
  Unit,
  WeightClass,
  Measurement,
  StandardWeight,
  Environment,
  Contribution,
  CalibrationResults,
} from "../types";
import { toMg } from "./units";

export function getMPE_mg(nominalValueMg: number, weightClass: WeightClass): number {
  if (!isFinite(nominalValueMg) || nominalValueMg <= 0) return 0;
  const nominal_g = nominalValueMg / 1000;
  const m = nominal_g;

  switch (weightClass) {
    case "E1": {
      if (m <= 0.0005) return 0.00005;
      if (m <= 0.001) return 0.0001;
      if (m <= 0.002) return 0.00015;
      if (m <= 0.005) return 0.0003;
      if (m <= 0.01) return 0.0005;
      if (m <= 0.02) return 0.001;
      if (m <= 0.05) return 0.002;
      if (m <= 0.1) return 0.003;
      if (m <= 0.2) return 0.005;
      if (m <= 0.5) return 0.01;
      if (m <= 1) return 0.02;
      if (m <= 2) return 0.03;
      if (m <= 5) return 0.07;
      if (m <= 10) return 0.12;
      if (m <= 20) return 0.2;
      if (m <= 50) return 0.5;
      return m >= 100 ? 2 * Math.sqrt(m) : 1;
    }
    case "E2": {
      if (m <= 0.0005) return 0.00015;
      if (m <= 0.001) return 0.0003;
      if (m <= 0.002) return 0.0005;
      if (m <= 0.005) return 0.001;
      if (m <= 0.01) return 0.0015;
      if (m <= 0.02) return 0.003;
      if (m <= 0.05) return 0.008;
      if (m <= 0.1) return 0.01;
      if (m <= 0.2) return 0.015;
      if (m <= 0.5) return 0.03;
      if (m <= 1) return 0.06;
      if (m <= 2) return 0.1;
      if (m <= 5) return 0.2;
      if (m <= 10) return 0.4;
      if (m <= 20) return 0.6;
      if (m <= 50) return 1.5;
      return m >= 100 ? 6 * Math.sqrt(m) : 3;
    }
    case "F1": {
      if (m <= 0.0005) return 0.0005;
      if (m <= 0.001) return 0.001;
      if (m <= 0.002) return 0.002;
      if (m <= 0.005) return 0.005;
      if (m <= 0.01) return 0.01;
      if (m <= 0.02) return 0.02;
      if (m <= 0.05) return 0.05;
      if (m <= 0.1) return 0.1;
      if (m <= 0.2) return 0.2;
      if (m <= 0.5) return 0.5;
      if (m <= 1) return 1;
      if (m <= 2) return 2;
      if (m <= 5) return 5;
      if (m <= 10) return 10;
      if (m <= 20) return 15;
      if (m <= 50) return 35;
      return m >= 100 ? 20 * Math.sqrt(m) : 50;
    }
    case "F2": {
      if (m <= 0.0005) return 0.0015;
      if (m <= 0.001) return 0.003;
      if (m <= 0.002) return 0.006;
      if (m <= 0.005) return 0.015;
      if (m <= 0.01) return 0.03;
      if (m <= 0.02) return 0.06;
      if (m <= 0.05) return 0.15;
      if (m <= 0.1) return 0.3;
      if (m <= 0.2) return 0.6;
      if (m <= 0.5) return 1.5;
      if (m <= 1) return 3;
      if (m <= 2) return 6;
      if (m <= 5) return 15;
      if (m <= 10) return 30;
      if (m <= 20) return 50;
      if (m <= 50) return 120;
      return m >= 100 ? 60 * Math.sqrt(m) : 160;
    }
    case "M1": {
      if (m <= 0.0005) return 0.005;
      if (m <= 0.001) return 0.01;
      if (m <= 0.002) return 0.02;
      if (m <= 0.005) return 0.05;
      if (m <= 0.01) return 0.1;
      if (m <= 0.02) return 0.2;
      if (m <= 0.05) return 0.5;
      if (m <= 0.1) return 1;
      if (m <= 0.2) return 2;
      if (m <= 0.5) return 5;
      if (m <= 1) return 10;
      if (m <= 2) return 20;
      if (m <= 5) return 50;
      if (m <= 10) return 100;
      if (m <= 20) return 160;
      if (m <= 50) return 380;
      return m >= 100 ? 200 * Math.sqrt(m) : 500;
    }
    case "M2": {
      if (m <= 0.001) return 0.02;
      if (m <= 0.002) return 0.06;
      if (m <= 0.005) return 0.15;
      if (m <= 0.01) return 0.3;
      if (m <= 0.02) return 0.6;
      if (m <= 0.05) return 1.5;
      if (m <= 0.1) return 3;
      if (m <= 0.2) return 6;
      if (m <= 0.5) return 15;
      if (m <= 1) return 30;
      if (m <= 2) return 60;
      if (m <= 5) return 150;
      if (m <= 10) return 300;
      if (m <= 20) return 500;
      if (m <= 50) return 1200;
      return m >= 100 ? 600 * Math.sqrt(m) : 1600;
    }
    case "M3": {
      if (m <= 0.001) return 0.05;
      if (m <= 0.002) return 0.15;
      if (m <= 0.005) return 0.5;
      if (m <= 0.01) return 1;
      if (m <= 0.02) return 2;
      if (m <= 0.05) return 5;
      if (m <= 0.1) return 10;
      if (m <= 0.2) return 20;
      if (m <= 0.5) return 50;
      if (m <= 1) return 100;
      if (m <= 2) return 200;
      if (m <= 5) return 500;
      if (m <= 10) return 1000;
      if (m <= 20) return 1600;
      if (m <= 50) return 3800;
      return m >= 100 ? 2000 * Math.sqrt(m) : 5000;
    }
    default:
      return 0;
  }
}

export function getStandardUncertainty_mg(
  stdNominalMg: number,
  stdClass: WeightClass
): number {
  if (!isFinite(stdNominalMg) || stdNominalMg <= 0) return 0;
  const mpe = getMPE_mg(stdNominalMg, stdClass);
  const k_rect = Math.sqrt(3);
  return (mpe / 2) / k_rect;
}

export function mean(values: number[]): number {
  const valid = values.filter((v) => isFinite(v));
  if (valid.length === 0) return 0;
  let sum = 0;
  for (const v of valid) sum += v;
  return sum / valid.length;
}

export function stdDev(values: number[]): number {
  const valid = values.filter((v) => isFinite(v));
  const n = valid.length;
  if (n < 2) return 0;
  const avg = mean(valid);
  let sumSq = 0;
  for (const v of valid) {
    const d = v - avg;
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / (n - 1));
}

export function getResolutionUncertainty_mg(nominalMg: number): number {
  if (!isFinite(nominalMg)) return 0;
  let delta_mg: number;
  const absNom = Math.abs(nominalMg);

  if (absNom < 1) delta_mg = 0.001;
  else if (absNom < 10) delta_mg = 0.01;
  else if (absNom < 100) delta_mg = 0.1;
  else if (absNom < 1000) delta_mg = 1;
  else if (absNom < 10000) delta_mg = 10;
  else if (absNom < 100000) delta_mg = 100;
  else delta_mg = 1000;

  return delta_mg / Math.sqrt(12);
}

export function getTempUncertainty_mg(
  tempC: number,
  nominalMg: number
): number {
  if (!isFinite(tempC) || !isFinite(nominalMg)) return 0;
  const ALPHA = 2.3e-5;
  const T_REF = 20;
  const deltaT = Math.abs(tempC - T_REF);
  const correctionMax = deltaT * ALPHA * nominalMg;
  const k_rect = Math.sqrt(3);
  return correctionMax / k_rect;
}

export function getHumidityUncertainty_mg(
  humidityRH: number,
  nominalMg: number
): number {
  if (!isFinite(humidityRH) || !isFinite(nominalMg)) return 0;
  const RH_REF = 50;
  const deltaRH = Math.abs(humidityRH - RH_REF);
  const coeff = 2e-7;
  const correctionMax = deltaRH * coeff * nominalMg;
  const k_rect = Math.sqrt(3);
  return correctionMax / k_rect;
}

export interface CalculateCalibrationInput {
  nominalValue: number;
  nominalUnit: Unit;
  weightClass: WeightClass;
  standardWeight: StandardWeight;
  environment: Environment;
  measurements: Measurement[];
}

export function calculateCalibration(
  input: CalculateCalibrationInput
): CalibrationResults {
  const { nominalValue, nominalUnit, weightClass, standardWeight, environment, measurements } =
    input;

  const nominalMg = toMg(nominalValue, nominalUnit);
  const stdNominalMg = toMg(standardWeight.nominalValue, standardWeight.nominalUnit);

  const tolerance_mg = getMPE_mg(nominalMg, weightClass);

  const allValues_mg = (measurements ?? []).map((m) => toMg(m.value, m.unit));
  const validValues_mg = allValues_mg.filter((v) => isFinite(v) && v > 0);
  const n = validValues_mg.length;

  const mean_mg = mean(validValues_mg);
  const std_mg = stdDev(validValues_mg);

  const u_repeatability_mg = n >= 2 ? std_mg / Math.sqrt(n) : 0;

  const correction_mg =
    n > 0
      ? mean_mg - nominalMg + (isFinite(standardWeight.correctionValue_mg) ? standardWeight.correctionValue_mg : 0)
      : 0;

  const u_standard_mg = getStandardUncertainty_mg(stdNominalMg, standardWeight.class);
  const u_resolution_mg = getResolutionUncertainty_mg(nominalMg);
  const u_temp_mg = getTempUncertainty_mg(environment.temperature_C, nominalMg);
  const u_humidity_mg = getHumidityUncertainty_mg(environment.humidity_RH, nominalMg);

  const contributions_raw: Contribution[] = [
    {
      key: "repeatability",
      source: "测量重复性 (A类)",
      u_mg: u_repeatability_mg,
      percent: 0,
    },
    {
      key: "standard",
      source: "标准砝码不确定度 (B类)",
      u_mg: u_standard_mg,
      percent: 0,
    },
    {
      key: "resolution",
      source: "天平分辨力 (B类)",
      u_mg: u_resolution_mg,
      percent: 0,
    },
    {
      key: "temperature",
      source: "温度影响 (B类)",
      u_mg: u_temp_mg,
      percent: 0,
    },
    {
      key: "humidity",
      source: "湿度影响 (B类)",
      u_mg: u_humidity_mg,
      percent: 0,
    },
  ];

  let sumSq = 0;
  for (const c of contributions_raw) {
    const u = isFinite(c.u_mg) ? c.u_mg : 0;
    sumSq += u * u;
  }
  const u_combined_mg = Math.sqrt(sumSq);

  const u_c_sq = u_combined_mg * u_combined_mg;
  const contributions: Contribution[] = contributions_raw.map((c) => {
    const u_i = isFinite(c.u_mg) ? c.u_mg : 0;
    const u_i_sq = u_i * u_i;
    return {
      ...c,
      u_mg: u_i,
      percent: u_c_sq > 0 ? (u_i_sq / u_c_sq) * 100 : 0,
    };
  });

  const k_factor = 2;
  const U_expanded_mg = k_factor * u_combined_mg;

  let isPass: boolean | null = null;
  if (n > 0 && u_combined_mg > 0) {
    isPass = Math.abs(correction_mg) + U_expanded_mg <= tolerance_mg;
  }

  return {
    correction_mg,
    u_combined_mg,
    U_expanded_mg,
    k_factor,
    contributions,
    tolerance_mg,
    isPass,
    mean_mg,
    std_mg,
  };
}
