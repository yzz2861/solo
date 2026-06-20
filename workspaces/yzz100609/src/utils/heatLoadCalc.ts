export interface HeatLoadInput {
  volume: number;
  targetTemp: number;
  ambientTemp: number;
  ambientHumidity: number;
  doorWidth: number;
  doorHeight: number;
  openCount: number;
  avgOpenDuration: number;
  goodsTemp: number;
  goodsWeight: number;
}

export interface HeatLoadResult {
  sensibleHeat: number;
  latentHeat: number;
  goodsHeat: number;
  totalHeat: number;
  dailyEnergy: number;
  compressorPressure: number;
  compressorPressureHigh: number;
  loadRate: number;
  tempRise: number;
  riskLevel: 'safe' | 'caution' | 'danger';
  doorArea: number;
  totalOpenTime: number;
  deltaT: number;
  airDensity: number;
  infiltrationFactor: number;
  condensingTemp: number;
  evaporatingTemp: number;
  hOut: number;
  hIn: number;
  wOut: number;
  wIn: number;
}

export interface SimulationResult {
  reducedCount: number;
  reducedDuration: number;
  originalTotalHeat: number;
  simulatedTotalHeat: number;
  heatReduction: number;
  heatReductionPercent: number;
  originalTempRise: number;
  simulatedTempRise: number;
  tempRiseReduction: number;
  originalDailyEnergy: number;
  simulatedDailyEnergy: number;
  dailyEnergySaving: number;
  annualEnergySaving: number;
  annualCostSaving: number;
  originalLoadRate: number;
  simulatedLoadRate: number;
}

const AIR_CP = 1.006;
const GOOD_CP_DEFAULT = 2.0;
const R22_EVAP_PRESSURE_BASE = 0.15;
const R22_COND_PRESSURE_FACTOR = 0.04;
const ELECTRICITY_PRICE = 0.85;
const COP_ESTIMATE = 3.0;

export function calculateHeatLoad(input: HeatLoadInput): HeatLoadResult {
  const {
    volume,
    targetTemp,
    ambientTemp,
    ambientHumidity,
    doorWidth,
    doorHeight,
    openCount,
    avgOpenDuration,
    goodsTemp,
    goodsWeight,
  } = input;

  const doorArea = doorWidth * doorHeight;
  const totalOpenTime = openCount * avgOpenDuration;
  const deltaT = Math.abs(ambientTemp - targetTemp);
  const airDensity = 1.293 * (273.15 / (273.15 + ambientTemp));
  const totalDaySeconds = 86400;

  const infiltrationFactor = Math.min(1.0, doorArea / (2.5 * Math.sqrt(volume)));
  const infiltrationVolume = 0.5 * doorArea * Math.sqrt(2 * 9.81 * volume * 0.33) * infiltrationFactor;
  const airExchangeVolume = infiltrationVolume * totalOpenTime;

  const { h: hOut, w: wOut } = calculateEnthalpy(ambientTemp, ambientHumidity);
  const inHumidity = Math.min(95, ambientHumidity * 0.3);
  const { h: hIn, w: wIn } = calculateEnthalpy(targetTemp, inHumidity);

  const sensibleHeat = airDensity * airExchangeVolume * AIR_CP * deltaT / totalDaySeconds;
  const latentHeat = airDensity * airExchangeVolume * Math.abs(hOut - hIn) / totalDaySeconds;

  const goodsHeat = goodsWeight > 0
    ? (goodsWeight * GOOD_CP_DEFAULT * Math.abs(goodsTemp - targetTemp)) / totalDaySeconds
    : 0;

  const totalHeat = sensibleHeat + latentHeat + goodsHeat;
  const dailyEnergy = totalHeat * 24;

  const { pressure, pressureHigh, condensingTemp, evaporatingTemp } = estimateCompressorPressure(
    ambientTemp, targetTemp, totalHeat
  );

  const nominalCapacity = volume * 0.08;
  const loadRate = (totalHeat / Math.max(0.01, nominalCapacity)) * 100;

  const insulationFactor = 0.5;
  const tempRise = (totalHeat * 3600) / (airDensity * volume * AIR_CP * 1000) * insulationFactor;

  const riskLevel: 'safe' | 'caution' | 'danger' =
    tempRise > 5 ? 'danger' : tempRise > 2 ? 'caution' : 'safe';

  return {
    sensibleHeat,
    latentHeat,
    goodsHeat,
    totalHeat,
    dailyEnergy,
    compressorPressure: pressure,
    compressorPressureHigh: pressureHigh,
    loadRate,
    tempRise,
    riskLevel,
    doorArea,
    totalOpenTime,
    deltaT,
    airDensity,
    infiltrationFactor,
    condensingTemp,
    evaporatingTemp,
    hOut,
    hIn,
    wOut,
    wIn,
  };
}

function calculateEnthalpy(temp: number, rh: number): { h: number; w: number } {
  const pSat = 0.61078 * Math.exp((17.27 * temp) / (temp + 237.3));
  const pAtm = 101.325;
  const pVapor = (rh / 100) * pSat;
  const w = 0.622 * pVapor / (pAtm - pVapor);
  const h = 1.006 * temp + (2501 + 1.86 * temp) * w;
  return { h, w };
}

function estimateCompressorPressure(
  ambientTemp: number,
  targetTemp: number,
  totalHeat: number
): { pressure: number; pressureHigh: number; condensingTemp: number; evaporatingTemp: number } {
  const condensingTemp = ambientTemp + 12;
  const evaporatingTemp = targetTemp - 8;

  const pLow = R22_EVAP_PRESSURE_BASE + 0.005 * (evaporatingTemp + 30);
  const pHigh = 0.6 + R22_COND_PRESSURE_FACTOR * condensingTemp + 0.01 * totalHeat;

  return {
    pressure: Math.max(0.05, pLow),
    pressureHigh: pHigh,
    condensingTemp,
    evaporatingTemp,
  };
}

export function simulateImprovement(
  input: HeatLoadInput,
  originalResult: HeatLoadResult,
  reducedCount: number,
  reducedDuration: number
): SimulationResult {
  const modifiedInput: HeatLoadInput = {
    ...input,
    openCount: reducedCount,
    avgOpenDuration: reducedDuration,
  };

  const simulatedResult = calculateHeatLoad(modifiedInput);

  const heatReduction = originalResult.totalHeat - simulatedResult.totalHeat;
  const heatReductionPercent = originalResult.totalHeat > 0
    ? (heatReduction / originalResult.totalHeat) * 100
    : 0;

  const dailyEnergySaving = originalResult.dailyEnergy - simulatedResult.dailyEnergy;
  const annualEnergySaving = dailyEnergySaving * 365;
  const annualCostSaving = (annualEnergySaving / COP_ESTIMATE) * ELECTRICITY_PRICE;

  return {
    reducedCount,
    reducedDuration,
    originalTotalHeat: originalResult.totalHeat,
    simulatedTotalHeat: simulatedResult.totalHeat,
    heatReduction,
    heatReductionPercent,
    originalTempRise: originalResult.tempRise,
    simulatedTempRise: simulatedResult.tempRise,
    tempRiseReduction: originalResult.tempRise - simulatedResult.tempRise,
    originalDailyEnergy: originalResult.dailyEnergy,
    simulatedDailyEnergy: simulatedResult.dailyEnergy,
    dailyEnergySaving,
    annualEnergySaving,
    annualCostSaving,
    originalLoadRate: originalResult.loadRate,
    simulatedLoadRate: simulatedResult.loadRate,
  };
}
