import {
  ORIENTATION_SOLAR_FACTOR,
  USAGE_TYPE_CONFIG,
  WALL_U_VALUE,
  WINDOW_U_VALUE,
  ROOF_U_VALUE,
  DESIGN_TEMP_DIFF,
  SAFETY_FACTOR_MIN,
  SAFETY_FACTOR_MAX,
  HP_RATINGS,
} from './constants';
import { toSqm } from './unitConverter';
import type { RoomParams, CoolingResult } from '@/types';

export function calculateCoolingLoad(params: RoomParams): CoolingResult {
  const areaSqm = toSqm(params.area, params.areaUnit);
  const floorHeight = params.floorHeight ?? 2.8;
  const usageConfig = USAGE_TYPE_CONFIG[params.usageType];
  const solarFactor = ORIENTATION_SOLAR_FACTOR[params.orientation];

  const windowArea = areaSqm * 4 * params.windowWallRatio;
  const wallArea = areaSqm * 4 * (1 - params.windowWallRatio);
  const roofArea = areaSqm;

  const windowLoad =
    windowArea * WINDOW_U_VALUE * DESIGN_TEMP_DIFF +
    windowArea * solarFactor * 200;

  const wallLoad = wallArea * WALL_U_VALUE * DESIGN_TEMP_DIFF;
  const roofLoad = roofArea * ROOF_U_VALUE * DESIGN_TEMP_DIFF * 0.5;

  const buildingLoad = windowLoad + wallLoad + roofLoad;

  const humanLoad = params.peopleCount * usageConfig.humanLoadPerPerson;
  const equipmentLoad = params.computerCount * usageConfig.equipmentLoadPerComputer;
  const lightingLoad = areaSqm * usageConfig.lightingLoadPerSqm;

  const hoursFactor = Math.min(1.2, Math.max(0.7, params.usageHours / 8));

  const baseLoad =
    (buildingLoad + humanLoad + equipmentLoad + lightingLoad) *
    hoursFactor *
    usageConfig.usageFactor;

  const safetyFactorMin = SAFETY_FACTOR_MIN;
  const safetyFactorMax = SAFETY_FACTOR_MAX;

  const totalCoolingLoad = baseLoad * (safetyFactorMin + safetyFactorMax) / 2;
  const recommendedACMin = baseLoad * safetyFactorMin;
  const recommendedACMax = baseLoad * safetyFactorMax;

  const recommendedHP = calculateHPRecommendation(recommendedACMin, recommendedACMax);

  return {
    totalCoolingLoad: Math.round(totalCoolingLoad),
    buildingLoad: Math.round(buildingLoad),
    humanLoad: Math.round(humanLoad),
    equipmentLoad: Math.round(equipmentLoad),
    lightingLoad: Math.round(lightingLoad),
    recommendedACMin: Math.round(recommendedACMin),
    recommendedACMax: Math.round(recommendedACMax),
    recommendedHP,
    safetyFactor: (safetyFactorMin + safetyFactorMax) / 2,
    breakdown: {
      orientationFactor: solarFactor,
      windowFactor: Math.round(windowLoad),
      wallFactor: Math.round(wallLoad),
      roofFactor: Math.round(roofLoad),
    },
  };
}

export function calculateHPRecommendation(minWatt: number, maxWatt: number): string {
  const findHPRange = (watt: number) => {
    for (let i = HP_RATINGS.length - 1; i >= 0; i--) {
      if (watt >= HP_RATINGS[i].watt) {
        if (i < HP_RATINGS.length - 1) {
          const next = HP_RATINGS[i + 1];
          const curr = HP_RATINGS[i];
          if (watt - curr.watt < next.watt - watt) {
            return curr.hp;
          }
          return next.hp;
        }
        return HP_RATINGS[i].hp;
      }
    }
    return HP_RATINGS[0].hp;
  };

  const minHP = findHPRange(minWatt);
  const maxHP = findHPRange(maxWatt);

  if (minHP === maxHP) {
    return `约 ${minHP}`;
  }

  const minIdx = HP_RATINGS.findIndex((h) => h.hp === minHP);
  const maxIdx = HP_RATINGS.findIndex((h) => h.hp === maxHP);

  if (maxIdx - minIdx <= 1) {
    return `${minHP} ~ ${maxHP}`;
  }

  const midIdx = Math.floor((minIdx + maxIdx) / 2);
  return `${minHP} ~ ${maxHP}（推荐 ${HP_RATINGS[midIdx].hp}）`;
}

export function getLoadPercentage(result: CoolingResult): {
  building: number;
  human: number;
  equipment: number;
  lighting: number;
} {
  const total = result.buildingLoad + result.humanLoad + result.equipmentLoad + result.lightingLoad;
  if (total === 0) {
    return { building: 0, human: 0, equipment: 0, lighting: 0 };
  }
  return {
    building: Math.round((result.buildingLoad / total) * 100),
    human: Math.round((result.humanLoad / total) * 100),
    equipment: Math.round((result.equipmentLoad / total) * 100),
    lighting: Math.round((result.lightingLoad / total) * 100),
  };
}
